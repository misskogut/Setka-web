(() => {
  "use strict";
  const library=document.getElementById("libraryScreen");
  if(!library)return;

  // Advanced v34 installs a capture-phase pointerup handler on the whole library to
  // show the generic "start session / browse" choice. Capture runs before app-v2's
  // own tile pointerup handlers. That is useful for the base pattern, but it can break
  // exact saved/community snapshots because the generic layer resolves the card again
  // through a secondary data source.
  //
  // Saved and community tiles now bypass those generic capture interceptors and use the
  // native app-v2 path instead:
  //   tile closure -> exact item.config -> openConfig().
  // Base cards keep the normal session-choice interception.
  const nativeAdd=library.addEventListener.bind(library);
  library.addEventListener=function(type,listener,options){
    const capture=options===true||!!(options&&typeof options==="object"&&options.capture);
    if(type==="pointerup"&&capture&&typeof listener==="function"){
      const wrapped=function(event){
        const tile=event.target?.closest?.(".pattern-tile");
        const kind=tile?.dataset?.kind||null;
        if((kind==="favorite"||kind==="community")&&!event.target?.closest?.(".st34-info"))return;
        return listener.call(this,event);
      };
      return nativeAdd(type,wrapped,options);
    }
    return nativeAdd(type,listener,options);
  };

  window.__SETKA_SAVED_NATIVE_GUARD_V34__=true;
})();