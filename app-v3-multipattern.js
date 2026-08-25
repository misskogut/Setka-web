(() => {
  "use strict";

  const STORAGE_FAVORITES = "setka-web:favorites:v1";
  const TENTACLE_ID = "tentacle-orbit";
  const DANDELION_ID = "dandelion";
  const BASE_PREVIEW_FRAME = 44;

  const TENTACLE_DEFAULT = Object.freeze({
    patternId: TENTACLE_ID,
    numTentacles: 24,
    tentacleLength: 100,
    baseRadius: 10,
    movementSpeed: 1,
    colorSpeed: 1,
    circleSize: 1,
    lineWeight: 1,
    segmentStep: 2,
    colorModeIndex: 0
  });

  const DANDELION_DEFAULT = Object.freeze({
    patternId: DANDELION_ID,
    v1: 0.473,
    numShapes: 380,
    angleSpeed: 0.01,
    tSpeed: 0.005,
    backgroundAlpha: 255,
    lineWeight: 1.2,
    pointSize: 4,
    zoom: 1,
    colorModeIndex: 0,
    v1History: []
  });

  const PATTERNS = [
    { id: TENTACLE_ID, title: "Tentacle Orbit", defaults: TENTACLE_DEFAULT, version: 1 },
    { id: DANDELION_ID, title: "Одуванчик", defaults: DANDELION_DEFAULT, version: 1 }
  ];
  const PAGE_ORDER = ["all", "community", "favorites"];

  const $ = id => document.getElementById(id);
  const app = $("app");
  const libraryScreen = $("libraryScreen");
  const gameScreen = $("gameScreen");
  const allPatternsPanel = $("allPatternsPanel");
  const communityPanel = $("communityPanel");
  const favoritesPanel = $("favoritesPanel");
  const libraryPagerButton = $("libraryPagerButton");
  const communityPagerButton = $("communityPagerButton");
  const favoritesPagerButton = $("favoritesPagerButton");
  const libraryTitle = $("libraryTitle");
  const librarySwipeArea = $("librarySwipeArea");
  const canvas = $("patternCanvas");
  const ctx = canvas?.getContext("2d", { alpha: false });
  const colorButton = $("colorButton");
  const colorDots = $("colorDots");
  const favoriteButton = $("favoriteButton");
  const libraryButton = $("libraryButton");
  const prevButton = $("prevButton");
  const nextButton = $("nextButton");
  const instructionsButton = $("instructionsButton");
  const instructionsModal = $("instructionsModal");
  const toast = $("toast");

  if (!app || !canvas || !ctx || !communityPanel) return;

  let activeLibraryPage = "all";
  let runtimePatternId = TENTACLE_ID;
  let runtimeConfig = cloneConfig(TENTACLE_DEFAULT, TENTACLE_ID);
  let activeSource = { type: "base", id: TENTACLE_ID, patternId: TENTACLE_ID, communityId: null };
  let favorites = normalizeFavorites(loadJSON(STORAGE_FAVORITES, []));
  let communityItems = [];
  let recommendedCommunity = new Set();
  let recommendedPatterns = new Set();
  let animationFrame = 0;
  let animationStart = performance.now();
  let currentFrame = 0;
  let toastTimer = 0;
  let lastTap = 0;
  let tapCount = 0;

  const touchGesture = { fingers: 0, primaryId: null, x: 0, y: 0, lastDist: null };
  const mouseGesture = { down: false, fingers: 1, x: 0, y: 0 };

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function radians(d) { return d * Math.PI / 180; }
  function mod(n, m) { return ((n % m) + m) % m; }
  function round5(n) { return Math.round(Number(n) * 100000) / 100000; }
  function patternById(id) { return PATTERNS.find(p => p.id === id) || PATTERNS[0]; }
  function inferPatternId(config, hint = null) {
    const candidate = hint || config?.patternId || config?.baseId;
    return PATTERNS.some(p => p.id === candidate) ? candidate : TENTACLE_ID;
  }

  function cloneConfig(c, hint = null) {
    const patternId = inferPatternId(c, hint);
    if (patternId === DANDELION_ID) {
      const d = DANDELION_DEFAULT, history = Array.isArray(c?.v1History) ? c.v1History : [];
      return {
        patternId: DANDELION_ID,
        v1: clamp(Number(c?.v1) || d.v1, 0.02, 2),
        numShapes: clamp(Math.round(Number(c?.numShapes ?? c?.NUM_SHAPES) || d.numShapes), 50, 1000),
        angleSpeed: clamp(Number(c?.angleSpeed) || d.angleSpeed, .001, .05),
        tSpeed: clamp(Number(c?.tSpeed) || d.tSpeed, .001, .02),
        backgroundAlpha: clamp(Math.round(Number(c?.backgroundAlpha) || d.backgroundAlpha), 0, 255),
        lineWeight: clamp(Number(c?.lineWeight) || d.lineWeight, .1, 10),
        pointSize: clamp(Number(c?.pointSize) || d.pointSize, .2, 20),
        zoom: clamp(Number(c?.zoom) || d.zoom, .2, 5),
        colorModeIndex: clamp(Math.round(Number(c?.colorModeIndex) || 0), 0, 8),
        v1History: history.map(Number).filter(Number.isFinite).slice(-64)
      };
    }
    const d = TENTACLE_DEFAULT;
    return {
      patternId: TENTACLE_ID,
      numTentacles: clamp(Math.round(Number(c?.numTentacles) || d.numTentacles), 3, 72),
      tentacleLength: clamp(Number(c?.tentacleLength) || d.tentacleLength, 10, 800),
      baseRadius: clamp(Number(c?.baseRadius) || d.baseRadius, 0, 100),
      movementSpeed: clamp(Number(c?.movementSpeed) || d.movementSpeed, .05, 10),
      colorSpeed: clamp(Number(c?.colorSpeed) || d.colorSpeed, .05, 10),
      circleSize: clamp(Number(c?.circleSize) || d.circleSize, .2, 20),
      lineWeight: clamp(Number(c?.lineWeight) || d.lineWeight, .1, 10),
      segmentStep: clamp(Math.round(Number(c?.segmentStep) || d.segmentStep), 1, 20),
      colorModeIndex: clamp(Math.round(Number(c?.colorModeIndex) || 0), 0, 8)
    };
  }

  function configKey(c, hint = null) {
    const x = cloneConfig(c, hint);
    if (x.patternId === DANDELION_ID) {
      return [DANDELION_ID, round5(x.v1), x.numShapes, round5(x.angleSpeed), round5(x.tSpeed), x.backgroundAlpha, round5(x.lineWeight), round5(x.pointSize), round5(x.zoom), x.colorModeIndex].join("|");
    }
    return [TENTACLE_ID, x.numTentacles, round5(x.tentacleLength), round5(x.baseRadius), round5(x.movementSpeed), round5(x.colorSpeed), round5(x.circleSize), round5(x.lineWeight), x.segmentStep, x.colorModeIndex].join("|");
  }

  function loadJSON(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (_) { return fallback; }
  }
  function saveJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }

  function normalizeFavorites(list) {
    if (!Array.isArray(list)) return [];
    return list.slice(0, 120).map((item, index) => {
      const baseId = inferPatternId(item?.config, item?.baseId || item?.patternId);
      return {
        id: String(item?.id || `favorite-${Date.now()}-${index}`),
        baseId,
        config: cloneConfig(item?.config || patternById(baseId).defaults, baseId),
        previewFrame: Number.isFinite(Number(item?.previewFrame)) ? Number(item.previewFrame) : BASE_PREVIEW_FRAME,
        createdAt: Number(item?.createdAt) || Date.now(),
        communityId: item?.communityId ? String(item.communityId) : null,
        parentCommunityId: item?.parentCommunityId ? String(item.parentCommunityId) : null,
        patternVersion: Math.max(1, Math.round(Number(item?.patternVersion) || 1))
      };
    });
  }

  function persistFavorites() { saveJSON(STORAGE_FAVORITES, favorites); }
  function matchingFavorite(config = runtimeConfig, patternId = runtimePatternId) {
    const key = configKey(config, patternId);
    return favorites.find(f => configKey(f.config, f.baseId) === key) || null;
  }

  function statePayload(extra = {}) {
    const match = matchingFavorite();
    return {
      view: gameScreen.classList.contains("active") ? "game" : "library",
      libraryPage: activeLibraryPage,
      patternId: runtimePatternId,
      patternVersion: patternById(runtimePatternId).version,
      sourceType: activeSource.type,
      sourceId: activeSource.id,
      communityId: activeSource.communityId || null,
      config: cloneConfig(runtimeConfig, runtimePatternId),
      configKey: configKey(runtimeConfig, runtimePatternId),
      frame: currentFrame,
      favoriteId: match?.id || null,
      favoriteCommunityId: match?.communityId || null,
      favoriteCount: favorites.length,
      ...extra
    };
  }

  function emit(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(`setka:${name}`, { detail: { ...detail, state: statePayload() } }));
  }

  function setScreen(name) {
    const inGame = name === "game";
    libraryScreen.classList.toggle("active", !inGame);
    gameScreen.classList.toggle("active", inGame);
    if (inGame) {
      resizeMainCanvas(); animationStart = performance.now(); currentFrame = 0; startAnimation(); updateColorIndicator(); updateFavoriteButtonState();
    } else {
      stopAnimation(); renderLibrary();
    }
    emit("view", { view: inGame ? "game" : "library" });
  }

  function setLibraryPage(page, silent = false) {
    activeLibraryPage = PAGE_ORDER.includes(page) ? page : "all";
    const index = PAGE_ORDER.indexOf(activeLibraryPage);
    [allPatternsPanel, communityPanel, favoritesPanel].forEach((panel, i) => {
      panel.classList.toggle("hidden-left", i < index);
      panel.classList.toggle("hidden-right", i > index);
    });
    libraryPagerButton.classList.toggle("active", activeLibraryPage === "all");
    communityPagerButton.classList.toggle("active", activeLibraryPage === "community");
    favoritesPagerButton.classList.toggle("active", activeLibraryPage === "favorites");
    libraryTitle.textContent = activeLibraryPage === "community" ? "Сообщество" : activeLibraryPage === "favorites" ? "Сохраненные" : "Паттерны";
    if (!silent) emit("library-page", { page: activeLibraryPage });
  }

  function emptyPanel(panel, icon, text) {
    const empty = document.createElement("div"); empty.className = "empty-favorites"; empty.innerHTML = `<span class="big-heart">${icon}</span>${text}`; panel.appendChild(empty);
  }

  function normalizeCommunityItem(item) {
    const baseId = inferPatternId(item?.config, item?.pattern_id || item?.patternId || item?.baseId);
    return { ...item, baseId, patternId: baseId, config: cloneConfig(item?.config || patternById(baseId).defaults, baseId) };
  }

  function renderLibrary() {
    allPatternsPanel.replaceChildren(); communityPanel.replaceChildren(); favoritesPanel.replaceChildren();
    PATTERNS.forEach(pattern => {
      const tile = makePatternTile({ kind: "base", id: pattern.id, baseId: pattern.id, patternId: pattern.id, config: pattern.defaults, previewFrame: BASE_PREVIEW_FRAME, title: pattern.title, patternVersion: pattern.version });
      if (recommendedPatterns.has(pattern.id)) tile.classList.add("recommended");
      allPatternsPanel.appendChild(tile);
    });

    if (!communityItems.length) emptyPanel(communityPanel, "◎", "Здесь появятся конфигурации,<br>которые сохраняют участники");
    else communityItems.forEach(raw => {
      const item = normalizeCommunityItem(raw);
      const tile = makePatternTile({ kind: "community", id: String(item.id), baseId: item.baseId, patternId: item.baseId, config: item.config, previewFrame: Number(item.preview_frame ?? item.previewFrame ?? BASE_PREVIEW_FRAME), saveCount: Number(item.saveCount) || 0, communityId: String(item.id), parentCommunityId: item.parent_config_id || null, patternVersion: Number(item.pattern_version) || 1 });
      if (recommendedCommunity.has(String(item.id))) tile.classList.add("recommended");
      communityPanel.appendChild(tile);
    });

    if (!favorites.length) emptyPanel(favoritesPanel, "♥", "Здесь появятся конфигурации,<br>которые ты сохранишь сердцем");
    else favorites.forEach(f => favoritesPanel.appendChild(makePatternTile({ kind: "favorite", id: f.id, patternId: f.baseId, ...f })));
    setLibraryPage(activeLibraryPage, true);
  }

  function makePatternTile(item) {
    const patternId = inferPatternId(item.config, item.patternId || item.baseId || (item.kind === "base" ? item.id : null));
    const button = document.createElement("button"); button.type = "button"; button.className = `pattern-tile ${item.kind}-tile`; button.dataset.kind = item.kind; button.dataset.itemId = item.id; button.dataset.patternId = patternId;
    button.setAttribute("aria-label", item.kind === "favorite" ? "Открыть сохраненную конфигурацию. Удерживай, чтобы удалить" : item.kind === "community" ? "Открыть конфигурацию сообщества. Удерживай, чтобы сохранить себе" : `Открыть паттерн ${patternById(patternId).title}. Удерживай, чтобы сохранить`);
    const thumb = document.createElement("canvas"); thumb.width = 180; thumb.height = 180; thumb.className = "thumb-canvas"; button.appendChild(thumb);
    drawThumbnail(thumb, item.config || patternById(patternId).defaults, item.previewFrame, patternId);
    if (item.kind === "favorite") { const heart = document.createElement("span"); heart.className = "mini-heart"; heart.textContent = "♥"; button.appendChild(heart); }
    if (item.kind === "community") { const badge = document.createElement("span"); badge.className = "community-count"; badge.textContent = `♥ ${Math.max(0, Number(item.saveCount) || 0)}`; button.appendChild(badge); }
    const recommendation = document.createElement("span"); recommendation.className = "recommendation-mark"; recommendation.textContent = "●"; button.appendChild(recommendation);

    let holdTimer = 0, held = false, startX = 0, startY = 0;
    const cancelHold = () => { if (holdTimer) clearTimeout(holdTimer); holdTimer = 0; };
    button.addEventListener("pointerdown", e => {
      held = false; startX = e.clientX; startY = e.clientY; button.setPointerCapture?.(e.pointerId);
      holdTimer = window.setTimeout(() => {
        held = true;
        if (item.kind === "favorite") { const fav = favorites.find(f => f.id === item.id); if (fav) removeFavorite(fav, "tile_hold"); }
        else {
          const cfg = item.kind === "base" ? patternById(patternId).defaults : item.config;
          const existing = matchingFavorite(cfg, patternId);
          if (existing) removeFavorite(existing, "tile_hold");
          else saveFavorite(cfg, item.previewFrame, { origin: "tile_hold", baseId: patternId, communityId: item.kind === "community" ? item.communityId : null, parentCommunityId: item.kind === "community" ? item.communityId : null, patternVersion: item.patternVersion || 1 });
        }
        if (navigator.vibrate) navigator.vibrate(18);
      }, 620);
    });
    button.addEventListener("pointermove", e => { if (!held && Math.hypot(e.clientX - startX, e.clientY - startY) > 18) cancelHold(); });
    button.addEventListener("pointercancel", cancelHold);
    button.addEventListener("pointerup", e => {
      cancelHold(); if (held) { e.preventDefault(); return; }
      if (item.kind === "base") openConfig(patternById(patternId).defaults, { type: "base", id: patternId, patternId, communityId: null });
      if (item.kind === "favorite") { const fav = favorites.find(f => f.id === item.id); if (fav) openConfig(fav.config, { type: "favorite", id: fav.id, patternId: fav.baseId, communityId: fav.communityId || null }); }
      if (item.kind === "community") openConfig(item.config, { type: "community", id: item.communityId, patternId, communityId: item.communityId });
    });
    button.addEventListener("contextmenu", e => e.preventDefault());
    return button;
  }

  function openConfig(config, source = {}) {
    const sourcePattern = source.patternId || source.baseId || (source.type === "base" && PATTERNS.some(p => p.id === source.id) ? source.id : null);
    runtimePatternId = inferPatternId(config, sourcePattern);
    runtimeConfig = cloneConfig(config || patternById(runtimePatternId).defaults, runtimePatternId);
    activeSource = { type: source.type || "working", id: source.id || runtimePatternId, patternId: runtimePatternId, communityId: source.communityId || null };
    setScreen("game"); emit("pattern-open", { patternId: runtimePatternId, sourceType: activeSource.type, sourceId: activeSource.id, communityId: activeSource.communityId });
  }

  function drawThumbnail(thumb, config, frame = BASE_PREVIEW_FRAME, patternId = null) {
    const t = thumb.getContext("2d"); const pid = inferPatternId(config, patternId); renderPattern(t, thumb.width, thumb.height, cloneConfig(config, pid), Number.isFinite(Number(frame)) ? Number(frame) : BASE_PREVIEW_FRAME, true, pid);
  }
  function renderPreview(canvasEl, config, frame = BASE_PREVIEW_FRAME, patternId = null) { drawThumbnail(canvasEl, config, frame, patternId); }

  function resizeMainCanvas() {
    const rect = app.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr)); canvas.height = Math.max(1, Math.floor(rect.height * dpr)); canvas.style.width = `${rect.width}px`; canvas.style.height = `${rect.height}px`; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function startAnimation() {
    if (animationFrame) return;
    const tick = now => {
      if (!gameScreen.classList.contains("active")) { animationFrame = 0; return; }
      currentFrame = (now - animationStart) / 16.6667; const rect = app.getBoundingClientRect(); renderPattern(ctx, rect.width, rect.height, runtimeConfig, currentFrame, false, runtimePatternId); animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
  }
  function stopAnimation() { if (animationFrame) cancelAnimationFrame(animationFrame); animationFrame = 0; }

  function renderPattern(target, width, height, config, frame, thumbnail, patternId = null) {
    const pid = inferPatternId(config, patternId);
    if (pid === DANDELION_ID) return renderDandelion(target, width, height, cloneConfig(config, pid), frame, thumbnail);
    return renderTentacle(target, width, height, cloneConfig(config, pid), frame, thumbnail);
  }

  function renderTentacle(target, width, height, config, frame, thumbnail) {
    target.save(); target.fillStyle = "#000"; target.fillRect(0, 0, width, height); target.translate(width / 2, height / 2);
    if (thumbnail) { const extent = Math.max(40, config.tentacleLength * 3 + config.baseRadius + (config.tentacleLength * config.circleSize / 20)); const s = Math.min(.95, (Math.min(width, height) / 2 - 5) / extent); target.scale(s, s); }
    const shift = frame * config.colorSpeed * .5;
    for (let i = 0; i < 360; i += 360 / config.numTentacles) {
      const x0 = Math.sin(radians(i)) * config.baseRadius, y0 = Math.cos(radians(i)) * config.baseRadius;
      for (let q = 0; q < config.tentacleLength; q += config.segmentStep) {
        const a = Math.cos(radians(config.tentacleLength - q + frame * config.movementSpeed)) * q, x = Math.sin(radians(i - a)) * (q * 3), y = Math.cos(radians(i - a)) * (q * 3), d = (config.tentacleLength - q) * config.circleSize / 10;
        target.strokeStyle = tentacleColor(config.colorModeIndex, i, q, x, y, shift, frame); target.lineWidth = config.lineWeight; target.beginPath(); target.arc(x0 + x, y0 + y, Math.max(.075, d / 2), 0, Math.PI * 2); target.stroke();
      }
    }
    target.restore();
  }

  function tentacleColor(mode, i, q, x, y, shift, frame) {
    switch (mode) {
      case 0: return "hsl(0 0% 100%)"; case 1: return `hsl(${mod(i + q * 2 + shift, 360)} 100% 50%)`; case 2: return `hsl(${mod(frame + q * 2, 360)} 100% 50%)`; case 3: return "hsl(200 100% 50%)"; case 4: return "hsl(330 100% 50%)"; case 5: return `hsl(${mod(Math.atan2(y, x) * 180 / Math.PI + 180 + shift, 360)} 100% 50%)`; case 6: return `hsl(${mod(i + shift, 360)} 100% 50%)`; case 7: return `hsl(${mod(q * 5 + shift, 360)} 100% 50%)`; case 8: return `hsl(${mod(x + y + shift, 360)} 100% 50%)`; default: return "#fff";
    }
  }

  function dandelionRainbowCoord(x, y, shift = 0) { const a = Math.atan2(y, x) + Math.PI; return `hsl(${mod((a * 180 / Math.PI) * 2 + shift, 360)} 100% 50%)`; }
  function dandelionRainbowIndex(i, shift = 0) { return `hsl(${mod(i * .8 + shift, 360)} 100% 50%)`; }
  function dandelionLineColor(mode, i, x, y, shift) {
    if ([1,3,4].includes(mode)) return dandelionRainbowCoord(x,y,shift);
    if ([5,6,8].includes(mode)) return dandelionRainbowIndex(i,shift);
    return "#fff";
  }
  function dandelionPointColor(mode, i, x, y, shift) {
    if ([1,2].includes(mode)) return dandelionRainbowCoord(x,y,shift);
    if ([5,7].includes(mode)) return dandelionRainbowIndex(i,shift);
    if ([4,8].includes(mode)) return "#000";
    return "#fff";
  }
  function dandelionX(z,v1){return Math.sin(z/10)*100+Math.cos(z/v1)*100}
  function dandelionY(z,v1){return Math.cos(z/10)*100+Math.sin(z/v1)*100}
  function dandelionX2(z,v1){return Math.sin(z/10)*10+Math.cos(z/v1)*100}
  function dandelionY2(z,v1){return Math.cos(z/10)*10+Math.sin(z/v1)*100}

  function renderDandelion(target, width, height, config, frame, thumbnail) {
    target.save();
    if (thumbnail || config.backgroundAlpha >= 254) { target.fillStyle="#000"; target.fillRect(0,0,width,height); }
    else { target.fillStyle=`rgba(0,0,0,${clamp(config.backgroundAlpha/255,0,1)})`; target.fillRect(0,0,width,height); }
    target.translate(width/2,height/2);
    if (thumbnail) { const extent=Math.max(220,220*config.zoom); const s=Math.min(.95,(Math.min(width,height)/2-6)/extent); target.scale(s,s); }
    target.scale(config.zoom,config.zoom); target.rotate(Math.sin(frame*config.angleSpeed));
    const tv=frame*config.tSpeed,shift=frame*.5;
    for(let i=1;i<config.numShapes;i++){
      const z=tv+i,px1=dandelionX(z,config.v1),py1=dandelionY(z,config.v1),px2=dandelionX2(z,config.v1),py2=dandelionY2(z,config.v1);
      target.strokeStyle=dandelionLineColor(config.colorModeIndex,i,px1,py1,shift); target.lineWidth=config.lineWeight; target.beginPath(); target.moveTo(px1,py1); target.lineTo(px2,py2); target.stroke();
      target.fillStyle=dandelionPointColor(config.colorModeIndex,i,px1,py1,shift); const r=Math.max(.25,config.pointSize/2); target.beginPath(); target.arc(px1,py1,r,0,Math.PI*2); target.fill(); target.beginPath(); target.arc(px2,py2,r,0,Math.PI*2); target.fill();
    }
    target.restore();
  }

  function buildColorDots() { colorDots.replaceChildren(); const radius = 42; for (let i=0;i<9;i++){const d=document.createElement("span");d.className="color-dot";const a=-90+i*40;d.style.transform=`translate(${Math.cos(radians(a))*radius}px,${Math.sin(radians(a))*radius}px)`;colorDots.appendChild(d)} }
  function updateColorIndicator() { const count = runtimeConfig.colorModeIndex + 1; [...colorDots.children].forEach((d,i)=>d.classList.toggle("visible",i<count)); }
  function updateFavoriteButtonState() { const match=matchingFavorite(); favoriteButton.textContent=match?"♥":"♡"; favoriteButton.classList.toggle("saved",Boolean(match)); favoriteButton.setAttribute("aria-label",match?"Снять лайк с этой конфигурации":"Сохранить текущую конфигурацию"); }

  function saveFavorite(config, previewFrame = currentFrame, meta = {}) {
    const pid=inferPatternId(config,meta.baseId||runtimePatternId), existing=matchingFavorite(config,pid);
    if(existing){updateFavoriteButtonState();showToast("♥ Уже сохранено");return existing}
    const snapshot={id:`favorite-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,baseId:pid,config:cloneConfig(config,pid),previewFrame:Number.isFinite(Number(previewFrame))?Number(previewFrame):BASE_PREVIEW_FRAME,createdAt:Date.now(),communityId:meta.communityId||null,parentCommunityId:meta.parentCommunityId||activeSource.communityId||null,patternVersion:meta.patternVersion||patternById(pid).version};
    favorites.unshift(snapshot);favorites=favorites.slice(0,120);persistFavorites();updateFavoriteButtonState();renderLibrary();showToast("♥ Конфигурация сохранена");emit("favorite-saved",{favorite:{...snapshot},origin:meta.origin||"game"});return snapshot;
  }
  function removeFavorite(fav,origin="game"){const index=favorites.findIndex(f=>f.id===fav.id);if(index<0)return false;const removed=favorites[index];favorites.splice(index,1);persistFavorites();updateFavoriteButtonState();renderLibrary();showToast("♡ Лайк снят");emit("favorite-removed",{favorite:{...removed},origin});return true}
  function updateFavoriteMeta(id,patch={}){const fav=favorites.find(f=>f.id===id);if(!fav)return null;Object.assign(fav,patch);persistFavorites();renderLibrary();updateFavoriteButtonState();return{...fav}}
  function showToast(message){toast.textContent=message;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),1400)}

  function applyTentacleGesture(x,y,dx,dy,fingers){const rect=canvas.getBoundingClientRect(),left=x<rect.width/3,right=x>rect.width*2/3,top=y<rect.height/3,bottom=y>rect.height*2/3;if(fingers===1){if(Math.abs(dy)>Math.abs(dx)){if(left&&dy!==0)runtimeConfig.numTentacles=clamp(runtimeConfig.numTentacles+(dy>0?-1:1),3,72);if(right)runtimeConfig.circleSize=clamp(runtimeConfig.circleSize-dy*.005,.2,20)}else{if(top)runtimeConfig.lineWeight=clamp(runtimeConfig.lineWeight+dx*.01,.1,10);if(bottom)runtimeConfig.movementSpeed=clamp(runtimeConfig.movementSpeed+dx*.001,.05,10)}}if(fingers===2){if(left&&!bottom&&Math.abs(dy)>Math.abs(dx))runtimeConfig.tentacleLength=clamp(runtimeConfig.tentacleLength-dy*.2,10,800);if(right&&!bottom&&Math.abs(dy)>Math.abs(dx)){if(dy<0)runtimeConfig.segmentStep=Math.max(1,runtimeConfig.segmentStep-1);if(dy>0)runtimeConfig.segmentStep=Math.min(20,runtimeConfig.segmentStep+1)}if(bottom&&Math.abs(dx)>Math.abs(dy))runtimeConfig.colorSpeed=clamp(runtimeConfig.colorSpeed+dx*.001,.05,10)}}
  function applyDandelionGesture(dx,dy,fingers,pinchRatio=null){if(fingers===1){if(Math.abs(dx)>Math.abs(dy))runtimeConfig.tSpeed=clamp(runtimeConfig.tSpeed+dx*.00001,.001,.02);else runtimeConfig.numShapes=clamp(runtimeConfig.numShapes+(dy>0?-1:1),50,1000)}if(fingers===2){if(Math.abs(dx)>Math.abs(dy))runtimeConfig.angleSpeed=clamp(runtimeConfig.angleSpeed+dx*.00001,.001,.05);else runtimeConfig.lineWeight=clamp(runtimeConfig.lineWeight-dy*.01,.1,10);if(Number.isFinite(pinchRatio)&&pinchRatio>0)runtimeConfig.zoom=clamp(runtimeConfig.zoom*pinchRatio,.2,5)}}
  function applyPatternGesture(x,y,dx,dy,fingers,pinchRatio=null){const before=configKey(runtimeConfig,runtimePatternId);if(runtimePatternId===DANDELION_ID)applyDandelionGesture(dx,dy,fingers,pinchRatio);else applyTentacleGesture(x,y,dx,dy,fingers);const changed=before!==configKey(runtimeConfig,runtimePatternId);if(changed)updateFavoriteButtonState();return changed}

  function dandelionTap(x,y){if(runtimePatternId!==DANDELION_ID)return;const now=performance.now();tapCount=now-lastTap<300?tapCount+1:1;lastTap=now;const rect=canvas.getBoundingClientRect();if(tapCount===1&&Math.hypot(x-rect.width/2,y-rect.height/2)<100){runtimeConfig.v1History=[...(runtimeConfig.v1History||[]),runtimeConfig.v1].slice(-64);runtimeConfig.v1=Math.random()*.4+.2;updateFavoriteButtonState();emit("pattern-special",{action:"new-v1",v1:runtimeConfig.v1})}if(tapCount===1&&y>rect.height*.85&&runtimeConfig.v1History?.length){const history=[...runtimeConfig.v1History];runtimeConfig.v1=history.pop();runtimeConfig.v1History=history;updateFavoriteButtonState();emit("pattern-special",{action:"undo-v1",v1:runtimeConfig.v1})}if(tapCount===3){const from=runtimeConfig.colorModeIndex;runtimeConfig.colorModeIndex=(from+1)%9;updateColorIndicator();updateFavoriteButtonState();emit("color",{from,to:runtimeConfig.colorModeIndex,origin:"triple-tap"})}}

  function localTouch(touch){const r=canvas.getBoundingClientRect();return{x:touch.clientX-r.left,y:touch.clientY-r.top}}
  function getPrimaryTouch(touches){if(!touches.length)return null;if(touchGesture.primaryId!==null)for(const t of touches)if(t.identifier===touchGesture.primaryId)return t;return touches[0]}
  function norm(x,y){const r=canvas.getBoundingClientRect();return{x:r.width?x/r.width:0,y:r.height?y/r.height:0}}
  function touchDistance(touches){if(touches.length<2)return null;return Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY)}

  canvas.addEventListener("touchstart",event=>{event.preventDefault();const primary=getPrimaryTouch(event.touches);if(!primary)return;if(touchGesture.primaryId===null)touchGesture.primaryId=primary.identifier;const p=localTouch(primary);touchGesture.fingers=event.touches.length;touchGesture.x=p.x;touchGesture.y=p.y;if(event.touches.length===1)dandelionTap(p.x,p.y);touchGesture.lastDist=touchDistance(event.touches);emit("gesture-start",{fingers:touchGesture.fingers,...norm(p.x,p.y)})},{passive:false});
  canvas.addEventListener("touchmove",event=>{event.preventDefault();const primary=getPrimaryTouch(event.touches);if(!primary)return;const p=localTouch(primary),dx=p.x-touchGesture.x,dy=p.y-touchGesture.y;touchGesture.fingers=event.touches.length;const nd=touchDistance(event.touches),ratio=nd&&touchGesture.lastDist?nd/touchGesture.lastDist:null;const changed=applyPatternGesture(p.x,p.y,dx,dy,touchGesture.fingers,ratio);touchGesture.x=p.x;touchGesture.y=p.y;touchGesture.lastDist=nd;if(changed)emit("gesture-move",{fingers:touchGesture.fingers,...norm(p.x,p.y),dx,dy})},{passive:false});
  function endTouch(event){event.preventDefault();if(!event.touches.length){emit("gesture-end",{fingers:touchGesture.fingers});touchGesture.fingers=0;touchGesture.primaryId=null;touchGesture.lastDist=null}else{const p=getPrimaryTouch(event.touches);if(p){const q=localTouch(p);touchGesture.fingers=event.touches.length;touchGesture.x=q.x;touchGesture.y=q.y;touchGesture.lastDist=touchDistance(event.touches)}}}
  canvas.addEventListener("touchend",endTouch,{passive:false});canvas.addEventListener("touchcancel",endTouch,{passive:false});

  canvas.addEventListener("mousedown",event=>{event.preventDefault();const r=canvas.getBoundingClientRect();mouseGesture.down=true;mouseGesture.fingers=event.shiftKey?2:1;mouseGesture.x=event.clientX-r.left;mouseGesture.y=event.clientY-r.top;if(mouseGesture.fingers===1)dandelionTap(mouseGesture.x,mouseGesture.y);emit("gesture-start",{fingers:mouseGesture.fingers,desktop:true,...norm(mouseGesture.x,mouseGesture.y)})});
  window.addEventListener("mousemove",event=>{if(!mouseGesture.down)return;const r=canvas.getBoundingClientRect(),x=event.clientX-r.left,y=event.clientY-r.top,dx=x-mouseGesture.x,dy=y-mouseGesture.y;mouseGesture.fingers=event.shiftKey?2:1;const changed=applyPatternGesture(x,y,dx,dy,mouseGesture.fingers,null);mouseGesture.x=x;mouseGesture.y=y;if(changed)emit("gesture-move",{fingers:mouseGesture.fingers,desktop:true,...norm(x,y),dx,dy})});
  window.addEventListener("mouseup",()=>{if(mouseGesture.down)emit("gesture-end",{fingers:mouseGesture.fingers,desktop:true});mouseGesture.down=false});

  function instructionsHTML(){if(runtimePatternId===DANDELION_ID)return '<h2 id="instructionsTitle">Управление · Одуванчик</h2><div class="gesture-group"><strong>Тапы</strong><div class="gesture-row"><span>Центр</span><span>Новая фигура</span></div><div class="gesture-row"><span>Низ</span><span>Шаг назад к предыдущей фигуре</span></div><div class="gesture-row"><span>3 тапа</span><span>Следующий цветовой режим</span></div></div><div class="gesture-group"><strong>1 палец</strong><div class="gesture-row"><span>←→</span><span>Скорость развития формы</span></div><div class="gesture-row"><span>↑↓</span><span>Количество линий</span></div></div><div class="gesture-group"><strong>2 пальца</strong><div class="gesture-row"><span>←→</span><span>Скорость вращения</span></div><div class="gesture-row"><span>↑↓</span><span>Толщина линий</span></div><div class="gesture-row"><span>Пинч</span><span>Масштаб</span></div></div><button class="close-modal" type="button">Понятно</button>';return '<h2 id="instructionsTitle">Управление паттерном</h2><div class="gesture-group"><strong>1 палец</strong><div class="gesture-row"><span>Слева ↑↓</span><span>Количество щупалец: вверх больше, вниз меньше</span></div><div class="gesture-row"><span>Справа ↑↓</span><span>Размер кругов: вверх больше, вниз меньше</span></div><div class="gesture-row"><span>Сверху ←→</span><span>Толщина линий</span></div><div class="gesture-row"><span>Снизу ←→</span><span>Скорость движения</span></div></div><div class="gesture-group"><strong>2 пальца</strong><div class="gesture-row"><span>Слева ↑↓</span><span>Длина щупалец: вверх длиннее, вниз короче</span></div><div class="gesture-row"><span>Справа ↑↓</span><span>Плотность кругов: вверх плотнее, вниз реже</span></div><div class="gesture-row"><span>Снизу ←→</span><span>Скорость перелива цвета</span></div></div><button class="close-modal" type="button">Понятно</button>'}

  colorButton.addEventListener("click",()=>{const from=runtimeConfig.colorModeIndex;runtimeConfig.colorModeIndex=(from+1)%9;updateColorIndicator();updateFavoriteButtonState();emit("color",{from,to:runtimeConfig.colorModeIndex})});
  favoriteButton.addEventListener("click",()=>{const match=matchingFavorite();if(match)removeFavorite(match,"game");else saveFavorite(runtimeConfig,currentFrame,{origin:"game",baseId:runtimePatternId,parentCommunityId:activeSource.communityId||null})});
  libraryButton.addEventListener("click",()=>{activeLibraryPage="all";setScreen("library")});
  instructionsButton.addEventListener("click",()=>{const panel=instructionsModal.querySelector(".instructions");if(panel)panel.innerHTML=instructionsHTML();instructionsModal.classList.add("open");emit("instructions-open")});
  instructionsModal.addEventListener("click",e=>{if(e.target===instructionsModal||e.target.closest?.(".close-modal")){instructionsModal.classList.remove("open");emit("instructions-close")}});
  function cyclePattern(dir){let i=PATTERNS.findIndex(p=>p.id===runtimePatternId);if(i<0)i=0;i=(i+dir+PATTERNS.length)%PATTERNS.length;const p=PATTERNS[i];openConfig(p.defaults,{type:"base",id:p.id,patternId:p.id,communityId:null})}
  prevButton.addEventListener("click",()=>cyclePattern(-1));nextButton.addEventListener("click",()=>cyclePattern(1));
  libraryPagerButton.addEventListener("click",()=>setLibraryPage("all"));communityPagerButton.addEventListener("click",()=>setLibraryPage("community"));favoritesPagerButton.addEventListener("click",()=>setLibraryPage("favorites"));

  let librarySwipeStart=null;librarySwipeArea.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;librarySwipeStart={x:e.clientX,y:e.clientY}});librarySwipeArea.addEventListener("pointerup",e=>{if(!librarySwipeStart)return;const dx=e.clientX-librarySwipeStart.x,dy=e.clientY-librarySwipeStart.y;librarySwipeStart=null;if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.2)return;let idx=PAGE_ORDER.indexOf(activeLibraryPage);idx+=dx<0?1:-1;idx=clamp(idx,0,PAGE_ORDER.length-1);setLibraryPage(PAGE_ORDER[idx])});librarySwipeArea.addEventListener("pointercancel",()=>{librarySwipeStart=null});
  window.addEventListener("resize",()=>{if(gameScreen.classList.contains("active"))resizeMainCanvas();renderLibrary()});document.addEventListener("visibilitychange",()=>{if(document.hidden)stopAnimation();else if(gameScreen.classList.contains("active"))startAnimation()});

  window.SetkaApp={
    getState:()=>statePayload(),
    getConfig:()=>cloneConfig(runtimeConfig,runtimePatternId),
    getFavorites:()=>favorites.map(f=>({...f,config:cloneConfig(f.config,f.baseId)})),
    getPatterns:()=>PATTERNS.map(p=>({id:p.id,title:p.title,version:p.version,defaults:cloneConfig(p.defaults,p.id)})),
    getPatternDefaults:id=>cloneConfig(patternById(id).defaults,patternById(id).id),
    getPatternTitle:id=>patternById(id).title,
    cloneConfig,
    configKey,
    openConfig,
    renderPreview,
    setCommunity(items){communityItems=Array.isArray(items)?items.map(normalizeCommunityItem):[];renderLibrary()},
    setRecommendations(data={}){recommendedCommunity=new Set((data.community||[]).map(String));recommendedPatterns=new Set((data.patterns||[]).map(String));renderLibrary()},
    updateFavoriteMeta,
    refreshFavorites(){favorites=normalizeFavorites(loadJSON(STORAGE_FAVORITES,[]));renderLibrary();updateFavoriteButtonState()},
    renderLibrary,
    setLibraryPage,
    finishCurrentUsageHint(){return statePayload()},
    DEFAULT_CONFIG:cloneConfig(TENTACLE_DEFAULT,TENTACLE_ID),
    DANDELION_DEFAULT:cloneConfig(DANDELION_DEFAULT,DANDELION_ID)
  };

  buildColorDots();updateColorIndicator();updateFavoriteButtonState();renderLibrary();emit("ready",{});
})();