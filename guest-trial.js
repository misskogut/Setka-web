(() => {
  "use strict";

  const ACCESS_KEY = "setka-research:access-code:v1";
  const TRIAL_KEY = "setka-research:guest-trial-start:v1";
  const TRIAL_MS = 60 * 60 * 1000;
  const app = document.getElementById("app");
  if (!app) return;

  let researchLoaded = false;
  let timer = 0;
  let badge = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  function getTrialStart() {
    let start = Number(localStorage.getItem(TRIAL_KEY));
    if (!Number.isFinite(start) || start <= 0 || start > Date.now() + 60000) {
      start = Date.now();
      localStorage.setItem(TRIAL_KEY, String(start));
    }
    return start;
  }

  function remainingMs() {
    return Math.max(0, TRIAL_MS - (Date.now() - getTrialStart()));
  }

  function formatRemaining(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  async function loadResearch() {
    if (researchLoaded) return;
    researchLoaded = true;
    clearInterval(timer);
    timer = 0;
    badge?.remove();
    badge = null;
    app.style.visibility = "hidden";
    try {
      await loadScript("research-extension-shim.js?v=2");
      await loadScript("research-v4.js?v=2");
    } catch (error) {
      console.error("SETKA research load failed", error);
      researchLoaded = false;
      app.style.visibility = "visible";
    }
  }

  function createBadge() {
    const style = document.createElement("style");
    style.textContent = `
      #setkaGuestTrial{position:fixed;z-index:9000;left:14px;top:calc(env(safe-area-inset-top,0px) + 16px);height:36px;border:1px solid rgba(255,255,255,.26);border-radius:18px;background:rgba(0,0,0,.52);color:#fff;padding:0 12px;display:flex;align-items:center;gap:7px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;font-size:9px;letter-spacing:.08em;backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);cursor:pointer}
      #setkaGuestTrial .guest-time{font-variant-numeric:tabular-nums;color:rgba(255,255,255,.72)}
      #setkaGuestTrial .guest-id{color:#fff;font-weight:650}
      @media(max-width:360px){#setkaGuestTrial{left:9px;top:calc(env(safe-area-inset-top,0px) + 10px);padding:0 9px}}
    `;
    document.head.appendChild(style);

    badge = document.createElement("button");
    badge.type = "button";
    badge.id = "setkaGuestTrial";
    badge.setAttribute("aria-label", "Пробный доступ. Ввести персональный ID");
    badge.innerHTML = `<span>ПРОБА</span><span class="guest-time"></span><span>·</span><span class="guest-id">ID</span>`;
    badge.addEventListener("click", loadResearch);
    document.body.appendChild(badge);
  }

  function expireTrial() {
    clearInterval(timer);
    timer = 0;
    badge?.remove();
    badge = null;
    loadResearch();
  }

  function tick() {
    const left = remainingMs();
    const time = badge?.querySelector(".guest-time");
    if (time) time.textContent = formatRemaining(left);
    if (left <= 0) expireTrial();
  }

  function startGuest() {
    app.style.visibility = "visible";
    window.SetkaApp?.renderLibrary?.();
    createBadge();
    tick();
    timer = window.setInterval(tick, 1000);
  }

  const storedAccess = localStorage.getItem(ACCESS_KEY);
  if (storedAccess) {
    loadResearch();
  } else if (remainingMs() > 0) {
    startGuest();
  } else {
    loadResearch();
  }
})();
