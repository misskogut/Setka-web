(() => {
  "use strict";

  const library = document.getElementById("libraryScreen");
  const Setka = window.SetkaApp;
  if (!library || !Setka) return;

  const CUSTOM_IDS = new Set(["rgb-glitch-rings", "breathing-fractal", "breathing-fractal-growth"]);
  const starts = new Map();

  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));

  function resolve(tile) {
    const kind = tile?.dataset?.kind || "base";
    const itemId = String(tile?.dataset?.itemId || "");
    let patternId = tile?.dataset?.patternId || null;
    let config = null;
    let communityId = null;

    if (kind === "base") {
      patternId = patternId || itemId;
      if (!CUSTOM_IDS.has(patternId)) return null;
      config = Setka.getPatternDefaults?.(patternId) || null;
    } else if (kind === "favorite") {
      const fav = Setka.getFavorites?.().find(x => String(x.id) === itemId);
      if (!fav) return null;
      patternId = fav.baseId || fav.patternId || fav.config?.patternId || patternId;
      if (!CUSTOM_IDS.has(patternId)) return null;
      config = clone(fav.config);
      communityId = fav.communityId || null;
    } else if (kind === "community") {
      const C = window.SetkaStandaloneV34;
      const item = (C?.publicCommunity || []).find(x => String(x.id) === itemId);
      patternId = item?.patternId || item?.pattern_id || item?.baseId || item?.config?.patternId || patternId;
      if (!CUSTOM_IDS.has(patternId)) return null;
      config = clone(item?.config || Setka.getPatternDefaults?.(patternId));
      communityId = itemId;
    }

    if (!patternId || !config) return null;
    return { kind, itemId, patternId, config, communityId };
  }

  function sourceFor(t) {
    return {
      type: t.kind,
      id: t.itemId || t.patternId,
      patternId: t.patternId,
      communityId: t.communityId || null
    };
  }

  function directOpen(t) {
    Setka.openConfig?.(clone(t.config), sourceFor(t));
  }

  function showChoice(t) {
    document.getElementById("st34ExtraChoice")?.remove();
    const C = window.SetkaStandaloneV34;
    if (!C) return directOpen(t);

    const overlay = document.createElement("div");
    overlay.id = "st34ExtraChoice";
    overlay.style.cssText = "position:fixed;inset:0;z-index:216000;background:rgba(0,0,0,.84);display:grid;place-items:center;padding:24px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#fff";
    overlay.innerHTML = `<div style="width:min(100%,390px);border:1px solid rgba(255,255,255,.25);border-radius:26px;background:#050505;padding:24px 20px 18px;text-align:center">
      <h2 style="font-size:20px;margin:0 0 8px">Запустить новую сессию?</h2>
      <p style="font-size:12px;line-height:1.5;color:rgba(255,255,255,.46);margin:0 0 17px">Для измеряемой сессии сначала зафиксируем запрос, состояние и время. Или можно просто открыть паттерн без опроса.</p>
      <button class="st-primary" type="button">Запустить сессию</button>
      <button class="st-secondary" type="button">Просто посмотреть</button>
      <button class="st-secondary st-extra-cancel" type="button" style="border:0;color:rgba(255,255,255,.4)">Отмена</button>
    </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector(".st-primary").onclick = () => {
      overlay.remove();
      C.preSurvey?.({ config: clone(t.config), source: sourceFor(t) });
    };
    overlay.querySelectorAll(".st-secondary")[0].onclick = () => {
      overlay.remove();
      C.recordEvent?.("session_choice", { choice: "browse", patternId: t.patternId }, false);
      directOpen(t);
    };
    overlay.querySelector(".st-extra-cancel").onclick = () => {
      C.recordEvent?.("session_choice", { choice: "cancel", patternId: t.patternId }, false);
      overlay.remove();
    };
  }

  library.addEventListener("pointerdown", e => {
    const tile = e.target.closest?.('.pattern-tile[data-extra-pattern="1"]');
    if (!tile || e.target.closest?.(".st34-info")) return;
    const t = resolve(tile);
    if (!t) return;
    starts.set(e.pointerId, { x: e.clientX, y: e.clientY, at: Date.now() });
  }, true);

  library.addEventListener("pointerup", e => {
    const tile = e.target.closest?.('.pattern-tile[data-extra-pattern="1"]');
    if (!tile || e.target.closest?.(".st34-info")) return;
    const t = resolve(tile);
    if (!t) return;

    const start = starts.get(e.pointerId);
    starts.delete(e.pointerId);
    if (start && (Date.now() - start.at > 560 || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 20)) return;

    // Critical: stop the legacy v34 library interceptor before it substitutes DEFAULT_CONFIG.
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const active = window.SetkaStandaloneV34?.getActiveSession?.();
    if (active && ["measured", "after_feedback"].includes(active.phase)) directOpen(t);
    else showChoice(t);
  }, true);

  window.__SETKA_EXTRA_PATTERN_OPEN_GUARD_V34__ = true;
})();