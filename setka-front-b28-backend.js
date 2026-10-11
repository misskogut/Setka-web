(() => {
  const VERSION='B2.8';
  const MARKER='B2.8-BACKEND-TRUTH';
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const state={overview:null,graph:null,search:[],inspect:null,history:[],open:false,busy:false,mode:'INTEGRATION',eventsInGraph:false};
  document.documentElement.dataset.setkaFrontBackendTruth=MARKER;
  document.documentElement.dataset.setkaFrontVersion=VERSION;
  document.title='SETKA · FRONT B2.8 · LOCAL BACKEND';
  window.SETKA_B28_BACKEND_GRAPH_ACTIVE=true;

  const style=document.createElement('style');
  style.textContent=`
    #setka-b28-toggle{border-color:rgba(135,233,255,.45);color:var(--cyan)}
    #setka-b28-toggle.active{border-color:rgba(157,255,190,.65);color:var(--green)}
    #setka-b28-status-chip{border-color:rgba(157,255,190,.45);color:var(--green)}
    #setka-b28-panel{position:fixed;z-index:100020;right:12px;top:calc(var(--safe-top) + 72px);bottom:calc(var(--safe-bottom) + 12px);width:min(560px,calc(100vw - 24px));display:none;border:1px solid rgba(135,233,255,.42);border-radius:13px;background:rgba(5,7,8,.985);box-shadow:0 24px 90px rgba(0,0,0,.58);backdrop-filter:blur(18px);overflow:hidden}
    #setka-b28-panel.open{display:flex;flex-direction:column}
    #setka-b28-panel .b28-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 11px;border-bottom:1px solid var(--line)}
    #setka-b28-panel .b28-head strong{font-size:9px;letter-spacing:.12em;color:var(--cyan)}
    #setka-b28-panel button{border:1px solid var(--line);background:#0b0e10;color:var(--text);border-radius:7px;padding:7px 9px;font:8px/1 monospace;cursor:pointer}
    #setka-b28-panel button:hover{border-color:var(--line-hot)}
    #setka-b28-panel .b28-scroll{min-height:0;overflow:auto;padding:10px}
    .b28-search{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;margin-bottom:10px}
    .b28-search input{min-width:0;border:1px solid var(--line);border-radius:8px;background:#080b0d;color:var(--text);padding:10px 11px;font:11px/1.35 system-ui,sans-serif;outline:none}
    .b28-search input:focus{border-color:rgba(135,233,255,.65)}
    .b28-status{padding:8px 9px;border:1px solid rgba(39,48,54,.8);border-radius:8px;background:rgba(9,12,14,.72);font:7px/1.5 monospace;color:var(--muted);margin-bottom:10px}
    .b28-status.pass{border-color:rgba(157,255,190,.35);color:#a9d8b8}.b28-status.warn{border-color:rgba(255,210,125,.4);color:var(--amber)}
    .b28-tabs{display:flex;gap:5px;overflow:auto;margin-bottom:10px}.b28-tabs button.active{border-color:var(--cyan);color:var(--cyan)}
    .b28-view{display:none}.b28-view.active{display:block}
    .b28-section{margin:0 0 14px}.b28-section h3{margin:0 0 7px;color:var(--muted);font-size:7px;letter-spacing:.12em;text-transform:uppercase}
    .b28-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.b28-kpi{padding:8px;border:1px solid rgba(39,48,54,.65);border-radius:8px;background:rgba(7,9,10,.72)}
    .b28-kpi b{display:block;font-size:13px;font-weight:500}.b28-kpi span{display:block;margin-top:3px;color:var(--muted);font:7px/1.25 monospace;overflow-wrap:anywhere}
    .b28-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(39,48,54,.5)}
    .b28-row b{display:block;font-size:9px;font-weight:500;overflow-wrap:anywhere}.b28-row small{display:block;margin-top:3px;color:var(--muted);font:7px/1.4 monospace;overflow-wrap:anywhere}
    .b28-row .b28-actions{display:flex;gap:4px;align-items:center}.b28-pill{display:inline-block;padding:3px 5px;border:1px solid rgba(39,48,54,.75);border-radius:999px;color:var(--muted);font:6.5px/1 monospace;margin:2px 3px 0 0}
    .b28-pill.pass{border-color:rgba(157,255,190,.35);color:var(--green)}.b28-pill.warn{border-color:rgba(255,210,125,.35);color:var(--amber)}
    .b28-mode{padding:8px;border:1px solid rgba(39,48,54,.65);border-radius:8px;margin-bottom:6px;cursor:pointer}.b28-mode:hover,.b28-mode.active{border-color:rgba(135,233,255,.55)}
    .b28-mode b{font-size:9px}.b28-mode small{display:block;margin-top:4px;color:var(--muted);font:7px/1.4 monospace;overflow-wrap:anywhere}
    .b28-result{padding:9px;border:1px solid rgba(39,48,54,.65);border-radius:8px;margin-bottom:6px;cursor:pointer}.b28-result:hover{border-color:rgba(135,233,255,.55)}
    .b28-result-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.b28-result b{font-size:9px;overflow-wrap:anywhere}.b28-result small{display:block;color:var(--muted);font:7px/1.4 monospace;margin-top:4px;overflow-wrap:anywhere}
    .b28-empty{padding:12px;border:1px dashed rgba(39,48,54,.8);border-radius:8px;color:var(--muted);font:8px/1.5 monospace}
    .b28-inspect-head{display:flex;gap:6px;align-items:center;margin-bottom:8px}.b28-inspect-title{min-width:0;flex:1}.b28-inspect-title b{display:block;font-size:11px;overflow-wrap:anywhere}.b28-inspect-title small{display:block;margin-top:3px;color:var(--muted);font:7px/1.4 monospace;overflow-wrap:anywhere}
    .b28-detail{display:grid;grid-template-columns:120px minmax(0,1fr);gap:8px;padding:6px 0;border-bottom:1px solid rgba(39,48,54,.45);font:8px/1.4 monospace}.b28-detail span:first-child{color:var(--muted)}.b28-detail span:last-child{text-align:right;overflow-wrap:anywhere}
    .b28-rel{padding:7px;border:1px solid rgba(39,48,54,.55);border-radius:7px;margin-bottom:5px;cursor:pointer}.b28-rel.unresolved{cursor:default;opacity:.68}.b28-rel b{display:block;font-size:8px}.b28-rel small{display:block;margin-top:3px;color:var(--muted);font:6.5px/1.4 monospace;overflow-wrap:anywhere}
    .b28-raw{margin-top:8px}.b28-raw summary{cursor:pointer;color:var(--cyan);font:7px/1.4 monospace}.b28-raw pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:280px;overflow:auto;padding:8px;border:1px solid rgba(39,48,54,.55);border-radius:7px;background:#060809;font:7px/1.45 monospace;color:#b7c7c3}
    .b28-truth{padding:8px;border:1px solid rgba(157,255,190,.25);border-radius:8px;color:#a6cbb0;font:7px/1.5 monospace}
    .b28-graph-actions{display:flex;gap:6px;flex-wrap:wrap}.b28-graph-actions button.active{border-color:var(--green);color:var(--green)}
    @media(max-width:760px){#setka-b28-panel{top:10px;right:10px;bottom:10px;width:calc(100vw - 20px)}.b28-grid{grid-template-columns:1fr}.b28-detail{grid-template-columns:95px minmax(0,1fr)}}
  `;
  document.head.appendChild(style);

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmt=n=>new Intl.NumberFormat('ru-RU').format(Number(n||0));
  const short=(v,n=74)=>{const s=String(v??'—');return s.length>n?s.slice(0,n)+'…':s};
  const pretty=v=>{try{return JSON.stringify(v,null,2)}catch{return String(v)}};

  async function api(path){
    const r=await fetch(path,{cache:'no-store'});
    const d=await r.json().catch(()=>({ok:false,state:`HTTP_${r.status}`}));
    if(!r.ok||d?.ok===false) throw Object.assign(new Error(d?.state||`HTTP_${r.status}`),{data:d});
    return d;
  }

  function ensureChrome(){
    const actions=qs('.top-actions');
    if(actions&&!qs('#setka-b28-toggle')){
      const chip=document.createElement('span');chip.className='chip';chip.id='setka-b28-status-chip';chip.textContent='LOCAL BACKEND · …';chip.dataset.setkaProjectionRef='builtin:id:setka-b28-status-chip';chip.dataset.setkaProjectionRenameable='0';
      const btn=document.createElement('button');btn.className='action';btn.id='setka-b28-toggle';btn.type='button';btn.innerHTML='◎ <span>Структура</span>';btn.dataset.setkaProjectionRef='builtin:id:setka-b28-toggle';btn.dataset.setkaProjectionRenameable='1';
      btn.addEventListener('click',()=>togglePanel());
      actions.insertBefore(btn,actions.firstChild);
      actions.insertBefore(chip,actions.firstChild);
    }
  }

  function ensurePanel(){
    let p=qs('#setka-b28-panel');if(p)return p;
    p=document.createElement('section');p.id='setka-b28-panel';p.dataset.setkaProjectionRef='builtin:id:setka-b28-system-panel';p.dataset.setkaProjectionRenameable='0';
    p.innerHTML=`
      <div class="b28-head"><strong>SETKA · СТРУКТУРА БЭКА · LOCAL MAC</strong><div><button type="button" data-b28-refresh>ОБНОВИТЬ</button> <button type="button" data-b28-close>×</button></div></div>
      <div class="b28-scroll">
        <div class="b28-search"><input data-b28-search autocomplete="off" spellcheck="false" placeholder="Найти сущность, корабль, эксперимент, SUN, ветку, версию…"><button type="button" data-b28-search-go>НАЙТИ</button></div>
        <div class="b28-status" data-b28-status>Загрузка локального verified mirror…</div>
        <div class="b28-tabs">
          <button type="button" data-b28-tab="overview" class="active">ОБЗОР</button>
          <button type="button" data-b28-tab="search">ПОИСК</button>
          <button type="button" data-b28-tab="inspect">КАРТОЧКА</button>
        </div>
        <div class="b28-view active" data-b28-view="overview"></div>
        <div class="b28-view" data-b28-view="search"></div>
        <div class="b28-view" data-b28-view="inspect"></div>
      </div>`;
    document.body.appendChild(p);
    p.querySelector('[data-b28-close]').addEventListener('click',()=>togglePanel(false));
    p.querySelector('[data-b28-refresh]').addEventListener('click',()=>refreshAll(true));
    p.querySelector('[data-b28-search-go]').addEventListener('click',runSearch);
    p.querySelector('[data-b28-search]').addEventListener('keydown',e=>{if(e.key==='Enter')runSearch()});
    p.querySelectorAll('[data-b28-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.b28Tab)));
    return p;
  }

  function tab(name){
    const p=ensurePanel();
    p.querySelectorAll('[data-b28-tab]').forEach(b=>b.classList.toggle('active',b.dataset.b28Tab===name));
    p.querySelectorAll('[data-b28-view]').forEach(v=>v.classList.toggle('active',v.dataset.b28View===name));
  }
  function togglePanel(force){const p=ensurePanel();state.open=typeof force==='boolean'?force:!state.open;p.classList.toggle('open',state.open);qs('#setka-b28-toggle')?.classList.toggle('active',state.open);if(state.open&&!state.overview)refreshAll()}

  function frontAudit(){
    const items=window.SETKA_FRONT_PROJECTIONS?.list?.()||[];
    let system=0,ui=0,unbound=0;
    for(const x of items){
      if(x.generated){if(x.binding?.sourceRef&&x.binding?.bindingKind)system++;else unbound++}else ui++;
    }
    return {items:items.length,system,ui,unbound};
  }

  function auditState(){
    const o=state.overview||{},m=o.mirror||{},modes=o.modes||[],e=o.edgeSources||{},idx=o.systemIndex?.state||{},fa=frontAudit();
    const goodMirror=['PASS_FULL_SETKA_MIRROR','PASS_DELTA_SETKA_MIRROR'].includes(m.state);
    const complete=modes.length===5&&modes.every(x=>x.backendComplete);
    const sources=Number(e.coveragePct||0)===100;
    const good=!idx.dirty&&goodMirror&&complete&&sources&&fa.unbound===0;
    return {good,goodMirror,complete,sources,indexFresh:!idx.dirty,front:fa};
  }

  function renderStatus(){
    const el=ensurePanel().querySelector('[data-b28-status]');
    const a=auditState(),o=state.overview||{},m=o.mirror||{};
    el.className='b28-status '+(a.good?'pass':'warn');
    el.textContent=`${a.good?'PASS':'CHECK'} · mirror ${m.state||'—'} · index ${a.indexFresh?'FRESH':'DIRTY'} · modes ${a.complete?'5/5':'INCOMPLETE'} · edge sources ${o.edgeSources?.coveragePct??'—'}% · front system/ui/unbound ${a.front.system}/${a.front.ui}/${a.front.unbound}`;
    const chip=qs('#setka-b28-status-chip');if(chip)chip.textContent=`LOCAL BACKEND · ${fmt(o.systemIndex?.objects)} / ${fmt(o.systemIndex?.relations)}`;
  }

  function modeCard(m){
    return `<div class="b28-mode ${state.mode===m.modeDisplay?'active':''}" data-b28-mode="${esc(m.modeDisplay)}"><b>${esc(m.modeDisplay)}</b><small>${esc(m.branchName||m.branchRef)}<br>${esc(m.versionRef)} · ${esc(m.runtimeState)}<br>${m.backendComplete?'BACKEND COMPLETE':'BACKEND GAP'}</small></div>`;
  }

  function renderOverview(){
    const host=ensurePanel().querySelector('[data-b28-view="overview"]'),o=state.overview;if(!o){host.innerHTML='<div class="b28-empty">Нет overview.</div>';return}
    const kinds=Object.entries(o.systemIndex?.objectKinds||{}).sort((a,b)=>b[1]-a[1]);
    const versions=o.versions||[],branches=o.branches||[],cold=o.coldExcluded||[],m=o.mirror||{};
    host.innerHTML=`
      <section class="b28-section"><h3>Verified Mac mirror</h3><div class="b28-grid">
        <div class="b28-kpi"><b>${fmt(o.systemIndex?.objects)}</b><span>INDEXED OBJECTS</span></div>
        <div class="b28-kpi"><b>${fmt(o.systemIndex?.relations)}</b><span>INDEXED RELATIONS</span></div>
        <div class="b28-kpi"><b>${fmt(m.tableCount||m.table_count)}</b><span>MIRRORED RELATIONS</span></div>
        <div class="b28-kpi"><b>${fmt(m.rowCount||m.row_count)}</b><span>MIRRORED ROWS</span></div>
      </div><div class="b28-status pass" style="margin-top:7px">${esc(m.state)} · receipt ${esc(m.serverReceiptRef||m.receiptRef||'—')} · Git ${esc(short(m.codeCommit,14))}</div></section>
      <section class="b28-section"><h3>5 режимов · реальные branch/version baseline</h3>${(o.modes||[]).map(modeCard).join('')}</section>
      <section class="b28-section"><h3>Системные версии</h3>${versions.map(v=>`<div class="b28-row"><div><b>${esc(v.label||v.versionRef)}</b><small>${esc(v.versionRef)} · ${esc(v.state)}<br>parent ${esc(v.parentVersionRef||'—')}</small></div><div class="b28-actions"><button data-b28-open-kind="VERSION" data-b28-open-ref="${esc(v.versionRef)}">ОТКРЫТЬ</button></div></div>`).join('')||'<div class="b28-empty">Версий нет.</div>'}</section>
      <section class="b28-section"><h3>Параллельные ветки · ${branches.length}</h3>${branches.map(b=>`<div class="b28-row"><div><b>${esc(b.name||b.branchRef)}</b><small>${esc(b.kind)} · ${esc(b.runtimeState)}<br>${esc(b.branchRef)} · head ${esc(b.headVersionRef||'—')}</small></div><div class="b28-actions"><button data-b28-open-kind="BRANCH" data-b28-open-ref="${esc(b.branchRef)}">ОТКРЫТЬ</button></div></div>`).join('')}</section>
      <section class="b28-section"><h3>Объекты индекса</h3><div>${kinds.map(([k,n])=>`<span class="b28-pill">${esc(k)} · ${fmt(n)}</span>`).join('')}</div></section>
      <section class="b28-section"><h3>Front ↔ Back / portability</h3><div class="b28-detail"><span>Edge sources</span><span>${fmt(o.edgeSources?.gitCurrent)} / ${fmt(o.edgeSources?.deployed)} · ${o.edgeSources?.coveragePct}%</span></div><div class="b28-detail"><span>Front catalog</span><span>${fmt(o.frontBackendCatalogCount)}</span></div><div class="b28-detail"><span>Version lineage</span><span>${fmt(o.versionLineageMembers)} members</span></div><div class="b28-detail"><span>Index dirty</span><span>${esc(o.systemIndex?.state?.dirty)}</span></div></section>
      <section class="b28-section"><h3>COLD experiment RAW · не дублируется на Mac</h3>${cold.map(x=>`<div class="b28-row"><div><b>${esc(x.schema)}.${esc(x.table)}</b><small>${esc(x.storageClass)} · ${esc(x.sourceRetention)}<br>${esc(x.rehydrationPolicy||x.reason)}</small></div></div>`).join('')||'<div class="b28-empty">Нет исключений.</div>'}</section>
      <section class="b28-section"><h3>Центральный граф</h3><div class="b28-graph-actions"><button data-b28-reload-graph>ПЕРЕСТРОИТЬ ИЗ БЭКА</button><button data-b28-events-graph class="${state.eventsInGraph?'active':''}">СОБЫТИЯ: ${state.eventsInGraph?'ВКЛ':'ВЫКЛ'}</button></div></section>
      <div class="b28-truth">TRUTH · топология, объекты, связи, ветки и версии читаются из verified Mac mirror. Координаты 3D — только детерминированная визуальная раскладка и не являются фактом бэка. Неразрешённые target/source refs не дорисовываются как сущности.</div>
    `;
    host.querySelectorAll('[data-b28-open-kind]').forEach(b=>b.addEventListener('click',()=>inspect(b.dataset.b28OpenKind,b.dataset.b28OpenRef)));
    host.querySelectorAll('[data-b28-mode]').forEach(b=>b.addEventListener('click',()=>selectMode(b.dataset.b28Mode)));
    host.querySelector('[data-b28-reload-graph]')?.addEventListener('click',loadBackendGraph);
    host.querySelector('[data-b28-events-graph]')?.addEventListener('click',()=>{state.eventsInGraph=!state.eventsInGraph;renderOverview();loadBackendGraph()});
  }

  function renderSearch(){
    const host=ensurePanel().querySelector('[data-b28-view="search"]');
    if(!state.search.length){host.innerHTML='<div class="b28-empty">Введи запрос. Поиск идёт по всему локальному system index + веткам + системным версиям.</div>';return}
    host.innerHTML=state.search.map((x,i)=>`<div class="b28-result" data-b28-result="${i}"><div class="b28-result-top"><b>${esc(x.label||x.ref)}</b><span class="b28-pill">${esc(x.kind)}</span></div><small>${esc(x.ref)}<br>${esc(x.subtype||'—')} · ${esc(x.state||'—')} · OUT ${fmt(x.outbound)} / IN ${fmt(x.inbound)} · ${esc(x.source)}</small></div>`).join('');
    host.querySelectorAll('[data-b28-result]').forEach(el=>el.addEventListener('click',()=>{const x=state.search[Number(el.dataset.b28Result)];inspect(x.kind,x.ref)}));
  }

  function detailRow(k,v){return `<div class="b28-detail"><span>${esc(k)}</span><span>${esc(typeof v==='object'?short(pretty(v),260):v)}</span></div>`}
  function renderInspect(){
    const host=ensurePanel().querySelector('[data-b28-view="inspect"]'),d=state.inspect;
    if(!d){host.innerHTML='<div class="b28-empty">Карточка не выбрана.</div>';return}
    const rec=d.record||{},label=rec.display_name_ru||rec.displayNameRu||rec.version_label||rec.display_name_ru||d.ref;
    const outgoing=d.outgoing||[],incoming=d.incoming||[];
    const relationHtml=(arr)=>arr.map((r,i)=>`<div class="b28-rel ${r.indexedEndpoint?'':'unresolved'}" data-rel-kind="${r.indexedEndpoint?esc(r.otherKind):''}" data-rel-ref="${r.indexedEndpoint?esc(r.otherRef):''}"><b>${esc(r.direction)} · ${esc(r.relationKind)} → ${esc(r.otherLabel||r.otherRef)}</b><small>${esc(r.otherKind)} · ${esc(r.otherRef)} · ${r.indexedEndpoint?'INDEXED ENDPOINT':'EXTERNAL / NOT INDEXED'}${r.evidenceRef?' · evidence '+esc(r.evidenceRef):''}</small></div>`).join('');
    let specialized='';
    if(d.kind==='BRANCH') specialized=`<section class="b28-section"><h3>Branch events · ${fmt(d.eventCount)}</h3>${(d.latestEvents||[]).slice(0,20).map(e=>`<div class="b28-row"><div><b>#${esc(e.branch_event_no)} · ${esc(e.event_kind)}</b><small>${esc(e.branch_event_ref)} · ${esc(e.occurred_at)}</small></div></div>`).join('')}</section>`;
    if(d.kind==='VERSION') specialized=`<section class="b28-section"><h3>Branches on version</h3>${(d.branches||[]).map(b=>`<div class="b28-row"><div><b>${esc(b.display_name_ru||b.branch_ref)}</b><small>${esc(b.branch_ref)} · ${esc(b.runtime_state)}</small></div><button data-b28-open-kind="BRANCH" data-b28-open-ref="${esc(b.branch_ref)}">ОТКРЫТЬ</button></div>`).join('')}</section>`;
    host.innerHTML=`
      <div class="b28-inspect-head"><button type="button" data-b28-back>←</button><div class="b28-inspect-title"><b>${esc(label)}</b><small>${esc(d.kind)} · ${esc(d.ref)} · ${esc(d.dataSource)}</small></div><button type="button" data-b28-spot>ГРАФ</button></div>
      <section class="b28-section"><h3>Backend record</h3>${detailRow('kind',d.kind)}${detailRow('ref',d.ref)}${detailRow('source',rec.source_relation||rec.sourceRelation||'registry')}${detailRow('state',rec.state||rec.runtime_state||rec.version_state)}${detailRow('subtype',rec.subtype||rec.branch_kind||rec.canon_version)}${detailRow('parent',rec.parent_ref||rec.parentVersionRef||rec.parent_version_ref)}${detailRow('scope',rec.scope_ref||rec.lineage_ref)}</section>
      ${specialized}
      ${(d.metrics||[]).length?`<section class="b28-section"><h3>Метрики · ${d.metrics.length}</h3>${d.metrics.map(m=>`<div class="b28-row"><div><b>${esc(m.label||m.ref)}</b><small>${esc(m.ref)} · ${esc(m.state||'—')}</small></div></div>`).join('')}</section>`:''}
      ${outgoing.length?`<section class="b28-section"><h3>Исходящие связи · ${fmt(d.outgoingCount)}</h3>${relationHtml(outgoing)}</section>`:''}
      ${incoming.length?`<section class="b28-section"><h3>Входящие связи · ${fmt(d.incomingCount)}</h3>${relationHtml(incoming)}</section>`:''}
      ${(d.contextMatches||[]).length?`<section class="b28-section"><h3>Контекстные совпадения</h3>${d.contextMatches.slice(0,30).map(x=>`<div class="b28-row"><div><b>${esc(x.label||x.ref)}</b><small>${esc(x.kind)} · ${esc(x.ref)}</small></div><button data-b28-open-kind="${esc(x.kind)}" data-b28-open-ref="${esc(x.ref)}">ОТКРЫТЬ</button></div>`).join('')}</section>`:''}
      <details class="b28-raw"><summary>RAW BACKEND RECORD / EVIDENCE</summary><pre></pre></details>
      <div class="b28-truth">${esc(d.truthBoundary||'Показаны только доказанные данные локального backend mirror.')}</div>
    `;
    host.querySelector('.b28-raw pre').textContent=pretty(d);
    host.querySelector('[data-b28-back]')?.addEventListener('click',backInspect);
    host.querySelector('[data-b28-spot]')?.addEventListener('click',()=>spotlightRef(d.ref));
    host.querySelectorAll('.b28-rel[data-rel-kind]').forEach(el=>{if(el.dataset.relKind)el.addEventListener('click',()=>inspect(el.dataset.relKind,el.dataset.relRef))});
    host.querySelectorAll('[data-b28-open-kind]').forEach(b=>b.addEventListener('click',()=>inspect(b.dataset.b28OpenKind,b.dataset.b28OpenRef)));
  }

  async function runSearch(){
    const input=ensurePanel().querySelector('[data-b28-search]'),q=String(input.value||'').trim();if(!q)return;
    tab('search');const host=ensurePanel().querySelector('[data-b28-view="search"]');host.innerHTML='<div class="b28-empty">Ищу по локальному system index…</div>';
    try{const d=await api(`/api/b28/search?q=${encodeURIComponent(q)}&limit=60`);state.search=d.results||[];renderSearch()}catch(e){host.innerHTML=`<div class="b28-empty">ОШИБКА · ${esc(e.data?.state||e.message)}</div>`}
  }

  async function inspect(kind,ref,{push=true}={}){
    if(!kind||!ref)return;if(push&&state.inspect)state.history.push({kind:state.inspect.kind,ref:state.inspect.ref});
    tab('inspect');const host=ensurePanel().querySelector('[data-b28-view="inspect"]');host.innerHTML='<div class="b28-empty">Читаю backend record и связи…</div>';
    try{state.inspect=await api(`/api/b28/inspect?kind=${encodeURIComponent(kind)}&ref=${encodeURIComponent(ref)}`);renderInspect()}catch(e){host.innerHTML=`<div class="b28-empty">ОШИБКА · ${esc(e.data?.state||e.message)}</div>`}
  }
  function backInspect(){const x=state.history.pop();if(x)inspect(x.kind,x.ref,{push:false});else tab('overview')}

  function hash32(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h>>>0}
  function rand01(seed){seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}
  function convertGraph(g){
    const rawNodes=Array.isArray(g.nodes)?g.nodes:[],rawEdges=Array.isArray(g.edges)?g.edges:[];
    const groups=new Map();rawNodes.forEach(n=>{const k=String(n[0]||'OBJECT');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(n)});
    const kinds=[...groups.keys()].sort();const degree=new Map();
    const id=(k,r)=>`${k}::${r}`;
    rawEdges.forEach(e=>{const a=id(e[0],e[1]),b=id(e[2],e[3]);degree.set(a,(degree.get(a)||0)+1);degree.set(b,(degree.get(b)||0)+1)});
    const nodes=[];const radiusBase=Math.max(14,Math.sqrt(rawNodes.length)*.18);
    kinds.forEach((kind,ki)=>{const arr=groups.get(kind).sort((a,b)=>String(a[1]).localeCompare(String(b[1])));const ga=Math.PI*(3-Math.sqrt(5));const ringAngle=2*Math.PI*ki/Math.max(1,kinds.length);const cx=Math.cos(ringAngle)*radiusBase,cz=Math.sin(ringAngle)*radiusBase,cy=((ki%5)-2)*2.2;const localR=Math.max(1.2,Math.min(8,Math.sqrt(arr.length)*.09));
      arr.forEach((n,i)=>{const ref=String(n[1]||''),seed=hash32(kind+'|'+ref),u=(i+.5)/Math.max(1,arr.length),phi=Math.acos(1-2*u),theta=ga*i+(rand01(seed)-.5)*.28;const rr=localR*(.35+.65*Math.cbrt((i+1)/Math.max(1,arr.length)));let x=cx+rr*Math.sin(phi)*Math.cos(theta),y=cy+rr*Math.cos(phi),z=cz+rr*Math.sin(phi)*Math.sin(theta);if(kind==='MODE'){x=(i-(arr.length-1)/2)*2.2;y=7;z=0}if(kind==='VERSION'){x=(i-(arr.length-1)/2)*3;y=5.5;z=0}if(kind==='BRANCH'){x=(i%7-3)*1.7;y=3-Math.floor(i/7)*1.25;z=-2.5}
        const parent=n[5]?id(kind,String(n[5])):null;nodes.push([id(kind,ref),parent,kind,ki,0,degree.get(id(kind,ref))||0,String(n[2]||ref),String(n[3]||kind),['MODE','VERSION','BRANCH'].includes(kind),x,y,z]);
      });
    });
    const edges=rawEdges.map(e=>[id(e[0],e[1]),id(e[2],e[3]),String(e[5]||e[4]||'RELATION'),String(e[4]||'RELATION')]);
    return {ok:true,state:g.state,snapshotRef:g.snapshotRef,nodes,edges,grownNodes:nodes.length,internalEdges:edges.length,truth:{dataSource:g.dataSource,topology:g.topologyTruth,geometry:g.geometryTruth,unresolvedExternalRelationCount:g.unresolvedExternalRelationCount,historicalRelationCount:g.historicalRelationCount}};
  }

  async function waitGraphApi(ms=6000){const t=Date.now();while(Date.now()-t<ms){if(window.SETKA_B1_GRAPH_API?.loadSnapshot)return window.SETKA_B1_GRAPH_API;await new Promise(r=>setTimeout(r,60))}return null}
  async function loadBackendGraph(){
    const chip=qs('#graph-chip');if(chip)chip.textContent='BACKEND · LOADING';
    try{const g=await api(`/api/b28/graph?events=${state.eventsInGraph?'1':'0'}`);state.graph=g;const apiGraph=await waitGraphApi();if(!apiGraph)throw new Error('B1_GRAPH_API_NOT_READY');const snap=convertGraph(g);apiGraph.loadSnapshot(snap,{snapshotRef:g.snapshotRef,binding:'MAC_MIRROR_SYSTEM_INDEX',classification:'LOCAL BACKEND · INDEXED STRUCTURE',graphChip:'BACKEND · STRUCTURE'});const title=qs('#graph-title'),desc=qs('#graph-description'),source=qs('#source-bar');if(title)title.textContent=`SETKA BACKEND · ${fmt(g.indexedObjectCount)} OBJECTS`;if(desc)desc.textContent=`${fmt(g.edgeCount)} resolved relations · ${fmt(g.unresolvedExternalRelationCount)} external refs kept explicit`;if(source)source.textContent='LOCAL VERIFIED MAC MIRROR · system index + branch/version registries · no synthetic backend objects';}
    catch(e){console.error(e);if(chip)chip.textContent='BACKEND · ERROR'}
  }

  function spotlightRef(ref){const b=window.SETKA_GRAPH_BRIDGE;const r=b?.spotlight?.(ref);if(r?.ok&&r.directMatches){togglePanel(false);return r}return null}
  function selectMode(mode){
    state.mode=mode;
    document.querySelectorAll('.mode-button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    const m=(state.overview?.modes||[]).find(x=>x.modeDisplay===mode);
    const chip=qs('#mode-chip');if(chip)chip.textContent=`${mode} · BACKEND VIEW`;
    const head=qs('#header-source');if(head)head.textContent=`LOCAL MAC · ${m?.branchRef||'—'}`;
    window.SETKA_B1_GRAPH_API?.switchModeView?.(mode);
    renderOverview();
    if(m?.branchRef){spotlightRef(m.branchRef);inspect('BRANCH',m.branchRef);togglePanel(true)}
  }

  document.addEventListener('click',e=>{const btn=e.target.closest?.('.mode-button[data-mode]');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();selectMode(btn.dataset.mode)},true);
  document.addEventListener('setka:graph:node-selected',e=>{const raw=String(e.detail?.id||'');const p=raw.indexOf('::');if(p<=0)return;const kind=raw.slice(0,p),ref=raw.slice(p+2);if(kind&&ref){togglePanel(true);inspect(kind,ref)}});
  document.addEventListener('setka:graph:edge-selected',e=>{const d=e.detail||{};console.info('SETKA B2.8 edge selected',d)});

  async function refreshAll(reloadGraph=false){
    if(state.busy)return;state.busy=true;ensureChrome();ensurePanel();
    try{state.overview=await api('/api/b28/overview');renderStatus();renderOverview();renderSearch();renderInspect();if(reloadGraph||!state.graph)await loadBackendGraph();}
    catch(e){console.error(e);const el=ensurePanel().querySelector('[data-b28-status]');el.className='b28-status warn';el.textContent=`B2.8 ERROR · ${e.data?.state||e.message}`;}
    finally{state.busy=false}
  }

  function boot(){ensureChrome();ensurePanel();requestAnimationFrame(()=>requestAnimationFrame(()=>refreshAll(true)))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();

  window.SETKA_BACKEND_TRUTH=Object.freeze({
    version:VERSION,marker:MARKER,open:()=>togglePanel(true),close:()=>togglePanel(false),search:q=>{ensurePanel().querySelector('[data-b28-search]').value=q;togglePanel(true);runSearch()},inspect,overview:()=>state.overview,reload:()=>refreshAll(true),graph:()=>state.graph,mode:()=>state.mode,
    dataSource:'MAC_VERIFIED_SQLITE_MIRROR',geometryClaim:false,canonMutation:false,runtimeMutation:false
  });
})();