(() => {
  "use strict";

  const STORAGE_FAVORITES="setka-web:favorites:v1";
  const LEGACY_FISH_KEY="setka-web:favorites:fish-wave:v35";
  const LEGACY_BREATH_KEY="setka-web:favorites:breathing-fractal:v1";
  const LEGACY_GROWTH_KEY="setka-web:favorites:breathing-fractal-growth:v1";

  const TENTACLE_ID="tentacle-orbit";
  const DANDELION_ID="dandelion";
  const FISH_ID="fish-wave";
  const BREATH_ID="breathing-fractal";
  const GROWTH_ID="breathing-fractal-growth";
  const RGB_ID="rgb-glitch-rings";
  const DNA_ID="stereo-dna";
  const GRID_ID="breathing-grid";

  const BASE_PREVIEW_FRAME=44, EDGE=.20, TH=15, FIRST_LEVEL_FACTOR=2.0;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const mod=(n,m)=>((n%m)+m)%m;
  const rad=d=>d*Math.PI/180;
  const round5=n=>Math.round(Number(n)*100000)/100000;

  const registry=window.SetkaPatternRegistryV1;
  if(!registry)throw new Error("pattern_registry_required");
  const [TENTACLE_DEFAULT,DANDELION_DEFAULT,FISH_DEFAULT,BREATH_DEFAULT,GROWTH_DEFAULT,RGB_DEFAULT,DNA_DEFAULT,GRID_DEFAULT]=
    [TENTACLE_ID,DANDELION_ID,FISH_ID,BREATH_ID,GROWTH_ID,RGB_ID,DNA_ID,GRID_ID].map(id=>registry.get(id).defaults);
  const PATTERNS=registry.list().map(p=>({...p,defaults:registry.defaults(p.id),title:registry.title(p.id)}));
  const customRenderers=new Map(registry.list().filter(p=>p.module).map(p=>[p.id,true])); // Compatibility for generic plugin gesture handling.
  const IDS=new Set(PATTERNS.map(p=>p.id));
  const PAGE_ORDER=["all","community","favorites"];
  const $=id=>document.getElementById(id);
  const app=$("app"),libraryScreen=$("libraryScreen"),gameScreen=$("gameScreen"),allPatternsPanel=$("allPatternsPanel"),communityPanel=$("communityPanel"),favoritesPanel=$("favoritesPanel"),libraryPagerButton=$("libraryPagerButton"),communityPagerButton=$("communityPagerButton"),favoritesPagerButton=$("favoritesPagerButton"),libraryTitle=$("libraryTitle"),librarySwipeArea=$("librarySwipeArea"),canvas=$("patternCanvas"),ctx=canvas?.getContext("2d",{alpha:false}),colorButton=$("colorButton"),colorDots=$("colorDots"),favoriteButton=$("favoriteButton"),libraryButton=$("libraryButton"),prevButton=$("prevButton"),nextButton=$("nextButton"),instructionsButton=$("instructionsButton"),instructionsModal=$("instructionsModal"),toast=$("toast");
  if(!app||!canvas||!ctx||!communityPanel)return;

  let favoriteDisplayLimit=240;
  let activeLibraryPage="all",runtimePatternId=TENTACLE_ID,runtimeConfig=null,activeSource={type:"base",id:TENTACLE_ID,patternId:TENTACLE_ID,communityId:null};
  let communityItems=[],recommendedCommunity=new Set(),recommendedPatterns=new Set(),animationFrame=0,animationStart=performance.now(),currentFrame=0,toastTimer=0,tapTimes=[];
  const previewTiles=new Map(),reducedPreviewMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
  // A shared, resumable library clock prevents previews from skipping to a
  // distant absolute frame after card rebuilds, tab switches or Safari pauses.
  const PREVIEW_INTERVAL_MS=1000/30,PREVIEW_MAX_STEP_MS=40,PREVIEW_SPEED=.75;
  let previewCursor=0;const previewStats={frames:0,maxPerPaint:12};
  let previewAnimation=0,previewLastPaint=0,previewLastTick=0,previewPhase=0,previewPaintPhase=0;
  const previewFrame=base=>base+previewPhase;
  // Recreated tiles must begin at the last *displayed* phase; the logical
  // phase may have moved forward between two paint frames.
  const previewRenderedFrame=base=>base+previewPaintPhase;
  const touch={fingers:0,primaryId:null,x:0,y:0,startX:0,startY:0,secondX:0,secondY:0,lastDist:null,lastStereoX:null};
  const mouse={down:false,fingers:1,x:0,y:0,startX:0,startY:0};

  function patternById(id){return PATTERNS.find(p=>p.id===id)||null}
  function inferPatternId(c,hint=null){return registry.resolve(c,hint)}
  function readJSON(k,d){if(window.__SETKA_RENDER_ONLY__)return d;try{const raw=(window.SetkaDataScopeV1?.storage||localStorage).getItem(k);return raw?JSON.parse(raw):d}catch(_){return d}}
  function writeJSON(k,v){if(window.__SETKA_RENDER_ONLY__)return;try{(window.SetkaDataScopeV1?.storage||localStorage).setItem(k,JSON.stringify(v))}catch(_){}}

  function cloneConfig(c={},hint=null){return registry.normalize(c,hint)}
  function configKey(c,hint=null){return registry.configKey(c,hint)}

  const LAST_KEY="setka-patterns:last-config:v1",lastConfigs=readJSON(LAST_KEY,{})||{};
  function remember(){if(window.__SETKA_RENDER_ONLY__)return;lastConfigs[runtimePatternId]={version:registry.get(runtimePatternId).version,config:cloneConfig(runtimeConfig,runtimePatternId),updatedAt:new Date().toISOString()};writeJSON(LAST_KEY,lastConfigs);const core=window.SetkaStandaloneV34;if(core){const d=core.getData();d.settings=d.settings||{};d.settings.patternConfigs=JSON.parse(JSON.stringify(lastConfigs));core.save?.()}}
  for(const event of ["setka:gesture-move","setka:gesture-end","setka:color","setka:pattern-open"])window.addEventListener(event,remember);
  function restorePersonalConfigs(rows={}){
    for(const [id,row] of Object.entries(rows)){
      if(!registry.has(id)||row?.version!==registry.get(id).version||!row.config)continue;
      const old=lastConfigs[id];if(!old||(Date.parse(row.updatedAt)||0)>=(Date.parse(old.updatedAt)||0))lastConfigs[id]=JSON.parse(JSON.stringify(row));
    }
    writeJSON(LAST_KEY,lastConfigs);return JSON.parse(JSON.stringify(lastConfigs));
  }
  function normalizeFavorite(item,index,forcedId=null){
    // Never replace an unresolved archived favorite with a starter recipe.
    // An immutable snapshot is stronger evidence than a mutable display row.
    const frozen=item?.replaySnapshot?.config&&item.replaySnapshot.patternId?item.replaySnapshot:null;
    const rawConfig=frozen?.config||item?.config;
    let baseId;
    try{
      const candidate=forcedId||frozen?.patternId||rawConfig?.patternId||item?.patternId||item?.baseId||null;
      baseId=forcedId||inferPatternId(rawConfig,candidate);
      // Conflicting known identities are an error, not a reason to repaint
      // the favorite as another pattern.
      const knownMetadata=[frozen?.patternId,rawConfig?.patternId,item?.patternId,item?.baseId]
        .filter(id=>id&&registry.has(id));
      if(new Set(knownMetadata).size>1&&!forcedId)throw new Error("favorite_pattern_identity_conflict");
      if(!registry.has(baseId))throw new Error("favorite_pattern_unknown");
      const raw={...rawConfig,patternId:baseId};
      const config=cloneConfig(raw,baseId);
      return {...item,id:String(item?.id||`favorite-${index}`),baseId,patternId:baseId,
        config,unavailable:false,
        previewFrame:Number.isFinite(Number(item?.previewFrame))?Number(item.previewFrame):BASE_PREVIEW_FRAME,
        createdAt:Number(item?.createdAt)||Date.now(),
        communityId:item?.communityId?String(item.communityId):null,
        parentCommunityId:item?.parentCommunityId?String(item.parentCommunityId):null,
        patternVersion:Math.max(1,Math.round(Number(frozen?.patternVersion||item?.patternVersion)||registry.get(baseId).version))};
    }catch(error){
      // A frozen raw record stays byte-for-byte recoverable in the archive.
      // It can become renderable when the missing version/module is installed.
      return {...item,unavailable:true,
        baseId:item?.baseId||item?.patternId||item?.config?.patternId||frozen?.patternId||null,
        unavailableReason:error?.code||error?.message||"unavailable"};
    }
  }
  function loadFavorites(){const out=[],seen=new Set(),push=f=>{const sig=f.unavailable?JSON.stringify(f):`${f.id}|${configKey(f.config,f.baseId)}`;if(!seen.has(sig)){seen.add(sig);out.push(f)}};const main=readJSON(STORAGE_FAVORITES,[]);if(Array.isArray(main))main.forEach((x,i)=>push(normalizeFavorite(x,i)));const fish=readJSON(LEGACY_FISH_KEY,[]);if(Array.isArray(fish))fish.forEach((x,i)=>push(normalizeFavorite(x,1000+i,FISH_ID)));const breath=readJSON(LEGACY_BREATH_KEY,[]);if(Array.isArray(breath))breath.forEach((x,i)=>push(normalizeFavorite(x,2000+i,BREATH_ID)));const growth=readJSON(LEGACY_GROWTH_KEY,[]);if(Array.isArray(growth))growth.forEach((x,i)=>push(normalizeFavorite(x,3000+i,GROWTH_ID)));return out}
  let favorites=loadFavorites();
  function persistFavorites(){writeJSON(STORAGE_FAVORITES,favorites)}
  function matchingFavorite(c=runtimeConfig,id=runtimePatternId){const k=configKey(c,id);return favorites.find(f=>!f.unavailable&&configKey(f.config,f.baseId)===k)||null}
  runtimeConfig=cloneConfig(TENTACLE_DEFAULT,TENTACLE_ID);

  function statePayload(extra={}){const m=matchingFavorite();return{view:gameScreen.classList.contains("active")?"game":"library",libraryPage:activeLibraryPage,patternId:runtimePatternId,patternVersion:patternById(runtimePatternId).version,sourceType:activeSource.type,sourceId:activeSource.id,communityId:activeSource.communityId||null,config:cloneConfig(runtimeConfig,runtimePatternId),configKey:configKey(runtimeConfig,runtimePatternId),frame:currentFrame,favoriteId:m?.id||null,favoriteCommunityId:m?.communityId||null,favoriteCount:favorites.length,...extra}}
  function emit(name,detail={}){window.dispatchEvent(new CustomEvent(`setka:${name}`,{detail:{...detail,state:statePayload()}}))}
  function setScreen(name,initialFrame=0){const game=name==="game";libraryScreen.classList.toggle("active",!game);gameScreen.classList.toggle("active",game);if(game){clearTimeout(toastTimer);toast.classList.remove("show");toast.textContent="";const f=Number.isFinite(Number(initialFrame))?Math.max(0,Number(initialFrame)):0;resizeMainCanvas();animationStart=performance.now()-f*16.6667;currentFrame=f;startAnimation();updateColorIndicator();updateFavoriteButtonState()}else{stopAnimation();renderLibrary()}emit("view",{view:game?"game":"library"})}
  function setLibraryPage(page,silent=false){activeLibraryPage=PAGE_ORDER.includes(page)?page:"all";const i=PAGE_ORDER.indexOf(activeLibraryPage);[allPatternsPanel,communityPanel,favoritesPanel].forEach((p,n)=>{p.classList.toggle("hidden-left",n<i);p.classList.toggle("hidden-right",n>i)});libraryPagerButton.classList.toggle("active",activeLibraryPage==="all");communityPagerButton.classList.toggle("active",activeLibraryPage==="community");favoritesPagerButton.classList.toggle("active",activeLibraryPage==="favorites");libraryTitle.textContent=activeLibraryPage==="community"?"Сообщество":activeLibraryPage==="favorites"?"Сохраненные":"Паттерны";if(!silent)emit("library-page",{page:activeLibraryPage});syncLibraryPreviews()}
  function emptyPanel(p,icon,text){const e=document.createElement("div");e.className="empty-favorites";e.innerHTML=`<span class="big-heart">${icon}</span>${text}`;p.appendChild(e)}
  function normalizeCommunityItem(item){try{const baseId=inferPatternId(item?.config,item?.pattern_id||item?.patternId||item?.baseId);return{...item,baseId,patternId:baseId,config:cloneConfig(item?.config||registry.defaults(baseId),baseId)}}catch(_){return {...item,unavailable:true}}}
  // Reconcile each collection independently. Background community/favorite
  // hydration must not detach the base card a user is scrolling or pressing.
  const panelSignatures=new WeakMap();
  function reconcilePanel(panel,signature,build){
    if(panelSignatures.get(panel)===signature)return;
    for(const canvas of panel.querySelectorAll("canvas"))previewTiles.delete(canvas);
    panel.replaceChildren();build();panelSignatures.set(panel,signature);
  }
  function renderLibrary(){
    stopLibraryPreviews();
    const available=PATTERNS;
    reconcilePanel(allPatternsPanel,JSON.stringify([available.map(p=>[p.id,p.version,registry.defaults(p.id),registry.ready(p.id)]),[...recommendedPatterns]]),()=>{
      for(const p of available){const tile=makePatternTile({kind:"base",id:p.id,baseId:p.id,patternId:p.id,config:registry.defaults(p.id),previewFrame:BASE_PREVIEW_FRAME,title:p.title,patternVersion:p.version});if(recommendedPatterns.has(p.id))tile.classList.add("recommended");allPatternsPanel.appendChild(tile)}
    });
    reconcilePanel(communityPanel,JSON.stringify([communityItems,[...recommendedCommunity],registry.ids().filter(id=>registry.ready(id))]),()=>{
      if(!communityItems.length){emptyPanel(communityPanel,"◎","Здесь появятся конфигурации,<br>которые сохраняют участники");return}
      for(const raw of communityItems){const item=normalizeCommunityItem(raw),tile=makePatternTile({kind:"community",id:String(item.id),baseId:item.baseId,patternId:item.baseId,config:item.config,previewFrame:Number(item.preview_frame??item.previewFrame??BASE_PREVIEW_FRAME),saveCount:Number(item.saveCount)||0,communityId:String(item.id),parentCommunityId:item.parent_config_id||null,unavailable:item.unavailable,patternVersion:Number(item.pattern_version)||patternById(item.baseId)?.version||1});if(recommendedCommunity.has(String(item.id)))tile.classList.add("recommended");communityPanel.appendChild(tile)}
    });
    reconcilePanel(favoritesPanel,JSON.stringify([favorites,favoriteDisplayLimit,registry.ids().filter(id=>registry.ready(id))]),()=>{
      if(!favorites.length){emptyPanel(favoritesPanel,"♥","Здесь появятся конфигурации,<br>которые ты сохранишь сердцем");return}
      for(const favorite of favorites.slice(0,favoriteDisplayLimit))favoritesPanel.appendChild(makePatternTile({kind:"favorite",id:favorite.id,patternId:favorite.baseId,...favorite}));
      if(favorites.length>favoriteDisplayLimit){const more=document.createElement("button");more.textContent="Показать ещё сохранённые конфигурации";more.onclick=()=>{favoriteDisplayLimit+=240;renderLibrary()};favoritesPanel.appendChild(more)}
    });
    setLibraryPage(activeLibraryPage,true);
  }
  function makePatternTile(item){const itemPattern=item.patternId||item.baseId||(item.kind==="base"?item.id:null);if(item.unavailable||itemPattern&&!registry.ready(itemPattern)){const unavailable=document.createElement("div");unavailable.className="pattern-tile unavailable-pattern";unavailable.textContent="Паттерн временно недоступен · запись сохранена";unavailable.dataset.patternId=item.patternId||item.baseId||"";return unavailable}const patternId=inferPatternId(item.config,item.patternId||item.baseId||(item.kind==="base"?item.id:null)),b=document.createElement("button");b.type="button";b.className=`pattern-tile ${item.kind}-tile`;b.dataset.kind=item.kind;b.dataset.itemId=item.id;b.dataset.patternId=patternId;b.setAttribute("aria-label",item.kind==="favorite"?"Открыть сохраненную конфигурацию. Удерживай, чтобы удалить":item.kind==="community"?"Открыть конфигурацию сообщества. Удерживай, чтобы сохранить себе":`Открыть паттерн ${patternById(patternId).title}. Удерживай, чтобы сохранить`);const thumb=document.createElement("canvas");thumb.width=180;thumb.height=180;thumb.className="thumb-canvas";b.appendChild(thumb);drawThumbnail(thumb,item.config||registry.defaults(patternId),previewRenderedFrame(Number.isFinite(Number(item.previewFrame))?Number(item.previewFrame):BASE_PREVIEW_FRAME),patternId);previewTiles.set(thumb,{patternId,config:cloneConfig(item.config||registry.defaults(patternId),patternId),frame:Number.isFinite(Number(item.previewFrame))?Number(item.previewFrame):BASE_PREVIEW_FRAME});if(item.kind==="favorite"){const h=document.createElement("span");h.className="mini-heart";h.textContent="♥";b.appendChild(h)}if(item.kind==="community"){const badge=document.createElement("span");badge.className="community-count";badge.textContent=`♥ ${Math.max(0,Number(item.saveCount)||0)}`;b.appendChild(badge)}const rec=document.createElement("span");rec.className="recommendation-mark";rec.textContent="●";b.appendChild(rec);let timer=0,held=false,sx=0,sy=0;const cancel=()=>{if(timer)clearTimeout(timer);timer=0};b.addEventListener("pointerdown",e=>{if(e.target.closest?.(".st34-info"))return;held=false;sx=e.clientX;sy=e.clientY;b.setPointerCapture?.(e.pointerId);timer=setTimeout(()=>{held=true;if(item.kind==="favorite"){const f=favorites.find(x=>x.id===item.id);if(f)removeFavorite(f,"tile_hold")}else{const cfg=item.kind==="base"?registry.defaults(patternId):item.config,old=matchingFavorite(cfg,patternId);if(old)removeFavorite(old,"tile_hold");else saveFavorite(cfg,item.previewFrame,{origin:"tile_hold",baseId:patternId,communityId:item.kind==="community"?item.communityId:null,parentCommunityId:item.kind==="community"?item.communityId:null,patternVersion:item.patternVersion||patternById(patternId).version})}navigator.vibrate?.(18)},620)});b.addEventListener("pointermove",e=>{if(!held&&Math.hypot(e.clientX-sx,e.clientY-sy)>18)cancel()});b.addEventListener("pointercancel",cancel);b.addEventListener("pointerup",e=>{cancel();if(e.target.closest?.(".st34-info"))return;if(held){e.preventDefault();return}if(item.kind==="base")openConfig(cloneConfig(item.config||registry.defaults(patternId),patternId),{type:"base",id:patternId,patternId,communityId:null});if(item.kind==="favorite"){const f=favorites.find(x=>x.id===item.id);if(f)openConfig(f.config,{type:"favorite",id:f.id,patternId:f.baseId,communityId:f.communityId||null})}if(item.kind==="community")openConfig(item.config,{type:"community",id:item.communityId,patternId,communityId:item.communityId})});b.addEventListener("contextmenu",e=>e.preventDefault());return b}

  function openConfig(config,source={}){
    try{
      const sourcePattern=source.patternId||source.baseId||(source.type==="base"?source.id:null);
      const nextId=inferPatternId(config,sourcePattern);
      if(!registry.ready(nextId))throw new Error("renderer_unavailable");
      if(source.patternVersion!=null&&!registry.restore({patternId:nextId,patternVersion:source.patternVersion,config:config||{},schemaVersion:source.schemaVersion}).ok)throw new Error("unsupported_version");
      // A mother/base tile opens its explicit canonical preview config, never the last user edit.
      // Last edits remain stored for personal history, but cannot silently replace the mother recipe.
      const next=cloneConfig(config||registry.defaults(nextId),nextId);
      runtimePatternId=nextId;runtimeConfig=next;
      activeSource={type:source.type||"working",id:source.id||runtimePatternId,patternId:runtimePatternId,communityId:source.communityId||null};tapTimes=[];
      const initialFrame=source.frame!=null&&Number.isFinite(Number(source.frame))?Math.max(0,Number(source.frame)):0;
      setScreen("game",initialFrame);emit("pattern-open",{patternId:runtimePatternId,sourceType:activeSource.type,sourceId:activeSource.id,communityId:activeSource.communityId,frame:initialFrame});return true;
    }catch(error){showToast("Не удалось открыть этот паттерн. Сохранённая запись остаётся доступна.");window.dispatchEvent(new CustomEvent("setka:pattern-error",{detail:{patternId:source.patternId||config?.patternId||null,reason:error.code||error.message}}));return false}
  }
  function canAnimateLibrary(){const overlay=document.getElementById("st34Layer");return !window.__SETKA_RENDER_ONLY__&&!document.hidden&&!reducedPreviewMotion.matches&&libraryScreen.classList.contains("active")&&(!overlay||overlay.classList.contains("hidden"));}
  function stopLibraryPreviews(){
    if(previewAnimation)cancelAnimationFrame(previewAnimation);
    previewAnimation=0;previewLastPaint=0;previewLastTick=0;
    // Intentionally retain previewPhase: a recreated tile must show exactly
    // where the old tile stopped, never jump back or fast-forward.
  }
  function syncLibraryPreviews(){
    if(!canAnimateLibrary()){stopLibraryPreviews();return}
    if(previewAnimation)return;
    const tick=now=>{
      if(!canAnimateLibrary()){stopLibraryPreviews();return}
      // Advance the shared phase only when a real frame is painted. If the
      // clock runs ahead between paints, a library rebuild flashes a future
      // frame instead of the exact frame the user was just looking at.
      if(!previewLastPaint||now-previewLastPaint>=PREVIEW_INTERVAL_MS){
        if(previewLastTick){
          // Bound phase advancement after Safari throttles a frame: slow down
          // gracefully instead of leaping through the geometry.
          previewPhase+=Math.max(0,Math.min(PREVIEW_MAX_STEP_MS,now-previewLastTick))/16.6667*PREVIEW_SPEED;
        }
        previewLastTick=now;
        previewLastPaint=now;
        previewPaintPhase=previewPhase;
        // Only onscreen, connected canvases participate in this paint cycle.
        // The old fixed budget of 8 skipped one of the 9 mother previews,
        // advancing its animation phase without actually drawing its frame.
        // The cursor must advance WHEN painting, not on every idle rAF.
        const visible=[];
        for(const [canvas,item] of previewTiles){
          if(!canvas.isConnected){previewTiles.delete(canvas);continue}
          const panel=canvas.closest('.pattern-panel');
          if(panel?.classList.contains('hidden-left')||panel?.classList.contains('hidden-right'))continue;
          const rect=canvas.getBoundingClientRect();
          if(rect.width<4||rect.height<4||rect.bottom<0||rect.top>innerHeight||rect.right<0||rect.left>innerWidth)continue;
          visible.push([canvas,item]);
        }
        const optimizer=window.SetkaAutoOptimizerV1;
        const selected=optimizer?.choose("library",visible,now,{
          interval:PREVIEW_INTERVAL_MS,maxPaint:previewStats.maxPerPaint
        })||null;
        if(selected){
          for(const [canvas,item] of selected){
            optimizer.paint("library",canvas,item.patternId,now,
              ()=>drawThumbnail(canvas,item.config,previewFrame(item.frame),item.patternId));
            previewStats.frames++;
          }
        }else{
          const count=Math.min(previewStats.maxPerPaint,visible.length);
          for(let i=0;i<count;i++){
            const [canvas,item]=visible[(previewCursor+i)%visible.length];
            drawThumbnail(canvas,item.config,previewFrame(item.frame),item.patternId);
            previewStats.frames++;
          }
          previewCursor=visible.length?(previewCursor+count)%visible.length:0;
        }
      }
      previewAnimation=requestAnimationFrame(tick);
    };
    previewAnimation=requestAnimationFrame(tick);
  }
  for(const event of ["setka:overlay-visibility","setka:sheet-presentation","setka:view"])window.addEventListener(event,syncLibraryPreviews);
  document.addEventListener("visibilitychange",syncLibraryPreviews);reducedPreviewMotion.addEventListener?.("change",syncLibraryPreviews);
  function drawThumbnail(el,c,f=BASE_PREVIEW_FRAME,id=null){const t=el.getContext("2d"),pid=inferPatternId(c,id);renderPattern(t,el.width,el.height,cloneConfig(c,pid),Number.isFinite(Number(f))?Number(f):BASE_PREVIEW_FRAME,true,pid)}
  function renderPreview(el,c,f=BASE_PREVIEW_FRAME,id=null){drawThumbnail(el,c,f,id)}
  function resizeMainCanvas(){const r=app.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.floor(r.width*dpr));canvas.height=Math.max(1,Math.floor(r.height*dpr));canvas.style.width=`${r.width}px`;canvas.style.height=`${r.height}px`;ctx.setTransform(dpr,0,0,dpr,0,0)}
  function startAnimation(){if(animationFrame)return;const tick=now=>{if(!gameScreen.classList.contains("active")){animationFrame=0;return}const baseFrame=(now-animationStart)/16.6667;
      // Universal audio modulation is applied to the ONE shared animation
      // clock. Pattern implementations, saved configs and thumbnails are intact.
      const sound=registry.supports(runtimePatternId,"audio")?window.SetkaAudioReactiveV1:null;
      const reactiveFrame=sound?.nextFrame?.(baseFrame,now,runtimePatternId);
      currentFrame=Number.isFinite(reactiveFrame)?Math.max(0,reactiveFrame):baseFrame;
      // Preserve the exact displayed frame when music is turned off, instead
      // of snapping back to the unmodulated wall-clock animation position.
      if(sound?.isActive?.())animationStart=now-currentFrame*16.6667;
      const r=app.getBoundingClientRect();
      const liveConfig=sound?.renderConfig?.(runtimeConfig,runtimePatternId)||runtimeConfig;
      const audioScale=sound?.viewportScale?.()||1;
      if(audioScale>1.0001){
        ctx.save();
        // The renderer owns backgroundAlpha and trail persistence.  Scaling
        // outward covers the viewport without an extra full-screen clear.
        ctx.translate(r.width/2,r.height/2);
        ctx.scale(audioScale,audioScale);
        ctx.translate(-r.width/2,-r.height/2);
      }
      // Profile actual gameplay cost without changing gameplay resolution,
      // canonical parameters, audio modulation, or the renderer.
      const optimizer=window.SetkaAutoOptimizerV1;
      if(optimizer)optimizer.paint("game",null,runtimePatternId,now,
        ()=>renderPattern(ctx,r.width,r.height,liveConfig,currentFrame,false,runtimePatternId),
        {adaptiveResolution:false});
      else renderPattern(ctx,r.width,r.height,liveConfig,currentFrame,false,runtimePatternId);
      if(audioScale>1.0001)ctx.restore();
      animationFrame=requestAnimationFrame(tick)};animationFrame=requestAnimationFrame(tick)}
  function stopAnimation(){if(animationFrame)cancelAnimationFrame(animationFrame);animationFrame=0}

  function renderPattern(t,w,h,c,f,thumb,id=null){return registry.render(t,w,h,c,f,thumb,id)}
  function colorModeCount(id=runtimePatternId){return registry.get(id)?.colorModes||1}
  function buildColorDots(){colorDots.replaceChildren();const r=42;for(let i=0;i<9;i++){const d=document.createElement("span");d.className="color-dot";const a=-90+i*40;d.style.transform=`translate(${Math.cos(rad(a))*r}px,${Math.sin(rad(a))*r}px)`;colorDots.appendChild(d)}}
  function updateColorIndicator(){instructionsButton.style.display=registry.supports(runtimePatternId,"settings")?"":"none";const n=(runtimeConfig.colorModeIndex||0)+1;[...colorDots.children].forEach((d,i)=>d.classList.toggle("visible",i<n&&i<colorModeCount()))}
  function updateFavoriteButtonState(){favoriteButton.style.display=registry.supports(runtimePatternId,"favorites")?"":"none";favoriteButton.hidden=!registry.supports(runtimePatternId,"favorites");const m=matchingFavorite();favoriteButton.textContent=m?"♥":"♡";favoriteButton.classList.toggle("saved",!!m);favoriteButton.setAttribute("aria-label",m?"Снять лайк с этой конфигурации":"Сохранить текущую конфигурацию")}
  function saveFavorite(c,f=currentFrame,meta={}){const pid=inferPatternId(c,meta.baseId||runtimePatternId);if(!registry.supports(pid,"favorites"))return null;const old=matchingFavorite(c,pid);if(old){updateFavoriteButtonState();showToast("♥ Уже сохранено");return old}const x={id:`favorite-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,baseId:pid,patternId:pid,config:cloneConfig(c,pid),previewFrame:Number.isFinite(Number(f))?Number(f):BASE_PREVIEW_FRAME,createdAt:Date.now(),communityId:meta.communityId||null,parentCommunityId:meta.parentCommunityId||activeSource.communityId||null,patternVersion:meta.patternVersion||patternById(pid).version};favorites.unshift(x);persistFavorites();updateFavoriteButtonState();renderLibrary();showToast("♥ Конфигурация сохранена");emit("favorite-saved",{favorite:{...x},origin:meta.origin||"game"});return x}
  function removeFavorite(f,origin="game"){const i=favorites.findIndex(x=>x.id===f.id);if(i<0)return false;const r=favorites.splice(i,1)[0];persistFavorites();updateFavoriteButtonState();renderLibrary();showToast("♡ Лайк снят");emit("favorite-removed",{favorite:{...r},origin});return true}
  function updateFavoriteMeta(id,patch={}){const f=favorites.find(x=>x.id===id);if(!f)return null;Object.assign(f,patch);persistFavorites();renderLibrary();updateFavoriteButtonState();return{...f}}
  function showToast(m){toast.textContent=m;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),1400)}

  function applyTentacle(x,y,dx,dy,fingers){const r=canvas.getBoundingClientRect(),L=x<r.width/3,R=x>r.width*2/3,T=y<r.height/3,B=y>r.height*2/3;if(fingers===1){if(Math.abs(dy)>Math.abs(dx)){if(L&&dy!==0)runtimeConfig.numTentacles=clamp(runtimeConfig.numTentacles+(dy>0?-1:1),3,72);if(R)runtimeConfig.circleSize=clamp(runtimeConfig.circleSize-dy*.005,.2,20)}else{if(T)runtimeConfig.lineWeight=clamp(runtimeConfig.lineWeight+dx*.01,.1,10);if(B)runtimeConfig.movementSpeed=clamp(runtimeConfig.movementSpeed+dx*.001,.05,10)}}if(fingers===2){if(L&&!B&&Math.abs(dy)>Math.abs(dx))runtimeConfig.tentacleLength=clamp(runtimeConfig.tentacleLength-dy*.2,10,800);if(R&&!B&&Math.abs(dy)>Math.abs(dx)){if(dy<0)runtimeConfig.segmentStep=Math.max(1,runtimeConfig.segmentStep-1);if(dy>0)runtimeConfig.segmentStep=Math.min(20,runtimeConfig.segmentStep+1)}if(B&&Math.abs(dx)>Math.abs(dy))runtimeConfig.colorSpeed=clamp(runtimeConfig.colorSpeed+dx*.001,.05,10)}}
  function applyDandelion(dx,dy,fingers,pinch){if(fingers===1){if(Math.abs(dx)>Math.abs(dy))runtimeConfig.tSpeed=clamp(runtimeConfig.tSpeed+dx*.00001,.001,.02);else runtimeConfig.numShapes=clamp(runtimeConfig.numShapes+(dy>0?-1:1),50,1000)}if(fingers===2){if(Math.abs(dx)>Math.abs(dy))runtimeConfig.angleSpeed=clamp(runtimeConfig.angleSpeed+dx*.00001,.001,.05);else runtimeConfig.lineWeight=clamp(runtimeConfig.lineWeight-dy*.01,.1,10);if(Number.isFinite(pinch)&&pinch>0)runtimeConfig.zoom=clamp(runtimeConfig.zoom*pinch,.2,5)}}
  function applyFish(x,y,dx,dy){const r=canvas.getBoundingClientRect();if(x<r.width*.25&&Math.abs(dy)>10)runtimeConfig.numLayers=clamp(runtimeConfig.numLayers+dy*.05,5,100);else if(x>r.width*.75&&Math.abs(dy)>10)runtimeConfig.waveAmplitude=clamp(runtimeConfig.waveAmplitude-dy*.1,0,200);else if(y<r.height*.25&&Math.abs(dx)>5)runtimeConfig.strokeW=clamp(runtimeConfig.strokeW+dx*.01,.3,8);else if(y>r.height*.75&&Math.abs(dx)>5)runtimeConfig.waveSpeed=clamp(runtimeConfig.waveSpeed+dx*.0003,.001,.2)}
  function applyBreath(x,y,dx,dy,fingers){const r=canvas.getBoundingClientRect(),L=r.width*EDGE,R=r.width*(1-EDGE),T=r.height*EDGE,B=r.height*(1-EDGE),sx=touch.startX||mouse.startX,sy=touch.startY||mouse.startY;if(sx<L){if(Math.abs(dy)>TH)runtimeConfig.branches=clamp(runtimeConfig.branches+(dy<0?1:-1),2,60);return}if(sx>R){if(Math.abs(dy)>TH)runtimeConfig.layers=clamp(runtimeConfig.layers+(dy<0?1:-1),1,10);return}if(sy<T){if(Math.abs(dx)>TH)runtimeConfig.strokeW=clamp(runtimeConfig.strokeW+(dx>0?.3:-.3),.1,8);return}if(sy>B){if(fingers===1&&Math.abs(dx)>TH)runtimeConfig.pulseSpd=clamp(runtimeConfig.pulseSpd+(dx>0?.005:-.005),.001,.3);if(fingers===2&&Math.abs(dx)>TH)runtimeConfig.pulseAmp=clamp(runtimeConfig.pulseAmp+(dx>0?.02:-.02),.05,2)}}
  function applyGrowth(x,y,dx,dy,fingers,pinch){const r=canvas.getBoundingClientRect(),L=r.width*EDGE,R=r.width*(1-EDGE),T=r.height*EDGE,B=r.height*(1-EDGE),sx=touch.startX||mouse.startX,sy=touch.startY||mouse.startY;if(fingers===2){if(Number.isFinite(pinch)&&pinch>0)runtimeConfig.zoom=clamp(runtimeConfig.zoom*pinch,.3,3);if(sy>B&&Math.abs(dx)>TH)runtimeConfig.levelSpeedRatio=clamp(runtimeConfig.levelSpeedRatio+(dx>0?.05:-.05),.2,3);return}if(sx<L&&Math.abs(dy)>TH)runtimeConfig.branches=clamp(runtimeConfig.branches+(dy<0?1:-1),2,60);else if(sx>R&&Math.abs(dy)>TH)runtimeConfig.maxDepth=clamp(runtimeConfig.maxDepth+(dy<0?1:-1),1,10);else if(sy<T&&Math.abs(dx)>TH)runtimeConfig.strokeW=clamp(runtimeConfig.strokeW+(dx>0?.3:-.3),.1,8);else if(sy>B&&Math.abs(dx)>TH)runtimeConfig.pulseSpeed=clamp(runtimeConfig.pulseSpeed+(dx>0?.005:-.005),.001,.1)}
  function applyRgb(x,y,pointerType){const r=canvas.getBoundingClientRect(),g=pointerType==="touch"?touch:mouse,dx=x-g.startX,dy=y-g.startY;if(x<r.width*.25&&Math.abs(dy)>10){runtimeConfig.numRings=clamp(runtimeConfig.numRings+dy*.05,5,100);g.startY=y;return}if(x>r.width*.75&&Math.abs(dy)>10){runtimeConfig.waveAmplitude=clamp(runtimeConfig.waveAmplitude-dy*.1,0,200);g.startY=y;return}if(y<r.height*.25&&Math.abs(dx)>5){runtimeConfig.strokeW=clamp(runtimeConfig.strokeW+dx*.01,.3,8);g.startX=x;return}if(y>r.height*.75&&Math.abs(dx)>5){runtimeConfig.waveSpeed=clamp(runtimeConfig.waveSpeed+dx*.0003,.001,.2);g.startX=x}}
  function applyDna(dx,dy,fingers,currentDist=null,currentStereoX=null){
    if(fingers===1){runtimeConfig.spacing=clamp(runtimeConfig.spacing+dy*.1,4,30);runtimeConfig.amplitude=clamp(runtimeConfig.amplitude+dx*.2,10,100);return}
    if(fingers===2){
      if(Number.isFinite(currentDist)&&Number.isFinite(touch.lastDist))runtimeConfig.zoom=clamp(runtimeConfig.zoom+(currentDist-touch.lastDist)*.005,.3,5);
      if(Number.isFinite(currentStereoX)&&Number.isFinite(touch.lastStereoX))runtimeConfig.stereoAngle=clamp(runtimeConfig.stereoAngle+(currentStereoX-touch.lastStereoX)*.0005,.01,.6);
    }
  }
  function applyGridGesture(x,y,dx,dy,fingers){
    const r=canvas.getBoundingClientRect();
    const startX=touch.fingers?touch.startX:mouse.startX;
    const startY=touch.fingers?touch.startY:mouse.startY;
    const zone=startX<r.width*.25?"left":startX>r.width*.75?"right":startY<r.height*.5?"top":"bottom";
    const c=runtimeConfig;
    if(fingers===1){
      if(zone==="left")c.cols=clamp(Math.round(c.cols-dy*.085),6,36);
      else if(zone==="right")c.amp=clamp(Math.round((c.amp-dy*.002)*100)/100,0,.45);
      else if(zone==="top")c.lineWidth=clamp(Math.round((c.lineWidth+dx*.016)*10)/10,.3,3);
      else c.speed=clamp(Math.round((c.speed+dx*.00025)*1000)/1000,.005,.08);
    }else if(fingers>=2){
      if(zone==="left")c.rows=clamp(Math.round(c.rows-dy*.07),4,24);
      else if(zone==="right")c.scale=clamp(Math.round((c.scale-dy*.004)*100)/100,.3,1.1);
      else if(zone==="top")c.phaseX=clamp(Math.round((c.phaseX+dx*.005)*100)/100,0,1.2);
      else c.hueSpeed=clamp(Math.round(c.hueSpeed+dx*.28),0,60);
    }
  }
  function applyCustomGesture(x,y,dx,dy,fingers,pinch){
    const controls=registry?.controls?.(runtimePatternId)||[];
    const r=canvas.getBoundingClientRect();
    const sx=touch.fingers?touch.startX:mouse.startX,sy=touch.fingers?touch.startY:mouse.startY;
    const zone=sx<r.width*.25?"left":sx>r.width*.75?"right":sy<r.height*.5?"top":"bottom";
    for(const [label,key,min,max,step,gesture,count] of controls){
      if(count!==Math.min(fingers,2))continue;
      const requested=gesture.includes("Слева")?"left":gesture.includes("Справа")?"right":
        gesture.includes("Сверху")?"top":gesture.includes("Снизу")?"bottom":null;
      if(requested!==zone && requested!==null)continue;
      if(!requested&&!gesture.includes("Пинч"))continue;
      const base=runtimeConfig[key];if(!Number.isFinite(base))continue;
      const d=gesture.includes("Пинч")?base*(Number.isFinite(pinch)?pinch-1:0):
        gesture.includes("↑↓")?(-dy/r.height)*(max-min):
        (dx/r.width)*(max-min);
      const next=clamp(base+d,min,max);
      runtimeConfig[key]=step>=1?Math.round(next):Number((Math.round(next/step)*step).toFixed(6));
      break;
    }
  }
  function applyPatternGesture(x,y,dx,dy,fingers,pinch=null,pointerType="touch",currentDist=null,currentStereoX=null){const before=configKey(runtimeConfig,runtimePatternId);if(runtimePatternId===DANDELION_ID)applyDandelion(dx,dy,fingers,pinch);else if(runtimePatternId===FISH_ID)applyFish(x,y,dx,dy);else if(runtimePatternId===BREATH_ID)applyBreath(x,y,dx,dy,fingers);else if(runtimePatternId===GROWTH_ID)applyGrowth(x,y,dx,dy,fingers,pinch);else if(runtimePatternId===RGB_ID)applyRgb(x,y,pointerType);else if(runtimePatternId===DNA_ID)applyDna(dx,dy,fingers,currentDist,currentStereoX);else if(runtimePatternId===GRID_ID)applyGridGesture(x,y,dx,dy,fingers);else if(customRenderers.has(runtimePatternId))applyCustomGesture(x,y,dx,dy,fingers,pinch);else applyTentacle(x,y,dx,dy,fingers);const changed=before!==configKey(runtimeConfig,runtimePatternId);runtimeConfig=cloneConfig(runtimeConfig,runtimePatternId);if(changed)updateFavoriteButtonState();return changed}
  function cycleColor(origin="button"){const count=colorModeCount();if(count<=1)return;const from=runtimeConfig.colorModeIndex||0;runtimeConfig.colorModeIndex=(from+1)%count;updateColorIndicator();updateFavoriteButtonState();emit("color",{from,to:runtimeConfig.colorModeIndex,origin})}
  function patternTap(x,y){const now=performance.now(),limit=runtimePatternId===RGB_ID?600:runtimePatternId===DANDELION_ID?300:450;tapTimes=tapTimes.filter(t=>now-t<limit);tapTimes.push(now);if(runtimePatternId===DANDELION_ID&&tapTimes.length===1){const r=canvas.getBoundingClientRect();if(Math.hypot(x-r.width/2,y-r.height/2)<100){runtimeConfig.v1History=[...(runtimeConfig.v1History||[]),runtimeConfig.v1].slice(-64);runtimeConfig.v1=Math.random()*.4+.2;updateFavoriteButtonState();emit("pattern-special",{action:"new-v1",v1:runtimeConfig.v1})}else if(y>r.height*.85&&runtimeConfig.v1History?.length){const h=[...runtimeConfig.v1History];runtimeConfig.v1=h.pop();runtimeConfig.v1History=h;updateFavoriteButtonState();emit("pattern-special",{action:"undo-v1",v1:runtimeConfig.v1})}}if(runtimePatternId!==DNA_ID&&tapTimes.length>=3&&tapTimes.at(-1)-tapTimes.at(-3)<limit){cycleColor("triple-tap");tapTimes=[]}}
  // A "Тап" control is declared once in the pattern descriptor. Unlike a
  // swipe, it commits only when the finger is released without dragging.
  function applyPluginTap(){
    if(!customRenderers.has(runtimePatternId))return;
    const tap=registry.controls(runtimePatternId).find(row=>row[5]==="Тап"&&row[6]===1);
    if(!tap)return;
    const [,key,min,max,step]=tap,now=Number(runtimeConfig[key]);
    const next=Number.isFinite(now)&&now+step<=max+1e-9?now+step:min;
    runtimeConfig=cloneConfig({...runtimeConfig,[key]:next},runtimePatternId);
    updateFavoriteButtonState();
    emit("gesture-move",{origin:"tap",key});
  }
  function localTouch(t){const r=canvas.getBoundingClientRect();return{x:t.clientX-r.left,y:t.clientY-r.top}}
  function primary(ts){if(!ts.length)return null;if(touch.primaryId!==null)for(const t of ts)if(t.identifier===touch.primaryId)return t;return ts[0]}
  function distance(ts){return ts.length<2?null:Math.hypot(ts[0].clientX-ts[1].clientX,ts[0].clientY-ts[1].clientY)}
  function norm(x,y){const r=canvas.getBoundingClientRect();return{x:r.width?x/r.width:0,y:r.height?y/r.height:0}}

  canvas.addEventListener("touchstart",e=>{e.preventDefault();const p0=primary(e.touches);if(!p0)return;if(touch.primaryId===null)touch.primaryId=p0.identifier;const p=localTouch(p0);touch.fingers=e.touches.length;touch.x=touch.startX=p.x;touch.y=touch.startY=p.y;touch.tapEligible=e.touches.length===1;touch.tapStartedAt=performance.now();if(e.touches.length>1){const p2=localTouch(e.touches[1]);touch.secondX=p2.x;touch.secondY=p2.y;touch.lastStereoX=(p.x+p2.x)/2}else{touch.secondX=touch.secondY=0;touch.lastStereoX=null}if(e.touches.length===1)patternTap(p.x,p.y);touch.lastDist=distance(e.touches);emit("gesture-start",{fingers:touch.fingers,...norm(p.x,p.y)})},{passive:false});
  canvas.addEventListener("touchmove",e=>{e.preventDefault();const p0=primary(e.touches);if(!p0)return;const p=localTouch(p0),dx=p.x-touch.x,dy=p.y-touch.y,nd=distance(e.touches),ratio=nd&&touch.lastDist?nd/touch.lastDist:null;let stereoX=null;if(e.touches.length>1){const p2=localTouch(e.touches[1]);touch.secondX=p2.x;touch.secondY=p2.y;stereoX=(p.x+p2.x)/2}touch.fingers=e.touches.length;if(e.touches.length!==1||Math.hypot(p.x-touch.startX,p.y-touch.startY)>12)touch.tapEligible=false;const changed=applyPatternGesture(p.x,p.y,dx,dy,touch.fingers,ratio,"touch",nd,stereoX);touch.x=p.x;touch.y=p.y;if(Number.isFinite(nd))touch.lastDist=nd;if(Number.isFinite(stereoX))touch.lastStereoX=stereoX;if(changed)emit("gesture-move",{fingers:touch.fingers,...norm(p.x,p.y),dx,dy})},{passive:false});
  function endTouch(e){e.preventDefault();if(!e.touches.length){if(e.type==="touchend"&&touch.tapEligible&&performance.now()-touch.tapStartedAt<550)applyPluginTap();emit("gesture-end",{fingers:touch.fingers});touch.tapEligible=false;touch.fingers=0;touch.primaryId=null;touch.lastDist=null;touch.lastStereoX=null;touch.startX=touch.startY=0}else{const p0=primary(e.touches);if(p0){const p=localTouch(p0);touch.fingers=e.touches.length;touch.x=touch.startX=p.x;touch.y=touch.startY=p.y;touch.lastDist=distance(e.touches);if(e.touches.length>1){const p2=localTouch(e.touches[1]);touch.lastStereoX=(p.x+p2.x)/2}else touch.lastStereoX=null}}}
  canvas.addEventListener("touchend",endTouch,{passive:false});canvas.addEventListener("touchcancel",endTouch,{passive:false});
  canvas.addEventListener("mousedown",e=>{e.preventDefault();const r=canvas.getBoundingClientRect();mouse.down=true;mouse.fingers=e.shiftKey?2:1;mouse.x=mouse.startX=e.clientX-r.left;mouse.y=mouse.startY=e.clientY-r.top;mouse.tapStartedAt=performance.now();if(mouse.fingers===1)patternTap(mouse.x,mouse.y);emit("gesture-start",{fingers:mouse.fingers,desktop:true,...norm(mouse.x,mouse.y)})});
  window.addEventListener("mousemove",e=>{if(!mouse.down)return;const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,dx=x-mouse.x,dy=y-mouse.y;mouse.fingers=e.shiftKey?2:1;const changed=applyPatternGesture(x,y,dx,dy,mouse.fingers,null,"mouse",null,null);mouse.x=x;mouse.y=y;if(changed)emit("gesture-move",{fingers:mouse.fingers,desktop:true,...norm(x,y),dx,dy})});
  window.addEventListener("mouseup",()=>{if(mouse.down&&mouse.fingers===1&&Math.hypot(mouse.x-mouse.startX,mouse.y-mouse.startY)<=12&&performance.now()-mouse.tapStartedAt<550)applyPluginTap();if(mouse.down)emit("gesture-end",{fingers:mouse.fingers,desktop:true});mouse.down=false});

  function instructionsHTML(){if(runtimePatternId===DANDELION_ID)return'<h2 id="instructionsTitle">Управление · Одуванчик</h2><div class="gesture-group"><strong>Тапы</strong><div class="gesture-row"><span>Центр</span><span>Новая фигура</span></div><div class="gesture-row"><span>Низ</span><span>Шаг назад</span></div><div class="gesture-row"><span>3 тапа</span><span>Следующий цветовой режим</span></div></div><div class="gesture-group"><strong>1 палец</strong><div class="gesture-row"><span>←→</span><span>Скорость развития формы</span></div><div class="gesture-row"><span>↑↓</span><span>Количество линий</span></div></div><div class="gesture-group"><strong>2 пальца</strong><div class="gesture-row"><span>←→</span><span>Скорость вращения</span></div><div class="gesture-row"><span>↑↓</span><span>Толщина линий</span></div><div class="gesture-row"><span>Пинч</span><span>Масштаб</span></div></div><button class="close-modal" type="button">Понятно</button>';if(runtimePatternId===FISH_ID)return'<h2 id="instructionsTitle">Управление · Носовая волна</h2><div class="gesture-group"><strong>1 палец</strong><div class="gesture-row"><span>Слева ↑↓</span><span>Количество слоёв</span></div><div class="gesture-row"><span>Справа ↑↓</span><span>Амплитуда волны</span></div><div class="gesture-row"><span>Сверху ←→</span><span>Толщина линий</span></div><div class="gesture-row"><span>Снизу ←→</span><span>Скорость волны</span></div></div><div class="gesture-group"><strong>Тапы</strong><div class="gesture-row"><span>3 тапа</span><span>Голубой → белый → радуга</span></div></div><button class="close-modal" type="button">Понятно</button>';if(runtimePatternId===BREATH_ID)return'<h2 id="instructionsTitle">Управление · Breathing Fractal</h2><div class="gesture-group"><strong>Изолированные зоны</strong><div class="gesture-row"><span>Слева ↑↓</span><span>Количество лепестков / ветвей</span></div><div class="gesture-row"><span>Справа ↑↓</span><span>Глубина ветвления</span></div><div class="gesture-row"><span>Сверху ←→</span><span>Толщина линий</span></div><div class="gesture-row"><span>Снизу ←→</span><span>1 палец — скорость дыхания</span></div><div class="gesture-row"><span>Снизу ←→</span><span>2 пальца — амплитуда дыхания</span></div></div><div class="gesture-group"><strong>Тапы</strong><div class="gesture-row"><span>3 тапа</span><span>Белый → голубой → радуга</span></div></div><button class="close-modal" type="button">Понятно</button>';if(runtimePatternId===GROWTH_ID)return'<h2 id="instructionsTitle">Управление · Breathing Fractal · Growth</h2><div class="gesture-group"><strong>1 палец</strong><div class="gesture-row"><span>Слева ↑↓</span><span>Количество ветвей</span></div><div class="gesture-row"><span>Справа ↑↓</span><span>Глубина роста</span></div><div class="gesture-row"><span>Сверху ←→</span><span>Толщина линий</span></div><div class="gesture-row"><span>Снизу ←→</span><span>Скорость полного цикла</span></div></div><div class="gesture-group"><strong>2 пальца</strong><div class="gesture-row"><span>Пинч</span><span>Масштаб</span></div><div class="gesture-row"><span>Снизу ←→</span><span>Скорость раскрытия уровней</span></div></div><div class="gesture-group"><strong>Тапы</strong><div class="gesture-row"><span>3 тапа</span><span>Белый → голубой → радуга</span></div></div><button class="close-modal" type="button">Понятно</button>';if(runtimePatternId===RGB_ID)return'<h2 id="instructionsTitle">Управление · RGB Glitch Rings</h2><div class="gesture-group"><strong>1 палец</strong><div class="gesture-row"><span>Слева ↑↓</span><span>Количество колец</span></div><div class="gesture-row"><span>Справа ↑↓</span><span>Амплитуда волны</span></div><div class="gesture-row"><span>Сверху ←→</span><span>Толщина RGB-линий</span></div><div class="gesture-row"><span>Снизу ←→</span><span>Скорость волны</span></div></div><div class="gesture-group"><strong>Тапы</strong><div class="gesture-row"><span>3 тапа</span><span>Без наложения → розовый → радуга</span></div></div><div class="gesture-note">RGB-глич остаётся RGB во всех режимах.</div><button class="close-modal" type="button">Понятно</button>';if(runtimePatternId===DNA_ID)return'<h2 id="instructionsTitle">Управление · Stereo DNA</h2><div class="gesture-group"><strong>1 палец</strong><div class="gesture-row"><span>↑↓</span><span>Плотность ДНК: меняется расстояние между точками</span></div><div class="gesture-row"><span>←→</span><span>Амплитуда спирали</span></div></div><div class="gesture-group"><strong>2 пальца</strong><div class="gesture-row"><span>Пинч</span><span>Масштаб</span></div><div class="gesture-row"><span>Вместе ←→</span><span>Стереоугол / глубина объёма</span></div></div><div class="gesture-note">Две ДНК движутся синхронно; лёгкий след сохраняется между кадрами.</div><button class="close-modal" type="button">Понятно</button>';return'<h2 id="instructionsTitle">Управление паттерном</h2><div class="gesture-group"><strong>1 палец</strong><div class="gesture-row"><span>Слева ↑↓</span><span>Количество щупалец</span></div><div class="gesture-row"><span>Справа ↑↓</span><span>Размер кругов</span></div><div class="gesture-row"><span>Сверху ←→</span><span>Толщина линий</span></div><div class="gesture-row"><span>Снизу ←→</span><span>Скорость движения</span></div></div><div class="gesture-group"><strong>2 пальца</strong><div class="gesture-row"><span>Слева ↑↓</span><span>Длина щупалец</span></div><div class="gesture-row"><span>Справа ↑↓</span><span>Плотность кругов</span></div><div class="gesture-row"><span>Снизу ←→</span><span>Скорость цвета</span></div></div><button class="close-modal" type="button">Понятно</button>'}

  colorButton.addEventListener("click",()=>cycleColor("button"));favoriteButton.addEventListener("click",()=>{const m=matchingFavorite();if(m)removeFavorite(m,"game");else saveFavorite(runtimeConfig,currentFrame,{origin:"game",baseId:runtimePatternId,parentCommunityId:activeSource.communityId||null})});libraryButton.addEventListener("click",()=>{activeLibraryPage="all";setScreen("library")});instructionsButton.addEventListener("click",()=>{const p=instructionsModal.querySelector(".instructions");if(p){p.innerHTML=instructionsHTML();const heading=p.querySelector("h2");if(heading)heading.textContent=`Управление · ${patternById(runtimePatternId).title}`}instructionsModal.classList.add("open");emit("instructions-open")});instructionsModal.addEventListener("click",e=>{if(e.target===instructionsModal||e.target.closest?.(".close-modal")){instructionsModal.classList.remove("open");emit("instructions-close")}});
  function cyclePattern(dir){let i=PATTERNS.findIndex(p=>p.id===runtimePatternId);if(i<0)i=0;i=(i+dir+PATTERNS.length)%PATTERNS.length;const p=PATTERNS[i];openConfig(registry.defaults(p.id),{type:"base",id:p.id,patternId:p.id,communityId:null})}
  prevButton.addEventListener("click",()=>cyclePattern(-1));nextButton.addEventListener("click",()=>cyclePattern(1));libraryPagerButton.addEventListener("click",()=>setLibraryPage("all"));communityPagerButton.addEventListener("click",()=>setLibraryPage("community"));favoritesPagerButton.addEventListener("click",()=>setLibraryPage("favorites"));let swipe=null;librarySwipeArea.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;swipe={x:e.clientX,y:e.clientY}});librarySwipeArea.addEventListener("pointerup",e=>{if(!swipe)return;const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;swipe=null;if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.2)return;let i=PAGE_ORDER.indexOf(activeLibraryPage);i+=dx<0?1:-1;setLibraryPage(PAGE_ORDER[clamp(i,0,PAGE_ORDER.length-1)])});librarySwipeArea.addEventListener("pointercancel",()=>swipe=null);window.addEventListener("resize",()=>{if(gameScreen.classList.contains("active"))resizeMainCanvas();syncLibraryPreviews()});document.addEventListener("visibilitychange",()=>{if(document.hidden)stopAnimation();else if(gameScreen.classList.contains("active"))startAnimation()});

  function registerPattern(def){
    if(!def||typeof def.render!=="function")throw new Error("renderer_required");
    if(!registry.has(def.id))registry.register(def);
    registry.bindRenderer(def.id,def.render);
    syncRegistry();
    return {id:def.id,title:registry.title(def.id),version:registry.get(def.id).version};
  }
  function syncRegistry(){
    for(const p of registry.list())if(!IDS.has(p.id)){PATTERNS.push({...p,title:registry.title(p.id)});IDS.add(p.id);customRenderers.set(p.id,true)}
    // Retry every saved record when a renderer appears; no mutation of raw
    // localStorage or user archive, including unknown legacy pattern IDs.
    favorites=loadFavorites();
    renderLibrary();
  }
  window.addEventListener("setka:renderer-ready",()=>{if(window.SetkaApp)syncRegistry()});
  // Display metadata is applied to the registry; UI subscribers update labels.
  function refreshPatternTitles(){
    for(const p of PATTERNS)p.title=registry.title(p.id);
    document.querySelectorAll('.pattern-tile[data-kind="base"]').forEach(tile=>tile.setAttribute("aria-label",`Открыть паттерн ${registry.title(tile.dataset.patternId)}. Удерживай, чтобы сохранить`));
  }
  window.addEventListener("setka:pattern-names",refreshPatternTitles);
  window.SetkaApp={setPatternTitles:rows=>registry.setTitles(rows),restorePersonalConfigs,exportPersonalConfigs:()=>JSON.parse(JSON.stringify(lastConfigs)),previewStatus:()=>({...previewStats,registered:previewTiles.size,
    autonomous:window.SetkaAutoOptimizerV1?.status?.()||null}),registerPattern,getState:()=>statePayload(),getConfig:()=>cloneConfig(runtimeConfig,runtimePatternId),getFavorites:()=>favorites.map(f=>f.unavailable?JSON.parse(JSON.stringify(f)):({...f,config:cloneConfig(f.config,f.baseId)})),setConfigPatch:(patch={})=>{if(!patch||typeof patch!=="object")return cloneConfig(runtimeConfig,runtimePatternId);const before=configKey(runtimeConfig,runtimePatternId);runtimeConfig=cloneConfig({...runtimeConfig,...patch,patternId:runtimePatternId},runtimePatternId);if(before!==configKey(runtimeConfig,runtimePatternId)){updateFavoriteButtonState();updateColorIndicator();emit("gesture-move",{origin:"slider"})}return cloneConfig(runtimeConfig,runtimePatternId)},getPatterns:()=>PATTERNS.map(p=>({id:p.id,title:registry.title(p.id),version:p.version,defaults:registry.defaults(p.id)})),getPatternDefaults:id=>IDS.has(id)?registry.defaults(id):null,getPatternTitle:id=>registry.title(id),cloneConfig,configKey,openConfig,renderPreview,setCommunity(items){communityItems=Array.isArray(items)?items.map(normalizeCommunityItem):[];renderLibrary()},setRecommendations(data={}){recommendedCommunity=new Set((data.community||[]).map(String));recommendedPatterns=new Set((data.patterns||[]).map(String));renderLibrary()},updateFavoriteMeta,refreshFavorites(){favorites=loadFavorites();renderLibrary();updateFavoriteButtonState()},renderLibrary,setLibraryPage,finishCurrentUsageHint(){return statePayload()},DEFAULT_CONFIG:cloneConfig(TENTACLE_DEFAULT,TENTACLE_ID),DANDELION_DEFAULT:cloneConfig(DANDELION_DEFAULT,DANDELION_ID),FISH_DEFAULT:cloneConfig(FISH_DEFAULT,FISH_ID),BREATHING_FRACTAL_DEFAULT:cloneConfig(BREATH_DEFAULT,BREATH_ID),BREATHING_GROWTH_DEFAULT:cloneConfig(GROWTH_DEFAULT,GROWTH_ID),RGB_RINGS_DEFAULT:cloneConfig(RGB_DEFAULT,RGB_ID),STEREO_DNA_DEFAULT:cloneConfig(DNA_DEFAULT,DNA_ID),BREATHING_GRID_DEFAULT:cloneConfig(GRID_DEFAULT,GRID_ID)};
  window.addEventListener("setka:catalog-updated",()=>{for(const p of PATTERNS)p.defaults=registry.defaults(p.id);renderLibrary()});
  registry?.attachEngine?.(window.SetkaApp);
  // Startup is read-only: do not overwrite saved favorites with a temporary
  // normalization result before all plug-in renderers/accounts have loaded.
  buildColorDots();updateColorIndicator();updateFavoriteButtonState();renderLibrary();emit("ready",{});

})();
