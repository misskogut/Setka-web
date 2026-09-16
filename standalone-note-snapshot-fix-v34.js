(() => {
  "use strict";

  const C = window.SetkaStandaloneV34;
  const Setka = window.SetkaApp;
  if (!C || !Setka) return;

  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
  const KNOWN_PATTERN_IDS = [
    "tentacle-orbit",
    "dandelion",
    "fish-wave",
    "breathing-fractal",
    "breathing-fractal-growth",
    "rgb-glitch-rings",
    "stereo-dna"
  ];

  function configOf(note) {
    const replay = note?.replaySnapshot?.config;
    if (replay && typeof replay === "object" && Object.keys(replay).length) return replay;
    const stateConfig = note?.state?.config;
    if (stateConfig && typeof stateConfig === "object" && Object.keys(stateConfig).length) return stateConfig;
    return note?.config || null;
  }

  function patternIdFromHash(note) {
    const values = [
      note?.replaySnapshot?.configHash,
      note?.configHash,
      note?.state?.configKey,
      note?.visualSnapshot?.configHash
    ].filter(Boolean).map(String);
    for (const value of values) {
      for (const id of KNOWN_PATTERN_IDS) {
        if (value === id || value.startsWith(`${id}|`)) return id;
      }
    }
    return null;
  }

  function patternIdFromConfig(config) {
    const c = config || {};
    if (c.eyeSeparation != null || c.stereoAngle != null || (c.angleStep != null && c.numPoints != null)) return "stereo-dna";
    if (c.numRings != null || c.baseSpacing != null || c.invertDirection != null) return "rgb-glitch-rings";
    if (c.numLayers != null || c.ringSpacing != null) return "fish-wave";
    if (c.maxDepth != null || c.levelSpeedRatio != null || c.firstLevelFactor != null || (c.pulseSpeed != null && c.branches != null)) return "breathing-fractal-growth";
    if (c.pulseSpd != null || c.pulseAmp != null || (c.layers != null && c.branches != null)) return "breathing-fractal";
    if (c.v1 != null || c.numShapes != null || c.angleSpeed != null || c.tSpeed != null || c.backgroundAlpha != null) return "dandelion";
    if (c.numTentacles != null || c.tentacleLength != null || c.circleSize != null || c.segmentStep != null) return "tentacle-orbit";
    return null;
  }

  function patternIdOf(note) {
    const cfg = configOf(note);
    return patternIdFromHash(note)
      || patternIdFromConfig(cfg)
      || note?.replaySnapshot?.patternId
      || note?.state?.patternId
      || note?.visualSnapshot?.patternId
      || note?.patternId
      || cfg?.patternId
      || null;
  }

  function replayOf(note) {
    const pid = patternIdOf(note);
    const raw = configOf(note);
    const config = raw ? {...clone(raw), ...(pid ? {patternId:pid} : {})} : null;
    const frameCandidates = [note?.replaySnapshot?.frame, note?.visualSnapshot?.frame, note?.frame, note?.state?.frame];
    let frame = null;
    for (const value of frameCandidates) {
      const n = Number(value);
      if (Number.isFinite(n)) { frame = n; break; }
    }
    return {pid, config, frame};
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
      return {dataUrl,width:out.width,height:out.height,sourceWidth:canvas.width,sourceHeight:canvas.height};
    } catch (e) {
      console.warn("SETKA note live canvas capture failed", e);
      return null;
    }
  }

  function captureLiveMoment() {
    try {
      const state = Setka.getState?.();
      if (!state || state.view !== "game") return null;
      return {capturedAt:new Date().toISOString(),state:clone(state),canvasShot:captureCanvas(document.getElementById("patternCanvas"))};
    } catch (e) {
      console.warn("SETKA note live moment capture failed", e);
      return null;
    }
  }

  function bindMomentToNote(note, moment) {
    if (!note || !moment?.state) return;
    const st = moment.state;
    const structuralPid = patternIdFromConfig(st.config);
    const pid = structuralPid || st.patternId || st.config?.patternId || note.patternId || null;
    note.patternId = pid;
    note.patternVersion = st.patternVersion || note.patternVersion || 1;
    note.sourceType = st.sourceType ?? note.sourceType ?? null;
    note.sourceId = st.sourceId ?? note.sourceId ?? null;
    note.communityId = st.communityId ?? note.communityId ?? null;
    note.configHash = st.configKey ?? note.configHash ?? null;
    note.config = st.config ? {...clone(st.config), ...(pid ? {patternId:pid} : {})} : note.config;
    note.frame = Number.isFinite(Number(st.frame)) ? Number(st.frame) : note.frame;
    note.state = clone({...st, patternId:pid, config:note.config});
    note.replaySnapshot = {
      version:1,
      patternId:pid,
      patternVersion:note.patternVersion,
      frame:note.frame ?? null,
      configHash:note.configHash || null,
      config:clone(note.config)
    };
    if (moment.canvasShot?.dataUrl) {
      note.visualSnapshot = {
        version:1,kind:"canvas-frame",patternId:pid,patternVersion:note.patternVersion,
        frame:note.frame ?? null,configHash:note.configHash || null,capturedAt:moment.capturedAt,
        width:moment.canvasShot.width,height:moment.canvasShot.height,
        sourceWidth:moment.canvasShot.sourceWidth,sourceHeight:moment.canvasShot.sourceHeight,
        dataUrl:moment.canvasShot.dataUrl
      };
    }
    C.save?.();
    window.dispatchEvent(new CustomEvent("setka:v34-sync-request"));
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
    const byTime = sameText.find(n => {try { return meta.startsWith(C.dt?.(n.observedAt) || ""); } catch (_) { return false; }});
    return byTime || sameText.at(-1) || null;
  }

  function drawImageSnapshot(canvas, snapshot) {
    if (!canvas || !snapshot?.dataUrl) return false;
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
      ctx.fillStyle = "#000";ctx.fillRect(0, 0, w, h);
      const scale = Math.min(w / img.width, h / img.height), dw = img.width * scale, dh = img.height * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      canvas.dataset.snapshotSource = "captured-live-canvas";
    };
    img.onerror = () => {canvas.dataset.snapshotSource = "captured-live-canvas-error";};
    img.src = snapshot.dataUrl;
    return true;
  }

  function drawSemanticSnapshot(canvas, note, replay) {
    if (!canvas || !replay?.config || typeof Setka.renderPreview !== "function") return;
    try {
      Setka.renderPreview(canvas, clone(replay.config), replay.frame ?? 44, replay.pid);
      canvas.dataset.snapshotSource = "semantic-replay";
    } catch (e) { console.warn("SETKA note semantic snapshot preview failed", e); }
  }

  function drawNoteSnapshot(canvas, note, replay) {
    if (!drawImageSnapshot(canvas, note?.visualSnapshot)) drawSemanticSnapshot(canvas, note, replay);
    canvas.dataset.snapshotPatternId = replay?.pid || "";
  }

  function repairCard(card) {
    if (!(card instanceof Element)) return;
    const note = resolveNote(card);
    if (!note) return;
    const replay = replayOf(note);
    if (!replay.config) return;
    const canvas = card.querySelector("canvas.st34-note-preview");
    if (canvas) {
      drawNoteSnapshot(canvas, note, replay);
      requestAnimationFrame(() => requestAnimationFrame(() => drawNoteSnapshot(canvas, note, replay)));
    }
    const open = card.querySelector(".st34-note-preview-button");
    if (open) open.onclick = e => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      C.hideLayer?.();
      Setka.openConfig?.(clone(replay.config), {
        type:"memory",
        id:note.id,
        patternId:replay.pid,
        baseId:replay.pid,
        communityId:note.communityId || null,
        noteId:note.id,
        frame:replay.frame
      });
    };
    const label = card.querySelector(".st34-note-preview-label");
    if (label) {
      const title = replay.pid && Setka.getPatternTitle?.(replay.pid);
      label.textContent = title ? `ПАТТЕРН В МОМЕНТ ЗАМЕТКИ · ${String(title).toUpperCase()}` : "ПАТТЕРН В МОМЕНТ ЗАМЕТКИ";
    }
    card.dataset.noteSnapshotFixed = "4";
  }

  function scan(root = document) {
    const cards = root.matches?.(".st34-note-card") ? [root] : root.querySelectorAll?.(".st34-note-card") || [];
    for (const card of cards) repairCard(card);
  }

  const observer = new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) scan(node);
  });
  observer.observe(document.documentElement, {childList:true, subtree:true});
  installLiveBinding();
  scan();
  window.__SETKA_NOTE_SNAPSHOT_FIX_V34__ = 4;
})();