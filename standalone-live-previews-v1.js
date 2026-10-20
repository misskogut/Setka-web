(() => {
  "use strict";
  // Real-time Canvas 2D renderings. Never screen recordings, GIFs or video.
  // One bounded scheduler for non-library previews; all native library tiles
  // already have their own shared preview clock in app-v7-multipattern.js.
  if (window.SetkaLivePreviewsV1) return;
  const S = window.SetkaApp;
  if (!S?.renderPreview) return;
  const inherited = S.renderPreview;
  const draw = inherited.__setkaRaw || inherited.bind(S);
  const previews = new Map();
  const allowed = [
    "canvas.st34-note-preview",
    "canvas.st37-community-preview",
    "canvas.st34-stable-preview",
    ".st34-state-combo canvas",
    "canvas.st34-preview",
    "canvas.st34-user-preview"
  ].join(",");
  const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const INTERVAL = 1000 / 20, MAX_STEP = 80, SPEED = .72, MAX_CANVASES = 8;
  let handle = 0, lastPaint = 0, phase = 0, painted = 0, cursor = 0;
  const counters = {registered:0,frames:0};
  const known = patternId => window.SetkaPatternRegistryV1?.has?.(patternId) || (S.getPatterns?.()||[]).some(p=>p.id===patternId);
  const finiteFrame = n => n == null ? 44 : Number.isFinite(Number(n)) ? Number(n) : 44;

  function visible(canvas) {
    if (!canvas.isConnected || !canvas.getClientRects().length) return false;
    if (canvas.closest(".hidden-left,.hidden-right,[hidden],[aria-hidden='true']")) return false;
    const css = getComputedStyle(canvas);
    if (css.display === "none" || css.visibility === "hidden") return false;
    const r = canvas.getBoundingClientRect();
    return r.width > 4 && r.height > 4 && r.bottom > 0 &&
      r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  }
  function valid(config, patternId) {
    return !!config && typeof config === "object" && known(patternId);
  }
  function signature(config, pid) {
    try { return S.configKey?.(config, pid) || JSON.stringify(config); }
    catch (_) { return JSON.stringify(config); }
  }
  function paint(canvas, item, frame) {
    try {
      draw(canvas, item.config, frame, item.patternId);
      canvas.dataset.setkaLivePreview = "true";
      canvas.dataset.snapshotPatternId = item.patternId;
      counters.frames++;
    } catch (error) {
      item.failed = true;
      console.warn("SETKA canvas preview render failed", error);
    }
  }
  function stop() {
    if (handle) cancelAnimationFrame(handle);
    handle = 0;
    lastPaint = 0;
  }
  function mayAnimate() {
    return !document.hidden && !motion?.matches;
  }
  function schedule() {
    if (!handle && previews.size && mayAnimate()) {
      // Never reset lastPaint between adjacent rAF ticks. Doing that would
      // freeze the shared phase at zero despite repeated Canvas redraws.
      handle = requestAnimationFrame(tick);
    }
  }
  function tick(now) {
    handle = 0;
    if (!mayAnimate()) return;
    if (!lastPaint || now - lastPaint >= INTERVAL) {
      if (lastPaint) phase += Math.min(MAX_STEP, Math.max(0, now - lastPaint)) / 16.6667 * SPEED;
      lastPaint = now;
      painted = phase;
      // Remove detached canvases on every pass; nothing lives beyond its card.
      for (const [canvas] of previews) if (!canvas.isConnected) previews.delete(canvas);
      const candidates = [...previews.entries()].filter(([canvas,item])=>!item.failed && visible(canvas));
      // Fair rotation when many notes share a scroll container; do not run
      // every hidden/offscreen card or render hundreds of large canvases.
      if (candidates.length) {
        const count = Math.min(MAX_CANVASES, candidates.length);
        for (let i=0; i<count; i++) {
          const [canvas,item] = candidates[(cursor + i) % candidates.length];
          paint(canvas,item,item.frame + painted);
        }
        cursor = (cursor + count) % candidates.length;
      }
    }
    if (previews.size) schedule();
  }
  function register(canvas, config, frame = 44, patternId = null) {
    if (!(canvas instanceof HTMLCanvasElement) || !canvas.matches(allowed)) return false;
    const pid = patternId || config?.patternId || null;
    if (!valid(config,pid)) return false;
    // Keep a snapshot of the exact saved configuration, never a mutable
    // reference to the active pattern or another note.
    const safe = S.cloneConfig ? S.cloneConfig(config,pid) : {...config};
    const stamp = signature(safe,pid), start = finiteFrame(frame);
    const prior = previews.get(canvas);
    if (prior && prior.signature === stamp && prior.patternId === pid && prior.frame === start) {
      schedule();return true;
    }
    const item = {config:safe,patternId:pid,frame:start,signature:stamp,failed:false};
    previews.set(canvas,item);
    counters.registered++;
    paint(canvas,item,start+painted);
    schedule();
    return true;
  }
  function forget(canvas) {
    if (canvas) {
      previews.delete(canvas);
      delete canvas.dataset.setkaLivePreview;
    }
    if (!previews.size) stop();
  }

  // Intercept the existing semantic preview API, not the underlying Canvas
  // drawing primitives. Detached export canvases keep their original path.
  // In particular, static IndexedDB cached still images may never overwrite
  // an animated, connected user-facing preview.
  const liveRender = function(canvas, config, frame=44, patternId=null) {
    if (canvas?.isConnected && register(canvas,config,frame,patternId)) return;
    return inherited.call(S,canvas,config,frame,patternId);
  };
  liveRender.__setkaRaw = draw;
  liveRender.__setkaLiveWrapped = true;
  S.renderPreview = liveRender;

  // Reattach existing note cards after document loads. The note repair module
  // is authoritative for choosing the exact replay snapshot and config.
  function rescanNotes() {
    const resolve = window.__SETKA_NOTE_REPLAY_V34__?.replayOf;
    if (!resolve) return;
    const C = window.SetkaStandaloneV34;
    for (const canvas of document.querySelectorAll("canvas.st34-note-preview")) {
      if (canvas.closest(".st37-public-card")) continue;
      const id = canvas.closest("[data-note-id]")?.dataset.noteId;
      const note = (C?.getData?.()?.notes || []).find(n=>String(n.id)===id);
      if (!note) continue;
      const replay = resolve(note);
      if (replay.config && replay.pid) register(canvas,replay.config,replay.frame,replay.pid);
    }
  }
  document.addEventListener("visibilitychange",()=>{if (mayAnimate()) schedule();else stop()});
  motion?.addEventListener?.("change",()=>{if (mayAnimate()) schedule();else stop()});
  window.addEventListener("pagehide",stop);
  rescanNotes();
  window.SetkaLivePreviewsV1 = {
    register,forget,rescanNotes,
    status:()=>({active:previews.size,live:counters.registered,frames:counters.frames,
      phase:painted,mode:"code-canvas-2d",maxFps:20})
  };
})();
