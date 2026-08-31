(() => {
  "use strict";

  const ADMIN_KEY = "setka-research:admin-key:v1";
  const OWNER_FLAG = "setka-research:owner-mode:v30";
  const OWNER_ARCHIVE = "setka-research:owner-archive:v30";
  const OWNER_PREV_ACCESS = "setka-research:owner-prev-access:v30";
  const ACCESS_KEY = "setka-research:access-code:v1";
  const LEGACY_TRIAL = "setka-research:guest-trial-start:v1";
  const GUEST_ARCHIVE = "setka-research:guest-archive:v11";
  const LIMIT_MS = 60 * 60 * 1000;

  let adminKey = "";
  try { adminKey = localStorage.getItem(ADMIN_KEY) || ""; } catch (_) {}
  const active = !!adminKey;
  window.SetkaOwnerModeV30 = { active, archiveId: null };
  if (!active) return;

  try { localStorage.setItem(OWNER_FLAG, "1"); } catch (_) {}

  // The owner/tester URL is deliberately a guest-style research sandbox. A stale
  // participant ID from older prototype runs must never hide its navigation or
  // re-enable the normal trial/auth state machine. Preserve it only as a backup.
  try {
    const previous = localStorage.getItem(ACCESS_KEY);
    if (previous) localStorage.setItem(OWNER_PREV_ACCESS, previous);
    localStorage.removeItem(ACCESS_KEY);
  } catch (_) {}

  const baseClock = window.SetkaTrialClockV29 || window.SetkaTrialClockV27 || window.SetkaTrialClockV24;
  if (baseClock) {
    const ownerSnapshot = () => ({
      ...(baseClock.getState?.() || {}),
      usedMs: 0,
      remainingMs: LIMIT_MS,
      expired: false,
      hasAccess: false,
      ownerMode: true,
      limitMs: LIMIT_MS
    });
    const ownerClock = {
      LIMIT_MS,
      getState: ownerSnapshot,
      subscribe(fn) {
        if (typeof fn !== "function") return () => {};
        try { fn({ type: "owner", ...ownerSnapshot() }); } catch (_) {}
        return baseClock.subscribe ? baseClock.subscribe(() => {
          try { fn({ type: "owner", ...ownerSnapshot() }); } catch (_) {}
        }) : () => {};
      },
      forceExpired() {}
    };
    window.SetkaTrialClockV29 = ownerClock;
    window.SetkaTrialClockV27 = ownerClock;
    window.SetkaTrialClockV24 = ownerClock;
  }

  function keepGuestAlive() {
    try { localStorage.setItem(LEGACY_TRIAL, String(Date.now())); } catch (_) {}
    try {
      const a = JSON.parse(localStorage.getItem(GUEST_ARCHIVE) || "null");
      if (a?.archiveId) {
        localStorage.setItem(OWNER_ARCHIVE, a.archiveId);
        window.SetkaOwnerModeV30.archiveId = a.archiveId;
      }
    } catch (_) {}
  }
  keepGuestAlive();
  setInterval(keepGuestAlive, 5000);

  const style = document.createElement("style");
  style.textContent = `
    #setkaOwnerBadgeV30{position:fixed;z-index:100140;left:14px;top:calc(env(safe-area-inset-top,0px) + 16px);height:34px;padding:0 11px;border:1px solid rgba(255,255,255,.3);border-radius:17px;background:rgba(0,0,0,.55);color:#fff;display:flex;align-items:center;gap:6px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;font-size:9px;letter-spacing:.09em;backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
    #setkaOwnerBadgeV30 i{width:6px;height:6px;border-radius:50%;background:#fff;display:block}
  `;
  document.head.appendChild(style);

  const badge = document.createElement("div");
  badge.id = "setkaOwnerBadgeV30";
  badge.innerHTML = "<i></i><span>OWNER · TEST</span>";
  document.body.appendChild(badge);
})();