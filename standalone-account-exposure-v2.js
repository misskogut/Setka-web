(()=>{
"use strict";
// Authenticated, metadata-only V2 pattern exposures. Existing V41 archive remains intact.
// No old guest history is retrospectively attributed to a newly signed-in account.
const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-semantic-v35";
const DEVICE_KEY="setka-standalone:v34-yulia-device",SESSION_KEY="setka-v40:cabinet-session";
const QUEUE="setka:v2-account-exposure-pending",CHANNEL="yulia_lab_v34",MAX_QUEUE=250,MAX_DONE=4000;
let collecting=false,flushing=false,scanTimer=0,sendTimer=0,retries=0;
const valid=x=>typeof x==="string"&&x.length>0&&x.length<=180&&/^[a-zA-Z0-9_:.-]+$/.test(x);
function account(){
 for(const store of [localStorage,sessionStorage]){
  try{const x=JSON.parse(store.getItem(SESSION_KEY)||"null");if(x?.token&&valid(x.testerId))return x}catch(_){}
 }
 return null;
}
function device(){try{return localStorage.getItem(DEVICE_KEY)||""}catch(_){return""}}
function corpusReady(a){
 return !!a&&window.__SETKA_PRIVATE_CORPUS_V40__?.authoritative?.()===true&&
  window.SetkaDataScopeV1?.id==="tester:"+a.testerId;
}
function key(prefix,owner){return prefix+":"+owner}
function read(){try{const r=JSON.parse(localStorage.getItem(QUEUE)||"[]");return Array.isArray(r)?r:[]}catch(_){return[]}}
function write(rows){try{localStorage.setItem(QUEUE,JSON.stringify(rows))}catch(_){}}
function done(owner){try{const r=JSON.parse(localStorage.getItem(key("setka:v2-account-exposure-done",owner))||"[]");return Array.isArray(r)?r:[]}catch(_){return[]}}
function remember(owner,ids){
 try{localStorage.setItem(key("setka:v2-account-exposure-done",owner),JSON.stringify([...new Set([...done(owner),...ids])].slice(-MAX_DONE)))}catch(_){}
}
function epoch(owner){
 const k=key("setka:v2-account-exposure-start",owner);
 try{
  const raw=localStorage.getItem(k),at=Date.parse(raw||"");
  if(Number.isFinite(at)&&at<=Date.now()+300000)return at;
  const now=Date.now();localStorage.setItem(k,new Date(now).toISOString());return now;
 }catch(_){return Date.now()}
}
async function exposureEventId(owner,exposureId){
 const bytes=new TextEncoder().encode("setka:account:v2:"+owner+":"+exposureId);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("");
 return hash.slice(0,8)+"-"+hash.slice(8,12)+"-4"+hash.slice(13,16)+"-8"+hash.slice(17,20)+"-"+hash.slice(20,32);
}
function scanSoon(ms=600){clearTimeout(scanTimer);scanTimer=setTimeout(collect,ms)}
function sendSoon(ms=800){clearTimeout(sendTimer);sendTimer=setTimeout(flush,ms)}
async function collect(){
 if(collecting||!crypto?.subtle)return;
 const a=account();if(!a||!valid(device()))return;
 const since=epoch(a.testerId);if(!corpusReady(a))return;
 const rows=window.SetkaStandaloneV34?.getData?.()?.patternExposures;
 if(!Array.isArray(rows))return;
 collecting=true;
 try{
  const owner=a.testerId,seen=new Set(done(owner)),queue=read(),pending=new Set(queue.filter(x=>x.accountId===owner).map(x=>x.exposureId));
  let slots=Math.max(0,MAX_QUEUE-queue.length);
  for(const x of rows){
   if(!slots||account()?.testerId!==owner||!corpusReady(a))break;
   if(!valid(x?.exposureId)||!valid(x?.patternId)||seen.has(x.exposureId)||pending.has(x.exposureId))continue;
   const started=Date.parse(x.startedAt||""),ended=Date.parse(x.endedAt||"");
   const duration=Math.floor(Number(x.durationMs));
   if(!Number.isFinite(started)||!Number.isFinite(ended)||started<since||ended<since||ended> Date.now()+300000||ended<started||
    !Number.isInteger(duration)||duration<1||duration>86400000)continue;
   if(x.sessionId!=null&&!valid(x.sessionId))continue;
   const sessionType=x.sessionId&&(x.sessionType==="outcome"||x.sessionType==="exploration")?x.sessionType:null;
   queue.push({accountId:owner,exposureId:x.exposureId,eventId:await exposureEventId(owner,x.exposureId),
    eventType:"pattern_exposure",patternId:x.patternId,sessionId:x.sessionId||null,sessionType,
    durationMs:duration,occurredAt:new Date(ended).toISOString()});
   pending.add(x.exposureId);slots--;
  }
  if(queue.length!==read().length){write(queue);sendSoon(100)}
 }finally{collecting=false}
}
async function flush(){
 const a=account();if(flushing||!a||!valid(device())||!corpusReady(a))return;
 const owner=a.testerId,queue=read(),now=Date.now();
 const batch=queue.filter(x=>x.accountId===owner&&Number.isFinite(Date.parse(x.occurredAt))&&
  now-Date.parse(x.occurredAt)<=89*86400000).slice(0,20);
 if(!batch.length)return;
 flushing=true;
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  const items=batch.map(({accountId,exposureId,...event})=>event);
  let res;
  try{res=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},
   body:JSON.stringify({action:"journey-v1",channel:CHANNEL,deviceId:device(),sessionToken:a.token,events:items}),signal:controller.signal,keepalive:true})}
  finally{clearTimeout(timer)}
  const out=await res.json();
  if(!res.ok||out.ok!==true||out.accepted!==items.length)throw Error("receipt_missing");
  // Preserve other accounts' queues, even when the active account changes mid-flight.
  remember(owner,batch.map(x=>x.exposureId));
  const completed=new Set(batch.map(x=>x.eventId));
  write(read().filter(x=>!(x.accountId===owner&&completed.has(x.eventId))));
  retries=0;window.dispatchEvent(new CustomEvent("setka:v2-account-sync",{detail:{ok:true,accepted:items.length}}));
  scanSoon(150);sendSoon(500);
 }catch(_){
  retries=Math.min(retries+1,6);sendSoon(Math.min(60000,1600*2**retries));
  window.dispatchEvent(new CustomEvent("setka:v2-account-sync",{detail:{ok:false}}));
 }finally{flushing=false}
}
function wake(){const a=account();if(a)epoch(a.testerId);scanSoon(100);sendSoon(1000)}
window.addEventListener("setka:v40-account",wake);
window.addEventListener("setka:v40-private-corpus-restored",wake);
window.addEventListener("setka:standalone-event",()=>scanSoon(300));
window.addEventListener("online",wake);
window.addEventListener("pageshow",wake);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)wake()});
setInterval(wake,45000);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",wake,{once:true});else wake();
})();
