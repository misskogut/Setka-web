(() => {
  "use strict";

  const API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-research-api";
  const GUEST_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-guest-v11";
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
    const r = await fetch(API, { method: "POST", headers, body: JSON.stringify({ action, sessionId: a.sessionId, sessionToken: a.sessionToken, ...payload }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `http_${r.status}`);
    return d;
  }

  async function publicCommunity() {
    const r = await fetch(GUEST_API, { method: "POST", headers, body: JSON.stringify({ action: "public-community" }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `http_${r.status}`);
    return d;
  }

  function countMaps(items = lastItems) {
    const byId = new Map(), byKey = new Map();
    for (const x of items || []) {
      const count = Math.max(0, Number(x.saveCount) || 0);
      byId.set(String(x.id), count);
      try { byKey.set(window.SetkaApp.configKey(x.config), count); } catch (_) {}
    }
    return { byId, byKey };
  }

  function paintFavoriteCounts() {
    const { byId, byKey } = countMaps();
    const favs = window.SetkaApp.getFavorites?.() || [];
    const byFavId = new Map(favs.map(f => [String(f.id), f]));
    favoritesPanel.querySelectorAll(".favorite-tile").forEach(tile => {
      const fav = byFavId.get(String(tile.dataset.itemId || ""));
      let badge = tile.querySelector(".favorite-community-count");
      if (!fav) { badge?.remove(); return; }
      let count = fav.communityId ? byId.get(String(fav.communityId)) : undefined;
      if (count == null) {
        try { count = byKey.get(window.SetkaApp.configKey(fav.config)); } catch (_) {}
      }
      if (count == null) { badge?.remove(); return; }
      if (!badge) { badge = document.createElement("span"); badge.className = "community-count favorite-community-count"; tile.appendChild(badge); }
      badge.textContent = `♥ ${count}`;
    });
  }

  async function refreshCommunity() {
    const d = getAuth() ? await call("community-list") : await publicCommunity();
    lastItems = Array.isArray(d.items) ? d.items : [];
    window.SetkaApp.setCommunity(lastItems);
    requestAnimationFrame(paintFavoriteCounts);
    return lastItems;
  }

  async function publishFavorite(f) {
    const d = await call("community-save", { patternId: f.baseId || "tentacle-orbit", patternVersion: f.patternVersion || 1, config: f.config, previewFrame: f.previewFrame, parentConfigId: f.parentCommunityId || null });
    if (d.communityId && f.id) window.SetkaApp.updateFavoriteMeta?.(f.id, { communityId: d.communityId });
    return d;
  }

  async function syncAll() {
    if (syncing) return;
    syncing = true;
    try {
      auth = getAuth();
      if (!auth) { await refreshCommunity(); return; }
      const existing = await refreshCommunity();
      const communityById = new Map(existing.map(x => [String(x.id), x]));
      const favs = window.SetkaApp.getFavorites?.() || [];
      let changed = false;
      for (const f of favs.slice(0, 120)) {
        const linked = f.communityId ? communityById.get(String(f.communityId)) : null;
        if (linked?.savedByMe) continue;
        try { await publishFavorite(f); changed = true; } catch (_) {}
      }
      if (changed) await refreshCommunity(); else paintFavoriteCounts();
    } catch (_) {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(syncAll, 2200);
    } finally { syncing = false; }
  }

  window.addEventListener("setka:favorite-saved", async e => {
    const fav = e.detail?.favorite;
    if (!fav) return;
    auth = getAuth();
    if (!auth) { requestAnimationFrame(paintFavoriteCounts); return; }
    try { await publishFavorite(fav); await refreshCommunity(); } catch (_) {}
  });

  window.addEventListener("setka:favorite-removed", async e => {
    const fav = e.detail?.favorite;
    if (!fav) return;
    auth = getAuth();
    if (!auth) { requestAnimationFrame(paintFavoriteCounts); return; }
    try { await call("community-unsave", { communityId: fav.communityId || null, patternId: fav.baseId || "tentacle-orbit", patternVersion: fav.patternVersion || 1, config: fav.config }); await refreshCommunity(); } catch (_) {}
  });

  const style = document.createElement("style");
  style.textContent = `.favorite-tile .favorite-community-count{z-index:6}.favorite-tile .mini-heart{z-index:5}`;
  document.head.appendChild(style);
  new MutationObserver(() => requestAnimationFrame(paintFavoriteCounts)).observe(favoritesPanel, { childList: true, subtree: true });
  window.addEventListener("setka:library-page", e => { if (e.detail?.page === "community" || e.detail?.page === "favorites") syncAll(); });

  setTimeout(syncAll, 500);
  setInterval(syncAll, 15000);
  window.SetkaCommunitySyncV10 = { syncAll, refreshCommunity, paintFavoriteCounts };
})();