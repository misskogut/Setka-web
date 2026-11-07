import assert from "node:assert/strict";
import test from "node:test";
import {SetkaMusicMixer,orbitDepthProfile,orbitEarlyReflectionProfile} from "../standalone-music-audio-v1.mjs";
import {readOrbitWavHeader,decodeOrbitWavBlock,createOrbitWavStream} from "../standalone-music-wav-stream-v1.mjs";

const directions=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
const radii=[.22,.55,.88];
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} ≠ ${expected}`);
function scene(){
 const writes=new Map(),param=name=>({setTargetAtTime(...values){writes.set(name,values)}});
 const panner=name=>({positionX:param(name+"X"),positionY:param(name+"Y"),positionZ:param(name+"Z")});
 const mixer=new SetkaMusicMixer();
 mixer.ctx={currentTime:3};mixer.scheduleFrame=()=>{};
 const item={id:"a",motionIndex:0,angle:0,radius:.62,anchorAngle:0,anchorRadius:.62,
  panner:panner("direct"),roomSend:{gain:param("room")},reflections:[0,1].map(i=>({
   panner:panner("wall"+i),gain:{gain:param("gain"+i)},
   delay:{delayTime:param("delay"+i)},filter:{frequency:param("filter"+i)}
  }))};
 mixer.items.set(item.id,item);
 return {mixer,item,writes};
}
test("8 directions × 3 radii and one scheduling timestamp for every acoustic path",()=>{
 const {mixer,item,writes}=scene();
 for(let i=0;i<directions.length;i++)for(const r of radii){
  const a=i*Math.PI/4,[x,z]=directions[i],scale=orbitDepthProfile(r).distance/Math.hypot(x,z);
  mixer.position(item,a,r);
  assert.equal(writes.size,16);
  close(writes.get("directX")[0],x*scale);
  close(writes.get("directY")[0],0);
  close(writes.get("directZ")[0],z*scale);
  const walls=orbitEarlyReflectionProfile(a,r);
  for(let j=0;j<walls.length;j++){
   close(writes.get("wall"+j+"X")[0],walls[j].x);
   close(writes.get("wall"+j+"Z")[0],walls[j].z);
   close(writes.get("delay"+j)[0],walls[j].delay);
  }
  for(const [,at,smoothing] of writes.values()){assert.equal(at,3);assert.equal(smoothing,.008)}
  writes.clear();
 }
});
test("motion uses a continuous phase at speed changes and takes the latest drag in a frame",t=>{
 const {mixer,item,writes}=scene();
 mixer.motion("eight");mixer.motionSpeedAt-=1.2;mixer.started-=1.2;
 const at=mixer.motionSpeedAt+1.2;
 t.mock.method(performance,"now",()=>at*1000);
 mixer.tick(at);
 const before=[item.angle,item.radius];
 mixer.setSpeed(100);mixer.tick(at);
 close(item.angle,before[0]);close(item.radius,before[1]);
 mixer.tick(at+.1);
 assert.notEqual(item.angle,before[0]);
 writes.clear();
 mixer.drag(item.id,Math.PI,.55);mixer.drag(item.id,-Math.PI/2,.88);
 assert.equal(writes.size,0);
 mixer.tick(at+.2);
 close(item.angle,-Math.PI/2);close(item.radius,.88);
 close(writes.get("directX")[0],-orbitDepthProfile(.88).distance);
 mixer.tick(at+.3);
 close(item.angle,-Math.PI/2);
});

function wav({channels=2,rate=8000,bits=32,encoding=3,frames=8}={}){
 const align=channels*bits/8,b=Buffer.alloc(44+align*frames);
 b.write("RIFF");b.writeUInt32LE(b.length-8,4);b.write("WAVEfmt ",8);b.writeUInt32LE(16,16);
 b.writeUInt16LE(encoding,20);b.writeUInt16LE(channels,22);b.writeUInt32LE(rate,24);
 b.writeUInt32LE(rate*align,28);b.writeUInt16LE(align,32);b.writeUInt16LE(bits,34);
 b.write("data",36);b.writeUInt32LE(align*frames,40);
 return b;
}
const toBytes=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
function createBuffer(channels,frames,rate){
 const data=Array.from({length:channels},()=>new Float32Array(frames));
 return {numberOfChannels:channels,rate,length:frames,getChannelData:i=>data[i]};
}
test("float stereo and signed PCM preserve channels, samples, and original sample rate",()=>{
 const stereo=wav();
 stereo.writeFloatLE(.75,44);stereo.writeFloatLE(-.625,48);
 stereo.writeFloatLE(-.5,52);stereo.writeFloatLE(.25,56);
 const fmt=readOrbitWavHeader(toBytes(stereo.subarray(0,44)),stereo.length);
 const output=decodeOrbitWavBlock({createBuffer},toBytes(stereo.subarray(44)),fmt);
 assert.deepEqual([...output.getChannelData(0).slice(0,2)],[.75,-.5]);
 assert.deepEqual([...output.getChannelData(1).slice(0,2)],[-.625,.25]);
 const mono=wav({channels:1,bits:24,encoding:1,rate:48000});
 mono.writeIntLE(-4194304,44,3);mono.writeIntLE(2097152,47,3);
 const monoFmt=readOrbitWavHeader(toBytes(mono),mono.length);
 const pcm=decodeOrbitWavBlock({createBuffer},toBytes(mono.subarray(44)),monoFmt);
 assert.equal(pcm.numberOfChannels,1);assert.equal(pcm.rate,48000);
 assert.deepEqual([...pcm.getChannelData(0).slice(0,2)],[-.5,.25]);
 assert.throws(()=>readOrbitWavHeader(toBytes(mono),mono.length-1),/truncated/);
});

test("bounded PCM ranges play in order, loop at sample boundaries, and abort on stop",async t=>{
 const original=wav({frames:52000}),starts=[],ranges=[],resolvers=new Map();
 const ctx={state:"running",currentTime:1,createBuffer,createBufferSource:()=>({
  connect(){},disconnect(){},start(at){starts.push([at,this.buffer.length])},stop(){}
 })};
 t.mock.method(globalThis,"fetch",async(_,opts)=>{
  const [from,to]=opts.headers.Range.slice(6).split("-").map(Number);
  ranges.push([from,to]);
  const response=()=>new Response(original.subarray(from,to+1),{status:206,
   headers:{"Content-Range":`bytes ${from}-${to}/${original.length}`}});
  if(!from)return response();
  return new Promise(resolve=>{
   resolvers.set(from,()=>resolve(response()));
   opts.signal.addEventListener("abort",()=>resolve(response()),{once:true});
  });
 });
 const stream=createOrbitWavStream(ctx,{}, {audio_url:"/original.wav"},assert.fail);
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 stream.pump();await flush();
 stream.pump();
 assert.deepEqual(ranges,[[0,65535],[44,192043],[192044,384043],[384044,416043]]);
 resolvers.get(192044)();resolvers.get(384044)();await flush();stream.pump();
 assert.deepEqual(starts,[]);
 resolvers.get(44)();await flush();stream.pump();
 assert.deepEqual(starts.map(s=>s[1]),[24000,24000,4000]);
 for(let i=1;i<starts.length;i++)close(starts[i][0],starts[i-1][0]+starts[i-1][1]/8000);
 assert.equal(ranges[4][0],44);
 assert.equal(stream.underruns,0);assert.ok(stream.completedAt>stream.startedAt+6);
 stream.stop();assert.equal(stream.closed,true);
});
