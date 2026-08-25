(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  const libraryButton=document.getElementById("libraryButton");
  if(!C||!Setka||!libraryButton)return;

  const KEY="setka-standalone:v34-open-origin";
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  let origin=null,bypass=false;
  try{origin=JSON.parse(sessionStorage.getItem(KEY)||"null")}catch(_){}

  function remember(source={}){
    let next=null;
    const type=String(source?.type||"");
    if(type==="memory"||type==="note")next={kind:"notes",id:source.noteId||source.id||null};
    else if(type==="favorite")next={kind:"favorites",id:source.id||null};
    else if(type==="community")next={kind:"community",id:source.id||source.communityId||null};
    else if(type==="history")next={kind:"sessions",id:source.sessionId||null};
    else if(type==="personal")next={kind:"insights",id:source.id||null};
    else if(type==="base")next={kind:"library",page:"all"};
    else if(type==="exact-link")next={kind:"library",page:"all"};
    if(!next)return;
    origin=next;
    try{sessionStorage.setItem(KEY,JSON.stringify(origin))}catch(_){}
  }

  const nativeOpen=Setka.openConfig.bind(Setka);
  Setka.openConfig=(config,source={})=>{
    remember(source);
    return nativeOpen(config,source);
  };

  function clearOrigin(){origin=null;try{sessionStorage.removeItem(KEY)}catch(_){}}

  function leaveGame(page="all",after=null){
    bypass=true;
    try{libraryButton.click()}finally{bypass=false}
    setTimeout(()=>{
      Setka.setLibraryPage?.(page);
      C.setNav?.(page==="all"||page==="favorites"||page==="community"?"patterns":"me");
      if(typeof after==="function")after();
    },0);
  }

  libraryButton.addEventListener("click",e=>{
    if(bypass)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const o=clone(origin)||{kind:"library",page:"all"};
    C.recordEvent?.("game_return",{origin:o.kind,page:o.page||null},!!C.getActiveSession?.());

    if(o.kind==="notes")return leaveGame("all",()=>C.showNotes?.());
    if(o.kind==="favorites")return leaveGame("favorites");
    if(o.kind==="community")return leaveGame("community");
    if(o.kind==="sessions")return leaveGame("all",()=>C.showSessions?.());
    if(o.kind==="insights")return leaveGame("all",()=>C.showUserInsights?.());
    leaveGame(o.page||"all");
  },true);

  // If the user navigates deliberately from the bottom menu, that becomes the new
  // navigation context. The next gameplay open will set a fresh, more specific origin.
  document.addEventListener("click",e=>{
    const b=e.target?.closest?.("#st34Nav button[data-p]");if(!b)return;
    if(!document.getElementById("gameScreen")?.classList.contains("active"))clearOrigin();
  },false);

  window.SetkaStandaloneNavigationV34={getOrigin:()=>clone(origin),clear:clearOrigin};
})();