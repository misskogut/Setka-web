(()=>{
"use strict";
// Future SETKA pattern: add ONE descriptor (including module:"your-pattern.js")
// to the registry and write that renderer. The front and admin iframe load it
// automatically; no changes to favorite/note/slider/preview/admin modules.
const registry=window.SetkaPatternRegistryV1;
if(!registry)return;
const loaded=new Set();
function loadModules(){
  for(const p of registry.list()){
    const url=p.module;
    if(!url||loaded.has(url)||typeof url!=="string"||
       !/^standalone-pattern-[a-z0-9-]+\.js(?:\?v=[a-z0-9._-]+)?$/.test(url))continue;
    loaded.add(url);
    const script=document.createElement("script");
    script.src=url;
    script.async=false;
    script.addEventListener("error",()=>console.warn("SETKA renderer module unavailable:",url));
    document.head.appendChild(script);
  }
}
loadModules();
window.SetkaPatternPluginsV1={loadModules};
})();