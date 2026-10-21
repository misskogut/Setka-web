(() => {
  "use strict";
  const C=window.SetkaStandaloneV34;
  if(!C)return;

  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-standalone-v34";
  const SEMANTIC_API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-semantic-v35";
  // The session token and device binding are validated by both server functions.
  const CHANNEL="yulia_lab_v34";
  const DEVICE_KEY="setka-standalone:v34-yulia-device";
  const FIRST_KEY="setka-standalone:v34-yulia-first-seen";
  const STATUS_KEY="setka-standalone:v40-last-heartbeat";
  const SESSION_KEY="setka-v40:cabinet-session";

  function makeId(){try{return crypto.randomUUID()}catch(_){return `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`}}
  let deviceId="",firstSeen="";
  try{
    deviceId=localStorage.getItem(DEVICE_KEY)||makeId();localStorage.setItem(DEVICE_KEY,deviceId);
    firstSeen=localStorage.getItem(FIRST_KEY)||new Date().toISOString();localStorage.setItem(FIRST_KEY,firstSeen);
  }catch(_){deviceId=makeId();firstSeen=new Date().toISOString()}

  let busy=false,rerunRequested=false,lastSignature="",timer=0,lastOkAt=null,lastError=null,lastAccountToken=null,lastFavoriteStats={local:0,unique:0,cloud:0},lastUsageStats={sessions:0,exposures:0},lastSubjectKey=null;

  function accountSession(){
    for(const store of [localStorage,sessionStorage]){
      try{const x=JSON.parse(store.getItem(SESSION_KEY)||"null");if(x?.token)return x}catch(_){}
    }
    return null;
  }

  function favorites(){
    try{
      const app=window.SetkaApp,raw=app?.getFavorites?.()||[],byKey=new Map();
      for(const f of raw){
        const patternId=f.baseId||f.patternId||f.config?.patternId||null;
        if(!patternId)continue;
        const config=f.config||{};
        const configKey=app?.configKey?.(config,patternId)||`${patternId}|${JSON.stringify(config)}`;
        const item={id:f.id,patternId,baseId:f.baseId||patternId,configKey,config,createdAt:f.createdAt,sourceType:"favorite"};
        const prev=byKey.get(configKey);
        if(!prev||Date.parse(item.createdAt||"")>=Date.parse(prev.createdAt||""))byKey.set(configKey,item);
      }
      lastFavoriteStats={...lastFavoriteStats,local:raw.length,unique:byKey.size};
      return [...byKey.values()];
    }catch(_){lastFavoriteStats={local:0,unique:0,cloud:0};return[]}
  }

  function serviceUsage(){
    const d=C.getData?.()||{},sessions=[],exposures=[];
    const ledger=Array.isArray(d.patternExposures)?d.patternExposures:[];
    const coveredSessions=new Set();
    // Canonical PatternExposure covers measured AND free exploration. Do not
    // reconstruct a second copy from session.usage once canonical rows exist.
    for(const x of ledger){
      const patternId=x?.patternId||x?.config?.patternId||null;
      if(!x?.exposureId||!patternId||!(Number(x.durationMs)>0))continue;
      if(x.sessionId)coveredSessions.add(String(x.sessionId));
      exposures.push({exposureId:String(x.exposureId),sessionId:x.sessionId||null,
        patternId,configKey:x.configKey||window.SetkaApp?.configKey?.(x.config,patternId)||null,
        durationMs:Math.max(0,Number(x.durationMs)||0),
        startedAt:x.startedAt||null,endedAt:x.endedAt||null});
    }
    for(const item of (d.sessions||[])){
      if(!item?.id)continue;
      const sid=String(item.id);
      sessions.push({id:sid,startedAt:item.startedAt||null,endedAt:item.endedAt||null,completed:item.completed===true});
      if(coveredSessions.has(sid))continue;
      const base=Date.parse(item.startedAt||"");
      for(const [i,u] of (item.usage||[]).entries()){
        if(!u?.config||!(Number(u.durationMs)>0))continue;
        const patternId=u.patternId||u.config?.patternId||null;
        if(!patternId)continue;
        const configKey=u.configKey||window.SetkaApp?.configKey?.(u.config,patternId)||null;
        const startedMs=Math.max(0,Number(u.startedMs)||0),endedMs=Math.max(startedMs,Number(u.endedMs)||startedMs+Math.max(0,Number(u.durationMs)||0));
        const startedAt=Number.isFinite(base)?new Date(base+startedMs).toISOString():null,endedAt=Number.isFinite(base)?new Date(base+endedMs).toISOString():null;
        exposures.push({exposureId:`svc-${sid}-${i}-${u.phase||"view"}`,sessionId:sid,patternId,configKey,durationMs:Math.max(0,Number(u.durationMs)||0),startedAt,endedAt});
      }
    }
    lastUsageStats={sessions:sessions.length,exposures:exposures.length};
    return{sessions:sessions.slice(-5000),exposures:exposures.slice(-20000)};
  }
  function signature(){const fav=favorites(),u=serviceUsage(),last=u.sessions.at(-1)||{};return [fav.map(x=>`${x.configKey}:${x.id||""}`).join(","),u.sessions.length,last.id||"",last.endedAt||"",u.sessions.map(s=>`${s.id}:${s.completed?1:0}`).join(","),u.exposures.length,u.exposures.reduce((a,x)=>a+(Number(x.durationMs)||0),0)].join("|")}
  async function post(url,payload,keepalive=false){
    // The API validates the session token and device ID inside the JSON payload.
    // Avoid CORS preflight delays in embedded iOS WebKit (identical to account/cloud adapter).
    const r=await fetch(url,{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},body:JSON.stringify(payload),keepalive});
    const out=await r.json().catch(()=>({}));if(!r.ok)throw new Error(out.error||`http_${r.status}`);return out;
  }
  async function syncSemantic(fav,keepalive=false){
    const u=serviceUsage(),session=accountSession(),favoritesAuthoritative=!!window.__SETKA_PRIVATE_CORPUS_V40__?.authoritative?.();
    return post(SEMANTIC_API,{action:"sync",channel:CHANNEL,deviceId,sessionToken:session?.token||null,favoritesAuthoritative,favorites:fav,sessions:u.sessions,exposures:u.exposures},keepalive);
  }
  async function sync(force=false,keepalive=false){
    if(busy){rerunRequested=true;return false}
    const sig=signature();
    const currentToken=accountSession()?.token||null;
    if(currentToken!==lastAccountToken){lastSignature="";lastOkAt=null;lastAccountToken=currentToken;}
    if(!force&&sig===lastSignature&&lastOkAt&&Date.now()-Date.parse(lastOkAt)<60000)return true;
    const account=accountSession();
    if(!account?.token){
      lastSignature=sig;lastOkAt=new Date().toISOString();lastSubjectKey=null;lastFavoriteStats={...lastFavoriteStats,cloud:0};lastUsageStats={sessions:0,exposures:0};
      window.dispatchEvent(new CustomEvent("setka:v34-sync",{detail:{ok:true,label:"Гость",subjectKey:null,deviceId:null,updatedAt:lastOkAt,acceptedEvents:0,acceptedSessions:0,acceptedExposures:0,favoritesLocal:lastFavoriteStats.local,favoritesUnique:lastFavoriteStats.unique,favoritesCloud:0,privacyMode:"local-only-guest"}}));
      return true;
    }
    // Wait for private corpus hydration before publishing aggregated service
    // facts. An old local cache must not be attributed to a newly logged-in ID.
    if(!window.__SETKA_PRIVATE_CORPUS_V40__?.authoritative?.()){
      lastError="waiting_for_private_archive_restore";
      window.dispatchEvent(new CustomEvent("setka:v34-sync",{detail:{ok:false,pending:true,error:lastError}}));
      return false;
    }
    busy=true;lastError=null;
    try{
      const heartbeat=await post(API,{action:"sync",channel:CHANNEL,deviceId,firstSeenAt:firstSeen,build:"v41-account-only"},keepalive);
      const fav=favorites(),semantic=await syncSemantic(fav,keepalive);
      if(semantic?.ok!==true||semantic?.ignored)throw new Error("account_not_confirmed_by_semantic_server");
      if(accountSession()?.token!==account.token)throw new Error("account_changed_during_sync");
      if(Number(semantic?.favorites)!==fav.length)throw new Error("favorites_not_confirmed_by_server");
      if(Number(semantic?.rejectedFavorites)>0||Number(semantic?.rejectedExposures)>0)
        throw new Error("pattern_catalog_out_of_sync");
      lastSignature=sig;lastOkAt=heartbeat.updatedAt||new Date().toISOString();lastSubjectKey=heartbeat.subjectKey||null;
      lastFavoriteStats={...lastFavoriteStats,cloud:Number(semantic?.favorites??0)||0};
      lastUsageStats={sessions:Number(semantic?.acceptedSessions??lastUsageStats.sessions)||0,exposures:Number(semantic?.acceptedExposures??lastUsageStats.exposures)||0};
      try{localStorage.setItem(STATUS_KEY,lastOkAt)}catch(_){}
      // Tell an open research admin on this same origin to refetch authoritative server facts.
      try{const ch=new BroadcastChannel("setka:research-sync-v1");ch.postMessage({type:"account-metrics-committed",at:Date.now()});ch.close()}catch(_){}
      window.dispatchEvent(new CustomEvent("setka:v34-sync",{detail:{ok:true,label:heartbeat.label||"Гость",subjectKey:lastSubjectKey,deviceId,updatedAt:lastOkAt,acceptedEvents:0,acceptedSessions:lastUsageStats.sessions,acceptedExposures:lastUsageStats.exposures,favoritesLocal:lastFavoriteStats.local,favoritesUnique:lastFavoriteStats.unique,favoritesCloud:lastFavoriteStats.cloud,privacyMode:"authenticated-account-only"}}));
      return true;
    }catch(e){
      lastError=String(e?.message||e);window.dispatchEvent(new CustomEvent("setka:v34-sync",{detail:{ok:false,label:"Гость",deviceId,error:lastError,privacyMode:"authenticated-account-only",favoritesLocal:lastFavoriteStats.local,favoritesUnique:lastFavoriteStats.unique}}));return false;
     }finally{
      busy=false;
      // Changes made during an upload must not wait for the next minute-long timer.
      if(rerunRequested||signature()!==sig){rerunRequested=false;schedule(150)}
    }
  }
  let priorityTimer=0,priorityBusy=false,priorityAgain=false,priorityFailure=0;
  function accountSyncStatus(stage,ok,error=null){
    window.dispatchEvent(new CustomEvent("setka:account-sync-status",{detail:{stage,ok,error}}));
  }
  async function syncAccount(){
    if(priorityBusy){priorityAgain=true;return false}
    const s=accountSession();
    if(!s?.token)return false;
    priorityBusy=true;let success=false;
    accountSyncStatus("loading",false);
    try{
      const corpus=window.__SETKA_PRIVATE_CORPUS_V40__;
      if(!corpus||!await corpus.ensureHydrated?.())throw Error("private_archive_not_loaded");
      accountSyncStatus("saving",false);
      if(!await corpus.sync?.())throw Error("private_archive_not_confirmed");
      accountSyncStatus("metrics",false);
      if(accountSession()?.token!==s.token)throw Error("account_changed_during_sync");
      if(!await sync(true))throw Error(lastError||"research_metrics_not_confirmed");
      priorityFailure=0;success=true;accountSyncStatus("synced",true);
      return true;
    }catch(e){
      if(accountSession()?.token===s.token){
        const error=String(e?.message||e);
        priorityFailure=Math.min(priorityFailure+1,6);
        accountSyncStatus("retry",false,error);
        // Bounded retry, including a path for a delayed first sign-in or recovered network.
        clearTimeout(priorityTimer);
        priorityTimer=setTimeout(syncAccount,Math.min(30000,1500*2**(priorityFailure-1)));
      }
      return false;
    }finally{
      priorityBusy=false;
      if(priorityAgain){
        priorityAgain=false;
        if(accountSession()?.token===s.token){clearTimeout(priorityTimer);priorityTimer=setTimeout(syncAccount,success?100:1500)}
      }
    }
  }
  function schedulePriority(ms=250){
    if(!accountSession()?.token)return;
    clearTimeout(priorityTimer);priorityTimer=setTimeout(syncAccount,ms);
  }
  function schedule(ms=900){clearTimeout(timer);timer=setTimeout(()=>sync(false),ms)}
  window.addEventListener("setka:standalone-event",()=>schedule(1200));
  window.addEventListener("setka:favorite-saved",()=>schedulePriority(200));
  window.addEventListener("setka:favorite-removed",()=>schedulePriority(200));
  window.addEventListener("setka:v34-sync-request",()=>schedulePriority(80));
  window.addEventListener("setka:v40-account",e=>{
    lastAccountToken=null;lastSignature="";lastOkAt=null;lastSubjectKey=null;
    clearTimeout(priorityTimer);priorityFailure=0;
    if(e.detail?.authenticated)schedulePriority(0);
  });
  window.addEventListener("setka:v40-private-corpus-restored",()=>schedulePriority(90));
  window.addEventListener("setka:v40-private-corpus",e=>{
    if(e.detail?.ok===true&&e.detail?.updatedAt&&!lastOkAt)schedulePriority(100);
  });
  document.addEventListener("visibilitychange",()=>{if(document.hidden)sync(true,true);else{schedulePriority(100);schedule(500)}});
  window.addEventListener("online",()=>schedulePriority(80));
  window.addEventListener("pagehide",()=>sync(true,true));
  setInterval(()=>{schedule(0);if(priorityFailure)schedulePriority(100)},30000);
  setTimeout(()=>{schedulePriority(150);schedule(500)},250);

  C.sandbox={
    label:"Гость",channel:CHANNEL,deviceId,firstSeenAt:firstSeen,
    sync:()=>syncAccount(),
    status:()=>({deviceId,label:String(lastSubjectKey||"").startsWith("T-")?"Тестировщик":"Гость",subjectKey:lastSubjectKey,lastOkAt,lastError,favorites:lastFavoriteStats,serviceUsage:lastUsageStats,privacyMode:"authenticated-account-only",personalArchiveSynced:!!window.__SETKA_PRIVATE_CORPUS_V40__?.status?.()?.ok,rawTelemetrySynced:false})
  };
})();