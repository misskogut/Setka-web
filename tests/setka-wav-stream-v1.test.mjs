import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseWavHeader,wavChunk,inspectWavSource,SetkaChunkedWavDeck} from '../standalone-music-wav-stream-v1.mjs';

function wav({duration=8,rate=8000,channels=2,depth=16}={}){
 const frames=Math.floor(duration*rate),stride=channels*depth/8,payload=new Uint8Array(frames*stride),out=new Uint8Array(44+payload.length);
 const tag=(i,s)=>{for(let j=0;j<4;j++)out[i+j]=s.charCodeAt(j)};
 const dv=new DataView(out.buffer);
 tag(0,'RIFF');dv.setUint32(4,out.length-8,true);tag(8,'WAVE');
 tag(12,'fmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);
 dv.setUint16(22,channels,true);dv.setUint32(24,rate,true);
 dv.setUint32(28,rate*stride,true);dv.setUint16(32,stride,true);dv.setUint16(34,depth,true);
 tag(36,'data');dv.setUint32(40,payload.length,true);
 for(let i=44;i<out.length;i++)out[i]=(i%127);
 return out;
}
function fakeFetch(bytes,{ranges=true}={}){
 const calls=[];
 const fetch=async(_url,{headers}={})=>{
  const match=/^bytes=([0-9]+)-([0-9]+)$/.exec(headers?.Range||'');
  if(!match||!ranges)return {status:200,headers:{get:()=>null},arrayBuffer:async()=>bytes.buffer.slice(0)};
  const first=Number(match[1]),last=Number(match[2]);
  calls.push({first,last});
  const data=bytes.slice(first,last+1);
  return {status:206,headers:{get:k=>k.toLowerCase()==='content-range'?`bytes ${first}-${last}/${bytes.length}`:null},
   arrayBuffer:async()=>data.buffer};
 };
 return {calls,fetch};
}
test('WAV header parser preserves the original PCM format and rejects compressed audio',()=>{
 const raw=wav({duration:3,rate:44100,channels:2});
 const info=parseWavHeader(raw.subarray(0,65536),raw.length);
 assert.equal(info.sampleRate,44100);
 assert.equal(info.channels,2);
 assert.equal(info.totalFrames,132300);
 assert.equal(info.offset,44);
 const slice=raw.slice(44,44+44100*4);
 const packet=new Uint8Array(wavChunk(info,slice));
 const parsed=parseWavHeader(packet,packet.length);
 assert.equal(parsed.sampleRate,info.sampleRate);
 assert.equal(parsed.totalFrames,44100);
 assert.deepEqual(packet.subarray(44),slice);
 const bad=raw.slice();bad[20]=6;bad[21]=0;
 assert.equal(parseWavHeader(bad.slice(0,100),bad.length),null);
});
test('Safari stream requires verified 206 range support and never fetches the full 500 MB body',async()=>{
 const raw=wav({duration:10,rate:8000});
 const original=globalThis.fetch;
 try{
  const fake=fakeFetch(raw);globalThis.fetch=fake.fetch;
  const info=await inspectWavSource('https://setka.test/wav',raw.length);
  assert.equal(info.totalFrames,80000);
  assert.equal(fake.calls.length,1);
  assert.equal(fake.calls[0].last,65535);
  globalThis.fetch=fakeFetch(raw,{ranges:false}).fetch;
  assert.equal(await inspectWavSource('https://setka.test/wav',raw.length),null);
 }finally{globalThis.fetch=original}
});
test('bounded PCM stream feeds original small packets into Web Audio graph and loops',async()=>{
 const original=globalThis.fetch,raw=wav({duration:10,rate:8000});
 const fake=fakeFetch(raw);
 globalThis.fetch=fake.fetch;
 const info=parseWavHeader(raw.subarray(0,65536),raw.length);
 const scheduled=[];
 const ctx={currentTime:0,decodeAudioData:async buffer=>{
  const parsed=parseWavHeader(new Uint8Array(buffer),buffer.byteLength);
  assert.ok(parsed.totalFrames<=16000,'at most 2s decoded each time');
  return {duration:parsed.totalFrames/parsed.sampleRate};
 },createBufferSource:()=>({
  connect:()=>{},disconnect:()=>{},stop:()=>{},start:at=>scheduled.push(at),onended:null
 })};
 const output={};
 const deck=new SetkaChunkedWavDeck({url:'https://setka.test/wav',total:raw.length,info,ctx,output,loop:true});
 let playing=0;deck.addEventListener('playing',()=>playing++);
 try{
  await deck.play();
  assert.equal(playing,1);
  assert.equal(scheduled.length,3);
  assert.ok(scheduled[1]>=scheduled[0]+1.99);
  assert.equal(fake.calls[0].first,44);
  assert.ok(fake.calls.every(r=>r.last-r.first+1<=16000*info.blockAlign));
  ctx.currentTime=3;await deck.pump();
  assert.ok(scheduled.length>=4);
  deck.pause();assert.equal(deck.closed,true);
 }finally{globalThis.fetch=original}
});
test('Safari spatial route stays opt-in to valid PCM range streaming and retains native fallback',()=>{
 const source=readFileSync('standalone-music-audio-v1.mjs','utf8');
 assert.match(source,/inspectWavSource\(track\.audio_url/);
 assert.match(source,/new SetkaChunkedWavDeck/);
 assert.match(source,/nativeOnly=singleDeck&&webkit&&!streamOnly/);
 assert.match(source,/losslessWavStreaming/);
 assert.match(source,/unstreamable\.add\(id\)/);
});
