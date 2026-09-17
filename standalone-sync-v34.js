(() => {
  "use strict";
  const C=window.SetkaStandaloneV34;
  if(!C)return;

  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-standalone-v34";
  const SEMANTIC_API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-semantic-v35";
  const API_KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const CHANNEL="yulia_lab_v34";
  const DEVICE_KEY="setka-standalone:v34-yulia-device";
  const FIRST_KEY="setka-standalone:v34-yulia-first-seen";
  const STATUS_KEY="setka-standalone:v40-last-heartbeat";

  function makeId(){try{return crypto.randomUUID()}catch(_){return `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`}}
  let deviceId="",firstSeen="";
  try{
    deviceId=localStorage.getItem(DEVICE_KEY)||makeId();localStorage.setItem(DEVICE_KEY,deviceId);
    firstSeen=localStorage.getItem(FIRST_KEY)||new Date().toISOString();localStorage.setItem(FIRST_KEY,firstSeen);
  }catch(_){deviceId=makeId();firstSeen=new Date().toISOString()}

  let busy=false,lastSignature="",timer=0,lastOkAt=null,lastError=null,lastFavoriteStats={local:0,unique:0,cloud:0},lastSubjectKey=null;

  function favorites(){
    try{
      const app=window.SetkaApp,raw=app?.getFavorites?.()||[],byKey=new Map();
      for(const f of raw){
        const patternId=f.baseId||f.patternId||f.config?.patternId||"tentacle-orbit";
        const config=f.config||{};
        const configKey=app?.configKey?.(config,patternId)||`${patternId}|${JSON.stringify(config)}`;
        const item={id:f.id,patternId,baseId:f.baseId||patternId,configKey,config,createdAt:f.createdAt,sourceType:"favorite"};
        const prev=byKey.get(configKey);
        if(!prev||Number(item.createdAt||0)>=Number(prev.createdAt||0))byKey.set(configKey,item);
      }
      lastFavoriteStats={...lastFavoriteStats,local:raw.length,unique:byKey.size};
      return [...byKey.values()];
    }catch(_){lastFavoriteStats={local:0,unique:0,cloud:0};return[]}
  }

  function signature(){const fav=favorites();return fav.map(x=>`${x.configKey}:${x.id||""}`).join(",")}
  async function post(url,payload,keepalive=false){
    const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",apikey:API_KEY},body:JSON.stringify(payload),keepalive});
    const out=await r.json().catch(()=>({}));if(!r.ok)throw new Error(out.error||`http_${r.status}`);return out;
  }
  async function syncSemantic(fav,keepalive=false){
    return post(SEMANTIC_API,{action:"sync",channel:CHANNEL,deviceId,favorites:fav},keepalive);
  }
  async function sync(force=false,keepalive=false){
    if(busy)return false;const sig=signature();if(!force&&sig===lastSignature&&lastOkAt&&Date.now()-Date.parse(lastOkAt)<60000)return true;
    busy=true;lastError=null;
    try{
      // Privacy contract: no sessions, notes, states, symptoms, pulse, raw events or exposure timeline leave the device here.
      const heartbeat=await post(API,{action:"sync",channel:CHANNEL,deviceId,firstSeenAt:firstSeen,build:"v40-private-local"},keepalive);
      const fav=favorites(),semantic=await syncSemantic(fav,keepalive);
      lastSignature=sig;lastOkAt=heartbeat.updatedAt||new Date().toISOString();lastSubjectKey=heartbeat.subjectKey||null;
      lastFavoriteStats={...lastFavoriteStats,cloud:Number(semantic?.favorites??fav.length)||0};
      try{localStorage.setItem(STATUS_KEY,lastOkAt)}catch(_){}
      window.dispatchEvent(new CustomEvent("setka:v34-sync",{detail:{ok:true,label:heartbeat.label||"Гость",subjectKey:lastSubjectKey,deviceId,updatedAt:lastOkAt,acceptedEvents:0,acceptedExposures:0,favoritesLocal:lastFavoriteStats.local,favoritesUnique:lastFavoriteStats.unique,favoritesCloud:lastFavoriteStats.cloud,privacyMode:"local-personal-corpus"}}));
      return true;
    }catch(e){
      lastError=String(e?.message||e);window.dispatchEvent(new CustomEvent("setka:v34-sync",{detail:{ok:false,label:"Гость",deviceId,error:lastError,privacyMode:"local-personal-corpus",favoritesLocal:lastFavoriteStats.local,favoritesUnique:lastFavoriteStats.unique}}));return false;
    }finally{busy=false}
  }
  function schedule(ms=900){clearTimeout(timer);timer=setTimeout(()=>sync(false),ms)}

  window.addEventListener("setka:favorite-saved",()=>schedule(200));
  window.addEventListener("setka:favorite-removed",()=>schedule(200));
  window.addEventListener("setka:v34-sync-request",()=>sync(true));
  document.addEventListener("visibilitychange",()=>{if(document.hidden)sync(true,true);else schedule(500)});
  window.addEventListener("pagehide",()=>sync(true,true));
  setInterval(()=>sync(false),60000);setTimeout(()=>sync(true),500);

  C.sandbox={
    label:"Гость",channel:CHANNEL,deviceId,firstSeenAt:firstSeen,
    sync:()=>sync(true),
    status:()=>({deviceId,label:String(lastSubjectKey||"").startsWith("T-")?"Тестировщик":"Гость",subjectKey:lastSubjectKey,lastOkAt,lastError,favorites:lastFavoriteStats,privacyMode:"local-personal-corpus",personalArchiveSynced:false,rawTelemetrySynced:false})
  };
})();