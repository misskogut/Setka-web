(() => {
  "use strict";

  const ACCESS_KEY = "setka-research:access-code:v1";
  const app = document.getElementById("app");
  const libraryScreen = document.getElementById("libraryScreen");
  if (!app || !libraryScreen) return;

  // Safari can occasionally leave a CORS request after preflight in a pending state.
  // Research summary data must never be allowed to block the actual prototype UI.
  const previousFetch = window.fetch.bind(window);
  window.fetch = function(input, init) {
    let action = "";
    const url = typeof input === "string" ? input : input?.url || "";
    if (init?.body && typeof init.body === "string") {
      try { action = String(JSON.parse(init.body)?.action || ""); } catch (_) {}
    }

    const nonCritical = action === "self-summary" || action === "symptom-list";
    if (!nonCritical) return previousFetch(input, init);

    return Promise.race([
      previousFetch(input, init),
      new Promise((_, reject) => setTimeout(() => reject(new Error("setka_noncritical_timeout")), 2800))
    ]);
  };

  function forceLibraryVisible() {
    const layer = document.getElementById("setkaResearchLayer");
    const nav = document.querySelector(".portal-nav");
    nav?.classList.add("hidden");
    layer?.classList.add("hidden");
    app.style.visibility = "visible";
    window.SetkaApp?.renderLibrary?.();
    window.SetkaApp?.setLibraryPage?.("all");
  }

  // One startup watchdog only. It does not bypass the access gate/profile;
  // it only releases a previously authenticated user stuck on the connecting screen.
  setTimeout(() => {
    if (!localStorage.getItem(ACCESS_KEY)) return;
    const layer = document.getElementById("setkaResearchLayer");
    const title = layer?.querySelector(".research-title")?.textContent?.trim() || "";
    const activeTimer = Boolean(document.querySelector("#gameScreen .session-top-pill.show"));
    if (activeTimer) return;
    if (!layer || title === "Подключаем SETKA" || title === "") forceLibraryVisible();
  }, 3600);
})();