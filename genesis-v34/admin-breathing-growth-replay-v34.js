(() => {
  "use strict";

  const GROWTH_ID = "breathing-fractal-growth";
  const priorFetch = window.fetch.bind(window);
  let latest = null;
  let raf = 0;

  function n(v, d = 0) { return Number.isFinite(Number(v)) ? Number(v) : d; }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  function requestAction(args) {
    try {
      const opt = args[1] || {}, raw = opt.body;
      if (typeof raw !== "string") return null;
      return JSON.parse(raw)?.action || null;
    } catch (_) { return null; }
  }

  window.fetch = async function(...args) {
    const action = requestAction(args);
    const res = await priorFetch(...args);
    if (action === "admin-session") res.clone().json().then(data => { latest = data; ensureLoop(); }).catch(() => {});
    return res;
  };

  const style = document.createElement("style");
  style.textContent = `.growth34-replay-canvas{position:absolute;inset:0;width:100%;height:100%;background:#000;display:none;pointer-events:none;z-index:3}`;
  document.head.appendChild(style);

  function stateAt(data, ms) {
    const events = (data?.events || []).filter(e => e.event_type === "app_state" && e.payload?.config).sort((a, b) => n(a.t_ms) - n(b.t_ms));
    const snapshots = (data?.snapshots || []).slice().sort((a, b) => n(a.t_ms) - n(b.t_ms));
    let best = null, bestT = -1;
    for (const e of events) { const t = n(e.t_ms); if (t <= ms && t >= bestT) { best = e.payload; bestT = t; } else if (t > ms) break; }
    if (!best) for (const s of snapshots) { const t = n(s.t_ms); if (t <= ms && t >= bestT) { best = s.app_state; bestT = t; } else if (t > ms) break; }
    return { state: best, tMs: Math.max(0, bestT) };
  }

  function cloneConfig(raw = {}) {
    return {
      baseLen: clamp(n(raw.baseLen, 70), 10, 180),
      pulseSpeed: clamp(n(raw.pulseSpeed ?? raw.pulseSpd, 0.02), 0.001, 0.1),
      strokeW: clamp(n(raw.strokeW, 1.5), 0.1, 8),
      branches: clamp(Math.round(n(raw.branches, 8)), 2, 60),
      maxDepth: clamp(Math.round(n(raw.maxDepth ?? raw.layers, 4)), 1, 10),
      colorModeIndex: clamp(Math.round(n(raw.colorModeIndex ?? raw.clrMode, 0)), 0, 2),
      hueRate: clamp(n(raw.hueRate, 0.004), 0.0001, 0.05),
      zoom: clamp(n(raw.zoom, 1), 0.3, 3.0),
      levelSpeedRatio: clamp(n(raw.levelSpeedRatio, 1), 0.2, 3.0),
      firstLevelFactor: 2.0
    };
  }

  function triangleGrowth(frame, speed) {
    const phase = ((frame * speed) % 2 + 2) % 2;
    return phase <= 1 ? phase : 2 - phase;
  }

  function segmentColor(c, x2, frame) {
    if (c.colorModeIndex === 1) return "rgb(170,190,255)";
    if (c.colorModeIndex === 2) {
      const hue = ((frame * c.hueRate * 100 + x2 * 0.4) % 360 + 360) % 360;
      return `hsl(${hue} 80% 55%)`;
    }
    return "#fff";
  }

  function levelWeight(depth, c) { return depth === 1 ? c.firstLevelFactor : Math.pow(c.levelSpeedRatio, depth - 1); }
  function totalWeight(c) { let sum = c.firstLevelFactor; for (let i = 2; i <= c.maxDepth; i++) sum += Math.pow(c.levelSpeedRatio, i - 1); return Math.max(0.00001, sum); }
  function levelStart(depth, c) { if (depth === 1) return 0; let start = c.firstLevelFactor; for (let i = 2; i < depth; i++) start += Math.pow(c.levelSpeedRatio, i - 1); return start; }

  function drawBranch(ctx, len, depth, growthRatio, c, frame, sum) {
    if (depth > c.maxDepth) return;
    const weight = levelWeight(depth, c), start = levelStart(depth, c), from = start / sum, to = (start + weight) / sum;
    if (growthRatio < from) return;
    const localProgress = clamp((growthRatio - from) / Math.max(0.00001, to - from), 0, 1);
    const x2 = len * localProgress;
    ctx.strokeStyle = segmentColor(c, x2, frame); ctx.lineWidth = c.strokeW; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x2, 0); ctx.stroke();
    if (localProgress >= 1 && depth < c.maxDepth) {
      ctx.save(); ctx.translate(len, 0);
      ctx.save(); ctx.rotate(Math.PI / 6); drawBranch(ctx, len * 0.6, depth + 1, growthRatio, c, frame, sum); ctx.restore();
      ctx.save(); ctx.rotate(-Math.PI / 6); drawBranch(ctx, len * 0.6, depth + 1, growthRatio, c, frame, sum); ctx.restore();
      ctx.restore();
    }
  }

  function renderGrowth(ctx, w, h, raw, frame) {
    const c = cloneConfig(raw), growth = triangleGrowth(frame, c.pulseSpeed), sum = totalWeight(c);
    ctx.save(); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h); ctx.translate(w / 2, h / 2); ctx.scale(c.zoom, c.zoom);
    for (let i = 0; i < c.branches; i++) { ctx.save(); ctx.rotate(Math.PI * 2 / c.branches * i); drawBranch(ctx, c.baseLen, 1, growth, c, frame, sum); ctx.restore(); }
    ctx.restore();
  }

  function ensureOverlay(phone) {
    let canvas = phone.querySelector(".growth34-replay-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas"); canvas.className = "growth34-replay-canvas";
      const breath = phone.querySelector(".breath34-replay-canvas"), rgb = phone.querySelector(".rgb34-replay-canvas"), base = phone.querySelector(".f34-canvas");
      if (breath) breath.insertAdjacentElement("afterend", canvas); else if (rgb) rgb.insertAdjacentElement("afterend", canvas); else if (base) base.insertAdjacentElement("afterend", canvas); else phone.prepend(canvas);
    }
    return canvas;
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    if (!latest?.session) return;
    const root = document.querySelector(`.f34-replay[data-session-id="${CSS.escape(String(latest.session.id || ""))}"]`);
    if (!root) return;
    const phone = root.querySelector(".f34-phone"), timeline = root.querySelector(".f34-timeline"), base = root.querySelector(".f34-canvas");
    if (!phone || !timeline || !base) return;
    const overlay = ensureOverlay(phone);
    if (overlay.width !== base.width || overlay.height !== base.height) { overlay.width = base.width; overlay.height = base.height; }
    const ms = n(timeline.value), { state, tMs } = stateAt(latest, ms), pid = state?.patternId || state?.config?.patternId;
    if (state?.view !== "game" || pid !== GROWTH_ID) { overlay.style.display = "none"; return; }
    overlay.style.display = "block";
    const frame = n(state.frame) + Math.max(0, ms - tMs) / 16.6667;
    renderGrowth(overlay.getContext("2d"), overlay.width, overlay.height, state.config || {}, frame);
  }

  function ensureLoop() { if (!raf) raf = requestAnimationFrame(tick); }
  new MutationObserver(ensureLoop).observe(document.documentElement, { childList: true, subtree: true });
  ensureLoop();
  window.__SETKA_ADMIN_BREATHING_GROWTH_REPLAY_V34__ = true;
})();