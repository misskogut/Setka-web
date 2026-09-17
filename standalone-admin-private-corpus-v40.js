(() => {
  "use strict";
  if(window.__SETKA_ADMIN_PRIVATE_CORPUS_V40__) return;

  const SANDBOX_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-standalone-v34";
  const ARCHIVE_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-tester-archive-v37";
  const API_KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const previousFetch = window.fetch.bind(window);

  const response = (body, status=200) => new Response(JSON.stringify(body), {
    status,
    headers:{"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":"*"}
  });

  async function post(url, body){
    const r = await previousFetch(url, {
      method:"POST",
      headers:{"Content-Type":"application/json",apikey:API_KEY},
      body:JSON.stringify(body)
    });
    const out = await r.json().catch(()=>({}));
    if(!r.ok){ const e=new Error(out.error||`http_${r.status}`); e.status=r.status; throw e; }
    return out;
  }

  window.fetch = async function(input, init={}){
    const url = typeof input === "string" ? input : (input?.url || "");
    if(!url.includes("/functions/v1/setka-standalone-v34")) return previousFetch(input, init);

    let body={};
    try{ body = typeof init.body === "string" ? JSON.parse(init.body) : {}; }catch(_){ body={}; }
    if(body.action !== "admin-device") return previousFetch(input, init);

    const base = await previousFetch(input, init);
    let json=null;
    try{ json = await base.clone().json(); }catch(_){ return base; }
    if(!base.ok || !body.adminKey || !body.deviceId) return base;

    try{
      const privateResult = await post(ARCHIVE_API, {
        action:"admin-device",
        adminKey:body.adminKey,
        deviceId:body.deviceId
      });
      const a = privateResult?.archive;
      if(!a) return base;

      json.snapshot = {
        schema_version:a.schemaVersion || 40,
        captured_at:a.capturedAt || null,
        updated_at:a.updatedAt || null,
        payload:a.payload || {}
      };
      json.privateCorpus = {
        active:true,
        privacy:"private-admin-only",
        testerId:a.testerId || null,
        deviceId:a.deviceId || body.deviceId,
        counts:a.counts || {},
        favorites:a.favorites || [],
        updatedAt:a.updatedAt || null
      };
      json.privacyMode = "private-personal-corpus";
      json.legacyData = false;
      return response(json, base.status);
    }catch(_){
      return base;
    }
  };

  window.__SETKA_ADMIN_PRIVATE_CORPUS_V40__ = {active:true, mode:"private-personal-corpus"};
})();