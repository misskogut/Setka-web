(() => {
  "use strict";
  const PATTERN_API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-community-patterns-v38";
  const SOCIAL_API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-community-v36";
  const ADMIN_KEY="setka-research:admin-key:v1";
  const el=document.getElementById("tab-community");
  if(!el)return;
  const esc=v=>String(v??"").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  const dt=v=>{if(!v)return"—";try{return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(v))}catch(_){return"—"}};
  let timer=0,busy=false;

  async function post(url,body){
    const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const out=await r.json().catch(()=>({}));if(!r.ok)throw new Error(out.error||`http_${r.status}`);return out;
  }
  function kpi(v,l){return `<div class="card kpi"><div class="v">${esc(v)}</div><div class="l">${esc(l)}</div></div>`}
  async function render(){
    if(busy||el.classList.contains("hidden"))return;busy=true;
    el.innerHTML='<div class="card empty">Загружаем реальное сообщество…</div>';
    try{
      const adminKey=localStorage.getItem(ADMIN_KEY)||"";
      const [patterns,social]=await Promise.all([
        post(PATTERN_API,{action:"feed",limit:300}),
        post(SOCIAL_API,{action:"admin-snapshot",adminKey})
      ]);
      const ps=Array.isArray(patterns.items)?patterns.items:[],notes=Array.isArray(social.notes)?social.notes:[];
      const totalPatternSaves=ps.reduce((a,x)=>a+(Number(x.saveCount)||0),0),totalNoteSaves=notes.reduce((a,x)=>a+(Number(x.saves)||0),0);
      el.innerHTML=`
        <div class="grid kpis">${kpi(ps.length,"публичных конфигураций")}${kpi(totalPatternSaves,"сохранений паттернов")}${kpi(notes.length,"анонимных заметок")}${kpi(totalNoteSaves,"сохранений заметок")}</div>
        <div class="card"><div class="section-title">Каноническое сообщество</div><div class="small muted">Здесь только данные, реально опубликованные или сохранённые в облаке. Локальные копии не считаются сообществом. В анонимных заметках tester/device ID не отображаются.</div></div>
        <div class="card" style="margin-top:12px"><div class="section-title">Публичные паттерны</div><div id="st38PatternRows" class="table-wrap" style="margin-top:10px"></div></div>
        <div class="card" style="margin-top:12px"><div class="section-title">Анонимные публичные заметки</div><div id="st38PublicNotes" style="display:grid;gap:10px;margin-top:10px"></div></div>`;
      const pr=document.getElementById("st38PatternRows");
      if(!ps.length)pr.innerHTML='<div class="empty">Пока нет облачных сохранённых конфигураций.</div>';
      else pr.innerHTML=`<table class="table"><thead><tr><th>Паттерн</th><th>Сохранения</th><th>Первое сохранение</th><th>Config key</th></tr></thead><tbody>${ps.map(x=>`<tr><td><b>${esc(x.patternId||x.pattern_id||"—")}</b></td><td>${Number(x.saveCount)||0}</td><td>${esc(dt(x.created_at||x.createdAt))}</td><td class="small muted">${esc(String(x.config_key||x.configKey||"").slice(0,72))}</td></tr>`).join("")}</tbody></table>`;
      const nr=document.getElementById("st38PublicNotes");
      if(!notes.length)nr.innerHTML='<div class="empty">Публичных заметок пока нет.</div>';
      else nr.innerHTML=notes.map(n=>`<div style="border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:13px"><div style="font-size:14px;line-height:1.45;white-space:pre-wrap">${esc(n.text)}</div><div class="small muted" style="margin-top:8px">${esc(n.patternId||"без паттерна")} · ${esc(dt(n.createdAt))} · сохранили ${Number(n.saves)||0}${n.comments?` · комментарии ${Number(n.comments)||0}`:""}</div></div>`).join("");
    }catch(e){
      el.innerHTML=`<div class="card empty">Не удалось загрузить каноническое сообщество: ${esc(e.message)}</div>`;
    }finally{busy=false}
  }
  function schedule(ms=120){clearTimeout(timer);timer=setTimeout(render,ms)}
  document.querySelector('.tab[data-tab="community"]')?.addEventListener("click",()=>{schedule(80);setTimeout(render,700)});
  document.getElementById("refreshBtn")?.addEventListener("click",()=>schedule(500));
  new MutationObserver(()=>{if(!el.classList.contains("hidden"))schedule(50)}).observe(el,{attributes:true,attributeFilter:["class"]});
  if(!el.classList.contains("hidden"))schedule(0);
  window.__SETKA_ADMIN_COMMUNITY_V38__={render};
})();