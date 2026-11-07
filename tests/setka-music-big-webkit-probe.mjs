// Independent Safari/WebKit acceptance: one fresh AudioContext, one 496 MB
// original 8D WAV, real SETKA UI button, no fake HTMLMediaElement.play.
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
 const statuses=[];page.on("response",response=>{
  if(response.url().includes("?stream="+track.id))statuses.push(response.status());
 });
 await page.addInitScript(()=>{
  const Native=window.Audio;
  window.__captures=[];
  function Capture(...args){const a=new Native(...args);window.__captures.push(a);return a}
  Capture.prototype=Native.prototype;window.Audio=Capture;
 });
 await page.goto(FRONT,{waitUntil:"domcontentloaded",timeout:60000});
 await page.locator("#setkaMusicPagerButton").click();
 await page.locator(".sm-track").first().waitFor({timeout:20000});
 await page.locator('.sm-track[aria-label^="8D пассив Shavasana"]').click();
 await page.waitForFunction(id=>window.__captures.some(e=>e.src.includes(id)&&(e.currentTime>0.8||e.error)),track.id,{timeout:45000}).catch(()=>{});
 const result=await page.evaluate(id=>({
  active:window.SetkaMusicV1?.state()?.active?.find(s=>s.id===id),
  captured:window.__captures.filter(e=>e.src.includes(id)).map(e=>({seconds:e.currentTime,paused:e.paused,ready:e.readyState,network:e.networkState,duration:e.duration,error:e.error?.code||null,loop:e.loop}))
 }),track.id);
 console.log("FRESH_8D_WEBKIT_REAL_UI",JSON.stringify({type,...result,statuses:statuses.slice(0,8)}));
 assert.ok(result.active?.level===1,"8D button becomes active");
 assert.equal(result.captured.length,1,"large original WAV must only allocate ONE decoder on iOS");
 assert.equal(result.captured[0].loop,true,"native looping preserves the soundtrack without a second 500 MB file");
 assert.ok(result.captured.some(e=>e.seconds>0.8&&!e.error&&e.duration>1000),
  "8D full WAV must actually advance in Safari WebAudio without stalling");
}finally{await browser.close()}
