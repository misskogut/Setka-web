(()=>{
"use strict";
// Build discovers each standalone-pattern-*.js package and injects its
// descriptor into the shared runtime registry. Both front and research
// automatically load that module; no per-pattern UI/storage/admin edits.
if(typeof document==='undefined')return;
const registry=window.SetkaPatternRegistryV1;
if(!registry)return;
const loaded=new Map(),attempts=new Map();
const MAX_ATTEMPTS=4;
function loadModules(force=false){
  for(const p of registry.list()){
    const url=p.module;
    if(!url||loaded.has(url)||registry.ready(p.id)||typeof url!=="string"||
       !/^standalone-pattern-[a-z0-9-]+\.js(?:\?v=[a-z0-9._-]+)?$/.test(url))continue;
    if(force)attempts.delete(url);
    const tried=attempts.get(url)||0;
    if(tried>=MAX_ATTEMPTS)continue;
    const script=document.createElement("script");
    const address=new URL(url,document.currentScript?.src||location.href);
    const build=document.querySelector('meta[name="setka-release-build"]')?.content;
    if(build&&build!=="development")address.searchParams.set("build",build);
    if(tried)address.searchParams.set("retry",String(tried));
    script.dataset.patternId=p.id;
    script.dataset.patternVersion=String(p.version);
    script.src=address.href;
    script.async=false;
    const pending=new Promise(resolve=>{
      const failed=()=>{
        // A failed network request must not permanently blacklist a saved
        // algorithm. Retry a few times and allow user-initiated retry.
        loaded.delete(url);
        attempts.set(url,(attempts.get(url)||0)+1);
        window.dispatchEvent(new CustomEvent("setka:renderer-error",{detail:{patternId:p.id}}));
        if(attempts.get(url)<MAX_ATTEMPTS)setTimeout(loadModules,Math.min(4000,500*2**tried));
        resolve({id:p.id,ok:false});
      };
      script.addEventListener("load",()=>{if(registry.ready(p.id)){attempts.delete(url);resolve({id:p.id,ok:true})}else failed()},{once:true});
      script.addEventListener("error",failed,{once:true});
    });
    loaded.set(url,pending);
    document.head.appendChild(script);
  }
}
loadModules();
window.addEventListener("setka:registry-changed",()=>loadModules());
window.addEventListener("online",()=>loadModules(true));
window.addEventListener("pageshow",()=>loadModules());
window.SetkaPatternPluginsV1={loadModules:()=>loadModules(true),ready:()=>Promise.all([...loaded.values()]),status:()=>({ready:registry.list().filter(p=>p.module&&registry.ready(p.id)).map(p=>p.id),failed:[...attempts.keys()]})};
})();
