(() => {
  "use strict";
  const ADMIN_KEY = "setka-research:admin-key:v1";
  const ACCESS = "setka-research:access-code:v1";
  const LEGACY_TRIAL = "setka-research:guest-trial-start:v1";
  const PREV_ACCESS = "setka-research:owner-prev-access:v31";
  let admin = "";
  try { admin = localStorage.getItem(ADMIN_KEY) || ""; } catch (_) {}
  window.SetkaOwnerV31 = { active: !!admin };
  if (!admin) return;
  try {
    const prev = localStorage.getItem(ACCESS);
    if (prev) localStorage.setItem(PREV_ACCESS, prev);
    localStorage.removeItem(ACCESS);
    localStorage.removeItem("setka-research:access-verified:v26");
    localStorage.removeItem("setka-research:access-verified:v27");
    localStorage.removeItem("setka-research:access-verified:v29");
    localStorage.setItem(LEGACY_TRIAL, String(Date.now()));
    localStorage.setItem("setka-research:guest-trial-clock:v29", JSON.stringify({version:29,usedMs:0,expired:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}));
    localStorage.setItem("setka-research:owner-mode:v31", "1");
  } catch (_) {}
})();