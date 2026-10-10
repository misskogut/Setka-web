(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-tester-archive-v37";
  const KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const SESSION_KEY="setka-v40:cabinet-session";
  const STATUS_KEY="setka-v40:private-corpus-status";
  const FAVORITES_KEY="setka-web:favorites:v1";
  const BUILD="v40.private-cloud.2";
  let busy=false,timer=0,lastSignature="",hydrated=false,authoritative=false,hydrationPromise=null;

  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}catch(_){return null}}
  function did(){return C.sandbox?.deviceId||null}
  function status(){try{return JSON.parse(localStorage.getItem(STATUS_KEY)||"null")}catch(_){return null}}
  function saveStatus(v){try{localStorage.setItem(STATUS_KEY,JSON.stringify(v))}catch(_){}window.dispatchEvent(new CustomEvent("setka:v40-private-corpus",{detail:v}))}
  function archive(){
    const d=clone(C.getData?.()||{});
    return {
      version:d.version||40,createdAt:d.createdAt||null,
      sessions:Array.isArray(d.sessions)?d.sessions:[],
      notes:Array.isArray(d.notes)?d.notes:[],
      symptoms:Array.isArray(d.symptoms)?d.symptoms:[],
      checkins:Array.isArray(d.checkins)?d.checkins:[],
      events:Array.isArray(d.events)?d.events:[],
      patternExposures:Array.isArray(d.patternExposures)?d.patternExposures:[],
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
    return [d.version||34,s.length,sessionsDigest,n.length,notesDigest,
      e.length,last(e).id||"",x.length,last(x).exposureId||"",last(x).durationMs||0,
      p.length,last(p).id||"",f.length,digest(f),digest(d.settings)].join("|");
  }
  async function post(payload,keepalive=false){const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify(payload),keepalive});const out=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(out.error||`http_${r.status}`);e.status=r.status;throw e}return out}
  async function pull(){const s=session();if(!s?.token)throw new Error("auth_required");return post({action:"pull",sessionToken:s.token})}
  async function restoreFromCloud(){
    const s=session();if(!s?.token){hydrated=false;authoritative=false;return false}
    const out=await pull(),a=out?.archive;
    if(!a){
      hydrated=true;authoritative=true;lastSignature="";
      saveStatus({enabled:true,ok:true,restored:false,build:BUILD,updatedAt:null,counts:null,sourceDevices:0,privacy:"private-account-only",publicExposure:false});
      window.dispatchEvent(new CustomEvent("setka:v40-private-corpus-restored",{detail:{counts:null,sourceDevices:0,emptyRemote:true}}));
      return true;
    }
    const counts=mergeCloud(a.payload||{},a.favorites||[]);
    hydrated=true;authoritative=true;lastSignature="";
    saveStatus({enabled:true,ok:true,restored:true,build:BUILD,updatedAt:a.updatedAt||null,counts,sourceDevices:Number(a.sourceDevices)||1,privacy:"private-account-only",publicExposure:false});
    window.dispatchEvent(new CustomEvent("setka:v40-private-corpus-restored",{detail:{counts,sourceDevices:Number(a.sourceDevices)||1}}));
    return true;
  }
  async function ensureHydrated(){
    if(hydrated)return true;
    if(!session()?.token)return false;
    if(hydrationPromise)return hydrationPromise;
    hydrationPromise=restoreFromCloud().catch(e=>{hydrated=false;authoritative=false;saveStatus({enabled:true,ok:false,build:BUILD,error:String(e?.message||e),stage:"restore",privacy:"private-account-only",publicExposure:false});return false}).finally(()=>{hydrationPromise=null});
    return hydrationPromise;
  }
  async function sync(force=false,keepalive=false){
    const s=session(),deviceId=did();if(!s?.token||!deviceId){saveStatus({enabled:false,reason:"not_authenticated",build:BUILD,privacy:"private-account-only"});return false}
    const loaded=await ensureHydrated();
    if(!loaded){
      saveStatus({enabled:true,ok:false,build:BUILD,stage:"restore",error:"archive_restore_required_before_sync",privacy:"private-account-only",publicExposure:false});
      return false;
    }
    const sig=signature();if(!force&&sig===lastSignature)return true;if(busy)return false;busy=true;
    try{
      const out=await post({action:"sync",sessionToken:s.token,deviceId,capturedAt:new Date().toISOString(),archive:archive(),favorites:favorites()},keepalive);
      lastSignature=sig;const st={enabled:true,ok:true,build:BUILD,updatedAt:out.updatedAt,counts:out.counts||{},privacy:"private-account-only",publicExposure:false};saveStatus(st);return true;
    }catch(e){const st={enabled:true,ok:false,build:BUILD,error:String(e?.message||e),stage:"sync",privacy:"private-account-only",publicExposure:false};saveStatus(st);return false}finally{busy=false}
  }
  async function remoteStatus(){const s=session();if(!s?.token)return null;return post({action:"status",sessionToken:s.token})}
  function schedule(ms=1200){clearTimeout(timer);timer=setTimeout(()=>sync(false),ms)}
  window.addEventListener("setka:standalone-event",()=>schedule(1000));
  window.addEventListener("setka:pattern-exposure",()=>schedule(800));
  window.addEventListener("setka:v34-sync-request",()=>schedule(900));
  window.addEventListener("setka:favorite-saved",()=>schedule(700));
  window.addEventListener("setka:favorite-removed",()=>schedule(700));
  window.addEventListener("setka:v40-account",()=>{hydrated=false;authoritative=false;hydrationPromise=null;setTimeout(()=>sync(true),120)});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)sync(true,true);else schedule(500)});
  window.addEventListener("pagehide",()=>sync(true,true));
  setInterval(()=>sync(false),45000);
  setTimeout(()=>sync(true),2200);
  window.__SETKA_PRIVATE_CORPUS_V40__={sync:()=>sync(true),pull,restore:restoreFromCloud,remoteStatus,status,authoritative:()=>!!(hydrated&&authoritative&&session()?.token),build:BUILD};
})();