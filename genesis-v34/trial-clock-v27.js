(() => {
  "use strict";

  const STATE_KEY = "setka-research:guest-trial-clock:v27";
  const LEGACY_START_KEY = "setka-research:guest-trial-start:v1";
  const ACCESS_KEY = "setka-research:access-code:v1";
  const LIMIT_MS = 60 * 60 * 1000;
  const listeners = new Set();

  function readState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
      if (raw && raw.version === 27) {
        return {
          version: 27,
          usedMs: Math.max(0, Math.min(LIMIT_MS, Number(raw.usedMs) || 0)),
          expired: !!raw.expired || Number(raw.usedMs) >= LIMIT_MS,
          createdAt: raw.createdAt || new Date().toISOString(),
          updatedAt: raw.updatedAt || new Date().toISOString()
        };
      }
    } catch (_) {}

    // v27 intentionally does NOT inherit the old wall-clock trial. Previous builds
    // counted real-world elapsed time, which could expire while the app was closed.
    return {
      version: 27,
      usedMs: 0,
      expired: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  let state = readState();
  let lastTick = Date.now();

  function writeState() {
    state.updatedAt = new Date().toISOString();
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (_) {}
    // Compatibility for the existing guest modules: make their old wall-clock
    // expression represent ACTIVE time instead of time since first page open.
    try { localStorage.setItem(LEGACY_START_KEY, String(Date.now() - state.usedMs)); } catch (_) {}
  }

  function snapshot() {
    return {
      usedMs: state.usedMs,
      remainingMs: Math.max(0, LIMIT_MS - state.usedMs),
      expired: state.expired,
      hasAccess: !!localStorage.getItem(ACCESS_KEY),
      limitMs: LIMIT_MS
    };
  }

  function notify(type = "tick") {
    const detail = { type, ...snapshot() };
    listeners.forEach(fn => { try { fn(detail); } catch (_) {} });
    try { window.dispatchEvent(new CustomEvent("setka:trial-clock", { detail })); } catch (_) {}
  }

  function expire() {
    state.usedMs = LIMIT_MS;
    state.expired = true;
    writeState();
    notify("expired");
  }

  function tick() {
    const now = Date.now();
    const delta = Math.max(0, now - lastTick);
    lastTick = now;

    if (!localStorage.getItem(ACCESS_KEY) && !state.expired && document.visibilityState === "visible") {
      // Cap resumed ticks so time spent suspended/backgrounded is never charged.
      state.usedMs = Math.min(LIMIT_MS, state.usedMs + Math.min(delta, 2200));
      if (state.usedMs >= LIMIT_MS) {
        expire();
        return;
      }
      writeState();
    }
    notify("tick");
  }

  function onVisibility() {
    lastTick = Date.now();
    writeState();
    notify(document.visibilityState === "visible" ? "resume" : "pause");
  }

  function subscribe(fn) {
    if (typeof fn !== "function") return () => {};
    listeners.add(fn);
    try { fn({ type: "initial", ...snapshot() }); } catch (_) {}
    return () => listeners.delete(fn);
  }

  function forceExpired() {
    state.usedMs = LIMIT_MS;
    state.expired = true;
    writeState();
    notify("expired");
  }

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", () => { lastTick = Date.now(); writeState(); });
  writeState();
  setInterval(tick, 1000);

  const api = { getState: snapshot, subscribe, forceExpired, LIMIT_MS };
  window.SetkaTrialClockV27 = api;
  // Existing guest-shell code reads this historical name; point it at the fixed clock.
  window.SetkaTrialClockV24 = api;
})();