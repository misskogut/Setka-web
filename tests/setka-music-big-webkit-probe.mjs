// Real 496 MB original, with no mocked network audio or play events. Candidate
// modules are served at the existing Pages origin so production CORS applies.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {chromium,webkit} from "playwright";
const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-music-v1";
const FRONT="https://misskogut.github.io/Setka-web/standalone-v34.html";
const catalog=await fetch(API,{signal:AbortSignal.timeout(20000)}).then(r=>r.json());
const track=catalog.tracks.find(t=>t.external_source_path?.includes("Shavasana"));
assert.ok(track?.audio_url.includes("?stream="));
assert.equal(track.external_source_bytes,496318392);
const name=process.env.SETKA_BROWSER==="webkit"?"webkit":"chromium";
const browser=await (name==="webkit"?webkit:chromium).launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 if(process.env.SETKA_MUSIC_CANDIDATE==="1"){
  // Mount the real music entrypoint without the unrelated animated pattern
  // library. Keep the production origin for the real catalogue and media CORS.
  await page.route(FRONT,route=>route.fulfill({contentType:"text/html",body:`<!doctype html>
   <main id="libraryScreen"><div class="library-pager">
   <button id="setkaMusicPagerButton" aria-label="Музыка">Музыка</button></div>
   <h1 id="libraryTitle"></h1><div id="librarySwipeArea"></div></main>
   <script type="module" src="./standalone-music-v1.mjs"></script>`}));
  for(const file of ["standalone-music-v1.mjs","standalone-music-audio-v1.mjs",
   "standalone-music-orbits-reference-20261106.mjs","standalone-music-wav-stream-v1.mjs"]){
   const body=await readFile(new URL("../"+file,import.meta.url));
   await page.route("**/"+file+"*",route=>route.fulfill({contentType:"text/javascript",body}));
  }
 }
 const ranges=[];
 page.on("crash",()=>console.log("SETKA_WAV_PAGE_CRASH",JSON.stringify(ranges.slice(0,8))));
 page.on("pageerror",error=>console.log("SETKA_PAGE_ERROR",error.message.slice(0,150)));
 page.on("console",message=>{if(message.type()==="error")console.log("SETKA_CONSOLE",message.text().slice(0,180))});
 page.on("response",response=>{
  if(response.url().includes("?stream="+track.id))ranges.push({
   status:response.status(),range:response.headers()["content-range"]
  });
 });
 await page.addInitScript(()=>{
  const Native=window.Audio,media=[],buffers=[];
  const createBufferSource=AudioContext.prototype.createBufferSource;
  const createPanner=AudioContext.prototype.createPanner;
  window.wavProbe={media,buffers,analysers:[]};
  function Capture(...args){const a=new Native(...args);media.push(a);return a}
  Capture.prototype=Native.prototype;window.Audio=Capture;
  AudioContext.prototype.createBufferSource=function(){
   const node=createBufferSource.call(this),start=node.start;
   node.start=function(at,...args){
    buffers.push({at,seconds:node.buffer?.duration});
    return start.call(node,at,...args);
   };
   return node;
  };
  AudioContext.prototype.createPanner=function(){
   const node=createPanner.call(this);
   window.wavProbe.panner??=node;
   return node;
  };
 });
 await page.goto(FRONT,{waitUntil:"domcontentloaded",timeout:60000});
 await page.locator("#setkaMusicPagerButton").click();
 await page.locator('.sm-track[aria-label^="8D пассив Shavasana"]').click({timeout:35000}).catch(async error=>{
  const diagnostic=await page.evaluate(()=>({
   open:!document.querySelector("#setkaMusicPage")?.hidden,
   status:document.querySelector(".sm-status")?.textContent,tracks:window.SetkaMusicV1?.state?.().tracks
  })).catch(()=>null);
  console.error("SETKA_8D_MUSIC_DIAGNOSTIC",JSON.stringify(diagnostic));
  throw error;
 });
 if(name==="webkit"){
  await page.waitForFunction(()=>!!window.wavProbe.panner);
  await page.evaluate(()=>{
   const probe=window.wavProbe,{panner}=probe,ctx=panner.context;
   const splitter=ctx.createChannelSplitter(2);panner.connect(splitter);
   probe.analysers=[0,1].map(channel=>{
    const analyser=ctx.createAnalyser();
    analyser.fftSize=1024;splitter.connect(analyser,channel);return analyser;
   });
  });
  await page.waitForFunction(id=>{
   const s=SetkaMusicV1.state().active.find(t=>t.id===id),p=window.wavProbe;
   if(s?.transport!=="wav-range"||p.buffers.length<3||p.analysers.length!==2)return false;
   return p.analysers.some(a=>{
    const pcm=new Float32Array(a.fftSize);a.getFloatTimeDomainData(pcm);
    return pcm.some(x=>Math.abs(x)>1e-5);
   });
  },track.id,{timeout:65000}).catch(async error=>{
   const diagnostic=await page.evaluate(()=>({state:SetkaMusicV1.state(),buffers:window.wavProbe.buffers,
    audioState:window.wavProbe.panner?.context.state,status:document.querySelector(".sm-status")?.textContent
   })).catch(()=>null);
   console.log("SETKA_WAV_PCM_DIAGNOSTIC",JSON.stringify({diagnostic,ranges:ranges.slice(0,12)}));
   throw error;
  });
  // Let the second chunk pass the graph's output clock before checking gaps.
  await page.waitForFunction(()=>{
   const p=window.wavProbe;
   return p.analysers[0].context.currentTime>p.buffers[1].at+1;
  },null,{timeout:20000});
 }else{
  await page.waitForFunction(id=>window.wavProbe.media.some(e=>e.src.includes(id)&&e.currentTime>.8),track.id,{timeout:45000});
 }
 const result=await page.evaluate(id=>({
  active:SetkaMusicV1.state().active.find(s=>s.id===id),
  buffers:window.wavProbe.buffers.slice(0,8),
  media:window.wavProbe.media.filter(e=>e.src.includes(id)).map(e=>({
   seconds:e.currentTime,error:e.error?.code||null,loop:e.loop,duration:e.duration
  }))
 }),track.id);
 console.log("ORIGINAL_WAV_SPATIAL",JSON.stringify({name,...result,ranges:ranges.slice(0,8)}));
 assert.equal(result.active?.level,1);
 assert.equal(result.active?.spatial,true);
 if(name==="webkit"){
  assert.equal(result.media.length,0);
  assert.equal(result.active.transport,"wav-range");
  assert.equal(result.active.underruns,0);
  assert.ok(ranges.filter(r=>r.status===206&&r.range?.endsWith("/496318392")).length>=4);
  for(let i=1;i<result.buffers.length;i++){
   const last=result.buffers[i-1];
   assert.ok(Math.abs(result.buffers[i].at-last.at-last.seconds)<.0001,"sample-aligned PCM blocks");
  }
 }else{
  assert.equal(result.media.length,1);
  assert.ok(result.media[0].loop&&result.media[0].duration>1000&&!result.media[0].error);
 }
}finally{await browser.close()}
