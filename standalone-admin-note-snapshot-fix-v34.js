(() => {
  "use strict";

  let notes = [];
  let previewApp = null;
  const originalFetch = window.fetch.bind(window);
  const VC = window.__SETKA_VISUAL_CACHE_V40__;

  window.fetch = async function(input, init) {
    const response = await originalFetch(input, init);
    try {
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
      if (body?.action === "admin-notes") {
        response.clone().json().then(data => {
          notes = Array.isArray(data?.items) ? data.items : [];
          scheduleRepair();
        }).catch(() => {});
      }
    } catch (_) {}
    return response;
  };

  function makePreviewEngine() {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.cssText = "position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;border:0;opacity:0;pointer-events:none";
    frame.srcdoc = `<!doctype html><html><body style="margin:0;background:#000"><script>window.SetkaPatternRegistryV1=parent.SetkaPatternRegistryV1;<\/script><main id="app"><section id="libraryScreen" class="screen active"><button id="libraryPagerButton"></button><button id="communityPagerButton"></button><button id="favoritesPagerButton"></button><div id="libraryTitle"></div><div id="librarySwipeArea"></div><div id="allPatternsPanel"></div><div id="communityPanel"></div><div id="favoritesPanel"></div></section><section id="gameScreen" class="screen"><canvas id="patternCanvas" width="320" height="320"></canvas><button id="favoriteButton"></button><button id="libraryButton"></button><button id="prevButton"></button><button id="nextButton"></button><button id="colorButton"></button><div id="colorDots"></div><button id="instructionsButton"></button><div id="instructionsModal"><div class="instructions"></div></div><div id="toast"></div></section></main><script src="app-v7-multipattern.js?v=1.6-registry-dna-admin-20261020"><\/script><script src="standalone-pattern-plugins-v1.js?v=1.0-auto-registry"><\/script></body></html>`;
    frame.onload = () => {
      let tries = 0;
      const wait = () => {
        previewApp = frame.contentWindow?.SetkaApp || null;
        if (previewApp?.renderPreview) {
          scheduleRepair();
          window.dispatchEvent(new CustomEvent("setka:admin-preview-ready"));
        } else if (tries++ < 60) setTimeout(wait, 50);
      };
      wait();
    };
    document.body.appendChild(frame);
  }

  function sizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round((rect.width || 320) * dpr)), height = Math.max(1, Math.round((rect.height || 220) * dpr));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }

  function pidOf(item) {
    const c = item?.replaySnapshot?.config || item?.replay_snapshot?.config || item?.config || {};
    const known=new Set(window.SetkaPatternRegistryV1?.ids?.()||previewApp?.getPatterns?.().map(p=>p.id)||[]);
    for(const v of [item?.replaySnapshot?.patternId,item?.replay_snapshot?.patternId,item?.pattern_id,item?.patternId,item?.visualRecipe?.patternId,item?.visual_snapshot?.patternId,item?.visualSnapshot?.patternId,c.patternId]){
      if(known.has(v))return v;
    }
    // Structural inference is for legacy notes without an explicit identity only.
    const registered=window.SetkaPatternRegistryV1?.inference?.(c);
    if(registered)return registered;
    if (c.eyeSeparation != null || c.stereoAngle != null || (c.angleStep != null && c.numPoints != null)) return "stereo-dna";
    if (c.numRings != null || c.baseSpacing != null || c.invertDirection != null) return "rgb-glitch-rings";
    if (c.numLayers != null || c.ringSpacing != null) return "fish-wave";
    if (c.maxDepth != null || c.levelSpeedRatio != null || c.firstLevelFactor != null || (c.pulseSpeed != null && c.branches != null)) return "breathing-fractal-growth";
    if (c.pulseSpd != null || c.pulseAmp != null || (c.layers != null && c.branches != null)) return "breathing-fractal";
    if (c.v1 != null || c.numShapes != null || c.angleSpeed != null || c.tSpeed != null || c.backgroundAlpha != null) return "dandelion";
    if (c.numTentacles != null || c.tentacleLength != null || c.circleSize != null || c.segmentStep != null) return "tentacle-orbit";
    return item?.visualRecipe?.patternId || item?.visual_snapshot?.patternId || item?.visualSnapshot?.patternId || item?.pattern_id || item?.patternId || c.patternId || null;
  }

  function recipeOf(item) {
    const pid = pidOf(item), replay=item?.replaySnapshot || item?.replay_snapshot || {}, snap = item?.visual_snapshot || item?.visualSnapshot || {}, vr = item?.visualRecipe || {};
    const base = {
      patternId:pid,
      patternVersion:replay.patternVersion || vr.patternVersion || snap.patternVersion || item?.pattern_version || item?.patternVersion || 1,
      configHash:vr.configHash || snap.configHash || item?.config_hash || item?.configKey || null,
      frame:replay.frame ?? item?.preview_frame ?? item?.previewFrame ?? item?.frame ?? vr.frame ?? snap.frame ?? 44,
      seed:vr.seed ?? snap.seed ?? null,
      config:replay.config || item?.config || vr.config || {}
    };
    return VC?.recipe ? VC.recipe(base) : {...base,recipeVersion:1,rendererVersion:"app-v7"};
  }

  function drawLegacySnapshot(canvas, snapshot, recipe) {
    const src = snapshot?.dataUrl;
    if (!src) return false;
    const img = new Image();
    img.onload = () => {
      sizeCanvas(canvas);
      const ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
      ctx.fillStyle = "#000"; ctx.fillRect(0,0,w,h);
      const scale = Math.min(w / img.width, h / img.height), dw = img.width * scale, dh = img.height * scale;
      ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);
      canvas.dataset.snapshotKind = "legacy-exact";
      VC?.putDataUrl?.(src,recipe).catch?.(() => {});
    };
    img.src = src;
    return true;
  }

  function renderSemantic(canvas, item, recipe) {
    if (!recipe?.config || !previewApp?.renderPreview) return false;
    try {
      previewApp.renderPreview(canvas, recipe.config, recipe.frame ?? 44, recipe.patternId);
      canvas.dataset.snapshotKind = "reconstructed";
      return true;
    } catch (e) { console.warn("SETKA admin preview failed", e); return false; }
  }

  // Shared parent-side animation scheduler. Admin thumbnails and note replay
  // are semantic Canvas2D drawings just like front-end previews, not cached
  // JPEGs or one-time screenshots. Render at most 8 visible canvases at 20fps.
  const liveEntries=new Map();
  let liveTickHandle=0,lastLive=0,livePhase=0,roundRobin=0;
  const previewVisible=c=>{
    if(!c.isConnected||document.hidden||!c.getClientRects().length)return false;
    if(c.closest("[hidden],.hidden,[aria-hidden='true']"))return false;
    const b=c.getBoundingClientRect(),css=getComputedStyle(c);
    return css.display!=="none"&&css.visibility!=="hidden"&&
      b.width>4&&b.height>4&&b.bottom>0&&b.top<innerHeight&&b.left<innerWidth&&b.right>0;
  };
  function registerLive(canvas,recipe){
    if(!recipe?.patternId||!recipe?.config||!canvas)return;
    liveEntries.set(canvas,{config:JSON.parse(JSON.stringify(recipe.config)),
      patternId:recipe.patternId,frame:Number(recipe.frame)||44});
    if(!liveTickHandle)liveTickHandle=requestAnimationFrame(tickLive);
  }
  function tickLive(now){
    liveTickHandle=0;
    for(const canvas of liveEntries.keys())if(!canvas.isConnected)liveEntries.delete(canvas);
    if(!liveEntries.size)return;
    if(!lastLive||now-lastLive>=50){
      if(lastLive)livePhase+=Math.min(80,now-lastLive)/16.6667*.85;
      lastLive=now;
      const visible=[...liveEntries].filter(([canvas])=>previewVisible(canvas));
      for(let i=0;i<Math.min(8,visible.length);i++){
        const [canvas,item]=visible[(roundRobin+i)%visible.length];
        try{previewApp?.renderPreview?.(canvas,item.config,item.frame+livePhase,item.patternId);
          canvas.dataset.snapshotKind="live-semantic";}catch(_){}
      }
      if(visible.length)roundRobin=(roundRobin+8)%visible.length;
    }
    liveTickHandle=requestAnimationFrame(tickLive);
  }
  function renderCanvas(canvas, item) {
    if (!canvas || !item) return false;
    sizeCanvas(canvas);
    const recipe = recipeOf(item), snapshot = item.visual_snapshot || item.visualSnapshot || null;
    const live = !!previewApp?.renderPreview && !!recipe?.config &&
      !!window.SetkaPatternRegistryV1?.has?.(recipe.patternId);
    if(live){
      renderSemantic(canvas,item,recipe);
      registerLive(canvas,recipe);
    }else{
      const exact=drawLegacySnapshot(canvas,snapshot,recipe);
      if(!exact)renderSemantic(canvas,item,recipe);
    }
    canvas.dataset.snapshotPatternId = recipe.patternId || "";
    const caption = canvas.parentElement?.querySelector?.(".v4-preview-caption"), title = recipe.patternId && previewApp?.getPatternTitle?.(recipe.patternId);
    if (caption) caption.textContent = `ПАТТЕРН В МОМЕНТ ЗАМЕТКИ${title ? ` · ${String(title).toUpperCase()}` : ""}`;
    return true;
  }

  function repair() {
    if (!notes.length) return;
    document.querySelectorAll("canvas[data-note-preview]").forEach(canvas => {
      const index = Number(canvas.dataset.notePreview);
      if (Number.isInteger(index) && notes[index]) renderCanvas(canvas, notes[index]);
    });
  }

  let repairTimer = 0;
  function scheduleRepair() {
    clearTimeout(repairTimer);
    requestAnimationFrame(() => requestAnimationFrame(repair));
    repairTimer = setTimeout(repair, 150);
  }

  new MutationObserver(records => {
    if (records.some(r => [...r.addedNodes].some(n => n.nodeType === 1))) scheduleRepair();
  }).observe(document.documentElement, { childList: true, subtree: true });

  makePreviewEngine();
  window.addEventListener("resize", scheduleRepair);
  window.__SETKA_ADMIN_NOTE_SNAPSHOT_FIX_V34__ = {version:7,repair:scheduleRepair,renderCanvas,registerLive,getPatternTitle:id=>previewApp?.getPatternTitle?.(id)||id||"Паттерн",get ready(){return !!previewApp?.renderPreview}};
})();