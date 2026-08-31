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

  const RGB_ID = "rgb-glitch-rings";
  const RGB_TITLE = "RGB Glitch Rings";
  const STORAGE_RGB_FAVORITES = "setka-web:favorites:rgb-glitch-rings:v1";

  const RGB_DEFAULT = Object.freeze({
    patternId: RGB_ID,
    numRings: 20,
    baseSpacing: 20,
    waveSpeed: 0.03,
    waveAmplitude: 38,
    glitchEnabled: true,
    glitchOffset: 1.0,
    ringAlpha: 180,
    invertDirection: true,
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
    setRecommendations: Setka.setRecommendations?.bind(Setka)
  };

  const overlay = document.createElement("canvas");
  overlay.id = "rgbRingsCanvas";
  overlay.setAttribute("aria-label", RGB_TITLE);
  originalCanvas.insertAdjacentElement("afterend", overlay);
  const ctx = overlay.getContext("2d", { alpha: false });

  const style = document.createElement("style");
  style.textContent = `
    #rgbRingsCanvas{position:absolute;inset:0;width:100%;height:100%;display:none;background:#000;touch-action:none;z-index:0}
    .pattern-tile[data-rgb-plugin="1"]{position:relative}
  `;
  document.head.appendChild(style);

  let rgbActive = false;
  let rgbConfig = cloneRgb(RGB_DEFAULT);
  let rgbSource = { type: "base", id: RGB_ID, patternId: RGB_ID, communityId: null };
  let rgbFrame = 0;
  let rgbStart = performance.now();
  let rgbRaf = 0;
  let rgbFavorites = loadRgbFavorites();
  let rgbCommunity = [];
  let rgbRecommended = false;
  let toastTimer = 0;
  let lastTouchAt = 0;

  const touch = { x: 0, y: 0, startX: 0, startY: 0, moved: false, startedAt: 0 };
  const mouse = { down: false, x: 0, y: 0, startX: 0, startY: 0, moved: false };
  let tapTimes = [];

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function round5(v) { return Math.round(Number(v) * 100000) / 100000; }
  function deepClone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function isRgb(config, hint = null) { return (hint || config?.patternId || config?.baseId) === RGB_ID; }

  function cloneRgb(c = RGB_DEFAULT) {
    const d = RGB_DEFAULT;
    return {
      patternId: RGB_ID,
      numRings: clamp(Number(c?.numRings ?? d.numRings), 5, 100),
      baseSpacing: clamp(Number(c?.baseSpacing ?? d.baseSpacing), 2, 80),
      waveSpeed: clamp(Number(c?.waveSpeed ?? d.waveSpeed), 0.001, 0.2),
      waveAmplitude: clamp(Number(c?.waveAmplitude ?? d.waveAmplitude), 0, 200),
      glitchEnabled: c?.glitchEnabled !== false,
      glitchOffset: clamp(Number(c?.glitchOffset ?? d.glitchOffset), 0, 20),
      ringAlpha: clamp(Number(c?.ringAlpha ?? d.ringAlpha), 0, 255),
      invertDirection: c?.invertDirection !== false,
      strokeW: clamp(Number(c?.strokeW ?? d.strokeW), 0.3, 8),
      colorModeIndex: clamp(Math.round(Number(c?.colorModeIndex ?? d.colorModeIndex)), 0, 2)
    };
  }

  function rgbKey(c = rgbConfig) {
    const x = cloneRgb(c);
    return [RGB_ID, round5(x.numRings), round5(x.baseSpacing), round5(x.waveSpeed), round5(x.waveAmplitude), x.glitchEnabled ? 1 : 0, round5(x.glitchOffset), round5(x.ringAlpha), x.invertDirection ? 1 : 0, round5(x.strokeW), x.colorModeIndex].join("|");
  }

  function loadJSON(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (_) { return fallback; }
  }
  function saveJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }

  function loadRgbFavorites() {
    const list = loadJSON(STORAGE_RGB_FAVORITES, []);
    if (!Array.isArray(list)) return [];
    return list.slice(0, 120).map((f, i) => ({
      id: String(f?.id || `rgb-favorite-${Date.now()}-${i}`),
      baseId: RGB_ID,
      patternId: RGB_ID,
      config: cloneRgb(f?.config || RGB_DEFAULT),
      previewFrame: Number.isFinite(Number(f?.previewFrame)) ? Number(f.previewFrame) : 44,
      createdAt: Number(f?.createdAt) || Date.now(),
      communityId: f?.communityId ? String(f.communityId) : null,
      parentCommunityId: f?.parentCommunityId ? String(f.parentCommunityId) : null,
      patternVersion: 1
    }));
  }

  function persistRgbFavorites() { saveJSON(STORAGE_RGB_FAVORITES, rgbFavorites); }
  function matchingRgbFavorite(config = rgbConfig) { const key = rgbKey(config); return rgbFavorites.find(f => rgbKey(f.config) === key) || null; }

  function rgbState(extra = {}) {
    const match = matchingRgbFavorite();
    return {
      view: gameScreen.classList.contains("active") ? "game" : "library",
      libraryPage: original.getState?.()?.libraryPage || "all",
      patternId: RGB_ID,
      patternVersion: 1,
      sourceType: rgbSource.type,
      sourceId: rgbSource.id,
      communityId: rgbSource.communityId || null,
      config: cloneRgb(rgbConfig),
      configKey: rgbKey(rgbConfig),
      frame: rgbFrame,
      favoriteId: match?.id || null,
      favoriteCommunityId: match?.communityId || null,
      favoriteCount: (original.getFavorites?.()?.length || 0) + rgbFavorites.length,
      ...extra
    };
  }

  function emit(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(`setka:${name}`, { detail: { ...detail, state: rgbState() } }));
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

  function renderRgb(target, width, height, config, frame, thumbnail = false) {
    const c = cloneRgb(config);
    target.save();
    target.fillStyle = "#000";
    target.fillRect(0, 0, width, height);
    target.translate(width / 2, height / 2);

    if (thumbnail) {
      const extent = Math.max(20, c.numRings * c.baseSpacing + c.waveAmplitude + c.glitchOffset + 4);
      const scale = Math.min(0.95, (Math.min(width, height) / 2 - 5) / (extent / 2));
      target.scale(scale, scale);
    }

    const t = frame * c.waveSpeed;
    const alpha = clamp(c.ringAlpha / 255, 0, 1);
    const ringCount = Math.max(1, Math.round(c.numRings));

    for (let i = 1; i <= ringCount; i++) {
      const phase = c.invertDirection ? -i : i;
      const offset = Math.sin(t + phase * 0.3) * c.waveAmplitude;
      const diameter = i * c.baseSpacing + offset;
      if (!(diameter > 0)) continue;
      const radius = diameter / 2;

      if (c.glitchEnabled) {
        target.lineWidth = c.strokeW;
        target.strokeStyle = `rgba(255,0,0,${alpha})`;
        target.beginPath(); target.arc(-c.glitchOffset, 0, radius, 0, Math.PI * 2); target.stroke();
        target.strokeStyle = `rgba(0,255,0,${alpha})`;
        target.beginPath(); target.arc(0, 0, radius, 0, Math.PI * 2); target.stroke();
        target.strokeStyle = `rgba(0,100,255,${alpha})`;
        target.beginPath(); target.arc(c.glitchOffset, 0, radius, 0, Math.PI * 2); target.stroke();
      }

      if (c.colorModeIndex !== 0) {
        target.lineWidth = 0.6;
        if (c.colorModeIndex === 1) target.strokeStyle = `rgba(255,100,180,${alpha})`;
        else target.strokeStyle = `hsla(${((t * 100 + i * 5) % 360 + 360) % 360},100%,50%,${alpha})`;
        target.beginPath(); target.arc(0, 0, radius, 0, Math.PI * 2); target.stroke();
      }
    }
    target.restore();
  }

  function drawRgbPreview(canvasEl, config, frame = 44) {
    if (!canvasEl) return;
    const p = canvasEl.getContext("2d");
    renderRgb(p, canvasEl.width, canvasEl.height, cloneRgb(config), Number.isFinite(Number(frame)) ? Number(frame) : 44, true);
  }

  function startRgbAnimation() {
    if (rgbRaf) return;
    const tick = now => {
      if (!rgbActive || !gameScreen.classList.contains("active")) { rgbRaf = 0; return; }
      rgbFrame = (now - rgbStart) / 16.6667;
      const rect = app.getBoundingClientRect();
      renderRgb(ctx, rect.width, rect.height, rgbConfig, rgbFrame, false);
      rgbRaf = requestAnimationFrame(tick);
    };
    rgbRaf = requestAnimationFrame(tick);
  }
  function stopRgbAnimation() { if (rgbRaf) cancelAnimationFrame(rgbRaf); rgbRaf = 0; }

  function updateColorIndicator() {
    if (!rgbActive || !colorDots) return;
    const count = rgbConfig.colorModeIndex + 1;
    [...colorDots.children].forEach((dot, i) => dot.classList.toggle("visible", i < count));
  }

  function updateFavoriteState() {
    if (!rgbActive || !favoriteButton) return;
    const match = matchingRgbFavorite();
    favoriteButton.textContent = match ? "♥" : "♡";
    favoriteButton.classList.toggle("saved", Boolean(match));
    favoriteButton.setAttribute("aria-label", match ? "Снять лайк с этой конфигурации" : "Сохранить текущую конфигурацию");
  }

  function renderHostLibrary() {
    original.renderLibrary?.();
    requestAnimationFrame(ensureLibraryTiles);
  }

  function saveRgbFavorite(config = rgbConfig, frame = rgbFrame, meta = {}) {
    const existing = matchingRgbFavorite(config);
    if (existing) { updateFavoriteState(); showToast("♥ Уже сохранено"); return existing; }
    const snapshot = {
      id: `rgb-favorite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      baseId: RGB_ID,
      patternId: RGB_ID,
      config: cloneRgb(config),
      previewFrame: Number.isFinite(Number(frame)) ? Number(frame) : 44,
      createdAt: Date.now(),
      communityId: meta.communityId || null,
      parentCommunityId: meta.parentCommunityId || rgbSource.communityId || null,
      patternVersion: 1
    };
    rgbFavorites.unshift(snapshot);
    rgbFavorites = rgbFavorites.slice(0, 120);
    persistRgbFavorites();
    renderHostLibrary();
    updateFavoriteState();
    showToast("♥ Конфигурация сохранена");
    emit("favorite-saved", { favorite: deepClone(snapshot), origin: meta.origin || "game" });
    return snapshot;
  }

  function removeRgbFavorite(fav, origin = "game") {
    const i = rgbFavorites.findIndex(x => x.id === fav.id);
    if (i < 0) return false;
    const removed = rgbFavorites.splice(i, 1)[0];
    persistRgbFavorites();
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

  function openRgb(config = RGB_DEFAULT, source = {}) {
    rgbConfig = cloneRgb(config);
    rgbSource = {
      type: source.type || "base",
      id: source.id || RGB_ID,
      patternId: RGB_ID,
      communityId: source.communityId || null
    };
    rgbActive = true;
    rgbFrame = 0;
    rgbStart = performance.now();
    originalCanvas.style.visibility = "hidden";
    overlay.style.display = "block";
    if (modeLabel) modeLabel.textContent = "RGB Glitch Rings";
    resizeOverlay();
    showGame();
    updateColorIndicator();
    updateFavoriteState();
    startRgbAnimation();
    emit("view", { view: "game" });
    emit("pattern-open", { patternId: RGB_ID, sourceType: rgbSource.type, sourceId: rgbSource.id, communityId: rgbSource.communityId });
  }

  function deactivateRgb() {
    if (!rgbActive) return;
    rgbActive = false;
    stopRgbAnimation();
    overlay.style.display = "none";
    originalCanvas.style.visibility = "";
    if (modeLabel) modeLabel.textContent = "";
  }

  function closeRgbToLibrary() {
    if (!rgbActive) return;
    deactivateRgb();
    gameScreen.classList.remove("active");
    libraryScreen.classList.add("active");
    original.renderLibrary?.();
    ensureLibraryTiles();
    window.dispatchEvent(new CustomEvent("setka:view", { detail: { view: "library", state: original.getState?.() || { view: "library" } } }));
  }

  function cycleColor(origin = "button") {
    const from = rgbConfig.colorModeIndex;
    rgbConfig.colorModeIndex = (from + 1) % 3;
    updateColorIndicator();
    updateFavoriteState();
    emit("color", { from, to: rgbConfig.colorModeIndex, origin });
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

  function localTouch(t) {
    const r = overlay.getBoundingClientRect();
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }
  function normalized(x, y) {
    const r = overlay.getBoundingClientRect();
    return { x: r.width ? x / r.width : 0, y: r.height ? y / r.height : 0 };
  }

  function applyGesture(x, y, dx, dy) {
    const rect = overlay.getBoundingClientRect();
    let changed = false;

    if (x < rect.width * 0.25 && Math.abs(dy) > 10) {
      rgbConfig.numRings = clamp(rgbConfig.numRings + dy * 0.05, 5, 100);
      touch.startY = y; mouse.startY = y; changed = true;
    }
    if (x > rect.width * 0.75 && Math.abs(dy) > 10) {
      rgbConfig.waveAmplitude = clamp(rgbConfig.waveAmplitude - dy * 0.1, 0, 200);
      touch.startY = y; mouse.startY = y; changed = true;
    }
    if (y < rect.height * 0.25 && Math.abs(dx) > 5) {
      rgbConfig.strokeW = clamp(rgbConfig.strokeW + dx * 0.01, 0.3, 8);
      touch.startX = x; mouse.startX = x; changed = true;
    }
    if (y > rect.height * 0.75 && Math.abs(dx) > 5) {
      rgbConfig.waveSpeed = clamp(rgbConfig.waveSpeed + dx * 0.0003, 0.001, 0.2);
      touch.startX = x; mouse.startX = x; changed = true;
    }

    if (changed) updateFavoriteState();
    return changed;
  }

  overlay.addEventListener("touchstart", e => {
    if (!rgbActive || !e.touches.length) return;
    e.preventDefault();
    lastTouchAt = Date.now();
    const p = localTouch(e.touches[0]);
    touch.x = touch.startX = p.x;
    touch.y = touch.startY = p.y;
    touch.moved = false;
    touch.startedAt = performance.now();
    emit("gesture-start", { fingers: e.touches.length, ...normalized(p.x, p.y) });
  }, { passive: false });

  overlay.addEventListener("touchmove", e => {
    if (!rgbActive || !e.touches.length) return;
    e.preventDefault();
    lastTouchAt = Date.now();
    const p = localTouch(e.touches[0]);
    const dx = p.x - touch.startX;
    const dy = p.y - touch.startY;
    if (Math.hypot(p.x - touch.x, p.y - touch.y) > 2) touch.moved = true;
    const changed = applyGesture(p.x, p.y, dx, dy);
    touch.x = p.x; touch.y = p.y;
    if (changed) emit("gesture-move", { fingers: e.touches.length, ...normalized(p.x, p.y), dx, dy });
  }, { passive: false });

  overlay.addEventListener("touchend", e => {
    if (!rgbActive) return;
    e.preventDefault();
    lastTouchAt = Date.now();
    emit("gesture-end", { fingers: 1 });
    if (!touch.moved && performance.now() - touch.startedAt < 350) registerTap();
  }, { passive: false });

  overlay.addEventListener("mousedown", e => {
    if (!rgbActive || Date.now() - lastTouchAt < 700) return;
    e.preventDefault();
    const r = overlay.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    mouse.down = true; mouse.x = mouse.startX = x; mouse.y = mouse.startY = y; mouse.moved = false;
    emit("gesture-start", { fingers: 1, desktop: true, ...normalized(x, y) });
  });
  window.addEventListener("mousemove", e => {
    if (!rgbActive || !mouse.down) return;
    const r = overlay.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const dx = x - mouse.startX, dy = y - mouse.startY;
    if (Math.hypot(x - mouse.x, y - mouse.y) > 2) mouse.moved = true;
    const changed = applyGesture(x, y, dx, dy);
    mouse.x = x; mouse.y = y;
    if (changed) emit("gesture-move", { fingers: 1, desktop: true, ...normalized(x, y), dx, dy });
  });
  window.addEventListener("mouseup", () => {
    if (!rgbActive || !mouse.down) return;
    emit("gesture-end", { fingers: 1, desktop: true });
    if (!mouse.moved) registerTap();
    mouse.down = false;
  });

  function rgbInstructions() {
    return '<h2 id="instructionsTitle">Управление · RGB Glitch Rings</h2><div class="gesture-group"><strong>1 палец</strong><div class="gesture-row"><span>Слева ↑↓</span><span>Количество колец</span></div><div class="gesture-row"><span>Справа ↑↓</span><span>Амплитуда волны</span></div><div class="gesture-row"><span>Сверху ←→</span><span>Толщина линий</span></div><div class="gesture-row"><span>Снизу ←→</span><span>Скорость движения</span></div></div><div class="gesture-group"><strong>Тапы</strong><div class="gesture-row"><span>3 тапа</span><span>Без наложения → розовый → радуга</span></div></div><button class="close-modal" type="button">Понятно</button>';
  }

  function bindTile(button, item) {
    let holdTimer = 0, held = false, sx = 0, sy = 0;
    const cancel = () => { if (holdTimer) clearTimeout(holdTimer); holdTimer = 0; };
    button.addEventListener("pointerdown", e => {
      held = false; sx = e.clientX; sy = e.clientY;
      button.setPointerCapture?.(e.pointerId);
      holdTimer = setTimeout(() => {
        held = true;
        if (item.kind === "favorite") removeRgbFavorite(item.favorite, "tile_hold");
        else {
          const existing = matchingRgbFavorite(item.config);
          if (existing) removeRgbFavorite(existing, "tile_hold");
          else saveRgbFavorite(item.config, item.previewFrame, { origin: "tile_hold", communityId: item.communityId || null, parentCommunityId: item.communityId || null });
        }
        navigator.vibrate?.(18);
      }, 620);
    });
    button.addEventListener("pointermove", e => { if (!held && Math.hypot(e.clientX - sx, e.clientY - sy) > 18) cancel(); });
    button.addEventListener("pointercancel", cancel);
    button.addEventListener("pointerup", e => {
      cancel();
      if (held) { e.preventDefault(); return; }
      openRgb(item.config, { type: item.kind, id: item.id, patternId: RGB_ID, communityId: item.communityId || null });
    });
    button.addEventListener("contextmenu", e => e.preventDefault());
  }

  function makeRgbTile(item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `pattern-tile ${item.kind}-tile`;
    button.dataset.kind = item.kind;
    button.dataset.itemId = item.id;
    button.dataset.patternId = RGB_ID;
    button.dataset.rgbPlugin = "1";
    button.setAttribute("aria-label", item.kind === "favorite" ? "Открыть сохраненную конфигурацию RGB Glitch Rings. Удерживай, чтобы удалить" : `Открыть паттерн ${RGB_TITLE}. Удерживай, чтобы сохранить`);
    const thumb = document.createElement("canvas");
    thumb.width = 180; thumb.height = 180; thumb.className = "thumb-canvas";
    button.appendChild(thumb);
    drawRgbPreview(thumb, item.config, item.previewFrame ?? 44);
    if (item.kind === "favorite") {
      const heart = document.createElement("span"); heart.className = "mini-heart"; heart.textContent = "♥"; button.appendChild(heart);
    }
    if (item.kind === "community") {
      const badge = document.createElement("span"); badge.className = "community-count"; badge.textContent = `♥ ${Math.max(0, Number(item.saveCount) || 0)}`; button.appendChild(badge);
    }
    if (item.kind === "base") {
      const recommendation = document.createElement("span"); recommendation.className = "recommendation-mark"; recommendation.textContent = "●"; recommendation.style.display = rgbRecommended ? "" : "none"; button.appendChild(recommendation);
    }
    bindTile(button, item);
    return button;
  }

  function ensureBaseTile() {
    if (!allPatternsPanel || allPatternsPanel.querySelector(`[data-rgb-plugin="1"][data-kind="base"]`)) return;
    allPatternsPanel.appendChild(makeRgbTile({ kind: "base", id: RGB_ID, config: RGB_DEFAULT, previewFrame: 44 }));
  }

  function ensureFavoriteTiles() {
    if (!favoritesPanel) return;
    const existing = new Set([...favoritesPanel.querySelectorAll('[data-rgb-plugin="1"][data-kind="favorite"]')].map(x => x.dataset.itemId));
    if (rgbFavorites.length) favoritesPanel.querySelector(".empty-favorites")?.remove();
    for (const fav of rgbFavorites) {
      if (existing.has(fav.id)) continue;
      favoritesPanel.appendChild(makeRgbTile({ kind: "favorite", id: fav.id, favorite: fav, config: fav.config, previewFrame: fav.previewFrame, communityId: fav.communityId }));
    }
  }

  function ensureCommunityTiles() {
    if (!communityPanel) return;
    const existing = new Set([...communityPanel.querySelectorAll('[data-rgb-plugin="1"][data-kind="community"]')].map(x => x.dataset.itemId));
    if (rgbCommunity.length) communityPanel.querySelector(".empty-favorites")?.remove();
    for (const item of rgbCommunity) {
      const id = String(item.id);
      if (existing.has(id)) continue;
      communityPanel.appendChild(makeRgbTile({ kind: "community", id, communityId: id, config: cloneRgb(item.config), previewFrame: Number(item.preview_frame ?? item.previewFrame ?? 44), saveCount: Number(item.saveCount) || 0 }));
    }
  }

  function ensureLibraryTiles() {
    ensureBaseTile();
    ensureFavoriteTiles();
    ensureCommunityTiles();
  }

  const observer = new MutationObserver(() => requestAnimationFrame(ensureLibraryTiles));
  observer.observe(allPatternsPanel, { childList: true });
  if (favoritesPanel) observer.observe(favoritesPanel, { childList: true });
  if (communityPanel) observer.observe(communityPanel, { childList: true });

  Setka.getPatterns = () => {
    const base = original.getPatterns?.() || [];
    return base.some(p => p.id === RGB_ID) ? base : [...base, { id: RGB_ID, title: RGB_TITLE, version: 1, defaults: cloneRgb(RGB_DEFAULT) }];
  };
  Setka.getPatternDefaults = id => id === RGB_ID ? cloneRgb(RGB_DEFAULT) : original.getPatternDefaults?.(id);
  Setka.getPatternTitle = id => id === RGB_ID ? RGB_TITLE : original.getPatternTitle?.(id);
  Setka.cloneConfig = (config, hint = null) => isRgb(config, hint) ? cloneRgb(config) : original.cloneConfig?.(config, hint);
  Setka.configKey = (config, hint = null) => isRgb(config, hint) ? rgbKey(config) : original.configKey?.(config, hint);
  Setka.getState = () => rgbActive ? rgbState() : original.getState?.();
  Setka.getConfig = () => rgbActive ? cloneRgb(rgbConfig) : original.getConfig?.();
  Setka.getFavorites = () => [...(original.getFavorites?.() || []), ...rgbFavorites.map(deepClone)];
  Setka.renderPreview = (canvasEl, config, frame = 44, patternId = null) => isRgb(config, patternId) ? drawRgbPreview(canvasEl, config, frame) : original.renderPreview?.(canvasEl, config, frame, patternId);
  Setka.openConfig = (config, source = {}) => {
    const pid = source.patternId || source.baseId || config?.patternId || config?.baseId;
    if (pid === RGB_ID) return openRgb(config, source);
    deactivateRgb();
    return original.openConfig?.(config, source);
  };
  Setka.refreshFavorites = () => {
    original.refreshFavorites?.();
    rgbFavorites = loadRgbFavorites();
    ensureLibraryTiles();
  };
  Setka.renderLibrary = () => { original.renderLibrary?.(); requestAnimationFrame(ensureLibraryTiles); };
  Setka.setCommunity = items => {
    const all = Array.isArray(items) ? items : [];
    rgbCommunity = all.filter(x => (x?.patternId || x?.pattern_id || x?.baseId || x?.config?.patternId) === RGB_ID).map(x => ({ ...x, config: cloneRgb(x.config || RGB_DEFAULT) }));
    original.setCommunity?.(all.filter(x => (x?.patternId || x?.pattern_id || x?.baseId || x?.config?.patternId) !== RGB_ID));
    requestAnimationFrame(ensureLibraryTiles);
  };
  Setka.setRecommendations = data => {
    rgbRecommended = Array.isArray(data?.patterns) && data.patterns.map(String).includes(RGB_ID);
    original.setRecommendations?.({ ...data, patterns: (data?.patterns || []).filter(x => String(x) !== RGB_ID) });
    requestAnimationFrame(ensureLibraryTiles);
  };
  Setka.RGB_RINGS_DEFAULT = cloneRgb(RGB_DEFAULT);

  favoriteButton?.addEventListener("click", e => {
    if (!rgbActive) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    const match = matchingRgbFavorite();
    if (match) removeRgbFavorite(match, "game"); else saveRgbFavorite(rgbConfig, rgbFrame, { origin: "game", parentCommunityId: rgbSource.communityId || null });
  }, true);

  colorButton?.addEventListener("click", e => {
    if (!rgbActive) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    cycleColor("button");
  }, true);

  instructionsButton?.addEventListener("click", e => {
    if (!rgbActive) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    const panel = instructionsModal?.querySelector(".instructions");
    if (panel) panel.innerHTML = rgbInstructions();
    instructionsModal?.classList.add("open");
    emit("instructions-open");
  }, true);

  libraryButton?.addEventListener("click", e => {
    if (!rgbActive) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    closeRgbToLibrary();
  }, true);

  function cyclePattern(dir) {
    const base = original.getPatterns?.() || [];
    const order = [...base.map(p => p.id).filter(id => id !== RGB_ID), RGB_ID];
    const current = rgbActive ? RGB_ID : original.getState?.()?.patternId;
    let i = order.indexOf(current);
    if (i < 0) i = 0;
    i = (i + dir + order.length) % order.length;
    const id = order[i];
    if (id === RGB_ID) return openRgb(RGB_DEFAULT, { type: "base", id: RGB_ID, patternId: RGB_ID, communityId: null });
    deactivateRgb();
    return original.openConfig?.(original.getPatternDefaults?.(id), { type: "base", id, patternId: id, communityId: null });
  }

  prevButton?.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); cyclePattern(-1); }, true);
  nextButton?.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); cyclePattern(1); }, true);

  window.addEventListener("resize", () => { if (rgbActive) resizeOverlay(); ensureLibraryTiles(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopRgbAnimation(); else if (rgbActive) startRgbAnimation(); });

  ensureLibraryTiles();
  window.__SETKA_RGB_RINGS_V34__ = { id: RGB_ID, title: RGB_TITLE, defaults: cloneRgb(RGB_DEFAULT), open: openRgb, renderPreview: drawRgbPreview };
})();