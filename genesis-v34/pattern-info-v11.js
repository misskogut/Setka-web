(() => {
  "use strict";

  const API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-pattern-insights";
  const API_KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const panels = ["allPatternsPanel", "communityPanel", "favoritesPanel"].map(id => document.getElementById(id)).filter(Boolean);
  if (!panels.length || !window.SetkaApp) return;

  const INTENT_SHORT = {
    sleep: "Сон",
    relax: "Расслабление",
    tension: "Напряжение",
    focus: "Фокус",
    energy: "Энергия",
    switch: "Переключение",
    explore: "Исследование"
  };

  const style = document.createElement("style");
  style.textContent = `
    .pattern-info-button{position:absolute;z-index:7;right:7px;bottom:7px;width:23px;height:23px;border:1px solid rgba(255,255,255,.34);border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.58);color:rgba(255,255,255,.72);font:600 11px/1 -apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);cursor:pointer;user-select:none;-webkit-user-select:none}
    .pattern-info-button:active{transform:scale(.9);color:#fff;border-color:rgba(255,255,255,.7)}
    #patternInfoOverlay{position:fixed;inset:0;z-index:100120;background:rgba(0,0,0,.76);display:grid;align-items:end;padding:18px 14px calc(env(safe-area-inset-bottom,0px) + 14px);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;color:#fff;backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}
    .pattern-info-sheet{width:min(100%,460px);max-height:min(78vh,690px);overflow:auto;margin:0 auto;border:1px solid rgba(255,255,255,.25);border-radius:26px;background:rgba(5,5,5,.97);padding:18px 18px 16px;box-sizing:border-box}
    .pattern-info-head{display:grid;grid-template-columns:88px 1fr auto;gap:14px;align-items:center}.pattern-info-preview{width:88px;height:88px;border-radius:17px;overflow:hidden;border:1px solid rgba(255,255,255,.13);background:#000}.pattern-info-preview canvas{width:100%;height:100%;display:block}.pattern-info-kicker{font-size:9px;letter-spacing:.13em;color:rgba(255,255,255,.38);text-transform:uppercase}.pattern-info-title{font-size:19px;font-weight:650;margin-top:4px}.pattern-info-close{width:34px;height:34px;border:1px solid rgba(255,255,255,.2);border-radius:50%;background:transparent;color:#fff;font-size:20px;line-height:1;cursor:pointer}.pattern-info-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:16px}.pattern-info-stat{border:1px solid rgba(255,255,255,.11);border-radius:15px;padding:11px 10px;min-width:0}.pattern-info-stat strong{display:block;font-size:17px;font-weight:620}.pattern-info-stat span{display:block;margin-top:3px;font-size:9px;line-height:1.25;color:rgba(255,255,255,.38);text-transform:uppercase;letter-spacing:.05em}.pattern-info-section{margin-top:17px}.pattern-info-section h3{font-size:12px;margin:0 0 9px;font-weight:620}.pattern-intent-row{display:grid;grid-template-columns:minmax(88px,1.1fr) 2fr 34px;gap:9px;align-items:center;margin:8px 0}.pattern-intent-label{font-size:11px;color:rgba(255,255,255,.72);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pattern-intent-track{height:5px;border-radius:5px;background:rgba(255,255,255,.09);overflow:hidden}.pattern-intent-fill{height:100%;border-radius:5px;background:rgba(255,255,255,.72)}.pattern-intent-pct{font-size:10px;text-align:right;color:rgba(255,255,255,.46);font-variant-numeric:tabular-nums}.pattern-info-note{font-size:10px;line-height:1.45;color:rgba(255,255,255,.34);margin-top:14px}.pattern-info-loading{padding:25px 0 12px;text-align:center;font-size:12px;color:rgba(255,255,255,.4)}
    @media(max-width:360px){.pattern-info-head{grid-template-columns:72px 1fr auto}.pattern-info-preview{width:72px;height:72px}.pattern-info-stats{grid-template-columns:repeat(2,1fr)}}
  `;
  document.head.appendChild(style);

  function esc(v) { return String(v ?? "").replace(/[&<>\"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m])); }
  function pct(v) { return `${Math.round(Math.max(0, Math.min(1, Number(v) || 0)) * 100)}%`; }
  function signed(v) { const x = Number(v); if (!Number.isFinite(x)) return "—"; return `${x > 0 ? "+" : ""}${x.toFixed(1)}`; }
  function mins(ms) { const m = Math.round((Number(ms) || 0) / 60000); return m < 1 ? "<1 мин" : `${m} мин`; }

  function injectInfoButtons() {
    for (const panel of panels) {
      panel.querySelectorAll(".pattern-tile").forEach(tile => {
        if (tile.querySelector(".pattern-info-button")) return;
        const info = document.createElement("span");
        info.className = "pattern-info-button";
        info.setAttribute("role", "button");
        info.setAttribute("aria-label", "Информация о паттерне");
        info.textContent = "i";
        tile.appendChild(info);
      });
    }
  }

  function targetFromTile(tile) {
    const kind = tile.dataset.kind || "base";
    let communityConfigId = null;
    if (kind === "community") communityConfigId = tile.dataset.itemId || null;
    if (kind === "favorite") {
      const fav = (window.SetkaApp.getFavorites?.() || []).find(f => String(f.id) === String(tile.dataset.itemId || ""));
      communityConfigId = fav?.communityId || null;
    }
    return { kind, patternId: "tentacle-orbit", communityConfigId };
  }

  async function fetchStats(target) {
    const auth = window.SetkaJourneyAuth || window.SetkaJourney?.getAuth?.() || null;
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": API_KEY },
      body: JSON.stringify({
        patternId: target.patternId,
        communityConfigId: target.communityConfigId,
        sessionId: auth?.sessionId || null,
        sessionToken: auth?.sessionToken || null
      })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "stats_failed");
    return d;
  }

  function copyPreview(tile, host) {
    const src = tile.querySelector("canvas");
    const c = document.createElement("canvas");
    c.width = 176; c.height = 176;
    host.appendChild(c);
    if (!src) return;
    try { c.getContext("2d").drawImage(src, 0, 0, c.width, c.height); } catch (_) {}
  }

  function showInfo(tile) {
    document.getElementById("patternInfoOverlay")?.remove();
    const target = targetFromTile(tile);
    const overlay = document.createElement("div");
    overlay.id = "patternInfoOverlay";
    const title = target.communityConfigId ? "Эта конфигурация" : "Tentacle Orbit";
    const kicker = target.communityConfigId ? "ДАННЫЕ КОНФИГУРАЦИИ" : "ДАННЫЕ ПАТТЕРНА";
    overlay.innerHTML = `<div class="pattern-info-sheet"><div class="pattern-info-head"><div class="pattern-info-preview"></div><div><div class="pattern-info-kicker">${kicker}</div><div class="pattern-info-title">${title}</div></div><button class="pattern-info-close" type="button" aria-label="Закрыть">×</button></div><div id="patternInfoBody" class="pattern-info-loading">Собираем статистику…</div></div>`;
    document.body.appendChild(overlay);
    copyPreview(tile, overlay.querySelector(".pattern-info-preview"));
    const close = () => overlay.remove();
    overlay.querySelector(".pattern-info-close").onclick = close;
    overlay.addEventListener("pointerdown", e => { if (e.target === overlay) close(); });
    window.SetkaJourney?.track?.("journey_pattern_info", { patternId: target.patternId, communityConfigId: target.communityConfigId, kind: target.kind });

    fetchStats(target).then(d => {
      if (!document.body.contains(overlay)) return;
      const s = d.stats || {};
      const body = overlay.querySelector("#patternInfoBody");
      const intents = Array.isArray(s.topIntents) ? s.topIntents : [];
      if (!s.sessions) {
        body.className = "pattern-info-loading";
        body.textContent = "Пока мало данных. Статистика появится по мере реальных измеряемых сессий.";
        return;
      }
      const stats = [
        [s.sessions, "сессий"],
        [`♥ ${s.saveCount || 0}`, "сохранили"],
        [mins(s.totalUsageMs), "в паттерне"]
      ];
      if (s.completed) stats.push([signed(s.avgDelta), "состояние Δ"]);
      if (s.completed) stats.push([pct(s.improvedRate), "лучше после"]);
      if (s.ownSessions != null && s.ownSessions > 0) stats.push([s.ownSessions, "твоих сессий"]);
      body.className = "";
      body.innerHTML = `<div class="pattern-info-stats">${stats.map(([v,l]) => `<div class="pattern-info-stat"><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`).join("")}</div>${intents.length ? `<div class="pattern-info-section"><h3>Чаще используют для</h3>${intents.map(x => `<div class="pattern-intent-row"><div class="pattern-intent-label">${esc(INTENT_SHORT[x.key] || x.label || x.key)}</div><div class="pattern-intent-track"><div class="pattern-intent-fill" style="width:${Math.round((Number(x.share)||0)*100)}%"></div></div><div class="pattern-intent-pct">${pct(x.share)}</div></div>`).join("")}</div>` : ""}<div class="pattern-info-note">Показатели строятся по измеряемым сессиям. Изменение состояния — наблюдаемая связь в сессиях, где использовали этот паттерн/конфигурацию, а не доказанный причинный эффект.</div>`;
    }).catch(() => {
      const body = overlay.querySelector("#patternInfoBody");
      if (body) body.textContent = "Статистика временно не загрузилась. Сам паттерн работает независимо от аналитики.";
    });
  }

  // ui-v7 captures tile pointerup on the library screen. Handling the info control
  // at window-capture level keeps it independent from opening the pattern itself.
  window.addEventListener("pointerup", e => {
    const info = e.target?.closest?.(".pattern-info-button");
    if (!info) return;
    const tile = info.closest(".pattern-tile");
    if (!tile) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
    showInfo(tile);
  }, true);

  window.addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && document.activeElement?.classList?.contains("pattern-info-button")) {
      e.preventDefault();
      const tile = document.activeElement.closest(".pattern-tile");
      if (tile) showInfo(tile);
    }
  });

  for (const panel of panels) new MutationObserver(injectInfoButtons).observe(panel, { childList: true, subtree: true });
  injectInfoButtons();
  setInterval(injectInfoButtons, 1600);
})();