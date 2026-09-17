(() => {
  "use strict";
  if (window.__SETKA_ADMIN_MOTHER_SNAPSHOTS_V40__) return;

  const API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-visual-assets-v40";
  const KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const ADMIN_KEY = "setka-research:admin-key:v1";
  const RENDERER = "standalone-renderer-v40.html?v=40-mother-renderer-1";
  let running = false, completed = false, last = null;

  function adminKey(){try{return localStorage.getItem(ADMIN_KEY)||""}catch(_){return ""}}
  async function post(body){const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`http_${r.status}`);return d}
  function ensureStatus(){const host=document.getElementById("tab-pattern-knowledge");if(!host)return null;let box=document.getElementById("st40MotherSnapshotStatus");if(!box){box=document.createElement("div");box.id="st40MotherSnapshotStatus";box.className="card";box.style.marginBottom="14px";host.prepend(box)}return box}
  function status(text,detail=""){const box=ensureStatus();if(!box)return;box.innerHTML=`<div class="brand">MOTHER SNAPSHOTS</div><div class="small muted" style="margin-top:6px">${text}</div>${detail?`<div class="small muted" style="margin-top:4px">${detail}</div>`:""}`}
  function waitRenderer(iframe){return new Promise((resolve,reject)=>{let tries=0;const tick=()=>{tries++;try{const S=iframe.contentWindow?.SetkaApp;if(S?.renderPreview&&S?.getPatterns)return resolve(S)}catch(_){}if(tries>80)return reject(new Error("renderer_timeout"));setTimeout(tick,100)};iframe.onload=tick;setTimeout(tick,120)})}
  function previewDataUrl(S,item){const c=document.createElement("canvas");const vp=item.viewport||item.capsule?.viewport||{};c.width=Math.max(120,Math.min(360,Number(vp.width)||180));c.height=Math.max(120,Math.min(360,Number(vp.height)||180));S.renderPreview(c,item.config||{},Number(item.frame ?? item.capsule?.frame ?? 44),item.patternId);let d=c.toDataURL("image/webp",.72);if(!d.startsWith("data:image/webp"))d=c.toDataURL("image/jpeg",.76);return d}

  async function materialize(force=false){
    const ak=adminKey();if(!ak||running)return false;running=true;
    let iframe=null;
    try{
      const before=await post({action:"mother-capsules"}),items=before.items||[];
      const targets=force?items:items.filter(x=>!x.snapshotDataUrl);
      last={total:items.length,stored:items.length-targets.length,pending:targets.length};
      status(`Сохранено ${last.stored} из ${last.total}.`,targets.length?`Материализую ещё ${targets.length} точных стартовых кадров…`:"Все стартовые слепки уже в системе.");
      if(!targets.length){completed=true;return true}
      iframe=document.createElement("iframe");iframe.src=RENDERER;iframe.setAttribute("aria-hidden","true");iframe.style.cssText="position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:-9999px;border:0";document.body.appendChild(iframe);
      const S=await waitRenderer(iframe);
      let stored=last.stored;
      for(const item of targets){
        const dataUrl=previewDataUrl(S,item);
        await post({action:"admin-store-mother-preview",adminKey:ak,patternId:item.patternId,dataUrl});
        stored++;
        status(`Сохранено ${stored} из ${items.length}.`,`Последний: ${item.patternId}`);
      }
      const after=await post({action:"mother-capsules"}),ready=(after.items||[]).filter(x=>!!x.snapshotDataUrl).length;
      last={total:(after.items||[]).length,stored:ready,pending:(after.items||[]).length-ready};
      completed=last.pending===0;
      status(`Сохранено ${last.stored} из ${last.total}.`,completed?"Капсула + серверный WebP готовы для всех стартовых паттернов.":`Осталось ${last.pending}.`);
      return completed;
    }catch(e){console.warn("SETKA mother snapshot materialization failed",e);status("Автоматическое сохранение стартовых слепков не завершено.",String(e?.message||e));return false}
    finally{running=false;iframe?.remove()}
  }

  document.addEventListener("click",e=>{if(e.target?.closest?.('[data-tab="pattern-knowledge"]'))setTimeout(()=>materialize(false),250)});
  document.getElementById("refreshBtn")?.addEventListener("click",()=>setTimeout(()=>materialize(false),300));
  const timer=setInterval(()=>{if(completed){clearInterval(timer);return}if(adminKey())materialize(false)},2200);
  setTimeout(()=>{if(adminKey())materialize(false);else status("Ожидаю вход администратора.","После входа семь исходных паттернов материализуются автоматически.")},600);

  window.__SETKA_ADMIN_MOTHER_SNAPSHOTS_V40__={version:1,materialize,get state(){return{running,completed,last}}};
})();