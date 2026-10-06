(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-community-patterns-v38";
  const API_KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  let items=[],metrics=null,patternMetrics=[],busy=false,timer=0,lastOkAt=null,lastError=null;

  const style=document.createElement("style");
  style.textContent=`
    #st40CommunityMetrics{grid-column:1/-1;border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:16px;margin:2px 0 10px;background:#070707;text-align:left}
    .st40-cm-kicker{font-size:9px;letter-spacing:.22em;color:rgba(255,255,255,.4);margin-bottom:6px}
    .st40-cm-title{font-size:19px;font-weight:700;margin-bottom:5px}
    .st40-cm-copy{font-size:10px;line-height:1.45;color:rgba(255,255,255,.45);margin-bottom:13px}
    .st40-cm-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
    .st40-cm-metric{border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:9px;min-width:0}
    .st40-cm-metric b{display:block;font-size:17px;line-height:1.1}
    .st40-cm-metric span{display:block;font-size:8px;line-height:1.25;color:rgba(255,255,255,.42);margin-top:4px}
    .st40-cm-sub{font-size:9px;letter-spacing:.16em;color:rgba(255,255,255,.38);margin:14px 0 7px}
    .st40-cm-patterns{display:grid;gap:5px}
    .st40-cm-pattern{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;font-size:9px;color:rgba(255,255,255,.52)}
    .st40-cm-pattern strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(255,255,255,.72);font-weight:500}
    .st40-community-meta{position:absolute;left:7px;bottom:7px;padding:4px 6px;border-radius:10px;background:rgba(0,0,0,.65);font-size:8px;line-height:1;color:rgba(255,255,255,.72);pointer-events:none}
  `;
  document.head.appendChild(style);

  function fmtN(v){return new Intl.NumberFormat("ru-RU").format(Number(v)||0)}
  function renderMetrics(){
    const panel=document.getElementById("communityPanel");if(!panel||!metrics)return;
    document.getElementById("st40CommunityMetrics")?.remove();
    const box=document.createElement("div");box.id="st40CommunityMetrics";
    const m=metrics||{};
    const rows=(patternMetrics||[]).map(x=>`<div class="st40-cm-pattern"><strong>${Setka.getPatternTitle?.(x.patternId)||x.patternId}</strong><span>${fmtN(x.uniqueParticipants)} участ. · ${fmtN(x.exposures)} запусков · ♥ ${fmtN(x.saves)}</span></div>`).join("");
    box.innerHTML=`<div class="st40-cm-kicker">ОБЩАЯ SETKA</div><div class="st40-cm-title">${fmtN(m.participants)} участников</div><div class="st40-cm-copy">Анонимная агрегированная статистика сервиса. Личные кабинеты, Tester ID и приватные заметки здесь не показываются.</div><div class="st40-cm-grid"><div class="st40-cm-metric"><b>${fmtN(m.sessions)}</b><span>сессий</span></div><div class="st40-cm-metric"><b>${fmtN(m.exposures)}</b><span>экспозиций</span></div><div class="st40-cm-metric"><b>${fmtN(m.patterns)}</b><span>паттернов</span></div><div class="st40-cm-metric"><b>${fmtN(m.configurations)}</b><span>конфигураций</span></div><div class="st40-cm-metric"><b>${fmtN(m.saves)}</b><span>сохранений</span></div><div class="st40-cm-metric"><b>${fmtN(m.activeParticipants30d)}</b><span>активных за 30 дней</span></div></div>${rows?`<div class="st40-cm-sub">ПО ПАТТЕРНАМ</div><div class="st40-cm-patterns">${rows}</div>`:""}`;
    panel.prepend(box);
  }
  function decorateTiles(){
    const panel=document.getElementById("communityPanel");if(!panel)return;
    for(const tile of panel.querySelectorAll(".community-tile")){
      const item=items.find(x=>String(x.id)===String(tile.dataset.itemId));if(!item)continue;
      const badge=tile.querySelector(".community-count");if(badge)badge.textContent=`♥ ${fmtN(item.saveCount)} · ◉ ${fmtN(item.useCount)}`;
      let meta=tile.querySelector(".st40-community-meta");if(!meta){meta=document.createElement("span");meta.className="st40-community-meta";tile.appendChild(meta)}
      meta.textContent=`${fmtN(item.uniqueParticipants)} участ. · ${fmtN(item.sessionCount)} сесс.`;
    }
  }

  function data(){return C.getData?.()||{}}
  function clearLegacyLocal(){
    try{
      const d=data();
      if(Array.isArray(d.localCommunity)&&d.localCommunity.length){d.localCommunity=[];C.save?.()}
    }catch(_){}
  }
  function sessionUsages(){
    const out=[],d=data();
    for(const s of d.sessions||[]){
      const events=(d.events||[]).filter(e=>e.sessionId===s.id&&["pattern_open","pattern_state","color","favorite_save"].includes(e.type));
      const configs=new Map();
      for(const e of events){const st=e.payload?.state;if(st?.configKey)configs.set(st.configKey,{sessionId:s.id,configKey:st.configKey,saved:configs.get(st.configKey)?.saved||e.type==="favorite_save"})}
      out.push(...configs.values());
    }
    return out;
  }
  function personalScore(item){
    const key=item.config_key||item.configKey||Setka.configKey?.(item.config||{}),uses=sessionUsages().filter(u=>u.configKey===key);
    if(!uses.length)return(Number(item.saveCount)||0)*.03;
    const d=data();let score=0;
    for(const u of uses){const s=(d.sessions||[]).find(x=>x.id===u.sessionId);if(!s)continue;const delta=Number(s.postState)-Number(s.preState);score+=(Number.isFinite(delta)?delta:0)*2+(s.helped===2?2:s.helped===1?1:0)+(u.saved?1.5:0)}
    return score/uses.length+(Number(item.saveCount)||0)*.03;
  }
  function mode(){return data().settings?.communityMode||"for_me"}
  function sorted(){
    const a=items.slice(),m=mode();
    if(m==="new")return a.sort((x,y)=>Date.parse(y.createdAt||0)-Date.parse(x.createdAt||0));
    if(m==="popular")return a.sort((x,y)=>(Number(y.saveCount)||0)-(Number(x.saveCount)||0)||Date.parse(y.createdAt||0)-Date.parse(x.createdAt||0));
    return a.sort((x,y)=>personalScore(y)-personalScore(x)||Date.parse(y.createdAt||0)-Date.parse(x.createdAt||0));
  }
  function syncModeUi(){const bar=document.getElementById("st34CommunityModes");bar?.querySelectorAll("button[data-m]").forEach(b=>b.classList.toggle("active",b.dataset.m===mode()))}
  function apply(){
    clearLegacyLocal();
    const shown=sorted();
    C.publicCommunity=shown;
    Setka.setCommunity?.(shown);
    syncModeUi();
    renderMetrics();decorateTiles();
    window.dispatchEvent(new CustomEvent("setka:community-cloud",{detail:{ok:true,count:shown.length,mode:mode(),updatedAt:lastOkAt,metrics,patternMetrics}}));
  }
  async function refresh(){
    if(busy)return;busy=true;lastError=null;
    try{
      const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify({action:"feed",limit:300})});
      const out=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(out.error||`community_${r.status}`);
      items=Array.isArray(out.items)?out.items.map(x=>({...x,createdAt:x.created_at||x.createdAt||null,localOnly:false})):[];
      metrics=out.metrics&&typeof out.metrics==="object"?out.metrics:null;
      patternMetrics=Array.isArray(out.patternMetrics)?out.patternMetrics:[];
      lastOkAt=new Date().toISOString();apply();
    }catch(e){
      lastError=String(e?.message||e);clearLegacyLocal();
      if(!items.length){C.publicCommunity=[];Setka.setCommunity?.([])}
      window.dispatchEvent(new CustomEvent("setka:community-cloud",{detail:{ok:false,error:lastError}}));
    }finally{busy=false}
  }
  function schedule(ms=600){clearTimeout(timer);timer=setTimeout(refresh,ms)}

  document.addEventListener("click",e=>{
    const b=e.target?.closest?.("#st34CommunityModes button[data-m]");if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();
    const d=data();d.settings=d.settings||{};d.settings.communityMode=b.dataset.m;C.save?.();apply();
  },true);

  window.addEventListener("setka:favorite-saved",()=>{clearLegacyLocal();apply();schedule(900)});
  window.addEventListener("setka:favorite-removed",()=>{clearLegacyLocal();apply();schedule(900)});
  window.addEventListener("setka:v34-sync",e=>{if(e.detail?.ok)schedule(120);else schedule(1200)});
  window.addEventListener("setka:library-page",e=>{if(e.detail?.page==="community"){renderMetrics();decorateTiles();schedule(0)}});

  async function bootstrap(){
    clearLegacyLocal();
    try{await C.sandbox?.sync?.()}catch(_){}
    await refresh();
    setTimeout(refresh,1800);
  }
  bootstrap();
  C.cloudCommunity={refresh,status:()=>({count:items.length,lastOkAt,lastError,mode:mode(),metrics,patternMetrics})};
  window.__SETKA_CLOUD_COMMUNITY_V38__=5;
})();