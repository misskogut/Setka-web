(() => {
  "use strict";

  const ACCESS_KEY = "setka-research:access-code:v1";
  const app = document.getElementById("app");
  const gameScreen = document.getElementById("gameScreen");
  const libraryScreen = document.getElementById("libraryScreen");
  const gameUI = gameScreen?.querySelector(".game-ui");
  const bottomControls = gameScreen?.querySelector(".bottom-controls");
  const libraryButton = document.getElementById("libraryButton");
  const instructionsButton = document.getElementById("instructionsButton");
  if (!app || !gameScreen || !libraryScreen || !gameUI || !bottomControls || !libraryButton) return;

  const style = document.createElement("style");
  style.textContent = `
    #visibilityButton{width:46px;height:46px;border-color:rgba(255,255,255,.46);opacity:.78;flex:0 0 auto}
    #visibilityButton svg{width:24px;height:24px;display:block}#visibilityButton:active{transform:scale(.92)}
    #gameScreen.controls-hidden #favoriteButton,#gameScreen.controls-hidden #libraryButton,#gameScreen.controls-hidden #prevButton,#gameScreen.controls-hidden #nextButton,#gameScreen.controls-hidden #colorButton,#gameScreen.controls-hidden #instructionsButton,#gameScreen.controls-hidden #sessionNoteButton,#gameScreen.controls-hidden .session-top-pill,#gameScreen.controls-hidden #modeLabel,#gameScreen.controls-hidden #toast{opacity:0!important;pointer-events:none!important}
    #gameScreen.controls-hidden #visibilityButton{opacity:.11!important;pointer-events:auto!important}
    #gameScreen.controls-hidden .bottom-controls{pointer-events:none}#gameScreen.controls-hidden .bottom-controls #visibilityButton{pointer-events:auto}
    #sessionNoteButton{position:absolute!important;z-index:125!important;left:25px!important;right:auto!important;top:calc(env(safe-area-inset-top,0px) + 30px)!important;width:44px!important;height:44px!important;border:1px solid rgba(255,255,255,.58)!important;border-radius:50%!important;background:rgba(0,0,0,.42)!important;color:#fff!important;font-size:24px!important;line-height:1!important;place-items:center!important;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
    #sessionNoteButton.show{display:grid!important}#finishSessionButton{display:none!important}
    #gameScreen .session-top-pill{position:absolute!important;z-index:124!important;left:50%!important;top:calc(env(safe-area-inset-top,0px) + 99px)!important;transform:translateX(-50%)!important;min-width:0!important;height:27px!important;padding:0 10px!important;border:1px solid rgba(255,255,255,.18)!important;border-radius:14px!important;background:rgba(0,0,0,.34)!important;color:rgba(255,255,255,.58)!important;font-size:9px!important;letter-spacing:.055em!important;white-space:nowrap!important;cursor:pointer!important;pointer-events:auto!important;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
    #gameScreen .session-top-pill.show{display:flex!important}#gameScreen #toast{top:calc(env(safe-area-inset-top,0px) + 138px)}#gameScreen .bottom-controls{gap:18px}
    #researchMenuButton{position:absolute;z-index:45;right:21px;top:calc(env(safe-area-inset-top,0px) + 48px);width:40px;height:40px;border:1px solid rgba(255,255,255,.24);border-radius:50%;background:transparent;color:rgba(255,255,255,.64);display:none;place-items:center;font-size:18px;line-height:1;cursor:pointer}#researchMenuButton.show{display:grid}#researchMenuButton:active{transform:scale(.94)}
    #sessionChoiceOverlay{position:fixed;inset:0;z-index:100080;background:rgba(0,0,0,.78);display:grid;place-items:center;padding:24px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;color:#fff}
    .session-choice-box{width:min(100%,390px);border:1px solid rgba(255,255,255,.25);border-radius:26px;background:rgba(5,5,5,.96);padding:24px 20px 18px;text-align:center}.session-choice-mark{width:48px;height:48px;border:1px solid rgba(255,255,255,.55);border-radius:50%;display:grid;place-items:center;margin:0 auto 17px;font-size:10px;letter-spacing:.1em}.session-choice-title{font-size:20px;font-weight:600}.session-choice-copy{font-size:12px;line-height:1.5;color:rgba(255,255,255,.46);margin:8px auto 18px;max-width:320px}.session-choice-primary,.session-choice-secondary,.session-choice-cancel{width:100%;min-height:50px;border-radius:25px;font-size:14px;cursor:pointer}.session-choice-primary{border:1px solid #fff;background:#fff;color:#000;font-weight:650}.session-choice-secondary{border:1px solid rgba(255,255,255,.42);background:transparent;color:#fff;margin-top:9px}.session-choice-cancel{min-height:40px;border:0;background:transparent;color:rgba(255,255,255,.35);margin-top:7px;font-size:12px}
  `;
  document.head.appendChild(style);

  const eye = document.createElement("button");
  eye.id = "visibilityButton";eye.className = "round-control";eye.type = "button";eye.setAttribute("aria-label", "Скрыть панель управления");
  eye.innerHTML = `<svg viewBox="0 0 36 24" aria-hidden="true"><path d="M2 12c4.3-6 9.6-9 16-9s11.7 3 16 9c-4.3 6-9.6 9-16 9S6.3 18 2 12Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  bottomControls.insertBefore(eye, instructionsButton || null);

  let controlsHidden = false;
  function setControlsHidden(v){controlsHidden=!!v;gameScreen.classList.toggle("controls-hidden",controlsHidden);eye.setAttribute("aria-label",controlsHidden?"Показать панель управления":"Скрыть панель управления");if(controlsHidden&&document.getElementById("instructionsModal")?.classList.contains("open"))document.getElementById("closeInstructionsButton")?.click()}
  eye.onclick=e=>{e.preventDefault();e.stopPropagation();setControlsHidden(!controlsHidden)};

  const menuButton=document.createElement("button");menuButton.id="researchMenuButton";menuButton.type="button";menuButton.textContent="○";menuButton.setAttribute("aria-label","Открыть мой раздел");libraryScreen.appendChild(menuButton);
  const researchLayer=()=>document.getElementById("setkaResearchLayer");const portalNav=()=>document.querySelector(".portal-nav");
  const activeResearchTimer=()=>Boolean(gameScreen.querySelector(".session-top-pill.show"));const isAuthenticated=()=>Boolean(localStorage.getItem(ACCESS_KEY));

  function showOriginalLibrary(){portalNav()?.classList.add("hidden");researchLayer()?.classList.add("hidden");app.style.visibility="visible";if(!libraryScreen.classList.contains("active"))libraryButton.click();window.SetkaApp?.setLibraryPage?.("all");menuButton.classList.toggle("show",isAuthenticated())}
  menuButton.onclick=()=>{const me=portalNav()?.querySelector('button[data-page="me"]');if(me)me.click()};
  document.addEventListener("click",e=>{const b=e.target.closest?.('.portal-nav button[data-page="patterns"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();showOriginalLibrary()},true);

  let pendingTile=null,startingFromTile=false,bypassTileOnce=false;
  const pointerStarts=new Map();
  libraryScreen.addEventListener("pointerdown",e=>{const tile=e.target.closest?.(".pattern-tile");if(tile)pointerStarts.set(e.pointerId,{at:Date.now(),x:e.clientX,y:e.clientY})},true);

  function beginSessionForTile(tile){
    if(startingFromTile)return;startingFromTile=true;pendingTile={kind:tile.dataset.kind||"base",id:tile.dataset.itemId||""};
    const today=portalNav()?.querySelector('button[data-page="today"]');if(!today){startingFromTile=false;return}today.click();
    requestAnimationFrame(()=>{const start=[...document.querySelectorAll("#setkaResearchLayer .hub-action")].find(x=>x.querySelector(".hub-title")?.textContent?.trim()==="Начать сессию");if(start)start.click();else startingFromTile=false});
  }

  function cancelTileHold(tile){try{tile.dispatchEvent(new PointerEvent("pointercancel",{bubbles:false,cancelable:false,pointerId:998}))}catch(_){try{tile.dispatchEvent(new Event("pointercancel"))}catch(__){}}}
  function openTileDirect(tile){
    bypassTileOnce=true;
    try{tile.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,cancelable:true,pointerId:997,clientX:0,clientY:0}))}
    catch(_){if(tile.dataset.kind==="base")window.SetkaApp?.openConfig?.(window.SetkaApp.DEFAULT_CONFIG,{type:"base",id:tile.dataset.itemId||"tentacle-orbit",communityId:null})}
  }

  function showSessionChoice(tile){
    document.getElementById("sessionChoiceOverlay")?.remove();
    window.SetkaJourney?.track?.("journey_screen",{screen:"session_choice",state:window.SetkaApp?.getState?.()||null});
    const o=document.createElement("div");o.id="sessionChoiceOverlay";o.innerHTML=`<div class="session-choice-box"><div class="session-choice-mark">SETKA</div><div class="session-choice-title">Запустить новую сессию?</div><div class="session-choice-copy">Для измеряемой сессии мы сначала зафиксируем запрос, состояние и время. Если хочешь просто быстро посмотреть паттерн — открывай без опроса. Путь по приложению всё равно сохранится.</div><button class="session-choice-primary">Запустить сессию</button><button class="session-choice-secondary">Просто посмотреть</button><button class="session-choice-cancel">Отмена</button></div>`;
    document.body.appendChild(o);
    const close=()=>o.remove();
    o.querySelector(".session-choice-primary").onclick=()=>{window.SetkaJourney?.track?.("journey_session_choice",{choice:"start",tileKind:tile.dataset.kind,tileId:tile.dataset.itemId});close();beginSessionForTile(tile)};
    o.querySelector(".session-choice-secondary").onclick=()=>{window.SetkaJourney?.track?.("journey_session_choice",{choice:"browse",tileKind:tile.dataset.kind,tileId:tile.dataset.itemId});close();openTileDirect(tile)};
    o.querySelector(".session-choice-cancel").onclick=()=>{window.SetkaJourney?.track?.("journey_session_choice",{choice:"cancel"});close()};
  }

  libraryScreen.addEventListener("pointerup",e=>{
    const tile=e.target.closest?.(".pattern-tile");if(!tile)return;
    if(bypassTileOnce){bypassTileOnce=false;return}
    const p=pointerStarts.get(e.pointerId);pointerStarts.delete(e.pointerId);
    if(p){const held=Date.now()-p.at>560,moved=Math.hypot(e.clientX-p.x,e.clientY-p.y)>20;if(held||moved)return}
    if(!isAuthenticated()||activeResearchTimer()||!researchLayer()?.classList.contains("hidden"))return;
    e.preventDefault();e.stopImmediatePropagation();cancelTileHold(tile);showSessionChoice(tile);
  },true);

  function openPendingTileIfReady(){
    if(!pendingTile||!activeResearchTimer()||!libraryScreen.classList.contains("active"))return;
    const selector=`.pattern-tile[data-kind="${CSS.escape(pendingTile.kind)}"][data-item-id="${CSS.escape(pendingTile.id)}"]`;const tile=libraryScreen.querySelector(selector);const target=pendingTile;pendingTile=null;startingFromTile=false;if(!tile)return;
    setTimeout(()=>{bypassTileOnce=true;try{tile.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,cancelable:true,pointerId:999,clientX:0,clientY:0}))}catch(_){if(target.kind==="base")window.SetkaApp?.openConfig?.(window.SetkaApp.DEFAULT_CONFIG,{type:"base",id:target.id,communityId:null})}},70)
  }

  function integrateResearchControls(){
    const note=document.getElementById("sessionNoteButton"),pill=document.querySelector(".session-top-pill"),finish=document.getElementById("finishSessionButton");
    if(note&&note.parentElement!==gameUI)gameUI.appendChild(note);
    if(note&&!note.dataset.uiV7){note.dataset.uiV7="1";note.addEventListener("click",e=>{if(activeResearchTimer())return;e.preventDefault();e.stopImmediatePropagation();window.SetkaJourney?.openStandaloneNote?.()},true)}
    if(pill&&pill.parentElement!==gameUI){gameUI.appendChild(pill);pill.title="Нажми, чтобы завершить раньше";pill.addEventListener("click",()=>finish?.click())}
    const browseGame=isAuthenticated()&&gameScreen.classList.contains("active")&&!activeResearchTimer();if(note)note.classList.toggle("show",browseGame||note.classList.contains("show")&&activeResearchTimer());
    menuButton.classList.toggle("show",isAuthenticated()&&libraryScreen.classList.contains("active")&&researchLayer()?.classList.contains("hidden"));
  }

  let autoHomeDone=false;
  const observer=new MutationObserver(()=>{
    integrateResearchControls();openPendingTileIfReady();const layer=researchLayer();const title=layer?.querySelector(".research-title")?.textContent?.trim();
    if(!autoHomeDone&&isAuthenticated()&&title==="Сегодня"&&!activeResearchTimer()){autoHomeDone=true;showOriginalLibrary()}
    if(!gameScreen.classList.contains("active"))setControlsHidden(false);if(gameScreen.classList.contains("active"))portalNav()?.classList.add("hidden");
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["class","style"]});

  window.addEventListener("setka:view",e=>{const view=e.detail?.view;if(view==="library"){setControlsHidden(false);menuButton.classList.toggle("show",isAuthenticated()&&researchLayer()?.classList.contains("hidden"))}else if(view==="game"){menuButton.classList.remove("show");portalNav()?.classList.add("hidden")}integrateResearchControls()});
  integrateResearchControls();menuButton.classList.toggle("show",isAuthenticated());
})();