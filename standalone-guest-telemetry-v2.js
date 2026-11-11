(()=>{"use strict";
// Minimal guest research telemetry: pattern ID and measured duration only.
// No notes, pulse, symptoms, audio, raw gestures or private corpus.
const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-guest-events-v2";
const DEVICE="setka-standalone:v34-yulia-device",ACCOUNT="setka-v40:cabinet-session";
const DONE="setka:v2-guest-sent",MAX_DONE=3000;
let busy=false,timer=0;
function isAccount(){for(const store of [localStorage,sessionStorage]){try{const s=JSON.parse(store.getItem(ACCOUNT)||"null");if(s?.token)return true}catch(_){}}return false}
function id(){try{return localStorage.getItem(DEVICE)||""}catch(_){return ""}}
function done(){try{return JSON.parse(localStorage.getItem(DONE)||"[]")}catch(_){return []}}
async function eventId(value){
 const bytes=new TextEncoder().encode("setka:guest:v2:"+value);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),x=>x.toString(16).padStart(2,"0")).join("");
 return hash.slice(0,8)+"-"+hash.slice(8,12)+"-4"+hash.slice(13,16)+"-8"+hash.slice(17,20)+"-"+hash.slice(20,32);
}
async function sync(){
 if(busy||isAccount()||!id()||!crypto?.subtle)return;
 const data=window.SetkaStandaloneV34?.getData?.();
 const exposures=Array.isArray(data?.patternExposures)?data.patternExposures:[];
 if(!exposures.length)return;
 const already=new Set(done()),valid=x=>x?.exposureId&&x?.sessionId&&x?.patternId&&Number.isInteger(Math.floor(Number(x.durationMs)))&&Number(x.durationMs)>=1&&Number(x.durationMs)<=86400000&&/^[a-zA-Z0-9_:.-]+$/.test(String(x.patternId))&&String(x.patternId).length<=120&&/^[a-zA-Z0-9_:.-]+$/.test(String(x.sessionId))&&String(x.sessionId).length<=180&&Number.isFinite(Date.parse(x.endedAt||x.startedAt))&&Date.parse(x.endedAt||x.startedAt)>=Date.now()-89*86400000;
 const pending=exposures.filter(x=>valid(x)&&!already.has(String(x.exposureId))).slice(0,25);
 if(!pending.length)return;
 busy=true;
 try{
  const events=[],submitted=[];
  for(const x of pending){
   const occurredAt=x.endedAt||x.startedAt;
   if(!occurredAt||!Number.isFinite(Date.parse(occurredAt)))continue;
   submitted.push(String(x.exposureId)); 
   events.push({eventId:await eventId(id()+":"+x.exposureId),eventType:"pattern_exposure",patternId:String(x.patternId),sessionId:String(x.sessionId),durationMs:Math.min(86400000,Math.floor(Number(x.durationMs))),occurredAt});
  }
  if(!events.length)return;
  if(isAccount())return;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  let response;
  try{response=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({deviceId:id(),events}),signal:controller.signal})}finally{clearTimeout(timeout)}
  const result=await response.json();
  if(!response.ok||result.ok!==true||result.accepted!==events.length)throw Error("unconfirmed_delivery");
  const next=[...already,...submitted].slice(-MAX_DONE);
  try{localStorage.setItem(DONE,JSON.stringify(next))}catch(_){}
  window.dispatchEvent(new CustomEvent("setka:v2-guest-sync",{detail:{ok:true,accepted:events.length}}));
 }catch(_){window.dispatchEvent(new CustomEvent("setka:v2-guest-sync",{detail:{ok:false}}))}
 finally{busy=false}
}
function schedule(){clearTimeout(timer);timer=setTimeout(sync,1800)}
window.addEventListener("setka:standalone-event",schedule);
window.addEventListener("online",schedule);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule()});
setInterval(schedule,45000);setTimeout(schedule,5000);
})();