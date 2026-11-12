(()=>{
"use strict";
// Automated production-page browser checks are not research participants.
// Preserve local fixture coverage; exclude real HTTPS/public production hosts only.
if(typeof navigator!=="undefined"&&navigator.webdriver===true&&
 typeof location!=="undefined"&&/^(?:misskogut\.github\.io|(?:www\.)?setka-app\.com)$/.test(location.hostname))return;

// Privacy-minimal guest journey telemetry for SETKA Web.
// Existing exposure collector remains independent and unchanged.
// Never sends notes, symptoms, audio data, gestures, account credentials or raw configs.
const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-guest-events-v2";
const DEVICE="setka-standalone:v34-yulia-device",ACCOUNT="setka-v40:cabinet-session";
const QUEUE="setka:v3-guest-journey-pending",MAX_QUEUE=400,MAX_AGE=89*86400000;
const SUPPORTED=new Set(["visit_start","visit_end","app_return","pattern_open","favorite_save","favorite_remove","music_play"]);
let activeVisit=null,visitStartedAt=0,hiddenSince=0,busy=false,timer=0,retry=0,initializing=false;
const validId=x=>typeof x==="string"&&x.length>0&&x.length<=120&&/^[a-zA-Z0-9_:.\-]+$/.test(x);
function device(){try{return localStorage.getItem(DEVICE)||""}catch(_){return""}}
function signedIn(){for(const store of [localStorage,sessionStorage]){try{if(JSON.parse(store.getItem(ACCOUNT)||"null")?.token)return true}catch(_){}}return false}
function read(){try{const a=JSON.parse(localStorage.getItem(QUEUE)||"[]");return Array.isArray(a)?a:[]}catch(_){return[]}}
function write(rows){try{localStorage.setItem(QUEUE,JSON.stringify(rows.slice(-MAX_QUEUE)))}catch(_){}}
function randomId(){
 if(typeof crypto.randomUUID==="function")return crypto.randomUUID();
 const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
 const s=Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");
 return s.slice(0,8)+"-"+s.slice(8,12)+"-"+s.slice(12,16)+"-"+s.slice(16,20)+"-"+s.slice(20);
}
function append(type,{patternId=null,trackId=null,durationMs=null,sessionId=activeVisit,allowGuestClose=false}={}){
 if(!SUPPORTED.has(type)||(signedIn()&&!allowGuestClose)||!validId(device()))return false;
 if(patternId!==null&&!validId(patternId))return false;
 if(type==="pattern_open"&&!patternId)return false;
 if(type==="music_play"&&!validId(trackId))return false;
 const event={eventId:randomId(),eventType:type,sessionId:sessionId||null,patternId,occurredAt:new Date().toISOString()};
 if(type==="visit_end")event.durationMs=Math.max(0,Math.min(86400000,Math.floor(Number(durationMs)||0)));
 if(type==="music_play")event.trackId=trackId;
 const rows=read();rows.push(event);write(rows);
 schedule();return true;
}
function startVisit(){
 if(activeVisit||signedIn()||!validId(device()))return false;
 const value="v3-"+randomId();
 activeVisit=value;visitStartedAt=Date.now();
 return append("visit_start",{sessionId:value});
}
function endVisit(){
 if(!activeVisit)return;
 const value=activeVisit;activeVisit=null;
 append("visit_end",{sessionId:value,durationMs:Date.now()-visitStartedAt,allowGuestClose:true});
}
async function flush(){
 if(busy||!validId(device()))return;
 const now=Date.now();
 const rows=read().filter(e=>e&&SUPPORTED.has(e.eventType)&&Number.isFinite(Date.parse(e.occurredAt))&&now-Date.parse(e.occurredAt)<=MAX_AGE);
 if(rows.length!==read().length)write(rows);
 if(!rows.length)return;
 busy=true;
 const batch=rows.slice(0,20);
 try{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  let response;
  try{response=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},body:JSON.stringify({deviceId:device(),events:batch}),keepalive:true,signal:controller.signal})}
  finally{clearTimeout(timeout)}
  const result=await response.json();
  if(!response.ok||result.ok!==true||result.accepted!==batch.length)throw Error("not_acknowledged");
  const done=new Set(batch.map(e=>e.eventId));
  write(read().filter(e=>!done.has(e.eventId)));
  retry=0;
  if(read().length)schedule(1000);
  // When all pre-login guest events have actually been acknowledged, ask the
  // already-existing authenticated sync to retry the verified identity link.
  else if(signedIn())window.dispatchEvent(new CustomEvent("setka:v34-sync-request",{detail:{reason:"guest-journey-acknowledged"}}));
 }catch(_){retry=Math.min(6,retry+1);schedule(Math.min(60000,1500*2**retry))}
 finally{busy=false}
}
function schedule(delay=1400){clearTimeout(timer);timer=setTimeout(flush,delay)}
function initialize(){
 if(initializing)return;initializing=true;
 if(!signedIn()&&!activeVisit)startVisit();
 schedule(2500);
}
window.addEventListener("setka:pattern-open",e=>{
 const p=e.detail?.state?.patternId||e.detail?.patternId||window.SetkaApp?.getState?.()?.patternId;
 if(validId(p))append("pattern_open",{patternId:p});
});
for(const [event,type] of [["setka:favorite-saved","favorite_save"],["setka:favorite-removed","favorite_remove"]]){
 window.addEventListener(event,e=>{
  const favorite=e.detail?.favorite;
  const p=favorite?.patternId||favorite?.config?.patternId||null;
  append(type,{patternId:validId(p)?p:null});
 });
}
window.addEventListener("setka:music-play",e=>{
 const trackId=e.detail?.trackId;
 if(validId(trackId))append("music_play",{trackId});
});
window.addEventListener("setka:v40-account",()=>{
 if(signedIn()){endVisit();schedule(150);return}
 if(!document.hidden)startVisit();
 schedule(150);
});
window.addEventListener("online",()=>schedule(250));
window.addEventListener("pageshow",()=>{if(!activeVisit&&!document.hidden)startVisit();schedule(250)});
document.addEventListener("visibilitychange",()=>{
 if(document.hidden){hiddenSince=Date.now();endVisit();schedule(200)}
 else{
  if(hiddenSince&&Date.now()-hiddenSince>=30000)append("app_return",{sessionId:null});
  hiddenSince=0;startVisit();schedule(300);
 }
});
window.addEventListener("pagehide",()=>{endVisit();void flush()});
window.addEventListener("storage",e=>{if(e.key===QUEUE)schedule(1200)});
setInterval(()=>{if(!document.hidden&&!signedIn())startVisit();schedule()},45000);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
else initialize();
})();
