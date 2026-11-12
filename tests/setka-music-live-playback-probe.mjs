// Real SETKA sound acceptance test: never stub HTMLMediaElement.play or media data.
// Exercises the deployed catalog, actual click activation, native media, Web Audio,
// and the in-app track button on Chromium and WebKit (iPhone-like touch viewport).
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chromium,webkit} from "playwright";
const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-music-v1";
const FRONT="https://misskogut.github.io/Setka-web/standalone-v34.html";
const catalog=await fetch(API,{signal:AbortSignal.timeout(18000)}).then(r=>r.json());
assert.ok(catalog.ok&&Array.isArray(catalog.tracks),"live music catalog");
assert.ok(catalog.tracks.length>=27&&catalog.tracks.length<=28,"published only verified GitHub audio assets");
const local=catalog.tracks.find(t=>!t.external_source_path);
const remote=catalog.tracks.find(t=>t.external_source_path?.includes("утренний лес"));
const mp3=catalog.tracks.find(t=>t.external_source_path?.endsWith(".mp3"));
// Large 8D WAV is verified separately in a fresh WebKit AudioContext so
// consecutive probe contexts do not artificially exhaust Safari resources.
const samples=[local,remote,mp3];
assert.ok(samples.every(Boolean),"Supabase local, Yandex WAV and MP3 present");
for(const t of [remote,mp3])assert.match(t.audio_url,/^https:\/\/gfchgaphzhxufwdhrcis\.supabase\.co\/functions\/v1\/setka-music-v1\?stream=/);
const name=process.env.SETKA_BROWSER==="webkit"?"webkit":"chromium";
const browser=await (name==="webkit"?webkit:chromium).launch({headless:true});
try{
 // Keep each decoder + WebAudio graph in an independent page. WebKit may
 // retain a previous MediaElementSource until navigation even after close().
 const newPage=async()=>{
  const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on("pageerror",e=>console.log("PAGE_ERROR",e.message.slice(0,170)));
  p.on("console",m=>{
   if(m.type()==="error")console.log("BROWSER_ERROR",m.text().replace(/https:\/\/\S+/g,"<media URL>").slice(0,170));
  });
  // Serve candidate PR audio modules at the actual Pages origin; other assets
  // and the catalog still come from live SETKA, and no media is mocked.
  await p.route(/^https:\/\/misskogut\.github\.io\/Setka-web\/(?:standalone-v34\.html|standalone-music-v1\.mjs|standalone-music-audio-v1\.mjs|standalone-music-wav-stream-v1\.mjs)(?:\?.*)?$/,route=>{
   const file=new URL(route.request().url()).pathname.split("/").at(-1);
   return route.fulfill({status:200,contentType:file.endsWith(".html")?"text/html":"text/javascript",body:readFileSync(file)});
  });
  await p.addInitScript(()=>{
  const OriginalAudio=window.Audio;
  window.__setkaCapturedAudio=[];
  function InstrumentedAudio(...args){
   const element=new OriginalAudio(...args);
   window.__setkaCapturedAudio.push(element);
   return element;
  }
  InstrumentedAudio.prototype=OriginalAudio.prototype;
  window.Audio=InstrumentedAudio;
  window.__setkaBufferSourceStarts=0;
  const proto=window.AudioBufferSourceNode?.prototype;
  if(proto?.start){const previous=proto.start;proto.start=function(...args){
   window.__setkaBufferSourceStarts++;return previous.apply(this,args)
  }}
  });
  await p.goto(FRONT,{waitUntil:"domcontentloaded",timeout:90000});
  return p;
 };
 let page=await newPage();
 for(const track of samples){
  // WebKit PCM WAV uses the real app's AudioBufferSource pipeline, not the
  // intermittently stalled raw MediaElementSource path.
  for(const graph of (name==="webkit"&&track.external_source_path?.toLowerCase().endsWith(".wav")?[false]:[false,true])){
   await page.close();
   page=await newPage();
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
    e.pause();e.removeAttribute("src");e.load();
    return out;
   });
   // The media and AudioContext are owned by this page; close it before
   // opening the next playback probe, never reusing a stalled WebKit decoder.
   const type=!track.external_source_path?"supabase-local":track.external_source_path.endsWith(".mp3")?"yandex-mp3":"yandex-wav";
   console.log("REAL_AUDIO_RESULT",JSON.stringify({browser:name,type,...result}));
   assert.ok(!result.missing&&!result.startError&&!result.mediaErrorCode&&result.seconds>0.8&&(!graph||result.ctx==="running"),
    name+" cannot actually play "+type+" in "+(graph?"WebAudio":"native audio"));
   const minDuration=type==="yandex-wav"?40:type==="yandex-mp3"?600:30;
   assert.ok(result.duration>minDuration,
    name+" wrong "+type+" duration: this would prematurely cut off the soundtrack");
  }
 }
 // Verify the real app on a clean page after all isolated media probes.
 await page.close();
 page=await newPage();
 await page.locator("#setka-real-probe").count().then(n=>{if(n!==0)throw Error("probe_button_leaked")});
 await page.locator("#setkaMusicPagerButton").click();
 await page.locator(".sm-track").first().waitFor({timeout:22000});
 assert.equal(await page.locator(".sm-track").count(),catalog.tracks.length,"all playable GitHub tracks visible in UI");
 const actual=page.locator(".sm-track").filter({hasText:remote.title});
 const trackButton=await actual.count()===1?actual:page.locator('.sm-track[aria-label^="Утренний лес"]');
 await trackButton.first().click();
 await page.waitForFunction(({id,webkit})=>{
   const active=window.SetkaMusicV1?.state()?.active?.some(x=>x.id===id&&x.level>=1);
   const spatial=window.SetkaMusicV1?.diagnostics?.()?.sources?.find(s=>s.trackId===id);
   const playable=webkit?
    (spatial?.losslessWavStreaming===true&&spatial?.hrtfSpatialized===true&&window.__setkaBufferSourceStarts>=2):
    window.__setkaCapturedAudio?.some(e=>e.src.includes(id)&&e.currentTime>0.8);
   return active&&playable;
 },{id:remote.id,webkit:name==="webkit"},{timeout:35000});
 const app=await page.evaluate(id=>{
  const active=window.SetkaMusicV1?.state()?.active?.find(x=>x.id===id);
  const playing=window.__setkaCapturedAudio.filter(e=>e.src.includes(id)).map(e=>({
   seconds:e.currentTime,ready:e.readyState,error:e.error?.code||null,paused:e.paused
  }));
  return {active,playing,spatial:window.SetkaMusicV1?.diagnostics?.()?.sources?.find(s=>s.trackId===id),
   starts:window.__setkaBufferSourceStarts,buttonDots:document.querySelectorAll(".sm-track.active .sm-dots i").length};
 },remote.id);
 console.log("SETKA_REAL_UI_AUDIO",JSON.stringify({browser:name,...app}));
 if(name==="webkit"){
  assert.equal(app.active?.level,1);
  assert.equal(app.spatial?.losslessWavStreaming,true,"small original WAV must stream as PCM through Safari HRTF");
  assert.equal(app.spatial?.hrtfSpatialized,true);
  assert.equal(app.spatial?.nativeStereoFallback,false);
  assert.ok(app.starts>=2,"actual WebAudio buffers from original audio must play");
 }else{
  assert.ok(app.active?.level>=1&&app.playing.some(e=>e.seconds>0.8&&e.ready>=2&&!e.error),
   name+" actual SETKA track click must produce decoded progressing sound");
 }
}finally{await browser.close()}
