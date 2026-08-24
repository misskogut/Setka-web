(() => {
  "use strict";
  const ACCESS = "setka-research:access-code:v1";
  const VERIFIED = "setka-research:access-verified:v26";
  const PREFILL = "setka-research:access-prefill:v26";

  let access = null;
  let verified = null;
  try { access = localStorage.getItem(ACCESS); } catch (_) {}
  try { verified = localStorage.getItem(VERIFIED); } catch (_) {}

  // Old builds treated mere presence of ACCESS as authenticated. That could trap a
  // returning browser on a hidden research boot screen. v26 trusts only an ID that
  // was explicitly verified by the v26 claim flow. Legacy values are preserved only
  // as a prefill and removed from the auth key before guest modules initialize.
  if (access && verified !== access) {
    try { localStorage.setItem(PREFILL, access); } catch (_) {}
    try { localStorage.removeItem(ACCESS); } catch (_) {}
    access = null;
  }

  window.SetkaAccessStateV26 = {
    ACCESS,
    VERIFIED,
    PREFILL,
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