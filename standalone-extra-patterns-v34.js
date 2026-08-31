(() => {
  "use strict";

  const Setka = window.SetkaApp;
  const app = document.getElementById("app");
  const libraryScreen = document.getElementById("libraryScreen");
  const gameScreen = document.getElementById("gameScreen");
  const allPatternsPanel = document.getElementById("allPatternsPanel");
  const communityPanel = document.getElementById("communityPanel");
  const favoritesPanel = document.getElementById("favoritesPanel");
  const originalCanvas = document.getElementById("patternCanvas");
  const favoriteButton = document.getElementById("favoriteButton");
  const libraryButton = document.getElementById("libraryButton");
  const prevButton = document.getElementById("prevButton");
  const nextButton = document.getElementById("nextButton");
  const colorButton = document.getElementById("colorButton");
  const colorDots = document.getElementById("colorDots");
  const instructionsButton = document.getElementById("instructionsButton");
  const instructionsModal = document.getElementById("instructionsModal");
  const modeLabel = document.getElementById("modeLabel");
  const toast = document.getElementById("toast");
  if (!Setka || !app || !libraryScreen || !gameScreen || !allPatternsPanel || !originalCanvas) return;

  const FISH_ID = "rgb-glitch-rings";
  const BREATH_ID = "breathing-fractal";
  const GROWTH_ID = "breathing-fractal-growth";
  const EDGE = 0.20, TH = 15, FIRST_LEVEL_FACTOR = 2.0;

  const FISH_DEFAULT = Object.freeze({patternId:FISH_ID,numLayers:40,baseRadius:10,ringSpacing:9,waveSpeed:0.08,waveAmplitude:5,glitchEnabled:true,glitchOffset:0.5,ringAlpha:180,strokeW:1,colorModeIndex:0});
  const BREATH_DEFAULT = Object.freeze({patternId:BREATH_ID,baseLen:70,pulseSpd:0.02,pulseAmp:0.3,strokeW:1.5,branches:8,layers:4,colorModeIndex:0,hueRate:0.004});
  const GROWTH_DEFAULT = Object.freeze({patternId:GROWTH_ID,baseLen:70,pulseSpeed:0.02,strokeW:1.5,branches:8,maxDepth:4,colorModeIndex:0,hueRate:0.004,zoom:1,levelSpeedRatio:1,firstLevelFactor:FIRST_LEVEL_FACTOR});

  const DEF = {
    [FISH_ID]: {id:FISH_ID,title:"Носовая волна",version:35,defaults:FISH_DEFAULT,store:"setka-web:favorites:fish-wave:v35"},
    [BREATH_ID]: {id:BREATH_ID,title:"Breathing Fractal",version:1,defaults:BREATH_DEFAULT,store:"setka-web:favorites:breathing-fractal:v1"},
    [GROWTH_ID]: {id:GROWTH_ID,title:"Breathing Fractal · Growth",version:1,defaults:GROWTH_DEFAULT,store:"setka-web:favorites:breathing-fractal-growth:v1"}
  };
  const CUSTOM_IDS = Object.keys(DEF);

  const original = {
    getState:Setka.getState?.bind(Setka), getConfig:Setka.getConfig?.bind(Setka), getPatterns:Setka.getPatterns?.bind(Setka),
    getPatternDefaults:Setka.getPatternDefaults?.bind(Setka), getPatternTitle:Setka.getPatternTitle?.bind(Setka),
    cloneConfig:Setka.cloneConfig?.bind(Setka), configKey:Setka.configKey?.bind(Setka), openConfig:Setka.openConfig?.bind(Setka),
    renderPreview:Setka.renderPreview?.bind(Setka), getFavorites:Setka.getFavorites?.bind(Setka), refreshFavorites:Setka.refreshFavorites?.bind(Setka),
    renderLibrary:Setka.renderLibrary?.bind(Setka), setCommunity:Setka.setCommunity?.bind(Setka), setRecommendations:Setka.setRecommendations?.bind(Setka),
    updateFavoriteMeta:Setka.updateFavoriteMeta?.bind(Setka)
  };

  const overlay = document.createElement("canvas");
  overlay.id = "extraPatternCanvasV34";
  overlay.setAttribute("aria-label", "SETKA pattern");
  originalCanvas.insertAdjacentElement("afterend", overlay);
  const ctx = overlay.getContext("2d", {alpha:false});

  const style = document.createElement("style");
  style.textContent = `#extraPatternCanvasV34{position:absolute;inset:0;width:100%;height:100%;display:none;background:#000;touch-action:none;z-index:0}.game-ui{z-index:20}.pattern-tile[data-extra-pattern="1"]{position:relative}`;
  document.head.appendChild(style);

  let activeId = null, config = null, source = null, frame = 0, startedAt = performance.now(), raf = 0, toastTimer = 0, lastTouchAt = 0;
  let tapTimes = [];
  const favorites = new Map(), community = new Map(), recommended = new Set();
  const touch = {start1:null,start2:null,startDist:0,prev1:null,prev2:null,moved:false,fingers:0};
  const mouse = {down:false,start:null,prev:null,moved:false,fingers:1};

  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const round5=v=>Math.round(Number(v)*100000)/100000;
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const isCustom=(c,h=null)=>CUSTOM_IDS.includes(h||c?.patternId||c?.baseId);
  const loadJSON=(k,d)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):d}catch(_){return d}};
  const saveJSON=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};

  function cloneConfig(c={}, hint=null){
    const id=hint||c?.patternId||c?.baseId;
    if(id===FISH_ID){const d=FISH_DEFAULT;return{patternId:id,numLayers:clamp(Number(c.numLayers??d.numLayers),5,100),baseRadius:clamp(Number(c.baseRadius??d.baseRadius),1,100),ringSpacing:clamp(Number(c.ringSpacing??d.ringSpacing),1,80),waveSpeed:clamp(Number(c.waveSpeed??d.waveSpeed),.001,.2),waveAmplitude:clamp(Number(c.waveAmplitude??d.waveAmplitude),0,200),glitchEnabled:c.glitchEnabled!==false,glitchOffset:clamp(Number(c.glitchOffset??d.glitchOffset),0,20),ringAlpha:clamp(Number(c.ringAlpha??d.ringAlpha),0,255),strokeW:clamp(Number(c.strokeW??d.strokeW),.3,8),colorModeIndex:clamp(Math.round(Number(c.colorModeIndex??d.colorModeIndex)),0,2)}}
    if(id===BREATH_ID){const d=BREATH_DEFAULT;return{patternId:id,baseLen:clamp(Number(c.baseLen??d.baseLen),10,180),pulseSpd:clamp(Number(c.pulseSpd??d.pulseSpd),.001,.3),pulseAmp:clamp(Number(c.pulseAmp??d.pulseAmp),.05,2),strokeW:clamp(Number(c.strokeW??d.strokeW),.1,8),branches:clamp(Math.round(Number(c.branches??d.branches)),2,60),layers:clamp(Math.round(Number(c.layers??d.layers)),1,10),colorModeIndex:clamp(Math.round(Number(c.colorModeIndex??c.clrMode??d.colorModeIndex)),0,2),hueRate:clamp(Number(c.hueRate??d.hueRate),.0001,.05)}}
    if(id===GROWTH_ID){const d=GROWTH_DEFAULT;return{patternId:id,baseLen:clamp(Number(c.baseLen??d.baseLen),10,180),pulseSpeed:clamp(Number(c.pulseSpeed??c.pulseSpd??d.pulseSpeed),.001,.1),strokeW:clamp(Number(c.strokeW??d.strokeW),.1,8),branches:clamp(Math.round(Number(c.branches??d.branches)),2,60),maxDepth:clamp(Math.round(Number(c.maxDepth??c.layers??d.maxDepth)),1,10),colorModeIndex:clamp(Math.round(Number(c.colorModeIndex??c.clrMode??d.colorModeIndex)),0,2),hueRate:clamp(Number(c.hueRate??d.hueRate),.0001,.05),zoom:clamp(Number(c.zoom??d.zoom),.3,3),levelSpeedRatio:clamp(Number(c.levelSpeedRatio??d.levelSpeedRatio),.2,3),firstLevelFactor:FIRST_LEVEL_FACTOR}}
    return original.cloneConfig?.(c,hint)||clone(c);
  }

  function keyOf(c,hint=null){
    const x=cloneConfig(c,hint),id=x?.patternId;
    if(id===FISH_ID)return[id,round5(x.numLayers),round5(x.baseRadius),round5(x.ringSpacing),round5(x.waveSpeed),round5(x.waveAmplitude),x.glitchEnabled?1:0,round5(x.glitchOffset),round5(x.ringAlpha),round5(x.strokeW),x.colorModeIndex].join("|");
    if(id===BREATH_ID)return[id,round5(x.baseLen),round5(x.pulseSpd),round5(x.pulseAmp),round5(x.strokeW),x.branches,x.layers,x.colorModeIndex,round5(x.hueRate)].join("|");
    if(id===GROWTH_ID)return[id,round5(x.baseLen),round5(x.pulseSpeed),round5(x.strokeW),x.branches,x.maxDepth,x.colorModeIndex,round5(x.hueRate),round5(x.zoom),round5(x.levelSpeedRatio)].join("|");
    return original.configKey?.(c,hint)||JSON.stringify(c);
  }

  function loadFavorites(id){
    const def=DEF[id], list=loadJSON(def.store,[]); if(!Array.isArray(list))return[];
    return list.slice(0,120).map((f,i)=>({id:String(f?.id||`${id}-favorite-${Date.now()}-${i}`),baseId:id,patternId:id,config:cloneConfig(f?.config||def.defaults,id),previewFrame:Number.isFinite(Number(f?.previewFrame))?Number(f.previewFrame):44,createdAt:Number(f?.createdAt)||Date.now(),communityId:f?.communityId?String(f.communityId):null,parentCommunityId:f?.parentCommunityId?String(f.parentCommunityId):null,patternVersion:def.version,...(f?.remoteId?{remoteId:f.remoteId}:{})}));
  }
  CUSTOM_IDS.forEach(id=>{favorites.set(id,loadFavorites(id));community.set(id,[])});
  const persist=id=>saveJSON(DEF[id].store,favorites.get(id)||[]);
  const allCustomFavorites=()=>CUSTOM_IDS.flatMap(id=>(favorites.get(id)||[]).map(clone));
  function matching(c=config,id=activeId){const k=keyOf(c,id);return(favorites.get(id)||[]).find(f=>keyOf(f.config,id)===k)||null}

  function state(extra={}){
    const m=activeId?matching():null;
    return{view:gameScreen.classList.contains("active")?"game":"library",libraryPage:original.getState?.()?.libraryPage||"all",patternId:activeId,patternVersion:activeId?DEF[activeId].version:1,sourceType:source?.type||"base",sourceId:source?.id||activeId,communityId:source?.communityId||null,config:activeId?cloneConfig(config,activeId):null,configKey:activeId?keyOf(config,activeId):null,frame,favoriteId:m?.id||null,favoriteCommunityId:m?.communityId||null,favoriteCount:(original.getFavorites?.()?.length||0)+allCustomFavorites().length,...extra};
  }
  function emit(name,detail={}){window.dispatchEvent(new CustomEvent(`setka:${name}`,{detail:{...detail,state:state()}}))}
  function showToast(msg){if(!toast)return;toast.textContent=msg;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),1400)}

  function resize(){const r=app.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);overlay.width=Math.max(1,Math.floor(r.width*dpr));overlay.height=Math.max(1,Math.floor(r.height*dpr));overlay.style.width=`${r.width}px`;overlay.style.height=`${r.height}px`;ctx.setTransform(dpr,0,0,dpr,0,0)}
  function circle(t,x,d){if(!(d>0))return;t.beginPath();t.arc(x,0,d/2,0,Math.PI*2);t.stroke()}
  function renderFish(t,w,h,c,f,thumb=false){c=cloneConfig(c,FISH_ID);t.save();t.fillStyle="#000";t.fillRect(0,0,w,h);t.translate(w/2,h/2);if(thumb){const md=c.baseRadius+Math.max(0,c.numLayers-1)*c.ringSpacing,ext=md/2+c.waveAmplitude+c.glitchOffset*2+4,s=Math.min(1,(Math.min(w,h)/2-5)/Math.max(1,ext));t.scale(s,s)}const tt=f*c.waveSpeed,a=c.ringAlpha/255;t.lineWidth=c.strokeW;for(let i=0;i<c.numLayers;i++){const side=Math.sin(tt-i*.2)*c.waveAmplitude,d=c.baseRadius+i*c.ringSpacing;if(c.glitchEnabled){t.strokeStyle=`rgba(255,0,0,${a})`;circle(t,side,d);t.strokeStyle=`rgba(0,255,0,${a})`;circle(t,c.glitchOffset+side,d);t.strokeStyle=`rgba(0,100,255,${a})`;circle(t,c.glitchOffset*2+side,d)}t.strokeStyle=c.colorModeIndex===1?`rgba(255,255,255,${a})`:c.colorModeIndex===2?`hsla(${((tt*100+i*5)%360+360)%360},100%,50%,${a})`:`rgba(90,200,255,${a})`;circle(t,side,d)}t.restore()}
  function branchBreath(t,len,d,c,f){if(!d)return;t.strokeStyle=c.colorModeIndex===1?"rgb(170,190,255)":c.colorModeIndex===2?`hsl(${((f*c.hueRate*100+len*.4)%360+360)%360} 80% 55%)`:"#fff";t.lineWidth=c.strokeW;t.beginPath();t.moveTo(0,0);t.lineTo(len,0);t.stroke();t.save();t.translate(len,0);t.save();t.rotate(Math.PI/6);branchBreath(t,len*.6,d-1,c,f);t.restore();t.save();t.rotate(-Math.PI/6);branchBreath(t,len*.6,d-1,c,f);t.restore();t.restore()}
  function renderBreath(t,w,h,c,f,thumb=false){c=cloneConfig(c,BREATH_ID);t.save();t.fillStyle="#000";t.fillRect(0,0,w,h);t.translate(w/2,h/2);const sm=1+Math.sin(f*c.pulseSpd)*c.pulseAmp;if(thumb){const rad=Math.max(50,c.baseLen*(1+Math.abs(c.pulseAmp))*2.5),s=Math.min(.96,(Math.min(w,h)/2-5)/rad);t.scale(s,s)}for(let i=0;i<c.branches;i++){t.save();t.rotate(Math.PI*2/c.branches*i);branchBreath(t,c.baseLen*sm,c.layers,c,f);t.restore()}t.restore()}
  const growthAt=(f,s)=>{const p=((f*s)%2+2)%2;return p<=1?p:2-p};
  const lvlWeight=(d,c)=>d===1?c.firstLevelFactor:Math.pow(c.levelSpeedRatio,d-1);
  function totalWeight(c){let s=c.firstLevelFactor;for(let i=2;i<=c.maxDepth;i++)s+=Math.pow(c.levelSpeedRatio,i-1);return Math.max(.00001,s)}
  function levelStart(d,c){if(d===1)return 0;let s=c.firstLevelFactor;for(let i=2;i<d;i++)s+=Math.pow(c.levelSpeedRatio,i-1);return s}
  function branchGrowth(t,len,d,g,c,f,sum){if(d>c.maxDepth)return;const w=lvlWeight(d,c),from=levelStart(d,c)/sum,to=(levelStart(d,c)+w)/sum;if(g<from)return;const p=clamp((g-from)/Math.max(.00001,to-from),0,1),x2=len*p;t.strokeStyle=c.colorModeIndex===1?"rgb(170,190,255)":c.colorModeIndex===2?`hsl(${((f*c.hueRate*100+x2*.4)%360+360)%360} 80% 55%)`:"#fff";t.lineWidth=c.strokeW;t.beginPath();t.moveTo(0,0);t.lineTo(x2,0);t.stroke();if(p>=1&&d<c.maxDepth){t.save();t.translate(len,0);t.save();t.rotate(Math.PI/6);branchGrowth(t,len*.6,d+1,g,c,f,sum);t.restore();t.save();t.rotate(-Math.PI/6);branchGrowth(t,len*.6,d+1,g,c,f,sum);t.restore();t.restore()}}
  function renderGrowth(t,w,h,c,f,thumb=false){c=cloneConfig(c,GROWTH_ID);t.save();t.fillStyle="#000";t.fillRect(0,0,w,h);t.translate(w/2,h/2);const g=growthAt(f,c.pulseSpeed);if(thumb){const rad=Math.max(60,c.baseLen*2.6),s=Math.min(.95,(Math.min(w,h)/2-5)/rad);t.scale(s*c.zoom,s*c.zoom)}else t.scale(c.zoom,c.zoom);const sum=totalWeight(c);for(let i=0;i<c.branches;i++){t.save();t.rotate(Math.PI*2/c.branches*i);branchGrowth(t,c.baseLen,1,g,c,f,sum);t.restore()}t.restore()}
  function render(t,w,h,c,f,thumb=false,id=activeId){if(id===FISH_ID)return renderFish(t,w,h,c,f,thumb);if(id===BREATH_ID)return renderBreath(t,w,h,c,f,thumb);if(id===GROWTH_ID)return renderGrowth(t,w,h,c,f,thumb)}
  function preview(canvas,c,f=44,id=null){if(!canvas)return;const pid=id||c?.patternId;render(canvas.getContext("2d"),canvas.width,canvas.height,cloneConfig(c,pid),Number.isFinite(Number(f))?Number(f):44,true,pid)}

  function startAnimation(){if(raf)return;const tick=now=>{if(!activeId||!gameScreen.classList.contains("active")){raf=0;return}frame=(now-startedAt)/16.6667;const r=app.getBoundingClientRect();render(ctx,r.width,r.height,config,frame,false,activeId);raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick)}
  function stopAnimation(){if(raf)cancelAnimationFrame(raf);raf=0}
  function deactivate(){if(!activeId)return;activeId=null;config=null;source=null;stopAnimation();overlay.style.display="none";originalCanvas.style.visibility="";if(modeLabel)modeLabel.textContent=""}
  function activate(id,c,src={}){if(!DEF[id])return;activeId=id;config=cloneConfig(c||DEF[id].defaults,id);source={type:src.type||"base",id:src.id||id,patternId:id,communityId:src.communityId||null};frame=0;startedAt=performance.now();originalCanvas.style.visibility="hidden";overlay.style.display="block";overlay.setAttribute("aria-label",DEF[id].title);if(modeLabel)modeLabel.textContent=DEF[id].title;resize();libraryScreen.classList.remove("active");gameScreen.classList.add("active");updateColor();updateFavorite();startAnimation();emit("view",{view:"game"});emit("pattern-open",{patternId:id,sourceType:source.type,sourceId:source.id,communityId:source.communityId})}

  function updateColor(){if(!activeId||!colorDots)return;const n=(config.colorModeIndex||0)+1;[...colorDots.children].forEach((d,i)=>d.classList.toggle("visible",i<n))}
  function updateFavorite(){if(!activeId||!favoriteButton)return;const m=matching();favoriteButton.textContent=m?"♥":"♡";favoriteButton.classList.toggle("saved",!!m);favoriteButton.setAttribute("aria-label",m?"Снять лайк с этой конфигурации":"Сохранить текущую конфигурацию")}
  function cycleColor(origin="button"){if(!activeId)return;const from=config.colorModeIndex||0;config.colorModeIndex=(from+1)%3;updateColor();updateFavorite();emit("color",{from,to:config.colorModeIndex,origin})}
  function registerTap(){const now=performance.now();tapTimes.push(now);if(tapTimes.length>3)tapTimes.shift();const limit=activeId===FISH_ID?600:450;if(tapTimes.length===3&&tapTimes[2]-tapTimes[0]<limit){tapTimes=[];cycleColor("triple-tap")}}

  function saveFavorite(c=config,f=frame,meta={}){if(!activeId)return null;const old=matching(c,activeId);if(old){updateFavorite();showToast("♥ Уже сохранено");return old}const def=DEF[activeId],list=favorites.get(activeId)||[],snap={id:`${activeId}-favorite-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,baseId:activeId,patternId:activeId,config:cloneConfig(c,activeId),previewFrame:Number.isFinite(Number(f))?Number(f):44,createdAt:Date.now(),communityId:meta.communityId||null,parentCommunityId:meta.parentCommunityId||source?.communityId||null,patternVersion:def.version};list.unshift(snap);favorites.set(activeId,list.slice(0,120));persist(activeId);renderHostLibrary();updateFavorite();showToast("♥ Конфигурация сохранена");emit("favorite-saved",{favorite:clone(snap),origin:meta.origin||"game"});return snap}
  function removeFavorite(fav,origin="game"){const id=fav?.baseId||fav?.patternId;if(!DEF[id])return false;const list=favorites.get(id)||[],i=list.findIndex(x=>x.id===fav.id);if(i<0)return false;const removed=list.splice(i,1)[0];favorites.set(id,list);persist(id);renderHostLibrary();updateFavorite();showToast("♡ Лайк снят");emit("favorite-removed",{favorite:clone(removed),origin});return true}

  function localTouch(t){const r=overlay.getBoundingClientRect();return{x:t.clientX-r.left,y:t.clientY-r.top}}
  function norm(p){const r=overlay.getBoundingClientRect();return{x:r.width?p.x/r.width:0,y:r.height?p.y/r.height:0}}
  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
  function applyFish(s,p){const r=overlay.getBoundingClientRect(),dx=p.x-s.x,dy=p.y-s.y;let ch=false,n={...s};if(p.x<r.width*.25&&Math.abs(dy)>10){config.numLayers=clamp(config.numLayers+dy*.05,5,100);n.y=p.y;ch=true}else if(p.x>r.width*.75&&Math.abs(dy)>10){config.waveAmplitude=clamp(config.waveAmplitude-dy*.1,0,200);n.y=p.y;ch=true}else if(p.y<r.height*.25&&Math.abs(dx)>5){config.strokeW=clamp(config.strokeW+dx*.01,.3,8);n.x=p.x;ch=true}else if(p.y>r.height*.75&&Math.abs(dx)>5){config.waveSpeed=clamp(config.waveSpeed+dx*.0003,.001,.2);n.x=p.x;ch=true}return{changed:ch,start:n}}
  function applyBreath(s1,s2,p1,p2,fingers){const r=overlay.getBoundingClientRect(),dx=p1.x-s1.x,dy=p1.y-s1.y,L=r.width*EDGE,R=r.width*(1-EDGE),T=r.height*EDGE,B=r.height*(1-EDGE);let a={...s1},b=s2?{...s2}:null,ch=false;if(s1.x<L){if(Math.abs(dy)>TH){config.branches=clamp(config.branches+(dy<0?1:-1),2,60);a.y=p1.y;ch=true}return{changed:ch,start1:a,start2:b}}if(s1.x>R){if(Math.abs(dy)>TH){config.layers=clamp(config.layers+(dy<0?1:-1),1,10);a.y=p1.y;ch=true}return{changed:ch,start1:a,start2:b}}if(s1.y<T){if(Math.abs(dx)>TH){config.strokeW=clamp(config.strokeW+(dx>0?.3:-.3),.1,8);a.x=p1.x;ch=true}return{changed:ch,start1:a,start2:b}}if(s1.y>B){if(fingers===1&&Math.abs(dx)>TH){config.pulseSpd=clamp(config.pulseSpd+(dx>0?.005:-.005),.001,.3);a.x=p1.x;ch=true}if(fingers===2&&b&&p2){const dx2=p2.x-b.x;if(Math.abs(dx2)>TH){config.pulseAmp=clamp(config.pulseAmp+(dx2>0?.02:-.02),.05,2);b.x=p2.x;ch=true}}}return{changed:ch,start1:a,start2:b}}
  function applyGrowth1(s,p){const r=overlay.getBoundingClientRect(),dx=p.x-s.x,dy=p.y-s.y,L=r.width*EDGE,R=r.width*(1-EDGE),T=r.height*EDGE,B=r.height*(1-EDGE);let n={...s},ch=false;if(s.x<L&&Math.abs(dy)>TH){config.branches=clamp(config.branches+(dy<0?1:-1),2,60);n.y=p.y;ch=true}else if(s.x>R&&Math.abs(dy)>TH){config.maxDepth=clamp(config.maxDepth+(dy<0?1:-1),1,10);n.y=p.y;ch=true}else if(s.y<T&&Math.abs(dx)>TH){config.strokeW=clamp(config.strokeW+(dx>0?.3:-.3),.1,8);n.x=p.x;ch=true}else if(s.y>B&&Math.abs(dx)>TH){config.pulseSpeed=clamp(config.pulseSpeed+(dx>0?.005:-.005),.001,.1);n.x=p.x;ch=true}return{changed:ch,start:n}}
  function applyGrowth2(s1,s2,p1,p2,startDist){let ch=false;const nd=distance(p1,p2);if(startDist>0&&nd>0){const z=config.zoom*(nd/startDist);if(Math.abs(z-config.zoom)>.0001){config.zoom=clamp(z,.3,3);ch=true}}const r=overlay.getBoundingClientRect(),B=r.height*(1-EDGE);let a={...p1},b={...p2};if(p1.y>B&&p2.y>B){const delta=(p1.x+p2.x)/2-(s1.x+s2.x)/2;if(Math.abs(delta)>TH){config.levelSpeedRatio=clamp(config.levelSpeedRatio+(delta>0?.05:-.05),.2,3);ch=true}}return{changed:ch,start1:a,start2:b,startDist:nd}}

  overlay.addEventListener("touchstart",e=>{if(!activeId||!e.touches.length)return;e.preventDefault();lastTouchAt=Date.now();const p1=localTouch(e.touches[0]),p2=e.touches.length>1?localTouch(e.touches[1]):null;touch.start1={...p1};touch.start2=p2?{...p2}:null;touch.startDist=p2?distance(p1,p2):0;touch.prev1={...p1};touch.prev2=p2?{...p2}:null;touch.moved=false;touch.fingers=e.touches.length;if(e.touches.length===1)registerTap();emit("gesture-start",{fingers:e.touches.length,...norm(p1)})},{passive:false});
  overlay.addEventListener("touchmove",e=>{if(!activeId||!touch.start1||!e.touches.length)return;e.preventDefault();lastTouchAt=Date.now();const p1=localTouch(e.touches[0]),p2=e.touches.length>1?localTouch(e.touches[1]):null;if(touch.prev1&&distance(p1,touch.prev1)>2)touch.moved=true;let changed=false;if(activeId===FISH_ID){const o=applyFish(touch.start1,p1);touch.start1=o.start;changed=o.changed}else if(activeId===BREATH_ID){const o=applyBreath(touch.start1,touch.start2,p1,p2,e.touches.length);touch.start1=o.start1;touch.start2=o.start2;changed=o.changed}else if(activeId===GROWTH_ID){if(e.touches.length===2&&p2&&touch.start2){const o=applyGrowth2(touch.start1,touch.start2,p1,p2,touch.startDist);touch.start1=o.start1;touch.start2=o.start2;touch.startDist=o.startDist;changed=o.changed}else{const o=applyGrowth1(touch.start1,p1);touch.start1=o.start;changed=o.changed}}touch.prev1={...p1};touch.prev2=p2?{...p2}:null;if(changed){updateFavorite();emit("gesture-move",{fingers:e.touches.length,...norm(p1)})}},{passive:false});
  function endTouch(e){if(!activeId)return;e.preventDefault();emit("gesture-end",{fingers:touch.fingers||1});if(!e.touches.length){touch.start1=touch.start2=touch.prev1=touch.prev2=null;touch.startDist=0;touch.fingers=0}else{const p1=localTouch(e.touches[0]),p2=e.touches.length>1?localTouch(e.touches[1]):null;touch.start1={...p1};touch.start2=p2?{...p2}:null;touch.startDist=p2?distance(p1,p2):0;touch.prev1={...p1};touch.prev2=p2?{...p2}:null;touch.fingers=e.touches.length}}
  overlay.addEventListener("touchend",endTouch,{passive:false});overlay.addEventListener("touchcancel",endTouch,{passive:false});

  overlay.addEventListener("mousedown",e=>{if(!activeId||Date.now()-lastTouchAt<700)return;e.preventDefault();const r=overlay.getBoundingClientRect(),p={x:e.clientX-r.left,y:e.clientY-r.top};mouse.down=true;mouse.start={...p};mouse.prev={...p};mouse.moved=false;mouse.fingers=e.shiftKey?2:1;registerTap();emit("gesture-start",{fingers:mouse.fingers,desktop:true,...norm(p)})});
  window.addEventListener("mousemove",e=>{if(!activeId||!mouse.down||!mouse.start)return;const r=overlay.getBoundingClientRect(),p={x:e.clientX-r.left,y:e.clientY-r.top};if(mouse.prev&&distance(p,mouse.prev)>2)mouse.moved=true;mouse.fingers=e.shiftKey?2:1;let changed=false;if(activeId===FISH_ID){const o=applyFish(mouse.start,p);mouse.start=o.start;changed=o.changed}else if(activeId===BREATH_ID){const p2=mouse.fingers===2?{...p}:null,s2=mouse.fingers===2?{...mouse.start}:null,o=applyBreath(mouse.start,s2,p,p2,mouse.fingers);mouse.start=o.start1;changed=o.changed}else if(activeId===GROWTH_ID){const o=applyGrowth1(mouse.start,p);mouse.start=o.start;changed=o.changed}mouse.prev={...p};if(changed){updateFavorite();emit("gesture-move",{fingers:mouse.fingers,desktop:true,...norm(p)})}},true);
  window.addEventListener("mouseup",()=>{if(!activeId||!mouse.down)return;emit("gesture-end",{fingers:mouse.fingers,desktop:true});mouse.down=false;mouse.start=mouse.prev=null},true);

  function instructions(id=activeId){if(id===FISH_ID)return'<h2 id="instructionsTitle">Управление · Носовая волна</h2><div class="gesture-group"><strong>1 палец</strong><div class="gesture-row"><span>Слева ↑↓</span><span>Количество слоёв</span></div><div class="gesture-row"><span>Справа ↑↓</span><span>Амплитуда носовой волны</span></div><div class="gesture-row"><span>Сверху ←→</span><span>Толщина линий</span></div><div class="gesture-row"><span>Снизу ←→</span><span>Скорость волны</span></div></div><div class="gesture-group"><strong>Тапы</strong><div class="gesture-row"><span>3 тапа</span><span>Голубой → белый → радуга</span></div></div><button class="close-modal" type="button">Понятно</button>';if(id===BREATH_ID)return'<h2 id="instructionsTitle">Управление · Breathing Fractal</h2><div class="gesture-group"><strong>Изолированные зоны</strong><div class="gesture-row"><span>Слева ↑↓</span><span>Количество лепестков / ветвей</span></div><div class="gesture-row"><span>Справа ↑↓</span><span>Глубина ветвления</span></div><div class="gesture-row"><span>Сверху ←→</span><span>Толщина линий</span></div><div class="gesture-row"><span>Снизу ←→</span><span>1 палец — скорость дыхания</span></div><div class="gesture-row"><span>Снизу ←→</span><span>2 пальца — амплитуда дыхания</span></div></div><div class="gesture-group"><strong>Тапы</strong><div class="gesture-row"><span>3 тапа</span><span>Белый → голубой → радуга</span></div></div><button class="close-modal" type="button">Понятно</button>';return'<h2 id="instructionsTitle">Управление · Breathing Fractal · Growth</h2><div class="gesture-group"><strong>1 палец</strong><div class="gesture-row"><span>Слева ↑↓</span><span>Количество ветвей</span></div><div class="gesture-row"><span>Справа ↑↓</span><span>Глубина роста</span></div><div class="gesture-row"><span>Сверху ←→</span><span>Толщина линий</span></div><div class="gesture-row"><span>Снизу ←→</span><span>Скорость полного цикла</span></div></div><div class="gesture-group"><strong>2 пальца</strong><div class="gesture-row"><span>Пинч</span><span>Масштаб</span></div><div class="gesture-row"><span>Снизу ←→</span><span>Скорость раскрытия уровней</span></div></div><div class="gesture-group"><strong>Тапы</strong><div class="gesture-row"><span>3 тапа</span><span>Белый → голубой → радуга</span></div></div><button class="close-modal" type="button">Понятно</button>'}

  function renderHostLibrary(){original.renderLibrary?.();requestAnimationFrame(ensureTiles)}
  function bindTile(b,item){let timer=0,held=false,sx=0,sy=0;const cancel=()=>{if(timer)clearTimeout(timer);timer=0};b.addEventListener("pointerdown",e=>{held=false;sx=e.clientX;sy=e.clientY;b.setPointerCapture?.(e.pointerId);timer=setTimeout(()=>{held=true;if(item.kind==="favorite")removeFavorite(item.favorite,"tile_hold");else{const old=matching(item.config,item.patternId);if(old)removeFavorite(old,"tile_hold");else{const prev=activeId;activeId=item.patternId;source={communityId:item.communityId||null};saveFavorite(item.config,item.previewFrame,{origin:"tile_hold",communityId:item.communityId||null,parentCommunityId:item.communityId||null});activeId=prev}}navigator.vibrate?.(18)},620)});b.addEventListener("pointermove",e=>{if(!held&&Math.hypot(e.clientX-sx,e.clientY-sy)>18)cancel()});b.addEventListener("pointercancel",cancel);b.addEventListener("pointerup",e=>{cancel();if(held){e.preventDefault();return}activate(item.patternId,item.config,{type:item.kind,id:item.id,patternId:item.patternId,communityId:item.communityId||null})});b.addEventListener("contextmenu",e=>e.preventDefault())}
  function makeTile(item){const d=DEF[item.patternId],b=document.createElement("button");b.type="button";b.className=`pattern-tile ${item.kind}-tile`;b.dataset.kind=item.kind;b.dataset.itemId=item.id;b.dataset.patternId=item.patternId;b.dataset.extraPattern="1";b.setAttribute("aria-label",item.kind==="favorite"?`Открыть сохраненную конфигурацию ${d.title}. Удерживай, чтобы удалить`:`Открыть паттерн ${d.title}. Удерживай, чтобы сохранить`);const c=document.createElement("canvas");c.width=180;c.height=180;c.className="thumb-canvas";b.appendChild(c);preview(c,item.config,item.previewFrame??44,item.patternId);if(item.kind==="favorite"){const h=document.createElement("span");h.className="mini-heart";h.textContent="♥";b.appendChild(h)}if(item.kind==="community"){const badge=document.createElement("span");badge.className="community-count";badge.textContent=`♥ ${Math.max(0,Number(item.saveCount)||0)}`;b.appendChild(badge)}if(item.kind==="base"){const mark=document.createElement("span");mark.className="recommendation-mark";mark.textContent="●";mark.style.display=recommended.has(item.patternId)?"":"none";b.appendChild(mark)}bindTile(b,item);return b}
  function ensureTiles(){for(const id of CUSTOM_IDS){if(!allPatternsPanel.querySelector(`[data-extra-pattern="1"][data-kind="base"][data-pattern-id="${id}"]`))allPatternsPanel.appendChild(makeTile({kind:"base",id,patternId:id,config:DEF[id].defaults,previewFrame:44}))}if(favoritesPanel){favoritesPanel.querySelectorAll('[data-extra-pattern="1"][data-kind="favorite"]').forEach(n=>n.remove());const list=allCustomFavorites();if(list.length)favoritesPanel.querySelector(".empty-favorites")?.remove();for(const f of list)favoritesPanel.appendChild(makeTile({kind:"favorite",id:f.id,patternId:f.baseId,favorite:f,config:f.config,previewFrame:f.previewFrame,communityId:f.communityId}))}if(communityPanel){communityPanel.querySelectorAll('[data-extra-pattern="1"][data-kind="community"]').forEach(n=>n.remove());const list=CUSTOM_IDS.flatMap(id=>community.get(id)||[]);if(list.length)communityPanel.querySelector(".empty-favorites")?.remove();for(const x of list){const idp=x.patternId||x.pattern_id||x.baseId||x.config?.patternId;communityPanel.appendChild(makeTile({kind:"community",id:String(x.id),patternId:idp,communityId:String(x.id),config:cloneConfig(x.config,idp),previewFrame:Number(x.preview_frame??x.previewFrame??44),saveCount:Number(x.saveCount)||0}))}}}
  new MutationObserver(()=>requestAnimationFrame(ensureTiles)).observe(allPatternsPanel,{childList:true});

  Setka.getPatterns=()=>{const base=original.getPatterns?.()||[];return[...base,...CUSTOM_IDS.filter(id=>!base.some(p=>p.id===id)).map(id=>({id,title:DEF[id].title,version:DEF[id].version,defaults:cloneConfig(DEF[id].defaults,id)}))]};
  Setka.getPatternDefaults=id=>DEF[id]?cloneConfig(DEF[id].defaults,id):original.getPatternDefaults?.(id);
  Setka.getPatternTitle=id=>DEF[id]?.title||original.getPatternTitle?.(id);
  Setka.cloneConfig=(c,h=null)=>isCustom(c,h)?cloneConfig(c,h):original.cloneConfig?.(c,h);
  Setka.configKey=(c,h=null)=>isCustom(c,h)?keyOf(c,h):original.configKey?.(c,h);
  Setka.getState=()=>activeId?state():original.getState?.();
  Setka.getConfig=()=>activeId?cloneConfig(config,activeId):original.getConfig?.();
  Setka.getFavorites=()=>[...(original.getFavorites?.()||[]),...allCustomFavorites()];
  Setka.renderPreview=(canvas,c,f=44,id=null)=>isCustom(c,id)?preview(canvas,c,f,id||c?.patternId):original.renderPreview?.(canvas,c,f,id);
  Setka.openConfig=(c,src={})=>{const id=src.patternId||src.baseId||c?.patternId||c?.baseId;if(DEF[id])return activate(id,c,src);deactivate();return original.openConfig?.(c,src)};
  Setka.refreshFavorites=()=>{original.refreshFavorites?.();CUSTOM_IDS.forEach(id=>favorites.set(id,loadFavorites(id)));ensureTiles()};
  Setka.renderLibrary=()=>{original.renderLibrary?.();requestAnimationFrame(ensureTiles)};
  Setka.setCommunity=items=>{const all=Array.isArray(items)?items:[];CUSTOM_IDS.forEach(id=>community.set(id,all.filter(x=>(x?.patternId||x?.pattern_id||x?.baseId||x?.config?.patternId)===id).map(x=>({...x,patternId:id,config:cloneConfig(x.config||DEF[id].defaults,id)}))));original.setCommunity?.(all.filter(x=>!CUSTOM_IDS.includes(x?.patternId||x?.pattern_id||x?.baseId||x?.config?.patternId)));requestAnimationFrame(ensureTiles)};
  Setka.setRecommendations=data=>{recommended.clear();(data?.patterns||[]).map(String).filter(x=>CUSTOM_IDS.includes(x)).forEach(x=>recommended.add(x));original.setRecommendations?.({...data,patterns:(data?.patterns||[]).filter(x=>!CUSTOM_IDS.includes(String(x)))});requestAnimationFrame(ensureTiles)};
  Setka.updateFavoriteMeta=(id,patch={})=>{for(const pid of CUSTOM_IDS){const f=(favorites.get(pid)||[]).find(x=>x.id===id);if(f){Object.assign(f,patch);persist(pid);ensureTiles();return clone(f)}}return original.updateFavoriteMeta?.(id,patch)};
  Setka.FISH_WAVE_DEFAULT=cloneConfig(FISH_DEFAULT,FISH_ID);Setka.BREATHING_FRACTAL_DEFAULT=cloneConfig(BREATH_DEFAULT,BREATH_ID);Setka.BREATHING_GROWTH_DEFAULT=cloneConfig(GROWTH_DEFAULT,GROWTH_ID);

  favoriteButton?.addEventListener("click",e=>{if(!activeId)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const m=matching();m?removeFavorite(m,"game"):saveFavorite(config,frame,{origin:"game",parentCommunityId:source?.communityId||null})},true);
  colorButton?.addEventListener("click",e=>{if(!activeId)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();cycleColor("button")},true);
  instructionsButton?.addEventListener("click",e=>{if(!activeId)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const p=instructionsModal?.querySelector(".instructions");if(p)p.innerHTML=instructions(activeId);instructionsModal?.classList.add("open");emit("instructions-open")},true);
  libraryButton?.addEventListener("click",e=>{if(!activeId)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();deactivate();gameScreen.classList.remove("active");libraryScreen.classList.add("active");original.renderLibrary?.();ensureTiles();window.dispatchEvent(new CustomEvent("setka:view",{detail:{view:"library",state:original.getState?.()||{view:"library"}}}))},true);
  function cycle(dir){const ps=Setka.getPatterns?.()||[];if(!ps.length)return;const cur=activeId||original.getState?.()?.patternId||ps[0].id;let i=ps.findIndex(p=>p.id===cur);if(i<0)i=0;i=(i+dir+ps.length)%ps.length;const p=ps[i],c=Setka.getPatternDefaults?.(p.id)||p.defaults;Setka.openConfig?.(c,{type:"base",id:p.id,patternId:p.id,communityId:null})}
  prevButton?.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();cycle(-1)},true);nextButton?.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();cycle(1)},true);

  libraryScreen.addEventListener("pointerup",e=>{const tile=e.target.closest?.(".pattern-tile");if(!tile)return;const pid=tile.dataset.patternId;if(pid&&!CUSTOM_IDS.includes(pid)&&activeId)deactivate()},true);
  window.addEventListener("setka:pattern-open",e=>{const pid=e.detail?.patternId||e.detail?.state?.patternId;if(pid&&!CUSTOM_IDS.includes(pid)&&activeId)deactivate()});
  window.addEventListener("resize",()=>{if(activeId)resize();ensureTiles()});document.addEventListener("visibilitychange",()=>{if(document.hidden)stopAnimation();else if(activeId)startAnimation()});

  ensureTiles();
  window.__SETKA_EXTRA_PATTERNS_V34__={ids:[...CUSTOM_IDS],open:(id,c,s)=>activate(id,c,s),renderPreview:preview};
})();