(() => {
  "use strict";
  if (window.__SETKA_VISUAL_CACHE_V40__) return;

  const DB_NAME = "setka-visual-cache-v40";
  const STORE = "previews";
  const DB_VERSION = 1;
  const MAX_ITEMS = 160;
  const MAX_BYTES = 32 * 1024 * 1024;
  const MAX_SIDE = 560;
  const RENDERER_VERSION = "app-v7";
  const POLICY_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-visual-assets-v40";
  const API_KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const MOTHER_IDS = new Set(["tentacle-orbit","dandelion","fish-wave","breathing-fractal","breathing-fractal-growth","rgb-glitch-rings","stereo-dna"]);

  let dbPromise = null;
  let policyPromise = null;
  let policyMap = null;

  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
  const finite = (v, d = null) => Number.isFinite(Number(v)) ? Number(v) : d;

  function openDb() {
    if (dbPromise) return dbPromise;
    if (!window.indexedDB) return Promise.resolve(null);
    dbPromise = new Promise(resolve => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            const s = db.createObjectStore(STORE, {keyPath:"key"});
            s.createIndex("lastAccessedAt", "lastAccessedAt", {unique:false});
            s.createIndex("patternId", "patternId", {unique:false});
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch (_) { resolve(null); }
    });
    return dbPromise;
  }

  function recipe(input = {}) {
    const patternId = String(input.patternId || input.config?.patternId || "tentacle-orbit");
    return {
      recipeVersion: 1,
      rendererVersion: String(input.rendererVersion || RENDERER_VERSION),
      patternId,
      patternVersion: Math.max(1, Math.round(finite(input.patternVersion, 1))),
      configHash: input.configHash ? String(input.configHash) : null,
      frame: finite(input.frame, 44),
      seed: input.seed == null ? null : String(input.seed),
      config: clone(input.config || {})
    };
  }

  function cacheKey(input = {}) {
    const r = recipe(input);
    const frame = Math.round((finite(r.frame, 44) || 44) * 1000) / 1000;
    const hash = r.configHash || JSON.stringify(r.config || {});
    return `rv${r.recipeVersion}|${r.rendererVersion}|${r.patternId}|pv${r.patternVersion}|f${frame}|${hash}`;
  }

  function metadata(input = {}, extra = {}) {
    const r = recipe(input);
    return {
      version: 2,
      kind: "recipe-cache",
      cacheKey: extra.cacheKey || cacheKey(r),
      recipeVersion: r.recipeVersion,
      rendererVersion: r.rendererVersion,
      patternId: r.patternId,
      patternVersion: r.patternVersion,
      configHash: r.configHash,
      frame: r.frame,
      seed: r.seed,
      capturedAt: extra.capturedAt || new Date().toISOString(),
      width: finite(extra.width, null),
      height: finite(extra.height, null),
      sourceWidth: finite(extra.sourceWidth, null),
      sourceHeight: finite(extra.sourceHeight, null),
      mime: extra.mime || null,
      bytes: finite(extra.bytes, null),
      storage: "device-cache"
    };
  }

  function canvasBlob(canvas, maxSide = MAX_SIDE) {
    return new Promise(resolve => {
      try {
        if (!canvas?.width || !canvas?.height) return resolve(null);
        const scale = Math.min(1, maxSide / Math.max(canvas.width, canvas.height));
        const out = document.createElement("canvas");
        out.width = Math.max(1, Math.round(canvas.width * scale));
        out.height = Math.max(1, Math.round(canvas.height * scale));
        const ctx = out.getContext("2d");
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(canvas, 0, 0, out.width, out.height);
        const done = blob => resolve(blob ? {blob,width:out.width,height:out.height,sourceWidth:canvas.width,sourceHeight:canvas.height} : null);
        if (out.toBlob) {
          out.toBlob(b => {
            if (b && b.type === "image/webp") return done(b);
            out.toBlob(j => done(j), "image/jpeg", 0.78);
          }, "image/webp", 0.74);
        } else {
          const url = out.toDataURL("image/jpeg", 0.78);
          fetch(url).then(r => r.blob()).then(b => done(b)).catch(() => resolve(null));
        }
      } catch (_) { resolve(null); }
    });
  }

  async function putBlob(key, blob, meta = {}) {
    const db = await openDb();
    if (!db || !blob) return false;
    const now = Date.now();
    return new Promise(resolve => {
      try {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put({
          key,
          blob,
          bytes: Number(blob.size) || 0,
          mime: blob.type || meta.mime || "image/webp",
          patternId: meta.patternId || null,
          createdAt: meta.createdAt || now,
          lastAccessedAt: now
        });
        tx.oncomplete = () => { prune().catch(() => {}); resolve(true); };
        tx.onerror = () => resolve(false);
      } catch (_) { resolve(false); }
    });
  }

  async function putCanvas(canvas, input = {}) {
    const r = recipe(input), key = cacheKey(r), shot = await canvasBlob(canvas);
    if (!shot) return metadata(r, {cacheKey:key});
    await putBlob(key, shot.blob, {patternId:r.patternId});
    return metadata(r, {
      cacheKey:key,
      width:shot.width,
      height:shot.height,
      sourceWidth:shot.sourceWidth,
      sourceHeight:shot.sourceHeight,
      mime:shot.blob.type,
      bytes:shot.blob.size
    });
  }

  async function putDataUrl(dataUrl, input = {}) {
    if (!String(dataUrl || "").startsWith("data:image/")) return null;
    try {
      const blob = await fetch(dataUrl).then(r => r.blob());
      const r = recipe(input), key = cacheKey(r);
      await putBlob(key, blob, {patternId:r.patternId});
      return metadata(r, {cacheKey:key,mime:blob.type,bytes:blob.size});
    } catch (_) { return null; }
  }

  async function get(key) {
    const db = await openDb();
    if (!db || !key) return null;
    return new Promise(resolve => {
      try {
        const tx = db.transaction(STORE, "readwrite"), s = tx.objectStore(STORE), req = s.get(key);
        req.onsuccess = () => {
          const row = req.result || null;
          if (row) { row.lastAccessedAt = Date.now(); s.put(row); }
          resolve(row);
        };
        req.onerror = () => resolve(null);
      } catch (_) { resolve(null); }
    });
  }

  async function draw(canvas, key) {
    const row = await get(key);
    if (!row?.blob || !canvas) return false;
    try {
      const ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
      let source = null, revoke = null;
      if (window.createImageBitmap) source = await createImageBitmap(row.blob);
      else {
        const url = URL.createObjectURL(row.blob); revoke = () => URL.revokeObjectURL(url);
        source = await new Promise((resolve,reject) => { const img = new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=url; });
      }
      ctx.fillStyle = "#000"; ctx.fillRect(0,0,w,h);
      const sw = source.width || 1, sh = source.height || 1, scale = Math.min(w/sw,h/sh), dw=sw*scale, dh=sh*scale;
      ctx.drawImage(source,(w-dw)/2,(h-dh)/2,dw,dh);
      source.close?.(); revoke?.();
      canvas.dataset.snapshotSource = "device-cache";
      return true;
    } catch (_) { return false; }
  }

  async function renderOrCache(canvas, input, renderFn) {
    const r = recipe(input), key = cacheKey(r);
    if (await draw(canvas, key)) return {source:"cache",key};
    try { renderFn?.(canvas, r); } catch (_) {}
    setTimeout(() => putCanvas(canvas, r).catch(() => {}), 0);
    return {source:"render",key};
  }

  async function prune() {
    const db = await openDb();
    if (!db) return {items:0,bytes:0,removed:0};
    const rows = await new Promise(resolve => {
      try { const tx=db.transaction(STORE,"readonly"), req=tx.objectStore(STORE).getAll(); req.onsuccess=()=>resolve(req.result||[]); req.onerror=()=>resolve([]); } catch (_) { resolve([]); }
    });
    let bytes = rows.reduce((s,r)=>s+(Number(r.bytes)||0),0), removed = 0;
    if (rows.length <= MAX_ITEMS && bytes <= MAX_BYTES) return {items:rows.length,bytes,removed};
    rows.sort((a,b)=>(Number(a.lastAccessedAt)||0)-(Number(b.lastAccessedAt)||0));
    const db2 = await openDb();
    for (const row of rows) {
      if (rows.length-removed <= MAX_ITEMS && bytes <= MAX_BYTES) break;
      await new Promise(resolve => { try { const tx=db2.transaction(STORE,"readwrite"); tx.objectStore(STORE).delete(row.key); tx.oncomplete=()=>resolve(); tx.onerror=()=>resolve(); } catch (_) { resolve(); } });
      bytes -= Number(row.bytes)||0; removed++;
    }
    return {items:Math.max(0,rows.length-removed),bytes:Math.max(0,bytes),removed};
  }

  async function stats() {
    const db = await openDb();
    if (!db) return {available:false,items:0,bytes:0,maxItems:MAX_ITEMS,maxBytes:MAX_BYTES};
    const rows = await new Promise(resolve => { try { const tx=db.transaction(STORE,"readonly"),req=tx.objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>resolve([]); } catch (_) { resolve([]); } });
    let quota = null, usage = null;
    try { const e = await navigator.storage?.estimate?.(); quota=e?.quota??null; usage=e?.usage??null; } catch (_) {}
    return {available:true,items:rows.length,bytes:rows.reduce((s,r)=>s+(Number(r.bytes)||0),0),maxItems:MAX_ITEMS,maxBytes:MAX_BYTES,storageUsage:usage,storageQuota:quota};
  }

  async function clear() {
    const db = await openDb(); if (!db) return false;
    return new Promise(resolve => { try { const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).clear();tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false); } catch (_) { resolve(false); } });
  }

  async function loadPolicies(force = false) {
    if (policyMap && !force) return policyMap;
    if (policyPromise && !force) return policyPromise;
    policyPromise = (async () => {
      const map = new Map();
      try {
        const r = await fetch(POLICY_API,{method:"POST",headers:{"Content-Type":"application/json",apikey:API_KEY},body:JSON.stringify({action:"policies"})});
        const d = await r.json();
        if (r.ok) for (const x of d.items || []) map.set(String(x.patternId), x);
      } catch (_) {}
      for (const id of MOTHER_IDS) if (!map.has(id)) map.set(id,{patternId:id,tier:"mother",imagePolicy:"server_allowed",canonicalImageUrl:null});
      policyMap = map; policyPromise = null; return map;
    })();
    return policyPromise;
  }

  async function policy(patternId) {
    const map = await loadPolicies();
    return map.get(String(patternId || "")) || {patternId:String(patternId||""),tier:"derived",imagePolicy:"cache_only",canonicalImageUrl:null};
  }

  function stripHeavyVisuals(value) {
    if (value == null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(stripHeavyVisuals);
    const out = {};
    for (const [k,v] of Object.entries(value)) {
      if (k === "dataUrl" || k === "imageDataUrl" || k === "blob" || k === "imageBlob") continue;
      out[k] = stripHeavyVisuals(v);
    }
    return out;
  }

  function installPreviewCache() {
    const S = window.SetkaApp;
    if (!S?.renderPreview || S.renderPreview.__setkaVisualCacheWrapped) return;
    const raw = S.renderPreview.bind(S);
    const wrapped = function(canvas, config, frame = 44, patternId = null) {
      const pid = patternId || config?.patternId || "tentacle-orbit";
      let version = 1;
      try { version = S.getPatterns?.().find(x => x.id === pid)?.version || 1; } catch (_) {}
      let configHash = null;
      try { configHash = S.configKey?.(config, pid) || null; } catch (_) {}
      const r = recipe({patternId:pid,patternVersion:version,configHash,frame,config});
      raw(canvas, config, frame, pid);
      draw(canvas, cacheKey(r)).then(hit => { if (!hit) putCanvas(canvas, r).catch(() => {}); }).catch(() => {});
    };
    wrapped.__setkaVisualCacheWrapped = true;
    wrapped.__setkaRaw = raw;
    S.renderPreview = wrapped;
  }

  function drawCanonicalImage(canvas, url) {
    if (!canvas || !url || canvas.dataset.canonicalAssetUrl === url) return;
    const img = new Image();
    img.onload = () => {
      try {
        const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height,s=Math.min(w/img.width,h/img.height),dw=img.width*s,dh=img.height*s;
        ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);
        canvas.dataset.canonicalAssetUrl=url;
        canvas.dataset.snapshotSource="server-canonical-asset";
      } catch (_) {}
    };
    img.src=url;
  }

  async function applyCanonicalBaseAssets(root = document) {
    const map = await loadPolicies();
    const tiles = root.matches?.(".pattern-tile.base-tile") ? [root] : root.querySelectorAll?.(".pattern-tile.base-tile") || [];
    for (const tile of tiles) {
      const pid=tile.dataset.patternId, p=map.get(String(pid||""));
      if (p?.imagePolicy !== "server_preferred" || !p?.canonicalImageUrl) continue;
      const canvas=tile.querySelector("canvas.thumb-canvas");
      drawCanonicalImage(canvas,p.canonicalImageUrl);
    }
  }

  window.__SETKA_VISUAL_CACHE_V40__ = {
    version:2,
    rendererVersion:RENDERER_VERSION,
    limits:{maxItems:MAX_ITEMS,maxBytes:MAX_BYTES,maxSide:MAX_SIDE},
    recipe,cacheKey,metadata,putCanvas,putDataUrl,get,draw,renderOrCache,prune,stats,clear,loadPolicies,policy,stripHeavyVisuals,applyCanonicalBaseAssets,
    motherPatternIds:[...MOTHER_IDS]
  };

  installPreviewCache();
  loadPolicies().then(()=>applyCanonicalBaseAssets()).catch(() => {});
  new MutationObserver(records=>{for(const rec of records)for(const n of rec.addedNodes)if(n.nodeType===1)applyCanonicalBaseAssets(n)}).observe(document.documentElement,{childList:true,subtree:true});
})();