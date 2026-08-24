(() => {
  "use strict";

  const API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-research-api";
  const API_KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const ACTIVE_KEY = "setka-research:active-session:v5";
  const ACCESS_KEY = "setka-research:access-code:v1";
  const favoritesPanel = document.getElementById("favoritesPanel");
  if (!window.SetkaApp || !favoritesPanel) return;

  let auth = null;
  let syncing = false;
  let lastItems = [];
  let retryTimer = 0;

  const headers = { "Content-Type": "application/json", "apikey": API_KEY };

  function getAuth() {
    const live = window.SetkaJourneyAuth || window.SetkaJourney?.getAuth?.();
    if (live?.sessionId && live?.sessionToken) return { sessionId: live.sessionId, sessionToken: live.sessionToken };
    try {
      const a = JSON.parse(localStorage.getItem(ACTIVE_KEY) || "null");
      if (a?.sessionId && a?.sessionToken) return { sessionId: a.sessionId, sessionToken: a.sessionToken };
    } catch (_) {}
    return null;
  }

  async function call(action, payload = {}) {
    const a = auth || getAuth();
    if (!a) throw new Error("no_auth");
    const r = await fetch(API, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, sessionId: a.sessionId, sessionToken: a.sessionToken, ...payload })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `http_${r.status}`);
    return d;
  }

  function communityCountMap(items = lastItems) {
    const m = new Map();
    for (const x of items || []) m.set(String(x.id), Math.max(0, Number(x.saveCount) || 0));
    return m;
  }

  function paintFavoriteCounts() {
    const counts = communityCountMap();
    const favs = window.SetkaApp.getFavorites?.() || [];
    const byId = new Map(favs.map(f => [String(f.id), f]));
    favoritesPanel.querySelectorAll(".favorite-tile").forEach(tile => {
      const fav = byId.get(String(tile.dataset.itemId || ""));
      let badge = tile.querySelector(".favorite-community-count");
      if (!fav?.communityId) { badge?.remove(); return; }
      const count = counts.get(String(fav.communityId));
      if (count == null) { badge?.remove(); return; }
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "community-count favorite-community-count";
        tile.appendChild(badge);
      }
      badge.textContent = `♥ ${count}`;
    });
  }

  async function refreshCommunity() {
    const d = await call("community-list");
    lastItems = Array.isArray(d.items) ? d.items : [];
    // The community deliberately includes the current participant's own saved states.
    window.SetkaApp.setCommunity(lastItems);
    requestAnimationFrame(paintFavoriteCounts);
    return lastItems;
  }

  async function publishFavorite(f) {
    const d = await call("community-save", {
      patternId: f.baseId || "tentacle-orbit",
      patternVersion: f.patternVersion || 1,
      config: f.config,
      previewFrame: f.previewFrame,
      parentConfigId: f.parentCommunityId || null
    });
    if (d.communityId && f.id) window.SetkaApp.updateFavoriteMeta?.(f.id, { communityId: d.communityId });
    return d;
  }

  async function syncAll() {
    if (syncing || !localStorage.getItem(ACCESS_KEY)) return;
    auth = getAuth();
    if (!auth) {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(syncAll, 900);
      return;
    }
    syncing = true;
    try {
      const existing = await refreshCommunity();
      const communityById = new Map(existing.map(x => [String(x.id), x]));
      const favs = window.SetkaApp.getFavorites?.() || [];
      let changed = false;

      for (const f of favs.slice(0, 120)) {
        const linked = f.communityId ? communityById.get(String(f.communityId)) : null;
        // If the local favorite is already linked and the backend confirms that
        // this participant saved it, nothing to do. Otherwise restore/publish it.
        if (linked?.savedByMe) continue;
        try { await publishFavorite(f); changed = true; } catch (_) {}
      }

      if (changed) await refreshCommunity();
      else paintFavoriteCounts();
    } catch (_) {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(syncAll, 2200);
    } finally {
      syncing = false;
    }
  }

  window.addEventListener("setka:favorite-saved", async e => {
    const fav = e.detail?.favorite;
    if (!fav || !localStorage.getItem(ACCESS_KEY)) return;
    auth = getAuth();
    if (!auth) { syncAll(); return; }
    try { await publishFavorite(fav); await refreshCommunity(); } catch (_) {}
  });

  window.addEventListener("setka:favorite-removed", async e => {
    const fav = e.detail?.favorite;
    if (!fav || !localStorage.getItem(ACCESS_KEY)) return;
    auth = getAuth();
    if (!auth) return;
    try {
      await call("community-unsave", {
        communityId: fav.communityId || null,
        patternId: fav.baseId || "tentacle-orbit",
        patternVersion: fav.patternVersion || 1,
        config: fav.config
      });
      await refreshCommunity();
    } catch (_) {}
  });

  const style = document.createElement("style");
  style.textContent = `.favorite-tile .favorite-community-count{z-index:6}.favorite-tile .mini-heart{z-index:5}`;
  document.head.appendChild(style);

  new MutationObserver(() => requestAnimationFrame(paintFavoriteCounts)).observe(favoritesPanel, { childList: true, subtree: true });

  window.addEventListener("setka:library-page", e => {
    if (e.detail?.page === "community" || e.detail?.page === "favorites") syncAll();
  });

  setTimeout(syncAll, 700);
  setInterval(() => { if (localStorage.getItem(ACCESS_KEY)) syncAll(); }, 15000);
  window.SetkaCommunitySyncV10 = { syncAll, refreshCommunity, paintFavoriteCounts };
})();