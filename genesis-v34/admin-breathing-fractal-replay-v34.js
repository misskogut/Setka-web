(() => {
  "use strict";

  const BREATH_ID = "breathing-fractal";
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
    if (action === "admin-session") {
      res.clone().json().then(data => { latest = data; ensureLoop(); }).catch(() => {});
    }
    return res;
  };

  const style = document.createElement("style");
  style.textContent = `.breath34-replay-canvas{position:absolute;inset:0;width:100%;height:100%;background:#000;display:none;pointer-events:none;z-index:2}`;
  document.head.appendChild(style);

  function stateAt(data, ms) {
    const events = (data?.events || []).filter(e => e.event_type === "app_state" && e.payload?.config).sort((a, b) => n(a.t_ms) - n(b.t_ms));
    const snapshots = (data?.snapshots || []).slice().sort((a, b) => n(a.t_ms) - n(b.t_ms));
    let best = null, bestT = -1;
    for (const e of events) {
      const t = n(e.t_ms);
      if (t <= ms && t >= bestT) { best = e.payload; bestT = t; }
      else if (t > ms) break;
    }
    if (!best) {
      for (const s of snapshots) {
        const t = n(s.t_ms);
        if (t <= ms && t >= bestT) { best = s.app_state; bestT = t; }
        else if (t > ms) break;
      }
    }
    return { state: best, tMs: Math.max(0, bestT) };
  }

  function cloneConfig(raw = {}) {
    return {
      baseLen: clamp(n(raw.baseLen, 70), 10, 180),
      pulseSpd: clamp(n(raw.pulseSpd, 0.02), 0.001, 0.3),
      pulseAmp: clamp(n(raw.pulseAmp, 0.3), 0.05, 2.0),
      strokeW: clamp(n(raw.strokeW, 1.5), 0.1, 8),
      branches: clamp(Math.round(n(raw.branches, 8)), 2, 60),
      layers: clamp(Math.round(n(raw.layers, 4)), 1, 10),
      colorModeIndex: clamp(Math.round(n(raw.colorModeIndex ?? raw.clrMode, 0)), 0, 2),
      hueRate: clamp(n(raw.hueRate, 0.004), 0.0001, 0.05)
    };
  }

  function segmentColor(c, len, frame) {
    if (c.colorModeIndex === 1) return "rgb(170,190,255)";
    if (c.colorModeIndex === 2) {
      const hue = ((frame * c.hueRate * 100 + len * 0.4) % 360 + 360) % 360;
      return `hsl(${hue} 80% 55%)`;
    }
    return "#fff";
  }

  function drawBranch(ctx, len, depth, c, frame) {
    if (!depth) return;
    ctx.strokeStyle = segmentColor(c, len, frame);
    ctx.lineWidth = c.strokeW;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();
    ctx.save();
    ctx.translate(len, 0);
    ctx.save();
    ctx.rotate(Math.PI / 6);
    drawBranch(ctx, len * 0.6, depth - 1, c, frame);
    ctx.restore();
    ctx.save();
    ctx.rotate(-Math.PI / 6);
    drawBranch(ctx, len * 0.6, depth - 1, c, frame);
    ctx.restore();
    ctx.restore();
  }

  function renderBreathing(ctx, w, h, raw, frame) {
    const c = cloneConfig(raw);
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    const sMod = 1 + Math.sin(frame * c.pulseSpd) * c.pulseAmp;
    for (let i = 0; i < c.branches; i++) {
      ctx.save();
      ctx.rotate(Math.PI * 2 / c.branches * i);
      drawBranch(ctx, c.baseLen * sMod, c.layers, c, frame);
      ctx.restore();
    }
    ctx.restore();
  }

  function ensureOverlay(phone) {
    let canvas = phone.querySelector(".breath34-replay-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "breath34-replay-canvas";
      const rgb = phone.querySelector(".rgb34-replay-canvas");
      const base = phone.querySelector(".f34-canvas");
      if (rgb) rgb.insertAdjacentElement("afterend", canvas);
      else if (base) base.insertAdjacentElement("afterend", canvas);
      else phone.prepend(canvas);
    }
    return canvas;
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    if (!latest?.session) return;
    const root = document.querySelector(`.f34-replay[data-session-id="${CSS.escape(String(latest.session.id || ""))}"]`);
    if (!root) return;
    const phone = root.querySelector(".f34-phone");
    const timeline = root.querySelector(".f34-timeline");
    const base = root.querySelector(".f34-canvas");
    if (!phone || !timeline || !base) return;

    const overlay = ensureOverlay(phone);
    if (overlay.width !== base.width || overlay.height !== base.height) {
      overlay.width = base.width;
      overlay.height = base.height;
    }

    const ms = n(timeline.value);
    const { state, tMs } = stateAt(latest, ms);
    const pid = state?.patternId || state?.config?.patternId;
    if (state?.view !== "game" || pid !== BREATH_ID) {
      overlay.style.display = "none";
      return;
    }

    overlay.style.display = "block";
    const ctx = overlay.getContext("2d");
    const frame = n(state.frame) + Math.max(0, ms - tMs) / 16.6667;
    renderBreathing(ctx, overlay.width, overlay.height, state.config || {}, frame);
  }

  function ensureLoop() { if (!raf) raf = requestAnimationFrame(tick); }

  new MutationObserver(ensureLoop).observe(document.documentElement, { childList: true, subtree: true });
  ensureLoop();
  window.__SETKA_ADMIN_BREATHING_FRACTAL_REPLAY_V34__ = true;
})();