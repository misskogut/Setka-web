(() => {
  "use strict";
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-admin-community-v38";
  const ADMIN_KEY="setka-research:admin-key:v1";
  const moderationEl=document.getElementById("tab-moderation");
  const communityEl=document.getElementById("tab-community");
  if(!moderationEl||!communityEl)return;
  const esc=v=>String(v??"").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  const dt=v=>{if(!v)return"—";try{return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(v))}catch(_){return"—"}};
  let timer=0,busy=false,last=null;

  const style=document.createElement("style");
  style.textContent=`
    .st38-mod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-top:10px}
    .st38-mod-card{border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:12px;background:#080808}
    .st38-mod-card canvas{width:100%;height:auto;display:block;border-radius:14px;background:#000}
    .st38-mod-text{font-size:14px;line-height:1.45;white-space:pre-wrap;margin-top:10px}
    .st38-mod-meta{font-size:11px;line-height:1.45;color:rgba(255,255,255,.48);margin-top:8px}
    .st38-mod-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
    .st38-mod-actions .btn{width:100%}.st38-approve{background:#fff!important;color:#000!important}.st38-reject{border-color:rgba(255,255,255,.18)!important}
    .st38-status{display:inline-flex;align-items:center;min-height:24px;padding:0 9px;border-radius:12px;border:1px solid rgba(255,255,255,.14);font-size:10px;letter-spacing:.06em;text-transform:uppercase}.st38-status.pending{border-style:dashed}.st38-status.published{opacity:.65}
  `;
  document.head.appendChild(style);

  async function call(action,payload={}){
    const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,adminKey:localStorage.getItem(ADMIN_KEY)||"",...payload})});
    const out=await r.json().catch(()=>({}));if(!r.ok)throw new Error(out.error||`http_${r.status}`);return out;
  }
  async function load(){last=await call("feed");return last}
  function kpi(v,l){return `<div class="card kpi"><div class="v">${esc(v)}</div><div class="l">${esc(l)}</div></div>`}
  function preview(){return window.__SETKA_ADMIN_NOTE_SNAPSHOT_FIX_V34__||null}
  function titleOf(x){const p=preview();return p?.getPatternTitle?.(x.patternId)||x.patternId||"Паттерн"}

  function drawAll(){
    const p=preview();if(!p?.renderCanvas||!last)return;
    const patterns=last.patterns||[],notes=last.notes||[],moderation=last.moderation||[];
    communityEl.querySelectorAll('canvas[data-v38-pattern]').forEach(c=>p.renderCanvas(c,patterns[Number(c.dataset.v38Pattern)]));
    communityEl.querySelectorAll('canvas[data-v38-note]').forEach(c=>p.renderCanvas(c,notes[Number(c.dataset.v38Note)]));
    moderationEl.querySelectorAll('canvas[data-v38-moderation]').forEach(c=>p.renderCanvas(c,moderation[Number(c.dataset.v38Moderation)]));
  }

  async function moderate(action,item){
    if(action==="approve"){
      if(!confirm("Опубликовать эту заметку анонимно в сообществе?"))return;
      await call("approve",{id:item.id});
    }else if(action==="reject"){
      const reason=prompt("Причина отклонения (необязательно, видна только в рабочем контуре):","");
      if(reason===null)return;
      await call("reject",{id:item.id,reason});
    }else if(action==="unpublish"){
      if(!confirm("Снять заметку с публичной витрины? Личная заметка автора сохранится."))return;
      await call("unpublish",{id:item.id});
    }
    await refresh(true);
  }

  function renderModeration(data){
    const items=Array.isArray(data.moderation)?data.moderation:[];
    moderationEl.innerHTML=`
      <div class="grid kpis">${kpi(items.length,"ждут решения")}${kpi((data.notes||[]).length,"уже опубликовано")}</div>
      <div class="card"><div class="section-title">Модерация заметок</div><div class="small muted">Пользователь только предлагает заметку. Пока здесь не принято решение, она остаётся приватной и не попадает в публичное сообщество. Tester ID виден только в этой закрытой админке.</div></div>
      <div id="st38ModerationGrid" class="st38-mod-grid"></div>`;
    const grid=moderationEl.querySelector("#st38ModerationGrid");
    if(!items.length){grid.innerHTML='<div class="card empty" style="grid-column:1/-1">Очередь пуста. Нет заметок, ожидающих модерации.</div>';return}
    items.forEach((x,i)=>{
      const card=document.createElement("article");card.className="st38-mod-card";
      card.innerHTML=`<canvas width="320" height="220" data-v38-moderation="${i}"></canvas><div class="st38-mod-text">${esc(x.text)}</div><div class="st38-mod-meta"><span class="st38-status pending">на модерации</span><br>${esc(titleOf(x))} · отправлено ${esc(dt(x.submittedAt||x.createdAt))}<br>Tester ID: <b>${esc(x.testerId||"не привязан")}</b></div><div class="st38-mod-actions"><button class="btn st38-approve" type="button">Опубликовать</button><button class="btn st38-reject" type="button">Отклонить</button></div>`;
      card.querySelector(".st38-approve").onclick=()=>moderate("approve",x).catch(e=>alert(`Не удалось опубликовать: ${e.message}`));
      card.querySelector(".st38-reject").onclick=()=>moderate("reject",x).catch(e=>alert(`Не удалось отклонить: ${e.message}`));
      grid.appendChild(card);
    });
  }

  function renderCommunity(data){
    const ps=Array.isArray(data.patterns)?data.patterns:[],notes=Array.isArray(data.notes)?data.notes:[];
    const totalPatternSaves=ps.reduce((a,x)=>a+(Number(x.saveCount)||0),0),totalNoteSaves=notes.reduce((a,x)=>a+(Number(x.saves)||0),0);
    communityEl.innerHTML=`
      <div class="grid kpis">${kpi(ps.length,"уникальных конфигураций")}${kpi(totalPatternSaves,"реальных сохранений")}${kpi(notes.length,"публичных заметок")}${kpi(totalNoteSaves,"сохранений заметок")}</div>
      <div class="card"><div class="section-title">Публичное сообщество</div><div class="small muted">Здесь только то, что реально опубликовано. Заметка появляется после решения в разделе «Модерация». Tester/device ID, сессии, симптомы и физиология в публичную проекцию не входят.</div></div>
      <div class="card" style="margin-top:12px"><div class="section-title">Опубликованные заметки</div><div id="st38PublicNotes" class="st38-mod-grid"></div></div>
      <div class="card" style="margin-top:12px"><div class="section-title">Сохранённые паттерны</div><div id="st38PatternCards" class="grid community-grid" style="margin-top:10px"></div></div>`;
    const ng=communityEl.querySelector("#st38PublicNotes"),pg=communityEl.querySelector("#st38PatternCards");
    if(!notes.length)ng.innerHTML='<div class="empty" style="grid-column:1/-1">Публичных заметок пока нет. Это реальное пустое состояние.</div>';
    notes.forEach((x,i)=>{
      const card=document.createElement("article");card.className="st38-mod-card";
      card.innerHTML=`<canvas width="320" height="220" data-v38-note="${i}"></canvas><div class="st38-mod-text">${esc(x.text)}</div><div class="st38-mod-meta"><span class="st38-status published">опубликовано</span><br>${esc(titleOf(x))} · ♥ ${Number(x.saves)||0} · ${esc(dt(x.publishedAt||x.createdAt))}</div><div class="st38-mod-actions" style="grid-template-columns:1fr"><button class="btn st38-reject" type="button">Снять с публикации</button></div>`;
      card.querySelector("button").onclick=()=>moderate("unpublish",x).catch(e=>alert(`Не удалось снять публикацию: ${e.message}`));
      ng.appendChild(card);
    });
    if(!ps.length)pg.innerHTML='<div class="empty" style="grid-column:1/-1">Пока нет серверных сохранённых конфигураций.</div>';
    ps.forEach((x,i)=>{
      const w=document.createElement("div");w.className="community-item";
      w.innerHTML=`<canvas width="320" height="220" data-v38-pattern="${i}"></canvas><span class="community-badge">♥ ${Number(x.saveCount)||0}</span><span class="community-note">${esc(titleOf(x))} · ${esc(dt(x.createdAt))}</span>`;
      pg.appendChild(w);
    });
  }

  function render(data){renderModeration(data);renderCommunity(data);requestAnimationFrame(drawAll)}
  function active(){return !moderationEl.classList.contains("hidden")||!communityEl.classList.contains("hidden")}
  async function refresh(force=false){
    if(busy||(!force&&!active()))return;busy=true;
    const target=!moderationEl.classList.contains("hidden")?moderationEl:communityEl;
    if(target)target.innerHTML='<div class="card empty">Загружаем реальные данные…</div>';
    try{render(await load())}catch(e){if(target)target.innerHTML=`<div class="card empty">Не удалось загрузить данные: ${esc(e.message)}</div>`}finally{busy=false}
  }
  function schedule(ms=120){clearTimeout(timer);timer=setTimeout(()=>refresh(false),ms)}
  document.querySelector('.tab[data-tab="moderation"]')?.addEventListener("click",()=>{schedule(50);setTimeout(()=>refresh(false),500)});
  document.querySelector('.tab[data-tab="community"]')?.addEventListener("click",()=>{schedule(50);setTimeout(()=>refresh(false),500)});
  document.getElementById("refreshBtn")?.addEventListener("click",()=>refresh(true));
  window.addEventListener("setka:admin-preview-ready",drawAll);
  new MutationObserver(()=>{if(active())schedule(60)}).observe(document.querySelector(".tabs")||document.body,{subtree:true,attributes:true,attributeFilter:["class"]});
  if(active())schedule(0);
  window.__SETKA_ADMIN_COMMUNITY_V38__={refresh:()=>refresh(true),drawAll};
})();
