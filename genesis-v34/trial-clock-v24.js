(() => {
  "use strict";

  const STATE_KEY = "setka-research:guest-trial-clock:v24";
  const LEGACY_START_KEY = "setka-research:guest-trial-start:v1";
  const ACCESS_KEY = "setka-research:access-code:v1";
  const LIMIT_MS = 60 * 60 * 1000;
  const listeners = new Set();

  function readState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
      if (raw && raw.version === 24) {
        return {
          version: 24,
          usedMs: Math.max(0, Math.min(LIMIT_MS, Number(raw.usedMs) || 0)),
          expired: !!raw.expired,
          createdAt: raw.createdAt || new Date().toISOString(),
          updatedAt: raw.updatedAt || new Date().toISOString()
        };
      }
    } catch (_) {}

    // One-time migration for browsers that already exhausted the old wall-clock trial.
    // New users never use wall-clock time after this migration.
    let legacyStart = 0;
    try { legacyStart = Number(localStorage.getItem(LEGACY_START_KEY)) || 0; } catch (_) {}
    const legacyExpired = legacyStart > 0 && Date.now() - legacyStart >= LIMIT_MS;
    return {
      version: 24,
      usedMs: legacyExpired ? LIMIT_MS : 0,
      expired: legacyExpired,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  let state = readState();
  let lastTick = Date.now();
  let timer = 0;

  function writeState() {
    state.updatedAt = new Date().toISOString();
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (_) {}
    // Keep the legacy key synchronized so older guest modules read ACTIVE time,
    // not real-world elapsed time. This is recalculated again on every page load.
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
    if (state.expired) return;
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
      // Browsers can suspend JS while backgrounded without delivering a clean
      // visibility event. Capping one tick prevents suspended minutes from being
      // counted as active trial time when execution resumes.
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

  function isAvailable() {
    return !localStorage.getItem(ACCESS_KEY) && !state.expired;
  }

  function forceExpired() {
    state.usedMs = LIMIT_MS;
    state.expired = true;
    writeState();
    notify("expired");
  }

  function subscribe(fn) {
    if (typeof fn !== "function") return () => {};
    listeners.add(fn);
    try { fn({ type: "initial", ...snapshot() }); } catch (_) {}
    return () => listeners.delete(fn);
  }

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", () => { lastTick = Date.now(); writeState(); });
  writeState();
  timer = window.setInterval(tick, 1000);

  window.SetkaTrialClockV24 = {
    getState: snapshot,
    isAvailable,
    subscribe,
    forceExpired,
    LIMIT_MS
  };
})();