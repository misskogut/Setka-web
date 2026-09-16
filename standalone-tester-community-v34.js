(() => {
  "use strict";

  const C = window.SetkaStandaloneV34;
  const Setka = window.SetkaApp;
  if (!C || !Setka) return;

  const KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const ID_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-tester-identity-v37";
  const NOTE_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-public-notes-v37";
  const ARCHIVE_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-tester-archive-v37";
  const TOKEN_KEY = "setka-v37:public-profile-token";
  const TESTER_KEY = "setka-v37:tester-status";

  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
  const esc = v => String(v ?? "").replace(/[&<>\"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));

  let tester = null;
  let pub = new Map();
  let pubLoaded = false;
  let publicationBusy = false;
  let archiveBusy = false;
  let archiveTimer = 0;
  let archiveSignature = "";

  const style = document.createElement("style");
  style.textContent = `
    .st37-section{margin:18px 0 4px}.st37-section-title{font-size:10px;letter-spacing:.12em;color:rgba(255,255,255,.38);margin:0 0 8px}
    .st37-id-card{border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:15px;background:#090909;margin:8px 0}.st37-id-value{font-size:18px;font-weight:650;letter-spacing:.04em;margin-bottom:5px}.st37-id-copy,.st37-privacy{font-size:11px;line-height:1.5;color:rgba(255,255,255,.48)}
    .st37-note-action{width:100%;height:42px;border:1px solid rgba(255,255,255,.2);border-radius:21px;background:transparent;color:#fff;font-size:11px;margin-top:10px}.st37-note-action.published{color:rgba(255,255,255,.55);border-color:rgba(255,255,255,.12)}
    .st37-note-origin{font-size:10px;color:rgba(255,255,255,.35);margin-top:10px;text-align:center}
    .st37-community-meta{font-size:10px;color:rgba(255,255,255,.38);margin:7px 0 12px}.st37-community-preview{display:block;width:100%;aspect-ratio:1.42/1;background:#000;border-radius:18px}.st37-community-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.st37-community-actions button{height:42px;border-radius:21px;font-size:11px}.st37-open{border:1px solid rgba(255,255,255,.22);background:transparent;color:#fff}.st37-save{border:0;background:#fff;color:#000;font-weight:650}.st37-save.saved{background:#151515;color:rgba(255,255,255,.45);border:1px solid rgba(255,255,255,.12)}
  `;
  document.head.appendChild(style);

  function did() {
    return C.sandbox?.deviceId || null;
  }

  function token() {
    try {
      let t = localStorage.getItem(TOKEN_KEY);
      if (!t) {
        const a = new Uint8Array(32);
        crypto.getRandomValues(a);
        t = [...a].map(x => x.toString(16).padStart(2, "0")).join("");
        localStorage.setItem(TOKEN_KEY, t);
      }
      return t;
    } catch (_) {
      return window.__setkaPublicToken || (window.__setkaPublicToken = `${Date.now()}${Math.random()}${Math.random()}`);
    }
  }

  async function post(url, payload) {
    const r = await fetch(url, {
      method: "POST",
      headers: {"Content-Type":"application/json", apikey: KEY},
      body: JSON.stringify(payload)
    });
    let out = {};
    try { out = await r.json(); } catch (_) {}
    if (!r.ok) {
      const e = new Error(out.error || `http_${r.status}`);
      e.status = r.status;
      e.payload = out;
      throw e;
    }
    return out;
  }

  async function noteApi(action, extra = {}) {
    if (!did()) throw new Error("device_not_ready");
    return post(NOTE_API, {action, deviceId: did(), profileToken: token(), ...extra});
  }

  function cacheTester(v) {
    tester = v;
    try { localStorage.setItem(TESTER_KEY, JSON.stringify(v)); } catch (_) {}
  }

  function cachedTester() {
    if (tester) return tester;
    try { tester = JSON.parse(localStorage.getItem(TESTER_KEY) || "null"); } catch (_) {}
    return tester;
  }

  async function refreshTester() {
    if (!did()) return cachedTester();
    try {
      const out = await post(ID_API, {action:"status", deviceId:did()});
      cacheTester({claimed:!!out.claimed, testerId:out.testerId || null, claimedAt:out.claimedAt || null});
    } catch (_) {
      cachedTester();
    }
    return tester;
  }

  function exactPrivateArchive() {
    const d = clone(C.getData?.() || {});
    return {
      version: d.version || 34,
      createdAt: d.createdAt || null,
      sessions: Array.isArray(d.sessions) ? d.sessions : [],
      notes: Array.isArray(d.notes) ? d.notes : [],
      symptoms: Array.isArray(d.symptoms) ? d.symptoms : [],
      checkins: Array.isArray(d.checkins) ? d.checkins : [],
      physio: d.physio || {samples:[], sources:[]},
      invites: Array.isArray(d.invites) ? d.invites : [],
      localCommunity: Array.isArray(d.localCommunity) ? d.localCommunity : [],
      settings: d.settings || {}
    };
  }

  function currentFavorites() {
    try { return clone(Setka.getFavorites?.() || []); } catch (_) { return []; }
  }

  function privateArchiveSignature() {
    const d = C.getData?.() || {};
    const sessions = d.sessions || [], notes = d.notes || [], symptoms = d.symptoms || [], checkins = d.checkins || [];
    const phys = d.physio?.samples || [], favorites = Setka.getFavorites?.() || [];
    const s = sessions.at?.(-1) || {}, n = notes.at?.(-1) || {}, p = phys.at?.(-1) || {};
    return [
      sessions.length, s.id || "", s.phase || "", s.measuredActiveMs || 0, s.afterFeedbackActiveMs || 0, (s.usage || []).length,
      notes.length, n.id || "", n.visualSnapshot?.capturedAt || "", n.publicPublished ? 1 : 0, n.publicNoteId || "",
      symptoms.length, checkins.length, phys.length, p.id || "", favorites.length, favorites.map(x => x.id).join(",")
    ].join("|");
  }

  async function syncPrivateArchive(force = false) {
    if (!cachedTester()?.claimed || !did()) return false;
    if (archiveBusy) return false;
    const sig = privateArchiveSignature();
    if (!force && sig === archiveSignature) return true;
    archiveBusy = true;
    try {
      const out = await post(ARCHIVE_API, {
        action: "sync",
        deviceId: did(),
        capturedAt: new Date().toISOString(),
        archive: exactPrivateArchive(),
        favorites: currentFavorites()
      });
      archiveSignature = sig;
      window.dispatchEvent(new CustomEvent("setka:v37-private-archive", {detail:{ok:true, testerId:out.testerId, updatedAt:out.updatedAt, counts:out.counts || {}}}));
      return out;
    } catch (e) {
      console.warn("SETKA tester private archive sync failed", e);
      window.dispatchEvent(new CustomEvent("setka:v37-private-archive", {detail:{ok:false, error:String(e?.message || e)}}));
      return false;
    } finally {
      archiveBusy = false;
    }
  }

  function schedulePrivateArchive(ms = 1800) {
    clearTimeout(archiveTimer);
    archiveTimer = setTimeout(() => syncPrivateArchive(false), ms);
  }

  async function claim(code) {
    if (!did()) throw new Error("device_not_ready");
    await C.sandbox?.sync?.();
    const out = await post(ID_API, {
      action: "claim",
      deviceId: did(),
      testerCode: String(code || "").trim(),
      userAgent: navigator.userAgent,
      viewport: {width:innerWidth, height:innerHeight, dpr:devicePixelRatio || 1, screenWidth:screen?.width || null, screenHeight:screen?.height || null}
    });
    cacheTester({claimed:true, testerId:out.testerId, claimedAt:new Date().toISOString()});
    await C.sandbox?.sync?.();
    const privateArchive = await syncPrivateArchive(true);
    C.recordEvent?.("tester_identity_claimed", {testerId:out.testerId, privateArchiveSynced:!!privateArchive}, false);
    schedulePrivateArchive(600);
    return {...out, privateArchiveSynced:!!privateArchive};
  }

  async function refreshPub(force = false) {
    if (pubLoaded && !force) return pub;
    try {
      const out = await noteApi("my-status");
      pub = new Map((out.items || []).map(x => [String(x.sourceNoteKey), x]));
      pubLoaded = true;
    } catch (_) {}
    return pub;
  }

  function resolve(card) {
    if (card?.classList?.contains("st37-public-card")) return null;
    const text = card?.querySelector(".st34-note-text")?.textContent || "";
    const meta = card?.querySelector(".st34-note-meta")?.textContent || "";
    const notes = C.getData?.()?.notes || [];
    const same = notes.filter(n => String(n?.text ?? "") === text);
    if (same.length === 1) return same[0];
    return same.find(n => {
      try { return meta.startsWith(C.dt?.(n.observedAt) || ""); }
      catch (_) { return false; }
    }) || same.at(-1) || null;
  }

  function enhance(card) {
    if (!(card instanceof Element) || card.classList.contains("st37-public-card")) return;
    const note = resolve(card);
    if (!note?.id) return;

    if (note.sourceType === "public_note" || note.phase === "saved_from_community") {
      card.querySelector(".st37-note-action")?.remove();
      if (!card.querySelector(".st37-note-origin")) {
        const origin = document.createElement("div");
        origin.className = "st37-note-origin";
        origin.textContent = "СОХРАНЕНО ИЗ АНОНИМНОГО СООБЩЕСТВА · ПРИВАТНАЯ КОПИЯ";
        card.appendChild(origin);
      }
      return;
    }

    let button = card.querySelector(".st37-note-action");
    if (!button) {
      button = document.createElement("button");
      button.className = "st37-note-action";
      button.type = "button";
      card.appendChild(button);
    }
    const state = pub.get(String(note.id));
    const isPublic = !!note.publicPublished || !!state?.isPublic;
    button.classList.toggle("published", isPublic);
    button.textContent = isPublic ? "Опубликовано анонимно · убрать" : "Опубликовать анонимно";
    button.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      togglePublish(note, button);
    };
  }

  function scan(root = document) {
    const cards = root.matches?.(".st34-note-card") ? [root] : root.querySelectorAll?.(".st34-note-card") || [];
    for (const card of cards) enhance(card);
  }

  async function togglePublish(note, button) {
    if (publicationBusy) return;
    publicationBusy = true;
    button.disabled = true;
    try {
      await refreshPub();
      const current = pub.get(String(note.id)) || (note.publicPublished ? {id:note.publicNoteId || null, sourceNoteKey:note.id, isPublic:true} : null);
      if (current?.isPublic) {
        if (!confirm("Убрать эту заметку из анонимного сообщества? Личная заметка останется у тебя.")) return;
        await noteApi("unpublish", {sourceNoteKey:note.id});
        pub.set(String(note.id), {...current, isPublic:false});
        note.publicPublished = false;
        C.save?.();
        C.recordEvent?.("public_note_unpublish", {noteId:note.id}, false);
      } else {
        if (!confirm("Опубликовать эту заметку анонимно? В сообщество попадут только текст заметки и связанный паттерн. ID, сессия, симптомы, пульс и личная история не публикуются.")) return;
        await C.sandbox?.sync?.();
        const out = await noteApi("publish", {note:clone(note)});
        pub.set(String(note.id), {id:out.id, sourceNoteKey:note.id, isPublic:true});
        note.publicPublished = true;
        note.publicNoteId = out.id;
        C.save?.();
        C.recordEvent?.("public_note_publish", {noteId:note.id, publicNoteId:out.id, patternId:note.patternId || note.config?.patternId || null}, false);
      }
      schedulePrivateArchive(500);
    } catch (_) {
      alert("Не удалось изменить публикацию.");
    } finally {
      publicationBusy = false;
      button.disabled = false;
      scan();
    }
  }

  function drawPreview(canvas, note) {
    if (note.visualSnapshot?.dataUrl) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        const s = Math.min(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      };
      img.src = note.visualSnapshot.dataUrl;
      return;
    }
    try { Setka.renderPreview?.(canvas, clone(note.config), note.frame ?? 44, note.patternId); } catch (_) {}
  }

  function copyLocal(note) {
    const d = C.getData?.();
    if (!d?.notes || d.notes.some(x => x.publicNoteId === note.id && x.sourceType === "public_note")) return false;
    const now = new Date().toISOString(), pid = note.patternId || note.config?.patternId || null;
    const local = {
      id: `public-note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      text: note.text,
      observedAt: now,
      localOffsetMinutes: -new Date().getTimezoneOffset(),
      phase: "saved_from_community",
      sessionId: null,
      sessionElapsedMs: null,
      requestKey: null,
      patternId: pid,
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
        patternId: pid,
        patternVersion: note.patternVersion || 1,
        sourceType: "public_note",
        sourceId: note.id,
        communityId: null,
        config: clone(note.config || {}),
        configKey: note.configKey || null,
        frame: note.frame ?? null
      }
    };
    d.notes.push(local);
    C.save?.();
    C.recordEvent?.("public_note_saved_local", {publicNoteId:note.id, noteId:local.id, patternId:pid}, false);
    window.dispatchEvent(new CustomEvent("setka:v34-sync-request"));
    schedulePrivateArchive(400);
    return true;
  }

  async function savePublic(note, button) {
    button.disabled = true;
    try {
      await noteApi("save", {id:note.id});
      copyLocal(note);
      button.textContent = "Сохранено ✓";
      button.classList.add("saved");
    } catch (_) {
      button.disabled = false;
      alert("Не удалось сохранить заметку.");
    }
  }

  async function showFeed() {
    C.setNav?.("me");
    const body = C.screen("Заметки сообщества", "Только заметки, которые люди сами решили опубликовать. Авторские ID здесь не показываются.", "АНОНИМНОЕ СООБЩЕСТВО", C.showMe);
    const privacy = document.createElement("div");
    privacy.className = "st37-privacy";
    privacy.textContent = "Публичная заметка содержит только текст и связанный визуальный паттерн. Личная история автора остаётся закрытой.";
    body.appendChild(privacy);
    const loading = document.createElement("div");
    loading.className = "st-empty";
    loading.textContent = "Загружаю заметки…";
    body.appendChild(loading);
    try {
      const out = await noteApi("feed", {limit:100});
      loading.remove();
      const items = out.items || [];
      if (!items.length) {
        body.insertAdjacentHTML("beforeend", '<div class="st-empty">Пока никто не опубликовал заметку.</div>');
        return;
      }
      for (const note of items) {
        const card = document.createElement("article");
        card.className = "st34-note-card st37-public-card";
        card.innerHTML = `<div class="st34-note-text">${esc(note.text)}</div><div class="st37-community-meta">${esc(C.dt?.(note.createdAt) || "")}${note.saves ? ` · сохранили ${Number(note.saves)}` : ""}</div>`;
        if (note.config) {
          const canvas = document.createElement("canvas");
          canvas.className = "st37-community-preview";
          canvas.width = 720;
          canvas.height = 500;
          card.appendChild(canvas);
          requestAnimationFrame(() => drawPreview(canvas, note));
        }
        const actions = document.createElement("div");
        actions.className = "st37-community-actions";
        const open = document.createElement("button");
        open.className = "st37-open";
        open.textContent = "Открыть паттерн";
        open.onclick = () => {
          C.hideLayer?.();
          Setka.openConfig?.(clone(note.config || {}), {type:"public_note", id:note.id, patternId:note.patternId, baseId:note.patternId, noteId:note.id});
        };
        const save = document.createElement("button");
        save.className = "st37-save";
        const already = C.getData?.()?.notes?.some(x => x.publicNoteId === note.id && x.sourceType === "public_note");
        save.textContent = already ? "Сохранено ✓" : "Сохранить себе";
        if (already) save.classList.add("saved");
        else save.onclick = () => savePublic(note, save);
        actions.append(open, save);
        card.appendChild(actions);
        body.appendChild(card);
      }
    } catch (_) {
      loading.textContent = "Не удалось загрузить сообщество.";
    }
  }

  function showClaim() {
    C.setNav?.("me");
    const body = C.screen("ID тестировщика", "Введи выданный SETKA ID на этом устройстве. Уже накопленная здесь история сразу привяжется к тестовому профилю.", "ТЕСТИРОВАНИЕ", C.showMe);
    const privacy = document.createElement("div");
    privacy.className = "st37-privacy";
    privacy.textContent = "ID нужен только для связи этого браузера с исследовательскими данными. Он не показывается другим участникам и не появляется рядом с публичными заметками.";
    body.appendChild(privacy);
    const input = document.createElement("input");
    input.className = "st-input";
    input.autocapitalize = "characters";
    input.autocomplete = "off";
    input.placeholder = "SETKA-XXXX-XXXX-XXXX";
    body.appendChild(input);
    const button = document.createElement("button");
    button.className = "st-primary";
    button.textContent = "Подключить этот ID";
    button.onclick = async () => {
      if (!input.value.trim()) return;
      button.disabled = true;
      button.textContent = "Подключаю…";
      try {
        const out = await claim(input.value);
        const archiveText = out.privateArchiveSynced
          ? "Накопленная история этого браузера уже выгружена в приватное облачное хранилище. Новые данные будут синхронизироваться автоматически."
          : "ID подключён. Основные данные привязаны; точный приватный архив повторит синхронизацию автоматически при следующем соединении.";
        body.innerHTML = `<div class="st37-id-card"><div class="st37-id-value">${esc(out.testerId)}</div><div class="st37-id-copy">Готово. ${esc(archiveText)}</div></div>`;
      } catch (e) {
        button.disabled = false;
        button.textContent = "Подключить этот ID";
        alert(e?.status === 409 ? "Этот ID уже привязан к другому устройству." : "ID не найден или уже недействителен.");
      }
    };
    body.appendChild(button);
  }

  function injectMe() {
    const layer = document.getElementById("st34Layer");
    if (!layer || layer.classList.contains("hidden") || layer.querySelector(".st-title")?.textContent?.trim() !== "Я") return;
    const body = layer.querySelector("#stBody");
    if (!body || body.querySelector("#st37MeTools")) return;
    const wrap = document.createElement("div");
    wrap.id = "st37MeTools";
    wrap.className = "st37-section";
    wrap.innerHTML = '<div class="st37-section-title">ТЕСТИРОВАНИЕ И СООБЩЕСТВО</div>';
    const state = cachedTester();
    if (state?.claimed) {
      const card = document.createElement("div");
      card.className = "st37-id-card";
      card.innerHTML = `<div class="st37-id-value">${esc(state.testerId)}</div><div class="st37-id-copy">ID тестировщика подключён. Личные данные синхронизируются с облаком и остаются приватными.</div>`;
      wrap.appendChild(card);
    } else {
      const connect = document.createElement("button");
      connect.className = "st-action";
      connect.innerHTML = "<b>Подключить ID тестировщика</b><span>Привязать уже накопленную историю этого браузера</span>";
      connect.onclick = showClaim;
      wrap.appendChild(connect);
    }
    const community = document.createElement("button");
    community.className = "st-action";
    community.innerHTML = "<b>Анонимные заметки сообщества</b><span>Публичны только заметки, которые автор сам решил опубликовать</span>";
    community.onclick = showFeed;
    wrap.appendChild(community);
    body.appendChild(wrap);
  }

  const observer = new MutationObserver(records => {
    injectMe();
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === 1) scan(node);
      }
    }
  });
  observer.observe(document.documentElement, {childList:true, subtree:true});

  window.addEventListener("setka:v34-sync", e => { if (e.detail?.ok) schedulePrivateArchive(1200); });
  window.addEventListener("setka:standalone-event", () => schedulePrivateArchive(2400));
  window.addEventListener("setka:favorite-saved", () => schedulePrivateArchive(700));
  window.addEventListener("setka:favorite-removed", () => schedulePrivateArchive(700));
  document.addEventListener("visibilitychange", () => { if (document.hidden) syncPrivateArchive(false); });
  setInterval(() => syncPrivateArchive(false), 30000);

  refreshTester().then(state => {
    const old = document.getElementById("st37MeTools");
    if (old) { old.remove(); injectMe(); }
    if (state?.claimed) syncPrivateArchive(true);
  });
  refreshPub().then(() => scan());
  scan();
  injectMe();

  C.testerIdentity = {status:refreshTester, claim, syncPrivateArchive:() => syncPrivateArchive(true)};
  C.publicNotes = {feed:showFeed, refresh:() => refreshPub(true)};
  window.__SETKA_TESTER_COMMUNITY_V34__ = 4;
})();
