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
    frame.srcdoc = `<!doctype html><html><body style="margin:0;background:#000">
      <main id="app">
        <section id="libraryScreen" class="screen active">
          <button id="libraryPagerButton"></button><button id="communityPagerButton"></button><button id="favoritesPagerButton"></button>
          <div id="libraryTitle"></div><div id="librarySwipeArea"></div>
          <div id="allPatternsPanel"></div><div id="communityPanel"></div><div id="favoritesPanel"></div>
        </section>
        <section id="gameScreen" class="screen">
          <canvas id="patternCanvas" width="320" height="320"></canvas>
          <button id="favoriteButton"></button><button id="libraryButton"></button><button id="prevButton"></button><button id="nextButton"></button>
          <button id="colorButton"></button><div id="colorDots"></div><button id="instructionsButton"></button>
          <div id="instructionsModal"><div class="instructions"></div></div><div id="toast"></div>
        </section>
      </main>
      <script src="app-v7-multipattern.js?v=34-native-seven-patterns-stereo-dna-1"><\/script>
    </body></html>`;
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

  function renderCanvas(canvas, note) {
    if (!canvas || !note?.config || !previewApp?.renderPreview) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round((rect.width || 320) * dpr));
    const height = Math.max(1, Math.round((rect.height || 220) * dpr));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const pid = note.pattern_id || note.patternId || note.config?.patternId || null;
    try {
      previewApp.renderPreview(canvas, note.config, note.preview_frame ?? note.frame ?? 44, pid);
      canvas.dataset.snapshotPatternId = pid || "";
      const caption = canvas.parentElement?.querySelector?.(".v4-preview-caption");
      const title = pid && previewApp.getPatternTitle?.(pid);
      if (caption && title) caption.textContent = `ПАТТЕРН В МОМЕНТ ЗАМЕТКИ · ${String(title).toUpperCase()}`;
    } catch (e) {
      console.warn("SETKA admin note snapshot repair failed", e);
    }
  }

  function repair() {
    if (!previewApp?.renderPreview || !notes.length) return;
    document.querySelectorAll("canvas[data-note-preview]").forEach(canvas => {
      const index = Number(canvas.dataset.notePreview);
      if (!Number.isInteger(index) || !notes[index]) return;
      renderCanvas(canvas, notes[index]);
    });
  }

  let repairTimer = 0;
  function scheduleRepair() {
    clearTimeout(repairTimer);
    requestAnimationFrame(() => requestAnimationFrame(repair));
    repairTimer = setTimeout(repair, 120);
  }

  const observer = new MutationObserver(records => {
    if (records.some(r => [...r.addedNodes].some(n => n.nodeType === 1))) scheduleRepair();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  makePreviewEngine();
  window.addEventListener("resize", scheduleRepair);

  window.__SETKA_ADMIN_NOTE_SNAPSHOT_FIX_V34__ = true;
})();