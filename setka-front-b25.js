(() => {
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(v)=>String(v??'—').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const lang=()=>document.documentElement.dataset.setkaLanguage==='sys'?'sys':'ru';
  const mode=()=>qs('.mode-button.active')?.dataset?.mode||'INTEGRATION';
  const graphBridge=()=>window.SETKA_GRAPH_BRIDGE||null;
  const traceBridge=()=>window.SETKA_EVENT_TRACE_BRIDGE||null;
  let currentData=null;
  let originSnapshotRef=null;
  let activeSnapshotRef=null;
  let tracePoll=null;
  let traceViewIndex=-1;

  const style=document.createElement('style');
  style.textContent=`
    .b25-context{border:1px solid rgba(135,233,255,.34);border-radius:9px;padding:9px;background:rgba(8,16,19,.72)}
    .b25-context-grid{display:grid;grid-template-columns:1fr;gap:6px;margin-top:7px}
    .b25-context-row{display:grid;grid-template-columns:76px minmax(0,1fr);gap:8px;align-items:center;font-size:8px}
    .b25-context-row span:first-child{color:var(--muted)}
    .b25-context-row b{font-weight:500;color:#d8e6e3;overflow-wrap:anywhere}
    .b25-context-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
    .b25-btn{border:1px solid var(--line);background:#0b0e10;color:var(--text);border-radius:7px;padding:7px 9px;font:inherit;font-size:8px;cursor:pointer}
    .b25-btn.current{border-color:rgba(135,233,255,.5);color:var(--cyan)}
    .b25-btn.event{border-color:rgba(157,255,190,.55);color:var(--green)}
    .b25-btn.after{border-color:rgba(255,210,125,.55);color:var(--amber)}
    .b25-btn.return{border-color:rgba(189,167,255,.55);color:var(--violet)}
    .b25-chip{position:fixed;z-index:31;left:50%;transform:translateX(-50%);bottom:72px;display:none;gap:8px;align-items:center;max-width:min(760px,calc(100vw - 28px));padding:7px 9px;border:1px solid rgba(135,233,255,.38);border-radius:9px;background:rgba(5,7,8,.92);backdrop-filter:blur(10px);font:8px/1.35 monospace;color:#c9d8d5}
    .b25-chip.open{display:flex}.b25-chip strong{color:var(--cyan);font-weight:600}.b25-chip button{margin-left:auto;border:1px solid rgba(189,167,255,.45);background:transparent;color:var(--violet);border-radius:6px;padding:5px 7px;font:inherit;cursor:pointer}
    .b25-trace-stage{padding:9px;border:1px solid rgba(189,167,255,.32);border-radius:8px;background:rgba(20,16,28,.46);font:10px/1.42 system-ui,sans-serif;margin-top:7px}
    .b25-trace-stage strong{display:block;margin-bottom:4px}.b25-trace-stage small{display:block;color:var(--muted);font:8px/1.4 monospace;overflow-wrap:anywhere}
    .b25-range{width:100%;margin:8px 0;accent-color:#bda7ff}
    @media(max-width:760px){.b25-chip{bottom:108px}.b25-context-row{grid-template-columns:62px minmax(0,1fr)}}
  `;
  document.head.appendChild(style);

  function api(path){return fetch(path,{cache:'no-store'}).then(async r=>{const d=await r.json().catch(()=>({ok:false,state:`HTTP_${r.status}`}));if(!r.ok||d?.ok===false)throw Object.assign(new Error(d?.state||`HTTP_${r.status}`),{data:d});return d;});}
  function eventTargetInfo(row){
    if(row.classList.contains('b24-trace-row')){
      const no=Number(row.dataset.b24IndexEvent); if(no) return {stream:'SYSTEM',eventNo:no};
    }
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
  function humanEventName(raw){return String(raw||'').replaceAll('_',' ').toLowerCase().replace(/^./,c=>c.toUpperCase());}
  function basisRu(b){
    return ({TRACE_SNAPSHOT:'точный слепок, связанный с записанным трейсом',VISUALIZATION_PACKET_SNAPSHOT:'слепок из пакета визуализации события',EVENT_GRAPH_SNAPSHOT_REF:'слепок, прямо записанный в событии',LATEST_FROZEN_SNAPSHOT_AT_OR_BEFORE_EVENT:'последний реальный frozen-слепок не позже события',EARLIEST_FROZEN_SNAPSHOT_AFTER_EVENT_NO_PRIOR_SNAPSHOT:'первый доступный frozen-слепок после события',NO_FROZEN_SNAPSHOT_AVAILABLE:'слепок для этого времени отсутствует'})[b]||b||'—';
  }
  function fmtTime(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('ru-RU');}
  function refButton(v){if(!v)return '—';return `<button type="button" class="b24-ref" data-b25-ref="${esc(v)}">${esc(v)}</button>`;}
  function kv(k,v,ref=false){return `<div class="b24-kv"><span>${esc(k)}</span><span>${ref?refButton(v):esc(v??'—')}</span></div>`;}
  function detailRefs(obj){
    const out=[],seen=new Set();
    const walk=(v,key='')=>{if(v==null)return;if(Array.isArray(v)){v.forEach(x=>walk(x,key));return;}if(typeof v==='object'){Object.entries(v).forEach(([k,x])=>walk(x,k));return;}if(typeof v!=='string')return;if(!/(ref|snapshot|run|packet|trace|mission|branch|command|source|commit)/i.test(key)&&!/^(SETKA-|BODY-|VIS-|CMD-|TRACE-|MISSION-|REPORT-|PULSE-|CAP)/.test(v))return;if(seen.has(v))return;seen.add(v);out.push({key,value:v});};
    walk(obj);return out.slice(0,50);
  }
  function chip(){
    let c=qs('#b25-context-chip');
    if(!c){c=document.createElement('div');c.id='b25-context-chip';c.className='b25-chip';c.innerHTML='<strong></strong><span></span><button type="button"></button>';document.body.appendChild(c);qs('button',c).addEventListener('click',returnToOrigin);}
    return c;
  }
  function updateChip(data){
    const c=chip(),e=data?.event||{},ctx=data?.context||{};c.classList.add('open');
    qs('strong',c).textContent=lang()==='ru'?`СОБЫТИЕ #${e.eventNo}`:`EVENT #${e.eventNo}`;
    qs('span',c).textContent=lang()==='ru'?`контекст · ${basisRu(ctx.primaryBasis)}`:`CONTEXT · ${ctx.primaryBasis||'—'}`;
    qs('button',c).textContent=lang()==='ru'?'ВЕРНУТЬ ТЕКУЩИЙ':'RETURN CURRENT';
  }
  async function stopTraceNoRestore(){
    stopTracePoll();
    const b=traceBridge();
    if(b?.state?.().total) await b.clear({restoreSnapshot:false});
  }
  async function loadContextSnapshot(ref,label){
    if(!ref)return {ok:false};
    await stopTraceNoRestore();
    const b=traceBridge(); if(!b?.ready?.()) throw new Error('GRAPH_TRACE_BRIDGE_NOT_READY');
    const r=await b.loadSnapshot(ref); activeSnapshotRef=ref;
    const cls=qs('#graph-classification');if(cls)cls.textContent=label;
    return r;
  }
  async function returnToOrigin(){
    try{await stopTraceNoRestore();if(originSnapshotRef)await traceBridge()?.loadSnapshot?.(originSnapshotRef);}catch(e){console.warn(e);}
    currentData=null;activeSnapshotRef=null;originSnapshotRef=null;chip().classList.remove('open');
    const cls=qs('#graph-classification');if(cls)cls.textContent=lang()==='ru'?'СЛЕПОК · ТЕКУЩЕЕ ТЕЛО':'SNAPSHOT · CURRENT BODY';
  }
  function renderStage(trace,index){
    const box=qs('#b25-trace-stage');if(!box||!trace?.stages?.length)return;
    const i=Math.max(0,Math.min(Number(index)||0,trace.stages.length-1)),st=trace.stages[i]||{};
    const mapped=st.mappedToFrozenBody!==false,label=st.label||st.stageCode||st.kind||`Шаг ${i+1}`,code=st.stageCode||st.kind||'RECORDED_STEP';
    box.innerHTML=lang()==='ru'?`<strong>${i+1}/${trace.stages.length} · ${esc(label)}</strong><small>${esc(code)} · ${mapped?'узел графа':'записано без привязки к узлу'}${st.dtMs!==undefined?` · +${esc(st.dtMs)} мс`:''}</small>`:`<strong>${i+1}/${trace.stages.length} · ${esc(label)}</strong><small>${esc(code)} · ${mapped?'MAPPED':'UNMAPPED'}${st.dtMs!==undefined?` · +${esc(st.dtMs)} ms`:''}</small>`;
    const range=qs('#b25-trace-range');if(range)range.value=String(i);traceViewIndex=i;
  }
  function stopTracePoll(){if(tracePoll)clearInterval(tracePoll);tracePoll=null;}
  function startTracePoll(trace){stopTracePoll();tracePoll=setInterval(()=>{const s=traceBridge()?.state?.();if(!s)return;if(s.index!==traceViewIndex)renderStage(trace,s.index);if(!s.playing&&s.index>=Math.max(0,(s.total||1)-1))stopTracePoll();},140);}
  async function traceAction(action,trace){
    const b=traceBridge();if(!b?.ready?.())return;
    if(action==='play'){await b.play(trace);startTracePoll(trace);}
    if(action==='pause'){await b.pause();stopTracePoll();}
    if(action==='prev'){const r=await b.prev();stopTracePoll();renderStage(trace,r.index);}
    if(action==='next'){const r=await b.next();stopTracePoll();renderStage(trace,r.index);}
    if(action==='clear'){await b.clear();stopTracePoll();const c=currentData?.context;if(c?.primarySnapshotRef)activeSnapshotRef=c.primarySnapshotRef;}
  }
  function renderCard(data){
    currentData=data;updateChip(data);
    const card=qs('#entity-card'),title=qs('#entity-title'),kind=qs('#entity-kind'),body=qs('#entity-body');if(!card||!title||!kind||!body)return;
    const ru=lang()==='ru',e=data.event||{},ctx=data.context||{},trace=data.trace||{},refs=detailRefs(e.details||{}),related=data.relatedEvents||[];
    title.textContent=e.summary||(ru?`Событие #${e.eventNo}`:`EVENT #${e.eventNo}`);kind.textContent=ru?`СОБЫТИЕ #${e.eventNo} · КОНТЕКСТ ВО ВРЕМЕНИ`:`EVENT #${e.eventNo} · TIME CONTEXT`;
    const contextHtml=`<section class="b24-section"><h3 class="b24-title">${ru?'Граф в момент события':'EVENT GRAPH CONTEXT'}</h3><div class="b25-context"><div class="b24-note good">${ru?`При открытии события граф автоматически переключён на: ${esc(basisRu(ctx.primaryBasis))}. Это реальный frozen snapshot. Если связь со snapshot только временная, она не считается доказательством причинности.`:`AUTO-OPENED REAL FROZEN SNAPSHOT · ${esc(ctx.primaryBasis)} · TEMPORAL MATCH IS NOT CAUSAL PROOF`}</div><div class="b25-context-grid"><div class="b25-context-row"><span>${ru?'событие':'event'}</span><b>${esc(fmtTime(ctx.eventAt))}</b></div><div class="b25-context-row"><span>${ru?'слепок':'snapshot'}</span><b>${esc(ctx.primarySnapshotRef||'—')}</b></div><div class="b25-context-row"><span>${ru?'время слепка':'snapshot at'}</span><b>${esc(fmtTime(ctx.primarySnapshotAt))}</b></div></div><div class="b25-context-actions">${ctx.beforeSnapshotRef?`<button class="b25-btn current" data-b25-snapshot="${esc(ctx.beforeSnapshotRef)}" data-label="BEFORE">← ${ru?'ДО':'BEFORE'}</button>`:''}${ctx.primarySnapshotRef?`<button class="b25-btn event" data-b25-snapshot="${esc(ctx.primarySnapshotRef)}" data-label="EVENT">${ru?'СОБЫТИЕ':'EVENT'}</button>`:''}${ctx.afterSnapshotRef?`<button class="b25-btn after" data-b25-snapshot="${esc(ctx.afterSnapshotRef)}" data-label="AFTER">${ru?'ПОСЛЕ':'AFTER'} →</button>`:''}<button class="b25-btn return" data-b25-return>${ru?'ВЕРНУТЬ ТЕКУЩИЙ':'RETURN CURRENT'}</button></div></div></section>`;
    const traceHtml=trace.available?`<section class="b24-section"><h3 class="b24-title">${ru?'Трейс выполнения':'EXECUTION TRACE'}</h3><div class="b24-note good">${ru?`Есть доказанный записанный трейс · ${esc(trace.kind)} · ${(trace.stages||[]).length} шагов. Граф остаётся обычным 3D: можно вращать, приближать, ставить паузу и рассматривать любой шаг.`:`RECORDED TRACE · ${esc(trace.kind)} · ${(trace.stages||[]).length} STEPS`}</div><div class="b24-actions"><button class="b24-btn primary" data-b25-trace="play">▶ ${ru?'ПРОИГРАТЬ':'PLAY'}</button><button class="b24-btn" data-b25-trace="pause">⏸ ${ru?'ПАУЗА':'PAUSE'}</button><button class="b24-btn" data-b25-trace="prev">← ${ru?'ШАГ':'STEP'}</button><button class="b24-btn" data-b25-trace="next">${ru?'ШАГ':'STEP'} →</button><button class="b24-btn" data-b25-trace="clear">↺ ${ru?'УБРАТЬ ТРЕЙС':'CLEAR'}</button></div><input id="b25-trace-range" class="b25-range" type="range" min="0" max="${Math.max(0,(trace.stages||[]).length-1)}" value="0"><div id="b25-trace-stage" class="b25-trace-stage"></div><div class="b24-trace-legend">${ru?'Цветом показаны только записанные этапы. Линия между этапами — порядок во времени, не ребро графа.':'TRACE COLORS = RECORDED STAGES ONLY. TEMPORAL LINE IS NOT A GRAPH EDGE.'}</div></section>`:`<section class="b24-section"><h3 class="b24-title">${ru?'Трейс выполнения':'EXECUTION TRACE'}</h3><div class="b24-note warn">${esc(ru?(trace.messageRu||'Причинный трейс для этой записи не сохранён. Слепок события всё равно доступен для исследования.'):(trace.messageSys||'NO RECORDED CAUSAL TRACE'))}</div></section>`;
    body.innerHTML=`${contextHtml}<section class="b24-section"><h3 class="b24-title">${ru?'Что произошло':'EVENT'}</h3>${kv(ru?'время':'occurred',fmtTime(e.occurredAt))}${kv(ru?'описание':'summary',e.summary)}${kv(ru?'тип события':'event kind',ru?humanEventName(e.eventKind):e.eventKind)}${kv(ru?'сущность':'entity ref',e.entityRef,Boolean(e.entityRef))}${kv(ru?'тип сущности':'entity type',e.entityType)}${e.branchRef?kv(ru?'ветка':'branch',e.branchRef,true):''}${kv(ru?'версия':'version',e.version)}</section><section class="b24-section"><h3 class="b24-title">${ru?'Связанные ссылки':'RECORDED REFERENCES'}</h3>${refs.length?refs.map(x=>kv(x.key,x.value,true)).join(''):`<div class="b24-note">${ru?'Дополнительных ссылок нет.':'NO ADDITIONAL REFS'}</div>`}</section>${traceHtml}<section class="b24-section"><h3 class="b24-title">${ru?'Связанные записи':'RELATED RECORDS'}</h3>${related.length?`<div class="b24-related-list">${related.map(r=>`<button class="b24-related" data-b25-related="${esc(r.eventNo)}"><b>#${esc(r.eventNo)} · ${esc(ru?humanEventName(r.eventKind):r.eventKind)}</b><span>${esc(r.summary||'—')}</span></button>`).join('')}</div>`:`<div class="b24-note">${ru?'Других записей с тем же источником/сущностью не найдено.':'NO RELATED RECORDS'}</div>`}</section><section class="b24-section"><h3 class="b24-title">${ru?'Полные данные события':'RAW DETAILS'}</h3><div class="b24-details"><pre>${esc(JSON.stringify(e.details||{},null,2))}</pre></div></section>`;
    card.classList.add('open');
    bindCard(data);if(trace.available&&trace.stages?.length)renderStage(trace,0);
  }
  function bindCard(data){
    qsa('[data-b25-snapshot]').forEach(b=>b.addEventListener('click',()=>loadContextSnapshot(b.dataset.b25Snapshot,lang()==='ru'?`КОНТЕКСТ СОБЫТИЯ #${data.event.eventNo} · ${b.dataset.label}`:`EVENT #${data.event.eventNo} · ${b.dataset.label}`)));
    qs('[data-b25-return]')?.addEventListener('click',returnToOrigin);
    qsa('[data-b25-ref]').forEach(b=>b.addEventListener('click',async()=>{const ref=b.dataset.b25Ref;if(/^BODY-GROWN-SNAPSHOT-/.test(ref)){await loadContextSnapshot(ref,lang()==='ru'?`СЛЕПОК ИЗ КАРТОЧКИ · ${ref}`:`CARD SNAPSHOT · ${ref}`);return;}const s=graphBridge()?.spotlight?.(ref);if(!s?.directMatches)b.title=lang()==='ru'?'Ссылка есть в данных, но в открытом слепке не найдена.':'REFERENCE EXISTS · NOT FOUND IN OPEN SNAPSHOT';}));
    qsa('[data-b25-related]').forEach(b=>b.addEventListener('click',()=>openContext('SYSTEM',Number(b.dataset.b25Related))));
    qsa('[data-b25-trace]').forEach(b=>b.addEventListener('click',()=>traceAction(b.dataset.b25Trace,data.trace)));
    qs('#b25-trace-range')?.addEventListener('input',async e=>{const r=await traceBridge()?.seek?.(Number(e.target.value));stopTracePoll();renderStage(data.trace,r?.index??Number(e.target.value));});
  }
  async function openContext(stream,eventNo){
    if(!eventNo||!['SYSTEM','BRANCH'].includes(stream))return;
    stopTracePoll();
    if(!originSnapshotRef) originSnapshotRef=graphBridge()?.snapshotRef?.()||traceBridge()?.state?.().snapshotRef||null;
    const card=qs('#entity-card'),title=qs('#entity-title'),kind=qs('#entity-kind'),body=qs('#entity-body');
    if(card&&title&&kind&&body){title.textContent=lang()==='ru'?`Событие #${eventNo}`:`EVENT #${eventNo}`;kind.textContent=lang()==='ru'?'ЗАГРУЖАЮ КОНТЕКСТ СОБЫТИЯ':'LOADING EVENT CONTEXT';body.innerHTML='<div class="b24-note">…</div>';card.classList.add('open');}
    try{
      const p=new URLSearchParams({stream,event_no:String(eventNo),mode:mode()});
      const data=await api(`/api/b25/event?${p}`);
      const ctx=data.context||{};
      if(ctx.primarySnapshotRef) await loadContextSnapshot(ctx.primarySnapshotRef,lang()==='ru'?`КОНТЕКСТ СОБЫТИЯ #${eventNo}`:`EVENT CONTEXT #${eventNo}`);
      renderCard(data);
    }catch(e){
      if(body){const msg=e.data?.message||e.data?.state||e.message;body.innerHTML=`<div class="b24-note warn">${esc(lang()==='ru'?`Не удалось открыть контекст события: ${msg}`:`EVENT CONTEXT ERROR · ${msg}`)}</div>`;}
    }
  }
  function installEventOverride(){
    window.addEventListener('click',e=>{
      const row=e.target.closest?.('.b23-row,.event,.b24-trace-row');if(!row)return;
      const info=eventTargetInfo(row);if(!info)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openContext(info.stream,info.eventNo);
    },true);
  }
  function applyVersion(){
    document.title='SETKA · FRONT B2.5 · DATA B1';
    const badge=qs('.b23-local-badge');if(badge&&badge.textContent!=='B2.5 · FRONT')badge.textContent='B2.5 · FRONT';
    if(currentData)updateChip(currentData);
  }
  function boot(){
    installEventOverride();applyVersion();setTimeout(applyVersion,0);
    const badgeWatch=new MutationObserver(()=>applyVersion());
    const startWatch=()=>{const badge=qs('.b23-local-badge');if(badge)badgeWatch.observe(badge,{childList:true,characterData:true,subtree:true});else setTimeout(startWatch,100);};startWatch();
    const langWatch=new MutationObserver(()=>{applyVersion();if(currentData)renderCard(currentData);});langWatch.observe(document.documentElement,{attributes:true,attributeFilter:['data-setka-language']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
