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
  let bootShield = null;

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

  function installBootShield() {
    bootShield?.remove();
    bootShield = document.createElement("style");
    bootShield.id = "setkaResearchBootShield";
    bootShield.textContent = `#setkaResearchLayer{visibility:hidden!important;pointer-events:none!important}.portal-nav{visibility:hidden!important;pointer-events:none!important}`;
    document.head.appendChild(bootShield);
  }

  function releaseBootShield() {
    bootShield?.remove();
    bootShield = null;
  }

  function settleResearchBoot() {
    const layer = document.getElementById("setkaResearchLayer");
    const title = layer?.querySelector(".research-title")?.textContent?.trim() || "";
    if (!layer || !title || title === "Подключаем SETKA") return false;

    releaseBootShield();
    app.style.visibility = "visible";

    if (title === "Сегодня") {
      layer.classList.add("hidden");
      document.querySelector(".portal-nav")?.classList.add("hidden");
      try { window.SetkaApp?.renderLibrary?.(); } catch (_) {}
    }
    return true;
  }

  async function loadResearch() {
    if (researchLoaded) return;
    if (window.SETKA_SAFE_MODE) {
      app.style.visibility = "visible";
      try { window.SetkaApp?.renderLibrary?.(); } catch (_) {}
      return;
    }

    researchLoaded = true;
    clearInterval(timer);
    timer = 0;
    badge?.remove();
    badge = null;

    app.style.visibility = "visible";
    try { window.SetkaApp?.renderLibrary?.(); } catch (_) {}
    installBootShield();

    try { window.SetkaGuestSyncV12?.flush?.(true); } catch (_) {}
    try { window.SetkaGuestTrial?.prepareForAuth?.(); } catch (_) {}

    try {
      await loadScript("research-v5.js?v=23");
      let tries = 0;
      const watcher = setInterval(() => {
        tries += 1;
        if (settleResearchBoot() || tries >= 18) {
          clearInterval(watcher);
          if (tries >= 18) {
            const layer = document.getElementById("setkaResearchLayer");
            const title = layer?.querySelector(".research-title")?.textContent?.trim() || "";
            if (!title || title === "Подключаем SETKA") {
              layer?.classList.add("hidden");
              document.querySelector(".portal-nav")?.classList.add("hidden");
            }
            releaseBootShield();
            app.style.visibility = "visible";
            try { window.SetkaApp?.renderLibrary?.(); } catch (_) {}
          }
        }
      }, 250);
    } catch (error) {
      console.error("SETKA research load failed", error);
      researchLoaded = false;
      releaseBootShield();
      app.style.visibility = "visible";
      try { window.SetkaApp?.renderLibrary?.(); } catch (_) {}
    }
  }

  function openGuestMenu() {
    document.getElementById("guestMenuButton")?.click();
  }

  function createBadge() {
    const style = document.createElement("style");
    style.textContent = `
      #setkaGuestTrial{position:fixed;z-index:9000;left:14px;top:calc(env(safe-area-inset-top,0px) + 16px);height:36px;border:1px solid rgba(255,255,255,.26);border-radius:18px;background:rgba(0,0,0,.52);color:#fff;padding:0 7px 0 12px;display:flex;align-items:center;gap:6px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;font-size:9px;letter-spacing:.08em;backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
      #setkaGuestTrial .guest-time{font-variant-numeric:tabular-nums;color:rgba(255,255,255,.72)}
      #setkaGuestTrial .guest-menu,#setkaGuestTrial .guest-id{border:0;background:transparent;color:#fff;font:inherit;letter-spacing:.08em;height:28px;padding:0 5px;cursor:pointer}
      #setkaGuestTrial .guest-menu{color:rgba(255,255,255,.78)}#setkaGuestTrial .guest-id{font-weight:700}
      #guestMenuButton{display:none!important}
      @media(max-width:360px){#setkaGuestTrial{left:9px;top:calc(env(safe-area-inset-top,0px) + 10px);padding-left:9px;gap:4px}#setkaGuestTrial .guest-menu,#setkaGuestTrial .guest-id{padding:0 3px}}
    `;
    document.head.appendChild(style);

    badge = document.createElement("div");
    badge.id = "setkaGuestTrial";
    badge.setAttribute("aria-label", "Пробный доступ SETKA");
    badge.innerHTML = `<span>ПРОБА</span><span class="guest-time"></span><span>·</span><button class="guest-menu" type="button">МЕНЮ</button><span>·</span><button class="guest-id" type="button">ID</button>`;
    badge.querySelector(".guest-menu").addEventListener("click", openGuestMenu);
    badge.querySelector(".guest-id").addEventListener("click", loadResearch);
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
  if (window.SETKA_SAFE_MODE) {
    app.style.visibility = "visible";
    window.SetkaApp?.renderLibrary?.();
  } else if (storedAccess) {
    loadResearch();
  } else if (remainingMs() > 0) {
    startGuest();
  } else {
    loadResearch();
  }

  window.SetkaGuestBoot = { loadResearch };
})();