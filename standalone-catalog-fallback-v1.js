(() => {
  "use strict";
  // An emergency, read-only snapshot of the last VERIFIED published catalogue.
  // Never load it eagerly: a successful live response (including a test server
  // fixture) must always win over any historical publication revision.
  const R=window.SetkaPatternRegistryV1;
  if(!R || typeof R.applyPublication!=="function")return;
  const fallbackUrl=new URL("./standalone-catalog-public-snapshot-v1.json",location.href);
  let pending=null;
  function apply(){
    if(pending)return pending;
    pending=(async()=>{
      try{
        // A confirmed catalogue already exists for this page visit.
        if(R.publicationRevision()>=0)return false;
        const response=await fetch(fallbackUrl,{cache:"no-store",credentials:"same-origin"});
        if(!response.ok)return false;
        const saved=await response.json();
        if(saved.format!=="setka-public-catalog-static-fallback-v1" ||
           saved.registryAvailable!==true ||
           !Number.isSafeInteger(saved.publicationRevision) || saved.publicationRevision<0 ||
           !Array.isArray(saved.items) ||
           saved.items.some(p=>!p||typeof p.pattern_id!=="string"||typeof p.title!=="string") ||
           !Array.isArray(saved.defaults))return false;
        // The live network may have recovered during the static fetch.
        if(R.publicationRevision()>=0)return false;
        R.applyPublication(saved.items,saved.publicationRevision);
        if(saved.order)R.applyOrder(saved.order);
        R.setTitles?.(saved.items);
        R.applyDefaults?.(saved.defaults);
        window.__SETKA_PATTERN_CATALOG_V1__?.decorate?.();
        window.dispatchEvent(new CustomEvent("setka:catalog-offline-snapshot",{
          detail:{published:saved.items.length,revision:saved.publicationRevision,generatedAt:saved.generatedAt}
        }));
        return true;
      }catch(_){return false}
      finally{pending=null}
    })();
    return pending;
  }
  window.__SETKA_PUBLIC_CATALOG_FALLBACK_V1__={apply};
})();
