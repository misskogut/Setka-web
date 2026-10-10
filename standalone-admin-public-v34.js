(() => {
  "use strict";
  const PUBLIC_API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-community-patterns-v38";
  const PUBLIC_KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const PATTERNS=[
    ["tentacle-orbit","Осьминог"],
    ["dandelion","Одуванчик"],
    ["fish-wave","Носовая волна"],
    ["breathing-fractal","Дыхательный фрактал"],
    ["breathing-fractal-growth","Растущий фрактал"],
    ["rgb-glitch-rings","Цветовые кольца"],
    ["stereo-dna","Stereo DNA"]
  ];
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const num=v=>Math.max(0,Number.isFinite(Number(v))?Number(v):0);
  const fmt=v=>num(v).toLocaleString("ru-RU");
  const time=ms=>{const m=Math.round(num(ms)/60000);return m>=60?`${Math.floor(m/60)} ч ${m%60} мин`:m?`${m} мин`:`${Math.round(num(ms)/1000)} сек`};
  let loading=false;
  const metric=(v,title)=>`<div class="stat"><strong>${esc(v)}</strong><span>${esc(title)}</span></div>`;
  function render(data){
    if(!data||data.ok!==true||!data.metrics||!Array.isArray(data.patternMetrics)||!Array.isArray(data.items))throw Error("invalid_public_feed");
    const m=data.metrics,by=new Map(data.patternMetrics.map(x=>[x.patternId,x]));
    $("totals").innerHTML=[
      metric(fmt(m.connectedAccounts),"Подключённых аккаунтов"),
      metric(fmt(m.sessions),"Сессий"),
      metric(fmt(m.exposures),"Эпизодов просмотра"),
      metric(fmt(m.patterns),"Паттернов с зарегистрированным использованием"),
      metric(fmt(m.savedConfigurations),"Сохранённых разных конфигураций"),
      metric(fmt(m.configurationSaves),"Всего сохранений конфигураций"),
      metric(fmt(m.activeAccounts30d),"Активных аккаунтов за 30 дней")
    ].join("");
    $("patternCards").innerHTML=PATTERNS.map(([id,name])=>{
      const p=by.get(id);
      const empty=!p;
      return `<article class="pattern" data-pattern-id="${esc(id)}"><h3>${esc(name)}</h3><small>${esc(id)}</small>
        <div class="pattern-metrics"><div><b>${fmt(p?.viewingAccounts)}</b><span>Смотрели</span></div>
        <div><b>${fmt(p?.sessions)}</b><span>Сессий</span></div>
        <div><b>${fmt(p?.exposures)}</b><span>Просмотров</span></div>
        <div><b>${fmt(p?.likes)}</b><span>Сохранили</span></div>
        <div><b>${fmt(p?.savedConfigurations)}</b><span>Разных вариантов</span></div>
        <div><b>${time(p?.totalDurationMs)}</b><span>Время просмотра</span></div></div>
        ${empty?'<div class="empty">По этому паттерну пока нет зарегистрированных данных. Это не означает, что его никто не использовал.</div>':""}
      </article>`;
    }).join("");
    const variants=(data.items||[]).filter(v=>PATTERNS.some(p=>p[0]===v.patternId||p[0]===v.pattern_id));
    $("variantList").innerHTML=variants.length?variants.slice(0,100).map(v=>{
      const id=v.patternId||v.pattern_id;
      const title=PATTERNS.find(x=>x[0]===id)?.[1]||id;
      return `<div class="variant"><div><strong>${esc(title)}</strong><br><small>Сохранённый публичный вариант</small></div><div style="text-align:right"><strong>${fmt(v.saveCount)} сохранили</strong><br><span>${fmt(v.useCount)} просмотров</span></div></div>`;
    }).join(""):'<div class="empty">Пока нет публично сохранённых конфигураций.</div>';
    $("status").textContent="Данные получены · "+new Date().toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
  }
  async function refresh(){
    if(loading)return;
    loading=true;$("refresh").disabled=true;$("status").textContent="Обновление…";
    try{
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
      let r;
      try{r=await fetch(PUBLIC_API,{method:"POST",headers:{"Content-Type":"application/json","apikey":PUBLIC_KEY},body:JSON.stringify({action:"feed",limit:300}),signal:controller.signal})}
      finally{clearTimeout(timeout)}
      if(!r.ok)throw Error("http_"+r.status);
      const data=await r.json();render(data);
    }catch(err){
      console.error("SETKA open dashboard feed error",err);
      $("status").textContent="Не удалось загрузить статистику. Проверь подключение и нажми «Обновить».";
      if(!$("totals").children.length)$("totals").innerHTML=metric("—","Данные временно недоступны");
    }finally{$("refresh").disabled=false;loading=false}
  }
  document.querySelectorAll("[data-panel]").forEach(btn=>btn.addEventListener("click",()=>{
    const id=btn.dataset.panel;
    for(const tab of document.querySelectorAll("[data-panel]"))tab.setAttribute("aria-selected",String(tab===btn));
    for(const section of ["overview","patterns","variants"])$(section).hidden=section!==id;
  }));
  $("refresh").addEventListener("click",refresh);
  refresh();
  window.__SETKA_OPEN_ADMIN_V34__={version:1,publicDataOnly:true,refresh};
})();
