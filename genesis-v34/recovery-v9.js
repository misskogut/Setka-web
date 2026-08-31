(() => {
  "use strict";

  const ACCESS_KEY = "setka-research:access-code:v1";
  const ACTIVE_KEY = "setka-research:active-session:v5";
  const app = document.getElementById("app");
  const library = document.getElementById("libraryScreen");
  if (!app || !library) return;

  // A previously opened measured session can otherwise leave Safari trying to
  // restore an old backend context before anything is visible. Keep only
  // sessions that are still meaningfully resumable.
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved) {
      const now = Date.now();
      const deadline = Number(saved.deadlineMs) || 0;
      const feedbackAt = Number(saved.feedbackSubmittedMs) || 0;
      const startedAt = Number(saved.sessionStartedWallMs) || 0;
      const phase = String(saved.phase || "");
      let stale = false;

      if ((phase === "measured" || phase === "feedback") && deadline && now > deadline + 20 * 60 * 1000) stale = true;
      if (phase === "after_feedback" && feedbackAt && now > feedbackAt + 6 * 60 * 60 * 1000) stale = true;
      if (startedAt && now > startedAt + 12 * 60 * 60 * 1000) stale = true;

      if (stale) localStorage.removeItem(ACTIVE_KEY);
    }
  } catch (_) {
    localStorage.removeItem(ACTIVE_KEY);
  }

  // Startup reads are useful, but never important enough to leave the product
  // behind a black screen when mobile Safari stalls after a CORS preflight.
  const prevFetch = window.fetch.bind(window);
  window.fetch = function(input, init) {
    let action = "";
    if (init?.body && typeof init.body === "string") {
      try { action = String(JSON.parse(init.body)?.action || ""); } catch (_) {}
    }
    const startupRead = action === "community-list" || action === "symptom-list" || action === "self-summary";
    if (!startupRead) return prevFetch(input, init);
    return Promise.race([
      prevFetch(input, init),
      new Promise((_, reject) => setTimeout(() => reject(new Error("setka_startup_read_timeout")), 2400))
    ]);
  };

  function revealLibrary() {
    document.querySelector(".portal-nav")?.classList.add("hidden");
    document.getElementById("setkaResearchLayer")?.classList.add("hidden");
    app.style.visibility = "visible";
    try { window.SetkaApp?.renderLibrary?.(); } catch (_) {}
    try { window.SetkaApp?.setLibraryPage?.("all"); } catch (_) {}
  }

  // Returning participants should see SETKA first. Authentication/research
  // initialization can finish behind it; a real gate/profile/post-session
  // screen may still replace the library once it is actually ready.
  if (localStorage.getItem(ACCESS_KEY)) {
    let elapsed = 0;
    const watchdog = setInterval(() => {
      elapsed += 350;
      const layer = document.getElementById("setkaResearchLayer");
      const title = layer?.querySelector(".research-title")?.textContent?.trim() || "";
      const activeTimer = Boolean(document.querySelector("#gameScreen .session-top-pill.show"));
      const startupOnly = !layer || title === "" || title === "Подключаем SETKA";
      if (!activeTimer && startupOnly && elapsed >= 1050) revealLibrary();
      if (!startupOnly || activeTimer || elapsed >= 9000) clearInterval(watchdog);
    }, 350);
  }
})();