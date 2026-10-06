(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-community-patterns-v38";
  const API_KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const MODES=new Set(["for_me","popular","new","notes"]);
  let items=[],metrics=null,patternMetrics=[],publicNotes=[],busy=false,notesBusy=false,timer=0,lastOkAt=null,lastError=null,lastPage=null;

  const style=document.createElement("style");
  style.textContent=`
    #st34CommunityModes{gap:5px!important;margin:-3px auto 14px!important;flex-wrap:nowrap!important}
    #st34CommunityModes button{height:31px!important;padding:0 9px!important;font-size:9px!important;white-space:nowrap!important}
    #communityPanel .st40-community-meta,#st40CommunityMetrics,#st40CommunityTabs{display:none!important}
    #st40CommunityNotes{grid-column:1/-1;display:block;width:100%;padding:0 2px calc(env(safe-area-inset-bottom,0px) + 130px)}
    #st40CommunityNotes .st34-note-card{margin:0 0 14px}
    #st40CommunityNotes .st37-note-action{margin-top:10px}
    .st40-community-empty{border:1px dashed rgba(255,255,255,.12);border-radius:18px;padding:24px 16px;text-align:center;font-size:11px;line-height:1.5;color:rgba(255,255,255,.4);margin:10px 0}
  `;
  document.head.appendChild(style);

  const data=()=>C.getData?.()||{};
  function mode(){
    const m=data().settings?.communityMode||"for_me";
    return MODES.has(m)?m:"for_me";
  }
  function setMode(m){
    const d=data();d.settings=d.settings||{};d.settings.communityMode=MODES.has(m)?m:"for_me";
    if("communitySection" in d.settings)delete d.settings.communitySection;
    C.save?.();
  }
  function ensureModeButton(){
    const bar=document.getElementById("st34CommunityModes");if(!bar)return null;
    let notes=bar.querySelector('button[data-m="notes"]');
    if(!notes){notes=document.createElement("button");notes.type="button";notes.dataset.m="notes";notes.textContent="Заметки";bar.appendChild(notes)}
    return bar;
  }
  function syncModeUi(){
    const bar=ensureModeButton();if(!bar)return;
    const m=mode();bar.querySelectorAll("button[data-m]").forEach(b=>b.classList.toggle("active",b.dataset.m===m));
  }
  function clearLegacyLocal(){try{const d=data();if(Array.isArray(d.localCommunity)&&d.localCommunity.length){d.localCommunity=[];C.save?.()}}catch(_){}}
  function sessionUsages(){
    const out=[],d=data();
    for(const s of d.sessions||[]){const events=(d.events||[]).filter(e=>e.sessionId===s.id&&["pattern_open","pattern_state","color","favorite_save"].includes(e.type));const configs=new Map();for(const e of events){const st=e.payload?.state;if(st?.configKey)configs.set(st.configKey,{sessionId:s.id,configKey:st.configKey,saved:configs.get(st.configKey)?.saved||e.type==="favorite_save"})}out.push(...configs.values())}
    return out;
  }
  function personalScore(item){
    const key=item.config_key||item.configKey||Setka.configKey?.(item.config||{}),uses=sessionUsages().filter(u=>u.configKey===key);
    if(!uses.length)return(Number(item.saveCount)||0)*.03;
    const d=data();let score=0;
    for(const u of uses){const s=(d.sessions||[]).find(x=>x.id===u.sessionId);if(!s)continue;const delta=Number(s.postState)-Number(s.preState);score+=(Number.isFinite(delta)?delta:0)*2+(s.helped===2?2:s.helped===1?1:0)+(u.saved?1.5:0)}
    return score/uses.length+(Number(item.saveCount)||0)*.03;
  }
  function sorted(){
    const a=items.slice(),m=mode();
    if(m==="new")return a.sort((x,y)=>Date.parse(y.createdAt||0)-Date.parse(x.createdAt||0));
    if(m==="popular")return a.sort((x,y)=>(Number(y.saveCount)||0)-(Number(x.saveCount)||0)||Date.parse(y.createdAt||0)-Date.parse(x.createdAt||0));
    return a.sort((x,y)=>personalScore(y)-personalScore(x)||Date.parse(y.createdAt||0)-Date.parse(x.createdAt||0));
  }
  function cleanPatternTiles(){
    const panel=document.getElementById("communityPanel");if(!panel)return;
    panel.querySelectorAll(".st40-community-meta").forEach(x=>x.remove());
    panel.querySelectorAll(".community-tile").forEach(tile=>{
      const item=items.find(x=>String(x.id)===String(tile.dataset.itemId));
      const badge=tile.querySelector(".community-count");
      if(badge&&item)badge.textContent=`♥ ${Math.max(0,Number(item.saveCount)||0)}`;
    });
  }

  function renderPatterns(){
    document.getElementById("st40CommunityNotes")?.remove();
    const title=document.getElementById("libraryTitle");if(title)title.textContent="Сообщество";
    const shown=sorted();C.publicCommunity=shown;Setka.setCommunity?.(shown);syncModeUi();cleanPatternTiles();
  }

  async function loadNotes(force=false){
    if(notesBusy)return publicNotes;notesBusy=true;
    try{
      const loader=C.publicNotes?.load;
      publicNotes=typeof loader==="function"?await loader(100):[];
    }catch(_){if(force)publicNotes=[]}finally{notesBusy=false}
    return publicNotes;
  }
  function renderNotes(){
    const panel=document.getElementById("communityPanel");if(!panel)return;
    panel.replaceChildren();
    const wrap=document.createElement("div");wrap.id="st40CommunityNotes";
    if(!publicNotes.length){
      wrap.innerHTML='<div class="st40-community-empty">Пока нет заметок, прошедших модерацию SETKA.</div>';
      panel.appendChild(wrap);syncModeUi();return;
    }
    for(const note of publicNotes){
      const card=document.createElement("article");card.className="st34-note-card st37-public-card";
      const meta=[];
      if(note.createdAt&&C.dt)meta.push(C.dt(note.createdAt));
      const pid=note.patternId||note.config?.patternId||null,title=Setka.getPatternTitle?.(pid)||"Паттерн";
      if(note.saves)meta.push(`сохранили ${Number(note.saves)}`);
      const head=document.createElement("div");
      head.innerHTML=`<div class="st34-note-text"></div><div class="st34-note-meta"></div>`;
      head.querySelector(".st34-note-text").textContent=note.text||"";
      head.querySelector(".st34-note-meta").textContent=meta.join(" · ");
      card.appendChild(head);
      if(note.config){
        const open=document.createElement("button");open.type="button";open.className="st34-note-preview-button";open.setAttribute("aria-label","Открыть паттерн из заметки");
        const canvas=document.createElement("canvas");canvas.className="st34-note-preview";canvas.width=720;canvas.height=500;open.appendChild(canvas);
        const mark=document.createElement("span");mark.className="st34-note-open-mark";mark.textContent="Открыть ↗";open.appendChild(mark);
        open.onclick=()=>C.publicNotes?.open?.(note);card.appendChild(open);
        const label=document.createElement("div");label.className="st34-note-preview-label";label.textContent=`ПАТТЕРН ИЗ ЗАМЕТКИ · ${title.toUpperCase()}`;card.appendChild(label);
        requestAnimationFrame(()=>{try{C.publicNotes?.drawPreview?.(canvas,note)}catch(_){}});
      }
      const save=document.createElement("button");save.type="button";save.className="st37-note-action";
      const already=(data().notes||[]).some(x=>x.publicNoteId===note.id&&x.sourceType==="public_note");
      save.textContent=already?"Сохранено у меня ✓":"Сохранить себе";
      if(already){save.disabled=true;save.classList.add("published")}
      else save.onclick=async()=>{save.disabled=true;try{await C.publicNotes?.save?.(note);save.textContent="Сохранено у меня ✓";save.classList.add("published")}catch(_){save.disabled=false;save.textContent="Не удалось сохранить"}};
      card.appendChild(save);wrap.appendChild(card);
    }
    panel.appendChild(wrap);syncModeUi();
  }
  async function showNotes(){
    const title=document.getElementById("libraryTitle");if(title)title.textContent="Сообщество";
    const panel=document.getElementById("communityPanel");if(panel)panel.innerHTML='<div class="st40-community-empty">Загружаю заметки…</div>';
    await loadNotes(true);renderNotes();
  }
  function applyMode(){
    syncModeUi();
    if(mode()==="notes")showNotes();else renderPatterns();
  }

  async function refresh(){
    if(busy)return;busy=true;lastError=null;
    try{
      const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify({action:"feed",limit:300})});
      const out=await r.json().catch(()=>({}));if(!r.ok)throw new Error(out.error||`community_${r.status}`);
      items=Array.isArray(out.items)?out.items.map(x=>({...x,createdAt:x.created_at||x.createdAt||null,localOnly:false})):[];
      metrics=out.metrics&&typeof out.metrics==="object"?out.metrics:null;patternMetrics=Array.isArray(out.patternMetrics)?out.patternMetrics:[];
      lastOkAt=new Date().toISOString();
      if(mode()==="notes"){await loadNotes(false);renderNotes()}else renderPatterns();
      window.dispatchEvent(new CustomEvent("setka:community-cloud",{detail:{ok:true,count:items.length,mode:mode(),updatedAt:lastOkAt,metrics,patternMetrics}}));
    }catch(e){
      lastError=String(e?.message||e);clearLegacyLocal();
      if(mode()!=="notes"&&!items.length){C.publicCommunity=[];Setka.setCommunity?.([])}
      window.dispatchEvent(new CustomEvent("setka:community-cloud",{detail:{ok:false,error:lastError}}));
    }finally{busy=false}
  }
  function schedule(ms=600){clearTimeout(timer);timer=setTimeout(refresh,ms)}

  document.addEventListener("click",e=>{
    const b=e.target?.closest?.("#st34CommunityModes button[data-m]");if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();
    setMode(b.dataset.m);applyMode();
  },true);

  window.addEventListener("setka:favorite-saved",()=>{clearLegacyLocal();if(mode()!=="notes")renderPatterns();schedule(900)});
  window.addEventListener("setka:favorite-removed",()=>{clearLegacyLocal();if(mode()!=="notes")renderPatterns();schedule(900)});
  window.addEventListener("setka:v34-sync",e=>schedule(e.detail?.ok?120:1200));
  window.addEventListener("setka:library-page",e=>{
    const page=e.detail?.page;
    if(page==="community"&&lastPage!=="community"){
      setMode("for_me");
      ensureModeButton();renderPatterns();schedule(0);
    }
    lastPage=page;
  });

  async function bootstrap(){
    clearLegacyLocal();ensureModeButton();
    const d=data();d.settings=d.settings||{};delete d.settings.communitySection;if(!MODES.has(d.settings.communityMode)||d.settings.communityMode==="notes")d.settings.communityMode="for_me";C.save?.();
    try{await C.sandbox?.sync?.()}catch(_){}
    await Promise.all([refresh(),loadNotes(true)]);
    setTimeout(refresh,1800);
  }
  bootstrap();
  C.cloudCommunity={refresh,status:()=>({count:items.length,lastOkAt,lastError,mode:mode(),metrics,patternMetrics,publicNotes:publicNotes.length})};
  window.__SETKA_CLOUD_COMMUNITY_V38__=7;
})();