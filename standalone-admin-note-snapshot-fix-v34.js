(() => {
  "use strict";

  const COMMUNITY_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-admin-community-v38";
  const API_KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const ADMIN_STORAGE = "setka-research:admin-key:v1";
  let notes = [];
  let previewApp = null;
  let communityCache = null;
  let communityLoading = null;
  const originalFetch = window.fetch.bind(window);
  const esc = v => String(v ?? "").replace(/[&<>\"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  const fmt = v => { try { return v ? new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(v)) : "—"; } catch (_) { return "—"; } };

  window.fetch = async function(input, init) {
    const response = await originalFetch(input, init);
    try {
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
      if (body?.action === "admin-notes") {
        response.clone().json().then(data => {
          notes = Array.isArray(data?.items) ? data.items : [];
          scheduleRepair();
        }).catch(() => {});
      }
    } catch (_) {}
    return response;
  };

  function makePreviewEngine() {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.cssText = "position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;border:0;opacity:0;pointer-events:none";
    frame.srcdoc = `<!doctype html><html><body style="margin:0;background:#000"><main id="app"><section id="libraryScreen" class="screen active"><button id="libraryPagerButton"></button><button id="communityPagerButton"></button><button id="favoritesPagerButton"></button><div id="libraryTitle"></div><div id="librarySwipeArea"></div><div id="allPatternsPanel"></div><div id="communityPanel"></div><div id="favoritesPanel"></div></section><section id="gameScreen" class="screen"><canvas id="patternCanvas" width="320" height="320"></canvas><button id="favoriteButton"></button><button id="libraryButton"></button><button id="prevButton"></button><button id="nextButton"></button><button id="colorButton"></button><div id="colorDots"></div><button id="instructionsButton"></button><div id="instructionsModal"><div class="instructions"></div></div><div id="toast"></div></section></main><script src="app-v7-multipattern.js?v=34-native-seven-patterns-stereo-dna-1"><\/script></body></html>`;
    frame.onload = () => {
      let tries = 0;
      const wait = () => {
        previewApp = frame.contentWindow?.SetkaApp || null;
        if (previewApp?.renderPreview) { scheduleRepair(); if (communityCache) renderCommunity(communityCache); }
        else if (tries++ < 60) setTimeout(wait, 50);
      };
      wait();
    };
    document.body.appendChild(frame);
  }

  function sizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round((rect.width || 320) * dpr)), height = Math.max(1, Math.round((rect.height || 220) * dpr));
    if (canvas.width !== width) canvas.width = width; if (canvas.height !== height) canvas.height = height;
  }

  function drawExactSnapshot(canvas, snapshot) {
    const src = snapshot?.dataUrl; if (!src) return false;
    const token = `${snapshot.capturedAt || ""}|${src.length}`;
    if (canvas.dataset.exactSnapshotToken === token) return true;
    const img = new Image();
    img.onload = () => {
      sizeCanvas(canvas);
      const ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
      ctx.fillStyle = "#000"; ctx.fillRect(0,0,w,h);
      const scale = Math.min(w / img.width, h / img.height), dw = img.width * scale, dh = img.height * scale;
      ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);
      canvas.dataset.exactSnapshotToken = token;
    };
    img.src = src; return true;
  }

  function renderCanvas(canvas, item) {
    if (!canvas || !item) return;
    sizeCanvas(canvas);
    const snapshot = item.visual_snapshot || item.visualSnapshot || null;
    const pid = snapshot?.patternId || item.pattern_id || item.patternId || item.config?.patternId || null;
    const exact = drawExactSnapshot(canvas, snapshot);
    if (!exact) {
      if (!item.config || !previewApp?.renderPreview) return;
      try { previewApp.renderPreview(canvas, item.config, item.preview_frame ?? item.previewFrame ?? item.frame ?? 44, pid); }
      catch (e) { console.warn("SETKA admin preview failed", e); }
    }
    canvas.dataset.snapshotPatternId = pid || "";
    canvas.dataset.snapshotKind = exact ? "exact" : "semantic";
    const caption = canvas.parentElement?.querySelector?.(".v4-preview-caption"), title = pid && previewApp?.getPatternTitle?.(pid);
    if (caption) caption.textContent = `${exact ? "ТОЧНЫЙ СЛЕПОК" : "КОНФИГУРАЦИЯ"} В МОМЕНТ ЗАМЕТКИ${title ? ` · ${String(title).toUpperCase()}` : ""}`;
  }

  function repairNotes() {
    if (!notes.length) return;
    document.querySelectorAll("canvas[data-note-preview]").forEach(canvas => {
      const index = Number(canvas.dataset.notePreview);
      if (Number.isInteger(index) && notes[index]) renderCanvas(canvas, notes[index]);
    });
  }

  function kpi(v,l){ return `<div class="card kpi"><div class="v">${esc(v)}</div><div class="l">${esc(l)}</div></div>`; }
  async function loadCommunity(force=false) {
    if (communityCache && !force) return communityCache;
    if (communityLoading) return communityLoading;
    communityLoading = (async()=>{
      const r = await originalFetch(COMMUNITY_API,{method:"POST",headers:{"Content-Type":"application/json",apikey:API_KEY},body:JSON.stringify({action:"feed",adminKey:localStorage.getItem(ADMIN_STORAGE)||""})});
      const d = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(d.error || "community_load_failed");
      communityCache = d; communityLoading = null; return d;
    })();
    try { return await communityLoading; } catch (e) { communityLoading = null; throw e; }
  }

  function renderCommunity(d) {
    const tab = document.getElementById("tab-community"); if (!tab || tab.classList.contains("hidden")) return;
    const patterns = d?.patterns || [], publicNotes = d?.notes || [];
    tab.innerHTML = `<div class="card"><div class="section-title">Сообщество · облачный канон</div><div class="small muted">Без локальных и демонстрационных карточек: паттерны считаются по реальным сохранениям, заметки появляются только после явной анонимной публикации.</div><div class="grid kpis" style="margin-top:12px">${kpi(patterns.length,"уникальных конфигураций")}${kpi(patterns.reduce((a,x)=>a+(Number(x.saveCount)||0),0),"реальных сохранений")}${kpi(publicNotes.length,"публичных заметок")}</div></div><div class="section-title" style="margin-top:18px">Сохранённые паттерны</div><div class="grid community-grid" id="v38PatternGrid"></div><div class="section-title" style="margin-top:18px">Анонимные публичные заметки</div><div class="grid community-grid" id="v38NoteGrid"></div>`;
    const pg = tab.querySelector("#v38PatternGrid"), ng = tab.querySelector("#v38NoteGrid");
    if (!patterns.length) pg.innerHTML = '<div class="card empty" style="grid-column:1/-1">Серверных сохранений пока нет.</div>';
    patterns.forEach(x=>{
      const w=document.createElement("div"); w.className="community-item"; w.innerHTML=`<canvas width="320" height="220"></canvas><span class="community-badge">♥ ${Number(x.saveCount)||0}</span><span class="community-note">${esc(previewApp?.getPatternTitle?.(x.patternId)||x.patternId||"Паттерн")} · ${esc(fmt(x.createdAt))}</span>`; pg.appendChild(w); renderCanvas(w.querySelector("canvas"),{config:x.config,patternId:x.patternId,previewFrame:x.previewFrame??44});
    });
    if (!publicNotes.length) ng.innerHTML = '<div class="card empty" style="grid-column:1/-1">Публичных заметок пока нет. Это реальное пустое состояние.</div>';
    publicNotes.forEach(x=>{
      const w=document.createElement("div"); w.className="community-item"; w.style.padding="10px"; w.innerHTML=`<canvas width="320" height="220"></canvas><div class="small" style="margin-top:9px;line-height:1.45">${esc(x.text)}</div><div class="small muted" style="margin-top:6px">${esc(previewApp?.getPatternTitle?.(x.patternId)||x.patternId||"Паттерн")} · ♥ ${Number(x.saves)||0} · ${esc(fmt(x.createdAt))}</div>`; ng.appendChild(w); renderCanvas(w.querySelector("canvas"),x);
    });
  }

  async function refreshCommunity(force=true) {
    const tab=document.getElementById("tab-community"); if(!tab) return;
    tab.innerHTML='<div class="card empty">Загружаем единое облачное сообщество…</div>';
    try { renderCommunity(await loadCommunity(force)); }
    catch (e) { tab.innerHTML=`<div class="card empty">Не удалось загрузить сообщество: ${esc(e.message)}</div>`; }
  }

  let repairTimer = 0;
  function scheduleRepair() { clearTimeout(repairTimer); requestAnimationFrame(() => requestAnimationFrame(repairNotes)); repairTimer = setTimeout(repairNotes,150); }
  new MutationObserver(records => { if (records.some(r => [...r.addedNodes].some(n => n.nodeType === 1))) scheduleRepair(); }).observe(document.documentElement,{childList:true,subtree:true});
  document.querySelector('.tab[data-tab="community"]')?.addEventListener("click",()=>setTimeout(()=>refreshCommunity(true),0));
  document.getElementById("refreshBtn")?.addEventListener("click",()=>{communityCache=null;setTimeout(()=>{const t=document.getElementById("tab-community");if(t&&!t.classList.contains("hidden"))refreshCommunity(true)},0)});

  makePreviewEngine();
  window.addEventListener("resize", scheduleRepair);
  window.__SETKA_ADMIN_NOTE_SNAPSHOT_FIX_V34__ = {version:4,repair:scheduleRepair,refreshCommunity};
})();