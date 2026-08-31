(()=>{
'use strict';
window.__SETKA_V087_RUNTIME__='loaded';

const API='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-diamond-president-v3';
const q=s=>document.querySelector(s);
const qa=s=>[...document.querySelectorAll(s)];
const str=v=>String(v??'');
let D=null, recording=false, pending=false, buffer=[], flushTimer=0, seq=0;
let segment='SEG-'+crypto.randomUUID().slice(0,10).toUpperCase();
const lastMove=new Map();

const RU=new Map(Object.entries({
'PRESIDENT ROOT':'ПРЕЗИДЕНТ / КОРНЕВОЙ ДОСТУП',
'LANDSCAPE CONTROL ROOM':'ПАНЕЛЬ УПРАВЛЕНИЯ · АЛЬБОМНАЯ ОРИЕНТАЦИЯ',
'SIMULATION ≠ PRODUCTION':'СИМУЛЯЦИЯ ≠ РАБОЧАЯ СРЕДА',
'DRAFT ≠ RUNTIME':'ЧЕРНОВИК ≠ РАБОЧЕЕ ПОДКЛЮЧЕНИЕ',
'SYSTEM BLOCKS':'БЛОКИ СИСТЕМЫ','WIRES':'СВЯЗИ','THREADS':'ДИАЛОГИ','QUEUES':'ОЧЕРЕДИ',
'PARTICIPANTS':'УЧАСТНИКИ','PATTERN EXPOSURES':'ПОКАЗЫ ПАТТЕРНОВ','SESSIONS':'СЕССИИ','SYNTHETIC ACTORS':'СИНТЕТИЧЕСКИЕ АКТОРЫ',
'SYSTEM LAYERS':'СЛОИ СИСТЕМЫ','RELEASE POINTERS':'УКАЗАТЕЛИ РЕЛИЗА',
'BLACK BOX':'ЧЁРНЫЙ ЯЩИК','PREVIEW':'ПРЕДПРОСМОТР','PRODUCTION':'РАБОЧАЯ СРЕДА',
'HEADQUARTERS':'ШТАБ-КВАРТИРА','FLOOR':'ЭТАЖ','CABINET':'КАБИНЕТ','BLOCK':'БЛОК','EDGE':'СВЯЗЬ',
'INTEGRATED':'ВСТРОЕННЫЙ','ISOLATED':'ИЗОЛИРОВАННЫЙ','FAILURE':'СБОЙ','BEHAVIORAL':'ПОВЕДЕНЧЕСКИЙ',
'ACCESS BOUNDARY':'ГРАНИЦА ДОСТУПА','FAILURE PROBE':'ПРОВЕРКА СБОЯ','DEPENDENCY PROBE':'ПРОВЕРКА ЗАВИСИМОСТЕЙ',
'foundation':'фундамент','stable':'стабильно','building':'строится','planned':'запланировано',
'active':'активно','important':'важная','critical':'критическая','root':'корневая',
'review':'требует проверки','never':'нельзя отключить','president_only':'только Президент',
'recovery_core':'Ядро восстановления','identity_core':'Ядро идентичности','access_core':'Ядро доступов',
'canonical_language':'Канонический язык','data_memory':'Каноническая память','server_core':'Серверное ядро',
'setka_flow':'Поток SETKA','front_runtime':'Фронт продукта','release_control':'Контроль выпуска',
'product_modules':'Модули продукта','deterministic_analytics':'Детерминированная аналитика',
'ai_lab':'AI-лаборатория','commerce':'Коммерческий контур','relationships':'Связи пользователей',
'physical_agent':'Физический агент',
'Canonical archive, migrations, backups and restore path.':'Канонический архив, миграции, резервные копии и путь восстановления.',
'Universal neutral SETKA ID and separate access credentials.':'Универсальный нейтральный SETKA ID и отдельные данные доступа.',
'Capabilities, entitlements and controlled administrative access.':'Полномочия, права и контролируемый административный доступ.',
'Stable SETKA entities and event vocabulary; new layers extend rather than redefine.':'Стабильные сущности SETKA и словарь событий; новые слои расширяют систему, а не переопределяют её.',
'Server-owned canonical facts and controlled gateways.':'Канонические факты под контролем сервера и управляемые шлюзы.',
'Multiple compatible front representations over one SETKA core.':'Несколько совместимых интерфейсов поверх одного ядра SETKA.',
'Black Box -> Preview -> Approved -> Production -> Archive.':'Чёрный ящик → Предпросмотр → Одобрено → Рабочая среда → Архив.',
'Patterns, Saved, Notes, Cruise, State, Community and later modules.':'Паттерны, Сохранённое, Заметки, Cruise, Состояние, Сообщество и будущие модули.',
'Statistics and algorithms own repeatable intelligence.':'Статистика и алгоритмы отвечают за воспроизводимую интеллектуальную логику.',
'Controlled AI research and pattern architecture of the same SETKA language.':'Контролируемые AI-исследования и архитектура паттернов в едином языке SETKA.',
'Payments, entitlements, referrals and partner economics.':'Платежи, права доступа, рефералы и партнёрская экономика.',
'Future reciprocal user relationships.':'Будущие двусторонние связи между пользователями.',
'Future physical client/robot body; reflexes remain deterministic.':'Будущий физический клиент/роботизированное тело; рефлексы остаются детерминированными.',
'Capabilities, roles, scopes, floors and doors.':'Полномочия, роли, области действия, этажи и двери.',
'Universal SETKA ID and proof of access.':'Универсальный SETKA ID и подтверждение доступа.',
'Stable meaning of entities, events and versions.':'Стабильный смысл сущностей, событий и версий.',
'Irreplaceable historical facts and behavior history.':'Невосполнимые исторические факты и история поведения.',
'Controlled gateways, canonical facts and deterministic services.':'Контролируемые шлюзы, канонические факты и детерминированные сервисы.',
'Internal messages, requests, approvals, cases and decisions.':'Внутренние сообщения, запросы, согласования, кейсы и решения.',
'Black Box to Preview to Approved to Production.':'Чёрный ящик → Предпросмотр → Одобрено → Рабочая среда.',
'Versioned interfaces rendered over one canonical system.':'Версионные интерфейсы поверх одной канонической системы.',
'DNA, Memory, Key separation, Manifest and restore path.':'DNA, Memory, разделённый Key, Manifest и путь восстановления.'
}));

const LABELS={
'floor.president.title':'Президент','floor.workshop.title':'Мастерская',
'floor.operations.title':'Операционный этаж','floor.external.title':'Внешний бизнес',
'floor.public.title':'Публичный уровень','cabinet.president.title':'Президентский кабинет',
'cabinet.workshop_architecture.title':'Архитектурный стол',
'cabinet.workshop_product.title':'Продуктовая мастерская',
'cabinet.workshop_patterns.title':'Цех паттернов','cabinet.workshop_ai.title':'AI-питомник',
'cabinet.workshop_preview.title':'Испытательный стенд',
'cabinet.operations.title':'Операционный кабинет',
'cabinet.external.title':'Кабинет внешнего бизнеса',
'cabinet.public.title':'Публичная поверхность',
'arch.identity.title':'Ядро идентичности','arch.access.title':'Ядро доступов',
'arch.language.title':'Канонический язык','arch.memory.title':'Каноническая память',
'arch.server.title':'Серверное ядро','arch.flow.title':'Поток SETKA',
'arch.release.title':'Контроль выпуска','arch.front.title':'Фронт продукта',
'arch.recovery.title':'Восстановление / Хранилище',
'arch.workbench.title':'Архитектурный стол',
'arch.product_workshop.title':'Продуктовая мастерская',
'arch.pattern_forge.title':'Цех паттернов','arch.ai_nursery.title':'AI-питомник',
'arch.preview_bay.title':'Испытательный стенд'
};

function isRu(){
  const en=q('.lang button[data-lang="en"].active');
  return !en;
}
function translateAll(){
  if(!isRu())return;
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const n of nodes){
    const p=n.parentElement;
    if(!p||p.closest('script,style,#r87modal'))continue;
    const raw=n.nodeValue||'', t=raw.trim();
    if(!t)continue;
    const r=RU.get(t);
    if(r)n.nodeValue=raw.replace(t,r);
  }
  const root=q('.rootBadge');
  if(root){
    const b=root.querySelector('b'), s=root.querySelector('span');
    if(b)b.textContent='ПРЕЗИДЕНТ / КОРНЕВОЙ ДОСТУП';
    if(s)s.textContent='ПАНЕЛЬ УПРАВЛЕНИЯ · АЛЬБОМНАЯ ОРИЕНТАЦИЯ';
  }
  const bp=q('[data-tab="blueprint"]');
  if(bp)bp.textContent='Живой чертёж';
  if(q('#topTitle')?.textContent.trim()==='Чертёж')q('#topTitle').textContent='Живой чертёж';
}

function purgeVisualTraces(){
  qa('canvas,#traceCanvas,#setkaTraceCanvas,.traceShelf,.pointerTrace,.gestureTrace,[data-trace-canvas]').forEach(x=>x.remove());
  qa('svg').forEach(x=>{
    if(x.id==='bp87wires'||x.closest('#tab-blueprint'))return;
    const id=(str(x.id)+' '+str(x.className?.baseVal)+' '+str(x.getAttribute('class'))).toLowerCase();
    if(/trace|gesture|pointer|wire/.test(id))x.remove();
  });
}

function token(){return sessionStorage.getItem('diamondSession')||''}
async function api(action,body={}){
  const tk=token();
  if(!tk)throw new Error('Сначала войди в кабинет Президента');
  const r=await fetch(API,{
    method:'POST',
    headers:{'content-type':'application/json','x-setka-session':tk},
    body:JSON.stringify({action,...body})
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.detail||d.error||'request_failed');
  return d;
}
function val(o,a,b){return o?.[a]??o?.[b]??''}
function esc(s){return str(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function tr(k){
  return D?.architecture?.translations?.[k]?.ru||
         D?.access?.translations?.[k]?.ru||
         LABELS[k]||RU.get(k)||k;
}

function blueprintMarkup(){
  return `<div class="sectionHead"><div><div class="title">Живой чертёж</div><div class="lead">Отдельный рабочий архитектурный стол. Здесь показаны реальные этажи, кабинеты, системные блоки и зарегистрированные связи. Тапы и свайпы в других разделах не создают проводов.</div></div><div class="toolbar"><button id="bp87reload" class="secondary">Обновить схему</button></div></div>
  <div id="bp87workspace" class="bp87workspace">
    <svg id="bp87wires" class="bp87wires"></svg>
    <aside class="bp87panel"><div class="k">ЭТАЖИ</div><div id="bp87index"></div><div class="bp87hint">Выбери этаж. Запись пути не рисует здесь и нигде в кабинете.</div></aside>
    <main class="bp87panel"><div class="bp87head"><div><div class="k">АРХИТЕКТУРА ЗДАНИЯ</div><h2>Штаб-квартира SETKA</h2></div></div><div id="bp87building" class="bp87building"><div class="bp87roof"></div><div id="bp87floors"></div></div></main>
    <aside class="bp87panel"><div class="k">СИСТЕМНЫЙ ПОЗВОНОЧНИК</div><div id="bp87spine"></div><div class="bp87legend"><span><i class="critical"></i>критическая связь</span><span><i></i>обычная архитектурная связь</span></div><div id="bp87info" class="bp87info">Нажми на блок или провод, чтобы увидеть его смысл.</div></aside>
  </div>`;
}

function installBlueprint(){
  const tab=q('#tab-blueprint');
  if(!tab||q('#bp87workspace'))return;
  const legacy=document.createElement('div');
  legacy.id='bp87legacy';
  legacy.hidden=true;
  while(tab.firstChild)legacy.appendChild(tab.firstChild);
  tab.appendChild(legacy);
  tab.insertAdjacentHTML('beforeend',blueprintMarkup());
  q('#bp87reload').onclick=loadBlueprint;
}

async function loadBlueprint(){
  const info=q('#bp87info');
  if(!info)return;
  try{
    info.textContent='Загружаю реальную архитектуру…';
    D=await api('dashboard');
    renderBlueprint();
  }catch(e){
    info.textContent='Ошибка: '+e.message;
  }
}

function renderBlueprint(){
  if(!D)return;
  const F=D.access?.floors||[], C=D.access?.cabinets||[], N=D.architecture?.nodes||[];
  q('#bp87index').innerHTML=F.map((f,i)=>{
    const fk=val(f,'floor_key','floorKey');
    const state=val(f,'door_state','doorState');
    return `<div class="bp87index" data-bp87floor="${esc(fk)}"><b>P${i} · ${esc(tr(val(f,'title_key','titleKey')))}</b><span class="bp87small">${esc(RU.get(state)||state)}</span></div>`;
  }).join('');
  q('#bp87floors').innerHTML=F.map((f,i)=>{
    const fk=val(f,'floor_key','floorKey');
    const cc=C.filter(c=>val(c,'floor_key','floorKey')===fk);
    const state=val(f,'door_state','doorState');
    return `<section class="bp87floor" data-bp87floor-target="${esc(fk)}">
      <div class="bp87floorTitle"><span>P${i} · ${esc(tr(val(f,'title_key','titleKey')))}</span><span class="bp87small">${esc(RU.get(state)||state)}</span></div>
      <div class="bp87rooms">${cc.map(c=>{
        const ck=val(c,'cabinet_key','cabinetKey');
        const nn=N.filter(n=>n.metadata?.cabinet===ck);
        return `<div class="bp87room" data-bp87cabinet="${esc(ck)}"><b>${esc(tr(val(c,'title_key','titleKey')))}</b><span class="bp87small">${esc(ck)}</span><div class="bp87minis">${nn.map(n=>`<span class="bp87mini" data-bp87node="${esc(val(n,'node_key','nodeKey'))}">${esc(tr(val(n,'title_key','titleKey')))}</span>`).join('')}</div></div>`;
      }).join('')}</div>
    </section>`;
  }).join('');
  q('#bp87spine').innerHTML=N
    .filter(n=>n.metadata?.side==='spine')
    .sort((a,b)=>(a.metadata?.order||99)-(b.metadata?.order||99))
    .map(n=>`<div class="bp87node" data-bp87node="${esc(val(n,'node_key','nodeKey'))}"><b>${esc(tr(val(n,'title_key','titleKey')))}</b><span class="bp87small">${esc(RU.get(val(n,'node_type','nodeType'))||val(n,'node_type','nodeType'))} · ${esc(RU.get(n.criticality)||n.criticality)}</span></div>`)
    .join('');
  bindBlueprint();
  requestAnimationFrame(()=>requestAnimationFrame(drawWires));
  q('#bp87info').textContent='Провода существуют только внутри «Живого чертежа» и строятся из реального архитектурного графа.';
}

function bindBlueprint(){
  qa('[data-bp87floor]').forEach(x=>{
    x.onclick=()=>q(`[data-bp87floor-target="${CSS.escape(x.dataset.bp87floor)}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});
  });
  qa('[data-bp87node]').forEach(x=>{
    x.onclick=e=>{
      e.stopPropagation();
      const k=x.dataset.bp87node;
      const n=(D?.architecture?.nodes||[]).find(a=>val(a,'node_key','nodeKey')===k);
      const edges=(D?.architecture?.edges||[]).filter(a=>val(a,'from_node','fromNode')===k||val(a,'to_node','toNode')===k);
      q('#bp87info').innerHTML=`<b>${esc(tr(val(n,'title_key','titleKey')))}</b><br><span class="mono">${esc(k)}</span><br><br>Тип: ${esc(RU.get(val(n,'node_type','nodeType'))||val(n,'node_type','nodeType'))}<br>Критичность: ${esc(RU.get(n?.criticality)||n?.criticality)}<br>Связей: ${edges.length}`;
    };
  });
}
function nodeEl(k){
  return q(`.bp87node[data-bp87node="${CSS.escape(k)}"]`)||
         q(`.bp87mini[data-bp87node="${CSS.escape(k)}"]`);
}
function clearWires(){const s=q('#bp87wires');if(s)s.innerHTML=''}
function drawWires(){
  const tab=q('#tab-blueprint'), svg=q('#bp87wires'), work=q('#bp87workspace');
  if(!D||!svg||!work||!tab||tab.classList.contains('hidden')){clearWires();return}
  const R=work.getBoundingClientRect();
  svg.setAttribute('viewBox',`0 0 ${work.clientWidth} ${work.clientHeight}`);
  let z='';
  for(const ed of D.architecture?.edges||[]){
    const fk=val(ed,'from_node','fromNode'), tk=val(ed,'to_node','toNode');
    const a=nodeEl(fk), b=nodeEl(tk);
    if(!a||!b)continue;
    const A=a.getBoundingClientRect(), B=b.getBoundingClientRect();
    const x1=A.right-R.left, y1=A.top+A.height/2-R.top;
    const x2=B.left-R.left, y2=B.top+B.height/2-R.top;
    const bend=Math.max(24,Math.abs(x2-x1)*.36);
    const cls=(ed.criticality==='critical'||ed.criticality==='root'?' critical':'')+(ed.active===false?' off':'');
    z+=`<path class="bp87wire${cls}" data-bp87edge="${esc(val(ed,'edge_key','edgeKey'))}" d="M${x1} ${y1} C${x1+bend} ${y1},${x2-bend} ${y2},${x2} ${y2}"/>`;
  }
  svg.innerHTML=z;
  qa('[data-bp87edge]').forEach(path=>{
    path.onclick=e=>{
      e.stopPropagation();
      const k=path.dataset.bp87edge;
      const ed=(D?.architecture?.edges||[]).find(a=>val(a,'edge_key','edgeKey')===k);
      const from=(D?.architecture?.nodes||[]).find(n=>val(n,'node_key','nodeKey')===val(ed,'from_node','fromNode'));
      const to=(D?.architecture?.nodes||[]).find(n=>val(n,'node_key','nodeKey')===val(ed,'to_node','toNode'));
      q('#bp87info').innerHTML=`<b>${esc(k)}</b><br>${esc(tr(val(from,'title_key','titleKey')||val(ed,'from_node','fromNode')))} → ${esc(tr(val(to,'title_key','titleKey')||val(ed,'to_node','toNode')))}<br><br>Тип: ${esc(RU.get(ed?.edge_type)||ed?.edge_type)}<br>Критичность: ${esc(RU.get(ed?.criticality)||ed?.criticality)}<br>Режим: ${esc(RU.get(ed?.binding_mode)||ed?.binding_mode)}<br><br>${esc(ed?.metadata?.reason||'')}`;
    };
  });
}

function activeTrace(){try{return JSON.parse(localStorage.getItem('setkaActiveResearchTrace')||'null')}catch{return null}}
function setTrace(v){v?localStorage.setItem('setkaActiveResearchTrace',JSON.stringify(v)):localStorage.removeItem('setkaActiveResearchTrace')}
function elapsed(){const a=activeTrace();return a?.startedAt?Math.max(0,Date.now()-Number(a.startedAt)):0}
function semantic(el){
  const n=el?.closest?.('[data-tab],[data-floor],[data-cabinet],[data-node],[data-edge],button,input,select,textarea,[role="button"]')||el;
  if(!n)return{};
  const o={tag:str(n.tagName).toLowerCase()};
  if(n.id)o.id=n.id;
  if(n.dataset)for(const k of ['tab','floor','cabinet','node','edge','i18n'])if(n.dataset[k])o[k]=str(n.dataset[k]).slice(0,120);
  if(o.tag==='button'){const tx=str(n.textContent).trim().replace(/\s+/g,' ');if(tx)o.text=tx.slice(0,90)}
  return o;
}
function push(type,e,extra={}){
  if(!recording||pending)return;
  const item={t:elapsed(),type,checkpoint:'diamond-v0.8.7',...extra};
  if(e&&'clientX'in e){
    item.pointerId=e.pointerId||0;
    item.pointerType=e.pointerType||'unknown';
    item.x=Math.round(e.clientX); item.y=Math.round(e.clientY);
    item.nx=+(e.clientX/Math.max(1,innerWidth)).toFixed(5);
    item.ny=+(e.clientY/Math.max(1,innerHeight)).toFixed(5);
    item.target=semantic(e.target);
  }
  item.scroll={x:Math.round(scrollX||0),y:Math.round(scrollY||0)};
  buffer.push(item);
  if(buffer.length>=220)flush('buffer').catch(()=>{});
}
async function flush(reason='interval'){
  if(!recording||pending||!buffer.length)return;
  const a=activeTrace();
  if(!a?.traceCode)return;
  const events=buffer.splice(0), chunkSeq=seq++;
  try{
    return await api('trace_append',{
      traceCode:a.traceCode,checkpoint:'diamond-v0.8.7',frontVersion:'diamond-president-v0.8.7',
      segmentKey:segment,chunkSeq,
      viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1,orientation:innerWidth>=innerHeight?'landscape':'portrait'},
      summary:{reason,sessionElapsedEndMs:elapsed()},events
    });
  }catch(e){
    buffer.unshift(...events); seq=Math.max(0,seq-1); throw e;
  }
}
async function startTrace(){
  purgeVisualTraces();
  const d=await api('trace_start',{
    checkpoint:'diamond-v0.8.7',frontVersion:'diamond-president-v0.8.7',
    viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1,orientation:innerWidth>=innerHeight?'landscape':'portrait'}
  });
  setTrace({traceCode:d.traceCode,startedAt:Date.now()});
  recording=true;pending=false;buffer=[];segment='SEG-'+crypto.randomUUID().slice(0,10).toUpperCase();seq=0;
  q('#r87pencil').textContent='■ Остановить и добавить комментарий';
  clearInterval(flushTimer);flushTimer=setInterval(()=>flush('interval').catch(()=>{}),4500);
}
async function stopTrace(){
  if(!recording)return;
  push('recording_pause');
  await flush('pause').catch(()=>{});
  recording=false;pending=true;clearInterval(flushTimer);
  q('#r87pencil').textContent='✎ Запись на паузе';
  q('#r87modal').classList.add('open');
}
function installTrace(){
  q('#r87pencil').onclick=()=>recording?stopTrace():pending?q('#r87modal').classList.add('open'):startTrace().catch(e=>alert(e.message));
  q('#r87continue').onclick=()=>{
    pending=false;recording=true;q('#r87modal').classList.remove('open');
    q('#r87pencil').textContent='■ Остановить и добавить комментарий';
    segment='SEG-'+crypto.randomUUID().slice(0,10).toUpperCase();seq=0;
    clearInterval(flushTimer);flushTimer=setInterval(()=>flush('interval').catch(()=>{}),4500);
  };
  q('#r87save').onclick=async()=>{
    const a=activeTrace();if(!a?.traceCode)return;
    try{
      await api('trace_finalize',{traceCode:a.traceCode,title:q('#r87title').value,comment:q('#r87comment').value,summary:{endCheckpoint:'diamond-v0.8.7'}});
      setTrace(null);pending=false;recording=false;q('#r87modal').classList.remove('open');q('#r87pencil').textContent='✎ Записать путь';
    }catch(e){alert(e.message)}
  };
  for(const ev of ['pointerdown','pointerup','pointercancel']){
    document.addEventListener(ev,e=>{if(!e.target?.closest?.('#r87bar,#r87modal'))push(ev,e)},true);
  }
  document.addEventListener('pointermove',e=>{
    if(!recording||e.target?.closest?.('#r87bar,#r87modal'))return;
    const prev=lastMove.get(e.pointerId)||{t:0,x:-999,y:-999}, now=performance.now();
    if(now-prev.t<40&&Math.hypot(e.clientX-prev.x,e.clientY-prev.y)<5)return;
    lastMove.set(e.pointerId,{t:now,x:e.clientX,y:e.clientY});push('pointermove',e);
  },true);
}

function wireTabs(){
  qa('[data-tab]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      setTimeout(()=>{
        if(btn.dataset.tab==='blueprint')loadBlueprint().catch(()=>{});
        else clearWires();
        purgeVisualTraces();translateAll();
      },0);
    },true);
  });
  const center=q('.center');
  if(center)center.addEventListener('scroll',()=>{
    if(!q('#tab-blueprint')?.classList.contains('hidden'))requestAnimationFrame(drawWires);
  },{passive:true});
  addEventListener('resize',()=>{
    purgeVisualTraces();
    if(!q('#tab-blueprint')?.classList.contains('hidden'))requestAnimationFrame(drawWires);
  });
}
function wireLanguage(){
  qa('[data-lang]').forEach(btn=>btn.addEventListener('click',()=>{
    setTimeout(()=>{if(btn.dataset.lang==='ru')translateAll()},80);
  }));
}

function boot(){
  purgeVisualTraces();
  installBlueprint();
  installTrace();
  wireTabs();
  wireLanguage();
  translateAll();
  const obs=new MutationObserver(()=>{purgeVisualTraces();translateAll()});
  obs.observe(document.body,{childList:true,subtree:true});
  setInterval(()=>{purgeVisualTraces();translateAll()},1500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();