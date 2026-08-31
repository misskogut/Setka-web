(() => {
  "use strict";

  const STORAGE_FAVORITES = "setka-web:favorites:v1";
  const LEGACY_CUSTOM_FAVORITES = [
    "setka-web:favorites:fish-wave:v35",
    "setka-web:favorites:breathing-fractal:v1",
    "setka-web:favorites:breathing-fractal-growth:v1"
  ];

  const TENTACLE_ID = "tentacle-orbit";
  const DANDELION_ID = "dandelion";
  const RGB_RINGS_ID = "rgb-glitch-rings";
  const BREATH_ID = "breathing-fractal";
  const GROWTH_ID = "breathing-fractal-growth";

  const BASE_PREVIEW_FRAME = 44;
  const EDGE = 0.20;
  const TH = 15;
  const FIRST_LEVEL_FACTOR = 2.0;

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

  // Exact user schema: RGB glitch is always RGB; colorMode only controls the extra center circle.
  const RGB_RINGS_DEFAULT = Object.freeze({
    patternId: RGB_RINGS_ID,
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

  const BREATH_DEFAULT = Object.freeze({
    patternId: BREATH_ID,
    baseLen: 70,
    pulseSpd: 0.02,
    pulseAmp: 0.3,
    strokeW: 1.5,
    branches: 8,
    layers: 4,
    colorModeIndex: 0,
    hueRate: 0.004
  });

  const GROWTH_DEFAULT = Object.freeze({
    patternId: GROWTH_ID,
    baseLen: 70,
    pulseSpeed: 0.02,
    strokeW: 1.5,
    branches: 8,
    maxDepth: 4,
    colorModeIndex: 0,
    hueRate: 0.004,
    zoom: 1,
    levelSpeedRatio: 1,
    firstLevelFactor: FIRST_LEVEL_FACTOR
  });

  const PATTERNS = [
    { id: TENTACLE_ID, title: "Tentacle Orbit", defaults: TENTACLE_DEFAULT, version: 1 },
    { id: DANDELION_ID, title: "Одуванчик", defaults: DANDELION_DEFAULT, version: 1 },
    { id: RGB_RINGS_ID, title: "RGB Glitch Rings", defaults: RGB_RINGS_DEFAULT, version: 36 },
    { id: BREATH_ID, title: "Breathing Fractal", defaults: BREATH_DEFAULT, version: 1 },
    { id: GROWTH_ID, title: "Breathing Fractal · Growth", defaults: GROWTH_DEFAULT, version: 1 }
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
  let runtimeConfig = null;
  let activeSource = { type: "base", id: TENTACLE_ID, patternId: TENTACLE_ID, communityId: null };
  let communityItems = [];
  let recommendedCommunity = new Set();
  let recommendedPatterns = new Set();
  let animationFrame = 0;
  let animationStart = performance.now();
  let currentFrame = 0;
  let toastTimer = 0;
  let lastTap = 0;
  let tapCount = 0;

  const touchGesture = {
    fingers: 0,
    primaryId: null,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    secondX: 0,
    secondY: 0,
    lastDist: null
  };
  const mouseGesture = { down: false, fingers: 1, x: 0, y: 0, startX: 0, startY: 0 };

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const radians = d => d * Math.PI / 180;
  const mod = (n, m) => ((n % m) + m) % m;
  const round5 = n => Math.round(Number(n) * 100000) / 100000;

  function patternById(id) { return PATTERNS.find(p => p.id === id) || PATTERNS[0]; }
  function inferPatternId(config, hint = null) {
    const candidate = hint || config?.patternId || config?.baseId;
    return PATTERNS.some(p => p.id === candidate) ? candidate : TENTACLE_ID;
  }
  function readJSON(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (_) { return fallback; }
  }
  function writeJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }

  function cloneConfig(c = {}, hint = null) {
    const id = inferPatternId(c, hint);

    if (id === DANDELION_ID) {
      const d = DANDELION_DEFAULT;
      const history = Array.isArray(c?.v1History) ? c.v1History : [];
      return {
        patternId: id,
        v1: clamp(Number(c?.v1) || d.v1, 0.02, 2),
        numShapes: clamp(Math.round(Number(c?.numShapes ?? c?.NUM_SHAPES) || d.numShapes), 50, 1000),
        angleSpeed: clamp(Number(c?.angleSpeed) || d.angleSpeed, 0.001, 0.05),
        tSpeed: clamp(Number(c?.tSpeed) || d.tSpeed, 0.001, 0.02),
        backgroundAlpha: clamp(Math.round(Number(c?.backgroundAlpha) || d.backgroundAlpha), 0, 255),
        lineWeight: clamp(Number(c?.lineWeight) || d.lineWeight, 0.1, 10),
        pointSize: clamp(Number(c?.pointSize) || d.pointSize, 0.2, 20),
        zoom: clamp(Number(c?.zoom) || d.zoom, 0.2, 5),
        colorModeIndex: clamp(Math.round(Number(c?.colorModeIndex) || 0), 0, 8),
        v1History: history.map(Number).filter(Number.isFinite).slice(-64)
      };
    }

    if (id === RGB_RINGS_ID) {
      const d = RGB_RINGS_DEFAULT;
      // numLayers/ringSpacing are accepted only as migration aliases from the previous schema.
      return {
        patternId: id,
        numRings: clamp(Number(c?.numRings ?? c?.numLayers ?? d.numRings), 5, 100),
        baseSpacing: clamp(Number(c?.baseSpacing ?? c?.ringSpacing ?? d.baseSpacing), 1, 80),
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

    if (id === BREATH_ID) {
      const d = BREATH_DEFAULT;
      return {
        patternId: id,
        baseLen: clamp(Number(c?.baseLen ?? d.baseLen), 10, 180),
        pulseSpd: clamp(Number(c?.pulseSpd ?? d.pulseSpd), 0.001, 0.3),
        pulseAmp: clamp(Number(c?.pulseAmp ?? d.pulseAmp), 0.05, 2),
        strokeW: clamp(Number(c?.strokeW ?? d.strokeW), 0.1, 8),
        branches: clamp(Math.round(Number(c?.branches ?? d.branches)), 2, 60),
        layers: clamp(Math.round(Number(c?.layers ?? d.layers)), 1, 10),
        colorModeIndex: clamp(Math.round(Number(c?.colorModeIndex ?? c?.clrMode ?? d.colorModeIndex)), 0, 2),
        hueRate: clamp(Number(c?.hueRate ?? d.hueRate), 0.0001, 0.05)
      };
    }

    if (id === GROWTH_ID) {
      const d = GROWTH_DEFAULT;
      return {
        patternId: id,
        baseLen: clamp(Number(c?.baseLen ?? d.baseLen), 10, 180),
        pulseSpeed: clamp(Number(c?.pulseSpeed ?? c?.pulseSpd ?? d.pulseSpeed), 0.001, 0.1),
        strokeW: clamp(Number(c?.strokeW ?? d.strokeW), 0.1, 8),
        branches: clamp(Math.round(Number(c?.branches ?? d.branches)), 2, 60),
        maxDepth: clamp(Math.round(Number(c?.maxDepth ?? c?.layers ?? d.maxDepth)), 1, 10),
        colorModeIndex: clamp(Math.round(Number(c?.colorModeIndex ?? c?.clrMode ?? d.colorModeIndex)), 0, 2),
        hueRate: clamp(Number(c?.hueRate ?? d.hueRate), 0.0001, 0.05),
        zoom: clamp(Number(c?.zoom ?? d.zoom), 0.3, 3),
        levelSpeedRatio: clamp(Number(c?.levelSpeedRatio ?? d.levelSpeedRatio), 0.2, 3),
        firstLevelFactor: FIRST_LEVEL_FACTOR
      };
    }

    const d = TENTACLE_DEFAULT;
    return {
      patternId: TENTACLE_ID,
      numTentacles: clamp(Math.round(Number(c?.numTentacles) || d.numTentacles), 3, 72),
      tentacleLength: clamp(Number(c?.tentacleLength) || d.tentacleLength, 10, 800),
      baseRadius: clamp(Number(c?.baseRadius) || d.baseRadius, 0, 100),
      movementSpeed: clamp(Number(c?.movementSpeed) || d.movementSpeed, 0.05, 10),
      colorSpeed: clamp(Number(c?.colorSpeed) || d.colorSpeed, 0.05, 10),
      circleSize: clamp(Number(c?.circleSize) || d.circleSize, 0.2, 20),
      lineWeight: clamp(Number(c?.lineWeight) || d.lineWeight, 0.1, 10),
      segmentStep: clamp(Math.round(Number(c?.segmentStep) || d.segmentStep), 1, 20),
      colorModeIndex: clamp(Math.round(Number(c?.colorModeIndex) || 0), 0, 8)
    };
  }

  function configKey(c, hint = null) {
    const x = cloneConfig(c, hint);
    const id = x.patternId;
    if (id === DANDELION_ID) return [id, round5(x.v1), x.numShapes, round5(x.angleSpeed), round5(x.tSpeed), x.backgroundAlpha, round5(x.lineWeight), round5(x.pointSize), round5(x.zoom), x.colorModeIndex].join("|");
    if (id === RGB_RINGS_ID) return [id, round5(x.numRings), round5(x.baseSpacing), round5(x.waveSpeed), round5(x.waveAmplitude), x.glitchEnabled ? 1 : 0, round5(x.glitchOffset), round5(x.ringAlpha), x.invertDirection ? 1 : 0, round5(x.strokeW), x.colorModeIndex].join("|");
    if (id === BREATH_ID) return [id, round5(x.baseLen), round5(x.pulseSpd), round5(x.pulseAmp), round5(x.strokeW), x.branches, x.layers, x.colorModeIndex, round5(x.hueRate)].join("|");
    if (id === GROWTH_ID) return [id, round5(x.baseLen), round5(x.pulseSpeed), round5(x.strokeW), x.branches, x.maxDepth, x.colorModeIndex, round5(x.hueRate), round5(x.zoom), round5(x.levelSpeedRatio)].join("|");
    return [TENTACLE_ID, x.numTentacles, round5(x.tentacleLength), round5(x.baseRadius), round5(x.movementSpeed), round5(x.colorSpeed), round5(x.circleSize), round5(x.lineWeight), x.segmentStep, x.colorModeIndex].join("|");
  }

  function normalizeFavorites(list) {
    if (!Array.isArray(list)) return [];
    return list.slice(0, 240).map((item, index) => {
      const baseId = inferPatternId(item?.config, item?.baseId || item?.patternId);
      return {
        id: String(item?.id || `favorite-${Date.now()}-${index}`),
        baseId,
        patternId: baseId,
        config: cloneConfig(item?.config || patternById(baseId).defaults, baseId),
        previewFrame: Number.isFinite(Number(item?.previewFrame)) ? Number(item.previewFrame) : BASE_PREVIEW_FRAME,
        createdAt: Number(item?.createdAt) || Date.now(),
        communityId: item?.communityId ? String(item.communityId) : null,
        parentCommunityId: item?.parentCommunityId ? String(item.parentCommunityId) : null,
        patternVersion: Math.max(1, Math.round(Number(item?.patternVersion) || patternById(baseId).version))
      };
    });
  }

  function loadFavorites() {
    const merged = [...(readJSON(STORAGE_FAVORITES, []) || [])];
    for (const key of LEGACY_CUSTOM_FAVORITES) {
      const rows = readJSON(key, []);
      if (Array.isArray(rows)) merged.push(...rows);
    }
    const out = [];
    const seen = new Set();
    for (const f of normalizeFavorites(merged)) {
      const sig = `${f.id}|${configKey(f.config, f.baseId)}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      out.push(f);
    }
    return out.slice(0, 240);
  }

  let favorites = loadFavorites();
  function persistFavorites() { writeJSON(STORAGE_FAVORITES, favorites); }
  function matchingFavorite(config = runtimeConfig, patternId = runtimePatternId) {
    const key = configKey(config, patternId);
    return favorites.find(f => configKey(f.config, f.baseId) === key) || null;
  }

  runtimeConfig = cloneConfig(TENTACLE_DEFAULT, TENTACLE_ID);

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
    const el = document.createElement("div");
    el.className = "empty-favorites";
    el.innerHTML = `<span class="big-heart">${icon}</span>${text}`;
    panel.appendChild(el);
  }

  function normalizeCommunityItem(item) {
    const baseId = inferPatternId(item?.config, item?.pattern_id || item?.patternId || item?.baseId);
    return { ...item, baseId, patternId: baseId, config: cloneConfig(item?.config || patternById(baseId).defaults, baseId) };
  }

  function renderLibrary() {
    allPatternsPanel.replaceChildren();
    communityPanel.replaceChildren();
    favoritesPanel.replaceChildren();

    for (const p of PATTERNS) {
      const tile = makePatternTile({ kind: "base", id: p.id, baseId: p.id, patternId: p.id, config: p.defaults, previewFrame: BASE_PREVIEW_FRAME, title: p.title, patternVersion: p.version });
      if (recommendedPatterns.has(p.id)) tile.classList.add("recommended");
      allPatternsPanel.appendChild(tile);
    }

    if (!communityItems.length) emptyPanel(communityPanel, "◎", "Здесь появятся конфигурации,<br>которые сохраняют участники");
    else for (const raw of communityItems) {
      const item = normalizeCommunityItem(raw);
      const tile = makePatternTile({ kind: "community", id: String(item.id), baseId: item.baseId, patternId: item.baseId, config: item.config, previewFrame: Number(item.preview_frame ?? item.previewFrame ?? BASE_PREVIEW_FRAME), saveCount: Number(item.saveCount) || 0, communityId: String(item.id), parentCommunityId: item.parent_config_id || null, patternVersion: Number(item.pattern_version) || patternById(item.baseId).version });
      if (recommendedCommunity.has(String(item.id))) tile.classList.add("recommended");
      communityPanel.appendChild(tile);
    }

    if (!favorites.length) emptyPanel(favoritesPanel, "♥", "Здесь появятся конфигурации,<br>которые ты сохранишь сердцем");
    else for (const f of favorites) favoritesPanel.appendChild(makePatternTile({ kind: "favorite", id: f.id, patternId: f.baseId, ...f }));

    setLibraryPage(activeLibraryPage, true);
  }

  function makePatternTile(item) {
    const patternId = inferPatternId(item.config, item.patternId || item.baseId || (item.kind === "base" ? item.id : null));
    const button = document.createElement("button");
    button.type = "button";
    button.className = `pattern-tile ${item.kind}-tile`;
    button.dataset.kind = item.kind;
    button.dataset.itemId = item.id;
    button.dataset.patternId = patternId;
    button.setAttribute("aria-label", item.kind === "favorite" ? "Открыть сохраненную конфигурацию. Удерживай, чтобы удалить" : item.kind === "community" ? "Открыть конфигурацию сообщества. Удерживай, чтобы сохранить себе" : `Открыть паттерн ${patternById(patternId).title}. Удерживай, чтобы сохранить`);

    const thumb = document.createElement("canvas");
    thumb.width = 180;
    thumb.height = 180;
    thumb.className = "thumb-canvas";
    button.appendChild(thumb);
    drawThumbnail(thumb, item.config || patternById(patternId).defaults, item.previewFrame, patternId);

    if (item.kind === "favorite") {
      const heart = document.createElement("span");
      heart.className = "mini-heart";
      heart.textContent = "♥";
      button.appendChild(heart);
    }
    if (item.kind === "community") {
      const badge = document.createElement("span");
      badge.className = "community-count";
      badge.textContent = `♥ ${Math.max(0, Number(item.saveCount) || 0)}`;
      button.appendChild(badge);
    }
    const rec = document.createElement("span");
    rec.className = "recommendation-mark";
    rec.textContent = "●";
    button.appendChild(rec);

    let holdTimer = 0, held = false, sx = 0, sy = 0;
    const cancel = () => { if (holdTimer) clearTimeout(holdTimer); holdTimer = 0; };
    button.addEventListener("pointerdown", e => {
      held = false; sx = e.clientX; sy = e.clientY;
      button.setPointerCapture?.(e.pointerId);
      holdTimer = setTimeout(() => {
        held = true;
        if (item.kind === "favorite") {
          const f = favorites.find(x => x.id === item.id);
          if (f) removeFavorite(f, "tile_hold");
        } else {
          const cfg = item.kind === "base" ? patternById(patternId).defaults : item.config;
          const old = matchingFavorite(cfg, patternId);
          if (old) removeFavorite(old, "tile_hold");
          else saveFavorite(cfg, item.previewFrame, { origin: "tile_hold", baseId: patternId, communityId: item.kind === "community" ? item.communityId : null, parentCommunityId: item.kind === "community" ? item.communityId : null, patternVersion: item.patternVersion || patternById(patternId).version });
        }
        navigator.vibrate?.(18);
      }, 620);
    });
    button.addEventListener("pointermove", e => { if (!held && Math.hypot(e.clientX - sx, e.clientY - sy) > 18) cancel(); });
    button.addEventListener("pointercancel", cancel);
    button.addEventListener("pointerup", e => {
      cancel();
      if (held) { e.preventDefault(); return; }
      if (item.kind === "base") openConfig(patternById(patternId).defaults, { type: "base", id: patternId, patternId, communityId: null });
      if (item.kind === "favorite") {
        const f = favorites.find(x => x.id === item.id);
        if (f) openConfig(f.config, { type: "favorite", id: f.id, patternId: f.baseId, communityId: f.communityId || null });
      }
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
    setScreen("game");
    emit("pattern-open", { patternId: runtimePatternId, sourceType: activeSource.type, sourceId: activeSource.id, communityId: activeSource.communityId });
  }

  function drawThumbnail(thumb, config, frame = BASE_PREVIEW_FRAME, patternId = null) {
    const t = thumb.getContext("2d");
    const pid = inferPatternId(config, patternId);
    renderPattern(t, thumb.width, thumb.height, cloneConfig(config, pid), Number.isFinite(Number(frame)) ? Number(frame) : BASE_PREVIEW_FRAME, true, pid);
  }
  function renderPreview(canvasEl, config, frame = BASE_PREVIEW_FRAME, patternId = null) { drawThumbnail(canvasEl, config, frame, patternId); }
  function resizeMainCanvas() {
    const r = app.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(r.width * dpr));
    canvas.height = Math.max(1, Math.floor(r.height * dpr));
    canvas.style.width = `${r.width}px`;
    canvas.style.height = `${r.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function startAnimation() {
    if (animationFrame) return;
    const tick = now => {
      if (!gameScreen.classList.contains("active")) { animationFrame = 0; return; }
      currentFrame = (now - animationStart) / 16.6667;
      const r = app.getBoundingClientRect();
      renderPattern(ctx, r.width, r.height, runtimeConfig, currentFrame, false, runtimePatternId);
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
  }
  function stopAnimation() { if (animationFrame) cancelAnimationFrame(animationFrame); animationFrame = 0; }

  function renderPattern(target, w, h, c, f, thumb, pid = null) {
    const id = inferPatternId(c, pid);
    if (id === DANDELION_ID) return renderDandelion(target, w, h, cloneConfig(c, id), f, thumb);
    if (id === RGB_RINGS_ID) return renderRgbRings(target, w, h, cloneConfig(c, id), f, thumb);
    if (id === BREATH_ID) return renderBreath(target, w, h, cloneConfig(c, id), f, thumb);
    if (id === GROWTH_ID) return renderGrowth(target, w, h, cloneConfig(c, id), f, thumb);
    return renderTentacle(target, w, h, cloneConfig(c, id), f, thumb);
  }

  function renderTentacle(t, w, h, c, f, thumb) {
    t.save(); t.fillStyle = "#000"; t.fillRect(0, 0, w, h); t.translate(w / 2, h / 2);
    if (thumb) {
      const extent = Math.max(40, c.tentacleLength * 3 + c.baseRadius + c.tentacleLength * c.circleSize / 20);
      t.scale(Math.min(0.95, (Math.min(w, h) / 2 - 5) / extent), Math.min(0.95, (Math.min(w, h) / 2 - 5) / extent));
    }
    const shift = f * c.colorSpeed * 0.5;
    for (let i = 0; i < 360; i += 360 / c.numTentacles) {
      const x0 = Math.sin(radians(i)) * c.baseRadius, y0 = Math.cos(radians(i)) * c.baseRadius;
      for (let q = 0; q < c.tentacleLength; q += c.segmentStep) {
        const a = Math.cos(radians(c.tentacleLength - q + f * c.movementSpeed)) * q;
        const x = Math.sin(radians(i - a)) * (q * 3), y = Math.cos(radians(i - a)) * (q * 3), d = (c.tentacleLength - q) * c.circleSize / 10;
        t.strokeStyle = tentacleColor(c.colorModeIndex, i, q, x, y, shift, f);
        t.lineWidth = c.lineWeight; t.beginPath(); t.arc(x0 + x, y0 + y, Math.max(0.075, d / 2), 0, Math.PI * 2); t.stroke();
      }
    }
    t.restore();
  }
  function tentacleColor(mode, i, q, x, y, shift, frame) {
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

  const dandelionRainbowCoord = (x, y, shift = 0) => `hsl(${mod(((Math.atan2(y, x) + Math.PI) * 180 / Math.PI) * 2 + shift, 360)} 100% 50%)`;
  const dandelionRainbowIndex = (i, shift = 0) => `hsl(${mod(i * 0.8 + shift, 360)} 100% 50%)`;
  function dandelionLineColor(mode, i, x, y, shift) { if ([1, 3, 4].includes(mode)) return dandelionRainbowCoord(x, y, shift); if ([5, 6, 8].includes(mode)) return dandelionRainbowIndex(i, shift); return "#fff"; }
  function dandelionPointColor(mode, i, x, y, shift) { if ([1, 2].includes(mode)) return dandelionRainbowCoord(x, y, shift); if ([5, 7].includes(mode)) return dandelionRainbowIndex(i, shift); if ([4, 8].includes(mode)) return "#000"; return "#fff"; }
  const dandelionX = (z, v) => Math.sin(z / 10) * 100 + Math.cos(z / v) * 100;
  const dandelionY = (z, v) => Math.cos(z / 10) * 100 + Math.sin(z / v) * 100;
  const dandelionX2 = (z, v) => Math.sin(z / 10) * 10 + Math.cos(z / v) * 100;
  const dandelionY2 = (z, v) => Math.cos(z / 10) * 10 + Math.sin(z / v) * 100;
  function renderDandelion(t, w, h, c, f, thumb) {
    t.save();
    t.fillStyle = thumb || c.backgroundAlpha >= 254 ? "#000" : `rgba(0,0,0,${clamp(c.backgroundAlpha / 255, 0, 1)})`;
    t.fillRect(0, 0, w, h);
    t.translate(w / 2, h / 2);
    if (thumb) { const extent = Math.max(220, 220 * c.zoom), s = Math.min(0.95, (Math.min(w, h) / 2 - 6) / extent); t.scale(s, s); }
    t.scale(c.zoom, c.zoom); t.rotate(Math.sin(f * c.angleSpeed));
    const tv = f * c.tSpeed, shift = f * 0.5;
    for (let i = 1; i < c.numShapes; i++) {
      const z = tv + i, x1 = dandelionX(z, c.v1), y1 = dandelionY(z, c.v1), x2 = dandelionX2(z, c.v1), y2 = dandelionY2(z, c.v1);
      t.strokeStyle = dandelionLineColor(c.colorModeIndex, i, x1, y1, shift); t.lineWidth = c.lineWeight; t.beginPath(); t.moveTo(x1, y1); t.lineTo(x2, y2); t.stroke();
      t.fillStyle = dandelionPointColor(c.colorModeIndex, i, x1, y1, shift); const r = Math.max(0.25, c.pointSize / 2);
      t.beginPath(); t.arc(x1, y1, r, 0, Math.PI * 2); t.fill(); t.beginPath(); t.arc(x2, y2, r, 0, Math.PI * 2); t.fill();
    }
    t.restore();
  }

  function circle(t, x, diameter) {
    if (!(diameter > 0)) return;
    t.beginPath(); t.arc(x, 0, diameter / 2, 0, Math.PI * 2); t.stroke();
  }

  function renderRgbRings(t, w, h, c, f, thumb) {
    t.save();
    t.fillStyle = "#000";
    t.fillRect(0, 0, w, h);
    t.translate(w / 2, h / 2);

    // p5: t += waveSpeed on every draw. currentFrame is a 60fps-equivalent frame counter.
    const phaseTime = f * c.waveSpeed;

    if (thumb) {
      const maxDiameter = c.numRings * c.baseSpacing + Math.abs(c.waveAmplitude);
      const extent = maxDiameter / 2 + c.glitchOffset + 4;
      const s = Math.min(1, (Math.min(w, h) / 2 - 5) / Math.max(1, extent));
      t.scale(s, s);
    }

    const alpha = clamp(c.ringAlpha / 255, 0, 1);
    for (let i = 1; i <= c.numRings; i++) {
      const phase = c.invertDirection ? -i : i;
      const offset = Math.sin(phaseTime + phase * 0.3) * c.waveAmplitude;
      const diameter = i * c.baseSpacing + offset;

      // RGB glitch always remains RGB.
      if (c.glitchEnabled) {
        t.lineWidth = c.strokeW;
        t.strokeStyle = `rgba(255,0,0,${alpha})`; circle(t, -c.glitchOffset, diameter);
        t.strokeStyle = `rgba(0,255,0,${alpha})`; circle(t, 0, diameter);
        t.strokeStyle = `rgba(0,100,255,${alpha})`; circle(t, c.glitchOffset, diameter);
      }

      // Additional center circle exactly matches colorModeIndex semantics.
      if (c.colorModeIndex === 1) {
        t.lineWidth = 0.6;
        t.strokeStyle = `rgba(255,100,180,${alpha})`;
        circle(t, 0, diameter);
      } else if (c.colorModeIndex === 2) {
        const hueVal = mod(phaseTime * 100 + i * 5, 360);
        t.lineWidth = 0.6;
        t.strokeStyle = `hsla(${hueVal},100%,50%,${alpha})`;
        circle(t, 0, diameter);
      }
    }
    t.restore();
  }

  function branchBreath(t, len, depth, c, f) {
    if (!depth) return;
    t.strokeStyle = c.colorModeIndex === 1 ? "rgb(170,190,255)" : c.colorModeIndex === 2 ? `hsl(${mod(f * c.hueRate * 100 + len * 0.4, 360)} 80% 55%)` : "#fff";
    t.lineWidth = c.strokeW; t.beginPath(); t.moveTo(0, 0); t.lineTo(len, 0); t.stroke();
    t.save(); t.translate(len, 0);
    t.save(); t.rotate(Math.PI / 6); branchBreath(t, len * 0.6, depth - 1, c, f); t.restore();
    t.save(); t.rotate(-Math.PI / 6); branchBreath(t, len * 0.6, depth - 1, c, f); t.restore();
    t.restore();
  }
  function renderBreath(t, w, h, c, f, thumb) {
    t.save(); t.fillStyle = "#000"; t.fillRect(0, 0, w, h); t.translate(w / 2, h / 2);
    const sm = 1 + Math.sin(f * c.pulseSpd) * c.pulseAmp;
    if (thumb) { const rad = Math.max(50, c.baseLen * (1 + Math.abs(c.pulseAmp)) * 2.5), s = Math.min(0.96, (Math.min(w, h) / 2 - 5) / rad); t.scale(s, s); }
    for (let i = 0; i < c.branches; i++) { t.save(); t.rotate(Math.PI * 2 / c.branches * i); branchBreath(t, c.baseLen * sm, c.layers, c, f); t.restore(); }
    t.restore();
  }

  const growthAt = (f, s) => { const p = mod(f * s, 2); return p <= 1 ? p : 2 - p; };
  const levelWeight = (d, c) => d === 1 ? c.firstLevelFactor : Math.pow(c.levelSpeedRatio, d - 1);
  function totalWeight(c) { let s = c.firstLevelFactor; for (let i = 2; i <= c.maxDepth; i++) s += Math.pow(c.levelSpeedRatio, i - 1); return Math.max(0.00001, s); }
  function levelStart(d, c) { if (d === 1) return 0; let s = c.firstLevelFactor; for (let i = 2; i < d; i++) s += Math.pow(c.levelSpeedRatio, i - 1); return s; }
  function branchGrowth(t, len, depth, growth, c, f, sum) {
    if (depth > c.maxDepth) return;
    const weight = levelWeight(depth, c), from = levelStart(depth, c) / sum, to = (levelStart(depth, c) + weight) / sum;
    if (growth < from) return;
    const p = clamp((growth - from) / Math.max(0.00001, to - from), 0, 1), x2 = len * p;
    t.strokeStyle = c.colorModeIndex === 1 ? "rgb(170,190,255)" : c.colorModeIndex === 2 ? `hsl(${mod(f * c.hueRate * 100 + x2 * 0.4, 360)} 80% 55%)` : "#fff";
    t.lineWidth = c.strokeW; t.beginPath(); t.moveTo(0, 0); t.lineTo(x2, 0); t.stroke();
    if (p >= 1 && depth < c.maxDepth) {
      t.save(); t.translate(len, 0);
      t.save(); t.rotate(Math.PI / 6); branchGrowth(t, len * 0.6, depth + 1, growth, c, f, sum); t.restore();
      t.save(); t.rotate(-Math.PI / 6); branchGrowth(t, len * 0.6, depth + 1, growth, c, f, sum); t.restore();
      t.restore();
    }
  }
  function renderGrowth(t, w, h, c, f, thumb) {
    t.save(); t.fillStyle = "#000"; t.fillRect(0, 0, w, h); t.translate(w / 2, h / 2);
    const growth = growthAt(f, c.pulseSpeed);
    if (thumb) { const rad = Math.max(60, c.baseLen * 2.6), s = Math.min(0.95, (Math.min(w, h) / 2 - 5) / rad); t.scale(s * c.zoom, s * c.zoom); }
    else t.scale(c.zoom, c.zoom);
    const sum = totalWeight(c);
    for (let i = 0; i < c.branches; i++) { t.save(); t.rotate(Math.PI * 2 / c.branches * i); branchGrowth(t, c.baseLen, 1, growth, c, f, sum); t.restore(); }
    t.restore();
  }

  function colorModeCount(id = runtimePatternId) { return [RGB_RINGS_ID, BREATH_ID, GROWTH_ID].includes(id) ? 3 : 9; }
  function buildColorDots() {
    colorDots.replaceChildren();
    const radius = 42;
    for (let i = 0; i < 9; i++) {
      const d = document.createElement("span"); d.className = "color-dot";
      const a = -90 + i * 40;
      d.style.transform = `translate(${Math.cos(radians(a)) * radius}px,${Math.sin(radians(a)) * radius}px)`;
      colorDots.appendChild(d);
    }
  }
  function updateColorIndicator() { const count = (runtimeConfig.colorModeIndex || 0) + 1; [...colorDots.children].forEach((d, i) => d.classList.toggle("visible", i < count)); }
  function updateFavoriteButtonState() { const match = matchingFavorite(); favoriteButton.textContent = match ? "♥" : "♡"; favoriteButton.classList.toggle("saved", !!match); favoriteButton.setAttribute("aria-label", match ? "Снять лайк с этой конфигурации" : "Сохранить текущую конфигурацию"); }
  function saveFavorite(config, previewFrame = currentFrame, meta = {}) {
    const pid = inferPatternId(config, meta.baseId || runtimePatternId), existing = matchingFavorite(config, pid);
    if (existing) { updateFavoriteButtonState(); showToast("♥ Уже сохранено"); return existing; }
    const snap = { id: `favorite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, baseId: pid, patternId: pid, config: cloneConfig(config, pid), previewFrame: Number.isFinite(Number(previewFrame)) ? Number(previewFrame) : BASE_PREVIEW_FRAME, createdAt: Date.now(), communityId: meta.communityId || null, parentCommunityId: meta.parentCommunityId || activeSource.communityId || null, patternVersion: meta.patternVersion || patternById(pid).version };
    favorites.unshift(snap); favorites = favorites.slice(0, 240); persistFavorites(); updateFavoriteButtonState(); renderLibrary(); showToast("♥ Конфигурация сохранена"); emit("favorite-saved", { favorite: { ...snap }, origin: meta.origin || "game" }); return snap;
  }
  function removeFavorite(fav, origin = "game") { const i = favorites.findIndex(f => f.id === fav.id); if (i < 0) return false; const removed = favorites.splice(i, 1)[0]; persistFavorites(); updateFavoriteButtonState(); renderLibrary(); showToast("♡ Лайк снят"); emit("favorite-removed", { favorite: { ...removed }, origin }); return true; }
  function updateFavoriteMeta(id, patch = {}) { const fav = favorites.find(f => f.id === id); if (!fav) return null; Object.assign(fav, patch); persistFavorites(); renderLibrary(); updateFavoriteButtonState(); return { ...fav }; }
  function showToast(message) { toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 1400); }

  function applyTentacleGesture(x, y, dx, dy, fingers) {
    const r = canvas.getBoundingClientRect(), left = x < r.width / 3, right = x > r.width * 2 / 3, top = y < r.height / 3, bottom = y > r.height * 2 / 3;
    if (fingers === 1) {
      if (Math.abs(dy) > Math.abs(dx)) { if (left && dy !== 0) runtimeConfig.numTentacles = clamp(runtimeConfig.numTentacles + (dy > 0 ? -1 : 1), 3, 72); if (right) runtimeConfig.circleSize = clamp(runtimeConfig.circleSize - dy * 0.005, 0.2, 20); }
      else { if (top) runtimeConfig.lineWeight = clamp(runtimeConfig.lineWeight + dx * 0.01, 0.1, 10); if (bottom) runtimeConfig.movementSpeed = clamp(runtimeConfig.movementSpeed + dx * 0.001, 0.05, 10); }
    }
    if (fingers === 2) { if (left && !bottom && Math.abs(dy) > Math.abs(dx)) runtimeConfig.tentacleLength = clamp(runtimeConfig.tentacleLength - dy * 0.2, 10, 800); if (right && !bottom && Math.abs(dy) > Math.abs(dx)) { if (dy < 0) runtimeConfig.segmentStep = Math.max(1, runtimeConfig.segmentStep - 1); if (dy > 0) runtimeConfig.segmentStep = Math.min(20, runtimeConfig.segmentStep + 1); } if (bottom && Math.abs(dx) > Math.abs(dy)) runtimeConfig.colorSpeed = clamp(runtimeConfig.colorSpeed + dx * 0.001, 0.05, 10); }
  }

  function applyDandelionGesture(dx, dy, fingers, pinchRatio = null) {
    if (fingers === 1) { if (Math.abs(dx) > Math.abs(dy)) runtimeConfig.tSpeed = clamp(runtimeConfig.tSpeed + dx * 0.00001, 0.001, 0.02); else runtimeConfig.numShapes = clamp(runtimeConfig.numShapes + (dy > 0 ? -1 : 1), 50, 1000); }
    if (fingers === 2) { if (Math.abs(dx) > Math.abs(dy)) runtimeConfig.angleSpeed = clamp(runtimeConfig.angleSpeed + dx * 0.00001, 0.001, 0.05); else runtimeConfig.lineWeight = clamp(runtimeConfig.lineWeight - dy * 0.01, 0.1, 10); if (Number.isFinite(pinchRatio) && pinchRatio > 0) runtimeConfig.zoom = clamp(runtimeConfig.zoom * pinchRatio, 0.2, 5); }
  }

  function applyRgbRingsGesture(x, y, pointerType) {
    const r = canvas.getBoundingClientRect();
    const g = pointerType === "touch" ? touchGesture : mouseGesture;
    const dx = x - g.startX;
    const dy = y - g.startY;

    // Exact order and thresholds from the source sketch. The zone is evaluated by current touch position.
    if (x < r.width * 0.25 && Math.abs(dy) > 10) {
      runtimeConfig.numRings = clamp(runtimeConfig.numRings + dy * 0.05, 5, 100);
      g.startY = y;
      return;
    }
    if (x > r.width * 0.75 && Math.abs(dy) > 10) {
      runtimeConfig.waveAmplitude = clamp(runtimeConfig.waveAmplitude - dy * 0.1, 0, 200);
      g.startY = y;
      return;
    }
    if (y < r.height * 0.25 && Math.abs(dx) > 5) {
      runtimeConfig.strokeW = clamp(runtimeConfig.strokeW + dx * 0.01, 0.3, 8);
      g.startX = x;
      return;
    }
    if (y > r.height * 0.75 && Math.abs(dx) > 5) {
      runtimeConfig.waveSpeed = clamp(runtimeConfig.waveSpeed + dx * 0.0003, 0.001, 0.2);
      g.startX = x;
    }
  }

  function applyBreathGesture(x, y, dx, dy, fingers) {
    const r = canvas.getBoundingClientRect(), L = r.width * EDGE, R = r.width * (1 - EDGE), T = r.height * EDGE, B = r.height * (1 - EDGE), sx = touchGesture.startX || mouseGesture.startX, sy = touchGesture.startY || mouseGesture.startY;
    if (sx < L) { if (Math.abs(dy) > TH) runtimeConfig.branches = clamp(runtimeConfig.branches + (dy < 0 ? 1 : -1), 2, 60); return; }
    if (sx > R) { if (Math.abs(dy) > TH) runtimeConfig.layers = clamp(runtimeConfig.layers + (dy < 0 ? 1 : -1), 1, 10); return; }
    if (sy < T) { if (Math.abs(dx) > TH) runtimeConfig.strokeW = clamp(runtimeConfig.strokeW + (dx > 0 ? 0.3 : -0.3), 0.1, 8); return; }
    if (sy > B) { if (fingers === 1 && Math.abs(dx) > TH) runtimeConfig.pulseSpd = clamp(runtimeConfig.pulseSpd + (dx > 0 ? 0.005 : -0.005), 0.001, 0.3); if (fingers === 2 && Math.abs(dx) > TH) runtimeConfig.pulseAmp = clamp(runtimeConfig.pulseAmp + (dx > 0 ? 0.02 : -0.02), 0.05, 2); }
  }

  function applyGrowthGesture(x, y, dx, dy, fingers, pinchRatio = null) {
    const r = canvas.getBoundingClientRect(), L = r.width * EDGE, R = r.width * (1 - EDGE), T = r.height * EDGE, B = r.height * (1 - EDGE), sx = touchGesture.startX || mouseGesture.startX, sy = touchGesture.startY || mouseGesture.startY;
    if (fingers === 2) { if (Number.isFinite(pinchRatio) && pinchRatio > 0) runtimeConfig.zoom = clamp(runtimeConfig.zoom * pinchRatio, 0.3, 3); if (sy > B && Math.abs(dx) > TH) runtimeConfig.levelSpeedRatio = clamp(runtimeConfig.levelSpeedRatio + (dx > 0 ? 0.05 : -0.05), 0.2, 3); return; }
    if (sx < L && Math.abs(dy) > TH) runtimeConfig.branches = clamp(runtimeConfig.branches + (dy < 0 ? 1 : -1), 2, 60);
    else if (sx > R && Math.abs(dy) > TH) runtimeConfig.maxDepth = clamp(runtimeConfig.maxDepth + (dy < 0 ? 1 : -1), 1, 10);
    else if (sy < T && Math.abs(dx) > TH) runtimeConfig.strokeW = clamp(runtimeConfig.strokeW + (dx > 0 ? 0.3 : -0.3), 0.1, 8);
    else if (sy > B && Math.abs(dx) > TH) runtimeConfig.pulseSpeed = clamp(runtimeConfig.pulseSpeed + (dx > 0 ? 0.005 : -0.005), 0.001, 0.1);
  }

  function applyPatternGesture(x, y, dx, dy, fingers, pinchRatio = null, pointerType = "touch") {
    const before = configKey(runtimeConfig, runtimePatternId);
    if (runtimePatternId === DANDELION_ID) applyDandelionGesture(dx, dy, fingers, pinchRatio);
    else if (runtimePatternId === RGB_RINGS_ID) applyRgbRingsGesture(x, y, pointerType);
    else if (runtimePatternId === BREATH_ID) applyBreathGesture(x, y, dx, dy, fingers);
    else if (runtimePatternId === GROWTH_ID) applyGrowthGesture(x, y, dx, dy, fingers, pinchRatio);
    else applyTentacleGesture(x, y, dx, dy, fingers);
    const changed = before !== configKey(runtimeConfig, runtimePatternId);
    if (changed) updateFavoriteButtonState();
    return changed;
  }

  function patternTap(x, y) {
    const now = performance.now();
    const tapWindow = runtimePatternId === DANDELION_ID ? 300 : runtimePatternId === RGB_RINGS_ID ? 600 : 450;
    tapCount = now - lastTap < tapWindow ? tapCount + 1 : 1;
    lastTap = now;

    if (runtimePatternId === DANDELION_ID) {
      const r = canvas.getBoundingClientRect();
      if (tapCount === 1 && Math.hypot(x - r.width / 2, y - r.height / 2) < 100) { runtimeConfig.v1History = [...(runtimeConfig.v1History || []), runtimeConfig.v1].slice(-64); runtimeConfig.v1 = Math.random() * 0.4 + 0.2; updateFavoriteButtonState(); emit("pattern-special", { action: "new-v1", v1: runtimeConfig.v1 }); }
      if (tapCount === 1 && y > r.height * 0.85 && runtimeConfig.v1History?.length) { const h = [...runtimeConfig.v1History]; runtimeConfig.v1 = h.pop(); runtimeConfig.v1History = h; updateFavoriteButtonState(); emit("pattern-special", { action: "undo-v1", v1: runtimeConfig.v1 }); }
      if (tapCount === 3) { cycleColor("triple-tap"); tapCount = 0; }
      return;
    }
    if ([RGB_RINGS_ID, BREATH_ID, GROWTH_ID].includes(runtimePatternId) && tapCount === 3) { cycleColor("triple-tap"); tapCount = 0; }
  }

  function cycleColor(origin = "button") {
    const from = runtimeConfig.colorModeIndex || 0;
    runtimeConfig.colorModeIndex = (from + 1) % colorModeCount();
    updateColorIndicator(); updateFavoriteButtonState(); emit("color", { from, to: runtimeConfig.colorModeIndex, origin });
  }

  function localTouch(t) { const r = canvas.getBoundingClientRect(); return { x: t.clientX - r.left, y: t.clientY - r.top }; }
  function getPrimaryTouch(touches) { if (!touches.length) return null; if (touchGesture.primaryId !== null) for (const t of touches) if (t.identifier === touchGesture.primaryId) return t; return touches[0]; }
  function norm(x, y) { const r = canvas.getBoundingClientRect(); return { x: r.width ? x / r.width : 0, y: r.height ? y / r.height : 0 }; }
  function touchDistance(touches) { if (touches.length < 2) return null; return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY); }

  canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    const p0 = getPrimaryTouch(e.touches); if (!p0) return;
    if (touchGesture.primaryId === null) touchGesture.primaryId = p0.identifier;
    const p = localTouch(p0);
    touchGesture.fingers = e.touches.length;
    touchGesture.x = touchGesture.startX = p.x;
    touchGesture.y = touchGesture.startY = p.y;
    if (e.touches.length > 1) { const p2 = localTouch(e.touches[1]); touchGesture.secondX = p2.x; touchGesture.secondY = p2.y; } else touchGesture.secondX = touchGesture.secondY = 0;
    if (e.touches.length === 1) patternTap(p.x, p.y);
    touchGesture.lastDist = touchDistance(e.touches);
    emit("gesture-start", { fingers: touchGesture.fingers, ...norm(p.x, p.y) });
  }, { passive: false });

  canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    const p0 = getPrimaryTouch(e.touches); if (!p0) return;
    const p = localTouch(p0), dx = p.x - touchGesture.x, dy = p.y - touchGesture.y;
    touchGesture.fingers = e.touches.length;
    const nd = touchDistance(e.touches), ratio = nd && touchGesture.lastDist ? nd / touchGesture.lastDist : null;
    const changed = applyPatternGesture(p.x, p.y, dx, dy, touchGesture.fingers, ratio, "touch");
    touchGesture.x = p.x; touchGesture.y = p.y; touchGesture.lastDist = nd;
    if (changed) emit("gesture-move", { fingers: touchGesture.fingers, ...norm(p.x, p.y), dx, dy });
  }, { passive: false });

  function endTouch(e) {
    e.preventDefault();
    if (!e.touches.length) {
      emit("gesture-end", { fingers: touchGesture.fingers });
      touchGesture.fingers = 0; touchGesture.primaryId = null; touchGesture.lastDist = null; touchGesture.startX = touchGesture.startY = 0;
    } else {
      const p0 = getPrimaryTouch(e.touches);
      if (p0) { const p = localTouch(p0); touchGesture.fingers = e.touches.length; touchGesture.x = p.x; touchGesture.y = p.y; touchGesture.startX = p.x; touchGesture.startY = p.y; touchGesture.lastDist = touchDistance(e.touches); }
    }
  }
  canvas.addEventListener("touchend", endTouch, { passive: false });
  canvas.addEventListener("touchcancel", endTouch, { passive: false });

  canvas.addEventListener("mousedown", e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    mouseGesture.down = true; mouseGesture.fingers = e.shiftKey ? 2 : 1;
    mouseGesture.x = mouseGesture.startX = e.clientX - r.left;
    mouseGesture.y = mouseGesture.startY = e.clientY - r.top;
    if (mouseGesture.fingers === 1) patternTap(mouseGesture.x, mouseGesture.y);
    emit("gesture-start", { fingers: mouseGesture.fingers, desktop: true, ...norm(mouseGesture.x, mouseGesture.y) });
  });
  window.addEventListener("mousemove", e => {
    if (!mouseGesture.down) return;
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, dx = x - mouseGesture.x, dy = y - mouseGesture.y;
    mouseGesture.fingers = e.shiftKey ? 2 : 1;
    const changed = applyPatternGesture(x, y, dx, dy, mouseGesture.fingers, null, "mouse");
    mouseGesture.x = x; mouseGesture.y = y;
    if (changed) emit("gesture-move", { fingers: mouseGesture.fingers, desktop: true, ...norm(x, y), dx, dy });
  });
  window.addEventListener("mouseup", () => { if (mouseGesture.down) emit("gesture-end", { fingers: mouseGesture.fingers, desktop: true }); mouseGesture.down = false; });

  function instructionsHTML() {
    if (runtimePatternId === DANDELION_ID) return '<h2 id="instructionsTitle">Управление · Одуванчик</h2><div class="gesture-group"><strong>Тапы</strong><div class="gesture-row"><span>Центр</span><span>Новая фигура</span></div><div class="gesture-row"><span>Низ</span><span>Шаг назад к предыдущей фигуре</span></div><div class="gesture-row"><span>3 тапа</span><span>Следующий цветовой режим</span></div></div><div class="gesture-group"><strong>1 палец</strong><div class="gesture-row"><span>←→</span><span>Скорость развития формы</span></div><div class="gesture-row"><span>↑↓</span><span>Количество линий</span></div></div><div class="gesture-group"><strong>2 пальца</strong><div class="gesture-row"><span>←→</span><span>Скорость вращения</span></div><div class="gesture-row"><span>↑↓</span><span>Толщина линий</span></div><div class="gesture-row"><span>Пинч</span><span>Масштаб</span></div></div><button class="close-modal" type="button">Понятно</button>';
    if (runtimePatternId === RGB_RINGS_ID) return '<h2 id="instructionsTitle">Управление · RGB Glitch Rings</h2><div class="gesture-group"><strong>1 палец</strong><div class="gesture-row"><span>Слева ↑↓</span><span>Количество колец</span></div><div class="gesture-row"><span>Справа ↑↓</span><span>Амплитуда волны</span></div><div class="gesture-row"><span>Сверху ←→</span><span>Толщина RGB-линий</span></div><div class="gesture-row"><span>Снизу ←→</span><span>Скорость волны</span></div></div><div class="gesture-group"><strong>Тапы</strong><div class="gesture-row"><span>3 тапа</span><span>Без цветного круга → розовый → радужный</span></div></div><div class="gesture-note">RGB-глич остаётся включённым во всех трёх цветовых режимах.</div><button class="close-modal" type="button">Понятно</button>';
    if (runtimePatternId === BREATH_ID) return '<h2 id="instructionsTitle">Управление · Breathing Fractal</h2><div class="gesture-group"><strong>Изолированные зоны</strong><div class="gesture-row"><span>Слева ↑↓</span><span>Количество лепестков / ветвей</span></div><div class="gesture-row"><span>Справа ↑↓</span><span>Глубина ветвления</span></div><div class="gesture-row"><span>Сверху ←→</span><span>Толщина линий</span></div><div class="gesture-row"><span>Снизу ←→</span><span>1 палец — скорость дыхания</span></div><div class="gesture-row"><span>Снизу ←→</span><span>2 пальца — амплитуда дыхания</span></div></div><div class="gesture-group"><strong>Тапы</strong><div class="gesture-row"><span>3 тапа</span><span>Белый → голубой → радуга</span></div></div><button class="close-modal" type="button">Понятно</button>';
    if (runtimePatternId === GROWTH_ID) return '<h2 id="instructionsTitle">Управление · Breathing Fractal · Growth</h2><div class="gesture-group"><strong>1 палец</strong><div class="gesture-row"><span>Слева ↑↓</span><span>Количество ветвей</span></div><div class="gesture-row"><span>Справа ↑↓</span><span>Глубина роста</span></div><div class="gesture-row"><span>Сверху ←→</span><span>Толщина линий</span></div><div class="gesture-row"><span>Снизу ←→</span><span>Скорость полного цикла</span></div></div><div class="gesture-group"><strong>2 пальца</strong><div class="gesture-row"><span>Пинч</span><span>Масштаб</span></div><div class="gesture-row"><span>Снизу ←→</span><span>Скорость раскрытия уровней</span></div></div><div class="gesture-group"><strong>Тапы</strong><div class="gesture-row"><span>3 тапа</span><span>Белый → голубой → радуга</span></div></div><button class="close-modal" type="button">Понятно</button>';
    return '<h2 id="instructionsTitle">Управление паттерном</h2><div class="gesture-group"><strong>1 палец</strong><div class="gesture-row"><span>Слева ↑↓</span><span>Количество щупалец: вверх больше, вниз меньше</span></div><div class="gesture-row"><span>Справа ↑↓</span><span>Размер кругов: вверх больше, вниз меньше</span></div><div class="gesture-row"><span>Сверху ←→</span><span>Толщина линий</span></div><div class="gesture-row"><span>Снизу ←→</span><span>Скорость движения</span></div></div><div class="gesture-group"><strong>2 пальца</strong><div class="gesture-row"><span>Слева ↑↓</span><span>Длина щупалец: вверх длиннее, вниз короче</span></div><div class="gesture-row"><span>Справа ↑↓</span><span>Плотность кругов: вверх плотнее, вниз реже</span></div><div class="gesture-row"><span>Снизу ←→</span><span>Скорость перелива цвета</span></div></div><button class="close-modal" type="button">Понятно</button>';
  }

  colorButton.addEventListener("click", () => cycleColor("button"));
  favoriteButton.addEventListener("click", () => { const match = matchingFavorite(); if (match) removeFavorite(match, "game"); else saveFavorite(runtimeConfig, currentFrame, { origin: "game", baseId: runtimePatternId, parentCommunityId: activeSource.communityId || null }); });
  libraryButton.addEventListener("click", () => { activeLibraryPage = "all"; setScreen("library"); });
  instructionsButton.addEventListener("click", () => { const panel = instructionsModal.querySelector(".instructions"); if (panel) panel.innerHTML = instructionsHTML(); instructionsModal.classList.add("open"); emit("instructions-open"); });
  instructionsModal.addEventListener("click", e => { if (e.target === instructionsModal || e.target.closest?.(".close-modal")) { instructionsModal.classList.remove("open"); emit("instructions-close"); } });
  function cyclePattern(dir) { let i = PATTERNS.findIndex(p => p.id === runtimePatternId); if (i < 0) i = 0; i = (i + dir + PATTERNS.length) % PATTERNS.length; const p = PATTERNS[i]; openConfig(p.defaults, { type: "base", id: p.id, patternId: p.id, communityId: null }); }
  prevButton.addEventListener("click", () => cyclePattern(-1));
  nextButton.addEventListener("click", () => cyclePattern(1));
  libraryPagerButton.addEventListener("click", () => setLibraryPage("all"));
  communityPagerButton.addEventListener("click", () => setLibraryPage("community"));
  favoritesPagerButton.addEventListener("click", () => setLibraryPage("favorites"));

  let librarySwipeStart = null;
  librarySwipeArea.addEventListener("pointerdown", e => { if (e.target.closest("button")) return; librarySwipeStart = { x: e.clientX, y: e.clientY }; });
  librarySwipeArea.addEventListener("pointerup", e => { if (!librarySwipeStart) return; const dx = e.clientX - librarySwipeStart.x, dy = e.clientY - librarySwipeStart.y; librarySwipeStart = null; if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.2) return; let i = PAGE_ORDER.indexOf(activeLibraryPage); i += dx < 0 ? 1 : -1; i = clamp(i, 0, PAGE_ORDER.length - 1); setLibraryPage(PAGE_ORDER[i]); });
  librarySwipeArea.addEventListener("pointercancel", () => librarySwipeStart = null);
  window.addEventListener("resize", () => { if (gameScreen.classList.contains("active")) resizeMainCanvas(); renderLibrary(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopAnimation(); else if (gameScreen.classList.contains("active")) startAnimation(); });

  window.SetkaApp = {
    getState: () => statePayload(),
    getConfig: () => cloneConfig(runtimeConfig, runtimePatternId),
    getFavorites: () => favorites.map(f => ({ ...f, config: cloneConfig(f.config, f.baseId) })),
    getPatterns: () => PATTERNS.map(p => ({ id: p.id, title: p.title, version: p.version, defaults: cloneConfig(p.defaults, p.id) })),
    getPatternDefaults: id => cloneConfig(patternById(id).defaults, patternById(id).id),
    getPatternTitle: id => patternById(id).title,
    cloneConfig,
    configKey,
    openConfig,
    renderPreview,
    setCommunity(items) { communityItems = Array.isArray(items) ? items.map(normalizeCommunityItem) : []; renderLibrary(); },
    setRecommendations(data = {}) { recommendedCommunity = new Set((data.community || []).map(String)); recommendedPatterns = new Set((data.patterns || []).map(String)); renderLibrary(); },
    updateFavoriteMeta,
    refreshFavorites() { favorites = loadFavorites(); renderLibrary(); updateFavoriteButtonState(); },
    renderLibrary,
    setLibraryPage,
    finishCurrentUsageHint() { return statePayload(); },
    DEFAULT_CONFIG: cloneConfig(TENTACLE_DEFAULT, TENTACLE_ID),
    DANDELION_DEFAULT: cloneConfig(DANDELION_DEFAULT, DANDELION_ID),
    RGB_RINGS_DEFAULT: cloneConfig(RGB_RINGS_DEFAULT, RGB_RINGS_ID),
    FISH_DEFAULT: cloneConfig(RGB_RINGS_DEFAULT, RGB_RINGS_ID),
    BREATHING_FRACTAL_DEFAULT: cloneConfig(BREATH_DEFAULT, BREATH_ID),
    BREATHING_GROWTH_DEFAULT: cloneConfig(GROWTH_DEFAULT, GROWTH_ID)
  };

  persistFavorites();
  buildColorDots();
  updateColorIndicator();
  updateFavoriteButtonState();
  renderLibrary();
  emit("ready", {});
})();