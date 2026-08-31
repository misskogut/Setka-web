(() => {
  "use strict";

  const ACCESS = "setka-research:access-code:v1";
  const VERIFIED = "setka-research:access-verified:v27";
  const PREFILL = "setka-research:access-prefill:v27";

  let access = null;
  let verified = null;
  try { access = localStorage.getItem(ACCESS); } catch (_) {}
  try { verified = localStorage.getItem(VERIFIED); } catch (_) {}

  // v27 starts from an explicit server-verified state. Any access value created by
  // an older build is kept only as a convenient prefill and cannot hide guest UI.
  if (access && verified !== access) {
    try { localStorage.setItem(PREFILL, access); } catch (_) {}
    try { localStorage.removeItem(ACCESS); } catch (_) {}
    access = null;
  }

  window.SetkaAccessStateV27 = {
    ACCESS, VERIFIED, PREFILL,
    getAccess() { try { return localStorage.getItem(ACCESS); } catch (_) { return null; } },
    getVerified() { try { return localStorage.getItem(VERIFIED); } catch (_) { return null; } },
    getPrefill() { try { return localStorage.getItem(PREFILL) || ""; } catch (_) { return ""; } },
    markVerified(code) {
      const c = String(code || "").trim().toUpperCase();
      if (!c) return;
      try { localStorage.setItem(VERIFIED, c); } catch (_) {}
      try { localStorage.setItem(ACCESS, c); } catch (_) {}
      try { localStorage.removeItem(PREFILL); } catch (_) {}
    },
    clearVerified() {
      try { localStorage.removeItem(VERIFIED); } catch (_) {}
      try { localStorage.removeItem(ACCESS); } catch (_) {}
    }
  };
})();