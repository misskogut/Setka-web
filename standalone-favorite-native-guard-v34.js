(() => {
  "use strict";
  const library=document.getElementById("libraryScreen");
  if(!library)return;

  // Advanced v34 installs a capture-phase pointerup handler on the whole library to
  // show the "start session / browse" choice. Capture runs before the favorite tile's
  // own pointerup handler from app-v2, so a stopImmediatePropagation there prevents the
  // native favorite code from ever resolving fav.config by favorite ID.
  //
  // Wrap capture-phase pointerup registrations made after this module loads so favorite
  // tiles bypass those generic interceptors and reach app-v2's native handler:
  //   favorite tile id -> favorites[] row -> exact fav.config -> openConfig().
  // Base/community cards keep the normal session-choice interception.
  const nativeAdd=library.addEventListener.bind(library);
  library.addEventListener=function(type,listener,options){
    const capture=options===true||!!(options&&typeof options==="object"&&options.capture);
    if(type==="pointerup"&&capture&&typeof listener==="function"){
      const wrapped=function(event){
        const tile=event.target?.closest?.(".pattern-tile");
        if(tile?.dataset?.kind==="favorite"&&!event.target?.closest?.(".st34-info"))return;
        return listener.call(this,event);
      };
      return nativeAdd(type,wrapped,options);
    }
    return nativeAdd(type,listener,options);
  };

  window.__SETKA_FAVORITE_NATIVE_GUARD_V34__=true;
})();