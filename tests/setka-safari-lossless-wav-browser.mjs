import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {webkit} from 'playwright';

const SAMPLE=48000,CHANNELS=2,WIDTH=2,DATA_SIZE=30*1024*1024,FILE_SIZE=DATA_SIZE+44;
function bytesForRange(start,end){
 const out=Buffer.alloc(end-start+1);
 for(let i=0;i<out.length;i++){
  const pos=start+i;
  if(pos<44)continue;
  const sample=Math.floor((pos-44)/(CHANNELS*WIDTH));
  const phase=2*Math.PI*440*sample/SAMPLE;
  const amplitude=Math.floor(Math.sin(phase)*12000);
  const offset=(pos-44)%2;
  out[i]=(amplitude>>(8*offset))&255;
 }
 const header=Buffer.alloc(44);
 header.write('RIFF',0);header.writeUInt32LE(FILE_SIZE-8,4);header.write('WAVE',8);
 header.write('fmt ',12);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);
 header.writeUInt16LE(CHANNELS,22);header.writeUInt32LE(SAMPLE,24);
 header.writeUInt32LE(SAMPLE*CHANNELS*WIDTH,28);
 header.writeUInt16LE(CHANNELS*WIDTH,32);header.writeUInt16LE(WIDTH*8,34);
 header.write('data',36);header.writeUInt32LE(DATA_SIZE,40);
 if(start<44)header.copy(out,0,start,Math.min(44,end+1));
 return out;
}
const server=createServer((req,res)=>{
 let path=new URL(req.url,'http://localhost').pathname;
 if(path==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html><body><button id="play">Start sound</button>
 <script type="module">
 import {SetkaMusicMixer} from '/standalone-music-audio-v1.mjs';
 const mixer=new SetkaMusicMixer();
 const track={id:'safari-wav',title:'Test WAV',external_source_path:'/8D/test.wav',
 external_source_bytes:${FILE_SIZE},audio_url:'https://setka-audio.invalid/stream.wav',loop:true};
 window.__mixer=mixer;
 document.querySelector('#play').onclick=()=>{window.__attempt=mixer.change(track,2)};
 </script></body></html>`);return}
 if(path==='/standalone-music-audio-v1.mjs'||path==='/standalone-music-wav-stream-v1.mjs'){
  res.setHeader('Content-Type','text/javascript');
  res.end(readFileSync(path.slice(1)));return
 }
 res.statusCode=404;res.end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
let browser;
try{
 browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
 let ranges=0,maxRangeBytes=0;
 await page.route('https://setka-audio.invalid/**',route=>{
  const range=route.request().headers()['range'];
  const m=/^bytes=([0-9]+)-([0-9]+)$/.exec(range||'');
  if(!m)return route.fulfill({status:416,body:''});
  const first=Number(m[1]),last=Math.min(FILE_SIZE-1,Number(m[2]));
  ranges++;maxRangeBytes=Math.max(maxRangeBytes,last-first+1);
  return route.fulfill({status:206,headers:{
   'Access-Control-Allow-Origin':'*','Access-Control-Expose-Headers':'Content-Range, Content-Length',
   'Content-Range':`bytes ${first}-${last}/${FILE_SIZE}`,
   'Accept-Ranges':'bytes','Content-Type':'audio/wav'},
   body:bytesForRange(first,last)});
 });
 await page.goto('http://127.0.0.1:'+port+'/');
 await page.locator('#play').click();
 await page.waitForFunction(()=>{
  const x=window.__mixer?.diagnostics?.();
  return x?.sources?.[0]?.losslessWavStreaming===true&&x.sources[0].hrtfSpatialized===true;
 },{timeout:30000});
 const diagnostic=await page.evaluate(()=>window.__mixer.diagnostics());
 assert.equal(diagnostic.sources.length,1);
 assert.equal(diagnostic.sources[0].losslessWavStreaming,true);
 assert.equal(diagnostic.sources[0].nativeStereoFallback,false);
 assert.equal(diagnostic.sources[0].hrtfSpatialized,true);
 assert.ok(ranges>=2,'header + decoded packet range fetches');
 assert.ok(maxRangeBytes<=2*48000*4,'PCM chunks remain bounded to two seconds');
 await page.close();
 console.log('WebKit large lossless WAV range + real WebAudio HRTF graph PASS',{ranges,maxRangeBytes});
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
