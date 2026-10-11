(() => {
  const VERSION='B2.9.1';
  const MARKER='B2.9-SIMPLE-FRONT';
  const MODES=[
    {id:'CANON',name:'Канон',desc:'Зафиксированная эталонная ветка.'},
    {id:'LINEAR',name:'Линейная',desc:'Линейная ветка наблюдения.'},
    {id:'SELF-ORGANIZED',name:'Самоорганизация',desc:'Ветка самоорганизованной структуры.'},
    {id:'MOTORWAY-LAB',name:'Магистрали',desc:'Экспериментальная ветка магистралей.'},
    {id:'INTEGRATION',name:'Интеграция',desc:'Интеграционная ветка, где сводятся изменения.'}
  ];
  const state={
    mode:'INTEGRATION',
    overview:null,
    view:'BODY',
    transcriptStream:'SYSTEM',
    transcriptRows:[],
    context:null,
    selected:null,
    linksVisible:true
  };

  document.documentElement.dataset.setkaSimpleFront=MARKER;
  document.documentElement.dataset.setkaFrontVersion=VERSION;
  document.title='SETKA';

  const style=document.createElement('style');
  style.textContent=`
    .topbar,.mode-strip,.source-bar,.graph-stats,.graph-controls,
    #computer-panel,#feed-panel,#entity-card,
    #setka-b28-panel,#setka-b28-status-chip,#setka-b28-view-toggle,#setka-b28-toggle,
    #setka-b274-vault-toggle,#setka-b274-vault,#setka-b274-layoutbar,#setka-b274-selection,
    #layout-toggle,.b23-local-badge,.b23-lang,.b23-color-legend,.b25-chip,
    #setka-projection-anchor,#setka-projection-toolbar-extension,#setka-b271-grower,
    #setka-b272-vault,#setka-b272-selection,#setka-b273-layoutbar,#setka-b273-vault,
    #setka-b273-vault-toggle,#setka-b273-selection{display:none!important}
    .graph-meta{display:none!important}
    #graph-stage{inset:0!important}
    #graph-root{inset:0!important}

    #setka-simple-shell{position:fixed;inset:0;z-index:100100;pointer-events:none;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#e9f2ef}
    #setka-simple-shell *{box-sizing:border-box}
    .ss-header{pointer-events:auto;position:absolute;left:16px;right:16px;top:14px;height:48px;display:flex;align-items:center;gap:10px;padding:7px 9px;border:1px solid rgba(125,154,147,.25);border-radius:14px;background:rgba(5,9,9,.82);backdrop-filter:blur(18px);box-shadow:0 10px 35px rgba(0,0,0,.28)}
    .ss-brand{display:flex;align-items:center;gap:9px;min-width:116px}
    .ss-logo{width:30px;height:30px;border:1px solid rgba(157,255,190,.55);border-radius:50%;display:grid;place-items:center;font:700 12px/1 monospace;color:#baffcd}
    .ss-brand strong{font-size:12px;letter-spacing:.13em}
    .ss-branch{position:relative;display:flex;align-items:center;gap:5px;flex:1;justify-content:center}
    .ss-btn,.ss-icon{border:1px solid rgba(125,154,147,.3);background:rgba(10,15,15,.88);color:#e9f2ef;border-radius:10px;cursor:pointer}
    .ss-btn{padding:9px 12px;font-size:12px;line-height:1;white-space:nowrap}
    .ss-btn:hover,.ss-btn.active{border-color:rgba(157,255,190,.62);color:#c8ffd7}
    .ss-icon{width:28px;height:28px;padding:0;display:grid;place-items:center;font:700 11px/1 serif;color:#a9b8b4}
    .ss-icon:hover{border-color:rgba(135,233,255,.5);color:#dffaff}
    .ss-actions{display:flex;align-items:center;gap:7px}
    .ss-menu{display:none;position:absolute;top:42px;left:50%;transform:translateX(-50%);width:min(360px,calc(100vw - 32px));padding:8px;border:1px solid rgba(125,154,147,.3);border-radius:13px;background:rgba(5,9,9,.97);box-shadow:0 22px 60px rgba(0,0,0,.45)}
    .ss-menu.open{display:block}
    .ss-mode{width:100%;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:10px;border:0;border-bottom:1px solid rgba(125,154,147,.14);background:transparent;color:#e9f2ef;text-align:left;cursor:pointer}
    .ss-mode:last-child{border-bottom:0}.ss-mode:hover,.ss-mode.active{background:rgba(157,255,190,.07)}
    .ss-mode b{display:block;font-size:12px;font-weight:650}.ss-mode small{display:block;margin-top:4px;font-size:10px;color:#8fa39d;line-height:1.35}
    .ss-check{color:#a8ffbf;font-size:13px}

    .ss-graph-caption{pointer-events:auto;position:absolute;left:24px;top:88px;max-width:min(560px,calc(100vw - 48px));padding:12px 14px;border-radius:12px;background:rgba(5,9,9,.62);backdrop-filter:blur(10px)}
    .ss-graph-title{display:flex;align-items:center;gap:8px}
    .ss-graph-title strong{font-size:18px;font-weight:650}
    .ss-graph-sub{margin-top:4px;color:#a8b7b3;font-size:11px;line-height:1.4}
    .ss-shared{margin-top:5px;color:#d7c896;font-size:10px;line-height:1.4}

    .ss-graph-controls{pointer-events:auto;position:absolute;left:50%;bottom:22px;transform:translateX(-50%);display:flex;gap:7px;padding:6px;border:1px solid rgba(125,154,147,.24);border-radius:12px;background:rgba(5,9,9,.82);backdrop-filter:blur(16px)}
    .ss-graph-controls .ss-btn{font-size:11px;padding:8px 10px}

    .ss-panel{pointer-events:auto;position:absolute;top:76px;bottom:18px;width:min(390px,calc(100vw - 28px));display:none;flex-direction:column;border:1px solid rgba(125,154,147,.3);border-radius:14px;background:rgba(5,9,9,.97);box-shadow:0 24px 70px rgba(0,0,0,.5);backdrop-filter:blur(18px);overflow:hidden}
    .ss-panel.open{display:flex}.ss-panel.left{left:14px}.ss-panel.right{right:14px}
    .ss-panel-head{display:flex;align-items:center;gap:7px;padding:12px;border-bottom:1px solid rgba(125,154,147,.18)}
    .ss-panel-head strong{flex:1;font-size:13px}.ss-close{width:30px;height:30px}
    .ss-panel-body{min-height:0;overflow:auto;padding:12px}
    .ss-card{padding:11px;border:1px solid rgba(125,154,147,.2);border-radius:11px;background:rgba(10,15,15,.6);margin-bottom:8px}
    .ss-card label{display:block;color:#849a94;font-size:9px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
    .ss-card b{display:block;font-size:13px;font-weight:600;line-height:1.35}
    .ss-card p{margin:5px 0 0;color:#a8b7b3;font-size:11px;line-height:1.45}
    .ss-note{padding:10px 11px;border:1px solid rgba(215,200,150,.25);border-radius:10px;color:#d7c896;font-size:10px;line-height:1.45;margin-bottom:10px}
    .ss-search{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;margin-top:10px}
    .ss-search input{min-width:0;border:1px solid rgba(125,154,147,.3);border-radius:10px;background:#08100f;color:#eef7f4;padding:10px 11px;font-size:12px;outline:none}
    .ss-search input:focus{border-color:rgba(135,233,255,.55)}
    .ss-results{margin-top:9px}
    .ss-result{display:block;width:100%;padding:9px 10px;border:0;border-bottom:1px solid rgba(125,154,147,.13);background:transparent;color:#e9f2ef;text-align:left;cursor:pointer}
    .ss-result:hover{background:rgba(135,233,255,.05)}
    .ss-result b{display:block;font-size:11px}.ss-result small{display:block;color:#8fa39d;font-size:9px;margin-top:3px}
    .ss-tabs{display:flex;gap:6px;margin-bottom:10px}.ss-tabs .ss-btn{flex:1}
    .ss-event{padding:10px 2px;border-bottom:1px solid rgba(125,154,147,.14);cursor:pointer}
    .ss-event:hover{background:rgba(135,233,255,.035)}
    .ss-event time{display:block;color:#80948f;font-size:9px;margin-bottom:4px}.ss-event b{display:block;font-size:11px;line-height:1.4;font-weight:560}.ss-event small{display:block;margin-top:4px;color:#879a95;font-size:9px}
    .ss-empty{padding:16px 10px;color:#879a95;font-size:11px;text-align:center}

    .ss-object-card{pointer-events:auto;position:absolute;left:24px;bottom:80px;width:min(370px,calc(100vw - 48px));display:none;padding:12px;border:1px solid rgba(135,233,255,.28);border-radius:12px;background:rgba(5,9,9,.96);box-shadow:0 16px 46px rgba(0,0,0,.4)}
    .ss-object-card.open{display:block}
    .ss-object-card-head{display:flex;gap:8px;align-items:start}.ss-object-card-head>div{flex:1;min-width:0}
    .ss-object-card strong{display:block;font-size:13px;line-height:1.3}.ss-object-card small{display:block;margin-top:4px;color:#8fa39d;font-size:9px;line-height:1.4;overflow-wrap:anywhere}
    .ss-object-body{margin-top:10px}.ss-row{display:grid;grid-template-columns:105px minmax(0,1fr);gap:8px;padding:6px 0;border-top:1px solid rgba(125,154,147,.12);font-size:10px;line-height:1.4}.ss-row span:first-child{color:#81958f}.ss-row span:last-child{text-align:right;overflow-wrap:anywhere}
    .ss-related{display:flex;gap:5px;flex-wrap:wrap;margin-top:9px}.ss-related button{font-size:9px;padding:6px 8px}
    .ss-card-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}

    .ss-info{pointer-events:auto;position:absolute;inset:0;display:none;place-items:center;background:rgba(0,0,0,.46);padding:18px}.ss-info.open{display:grid}
    .ss-info-box{width:min(440px,100%);padding:16px;border:1px solid rgba(135,233,255,.3);border-radius:14px;background:#08100f;box-shadow:0 22px 70px rgba(0,0,0,.5)}
    .ss-info-box h2{margin:0 0 8px;font-size:16px}.ss-info-box p{margin:0;color:#a9b8b4;font-size:12px;line-height:1.55}.ss-info-box .ss-btn{margin-top:14px}

    @media(max-width:820px){
      .ss-header{left:8px;right:8px;top:8px;height:auto;min-height:48px;flex-wrap:wrap}
      .ss-brand{min-width:auto}.ss-brand strong{display:none}.ss-branch{order:3;flex-basis:100%}
      .ss-actions{margin-left:auto}.ss-actions .ss-btn span{display:none}
      .ss-graph-caption{top:112px;left:12px}
      .ss-panel{top:116px;bottom:10px;left:10px!important;right:10px!important;width:auto}
      .ss-graph-controls{bottom:10px;max-width:calc(100vw - 20px);overflow:auto}
    }
  `;
  document.head.appendChild(style);

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const api=async path=>{
    const r=await fetch(path,{cache:'no-store'});
    const d=await r.json().catch(()=>({ok:false,state:'INVALID_JSON'}));
    if(!r.ok||d?.ok===false)throw Object.assign(new Error(d?.state||`HTTP_${r.status}`),{data:d});
    return d;
  };
  const modeMeta=()=>MODES.find(x=>x.id===state.mode)||MODES[4];
  const displayVersion=ref=>{const s=String(ref||'');if(/B1$/.test(s))return'B1';if(/B0$/.test(s))return'B0';return s||'—'};
  const humanState=s=>{
    const map={
      FROZEN_VERIFIED_BASELINE:'зафиксирована и не изменяется',
      FROZEN_BASELINE_READY_NOT_EXECUTING:'зафиксирована, сейчас не выполняется',
      FROZEN_BASELINE_READY:'зафиксирована и готова к просмотру',
      AUTHORIZED_LOCAL_EXPERIMENTATION_READY:'готова к локальным экспериментам, сейчас не запущена',
      ACTIVE:'активна',
      INDEXED:'сохранена и проиндексирована',
      PASS:'проверена'
    };
    return map[String(s||'')]||'состояние зафиксировано';
  };
  const humanKind=k=>({
    ENTITY:'Сущность',SHIP:'Корабль',EXPERIMENT:'Эксперимент',EXPERIMENT_CAPSULE:'Капсула эксперимента',
    RUN:'Запуск',SNAPSHOT:'Слепок',VISUALIZATION:'Визуализация',EVENT:'Событие',METRIC:'Метрика',
    BRANCH:'Ветка',VERSION:'Версия',MODE:'Режим',WORLD_NODE:'Узел локального мира',WORLD_EVENT:'Внешнее событие',
    SYSTEM:'Система',IDENTITY:'Идентичность',CAPABILITY:'Возможность',DUTY:'Обязанность',MISSION:'Миссия'
  }[String(k||'').toUpperCase()]||'Объект');
  const humanSubtype=s=>({
    OBSERVATION_SCOPE:'область наблюдения',
    SYSTEM_STRUCTURE:'структура системы',
    ACTOR:'участник системы'
  }[String(s||'').toUpperCase()]||String(s||'').replaceAll('_',' ').toLowerCase()||'—');

  function infoText(kind){
    const data={
      graph:{title:'Граф',text:'Главное рабочее поле. «Тело» показывает сохранённое тело выбранной версии SETKA. «Связи» показывает только контекст выбранного объекта: сам объект и реальные связанные с ним объекты. Общая база целиком сюда больше не высыпается.'},
      onboard:{title:'Бортовой компьютер',text:'Показывает простыми словами, что сейчас открыто, и помогает найти конкретный объект в SETKA. Выбрав результат поиска, ты увидишь его карточку и карту его реальных связей.'},
      transcript:{title:'Стенограмма',text:'История системы во времени. Нажатие на событие открывает карточку события. Если у события есть связанный объект или сохранённая версия, граф автоматически переходит к этому контексту.'},
      branch:{title:'Ветка',text:'Отдельная линия состояния SETKA. Пять основных веток ведутся параллельно. На B1 у них одно сохранённое тело, поэтому при переключении веток форма тела сейчас одинаковая, а история и состояние ветки различаются.'}
    };
    return data[kind]||{title:'Что это?',text:'Элемент Верстака.'};
  }

  function build(){
    const shell=document.createElement('div');shell.id='setka-simple-shell';
    shell.innerHTML=`
      <header class="ss-header">
        <div class="ss-brand"><div class="ss-logo">S</div><strong>SETKA</strong></div>
        <div class="ss-branch">
          <button class="ss-btn" data-branch-toggle>Ветка: <b data-branch-name>Интеграция</b> ▾</button>
          <button class="ss-icon" data-info="branch">i</button>
          <div class="ss-menu" data-branch-menu></div>
        </div>
        <div class="ss-actions">
          <button class="ss-btn" data-open="onboard">⌘ <span>Бортовой</span></button>
          <button class="ss-btn" data-open="transcript">≡ <span>Стенограмма</span></button>
        </div>
      </header>

      <section class="ss-graph-caption">
        <div class="ss-graph-title"><strong data-graph-title>Тело SETKA · B1</strong><button class="ss-icon" data-info="graph">i</button></div>
        <div class="ss-graph-sub" data-graph-sub>Интеграционная ветка</div>
        <div class="ss-shared" data-shared-note></div>
      </section>

      <div class="ss-graph-controls">
        <button class="ss-btn active" data-graph-action="edges">Связи</button>
        <button class="ss-btn" data-graph-action="center">Центр</button>
        <button class="ss-btn" data-graph-action="root">Корень</button>
        <button class="ss-btn" data-graph-action="view">Вид: <b data-view-label>Тело</b></button>
      </div>

      <aside class="ss-panel left" data-panel="onboard">
        <div class="ss-panel-head"><strong>Бортовой компьютер</strong><button class="ss-icon" data-info="onboard">i</button><button class="ss-icon ss-close" data-close="onboard">×</button></div>
        <div class="ss-panel-body" data-onboard-body><div class="ss-empty">Загрузка…</div></div>
      </aside>

      <aside class="ss-panel right" data-panel="transcript">
        <div class="ss-panel-head"><strong>Стенограмма</strong><button class="ss-icon" data-info="transcript">i</button><button class="ss-icon ss-close" data-close="transcript">×</button></div>
        <div class="ss-panel-body">
          <div class="ss-tabs"><button class="ss-btn active" data-stream="SYSTEM">Вся система</button><button class="ss-btn" data-stream="BRANCH">Эта ветка</button></div>
          <div data-transcript-body><div class="ss-empty">Загрузка…</div></div>
        </div>
      </aside>

      <section class="ss-object-card" data-object-card>
        <div class="ss-object-card-head"><div><strong data-object-title></strong><small data-object-sub></small></div><button class="ss-icon" data-object-close>×</button></div>
        <div class="ss-object-body" data-object-body></div>
      </section>

      <div class="ss-info" data-info-modal>
        <div class="ss-info-box"><h2 data-info-title></h2><p data-info-text></p><button class="ss-btn" data-info-close>Понятно</button></div>
      </div>
    `;
    document.body.appendChild(shell);
    shell.querySelector('[data-branch-toggle]').addEventListener('click',()=>shell.querySelector('[data-branch-menu]').classList.toggle('open'));
    shell.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openPanel(b.dataset.open)));
    shell.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closePanel(b.dataset.close)));
    shell.querySelectorAll('[data-info]').forEach(b=>b.addEventListener('click',()=>showInfo(b.dataset.info)));
    shell.querySelector('[data-info-close]').addEventListener('click',hideInfo);
    shell.querySelector('[data-info-modal]').addEventListener('click',e=>{if(e.target===e.currentTarget)hideInfo()});
    shell.querySelector('[data-object-close]').addEventListener('click',()=>shell.querySelector('[data-object-card]').classList.remove('open'));
    shell.querySelectorAll('[data-graph-action]').forEach(b=>b.addEventListener('click',()=>graphAction(b.dataset.graphAction,b)));
    shell.querySelectorAll('[data-stream]').forEach(b=>b.addEventListener('click',()=>setStream(b.dataset.stream)));
    renderBranches();
  }

  function renderBranches(){
    const menu=document.querySelector('[data-branch-menu]');if(!menu)return;
    menu.innerHTML=MODES.map(m=>`<button class="ss-mode ${m.id===state.mode?'active':''}" data-mode="${m.id}"><span><b>${m.name}</b><small>${m.desc}</small></span><span class="ss-check">${m.id===state.mode?'✓':''}</span></button>`).join('');
    menu.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>selectMode(b.dataset.mode)));
    document.querySelector('[data-branch-name]').textContent=modeMeta().name;
  }

  async function refreshOverview(){
    try{state.overview=await api('/api/b28/overview');renderOnboard();updateCaption()}
    catch(e){const host=document.querySelector('[data-onboard-body]');if(host)host.innerHTML='<div class="ss-empty">Не удалось прочитать локальное состояние SETKA.</div>'}
  }

  function currentModeData(){
    const display=state.mode.replaceAll('_','-');
    return (state.overview?.modes||[]).find(x=>x.modeRef===state.mode||x.modeDisplay===display)||{};
  }

  function updateCaption(){
    const m=currentModeData(),v=displayVersion(m.versionRef);
    const title=document.querySelector('[data-graph-title]');
    const sub=document.querySelector('[data-graph-sub]');
    const shared=document.querySelector('[data-shared-note]');
    const viewLabel=document.querySelector('[data-view-label]');
    if(state.view==='BODY'){
      title.textContent=`Тело SETKA · ${v}`;
      sub.textContent=`${modeMeta().name} · ${humanState(m.runtimeState)}`;
      const peers=(state.overview?.modes||[]).filter(x=>x.bodySnapshotRef&&x.bodySnapshotRef===m.bodySnapshotRef).length;
      shared.textContent=peers>1?`Форма тела сейчас общая для ${peers} основных веток.`:'';
      viewLabel.textContent='Тело';
    }else if(state.context){
      title.textContent=`Связи · ${state.context.root?.label||state.context.root?.ref||'объект'}`;
      sub.textContent=`${state.context.nodeCount||0} объектов · ${state.context.edgeCount||0} реальных связей · до ${state.context.depth||0} шагов от выбранного объекта`;
      shared.textContent=state.context.truncated?'Показана ближайшая часть контекста, без перегрузки всего бэка.':'Показан только контекст выбранного объекта, а не вся база.';
      viewLabel.textContent='Связи';
    }else{
      title.textContent='Связи объекта';
      sub.textContent='Сначала выбери объект в Бортовом или на графе.';
      shared.textContent='Весь бэк целиком здесь больше не показывается.';
      viewLabel.textContent='Связи';
    }
  }

  function renderOnboard(){
    const host=document.querySelector('[data-onboard-body]');if(!host)return;
    const m=currentModeData(),v=displayVersion(m.versionRef);
    const peers=(state.overview?.modes||[]).filter(x=>x.bodySnapshotRef&&x.bodySnapshotRef===m.bodySnapshotRef).length;
    host.innerHTML=`
      <div class="ss-card"><label>Сейчас открыто</label><b>SETKA · версия ${esc(v)}</b><p>${esc(modeMeta().name)} ветка.</p></div>
      <div class="ss-card"><label>Состояние</label><b>${esc(humanState(m.runtimeState))}</b><p>Переключение ветки меняет контекст просмотра, а не запускает выполнение.</p></div>
      ${peers>1?`<div class="ss-note">У ${peers} основных веток сейчас одно сохранённое тело B1. Поэтому форма графа при переключении этих веток остаётся одинаковой; меняются история и состояние ветки.</div>`:''}
      <div class="ss-card"><label>Найти в системе</label><b>Что тебе показать?</b><p>Выбери результат — я открою карточку объекта и его реальные связи.</p>
        <div class="ss-search"><input data-simple-search placeholder="Например: солнце, эксперимент, корабль…"><button class="ss-btn" data-simple-search-go>Найти</button></div>
        <div class="ss-results" data-simple-results></div>
      </div>
    `;
    host.querySelector('[data-simple-search-go]').addEventListener('click',runSearch);
    host.querySelector('[data-simple-search]').addEventListener('keydown',e=>{if(e.key==='Enter')runSearch()});
  }

  async function runSearch(){
    const input=document.querySelector('[data-simple-search]'),host=document.querySelector('[data-simple-results]');
    const q=String(input?.value||'').trim();if(!q||!host)return;
    host.innerHTML='<div class="ss-empty">Ищу…</div>';
    try{
      const d=await api(`/api/b28/search?q=${encodeURIComponent(q)}&limit=10`);
      const rows=d.results||[];
      if(!rows.length){host.innerHTML='<div class="ss-empty">Ничего не найдено.</div>';return}
      host.innerHTML=rows.map((x,i)=>`<button class="ss-result" data-r="${i}"><b>${esc(x.label||x.ref)}</b><small>${esc(humanKind(x.kind))}${x.state?' · '+esc(humanState(x.state)):''}</small></button>`).join('');
      host.querySelectorAll('[data-r]').forEach(b=>b.addEventListener('click',()=>selectBackendObject(rows[Number(b.dataset.r)])));
    }catch(e){host.innerHTML='<div class="ss-empty">Поиск сейчас недоступен.</div>'}
  }

  async function selectBackendObject(x){
    if(!x?.kind||!x?.ref)return;
    state.selected={kind:x.kind,ref:x.ref,label:x.label||x.ref};
    await Promise.allSettled([showBackendCard(x.kind,x.ref),showContext(x.kind,x.ref)]);
  }

  async function showBackendCard(kind,ref){
    try{
      const d=await api(`/api/b28/inspect?kind=${encodeURIComponent(kind)}&ref=${encodeURIComponent(ref)}`);
      const rec=d.record||{};
      const label=rec.display_name_ru||rec.version_label||d.ref||ref;
      const related=[...(d.outgoing||[]),...(d.incoming||[])].filter(x=>x.indexedEndpoint).slice(0,8);
      showCard({
        title:label,
        sub:humanKind(d.kind||kind),
        rows:[
          ['Что это',humanSubtype(rec.subtype||rec.branch_kind||rec.canon_version||d.kind||kind)],
          ['Состояние',humanState(rec.state||rec.runtime_state||rec.version_state)],
          ['Связей',(Number(d.outgoingCount||0)+Number(d.incomingCount||0)).toLocaleString('ru-RU')],
          ...(d.metrics?.length?[['Метрик',String(d.metrics.length)]]:[])
        ],
        related,
        actions:[{label:'Показать связи',fn:()=>showContext(d.kind||kind,d.ref||ref)},{label:'Вернуться к телу',fn:showBody}]
      });
    }catch(e){
      showCard({title:state.selected?.label||ref,sub:humanKind(kind),rows:[['Состояние','Объект найден, подробная карточка недоступна']]});
    }
  }

  function ctxId(kind,ref){return `CTX::${kind}::${encodeURIComponent(ref)}`}
  function parseCtxId(id){
    const m=String(id||'').match(/^CTX::([^:]+)::(.+)$/);if(!m)return null;
    try{return{kind:m[1],ref:decodeURIComponent(m[2])}}catch{return null}
  }

  function contextToSnapshot(g){
    const nodes=g.nodes||[],edges=g.edges||[];
    const degree=new Map();
    edges.forEach(e=>{
      const a=ctxId(e.sourceKind,e.sourceRef),b=ctxId(e.targetKind,e.targetRef);
      degree.set(a,(degree.get(a)||0)+1);degree.set(b,(degree.get(b)||0)+1);
    });
    const byDepth=new Map();
    nodes.forEach(n=>{const d=Number(n.depth||0);if(!byDepth.has(d))byDepth.set(d,[]);byDepth.get(d).push(n)});
    const positions=new Map();
    for(const [depth,arr0] of [...byDepth.entries()].sort((a,b)=>a[0]-b[0])){
      const arr=[...arr0].sort((a,b)=>String(a.kind).localeCompare(String(b.kind))||String(a.label).localeCompare(String(b.label)));
      if(depth===0){arr.forEach(n=>positions.set(ctxId(n.kind,n.ref),[0,0,0]));continue}
      const radius=4.3*depth;
      arr.forEach((n,i)=>{
        const angle=2*Math.PI*i/Math.max(1,arr.length);
        const kindBand=['ENTITY','SHIP','EXPERIMENT','EXPERIMENT_CAPSULE','RUN','VISUALIZATION','SNAPSHOT','WORLD_NODE','WORLD_EVENT','EVENT'].indexOf(n.kind);
        const y=(kindBand<0?0:(kindBand-4.5)*.34)+(i%3-1)*.12;
        positions.set(ctxId(n.kind,n.ref),[Math.cos(angle)*radius,y,Math.sin(angle)*radius]);
      });
    }
    const graphNodes=nodes.map(n=>{
      const id=ctxId(n.kind,n.ref),p=positions.get(id)||[0,0,0];
      return [id,n.isRoot?null:null,n.kind,Number(n.depth||0),0,degree.get(id)||0,n.label||n.ref,n.subtype||n.kind,Boolean(n.isRoot),p[0],p[1],p[2]];
    });
    const graphEdges=edges.map(e=>[ctxId(e.sourceKind,e.sourceRef),ctxId(e.targetKind,e.targetRef),e.relationState||e.relationKind||'RELATION',e.relationKind||'RELATION']);
    return {ok:true,state:g.state,snapshotRef:`CONTEXT::${g.root?.kind||''}::${g.root?.ref||''}`,nodes:graphNodes,edges:graphEdges,grownNodes:graphNodes.length,internalEdges:graphEdges.length};
  }

  async function showContext(kind,ref){
    try{
      const g=await api(`/api/b29/context?kind=${encodeURIComponent(kind)}&ref=${encodeURIComponent(ref)}&depth=3&max=90`);
      state.context=g;state.view='CONTEXT';
      const graphApi=window.SETKA_B1_GRAPH_API;
      if(!graphApi?.loadSnapshot)throw new Error('GRAPH_API_NOT_READY');
      graphApi.loadSnapshot(contextToSnapshot(g),{
        snapshotRef:`CONTEXT::${g.root?.ref||ref}`,
        binding:g.root?.ref||ref,
        classification:'СВЯЗИ ВЫБРАННОГО ОБЪЕКТА',
        graphChip:'СВЯЗИ'
      });
      updateCaption();
      return g;
    }catch(e){
      showCard({title:state.selected?.label||ref,sub:'Связи',rows:[['Результат','Не удалось построить контекст объекта']]});
      return null;
    }
  }

  async function showBody({version=null}={}){
    state.view='BODY';
    if(version)await window.SETKA_BACKEND_TRUTH?.showBody?.({version});
    else await window.SETKA_BACKEND_TRUTH?.showBody?.({mode:state.mode});
    updateCaption();
  }

  async function selectMode(mode){
    if(!MODES.some(x=>x.id===mode))return;
    state.mode=mode;renderBranches();
    document.querySelector('[data-branch-menu]')?.classList.remove('open');
    try{await window.SETKA_B1_GRAPH_API?.switchModeView?.(mode)}catch{}
    await showBody();
    renderOnboard();
    if(state.transcriptStream==='BRANCH')loadTranscript();
  }

  function openPanel(name){
    const el=document.querySelector(`[data-panel="${name}"]`);if(!el)return;
    el.classList.add('open');
    if(name==='onboard')refreshOverview();
    if(name==='transcript')loadTranscript();
  }
  function closePanel(name){document.querySelector(`[data-panel="${name}"]`)?.classList.remove('open')}

  function showInfo(kind){const d=infoText(kind),modal=document.querySelector('[data-info-modal]');document.querySelector('[data-info-title]').textContent=d.title;document.querySelector('[data-info-text]').textContent=d.text;modal.classList.add('open')}
  function hideInfo(){document.querySelector('[data-info-modal]')?.classList.remove('open')}

  async function graphAction(action,button){
    if(action==='edges'){
      document.querySelector('#edges-toggle')?.click();
      state.linksVisible=!state.linksVisible;
      button.classList.toggle('active',state.linksVisible);
      return;
    }
    if(action==='center'){document.querySelector('#reset-view')?.click();return}
    if(action==='root'){document.querySelector('#focus-root')?.click();return}
    if(action==='view'){
      if(state.view==='BODY'){
        if(state.context){
          state.view='CONTEXT';
          window.SETKA_B1_GRAPH_API?.loadSnapshot?.(contextToSnapshot(state.context),{
            snapshotRef:`CONTEXT::${state.context.root?.ref||''}`,
            binding:state.context.root?.ref||'OBJECT',
            classification:'СВЯЗИ ВЫБРАННОГО ОБЪЕКТА',
            graphChip:'СВЯЗИ'
          });
          updateCaption();
        }else{
          openPanel('onboard');
          showCard({title:'Связи объекта',sub:'Сначала выбери объект',rows:[['Что сделать','Найди объект в Бортовом и нажми на него. Тогда здесь появится только его реальный контекст, а не вся база.']]});
        }
      }else await showBody();
    }
  }

  function setStream(stream){
    state.transcriptStream=stream;
    document.querySelectorAll('[data-stream]').forEach(b=>b.classList.toggle('active',b.dataset.stream===stream));
    loadTranscript();
  }

  function humanEvent(row){
    const kind=String(row.eventKind||'');
    const map={
      MAC_MIRROR_VERIFIED_AT_CURRENT_TIP:'Mac синхронизирован с текущим состоянием SETKA',
      MAC_MIRROR_FIRST_DELTA_PASS_AND_SELF_NOISE_FIX_BOUND:'Обновлён механизм синхронизации Mac',
      MAC_MIRROR_CONTINUATION_AUDIT_READY:'Проверена готовность локальной копии SETKA',
      MINIMAL_FRONT_B28_LOCAL_BACKEND_TRUTH_BOUND:'Фронт связан с реальной структурой SETKA',
      FRONT_B28_BODY_BACKEND_SEPARATION_AND_LAYOUT_PERSISTENCE_BOUND:'Разделены тело и структура системы',
      FRONT_B29_SIMPLE_SURFACE_RESET_BOUND:'Фронт упрощён до основных рабочих элементов',
      B1_BASELINE_BOUND:'Зафиксирована базовая точка B1',
      LINEAR_PRE_B1_BODY_HISTORY_VIEWER_READY:'Подготовлена история тела до B1'
    };
    if(map[kind])return map[kind];
    const summary=String(row.summary||'').trim();
    if(/[А-Яа-яЁё]/.test(summary))return summary;
    return kind?kind.toLowerCase().replaceAll('_',' ').replace(/^./,c=>c.toUpperCase()):'Системное событие';
  }

  function eventTime(v){
    const d=new Date(v);if(Number.isNaN(d.getTime()))return '';
    return d.toLocaleString('ru-RU',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  }

  async function loadTranscript(){
    const host=document.querySelector('[data-transcript-body]');if(!host)return;
    host.innerHTML='<div class="ss-empty">Загрузка…</div>';
    try{
      const q=new URLSearchParams({stream:state.transcriptStream,mode:state.mode,limit:'60'});
      const d=await api('/api/b29/transcript?'+q.toString());
      state.transcriptRows=d.rows||[];
      if(!state.transcriptRows.length){host.innerHTML='<div class="ss-empty">Здесь пока нет событий.</div>';return}
      host.innerHTML=state.transcriptRows.map((r,i)=>`<article class="ss-event" data-e="${i}"><time>${esc(eventTime(r.occurredAt))}</time><b>${esc(humanEvent(r))}</b><small>${state.transcriptStream==='BRANCH'?esc(modeMeta().name+' ветка'):'SETKA'}${r.contextCandidates?.length?' · есть связанный объект':''}${r.versionKnown?' · есть снимок версии':''}</small></article>`).join('');
      host.querySelectorAll('[data-e]').forEach(el=>el.addEventListener('click',()=>openTranscriptEvent(state.transcriptRows[Number(el.dataset.e)])));
    }catch(e){host.innerHTML='<div class="ss-empty">Не удалось загрузить стенограмму.</div>'}
  }

  async function openTranscriptEvent(row){
    const candidates=row.contextCandidates||[];
    const rows=[
      ['Когда',eventTime(row.occurredAt)],
      ['Что произошло',humanEvent(row)],
      ...(row.version?[['Версия',displayVersion(row.version)]]:[]),
      ...(row.branchRef?[['Ветка',modeMeta().name]]:[])
    ];
    const actions=[];
    if(candidates[0]){
      const x=candidates[0];
      actions.push({label:'Показать связанные объекты',fn:()=>selectBackendObject(x)});
    }
    if(row.versionKnown&&row.version){
      actions.push({label:'Показать тело версии',fn:()=>showBody({version:row.version})});
    }
    if(candidates[0]){
      await showContext(candidates[0].kind,candidates[0].ref);
    }else if(row.versionKnown&&row.version){
      await showBody({version:row.version});
    }
    showCard({
      title:humanEvent(row),
      sub:`Событие №${row.eventNo??'—'}`,
      rows,
      related:candidates.slice(0,6).map(x=>({otherKind:x.kind,otherRef:x.ref,otherLabel:x.label,indexedEndpoint:true})),
      actions,
      note:(!candidates.length&&!row.versionKnown)?'У этого события нет отдельной сохранённой граф-проекции. Карточка события показана, а текущий граф оставлен без выдуманного контекста.':''
    });
  }

  function showCard({title,sub,rows=[],related=[],actions=[],note=''}) {
    const card=document.querySelector('[data-object-card]');
    document.querySelector('[data-object-title]').textContent=title||'Объект';
    document.querySelector('[data-object-sub]').textContent=sub||'';
    const body=document.querySelector('[data-object-body]');
    body.innerHTML=`
      ${note?`<div class="ss-note">${esc(note)}</div>`:''}
      ${rows.map(([k,v])=>`<div class="ss-row"><span>${esc(k)}</span><span>${esc(v??'—')}</span></div>`).join('')}
      ${related.length?`<div class="ss-related">${related.map((r,i)=>`<button class="ss-btn" data-rel="${i}">${esc(r.otherLabel||r.otherRef)}</button>`).join('')}</div>`:''}
      ${actions.length?`<div class="ss-card-actions">${actions.map((a,i)=>`<button class="ss-btn" data-act="${i}">${esc(a.label)}</button>`).join('')}</div>`:''}
    `;
    body.querySelectorAll('[data-rel]').forEach(b=>b.addEventListener('click',()=>{
      const r=related[Number(b.dataset.rel)];
      if(r?.otherKind&&r?.otherRef)selectBackendObject({kind:r.otherKind,ref:r.otherRef,label:r.otherLabel||r.otherRef});
    }));
    body.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>actions[Number(b.dataset.act)]?.fn?.()));
    card.classList.add('open');
  }

  async function resolveBodyNode(d){
    const label=String(d.name||'').trim();
    if(label&&label.length>2){
      try{
        const s=await api(`/api/b28/search?q=${encodeURIComponent(label)}&limit=5`);
        const rows=s.results||[];
        const exact=rows.find(x=>String(x.label||'').toLowerCase()===label.toLowerCase())||rows[0];
        if(exact&&Number(exact.score||0)>=100){
          showCard({
            title:label,
            sub:'Узел сохранённого тела',
            rows:[
              ['Тип',humanKind(d.type||d.family)],
              ['Поколение',String(d.generation??'—')],
              ['Связей',String(d.degree??'—')],
              ['В системе',exact.label||exact.ref]
            ],
            actions:[{label:'Открыть объект и связи',fn:()=>selectBackendObject(exact)}]
          });
          return;
        }
      }catch{}
    }
    showCard({
      title:label||'Узел тела',
      sub:'Узел сохранённого тела SETKA',
      rows:[
        ['Тип',humanKind(d.type||d.family)],
        ['Семейство',humanKind(d.family)||String(d.family||'—')],
        ['Поколение',String(d.generation??'—')],
        ['Связей',String(d.degree??'—')]
      ],
      note:'Это узел сохранённого body snapshot. Для него не найдено однозначной отдельной карточки в системном индексе, поэтому фронт не придумывает дополнительные данные.'
    });
  }

  document.addEventListener('setka:graph:node-selected',e=>{
    const d=e.detail||{};
    const ctx=parseCtxId(d.id);
    if(ctx){
      selectBackendObject({kind:ctx.kind,ref:ctx.ref,label:d.name||ctx.ref});
    }else{
      resolveBodyNode(d);
    }
  });
  document.addEventListener('setka:graph:edge-selected',e=>{
    const d=e.detail||{};
    showCard({
      title:d.relation||'Связь',
      sub:'Реальная связь на текущем графе',
      rows:[['Откуда',d.sourceId||'—'],['Куда',d.targetId||'—'],['Тип связи',d.relation||d.edgeClass||'—']]
    });
  });

  async function waitReady(){
    const start=Date.now();
    while(Date.now()-start<9000){
      if(window.SETKA_BACKEND_TRUTH?.showBody&&window.SETKA_B1_GRAPH_API?.loadSnapshot)return true;
      await new Promise(r=>setTimeout(r,80));
    }
    return false;
  }

  async function boot(){
    build();
    await refreshOverview();
    const ok=await waitReady();
    if(ok){
      state.view='BODY';
      try{await window.SETKA_BACKEND_TRUTH.showBody({mode:state.mode})}catch{}
      updateCaption();
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();

  window.SETKA_SIMPLE_FRONT=Object.freeze({
    version:VERSION,marker:MARKER,mode:()=>state.mode,view:()=>state.view,context:()=>state.context,
    openOnboard:()=>openPanel('onboard'),openTranscript:()=>openPanel('transcript'),
    showBody,showContext,refresh:refreshOverview,canonMutation:false,runtimeMutation:false
  });
})();