(() => {
  "use strict";

  const C = window.SetkaStandaloneV34;
  const Setka = window.SetkaApp;
  if (!C || !Setka) return;

  const API_KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const IDENTITY_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-tester-identity-v37";
  const PUBLIC_NOTES_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-public-notes-v37";
  const PROFILE_TOKEN_KEY = "setka-v37:public-profile-token";
  const TESTER_CACHE_KEY = "setka-v37:tester-status";
  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));

  let testerState = null;
  let publicationState = new Map();
  let publicationStateLoaded = false;
  let publicationBusy = false;

  const style = document.createElement("style");
  style.textContent = `
    .st37-section{margin:18px 0 4px}
    .st37-section-title{font-size:10px;letter-spacing:.12em;color:rgba(255,255,255,.38);margin:0 0 8px}
    .st37-id-card{border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:15px;background:#090909;margin:8px 0}
    .st37-id-value{font-size:18px;font-weight:650;letter-spacing:.04em;margin-bottom:5px}
    .st37-id-copy{font-size:11px;line-height:1.5;color:rgba(255,255,255,.48)}
    .st37-note-action{width:100%;height:42px;border:1px solid rgba(255,255,255,.2);border-radius:21px;background:transparent;color:#fff;font-size:11px;margin-top:10px}
    .st37-note-action.published{border-color:rgba(255,255,255,.12);color:rgba(255,255,255,.52)}
    .st37-community-meta{font-size:10px;color:rgba(255,255,255,.38);margin:7px 0 12px}
    .st37-community-preview{display:block;width:100%;aspect-ratio:1.42/1;background:#000;border-radius:18px}
    .st37-community-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
    .st37-community-actions button{height:42px;border-radius:21px;font-size:11px}
    .st37-community-open{border:1px solid rgba(255,255,255,.22);background:transparent;color:#fff}
    .st37-community-save{border:0;background:#fff;color:#000;font-weight:650}
    .st37-community-save.saved{background:#151515;color:rgba(255,255,255,.45);border:1px solid rgba(255,255,255,.12)}
    .st37-privacy-note{font-size:11px;line-height:1.5;color:rgba(255,255,255,.45);margin:8px 0 16px}
  `;
  document.head.appendChild(style);

  function deviceId() {
    return C.sandbox?.deviceId || null;
  }

  function viewport() {
    return { width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1, screenWidth: screen?.width || null, screenHeight: screen?.height || null };
  }

  function randomToken() {
    try {
      const a = new Uint8Array(32);
      crypto.getRandomValues(a);
      return [...a].map(x => x.toString(16).padStart(2, "0")).join("");
    } catch (_) {
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    }
  }

  function profileToken() {
    try {
      let t = localStorage.getItem(PROFILE_TOKEN_KEY);
      if (!t) {
        t = randomToken();
        localStorage.setItem(PROFILE_TOKEN_KEY, t);
      }
      return t;
    } catch (_) {
      if (!window.__SETKA_V37_PROFILE_TOKEN__) window.__SETKA_V37_PROFILE_TOKEN__ = randomToken();
      return window.__SETKA_V37_PROFILE_TOKEN__;
    }
  }

  async function post(url, payload) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": API_KEY },
      body: JSON.stringify(payload)
    });
    let out = {};
    try { out = await r.json(); } catch (_) {}
    if (!r.ok) {
      const err = new Error(out?.error || `http_${r.status}`);
      err.status = r.status;
      err.payload = out;
      throw err;
    }
    return out;
  }

  function saveTesterCache(v) {
    testerState = v;
    try { localStorage.setItem(TESTER_CACHE_KEY, JSON.stringify(v)); } catch (_) {}
  }

  function loadTesterCache() {
    if (testerState) return testerState;
    try { testerState = JSON.parse(localStorage.getItem(TESTER_CACHE_KEY) || "null"); } catch (_) {}
    return testerState;
  }

  async function refreshTesterStatus() {
    const did = deviceId();
    if (!did) return loadTesterCache();
    try {
      const out = await post(IDENTITY_API, { action: "status", deviceId: did });
      saveTesterCache({ claimed: !!out.claimed, testerId: out.testerId || null, claimedAt: out.claimedAt || null });
    } catch (_) {
      loadTesterCache();
    }
    return testerState;
  }

  async function claimTesterId(code) {
    const did = deviceId();
    if (!did) throw new Error("device_not_ready");
    await C.sandbox?.sync?.();
    const out = await post(IDENTITY_API, {
      action: "claim",
      deviceId: did,
      testerCode: String(code || "").trim(),
      userAgent: navigator.userAgent,
      viewport: viewport()
    });
    saveTesterCache({ claimed: true, testerId: out.testerId, claimedAt: new Date().toISOString() });
    await C.sandbox?.sync?.();
    C.recordEvent?.("tester_identity_claimed", { testerId: out.testerId }, false);
    return out;
  }

  async function publicApi(action, extra = {}) {
    const did = deviceId();
    if (!did) throw new Error("device_not_ready");
    return post(PUBLIC_NOTES_API, { action, deviceId: did, profileToken: profileToken(), ...extra });
  }

  async function refreshPublicationState(force = false) {
    if (publicationStateLoaded && !force) return publicationState;
    try {
      const out = await publicApi("my-status");
      publicationState = new Map((out.items || []).map(x => [String(x.sourceNoteKey), x]));
      publicationStateLoaded = true;
    } catch (_) {}
    return publicationState;
  }

  function resolveNote(card) {
    const text = card.querySelector(".st34-note-text")?.textContent || "";
    const meta = card.querySelector(".st34-note-meta")?.textContent || "";
    const notes = Array.isArray(C.getData?.()?.notes) ? C.getData().notes : [];
    const same = notes.filter(n => String(n?.text ?? "") === text);
    if (same.length === 1) return same[0];
    return same.find(n => {
      try { return meta.startsWith(C.dt?.(n.observedAt) || ""); }
      catch (_) { return false; }
    }) || same.at(-1) || null;
  }

  async function togglePublish(note, button) {
    if (!note?.id || publicationBusy) return;
    publicationBusy = true;
    button.disabled = true;
    try {
      await refreshPublicationState();
      const current = publicationState.get(String(note.id));
      if (current?.isPublic) {
        if (!confirm("Убрать эту заметку из анонимного сообщества? Личная заметка останется у тебя.")) return;
        await publicApi("unpublish", { sourceNoteKey: note.id });
        publicationState.set(String(note.id), { ...current, isPublic: false });
        C.recordEvent?.("public_note_unpublish", { noteId: note.id }, false);
      } else {
        const ok = confirm("Опубликовать эту заметку анонимно? В сообщество попадут только текст заметки и связанный с ней паттерн. Твой ID, сессия, симптомы, пульс и другая личная история не публикуются.");
        if (!ok) return;
        await C.sandbox?.sync?.();
        const out = await publicApi("publish", { note: clone(note) });
        publicationState.set(String(note.id), { id: out.id, sourceNoteKey: note.id, isPublic: true });
        C.recordEvent?.("public_note_publish", { noteId: note.id, publicNoteId: out.id, patternId: note.patternId || note.config?.patternId || null }, false);
      }
      enhanceNoteCard(cardForNote(note), true);
    } catch (e) {
      alert(e?.message === "profile_auth_failed" ? "Не удалось открыть анонимный профиль этого браузера." : "Не удалось изменить публикацию. Попробуй ещё раз.");
    } finally {
      publicationBusy = false;
      button.disabled = false;
      scanNotes();
    }
  }

  function cardForNote(note) {
    const cards = [...document.querySelectorAll(".st34-note-card")];
    return cards.find(c => resolveNote(c)?.id === note?.id) || null;
  }

  function enhanceNoteCard(card, force = false) {
    if (!(card instanceof Element)) return;
    const note = resolveNote(card);
    if (!note?.id) return;
    let btn = card.querySelector(".st37-note-action");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "st37-note-action";
      card.appendChild(btn);
    }
    const pub = publicationState.get(String(note.id));
    const isPublic = !!pub?.isPublic;
    btn.classList.toggle("published", isPublic);
    btn.textContent = isPublic ? "Опубликовано анонимно · убрать" : "Опубликовать анонимно";
    btn.onclick = e => { e.preventDefault(); e.stopPropagation(); togglePublish(note, btn); };
    if (force) btn.dataset.stateRefresh = String(Date.now());
  }

  function scanNotes(root = document) {
    const cards = root.matches?.(".st34-note-card") ? [root] : root.querySelectorAll?.(".st34-note-card") || [];
    for (const card of cards) enhanceNoteCard(card);
  }

  function drawPublicPreview(canvas, note) {
    const snap = note?.visualSnapshot;
    if (snap?.dataUrl) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
        const s = Math.min(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      };
      img.src = snap.dataUrl;
      return;
    }
    try { Setka.renderPreview?.(canvas, clone(note.config), note.frame ?? 44, note.patternId); } catch (_) {}
  }

  function copyPublicNoteLocally(note) {
    const data = C.getData?.();
    if (!data?.notes) return false;
    if (data.notes.some(n => n.publicNoteId === note.id)) return false;
    const now = new Date().toISOString();
    const local = {
      id: `public-note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      text: note.text,
      observedAt: now,
      localOffsetMinutes: -new Date().getTimezoneOffset(),
      phase: "saved_from_community",
      sessionId: null,
      sessionElapsedMs: null,
      requestKey: null,
      patternId: note.patternId || note.config?.patternId || null,
      patternVersion: note.patternVersion || 1,
      sourceType: "public_note",
      sourceId: note.id,
      communityId: null,
      publicNoteId: note.id,
      originalPublishedAt: note.createdAt || null,
      configHash: note.configKey || null,
      config: clone(note.config || {}),
      frame: note.frame ?? null,
      visualSnapshot: clone(note.visualSnapshot || null),
      state: {
        view: "memory",
        patternId: note.patternId || note.config?.patternId || null,
        patternVersion: note.patternVersion || 1,
        sourceType: "public_note",
        sourceId: note.id,
        communityId: null,
        config: clone(note.config || {}),
        configKey: note.configKey || null,
        frame: note.frame ?? null
      }
    };
    data.notes.push(local);
    C.save?.();
    C.recordEvent?.("public_note_saved_local", { publicNoteId: note.id, noteId: local.id, patternId: local.patternId }, false);
    window.dispatchEvent(new CustomEvent("setka:v34-sync-request"));
    return true;
  }

  async function savePublicNote(note, btn) {
    btn.disabled = true;
    try {
      await publicApi("save", { id: note.id });
      copyPublicNoteLocally(note);
      btn.textContent = "Сохранено ✓";
      btn.classList.add("saved");
    } catch (_) {
      alert("Не удалось сохранить заметку.");
      btn.disabled = false;
    }
  }

  async function showPublicNotes() {
    C.setNav?.("me");
    const body = C.screen("Заметки сообщества", "Только те заметки, которые люди сами решили опубликовать. Авторские ID здесь не показываются.", "АНОНИМНОЕ СООБЩЕСТВО", C.showMe);
    const privacy = document.createElement("div");
    privacy.className = "st37-privacy-note";
    privacy.textContent = "Публичная заметка содержит только её текст и связанный визуальный паттерн. Личная история автора остаётся закрытой.";
    body.appendChild(privacy);
    const loading = document.createElement("div");loading.className = "st-empty";loading.textContent = "Загружаю заметки…";body.appendChild(loading);
    try {
      const out = await publicApi("feed", { limit: 100 });
      loading.remove();
      const items = out.items || [];
      if (!items.length) { body.insertAdjacentHTML("beforeend", '<div class="st-empty">Пока никто не опубликовал заметку.</div>'); return; }
      for (const n of items) {
        const card = document.createElement("article");card.className = "st34-note-card st37-public-card";
        const text = document.createElement("div");text.className = "st34-note-text";text.textContent = n.text;card.appendChild(text);
        const meta = document.createElement("div");meta.className = "st37-community-meta";meta.textContent = `${C.dt?.(n.createdAt) || ""}${n.saves ? ` · сохранили ${n.saves}` : ""}`;card.appendChild(meta);
        if (n.config) {
          const canvas = document.createElement("canvas");canvas.className = "st37-community-preview";canvas.width = 720;canvas.height = 500;card.appendChild(canvas);
          requestAnimationFrame(() => drawPublicPreview(canvas, n));
        }
        const actions = document.createElement("div");actions.className = "st37-community-actions";
        const open = document.createElement("button");open.className = "st37-community-open";open.textContent = "Открыть паттерн";open.onclick = () => { C.hideLayer?.(); Setka.openConfig?.(clone(n.config || {}), { type: "public_note", id: n.id, patternId: n.patternId, baseId: n.patternId, noteId: n.id }); };
        const save = document.createElement("button");save.className = "st37-community-save";
        const already = C.getData?.()?.notes?.some(x => x.publicNoteId === n.id);
        save.textContent = already ? "Сохранено ✓" : "Сохранить себе";
        if (already) save.classList.add("saved"); else save.onclick = () => savePublicNote(n, save);
        actions.append(open, save);card.appendChild(actions);body.appendChild(card);
      }
    } catch (_) {
      loading.textContent = "Не удалось загрузить сообщество.";
    }
  }

  function showTesterClaim() {
    C.setNav?.("me");
    const body = C.screen("ID тестировщика", "Введи выданный SETKA ID на этом устройстве. Уже накопленная здесь история сразу привяжется к твоему тестовому профилю.", "ТЕСТИРОВАНИЕ", C.showMe);
    const p = document.createElement("div");p.className = "st37-privacy-note";p.textContent = "ID нужен только для связи этого браузера с исследовательскими данными. Он не показывается другим участникам и не появляется рядом с публичными заметками.";body.appendChild(p);
    const input = document.createElement("input");input.className = "st-input";input.autocapitalize = "characters";input.autocomplete = "off";input.placeholder = "SETKA-XXXX-XXXX-XXXX";body.appendChild(input);
    const submit = document.createElement("button");submit.className = "st-primary";submit.textContent = "Подключить этот ID";
    submit.onclick = async () => {
      const code = input.value.trim();if (!code) return;
      submit.disabled = true;submit.textContent = "Подключаю…";
      try {
        const out = await claimTesterId(code);
        body.innerHTML = `<div class="st37-id-card"><div class="st37-id-value">${C.esc?.(out.testerId) || out.testerId}</div><div class="st37-id-copy">Готово. Этот браузер привязан к тестировщику. Накопленные здесь данные уже отправлены в облако, а новые будут синхронизироваться автоматически.</div></div>`;
      } catch (e) {
        submit.disabled = false;submit.textContent = "Подключить этот ID";
        if (e?.status === 409) alert("Этот ID уже привязан к другому устройству.");
        else alert("ID не найден или уже недействителен.");
      }
    };
    body.appendChild(submit);
  }

  function injectMeTools(root = document) {
    const layer = document.getElementById("st34Layer");
    if (!layer || layer.classList.contains("hidden")) return;
    const title = layer.querySelector(".st-title")?.textContent?.trim();
    if (title !== "Я") return;
    const body = layer.querySelector("#stBody");if (!body || body.querySelector("#st37MeTools")) return;
    const wrap = document.createElement("div");wrap.id = "st37MeTools";wrap.className = "st37-section";
    const head = document.createElement("div");head.className = "st37-section-title";head.textContent = "ТЕСТИРОВАНИЕ И СООБЩЕСТВО";wrap.appendChild(head);
    const st = loadTesterCache();
    if (st?.claimed) {
      const card = document.createElement("div");card.className = "st37-id-card";card.innerHTML = `<div class="st37-id-value">${C.esc?.(st.testerId) || st.testerId}</div><div class="st37-id-copy">ID тестировщика подключён. Личные данные синхронизируются с облаком и остаются приватными.</div>`;wrap.appendChild(card);
    } else {
      const idBtn = document.createElement("button");idBtn.className = "st-action";idBtn.innerHTML = "<b>Подключить ID тестировщика</b><span>Привязать уже накопленную историю этого браузера</span>";idBtn.onclick = showTesterClaim;wrap.appendChild(idBtn);
    }
    const community = document.createElement("button");community.className = "st-action";community.innerHTML = "<b>Анонимные заметки сообщества</b><span>Публичны только заметки, которые автор сам решил опубликовать</span>";community.onclick = showPublicNotes;wrap.appendChild(community);
    body.appendChild(wrap);
    refreshTesterStatus().then(() => {
      if (document.getElementById("st37MeTools") === wrap) { wrap.remove(); injectMeTools(); }
    });
  }

  const observer = new MutationObserver(records => {
    injectMeTools();
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) scanNotes(node);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  refreshPublicationState().then(() => scanNotes());
  refreshTesterStatus().then(() => injectMeTools());
  scanNotes();
  injectMeTools();

  C.testerIdentity = { status: refreshTesterStatus, claim: claimTesterId };
  C.publicNotes = { feed: showPublicNotes, refresh: () => refreshPublicationState(true) };
  window.__SETKA_TESTER_COMMUNITY_V34__ = true;
})();