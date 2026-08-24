(() => {
  "use strict";
  const STORAGE_FAVORITES="setka-web:favorites:v1";
  const DEFAULT_CONFIG=Object.freeze({numTentacles:24,tentacleLength:100,baseRadius:10,movementSpeed:1,colorSpeed:1,circleSize:1,lineWeight:1,segmentStep:2,colorModeIndex:0});
  const BASE_ID="tentacle-orbit";
  const BASE_PREVIEW_FRAME=44;
  const PATTERNS=[{id:BASE_ID,title:"Tentacle Orbit",defaults:DEFAULT_CONFIG}];

  const $=id=>document.getElementById(id);
  const app=$("app"),libraryScreen=$("libraryScreen"),gameScreen=$("gameScreen"),allPatternsPanel=$("allPatternsPanel"),favoritesPanel=$("favoritesPanel"),libraryPagerButton=$("libraryPagerButton"),favoritesPagerButton=$("favoritesPagerButton"),libraryTitle=$("libraryTitle"),librarySwipeArea=$("librarySwipeArea"),canvas=$("patternCanvas"),ctx=canvas.getContext("2d",{alpha:false}),colorButton=$("colorButton"),colorDots=$("colorDots"),modeLabel=$("modeLabel"),favoriteButton=$("favoriteButton"),libraryButton=$("libraryButton"),prevButton=$("prevButton"),nextButton=$("nextButton"),instructionsButton=$("instructionsButton"),instructionsModal=$("instructionsModal"),closeInstructionsButton=$("closeInstructionsButton"),toast=$("toast");

  let activeLibraryPage="all";
  let runtimeConfig=cloneConfig(DEFAULT_CONFIG);
  let activeSource={type:"base",id:BASE_ID};
  let favorites=normalizeFavorites(loadJSON(STORAGE_FAVORITES,[]));
  let animationFrame=0,animationStart=performance.now(),currentFrame=0,toastTimer=0;

  const touchGesture={fingers:0,primaryId:null,x:0,y:0};
  const mouseGesture={down:false,fingers:1,x:0,y:0};

  function clamp(v,min,max){return Math.min(max,Math.max(min,v))}
  function radians(d){return d*Math.PI/180}
  function mod(n,m){return((n%m)+m)%m}
  function cloneConfig(c){c=c||DEFAULT_CONFIG;return{numTentacles:clamp(Math.round(Number(c.numTentacles)||DEFAULT_CONFIG.numTentacles),3,72),tentacleLength:clamp(Number(c.tentacleLength)||DEFAULT_CONFIG.tentacleLength,10,800),baseRadius:clamp(Number(c.baseRadius)||DEFAULT_CONFIG.baseRadius,0,100),movementSpeed:clamp(Number(c.movementSpeed)||DEFAULT_CONFIG.movementSpeed,.05,10),colorSpeed:clamp(Number(c.colorSpeed)||DEFAULT_CONFIG.colorSpeed,.05,10),circleSize:clamp(Number(c.circleSize)||DEFAULT_CONFIG.circleSize,.2,20),lineWeight:clamp(Number(c.lineWeight)||DEFAULT_CONFIG.lineWeight,.1,10),segmentStep:clamp(Math.round(Number(c.segmentStep)||DEFAULT_CONFIG.segmentStep),1,20),colorModeIndex:clamp(Math.round(Number(c.colorModeIndex)||0),0,8)}}
  function loadJSON(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch(_){return fallback}}
  function saveJSON(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(_){}}
  function normalizeFavorites(list){if(!Array.isArray(list))return[];return list.slice(0,80).map((item,index)=>({id:String(item.id||`favorite-${Date.now()}-${index}`),baseId:BASE_ID,config:cloneConfig(item.config||DEFAULT_CONFIG),previewFrame:Number.isFinite(Number(item.previewFrame))?Number(item.previewFrame):BASE_PREVIEW_FRAME,createdAt:Number(item.createdAt)||Date.now()}))}

  function setScreen(name){const inGame=name==="game";libraryScreen.classList.toggle("active",!inGame);gameScreen.classList.toggle("active",inGame);if(inGame){resizeMainCanvas();animationStart=performance.now();currentFrame=0;startAnimation();updateColorIndicator()}else{stopAnimation();renderLibrary()}}
  function setLibraryPage(page){activeLibraryPage=page==="favorites"?"favorites":"all";const fav=activeLibraryPage==="favorites";allPatternsPanel.classList.toggle("hidden-left",fav);allPatternsPanel.classList.remove("hidden-right");favoritesPanel.classList.toggle("hidden-right",!fav);favoritesPanel.classList.remove("hidden-left");libraryPagerButton.classList.toggle("active",!fav);favoritesPagerButton.classList.toggle("active",fav);libraryTitle.textContent=fav?"Сохраненные":"Паттерны"}

  function renderLibrary(){allPatternsPanel.replaceChildren();favoritesPanel.replaceChildren();PATTERNS.forEach(pattern=>allPatternsPanel.appendChild(makePatternTile(pattern.defaults,false,pattern.id,BASE_PREVIEW_FRAME)));if(!favorites.length){const empty=document.createElement("div");empty.className="empty-favorites";empty.innerHTML='<span class="big-heart">♥</span>Здесь появятся конфигурации,<br>которые ты сохранишь сердцем';favoritesPanel.appendChild(empty)}else favorites.forEach(f=>favoritesPanel.appendChild(makePatternTile(f.config,true,f.id,f.previewFrame)));setLibraryPage(activeLibraryPage)}

  function makePatternTile(config,isFavorite,id,previewFrame){const button=document.createElement("button");button.type="button";button.className="pattern-tile";button.setAttribute("aria-label",isFavorite?"Открыть сохраненную конфигурацию":"Открыть исходный паттерн");const thumb=document.createElement("canvas");thumb.width=180;thumb.height=180;thumb.className="thumb-canvas";button.appendChild(thumb);if(isFavorite){const heart=document.createElement("span");heart.className="mini-heart";heart.textContent="♥";button.appendChild(heart)}drawThumbnail(thumb,isFavorite?config:DEFAULT_CONFIG,isFavorite?previewFrame:BASE_PREVIEW_FRAME);
    let holdTimer=0,held=false;
    button.addEventListener("pointerdown",()=>{held=false;if(isFavorite)return;holdTimer=setTimeout(()=>{held=true;saveFavorite(DEFAULT_CONFIG,BASE_PREVIEW_FRAME);if(navigator.vibrate)navigator.vibrate(18)},620)});
    const cancel=()=>{if(holdTimer)clearTimeout(holdTimer);holdTimer=0};button.addEventListener("pointercancel",cancel);button.addEventListener("pointerleave",cancel);
    button.addEventListener("pointerup",event=>{cancel();if(held){event.preventDefault();return}if(isFavorite){const fav=favorites.find(x=>x.id===id);if(!fav)return;runtimeConfig=cloneConfig(fav.config);activeSource={type:"favorite",id:fav.id}}else{runtimeConfig=cloneConfig(DEFAULT_CONFIG);activeSource={type:"base",id:BASE_ID}}setScreen("game")});return button}

  function drawThumbnail(thumb,config,frame){const t=thumb.getContext("2d");renderPattern(t,thumb.width,thumb.height,cloneConfig(config),Number.isFinite(frame)?frame:BASE_PREVIEW_FRAME,true)}
  function resizeMainCanvas(){const rect=app.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.floor(rect.width*dpr));canvas.height=Math.max(1,Math.floor(rect.height*dpr));canvas.style.width=`${rect.width}px`;canvas.style.height=`${rect.height}px`;ctx.setTransform(dpr,0,0,dpr,0,0)}
  function startAnimation(){if(animationFrame)return;const tick=now=>{if(!gameScreen.classList.contains("active")){animationFrame=0;return}currentFrame=(now-animationStart)/16.6667;const rect=app.getBoundingClientRect();renderPattern(ctx,rect.width,rect.height,runtimeConfig,currentFrame,false);animationFrame=requestAnimationFrame(tick)};animationFrame=requestAnimationFrame(tick)}
  function stopAnimation(){if(animationFrame)cancelAnimationFrame(animationFrame);animationFrame=0}

  function renderPattern(target,width,height,config,frame,thumbnail){target.save();target.fillStyle="#000";target.fillRect(0,0,width,height);target.translate(width/2,height/2);
    // В геймплее НЕТ адаптивного уменьшения: геометрия 1:1 как в исходном p5-коде.
    if(thumbnail){const extent=Math.max(40,config.tentacleLength*3+config.baseRadius+(config.tentacleLength*config.circleSize/20));const s=Math.min(.95,(Math.min(width,height)/2-5)/extent);target.scale(s,s)}
    const shift=frame*config.colorSpeed*.5;
    for(let i=0;i<360;i+=360/config.numTentacles){const x0=Math.sin(radians(i))*config.baseRadius,y0=Math.cos(radians(i))*config.baseRadius;for(let q=0;q<config.tentacleLength;q+=config.segmentStep){const a=Math.cos(radians(config.tentacleLength-q+frame*config.movementSpeed))*q;const x=Math.sin(radians(i-a))*(q*3),y=Math.cos(radians(i-a))*(q*3),d=(config.tentacleLength-q)*config.circleSize/10;target.strokeStyle=getColor(config.colorModeIndex,i,q,x,y,shift,frame);target.lineWidth=config.lineWeight;target.beginPath();target.arc(x0+x,y0+y,Math.max(.075,d/2),0,Math.PI*2);target.stroke()}}
    target.restore()}
  function getColor(mode,i,q,x,y,shift,frame){switch(mode){case 0:return"hsl(0 0% 100%)";case 1:return`hsl(${mod(i+q*2+shift,360)} 100% 50%)`;case 2:return`hsl(${mod(frame+q*2,360)} 100% 50%)`;case 3:return"hsl(200 100% 50%)";case 4:return"hsl(330 100% 50%)";case 5:return`hsl(${mod(Math.atan2(y,x)*180/Math.PI+180+shift,360)} 100% 50%)`;case 6:return`hsl(${mod(i+shift,360)} 100% 50%)`;case 7:return`hsl(${mod(q*5+shift,360)} 100% 50%)`;case 8:return`hsl(${mod(x+y+shift,360)} 100% 50%)`;default:return"#fff"}}

  function buildColorDots(){colorDots.replaceChildren();const radius=42;for(let i=0;i<9;i++){const d=document.createElement("span");d.className="color-dot";const angle=-90+i*40;d.style.transform=`translate(${Math.cos(radians(angle))*radius}px,${Math.sin(radians(angle))*radius}px)`;colorDots.appendChild(d)}}
  function updateColorIndicator(){const count=runtimeConfig.colorModeIndex+1;modeLabel.textContent=`ЦВЕТ ${count} / 9`;[...colorDots.children].forEach((d,i)=>d.classList.toggle("visible",i<count))}
  function saveFavorite(config,previewFrame=currentFrame){const snapshot={id:`favorite-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,baseId:BASE_ID,config:cloneConfig(config),previewFrame:Number.isFinite(previewFrame)?previewFrame:BASE_PREVIEW_FRAME,createdAt:Date.now()};favorites.unshift(snapshot);favorites=favorites.slice(0,80);saveJSON(STORAGE_FAVORITES,favorites);showToast("♥ Конфигурация сохранена");favoriteButton.textContent="♥";setTimeout(()=>favoriteButton.textContent="♡",700);renderLibrary()}
  function showToast(message){toast.textContent=message;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),1400)}
  function openInstructions(){instructionsModal.classList.add("open")}function closeInstructions(){instructionsModal.classList.remove("open")}

  function applyOriginalGesture(x,y,dx,dy,fingers){const rect=canvas.getBoundingClientRect(),left=x<rect.width/3,right=x>rect.width*2/3,top=y<rect.height/3,bottom=y>rect.height*2/3;
    if(fingers===1){if(Math.abs(dy)>Math.abs(dx)){if(left&&dy!==0)runtimeConfig.numTentacles=clamp(runtimeConfig.numTentacles+(dy>0?-1:1),3,72);if(right)runtimeConfig.circleSize=clamp(runtimeConfig.circleSize-dy*.005,.2,20)}else{if(top)runtimeConfig.lineWeight=clamp(runtimeConfig.lineWeight+dx*.01,.1,10);if(bottom)runtimeConfig.movementSpeed=clamp(runtimeConfig.movementSpeed+dx*.001,.05,10)}}
    if(fingers===2){if(left&&!bottom&&Math.abs(dy)>Math.abs(dx))runtimeConfig.tentacleLength=clamp(runtimeConfig.tentacleLength-dy*.2,10,800);if(right&&!bottom&&Math.abs(dy)>Math.abs(dx)){if(dy<0)runtimeConfig.segmentStep=Math.max(1,runtimeConfig.segmentStep-1);if(dy>0)runtimeConfig.segmentStep=Math.min(20,runtimeConfig.segmentStep+1)}if(bottom&&Math.abs(dx)>Math.abs(dy))runtimeConfig.colorSpeed=clamp(runtimeConfig.colorSpeed+dx*.001,.05,10)}}

  function localTouch(touch){const r=canvas.getBoundingClientRect();return{x:touch.clientX-r.left,y:touch.clientY-r.top}}
  function getPrimaryTouch(touches){if(!touches.length)return null;if(touchGesture.primaryId!==null){for(const t of touches)if(t.identifier===touchGesture.primaryId)return t}return touches[0]}
  canvas.addEventListener("touchstart",event=>{event.preventDefault();const primary=getPrimaryTouch(event.touches);if(!primary)return;if(touchGesture.primaryId===null)touchGesture.primaryId=primary.identifier;const p=localTouch(primary);touchGesture.fingers=event.touches.length;touchGesture.x=p.x;touchGesture.y=p.y},{passive:false});
  canvas.addEventListener("touchmove",event=>{event.preventDefault();const primary=getPrimaryTouch(event.touches);if(!primary)return;const p=localTouch(primary),dx=p.x-touchGesture.x,dy=p.y-touchGesture.y;touchGesture.fingers=event.touches.length;applyOriginalGesture(p.x,p.y,dx,dy,touchGesture.fingers);touchGesture.x=p.x;touchGesture.y=p.y},{passive:false});
  function endTouch(event){event.preventDefault();if(!event.touches.length){touchGesture.fingers=0;touchGesture.primaryId=null}else{const primary=getPrimaryTouch(event.touches);if(primary){const p=localTouch(primary);touchGesture.fingers=event.touches.length;touchGesture.x=p.x;touchGesture.y=p.y}}}
  canvas.addEventListener("touchend",endTouch,{passive:false});canvas.addEventListener("touchcancel",endTouch,{passive:false});

  // Desktop fallback. Shift = two fingers.
  canvas.addEventListener("mousedown",event=>{event.preventDefault();const r=canvas.getBoundingClientRect();mouseGesture.down=true;mouseGesture.fingers=event.shiftKey?2:1;mouseGesture.x=event.clientX-r.left;mouseGesture.y=event.clientY-r.top});
  window.addEventListener("mousemove",event=>{if(!mouseGesture.down)return;const r=canvas.getBoundingClientRect(),x=event.clientX-r.left,y=event.clientY-r.top,dx=x-mouseGesture.x,dy=y-mouseGesture.y;mouseGesture.fingers=event.shiftKey?2:1;applyOriginalGesture(x,y,dx,dy,mouseGesture.fingers);mouseGesture.x=x;mouseGesture.y=y});
  window.addEventListener("mouseup",()=>{mouseGesture.down=false});

  colorButton.addEventListener("click",()=>{runtimeConfig.colorModeIndex=(runtimeConfig.colorModeIndex+1)%9;updateColorIndicator()});
  favoriteButton.addEventListener("click",()=>saveFavorite(runtimeConfig,currentFrame));
  libraryButton.addEventListener("click",()=>{activeLibraryPage="all";setScreen("library")});
  instructionsButton.addEventListener("click",openInstructions);closeInstructionsButton.addEventListener("click",closeInstructions);instructionsModal.addEventListener("click",e=>{if(e.target===instructionsModal)closeInstructions()});
  prevButton.addEventListener("click",()=>showToast("Это первый паттерн"));nextButton.addEventListener("click",()=>showToast("Добавим следующий паттерн сюда"));
  libraryPagerButton.addEventListener("click",()=>setLibraryPage("all"));favoritesPagerButton.addEventListener("click",()=>setLibraryPage("favorites"));

  let librarySwipeStart=null;librarySwipeArea.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;librarySwipeStart={x:e.clientX,y:e.clientY}});librarySwipeArea.addEventListener("pointerup",e=>{if(!librarySwipeStart)return;const dx=e.clientX-librarySwipeStart.x,dy=e.clientY-librarySwipeStart.y;librarySwipeStart=null;if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.2)return;setLibraryPage(dx<0?"favorites":"all")});librarySwipeArea.addEventListener("pointercancel",()=>librarySwipeStart=null);
  window.addEventListener("resize",()=>{if(gameScreen.classList.contains("active"))resizeMainCanvas();renderLibrary()});document.addEventListener("visibilitychange",()=>{if(document.hidden)stopAnimation();else if(gameScreen.classList.contains("active"))startAnimation()});
  buildColorDots();updateColorIndicator();renderLibrary();
})();
