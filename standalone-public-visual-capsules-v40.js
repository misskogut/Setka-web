(() => {
  "use strict";
  if (window.__SETKA_PUBLIC_VISUAL_CAPSULES_V40__) return;

  const NOTE_PATH = "/functions/v1/setka-public-notes-v37";
  const RENDERER_VERSION = "app-v7-multipattern@5b94738f2739691ddcbd899865d757408c44e8dc";
  const rawFetch = window.fetch.bind(window);
  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
  const finite = (v,d=null) => Number.isFinite(Number(v)) ? Number(v) : d;

  function urlOf(input){try{return typeof input === "string" ? input : (input?.url || "")}catch(_){return ""}}
  function bodyOf(init){if(typeof init?.body !== "string") return null; try{return JSON.parse(init.body)}catch(_){return null}}
  function patternVersion(pid){try{return window.SetkaApp?.getPatterns?.().find(x=>x.id===pid)?.version || 1}catch(_){return 1}}

  function recipeFor(note = {}) {
    const S = window.SetkaApp;
    const source = note.replaySnapshot || note.visualRecipe || note.visualCapsule || {};
    const rawConfig = source.config || note.config || note.state?.config || {};
    const hinted = source.patternId || note.patternId || note.state?.patternId || rawConfig.patternId || null;
    let config = clone(rawConfig), patternId = hinted || "tentacle-orbit";
    try { config = S?.cloneConfig?.(rawConfig, hinted) || config; patternId = config?.patternId || patternId; } catch (_) {}
    let configHash = source.configHash || note.configHash || note.state?.configKey || null;
    try { configHash = S?.configKey?.(config, patternId) || configHash; } catch (_) {}
    const frame = finite(source.frame ?? note.frame ?? note.visualSnapshot?.frame, 44);
    return {
      version: 1,
      rendererVersion: RENDERER_VERSION,
      rendererAsset: "app-v7-multipattern.js",
      patternId,
      patternVersion: Math.max(1, Math.round(finite(source.patternVersion ?? note.patternVersion, patternVersion(patternId)))),
      configHash,
      frame,
      seed: source.seed == null ? null : String(source.seed),
      viewport: {width:256,height:180,mode:"public-note"},
      config
    };
  }

  function encodePreview(recipe) {
    const S = window.SetkaApp;
    if (!S?.renderPreview) return null;
    const sizes = [[256,180,.68],[220,155,.64],[180,126,.60]];
    for (const [w,h,q] of sizes) {
      try {
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        S.renderPreview(c, clone(recipe.config), recipe.frame, recipe.patternId);
        let data = c.toDataURL("image/webp", q);
        if (!data.startsWith("data:image/webp")) data = c.toDataURL("image/jpeg", .72);
        if (data.length <= 235000) {
          recipe.viewport = {width:w,height:h,mode:"public-note"};
          return data;
        }
      } catch (_) {}
    }
    return null;
  }

  function transformedResponse(response, payload) {
    const headers = new Headers(response.headers);
    headers.set("Content-Type","application/json; charset=utf-8");
    return new Response(JSON.stringify(payload), {status:response.status,statusText:response.statusText,headers});
  }

  window.fetch = async function(input, init = {}) {
    const url = urlOf(input), body = bodyOf(init);
    const isNotes = url.includes(NOTE_PATH);
    const action = body?.action || null;

    if (isNotes && body && (action === "submit" || action === "publish") && body.note) {
      try {
        const visualCapsule = recipeFor(body.note);
        const publicPreviewDataUrl = encodePreview(visualCapsule);
        body.note = {...body.note, visualCapsule};
        if (publicPreviewDataUrl) body.note.publicPreviewDataUrl = publicPreviewDataUrl;
        init = {...init, body:JSON.stringify(body)};
      } catch (e) {
        console.warn("SETKA public visual capsule build failed", e);
      }
    }

    const response = await rawFetch(input, init);
    if (isNotes && action === "feed" && response.ok) {
      try {
        const payload = await response.clone().json();
        if (Array.isArray(payload.items)) {
          for (const item of payload.items) {
            if (item?.snapshotDataUrl) item.visualSnapshot = {...(item.visualSnapshot || {}), dataUrl:item.snapshotDataUrl, storage:"server-public-cache"};
            if (item?.visualCapsule && !item.visualRecipe) item.visualRecipe = item.visualCapsule;
          }
        }
        return transformedResponse(response, payload);
      } catch (_) {}
    }
    return response;
  };

  window.__SETKA_PUBLIC_VISUAL_CAPSULES_V40__ = {version:2, rendererVersion:RENDERER_VERSION, recipeFor, encodePreview, mode:"capsule-plus-small-server-preview"};
})();