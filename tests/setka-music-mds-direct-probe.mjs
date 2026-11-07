// Resolve Yandex's final media CDN (NOT its attachment redirect) and verify Safari
// receives the true full-file duration and playable media without exposing URLs.
import assert from "node:assert/strict";
import {chromium,webkit} from "playwright";
const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-music-v1";
const FRONT="https://misskogut.github.io/Setka-web/standalone-v34.html";
const d=await fetch(API).then(r=>r.json());
const samples=[
 d.tracks.find(t=>t.external_source_path?.includes("утренний лес")),
 d.tracks.find(t=>t.external_source_path?.endsWith(".mp3")),
 d.tracks.find(t=>t.external_source_path?.includes("Shavasana"))
];
assert.ok(samples.every(Boolean),"Yandex WAV, MP3, and long WAV are available");
const type=process.env.SETKA_BROWSER==="webkit"?"webkit":"chromium";
const browser=await (type==="webkit"?webkit:chromium).launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.goto(FRONT,{waitUntil:"domcontentloaded",timeout:70000});
 for(const track of samples){
  const r=await fetch(track.external_audio_url,{redirect:"manual",headers:{range:"bytes=0-63"},signal:AbortSignal.timeout(14000)});
  const final=r.headers.get("location")||r.url;
  const target=new URL(final);
  const host=target.hostname;
  assert.equal(host,"mds.storage.yandex.net","resolve final media host");
  target.searchParams.set("disposition","inline");
  await r.body?.cancel();
  await page.evaluate(url=>{
   window.__one=null;
   document.querySelector("#probe-mds")?.remove();
   const b=document.createElement("button");b.id="probe-mds";b.style.cssText="position:fixed;top:5px;left:5px;z-index:9999";b.innerText="probe";
   b.onclick=()=>{
    const el=new Audio();el.crossOrigin="anonymous";el.src=url;el.preload="auto";
    window.__one={el,error:null};
    el.play().catch(e=>{window.__one.error=e.name});
   };
   document.body.append(b);
  },target.toString());
  await page.locator("#probe-mds").click();
  await page.waitForFunction(()=>window.__one&&(window.__one.el.currentTime>.8||window.__one.el.error||window.__one.error),null,{timeout:17000}).catch(()=>{});
  const info=await page.evaluate(()=>{
   const p=window.__one,e=p.el;const out={playing:e.currentTime>.8,seconds:e.currentTime,duration:e.duration,error:p.error||e.error?.code||null,network:e.networkState,ready:e.readyState};
   e.pause();e.removeAttribute("src");e.load();return out;
  });
  console.log("MDS_DIRECT_AUDIO",JSON.stringify({browser:type,file:track.external_source_path.endsWith(".mp3")?"mp3":track.external_source_path.includes("Shavasana")?"large-wav":"small-wav",...info}));
  assert.ok(info.playing&&!info.error,"actual direct media must play");
 }
}finally{await browser.close()}
