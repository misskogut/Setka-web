// Independent Safari/WebKit acceptance: original 496MB 8D WAV on real SETKA UI.
// Prefer verified lossless WebAudio/HRTF packets; native fallback is truthful when unsupported.
import assert from "node:assert/strict";
import {chromium,webkit} from "playwright";
const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-music-v1";
const FRONT="https://misskogut.github.io/Setka-web/standalone-v34.html";
const d=await fetch(API).then(r=>r.json());
const track=d.tracks.find(t=>t.external_source_path?.includes("Shavasana"));
assert.ok(track?.audio_url.includes("?stream="));
const type=process.env.SETKA_BROWSER==="webkit"?"webkit":"chromium";
const browser=await (type==="webkit"?webkit:chromium).launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const statuses=[];page.on("pageerror",error=>console.log("SETKA_PAGE_ERROR",error.message.slice(0,150)));
 page.on("console",message=>{if(message.type()==="error")console.log("SETKA_CONSOLE",message.text().slice(0,180))});
 page.on("response",response=>{
  if(response.url().includes("?stream="+track.id))statuses.push(response.status());
 });
 await page.addInitScript(()=>{
  const Native=window.Audio;
  window.__captures=[];
  function Capture(...args){const a=new Native(...args);window.__captures.push(a);return a}
  Capture.prototype=Native.prototype;window.Audio=Capture;
  window.__bufferSourceStarts=0;
  const proto=window.AudioBufferSourceNode?.prototype;
  if(proto?.start){const orig=proto.start;proto.start=function(...args){
   window.__bufferSourceStarts++;return orig.apply(this,args)
  }};
 });
 await page.goto(FRONT,{waitUntil:"domcontentloaded",timeout:60000});
 await page.locator("#setkaMusicPagerButton").click();
 await page.locator(".sm-track").first().waitFor({timeout:35000}).catch(async error=>{
  const diag=await page.evaluate(()=>({
    musicOpen:!document.querySelector("#setkaMusicPage")?.hidden,
    status:document.querySelector(".sm-status")?.textContent,
    trackCount:document.querySelectorAll(".sm-track").length,
    pagerActive:document.querySelector("#setkaMusicPagerButton")?.className,
    state:window.SetkaMusicV1?.state?.()
  }));
  console.error("SETKA_8D_MUSIC_DIAGNOSTIC",JSON.stringify(diag));
  throw error;
 });
 await page.locator('.sm-track[aria-label^="8D пассив Shavasana"]').click();
 await page.waitForFunction(id=>{
  const spatial=window.SetkaMusicV1?.diagnostics()?.sources?.find(s=>s.trackId===id);
  return (spatial?.losslessWavStreaming&&window.__bufferSourceStarts>=2)||
   window.__captures.some(e=>e.src.includes(id)&&(e.currentTime>0.8||e.error));
 },track.id,{timeout:55000});
 const result=await page.evaluate(id=>({
  active:window.SetkaMusicV1?.state()?.active?.find(s=>s.id===id),
  spatial:window.SetkaMusicV1?.diagnostics()?.sources?.find(s=>s.trackId===id),
  bufferSourceStarts:window.__bufferSourceStarts,
  captured:window.__captures.filter(e=>e.src.includes(id)).map(e=>({
   seconds:e.currentTime,paused:e.paused,ready:e.readyState,network:e.networkState,
   duration:e.duration,error:e.error?.code||null,loop:e.loop,volume:e.volume}))
 }),track.id);
 console.log("FRESH_8D_WEBKIT_REAL_UI",JSON.stringify({type,...result,statuses:statuses.slice(0,10)}));
 assert.equal(result.active?.level,1,"8D track becomes active");
 if(type==="webkit"&&result.spatial?.losslessWavStreaming){
  assert.equal(result.spatial.hrtfSpatialized,true,"large original WAV drives real HRTF");
  assert.equal(result.spatial.nativeStereoFallback,false);
  assert.equal(result.captured.length,0,"chunked PCM avoids enormous HTMLAudioElement");
  assert.ok(result.bufferSourceStarts>=2,"real AudioBufferSource playback was scheduled");
  assert.ok(statuses.includes(206),"actual SETKA WAV bytes arrived over HTTP ranges");
 }else{
  assert.equal(result.captured.length,1,"safe fallback keeps only one original decoder");
  assert.equal(result.captured[0].loop,true);
  if(type==="webkit")assert.equal(result.spatial?.nativeStereoFallback,true,
   "unsupported Safari WAV is explicitly marked as non-spatial");
  assert.ok(result.captured.some(e=>e.seconds>0.8&&!e.error&&e.duration>1000),
   "original WAV must actually advance without stalling");
 }
}finally{await browser.close()}
