(() => {
  'use strict';
  const API='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-community-v36';
  const API_KEY='sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv';
  const ADMIN_KEY='setka-research:admin-key:v1';
  const A=v=>Array.isArray(v)?v:[];
  const N=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
  const O=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const fmtMs=ms=>{ms=Math.max(0,N(ms));const s=Math.round(ms/1000),m=Math.floor(s/60),h=Math.floor(m/60);if(h)return`${h} ч ${m%60} мин`;if(m)return`${m} мин ${s%60} с`;return`${s} с`};
  const pct=v=>`${Math.round(Math.max(0,N(v))*100)}%`;
  let cache=null,busy=false;

  async function api(){
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','apikey':API_KEY},body:JSON.stringify({action:'admin-snapshot',adminKey:localStorage.getItem(ADMIN_KEY)||''})});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||d.error||'community_admin_failed');return d;
  }
  async function data(force=false){if(cache&&!force)return cache;if(busy)return cache||{};busy=true;try{cache=await api();return cache}finally{busy=false}}

  const percentile=(values,value)=>{const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return 0;return Math.round(a.filter(x=>x<=value).length/a.length*100)};
  function derive(rows,kind){
    rows=A(rows).map(r=>({...r,
      saves:N(r.saves),totalMs:N(kind==='cruise'?r.totalWatchMs:r.totalMs),
      averageMs:N(kind==='cruise'?r.averageWatchMs:r.averageSessionMs),medianMs:N(kind==='cruise'?r.medianWatchMs:r.medianSessionMs),
      repeatRate:N(r.repeatRate),saveRate:N(r.saveRate),timePerUserMs:N(r.timePerUserMs)
    }));
    const cols={saves:rows.map(x=>x.saves),totalMs:rows.map(x=>x.totalMs),averageMs:rows.map(x=>x.averageMs),medianMs:rows.map(x=>x.medianMs),repeatRate:rows.map(x=>x.repeatRate),saveRate:rows.map(x=>x.saveRate),timePerUserMs:rows.map(x=>x.timePerUserMs)};
    return rows.map(r=>{
      const p=Object.fromEntries(Object.entries(cols).map(([k,v])=>[k,percentile(v,r[k])]));const signals=[];
      if(p.saves>=80)signals.push('HIGH_SAVE');if(p.saves<=25&&rows.length>=4)signals.push('LOW_SAVE');if(p.totalMs>=80)signals.push('HIGH_TOTAL_TIME');if(p.averageMs>=80)signals.push('HIGH_DURATION');if(p.medianMs>=80)signals.push('HIGH_MEDIAN_DURATION');if(p.repeatRate>=80)signals.push('HIGH_REPEAT');if(p.saveRate>=80)signals.push('HIGH_SAVE_RATE');if(p.timePerUserMs>=80)signals.push('HIGH_TIME_PER_USER');
      let primary='Пока недостаточно устойчивого сигнала, чтобы давать характеристику.',secondary='';
      if(signals.includes('LOW_SAVE')&&signals.includes('HIGH_DURATION'))primary=kind==='cruise'?'Этот Cruise редко сохраняют сразу, но те, кто остаётся, смотрят его долго.':'Этот паттерн редко сохраняют сразу, но те, кто остаётся, проводят в нём долгое время.';
      else if(signals.includes('HIGH_SAVE_RATE')&&!signals.includes('HIGH_DURATION'))primary=kind==='cruise'?'Этот Cruise часто сохраняют уже после короткого просмотра.':'Этот паттерн часто сохраняют уже после короткого знакомства.';
      else if(signals.includes('HIGH_REPEAT'))primary=kind==='cruise'?'Этот Cruise особенно часто пересматривают.':'К этому паттерну особенно часто возвращаются повторно.';
      else if(signals.includes('HIGH_TIME_PER_USER'))primary=kind==='cruise'?'Небольшая аудитория может давать этому Cruise очень глубокое время просмотра.':'Аудитория может быть небольшой, но использование паттерна очень глубокое.';
      else if(signals.includes('HIGH_DURATION'))primary=kind==='cruise'?'Этот Cruise обычно смотрят заметно дольше других.':'С этим паттерном пользователи обычно остаются заметно дольше, чем в среднем по библиотеке.';
      else if(signals.includes('HIGH_SAVE'))primary=kind==='cruise'?'Один из самых часто сохраняемых Cruise.':'Один из самых часто сохраняемых паттернов в библиотеке.';
      if(signals.includes('HIGH_REPEAT')&&!primary.includes('возвращ')&&!primary.includes('пересматр'))secondary=kind==='cruise'?'Его также часто пересматривают.':'Пользователи также часто возвращаются к нему повторно.';
      return{...r,signals,percentiles:p,primary,secondary};
    });
  }

  function kpi(value,label,sub=''){return`<div class="ev-kpi"><div class="ev-kpi-v">${esc(value)}</div><div class="ev-kpi-l">${esc(label)}</div>${sub?`<div class="ev-kpi-s">${esc(sub)}</div>`:''}</div>`}
  function head(title,copy,eyebrow='NEW CHAT · v1.0'){return`<div class="ev-head"><div class="ev-head-main"><div class="ev-eyebrow">${esc(eyebrow)}</div><div class="ev-title">${esc(title)}</div><div class="ev-copy">${esc(copy)}</div></div></div>`}
  function signalPills(signals){return A(signals).length?`<div class="ev-pills">${A(signals).map(x=>`<span class="ev-pill">${esc(x)}</span>`).join('')}</div>`:''}
  function semantic(r){return`<div class="ev-card" style="margin-top:8px;background:#050505"><div class="ev-card-sub" style="color:#fff;font-size:10px;line-height:1.5">${esc(r.primary)}</div>${r.secondary?`<div class="ev-card-sub">${esc(r.secondary)}</div>`:''}${signalPills(r.signals)}</div>`}

  async function renderSocial(){
    const c=document.getElementById('evContent');if(!c)return;c.innerHTML=head('Обезличенная социальная сеть','♥ в этой линии — не дешёвый лайк, а реальное сохранение объекта. Комментарии — второй социальный сигнал. Личность автора наружу не раскрывается.');
    try{const d=await data(true),s=O(d.summary);c.innerHTML+=`<div class="ev-kpis">${kpi(s.publicProfiles||0,'публичных ников')}${kpi(s.publicNotes||0,'публичных заметок')}${kpi(s.noteSaves||0,'сохранений заметок','♥ = save')}${kpi(s.comments||0,'комментариев')}${kpi(s.publicCruises||0,'публичных Cruise')}${kpi(s.cruiseSaves||0,'сохранений Cruise','♥ = save')}</div>`;
      c.innerHTML+='<div class="ev-section">Публичные заметки</div>';
      c.innerHTML+=A(d.notes).length?`<div class="ev-table-wrap"><table class="ev-table"><thead><tr><th>Автор</th><th>Заметка</th><th>Паттерн</th><th>♥ saves</th><th>Комментарии</th><th>Создана</th></tr></thead><tbody>${A(d.notes).map(n=>`<tr><td>@${esc(n.author?.nickname||'anonymous')}</td><td style="max-width:420px;white-space:normal">${esc(n.text)}</td><td>${esc(n.patternId||'—')}</td><td>${N(n.saves)}</td><td>${N(n.comments)}</td><td>${esc(new Date(n.createdAt).toLocaleString('ru-RU'))}</td></tr>`).join('')}</tbody></table></div>`:'<div class="ev-empty">Публичных заметок пока нет</div>';
    }catch(e){c.innerHTML+=`<div class="ev-empty">${esc(e?.message||e)}</div>`}
  }

  async function renderCruise(){
    const c=document.getElementById('evContent');if(!c)return;c.innerHTML=head('Cruise','Записанные визуальные сессии как воспроизводимый код поведения паттернов. Смотрим не только saves, но и глубину просмотра, повторы и суммарный таймлайн.');
    try{const d=await data(true),s=O(d.summary),rows=derive(d.cruises,'cruise');c.innerHTML+=`<div class="ev-kpis">${kpi(s.publicCruises||0,'Cruise')}${kpi(s.cruisePlays||0,'просмотров')}${kpi(fmtMs(s.totalCruiseWatchMs),'общее время')}${kpi(s.cruiseSaves||0,'♥ сохранений')}${kpi(rows.filter(x=>x.repeatRate>0).length,'с повторами')}${kpi(rows.length?fmtMs(rows.reduce((a,x)=>a+x.averageMs,0)/rows.length):'0 с','средняя глубина')}</div>`;
      c.innerHTML+=A(rows).length?`<div class="ev-grid2">${rows.map(r=>`<div class="ev-card"><div class="ev-card-title">${esc(r.title)}</div><div class="ev-card-sub">@${esc(r.author?.nickname||'anonymous')} · ${fmtMs(r.durationMs)} · timeline ${N(r.timelineVersion)||1}</div><div class="ev-row"><div class="ev-row-main"><div class="ev-row-title">♥ Сохранения</div></div><div class="ev-row-value">${N(r.saves)}</div></div><div class="ev-row"><div class="ev-row-main"><div class="ev-row-title">Общее время просмотра</div></div><div class="ev-row-value">${fmtMs(r.totalWatchMs)}</div></div><div class="ev-row"><div class="ev-row-main"><div class="ev-row-title">Средний просмотр</div></div><div class="ev-row-value">${fmtMs(r.averageWatchMs)}</div></div><div class="ev-row"><div class="ev-row-main"><div class="ev-row-title">Медианный просмотр</div></div><div class="ev-row-value">${fmtMs(r.medianWatchMs)}</div></div><div class="ev-row"><div class="ev-row-main"><div class="ev-row-title">Repeat rate</div></div><div class="ev-row-value">${pct(r.repeatRate)}</div></div>${semantic(r)}</div>`).join('')}</div>`:'<div class="ev-empty">Публичных Cruise пока нет</div>';
    }catch(e){c.innerHTML+=`<div class="ev-empty">${esc(e?.message||e)}</div>`}
  }

  async function renderSignals(){
    const c=document.getElementById('evContent');if(!c)return;c.innerHTML=head('Автоматические сигналы','Детерминированный смысловой слой. Метрики сравниваются относительно распределения библиотеки; карточка сама меняет комментарий, когда меняется статистический профиль объекта.');
    try{const d=await data(true),patterns=derive(d.patterns,'pattern'),cruises=derive(d.cruises,'cruise');
      c.innerHTML+='<div class="ev-section">Паттерны</div>'+(patterns.length?`<div class="ev-grid2">${patterns.map(r=>`<div class="ev-card"><div class="ev-card-title">${esc(r.patternId)}</div><div class="ev-card-sub">♥ ${r.saves} · ${fmtMs(r.totalMs)} total · avg ${fmtMs(r.averageMs)} · repeat ${pct(r.repeatRate)}</div>${semantic(r)}</div>`).join('')}</div>`:'<div class="ev-empty">Нет данных</div>');
      c.innerHTML+='<div class="ev-section">Cruise</div>'+(cruises.length?`<div class="ev-grid2">${cruises.map(r=>`<div class="ev-card"><div class="ev-card-title">${esc(r.title)}</div><div class="ev-card-sub">♥ ${r.saves} · ${fmtMs(r.totalMs)} watch · avg ${fmtMs(r.averageMs)} · repeat ${pct(r.repeatRate)}</div>${semantic(r)}</div>`).join('')}</div>`:'<div class="ev-empty">Нет данных</div>');
      c.innerHTML+='<div class="ev-section">Заметки: глубокий социальный сигнал</div>'+(A(d.notes).length?`<div class="ev-table-wrap"><table class="ev-table"><thead><tr><th>Заметка</th><th>Автор</th><th>♥ saves</th><th>Комментарии</th></tr></thead><tbody>${A(d.notes).slice().sort((a,b)=>N(b.saves)-N(a.saves)).map(n=>`<tr><td style="max-width:520px;white-space:normal">${esc(n.text)}</td><td>@${esc(n.author?.nickname||'anonymous')}</td><td>${N(n.saves)}</td><td>${N(n.comments)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="ev-empty">Нет публичных заметок</div>');
    }catch(e){c.innerHTML+=`<div class="ev-empty">${esc(e?.message||e)}</div>`}
  }

  function addTab(id,label,renderer,before='system'){
    const tabs=document.querySelector('.ev-tabs');if(!tabs||tabs.querySelector(`[data-nctab="${id}"]`))return;
    const b=document.createElement('button');b.className='ev-tab';b.dataset.nctab=id;b.textContent=label;
    b.onclick=()=>{document.querySelectorAll('.ev-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderer()};
    const anchor=tabs.querySelector(`[data-evtab="${before}"]`);tabs.insertBefore(b,anchor||null);
  }

  function install(){
    const tabs=document.querySelector('.ev-tabs'),content=document.getElementById('evContent');if(!tabs||!content){setTimeout(install,120);return}
    addTab('social','Соцсеть',renderSocial);addTab('cruise','Cruise',renderCruise);addTab('signals','Сигналы',renderSignals);
    const sub=document.querySelector('#dashboard .sub');if(sub)sub.textContent='NEW CHAT v1.0 · EVOLUTION v35.2 BASE · SOCIAL × CRUISE × SEMANTIC SIGNALS';
  }
  install();
  window.addEventListener('setka:new-chat-admin-refresh',()=>{cache=null});
})();
