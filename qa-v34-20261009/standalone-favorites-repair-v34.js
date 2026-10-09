(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;

  const FAVORITES_KEY="setka-web:favorites:v1";
  const VAULT_KEY="setka-standalone:favorite-snapshots:v34";
  const clone=v=>JSON.parse(JSON.stringify(v));
  const cfgKey=c=>{try{return Setka.configKey?.(c)||null}catch(_){return null}};
  const defaultKey=cfgKey(Setka.DEFAULT_CONFIG);

  function read(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||"null");return v??fallback}catch(_){return fallback}}
  function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_){return false}}
  function validConfig(c){return !!c&&typeof c==="object"&&Number.isFinite(Number(c.numTentacles))&&Number.isFinite(Number(c.tentacleLength))&&Number.isFinite(Number(c.segmentStep))}
  function isoMs(v){const n=Date.parse(v);return Number.isFinite(n)?n:null}

  let vault=read(VAULT_KEY,{});if(!vault||typeof vault!=="object"||Array.isArray(vault))vault={};
  function vaultPut(id,config,meta={}){
    if(!id||!validConfig(config))return false;
    const key=cfgKey(config);if(!key)return false;
    const prev=vault[String(id)];
    // Never replace a known non-default snapshot by a default one. This is the core
    // invariant that protects a saved configuration from later UI/state regressions.
    if(prev?.config&&cfgKey(prev.config)!==defaultKey&&key===defaultKey)return false;
    vault[String(id)]={id:String(id),config:clone(config),configKey:key,previewFrame:Number.isFinite(Number(meta.previewFrame))?Number(meta.previewFrame):(prev?.previewFrame??44),createdAt:meta.createdAt??prev?.createdAt??Date.now(),source:meta.source||prev?.source||"vault",savedAt:meta.savedAt||prev?.savedAt||new Date().toISOString()};
    write(VAULT_KEY,vault);return true;
  }

  function harvest(){
    const d=C.getData?.()||{},events=Array.isArray(d.events)?d.events:[],notes=Array.isArray(d.notes)?d.notes:[],community=Array.isArray(d.localCommunity)?d.localCommunity:[];

    // Strongest evidence: exact state captured at the actual ♥ save event.
    for(const e of events){
      const fid=e?.payload?.favoriteId||e?.payload?.favorite?.id||null;
      const st=e?.payload?.state;
      if(fid&&validConfig(st?.config))vaultPut(fid,st.config,{previewFrame:st.frame,source:"favorite_save_event",savedAt:e.wallAt});
      // Many journey events retain favoriteId while the same exact config is active.
      const stateFav=st?.favoriteId;
      if(stateFav&&validConfig(st?.config))vaultPut(stateFav,st.config,{previewFrame:st.frame,source:"journey_state",savedAt:e.wallAt});
    }

    // Notes are exact snapshots too. If their state says which favorite was active,
    // they can repair a damaged favorites row without guessing.
    for(const n of notes){
      const fid=n?.state?.favoriteId||null;
      const c=n?.config||n?.state?.config;
      if(fid&&validConfig(c))vaultPut(fid,c,{previewFrame:n.frame??n.state?.frame,source:"note_snapshot",savedAt:n.observedAt});
    }

    // Bootstrap v34 preserved favorite.createdAt in localCommunity.createdAt. This lets
    // us recover older favorites even when they predate the detailed favorite_save event.
    const raw=read(FAVORITES_KEY,[]);
    if(Array.isArray(raw))for(const f of raw){
      const t=Number(f?.createdAt)||null;if(!t)continue;
      let best=null,bestGap=Infinity;
      for(const c of community){
        if(!validConfig(c?.config))continue;
        const ct=isoMs(c.createdAt);if(ct==null)continue;
        const gap=Math.abs(ct-t);if(gap<bestGap){bestGap=gap;best=c}
      }
      if(best&&bestGap<=2500)vaultPut(f.id,best.config,{previewFrame:best.previewFrame,createdAt:f.createdAt,source:"local_community_createdAt"});
    }
  }

  function repairStorage(){
    harvest();
    const raw=read(FAVORITES_KEY,[]);if(!Array.isArray(raw)||!raw.length)return 0;
    let changed=0;
    for(const f of raw){
      const snap=vault[String(f?.id||"")];if(!snap?.config)continue;
      const oldKey=cfgKey(f.config),newKey=cfgKey(snap.config);
      if(oldKey!==newKey){f.config=clone(snap.config);if(Number.isFinite(Number(snap.previewFrame)))f.previewFrame=Number(snap.previewFrame);changed++}
    }
    if(changed){write(FAVORITES_KEY,raw);Setka.refreshFavorites?.();C.recordEvent?.("favorites_repaired",{count:changed},false)}
    return changed;
  }

  // First repair happens before advanced v34 installs its library choice interceptor.
  repairStorage();

  // Protect future favorites immediately at the moment of save.
  window.addEventListener("setka:favorite-saved",e=>{
    const f=e.detail?.favorite,st=e.detail?.state;
    if(f?.id&&validConfig(f.config||st?.config))vaultPut(f.id,f.config||st.config,{previewFrame:f.previewFrame??st?.frame,createdAt:f.createdAt,source:"live_favorite_save",savedAt:new Date().toISOString()});
    repairStorage();
  });

  // If another module ever refreshes or migrates local favorites, enforce the vault again.
  window.addEventListener("setka:library-page",e=>{if(e.detail?.page==="favorites")setTimeout(repairStorage,0)});
  window.addEventListener("pageshow",()=>setTimeout(repairStorage,30));

  // Final opening guard: resolve a favorite by immutable vault first, then current storage.
  const nativeOpen=Setka.openConfig.bind(Setka);
  Setka.openConfig=(config,source={})=>{
    if(source?.type==="favorite"&&source.id){
      repairStorage();
      const snap=vault[String(source.id)];
      if(validConfig(snap?.config))config=clone(snap.config);
      else {
        const f=Setka.getFavorites?.().find(x=>String(x.id)===String(source.id));
        if(validConfig(f?.config))config=clone(f.config);
      }
    }
    return nativeOpen(config,source);
  };

  C.getFavoriteSnapshot=id=>vault[String(id)]?clone(vault[String(id)]):null;
  C.repairFavorites=repairStorage;
  window.__SETKA_FAVORITES_VAULT_V34__=true;
})();