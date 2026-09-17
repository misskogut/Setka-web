(() => {
  "use strict";
  if (window.__SETKA_ADMIN_VISUAL_ASSETS_V40__) return;
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-visual-assets-v40";
  const KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const ADMIN_KEY="setka-research:admin-key:v1";
  const names={
    "tentacle-orbit":"Tentacle Orbit","dandelion":"Одуванчик","fish-wave":"Носовая волна",
    "breathing-fractal":"Breathing Fractal","breathing-fractal-growth":"Breathing Fractal · Growth",
    "rgb-glitch-rings":"RGB Glitch Rings","stereo-dna":"Stereo DNA"
  };
  let items=[],busy=false,timer=0;
  const esc=v=>String(v??"").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  async function post(body){const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`http_${r.status}`);return d}
  async function load(){try{const d=await post({action:"policies"});items=d.items||[];render()}catch(e){console.warn("SETKA visual asset policies load failed",e)}}
  async function save(row){if(busy)return;busy=true;try{const adminKey=localStorage.getItem(ADMIN_KEY)||"";if(!adminKey)throw new Error("admin_key_required");const patternId=row.querySelector("[data-va-pattern]")?.value?.trim()||row.dataset.patternId;const tier=row.querySelector("[data-va-tier]")?.value||"derived";const imagePolicy=row.querySelector("[data-va-policy]")?.value||"cache_only";const canonicalImageUrl=row.querySelector("[data-va-url]")?.value?.trim()||null;await post({action:"admin-set-policy",adminKey,patternId,tier,imagePolicy,canonicalImageUrl});await load()}catch(e){alert(`Не удалось сохранить политику: ${e.message||e}`)}finally{busy=false}}
  function rowHtml(x,isNew=false){return `<div class="card" data-va-row data-pattern-id="${esc(x.patternId||"")}" style="margin:8px 0;padding:12px"><div class="small" style="margin-bottom:8px">${isNew?"НОВАЯ ПОЛИТИКА":esc(names[x.patternId]||x.patternId)}</div>${isNew?`<input data-va-pattern class="input" placeholder="patternId" style="width:100%;margin-bottom:8px">`:``}<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><select data-va-tier class="input"><option value="mother" ${x.tier==="mother"?"selected":""}>mother</option><option value="derived" ${x.tier==="derived"?"selected":""}>derived</option><option value="special" ${x.tier==="special"?"selected":""}>special</option></select><select data-va-policy class="input"><option value="cache_only" ${x.imagePolicy==="cache_only"?"selected":""}>cache_only</option><option value="server_allowed" ${x.imagePolicy==="server_allowed"?"selected":""}>server_allowed</option><option value="server_preferred" ${x.imagePolicy==="server_preferred"?"selected":""}>server_preferred</option></select></div><input data-va-url class="input" value="${esc(x.canonicalImageUrl||"")}" placeholder="HTTPS URL канонического изображения · необязательно" style="width:100%;margin-top:8px"><button data-va-save class="btn" style="margin-top:8px">Сохранить</button></div>`}
  function render(){const host=document.getElementById("tab-pattern-knowledge");if(!host)return;let box=document.getElementById("st40VisualAssetPolicies");if(!box){box=document.createElement("div");box.id="st40VisualAssetPolicies";host.prepend(box)}box.innerHTML=`<div class="card" style="margin-bottom:14px"><div class="brand">VISUAL ASSET POLICY</div><div class="small muted" style="margin-top:6px">По умолчанию производные визуалы живут только в локальном кэше и восстанавливаются из рецепта. Материнским и специальным паттернам можно разрешить постоянный серверный ассет.</div></div>${items.map(x=>rowHtml(x)).join("")}${rowHtml({tier:"special",imagePolicy:"cache_only"},true)}`;box.querySelectorAll("[data-va-row]").forEach(row=>row.querySelector("[data-va-save]")?.addEventListener("click",()=>save(row)))}
  const mo=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(render,40)});mo.observe(document.body,{childList:true,subtree:true});
  document.getElementById("refreshBtn")?.addEventListener("click",()=>load());
  setTimeout(load,500);
  window.__SETKA_ADMIN_VISUAL_ASSETS_V40__={load,render,get items(){return items.slice()}};
})();