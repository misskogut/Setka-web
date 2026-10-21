(()=>{
"use strict";
// Build discovers each standalone-pattern-*.js package and injects its
// descriptor into the shared runtime registry. Both front and research
// automatically load that module; no per-pattern UI/storage/admin edits.
if(typeof document==='undefined')return;
const registry=window.SetkaPatternRegistryV1;
if(!registry)return;
const loaded=new Map();
function loadModules(){
  for(const p of registry.list()){
    const url=p.module;
    if(!url||loaded.has(url)||typeof url!=="string"||
       !/^standalone-pattern-[a-z0-9-]+\.js(?:\?v=[a-z0-9._-]+)?$/.test(url))continue;
    const script=document.createElement("script");
    const address=new URL(url,document.currentScript?.src||location.href);
    const build=document.querySelector('meta[name="setka-release-build"]')?.content;
    if(build&&build!=="development")address.searchParams.set("build",build);
    script.dataset.patternId=p.id;
    script.dataset.patternVersion=String(p.version);
    script.src=address.href;
    script.async=false;
    const pending=new Promise(resolve=>{
      script.addEventListener("load",()=>resolve({id:p.id,ok:registry.ready(p.id)}),{once:true});
      script.addEventListener("error",()=>{console.warn("SETKA renderer module unavailable:",url);window.dispatchEvent(new CustomEvent("setka:renderer-error",{detail:{patternId:p.id}}));resolve({id:p.id,ok:false})},{once:true});
    });
    loaded.set(url,pending);
    document.head.appendChild(script);
  }
}
loadModules();
window.addEventListener("setka:registry-changed",loadModules);
window.SetkaPatternPluginsV1={loadModules,ready:()=>Promise.all([...loaded.values()])};
})();
