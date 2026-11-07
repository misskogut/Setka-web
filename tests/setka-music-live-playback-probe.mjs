// Real SETKA sound acceptance test: never stub HTMLMediaElement.play or media data.
// Exercises the deployed catalog, actual click activation, native media, Web Audio,
// and the in-app track button on Chromium and WebKit (iPhone-like touch viewport).
import assert from "node:assert/strict";
import {chromium,webkit} from "playwright";
const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-music-v1";
const FRONT="https://misskogut.github.io/Setka-web/standalone-v34.html";
const catalog=await fetch(API,{signal:AbortSignal.timeout(18000)}).then(r=>r.json());
assert.ok(catalog.ok&&Array.isArray(catalog.tracks),"live music catalog");
assert.equal(catalog.tracks.length,28);
const local=catalog.tracks.find(t=>!t.external_source_path);
const remote=catalog.tracks.find(t=>t.external_source_path?.includes("утренний лес"));
const mp3=catalog.tracks.find(t=>t.external_source_path?.endsWith(".mp3"));
// Large 8D WAV is verified separately in a fresh WebKit AudioContext so
// consecutive probe contexts do not artificially exhaust Safari resources.
const samples=[local,remote,mp3];
assert.ok(samples.every(Boolean),"Supabase local, Yandex WAV and MP3 present");
for(const t of [remote,mp3,large])assert.match(t.audio_url,/^https:\/\/gfchgaphzhxufwdhrcis\.supabase\.co\/functions\/v1\/setka-music-v1\?stream=/);
const name=process.env.SETKA_BROWSER==="webkit"?"webkit":"chromium";
const browser=await (name==="webkit"?webkit:chromium).launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 page.on("pageerror",e=>console.log("PAGE_ERROR",e.message.slice(0,170)));
 page.on("console",m=>{
  if(m.type()==="error")console.log("BROWSER_ERROR",m.text().replace(/https:\/\/\S+/g,"<media URL>").slice(0,170));
 });
 await page.addInitScript(()=>{
  const OriginalAudio=window.Audio;
  window.__setkaCapturedAudio=[];
  function InstrumentedAudio(...args){
   const element=new OriginalAudio(...args);
   window.__setkaCapturedAudio.push(element);
   return element;
  }
  InstrumentedAudio.prototype=OriginalAudio.prototype;
  window.Audio=InstrumentedAudio;
 });
 await page.goto(FRONT,{waitUntil:"domcontentloaded",timeout:90000});
 for(const track of samples){
  for(const graph of [false,true]){
   await page.evaluate(({audio_url,graph})=>{
    window.__media=null;
    document.querySelector("#setka-real-probe")?.remove();
    const button=document.createElement("button");
    button.id="setka-real-probe";button.style.cssText="position:fixed;top:6px;left:6px;z-index:99999";
    button.textContent="audio test";
    button.onclick=()=>{
     const el=new Audio();el.crossOrigin="anonymous";el.preload="auto";el.src=audio_url;
     const state={graph,events:[],startError:null,resolved:false};
     for(const event of ["loadstart","loadedmetadata","canplay","playing","waiting","stalled","error"])
      el.addEventListener(event,()=>state.events.push(event));
     let ctx=null;
     try{
      if(graph){
       const C=window.AudioContext||window.webkitAudioContext;ctx=new C();
       const src=ctx.createMediaElementSource(el);src.connect(ctx.destination);
       ctx.resume().catch(error=>{state.startError="resume: "+error.name});
      }
      window.__media={el,ctx,state};
      el.play().then(()=>{state.resolved=true}).catch(error=>{state.startError=error.name+": "+error.message.slice(0,120)});
     }catch(error){state.startError=error.name+": "+error.message.slice(0,120);window.__media={el,ctx,state}}
    };
    document.body.append(button);
   },{audio_url:track.audio_url,graph});
   await page.locator("#setka-real-probe").click();
   await page.waitForFunction(()=>{const p=window.__media;return !!p&&(p.el.currentTime>0.8||!!p.el.error||!!p.state.startError)},null,{timeout:22000}).catch(()=>{});
   const result=await page.evaluate(()=>{
    const p=window.__media;if(!p)return {missing:true};
    const e=p.el;
    const out={...p.state,mediaErrorCode:e.error?.code||null,network:e.networkState,
     ready:e.readyState,paused:e.paused,seconds:e.currentTime,
     duration:Number.isFinite(e.duration)?e.duration:null,ctx:p.ctx?.state||"none"};
    try{e.pause();e.removeAttribute("src");e.load();p.ctx?.close()}catch(_){}
    return out;
   });
   const type=!track.external_source_path?"supabase-local":track.external_source_path.endsWith(".mp3")?"yandex-mp3":"yandex-wav";
   console.log("REAL_AUDIO_RESULT",JSON.stringify({browser:name,type,...result}));
   assert.ok(!result.missing&&!result.startError&&!result.mediaErrorCode&&result.seconds>0.8&&(!graph||result.ctx==="running"),
    name+" cannot actually play "+type+" in "+(graph?"WebAudio":"native audio"));
   const minDuration=type==="yandex-wav"?40:type==="yandex-mp3"?600:30;
   assert.ok(result.duration>minDuration,
    name+" wrong "+type+" duration: this would prematurely cut off the soundtrack");
  }
 }
 // Verify the actual music UI click, not just the isolated HTMLMediaElement.
 await page.locator("#setka-real-probe").evaluate(el=>el.remove());
 await page.locator("#setkaMusicPagerButton").click();
 await page.locator(".sm-track").first().waitFor({timeout:22000});
 assert.equal(await page.locator(".sm-track").count(),28,"all 28 live tracks visible in UI");
 const actual=page.locator(".sm-track").filter({hasText:remote.title});
 const trackButton=await actual.count()===1?actual:page.locator('.sm-track[aria-label^="Утренний лес"]');
 await trackButton.first().click();
 await page.waitForFunction(id=>{
   const active=window.SetkaMusicV1?.state()?.active?.some(x=>x.id===id&&x.level>=1);
   const playable=window.__setkaCapturedAudio?.some(e=>e.src.includes(id)&&e.currentTime>0.8);
   return active&&playable;
 },remote.id,{timeout:24000}).catch(()=>{});
 const app=await page.evaluate(id=>{
  const active=window.SetkaMusicV1?.state()?.active?.find(x=>x.id===id);
  const playing=window.__setkaCapturedAudio.filter(e=>e.src.includes(id)).map(e=>({
   seconds:e.currentTime,ready:e.readyState,error:e.error?.code||null,paused:e.paused
  }));
  return {active,playing,buttonDots:document.querySelectorAll(".sm-track.active .sm-dots i").length};
 },remote.id);
 console.log("SETKA_REAL_UI_AUDIO",JSON.stringify({browser:name,...app}));
 assert.ok(app.active?.level>=1&&app.playing.some(e=>e.seconds>0.8&&e.ready>=2&&!e.error),
   name+" actual SETKA track click must produce decoded progressing sound");
}finally{await browser.close()}
