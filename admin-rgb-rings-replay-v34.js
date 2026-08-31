(() => {
  "use strict";

  const RGB_ID = "rgb-glitch-rings";
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
  style.textContent = `.rgb34-replay-canvas{position:absolute;inset:0;width:100%;height:100%;background:#000;display:none;pointer-events:none;z-index:1}`;
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

  function renderRgb(ctx, w, h, raw, frame) {
    const c = {
      numRings: clamp(n(raw?.numRings, 20), 5, 100),
      baseSpacing: clamp(n(raw?.baseSpacing, 20), 2, 80),
      waveSpeed: clamp(n(raw?.waveSpeed, 0.03), 0.001, 0.2),
      waveAmplitude: clamp(n(raw?.waveAmplitude, 38), 0, 200),
      glitchEnabled: raw?.glitchEnabled !== false,
      glitchOffset: clamp(n(raw?.glitchOffset, 1), 0, 20),
      ringAlpha: clamp(n(raw?.ringAlpha, 180), 0, 255),
      invertDirection: raw?.invertDirection !== false,
      strokeW: clamp(n(raw?.strokeW, 1), 0.3, 8),
      colorModeIndex: clamp(Math.round(n(raw?.colorModeIndex, 0)), 0, 2)
    };

    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    const t = frame * c.waveSpeed;
    const alpha = c.ringAlpha / 255;

    for (let i = 1; i <= Math.round(c.numRings); i++) {
      const phase = c.invertDirection ? -i : i;
      const offset = Math.sin(t + phase * 0.3) * c.waveAmplitude;
      const diameter = i * c.baseSpacing + offset;
      if (!(diameter > 0)) continue;
      const radius = diameter / 2;

      if (c.glitchEnabled) {
        ctx.lineWidth = c.strokeW;
        ctx.strokeStyle = `rgba(255,0,0,${alpha})`;
        ctx.beginPath(); ctx.arc(-c.glitchOffset, 0, radius, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(0,255,0,${alpha})`;
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(0,100,255,${alpha})`;
        ctx.beginPath(); ctx.arc(c.glitchOffset, 0, radius, 0, Math.PI * 2); ctx.stroke();
      }

      if (c.colorModeIndex !== 0) {
        ctx.lineWidth = 0.6;
        if (c.colorModeIndex === 1) ctx.strokeStyle = `rgba(255,100,180,${alpha})`;
        else ctx.strokeStyle = `hsla(${((t * 100 + i * 5) % 360 + 360) % 360},100%,50%,${alpha})`;
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function ensureOverlay(phone) {
    let canvas = phone.querySelector(".rgb34-replay-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "rgb34-replay-canvas";
      const base = phone.querySelector(".f34-canvas");
      if (base) base.insertAdjacentElement("afterend", canvas);
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
    if (state?.view !== "game" || pid !== RGB_ID) {
      overlay.style.display = "none";
      return;
    }

    overlay.style.display = "block";
    const ctx = overlay.getContext("2d");
    const frame = n(state.frame) + Math.max(0, ms - tMs) / 16.6667;
    renderRgb(ctx, overlay.width, overlay.height, state.config || {}, frame);
  }

  function ensureLoop() {
    if (!raf) raf = requestAnimationFrame(tick);
  }

  new MutationObserver(ensureLoop).observe(document.documentElement, { childList: true, subtree: true });
  ensureLoop();
  window.__SETKA_ADMIN_RGB_RINGS_REPLAY_V34__ = true;
})();