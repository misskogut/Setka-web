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
  const STATUS_KEY="setka-standalone:v34-yulia-last-sync";
  const EVENT_CURSOR_KEY="setka-standalone:v34-last-event-sync";

  function makeId(){
    try{return crypto.randomUUID()}catch(_){return `yulia-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`}
  }
  let deviceId="",firstSeen="",eventCursor="";
  try{
    deviceId=localStorage.getItem(DEVICE_KEY)||makeId();
    localStorage.setItem(DEVICE_KEY,deviceId);
    firstSeen=localStorage.getItem(FIRST_KEY)||new Date().toISOString();
    localStorage.setItem(FIRST_KEY,firstSeen);
    eventCursor=localStorage.getItem(EVENT_CURSOR_KEY)||"";
  }catch(_){deviceId=makeId();firstSeen=new Date().toISOString()}

  let busy=false,lastSignature="",timer=0,lastOkAt=null,lastError=null,lastPolicy=null;
  function favorites(){
    try{return (window.SetkaApp?.getFavorites?.()||[]).map(f=>({id:f.id,patternId:f.baseId||f.patternId,baseId:f.baseId,config:f.config,createdAt:f.createdAt,sourceType:"favorite"}))}catch(_){return[]}
  }
  function signature(){
    const d=C.getData(),p=d.physio?.samples||[],fav=favorites();
    const lastSession=d.sessions?.at?.(-1),lastEvent=d.events?.at?.(-1),lastNote=d.notes?.at?.(-1),lastCheck=d.checkins?.at?.(-1);
    return [d.sessions?.length||0,lastSession?.id||"",lastSession?.phase||"",lastSession?.measuredActiveMs||0,lastSession?.afterFeedbackActiveMs||0,d.events?.length||0,lastEvent?.id||"",d.notes?.length||0,lastNote?.id||"",d.checkins?.length||0,lastCheck?.id||"",p.length,p.at?.(-1)?.id||"",fav.length,fav.map(x=>x.id).join(",")].join("|");
  }
  function viewport(){return{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1,screenWidth:screen?.width||null,screenHeight:screen?.height||null}}
  function deltaEvents(events){
    if(!Array.isArray(events)||!events.length)return[];
    if(!eventCursor)return events.slice();
    const i=events.findIndex(e=>e?.id===eventCursor);
    return i>=0?events.slice(i+1):events.slice();
  }
  function lightArchive(d){
    // RAW telemetry has its own append-only server layer in v34.9.
    // Keep the permanent semantic archive separate so snapshots stay compact.
    return{...d,events:[]};
  }
  function applyServerPolicy(out){
    lastPolicy={retentionDays:out.retentionDays||90,sampleHz:out.sampleHz||8,rawCutoffAt:out.rawCutoffAt||null};
    window.dispatchEvent(new CustomEvent("setka:v34-replay-policy",{detail:lastPolicy}));
  }
  async function syncSemantic(fav,keepalive=false){
    try{
      await fetch(SEMANTIC_API,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify({action:"sync",channel:CHANNEL,deviceId,favorites:fav}),keepalive});
    }catch(_){/* semantic sync must never block participant use */}
  }
  async function sync(force=false,keepalive=false){
    if(busy)return false;
    const sig=signature();if(!force&&sig===lastSignature)return true;
    busy=true;lastError=null;
    try{
      const d=C.getData(),delta=deltaEvents(d.events||[]),fav=favorites();
      const body={action:"sync",channel:CHANNEL,deviceId,firstSeenAt:firstSeen,userAgent:navigator.userAgent,viewport:viewport(),archive:lightArchive(d),eventsDelta:delta};
      const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify(body),keepalive});
      if(!r.ok)throw new Error(`sync_${r.status}`);
      const out=await r.json();
      await syncSemantic(fav,keepalive);
      if(delta.length){eventCursor=delta.at(-1)?.id||eventCursor;try{localStorage.setItem(EVENT_CURSOR_KEY,eventCursor)}catch(_){}}
      lastSignature=sig;lastOkAt=out.updatedAt||new Date().toISOString();applyServerPolicy(out);
      try{localStorage.setItem(STATUS_KEY,lastOkAt)}catch(_){}
      window.dispatchEvent(new CustomEvent("setka:v34-sync",{detail:{ok:true,label:"Юля",deviceId,updatedAt:lastOkAt,acceptedEvents:out.acceptedEvents||0,retentionDays:out.retentionDays||90}}));
      return true;
    }catch(e){lastError=String(e?.message||e);window.dispatchEvent(new CustomEvent("setka:v34-sync",{detail:{ok:false,label:"Юля",deviceId,error:lastError}}));return false}
    finally{busy=false}
  }
  function schedule(ms=900){clearTimeout(timer);timer=setTimeout(()=>sync(false),ms)}

  window.addEventListener("setka:standalone-event",()=>schedule(700));
  window.addEventListener("setka:favorite-saved",()=>schedule(300));
  window.addEventListener("setka:favorite-removed",()=>schedule(300));
  window.addEventListener("setka:v34-sync-request",()=>sync(true));
  document.addEventListener("visibilitychange",()=>{if(document.hidden)sync(true,true);else schedule(300)});
  window.addEventListener("pagehide",()=>sync(true,true));
  setInterval(()=>sync(false),12000);
  setTimeout(()=>sync(true),500);

  C.sandbox={label:"Юля",channel:CHANNEL,deviceId,firstSeenAt:firstSeen,sync:()=>sync(true),status:()=>({deviceId,label:"Юля",lastOkAt,lastError,replayPolicy:lastPolicy,eventCursor})};
})();