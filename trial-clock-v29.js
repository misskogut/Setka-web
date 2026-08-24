(() => {
  "use strict";

  const STATE_KEY = "setka-research:guest-trial-clock:v29";
  const LEGACY_START_KEY = "setka-research:guest-trial-start:v1";
  const ACCESS_KEY = "setka-research:access-code:v1";
  const LIMIT_MS = 60 * 60 * 1000;
  const listeners = new Set();

  function readState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
      if (raw && raw.version === 29) {
        return {
          version: 29,
          usedMs: Math.max(0, Math.min(LIMIT_MS, Number(raw.usedMs) || 0)),
          expired: !!raw.expired || Number(raw.usedMs) >= LIMIT_MS,
          createdAt: raw.createdAt || new Date().toISOString(),
          updatedAt: raw.updatedAt || new Date().toISOString()
        };
      }
    } catch (_) {}
    return { version:29, usedMs:0, expired:false, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
  }

  let state = readState();
  let lastTick = Date.now();

  function writeState() {
    state.updatedAt = new Date().toISOString();
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (_) {}
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

  function notify(type="tick") {
    const detail = { type, ...snapshot() };
    listeners.forEach(fn => { try { fn(detail); } catch (_) {} });
    try { window.dispatchEvent(new CustomEvent("setka:trial-clock", { detail })); } catch (_) {}
  }

  function tick() {
    const now = Date.now();
    const delta = Math.max(0, now-lastTick);
    lastTick = now;
    if (!localStorage.getItem(ACCESS_KEY) && !state.expired && document.visibilityState === "visible") {
      state.usedMs = Math.min(LIMIT_MS, state.usedMs + Math.min(delta, 2200));
      if (state.usedMs >= LIMIT_MS) state.expired = true;
      writeState();
    }
    notify(state.expired ? "expired" : "tick");
  }

  function onVisibility(){ lastTick = Date.now(); writeState(); notify(document.visibilityState === "visible" ? "resume" : "pause"); }
  function subscribe(fn){ if(typeof fn!=="function") return ()=>{}; listeners.add(fn); try{fn({type:"initial",...snapshot()})}catch(_){} return ()=>listeners.delete(fn); }
  function forceExpired(){ state.usedMs=LIMIT_MS; state.expired=true; writeState(); notify("expired"); }

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", ()=>{ lastTick=Date.now(); writeState(); });
  writeState();
  setInterval(tick, 1000);

  const api = { getState:snapshot, subscribe, forceExpired, LIMIT_MS };
  window.SetkaTrialClockV29 = api;
  window.SetkaTrialClockV27 = api;
  window.SetkaTrialClockV24 = api;
})();