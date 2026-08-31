(() => {
  "use strict";

  const API_URL = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-research-api";
  const API_KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const DEVICE_KEY = "setka-research:device-id:v1";
  const ACCESS_KEY = "setka-research:access-code:v1";
  const FAVORITES_KEY = "setka-web:favorites:v1";
  const APP_VERSION = "setka-web-research-v2";
  const BASE_ID = "tentacle-orbit";
  const BASE_PREVIEW_FRAME = 44;
  const DEFAULT_CONFIG = Object.freeze({ numTentacles:24, tentacleLength:100, baseRadius:10, movementSpeed:1, colorSpeed:1, circleSize:1, lineWeight:1, segmentStep:2, colorModeIndex:0 });

  const app = document.getElementById("app");
  const canvas = document.getElementById("patternCanvas");
  const allPatternsPanel = document.getElementById("allPatternsPanel");
  const favoritesPanel = document.getElementById("favoritesPanel");
  const librarySwipeArea = document.getElementById("librarySwipeArea");
  const colorButton = document.getElementById("colorButton");
  const favoriteButton = document.getElementById("favoriteButton");
  const libraryButton = document.getElementById("libraryButton");
  const libraryPagerButton = document.getElementById("libraryPagerButton");
  const favoritesPagerButton = document.getElementById("favoritesPagerButton");
  const instructionsButton = document.getElementById("instructionsButton");
  const closeInstructionsButton = document.getElementById("closeInstructionsButton");
  const prevButton = document.getElementById("prevButton");
  const nextButton = document.getElementById("nextButton");
  if (!app || !canvas) return;

  const clamp = (v,min,max) => Math.min(max,Math.max(min,v));
  const cloneConfig = c => ({
    numTentacles: clamp(Math.round(Number(c?.numTentacles) || 24),3,72),
    tentacleLength: clamp(Number(c?.tentacleLength) || 100,10,800),
    baseRadius: clamp(Number(c?.baseRadius) || 10,0,100),
    movementSpeed: clamp(Number(c?.movementSpeed) || 1,.05,10),
    colorSpeed: clamp(Number(c?.colorSpeed) || 1,.05,10),
    circleSize: clamp(Number(c?.circleSize) || 1,.2,20),
    lineWeight: clamp(Number(c?.lineWeight) || 1,.1,10),
    segmentStep: clamp(Math.round(Number(c?.segmentStep) || 2),1,20),
    colorModeIndex: clamp(Math.round(Number(c?.colorModeIndex) || 0),0,8)
  });
  const loadFavorites = () => { try { const v=JSON.parse(localStorage.getItem(FAVORITES_KEY)||"[]"); return Array.isArray(v)?v:[]; } catch(_) { return []; } };

  const mirror = {
    view: "library",
    libraryPage: "all",
    patternId: BASE_ID,
    sourceType: "base",
    sourceId: BASE_ID,
    config: cloneConfig(DEFAULT_CONFIG),
    patternOpenedPerf: performance.now(),
    overlay: null
  };

  function mirrorFrame() {
    return mirror.view === "game" ? Math.max(0,(performance.now()-mirror.patternOpenedPerf)/16.6667) : 0;
  }
  function mirrorState(extra={}) {
    return {
      view: mirror.view,
      libraryPage: mirror.libraryPage,
      patternId: mirror.patternId,
      sourceType: mirror.sourceType,
      sourceId: mirror.sourceId,
      config: cloneConfig(mirror.config),
      frame: mirrorFrame(),
      favoriteCount: loadFavorites().length,
      overlay: mirror.overlay,
      ...extra
    };
  }

  app.style.visibility = "hidden";
  const style = document.createElement("style");
  style.textContent = `
    #setkaAccessGate{position:fixed;inset:0;z-index:99999;background:#000;color:#fff;display:grid;place-items:center;padding:28px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif}
    #setkaAccessGate.hidden{display:none}.setka-gate-box{width:min(100%,360px);text-align:center}.setka-gate-mark{width:56px;height:56px;border:1px solid rgba(255,255,255,.78);border-radius:50%;margin:0 auto 28px;display:grid;place-items:center;font-size:12px;letter-spacing:.12em}.setka-gate-title{font-size:17px;font-weight:500;letter-spacing:.04em;margin-bottom:8px}.setka-gate-copy{font-size:12px;line-height:1.5;color:rgba(255,255,255,.42);margin-bottom:24px}.setka-gate-input{width:100%;height:52px;border-radius:26px;border:1px solid rgba(255,255,255,.42);background:#050505;color:#fff;text-align:center;font-size:16px;letter-spacing:.12em;text-transform:uppercase;outline:none;padding:0 18px}.setka-gate-input:focus{border-color:#fff}.setka-gate-button{width:100%;height:50px;margin-top:12px;border-radius:25px;border:1px solid #fff;background:#fff;color:#000;font-size:14px;font-weight:600;cursor:pointer}.setka-gate-button:disabled{opacity:.45}.setka-gate-error{min-height:38px;padding-top:12px;font-size:12px;line-height:1.45;color:rgba(255,255,255,.62)}.setka-gate-status{font-size:13px;color:rgba(255,255,255,.55);letter-spacing:.04em}
    .pattern-tile{-webkit-touch-callout:none!important}
  `;
  document.head.appendChild(style);

  const gate = document.createElement("div");
  gate.id = "setkaAccessGate";
  gate.innerHTML = `<div class="setka-gate-box"><div class="setka-gate-mark">SETKA</div><div class="setka-gate-title">Закрытый прототип</div><div class="setka-gate-copy">Введите персональный ID доступа. При первом входе он закрепится за этим браузером на этом устройстве.</div><form id="setkaGateForm"><input id="setkaGateInput" class="setka-gate-input" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" placeholder="STK-XXXX-XXXX"/><button id="setkaGateButton" class="setka-gate-button" type="submit">Войти</button></form><div id="setkaGateError" class="setka-gate-error"></div><div id="setkaGateStatus" class="setka-gate-status"></div></div>`;
  document.body.appendChild(gate);

  const form=document.getElementById("setkaGateForm"), input=document.getElementById("setkaGateInput"), button=document.getElementById("setkaGateButton"), errorBox=document.getElementById("setkaGateError"), statusBox=document.getElementById("setkaGateStatus");

  let deviceId=localStorage.getItem(DEVICE_KEY);
  if(!deviceId){deviceId=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;localStorage.setItem(DEVICE_KEY,deviceId)}

  let ready=false, participant=null, sessionId=null, sessionToken=null, sessionStartPerf=0, flushing=false, flushTimer=0, lastStateAt=-Infinity, lastSnapshotAt=-Infinity;
  let eventQueue=[], snapshotQueue=[];

  const headers=()=>({"Content-Type":"application/json","apikey":API_KEY});
  async function api(body,keepalive=false){const response=await fetch(API_URL,{method:"POST",headers:headers(),body:JSON.stringify(body),keepalive});const data=await response.json().catch(()=>({}));if(!response.ok){const e=new Error(data.error||`http_${response.status}`);e.code=data.error||"request_failed";throw e}return data}
  const nowMs=()=>ready?Math.max(0,Math.round(performance.now()-sessionStartPerf)):0;
  function scheduleFlush(delay=1200){clearTimeout(flushTimer);flushTimer=setTimeout(()=>flush(false),delay)}
  async function flush(keepalive=false){if(!ready||!sessionId||!sessionToken||flushing||(!eventQueue.length&&!snapshotQueue.length))return;flushing=true;const events=eventQueue.splice(0,500),snapshots=snapshotQueue.splice(0,100);try{await api({action:"batch",sessionId,sessionToken,events,snapshots},keepalive)}catch(_){eventQueue.unshift(...events);snapshotQueue.unshift(...snapshots)}finally{flushing=false;if(eventQueue.length||snapshotQueue.length)scheduleFlush(350)}}
  function record(type,payload={}){if(!ready)return;eventQueue.push({tMs:nowMs(),type,payload});if(eventQueue.length>=40)flush(false);else scheduleFlush()}
  function recordState(state,force=false){if(!ready||!state)return;const tMs=nowMs();if(!force&&tMs-lastStateAt<90)return;lastStateAt=tMs;eventQueue.push({tMs,type:"app_state",payload:state});if(force||tMs-lastSnapshotAt>=10000){snapshotQueue.push({tMs,state});lastSnapshotAt=tMs}if(eventQueue.length>=40)flush(false);else scheduleFlush()}

  window.SetkaResearch={get ready(){return ready},get participant(){return participant},get sessionId(){return sessionId},record,recordState,flush:()=>flush(false),sessionTimeMs:nowMs,mirrorState};

  async function claim(code,automatic=false){errorBox.textContent="";statusBox.textContent=automatic?"Проверяем доступ…":"Подключаем сессию…";button.disabled=true;input.disabled=true;try{const data=await api({action:"claim",code,deviceId,appVersion:APP_VERSION,userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1},meta:{language:navigator.language||"",platform:navigator.platform||""}});localStorage.setItem(ACCESS_KEY,String(code).trim().toUpperCase());participant=data.participant;sessionId=data.sessionId;sessionToken=data.sessionToken;sessionStartPerf=performance.now();ready=true;lastStateAt=-Infinity;lastSnapshotAt=-Infinity;gate.classList.add("hidden");app.style.visibility="visible";record("session_start",{participantId:participant?.id||null,appVersion:APP_VERSION});recordState(mirrorState(),true);window.dispatchEvent(new CustomEvent("setka-research-ready",{detail:{participant,sessionId}}))}catch(error){ready=false;if(automatic)localStorage.removeItem(ACCESS_KEY);form.style.display="block";statusBox.textContent="";if(error.code==="device_mismatch")errorBox.textContent="Этот ID уже закреплён за другим браузером или устройством. Для сброса нужен владелец теста.";else if(error.code==="invalid_code")errorBox.textContent="ID не найден или доступ отключён.";else errorBox.textContent="Не удалось подключиться. Попробуйте ещё раз."}finally{button.disabled=false;input.disabled=false}}
  form.addEventListener("submit",e=>{e.preventDefault();const code=input.value.trim().toUpperCase();if(code)claim(code,false)});
  const storedCode=localStorage.getItem(ACCESS_KEY);if(storedCode){form.style.display="none";claim(storedCode,true)}else setTimeout(()=>input.focus(),80);

  // Safari/iOS: не даём системному long-press отменять наш hold на превью.
  document.addEventListener("contextmenu",e=>{if(e.target?.closest?.(".pattern-tile"))e.preventDefault()},true);
  document.addEventListener("pointerleave",e=>{if(e.target?.closest?.(".pattern-tile"))e.stopImmediatePropagation()},true);
  document.addEventListener("pointerdown",e=>{const tile=e.target?.closest?.(".pattern-tile");if(tile)tile.setPointerCapture?.(e.pointerId)},true);

  // Независимое зеркало состояния: записываем фактическую логику паттерна, не видео.
  const touch={fingers:0,primaryId:null,x:0,y:0};
  function localTouch(t){const r=canvas.getBoundingClientRect();return{x:t.clientX-r.left,y:t.clientY-r.top}}
  function primaryTouch(touches){if(!touches.length)return null;if(touch.primaryId!==null){for(const t of touches)if(t.identifier===touch.primaryId)return t}return touches[0]}
  function norm(x,y){const r=canvas.getBoundingClientRect();return{x:r.width?x/r.width:0,y:r.height?y/r.height:0}}
  function applyGesture(x,y,dx,dy,fingers){const r=canvas.getBoundingClientRect(),left=x<r.width/3,right=x>r.width*2/3,top=y<r.height/3,bottom=y>r.height*2/3,c=mirror.config;if(fingers===1){if(Math.abs(dy)>Math.abs(dx)){if(left&&dy!==0)c.numTentacles=clamp(c.numTentacles+(dy>0?-1:1),3,72);if(right)c.circleSize=clamp(c.circleSize-dy*.005,.2,20)}else{if(top)c.lineWeight=clamp(c.lineWeight+dx*.01,.1,10);if(bottom)c.movementSpeed=clamp(c.movementSpeed+dx*.001,.05,10)}}if(fingers===2){if(left&&!bottom&&Math.abs(dy)>Math.abs(dx))c.tentacleLength=clamp(c.tentacleLength-dy*.2,10,800);if(right&&!bottom&&Math.abs(dy)>Math.abs(dx)){if(dy<0)c.segmentStep=Math.max(1,c.segmentStep-1);if(dy>0)c.segmentStep=Math.min(20,c.segmentStep+1)}if(bottom&&Math.abs(dx)>Math.abs(dy))c.colorSpeed=clamp(c.colorSpeed+dx*.001,.05,10)}}

  canvas.addEventListener("touchstart",e=>{if(!ready)return;const idle=touch.fingers===0,p=primaryTouch(e.touches);if(!p)return;if(touch.primaryId===null)touch.primaryId=p.identifier;const q=localTouch(p);touch.fingers=e.touches.length;touch.x=q.x;touch.y=q.y;const n=norm(q.x,q.y);record(idle?"gesture_start":"gesture_fingers",{fingers:touch.fingers,x:n.x,y:n.y,config:cloneConfig(mirror.config)});recordState(mirrorState({gesture:{active:true,fingers:touch.fingers,x:n.x,y:n.y}}),true)}, {passive:true,capture:true});
  canvas.addEventListener("touchmove",e=>{if(!ready)return;const p=primaryTouch(e.touches);if(!p)return;const q=localTouch(p),dx=q.x-touch.x,dy=q.y-touch.y;touch.fingers=e.touches.length;applyGesture(q.x,q.y,dx,dy,touch.fingers);touch.x=q.x;touch.y=q.y;const n=norm(q.x,q.y);recordState(mirrorState({gesture:{active:true,fingers:touch.fingers,x:n.x,y:n.y,dx,dy}}),false)}, {passive:true,capture:true});
  function touchEnd(e){if(!ready)return;if(!e.touches.length){record("gesture_end",{fingers:touch.fingers,config:cloneConfig(mirror.config)});touch.fingers=0;touch.primaryId=null;recordState(mirrorState({gesture:{active:false}}),true)}else{const p=primaryTouch(e.touches);if(p){const q=localTouch(p);touch.fingers=e.touches.length;touch.x=q.x;touch.y=q.y;const n=norm(q.x,q.y);record("gesture_fingers",{fingers:touch.fingers,x:n.x,y:n.y})}}}
  canvas.addEventListener("touchend",touchEnd,{passive:true,capture:true});canvas.addEventListener("touchcancel",touchEnd,{passive:true,capture:true});

  let mouseDown=false,mouseX=0,mouseY=0;
  canvas.addEventListener("mousedown",e=>{if(!ready)return;const r=canvas.getBoundingClientRect();mouseDown=true;mouseX=e.clientX-r.left;mouseY=e.clientY-r.top;const n=norm(mouseX,mouseY);record("gesture_start",{fingers:e.shiftKey?2:1,x:n.x,y:n.y,desktop:true,config:cloneConfig(mirror.config)});recordState(mirrorState({gesture:{active:true,fingers:e.shiftKey?2:1,x:n.x,y:n.y}}),true)},true);
  window.addEventListener("mousemove",e=>{if(!ready||!mouseDown)return;const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,dx=x-mouseX,dy=y-mouseY,f=e.shiftKey?2:1;applyGesture(x,y,dx,dy,f);mouseX=x;mouseY=y;const n=norm(x,y);recordState(mirrorState({gesture:{active:true,fingers:f,x:n.x,y:n.y,dx,dy}}),false)},true);
  window.addEventListener("mouseup",e=>{if(!ready||!mouseDown)return;mouseDown=false;record("gesture_end",{fingers:e.shiftKey?2:1,desktop:true,config:cloneConfig(mirror.config)});recordState(mirrorState({gesture:{active:false}}),true)},true);

  colorButton?.addEventListener("click",()=>{if(!ready)return;const from=mirror.config.colorModeIndex;mirror.config.colorModeIndex=(from+1)%9;record("color_change",{from,to:mirror.config.colorModeIndex});recordState(mirrorState(),true)},true);
  libraryButton?.addEventListener("click",()=>{if(!ready)return;mirror.view="library";mirror.libraryPage="all";mirror.overlay=null;record("view_change",{view:"library"});recordState(mirrorState(),true)},true);
  libraryPagerButton?.addEventListener("click",()=>{if(!ready)return;mirror.libraryPage="all";record("library_page",{page:"all"});recordState(mirrorState(),true)},true);
  favoritesPagerButton?.addEventListener("click",()=>{if(!ready)return;mirror.libraryPage="favorites";record("library_page",{page:"favorites"});recordState(mirrorState(),true)},true);
  instructionsButton?.addEventListener("click",()=>{if(!ready)return;mirror.overlay="instructions";record("instructions_open",{});recordState(mirrorState(),true)},true);
  closeInstructionsButton?.addEventListener("click",()=>{if(!ready)return;mirror.overlay=null;record("instructions_close",{});recordState(mirrorState(),true)},true);
  prevButton?.addEventListener("click",()=>ready&&record("pattern_prev",{patternId:BASE_ID}),true);nextButton?.addEventListener("click",()=>ready&&record("pattern_next",{patternId:BASE_ID}),true);

  let swipeStart=null;
  librarySwipeArea?.addEventListener("pointerdown",e=>{if(e.target?.closest?.("button"))return;swipeStart={x:e.clientX,y:e.clientY}},true);
  librarySwipeArea?.addEventListener("pointerup",e=>{if(!ready||!swipeStart)return;const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;swipeStart=null;if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.2)return;mirror.libraryPage=dx<0?"favorites":"all";record("library_page",{page:mirror.libraryPage,via:"swipe"});recordState(mirrorState(),true)},true);

  let tileHold=null;
  document.addEventListener("pointerdown",e=>{const tile=e.target?.closest?.(".pattern-tile");if(!tile||!ready)return;const isFav=Boolean(tile.closest("#favoritesPanel"));tileHold={tile,isFav,startX:e.clientX,startY:e.clientY,held:false,timer:setTimeout(()=>{if(!tileHold)return;tileHold.held=true;setTimeout(()=>{const count=loadFavorites().length;record(isFav?"favorite_remove":"favorite_save",{origin:"tile_hold",favoriteCount:count});recordState(mirrorState(),true)},30)},680)}},true);
  document.addEventListener("pointermove",e=>{if(!tileHold||tileHold.held)return;if(Math.hypot(e.clientX-tileHold.startX,e.clientY-tileHold.startY)>18){clearTimeout(tileHold.timer);tileHold=null}},true);
  document.addEventListener("pointercancel",()=>{if(tileHold){clearTimeout(tileHold.timer);tileHold=null}},true);
  document.addEventListener("pointerup",e=>{const tile=e.target?.closest?.(".pattern-tile");if(!tileHold||!tile||tile!==tileHold.tile)return;clearTimeout(tileHold.timer);const held=tileHold.held,isFav=tileHold.isFav;tileHold=null;if(held)return;if(isFav){const tiles=[...favoritesPanel.querySelectorAll(".pattern-tile")],idx=tiles.indexOf(tile),favorites=loadFavorites(),fav=favorites[idx];if(fav){mirror.config=cloneConfig(fav.config||DEFAULT_CONFIG);mirror.sourceType="favorite";mirror.sourceId=String(fav.id||`favorite-${idx}`)}}else{mirror.config=cloneConfig(DEFAULT_CONFIG);mirror.sourceType="base";mirror.sourceId=BASE_ID}mirror.view="game";mirror.overlay=null;mirror.patternOpenedPerf=performance.now();record("pattern_open",{patternId:BASE_ID,sourceType:mirror.sourceType,sourceId:mirror.sourceId});recordState(mirrorState(),true)},true);

  favoriteButton?.addEventListener("click",()=>{if(!ready)return;const before=loadFavorites(),beforeIds=new Set(before.map(x=>String(x.id)));setTimeout(()=>{const after=loadFavorites();if(after.length<before.length){record("favorite_remove",{origin:"game"});mirror.sourceType="working";mirror.sourceId=BASE_ID}else if(after.length>before.length){const fresh=after.find(x=>!beforeIds.has(String(x.id)))||after[0];if(fresh){mirror.sourceType="favorite";mirror.sourceId=String(fresh.id);mirror.config=cloneConfig(fresh.config||mirror.config)}record("favorite_save",{origin:"game"})}recordState(mirrorState(),true)},20)},true);

  window.addEventListener("resize",()=>{if(!ready)return;record("viewport_change",{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1});recordState(mirrorState(),true)});
  document.addEventListener("visibilitychange",()=>{if(!ready)return;record(document.hidden?"app_hidden":"app_visible",{});recordState(mirrorState(),true);if(document.hidden)flush(true)});
  window.addEventListener("pagehide",()=>{if(!ready)return;record("session_end",{});recordState(mirrorState(),true);flush(true);api({action:"end",sessionId,sessionToken},true).catch(()=>{})});
  setInterval(()=>{if(ready){recordState(mirrorState(),true);flush(false)}},10000);
})();