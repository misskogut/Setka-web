(() => {
  "use strict";
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-admin-community-v38";
  const ADMIN_KEY="setka-research:admin-key:v1";
  const el=document.getElementById("tab-community");
  if(!el)return;
  const esc=v=>String(v??"").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  const dt=v=>{if(!v)return"—";try{return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(v))}catch(_){return"—"}};
  let timer=0,busy=false,last=null;

  async function load(){
    const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"feed",adminKey:localStorage.getItem(ADMIN_KEY)||""})});
    const out=await r.json().catch(()=>({}));if(!r.ok)throw new Error(out.error||`http_${r.status}`);last=out;return out;
  }
  function kpi(v,l){return `<div class="card kpi"><div class="v">${esc(v)}</div><div class="l">${esc(l)}</div></div>`}
  function preview(){return window.__SETKA_ADMIN_NOTE_SNAPSHOT_FIX_V34__||null}
  function drawAll(){
    const p=preview();if(!p?.renderCanvas||!last)return;
    const patterns=last.patterns||[],notes=last.notes||[];
    el.querySelectorAll('canvas[data-v38-pattern]').forEach(c=>p.renderCanvas(c,patterns[Number(c.dataset.v38Pattern)]));
    el.querySelectorAll('canvas[data-v38-note]').forEach(c=>p.renderCanvas(c,notes[Number(c.dataset.v38Note)]));
  }
  function render(data){
    const ps=Array.isArray(data.patterns)?data.patterns:[],notes=Array.isArray(data.notes)?data.notes:[];
    const totalPatternSaves=ps.reduce((a,x)=>a+(Number(x.saveCount)||0),0),totalNoteSaves=notes.reduce((a,x)=>a+(Number(x.saves)||0),0),p=preview();
    el.innerHTML=`
      <div class="grid kpis">${kpi(ps.length,"уникальных конфигураций")}${kpi(totalPatternSaves,"реальных сохранений")}${kpi(notes.length,"анонимных заметок")}${kpi(totalNoteSaves,"сохранений заметок")}</div>
      <div class="card"><div class="section-title">Каноническое сообщество</div><div class="small muted">Паттерны считаются из фактических облачных сохранений. Заметки появляются только после явной анонимной публикации. Локальные копии и tester/device ID сюда не попадают.</div></div>
      <div class="card" style="margin-top:12px"><div class="section-title">Сохранённые паттерны</div><div id="st38PatternCards" class="grid community-grid" style="margin-top:10px"></div></div>
      <div class="card" style="margin-top:12px"><div class="section-title">Анонимные публичные заметки</div><div id="st38PublicNotes" class="grid community-grid" style="margin-top:10px"></div></div>`;
    const pg=el.querySelector("#st38PatternCards"),ng=el.querySelector("#st38PublicNotes");
    if(!ps.length)pg.innerHTML='<div class="empty" style="grid-column:1/-1">Пока нет серверных сохранённых конфигураций.</div>';
    ps.forEach((x,i)=>{
      const w=document.createElement("div");w.className="community-item";
      w.innerHTML=`<canvas width="320" height="220" data-v38-pattern="${i}"></canvas><span class="community-badge">♥ ${Number(x.saveCount)||0}</span><span class="community-note">${esc(p?.getPatternTitle?.(x.patternId)||x.patternId||"Паттерн")} · ${esc(dt(x.createdAt))}</span>`;
      pg.appendChild(w);
    });
    if(!notes.length)ng.innerHTML='<div class="empty" style="grid-column:1/-1">Публичных заметок пока нет. Это реальное пустое состояние.</div>';
    notes.forEach((x,i)=>{
      const w=document.createElement("div");w.className="community-item";w.style.padding="10px";
      w.innerHTML=`<canvas width="320" height="220" data-v38-note="${i}"></canvas><div style="font-size:13px;line-height:1.45;white-space:pre-wrap;margin-top:9px">${esc(x.text)}</div><div class="small muted" style="margin-top:7px">${esc(p?.getPatternTitle?.(x.patternId)||x.patternId||"Паттерн")} · ♥ ${Number(x.saves)||0} · ${esc(dt(x.createdAt))}</div>`;
      ng.appendChild(w);
    });
    drawAll();
  }
  async function refresh(){
    if(busy||el.classList.contains("hidden"))return;busy=true;
    el.innerHTML='<div class="card empty">Загружаем реальное сообщество…</div>';
    try{render(await load())}catch(e){el.innerHTML=`<div class="card empty">Не удалось загрузить каноническое сообщество: ${esc(e.message)}</div>`}finally{busy=false}
  }
  function schedule(ms=120){clearTimeout(timer);timer=setTimeout(refresh,ms)}
  document.querySelector('.tab[data-tab="community"]')?.addEventListener("click",()=>{schedule(80);setTimeout(refresh,700)});
  document.getElementById("refreshBtn")?.addEventListener("click",()=>schedule(350));
  window.addEventListener("setka:admin-preview-ready",drawAll);
  new MutationObserver(()=>{if(!el.classList.contains("hidden"))schedule(60)}).observe(el,{attributes:true,attributeFilter:["class"]});
  if(!el.classList.contains("hidden"))schedule(0);
  window.__SETKA_ADMIN_COMMUNITY_V38__={refresh,drawAll};
})();