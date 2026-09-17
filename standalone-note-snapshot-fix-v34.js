(() => {
  "use strict";

  const C = window.SetkaStandaloneV34;
  const Setka = window.SetkaApp;
  const VC = window.__SETKA_VISUAL_CACHE_V40__;
  if (!C || !Setka) return;

  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
  const KNOWN_PATTERN_IDS = ["tentacle-orbit","dandelion","fish-wave","breathing-fractal","breathing-fractal-growth","rgb-glitch-rings","stereo-dna"];

  function configOf(note) {
    const a = note?.visualRecipe?.config;
    if (a && typeof a === "object" && Object.keys(a).length) return a;
    const b = note?.replaySnapshot?.config;
    if (b && typeof b === "object" && Object.keys(b).length) return b;
    const c = note?.state?.config;
    if (c && typeof c === "object" && Object.keys(c).length) return c;
    return note?.config || null;
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

  function patternIdFromHash(note) {
    const values = [note?.visualRecipe?.configHash,note?.replaySnapshot?.configHash,note?.configHash,note?.state?.configKey,note?.visualSnapshot?.configHash].filter(Boolean).map(String);
    for (const value of values) for (const id of KNOWN_PATTERN_IDS) if (value === id || value.startsWith(`${id}|`)) return id;
    return null;
  }

  function patternIdOf(note) {
    const cfg = configOf(note);
    return patternIdFromConfig(cfg)
      || patternIdFromHash(note)
      || note?.visualRecipe?.patternId
      || note?.replaySnapshot?.patternId
      || note?.state?.patternId
      || note?.visualSnapshot?.patternId
      || note?.patternId
      || cfg?.patternId
      || null;
  }

  function replayOf(note) {
    const pid = patternIdOf(note), raw = configOf(note);
    const config = raw ? {...clone(raw), ...(pid ? {patternId:pid} : {})} : null;
    const frames = [note?.visualRecipe?.frame,note?.replaySnapshot?.frame,note?.visualSnapshot?.frame,note?.frame,note?.state?.frame];
    let frame = 44;
    for (const v of frames) { const n = Number(v); if (Number.isFinite(n)) { frame=n; break; } }
    return {pid,config,frame};
  }

  function recipeFor(noteLike, replay = null) {
    const r = replay || replayOf(noteLike);
    const base = {
      patternId:r.pid,
      patternVersion:noteLike?.patternVersion || noteLike?.visualRecipe?.patternVersion || noteLike?.state?.patternVersion || 1,
      configHash:noteLike?.configHash || noteLike?.visualRecipe?.configHash || noteLike?.state?.configKey || null,
      frame:r.frame,
      seed:noteLike?.visualRecipe?.seed ?? null,
      config:r.config || {}
    };
    return VC?.recipe ? VC.recipe(base) : {...base,recipeVersion:1,rendererVersion:"app-v7"};
  }

  function captureLiveMoment() {
    try {
      const state = Setka.getState?.();
      if (!state || state.view !== "game") return null;
      const replay = {pid:patternIdFromConfig(state.config) || state.patternId,config:clone(state.config),frame:Number(state.frame)||44};
      const recipe = recipeFor({...state,patternVersion:state.patternVersion,configHash:state.configKey}, replay);
      const canvas = document.getElementById("patternCanvas");
      const cachePromise = VC?.putCanvas && canvas ? VC.putCanvas(canvas, recipe) : Promise.resolve(null);
      return {capturedAt:new Date().toISOString(),state:clone(state),recipe,cachePromise};
    } catch (e) {
      console.warn("SETKA note live moment capture failed", e);
      return null;
    }
  }

  async function bindMomentToNote(note, moment) {
    if (!note || !moment?.state) return;
    const st = moment.state, structuralPid = patternIdFromConfig(st.config), pid = structuralPid || st.patternId || st.config?.patternId || note.patternId || null;
    note.patternId = pid;
    note.patternVersion = st.patternVersion || note.patternVersion || 1;
    note.sourceType = st.sourceType ?? note.sourceType ?? null;
    note.sourceId = st.sourceId ?? note.sourceId ?? null;
    note.communityId = st.communityId ?? note.communityId ?? null;
    note.configHash = st.configKey ?? note.configHash ?? null;
    note.config = st.config ? {...clone(st.config), ...(pid ? {patternId:pid} : {})} : note.config;
    note.frame = Number.isFinite(Number(st.frame)) ? Number(st.frame) : note.frame;
    note.state = clone({...st,patternId:pid,config:note.config});
    note.replaySnapshot = {version:2,patternId:pid,patternVersion:note.patternVersion,frame:note.frame ?? null,configHash:note.configHash || null,config:clone(note.config)};
    note.visualRecipe = recipeFor(note,{pid,config:note.config,frame:note.frame ?? 44});
    const meta = await moment.cachePromise?.catch?.(() => null);
    note.visualSnapshot = meta || (VC?.metadata ? VC.metadata(note.visualRecipe,{capturedAt:moment.capturedAt}) : {version:2,kind:"recipe-cache",capturedAt:moment.capturedAt,patternId:pid,patternVersion:note.patternVersion,frame:note.frame ?? null,configHash:note.configHash||null,storage:"device-cache"});
    C.save?.();
    window.dispatchEvent(new CustomEvent("setka:v34-sync-request"));
  }

  function installLiveBinding() {
    const noteBtn = document.getElementById("st34Note");
    if (!noteBtn || noteBtn.dataset.liveSnapshotBound === "2") return;
    const originalOpen = noteBtn.onclick;
    if (typeof originalOpen !== "function") return;
    noteBtn.onclick = function(event) {
      const moment = captureLiveMoment();
      const before = new Set((C.getData?.()?.notes || []).map(n => n.id));
      const result = originalOpen.call(this,event);
      const saveBtn = [...document.querySelectorAll("#st34Layer .st-primary")].find(b => String(b.textContent||"").trim() === "Сохранить");
      if (saveBtn && typeof saveBtn.onclick === "function" && saveBtn.dataset.liveSnapshotSaveBound !== "2") {
        const originalSave = saveBtn.onclick;
        saveBtn.onclick = function(saveEvent) {
          const saved = originalSave.call(this,saveEvent);
          const created = [...(C.getData?.()?.notes || [])].reverse().find(n => !before.has(n.id));
          if (created && moment) bindMomentToNote(created,moment).catch(() => {});
          return saved;
        };
        saveBtn.dataset.liveSnapshotSaveBound = "2";
      }
      return result;
    };
    noteBtn.dataset.liveSnapshotBound = "2";
  }

  function resolveNote(card) {
    const text = card.querySelector(".st34-note-text")?.textContent || "", meta = card.querySelector(".st34-note-meta")?.textContent || "";
    const notes = Array.isArray(C.getData?.()?.notes) ? C.getData().notes : [];
    const same = notes.filter(n => String(n?.text ?? "") === text);
    if (same.length === 1) return same[0];
    return same.find(n => { try { return meta.startsWith(C.dt?.(n.observedAt)||""); } catch (_) { return false; } }) || same.at(-1) || null;
  }

  function drawLegacyDataUrl(canvas, snapshot) {
    if (!canvas || !snapshot?.dataUrl) return false;
    const img = new Image();
    img.onload = () => {
      const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height,s=Math.min(w/img.width,h/img.height),dw=img.width*s,dh=img.height*s;
      ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);canvas.dataset.snapshotSource="legacy-dataurl";
    };
    img.src=snapshot.dataUrl;
    return true;
  }

  function semantic(canvas,replay) {
    if (!canvas || !replay?.config || typeof Setka.renderPreview !== "function") return false;
    try { Setka.renderPreview(canvas,clone(replay.config),replay.frame ?? 44,replay.pid); canvas.dataset.snapshotSource="semantic-replay"; return true; }
    catch (e) { console.warn("SETKA note semantic snapshot preview failed",e); return false; }
  }

  async function migrateLegacy(note,replay) {
    const old = note?.visualSnapshot;
    if (!old?.dataUrl || !VC?.putDataUrl) return;
    const r = recipeFor(note,replay), meta = await VC.putDataUrl(old.dataUrl,r);
    if (!meta) return;
    note.visualRecipe = r;
    note.visualSnapshot = {...VC.stripHeavyVisuals(old),...meta};
    C.save?.();
  }

  async function drawNoteSnapshot(canvas,note,replay) {
    const old = note?.visualSnapshot;
    if (old?.dataUrl) {
      drawLegacyDataUrl(canvas,old);
      migrateLegacy(note,replay).catch(() => {});
      return;
    }
    const r = note?.visualRecipe ? recipeFor(note,replay) : recipeFor(note,replay);
    if (VC?.renderOrCache) await VC.renderOrCache(canvas,r,(el)=>semantic(el,replay));
    else semantic(canvas,replay);
    canvas.dataset.snapshotPatternId = replay?.pid || "";
  }

  function repairCard(card) {
    if (!(card instanceof Element)) return;
    const note=resolveNote(card); if(!note) return;
    const replay=replayOf(note); if(!replay.config) return;
    const canvas=card.querySelector("canvas.st34-note-preview");
    if (canvas) { drawNoteSnapshot(canvas,note,replay); requestAnimationFrame(()=>requestAnimationFrame(()=>drawNoteSnapshot(canvas,note,replay))); }
    const open=card.querySelector(".st34-note-preview-button");
    if (open) open.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();C.hideLayer?.();Setka.openConfig?.(clone(replay.config),{type:"memory",id:note.id,patternId:replay.pid,baseId:replay.pid,communityId:note.communityId||null,noteId:note.id,frame:replay.frame});};
    const label=card.querySelector(".st34-note-preview-label");
    if (label) { const title=replay.pid&&Setka.getPatternTitle?.(replay.pid); label.textContent=title?`ПАТТЕРН В МОМЕНТ ЗАМЕТКИ · ${String(title).toUpperCase()}`:"ПАТТЕРН В МОМЕНТ ЗАМЕТКИ"; }
    card.dataset.noteSnapshotFixed="5";
  }

  function scan(root=document) {
    const cards=root.matches?.(".st34-note-card")?[root]:root.querySelectorAll?.(".st34-note-card")||[];
    for(const card of cards) repairCard(card);
  }

  new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)scan(node)}).observe(document.documentElement,{childList:true,subtree:true});
  installLiveBinding(); scan();
  window.__SETKA_NOTE_SNAPSHOT_FIX_V34__=5;
})();