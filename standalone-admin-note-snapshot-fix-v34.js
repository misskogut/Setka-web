(() => {
  "use strict";

  let notes = [];
  let previewApp = null;
  const originalFetch = window.fetch.bind(window);

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
        if (previewApp?.renderPreview) scheduleRepair();
        else if (tries++ < 60) setTimeout(wait, 50);
      };
      wait();
    };
    document.body.appendChild(frame);
  }

  function sizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect(),dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round((rect.width || 320) * dpr)),height = Math.max(1, Math.round((rect.height || 220) * dpr));
    if (canvas.width !== width) canvas.width = width;if (canvas.height !== height) canvas.height = height;
  }

  function drawExactSnapshot(canvas, snapshot) {
    const src = snapshot?.dataUrl;if (!src) return false;
    const token = `${snapshot.capturedAt || ""}|${src.length}`;
    if (canvas.dataset.exactSnapshotToken === token) return true;
    const img = new Image();
    img.onload = () => {
      sizeCanvas(canvas);
      const ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
      ctx.fillStyle = "#000";ctx.fillRect(0,0,w,h);
      const scale = Math.min(w / img.width, h / img.height),dw = img.width * scale,dh = img.height * scale;
      ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);
      canvas.dataset.exactSnapshotToken = token;
    };
    img.src = src;return true;
  }

  function renderCanvas(canvas, note) {
    if (!canvas || !note) return;
    sizeCanvas(canvas);
    const snapshot = note.visual_snapshot || note.visualSnapshot || null;
    const pid = snapshot?.patternId || note.pattern_id || note.patternId || note.config?.patternId || null;
    const exact = drawExactSnapshot(canvas, snapshot);
    if (!exact) {
      if (!note.config || !previewApp?.renderPreview) return;
      try { previewApp.renderPreview(canvas, note.config, note.preview_frame ?? note.frame ?? 44, pid); }
      catch (e) { console.warn("SETKA admin note preview failed", e); }
    }
    canvas.dataset.snapshotPatternId = pid || "";
    canvas.dataset.snapshotKind = exact ? "exact" : "semantic";
    const caption = canvas.parentElement?.querySelector?.(".v4-preview-caption"),title = pid && previewApp?.getPatternTitle?.(pid);
    if (caption) caption.textContent = `${exact ? "ТОЧНЫЙ СЛЕПОК" : "КОНФИГУРАЦИЯ"} В МОМЕНТ ЗАМЕТКИ${title ? ` · ${String(title).toUpperCase()}` : ""}`;
  }

  function repair() {
    if (!notes.length) return;
    document.querySelectorAll("canvas[data-note-preview]").forEach(canvas => {
      const index = Number(canvas.dataset.notePreview);
      if (Number.isInteger(index) && notes[index]) renderCanvas(canvas, notes[index]);
    });
  }
  let repairTimer = 0;
  function scheduleRepair() {clearTimeout(repairTimer);requestAnimationFrame(() => requestAnimationFrame(repair));repairTimer = setTimeout(repair, 150);}
  new MutationObserver(records => {if (records.some(r => [...r.addedNodes].some(n => n.nodeType === 1))) scheduleRepair();}).observe(document.documentElement, { childList: true, subtree: true });

  makePreviewEngine();
  window.addEventListener("resize", scheduleRepair);
  window.__SETKA_ADMIN_NOTE_SNAPSHOT_FIX_V34__ = {version:3, repair:scheduleRepair};
})();