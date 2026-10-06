(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-community-patterns-v38";
  const API_KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  let items=[],metrics=null,patternMetrics=[],publicNotes=[],busy=false,notesBusy=false,timer=0,lastOkAt=null,lastError=null;

  const style=document.createElement("style");
  style.textContent=`
    #st40CommunityTabs{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:0 0 10px;padding:4px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:#060606}
    #st40CommunityTabs button{height:36px;border:0;border-radius:14px;background:transparent;color:rgba(255,255,255,.46);font-size:11px}
    #st40CommunityTabs button.active{background:#fff;color:#000;font-weight:650}
    #st40CommunityMetrics{grid-column:1/-1;border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:16px;margin:2px 0 10px;background:#070707;text-align:left}
    .st40-cm-kicker{font-size:9px;letter-spacing:.22em;color:rgba(255,255,255,.4);margin-bottom:6px}
    .st40-cm-title{font-size:19px;font-weight:700;margin-bottom:5px}
    .st40-cm-copy{font-size:10px;line-height:1.45;color:rgba(255,255,255,.45);margin-bottom:13px}
    .st40-cm-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
    .st40-cm-metric{border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:9px;min-width:0}
    .st40-cm-metric b{display:block;font-size:17px;line-height:1.1}
    .st40-cm-metric span{display:block;font-size:8px;line-height:1.25;color:rgba(255,255,255,.42);margin-top:4px}
    .st40-cm-sub{font-size:9px;letter-spacing:.16em;color:rgba(255,255,255,.38);margin:14px 0 7px}
    .st40-cm-patterns{display:grid;gap:6px}
    .st40-cm-pattern{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;font-size:9px;color:rgba(255,255,255,.52);padding:7px 0;border-top:1px solid rgba(255,255,255,.06)}
    .st40-cm-pattern:first-child{border-top:0}
    .st40-cm-pattern strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(255,255,255,.76);font-weight:600}
    .st40-community-meta{position:absolute;left:7px;bottom:7px;padding:4px 6px;border-radius:10px;background:rgba(0,0,0,.7);font-size:8px;line-height:1;color:rgba(255,255,255,.75);pointer-events:none}
    #st40CommunityNotes{grid-column:1/-1;display:grid;gap:10px;width:100%}
    .st40-note-card{border:1px solid rgba(255,255,255,.12);border-radius:20px;background:#080808;padding:12px;text-align:left}
    .st40-note-card canvas{display:block;width:100%;aspect-ratio:1.42/1;border-radius:15px;background:#000}
    .st40-note-text{font-size:13px;line-height:1.5;color:#fff;margin-top:10px;white-space:pre-wrap}
    .st40-note-meta{font-size:9px;line-height:1.45;color:rgba(255,255,255,.4);margin-top:7px}
    .st40-note-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}
    .st40-note-actions button{min-height:38px;border-radius:19px;font-size:10px}
    .st40-note-open{background:transparent;border:1px solid rgba(255,255,255,.18);color:#fff}
    .st40-note-save{background:#fff;border:1px solid #fff;color:#000;font-weight:650}
    .st40-note-save.saved{background:#151515;border-color:rgba(255,255,255,.1);color:rgba(255,255,255,.45)}
    .st40-community-empty{grid-column:1/-1;border:1px dashed rgba(255,255,255,.12);border-radius:18px;padding:24px;text-align:center;font-size:11px;line-height:1.5;color:rgba(255,255,255,.4)}
  `;
  document.head.appendChild(style);

  function fmtN(v){return new Intl.NumberFormat("ru-RU").format(Number(v)||0)}
  function data(){return C.getData?.()||{}}
  function communitySection(){return data().settings?.communitySection||"patterns"}
  function setCommunitySection(v){const d=data();d.settings=d.settings||{};d.settings.communitySection=v;C.save?.();applySection()}
  function clearLegacyLocal(){try{const d=data();if(Array.isArray(d.localCommunity)&&d.localCommunity.length){d.localCommunity=[];C.save?.()}}catch(_){}}

  function renderTabs(){
    const panel=document.getElementById("communityPanel");if(!panel)return null;
    let tabs=document.getElementById("st40CommunityTabs");
    if(!tabs){tabs=document.createElement("div");tabs.id="st40CommunityTabs";panel.prepend(tabs)}
    const section=communitySection();
    tabs.innerHTML=`<button type="button" data-section="patterns" class="${section==="patterns"?"active":""}">Конфигурации</button><button type="button" data-section="notes" class="${section==="notes"?"active":""}">Заметки${publicNotes.length?` · ${fmtN(publicNotes.length)}`:""}</button>`;
    tabs.querySelectorAll("button").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();setCommunitySection(b.dataset.section)});
    return tabs;
  }

  function renderMetrics(){
    const panel=document.getElementById("communityPanel");if(!panel||!metrics)return;
    document.getElementById("st40CommunityMetrics")?.remove();
    const box=document.createElement("div");box.id="st40CommunityMetrics";
    const m=metrics||{},profiles=Number(m.activityProfiles??m.participants)||0,active=Number(m.activeProfiles30d??m.activeParticipants30d)||0;
    const rows=(patternMetrics||[]).map(x=>{
      const profiles=Number(x.activityProfiles??x.uniqueParticipants)||0;
      return `<div class="st40-cm-pattern"><strong>${Setka.getPatternTitle?.(x.patternId)||x.patternId}</strong><span>${fmtN(profiles)} проф. · ${fmtN(x.exposures)} эпиз. просмотра · ♥ ${fmtN(x.saves)}</span></div>`;
    }).join("");
    box.innerHTML=`<div class="st40-cm-kicker">ОБЩАЯ SETKA</div><div class="st40-cm-title">${fmtN(profiles)} профилей активности</div><div class="st40-cm-copy">Это псевдонимные браузерные/аккаунт-профили, а не подтверждённое число людей: один человек может использовать несколько устройств. Подключённых кабинетов тестировщиков сейчас ${fmtN(m.connectedTesters)}.</div><div class="st40-cm-grid"><div class="st40-cm-metric"><b>${fmtN(m.sessions)}</b><span>сессий</span></div><div class="st40-cm-metric"><b>${fmtN(m.exposures)}</b><span>эпизодов просмотра</span></div><div class="st40-cm-metric"><b>${fmtN(m.patterns)}</b><span>паттернов</span></div><div class="st40-cm-metric"><b>${fmtN(m.configurations)}</b><span>конфигураций</span></div><div class="st40-cm-metric"><b>${fmtN(m.saves)}</b><span>сохранений</span></div><div class="st40-cm-metric"><b>${fmtN(active)}</b><span>активных профилей за 30 дней</span></div></div>${rows?`<div class="st40-cm-sub">МЕТРИКИ ПАТТЕРНОВ</div><div class="st40-cm-patterns">${rows}</div>`:""}`;
    const tabs=renderTabs();if(tabs)tabs.after(box);else panel.prepend(box);
  }

  function decorateTiles(){
    const panel=document.getElementById("communityPanel");if(!panel)return;
    for(const tile of panel.querySelectorAll(".community-tile")){
      const item=items.find(x=>String(x.id)===String(tile.dataset.itemId));if(!item)continue;
      const badge=tile.querySelector(".community-count");if(badge)badge.textContent=`♥ ${fmtN(item.saveCount)} · ◉ ${fmtN(item.useCount)}`;
      let meta=tile.querySelector(".st40-community-meta");if(!meta){meta=document.createElement("span");meta.className="st40-community-meta";tile.appendChild(meta)}
      meta.textContent=`${fmtN(item.uniqueParticipants)} проф. · ${fmtN(item.sessionCount)} сесс.`;
    }
  }

  async function loadNotes(force=false){
    if(notesBusy)return;notesBusy=true;
    try{
      const loader=C.publicNotes?.load;
      publicNotes=typeof loader==="function"?await loader(100):[];
      if(communitySection()==="notes")renderNotes();
      renderTabs();
    }catch(_){if(force)publicNotes=[]}finally{notesBusy=false}
  }

  function renderNotes(){
    const panel=document.getElementById("communityPanel");if(!panel)return;
    document.getElementById("st40CommunityNotes")?.remove();
    const wrap=document.createElement("div");wrap.id="st40CommunityNotes";
    if(!publicNotes.length){wrap.innerHTML='<div class="st40-community-empty">Пока нет заметок, прошедших модерацию SETKA.</div>';panel.appendChild(wrap);return}
    for(const note of publicNotes){
      const card=document.createElement("article");card.className="st40-note-card";
      if(note.config){
        const canvas=document.createElement("canvas");canvas.width=720;canvas.height=500;card.appendChild(canvas);
        requestAnimationFrame(()=>{try{C.publicNotes?.drawPreview?.(canvas,note)}catch(_){}});
      }
      const text=document.createElement("div");text.className="st40-note-text";text.textContent=note.text||"";card.appendChild(text);
      const meta=document.createElement("div");meta.className="st40-note-meta";const title=Setka.getPatternTitle?.(note.patternId)||note.patternId||"Паттерн";meta.textContent=`${title}${note.saves?` · сохранили ${Number(note.saves)}`:""}`;card.appendChild(meta);
      const actions=document.createElement("div");actions.className="st40-note-actions";
      const open=document.createElement("button");open.type="button";open.className="st40-note-open";open.textContent="Открыть паттерн";open.onclick=()=>C.publicNotes?.open?.(note);
      const save=document.createElement("button");save.type="button";save.className="st40-note-save";
      const already=(C.getData?.()?.notes||[]).some(x=>x.publicNoteId===note.id&&x.sourceType==="public_note");
      save.textContent=already?"Сохранено ✓":"Сохранить себе";if(already)save.classList.add("saved");
      else save.onclick=async()=>{save.disabled=true;try{await C.publicNotes?.save?.(note);save.textContent="Сохранено ✓";save.classList.add("saved")}catch(_){save.disabled=false;save.textContent="Не удалось"}};
      actions.append(open,save);card.appendChild(actions);wrap.appendChild(card);
    }
    panel.appendChild(wrap);
  }

  function applySection(){
    const panel=document.getElementById("communityPanel");if(!panel)return;
    const section=communitySection();
    renderTabs();
    const metricsBox=document.getElementById("st40CommunityMetrics");
    if(metricsBox)metricsBox.style.display=section==="patterns"?"":"none";
    panel.querySelectorAll(".community-tile,.empty-favorites").forEach(el=>el.style.display=section==="patterns"?"":"none");
    const modes=document.getElementById("st34CommunityModes");if(modes)modes.style.display=section==="patterns"?"":"none";
    if(section==="notes"){
      renderNotes();loadNotes(false);
      const title=document.getElementById("libraryTitle");if(title)title.textContent="Сообщество · Заметки";
    }else{
      document.getElementById("st40CommunityNotes")?.remove();
      const title=document.getElementById("libraryTitle");if(title)title.textContent="Сообщество";
      renderMetrics();decorateTiles();
    }
  }

  function sessionUsages(){
    const out=[],d=data();
    for(const s of d.sessions||[]){const events=(d.events||[]).filter(e=>e.sessionId===s.id&&["pattern_open","pattern_state","color","favorite_save"].includes(e.type));const configs=new Map();for(const e of events){const st=e.payload?.state;if(st?.configKey)configs.set(st.configKey,{sessionId:s.id,configKey:st.configKey,saved:configs.get(st.configKey)?.saved||e.type==="favorite_save"})}out.push(...configs.values())}
    return out;
  }
  function personalScore(item){const key=item.config_key||item.configKey||Setka.configKey?.(item.config||{}),uses=sessionUsages().filter(u=>u.configKey===key);if(!uses.length)return(Number(item.saveCount)||0)*.03;const d=data();let score=0;for(const u of uses){const s=(d.sessions||[]).find(x=>x.id===u.sessionId);if(!s)continue;const delta=Number(s.postState)-Number(s.preState);score+=(Number.isFinite(delta)?delta:0)*2+(s.helped===2?2:s.helped===1?1:0)+(u.saved?1.5:0)}return score/uses.length+(Number(item.saveCount)||0)*.03}
  function mode(){return data().settings?.communityMode||"for_me"}
  function sorted(){const a=items.slice(),m=mode();if(m==="new")return a.sort((x,y)=>Date.parse(y.createdAt||0)-Date.parse(x.createdAt||0));if(m==="popular")return a.sort((x,y)=>(Number(y.saveCount)||0)-(Number(x.saveCount)||0)||Date.parse(y.createdAt||0)-Date.parse(x.createdAt||0));return a.sort((x,y)=>personalScore(y)-personalScore(x)||Date.parse(y.createdAt||0)-Date.parse(x.createdAt||0))}
  function syncModeUi(){const bar=document.getElementById("st34CommunityModes");bar?.querySelectorAll("button[data-m]").forEach(b=>b.classList.toggle("active",b.dataset.m===mode()))}
  function apply(){
    clearLegacyLocal();const shown=sorted();C.publicCommunity=shown;Setka.setCommunity?.(shown);syncModeUi();renderTabs();renderMetrics();decorateTiles();applySection();
    window.dispatchEvent(new CustomEvent("setka:community-cloud",{detail:{ok:true,count:shown.length,mode:mode(),updatedAt:lastOkAt,metrics,patternMetrics}}));
  }
  async function refresh(){
    if(busy)return;busy=true;lastError=null;
    try{
      const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify({action:"feed",limit:300})});
      const out=await r.json().catch(()=>({}));if(!r.ok)throw new Error(out.error||`community_${r.status}`);
      items=Array.isArray(out.items)?out.items.map(x=>({...x,createdAt:x.created_at||x.createdAt||null,localOnly:false})):[];
      metrics=out.metrics&&typeof out.metrics==="object"?out.metrics:null;patternMetrics=Array.isArray(out.patternMetrics)?out.patternMetrics:[];
      lastOkAt=new Date().toISOString();apply();if(communitySection()==="notes")loadNotes(true);
    }catch(e){lastError=String(e?.message||e);clearLegacyLocal();if(!items.length){C.publicCommunity=[];Setka.setCommunity?.([])}window.dispatchEvent(new CustomEvent("setka:community-cloud",{detail:{ok:false,error:lastError}}))}finally{busy=false}
  }
  function schedule(ms=600){clearTimeout(timer);timer=setTimeout(refresh,ms)}

  document.addEventListener("click",e=>{const b=e.target?.closest?.("#st34CommunityModes button[data-m]");if(!b)return;e.preventDefault();e.stopImmediatePropagation();const d=data();d.settings=d.settings||{};d.settings.communityMode=b.dataset.m;C.save?.();apply()},true);
  window.addEventListener("setka:favorite-saved",()=>{clearLegacyLocal();apply();schedule(900)});
  window.addEventListener("setka:favorite-removed",()=>{clearLegacyLocal();apply();schedule(900)});
  window.addEventListener("setka:v34-sync",e=>{if(e.detail?.ok)schedule(120);else schedule(1200)});
  window.addEventListener("setka:library-page",e=>{if(e.detail?.page==="community"){applySection();schedule(0)}});

  async function bootstrap(){clearLegacyLocal();try{await C.sandbox?.sync?.()}catch(_){}await Promise.all([refresh(),loadNotes(true)]);setTimeout(refresh,1800)}
  bootstrap();
  C.cloudCommunity={refresh,status:()=>({count:items.length,lastOkAt,lastError,mode:mode(),section:communitySection(),metrics,patternMetrics,publicNotes:publicNotes.length})};
  window.__SETKA_CLOUD_COMMUNITY_V38__=6;
})();