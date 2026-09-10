(() => {
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(v)=>String(v??'—').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const lang=()=>document.documentElement.dataset.setkaLanguage==='sys'?'sys':'ru';
  const mode=()=>qs('.mode-button.active')?.dataset?.mode||'INTEGRATION';
  let currentInspector=null;
  let tracePoll=null;
  let traceViewIndex=-1;

  const style=document.createElement('style');
  style.textContent=`
    .b24-section{margin:12px 0 0;padding-top:10px;border-top:1px solid rgba(39,48,54,.72)}
    .b24-section:first-child{margin-top:0;padding-top:0;border-top:0}
    .b24-title{font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:0 0 8px}
    .b24-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
    .b24-btn,.b24-ref,.b24-related{border:1px solid var(--line);background:#0b0e10;color:var(--text);border-radius:7px;padding:7px 8px;font:inherit;font-size:8px;cursor:pointer}
    .b24-btn.primary{border-color:rgba(157,255,190,.55);color:var(--green)}
    .b24-btn.violet{border-color:rgba(189,167,255,.55);color:var(--violet)}
    .b24-btn.amber{border-color:rgba(255,210,125,.55);color:var(--amber)}
    .b24-btn:disabled{opacity:.36;cursor:not-allowed}
    .b24-ref{padding:3px 6px;color:var(--cyan);max-width:100%;overflow-wrap:anywhere;white-space:normal;text-align:left}
    .b24-kv{display:grid;grid-template-columns:minmax(90px,.72fr) minmax(0,1.5fr);gap:9px;padding:6px 0;border-bottom:1px solid rgba(39,48,54,.52);font-size:9px;line-height:1.38}
    .b24-kv>span:first-child{color:var(--muted)} .b24-kv>span:last-child{overflow-wrap:anywhere;text-align:right}
    .b24-note{padding:9px;border:1px solid rgba(135,233,255,.25);border-radius:8px;color:#b8d7de;font:10px/1.45 system-ui,sans-serif;background:rgba(8,10,12,.62)}
    .b24-note.warn{border-color:rgba(255,210,125,.35);color:var(--amber)}
    .b24-note.good{border-color:rgba(157,255,190,.36);color:var(--green)}
    .b24-details{margin-top:7px;padding:8px;border:1px solid var(--line);border-radius:8px;background:#07090a;max-height:210px;overflow:auto}
    .b24-details pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;color:#aeb8b6;font:8px/1.42 monospace}
    .b24-related-list{display:grid;gap:6px}
    .b24-related{display:block;width:100%;text-align:left;padding:8px}
    .b24-related b{display:block;color:var(--green);font-size:8px;font-weight:500;margin-bottom:4px}
    .b24-related span{display:block;color:#bcc6c4;font:10px/1.35 system-ui,sans-serif}
    .b24-trace-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}
    .b24-trace-badge{font-size:8px;color:var(--violet)}
    .b24-timeline{width:100%;margin:9px 0 6px;accent-color:#bda7ff}
    .b24-stage{padding:9px;border:1px solid rgba(189,167,255,.32);border-radius:8px;background:rgba(20,16,28,.46);font:10px/1.42 system-ui,sans-serif}
    .b24-stage strong{display:block;margin-bottom:4px;color:var(--text);font-weight:600}
    .b24-stage small{display:block;color:var(--muted);font:8px/1.4 monospace;overflow-wrap:anywhere}
    .b24-trace-legend{margin-top:7px;color:var(--muted);font-size:7px;line-height:1.5}
    .b24-traces-tab{border-color:rgba(189,167,255,.45)!important;color:var(--violet)!important}
    .b24-trace-index{display:none;padding:9px 10px 18px;overflow:auto;height:calc(100% - 96px)}
    .b24-trace-index.open{display:block}
    .b24-trace-index-head{position:sticky;top:0;background:rgba(12,15,17,.98);padding:3px 0 8px;z-index:2;color:var(--muted);font-size:8px}
    .b24-trace-row{border:1px solid rgba(189,167,255,.3);border-radius:8px;padding:9px;margin-bottom:6px;background:rgba(13,10,18,.68);cursor:pointer}
    .b24-trace-row:hover{border-color:var(--violet)}
    .b24-trace-row b{display:block;color:var(--violet);font-size:8px;font-weight:500;margin-bottom:5px}.b24-trace-row span{display:block;font:10px/1.38 system-ui,sans-serif;color:#c5cfcd}
  `;
  document.head.appendChild(style);

  function api(path){return fetch(path,{cache:'no-store'}).then(async r=>{const d=await r.json(); if(!r.ok||d?.ok===false) throw Object.assign(new Error(d?.state||`HTTP_${r.status}`),{data:d}); return d;});}
  function graphBridge(){return window.SETKA_GRAPH_BRIDGE||null;}
  function traceBridge(){return window.SETKA_EVENT_TRACE_BRIDGE||null;}
  function humanEventName(raw){
    const s=String(raw||'');
    const map={
      SYSTEM_VISUALIZATION_EMITTED:'Создан пакет визуализации',
      BOUNDED_SELF_EXTENSION_SERIES_FINALIZED:'Завершена серия саморазвития',
      BOUND_CAPABILITY_AUTOROUTE_SUCCEEDED:'Автомаршрут выполнен',
      MINIMAL_FRONT_B23_HUMAN_RUSSIAN_AND_COLOR_CONTROLS_BOUND:'Обновлён пользовательский фронт',
      LINEAR_PRE_B1_BODY_HISTORY_VIEWER_READY:'Подготовлена история развития тела'
    };
    return map[s]||s.replaceAll('_',' ').toLowerCase().replace(/^./,c=>c.toUpperCase());
  }
  function refButton(value,label){
    const v=String(value??'').trim(); if(!v) return esc('—');
    return `<button type="button" class="b24-ref" data-b24-ref="${esc(v)}" title="${esc(v)}">${esc(label||v)}</button>`;
  }
  function kv(k,v,{ref=false}={}){return `<div class="b24-kv"><span>${esc(k)}</span><span>${ref?refButton(v):esc(v??'—')}</span></div>`;}
  function detailRefs(obj){
    const found=[];
    const seen=new Set();
    const walk=(v,key='')=>{
      if(v===null||v===undefined) return;
      if(Array.isArray(v)){v.forEach((x,i)=>walk(x,`${key}[${i}]`));return;}
      if(typeof v==='object'){Object.entries(v).forEach(([k,x])=>walk(x,k));return;}
      if(typeof v!=='string') return;
      if(!/(ref|snapshot|run|packet|trace|mission|branch|command|source)/i.test(key) && !/^(SETKA-|BODY-|VIS-|CMD-|TRACE-|MISSION-|REPORT-|PULSE-|CAP)/.test(v)) return;
      if(seen.has(v)) return; seen.add(v); found.push({key,value:v});
    };
    walk(obj);
    return found.slice(0,40);
  }
  function currentStage(trace,index){return trace?.stages?.[Math.max(0,Math.min(index,trace.stages.length-1))]||null;}
  function renderStage(trace,index){
    const box=qs('#b24-stage'); if(!box||!trace?.stages?.length) return;
    const i=Math.max(0,Math.min(index,trace.stages.length-1)); const st=currentStage(trace,i)||{};
    const mapped=st.mappedToFrozenBody===false?false:true;
    const label=st.label||st.stageCode||st.kind||`Шаг ${i+1}`;
    const code=st.stageCode||st.kind||'RECORDED_STEP';
    if(lang()==='ru') box.innerHTML=`<strong>${esc(i+1)} / ${esc(trace.stages.length)} · ${esc(label)}</strong><small>${esc(code)} · ${mapped?'привязан к узлу графа':'записан, но не привязан к узлу'}${st.dtMs!==undefined?` · +${esc(st.dtMs)} мс`:''}</small>`;
    else box.innerHTML=`<strong>${esc(i+1)} / ${esc(trace.stages.length)} · ${esc(label)}</strong><small>${esc(code)} · ${mapped?'MAPPED TO FROZEN BODY':'RECORDED · GRAPH ENTITY NOT MAPPED'}${st.dtMs!==undefined?` · +${esc(st.dtMs)} ms`:''}</small>`;
    const range=qs('#b24-range'); if(range&&Number(range.value)!==i) range.value=String(i);
    const badge=qs('#b24-trace-badge'); if(badge) badge.textContent=`${i+1}/${trace.stages.length}`;
    traceViewIndex=i;
  }
  function stopTracePoll(){if(tracePoll) clearInterval(tracePoll);tracePoll=null;}
  function startTracePoll(trace){
    stopTracePoll();
    tracePoll=setInterval(()=>{const st=traceBridge()?.state?.(); if(!st) return; if(st.index!==traceViewIndex) renderStage(trace,st.index); if(!st.playing&&st.index>=Math.max(0,(st.total||1)-1)) stopTracePoll();},140);
  }
  async function doTrace(action,trace){
    const b=traceBridge(); if(!b?.ready?.()) return;
    try{
      let r;
      if(action==='play'){r=await b.play(trace);startTracePoll(trace);}
      if(action==='pause'){r=await b.pause();stopTracePoll();}
      if(action==='prev'){r=await b.prev();stopTracePoll();renderStage(trace,r.index);}
      if(action==='next'){r=await b.next();stopTracePoll();renderStage(trace,r.index);}
      if(action==='clear'){r=await b.clear();stopTracePoll();}
      return r;
    }catch(e){console.warn('SETKA B2.4 trace action failed',e);}
  }
  function bindInspectorActions(data){
    qsa('[data-b24-ref]').forEach(btn=>btn.addEventListener('click',async()=>{
      const ref=btn.dataset.b24Ref;
      if(/^BODY-GROWN-SNAPSHOT-/.test(ref)){await traceBridge()?.loadSnapshot?.(ref);return;}
      const spot=graphBridge()?.spotlight?.(ref);
      if(spot?.directMatches) return;
      btn.title=lang()==='ru'?'Ссылка существует в данных карточки, но в текущем графе не найдена.':'REFERENCE EXISTS IN DATA · NOT FOUND IN CURRENT GRAPH';
    }));
    qsa('[data-b24-related]').forEach(btn=>btn.addEventListener('click',()=>openInspector('SYSTEM',Number(btn.dataset.b24Related))));
    const trace=data.trace||{};
    qsa('[data-b24-trace]').forEach(btn=>btn.addEventListener('click',()=>doTrace(btn.dataset.b24Trace,trace)));
    const range=qs('#b24-range'); if(range) range.addEventListener('input',async()=>{const r=await traceBridge()?.seek?.(Number(range.value));stopTracePoll();renderStage(trace,r?.index??Number(range.value));});
    const snap=qs('#b24-trace-snapshot'); if(snap) snap.addEventListener('click',()=>traceBridge()?.loadSnapshot?.(trace.snapshotRef));
  }
  function renderInspector(data){
    currentInspector=data;
    const card=qs('#entity-card'), title=qs('#entity-title'), kind=qs('#entity-kind'), body=qs('#entity-body');
    if(!card||!title||!kind||!body) return;
    const e=data.event||{}, trace=data.trace||{}, ru=lang()==='ru';
    title.textContent=e.summary||(ru?`Событие #${e.eventNo}`:`EVENT #${e.eventNo}`);
    kind.textContent=ru?`СОБЫТИЕ #${e.eventNo} · ${e.stream||data.stream}`:`EVENT #${e.eventNo} · ${e.stream||data.stream}`;
    const refs=detailRefs(e.details||{});
    const related=data.relatedEvents||[];
    const mapped=(trace.stages||[]).filter(s=>s.mappedToFrozenBody!==false).length;
    const unmapped=(trace.stages||[]).length-mapped;
    const traceHtml=trace.available?`
      <section class="b24-section"><div class="b24-trace-head"><h3 class="b24-title">${ru?'Трейс выполнения':'EXECUTION TRACE'}</h3><span class="b24-trace-badge" id="b24-trace-badge">0/${esc((trace.stages||[]).length)}</span></div>
      <div class="b24-note good">${ru?`Найден реальный записанный трейс: ${esc(trace.kind)}. Шагов: ${esc((trace.stages||[]).length)}, привязано к телу: ${mapped}, без координат: ${unmapped}.`:`RECORDED TRACE · ${esc(trace.kind)} · STAGES ${(trace.stages||[]).length} · MAPPED ${mapped} · UNMAPPED ${unmapped}`}</div>
      ${trace.snapshotRef?kv(ru?'слепок трейса':'trace snapshot',trace.snapshotRef,{ref:true}):''}
      ${trace.sourceRef?kv(ru?'источник трейса':'trace source',trace.sourceRef,{ref:true}):''}
      <div class="b24-actions"><button class="b24-btn primary" data-b24-trace="play">▶ ${ru?'ВОСПРОИЗВЕСТИ':'PLAY'}</button><button class="b24-btn" data-b24-trace="pause">⏸ ${ru?'ПАУЗА':'PAUSE'}</button><button class="b24-btn" data-b24-trace="prev">← ${ru?'ШАГ':'STEP'}</button><button class="b24-btn" data-b24-trace="next">${ru?'ШАГ':'STEP'} →</button><button class="b24-btn" data-b24-trace="clear">↺ ${ru?'СБРОСИТЬ ТРЕЙС':'CLEAR TRACE'}</button>${trace.snapshotRef?`<button class="b24-btn amber" id="b24-trace-snapshot">${ru?'ОТКРЫТЬ СЛЕПОК':'OPEN SNAPSHOT'}</button>`:''}</div>
      <input class="b24-timeline" id="b24-range" type="range" min="0" max="${Math.max(0,(trace.stages||[]).length-1)}" value="0" step="1">
      <div class="b24-stage" id="b24-stage"></div>
      <div class="b24-trace-legend">${ru?'Голубой — записанный вход/шаг · фиолетовый — маршрутизация · янтарный — выполнение/материализация · зелёный — успех · красный — ошибка. Соединяющая линия показывает порядок во времени и НЕ является ребром графа.':'CYAN=RECORDED/INGRESS · VIOLET=ROUTE · AMBER=EXECUTION · GREEN=SUCCESS · RED=FAILURE. TEMPORAL CONNECTORS ARE NOT GRAPH EDGES.'}</div></section>`:
      `<section class="b24-section"><h3 class="b24-title">${ru?'Трейс выполнения':'EXECUTION TRACE'}</h3><div class="b24-note warn">${esc(ru?(trace.messageRu||'Для этой записи причинный трейс выполнения не зафиксирован. Граф не будет выдумывать путь.'):(trace.messageSys||'NO RECORDED CAUSAL TRACE · PATH NOT INFERRED'))}</div></section>`;
    body.innerHTML=`
      <section class="b24-section"><h3 class="b24-title">${ru?'Что произошло':'EVENT'}</h3>${kv(ru?'время':'occurred',e.occurredAt?new Date(e.occurredAt).toLocaleString('ru-RU'):e.occurredAt)}${kv(ru?'описание':'summary',e.summary)}${kv(ru?'тип события':'event kind',ru?humanEventName(e.eventKind):e.eventKind)}${kv(ru?'сущность':'entity ref',e.entityRef,{ref:Boolean(e.entityRef)})}${kv(ru?'тип сущности':'entity type',e.entityType)}${e.branchRef?kv(ru?'ветка':'branch',e.branchRef,{ref:true}):''}${kv(ru?'версия':'version',e.version)}</section>
      <section class="b24-section"><h3 class="b24-title">${ru?'Связанные ссылки':'RECORDED REFERENCES'}</h3>${refs.length?refs.map(x=>kv(x.key,x.value,{ref:true})).join(''):`<div class="b24-note">${ru?'В details нет дополнительных ссылок.':'NO ADDITIONAL RECORDED REFS IN DETAILS'}</div>`}</section>
      ${traceHtml}
      <section class="b24-section"><h3 class="b24-title">${ru?'Связанные записи':'RELATED RECORDS'}</h3>${related.length?`<div class="b24-related-list">${related.map(r=>`<button class="b24-related" data-b24-related="${esc(r.eventNo)}"><b>#${esc(r.eventNo)} · ${esc(ru?humanEventName(r.eventKind):r.eventKind)}</b><span>${esc(r.summary||'—')}</span></button>`).join('')}</div>`:`<div class="b24-note">${ru?'Других записей с тем же entity/source ref не найдено.':'NO OTHER EVENTS WITH THE SAME ENTITY/SOURCE REF'}</div>`}</section>
      <section class="b24-section"><h3 class="b24-title">${ru?'Полные данные':'RAW DETAILS'}</h3><div class="b24-details"><pre>${esc(JSON.stringify(e.details||{},null,2))}</pre></div></section>
      <div class="b24-note">${esc(ru?'Связанные записи — это навигация по одинаковым ссылкам, не доказательство причинности. TRACE включается только там, где путь реально записан.':'RELATED EVENTS ARE NAVIGATION, NOT CAUSALITY. TRACE IS SHOWN ONLY WHEN EXPLICITLY RECORDED.')}</div>`;
    card.classList.add('open');
    bindInspectorActions(data);
    if(trace.available&&trace.stages?.length) renderStage(trace,0);
  }
  async function openInspector(stream,eventNo){
    if(!eventNo||!['SYSTEM','BRANCH'].includes(stream)) return;
    stopTracePoll();
    const card=qs('#entity-card'),title=qs('#entity-title'),kind=qs('#entity-kind'),body=qs('#entity-body');
    if(card&&title&&kind&&body){title.textContent=lang()==='ru'?`Событие #${eventNo}`:`EVENT #${eventNo}`;kind.textContent=lang()==='ru'?'ЗАГРУЗКА ИНСПЕКТОРА':'LOADING INSPECTOR';body.innerHTML='<div class="empty">…</div>';card.classList.add('open');}
    try{const p=new URLSearchParams({stream,event_no:String(eventNo),mode:mode()});renderInspector(await api(`/api/b24/event?${p}`));}
    catch(e){if(body) body.innerHTML=`<div class="b24-note warn">${esc(lang()==='ru'?`Не удалось открыть событие: ${e.data?.state||e.message}`:`EVENT INSPECTOR ERROR · ${e.data?.state||e.message}`)}</div>`;}
  }
  function eventTargetInfo(row){
    if(row.classList.contains('b23-row')){
      const no=Number((qs('.b23-no',row)?.textContent||'').replace(/\D/g,''));
      const active=qs('[data-b23-stream].active')?.dataset?.b23Stream;
      if(no&&['SYSTEM','BRANCH'].includes(active)) return {stream:active,eventNo:no};
    }
    if(row.classList.contains('event')){
      const id=row.dataset.eventId||'';
      let m=id.match(/^SYSTEM:(\d+)$/); if(m) return {stream:'SYSTEM',eventNo:Number(m[1])};
      m=id.match(/:EVENT:0*(\d+)$/); if(m) return {stream:'BRANCH',eventNo:Number(m[1])};
    }
    return null;
  }
  function installClickOverride(){
    document.addEventListener('click',e=>{
      const row=e.target.closest('.b23-row,.event'); if(!row) return;
      const info=eventTargetInfo(row); if(!info) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); openInspector(info.stream,info.eventNo);
    },true);
  }
  async function openTraceIndex(){
    const panel=qs('#feed-panel'),original=qs('.panel-scroll',panel),full=qs('.b23-full',panel),tabs=qs('.b23-tabs',panel); if(!panel||!tabs) return;
    let box=qs('.b24-trace-index',panel); if(!box){box=document.createElement('div');box.className='b24-trace-index';panel.appendChild(box);}
    if(original) original.style.display='none'; if(full) full.classList.remove('open'); box.classList.add('open');
    qsa('[data-b23-stream]',tabs).forEach(b=>b.classList.remove('active')); qs('#b24-traces-tab')?.classList.add('active');
    box.innerHTML=`<div class="b24-trace-index-head">${lang()==='ru'?'Загружаю события с доказательным трейсом…':'LOADING EVENTS WITH RECORDED TRACE…'}</div>`;
    try{
      const d=await api('/api/b24/traces?limit=200');
      box.innerHTML=`<div class="b24-trace-index-head">${lang()==='ru'?`Только события, для которых в базе уже существует записанный replay/causal trace · ${d.count}`:`RECORDED TRACE INDEX · ${d.count}`}</div>${(d.rows||[]).map(r=>`<article class="b24-trace-row" data-b24-index-event="${esc(r.eventNo)}"><b>#${esc(r.eventNo)} · ${esc(r.traceKind)}</b><span>${esc(r.summary||r.eventKind)}</span></article>`).join('')||'<div class="empty">Нет записанных трасс.</div>'}`;
      qsa('[data-b24-index-event]',box).forEach(r=>r.addEventListener('click',()=>openInspector('SYSTEM',Number(r.dataset.b24IndexEvent))));
    }catch(e){box.innerHTML=`<div class="b24-note warn">${esc(e.data?.state||e.message)}</div>`;}
  }
  function installTraceTab(){
    const tabs=qs('.b23-tabs'); if(!tabs||qs('#b24-traces-tab',tabs)) return;
    const btn=document.createElement('button');btn.type='button';btn.id='b24-traces-tab';btn.className='b24-traces-tab';btn.textContent=lang()==='ru'?'ТРАССЫ':'TRACES';
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openTraceIndex();});tabs.appendChild(btn);
    qsa('[data-b23-stream]',tabs).forEach(b=>b.addEventListener('click',()=>{qs('.b24-trace-index')?.classList.remove('open');btn.classList.remove('active');},true));
  }
  function applyLang(){
    const badge=qs('.b23-local-badge'); if(badge) badge.textContent='B2.4 · FRONT';
    const tb=qs('#b24-traces-tab'); if(tb) tb.textContent=lang()==='ru'?'ТРАССЫ':'TRACES';
    if(currentInspector) renderInspector(currentInspector);
  }
  function boot(){
    installClickOverride();
    const wait=setInterval(()=>{if(qs('.b23-tabs')){clearInterval(wait);installTraceTab();applyLang();}},80);
    const observer=new MutationObserver(m=>{if(m.some(x=>x.type==='attributes'&&x.attributeName==='data-setka-language')) applyLang();});
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-setka-language']});
    const close=qs('#entity-card .close'); if(close) close.addEventListener('click',()=>stopTracePoll(),true);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();