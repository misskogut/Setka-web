(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-community-patterns-v38";
  const API_KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  let cloud=[],loading=null,lastLoaded=0,rendering=false;
  const data=()=>C.getData?.()||{};
  const n=v=>Number.isFinite(Number(v))?Number(v):0;

  async function fetchCloud(force=false){
    if(!force&&cloud.length&&Date.now()-lastLoaded<15000)return cloud;
    if(loading)return loading;
    loading=(async()=>{
      const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json",apikey:API_KEY},body:JSON.stringify({action:"feed",limit:400})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||"community_load_failed");
      cloud=(d.items||[]).map(x=>({...x,createdAt:x.created_at||x.createdAt||null,updatedAt:x.updated_at||x.updatedAt||null}));
      lastLoaded=Date.now();loading=null;return cloud;
    })();
    try{return await loading}catch(e){loading=null;throw e}
  }

  function localScore(item){
    const key=item.config_key||item.configKey||Setka.configKey?.(item.config,item.patternId||item.pattern_id);
    let score=n(item.saveCount)*.03,count=0;
    for(const s of data().sessions||[]){
      const uses=(s.usage||[]).filter(u=>(u.configKey||u.configHash)===key);
      if(!uses.length)continue;
      const delta=Number(s.postState)-Number(s.preState);
      score+=(Number.isFinite(delta)?delta:0)*2+(s.helped===2?2:s.helped===1?1:0)+uses.some(u=>u.saved)?1.5:0;
      count++;
    }
    return count?score/count:score;
  }

  function currentMode(){return data().settings?.communityMode||"for_me"}
  function sorted(mode=currentMode()){
    const items=cloud.slice();
    if(mode==="popular")items.sort((a,b)=>n(b.saveCount)-n(a.saveCount)||Date.parse(b.updatedAt||0)-Date.parse(a.updatedAt||0));
    else if(mode==="new")items.sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0));
    else items.sort((a,b)=>localScore(b)-localScore(a)||n(b.saveCount)-n(a.saveCount));
    return items;
  }

  function render(mode=currentMode()){
    if(rendering)return;
    rendering=true;
    try{
      const items=sorted(mode);
      C.publicCommunity=items;
      Setka.setCommunity?.(items);
      const top=items.slice(0,5).map(x=>String(x.id));
      Setka.setRecommendations?.({community:top,patterns:[]});
      document.querySelectorAll('#communityPanel .st34-local').forEach(x=>x.remove());
    }finally{requestAnimationFrame(()=>{rendering=false})}
  }

  async function refresh(force=false){
    try{await fetchCloud(force);render()}catch(e){console.warn("SETKA cloud community unavailable",e)}
  }

  const modeBar=document.getElementById("st34CommunityModes");
  modeBar?.addEventListener("click",e=>{
    const b=e.target.closest?.("button[data-m]");if(!b)return;
    setTimeout(()=>render(b.dataset.m),0);
  });

  async function afterFavorite(){
    try{await C.sandbox?.sync?.()}catch(_){}
    setTimeout(()=>refresh(true),350);
    setTimeout(()=>refresh(true),1600);
  }
  window.addEventListener("setka:favorite-saved",afterFavorite);
  window.addEventListener("setka:favorite-removed",afterFavorite);

  const panel=document.getElementById("communityPanel");
  if(panel)new MutationObserver(()=>{
    if(rendering)return;
    if(panel.querySelector('[data-item-id^="local-community"]'))requestAnimationFrame(()=>render());
  }).observe(panel,{childList:true,subtree:true});

  refresh(true);
  window.__SETKA_COMMUNITY_CONTRACT_V38__={refresh,render,get items(){return cloud.slice()}};
})();