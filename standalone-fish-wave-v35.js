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
  const FISH_TITLE = "Носовая волна";
  const STORAGE_FAVORITES = "setka-web:favorites:fish-wave:v35";

  const FISH_DEFAULT = Object.freeze({
    patternId: FISH_ID,
    numLayers: 40,
    baseRadius: 10,
    ringSpacing: 9,
    waveSpeed: 0.08,
    waveAmplitude: 5,
    glitchEnabled: true,
    glitchOffset: 0.5,
    ringAlpha: 180,
    strokeW: 1,
    colorModeIndex: 0
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
    setRecommendations: Setka.setRecommendations?.bind(Setka),
    updateFavoriteMeta: Setka.updateFavoriteMeta?.bind(Setka)
  };

  const overlay = document.createElement("canvas");
  overlay.id = "fishWaveCanvasV35";
  overlay.setAttribute("aria-label", FISH_TITLE);
  originalCanvas.insertAdjacentElement("afterend", overlay);
  const ctx = overlay.getContext("2d", { alpha: false });

  const paramsPanel = document.createElement("div");
  paramsPanel.id = "fishParamsV35";
  paramsPanel.hidden = true;
  gameScreen.appendChild(paramsPanel);

  const style = document.createElement("style");
  style.textContent = `
    #fishWaveCanvasV35{position:absolute;inset:0;width:100%;height:100%;display:none;background:#000;touch-action:none;z-index:0}
    #fishParamsV35{position:absolute;left:0;right:0;bottom:0;z-index:6;padding:10px 12px;background:rgba(0,0,0,.9);color:#fff;font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre;pointer-events:none}
    .pattern-tile[data-fish-wave-v35="1"]{position:relative}
  `;
  document.head.appendChild(style);

  let active = false;
  let config = cloneFish(FISH_DEFAULT);
  let source = { type: "base", id: FISH_ID, patternId: FISH_ID, communityId: null };
  let frame = 0;
  let startedAt = performance.now();
  let raf = 0;
  let favorites = loadFavorites();
  let community = [];
  let recommended = false;
  let toastTimer = 0;
  let lastTouchAt = 0;
  let tapTimes = [];
  let showParams = false;

  const touch = { x: 0, y: 0, startX: 0, startY: 0, moved: false, startedAt: 0 };
  const mouse = { down: false, x: 0, y: 0, startX: 0, startY: 0, moved: false };

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function round5(v) { return Math.round(Number(v) * 100000) / 100000; }
  function deepClone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function isFish(c, hint = null) { return (hint || c?.patternId || c?.baseId) === FISH_ID; }

  function cloneFish(c = FISH_DEFAULT) {
    const d = FISH_DEFAULT;
    return {
      patternId: FISH_ID,
      numLayers: clamp(Number(c?.numLayers ?? d.numLayers), 5, 100),
      baseRadius: clamp(Number(c?.baseRadius ?? d.baseRadius), 1, 100),
      ringSpacing: clamp(Number(c?.ringSpacing ?? d.ringSpacing), 1, 80),
      waveSpeed: clamp(Number(c?.waveSpeed ?? d.waveSpeed), 0.001, 0.2),
      waveAmplitude: clamp(Number(c?.waveAmplitude ?? d.waveAmplitude), 0, 200),
      glitchEnabled: c?.glitchEnabled !== false,
      glitchOffset: clamp(Number(c?.glitchOffset ?? d.glitchOffset), 0, 20),
      ringAlpha: clamp(Number(c?.ringAlpha ?? d.ringAlpha), 0, 255),
      strokeW: clamp(Number(c?.strokeW ?? d.strokeW), 0.3, 8),
      colorModeIndex: clamp(Math.round(Number(c?.colorModeIndex ?? d.colorModeIndex)), 0, 2)
    };
  }

  function keyOf(c = config) {
    const x = cloneFish(c);
    return [FISH_ID, round5(x.numLayers), round5(x.baseRadius), round5(x.ringSpacing), round5(x.waveSpeed), round5(x.waveAmplitude), x.glitchEnabled ? 1 : 0, round5(x.glitchOffset), round5(x.ringAlpha), round5(x.strokeW), x.colorModeIndex].join("|");
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
      id: String(f?.id || `fish-favorite-${Date.now()}-${i}`),
      baseId: FISH_ID,
      patternId: FISH_ID,
      config: cloneFish(f?.config || FISH_DEFAULT),
      previewFrame: Number.isFinite(Number(f?.previewFrame)) ? Number(f.previewFrame) : 44,
      createdAt: Number(f?.createdAt) || Date.now(),
      communityId: f?.communityId ? String(f.communityId) : null,
      parentCommunityId: f?.parentCommunityId ? String(f.parentCommunityId) : null,
      patternVersion: 35,
      ...(f?.remoteId ? { remoteId: f.remoteId } : {})
    }));
  }

  function persistFavorites() { saveJSON(STORAGE_FAVORITES, favorites); }
  function matchingFavorite(c = config) { const key = keyOf(c); return favorites.find(f => keyOf(f.config) === key) || null; }

  function state(extra = {}) {
    const match = matchingFavorite();
    return {
      view: gameScreen.classList.contains("active") ? "game" : "library",
      libraryPage: original.getState?.()?.libraryPage || "all",
      patternId: FISH_ID,
      patternVersion: 35,
      sourceType: source.type,
      sourceId: source.id,
      communityId: source.communityId || null,
      config: cloneFish(config),
      configKey: keyOf(config),
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

  function overlayStroke(c, i, t, alpha) {
    if (c.colorModeIndex === 1) return `rgba(255,255,255,${alpha})`;
    if (c.colorModeIndex === 2) {
      const hue = ((t * 100 + i * 5) % 360 + 360) % 360;
      return `hsla(${hue},100%,50%,${alpha})`;
    }
    return `rgba(90,200,255,${alpha})`;
  }

  function circle(target, x, diameter) {
    if (!(diameter > 0)) return;
    target.beginPath();
    target.arc(x, 0, diameter / 2, 0, Math.PI * 2);
    target.stroke();
  }

  function renderFish(target, width, height, rawConfig, drawFrame, thumbnail = false) {
    const c = cloneFish(rawConfig);
    target.save();
    target.fillStyle = "#000";
    target.fillRect(0, 0, width, height);
    target.translate(width / 2, height / 2);

    if (thumbnail) {
      const maxDiameter = c.baseRadius + Math.max(0, c.numLayers - 1) * c.ringSpacing;
      const extent = maxDiameter / 2 + c.waveAmplitude + c.glitchOffset * 2 + 4;
      const scale = Math.min(1, (Math.min(width, height) / 2 - 5) / Math.max(1, extent));
      target.scale(scale, scale);
    }

    const t = drawFrame * c.waveSpeed;
    const alpha = clamp(c.ringAlpha / 255, 0, 1);
    target.lineWidth = c.strokeW;

    for (let i = 0; i < c.numLayers; i++) {
      const phaseOffset = i * 0.2;
      const sideOffset = Math.sin(t - phaseOffset) * c.waveAmplitude;
      const diameter = c.baseRadius + i * c.ringSpacing;

      if (c.glitchEnabled) {
        target.strokeStyle = `rgba(255,0,0,${alpha})`;
        circle(target, 0 * c.glitchOffset + sideOffset, diameter);
        target.strokeStyle = `rgba(0,255,0,${alpha})`;
        circle(target, 1 * c.glitchOffset + sideOffset, diameter);
        target.strokeStyle = `rgba(0,100,255,${alpha})`;
        circle(target, 2 * c.glitchOffset + sideOffset, diameter);
      }

      target.strokeStyle = overlayStroke(c, i, t, alpha);
      circle(target, sideOffset, diameter);
    }
    target.restore();
  }

  function drawPreview(canvasEl, c, previewFrame = 44) {
    if (!canvasEl) return;
    const p = canvasEl.getContext("2d");
    renderFish(p, canvasEl.width, canvasEl.height, c, Number.isFinite(Number(previewFrame)) ? Number(previewFrame) : 44, true);
  }

  function updateParamsPanel() {
    paramsPanel.hidden = !showParams || !active;
    if (paramsPanel.hidden) return;
    paramsPanel.textContent = [
      `waveAmplitude = ${config.waveAmplitude.toFixed(2)}`,
      `waveSpeed = ${config.waveSpeed.toFixed(3)}`,
      `ringSpacing = ${config.ringSpacing.toFixed(1)}`,
      `strokeW = ${config.strokeW.toFixed(2)}`,
      `numLayers = ${config.numLayers.toFixed(2)}`,
      `triple tap = смена цвета`
    ].join("\n");
  }

  function startAnimation() {
    if (raf) return;
    const tick = now => {
      if (!active || !gameScreen.classList.contains("active")) { raf = 0; return; }
      frame = (now - startedAt) / 16.6667;
      const rect = app.getBoundingClientRect();
      renderFish(ctx, rect.width, rect.height, config, frame, false);
      updateParamsPanel();
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

  function renderHostLibrary() {
    original.renderLibrary?.();
    requestAnimationFrame(ensureLibraryTiles);
  }

  function saveFavorite(c = config, previewFrame = frame, meta = {}) {
    const existing = matchingFavorite(c);
    if (existing) { updateFavoriteState(); showToast("♥ Уже сохранено"); return existing; }
    const snapshot = {
      id: `fish-favorite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      baseId: FISH_ID,
      patternId: FISH_ID,
      config: cloneFish(c),
      previewFrame: Number.isFinite(Number(previewFrame)) ? Number(previewFrame) : 44,
      createdAt: Date.now(),
      communityId: meta.communityId || null,
      parentCommunityId: meta.parentCommunityId || source.communityId || null,
      patternVersion: 35
    };
    favorites.unshift(snapshot);
    favorites = favorites.slice(0, 120);
    persistFavorites();
    renderHostLibrary();
    updateFavoriteState();
    showToast("♥ Конфигурация сохранена");
    emit("favorite-saved", { favorite: deepClone(snapshot), origin: meta.origin || "game" });
    return snapshot;
  }

  function removeFavorite(fav, origin = "game") {
    const i = favorites.findIndex(x => x.id === fav.id);
    if (i < 0) return false;
    const removed = favorites.splice(i, 1)[0];
    persistFavorites();
    renderHostLibrary();
    updateFavoriteState();
    showToast("♡ Лайк снят");
    emit("favorite-removed", { favorite: deepClone(removed), origin });
    return true;
  }

  function showGame() {
    libraryScreen.classList.remove("active");
    gameScreen.classList.add("active");
  }

  function openFish(c = FISH_DEFAULT, nextSource = {}) {
    config = cloneFish(c);
    source = {
      type: nextSource.type || "base",
      id: nextSource.id || FISH_ID,
      patternId: FISH_ID,
      communityId: nextSource.communityId || null
    };
    active = true;
    frame = 0;
    startedAt = performance.now();
    originalCanvas.style.visibility = "hidden";
    overlay.style.display = "block";
    if (modeLabel) modeLabel.textContent = FISH_TITLE;
    resizeOverlay();
    showGame();
    updateColorIndicator();
    updateFavoriteState();
    updateParamsPanel();
    startAnimation();
    emit("view", { view: "game" });
    emit("pattern-open", { patternId: FISH_ID, sourceType: source.type, sourceId: source.id, communityId: source.communityId });
  }

  function deactivate() {
    if (!active) return;
    active = false;
    stopAnimation();
    overlay.style.display = "none";
    originalCanvas.style.visibility = "";
    paramsPanel.hidden = true;
    if (modeLabel) modeLabel.textContent = "";
  }

  function closeToLibrary() {
    if (!active) return;
    deactivate();
    gameScreen.classList.remove("active");
    libraryScreen.classList.add("active");
    original.renderLibrary?.();
    ensureLibraryTiles();
    window.dispatchEvent(new CustomEvent("setka:view", { detail: { view: "library", state: original.getState?.() || { view: "library" } } }));
  }

  function cycleColor(origin = "button") {
    const from = config.colorModeIndex;
    config.colorModeIndex = (from + 1) % 3;
    updateColorIndicator();
    updateFavoriteState();
    updateParamsPanel();
    emit("color", { from, to: config.colorModeIndex, origin });
  }

  function registerTap() {
    const now = performance.now();
    tapTimes.push(now);
    if (tapTimes.length > 3) tapTimes.shift();
    if (tapTimes.length === 3 && tapTimes[2] - tapTimes[0] < 600) {
      tapTimes = [];
      cycleColor("triple-tap");
    }
  }

  function localPoint(clientX, clientY) {
    const r = overlay.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }
  function normalized(x, y) {
    const r = overlay.getBoundingClientRect();
    return { x: r.width ? x / r.width : 0, y: r.height ? y / r.height : 0 };
  }

  function applyGesture(x, y, dx, dy) {
    const rect = overlay.getBoundingClientRect();
    const before = cloneFish(config);
    const changed = [];

    if (x < rect.width * 0.25 && Math.abs(dy) > 10) {
      config.numLayers = clamp(config.numLayers + dy * 0.05, 5, 100);
      touch.startY = y; mouse.startY = y; changed.push("numLayers");
    }
    if (x > rect.width * 0.75 && Math.abs(dy) > 10) {
      config.waveAmplitude = clamp(config.waveAmplitude - dy * 0.1, 0, 200);
      touch.startY = y; mouse.startY = y; changed.push("waveAmplitude");
    }
    if (y < rect.height * 0.25 && Math.abs(dx) > 5) {
      config.strokeW = clamp(config.strokeW + dx * 0.01, 0.3, 8);
      touch.startX = x; mouse.startX = x; changed.push("strokeW");
    }
    if (y > rect.height * 0.75 && Math.abs(dx) > 5) {
      config.waveSpeed = clamp(config.waveSpeed + dx * 0.0003, 0.001, 0.2);
      touch.startX = x; mouse.startX = x; changed.push("waveSpeed");
    }

    if (changed.length) {
      updateFavoriteState();
      updateParamsPanel();
      return { changed, before, after: cloneFish(config) };
    }
    return null;
  }

  overlay.addEventListener("touchstart", e => {
    if (!active || !e.touches.length) return;
    e.preventDefault();
    lastTouchAt = Date.now();
    const p = localPoint(e.touches[0].clientX, e.touches[0].clientY);
    touch.x = touch.startX = p.x; touch.y = touch.startY = p.y;
    touch.moved = false; touch.startedAt = performance.now();
    emit("gesture-start", { fingers: e.touches.length, ...normalized(p.x, p.y) });
  }, { passive: false });

  overlay.addEventListener("touchmove", e => {
    if (!active || !e.touches.length) return;
    e.preventDefault();
    lastTouchAt = Date.now();
    const p = localPoint(e.touches[0].clientX, e.touches[0].clientY);
    const dx = p.x - touch.startX, dy = p.y - touch.startY;
    if (Math.hypot(p.x - touch.x, p.y - touch.y) > 2) touch.moved = true;
    const delta = applyGesture(p.x, p.y, dx, dy);
    touch.x = p.x; touch.y = p.y;
    if (delta) emit("gesture-move", { fingers: e.touches.length, ...normalized(p.x, p.y), dx, dy, ...delta });
  }, { passive: false });

  overlay.addEventListener("touchend", e => {
    if (!active) return;
    e.preventDefault();
    lastTouchAt = Date.now();
    emit("gesture-end", { fingers: 1 });
    if (!touch.moved && performance.now() - touch.startedAt < 350) registerTap();
  }, { passive: false });

  overlay.addEventListener("mousedown", e => {
    if (!active || Date.now() - lastTouchAt < 700) return;
    e.preventDefault();
    const p = localPoint(e.clientX, e.clientY);
    mouse.down = true; mouse.x = mouse.startX = p.x; mouse.y = mouse.startY = p.y; mouse.moved = false;
    emit("gesture-start", { fingers: 1, desktop: true, ...normalized(p.x, p.y) });
  });

  window.addEventListener("mousemove", e => {
    if (!active || !mouse.down) return;
    const p = localPoint(e.clientX, e.clientY);
    const dx = p.x - mouse.startX, dy = p.y - mouse.startY;
    if (Math.hypot(p.x - mouse.x, p.y - mouse.y) > 2) mouse.moved = true;
    const delta = applyGesture(p.x, p.y, dx, dy);
    mouse.x = p.x; mouse.y = p.y;
    if (delta) emit("gesture-move", { fingers: 1, desktop: true, ...normalized(p.x, p.y), dx, dy, ...delta });
  });

  window.addEventListener("mouseup", () => {
    if (!active || !mouse.down) return;
    emit("gesture-end", { fingers: 1, desktop: true });
    if (!mouse.moved) registerTap();
    mouse.down = false;
  });

  function instructionsHtml() {
    return `<h2 id="instructionsTitle">Управление · ${FISH_TITLE}</h2>
      <div class="gesture-group"><strong>1 палец</strong>
        <div class="gesture-row"><span>Слева ↑↓</span><span>Количество слоёв</span></div>
        <div class="gesture-row"><span>Справа ↑↓</span><span>Амплитуда носовой волны</span></div>
        <div class="gesture-row"><span>Сверху ←→</span><span>Толщина линий</span></div>
        <div class="gesture-row"><span>Снизу ←→</span><span>Скорость волны</span></div>
      </div>
      <div class="gesture-group"><strong>Тапы</strong><div class="gesture-row"><span>3 тапа</span><span>Голубой → белый → радуга</span></div></div>
      <button class="close-modal" type="button">Понятно</button>`;
  }

  function bindTile(button, item) {
    let holdTimer = 0, held = false, sx = 0, sy = 0;
    const cancel = () => { if (holdTimer) clearTimeout(holdTimer); holdTimer = 0; };
    button.addEventListener("pointerdown", e => {
      held = false; sx = e.clientX; sy = e.clientY;
      button.setPointerCapture?.(e.pointerId);
      holdTimer = setTimeout(() => {
        held = true;
        if (item.kind === "favorite") removeFavorite(item.favorite, "tile_hold");
        else {
          const existing = matchingFavorite(item.config);
          if (existing) removeFavorite(existing, "tile_hold");
          else saveFavorite(item.config, item.previewFrame, { origin: "tile_hold", communityId: item.communityId || null, parentCommunityId: item.communityId || null });
        }
        navigator.vibrate?.(18);
      }, 620);
    });
    button.addEventListener("pointermove", e => { if (!held && Math.hypot(e.clientX - sx, e.clientY - sy) > 18) cancel(); });
    button.addEventListener("pointercancel", cancel);
    button.addEventListener("pointerup", e => {
      cancel();
      if (held) { e.preventDefault(); return; }
      openFish(item.config, { type: item.kind, id: item.id, patternId: FISH_ID, communityId: item.communityId || null });
    });
    button.addEventListener("contextmenu", e => e.preventDefault());
  }

  function makeTile(item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `pattern-tile ${item.kind}-tile`;
    button.dataset.kind = item.kind;
    button.dataset.itemId = item.id;
    button.dataset.patternId = FISH_ID;
    button.dataset.fishWaveV35 = "1";
    button.setAttribute("aria-label", item.kind === "favorite" ? `Открыть сохранённую конфигурацию ${FISH_TITLE}. Удерживай, чтобы удалить` : `Открыть паттерн ${FISH_TITLE}. Удерживай, чтобы сохранить`);
    const thumb = document.createElement("canvas");
    thumb.width = 180; thumb.height = 180; thumb.className = "thumb-canvas";
    button.appendChild(thumb);
    drawPreview(thumb, item.config, item.previewFrame ?? 44);
    if (item.kind === "favorite") {
      const heart = document.createElement("span"); heart.className = "mini-heart"; heart.textContent = "♥"; button.appendChild(heart);
    }
    if (item.kind === "community") {
      const badge = document.createElement("span"); badge.className = "community-count"; badge.textContent = `♥ ${Math.max(0, Number(item.saveCount) || 0)}`; button.appendChild(badge);
    }
    if (item.kind === "base") {
      const mark = document.createElement("span"); mark.className = "recommendation-mark"; mark.textContent = "●"; mark.style.display = recommended ? "" : "none"; button.appendChild(mark);
    }
    bindTile(button, item);
    return button;
  }

  function ensureBaseTile() {
    if (allPatternsPanel.querySelector('[data-fish-wave-v35="1"][data-kind="base"]')) return;
    allPatternsPanel.appendChild(makeTile({ kind: "base", id: FISH_ID, config: FISH_DEFAULT, previewFrame: 44 }));
  }

  function ensureFavoriteTiles() {
    if (!favoritesPanel) return;
    favoritesPanel.querySelectorAll('[data-fish-wave-v35="1"][data-kind="favorite"]').forEach(x => x.remove());
    if (favorites.length) favoritesPanel.querySelector(".empty-favorites")?.remove();
    for (const fav of favorites) favoritesPanel.appendChild(makeTile({ kind: "favorite", id: fav.id, favorite: fav, config: fav.config, previewFrame: fav.previewFrame, communityId: fav.communityId }));
  }

  function ensureCommunityTiles() {
    if (!communityPanel) return;
    communityPanel.querySelectorAll('[data-fish-wave-v35="1"][data-kind="community"]').forEach(x => x.remove());
    if (community.length) communityPanel.querySelector(".empty-favorites")?.remove();
    for (const item of community) {
      const id = String(item.id);
      communityPanel.appendChild(makeTile({ kind: "community", id, communityId: id, config: cloneFish(item.config), previewFrame: Number(item.preview_frame ?? item.previewFrame ?? 44), saveCount: Number(item.saveCount) || 0 }));
    }
  }

  function ensureLibraryTiles() { ensureBaseTile(); ensureFavoriteTiles(); ensureCommunityTiles(); }

  const observer = new MutationObserver(() => requestAnimationFrame(ensureLibraryTiles));
  observer.observe(allPatternsPanel, { childList: true });
  if (favoritesPanel) observer.observe(favoritesPanel, { childList: true });
  if (communityPanel) observer.observe(communityPanel, { childList: true });

  Setka.getPatterns = () => {
    const base = original.getPatterns?.() || [];
    return base.some(p => p.id === FISH_ID) ? base : [...base, { id: FISH_ID, title: FISH_TITLE, version: 35, defaults: cloneFish(FISH_DEFAULT) }];
  };
  Setka.getPatternDefaults = id => id === FISH_ID ? cloneFish(FISH_DEFAULT) : original.getPatternDefaults?.(id);
  Setka.getPatternTitle = id => id === FISH_ID ? FISH_TITLE : original.getPatternTitle?.(id);
  Setka.cloneConfig = (c, hint = null) => isFish(c, hint) ? cloneFish(c) : original.cloneConfig?.(c, hint);
  Setka.configKey = (c, hint = null) => isFish(c, hint) ? keyOf(c) : original.configKey?.(c, hint);
  Setka.getState = () => active ? state() : original.getState?.();
  Setka.getConfig = () => active ? cloneFish(config) : original.getConfig?.();
  Setka.getFavorites = () => [...(original.getFavorites?.() || []), ...favorites.map(deepClone)];
  Setka.renderPreview = (canvasEl, c, previewFrame = 44, patternId = null) => isFish(c, patternId) ? drawPreview(canvasEl, c, previewFrame) : original.renderPreview?.(canvasEl, c, previewFrame, patternId);
  Setka.openConfig = (c, nextSource = {}) => {
    const pid = nextSource.patternId || nextSource.baseId || c?.patternId || c?.baseId;
    if (pid === FISH_ID) return openFish(c, nextSource);
    deactivate();
    return original.openConfig?.(c, nextSource);
  };
  Setka.refreshFavorites = () => {
    original.refreshFavorites?.();
    favorites = loadFavorites();
    ensureLibraryTiles();
  };
  Setka.renderLibrary = () => { original.renderLibrary?.(); requestAnimationFrame(ensureLibraryTiles); };
  Setka.setCommunity = items => {
    const all = Array.isArray(items) ? items : [];
    community = all.filter(x => (x?.patternId || x?.pattern_id || x?.baseId || x?.config?.patternId) === FISH_ID).map(x => ({ ...x, config: cloneFish(x.config || FISH_DEFAULT) }));
    original.setCommunity?.(all.filter(x => (x?.patternId || x?.pattern_id || x?.baseId || x?.config?.patternId) !== FISH_ID));
    requestAnimationFrame(ensureLibraryTiles);
  };
  Setka.setRecommendations = data => {
    recommended = Array.isArray(data?.patterns) && data.patterns.map(String).includes(FISH_ID);
    original.setRecommendations?.({ ...data, patterns: (data?.patterns || []).filter(x => String(x) !== FISH_ID) });
    requestAnimationFrame(ensureLibraryTiles);
  };
  Setka.updateFavoriteMeta = (id, patch = {}) => {
    const fav = favorites.find(x => x.id === id);
    if (!fav) return original.updateFavoriteMeta?.(id, patch);
    Object.assign(fav, deepClone(patch || {}));
    persistFavorites();
    ensureLibraryTiles();
    return deepClone(fav);
  };
  Setka.FISH_WAVE_DEFAULT = cloneFish(FISH_DEFAULT);

  favoriteButton?.addEventListener("click", e => {
    if (!active) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    const match = matchingFavorite();
    if (match) removeFavorite(match, "game"); else saveFavorite(config, frame, { origin: "game", parentCommunityId: source.communityId || null });
  }, true);

  colorButton?.addEventListener("click", e => {
    if (!active) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    cycleColor("button");
  }, true);

  instructionsButton?.addEventListener("click", e => {
    if (!active) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    const panel = instructionsModal?.querySelector(".instructions");
    if (panel) {
      panel.innerHTML = instructionsHtml();
      panel.querySelector(".close-modal")?.addEventListener("click", () => instructionsModal?.classList.remove("open"), { once: true });
    }
    instructionsModal?.classList.add("open");
    emit("instructions-open");
  }, true);

  libraryButton?.addEventListener("click", e => {
    if (!active) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    closeToLibrary();
  }, true);

  function cyclePattern(dir) {
    const base = original.getPatterns?.() || [];
    const order = [...base.map(p => p.id).filter(id => id !== FISH_ID), FISH_ID];
    const current = active ? FISH_ID : original.getState?.()?.patternId;
    let i = order.indexOf(current);
    if (i < 0) i = 0;
    i = (i + dir + order.length) % order.length;
    const id = order[i];
    if (id === FISH_ID) return openFish(FISH_DEFAULT, { type: "base", id: FISH_ID, patternId: FISH_ID, communityId: null });
    deactivate();
    return original.openConfig?.(original.getPatternDefaults?.(id), { type: "base", id, patternId: id, communityId: null });
  }

  prevButton?.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); cyclePattern(-1); }, true);
  nextButton?.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); cyclePattern(1); }, true);

  window.addEventListener("keydown", e => {
    if (!active || (e.key !== "p" && e.key !== "P")) return;
    showParams = !showParams;
    updateParamsPanel();
  });
  window.addEventListener("resize", () => { if (active) resizeOverlay(); ensureLibraryTiles(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopAnimation(); else if (active) startAnimation(); });

  ensureLibraryTiles();
  window.__SETKA_FISH_WAVE_V35__ = { id: FISH_ID, title: FISH_TITLE, defaults: cloneFish(FISH_DEFAULT), open: openFish, renderPreview: drawPreview };
})();