(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-community-patterns-v38";
  let items=[],busy=false,timer=0,lastOkAt=null;

  function clearLegacyLocal(){
    try{const d=C.getData?.();if(d&&Array.isArray(d.localCommunity)&&d.localCommunity.length){d.localCommunity=[];C.save?.()}}catch(_){}
  }
  function apply(){
    clearLegacyLocal();
    C.publicCommunity=items;
    Setka.setCommunity?.(items);
    window.dispatchEvent(new CustomEvent("setka:community-cloud",{detail:{ok:true,count:items.length,updatedAt:lastOkAt}}));
  }
  async function refresh(){
    if(busy)return;busy=true;
    try{
      const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"feed",limit:300})});
      if(!r.ok)throw new Error(`community_${r.status}`);
      const out=await r.json();
      items=Array.isArray(out.items)?out.items.map(x=>({...x,createdAt:x.created_at||x.createdAt||null,localOnly:false})):[];
      lastOkAt=new Date().toISOString();apply();
    }catch(e){
      clearLegacyLocal();
      if(!items.length){C.publicCommunity=[];Setka.setCommunity?.([])}
      window.dispatchEvent(new CustomEvent("setka:community-cloud",{detail:{ok:false,error:String(e?.message||e)}}));
    }finally{busy=false}
  }
  function schedule(ms=600){clearTimeout(timer);timer=setTimeout(refresh,ms)}

  window.addEventListener("setka:favorite-saved",()=>{clearLegacyLocal();apply();schedule(900)});
  window.addEventListener("setka:favorite-removed",()=>{clearLegacyLocal();apply();schedule(900)});
  window.addEventListener("setka:v34-sync",()=>schedule(250));
  window.addEventListener("setka:library-page",e=>{if(e.detail?.page==="community")schedule(0)});

  clearLegacyLocal();refresh();setTimeout(refresh,3200);
  C.cloudCommunity={refresh,status:()=>({count:items.length,lastOkAt})};
  window.__SETKA_CLOUD_COMMUNITY_V38__=true;
})();