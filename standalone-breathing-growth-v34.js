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
  const colorButton = document.getElementById("colorButton");
  const colorDots = document.getElementById("colorDots");
  const instructionsButton = document.getElementById("instructionsButton");
  const instructionsModal = document.getElementById("instructionsModal");
  const modeLabel = document.getElementById("modeLabel");
  const toast = document.getElementById("toast");

  if (!Setka || !app || !libraryScreen || !gameScreen || !allPatternsPanel || !originalCanvas) return;

  const GROWTH_ID = "breathing-fractal-growth";
  const GROWTH_TITLE = "Breathing Fractal · Growth";
  const STORAGE_FAVORITES = "setka-web:favorites:breathing-fractal-growth:v1";
  const EDGE = 0.20;
  const TH = 15;
  const FIRST_LEVEL_FACTOR = 2.0;

  const GROWTH_DEFAULT = Object.freeze({
    patternId: GROWTH_ID,
    baseLen: 70,
    pulseSpeed: 0.02,
    strokeW: 1.5,
    branches: 8,
    maxDepth: 4,
    colorModeIndex: 0,
    hueRate: 0.004,
    zoom: 1.0,
    levelSpeedRatio: 1.0,
    firstLevelFactor: FIRST_LEVEL_FACTOR
  });

  const original = {
    getState: Setka.getState?.bind(Setka),
    getConfig: Setka.getConfig?.bind(Setka),
    getPatterns: Setka.getPatterns?.bind(Setka),
    getPatternDefaults: Setka.getPatternDefaults?.bind(Setka),
    getPatternTitle: Setka.getPatternTitle?.bind(Setka),
    cloneConfig: Setka.cloneConfig?.bind(Setka),
    configKey: Setka.configKey?.bind(Setka),
    openConfig: Setka.openConfig?.bind(Setka),
    renderPreview: Setka.renderPreview?.bind(Setka),
    getFavorites: Setka.getFavorites?.bind(Setka),
    refreshFavorites: Setka.refreshFavorites?.bind(Setka),
    renderLibrary: Setka.renderLibrary?.bind(Setka),
    setCommunity: Setka.setCommunity?.bind(Setka),
    setRecommendations: Setka.setRecommendations?.bind(Setka)
  };

  const overlay = document.createElement("canvas");
  overlay.id = "breathingGrowthCanvas";
  overlay.setAttribute("aria-label", GROWTH_TITLE);
  originalCanvas.insertAdjacentElement("afterend", overlay);
  const ctx = overlay.getContext("2d", { alpha: false });

  const style = document.createElement("style");
  style.textContent = `#breathingGrowthCanvas{position:absolute;inset:0;width:100%;height:100%;display:none;background:#000;touch-action:none;z-index:3}.pattern-tile[data-growth-plugin="1"]{position:relative}`;
  document.head.appendChild(style);

  let active = false;
  let config = cloneConfig(GROWTH_DEFAULT);
  let source = { type: "base", id: GROWTH_ID, patternId: GROWTH_ID, communityId: null };
  let frame = 0;
  let startedAt = performance.now();
  let raf = 0;
  let favorites = loadFavorites();
  let community = [];
  let recommended = false;
  let toastTimer = 0;
  let lastTouchAt = 0;
  let tapTimes = [];

  const touch = { start1: null, start2: null, startDist: 0, prev1: null, moved: false, fingers: 0 };
  const mouse = { down: false, start: null, prev: null, moved: false };

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function round5(v) { return Math.round(Number(v) * 100000) / 100000; }
  function deepClone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function isGrowth(c, hint = null) { return (hint || c?.patternId || c?.baseId) === GROWTH_ID; }

  function cloneConfig(c = GROWTH_DEFAULT) {
    const d = GROWTH_DEFAULT;
    return {
      patternId: GROWTH_ID,
      baseLen: clamp(Number(c?.baseLen ?? d.baseLen), 10, 180),
      pulseSpeed: clamp(Number(c?.pulseSpeed ?? c?.pulseSpd ?? d.pulseSpeed), 0.001, 0.1),
      strokeW: clamp(Number(c?.strokeW ?? d.strokeW), 0.1, 8),
      branches: clamp(Math.round(Number(c?.branches ?? d.branches)), 2, 60),
      maxDepth: clamp(Math.round(Number(c?.maxDepth ?? c?.layers ?? d.maxDepth)), 1, 10),
      colorModeIndex: clamp(Math.round(Number(c?.colorModeIndex ?? c?.clrMode ?? d.colorModeIndex)), 0, 2),
      hueRate: clamp(Number(c?.hueRate ?? d.hueRate), 0.0001, 0.05),
      zoom: clamp(Number(c?.zoom ?? d.zoom), 0.3, 3.0),
      levelSpeedRatio: clamp(Number(c?.levelSpeedRatio ?? d.levelSpeedRatio), 0.2, 3.0),
      firstLevelFactor: FIRST_LEVEL_FACTOR
    };
  }

  function configKey(c = config) {
    const x = cloneConfig(c);
    return [GROWTH_ID, round5(x.baseLen), round5(x.pulseSpeed), round5(x.strokeW), x.branches, x.maxDepth, x.colorModeIndex, round5(x.hueRate), round5(x.zoom), round5(x.levelSpeedRatio)].join("|");
  }

  function loadJSON(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (_) { return fallback; }
  }
  function saveJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }

  function loadFavorites() {
    const list = loadJSON(STORAGE_FAVORITES, []);
    if (!Array.isArray(list)) return [];
    return list.slice(0, 120).map((f, i) => ({
      id: String(f?.id || `growth-favorite-${Date.now()}-${i}`),
      baseId: GROWTH_ID,
      patternId: GROWTH_ID,
      config: cloneConfig(f?.config || GROWTH_DEFAULT),
      previewFrame: Number.isFinite(Number(f?.previewFrame)) ? Number(f.previewFrame) : 44,
      createdAt: Number(f?.createdAt) || Date.now(),
      communityId: f?.communityId ? String(f.communityId) : null,
      parentCommunityId: f?.parentCommunityId ? String(f.parentCommunityId) : null,
      patternVersion: 1
    }));
  }

  function persistFavorites() { saveJSON(STORAGE_FAVORITES, favorites); }
  function matchingFavorite(c = config) { const key = configKey(c); return favorites.find(f => configKey(f.config) === key) || null; }

  function state(extra = {}) {
    const match = matchingFavorite();
    return {
      view: gameScreen.classList.contains("active") ? "game" : "library",
      libraryPage: original.getState?.()?.libraryPage || "all",
      patternId: GROWTH_ID,
      patternVersion: 1,
      sourceType: source.type,
      sourceId: source.id,
      communityId: source.communityId || null,
      config: cloneConfig(config),
      configKey: configKey(config),
      frame,
      favoriteId: match?.id || null,
      favoriteCommunityId: match?.communityId || null,
      favoriteCount: (original.getFavorites?.()?.length || 0) + favorites.length,
      ...extra
    };
  }

  function emit(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(`setka:${name}`, { detail: { ...detail, state: state() } }));
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1400);
  }

  function resizeOverlay() {
    const rect = app.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    overlay.width = Math.max(1, Math.floor(rect.width * dpr));
    overlay.height = Math.max(1, Math.floor(rect.height * dpr));
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function triangleGrowth(f, speed) {
    const phase = ((f * speed) % 2 + 2) % 2;
    return phase <= 1 ? phase : 2 - phase;
  }

  function segmentColor(c, x2, f) {
    if (c.colorModeIndex === 1) return "rgb(170,190,255)";
    if (c.colorModeIndex === 2) {
      const hue = ((f * c.hueRate * 100 + x2 * 0.4) % 360 + 360) % 360;
      return `hsl(${hue} 80% 55%)`;
    }
    return "#fff";
  }

  function levelWeight(depth, c) {
    return depth === 1 ? c.firstLevelFactor : Math.pow(c.levelSpeedRatio, depth - 1);
  }

  function totalWeight(c) {
    let sum = c.firstLevelFactor;
    for (let i = 2; i <= c.maxDepth; i++) sum += Math.pow(c.levelSpeedRatio, i - 1);
    return Math.max(0.00001, sum);
  }

  function levelStart(depth, c) {
    if (depth === 1) return 0;
    let start = c.firstLevelFactor;
    for (let i = 2; i < depth; i++) start += Math.pow(c.levelSpeedRatio, i - 1);
    return start;
  }

  function drawBranch(target, len, depth, growthRatio, c, f, sum) {
    if (depth > c.maxDepth) return;
    const weight = levelWeight(depth, c);
    const from = levelStart(depth, c) / sum;
    const to = (levelStart(depth, c) + weight) / sum;
    if (growthRatio < from) return;

    const localProgress = clamp((growthRatio - from) / Math.max(0.00001, to - from), 0, 1);
    const x2 = len * localProgress;
    target.strokeStyle = segmentColor(c, x2, f);
    target.lineWidth = c.strokeW;
    target.beginPath();
    target.moveTo(0, 0);
    target.lineTo(x2, 0);
    target.stroke();

    if (localProgress >= 1 && depth < c.maxDepth) {
      target.save();
      target.translate(len, 0);
      target.save();
      target.rotate(Math.PI / 6);
      drawBranch(target, len * 0.6, depth + 1, growthRatio, c, f, sum);
      target.restore();
      target.save();
      target.rotate(-Math.PI / 6);
      drawBranch(target, len * 0.6, depth + 1, growthRatio, c, f, sum);
      target.restore();
      target.restore();
    }
  }

  function renderGrowth(target, width, height, raw, f, thumbnail = false) {
    const c = cloneConfig(raw);
    target.save();
    target.fillStyle = "#000";
    target.fillRect(0, 0, width, height);
    target.translate(width / 2, height / 2);
    const growth = triangleGrowth(f, c.pulseSpeed);

    if (thumbnail) {
      const radius = Math.max(60, c.baseLen * 2.6);
      const s = Math.min(0.95, (Math.min(width, height) / 2 - 5) / radius);
      target.scale(s * c.zoom, s * c.zoom);
    } else {
      target.scale(c.zoom, c.zoom);
    }

    const sum = totalWeight(c);
    for (let i = 0; i < c.branches; i++) {
      target.save();
      target.rotate(Math.PI * 2 / c.branches * i);
      drawBranch(target, c.baseLen, 1, growth, c, f, sum);
      target.restore();
    }
    target.restore();
  }

  function drawPreview(canvasEl, c, f = 44) {
    if (!canvasEl) return;
    const p = canvasEl.getContext("2d");
    renderGrowth(p, canvasEl.width, canvasEl.height, cloneConfig(c), Number.isFinite(Number(f)) ? Number(f) : 44, true);
  }

  function startAnimation() {
    if (raf) return;
    const tick = now => {
      if (!active || !gameScreen.classList.contains("active")) { raf = 0; return; }
      frame = (now - startedAt) / 16.6667;
      const rect = app.getBoundingClientRect();
      renderGrowth(ctx, rect.width, rect.height, config, frame, false);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  function stopAnimation() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  function updateColorIndicator() {
    if (!active || !colorDots) return;
    const count = config.colorModeIndex + 1;
    [...colorDots.children].forEach((dot, i) => dot.classList.toggle("visible", i < count));
  }

  function updateFavoriteState() {
    if (!active || !favoriteButton) return;
    const match = matchingFavorite();
    favoriteButton.textContent = match ? "♥" : "♡";
    favoriteButton.classList.toggle("saved", Boolean(match));
    favoriteButton.setAttribute("aria-label", match ? "Снять лайк с этой конфигурации" : "Сохранить текущую конфигурацию");
  }

  function renderHostLibrary() { original.renderLibrary?.(); requestAnimationFrame(ensureLibraryTiles); }

  function saveFavorite(c = config, f = frame, meta = {}) {
    const existing = matchingFavorite(c);
    if (existing) { updateFavoriteState(); showToast("♥ Уже сохранено"); return existing; }
    const snapshot = {
      id: `growth-favorite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      baseId: GROWTH_ID,
      patternId: GROWTH_ID,
      config: cloneConfig(c),
      previewFrame: Number.isFinite(Number(f)) ? Number(f) : 44,
      createdAt: Date.now(),
      communityId: meta.communityId || null,
      parentCommunityId: meta.parentCommunityId || source.communityId || null,
      patternVersion: 1
    };
    favorites.unshift(snapshot);
    favorites = favorites.slice(0, 120);
    persistFavorites(); renderHostLibrary(); updateFavoriteState(); showToast("♥ Конфигурация сохранена");
    emit("favorite-saved", { favorite: deepClone(snapshot), origin: meta.origin || "game" });
    return snapshot;
  }

  function removeFavorite(fav, origin = "game") {
    const i = favorites.findIndex(x => x.id === fav.id);
    if (i < 0) return false;
    const removed = favorites.splice(i, 1)[0];
    persistFavorites(); renderHostLibrary(); updateFavoriteState(); showToast("♡ Лайк снят");
    emit("favorite-removed", { favorite: deepClone(removed), origin });
    return true;
  }

  function showGame() { libraryScreen.classList.remove("active"); gameScreen.classList.add("active"); }

  function openGrowth(c = GROWTH_DEFAULT, src = {}) {
    config = cloneConfig(c);
    source = { type: src.type || "base", id: src.id || GROWTH_ID, patternId: GROWTH_ID, communityId: src.communityId || null };
    active = true;
    frame = 0;
    startedAt = performance.now();
    ["rgbRingsCanvas", "breathingFractalCanvas"].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = "none"; });
    originalCanvas.style.visibility = "hidden";
    overlay.style.display = "block";
    if (modeLabel) modeLabel.textContent = GROWTH_TITLE;
    resizeOverlay(); showGame(); updateColorIndicator(); updateFavoriteState(); startAnimation();
    emit("view", { view: "game" });
    emit("pattern-open", { patternId: GROWTH_ID, sourceType: source.type, sourceId: source.id, communityId: source.communityId });
  }

  function deactivate() {
    if (!active) return;
    active = false; stopAnimation(); overlay.style.display = "none"; originalCanvas.style.visibility = "";
    if (modeLabel) modeLabel.textContent = "";
  }

  function closeToLibrary() {
    if (!active) return;
    deactivate(); gameScreen.classList.remove("active"); libraryScreen.classList.add("active");
    original.renderLibrary?.(); ensureLibraryTiles();
    window.dispatchEvent(new CustomEvent("setka:view", { detail: { view: "library", state: original.getState?.() || { view: "library" } } }));
  }

  function cycleColor(origin = "button") {
    const from = config.colorModeIndex;
    config.colorModeIndex = (from + 1) % 3;
    updateColorIndicator(); updateFavoriteState();
    emit("color", { from, to: config.colorModeIndex, origin });
  }

  function registerTap() {
    const now = performance.now();
    tapTimes.push(now);
    if (tapTimes.length > 3) tapTimes.shift();
    if (tapTimes.length === 3 && tapTimes[2] - tapTimes[0] < 450) { tapTimes = []; cycleColor("triple-tap"); }
  }

  function localTouch(t) { const r = overlay.getBoundingClientRect(); return { x: t.clientX - r.left, y: t.clientY - r.top }; }
  function normalized(x, y) { const r = overlay.getBoundingClientRect(); return { x: r.width ? x / r.width : 0, y: r.height ? y / r.height : 0 }; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function applyOneFinger(start, current) {
    if (!start) return { changed: false, start };
    const rect = overlay.getBoundingClientRect();
    const dx = current.x - start.x, dy = current.y - start.y;
    const L = rect.width * EDGE, R = rect.width * (1 - EDGE), T = rect.height * EDGE, B = rect.height * (1 - EDGE);
    let s = { ...start }, changed = false;
    if (start.x < L && Math.abs(dy) > TH) { config.branches = clamp(config.branches + (dy < 0 ? 1 : -1), 2, 60); s.y = current.y; changed = true; return { changed, start: s }; }
    if (start.x > R && Math.abs(dy) > TH) { config.maxDepth = clamp(config.maxDepth + (dy < 0 ? 1 : -1), 1, 10); s.y = current.y; changed = true; return { changed, start: s }; }
    if (start.y < T && Math.abs(dx) > TH) { config.strokeW = clamp(config.strokeW + (dx > 0 ? 0.3 : -0.3), 0.1, 8); s.x = current.x; changed = true; return { changed, start: s }; }
    if (start.y > B && Math.abs(dx) > TH) { config.pulseSpeed = clamp(config.pulseSpeed + (dx > 0 ? 0.005 : -0.005), 0.001, 0.1); s.x = current.x; changed = true; return { changed, start: s }; }
    return { changed, start: s };
  }

  overlay.addEventListener("touchstart", e => {
    if (!active || !e.touches.length) return;
    e.preventDefault(); e.stopImmediatePropagation(); lastTouchAt = Date.now();
    const p1 = localTouch(e.touches[0]);
    const p2 = e.touches.length >= 2 ? localTouch(e.touches[1]) : null;
    touch.start1 = { ...p1 }; touch.start2 = p2 ? { ...p2 } : null; touch.startDist = p2 ? dist(p1, p2) : 0; touch.prev1 = { ...p1 }; touch.moved = false; touch.fingers = e.touches.length;
    if (e.touches.length === 1) registerTap();
    emit("gesture-start", { fingers: e.touches.length, ...normalized(p1.x, p1.y) });
  }, { passive: false, capture: true });

  overlay.addEventListener("touchmove", e => {
    if (!active || !e.touches.length || !touch.start1) return;
    e.preventDefault(); e.stopImmediatePropagation(); lastTouchAt = Date.now();
    const p1 = localTouch(e.touches[0]);
    const p2 = e.touches.length >= 2 ? localTouch(e.touches[1]) : null;
    if (touch.prev1 && Math.hypot(p1.x - touch.prev1.x, p1.y - touch.prev1.y) > 2) touch.moved = true;
    const before = configKey(config);
    let dx = p1.x - touch.start1.x, dy = p1.y - touch.start1.y;

    if (e.touches.length === 2 && p2 && touch.start2) {
      const newDist = dist(p1, p2);
      if (touch.startDist > 0 && newDist > 0) config.zoom = clamp(config.zoom * (newDist / touch.startDist), 0.3, 3.0);
      const B = overlay.getBoundingClientRect().height * (1 - EDGE);
      if (p1.y > B && p2.y > B) {
        const midStart = (touch.start1.x + touch.start2.x) / 2;
        const midNow = (p1.x + p2.x) / 2;
        const delta = midNow - midStart;
        if (Math.abs(delta) > TH) config.levelSpeedRatio = clamp(config.levelSpeedRatio + (delta > 0 ? 0.05 : -0.05), 0.2, 3.0);
      }
      touch.start1 = { ...p1 }; touch.start2 = { ...p2 }; touch.startDist = newDist;
    } else if (e.touches.length === 1) {
      const out = applyOneFinger(touch.start1, p1);
      touch.start1 = out.start;
    }

    touch.prev1 = { ...p1 };
    if (before !== configKey(config)) {
      updateFavoriteState();
      emit("gesture-move", { fingers: e.touches.length, ...normalized(p1.x, p1.y), dx, dy });
    }
  }, { passive: false, capture: true });

  function touchEnd(e) {
    if (!active) return;
    e.preventDefault(); e.stopImmediatePropagation();
    emit("gesture-end", { fingers: touch.fingers || 1 });
    if (!e.touches.length) { touch.start1 = null; touch.start2 = null; touch.startDist = 0; touch.prev1 = null; touch.moved = false; touch.fingers = 0; }
    else {
      const p1 = localTouch(e.touches[0]); const p2 = e.touches.length >= 2 ? localTouch(e.touches[1]) : null;
      touch.start1 = { ...p1 }; touch.start2 = p2 ? { ...p2 } : null; touch.startDist = p2 ? dist(p1, p2) : 0; touch.prev1 = { ...p1 }; touch.fingers = e.touches.length;
    }
  }
  overlay.addEventListener("touchend", touchEnd, { passive: false, capture: true });
  overlay.addEventListener("touchcancel", touchEnd, { passive: false, capture: true });

  overlay.addEventListener("mousedown", e => {
    if (!active || Date.now() - lastTouchAt < 700) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const r = overlay.getBoundingClientRect(); const p = { x: e.clientX - r.left, y: e.clientY - r.top };
    mouse.down = true; mouse.start = { ...p }; mouse.prev = { ...p }; mouse.moved = false; registerTap();
    emit("gesture-start", { fingers: 1, desktop: true, ...normalized(p.x, p.y) });
  }, true);

  window.addEventListener("mousemove", e => {
    if (!active || !mouse.down || !mouse.start) return;
    const r = overlay.getBoundingClientRect(); const p = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (mouse.prev && Math.hypot(p.x - mouse.prev.x, p.y - mouse.prev.y) > 2) mouse.moved = true;
    const before = configKey(config); const out = applyOneFinger(mouse.start, p); mouse.start = out.start; mouse.prev = { ...p };
    if (before !== configKey(config)) { updateFavoriteState(); emit("gesture-move", { fingers: 1, desktop: true, ...normalized(p.x, p.y) }); }
  }, true);

  window.addEventListener("mouseup", () => {
    if (!active || !mouse.down) return;
    emit("gesture-end", { fingers: 1, desktop: true }); mouse.down = false; mouse.start = null; mouse.prev = null; mouse.moved = false;
  }, true);

  function instructionsHTML() {
    return '<h2 id="instructionsTitle">Управление · Breathing Fractal Growth</h2><div class="gesture-group"><strong>1 палец · изолированные зоны</strong><div class="gesture-row"><span>Слева ↑↓</span><span>Количество лепестков / ветвей</span></div><div class="gesture-row"><span>Справа ↑↓</span><span>Глубина ветвления</span></div><div class="gesture-row"><span>Сверху ←→</span><span>Толщина линий</span></div><div class="gesture-row"><span>Снизу ←→</span><span>Скорость полного роста / схлопывания</span></div></div><div class="gesture-group"><strong>2 пальца</strong><div class="gesture-row"><span>Пинч</span><span>Масштаб</span></div><div class="gesture-row"><span>Оба снизу ←→</span><span>Скорость последовательного раскрытия уровней</span></div></div><div class="gesture-group"><strong>Тапы</strong><div class="gesture-row"><span>3 тапа</span><span>Белый → голубой → радуга</span></div></div><button class="close-modal" type="button">Понятно</button>';
  }

  function bindTile(button, item) {
    let holdTimer = 0, held = false, sx = 0, sy = 0;
    const cancel = () => { if (holdTimer) clearTimeout(holdTimer); holdTimer = 0; };
    button.addEventListener("pointerdown", e => {
      held = false; sx = e.clientX; sy = e.clientY; button.setPointerCapture?.(e.pointerId);
      holdTimer = setTimeout(() => {
        held = true;
        if (item.kind === "favorite") removeFavorite(item.favorite, "tile_hold");
        else { const existing = matchingFavorite(item.config); if (existing) removeFavorite(existing, "tile_hold"); else saveFavorite(item.config, item.previewFrame, { origin: "tile_hold", communityId: item.communityId || null, parentCommunityId: item.communityId || null }); }
        navigator.vibrate?.(18);
      }, 620);
    });
    button.addEventListener("pointermove", e => { if (!held && Math.hypot(e.clientX - sx, e.clientY - sy) > 18) cancel(); });
    button.addEventListener("pointercancel", cancel);
    button.addEventListener("pointerup", e => { cancel(); if (held) { e.preventDefault(); return; } openGrowth(item.config, { type: item.kind, id: item.id, patternId: GROWTH_ID, communityId: item.communityId || null }); });
    button.addEventListener("contextmenu", e => e.preventDefault());
  }

  function makeTile(item) {
    const button = document.createElement("button"); button.type = "button"; button.className = `pattern-tile ${item.kind}-tile`;
    button.dataset.kind = item.kind; button.dataset.itemId = item.id; button.dataset.patternId = GROWTH_ID; button.dataset.growthPlugin = "1";
    button.setAttribute("aria-label", item.kind === "favorite" ? `Открыть сохраненную конфигурацию ${GROWTH_TITLE}. Удерживай, чтобы удалить` : `Открыть паттерн ${GROWTH_TITLE}. Удерживай, чтобы сохранить`);
    const thumb = document.createElement("canvas"); thumb.width = 180; thumb.height = 180; thumb.className = "thumb-canvas"; button.appendChild(thumb); drawPreview(thumb, item.config, item.previewFrame ?? 44);
    if (item.kind === "favorite") { const heart = document.createElement("span"); heart.className = "mini-heart"; heart.textContent = "♥"; button.appendChild(heart); }
    if (item.kind === "community") { const badge = document.createElement("span"); badge.className = "community-count"; badge.textContent = `♥ ${Math.max(0, Number(item.saveCount) || 0)}`; button.appendChild(badge); }
    if (item.kind === "base") { const mark = document.createElement("span"); mark.className = "recommendation-mark"; mark.textContent = "●"; mark.style.display = recommended ? "" : "none"; button.appendChild(mark); }
    bindTile(button, item); return button;
  }

  function ensureBaseTile() { if (!allPatternsPanel.querySelector('[data-growth-plugin="1"][data-kind="base"]')) allPatternsPanel.appendChild(makeTile({ kind: "base", id: GROWTH_ID, config: GROWTH_DEFAULT, previewFrame: 44 })); }
  function ensureFavoriteTiles() {
    if (!favoritesPanel) return;
    const existing = new Set([...favoritesPanel.querySelectorAll('[data-growth-plugin="1"][data-kind="favorite"]')].map(x => x.dataset.itemId));
    if (favorites.length) favoritesPanel.querySelector(".empty-favorites")?.remove();
    for (const fav of favorites) if (!existing.has(fav.id)) favoritesPanel.appendChild(makeTile({ kind: "favorite", id: fav.id, favorite: fav, config: fav.config, previewFrame: fav.previewFrame, communityId: fav.communityId }));
  }
  function ensureCommunityTiles() {
    if (!communityPanel) return;
    const existing = new Set([...communityPanel.querySelectorAll('[data-growth-plugin="1"][data-kind="community"]')].map(x => x.dataset.itemId));
    if (community.length) communityPanel.querySelector(".empty-favorites")?.remove();
    for (const item of community) { const id = String(item.id); if (!existing.has(id)) communityPanel.appendChild(makeTile({ kind: "community", id, communityId: id, config: cloneConfig(item.config), previewFrame: Number(item.preview_frame ?? item.previewFrame ?? 44), saveCount: Number(item.saveCount) || 0 })); }
  }
  function ensureLibraryTiles() { ensureBaseTile(); ensureFavoriteTiles(); ensureCommunityTiles(); }

  const observer = new MutationObserver(() => requestAnimationFrame(ensureLibraryTiles));
  observer.observe(allPatternsPanel, { childList: true });
  if (favoritesPanel) observer.observe(favoritesPanel, { childList: true });
  if (communityPanel) observer.observe(communityPanel, { childList: true });

  Setka.getPatterns = () => { const base = original.getPatterns?.() || []; return base.some(p => p.id === GROWTH_ID) ? base : [...base, { id: GROWTH_ID, title: GROWTH_TITLE, version: 1, defaults: cloneConfig(GROWTH_DEFAULT) }]; };
  Setka.getPatternDefaults = id => id === GROWTH_ID ? cloneConfig(GROWTH_DEFAULT) : original.getPatternDefaults?.(id);
  Setka.getPatternTitle = id => id === GROWTH_ID ? GROWTH_TITLE : original.getPatternTitle?.(id);
  Setka.cloneConfig = (c, hint = null) => isGrowth(c, hint) ? cloneConfig(c) : original.cloneConfig?.(c, hint);
  Setka.configKey = (c, hint = null) => isGrowth(c, hint) ? configKey(c) : original.configKey?.(c, hint);
  Setka.getState = () => active ? state() : original.getState?.();
  Setka.getConfig = () => active ? cloneConfig(config) : original.getConfig?.();
  Setka.getFavorites = () => [...(original.getFavorites?.() || []), ...favorites.map(deepClone)];
  Setka.renderPreview = (canvasEl, c, f = 44, patternId = null) => isGrowth(c, patternId) ? drawPreview(canvasEl, c, f) : original.renderPreview?.(canvasEl, c, f, patternId);
  Setka.openConfig = (c, src = {}) => { const pid = src.patternId || src.baseId || c?.patternId || c?.baseId; if (pid === GROWTH_ID) return openGrowth(c, src); deactivate(); return original.openConfig?.(c, src); };
  Setka.refreshFavorites = () => { original.refreshFavorites?.(); favorites = loadFavorites(); ensureLibraryTiles(); };
  Setka.renderLibrary = () => { original.renderLibrary?.(); requestAnimationFrame(ensureLibraryTiles); };
  Setka.setCommunity = items => {
    const all = Array.isArray(items) ? items : [];
    community = all.filter(x => (x?.patternId || x?.pattern_id || x?.baseId || x?.config?.patternId) === GROWTH_ID).map(x => ({ ...x, config: cloneConfig(x.config || GROWTH_DEFAULT) }));
    original.setCommunity?.(all.filter(x => (x?.patternId || x?.pattern_id || x?.baseId || x?.config?.patternId) !== GROWTH_ID));
    requestAnimationFrame(ensureLibraryTiles);
  };
  Setka.setRecommendations = data => {
    recommended = Array.isArray(data?.patterns) && data.patterns.map(String).includes(GROWTH_ID);
    original.setRecommendations?.({ ...data, patterns: (data?.patterns || []).filter(x => String(x) !== GROWTH_ID) });
    requestAnimationFrame(ensureLibraryTiles);
  };
  Setka.BREATHING_FRACTAL_GROWTH_DEFAULT = cloneConfig(GROWTH_DEFAULT);

  favoriteButton?.addEventListener("click", e => { if (!active) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); const match = matchingFavorite(); if (match) removeFavorite(match, "game"); else saveFavorite(config, frame, { origin: "game", parentCommunityId: source.communityId || null }); }, true);
  colorButton?.addEventListener("click", e => { if (!active) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); cycleColor("button"); }, true);
  instructionsButton?.addEventListener("click", e => { if (!active) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); const panel = instructionsModal?.querySelector(".instructions"); if (panel) panel.innerHTML = instructionsHTML(); instructionsModal?.classList.add("open"); emit("instructions-open"); }, true);
  libraryButton?.addEventListener("click", e => { if (!active) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); closeToLibrary(); }, true);

  function replaceArrow(id, dir) {
    const old = document.getElementById(id); if (!old) return null;
    const fresh = old.cloneNode(true); old.replaceWith(fresh);
    fresh.addEventListener("click", e => {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      const patterns = Setka.getPatterns?.() || []; if (!patterns.length) return;
      const current = Setka.getState?.()?.patternId || patterns[0].id;
      let i = patterns.findIndex(p => p.id === current); if (i < 0) i = 0;
      i = (i + dir + patterns.length) % patterns.length;
      const p = patterns[i]; const c = Setka.getPatternDefaults?.(p.id) || p.defaults;
      if (p.id === GROWTH_ID) return openGrowth(c, { type: "base", id: GROWTH_ID, patternId: GROWTH_ID, communityId: null });
      deactivate(); return Setka.openConfig?.(c, { type: "base", id: p.id, patternId: p.id, communityId: null });
    }, true);
    return fresh;
  }
  replaceArrow("prevButton", -1); replaceArrow("nextButton", 1);

  window.addEventListener("resize", () => { if (active) resizeOverlay(); ensureLibraryTiles(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopAnimation(); else if (active) startAnimation(); });

  ensureLibraryTiles();
  window.__SETKA_BREATHING_FRACTAL_GROWTH_V34__ = { id: GROWTH_ID, title: GROWTH_TITLE, defaults: cloneConfig(GROWTH_DEFAULT), open: openGrowth, renderPreview: drawPreview };
})();