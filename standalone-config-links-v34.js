(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;

  const FIELDS=["numTentacles","tentacleLength","baseRadius","movementSpeed","colorSpeed","circleSize","lineWeight","segmentStep","colorModeIndex"];
  const clone=v=>JSON.parse(JSON.stringify(v));
  const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;

  function normalize(config){
    const d=Setka.DEFAULT_CONFIG||{};
    const c=config||{};
    return {
      numTentacles:Math.max(3,Math.min(72,Math.round(finite(c.numTentacles,d.numTentacles||24)))),
      tentacleLength:Math.max(10,Math.min(800,finite(c.tentacleLength,d.tentacleLength||100))),
      baseRadius:Math.max(0,Math.min(100,finite(c.baseRadius,d.baseRadius||10))),
      movementSpeed:Math.max(.05,Math.min(10,finite(c.movementSpeed,d.movementSpeed||1))),
      colorSpeed:Math.max(.05,Math.min(10,finite(c.colorSpeed,d.colorSpeed||1))),
      circleSize:Math.max(.2,Math.min(20,finite(c.circleSize,d.circleSize||1))),
      lineWeight:Math.max(.1,Math.min(10,finite(c.lineWeight,d.lineWeight||1))),
      segmentStep:Math.max(1,Math.min(20,Math.round(finite(c.segmentStep,d.segmentStep||2)))),
      colorModeIndex:Math.max(0,Math.min(8,Math.round(finite(c.colorModeIndex,d.colorModeIndex||0))))
    };
  }
  function encode(config){return FIELDS.map(k=>String(normalize(config)[k])).join(",")}
  function decode(raw){
    const parts=String(raw||"").split(",");if(parts.length!==FIELDS.length)return null;
    const d={};FIELDS.forEach((k,i)=>d[k]=Number(parts[i]));
    if(FIELDS.some(k=>!Number.isFinite(d[k])))return null;
    return normalize(d);
  }
  function exactForSource(config,source={}){
    let exact=config?normalize(config):normalize(Setka.DEFAULT_CONFIG);
    if(source?.type==="favorite"&&source.id){
      const fav=Setka.getFavorites?.().find(x=>String(x.id)===String(source.id));
      if(fav?.config)exact=normalize(fav.config);
    }
    if(source?.type==="community"&&source.id){
      const item=(C.publicCommunity||[]).find(x=>String(x.id)===String(source.id));
      if(item?.config)exact=normalize(item.config);
    }
    return exact;
  }

  // Critical fix: advanced v34 may fall back to DEFAULT_CONFIG while still carrying the
  // correct favorite/community source id. Resolve the exact saved snapshot again at the
  // last possible moment before the gameplay renderer receives it.
  const nativeOpen=Setka.openConfig.bind(Setka);
  Setka.openConfig=(config,source={})=>{
    const exact=exactForSource(config,source);
    const result=nativeOpen(exact,source);
    window.dispatchEvent(new CustomEvent("setka:exact-config-open",{detail:{source:clone(source||{}),config:clone(exact),configKey:Setka.configKey?.(exact)||null}}));
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

  // Exact links from the sandbox admin open directly into gameplay, without changing
  // the saved favorite itself and without starting a measured session automatically.
  const params=new URLSearchParams(location.search),linked=decode(params.get("cfg"));
  if(linked){
    const noteId=params.get("note")||null,src=params.get("src")||"admin-link";
    setTimeout(()=>{
      C.hideLayer?.();
      Setka.openConfig(linked,{type:"exact-link",id:noteId||src,communityId:null});
      C.recordEvent?.("config_deep_link_open",{noteId,source:src,configKey:Setka.configKey?.(linked)||null,state:C.stateSnapshot?.()},false);
    },180);
  }
})();