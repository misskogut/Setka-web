(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;

  const registry=window.SetkaPatternRegistryV1;
  const clone=v=>JSON.parse(JSON.stringify(v));
  function normalize(config){return Setka.cloneConfig(config,config?.patternId||registry.inference(config))}
  function encode(config){return 'v2.'+btoa(unescape(encodeURIComponent(JSON.stringify(registry.snapshot({patternId:config.patternId,config,frame:0})))))}
  function decode(raw){
    try{
      if(String(raw).startsWith('v2.')){const saved=JSON.parse(decodeURIComponent(escape(atob(String(raw).slice(3))))),out=registry.restore(saved);return out.ok?out.snapshot.config:null}
      // A documented pre-v2 link has nine numeric Tentacle fields, no ID.
      const fields=registry.get('tentacle-orbit').keyFields,values=String(raw||'').split(',');
      if(values.length!==fields.length||!values.every(x=>x.trim()!==''&&Number.isFinite(Number(x))))return null;
      return normalize({patternId:'tentacle-orbit',...Object.fromEntries(fields.map((k,i)=>[k,Number(values[i])]))});
    }catch(_){return null}
  }
  function exactForSource(config,source={}){
    const hasExplicit=!!config&&typeof config==="object";
    let exact=hasExplicit?normalize(config):null;
    if(source?.type==="favorite"&&source.id){
      const fav=Setka.getFavorites?.().find(x=>String(x.id)===String(source.id));
      if(fav?.config)exact=normalize(fav.config);
    }
    // Community tiles created by app-v2 already carry the exact config in their closure.
    // Never replace that explicit snapshot with a second lookup, because the merged
    // community array can be reordered/deduplicated independently. Only use a lookup as
    // a fallback when no explicit config was supplied at all.
    if(source?.type==="community"&&source.id&&!hasExplicit){
      const item=(C.publicCommunity||[]).find(x=>String(x.id)===String(source.id));
      if(item?.config)exact=normalize(item.config);
    }
    return exact;
  }

  const nativeOpen=Setka.openConfig.bind(Setka);
  Setka.openConfig=(config,source={})=>{
    let exact;try{exact=exactForSource(config,source)}catch(_){return nativeOpen(config,source)}
    if(!exact)return false;
    const result=nativeOpen(exact,source);
    window.dispatchEvent(new CustomEvent("setka:exact-config-open",{detail:{source:clone(source||{}),config:clone(exact),configKey:Setka.configKey?.(exact,exact.patternId)||null}}));
    return result;
  };

  function buildLink(config,meta={}){
    const u=new URL("standalone-v34.html",location.href);
    u.searchParams.set("cfg",encode(config));
    if(Number.isFinite(Number(meta.frame)))u.searchParams.set("frame",String(Number(meta.frame)));
    if(meta.noteId)u.searchParams.set("note",String(meta.noteId));
    if(meta.sourceType)u.searchParams.set("src",String(meta.sourceType));
    return u.href;
  }

  C.encodeConfigLink=encode;
  C.decodeConfigLink=decode;
  C.buildConfigLink=buildLink;
  C.openExactConfig=(config,source={type:"exact",id:"manual"})=>Setka.openConfig(normalize(config),source);

  const params=new URLSearchParams(location.search),linked=decode(params.get("cfg"));
  if(linked){
    const noteId=params.get("note")||null,src=params.get("src")||"admin-link";
    Promise.resolve(window.SetkaPatternPluginsV1?.ready?.()).then(()=>{
      C.hideLayer?.();
      Setka.openConfig(linked,{type:"exact-link",id:noteId||src,communityId:null,frame:Number(params.get("frame"))||0});
      C.recordEvent?.("config_deep_link_open",{noteId,source:src,configKey:Setka.configKey?.(linked)||null,state:C.stateSnapshot?.()},false);
    });
  }
})();
