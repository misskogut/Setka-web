(() => {
  "use strict";
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-standalone-v34";
  const API_KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const ADMIN_KEY="setka-research:admin-key:v1";
  const previousFetch=window.fetch.bind(window);
  let currentReplayKey=null,currentDeviceId=null,currentDigest=null,policyCache=null,busy=false;
  const esc=v=>String(v??"").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  const fmt=n=>new Intl.NumberFormat("ru-RU").format(Number(n)||0);
  const adminKey=()=>localStorage.getItem(ADMIN_KEY)||"";
  async function api(action,p={}){const r=await previousFetch(API,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify({action,adminKey:adminKey(),...p})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||d.detail||"request_failed");return d}
  function parseReplayKey(id){const s=String(id||"");if(s.startsWith("pv34free::")){const rest=s.slice(11),cut=rest.lastIndexOf("::");return cut>0?{deviceId:rest.slice(0,cut),replayKey:s}:null}if(s.startsWith("pv34::")){const p=s.split("::");return p.length>=3?{deviceId:p[1],replayKey:s}:null}return null}

  const style=document.createElement("style");style.textContent=`
    .v349-retention{margin-bottom:14px;border-color:rgba(255,255,255,.2)!important}.v349-retention-head{display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap}.v349-retention-head .grow{flex:1;min-width:240px}.v349-retention-buttons{display:flex;gap:7px;flex-wrap:wrap}.v349-retention-buttons button{height:36px;min-width:62px;border:1px solid rgba(255,255,255,.22);border-radius:18px;background:#080808;color:#fff;padding:0 12px}.v349-retention-buttons button.active{background:#fff;color:#000}.v349-retention-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:14px}.v349-rstat{border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:10px;background:#070707}.v349-rstat b{display:block;font-size:17px}.v349-rstat span{display:block;font-size:9px;color:rgba(255,255,255,.4);margin-top:3px}.v349-pin{margin-left:8px;height:34px!important;min-height:34px!important;padding:0 12px!important;font-size:10px!important}.v349-pin.saved{background:#fff!important;color:#000!important}.v349-raw-status{font-size:9px;color:rgba(255,255,255,.42);margin-left:8px}@media(max-width:760px){.v349-retention-grid{grid-template-columns:repeat(2,1fr)}}`;
  document.head.appendChild(style);

  async function loadPolicy(force=false){if(policyCache&&!force)return policyCache;policyCache=await api("admin-replay-policy");return policyCache}
  async function renderPanel(){
    const tab=document.getElementById("tab-overview");if(!tab||tab.classList.contains("hidden")||!adminKey())return;
    let box=tab.querySelector(".v349-retention");if(!box){box=document.createElement("div");box.className="card v349-retention";tab.prepend(box)}
    box.innerHTML='<div class="small muted">Загружаем политику Replay…</div>';
    try{
      const d=await loadPolicy(true),p=d.policy||{},s=d.stats||{},days=Number(p.retention_days)||90;
      box.innerHTML=`<div class="v349-retention-head"><div class="grow"><div class="section-title">Хранение Replay</div><div class="small muted">Подробные движения и скроллы — временная память. Смысловой digest с экранами, жестами, конфигурациями, временем внимания и UX-метриками остаётся постоянно.</div></div><div class="v349-retention-buttons"><button data-days="30">30 дней</button><button data-days="60">60 дней</button><button data-days="90">90 дней</button><button id="v349Compact">Сжать сейчас</button></div></div><div class="v349-retention-grid"><div class="v349-rstat"><b>${days}</b><span>дней RAW Replay</span></div><div class="v349-rstat"><b>${p.sample_hz||8} Гц</b><span>траектория пальца</span></div><div class="v349-rstat"><b>${fmt(s.rawEvents)}</b><span>RAW событий сейчас</span></div><div class="v349-rstat"><b>${fmt(s.replays)}</b><span>Replay / digest</span></div><div class="v349-rstat"><b>${fmt(s.pinned)}</b><span>сохранено без TTL</span></div></div>`;
      box.querySelectorAll("button[data-days]").forEach(b=>{b.classList.toggle("active",Number(b.dataset.days)===days);b.onclick=async()=>{if(busy)return;busy=true;try{await api("admin-set-replay-policy",{retentionDays:Number(b.dataset.days)});policyCache=null;await renderPanel()}catch(e){alert("Не удалось изменить срок Replay") }finally{busy=false}}});
      box.querySelector("#v349Compact").onclick=async()=>{if(busy)return;busy=true;const b=box.querySelector("#v349Compact");b.textContent="Сжимаем…";try{const r=await api("admin-compact-now");policyCache=null;await renderPanel();alert(`Удалено RAW событий: ${Number(r.removed)||0}`)}catch(e){alert("Не удалось выполнить сжатие") }finally{busy=false}};
    }catch(e){box.innerHTML='<div class="section-title">Хранение Replay</div><div class="small muted">Не удалось загрузить настройки хранения.</div>'}
  }

  async function loadCurrentDigest(){
    currentDigest=null;if(!currentReplayKey||!currentDeviceId)return null;
    try{const d=await api("admin-replay-digests",{deviceId:currentDeviceId});currentDigest=(d.items||[]).find(x=>x.replay_key===currentReplayKey)||null;return currentDigest}catch(_){return null}
  }
  async function injectPin(){
    const root=document.getElementById("journeyDetail");if(!root||!currentReplayKey||root.querySelector("#v349PinReplay"))return;
    const controls=root.querySelector(".journey-controls");if(!controls)return;
    const digest=await loadCurrentDigest();if(!digest)return;
    const b=document.createElement("button");b.id="v349PinReplay";b.className="btn v349-pin"+(digest.pinned?" saved":"");
    const compacted=!!digest.compacted_at&&!digest.pinned;
    b.textContent=digest.pinned?"RAW сохранён":compacted?"RAW уже сжат":"Сохранить RAW Replay";b.disabled=compacted;
    b.title=digest.pinned?"Этот Replay не удалится по сроку хранения":"Исключить этот Replay из автоматического удаления";
    if(!compacted)b.onclick=async()=>{b.disabled=true;try{const next=!currentDigest.pinned;await api("admin-pin-replay",{deviceId:currentDeviceId,replayKey:currentReplayKey,pinned:next});currentDigest.pinned=next;b.classList.toggle("saved",next);b.textContent=next?"RAW сохранён":"Сохранить RAW Replay";policyCache=null;renderPanel()}catch(_){alert("Не удалось изменить хранение Replay")}finally{b.disabled=false}};
    controls.appendChild(b);
    const s=document.createElement("span");s.className="v349-raw-status";s.textContent=digest.pinned?"без срока":compacted?"оставлен только digest":`RAW до ${new Date(digest.raw_until).toLocaleDateString("ru-RU")}`;controls.appendChild(s);
  }

  // Observe which Replay is opened, without changing the existing journey/replay implementation.
  window.fetch=async function(input,init={}){
    let body={};try{body=typeof init.body==="string"?JSON.parse(init.body):{}}catch(_){body={}}
    const action=body.action||"";
    const r=await previousFetch(input,init);
    if(action==="admin-journey"&&body.sessionId){const q=parseReplayKey(body.sessionId);if(q){currentReplayKey=q.replayKey;currentDeviceId=q.deviceId;currentDigest=null;setTimeout(injectPin,60)}}
    return r;
  };

  const dash=document.getElementById("dashboard");if(dash)new MutationObserver(()=>{if(!dash.classList.contains("hidden"))setTimeout(renderPanel,30)}).observe(dash,{attributes:true,attributeFilter:["class"]});
  const overviewTab=document.querySelector('.tab[data-tab="overview"]');overviewTab?.addEventListener("click",()=>setTimeout(renderPanel,30));
  const journey=document.getElementById("journeyDetail");if(journey)new MutationObserver(()=>setTimeout(injectPin,20)).observe(journey,{subtree:true,childList:true});
  document.getElementById("refreshBtn")?.addEventListener("click",()=>{policyCache=null;setTimeout(renderPanel,80)});
  setTimeout(renderPanel,250);
  window.SetkaReplayRetentionV349={refresh:()=>{policyCache=null;return renderPanel()},get currentReplayKey(){return currentReplayKey}};
})();