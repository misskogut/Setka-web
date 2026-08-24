(() => {
  "use strict";

  const STORAGE_FAVORITES = "setka-web:favorites:v1";
  const BASE_ID = "tentacle-orbit";
  const BASE_PREVIEW_FRAME = 44;
  const DEFAULT_CONFIG = Object.freeze({
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
  const PATTERNS = [{ id: BASE_ID, title: "Tentacle Orbit", defaults: DEFAULT_CONFIG, version: 1 }];
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
  const ctx = canvas.getContext("2d", { alpha: false });
  const colorButton = $("colorButton");
  const colorDots = $("colorDots");
  const favoriteButton = $("favoriteButton");
  const libraryButton = $("libraryButton");
  const prevButton = $("prevButton");
  const nextButton = $("nextButton");
  const instructionsButton = $("instructionsButton");
  const instructionsModal = $("instructionsModal");
  const closeInstructionsButton = $("closeInstructionsButton");
  const toast = $("toast");

  if (!app || !canvas || !communityPanel) return;

  let activeLibraryPage = "all";
  let runtimeConfig = cloneConfig(DEFAULT_CONFIG);
  let activeSource = { type: "base", id: BASE_ID, communityId: null };
  let favorites = normalizeFavorites(loadJSON(STORAGE_FAVORITES, []));
  let communityItems = [];
  let recommendedCommunity = new Set();
  let recommendedPatterns = new Set();
  let animationFrame = 0;
  let animationStart = performance.now();
  let currentFrame = 0;
  let toastTimer = 0;

  const touchGesture = { fingers: 0, primaryId: null, x: 0, y: 0 };
  const mouseGesture = { down: false, fingers: 1, x: 0, y: 0 };

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function radians(d) { return d * Math.PI / 180; }
  function mod(n, m) { return ((n % m) + m) % m; }
  function round5(n) { return Math.round(Number(n) * 100000) / 100000; }

  function cloneConfig(c) {
    c = c || DEFAULT_CONFIG;
    return {
      numTentacles: clamp(Math.round(Number(c.numTentacles) || DEFAULT_CONFIG.numTentacles), 3, 72),
      tentacleLength: clamp(Number(c.tentacleLength) || DEFAULT_CONFIG.tentacleLength, 10, 800),
      baseRadius: clamp(Number(c.baseRadius) || DEFAULT_CONFIG.baseRadius, 0, 100),
      movementSpeed: clamp(Number(c.movementSpeed) || DEFAULT_CONFIG.movementSpeed, .05, 10),
      colorSpeed: clamp(Number(c.colorSpeed) || DEFAULT_CONFIG.colorSpeed, .05, 10),
      circleSize: clamp(Number(c.circleSize) || DEFAULT_CONFIG.circleSize, .2, 20),
      lineWeight: clamp(Number(c.lineWeight) || DEFAULT_CONFIG.lineWeight, .1, 10),
      segmentStep: clamp(Math.round(Number(c.segmentStep) || DEFAULT_CONFIG.segmentStep), 1, 20),
      colorModeIndex: clamp(Math.round(Number(c.colorModeIndex) || 0), 0, 8)
    };
  }

  function configKey(c) {
    const x = cloneConfig(c);
    return [
      x.numTentacles,
      round5(x.tentacleLength),
      round5(x.baseRadius),
      round5(x.movementSpeed),
      round5(x.colorSpeed),
      round5(x.circleSize),
      round5(x.lineWeight),
      x.segmentStep,
      x.colorModeIndex
    ].join("|");
  }

  function loadJSON(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (_) { return fallback; }
  }
  function saveJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }

  function normalizeFavorites(list) {
    if (!Array.isArray(list)) return [];
    return list.slice(0, 120).map((item, index) => ({
      id: String(item?.id || `favorite-${Date.now()}-${index}`),
      baseId: String(item?.baseId || BASE_ID),
      config: cloneConfig(item?.config || DEFAULT_CONFIG),
      previewFrame: Number.isFinite(Number(item?.previewFrame)) ? Number(item.previewFrame) : BASE_PREVIEW_FRAME,
      createdAt: Number(item?.createdAt) || Date.now(),
      communityId: item?.communityId ? String(item.communityId) : null,
      parentCommunityId: item?.parentCommunityId ? String(item.parentCommunityId) : null,
      patternVersion: Math.max(1, Math.round(Number(item?.patternVersion) || 1))
    }));
  }

  function persistFavorites() { saveJSON(STORAGE_FAVORITES, favorites); }
  function matchingFavorite(config = runtimeConfig) {
    const key = configKey(config);
    return favorites.find(f => configKey(f.config) === key) || null;
  }

  function statePayload(extra = {}) {
    const match = matchingFavorite();
    return {
      view: gameScreen.classList.contains("active") ? "game" : "library",
      libraryPage: activeLibraryPage,
      patternId: BASE_ID,
      patternVersion: 1,
      sourceType: activeSource.type,
      sourceId: activeSource.id,
      communityId: activeSource.communityId || null,
      config: cloneConfig(runtimeConfig),
      configKey: configKey(runtimeConfig),
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
      resizeMainCanvas();
      animationStart = performance.now();
      currentFrame = 0;
      startAnimation();
      updateColorIndicator();
      updateFavoriteButtonState();
    } else {
      stopAnimation();
      renderLibrary();
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
    const empty = document.createElement("div");
    empty.className = "empty-favorites";
    empty.innerHTML = `<span class="big-heart">${icon}</span>${text}`;
    panel.appendChild(empty);
  }

  function renderLibrary() {
    allPatternsPanel.replaceChildren();
    communityPanel.replaceChildren();
    favoritesPanel.replaceChildren();

    PATTERNS.forEach(pattern => {
      const tile = makePatternTile({ kind: "base", id: pattern.id, config: pattern.defaults, previewFrame: BASE_PREVIEW_FRAME, title: pattern.title });
      if (recommendedPatterns.has(pattern.id)) tile.classList.add("recommended");
      allPatternsPanel.appendChild(tile);
    });

    if (!communityItems.length) {
      emptyPanel(communityPanel, "◎", "Здесь появятся конфигурации,<br>которые сохраняют участники");
    } else {
      communityItems.forEach(item => {
        const tile = makePatternTile({
          kind: "community",
          id: String(item.id),
          config: item.config,
          previewFrame: Number(item.preview_frame ?? item.previewFrame ?? BASE_PREVIEW_FRAME),
          saveCount: Number(item.saveCount) || 0,
          communityId: String(item.id),
          parentCommunityId: item.parent_config_id || null,
          patternVersion: Number(item.pattern_version) || 1
        });
        if (recommendedCommunity.has(String(item.id))) tile.classList.add("recommended");
        communityPanel.appendChild(tile);
      });
    }

    if (!favorites.length) {
      emptyPanel(favoritesPanel, "♥", "Здесь появятся конфигурации,<br>которые ты сохранишь сердцем");
    } else {
      favorites.forEach(f => favoritesPanel.appendChild(makePatternTile({ kind: "favorite", id: f.id, ...f })));
    }
    setLibraryPage(activeLibraryPage, true);
  }

  function makePatternTile(item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `pattern-tile ${item.kind}-tile`;
    button.dataset.kind = item.kind;
    button.dataset.itemId = item.id;
    button.setAttribute("aria-label", item.kind === "favorite" ? "Открыть сохраненную конфигурацию. Удерживай, чтобы удалить" : item.kind === "community" ? "Открыть конфигурацию сообщества. Удерживай, чтобы сохранить себе" : "Открыть исходный паттерн. Удерживай, чтобы сохранить");

    const thumb = document.createElement("canvas");
    thumb.width = 180; thumb.height = 180; thumb.className = "thumb-canvas";
    button.appendChild(thumb);
    drawThumbnail(thumb, item.kind === "base" ? DEFAULT_CONFIG : item.config, item.kind === "base" ? BASE_PREVIEW_FRAME : item.previewFrame);

    if (item.kind === "favorite") {
      const heart = document.createElement("span"); heart.className = "mini-heart"; heart.textContent = "♥"; button.appendChild(heart);
    }
    if (item.kind === "community") {
      const badge = document.createElement("span"); badge.className = "community-count"; badge.textContent = `♥ ${Math.max(0, Number(item.saveCount) || 0)}`; button.appendChild(badge);
    }
    const recommendation = document.createElement("span"); recommendation.className = "recommendation-mark"; recommendation.textContent = "●"; button.appendChild(recommendation);

    let holdTimer = 0, held = false, startX = 0, startY = 0;
    const cancelHold = () => { if (holdTimer) clearTimeout(holdTimer); holdTimer = 0; };
    button.addEventListener("pointerdown", e => {
      held = false; startX = e.clientX; startY = e.clientY;
      button.setPointerCapture?.(e.pointerId);
      holdTimer = window.setTimeout(() => {
        held = true;
        if (item.kind === "favorite") {
          const fav = favorites.find(f => f.id === item.id); if (fav) removeFavorite(fav, "tile_hold");
        } else {
          const cfg = item.kind === "base" ? DEFAULT_CONFIG : item.config;
          const existing = matchingFavorite(cfg);
          if (existing) removeFavorite(existing, "tile_hold");
          else saveFavorite(cfg, item.previewFrame, {
            origin: "tile_hold",
            communityId: item.kind === "community" ? item.communityId : null,
            parentCommunityId: item.kind === "community" ? item.communityId : null,
            patternVersion: item.patternVersion || 1
          });
        }
        if (navigator.vibrate) navigator.vibrate(18);
      }, 620);
    });
    button.addEventListener("pointermove", e => { if (!held && Math.hypot(e.clientX - startX, e.clientY - startY) > 18) cancelHold(); });
    button.addEventListener("pointercancel", cancelHold);
    button.addEventListener("pointerup", e => {
      cancelHold();
      if (held) { e.preventDefault(); return; }
      if (item.kind === "base") openConfig(DEFAULT_CONFIG, { type: "base", id: BASE_ID, communityId: null });
      if (item.kind === "favorite") {
        const fav = favorites.find(f => f.id === item.id); if (fav) openConfig(fav.config, { type: "favorite", id: fav.id, communityId: fav.communityId || null });
      }
      if (item.kind === "community") openConfig(item.config, { type: "community", id: item.communityId, communityId: item.communityId });
    });
    button.addEventListener("contextmenu", e => e.preventDefault());
    return button;
  }

  function openConfig(config, source = {}) {
    runtimeConfig = cloneConfig(config);
    activeSource = {
      type: source.type || "working",
      id: source.id || BASE_ID,
      communityId: source.communityId || null
    };
    setScreen("game");
    emit("pattern-open", { sourceType: activeSource.type, sourceId: activeSource.id, communityId: activeSource.communityId });
  }

  function drawThumbnail(thumb, config, frame) {
    const t = thumb.getContext("2d");
    renderPattern(t, thumb.width, thumb.height, cloneConfig(config), Number.isFinite(Number(frame)) ? Number(frame) : BASE_PREVIEW_FRAME, true);
  }

  function resizeMainCanvas() {
    const rect = app.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`; canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function startAnimation() {
    if (animationFrame) return;
    const tick = now => {
      if (!gameScreen.classList.contains("active")) { animationFrame = 0; return; }
      currentFrame = (now - animationStart) / 16.6667;
      const rect = app.getBoundingClientRect();
      renderPattern(ctx, rect.width, rect.height, runtimeConfig, currentFrame, false);
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
  }
  function stopAnimation() { if (animationFrame) cancelAnimationFrame(animationFrame); animationFrame = 0; }

  function renderPattern(target, width, height, config, frame, thumbnail) {
    target.save(); target.fillStyle = "#000"; target.fillRect(0, 0, width, height); target.translate(width / 2, height / 2);
    if (thumbnail) {
      const extent = Math.max(40, config.tentacleLength * 3 + config.baseRadius + (config.tentacleLength * config.circleSize / 20));
      const s = Math.min(.95, (Math.min(width, height) / 2 - 5) / extent); target.scale(s, s);
    }
    const shift = frame * config.colorSpeed * .5;
    for (let i = 0; i < 360; i += 360 / config.numTentacles) {
      const x0 = Math.sin(radians(i)) * config.baseRadius;
      const y0 = Math.cos(radians(i)) * config.baseRadius;
      for (let q = 0; q < config.tentacleLength; q += config.segmentStep) {
        const a = Math.cos(radians(config.tentacleLength - q + frame * config.movementSpeed)) * q;
        const x = Math.sin(radians(i - a)) * (q * 3);
        const y = Math.cos(radians(i - a)) * (q * 3);
        const d = (config.tentacleLength - q) * config.circleSize / 10;
        target.strokeStyle = getColor(config.colorModeIndex, i, q, x, y, shift, frame);
        target.lineWidth = config.lineWeight;
        target.beginPath(); target.arc(x0 + x, y0 + y, Math.max(.075, d / 2), 0, Math.PI * 2); target.stroke();
      }
    }
    target.restore();
  }

  function getColor(mode, i, q, x, y, shift, frame) {
    switch (mode) {
      case 0: return "hsl(0 0% 100%)";
      case 1: return `hsl(${mod(i + q * 2 + shift, 360)} 100% 50%)`;
      case 2: return `hsl(${mod(frame + q * 2, 360)} 100% 50%)`;
      case 3: return "hsl(200 100% 50%)";
      case 4: return "hsl(330 100% 50%)";
      case 5: return `hsl(${mod(Math.atan2(y, x) * 180 / Math.PI + 180 + shift, 360)} 100% 50%)`;
      case 6: return `hsl(${mod(i + shift, 360)} 100% 50%)`;
      case 7: return `hsl(${mod(q * 5 + shift, 360)} 100% 50%)`;
      case 8: return `hsl(${mod(x + y + shift, 360)} 100% 50%)`;
      default: return "#fff";
    }
  }

  function buildColorDots() {
    colorDots.replaceChildren(); const radius = 42;
    for (let i = 0; i < 9; i++) {
      const d = document.createElement("span"); d.className = "color-dot";
      const angle = -90 + i * 40;
      d.style.transform = `translate(${Math.cos(radians(angle)) * radius}px,${Math.sin(radians(angle)) * radius}px)`;
      colorDots.appendChild(d);
    }
  }
  function updateColorIndicator() {
    const count = runtimeConfig.colorModeIndex + 1;
    [...colorDots.children].forEach((d, i) => d.classList.toggle("visible", i < count));
  }

  function updateFavoriteButtonState() {
    const match = matchingFavorite();
    favoriteButton.textContent = match ? "♥" : "♡";
    favoriteButton.classList.toggle("saved", Boolean(match));
    favoriteButton.setAttribute("aria-label", match ? "Снять лайк с этой конфигурации" : "Сохранить текущую конфигурацию");
  }

  function saveFavorite(config, previewFrame = currentFrame, meta = {}) {
    const existing = matchingFavorite(config);
    if (existing) {
      updateFavoriteButtonState();
      showToast("♥ Уже сохранено");
      return existing;
    }
    const snapshot = {
      id: `favorite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      baseId: BASE_ID,
      config: cloneConfig(config),
      previewFrame: Number.isFinite(Number(previewFrame)) ? Number(previewFrame) : BASE_PREVIEW_FRAME,
      createdAt: Date.now(),
      communityId: meta.communityId || null,
      parentCommunityId: meta.parentCommunityId || activeSource.communityId || null,
      patternVersion: meta.patternVersion || 1
    };
    favorites.unshift(snapshot); favorites = favorites.slice(0, 120); persistFavorites();
    updateFavoriteButtonState(); renderLibrary(); showToast("♥ Конфигурация сохранена");
    emit("favorite-saved", { favorite: { ...snapshot }, origin: meta.origin || "game" });
    return snapshot;
  }

  function removeFavorite(fav, origin = "game") {
    const index = favorites.findIndex(f => f.id === fav.id); if (index < 0) return false;
    const removed = favorites[index]; favorites.splice(index, 1); persistFavorites();
    updateFavoriteButtonState(); renderLibrary(); showToast("♡ Лайк снят");
    emit("favorite-removed", { favorite: { ...removed }, origin });
    return true;
  }

  function updateFavoriteMeta(id, patch = {}) {
    const fav = favorites.find(f => f.id === id); if (!fav) return null;
    Object.assign(fav, patch); persistFavorites(); renderLibrary(); updateFavoriteButtonState(); return { ...fav };
  }

  function showToast(message) {
    toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1400);
  }

  function applyOriginalGesture(x, y, dx, dy, fingers) {
    const before = configKey(runtimeConfig);
    const rect = canvas.getBoundingClientRect();
    const left = x < rect.width / 3, right = x > rect.width * 2 / 3, top = y < rect.height / 3, bottom = y > rect.height * 2 / 3;
    if (fingers === 1) {
      if (Math.abs(dy) > Math.abs(dx)) {
        if (left && dy !== 0) runtimeConfig.numTentacles = clamp(runtimeConfig.numTentacles + (dy > 0 ? -1 : 1), 3, 72);
        if (right) runtimeConfig.circleSize = clamp(runtimeConfig.circleSize - dy * .005, .2, 20);
      } else {
        if (top) runtimeConfig.lineWeight = clamp(runtimeConfig.lineWeight + dx * .01, .1, 10);
        if (bottom) runtimeConfig.movementSpeed = clamp(runtimeConfig.movementSpeed + dx * .001, .05, 10);
      }
    }
    if (fingers === 2) {
      if (left && !bottom && Math.abs(dy) > Math.abs(dx)) runtimeConfig.tentacleLength = clamp(runtimeConfig.tentacleLength - dy * .2, 10, 800);
      if (right && !bottom && Math.abs(dy) > Math.abs(dx)) {
        if (dy < 0) runtimeConfig.segmentStep = Math.max(1, runtimeConfig.segmentStep - 1);
        if (dy > 0) runtimeConfig.segmentStep = Math.min(20, runtimeConfig.segmentStep + 1);
      }
      if (bottom && Math.abs(dx) > Math.abs(dy)) runtimeConfig.colorSpeed = clamp(runtimeConfig.colorSpeed + dx * .001, .05, 10);
    }
    const changed = before !== configKey(runtimeConfig);
    if (changed) updateFavoriteButtonState();
    return changed;
  }

  function localTouch(touch) { const r = canvas.getBoundingClientRect(); return { x: touch.clientX - r.left, y: touch.clientY - r.top }; }
  function getPrimaryTouch(touches) {
    if (!touches.length) return null;
    if (touchGesture.primaryId !== null) for (const t of touches) if (t.identifier === touchGesture.primaryId) return t;
    return touches[0];
  }
  function norm(x, y) { const r = canvas.getBoundingClientRect(); return { x: r.width ? x / r.width : 0, y: r.height ? y / r.height : 0 }; }

  canvas.addEventListener("touchstart", event => {
    event.preventDefault(); const primary = getPrimaryTouch(event.touches); if (!primary) return;
    if (touchGesture.primaryId === null) touchGesture.primaryId = primary.identifier;
    const p = localTouch(primary); touchGesture.fingers = event.touches.length; touchGesture.x = p.x; touchGesture.y = p.y;
    emit("gesture-start", { fingers: touchGesture.fingers, ...norm(p.x, p.y) });
  }, { passive: false });
  canvas.addEventListener("touchmove", event => {
    event.preventDefault(); const primary = getPrimaryTouch(event.touches); if (!primary) return;
    const p = localTouch(primary), dx = p.x - touchGesture.x, dy = p.y - touchGesture.y; touchGesture.fingers = event.touches.length;
    const changed = applyOriginalGesture(p.x, p.y, dx, dy, touchGesture.fingers); touchGesture.x = p.x; touchGesture.y = p.y;
    if (changed) emit("gesture-move", { fingers: touchGesture.fingers, ...norm(p.x, p.y), dx, dy });
  }, { passive: false });
  function endTouch(event) {
    event.preventDefault();
    if (!event.touches.length) {
      emit("gesture-end", { fingers: touchGesture.fingers }); touchGesture.fingers = 0; touchGesture.primaryId = null;
    } else {
      const p = getPrimaryTouch(event.touches); if (p) { const q = localTouch(p); touchGesture.fingers = event.touches.length; touchGesture.x = q.x; touchGesture.y = q.y; }
    }
  }
  canvas.addEventListener("touchend", endTouch, { passive: false });
  canvas.addEventListener("touchcancel", endTouch, { passive: false });

  canvas.addEventListener("mousedown", event => {
    event.preventDefault(); const r = canvas.getBoundingClientRect(); mouseGesture.down = true; mouseGesture.fingers = event.shiftKey ? 2 : 1; mouseGesture.x = event.clientX - r.left; mouseGesture.y = event.clientY - r.top;
    emit("gesture-start", { fingers: mouseGesture.fingers, desktop: true, ...norm(mouseGesture.x, mouseGesture.y) });
  });
  window.addEventListener("mousemove", event => {
    if (!mouseGesture.down) return; const r = canvas.getBoundingClientRect(); const x = event.clientX - r.left, y = event.clientY - r.top, dx = x - mouseGesture.x, dy = y - mouseGesture.y; mouseGesture.fingers = event.shiftKey ? 2 : 1;
    const changed = applyOriginalGesture(x, y, dx, dy, mouseGesture.fingers); mouseGesture.x = x; mouseGesture.y = y;
    if (changed) emit("gesture-move", { fingers: mouseGesture.fingers, desktop: true, ...norm(x, y), dx, dy });
  });
  window.addEventListener("mouseup", () => { if (mouseGesture.down) emit("gesture-end", { fingers: mouseGesture.fingers, desktop: true }); mouseGesture.down = false; });

  colorButton.addEventListener("click", () => {
    const from = runtimeConfig.colorModeIndex; runtimeConfig.colorModeIndex = (from + 1) % 9; updateColorIndicator(); updateFavoriteButtonState(); emit("color", { from, to: runtimeConfig.colorModeIndex });
  });
  favoriteButton.addEventListener("click", () => {
    const match = matchingFavorite();
    if (match) removeFavorite(match, "game");
    else saveFavorite(runtimeConfig, currentFrame, { origin: "game", parentCommunityId: activeSource.communityId || null });
  });
  libraryButton.addEventListener("click", () => { activeLibraryPage = "all"; setScreen("library"); });
  instructionsButton.addEventListener("click", () => { instructionsModal.classList.add("open"); emit("instructions-open"); });
  closeInstructionsButton.addEventListener("click", () => { instructionsModal.classList.remove("open"); emit("instructions-close"); });
  instructionsModal.addEventListener("click", e => { if (e.target === instructionsModal) { instructionsModal.classList.remove("open"); emit("instructions-close"); } });
  prevButton.addEventListener("click", () => showToast("Это первый паттерн"));
  nextButton.addEventListener("click", () => showToast("Добавим следующий паттерн сюда"));

  libraryPagerButton.addEventListener("click", () => setLibraryPage("all"));
  communityPagerButton.addEventListener("click", () => setLibraryPage("community"));
  favoritesPagerButton.addEventListener("click", () => setLibraryPage("favorites"));

  let librarySwipeStart = null;
  librarySwipeArea.addEventListener("pointerdown", e => { if (e.target.closest("button")) return; librarySwipeStart = { x: e.clientX, y: e.clientY }; });
  librarySwipeArea.addEventListener("pointerup", e => {
    if (!librarySwipeStart) return; const dx = e.clientX - librarySwipeStart.x, dy = e.clientY - librarySwipeStart.y; librarySwipeStart = null;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    let idx = PAGE_ORDER.indexOf(activeLibraryPage); idx += dx < 0 ? 1 : -1; idx = clamp(idx, 0, PAGE_ORDER.length - 1); setLibraryPage(PAGE_ORDER[idx]);
  });
  librarySwipeArea.addEventListener("pointercancel", () => { librarySwipeStart = null; });

  window.addEventListener("resize", () => { if (gameScreen.classList.contains("active")) resizeMainCanvas(); renderLibrary(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopAnimation(); else if (gameScreen.classList.contains("active")) startAnimation(); });

  window.SetkaApp = {
    getState: () => statePayload(),
    getConfig: () => cloneConfig(runtimeConfig),
    getFavorites: () => favorites.map(f => ({ ...f, config: cloneConfig(f.config) })),
    configKey,
    openConfig,
    setCommunity(items) { communityItems = Array.isArray(items) ? items.map(i => ({ ...i, config: cloneConfig(i.config || DEFAULT_CONFIG) })) : []; renderLibrary(); },
    setRecommendations(data = {}) { recommendedCommunity = new Set((data.community || []).map(String)); recommendedPatterns = new Set((data.patterns || []).map(String)); renderLibrary(); },
    updateFavoriteMeta,
    refreshFavorites() { favorites = normalizeFavorites(loadJSON(STORAGE_FAVORITES, [])); renderLibrary(); updateFavoriteButtonState(); },
    renderLibrary,
    setLibraryPage,
    finishCurrentUsageHint() { return statePayload(); },
    DEFAULT_CONFIG: cloneConfig(DEFAULT_CONFIG)
  };

  buildColorDots(); updateColorIndicator(); updateFavoriteButtonState(); renderLibrary();
  emit("ready", {});
})();