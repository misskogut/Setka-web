(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;
  const KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const ACCOUNT_API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-tester-account-v40";
  const KNOWLEDGE_API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-pattern-knowledge-v40";
  const SESSION_KEY="setka-v40:cabinet-session";
  const BRIDGE_KEY="setka-v40:research-bridge-status";
  const BUILD="v40.privacy.1";
  let busy=false,timer=0,lastSignature="";

  function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}catch(_){return null}}
  function saveBridge(v){try{localStorage.setItem(BRIDGE_KEY,JSON.stringify(v))}catch(_){}window.dispatchEvent(new CustomEvent("setka:v40-research-bridge",{detail:v}))}
  function bridgeStatus(){try{return JSON.parse(localStorage.getItem(BRIDGE_KEY)||"null")}catch(_){return null}}
  async function post(url,payload,keepalive=false){const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify(payload),keepalive});const out=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(out.error||`http_${r.status}`);e.status=r.status;throw e}return out}
  async function shaText(v){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(v)));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
  function daypart(v){const h=new Date(v||Date.now()).getHours();if(h<6)return"night";if(h<12)return"morning";if(h<18)return"day";return"evening"}
  function pulse(sid){const a=(C.getData()?.physio?.samples||[]).filter(x=>x?.sessionId===sid&&x.metric==="heart_rate"&&Number.isFinite(Number(x.value)));if(!a.length)return null;const vals=a.map(x=>Number(x.value));return{avg:vals.reduce((p,q)=>p+q,0)/vals.length,min:Math.min(...vals),max:Math.max(...vals),samples:vals.length}}
  function finished(s){return !!(s?.endedAt||s?.completed||s?.phase==="done_feedback"||s?.phase==="finished")}
  function sig(){const ss=(C.getData()?.sessions||[]).filter(finished),last=ss.at(-1)||{};return[ss.length,last.id||"",last.phase||"",last.endedAt||"",(last.usage||[]).length,(last.usage||[]).reduce((a,x)=>a+(Number(x.durationMs)||0),0)].join("|")}
  async function contributions(){
    const out=[];
    for(const s of (C.getData()?.sessions||[])){
      if(!s?.id||!finished(s))continue;
      const usage=(s.usage||[]).filter(u=>u?.config&&Number(u.durationMs)>0);
      if(!usage.length)continue;
      const totals={measured:0,after_feedback:0,exploration:0};
      for(const u of usage){const p=["measured","after_feedback","exploration"].includes(u.phase)?u.phase:(s.requestKey==="explore"?"exploration":"measured");totals[p]+=Number(u.durationMs)||0}
      const group=await shaText(`outcome|${s.id}`),hr=pulse(s.id);
      for(let i=0;i<usage.length;i++){
        const u=usage[i],patternId=u.patternId||u.config?.patternId||"tentacle-orbit",config=u.config||{},configKey=u.configKey||Setka.configKey?.(config,patternId)||`${patternId}|${JSON.stringify(config)}`,phase=["measured","after_feedback","exploration"].includes(u.phase)?u.phase:(s.requestKey==="explore"?"exploration":"measured"),total=Math.max(1,totals[phase]||0),weight=Math.max(0,Math.min(1,(Number(u.durationMs)||0)/total)),isOutcome=phase==="measured"&&s.requestKey!=="explore",key=await shaText(`contribution|${s.id}|${phase}|${i}|${configKey}`);
        out.push({
          contributionKey:key,outcomeGroup:group,participationWeight:isOutcome?weight:null,
          patternId,patternVersion:Number(u.patternVersion)||1,configKey,config,phase,requestKey:s.requestKey||null,
          durationMs:Math.max(0,Number(u.durationMs)||0),saved:!!u.saved,
          preState:isOutcome?s.preState??null:null,postState:isOutcome?s.postState??null:null,helped:isOutcome?s.helped??null:null,completed:!!s.completed,
          daypart:daypart(s.startedAt),
          heartRate:hr?{avg:hr.avg,min:hr.min,max:hr.max,samples:Math.max(0,Math.round(hr.samples*weight))}:null
        });
      }
    }
    return out;
  }
  async function diagnostic(kind,code){const s=session();if(!s?.token)return;try{await post(ACCOUNT_API,{action:"diagnostic",sessionToken:s.token,build:BUILD,kind,code:String(code||"").slice(0,120),online:navigator.onLine})}catch(_){}}
  async function sync(force=false,keepalive=false){
    const s=session();if(!s?.token){saveBridge({enabled:false,reason:"not_authenticated",build:BUILD});return false}
    const signature=sig();if(!force&&signature===lastSignature)return true;if(busy)return false;busy=true;
    try{
      const all=await contributions();let accepted=0;
      for(let i=0;i<all.length;i+=180){const r=await post(KNOWLEDGE_API,{action:"contribute",sessionToken:s.token,contributions:all.slice(i,i+180)},keepalive);accepted+=Number(r.accepted)||0}
      const st=await post(KNOWLEDGE_API,{action:"my-status",sessionToken:s.token});lastSignature=signature;
      const state={enabled:true,ok:true,build:BUILD,accepted,contributions:st.contributions||0,patterns:st.patterns||0,lastContributionAt:st.lastContributionAt||null,lastSyncAt:new Date().toISOString(),privacyMode:"local-personal-corpus"};saveBridge(state);return true;
    }catch(e){const code=String(e?.message||e);saveBridge({enabled:true,ok:false,build:BUILD,error:code,lastSyncAt:new Date().toISOString(),privacyMode:"local-personal-corpus"});if(e?.status!==401&&e?.status!==403)diagnostic("bridge_error",code.split(":")[0]);return false}finally{busy=false}
  }
  function schedule(ms=1800){clearTimeout(timer);timer=setTimeout(()=>sync(false),ms)}
  window.addEventListener("setka:standalone-event",()=>schedule(1600));
  window.addEventListener("setka:v40-account",()=>sync(true));
  window.addEventListener("online",()=>{diagnostic("network","online");schedule(400)});
  window.addEventListener("offline",()=>diagnostic("network","offline"));
  window.addEventListener("error",e=>diagnostic("js_error",e?.error?.name||"Error"));
  window.addEventListener("unhandledrejection",e=>diagnostic("promise_error",e?.reason?.name||"UnhandledRejection"));
  document.addEventListener("visibilitychange",()=>{if(document.hidden)sync(true,true);else schedule(900)});
  setInterval(()=>sync(false),45000);setTimeout(()=>{diagnostic("build","loaded");sync(true)},2200);
  window.__SETKA_RESEARCH_BRIDGE_V40__={sync:()=>sync(true),status:bridgeStatus,build:BUILD};
})();