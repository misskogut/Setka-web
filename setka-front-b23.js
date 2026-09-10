(() => {
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? "—").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const pretty = (v) => typeof v === "string" ? v : JSON.stringify(v, null, 2);
  const currentMode = () => qs('.mode-button.active')?.dataset?.mode || 'INTEGRATION';
  const normalizeCommand = (v) => String(v || '').trim().toUpperCase().replace(/\s+/g,' ');
  const EXECUTABLE = new Set([
    'STATUS','/STATUS','SNAPSHOT','/SNAPSHOT','GRAPH','/GRAPH','EVENTS','/EVENTS','REPORT','/REPORT',
    'RUN MOTORWAY','RUN MOTORWAY-LAB','ACTIVATE MOTORWAY','ACTIVATE MOTORWAY-LAB',
    'RUN LINEAR','ACTIVATE LINEAR','RUN SELF','RUN SELF-ORGANIZED','ACTIVATE SELF-ORGANIZED',
    'RUN INTEGRATION','ACTIVATE INTEGRATION','RUN CANON','ACTIVATE CANON'
  ]);
  const MODE_RU = {
    'CANON':'КАНОН',
    'LINEAR':'ЛИНЕЙНЫЙ',
    'SELF-ORGANIZED':'САМООРГАНИЗАЦИЯ',
    'MOTORWAY-LAB':'МАГИСТРАЛИ',
    'INTEGRATION':'ИНТЕГРАЦИЯ'
  };
  const QUICK_RU = {
    STATUS:'СОСТОЯНИЕ', SNAPSHOT:'СЛЕПОК', GRAPH:'ГРАФ', EVENTS:'СОБЫТИЯ', REPORT:'ОТЧЁТ'
  };
  const SECTION_RU = {
    'Identity':'Идентичность', 'Идентичность':'Идентичность',
    'Mode baseline':'Базовая точка режима', 'Mode state':'Состояние режима', 'Mode digest':'Сводка режима',
    'Global current runtime':'Текущее состояние системы', '3D source':'Источник 3D-графа',
    'Ship computer':'Бортовой компьютер', 'Device / browser runtime':'Компьютер и браузер'
  };
  const LABEL_RU = {
    version:'версия', branch:'ветка', mode:'режим', lineage:'линия развития', base:'база', head:'текущая версия',
    'runtime state':'состояние runtime', isolation:'изоляция', 'fork event':'точка развилки', state:'состояние',
    'source event':'событие-источник', captured:'зафиксировано', digest:'сводка', hash:'хэш',
    'transcript tip':'последнее событие', passports:'паспорта сущностей', 'memory bytes':'память БД',
    'state event':'событие состояния', 'digest event':'событие сводки', 'server time':'время сервера',
    snapshot:'слепок', binding:'привязка', 'binding event':'событие привязки', run:'запуск', nodes:'узлы', edges:'связи',
    'law status':'статус закона', name:'имя', key:'ключ', status:'статус', algorithm:'алгоритм', scope:'контур', updated:'обновлено',
    online:'в сети', graphics:'графика', 'pixel ratio':'масштаб пикселей', 'logical cores':'ядра процессора', memory:'память',
    viewport:'окно', platform:'платформа', type:'тип', family:'семейство', generation:'поколение', degree:'степень связности',
    canonical:'канонический', 'growth x':'координата роста', 'masked id':'ID', parent:'родитель', position:'позиция',
    'edge class':'класс связи', relation:'отношение', source:'источник', 'source id':'ID источника', target:'цель', 'target id':'ID цели',
    'event id':'ID события', 'event no':'№ события', 'entity type':'тип сущности', 'entity ref':'сущность', summary:'описание',
    occurred:'время', 'graph snapshot':'слепок графа'
  };

  let language = 'ru';
  try { language = localStorage.getItem('setka.ui.language') === 'sys' ? 'sys' : 'ru'; } catch (_) {}
  let colorMode = 'GENERATION';
  let transcriptMode='LIVE';
  let before=null;
  let loaded=[];
  let total=0;
  let lastCommandView=null;
  let applyingLanguage=false;

  const style = document.createElement('style');
  style.textContent = `
    .b23-local-badge,.b23-lang{padding:7px 9px;border:1px solid rgba(135,233,255,.5);border-radius:9px;color:var(--cyan);font-size:8px;letter-spacing:.09em;white-space:nowrap;background:#0b0e10}
    .b23-lang{cursor:pointer;border-color:rgba(189,167,255,.5);color:var(--violet)}
    #computer-panel{padding-bottom:196px}
    #computer-panel>.panel-scroll{height:calc(100% - 55px);padding-bottom:204px}
    .b23-command-dock{position:absolute;z-index:4;left:0;right:0;bottom:0;padding:10px 12px;background:rgba(5,7,8,.98);border-top:1px solid var(--line)}
    .b23-quick{display:flex;gap:5px;overflow-x:auto;margin-bottom:8px;scrollbar-width:none}.b23-quick::-webkit-scrollbar{display:none}
    .b23-quick button,.b23-tabs button,.b23-load,.b23-inspector-action{border:1px solid var(--line);background:#0b0e10;color:var(--text);border-radius:7px;padding:7px 8px;font:inherit;font-size:8px;white-space:nowrap;cursor:pointer}
    .b23-tabs button.active{border-color:var(--green);color:var(--green)}
    .b23-command-row{display:grid;grid-template-columns:1fr auto;gap:6px}
    .b23-command-row input,.b23-search{width:100%;border:1px solid var(--line);background:#07090a;color:var(--text);border-radius:7px;padding:9px;font:inherit;font-size:9px;outline:none}
    .b23-command-row button{border:1px solid rgba(157,255,190,.55);background:#0d1711;color:var(--green);border-radius:7px;padding:0 11px;font:inherit;font-size:9px;cursor:pointer}
    .b23-command-state{margin-top:7px;color:var(--muted);font-size:8px;line-height:1.42;max-height:72px;overflow:auto;white-space:pre-wrap}.b23-command-state.spotlight{color:var(--green)}
    .b23-tabs{display:flex;gap:5px;padding:8px 10px;border-bottom:1px solid var(--line);background:rgba(5,7,8,.96);overflow-x:auto;scrollbar-width:none}.b23-tabs::-webkit-scrollbar{display:none}
    .b23-full{display:none;height:calc(100% - 96px);overflow:auto;padding:9px 10px 18px}.b23-full.open{display:block}
    .b23-transcript-head{display:grid;grid-template-columns:1fr auto;gap:7px;align-items:center;margin-bottom:8px;position:sticky;top:0;background:rgba(12,15,17,.98);padding:3px 0 8px;z-index:2}
    .b23-count{font-size:8px;color:var(--muted);white-space:nowrap}.b23-row{border:1px solid var(--line);border-radius:8px;padding:9px;margin-bottom:6px;background:rgba(8,10,12,.76);cursor:pointer}.b23-row:hover{border-color:var(--line-hot)}
    .b23-row-top{display:flex;justify-content:space-between;gap:8px;font-size:8px}.b23-kind{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted)}.b23-no{color:var(--green);white-space:nowrap}
    .b23-summary{margin-top:6px;color:#bbc5c3;font:11px/1.4 system-ui,sans-serif}.b23-foot{display:flex;justify-content:space-between;gap:8px;margin-top:7px;color:var(--muted);font-size:7px}
    .b23-load{display:block;margin:10px auto 0}.b23-truth{padding:8px;border:1px solid rgba(255,210,125,.3);border-radius:7px;color:var(--amber);font-size:8px;line-height:1.4;margin:8px 0}
    .b23-color{display:flex;align-items:center;gap:5px}.b23-color button{border:1px solid rgba(189,167,255,.42);background:#0b0e10;color:var(--violet);border-radius:8px;padding:9px 10px;font:inherit;font-size:8px;cursor:pointer;white-space:nowrap}
    .b23-color-legend{position:fixed;z-index:13;right:16px;bottom:calc(var(--safe-bottom) + 88px);max-width:min(320px,calc(100vw - 32px));padding:7px 9px;border:1px solid rgba(39,48,54,.75);border-radius:8px;background:rgba(5,7,8,.75);color:var(--muted);font-size:7px;line-height:1.45;pointer-events:none;backdrop-filter:blur(10px)}
    .b23-inspector-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.b23-inspector-action.primary{border-color:rgba(157,255,190,.5);color:var(--green)}
    html[data-setka-language="ru"] .event-kind{display:none}
    @media(max-width:700px){#computer-panel{bottom:8px;top:90px}.b23-local-badge{display:none}.b23-color-legend{right:12px;bottom:calc(var(--safe-bottom) + 132px);max-width:230px}}
  `;
  document.head.appendChild(style);

  const modeRu = (mode) => MODE_RU[mode] || mode;
  const fmtModeState = (raw) => {
    const parts=String(raw||'').split('·').map(s=>s.trim());
    const left=modeRu(parts[0]);
    const stateMap={VIEW:'ПРОСМОТР',LOADING:'ЗАГРУЗКА',ERROR:'ОШИБКА'};
    return parts.length>1 ? `${left} · ${stateMap[parts[1]]||parts[1]}` : left;
  };
  const fmtGraphState = (raw) => String(raw||'')
    .replace('GRAPH','ГРАФ').replace('SNAPSHOT','СЛЕПОК').replace('LOADING','ЗАГРУЗКА');
  const fmtLiveState = (raw) => {
    const s=String(raw||'');
    if(/READY|SUBSCRIBED/i.test(s)) return 'ЖИВОЙ КАНАЛ · ГОТОВ';
    if(/CONNECT/i.test(s)) return 'СВЯЗЬ · ПОДКЛЮЧЕНИЕ';
    if(/ERROR|CLOSED|OFFLINE/i.test(s)) return 'СВЯЗЬ · НЕТ СОЕДИНЕНИЯ';
    return s.replace('WS','СВЯЗЬ');
  };
  const fmtClassification = (raw) => String(raw||'')
    .replace('SNAPSHOT · FROZEN BODY','СЛЕПОК · ЗАМОРОЖЕННОЕ ТЕЛО')
    .replace('LIVE ACTIVITY · EXACT NODE MATCH','ЖИВАЯ АКТИВНОСТЬ · ТОЧНОЕ СОВПАДЕНИЕ УЗЛА')
    .replace('LIVE ACTIVITY · TOPOLOGY UNCHANGED','ЖИВАЯ АКТИВНОСТЬ · ТОПОЛОГИЯ НЕ ИЗМЕНИЛАСЬ')
    .replace(/SPOTLIGHT · (.*?) · REAL GRAPH ONLY/i,'ПОДСВЕТКА · $1 · ТОЛЬКО РЕАЛЬНЫЙ ГРАФ');
  const fmtBadge = (raw) => String(raw||'')
    .replace('LIVE','ЖИВОЕ').replace('REPLAY','ИСТОРИЯ')
    .replace('SYSTEM_TRANSCRIPT','СИСТЕМА').replace('BRANCH_TRANSCRIPT','ВЕТКА').replace('FRONT_COMMAND','КОМАНДА');

  function dynamicText(el, formatter){
    if(!el) return;
    const current=el.textContent.trim();
    if(language==='sys'){
      if(el.dataset.systemText && current!==el.dataset.systemText) el.textContent=el.dataset.systemText;
      return;
    }
    if(current!==el.dataset.humanText){
      el.dataset.systemText=current;
    }
    const human=formatter(el.dataset.systemText || current);
    el.dataset.humanText=human;
    if(current!==human) el.textContent=human;
  }

  function setStaticText(el, ru){
    if(!el) return;
    if(!el.dataset.systemText) el.dataset.systemText=el.textContent.trim();
    const next=language==='ru'?ru:el.dataset.systemText;
    if(el.textContent.trim()!==next) el.textContent=next;
  }

  function translateRows(){
    qsa('.section-title').forEach(el=>{
      if(!el.dataset.systemText) el.dataset.systemText=el.textContent.trim();
      const raw=el.dataset.systemText;
      const next=language==='ru'?(SECTION_RU[raw]||raw):raw;
      if(el.textContent.trim()!==next) el.textContent=next;
    });
    qsa('.data-row span:first-child').forEach(el=>{
      if(!el.dataset.systemText) el.dataset.systemText=el.textContent.trim();
      const raw=el.dataset.systemText;
      const next=language==='ru'?(LABEL_RU[raw]||raw):raw;
      if(el.textContent.trim()!==next) el.textContent=next;
    });
    qsa('.event-badge').forEach(el=>dynamicText(el,fmtBadge));
  }

  function renderColorLegend(){
    const legend=qs('#b23-color-legend'); if(!legend) return;
    const names={GENERATION:'поколению',TYPE:'типу сущности',FAMILY:'семейству'};
    legend.textContent=language==='ru'
      ? `Цвет тела — по ${names[colorMode]}. Подсветка: зелёный — точное совпадение, голубой — связанные узлы, янтарный — реальные связи. Цвета — только визуальная проекция.`
      : `BODY COLOR · ${colorMode}. SPOTLIGHT: GREEN=DIRECT · CYAN=RELATED · AMBER=REAL EDGES. PRESENTATION ONLY.`;
    const btn=qs('#b23-color-cycle');
    if(btn) btn.textContent=language==='ru'?`ЦВЕТ · ${names[colorMode].toUpperCase()}`:`COLOR · ${colorMode}`;
  }

  function renderCommandView(){
    const box=qs('#b23-command-state'); if(!box || !lastCommandView) return;
    const v=lastCommandView;
    box.classList.toggle('spotlight',v.kind==='spotlight');
    if(language==='sys'){
      box.textContent=v.systemText;
      return;
    }
    box.textContent=v.humanText;
  }

  function applyLanguage(){
    if(applyingLanguage) return;
    applyingLanguage=true;
    document.documentElement.dataset.setkaLanguage=language;
    try { localStorage.setItem('setka.ui.language',language); } catch (_) {}
    const brand=qs('.brand strong'); setStaticText(brand,'SETKA / ПУЛЬТ');
    qsa('.mode-button').forEach(b=>{
      if(!b.dataset.systemText) b.dataset.systemText=b.dataset.mode;
      b.textContent=language==='ru'?modeRu(b.dataset.mode):b.dataset.mode;
    });
    const ct=qs('#computer-toggle span'); setStaticText(ct,'Бортовой');
    const ft=qs('#feed-toggle span'); setStaticText(ft,'Стенограмма');
    setStaticText(qs('#computer-panel .panel-head strong'),'Бортовой компьютер');
    setStaticText(qs('#feed-panel .panel-head strong'),'Стенограмма');
    setStaticText(qs('#auto-toggle'),'ВРАЩЕНИЕ');
    setStaticText(qs('#edges-toggle'),'СВЯЗИ');
    setStaticText(qs('#reset-view'),'СБРОС');
    setStaticText(qs('#focus-root'),'КОРЕНЬ');
    setStaticText(qs('#graph-stats .metric:nth-child(1) span'),'узлы');
    setStaticText(qs('#graph-stats .metric:nth-child(2) span'),'связи');
    setStaticText(qs('#graph-stats .metric:nth-child(3) span'),'последнее событие');
    setStaticText(qs('#graph-stats .metric:nth-child(4) span'),'привязка графа');
    dynamicText(qs('#mode-chip'),fmtModeState);
    dynamicText(qs('#graph-chip'),fmtGraphState);
    dynamicText(qs('#live-chip'),fmtLiveState);
    dynamicText(qs('#graph-classification'),fmtClassification);
    if(language==='ru'){
      const desc=qs('#graph-description');
      if(desc && !desc.dataset.systemText) desc.dataset.systemText=desc.textContent;
      const source=qs('#source-bar');
      if(source && !source.dataset.systemText) source.dataset.systemText=source.textContent;
      if(source) source.textContent='РЕАЛЬНЫЕ ДАННЫЕ · текущий runtime SETKA · без синтетических узлов и рёбер';
    }else{
      const desc=qs('#graph-description'); if(desc?.dataset.systemText) desc.textContent=desc.dataset.systemText;
      const source=qs('#source-bar'); if(source?.dataset.systemText) source.textContent=source.dataset.systemText;
    }
    const langBtn=qs('#b23-lang'); if(langBtn) langBtn.textContent=language==='ru'?'РУС':'SYS';
    qsa('[data-b23-command]').forEach(b=>b.textContent=language==='ru'?(QUICK_RU[b.dataset.b23Command]||b.dataset.b23Command):b.dataset.b23Command);
    const input=qs('#b23-command-input'); if(input) input.placeholder=language==='ru'?'Команда или слово для подсветки…':'COMMAND OR GRAPH SPOTLIGHT…';
    const send=qs('#b23-command-send'); if(send) send.textContent=language==='ru'?'ОТПРАВИТЬ':'SEND';
    const tabs={LIVE:'ЖИВОЕ / B1',SYSTEM:'ВСЯ СИСТЕМА',BRANCH:'ВЕТКА'};
    qsa('[data-b23-stream]').forEach(b=>b.textContent=language==='ru'?tabs[b.dataset.b23Stream]:b.dataset.b23Stream);
    const search=qs('.b23-search'); if(search) search.placeholder=language==='ru'?'Поиск по загруженным записям':'FILTER LOADED RECORDS';
    const load=qs('.b23-load'); if(load) load.textContent=language==='ru'?'ЗАГРУЗИТЬ ЕЩЁ НАЗАД':'LOAD OLDER';
    translateRows();
    renderColorLegend();
    renderCommandView();
    if(transcriptMode!=='LIVE') renderTranscript();
    applyingLanguage=false;
  }

  function addChrome(){
    const actions=qs('.top-actions');
    if(actions && !qs('#b23-lang',actions)){
      const badge=document.createElement('span'); badge.className='b23-local-badge'; badge.textContent='B2.3 · FRONT';
      const lang=document.createElement('button'); lang.type='button'; lang.className='b23-lang'; lang.id='b23-lang'; lang.title='Русский / системный язык';
      lang.addEventListener('click',()=>{language=language==='ru'?'sys':'ru';applyLanguage();});
      actions.insertBefore(lang,actions.firstChild);
      actions.insertBefore(badge,actions.firstChild);
    }
    const controls=qs('.graph-controls');
    if(controls && !qs('#b23-color-cycle',controls)){
      const wrap=document.createElement('div'); wrap.className='b23-color';
      const btn=document.createElement('button'); btn.type='button'; btn.id='b23-color-cycle';
      btn.addEventListener('click',async()=>{
        const order=['GENERATION','TYPE','FAMILY'];
        const next=order[(order.indexOf(colorMode)+1)%order.length];
        const bridge=await graphBridge();
        const result=bridge?.setColorMode?.(next);
        if(result?.ok){colorMode=next;renderColorLegend();}
      });
      wrap.appendChild(btn); controls.appendChild(wrap);
    }
    if(!qs('#b23-color-legend')){
      const legend=document.createElement('div'); legend.id='b23-color-legend'; legend.className='b23-color-legend'; document.body.appendChild(legend);
    }
  }

  async function api(path, options={}){
    const res=await fetch(path,{cache:'no-store',...options});
    const data=await res.json();
    if(!res.ok || data?.ok===false) throw Object.assign(new Error(data?.state || `HTTP_${res.status}`),{data});
    return data;
  }

  async function graphBridge(timeoutMs=1800){
    const started=Date.now();
    while(Date.now()-started<timeoutMs){
      const bridge=window.SETKA_GRAPH_BRIDGE;
      if(bridge?.ready?.()) return bridge;
      await new Promise(r=>setTimeout(r,40));
    }
    return window.SETKA_GRAPH_BRIDGE || null;
  }

  function isExecutableCommand(command){
    const norm=normalizeCommand(command);
    if(EXECUTABLE.has(norm)) return true;
    if(norm.startsWith('/')) return true;
    return /^[A-Z0-9_-]+(?:\.[A-Z0-9_-]+)+$/.test(norm);
  }

  async function recordSpotlightRequest(command){
    try{
      return await api('/api/b2/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command,mode:currentMode()})});
    }catch(e){console.warn('SETKA spotlight ledger record unavailable',e);return null;}
  }

  function commandHumanState(command,result,inner){
    const ref=result?.commandRef?`\nЗапись: ${result.commandRef}`:'';
    if(result?.state==='RUNTIME_ACTIVATION_NOT_BOUND' || inner?.state==='RUNTIME_ACTIVATION_NOT_BOUND') return `Режим пока нельзя запускать с фронта: сейчас это только просмотр ветки.${ref}`;
    if(command==='STATUS' && result?.state==='READ_COMMAND_SUCCEEDED') return `Состояние системы получено.${ref}\nСистемные поля можно посмотреть, переключив язык в SYS.`;
    if(result?.ok) return `Команда принята. Состояние: ${result.state || inner?.state || 'готово'}.${ref}`;
    return `Команда не выполнена. Состояние: ${result?.state || inner?.state || 'ошибка'}.${ref}`;
  }

  function installCommandDock(){
    const panel=qs('#computer-panel'); if(!panel || qs('.b23-command-dock',panel)) return;
    const dock=document.createElement('div'); dock.className='b23-command-dock';
    dock.innerHTML=`<div class="b23-quick">${['STATUS','SNAPSHOT','GRAPH','EVENTS','REPORT'].map(c=>`<button type="button" data-b23-command="${c}">${c}</button>`).join('')}</div><div class="b23-command-row"><input id="b23-command-input" autocomplete="off"><button id="b23-command-send" type="button">SEND</button></div><div class="b23-command-state" id="b23-command-state"></div>`;
    panel.appendChild(dock);
    const input=qs('#b23-command-input',dock),status=qs('#b23-command-state',dock),send=qs('#b23-command-send',dock);
    lastCommandView={kind:'info',humanText:'Локальный президентский вход · команды без изменения CANON · неизвестное слово ищется в реальном графе.',systemText:'LOCAL PRESIDENT INGRESS · NON-CANON · COMMAND ELSE REAL-GRAPH SPOTLIGHT'};
    renderCommandView();
    const run=async(command)=>{
      command=String(command||'').trim(); if(!command) return;
      lastCommandView={kind:'info',humanText:`Маршрутизирую: ${command}`,systemText:`ROUTING · ${command}`}; renderCommandView(); send.disabled=true;
      try{
        if(!isExecutableCommand(command)){
          const bridge=await graphBridge(); const spot=bridge?.spotlight?.(command);
          if(spot?.ok && Number(spot.directMatches)>0){
            const ledger=await recordSpotlightRequest(command);
            lastCommandView={kind:'spotlight',humanText:`ПОДСВЕТКА · ${command}\nНайдено: ${spot.directMatches} · связанных узлов: ${spot.relatedNodes} · реальных связей: ${spot.realEdges}\nСлепок: ${spot.snapshotRef || '—'} · топология не менялась${ledger?.commandRef?`\nЗапись: ${ledger.commandRef}`:''}`,systemText:`SPOTLIGHT · ${command.toUpperCase()}\nMATCH: ${spot.matchKind} · DIRECT ${spot.directMatches} · RELATED ${spot.relatedNodes} · REAL EDGES ${spot.realEdges}\nSNAPSHOT: ${spot.snapshotRef || '—'} · TOPOLOGY UNCHANGED\nREAL GRAPH ONLY · NO SYNTHETIC RELATIONS${ledger?.commandRef?`\nRECORDED · ${ledger.commandRef}`:''}`};
            renderCommandView(); return;
          }
          if(spot?.ok && Number(spot.directMatches)===0){
            lastCommandView={kind:'info',humanText:`В текущем слепке графа «${command}» не найдено. Ничего не дорисовано.`,systemText:`SPOTLIGHT_NO_GRAPH_MATCH · ${command} · SNAPSHOT ${spot.snapshotRef || '—'}`}; renderCommandView(); return;
          }
        }
        const result=await api('/api/b2/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command,mode:currentMode()})});
        const inner=result.result||result;
        lastCommandView={kind:'info',humanText:commandHumanState(normalizeCommand(command),result,inner),systemText:`${result.state || 'DONE'} · ${result.commandRef || ''}\n${pretty(inner).slice(0,1800)}`}; renderCommandView();
      }catch(e){
        lastCommandView={kind:'error',humanText:`Команда остановлена: ${e.data?.state || e.message}. Переключи язык в SYS, чтобы увидеть техническую ошибку.`,systemText:`STOP · ${e.data?.state || e.message}\n${pretty(e.data||'')}`}; renderCommandView();
      }finally{send.disabled=false;}
    };
    qsa('[data-b23-command]',dock).forEach(b=>b.addEventListener('click',()=>run(b.dataset.b23Command)));
    send.addEventListener('click',()=>run(input.value));
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){run(input.value);input.select();}});
  }

  function openTranscriptInspector(row){
    const card=qs('#entity-card'),title=qs('#entity-title'),kind=qs('#entity-kind'),body=qs('#entity-body');
    if(!card||!title||!kind||!body) return;
    title.textContent=language==='ru'?(row.summary||`Событие #${row.eventNo}`):(row.eventKind||`EVENT #${row.eventNo}`);
    kind.textContent=language==='ru'?'ЗАПИСЬ СТЕНОГРАММЫ':'TRANSCRIPT EVENT';
    const pairs=language==='ru'
      ? [['№ события',row.eventNo],['время',row.occurredAt?new Date(row.occurredAt).toLocaleString('ru-RU'):'—'],['описание',row.summary],['тип события',row.eventKind],['тип сущности',row.entityType],['сущность',row.entityRef],['версия',row.version],['поток',row.stream]]
      : [['event no',row.eventNo],['occurred',row.occurredAt],['summary',row.summary],['event kind',row.eventKind],['entity type',row.entityType],['entity ref',row.entityRef],['version',row.version],['stream',row.stream]];
    body.innerHTML=pairs.map(([k,v])=>`<div class="data-row"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')+`<div class="b23-inspector-actions">${row.entityRef?`<button class="b23-inspector-action primary" type="button" id="b23-inspector-spotlight">${language==='ru'?'ПОДСВЕТИТЬ В ГРАФЕ':'SPOTLIGHT IN GRAPH'}</button>`:''}</div>`;
    card.classList.add('open');
    const btn=qs('#b23-inspector-spotlight',body);
    if(btn) btn.addEventListener('click',async()=>{const bridge=await graphBridge(); const r=bridge?.spotlight?.(row.entityRef); if(r?.directMatches) card.classList.remove('open');});
  }

  function renderTranscript(){
    const full=qs('.b23-full'); if(!full) return;
    const filter=qs('.b23-search',full)?.value.trim().toLowerCase()||'';
    const rows=filter?loaded.filter(r=>JSON.stringify(r).toLowerCase().includes(filter)):loaded;
    qs('.b23-count',full).textContent=`${loaded.length.toLocaleString('ru-RU')} / ${total.toLocaleString('ru-RU')}`;
    qs('.b23-rows',full).innerHTML=rows.map((r,i)=>`<article class="b23-row" data-b23-row="${i}"><div class="b23-row-top"><span class="b23-kind">${language==='ru'?'':esc(r.eventKind)}</span><span class="b23-no">#${esc(r.eventNo)}</span></div><div class="b23-summary">${esc(r.summary||r.eventKind)}</div><div class="b23-foot"><span>${esc(r.entityRef||r.stream)}</span><span>${esc(r.occurredAt?new Date(r.occurredAt).toLocaleString('ru-RU'):'—')}</span></div></article>`).join('')||'<div class="empty">Нет записей.</div>';
    qsa('[data-b23-row]',full).forEach((el,index)=>el.addEventListener('click',()=>openTranscriptInspector(rows[index])));
  }

  function installTranscript(){
    const panel=qs('#feed-panel'); if(!panel || qs('.b23-tabs',panel)) return;
    const original=qs('.panel-scroll',panel); if(!original) return;
    const tabs=document.createElement('div'); tabs.className='b23-tabs'; tabs.innerHTML=`<button class="active" data-b23-stream="LIVE">LIVE</button><button data-b23-stream="SYSTEM">SYSTEM</button><button data-b23-stream="BRANCH">BRANCH</button>`;
    const full=document.createElement('div'); full.className='b23-full'; full.innerHTML=`<div class="b23-transcript-head"><input class="b23-search"><span class="b23-count">—</span></div><div class="b23-truth"></div><div class="b23-rows"></div><button class="b23-load" type="button">LOAD OLDER</button>`;
    panel.insertBefore(tabs,original); panel.appendChild(full);
    const load=async(reset=false)=>{
      if(reset){before=null;loaded=[];}
      const params=new URLSearchParams({stream:transcriptMode,mode:currentMode(),limit:'100'}); if(before) params.set('before',String(before));
      qs('.b23-load',full).disabled=true;
      try{
        const d=await api(`/api/b2/transcript?${params}`); total=Number(d.total||0); before=d.nextBeforeNo??null; loaded.push(...(d.rows||[]));
        qs('.b23-truth',full).textContent=language==='ru'?'Полная стенограмма доступна постранично. Технические details не выводятся в этом списке.':(d.truthBoundary||'SANITIZED TRANSCRIPT');
        renderTranscript(); qs('.b23-load',full).style.display=before&&loaded.length<total?'block':'none';
      }catch(e){qs('.b23-rows',full).innerHTML=`<div class="empty">STOP · ${esc(e.data?.state||e.message)}</div>`;}
      finally{qs('.b23-load',full).disabled=false;}
    };
    const select=async(mode)=>{
      transcriptMode=mode; qsa('[data-b23-stream]',tabs).forEach(b=>b.classList.toggle('active',b.dataset.b23Stream===mode));
      if(mode==='LIVE'){full.classList.remove('open');original.style.display='block';}
      else{original.style.display='none';full.classList.add('open');await load(true);}
      applyLanguage();
    };
    qsa('[data-b23-stream]',tabs).forEach(b=>b.addEventListener('click',()=>select(b.dataset.b23Stream)));
    qs('.b23-load',full).addEventListener('click',()=>load(false)); qs('.b23-search',full).addEventListener('input',renderTranscript);
    qsa('.mode-button').forEach(b=>b.addEventListener('click',()=>{if(transcriptMode==='BRANCH') setTimeout(()=>load(true),80);}));
  }

  async function health(){try{console.info('SETKA B2.3',await api('/api/b2/health'));}catch(e){console.warn('SETKA B2.3 bridge unavailable',e);}}

  function boot(){
    addChrome(); installCommandDock(); installTranscript(); applyLanguage(); health();
    const observer=new MutationObserver(()=>{if(!applyingLanguage) applyLanguage();});
    ['#mode-chip','#graph-chip','#live-chip','#graph-classification','#computer-body','#event-list'].forEach(sel=>{const el=qs(sel);if(el) observer.observe(el,{childList:true,subtree:true,characterData:true});});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
