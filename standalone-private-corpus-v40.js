(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-tester-archive-v37";
  // Session and device are authenticated by the Edge Function on every operation.
  const SESSION_KEY="setka-v40:cabinet-session";
  const STATUS_KEY="setka-v40:private-corpus-status";
  const FAVORITES_KEY="setka-web:favorites:v1";
  const BUILD="v40.private-cloud.5-account-ready";
  let pageClosing=false,pendingWrite=Promise.resolve(),busy=false,timer=0,physioTimer=0,lastSignature="",hydrated=false,authoritative=false,hydrationPromise=null,lastStatus=null,hydrationError=null,hydratedToken=null;

  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  function session(){
    for(const kind of ["localStorage","sessionStorage"]){
      try{const store=kind==="localStorage"?localStorage:sessionStorage;const value=JSON.parse(store.getItem(SESSION_KEY)||"null");if(value?.token)return value}catch(_){}
    }
    return null;
  }
  function did(){return C.sandbox?.deviceId||null}
  function stateFingerprint(d={}){return digest([(d.symptoms||[]).map(x=>[x.id,x.name,x.active,x.lastIntensity,x.updatedAt,x.createdAt]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))),(d.checkins||[]).map(x=>[x.id,x.symptomId,x.intensity,x.phase,x.observedAt,x.sessionId]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))]);}
  function status(){
    let value=lastStatus;try{value=value||JSON.parse(localStorage.getItem(STATUS_KEY)||"null")}catch(_){}
    const token=session()?.token||null;
    const loadState=!token?"signed_out":hydrated&&hydratedToken===token?"ready":hydrationError?"error":"loading";
    return {...(value||{}),ok:loadState==="ready"&&value?.ok===true,loadState,archiveReady:loadState==="ready",statesPending:!value?.stateFingerprint||value.stateFingerprint!==stateFingerprint(C.getData?.()||{})};
  }
  function announceLoad(){window.dispatchEvent(new CustomEvent("setka:v40-private-corpus-load",{detail:{loadState:status().loadState}}))}
  function saveStatus(v){lastStatus=v;try{localStorage.setItem(STATUS_KEY,JSON.stringify(v))}catch(_){}window.dispatchEvent(new CustomEvent("setka:v40-private-corpus",{detail:v}))}
  function archive(){
    const d=clone(C.getData?.()||{});
    return {
      version:d.version||40,createdAt:d.createdAt||null,
      sessions:Array.isArray(d.sessions)?d.sessions:[],
      notes:Array.isArray(d.notes)?d.notes:[],
      symptoms:Array.isArray(d.symptoms)?d.symptoms:[],
      checkins:Array.isArray(d.checkins)?d.checkins:[],
      events:(Array.isArray(d.events)?d.events:[]).filter(e=>!(["ui_snapshot"].includes(e.type)||e.payload?.replayCapture)||window.__SETKA_TESTER_CABINET_V40__?.state?.()?.consented===true),
      patternExposures:Array.isArray(d.patternExposures)?d.patternExposures:[],
      activityIntervals:Array.isArray(d.activityIntervals)?d.activityIntervals:[],
      openedPatterns:Array.isArray(d.openedPatterns)?d.openedPatterns:[],
      physio:d.physio||{samples:[],sources:[]},
      invites:Array.isArray(d.invites)?d.invites:[],
      settings:d.settings||{}
    };
  }
  function favorites(){try{return clone(Setka.getFavorites?.()||[])}catch(_){return[]}}
  function stamp(x){for(const k of ["updatedAt","endedAt","observedAt","wallAt","capturedAt","createdAt","startedAt"]){const t=Date.parse(String(x?.[k]||""));if(Number.isFinite(t))return t}return 0}
  function recKey(x,i,prefix){if(x&&typeof x==="object"){for(const k of ["id","exposureId","sourceId"]){if(x[k]!=null&&String(x[k]))return `${prefix}:${k}:${String(x[k])}`}try{return `${prefix}:anon:${JSON.stringify(x)}`}catch(_){}}return `${prefix}:anon:${i}:${String(x)}`}
  function noteCompleteness(x){if(!x||typeof x!=="object")return 0;let n=0;if(x.replaySnapshot?.config&&x.replaySnapshot?.patternId)n+=8;if(x.replaySnapshot?.frame!=null)n+=4;if(x.visualRecipe?.config&&x.visualRecipe?.patternId)n+=2;if(x.config&&x.patternId)n++;return n}
  function mergeRecords(local=[],remote=[],prefix="row",max=30000){const m=new Map(),put=(x,i)=>{const k=recKey(x,i,prefix),old=m.get(k);if(!old||stamp(x)>stamp(old)||(stamp(x)===stamp(old)&&(prefix!=="notes"||noteCompleteness(x)>=noteCompleteness(old))))m.set(k,clone(x))};(Array.isArray(remote)?remote:[]).forEach(put);(Array.isArray(local)?local:[]).forEach((x,i)=>put(x,100000+i));return [...m.values()].sort((a,b)=>stamp(a)-stamp(b)).slice(-max)}
  function favKey(f,i){try{if(f?.config)return `cfg:${Setka.configKey?.(f.config,f.baseId||f.patternId||f.config?.patternId)||JSON.stringify(f.config)}`}catch(_){}return f?.id?`id:${f.id}`:`anon:${i}`}
  function mergeFavorites(remote=[]){
    const local=favorites(),m=new Map(),put=(f,i)=>{const k=favKey(f,i),old=m.get(k);if(!old||stamp(f)>=stamp(old))m.set(k,clone(f))};
    (Array.isArray(remote)?remote:[]).forEach(put);local.forEach((f,i)=>put(f,100000+i));
    const merged=[...m.values()].slice(-10000);
    try{localStorage.setItem(FAVORITES_KEY,JSON.stringify(merged));Setka.refreshFavorites?.()}catch(_){}
    return merged.length;
  }
  function mergeCloud(payload={},remoteFavorites=[]){
    const d=C.getData?.();if(!d)return null;
    d.version=Math.max(Number(d.version)||0,Number(payload.version)||0,41);
    if(payload.createdAt&&(!d.createdAt||Date.parse(payload.createdAt)<Date.parse(d.createdAt)))d.createdAt=payload.createdAt;
    d.sessions=mergeRecords(d.sessions,payload.sessions,"sessions",10000);
    d.notes=mergeRecords(d.notes,payload.notes,"notes",10000);
    d.symptoms=mergeRecords(d.symptoms,payload.symptoms,"symptoms",10000);
    d.checkins=mergeRecords(d.checkins,payload.checkins,"checkins",10000);
    d.events=mergeRecords(d.events,payload.events,"events",30000);
    d.patternExposures=mergeRecords(d.patternExposures,payload.patternExposures,"patternExposures",30000);
    d.activityIntervals=mergeRecords(d.activityIntervals,payload.activityIntervals,"activityIntervals",10000);
    const opened=new Map();for(const x of [...(d.openedPatterns||[]),...(payload.openedPatterns||[])])if(x.patternId&&(!opened.has(x.patternId)||Date.parse(x.firstOpenedAt)<Date.parse(opened.get(x.patternId).firstOpenedAt)))opened.set(x.patternId,x);d.openedPatterns=[...opened.values()];
    d.invites=mergeRecords(d.invites,payload.invites,"invites",5000);
    const lp=d.physio||{samples:[],sources:[]},rp=payload.physio||{};
    d.physio={...rp,...lp,samples:mergeRecords(lp.samples,rp.samples,"physioSamples",10000),sources:mergeRecords(lp.sources,rp.sources,"physioSources",2000)};
    d.settings={...(payload.settings||{}),...(d.settings||{})};
    C.save?.();
    const favoriteCount=mergeFavorites(remoteFavorites);
    return {sessions:d.sessions.length,notes:d.notes.length,symptoms:d.symptoms.length,checkins:d.checkins.length,events:d.events.length,exposures:d.patternExposures.length,physio:d.physio.samples.length,favorites:favoriteCount};
  }
  function digest(value){
    // Stable lightweight fingerprint; no raw note text leaves the device.
    const str=JSON.stringify(value??null);let h=2166136261;
    for(let i=0;i<str.length;i++)h=Math.imul(h^str.charCodeAt(i),16777619);
    return (h>>>0).toString(16);
  }
  function signature(){
    const d=C.getData?.()||{},s=d.sessions||[],n=d.notes||[],e=d.events||[],x=d.patternExposures||[],p=d.physio?.samples||[],f=Setka.getFavorites?.()||[];
    const last=a=>a.at?.(-1)||{};
    const notesDigest=digest(n.map(v=>[v.id,v.text,v.patternId,v.configHash,v.config,v.frame,v.replaySnapshot,v.visualSnapshot,v.publicationStatus]));
    const sessionsDigest=digest(s.map(v=>[v.id,v.phase,v.completed,v.endedAt,v.postState,v.helped,v.measuredActiveMs,v.afterFeedbackActiveMs]));
    // State selection, activation and intensity history are durable personal data.
    // Event-count heuristics alone cannot detect these changes reliably (not all
    // in-place mutations append events or survive capped event history).
    const symptomsDigest=digest((d.symptoms||[]).map(v=>[v.id,v.name,v.active,v.lastIntensity,v.updatedAt,v.createdAt]));
    const checkinsDigest=digest((d.checkins||[]).map(v=>[v.id,v.symptomId,v.intensity,v.phase,v.observedAt,v.sessionId]));
    return [d.version||34,s.length,sessionsDigest,n.length,notesDigest,
      (d.symptoms||[]).length,symptomsDigest,(d.checkins||[]).length,checkinsDigest,
      e.length,last(e).id||"",x.length,last(x).exposureId||"",last(x).durationMs||0,
      p.length,last(p).id||"",f.length,digest(f),digest(d.settings),digest(d.openedPatterns),digest(d.activityIntervals)].join("|");
  }
  async function post(payload,keepalive=false){
    // A failed or stalled cloud request must never stall local navigation.
    // Keepalive requests must not use AbortController on page unload.
    const ctl=keepalive||typeof AbortController!=="function"?null:new AbortController(),clock=ctl?setTimeout(()=>ctl.abort(),18000):null;
    try{
      // Safelisted text/plain request avoids a fragile cross-origin OPTIONS preflight in iOS embedded browsers.
       // The body remains JSON and is parsed by req.json() on the server; auth stays session+device bound.
       const r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},
        body:JSON.stringify(payload),keepalive,...(ctl?{signal:ctl.signal}:{})});
      const out=await r.json().catch(()=>({}));
      if(!r.ok||out.ok===false){
        const e=new Error(out.error||"http_"+r.status);
        e.status=r.status;
        throw e;
      }
      return out;
    }catch(e){
      if(e?.name==="AbortError"){const timeout=new Error("archive_timeout");timeout.status=0;throw timeout}
      throw e;
    }finally{if(clock!=null)clearTimeout(clock)}
  }
  async function autoRetryPost(payload,keepalive=false){
    try{return await post(payload,keepalive)}
    catch(e){
      // Write RPC merges by ID; replaying the same payload once is safe.
      // Never retry bad authentication, malformed data, or page-unload writes.
      if(keepalive||pageClosing||e?.status===401||e?.status===403||
         (e?.status&&e.status<500)||(typeof navigator!=="undefined"&&navigator.onLine===false))throw e;
      await new Promise(resolve=>setTimeout(resolve,1150));
      if(pageClosing)throw e;
      return post(payload,false);
    }
  }
  async function pull(){const s=session();if(!s?.token)throw new Error("auth_required");return post({action:"pull",sessionToken:s.token,deviceId:did()})}
  async function restoreFromCloud(){
    if(C.ready)await C.ready;
    if(pageClosing)return false;
    const s=session(),token=s?.token||null;if(!token){hydrated=false;authoritative=false;hydratedToken=null;return false}
    const out=await pull();if(pageClosing||session()?.token!==token)return false;const a=out?.archive;
    if(!a){
      hydrated=true;authoritative=true;hydratedToken=token;hydrationError=null;lastSignature="";
      saveStatus({enabled:true,ok:true,restored:false,stateFingerprint:stateFingerprint({}),statesVerified:false,build:BUILD,updatedAt:null,counts:null,sourceDevices:0,privacy:"private-account-only",publicExposure:false});
      announceLoad();window.dispatchEvent(new CustomEvent("setka:v40-private-corpus-restored",{detail:{counts:null,sourceDevices:0,emptyRemote:true}}));
      return true;
    }
    const counts=mergeCloud(a.payload||{},a.favorites||[]);
    hydrated=true;authoritative=true;hydratedToken=token;hydrationError=null;lastSignature="";
    saveStatus({enabled:true,ok:true,restored:true,stateFingerprint:stateFingerprint(a.payload||{}),statesVerified:true,build:BUILD,updatedAt:a.updatedAt||null,counts,sourceDevices:Number(a.sourceDevices)||1,privacy:"private-account-only",publicExposure:false});
    announceLoad();window.dispatchEvent(new CustomEvent("setka:v40-private-corpus-restored",{detail:{counts,sourceDevices:Number(a.sourceDevices)||1}}));
    return true;
  }
  async function ensureHydrated(){
    const token=session()?.token||null;
    if(!token)return false;
    if(hydrated&&hydratedToken===token)return true;
    if(hydrationPromise)return hydrationPromise;
    hydrationError=null;announceLoad();
    hydrationPromise=restoreFromCloud().catch(e=>{
      if(session()?.token!==token)return false;
      hydrated=false;authoritative=false;hydratedToken=null;
      hydrationError=String(e?.message||e);
      saveStatus({enabled:true,ok:false,build:BUILD,error:hydrationError,stage:"restore",privacy:"private-account-only",publicExposure:false});
      announceLoad();return false;
    }).finally(()=>{hydrationPromise=null});
    return hydrationPromise;
  }
  async function sync(force=false,keepalive=false,closingWrite=false){
    if(C.storageStatus?.().resetting)return false;
    if(pageClosing&&!closingWrite)return false;
    if(!keepalive&&C.ready)await C.ready;
    const s=session(),deviceId=did();if(!s?.token||!deviceId){saveStatus({enabled:false,reason:"not_authenticated",build:BUILD,privacy:"private-account-only"});return false}
    // Unload cannot restore the remote archive first. Keep local changes for the
    // next foreground sync instead of starting an unsafe pull in a closing page.
    if(keepalive&&!hydrated)return false;
    const loaded=(hydrated&&hydratedToken===s.token)||await ensureHydrated();
    if(pageClosing&&!closingWrite)return false;
    if(!loaded){
      saveStatus({enabled:true,ok:false,build:BUILD,stage:"restore",error:"archive_restore_required_before_sync",privacy:"private-account-only",publicExposure:false});
      return false;
    }
    C.save?.();
    if(!keepalive&&C.whenSaved)await C.whenSaved();
    if((pageClosing&&!closingWrite)||C.storageStatus?.().resetting)return false;
    const sig=signature();if((!force||keepalive)&&sig===lastSignature)return true;if(busy)return false;busy=true;
    try{
      const sent=archive(),payload={action:"sync",sessionToken:s.token,deviceId,capturedAt:new Date().toISOString(),archive:sent,favorites:favorites()};
      // The Fetch standard caps the entire in-flight keepalive body budget at
      // 64 KiB. A full personal archive may be several MB. Keep it durably on
      // device and retry in the foreground; do not turn an impossible closing
      // upload into a failed cloud receipt or send a destructive partial archive.
      if(keepalive&&new Blob([JSON.stringify(payload)]).size>60000)return false;
      pendingWrite=autoRetryPost(payload,keepalive);const out=await pendingWrite;
      const receipt=out.stateHistory||{symptoms:sent.symptoms,checkins:sent.checkins};
      if(out.stateHistory){const d=C.getData(),before=stateFingerprint(d);d.symptoms=mergeRecords(d.symptoms,receipt.symptoms,"symptoms",10000);d.checkins=mergeRecords(d.checkins,receipt.checkins,"checkins",10000);C.save?.();if(before!==stateFingerprint(d))window.dispatchEvent(new CustomEvent("setka:states-restored"));}
      lastSignature=sig;const st={enabled:true,ok:true,build:BUILD,updatedAt:out.updatedAt,counts:out.counts||{},stateFingerprint:stateFingerprint(receipt),statesVerified:!!out.stateHistory,privacy:"private-account-only",publicExposure:false};saveStatus(st);return true;
    }catch(e){
      // Do not erase a last proven cloud receipt when a later network call
      // fails. Keep the failure locally for diagnostics; the next automatic
      // attempt will resume without any user action.
      const previous=status()||{};
      const st={...previous,enabled:true,ok:false,build:BUILD,error:String(e?.message||e),
        stage:"sync",pendingRetry:true,privacy:"private-account-only",publicExposure:false};
      saveStatus(st);return false;
    }finally{busy=false}
  }
  async function remoteStatus(){const s=session();if(!s?.token)return null;return post({action:"status",sessionToken:s.token,deviceId:did()})}
  function schedule(ms=1200){clearTimeout(timer);timer=setTimeout(()=>sync(false),ms)}
  window.addEventListener("setka:standalone-event",()=>schedule(1000));
  window.addEventListener("setka:pattern-exposure",()=>schedule(800));
  window.addEventListener('setka:pattern-first-open',()=>schedule(800));
  window.addEventListener('setka:activity-interval',()=>schedule(800));
  window.addEventListener("setka:physio-sample",()=>{if(!physioTimer)physioTimer=setTimeout(()=>{physioTimer=0;sync(false)},10000)});
  window.addEventListener("setka:v34-sync-request",()=>schedule(900));
  window.addEventListener("setka:favorite-saved",()=>schedule(700));
  window.addEventListener("setka:favorite-removed",()=>schedule(700));
  window.addEventListener("setka:v40-account",()=>{
    // Do not allow stale account readiness to stand in for another session.
    if(hydratedToken!==session()?.token){hydrated=false;authoritative=false;hydratedToken=null;hydrationError=null;}
    announceLoad();
    if(session()?.token)setTimeout(()=>sync(true),120);
  });
  document.addEventListener("visibilitychange",()=>{if(document.hidden)sync(true,true);else schedule(500)});
  window.addEventListener("pagehide",()=>{pageClosing=true;clearTimeout(timer);clearTimeout(physioTimer);return sync(true,true,true)});
  window.addEventListener("pageshow",e=>{pageClosing=false;if(e.persisted)schedule(0)});
  window.addEventListener('setka:local-reset-started',()=>{pageClosing=true;clearTimeout(timer);clearTimeout(physioTimer)});
  window.addEventListener('setka:local-reset-cancelled',()=>{pageClosing=false;schedule(500)});
  window.addEventListener("online",()=>schedule(350));
  setInterval(()=>sync(false),45000);
  // C.ready gates archive hydration; do not add an extra multi-second delay after page open.
  setTimeout(()=>sync(true),100);
  window.__SETKA_PRIVATE_CORPUS_V40__={sync:async()=>{if(busy)await pendingWrite.catch(()=>false);return sync(true)},pull,restore:ensureHydrated,ensureHydrated,remoteStatus,status,authoritative:()=>!!(hydrated&&authoritative&&hydratedToken===session()?.token),build:BUILD};
})();
