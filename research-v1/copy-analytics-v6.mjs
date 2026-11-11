// SETKA copy-only research analytics. Never mounts in stable admin mode.
if(new URLSearchParams(location.search).get('workspace')==='copy'){
 const API='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-admin-v6-metrics';
 // Versioned per-feature read receipts: a new release turns its NEW marker green again.
 const newItems=[
  {id:'v6-pattern-analytics',version:'1',section:'patterns',label:'Аналитика V6'},
  {id:'v6-source-quality',version:'1',section:'patterns',label:'Проверка источников'},
  {id:'v6-guest-path',version:'1',section:'participants',label:'Гостевая телеметрия V2'},
  {id:'v6-historical-sync',version:'1',section:'home',label:'Контроль синхронизации V34'},
  {id:'v6-research-lab',version:'1',section:'research',label:'Лаборатория V6'}
 ];
 const readKey=item=>'setka-copy-seen:'+item.id+':'+item.version;
 const isSeen=item=>{try{return localStorage.getItem(readKey(item))==='1'}catch(_){return false}};
 const markSeen=item=>{try{localStorage.setItem(readKey(item),'1')}catch(_){};refreshBadges()};
 const badgeStyle=seen=>'display:inline-flex;align-items:center;margin-left:6px;padding:1px 6px;border-radius:5px;font:700 10px system-ui;letter-spacing:.04em;background:'+(seen?'#777':'#16834b')+';color:#fff';
 function refreshBadges(){
  for(const nav of document.querySelectorAll('.nav[data-page]')){
   const relevant=newItems.filter(item=>item.section===nav.dataset.page);
   let badge=nav.querySelector('.setka-copy-new-badge');
   if(!relevant.length){badge?.remove();continue}
   if(!badge){badge=document.createElement('span');badge.className='setka-copy-new-badge';badge.textContent='NEW';nav.appendChild(badge)}
   badge.style.cssText=badgeStyle(relevant.every(isSeen));
   badge.title=relevant.every(isSeen)?'Новые функции просмотрены':'Есть непросмотренные функции';
  }
  for(const el of document.querySelectorAll('[data-setka-new-id]')){
   const item=newItems.find(x=>x.id===el.dataset.setkaNewId);if(item)el.style.cssText=badgeStyle(isSeen(item));
  }
 }
 refreshBadges();

 const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const box=document.createElement('section');
 box.id='setka-copy-v6-analytics';
 box.style.cssText='position:fixed;z-index:9998;left:8px;right:8px;bottom:8px;max-height:52vh;overflow:auto;background:#161616;color:#fff;border:1px solid #777;border-radius:14px;padding:12px;box-shadow:0 8px 32px #0009;font:13px/1.5 system-ui';
 box.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><strong><span data-setka-new-id="v6-pattern-analytics">NEW</span> Аналитика V6</strong><button id="setka-copy-toggle" type="button" style="color:#fff;background:#333;border:1px solid #777;border-radius:8px;padding:5px 10px">Развернуть</button></div><div id="setka-copy-content" hidden><p>Новые источники: исторические гости V40, аккаунты V41, единые события V2. Участники разных источников не суммируются.</p><label>Источник <select id="setka-copy-source" style="color:#fff;background:#333;padding:6px"><option value="guest_v40">Гости V40</option><option value="account_v41">Аккаунты V41</option><option value="unified_v2">Единый реестр V2</option></select></label> <button id="setka-copy-refresh" type="button" style="padding:6px;background:#333;color:#fff;border:1px solid #777">Обновить</button><div id="setka-copy-output" role="status"></div><div id="setka-copy-quality"></div></div>';
 document.body.appendChild(box);
 const content=box.querySelector('#setka-copy-content'),output=box.querySelector('#setka-copy-output'),quality=box.querySelector('#setka-copy-quality');
 const key=()=>{try{return sessionStorage.getItem('setka-research:admin-key:v1')||localStorage.getItem('setka-research:admin-key:v1')||''}catch(_){return ''}};
 const call=async action=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,source:box.querySelector('#setka-copy-source').value,adminKey:key()}),signal:controller.signal});const data=await response.json();if(!response.ok||data.ok!==true)throw Error(data.error||'server_error');return data}finally{clearTimeout(timer)}};
 let seq=0;
 async function load(){const n=++seq;output.textContent='Загружаем статистику…';quality.textContent='';if(!key()){output.textContent='Для статистики необходимо войти в админку.';return}
 try{const d=await call('pattern-summary');if(n!==seq)return;const items=Array.isArray(d.items)?d.items:[];output.innerHTML='<p>Источник: '+escape(d.source)+' · Паттернов: '+items.length+(d.truncated?' · Выборка неполная':'')+'</p><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr><th>Паттерн</th><th>Экспозиции</th><th>Участники*</th><th>Минуты</th></tr></thead><tbody>'+items.map(x=>'<tr><td>'+escape(x.pattern_id)+'</td><td>'+escape(x.exposures)+'</td><td>'+escape(x.unique_participants)+'</td><td>'+escape((Number(x.active_ms||0)/60000).toFixed(1))+'</td></tr>').join('')+'</tbody></table></div><small>* В пределах выбранного источника, без межисточниковой дедупликации.</small>';}
 catch(e){if(n===seq)output.textContent='Статистика недоступна: '+String(e.message||e)}
 try{const d=await call('quality');if(n!==seq)return;const sources=Array.isArray(d.sources)?d.sources:[];quality.innerHTML='<p><strong><span data-setka-new-id="v6-source-quality">NEW</span> Проверка источников</strong></p><ul>'+sources.map(x=>'<li>'+escape(x.table)+': '+escape(x.error?'недоступен':x.count)+'</li>').join('')+'</ul><small>Сквозная доставка V2 не подтверждена.</small>';refreshBadges()}catch(e){if(n===seq)quality.textContent='Проверка источников недоступна: '+String(e.message||e)}}
 box.querySelector('#setka-copy-toggle').onclick=()=>{content.hidden=!content.hidden;box.querySelector('#setka-copy-toggle').textContent=content.hidden?'Развернуть':'Свернуть';if(!content.hidden){markSeen(newItems[0]);load()}};
 quality.addEventListener('click',()=>markSeen(newItems[1]));
 box.querySelector('#setka-copy-refresh').onclick=()=>{markSeen(newItems[1]);load()};
 box.querySelector('#setka-copy-source').onchange=load;
 // New research sections use the same server-validated credential as the original admin.
 const extra=document.createElement('section');
 extra.id='setka-copy-more';
 extra.style.cssText='position:fixed;z-index:9997;left:8px;right:8px;bottom:70px;max-height:58vh;overflow:auto;background:#171717;color:#fff;border:1px solid #777;border-radius:14px;padding:12px;font:13px/1.5 system-ui;box-shadow:0 8px 30px #0009';
 extra.innerHTML='<div style="display:flex;justify-content:space-between"><strong>NEW · Исследования и аудитория V6</strong><button type="button" id="setka-copy-more-toggle" style="background:#333;color:#fff;border:1px solid #777;border-radius:8px;padding:5px">Развернуть</button></div><div id="setka-copy-more-body" hidden><p>Лаборатория, гостевые события и историческая синхронизация. Данные разных источников не складываются.</p><div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" data-v6-view="lab">Лаборатория</button><button type="button" data-v6-view="guests">Гости V2</button><button type="button" data-v6-view="sync">Синхронизация V34</button></div><div id="setka-copy-more-results" role="status"></div></div>';
 document.body.appendChild(extra);
 for(const btn of extra.querySelectorAll('[data-v6-view]'))btn.style.cssText='padding:7px;background:#333;color:#fff;border:1px solid #777;border-radius:7px';
 const moreBody=extra.querySelector('#setka-copy-more-body'),moreResults=extra.querySelector('#setka-copy-more-results');
 extra.querySelector('#setka-copy-more-toggle').onclick=()=>{moreBody.hidden=!moreBody.hidden;extra.querySelector('#setka-copy-more-toggle').textContent=moreBody.hidden?'Развернуть':'Свернуть'};
 const historicalApi='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-standalone-v34';
 async function loadMore(view){
  const item=newItems.find(x=>x.id===(view==='lab'?'v6-research-lab':view==='guests'?'v6-guest-path':'v6-historical-sync'));
  if(item)markSeen(item);
  moreResults.textContent='Загрузка…';
  if(view==='lab'){moreResults.innerHTML='<p><strong>Лаборатория V6</strong></p><p>Раздельные направления: паттерны, путь пользователя, таймер и удержание, симптомы, заметки, запросы и эффект, физиология. Исторические инструменты уже есть в исследовательской админке; здесь отображается структура V6, а не выдуманные результаты.</p><p>Статистика паттернов доступна в панели «Аналитика V6».</p>';return}
  if(!key()){moreResults.textContent='Сначала войдите в админку.';return}
  try{
   if(view==='sync'){
    const response=await fetch(historicalApi,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'admin-overview',adminKey:key(),channel:'yulia_lab_v34'})});
    const d=await response.json();if(!response.ok||d.ok!==true)throw Error(d.error||'server_error');
    const devices=Array.isArray(d.devices)?d.devices:[],sessions=Array.isArray(d.sessions)?d.sessions:[];
    moreResults.innerHTML='<p>Устройства V34: <strong>'+devices.length+'</strong> · Исторические сессии V34: <strong>'+sessions.length+'</strong></p><small>Исторические данные не подтверждают доставку в V2.</small>';
   }else{
    const d=await call('quality'),sources=Array.isArray(d.sources)?d.sources:[];
    const selected=sources.filter(x=>/events_v2|identity_links/i.test(x.table));
    moreResults.innerHTML='<p><strong>Гостевая телеметрия V2</strong></p><ul>'+selected.map(x=>'<li>'+escape(x.table)+': '+escape(x.error?'недоступно':x.count)+'</li>').join('')+'</ul><small>Количество событий не равно количеству уникальных гостей. Сквозная доставка ещё не подтверждена.</small>';
   }
  }catch(e){moreResults.textContent='Источник недоступен: '+String(e.message||e)}
 }
 for(const btn of extra.querySelectorAll('[data-v6-view]'))btn.onclick=()=>loadMore(btn.dataset.v6View);
 // Keep both V6 panels accessible without obscuring each other.
 box.style.bottom='8px';extra.style.bottom='70px';

}
