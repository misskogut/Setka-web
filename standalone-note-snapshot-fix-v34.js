(() => {
  "use strict";

  const C = window.SetkaStandaloneV34;
  const Setka = window.SetkaApp;
  if (!C || !Setka) return;

  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));

  function patternIdOf(note) {
    return note?.visualSnapshot?.patternId || note?.patternId || note?.state?.patternId || note?.config?.patternId || null;
  }

  function captureCanvas(canvas) {
    if (!canvas || !canvas.width || !canvas.height) return null;
    try {
      const maxSide = 560;
      const scale = Math.min(1, maxSide / Math.max(canvas.width, canvas.height));
      const out = document.createElement("canvas");
      out.width = Math.max(1, Math.round(canvas.width * scale));
      out.height = Math.max(1, Math.round(canvas.height * scale));
      const ctx = out.getContext("2d");
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(canvas, 0, 0, out.width, out.height);
      let dataUrl = out.toDataURL("image/webp", 0.74);
      if (!String(dataUrl).startsWith("data:image/webp")) dataUrl = out.toDataURL("image/jpeg", 0.78);
      return {
        dataUrl,
        width: out.width,
        height: out.height,
        sourceWidth: canvas.width,
        sourceHeight: canvas.height
      };
    } catch (e) {
      console.warn("SETKA note live canvas capture failed", e);
      return null;
    }
  }

  function captureLiveMoment() {
    try {
      const state = Setka.getState?.();
      if (!state || state.view !== "game") return null;
      const canvasShot = captureCanvas(document.getElementById("patternCanvas"));
      return {
        capturedAt: new Date().toISOString(),
        state: clone(state),
        canvasShot
      };
    } catch (e) {
      console.warn("SETKA note live moment capture failed", e);
      return null;
    }
  }

  function bindMomentToNote(note, moment) {
    if (!note || !moment?.state) return;
    const st = moment.state;
    const pid = st.patternId || st.config?.patternId || note.patternId || null;

    note.patternId = pid;
    note.patternVersion = st.patternVersion || note.patternVersion || 1;
    note.sourceType = st.sourceType ?? note.sourceType ?? null;
    note.sourceId = st.sourceId ?? note.sourceId ?? null;
    note.communityId = st.communityId ?? note.communityId ?? null;
    note.configHash = st.configKey ?? note.configHash ?? null;
    note.config = st.config ? clone(st.config) : note.config;
    note.frame = Number.isFinite(Number(st.frame)) ? Number(st.frame) : note.frame;
    note.state = clone(st);

    if (moment.canvasShot?.dataUrl) {
      note.visualSnapshot = {
        version: 1,
        kind: "canvas-frame",
        patternId: pid,
        patternVersion: note.patternVersion,
        frame: note.frame ?? null,
        configHash: note.configHash || null,
        capturedAt: moment.capturedAt,
        width: moment.canvasShot.width,
        height: moment.canvasShot.height,
        sourceWidth: moment.canvasShot.sourceWidth,
        sourceHeight: moment.canvasShot.sourceHeight,
        dataUrl: moment.canvasShot.dataUrl
      };
    }

    C.save?.();
  }

  function installLiveBinding() {
    const noteBtn = document.getElementById("st34Note");
    if (!noteBtn || noteBtn.dataset.liveSnapshotBound === "1") return;
    const originalOpen = noteBtn.onclick;
    if (typeof originalOpen !== "function") return;

    noteBtn.onclick = function (event) {
      const moment = captureLiveMoment();
      const before = new Set((C.getData?.()?.notes || []).map(n => n.id));
      const result = originalOpen.call(this, event);

      const saveButtons = [...document.querySelectorAll("#st34Layer .st-primary")];
      const saveBtn = saveButtons.find(b => String(b.textContent || "").trim() === "Сохранить");
      if (saveBtn && typeof saveBtn.onclick === "function" && saveBtn.dataset.liveSnapshotSaveBound !== "1") {
        const originalSave = saveBtn.onclick;
        saveBtn.onclick = function (saveEvent) {
          const saved = originalSave.call(this, saveEvent);
          const notes = C.getData?.()?.notes || [];
          const created = [...notes].reverse().find(n => !before.has(n.id));
          if (created && moment) bindMomentToNote(created, moment);
          return saved;
        };
        saveBtn.dataset.liveSnapshotSaveBound = "1";
      }
      return result;
    };
    noteBtn.dataset.liveSnapshotBound = "1";
  }

  function resolveNote(card) {
    const text = card.querySelector(".st34-note-text")?.textContent || "";
    const meta = card.querySelector(".st34-note-meta")?.textContent || "";
    const notes = Array.isArray(C.getData?.()?.notes) ? C.getData().notes : [];
    const sameText = notes.filter(n => String(n?.text ?? "") === text);
    if (sameText.length === 1) return sameText[0];
    const byTime = sameText.find(n => {
      try { return meta.startsWith(C.dt?.(n.observedAt) || ""); }
      catch (_) { return false; }
    });
    return byTime || sameText.at(-1) || null;
  }

  function drawImageSnapshot(canvas, snapshot) {
    if (!canvas || !snapshot?.dataUrl) return false;
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext("2d");
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      const scale = Math.min(w / img.width, h / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      canvas.dataset.snapshotSource = "captured-live-canvas";
    };
    img.onerror = () => {
      canvas.dataset.snapshotSource = "captured-live-canvas-error";
    };
    img.src = snapshot.dataUrl;
    return true;
  }

  function drawSemanticSnapshot(canvas, note, pid) {
    if (!canvas || !note?.config || typeof Setka.renderPreview !== "function") return;
    try {
      Setka.renderPreview(canvas, clone(note.config), note.frame ?? 44, pid);
      canvas.dataset.snapshotSource = "semantic-replay";
    } catch (e) {
      console.warn("SETKA note semantic snapshot preview failed", e);
    }
  }

  function drawNoteSnapshot(canvas, note, pid) {
    if (!drawImageSnapshot(canvas, note?.visualSnapshot)) drawSemanticSnapshot(canvas, note, pid);
    canvas.dataset.snapshotPatternId = pid || "";
  }

  function repairCard(card) {
    if (!(card instanceof Element)) return;
    const note = resolveNote(card);
    if (!note?.config) return;

    const pid = patternIdOf(note);
    const canvas = card.querySelector("canvas.st34-note-preview");
    if (canvas) {
      // standalone-user-ui schedules its legacy preview in requestAnimationFrame.
      // Render after it, so the legacy tentacle preview can never overwrite the bound note moment.
      drawNoteSnapshot(canvas, note, pid);
      requestAnimationFrame(() => requestAnimationFrame(() => drawNoteSnapshot(canvas, note, pid)));
    }

    const open = card.querySelector(".st34-note-preview-button");
    if (open) {
      open.onclick = e => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        C.hideLayer?.();
        Setka.openConfig?.(clone(note.config), {
          type: "memory",
          id: note.id,
          patternId: pid,
          baseId: pid,
          communityId: note.communityId || null,
          noteId: note.id
        });
      };
    }

    const label = card.querySelector(".st34-note-preview-label");
    if (label) {
      const title = pid && Setka.getPatternTitle?.(pid);
      label.textContent = title
        ? `ПАТТЕРН В МОМЕНТ ЗАМЕТКИ · ${String(title).toUpperCase()}`
        : "ПАТТЕРН В МОМЕНТ ЗАМЕТКИ";
    }

    card.dataset.noteSnapshotFixed = "2";
  }

  function scan(root = document) {
    const cards = root.matches?.(".st34-note-card") ? [root] : root.querySelectorAll?.(".st34-note-card") || [];
    for (const card of cards) repairCard(card);
  }

  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === 1) scan(node);
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  installLiveBinding();
  scan();

  window.__SETKA_NOTE_SNAPSHOT_FIX_V34__ = 2;
})();