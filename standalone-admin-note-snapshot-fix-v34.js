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
    frame.srcdoc = `<!doctype html><html><body style="margin:0;background:#000"><main id="app"><section id="libraryScreen" class="screen active"><button id="libraryPagerButton"></button><button id="communityPagerButton"></button><button id="favoritesPagerButton"></button><div id="libraryTitle"></div><div id="librarySwipeArea"></div><div id="allPatternsPanel"></div><div id="communityPanel"></div><div id="favoritesPanel"></div></section><section id="gameScreen" class="screen"><canvas id="patternCanvas" width="320" height="320"></canvas><button id="favoriteButton"></button><button id="libraryButton"></button><button id="prevButton"></button><button id="nextButton"></button><button id="colorButton"></button><div id="colorDots"></div><button id="instructionsButton"></button><div id="instructionsModal"><div class="instructions"></div></div><div id="toast"></div></section></main><script src="app-v7-multipattern.js?v=34-native-seven-patterns-stereo-dna-1"><\/script></body></html>`;
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
    const c = item?.config || {};
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
    const pid = pidOf(item), snap = item?.visual_snapshot || item?.visualSnapshot || {}, vr = item?.visualRecipe || {};
    const base = {
      patternId:pid,
      patternVersion:vr.patternVersion || snap.patternVersion || item?.pattern_version || item?.patternVersion || 1,
      configHash:vr.configHash || snap.configHash || item?.config_hash || item?.configKey || null,
      frame:vr.frame ?? snap.frame ?? item?.preview_frame ?? item?.previewFrame ?? item?.frame ?? 44,
      seed:vr.seed ?? snap.seed ?? null,
      config:item?.config || vr.config || {}
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
    if (!item?.config || !previewApp?.renderPreview) return false;
    try {
      previewApp.renderPreview(canvas, item.config, recipe.frame ?? 44, recipe.patternId);
      canvas.dataset.snapshotKind = "reconstructed";
      return true;
    } catch (e) { console.warn("SETKA admin preview failed", e); return false; }
  }

  function renderCanvas(canvas, item) {
    if (!canvas || !item) return false;
    sizeCanvas(canvas);
    const recipe = recipeOf(item), snapshot = item.visual_snapshot || item.visualSnapshot || null;
    const exact = drawLegacySnapshot(canvas, snapshot, recipe);
    if (!exact) {
      renderSemantic(canvas,item,recipe);
      if (VC?.draw) VC.draw(canvas, VC.cacheKey(recipe)).then(hit => {
        if (hit) canvas.dataset.snapshotKind = "device-cache";
        else VC.putCanvas?.(canvas,recipe).catch?.(() => {});
      }).catch(() => {});
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
  window.__SETKA_ADMIN_NOTE_SNAPSHOT_FIX_V34__ = {version:6,repair:scheduleRepair,renderCanvas,getPatternTitle:id=>previewApp?.getPatternTitle?.(id)||id||"Паттерн",get ready(){return !!previewApp?.renderPreview}};
})();