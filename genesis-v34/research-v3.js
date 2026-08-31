(() => {
  "use strict";

  const API_URL = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-research-api";
  const API_KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const DEVICE_KEY = "setka-research:device-id:v1";
  const ACCESS_KEY = "setka-research:access-code:v1";
  const APP_VERSION = "setka-web-research-v3";
  const INTENTS = [
    ["sleep", "Уснуть"],
    ["relax", "Расслабиться"],
    ["tension", "Снизить напряжение"],
    ["focus", "Сконцентрироваться"],
    ["energy", "Взбодриться"],
    ["switch", "Переключиться"],
    ["explore", "Просто исследую"]
  ];
  const FACES = [[1,"😣"],[2,"😕"],[3,"😐"],[4,"🙂"],[5,"😄"]];

  const app = document.getElementById("app");
  const SetkaApp = window.SetkaApp;
  if (!app || !SetkaApp) return;

  const style = document.createElement("style");
  style.textContent = `
    #setkaResearchLayer{position:fixed;inset:0;z-index:99999;background:#000;color:#fff;display:grid;place-items:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;overflow:auto}
    #setkaResearchLayer.hidden{display:none}.research-box{width:min(100%,390px);padding:18px 0 28px;text-align:center}.research-mark{width:58px;height:58px;border:1px solid rgba(255,255,255,.75);border-radius:50%;margin:0 auto 26px;display:grid;place-items:center;font-size:11px;letter-spacing:.12em}.research-title{font-size:20px;font-weight:560;margin-bottom:9px}.research-copy{font-size:13px;line-height:1.5;color:rgba(255,255,255,.48);margin:0 auto 22px;max-width:330px}.research-input{width:100%;height:54px;border:1px solid rgba(255,255,255,.42);border-radius:27px;background:#050505;color:#fff;text-align:center;font-size:16px;letter-spacing:.12em;text-transform:uppercase;outline:none}.research-input:focus{border-color:#fff}.research-primary{width:100%;min-height:50px;border-radius:25px;border:1px solid #fff;background:#fff;color:#000;font-size:14px;font-weight:650;margin-top:12px}.research-primary:disabled{opacity:.4}.research-error{min-height:35px;padding-top:11px;font-size:12px;color:rgba(255,255,255,.65)}.research-label{font-size:12px;color:rgba(255,255,255,.45);margin:20px 0 10px;text-align:left}.research-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.research-option{min-height:48px;border:1px solid rgba(255,255,255,.28);border-radius:20px;background:#050505;color:#fff;padding:8px 10px;font-size:13px}.research-option.selected{border-color:#fff;background:#fff;color:#000}.research-options.one-col{grid-template-columns:1fr}.face-row{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}.face-button{height:58px;border:1px solid rgba(255,255,255,.24);border-radius:18px;background:#050505;font-size:27px}.face-button.selected{border-color:#fff;background:rgba(255,255,255,.13);transform:scale(1.04)}.help-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.help-button{min-height:48px;border:1px solid rgba(255,255,255,.28);border-radius:18px;background:#050505;color:#fff;font-size:13px}.help-button.selected{background:#fff;color:#000;border-color:#fff}.research-step{font-size:10px;letter-spacing:.12em;color:rgba(255,255,255,.25);margin-bottom:18px}.research-success{font-size:46px;margin-bottom:14px}.research-secondary{width:100%;min-height:48px;border:1px solid rgba(255,255,255,.45);border-radius:24px;background:transparent;color:#fff;margin-top:10px}
    #finishSessionButton{position:absolute;z-index:120;left:22px;top:calc(env(safe-area-inset-top,0px) + 30px);width:52px;height:52px;border:1px solid rgba(255,255,255,.55);border-radius:50%;background:rgba(0,0,0,.42);color:#fff;font-size:18px;display:none;place-items:center;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}#finishSessionButton.show{display:grid}.session-intent-chip{position:absolute;z-index:110;left:50%;top:calc(env(safe-area-inset-top,0px) + 98px);transform:translateX(-50%);pointer-events:none;font-size:10px;letter-spacing:.08em;color:rgba(255,255,255,.28);white-space:nowrap}
  `;
  document.head.appendChild(style);

  const layer = document.createElement("div");
  layer.id = "setkaResearchLayer";
  document.body.appendChild(layer);

  const finishButton = document.createElement("button");
  finishButton.id = "finishSessionButton";
  finishButton.type = "button";
  finishButton.setAttribute("aria-label", "Завершить сессию");
  finishButton.textContent = "✓";
  app.appendChild(finishButton);

  const intentChip = document.createElement("div");
  intentChip.className = "session-intent-chip";
  app.appendChild(intentChip);

  let deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, deviceId);
  }

  let ready = false;
  let participant = null;
  let profile = null;
  let sessionId = null;
  let sessionToken = null;
  let sessionStartPerf = 0;
  let requestKey = null;
  let preState = null;
  let eventQueue = [];
  let snapshotQueue = [];
  let flushing = false;
  let flushTimer = 0;
  let lastMoveRecord = -Infinity;
  let lastSnapshot = -Infinity;
  let activeMs = 0;
  let lastInteraction = performance.now();
  let activeTicker = 0;
  let currentUsage = null;
  let usageQueue = [];
  let ending = false;

  function headers() { return { "Content-Type": "application/json", "apikey": API_KEY }; }
  async function api(body, keepalive = false) {
    const response = await fetch(API_URL, { method: "POST", headers: headers(), body: JSON.stringify(body), keepalive });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const e = new Error(data.error || `http_${response.status}`); e.code = data.error || "request_failed"; e.data = data; throw e; }
    return data;
  }
  function nowMs() { return ready ? Math.max(0, Math.round(performance.now() - sessionStartPerf)) : 0; }
  function interaction() { lastInteraction = performance.now(); }

  function scheduleFlush(delay = 950) { clearTimeout(flushTimer); flushTimer = setTimeout(() => flush(false), delay); }
  async function flush(keepalive = false) {
    if (!ready || !sessionId || !sessionToken || flushing) return;
    if (!eventQueue.length && !snapshotQueue.length && !usageQueue.length) return;
    flushing = true;
    const events = eventQueue.splice(0, 500);
    const snapshots = snapshotQueue.splice(0, 100);
    const usage = usageQueue.splice(0, 100);
    try {
      if (events.length || snapshots.length) await api({ action: "batch", sessionId, sessionToken, events, snapshots }, keepalive);
      if (usage.length) await api({ action: "usage", sessionId, sessionToken, items: usage }, keepalive);
    } catch (_) {
      eventQueue.unshift(...events); snapshotQueue.unshift(...snapshots); usageQueue.unshift(...usage);
    } finally {
      flushing = false;
      if (eventQueue.length || snapshotQueue.length || usageQueue.length) scheduleFlush(300);
    }
  }
  function record(type, payload = {}) {
    if (!ready) return;
    eventQueue.push({ tMs: nowMs(), type, payload });
    if (eventQueue.length >= 40) flush(false); else scheduleFlush();
  }
  function recordState(force = false, extra = {}) {
    if (!ready) return;
    const t = nowMs();
    const state = { ...SetkaApp.getState(), requestKey, preState, ...extra };
    eventQueue.push({ tMs: t, type: "app_state", payload: state });
    if (force || t - lastSnapshot >= 10000) { snapshotQueue.push({ tMs: t, state }); lastSnapshot = t; }
    if (eventQueue.length >= 40) flush(false); else scheduleFlush();
  }

  function startUsage(state = SetkaApp.getState()) {
    if (!ready || state.view !== "game") return;
    closeUsage();
    currentUsage = {
      patternId: state.patternId || "tentacle-orbit",
      communityConfigId: state.communityId || state.favoriteCommunityId || null,
      configHash: state.configKey || "",
      startedMs: nowMs(),
      endedMs: 0,
      durationMs: 0,
      saved: Boolean(state.favoriteId)
    };
  }
  function closeUsage() {
    if (!currentUsage) return;
    currentUsage.endedMs = nowMs();
    currentUsage.durationMs = Math.max(0, currentUsage.endedMs - currentUsage.startedMs);
    if (currentUsage.durationMs >= 250) usageQueue.push({ ...currentUsage });
    currentUsage = null;
    scheduleFlush(300);
  }
  function markUsageSaved(communityId = null) {
    if (!currentUsage) return;
    currentUsage.saved = true;
    if (communityId) currentUsage.communityConfigId = communityId;
  }

  function baseBox(title, copy, step = "") {
    layer.innerHTML = `<div class="research-box"><div class="research-mark">SETKA</div>${step ? `<div class="research-step">${step}</div>` : ""}<div class="research-title">${title}</div><div class="research-copy">${copy}</div><div id="researchBody"></div><div id="researchError" class="research-error"></div></div>`;
    return document.getElementById("researchBody");
  }
  function optionButtons(container, options, multi = false) {
    const wrap = document.createElement("div"); wrap.className = "research-options";
    let value = multi ? [] : null;
    options.forEach(([key, label]) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "research-option"; b.textContent = label;
      b.addEventListener("click", () => {
        if (multi) {
          const has = value.includes(key); value = has ? value.filter(x => x !== key) : [...value, key]; b.classList.toggle("selected", !has);
        } else {
          value = key; [...wrap.children].forEach(x => x.classList.remove("selected")); b.classList.add("selected");
        }
      });
      wrap.appendChild(b);
    });
    container.appendChild(wrap);
    return () => value;
  }
  function facePicker(container) {
    const wrap = document.createElement("div"); wrap.className = "face-row"; let value = null;
    FACES.forEach(([key, face]) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "face-button"; b.textContent = face; b.setAttribute("aria-label", `Состояние ${key} из 5`);
      b.addEventListener("click", () => { value = key; [...wrap.children].forEach(x => x.classList.remove("selected")); b.classList.add("selected"); });
      wrap.appendChild(b);
    });
    container.appendChild(wrap); return () => value;
  }
  function primaryButton(container, label, handler) {
    const b = document.createElement("button"); b.type = "button"; b.className = "research-primary"; b.textContent = label; b.addEventListener("click", handler); container.appendChild(b); return b;
  }

  async function showAccessGate() {
    const body = baseBox("Закрытый прототип", "Введите персональный ID. Первый браузер, который активирует ID, закрепляется за ним.");
    const input = document.createElement("input"); input.className = "research-input"; input.placeholder = "STK-XXXX-XXXX"; input.autocapitalize = "characters"; input.spellcheck = false; body.appendChild(input);
    const button = primaryButton(body, "Войти", async () => {
      const code = input.value.trim().toUpperCase(); if (!code) return;
      button.disabled = true; document.getElementById("researchError").textContent = "";
      try { await claim(code); }
      catch (e) { document.getElementById("researchError").textContent = e.code === "device_mismatch" ? "Этот ID уже закреплён за другим устройством." : e.code === "invalid_code" ? "ID не найден или отключён." : "Не удалось войти. Попробуйте ещё раз."; button.disabled = false; }
    });
    setTimeout(() => input.focus(), 80);
  }

  async function claim(code) {
    const data = await api({ action: "claim", code, deviceId, appVersion: APP_VERSION, userAgent: navigator.userAgent, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1 }, meta: { language: navigator.language || "", platform: navigator.platform || "" } });
    localStorage.setItem(ACCESS_KEY, code);
    participant = data.participant; profile = data.profile; sessionId = data.sessionId; sessionToken = data.sessionToken;
    if (!profile) await showProfileSurvey(); else await showPreSurvey();
  }

  async function showProfileSurvey() {
    const body = baseBox("Немного о тебе", "Три коротких вопроса — один раз. Они нужны только для сравнения поведения разных групп.", "ПРОФИЛЬ · 1 РАЗ");
    const l1 = document.createElement("div"); l1.className = "research-label"; l1.textContent = "Возраст"; body.appendChild(l1);
    const getAge = optionButtons(body, [["18-24","18–24"],["25-34","25–34"],["35-44","35–44"],["45-54","45–54"],["55+","55+"]]);
    const l2 = document.createElement("div"); l2.className = "research-label"; l2.textContent = "Подобные практики / медитации / визуальные приложения"; body.appendChild(l2);
    const getExp = optionButtons(body, [["new","Почти никогда"],["sometimes","Иногда"],["regular","Регулярно"]]);
    const l3 = document.createElement("div"); l3.className = "research-label"; l3.textContent = "Чувствительность к цвету, свету и движению"; body.appendChild(l3);
    const getSens = optionButtons(body, [["low","Низкая"],["medium","Средняя"],["high","Высокая"]]);
    const button = primaryButton(body, "Продолжить", async () => {
      const ageBand = getAge(), practiceExperience = getExp(), visualSensitivity = getSens();
      if (!ageBand || !practiceExperience || !visualSensitivity) { document.getElementById("researchError").textContent = "Выбери по одному варианту в каждом блоке."; return; }
      profile = { ageBand, practiceExperience, visualSensitivity };
      button.disabled = true; await showPreSurvey();
    });
  }

  async function showPreSurvey() {
    const body = baseBox("Что тебе нужно сейчас?", "Это можно выбирать заново в каждой сессии. SETKA будет учиться, какие паттерны лучше подходят под разные запросы.", "ПЕРЕД СЕССИЕЙ · 10 СЕКУНД");
    const getIntent = optionButtons(body, INTENTS);
    const label = document.createElement("div"); label.className = "research-label"; label.textContent = "Как ты себя чувствуешь сейчас?"; body.appendChild(label);
    const getFace = facePicker(body);
    const button = primaryButton(body, "Начать", async () => {
      requestKey = getIntent(); preState = getFace();
      if (!requestKey || !preState) { document.getElementById("researchError").textContent = "Выбери запрос и текущее состояние."; return; }
      button.disabled = true;
      try {
        await api({ action: "session-context", sessionId, sessionToken, requestKey, preState, profile: profile && !profile.created_at ? profile : undefined });
        beginSession();
      } catch (_) { document.getElementById("researchError").textContent = "Не удалось начать сессию. Попробуй ещё раз."; button.disabled = false; }
    });
  }

  function beginSession() {
    ready = true; sessionStartPerf = performance.now(); lastInteraction = performance.now(); lastSnapshot = -Infinity;
    layer.classList.add("hidden"); app.style.visibility = "visible"; finishButton.classList.add("show");
    const intent = INTENTS.find(x => x[0] === requestKey)?.[1] || ""; intentChip.textContent = intent ? `СЕЙЧАС · ${intent.toUpperCase()}` : "";
    record("session_start", { participantId: participant?.id || null, requestKey, preState, appVersion: APP_VERSION }); recordState(true);
    activeTicker = window.setInterval(() => {
      if (!document.hidden && performance.now() - lastInteraction <= 30000) activeMs += 1000;
      if (ready && nowMs() - lastSnapshot >= 10000) recordState(true);
    }, 1000);
    loadCommunityAndRecommendations();
    syncExistingFavorites();
  }

  async function loadCommunityAndRecommendations() {
    if (!ready) return;
    try {
      const [community, rec] = await Promise.all([
        api({ action: "community-list", sessionId, sessionToken }),
        api({ action: "recommendations", sessionId, sessionToken, requestKey })
      ]);
      SetkaApp.setCommunity(community.items || []);
      SetkaApp.setRecommendations({ community: rec.recommendedCommunity || [], patterns: rec.recommendedPatterns || [] });
    } catch (_) {}
  }

  async function syncExistingFavorites() {
    const list = SetkaApp.getFavorites().slice(0, 30);
    for (const fav of list) {
      if (fav.communityId) continue;
      try {
        const data = await api({ action: "community-save", sessionId, sessionToken, patternId: fav.baseId || "tentacle-orbit", patternVersion: fav.patternVersion || 1, config: fav.config, previewFrame: fav.previewFrame, parentConfigId: fav.parentCommunityId || null });
        SetkaApp.updateFavoriteMeta(fav.id, { communityId: data.communityId });
      } catch (_) {}
    }
    loadCommunityAndRecommendations();
  }

  async function handleFavoriteSaved(fav, origin) {
    interaction(); markUsageSaved(fav.communityId || null); record("favorite_save", { origin, favoriteId: fav.id, parentCommunityId: fav.parentCommunityId || null }); recordState(true);
    try {
      const data = await api({ action: "community-save", sessionId, sessionToken, patternId: fav.baseId || "tentacle-orbit", patternVersion: fav.patternVersion || 1, config: fav.config, previewFrame: fav.previewFrame, parentConfigId: fav.parentCommunityId || null });
      SetkaApp.updateFavoriteMeta(fav.id, { communityId: data.communityId }); markUsageSaved(data.communityId); record("community_save", { communityId: data.communityId, saveCount: data.saveCount }); loadCommunityAndRecommendations();
    } catch (_) {}
  }

  async function handleFavoriteRemoved(fav, origin) {
    interaction(); record("favorite_remove", { origin, favoriteId: fav.id, communityId: fav.communityId || null }); recordState(true);
    try { await api({ action: "community-unsave", sessionId, sessionToken, communityId: fav.communityId || null, patternId: fav.baseId || "tentacle-orbit", patternVersion: fav.patternVersion || 1, config: fav.config }); loadCommunityAndRecommendations(); } catch (_) {}
  }

  function listen(name, handler) { window.addEventListener(`setka:${name}`, e => { if (!ready) return; handler(e.detail || {}); }); }
  listen("pattern-open", d => { interaction(); startUsage(d.state); record("pattern_open", { sourceType: d.sourceType, sourceId: d.sourceId, communityId: d.communityId || null }); recordState(true); });
  listen("view", d => { interaction(); if (d.view === "library") closeUsage(); else if (!currentUsage) startUsage(d.state); record("view_change", { view: d.view }); recordState(true); });
  listen("library-page", d => { interaction(); record("library_page", { page: d.page }); recordState(true); });
  listen("gesture-start", d => { interaction(); record("gesture_start", { fingers: d.fingers, x: d.x, y: d.y }); recordState(true, { gesture: { active:true, fingers:d.fingers, x:d.x, y:d.y } }); });
  listen("gesture-move", d => { interaction(); const t = performance.now(); if (t - lastMoveRecord < 95) return; lastMoveRecord = t; recordState(false, { gesture: { active:true, fingers:d.fingers, x:d.x, y:d.y, dx:d.dx, dy:d.dy } }); });
  listen("gesture-end", d => { interaction(); record("gesture_end", { fingers: d.fingers }); recordState(true, { gesture: { active:false } }); });
  listen("color", d => { interaction(); record("color_change", { from:d.from, to:d.to }); recordState(true); });
  listen("instructions-open", () => { interaction(); record("instructions_open"); recordState(true, { overlay:"instructions" }); });
  listen("instructions-close", () => { interaction(); record("instructions_close"); recordState(true, { overlay:null }); });
  listen("favorite-saved", d => handleFavoriteSaved(d.favorite, d.origin));
  listen("favorite-removed", d => handleFavoriteRemoved(d.favorite, d.origin));

  finishButton.addEventListener("click", () => { if (ready && !ending) showPostSurvey(); });

  function showPostSurvey() {
    closeUsage(); ending = true; finishButton.classList.remove("show"); layer.classList.remove("hidden");
    const body = baseBox("Как сейчас?", "Последние два ответа — и сессия сохранится вместе с её визуальным replay.", "ПОСЛЕ СЕССИИ · 10 СЕКУНД");
    const label1 = document.createElement("div"); label1.className = "research-label"; label1.textContent = "Текущее состояние"; body.appendChild(label1);
    const getFace = facePicker(body);
    const label2 = document.createElement("div"); label2.className = "research-label"; label2.textContent = "Сессия помогла с твоим запросом?"; body.appendChild(label2);
    const helpWrap = document.createElement("div"); helpWrap.className = "help-row"; body.appendChild(helpWrap); let helped = null;
    [[0,"Нет"],[1,"Немного"],[2,"Да"]].forEach(([v,l]) => { const b=document.createElement("button");b.type="button";b.className="help-button";b.textContent=l;b.addEventListener("click",()=>{helped=v;[...helpWrap.children].forEach(x=>x.classList.remove("selected"));b.classList.add("selected")});helpWrap.appendChild(b); });
    const button = primaryButton(body, "Завершить сессию", async () => {
      const postState = getFace(); if (!postState || helped === null) { document.getElementById("researchError").textContent = "Выбери состояние и оценку эффекта."; return; }
      button.disabled = true; record("session_feedback", { preState, postState, helped, requestKey }); recordState(true, { postState, helped });
      try { await flush(false); await api({ action:"finish-session", sessionId, sessionToken, postState, helped, activeMs }); ready=false; if(activeTicker)clearInterval(activeTicker); showFinished(postState, helped); }
      catch (_) { document.getElementById("researchError").textContent = "Не удалось сохранить. Попробуй ещё раз."; button.disabled=false; }
    });
  }

  function showFinished(postState, helped) {
    const body = baseBox("Сессия записана", "Replay, запрос и изменение состояния уже доступны в исследовательской админке.");
    const icon = document.createElement("div"); icon.className = "research-success"; icon.textContent = FACES.find(x => x[0] === postState)?.[1] || "✓"; body.appendChild(icon);
    const delta = Number(postState) - Number(preState); const result = document.createElement("div"); result.className = "research-copy"; result.textContent = `Изменение состояния: ${delta > 0 ? "+" : ""}${delta}. Эффект: ${helped === 2 ? "да" : helped === 1 ? "немного" : "нет"}.`; body.appendChild(result);
    const again = document.createElement("button"); again.type="button"; again.className="research-primary"; again.textContent="Начать новую сессию"; again.addEventListener("click",()=>location.reload()); body.appendChild(again);
    const close = document.createElement("button"); close.type="button"; close.className="research-secondary"; close.textContent="Оставить экран завершения"; body.appendChild(close);
  }

  window.addEventListener("resize", () => { if (ready) { interaction(); record("viewport_change", { width:innerWidth, height:innerHeight, dpr:devicePixelRatio||1 }); recordState(true); } });
  document.addEventListener("visibilitychange", () => { if (!ready) return; record(document.hidden ? "app_hidden" : "app_visible"); if (document.hidden) flush(true); else interaction(); });
  window.addEventListener("pagehide", () => { if (!ready) return; closeUsage(); record("session_end", { completed:false }); recordState(true); flush(true); api({ action:"end", sessionId, sessionToken }, true).catch(()=>{}); });
  setInterval(() => { if (ready) flush(false); }, 5000);

  const storedCode = localStorage.getItem(ACCESS_KEY);
  if (storedCode) {
    baseBox("Подключаем сессию", "Проверяем этот браузер и персональный ID…");
    claim(storedCode).catch(() => { localStorage.removeItem(ACCESS_KEY); showAccessGate(); });
  } else showAccessGate();
})();