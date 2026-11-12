// SETKA V6 copy-only analytics: one overview in the existing light admin layout.
// Three independent sources are always loaded automatically. Never add actor
// counts across sources: identity links are not yet verified.
const API='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-admin-v6-metrics';
const SOURCES=['unified_v2','guest_v40','account_v41'];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=x=>Number.isFinite(Number(x))?Number(x).toLocaleString('ru-RU'):'—';
const minutes=ms=>Number.isFinite(Number(ms))?(Number(ms)/60000).toLocaleString('ru-RU',{maximumFractionDigits:1}):'—';
const empty=()=>({exposures:0,distinctIdentities:0,guestDevices:0,accountActors:0,recordedMs:0,patternCount:0,timeline:[],patterns:[]});
const byId=(data,id)=>(Array.isArray(data?.patterns)?data.patterns:[]).find(p=>p.pattern_id===id)||{exposures:0,recorded_ms:0,distinct_identities:0};

export function createV6Analytics({getAdminKey,openPattern,getPatternName}){
 let memory=new Map(),sequence=0;
 const periodDays=period=>period==='today'?1:period==='7'?7:period==='30'?30:period==='90'?90:0;
 const periodText=period=>period==='today'?'Сегодня':period==='7'?'7 дней':period==='30'?'30 дней':period==='90'?'90 дней':period==='custom'?'Выбранные даты':'Всё время';
 const sourceCaption='Источники учитываются автоматически. Повторы между V2, V40 и V41 пока не объединяются.';
 const titles={unified_v2:'V2 · новый поток',guest_v40:'V40 · исторические гости',account_v41:'V41 · аккаунты'};
 const getRecord=(result,source)=>result[source]?.data||null;
 function invalidate(){memory.clear()}
 async function read(period,from=null,to=null){
  const days=periodDays(period),key=String(days)+'|'+(period==='custom'?String(from)+'|'+String(to):'');
  const previous=memory.get(key);
  if(previous&&Date.now()-previous.at<50000)return previous.promise;
  const promise=Promise.all(SOURCES.map(async source=>{
   try{
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),15000);
    try{
     const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'lab-summary',source,days,from:period==='custom'?from:null,to:period==='custom'?to:null,adminKey:getAdminKey()}),signal:ctl.signal});
     const d=await r.json();
     if(!r.ok||d.ok!==true)throw Error('источник временно недоступен');
     return [source,{data:d}];
    }finally{clearTimeout(timer)}
   }catch(e){return [source,{error:String(e?.message||e)}]}
  })).then(items=>Object.fromEntries(items));
  memory.set(key,{at:Date.now(),promise});
  return promise;
 }
 const metric=(name,value,definition)=>'<div class="v6-stat"><span class="v6-stat-label">'+esc(name)+'</span><strong class="v6-stat-value">'+esc(value)+'</strong><small>'+esc(definition)+'</small></div>';
 function overviewHTML(result,period){
  const v=getRecord(result,'unified_v2'),a=getRecord(result,'account_v41'),h=getRecord(result,'guest_v40');
  const j=v?.journey||null;
  const items=[
   metric('Визиты',j?format(j.visits):'—','Открытия приложения · V3'),
   metric('Гостевые устройства',j?format(j.activeGuestDevices):v?format(v.guestDevices):'—','Активность V2 · не люди'),
   metric('Аккаунты с просмотрами',a?format(a.distinctIdentities):'—','Активность в истории V41'),
   metric('Зарегистрированы',a?.accountInventory?format(a.accountInventory.registeredAccounts):'—','Аккаунты с доступом · за всё время'),
   metric('Возвращались',j?format(j.returningGuestDevices):'—','Гостевые устройства · разные дни'),
   metric('Новые устройства',j?format(j.firstSeenGuestDevices):'—','Первое событие в доступной истории'),
   metric('Просмотры паттернов',v?format(v.exposures):'—','Завершённые просмотры · V2'),
   metric('Во время сессий',v?.usageMode?format(v.usageMode.duringSession):'—','Гостевой поток V2'),
   metric('Просто посмотреть',v?.usageMode?format(v.usageMode.justWatch):'—','Гостевой поток V2'),
   metric('Открытия паттернов',j?format(j.patternOpens):'—','Запуски просмотра · V3'),
   metric('Избранное',j?format(j.favoriteSaves):'—','Сохранения · V3'),
   metric('Музыка',j?format(j.musicStarts):'—','Фактические запуски · V3'),
   metric('Время в приложении',j?minutes(j.foregroundMs)+' мин':'—','Завершённые активные периоды')
  ];
  const days=Array.isArray(j?.timeline)?j.timeline:Array.isArray(v?.timeline)?v.timeline:[];
  const chartKey=j?'visits':'exposures';
  const chartTitle=j?'Визиты по дням':'Просмотры паттернов по дням';
  const maximum=Math.max(1,...days.map(d=>Number(d[chartKey])||0));
  const bars=days.map(d=>{
   const value=Math.max(0,Number(d[chartKey])||0),height=value?Math.max(3,Math.round(value/maximum*100)):1;
   return '<div class="v6-bar-col" title="'+esc(d.date+': '+value)+'"><i style="height:'+height+'%"></i></div>';
  }).join('');
  const rows=(Array.isArray(v?.patterns)?v.patterns:[]).slice(0,6).map(p=>
   '<button type="button" class="v6-pattern-row" data-v6-pattern="'+esc(p.pattern_id)+'"><span>'+esc(getPatternName(p.pattern_id)||p.pattern_id)+'</span><span>'+format(p.exposures)+' просмотров · '+minutes(p.recorded_ms)+' мин</span></button>'
  ).join('');
  const errors=SOURCES.filter(source=>result[source]?.error).map(source=>titles[source]).join(', ');
  return '<div class="v6-stats">'+items.join('')+'</div>'+
   '<div class="v6-secondary small muted">Исторические записи: V40 — '+(h?format(h.exposures):'—')+
   ' просмотров · аккаунты V41 — '+(a?format(a.exposures):'—')+' просмотров. С ними V2 не складываем. Паттернов с просмотром: '+(v?format(v.patternCount):'—')+'.'+
   (a?.usageMode?' В аккаунтах V41: '+format(a.usageMode.duringSession)+' во время сессий, '+format(a.usageMode.justWatch)+' просто посмотреть.':'')+
   (a?.accountInventory?' Сессий аккаунтов (всё время): '+format(a.accountInventory.recordedSessions)+
    ' · сохранений в избранном сейчас: '+format(a.accountInventory.existingFavorites)+
    ' · подтверждённых связей устройств с аккаунтами: '+format(a.accountInventory.verifiedDeviceLinks)+'.':'')+
   (v?.sessionBreakdown?.legacy_unknown?' Старых V2 с неизвестным режимом: '+format(v.sessionBreakdown.legacy_unknown)+'.':'')+'</div>'+
   '<div class="v6-charts"><div><h3>'+esc(chartTitle)+'</h3>'+
   (days.length?'<div class="v6-chart-bars" role="img" aria-label="'+esc(chartTitle)+'">'+bars+'</div>'+
   '<div class="v6-chart-axis"><span>'+esc(days[0].date)+'</span><span>'+esc(days.at(-1).date)+'</span></div>':
   '<p class="muted small">За период событий для графика нет.</p>')+
   '</div><div><h3>Популярные паттерны</h3>'+
   (rows||'<p class="muted small">Пока нет зарегистрированных просмотров.</p>')+'</div></div>'+
   (errors?'<p class="v6-warning">Не удалось загрузить: '+esc(errors)+'. Остальные показатели доступны.</p>':'')+
   '<p class="v6-source-note">'+esc(sourceCaption)+'</p>';
 }
 function attachButtons(root){
  root.querySelectorAll('[data-v6-pattern]').forEach(button=>{
   button.addEventListener('click',()=>openPattern(button.dataset.v6Pattern));
  });
 }
 function showHome(period,from=null,to=null){
  const content=document.getElementById('content');
  if(!content)return;
  const current=++sequence;
  const wrapper=document.createElement('section');
  wrapper.className='card v6-overview';
  wrapper.id='setka-v6-overview';
  wrapper.innerHTML='<div class="v6-heading"><div><h2>Использование SETKA</h2><p class="muted small">Общая картина · '+esc(periodText(period))+'</p></div><span class="v6-updated">Обновляем…</span></div><div class="v6-overview-body"><p class="muted">Получаем статистику…</p></div>';
  content.prepend(wrapper);
  if(period==='custom'&&(!from||!to)){wrapper.querySelector('.v6-overview-body').textContent='Выберите начало и конец периода.';return}
  read(period,from,to).then(result=>{
   if(current!==sequence||!wrapper.isConnected)return;
   wrapper.querySelector('.v6-overview-body').innerHTML=overviewHTML(result,period);
   wrapper.querySelector('.v6-updated').textContent='Обновлено';
   attachButtons(wrapper);
  }).catch(()=>{
   if(wrapper.isConnected)wrapper.querySelector('.v6-overview-body').textContent='Не удалось получить статистику.';
  });
 }
 function showPatternSummary(period,from=null,to=null){
  const content=document.getElementById('content');if(!content)return;
  const current=++sequence,wrapper=document.createElement('section');
  wrapper.className='card v6-pattern-overview';wrapper.id='setka-v6-pattern-overview';
  wrapper.innerHTML='<h2>Активность паттернов</h2><p class="muted small">Статистика обновляется автоматически. Откройте любой паттерн ниже для подробностей.</p><div class="v6-pattern-inline muted">Загрузка…</div>';
  content.prepend(wrapper);
  if(period==='custom'&&(!from||!to)){wrapper.querySelector('.v6-pattern-inline').textContent='Выберите начало и конец периода.';return}
  read(period,from,to).then(result=>{
   if(current!==sequence||!wrapper.isConnected)return;
   const v=getRecord(result,'unified_v2'),a=getRecord(result,'account_v41'),h=getRecord(result,'guest_v40');
   wrapper.querySelector('.v6-pattern-inline').innerHTML=
    '<span><b>'+(v?format(v.exposures):'—')+'</b> просмотров V2</span>'+
    '<span><b>'+(h?format(h.exposures):'—')+'</b> исторических V40</span>'+
    '<span><b>'+(a?format(a.exposures):'—')+'</b> аккаунтных V41</span>';
  });
 }
 function showPatternDetail(id,{period='all',from=null,to=null}={}){
  const target=document.getElementById('detail-content');
  if(!target)return;
  const node=document.createElement('section');
  node.className='card v6-detail';node.id='setka-v6-pattern-detail';
  node.innerHTML='<h3>Использование паттерна</h3><p class="muted small">Обновляем статистику по всем источникам…</p>';
  const header=target.querySelector('.row');if(header)header.after(node);else target.prepend(node);
  read(period,from,to).then(result=>{
   if(!node.isConnected)return;
   const v=getRecord(result,'unified_v2'),h=getRecord(result,'guest_v40'),a=getRecord(result,'account_v41');
   const line=(title,data)=>{
    const p=data?byId(data,id):null;
    return metric(title,p?format(p.exposures):'—',p?minutes(p.recorded_ms)+' мин просмотра':'Нет связи с источником');
   };
   const recordedOpens=v?.journey?.patternOpensById?.find(p=>p.pattern_id===id)?.opens||0;
   const recordedSaves=v?.journey?.favoritesByPattern?.find(p=>p.pattern_id===id)?.saves||0;
   const sources=[v,h,a];
   const details=(label,prop,asTime=false)=>'<tr><th>'+esc(label)+'</th>'+sources.map(source=>{
    const p=source?byId(source,id):null;
    const raw=p&&p.exposures?p[prop]:null;
    return '<td>'+(raw==null?'—':asTime?minutes(raw)+' мин':format(raw))+'</td>';
   }).join('')+'</tr>';
   node.innerHTML='<h3>Использование паттерна · '+esc(getPatternName(id)||id)+'</h3>'+
    '<div class="v6-stats v6-detail-stats">'+line('Новый поток V2',v)+line('Исторические гости V40',h)+line('Аккаунты V41',a)+'</div>'+
    '<div class="v6-secondary small muted">Открытий: '+(v?.journey?format(recordedOpens):'—')+
     ' · Сохранений в избранное: '+(v?.journey?format(recordedSaves):'—')+' (новый гостевой поток).</div>'+
    '<div class="table-wrap v6-deep-table"><table><thead><tr><th>Показатель</th><th>V2</th><th>Гости V40</th><th>Аккаунты V41</th></tr></thead><tbody>'+
     details('Средняя длительность', 'average_ms',true)+
     details('Медианная длительность','median_ms',true)+
     details('Повторно просматривали · ID','repeat_identities')+
     '<tr><th>Во время сессий</th><td>'+(v?.usageMode?format(byId(v,id).usage_mode?.duringSession||0):'—')+'</td><td>—</td><td>'+(a?.usageMode?format(byId(a,id).usage_mode?.duringSession||0):'—')+'</td></tr>'+
     '<tr><th>Просто посмотреть</th><td>'+(v?.usageMode?format(byId(v,id).usage_mode?.justWatch||0):'—')+'</td><td>—</td><td>'+(a?.usageMode?format(byId(a,id).usage_mode?.justWatch||0):'—')+'</td></tr>'+
     details('Разных идентификаторов','distinct_identities')+
    '</tbody></table></div>'+
    '<p class="v6-source-note">'+esc(sourceCaption)+'</p>';
  });
 }
 function render(page,{period='all',from=null,to=null}={}){
  sequence++;
  if(page==='home')showHome(period,from,to);
  if(page==='patterns')showPatternSummary(period,from,to);
 }
 return {render,showPatternDetail,invalidate};
}
