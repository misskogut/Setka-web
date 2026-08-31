(() => {
  "use strict";

  const ACCESS_KEY = "setka-research:access-code:v1";
  const ACTIVE_KEY = "setka-research:active-session:v5";
  const app = document.getElementById("app");
  if (!app) return;

  // Never let telemetry/auth boot leave the actual prototype permanently blank.
  app.style.visibility = "visible";

  function cleanStaleActiveSession() {
    let a = null;
    try { a = JSON.parse(localStorage.getItem(ACTIVE_KEY) || "null"); } catch (_) {}
    if (!a || typeof a !== "object") return;

    const now = Date.now();
    const deadline = Number(a.deadlineMs) || 0;
    const feedbackAt = Number(a.feedbackSubmittedMs) || 0;
    const startedAt = Number(a.sessionStartedWallMs) || 0;
    let stale = false;

    if ((a.phase === "measured" || a.phase === "feedback") && deadline && now - deadline > 30 * 60 * 1000) stale = true;
    if (a.phase === "after_feedback" && feedbackAt && now - feedbackAt > 2 * 60 * 60 * 1000) stale = true;
    if (startedAt && now - startedAt > 12 * 60 * 60 * 1000) stale = true;

    if (stale) {
      try { localStorage.removeItem(ACTIVE_KEY); } catch (_) {}
    }
  }
  cleanStaleActiveSession();

  function meaningfulResearchScreen() {
    const layer = document.getElementById("setkaResearchLayer");
    if (!layer || layer.classList.contains("hidden")) return false;
    const title = layer.querySelector(".research-title")?.textContent?.trim() || "";
    if (!title || title === "Подключаем SETKA") return false;
    return true;
  }

  function releasePrototype() {
    if (meaningfulResearchScreen()) return;
    const layer = document.getElementById("setkaResearchLayer");
    const nav = document.querySelector(".portal-nav");
    layer?.classList.add("hidden");
    nav?.classList.add("hidden");
    app.style.visibility = "visible";
    try {
      window.SetkaApp?.renderLibrary?.();
      if (window.SetkaApp?.getState?.()?.view !== "game") window.SetkaApp?.setLibraryPage?.("all");
    } catch (_) {}
  }

  // Returning browsers are the risky case: cached/stale session state must not block UI.
  if (localStorage.getItem(ACCESS_KEY)) {
    [1800, 3500, 6500].forEach(ms => setTimeout(() => {
      if (getComputedStyle(app).visibility === "hidden" || !meaningfulResearchScreen()) releasePrototype();
    }, ms));
  }

  window.addEventListener("error", () => setTimeout(releasePrototype, 0));
  window.addEventListener("unhandledrejection", () => setTimeout(releasePrototype, 0));

  window.SetkaStartupV10 = { releasePrototype, cleanStaleActiveSession };
})();