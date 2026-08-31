(() => {
  "use strict";
  const OLD_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-research-api";
  const EXT_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-research-extensions";
  const EXT_ACTIONS = new Set([
    "profile-save",
    "symptom-list",
    "symptom-add",
    "symptom-toggle",
    "symptom-checkins",
    "symptom-history",
    "invite-create",
    "invite-stats"
  ]);

  const originalFetch = window.fetch.bind(window);

  window.fetch = function(input, init) {
    const url = typeof input === "string" ? input : input?.url;
    if (url !== OLD_API || !init || String(init.method || "GET").toUpperCase() !== "POST" || typeof init.body !== "string") {
      return originalFetch(input, init);
    }

    let body;
    try { body = JSON.parse(init.body); }
    catch (_) { return originalFetch(input, init); }

    const action = String(body?.action || "");
    if (EXT_ACTIONS.has(action)) {
      return originalFetch(EXT_API, init);
    }

    if (action === "session-context") {
      const extBody = {
        action: "research-start",
        sessionId: body.sessionId,
        sessionToken: body.sessionToken,
        localStartedAt: new Date().toISOString()
      };
      const extInit = { ...init, body: JSON.stringify(extBody) };
      return originalFetch(EXT_API, extInit)
        .catch(() => null)
        .then(() => originalFetch(input, init));
    }

    return originalFetch(input, init);
  };
})();