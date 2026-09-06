(()=>{
'use strict';
const CONTROL='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-control';
const SESSION='setka:foundation:president:session';
const SEEN_AT='setka:foundation:pinmail:seen-at';
const $=id=>document.getElementById(id);
const state={pins:[],pinMap:new Map(),filter:'attention',activeCode:'',poll:0};
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const dt=v=>{try{return new Date(v).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch{return''}};
const seenAt=()=>{try{return Number(localStorage.getItem(SEEN_AT)||0)}catch{return 0}};
const token=()=>{try{return localStorage.getItem(SESSION)||''}catch{return''}};
function statusMeta(status){
  const s=String(status||'open');
  if(s==='in_progress')return{glyph:'🟡',label:'В работе',cls:'inprogress'};
  if(s==='done')return{glyph:'🟢',label:'Готово к приёмке',cls:'done'};
  if(s==='resolved')return{glyph:'✓',label:'Принято',cls:'resolved'};
  if(s==='proposed')return{glyph:'🟣',label:'На рассмотрении',cls:'proposed'};
  return{glyph:'🔴',label:'Открыто',cls:'open'};
}
function synthetic(pin){return pin&&pin.authorKind&&pin.authorKind!=='president'}
function updatedMs(pin){return Date.parse(pin?.updated_at||pin?.updatedAt||pin?.created_at||0)||0}
function isNew(pin){return updatedMs(pin)>seenAt()}
async function control(action,payload={}){
  const t=token();
  if(!t)throw new Error('Нужна активная Президентская сессия.');
  const r=await fetch(CONTROL,{method:'POST',headers:{'content-type':'application/json','x-setka-session':t},body:JSON.stringify({action,...payload})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.detail||d.error||'Ошибка Foundation Control');
  return d;
}
function installUI(){
  if($('pinMailTool'))return;
  document.body.insertAdjacentHTML('beforeend',`
    <button id="pinMailTool" class="pinMailTool" type="button" title="Почта PIN"><span>✉ PIN</span><b id="pinMailBadge" class="pinMailBadge">0</b></button>
    <div id="pinMailModal" class="enhOverlay" aria-hidden="true"><section class="enhPanel enhMailbox">
      <header class="enhHead"><div><h2>Почта PIN</h2><p>Живые PIN из Foundation · статусы и сообщения</p></div><button id="pinMailClose" class="enhIcon">×</button></header>
      <div class="pinLegend"><span>🔴 открыто</span><span>🟡 в работе</span><span>🟢 готово</span><span>✓ принято</span><span>🟣 синтетик / review</span></div>
      <div class="mailToolbar"><div class="mailFilters"><button data-mail-filter="attention" class="active">Активные</button><button data-mail-filter="new">Новые</button><button data-mail-filter="all">Все</button></div><button id="mailSeenAll">✓ Прочитано здесь</button></div>
      <div id="pinMailState" class="enhState"></div><div id="pinMailList" class="pinMailList"></div>
    </section></div>
    <div id="pinThreadModal" class="enhOverlay" aria-hidden="true"><section class="enhPanel enhThread">
      <header class="enhHead"><div><h2 id="threadTitle">PIN</h2><p id="threadMeta"></p></div><button id="threadClose" class="enhIcon">×</button></header>
      <div id="threadSummary"></div><div id="threadActions" class="threadActions"></div>
      <div class="threadSection"><h3>Диалог</h3><div id="threadMessages" class="threadMessages"></div><textarea id="threadReply" maxlength="6000" placeholder="Ответить в PIN…"></textarea><button id="threadSend" class="enhPrimary">Отправить</button></div>
      <div id="threadBriefs" class="threadSection"></div>
    </section></div>`);
  $('pinMailTool').addEventListener('click',openMailbox);
  $('pinMailClose').addEventListener('click',()=>closeOverlay('pinMailModal'));
  $('threadClose').addEventListener('click',()=>closeOverlay('pinThreadModal'));
  $('mailSeenAll').addEventListener('click',markSeen);
  $('threadSend').addEventListener('click',sendReply);
  document.querySelectorAll('[data-mail-filter]').forEach(b=>b.addEventListener('click',()=>setFilter(b.dataset.mailFilter)));
  document.querySelectorAll('.enhOverlay').forEach(o=>o.addEventListener('pointerdown',e=>{if(e.target===o)closeOverlay(o.id)}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeOverlay('pinThreadModal');closeOverlay('pinMailModal')}});
  document.addEventListener('click',e=>{
    const marker=e.target.closest?.('.pinMarker[data-pin-code],.v016PinMarker[data-pin-code]');
    if(!marker)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    openThread(marker.dataset.pinCode);
  },true);
  const mo=new MutationObserver(()=>applyMarkerBadges());
  ['pinsLayer','contextPinsLayer','shellPinsLayer'].forEach(id=>{const el=$(id);if(el)mo.observe(el,{childList:true,subtree:true})});
}
function openOverlay(id){const el=$(id);if(!el)return;el.classList.add('open');el.setAttribute('aria-hidden','false')}
function closeOverlay(id){const el=$(id);if(!el)return;el.classList.remove('open');el.setAttribute('aria-hidden','true')}
function setFilter(f){state.filter=f||'attention';document.querySelectorAll('[data-mail-filter]').forEach(b=>b.classList.toggle('active',b.dataset.mailFilter===state.filter));renderMailbox()}
async function loadPins({silent=false}={}){
  if(!token()){
    state.pins=[];state.pinMap.clear();updateBadge();applyMarkerBadges();
    if(!silent)$('pinMailState').textContent='Войди как Президент — после входа почта PIN подключится автоматически.';
    return;
  }
  try{
    const d=await control('pin_list',{version:'',surface:''});
    state.pins=(Array.isArray(d.pins)?d.pins:[]).slice().sort((a,b)=>updatedMs(b)-updatedMs(a));
    state.pinMap=new Map(state.pins.map(p=>[String(p.pin_code||'').toUpperCase(),p]));
    updateBadge();renderMailbox();applyMarkerBadges();
    if($('pinMailState'))$('pinMailState').textContent='';
  }catch(e){if(!silent&&$('pinMailState'))$('pinMailState').textContent='Не удалось загрузить PIN: '+e.message}
}
function updateBadge(){
  const count=state.pins.filter(isNew).length,b=$('pinMailBadge');if(!b)return;b.textContent=String(count);b.classList.toggle('zero',count===0);
  $('pinMailTool')?.classList.toggle('hasNew',count>0);
}
function renderMailbox(){
  const list=$('pinMailList');if(!list)return;
  let pins=state.pins;
  if(state.filter==='attention')pins=pins.filter(p=>!['resolved','rejected'].includes(String(p.status||'')));
  if(state.filter==='new')pins=pins.filter(isNew);
  if(!pins.length){list.innerHTML='<div class="enhEmpty">Здесь пока пусто.</div>';return}
  list.innerHTML=pins.map(p=>{
    const m=statusMeta(p.status),syn=synthetic(p),fresh=isNew(p);
    return `<button class="pinMailRow ${fresh?'fresh':''}" data-open-pin="${esc(p.pin_code)}"><span class="mailGlyph ${m.cls}">${m.glyph}</span><span class="mailBody"><b>${esc(p.target_label||p.target_key||p.pin_code)}</b><small>${esc(p.pin_code)} · ${esc(p.version||'—')} · ${esc(m.label)}${syn?' · 🟣 '+esc(p.authorDisplayName||'синтетик'):''}</small><em>${esc(p.comment||'')}</em></span><time>${dt(p.updated_at||p.created_at)}</time></button>`;
  }).join('');
  list.querySelectorAll('[data-open-pin]').forEach(b=>b.addEventListener('click',()=>openThread(b.dataset.openPin)));
}
async function openMailbox(){
  openOverlay('pinMailModal');
  $('pinMailState').textContent=token()?'Загружаю PIN…':'Войди как Президент — после входа почта PIN подключится автоматически.';
  await loadPins();
}
function markSeen(){
  const newest=Math.max(Date.now(),...state.pins.map(updatedMs));
  try{localStorage.setItem(SEEN_AT,String(newest))}catch{}
  updateBadge();renderMailbox();
}
function actionButtons(pin){
  const s=String(pin?.status||'open');
  if(s==='proposed')return `<button data-review="approve" class="enhPrimary">Одобрить</button><button data-review="reject" class="enhDanger">Отклонить</button>`;
  if(s==='open')return `<button data-next-status="in_progress" class="enhPrimary">🟡 В работу</button>`;
  if(s==='in_progress')return `<button data-next-status="done" class="enhPrimary">🟢 Готово</button>`;
  if(s==='done')return `<button data-next-status="resolved" class="enhPrimary">✓ Принять</button><button data-next-status="in_progress">Вернуть в работу</button>`;
  if(s==='resolved')return `<button data-next-status="open">Переоткрыть</button>`;
  return '';
}
async function openThread(code){
  code=String(code||'').toUpperCase();if(!code)return;
  state.activeCode=code;openOverlay('pinThreadModal');
  $('threadTitle').textContent=code;$('threadMeta').textContent='Загружаю…';$('threadSummary').innerHTML='';$('threadMessages').innerHTML='';$('threadActions').innerHTML='';$('threadBriefs').innerHTML='';
  try{
    if(!state.pinMap.has(code))await loadPins({silent:true});
    const pin=state.pinMap.get(code)||{};
    const data=await control('pin_thread',{pinCode:code});
    const sm=statusMeta(pin.status),syn=synthetic(pin);
    $('threadMeta').textContent=`${pin.version||'—'} · ${pin.surface||'—'} · ${sm.glyph} ${sm.label}${syn?' · 🟣 '+(pin.authorDisplayName||'синтетик'):''}`;
    $('threadSummary').innerHTML=`<div class="threadCard"><b>${esc(pin.target_label||pin.target_key||code)}</b><p>${esc(pin.comment||'')}</p><small>${esc(pin.page_key||'')} · обновлено ${dt(pin.updated_at||pin.created_at)}</small></div>`;
    $('threadActions').innerHTML=actionButtons(pin);
    $('threadActions').querySelectorAll('[data-next-status]').forEach(b=>b.addEventListener('click',()=>changeStatus(b.dataset.nextStatus)));
    $('threadActions').querySelectorAll('[data-review]').forEach(b=>b.addEventListener('click',()=>reviewPin(b.dataset.review)));
    renderThreadMessages(Array.isArray(data.messages)?data.messages:[]);
    renderBriefs(Array.isArray(data.semanticBriefs)?data.semanticBriefs:[]);
  }catch(e){$('threadMeta').textContent='Ошибка';$('threadMessages').innerHTML=`<div class="enhEmpty">${esc(e.message)}</div>`}
}
function renderThreadMessages(messages){
  const box=$('threadMessages');
  if(!messages.length){box.innerHTML='<div class="enhEmpty">Сообщений ещё нет.</div>';return}
  box.innerHTML=messages.map(m=>`<article class="threadMsg ${esc(m.authorKind||'')}"><header><b>${m.authorKind==='president'?'Президент':m.authorKind==='synthetic_admin'?'Синтетик · админ':m.authorKind==='synthetic'?'Синтетик':'Участник'}</b><time>${dt(m.createdAt)}</time></header><p>${esc(m.body||'')}</p></article>`).join('');
  box.scrollTop=box.scrollHeight;
}
function renderBriefs(briefs){
  const box=$('threadBriefs');if(!briefs.length){box.innerHTML='';return}
  const latest=briefs.at(-1);box.innerHTML=`<h3>Смысловой brief</h3><div class="threadCard"><b>${esc(latest.summary||latest.originKind||'Brief')}</b><p>${esc(latest.assistantInterpretation||latest.presidentIdea||'')}</p></div>`;
}
async function sendReply(){
  const ta=$('threadReply'),body=ta.value.trim();if(!body||!state.activeCode)return;
  const btn=$('threadSend');btn.disabled=true;
  try{await control('pin_message',{pinCode:state.activeCode,message:body});ta.value='';await loadPins({silent:true});await openThread(state.activeCode)}catch(e){alert('Не удалось отправить: '+e.message)}finally{btn.disabled=false}
}
async function changeStatus(next){
  if(!state.activeCode)return;
  try{await control('pin_status',{pinCode:state.activeCode,status:next,implementedInVersion:''});await loadPins({silent:true});await openThread(state.activeCode)}catch(e){alert('Статус PIN: '+e.message)}
}
async function reviewPin(decision){
  if(!state.activeCode)return;if(decision==='reject'&&!confirm('Отклонить этот PIN?'))return;
  try{await control('pin_review',{pinCode:state.activeCode,decision});await loadPins({silent:true});if(decision==='reject')closeOverlay('pinThreadModal');else await openThread(state.activeCode)}catch(e){alert('Review PIN: '+e.message)}
}
function applyMarkerBadges(){
  document.querySelectorAll('.pinMarker[data-pin-code],.v016PinMarker[data-pin-code]').forEach(marker=>{
    const code=String(marker.dataset.pinCode||'').toUpperCase(),pin=state.pinMap.get(code);if(!pin)return;
    const sm=statusMeta(pin.status);marker.dataset.enhStatus=String(pin.status||'open');marker.classList.toggle('pinSynthetic',synthetic(pin));
    let badge=marker.querySelector('.pinStateMini');if(!badge){badge=document.createElement('span');badge.className='pinStateMini';marker.appendChild(badge)}badge.textContent=sm.glyph;badge.title=sm.label+(synthetic(pin)?' · синтетик':'');
  });
}
function boot(){
  installUI();loadPins({silent:true});
  clearInterval(state.poll);state.poll=setInterval(()=>loadPins({silent:true}),15000);
  window.addEventListener('storage',e=>{if(e.key===SESSION||e.key===SEEN_AT)loadPins({silent:true})});
  setInterval(applyMarkerBadges,1200);
  window.Foundation017Enhancements={version:'1.0.0',reload:()=>loadPins(),openMailbox,openThread,statusMeta};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();