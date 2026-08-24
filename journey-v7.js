(() => {
  "use strict";

  const OLD_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-research-api";
  const V5_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-research-v5";
  const JOURNEY_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-journey";
  const API_KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const BUFFER_KEY = "setka-research:journey-buffer:v1";
  const START_KEY = "setka-research:journey-start:v1";

  const originalFetch = window.fetch.bind(window);
  let auth = null;
  let flushTimer = 0;
  let flushing = false;
  let lastScreen = "";
  let lastGestureSample = 0;
  let pageStart = Number(sessionStorage.getItem(START_KEY));
  if (!Number.isFinite(pageStart) || pageStart <= 0) {
    pageStart = Date.now();
    sessionStorage.setItem(START_KEY, String(pageStart));
  }

  function readBuffer() {
    try {
      const v = JSON.parse(localStorage.getItem(BUFFER_KEY) || "[]");
      return Array.isArray(v) ? v.slice(-700) : [];
    } catch (_) { return []; }
  }
  let buffer = readBuffer();

  function persistBuffer() {
    try { localStorage.setItem(BUFFER_KEY, JSON.stringify(buffer.slice(-700))); } catch (_) {}
  }

  function state() {
    try { return window.SetkaApp?.getState?.() || null; } catch (_) { return null; }
  }

  function compactState(s) {
    if (!s) return null;
    return {
      view: s.view || null,
      libraryPage: s.libraryPage || null,
      patternId: s.patternId || null,
      patternVersion: s.patternVersion || 1,
      sourceType: s.sourceType || null,
      sourceId: s.sourceId || null,
      communityId: s.communityId || null,
      config: s.config || null,
      configKey: s.configKey || null,
      frame: Number.isFinite(Number(s.frame)) ? Number(s.frame) : null,
      favoriteId: s.favoriteId || null
    };
  }

  function track(type, payload = {}) {
    const item = { type: type.startsWith("journey_") ? type : `journey_${type}`, wallAt: Date.now(), payload };
    buffer.push(item);
    if (buffer.length > 700) buffer.splice(0, buffer.length - 700);
    persistBuffer();
    if (auth) scheduleFlush();
  }

  function scheduleFlush(delay = 350) {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => flush(false), delay);
  }

  async function flush(keepalive = false) {
    if (!auth || flushing || !buffer.length) return;
    flushing = true;
    const batch = buffer.splice(0, 260);
    persistBuffer();
    const base = batch.length ? Math.min(pageStart, ...batch.map(x => Number(x.wallAt) || pageStart)) : pageStart;
    const items = batch.map(x => ({
      type: x.type,
      tMs: Math.max(0, (Number(x.wallAt) || Date.now()) - base),
      payload: { ...x.payload, preAuth: (Number(x.wallAt) || 0) < (auth.claimedAt || 0) }
    }));
    try {
      const r = await originalFetch(JOURNEY_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": API_KEY },
        body: JSON.stringify({ action: "visit-events", sessionId: auth.sessionId, sessionToken: auth.sessionToken, items }),
        keepalive
      });
      if (!r.ok) throw new Error("journey_flush_failed");
    } catch (_) {
      buffer.unshift(...batch);
      if (buffer.length > 700) buffer.length = 700;
      persistBuffer();
    } finally {
      flushing = false;
      if (buffer.length && auth) scheduleFlush(700);
    }
  }

  function captureAuth(data) {
    if (!data?.sessionId || !data?.sessionToken) return;
    auth = { sessionId: data.sessionId, sessionToken: data.sessionToken, participant: data.participant || null, claimedAt: Date.now() };
    window.SetkaJourneyAuth = auth;
    track("journey_auth", { participantId: data.participant?.id || null });
    flush(false);
  }

  window.fetch = async function(input, init) {
    let action = "";
    const url = typeof input === "string" ? input : input?.url;
    if (url === OLD_API && init?.body && typeof init.body === "string") {
      try { action = String(JSON.parse(init.body)?.action || ""); } catch (_) {}
    }
    const response = await originalFetch(input, init);
    if (url === OLD_API && action === "claim" && response.ok) {
      response.clone().json().then(captureAuth).catch(() => {});
    }
    return response;
  };

  function screen(screenName, extra = {}) {
    const sig = `${screenName}|${extra.page || ""}|${extra.title || ""}`;
    if (sig === lastScreen) return;
    lastScreen = sig;
    track("journey_screen", { screen: screenName, ...extra, state: compactState(state()) });
  }

  window.addEventListener("setka:view", e => {
    const s = e.detail?.state || state();
    if (e.detail?.view === "game") screen("gameplay", { state: compactState(s) });
    else screen("library", { page: s?.libraryPage || "all", state: compactState(s) });
  });
  window.addEventListener("setka:library-page", e => screen("library", { page: e.detail?.page || "all", state: compactState(e.detail?.state || state()) }));
  window.addEventListener("setka:pattern-open", e => track("journey_pattern_open", { sourceType: e.detail?.sourceType || null, sourceId: e.detail?.sourceId || null, communityId: e.detail?.communityId || null, state: compactState(e.detail?.state || state()) }));
  window.addEventListener("setka:gesture-start", e => track("journey_gesture_start", { fingers: e.detail?.fingers, x: e.detail?.x, y: e.detail?.y, state: compactState(e.detail?.state || state()) }));
  window.addEventListener("setka:gesture-move", e => {
    const now = Date.now();
    if (now - lastGestureSample < 220) return;
    lastGestureSample = now;
    track("journey_pattern_state", { reason: "gesture", state: compactState(e.detail?.state || state()) });
  });
  window.addEventListener("setka:gesture-end", e => track("journey_gesture_end", { fingers: e.detail?.fingers, state: compactState(e.detail?.state || state()) }));
  window.addEventListener("setka:color", e => track("journey_color", { from: e.detail?.from, to: e.detail?.to, state: compactState(e.detail?.state || state()) }));
  window.addEventListener("setka:favorite-saved", e => track("journey_favorite_save", { favoriteId: e.detail?.favorite?.id || null, state: compactState(state()) }));
  window.addEventListener("setka:favorite-removed", e => track("journey_favorite_remove", { favoriteId: e.detail?.favorite?.id || null, state: compactState(state()) }));
  window.addEventListener("setka:instructions-open", () => screen("instructions", { state: compactState(state()) }));
  window.addEventListener("setka:instructions-close", () => {
    const s = state();
    screen(s?.view === "game" ? "gameplay" : "library", { page: s?.libraryPage || null, state: compactState(s) });
  });

  function inspectResearchScreen() {
    const layer = document.getElementById("setkaResearchLayer");
    if (!layer || layer.classList.contains("hidden")) return;
    const title = layer.querySelector(".research-title")?.textContent?.trim() || "SETKA";
    const step = layer.querySelector(".research-step")?.textContent?.trim() || "";
    let key = "research";
    const low = `${title} ${step}`.toLowerCase();
    if (low.includes("сегодня")) key = "today";
    else if (low.includes("симптом")) key = "symptoms";
    else if (low.includes("замет")) key = "notes";
    else if (low.includes("инвайт") || low.includes("приглас")) key = "invites";
    else if (low.includes("перед сесс") || low.includes("нужно сейчас") || low.includes("вернуться к этой мысли")) key = "pre_session";
    else if (low.includes("оцен") || low.includes("время сессии прошло") || low.includes("сессия остановлена")) key = "post_session";
    else if (low.includes("сессия завершена") || low.includes("измерение сохранено")) key = "session_result";
    else if (low.includes("профиль") || low.includes("немного о тебе")) key = "profile";
    else if (low.includes("продолжить исследование")) key = "access";
    else if (low.includes("я")) key = "me";
    screen(key, { title, step });
  }

  const observer = new MutationObserver(inspectResearchScreen);
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class"] });

  document.addEventListener("click", e => {
    const b = e.target.closest?.("button");
    if (!b) return;
    if (b.id === "visibilityButton") track("journey_ui_action", { action: "toggle_controls" });
    if (b.id === "libraryButton") track("journey_ui_action", { action: "back_to_library" });
    if (b.id === "researchMenuButton") track("journey_ui_action", { action: "open_personal_area" });
    if (b.dataset?.page) track("journey_ui_action", { action: "nav", page: b.dataset.page });
  }, true);

  document.addEventListener("visibilitychange", () => track("journey_visibility", { hidden: document.hidden }));
  window.addEventListener("pagehide", () => { track("journey_exit", { state: compactState(state()) }); flush(true); });
  window.setInterval(() => { if (auth) flush(false); }, 4000);

  async function openStandaloneNote() {
    if (!auth) return false;
    const snapshot = compactState(state());
    if (!snapshot || snapshot.view !== "game") return false;
    const overlay = document.createElement("div");
    overlay.id = "standaloneNoteOverlay";
    overlay.style.cssText = "position:fixed;inset:0;z-index:100050;background:rgba(0,0,0,.92);display:grid;place-items:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',Arial,sans-serif;color:#fff";
    overlay.innerHTML = `<div style="width:min(100%,410px)"><div style="font-size:20px;font-weight:600;text-align:center;margin-bottom:8px">Записать мысль</div><div style="font-size:12px;color:rgba(255,255,255,.45);text-align:center;margin-bottom:16px">Снимок текущей конфигурации уже сохранён.</div><textarea id="standaloneNoteText" placeholder="Что пришло сейчас?" style="width:100%;min-height:150px;border:1px solid rgba(255,255,255,.32);border-radius:20px;background:#060606;color:#fff;padding:15px;font:inherit;font-size:15px;outline:none;resize:vertical"></textarea><button id="standaloneNoteSave" style="width:100%;height:50px;border:0;border-radius:25px;background:#fff;color:#000;font-weight:650;margin-top:11px">Сохранить</button><button id="standaloneNoteCancel" style="width:100%;height:48px;border:1px solid rgba(255,255,255,.32);border-radius:24px;background:transparent;color:#fff;margin-top:9px">Отмена</button><div id="standaloneNoteError" style="min-height:26px;text-align:center;font-size:11px;color:rgba(255,255,255,.55);padding-top:8px"></div></div>`;
    document.body.appendChild(overlay);
    const ta = overlay.querySelector("#standaloneNoteText");
    const cancel = () => overlay.remove();
    overlay.querySelector("#standaloneNoteCancel").onclick = cancel;
    overlay.querySelector("#standaloneNoteSave").onclick = async e => {
      const text = ta.value.trim();
      if (!text) { overlay.querySelector("#standaloneNoteError").textContent = "Напиши хотя бы одну строку."; return; }
      e.currentTarget.disabled = true;
      try {
        const r = await originalFetch(V5_API, { method: "POST", headers: { "Content-Type": "application/json", "apikey": API_KEY }, body: JSON.stringify({ action: "note-create", sessionId: auth.sessionId, sessionToken: auth.sessionToken, text, phase: "standalone", observedAt: new Date().toISOString(), localOffsetMinutes: -new Date().getTimezoneOffset(), sessionElapsedMs: Math.max(0, Date.now() - pageStart), requestKey: null, state: snapshot }) });
        if (!r.ok) throw new Error("save_failed");
        const d = await r.json().catch(() => ({}));
        track("journey_note_create", { noteId: d.item?.id || null, phase: "standalone", state: snapshot });
        cancel();
      } catch (_) {
        e.currentTarget.disabled = false;
        overlay.querySelector("#standaloneNoteError").textContent = "Не удалось сохранить.";
      }
    };
    setTimeout(() => ta.focus(), 40);
    return true;
  }

  window.SetkaJourney = { track, flush, getAuth: () => auth, openStandaloneNote };
  setTimeout(() => {
    const s = state();
    if (s?.view === "game") screen("gameplay", { state: compactState(s) });
    else screen("library", { page: s?.libraryPage || "all", state: compactState(s) });
    inspectResearchScreen();
  }, 80);
})();