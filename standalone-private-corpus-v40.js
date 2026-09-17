(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-tester-archive-v37";
  const KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const SESSION_KEY="setka-v40:cabinet-session";
  const STATUS_KEY="setka-v40:private-corpus-status";
  const BUILD="v40.private-cloud.1";
  let busy=false,timer=0,lastSignature="";

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
  function signature(){
    const d=C.getData?.()||{},s=d.sessions||[],n=d.notes||[],e=d.events||[],x=d.patternExposures||[],p=d.physio?.samples||[],f=Setka.getFavorites?.()||[];
    const last=a=>a.at?.(-1)||{};
    return [s.length,last(s).id||"",last(s).phase||"",n.length,last(n).id||"",e.length,last(e).id||"",x.length,last(x).exposureId||"",p.length,last(p).id||"",f.length,f.map(v=>v.id||v.configKey||"").join(",")].join("|");
  }
  async function post(payload,keepalive=false){const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify(payload),keepalive});const out=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(out.error||`http_${r.status}`);e.status=r.status;throw e}return out}
  async function sync(force=false,keepalive=false){
    const s=session(),deviceId=did();if(!s?.token||!deviceId){saveStatus({enabled:false,reason:"not_authenticated",build:BUILD,privacy:"private-account-only"});return false}
    const sig=signature();if(!force&&sig===lastSignature)return true;if(busy)return false;busy=true;
    try{
      const out=await post({action:"sync",sessionToken:s.token,deviceId,capturedAt:new Date().toISOString(),archive:archive(),favorites:favorites()},keepalive);
      lastSignature=sig;const st={enabled:true,ok:true,build:BUILD,updatedAt:out.updatedAt,counts:out.counts||{},privacy:"private-account-only",publicExposure:false};saveStatus(st);return true;
    }catch(e){const st={enabled:true,ok:false,build:BUILD,error:String(e?.message||e),privacy:"private-account-only",publicExposure:false};saveStatus(st);return false}finally{busy=false}
  }
  async function pull(){const s=session();if(!s?.token)throw new Error("auth_required");return post({action:"pull",sessionToken:s.token})}
  async function remoteStatus(){const s=session();if(!s?.token)return null;return post({action:"status",sessionToken:s.token})}
  function schedule(ms=1200){clearTimeout(timer);timer=setTimeout(()=>sync(false),ms)}
  window.addEventListener("setka:standalone-event",()=>schedule(1000));
  window.addEventListener("setka:pattern-exposure",()=>schedule(800));
  window.addEventListener("setka:favorite-saved",()=>schedule(700));
  window.addEventListener("setka:favorite-removed",()=>schedule(700));
  window.addEventListener("setka:v40-account",()=>schedule(250));
  document.addEventListener("visibilitychange",()=>{if(document.hidden)sync(true,true);else schedule(500)});
  window.addEventListener("pagehide",()=>sync(true,true));
  setInterval(()=>sync(false),45000);setTimeout(()=>sync(true),2200);
  window.__SETKA_PRIVATE_CORPUS_V40__={sync:()=>sync(true),pull,remoteStatus,status,build:BUILD};
})();