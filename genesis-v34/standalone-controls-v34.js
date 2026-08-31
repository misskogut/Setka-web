(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp,game=document.getElementById("gameScreen");
  if(!C||!Setka||!game)return;

  const style=document.createElement("style");
  style.textContent=`
    #st34EndSession{display:none;position:relative!important;inset:auto!important;width:46px;height:46px;min-width:46px;min-height:46px;flex:0 0 46px;border:1px solid rgba(255,255,255,.46);border-radius:50%;background:transparent;color:#fff;align-items:center;justify-content:center;font-size:16px;line-height:1;padding:0;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
    #st34EndSession.show{display:flex}
    #st34EndSession:active{background:rgba(255,255,255,.13);transform:scale(.94)}
    #gameScreen.st34-hidden-ui #st34EndSession{opacity:0!important;pointer-events:none!important}
    .st34-finish-today{margin-top:12px!important;border-color:rgba(255,255,255,.48)!important}
    .st34-finish-today b{font-size:15px}.st34-finish-today span{opacity:.75}
  `;
  document.head.appendChild(style);

  const controls=document.querySelector("#gameScreen .bottom-controls"),note=document.getElementById("st34Note");
  const endBtn=document.createElement("button");
  endBtn.id="st34EndSession";endBtn.type="button";endBtn.className="round-control";endBtn.textContent="■";endBtn.setAttribute("aria-label","Завершить сессию");endBtn.title="Завершить сессию";
  if(controls){if(note?.parentElement===controls)note.insertAdjacentElement("afterend",endBtn);else controls.appendChild(endBtn)}

  function activeSession(){return C.getActiveSession?.()||null}
  function canFinish(){const s=activeSession();return !!s&&["measured","after_feedback"].includes(s.phase)}
  function finishRequest(origin){
    const s=activeSession();if(!s)return;
    C.recordEvent?.("manual_session_end_request",{origin,phase:s.phase,state:C.stateSnapshot?.()},true);
    const timer=document.getElementById("st34Timer");
    if((s.phase==="measured"||s.phase==="after_feedback")&&timer){timer.click();return}
    if(s.phase==="done_feedback")C.showFeedbackResult?.();
  }
  endBtn.addEventListener("pointerdown",e=>e.stopPropagation());
  endBtn.addEventListener("pointerup",e=>e.stopPropagation());
  endBtn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();finishRequest("gameplay")});

  function updateEndButton(){endBtn.classList.toggle("show",canFinish()&&game.classList.contains("active"))}
  window.addEventListener("setka:view",updateEndButton);
  window.addEventListener("setka:standalone-event",e=>{
    if(["session_start","feedback_prompt","feedback_submit","continuation_start","session_end"].includes(e.detail?.type))setTimeout(()=>{updateEndButton();injectTodayFinish()},0)
  });
  setInterval(updateEndButton,800);

  function injectTodayFinish(){
    const layer=document.getElementById("st34Layer"),title=layer?.querySelector?.(".st-title"),body=layer?.querySelector?.("#stBody");
    if(!layer||layer.classList.contains("hidden")||title?.textContent!=="Сегодня"||!body)return;
    body.querySelector(".st34-finish-today")?.remove();
    const s=activeSession();if(!s||!["measured","after_feedback"].includes(s.phase))return;
    const b=document.createElement("button");b.type="button";b.className="st-action st34-finish-today";
    b.innerHTML=`<b>Завершить сессию</b><span>${s.phase==="measured"?"Остановить измеряемую часть и перейти к итоговой оценке":"Закончить свободное продолжение после оценки"}</span>`;
    b.onclick=()=>finishRequest("today");body.prepend(b);
  }
  new MutationObserver(()=>injectTodayFinish()).observe(document.getElementById("st34Layer")||document.body,{subtree:true,childList:true});
  document.querySelector('#st34Nav button[data-p="today"]')?.addEventListener("click",()=>setTimeout(injectTodayFinish,0));
  setTimeout(()=>{updateEndButton();injectTodayFinish()},150);

  // RAW Replay v34.9: meaningful events are still exact, but high-frequency motion is sampled.
  // Replay renders at display FPS by interpolation, so storing every browser pointer event is unnecessary.
  const POINTER_SAMPLE_MS=125; // ~8 Hz raw path, visually reconstructed smoothly in Replay.
  const POINTER_MIN_DISTANCE_PX=4;
  const SCROLL_SAMPLE_MS=400;
  const SCROLL_MIN_DISTANCE_PX=18;
  const pointers=new Map();let lastMoveAt=0,lastScrollAt=0,lastScrollTop=null;
  const clamp=v=>Math.max(0,Math.min(1,v));
  function point(e){const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight),nx=clamp(e.clientX/w),ny=clamp(e.clientY/h);return{x:Math.round(e.clientX),y:Math.round(e.clientY),nx:Number(nx.toFixed(4)),ny:Number(ny.toFixed(4)),zone:ny<.22?"top":ny>.78?"bottom":nx<.33?"left":nx>.67?"right":"center"}}
  function targetMeta(t){const el=t?.closest?.("button,[role=button],input,textarea,select,.pattern-tile")||t;return{targetId:el?.id||null,targetRole:el?.getAttribute?.("role")||el?.tagName?.toLowerCase?.()||null,targetClass:String(el?.className||"").split(/\s+/).filter(Boolean).slice(0,4).join(" ")||null}}
  function emit(type,payload){C.recordEvent?.(type,payload,!!activeSession())}
  document.addEventListener("pointerdown",e=>{
    const p=point(e);pointers.set(e.pointerId,{...p,lastX:e.clientX,lastY:e.clientY,at:performance.now(),pointerType:e.pointerType||"unknown"});
    emit("screen_pointer_down",{...p,...targetMeta(e.target),pointerType:e.pointerType||"unknown",fingers:pointers.size,view:Setka.getState?.()?.view||null})
  },true);
  document.addEventListener("pointermove",e=>{
    if(!pointers.has(e.pointerId))return;
    const now=performance.now(),start=pointers.get(e.pointerId),moved=Math.hypot(e.clientX-start.lastX,e.clientY-start.lastY);
    if(now-lastMoveAt<POINTER_SAMPLE_MS||moved<POINTER_MIN_DISTANCE_PX)return;
    lastMoveAt=now;start.lastX=e.clientX;start.lastY=e.clientY;
    const p=point(e),st=Setka.getState?.();
    emit("screen_pointer_move",{...p,pointerType:e.pointerType||start.pointerType||"unknown",fingers:pointers.size,dx:Math.round(e.clientX-start.x),dy:Math.round(e.clientY-start.y),view:st?.view||null,libraryPage:st?.libraryPage||null,configKey:st?.configKey||null})
  },true);
  function endPointer(e,type){const start=pointers.get(e.pointerId),p=point(e);if(start){const dist=Math.hypot(e.clientX-start.x,e.clientY-start.y),durationMs=Math.max(0,Math.round(performance.now()-start.at));emit(type,{...p,...targetMeta(e.target),pointerType:e.pointerType||start.pointerType||"unknown",fingers:Math.max(1,pointers.size),distancePx:Math.round(dist),durationMs,view:Setka.getState?.()?.view||null});if(dist<14&&durationMs<700)emit("ui_tap",{...p,...targetMeta(e.target),pointerType:e.pointerType||start.pointerType||"unknown",view:Setka.getState?.()?.view||null})}pointers.delete(e.pointerId)}
  document.addEventListener("pointerup",e=>endPointer(e,"screen_pointer_up"),true);
  document.addEventListener("pointercancel",e=>endPointer(e,"screen_pointer_cancel"),true);
  document.addEventListener("scroll",e=>{
    const now=performance.now(),el=e.target===document?document.scrollingElement:e.target;
    if(!el||typeof el.scrollTop!=="number")return;
    const top=Math.round(el.scrollTop),delta=lastScrollTop==null?Infinity:Math.abs(top-lastScrollTop);
    if(now-lastScrollAt<SCROLL_SAMPLE_MS&&delta<SCROLL_MIN_DISTANCE_PX)return;
    lastScrollAt=now;lastScrollTop=top;
    emit("screen_scroll",{scrollTop:top,scrollHeight:Math.round(el.scrollHeight||0),clientHeight:Math.round(el.clientHeight||0),view:Setka.getState?.()?.view||null})
  },true);

  window.__SETKA_V34_DEEP_TELEMETRY__=true;
  window.__SETKA_V34_REPLAY_SAMPLE_HZ__=8;
})();