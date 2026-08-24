(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;
  const MARK="setka-standalone:v34-favorites-community-migrated";
  let already=false;
  try{already=!!localStorage.getItem(MARK)}catch(_){}
  if(!already){
    const d=C.getData(),seen=new Set((d.localCommunity||[]).map(x=>x.configKey));let changed=false;
    for(const f of Setka.getFavorites?.()||[]){
      const key=Setka.configKey?.(f.config);if(!key||seen.has(key))continue;
      seen.add(key);
      d.localCommunity.unshift({id:`local-community-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,configKey:key,config:JSON.parse(JSON.stringify(f.config)),previewFrame:f.previewFrame||44,saveCount:1,createdAt:new Date(f.createdAt||Date.now()).toISOString(),localOnly:true});
      changed=true;
    }
    if(changed)C.save();
    try{localStorage.setItem(MARK,"1")}catch(_){}
  }

  // Advanced v34 owns the merged public+local community list. Trigger its currently
  // selected mode once after bootstrap so migrated favorites become visible immediately.
  const refresh=()=>{
    const active=document.querySelector('#st34CommunityModes button.active')||document.querySelector('#st34CommunityModes button[data-m="for_me"]');
    active?.click();
  };
  setTimeout(refresh,80);
  setTimeout(refresh,650);
})();