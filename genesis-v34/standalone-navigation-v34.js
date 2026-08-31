(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  const libraryButton=document.getElementById("libraryButton"),layer=document.getElementById("st34Layer"),game=document.getElementById("gameScreen");
  if(!C||!Setka||!libraryButton)return;

  const KEY="setka-standalone:v34-open-origin-v2";
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  let origin=null,currentPanel={kind:"library",page:Setka.getState?.()?.libraryPage||"all"},bypass=false;
  try{origin=JSON.parse(sessionStorage.getItem(KEY)||"null")}catch(_){}

  function saveOrigin(next){
    origin=clone(next);
    try{origin?sessionStorage.setItem(KEY,JSON.stringify(origin)):sessionStorage.removeItem(KEY)}catch(_){}
  }
  function clearOrigin(){saveOrigin(null)}

  function routeFromScreen(title,kicker){
    title=String(title||"");kicker=String(kicker||"");
    if(title==="Заметки")return{kind:"notes"};
    if(title==="История сессий")return{kind:"sessions"};
    if(kicker==="СЕССИЯ")return{kind:"session-detail"};
    if(title==="Мои наблюдения"||kicker==="ДЛЯ МЕНЯ")return{kind:"insights"};
    if(title==="Пульс")return{kind:"pulse"};
    if(title==="Сегодня")return{kind:"today"};
    if(title==="Я")return{kind:"me"};
    if(title==="Симптомы"||title==="Состояния")return{kind:"symptoms"};
    if(title==="Начать сессию"||kicker==="ПЕРЕД СЕССИЕЙ")return{kind:"pre-survey"};
    if(kicker==="ОЦЕНКА ПОСЛЕ")return{kind:"feedback"};
    if(kicker==="ГОТОВО")return{kind:"feedback-result"};
    return{kind:"screen",title,kicker};
  }

  // One rule for the whole product: gameplay remembers the exact panel that was visible
  // immediately before it opened. It is a one-step Back, not a guessed destination.
  const nativeScreen=C.screen.bind(C);
  C.screen=(title,copy="",kicker="SETKA",back)=>{
    const body=nativeScreen(title,copy,kicker,back);
    currentPanel=routeFromScreen(title,kicker);
    return body;
  };

  function rememberLibrary(page){
    currentPanel={kind:"library",page:page||Setka.getState?.()?.libraryPage||"all"};
  }
  window.addEventListener("setka:library-page",e=>rememberLibrary(e.detail?.page));
  window.addEventListener("setka:view",e=>{
    if(e.detail?.view==="library"&&layer?.classList.contains("hidden"))rememberLibrary(Setka.getState?.()?.libraryPage||"all");
  });

  function completePanel(panel,source={}){
    const p=clone(panel)||{kind:"library",page:"all"};
    if(p.kind==="session-detail"&&!p.sessionId){
      p.sessionId=source.sessionId||null;
      if(!p.sessionId&&(source.type==="memory"||source.type==="note")){
        const n=C.getData?.().notes?.find(x=>String(x.id)===String(source.noteId||source.id||""));
        p.sessionId=n?.sessionId||null;
      }
    }
    p.scrollTop=Number(layer?.scrollTop)||0;
    p.windowScroll=Number(window.scrollY)||0;
    return p;
  }

  const nativeOpen=Setka.openConfig.bind(Setka);
  Setka.openConfig=(config,source={})=>{
    saveOrigin(completePanel(currentPanel,source));
    return nativeOpen(config,source);
  };

  function exitGameplay(done){
    bypass=true;
    try{libraryButton.click()}finally{bypass=false}
    requestAnimationFrame(()=>done?.());
  }
  function restoreScroll(o){
    requestAnimationFrame(()=>{
      if(layer&&!layer.classList.contains("hidden"))layer.scrollTop=Math.max(0,Number(o.scrollTop)||0);
      else window.scrollTo?.(0,Math.max(0,Number(o.windowScroll)||0));
    });
  }
  function restore(o){
    const finish=fn=>exitGameplay(()=>{fn?.();restoreScroll(o)});
    if(o.kind==="notes")return finish(()=>C.showNotes?.());
    if(o.kind==="sessions")return finish(()=>C.showSessions?.());
    if(o.kind==="session-detail"&&o.sessionId)return finish(()=>C.showSessionDetail?.(o.sessionId));
    if(o.kind==="insights")return finish(()=>C.showUserInsights?.());
    if(o.kind==="pulse")return finish(()=>C.showPhysio?.());
    if(o.kind==="today")return finish(()=>C.showToday?.());
    if(o.kind==="me")return finish(()=>C.showMe?.());
    if(o.kind==="symptoms")return finish(()=>C.showSymptoms?.());
    if(o.kind==="feedback-result")return finish(()=>C.showFeedbackResult?.());
    if(o.kind==="feedback")return finish(()=>C.showToday?.());
    if(o.kind==="pre-survey")return finish(()=>C.preSurvey?.());
    if(o.kind==="library")return finish(()=>{
      Setka.setLibraryPage?.(o.page||"all");
      Setka.renderLibrary?.();
      C.setNav?.("patterns");
      currentPanel={kind:"library",page:o.page||"all"};
    });
    return finish(()=>C.showMe?.());
  }

  libraryButton.addEventListener("click",e=>{
    if(bypass)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const o=clone(origin)||completePanel(currentPanel,{});
    C.recordEvent?.("game_back",{to:o.kind,page:o.page||null,sessionId:o.sessionId||null},!!C.getActiveSession?.());
    clearOrigin();
    restore(o);
  },true);

  document.addEventListener("click",e=>{
    const b=e.target?.closest?.("#st34Nav button[data-p]");if(!b||game?.classList.contains("active"))return;
    clearOrigin();
  },false);

  window.SetkaStandaloneNavigationV34={
    getOrigin:()=>clone(origin),
    getCurrentPanel:()=>clone(currentPanel),
    clear:clearOrigin,
    markPanel:panel=>{currentPanel=clone(panel)||currentPanel},
    back:()=>restore(clone(origin)||clone(currentPanel))
  };
})();