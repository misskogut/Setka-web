(() => {
  "use strict";
  // Read-only emergency projection of the last verified *published* catalogue.
  // Live Supabase data always takes precedence when its publication revision
  // is at least as recent. Never reveal testing or disabled patterns.
  const R=window.SetkaPatternRegistryV1;
  if(!R || typeof R.applyPublication!=="function")return;
  const fallbackUrl=new URL("./standalone-catalog-public-snapshot-v1.json",location.href);
  async function load(){
    try{
      const response=await fetch(fallbackUrl,{cache:"no-store",credentials:"same-origin"});
      if(!response.ok)return;
      const saved=await response.json();
      if(saved.format!=="setka-public-catalog-static-fallback-v1" ||
         saved.registryAvailable!==true ||
         !Number.isSafeInteger(saved.publicationRevision) || saved.publicationRevision<0 ||
         !Array.isArray(saved.items) ||
         saved.items.some(p=>!p||typeof p.pattern_id!=="string"||typeof p.title!=="string") ||
         !Array.isArray(saved.defaults))return;
      // A new remote publication revision must never be overwritten by
      // an older GitHub snapshot during a racing network fetch.
      if(R.publicationRevision()>=saved.publicationRevision)return;
      R.applyPublication(saved.items,saved.publicationRevision);
      if(saved.order)R.applyOrder(saved.order);
      R.setTitles?.(saved.items);
      R.applyDefaults?.(saved.defaults);
      window.__SETKA_PATTERN_CATALOG_V1__?.decorate?.();
      window.dispatchEvent(new CustomEvent("setka:catalog-offline-snapshot",{
        detail:{published:saved.items.length,revision:saved.publicationRevision,generatedAt:saved.generatedAt}
      }));
    }catch(_){
      // Keep the existing state; network and malformed cache are nonfatal.
    }
  }
  load();
})();
