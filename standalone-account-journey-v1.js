(()=>{
"use strict";
// Account-only high-level journey events. Uses existing device-bound account
// session; server validates the token. Never sends private notes, health data,
// raw gestures, audio, favorites' full configurations or account credentials.
const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-semantic-v35";
const DEVICE_KEY="setka-standalone:v34-yulia-device",SESSION_KEY="setka-v40:cabinet-session";
const QUEUE_KEY="setka:v4-account-journey-pending",CHANNEL="yulia_lab_v34",MAX_QUEUE=400,MAX_AGE=89*86400000;
const TYPES=new Set(["visit_start","visit_end","app_return","pattern_open","favorite_save","favorite_remove","music_play"]);
const valid=x=>typeof x==="string"&&x.length>0&&x.length<=120&&/^[a-zA-Z0-9_:.\-]+$/.test(x);
let visit=null,owner=null,startedAt=0,hiddenSince=0,busy=false,timer=0,retries=0,initialized=false;
function account(){
 for(const store of [localStorage,sessionStorage]){
  try{const v=JSON.parse(store.getItem(SESSION_KEY)||"null");if(v?.token&&valid(v.testerId))return v}catch(_){}
 }
 return null;
}
function device(){try{return localStorage.getItem(DEVICE_KEY)||""}catch(_){return""}}
function read(){try{const v=JSON.parse(localStorage.getItem(QUEUE_KEY)||"[]");return Array.isArray(v)?v:[]}catch(_){return[]}}
function write(rows){try{localStorage.setItem(QUEUE_KEY,JSON.stringify(rows.slice(-MAX_QUEUE)))}catch(_){}}
function uuid(){
 if(crypto.randomUUID)return crypto.randomUUID();
 const a=new Uint8Array(16);crypto.getRandomValues(a);a[6]=(a[6]&15)|64;a[8]=(a[8]&63)|128;
 const s=Array.from(a,x=>x.toString(16).padStart(2,"0")).join("");
 return s.slice(0,8)+"-"+s.slice(8,12)+"-"+s.slice(12,16)+"-"+s.slice(16,20)+"-"+s.slice(20);
}
function append(type,{patternId=null,trackId=null,durationMs=null,sessionId=visit,asOwner=null}={}){
 const id=asOwner||account()?.testerId;
 if(!valid(id)||!valid(device())||!TYPES.has(type))return false;
 if(patternId!=null&&!valid(patternId))return false;
 if(type==="pattern_open"&&!valid(patternId))return false;
 if(type==="music_play"&&!valid(trackId))return false;
 const e={accountId:id,eventId:uuid(),eventType:type,sessionId:sessionId||null,patternId,occurredAt:new Date().toISOString()};
 if(type==="visit_end")e.durationMs=Math.max(0,Math.min(86400000,Math.floor(Number(durationMs)||0)));
 if(type==="music_play")e.trackId=trackId;
 const rows=read();rows.push(e);write(rows);schedule();return true;
}
function start(){
 const a=account();if(!a||!valid(device())||document.hidden||visit)return false;
 visit="v4-"+uuid();owner=a.testerId;startedAt=Date.now();
 return append("visit_start",{asOwner:owner,sessionId:visit});
}
function end(){
 if(!visit)return;
 const id=owner,key=visit;visit=null;owner=null;
 append("visit_end",{asOwner:id,sessionId:key,durationMs:Date.now()-startedAt});
}
function schedule(ms=1400){clearTimeout(timer);timer=setTimeout(flush,ms)}
async function flush(){
 const a=account();if(!a||busy||!valid(device()))return;
 const now=Date.now();const list=read().filter(e=>e&&TYPES.has(e.eventType)&&Number.isFinite(Date.parse(e.occurredAt))&&now-Date.parse(e.occurredAt)<=MAX_AGE);
 if(list.length!==read().length)write(list);
 const batch=list.filter(e=>e.accountId===a.testerId).slice(0,20);if(!batch.length)return;
 busy=true;
 try{
  const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),10000);
  const items=batch.map(({accountId,...e})=>e);
  let res;
  try{res=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},
   body:JSON.stringify({action:"journey-v1",channel:CHANNEL,deviceId:device(),sessionToken:a.token,events:items}),keepalive:true,signal:ctrl.signal})}
  finally{clearTimeout(timeout)}
  const data=await res.json();
  if(!res.ok||data.ok!==true||data.accepted!==items.length)throw Error("not_acknowledged");
  const done=new Set(batch.map(e=>e.eventId));
  write(read().filter(e=>!done.has(e.eventId)));
  retries=0;if(read().some(e=>e.accountId===a.testerId))schedule(900);
 }catch(_){retries=Math.min(6,retries+1);schedule(Math.min(60000,1500*2**retries))}
 finally{busy=false}
}
window.addEventListener("setka:pattern-open",e=>{
 const id=e.detail?.state?.patternId||e.detail?.patternId||window.SetkaApp?.getState?.()?.patternId;
 if(valid(id))append("pattern_open",{patternId:id});
});
for(const [name,type] of [["setka:favorite-saved","favorite_save"],["setka:favorite-removed","favorite_remove"]]){
 window.addEventListener(name,e=>{
  const f=e.detail?.favorite,p=f?.patternId||f?.config?.patternId||null;
  append(type,{patternId:valid(p)?p:null});
 });
}
window.addEventListener("setka:music-play",e=>{if(valid(e.detail?.trackId))append("music_play",{trackId:e.detail.trackId})});
window.addEventListener("setka:v40-account",()=>{
 const a=account();
 if(visit&&(!a||owner!==a.testerId))end();
 if(a){start();schedule(150)}
});
window.addEventListener("online",()=>schedule(250));
window.addEventListener("pageshow",()=>{if(!visit)start();schedule(250)});
window.addEventListener("pagehide",()=>{end();void flush()});
window.addEventListener("storage",e=>{if(e.key===QUEUE_KEY)schedule(1200)});
document.addEventListener("visibilitychange",()=>{
 if(document.hidden){hiddenSince=Date.now();end();schedule(250)}
 else{if(hiddenSince&&Date.now()-hiddenSince>=30000)append("app_return",{sessionId:null});hiddenSince=0;start();schedule(350)}
});
setInterval(()=>{if(!document.hidden)start();schedule()},45000);
function init(){if(initialized)return;initialized=true;start();schedule(2500)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();
