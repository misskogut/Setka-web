(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-community-patterns-v38";
  const API_KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  let items=[],busy=false,timer=0,lastOkAt=null,lastError=null;

  function data(){return C.getData?.()||{}}
  function clearLegacyLocal(){
    try{
      const d=data();
      if(Array.isArray(d.localCommunity)&&d.localCommunity.length){d.localCommunity=[];C.save?.()}
    }catch(_){}
  }
  function sessionUsages(){
    const out=[],d=data();
    for(const s of d.sessions||[]){
      const events=(d.events||[]).filter(e=>e.sessionId===s.id&&["pattern_open","pattern_state","color","favorite_save"].includes(e.type));
      const configs=new Map();
      for(const e of events){const st=e.payload?.state;if(st?.configKey)configs.set(st.configKey,{sessionId:s.id,configKey:st.configKey,saved:configs.get(st.configKey)?.saved||e.type==="favorite_save"})}
      out.push(...configs.values());
    }
    return out;
  }
  function personalScore(item){
    const key=item.config_key||item.configKey||Setka.configKey?.(item.config||{}),uses=sessionUsages().filter(u=>u.configKey===key);
    if(!uses.length)return(Number(item.saveCount)||0)*.03;
    const d=data();let score=0;
    for(const u of uses){const s=(d.sessions||[]).find(x=>x.id===u.sessionId);if(!s)continue;const delta=Number(s.postState)-Number(s.preState);score+=(Number.isFinite(delta)?delta:0)*2+(s.helped===2?2:s.helped===1?1:0)+(u.saved?1.5:0)}
    return score/uses.length+(Number(item.saveCount)||0)*.03;
  }
  function mode(){return data().settings?.communityMode||"for_me"}
  function sorted(){
    const a=items.slice(),m=mode();
    if(m==="new")return a.sort((x,y)=>Date.parse(y.createdAt||0)-Date.parse(x.createdAt||0));
    if(m==="popular")return a.sort((x,y)=>(Number(y.saveCount)||0)-(Number(x.saveCount)||0)||Date.parse(y.createdAt||0)-Date.parse(x.createdAt||0));
    return a.sort((x,y)=>personalScore(y)-personalScore(x)||Date.parse(y.createdAt||0)-Date.parse(x.createdAt||0));
  }
  function syncModeUi(){const bar=document.getElementById("st34CommunityModes");bar?.querySelectorAll("button[data-m]").forEach(b=>b.classList.toggle("active",b.dataset.m===mode()))}
  function apply(){
    clearLegacyLocal();
    const shown=sorted();
    C.publicCommunity=shown;
    Setka.setCommunity?.(shown);
    syncModeUi();
    window.dispatchEvent(new CustomEvent("setka:community-cloud",{detail:{ok:true,count:shown.length,mode:mode(),updatedAt:lastOkAt}}));
  }
  async function refresh(){
    if(busy)return;busy=true;lastError=null;
    try{
      const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify({action:"feed",limit:300})});
      const out=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(out.error||`community_${r.status}`);
      items=Array.isArray(out.items)?out.items.map(x=>({...x,createdAt:x.created_at||x.createdAt||null,localOnly:false})):[];
      lastOkAt=new Date().toISOString();apply();
    }catch(e){
      lastError=String(e?.message||e);clearLegacyLocal();
      if(!items.length){C.publicCommunity=[];Setka.setCommunity?.([])}
      window.dispatchEvent(new CustomEvent("setka:community-cloud",{detail:{ok:false,error:lastError}}));
    }finally{busy=false}
  }
  function schedule(ms=600){clearTimeout(timer);timer=setTimeout(refresh,ms)}

  document.addEventListener("click",e=>{
    const b=e.target?.closest?.("#st34CommunityModes button[data-m]");if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();
    const d=data();d.settings=d.settings||{};d.settings.communityMode=b.dataset.m;C.save?.();apply();
  },true);

  window.addEventListener("setka:favorite-saved",()=>{clearLegacyLocal();apply();schedule(900)});
  window.addEventListener("setka:favorite-removed",()=>{clearLegacyLocal();apply();schedule(900)});
  window.addEventListener("setka:v34-sync",e=>{if(e.detail?.ok)schedule(120);else schedule(1200)});
  window.addEventListener("setka:library-page",e=>{if(e.detail?.page==="community")schedule(0)});

  async function bootstrap(){
    clearLegacyLocal();
    try{await C.sandbox?.sync?.()}catch(_){}
    await refresh();
    setTimeout(refresh,1800);
  }
  bootstrap();
  C.cloudCommunity={refresh,status:()=>({count:items.length,lastOkAt,lastError,mode:mode()})};
  window.__SETKA_CLOUD_COMMUNITY_V38__=4;
})();