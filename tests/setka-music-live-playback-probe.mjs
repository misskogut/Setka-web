// Real media diagnostic (no stubbing HTMLMediaElement.play).
// Uses owner-published audio URL and real browser fetch/decoding; never logs signed URLs.
import {chromium,webkit} from "playwright";
const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-music-v1";
const FRONT="https://misskogut.github.io/Setka-web/standalone-v34.html";
const catalog=await fetch(API,{signal:AbortSignal.timeout(18000)}).then(r=>r.json());
if(!catalog.ok||!Array.isArray(catalog.tracks))throw Error("No live catalog");
const local=catalog.tracks.find(t=>!t.external_source_path);
const remote=catalog.tracks.find(t=>t.external_source_path?.includes("утренний лес"));
const mp3=catalog.tracks.find(t=>t.external_source_path?.endsWith(".mp3"));
const samples=[local,remote,mp3].filter(Boolean);
if(samples.length!==3)throw Error("Missing local/remote WAV/remote MP3");
const name=process.env.SETKA_BROWSER==="webkit"?"webkit":"chromium";
const browser=await (name==="webkit"?webkit:chromium).launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 page.on("pageerror",e=>console.log("PAGE_ERROR",e.message.slice(0,170)));
 page.on("console",m=>{if(m.type()==="error")console.log("BROWSER_ERROR",m.text().slice(0,170))});
 await page.goto(FRONT,{waitUntil:"domcontentloaded",timeout:90000});
 for(const track of samples){
  for(const graph of [false,true]){
   await page.evaluate(({audio_url,graph})=>{
    window.__media=null;
    document.querySelector("#setka-real-probe")?.remove();
    const b=document.createElement("button");
    b.id="setka-real-probe";b.style.position="fixed";b.style.top="6px";b.style.left="6px";b.style.zIndex="99999";b.textContent="audio test";
    b.onclick=async()=>{
     const el=new Audio();el.crossOrigin="anonymous";el.preload="auto";el.src=audio_url;
     const state={graph,events:[],error:null,startError:null,context:"none"};
     for(const event of ["loadstart","loadedmetadata","canplay","playing","waiting","stalled","error"])el.addEventListener(event,()=>state.events.push(event));
     let ctx=null;
     try{
      if(graph){
       const C=window.AudioContext||window.webkitAudioContext;ctx=new C();
       const src=ctx.createMediaElementSource(el);src.connect(ctx.destination);
       await ctx.resume();
      }
      state.context=ctx?.state||"none";
      await el.play();
     }catch(error){state.startError=String(error?.name||error)+": "+String(error?.message||"").slice(0,120)}
     window.__media={el,ctx,state};
    };
    document.body.append(b);
   },{audio_url:track.audio_url,graph});
   await page.locator("#setka-real-probe").click();
   await page.waitForTimeout(5500);
   const result=await page.evaluate(()=>{
    const p=window.__media;if(!p)return {missing:true};
    const e=p.el;
    const out={...p.state,mediaErrorCode:e.error?.code||null,network:e.networkState,ready:e.readyState,paused:e.paused,seconds:e.currentTime,duration:Number.isFinite(e.duration)?e.duration:null,ctx:p.ctx?.state||"none"};
    try{e.pause();e.removeAttribute("src");e.load();p.ctx?.close()}catch(_){}
    return out;
   });
   console.log("REAL_AUDIO_RESULT",JSON.stringify({browser:name,type:track.external_source_path?track.external_source_path.endsWith(".mp3")?"yandex-mp3":"yandex-wav":"supabase-local",...result}));
  }
 }
}finally{await browser.close()}
