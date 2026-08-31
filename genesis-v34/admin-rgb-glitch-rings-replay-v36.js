(() => {
  "use strict";

  const PATTERN_ID = "rgb-glitch-rings";
  const priorFetch = window.fetch.bind(window);
  let latest = null;
  let raf = 0;

  function n(v, d = 0) { return Number.isFinite(Number(v)) ? Number(v) : d; }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function mod(x, m) { return ((x % m) + m) % m; }

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
  style.textContent = `.rgb36-replay-canvas{position:absolute;inset:0;width:100%;height:100%;background:#000;display:none;pointer-events:none;z-index:2}`;
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

  function configOf(raw) {
    return {
      numRings: clamp(n(raw?.numRings ?? raw?.numLayers, 20), 5, 100),
      baseSpacing: clamp(n(raw?.baseSpacing ?? raw?.ringSpacing, 20), 1, 80),
      waveSpeed: clamp(n(raw?.waveSpeed, 0.03), 0.001, 0.2),
      waveAmplitude: clamp(n(raw?.waveAmplitude, 38), 0, 200),
      glitchEnabled: raw?.glitchEnabled !== false,
      glitchOffset: clamp(n(raw?.glitchOffset, 1), 0, 20),
      ringAlpha: clamp(n(raw?.ringAlpha, 180), 0, 255),
      invertDirection: raw?.invertDirection !== false,
      strokeW: clamp(n(raw?.strokeW, 1), 0.3, 8),
      colorModeIndex: clamp(Math.round(n(raw?.colorModeIndex, 0)), 0, 2)
    };
  }

  function circle(ctx, x, diameter) {
    if (!(diameter > 0)) return;
    ctx.beginPath();
    ctx.arc(x, 0, diameter / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  function renderPattern(ctx, w, h, raw, frame) {
    const c = configOf(raw);
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);

    const t = frame * c.waveSpeed;
    const alpha = clamp(c.ringAlpha / 255, 0, 1);

    for (let i = 1; i <= c.numRings; i++) {
      const phase = c.invertDirection ? -i : i;
      const offset = Math.sin(t + phase * 0.3) * c.waveAmplitude;
      const diameter = i * c.baseSpacing + offset;

      if (c.glitchEnabled) {
        ctx.lineWidth = c.strokeW;
        ctx.strokeStyle = `rgba(255,0,0,${alpha})`; circle(ctx, -c.glitchOffset, diameter);
        ctx.strokeStyle = `rgba(0,255,0,${alpha})`; circle(ctx, 0, diameter);
        ctx.strokeStyle = `rgba(0,100,255,${alpha})`; circle(ctx, c.glitchOffset, diameter);
      }

      if (c.colorModeIndex === 1) {
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = `rgba(255,100,180,${alpha})`;
        circle(ctx, 0, diameter);
      } else if (c.colorModeIndex === 2) {
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = `hsla(${mod(t * 100 + i * 5, 360)},100%,50%,${alpha})`;
        circle(ctx, 0, diameter);
      }
    }

    ctx.restore();
  }

  function ensureOverlay(phone) {
    let canvas = phone.querySelector(".rgb36-replay-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "rgb36-replay-canvas";
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
    if (state?.view !== "game" || pid !== PATTERN_ID) {
      overlay.style.display = "none";
      return;
    }

    overlay.style.display = "block";
    const ctx = overlay.getContext("2d");
    const liveFrame = n(state.frame) + Math.max(0, ms - tMs) / 16.6667;
    renderPattern(ctx, overlay.width, overlay.height, state.config || {}, liveFrame);
  }

  function ensureLoop() { if (!raf) raf = requestAnimationFrame(tick); }

  new MutationObserver(ensureLoop).observe(document.documentElement, { childList: true, subtree: true });
  ensureLoop();
  window.__SETKA_ADMIN_RGB_GLITCH_RINGS_REPLAY_V36__ = true;
})();