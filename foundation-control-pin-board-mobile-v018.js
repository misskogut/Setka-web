(()=>{
'use strict';
const q=id=>document.getElementById(id);
function mobile(){return matchMedia('(max-width:700px)').matches}
function setCollapsed(v){
 const board=q('pinBoard');
 const btn=q('pinBoardMinimize018');
 if(!board)return;
 board.classList.toggle('pinBoardCollapsed018',!!v);
 if(btn){btn.textContent=v?'☷':'−';btn.title=v?'Развернуть список пинов':'Свернуть список пинов'}
}
function install(){
 const board=q('pinBoard');
 const head=board?.querySelector('.pinBoardHead');
 if(board&&head){
  let btn=q('pinBoardMinimize018');
  if(!btn){
   btn=document.createElement('button');
   btn.id='pinBoardMinimize018';
   btn.className='pinBoardMinimize018';
   btn.type='button';
   btn.textContent='−';
   btn.title='Свернуть список пинов';
   const close=q('pinBoardClose');
   head.insertBefore(btn,close||null);
   btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setCollapsed(!board.classList.contains('pinBoardCollapsed018'))});
   head.addEventListener('dblclick',e=>{if(!mobile())return;e.preventDefault();setCollapsed(!board.classList.contains('pinBoardCollapsed018'))});
  }
  const tool=q('pinListTool');
  if(tool&&!tool.dataset.mobileBoardHook){
   tool.dataset.mobileBoardHook='1';
   tool.addEventListener('click',()=>{if(!board.classList.contains('open'))setCollapsed(false)},true);
  }
 }
 installModalPinning();
 installPinNeighbors();
 updatePinNeighbors();
}
addEventListener('resize',()=>{if(!mobile())setCollapsed(false)});

/* Place a new PIN directly on an already opened PIN detail card. */
const CONTROL='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-control';
const SESSION_KEY='setka:foundation:president:session';
const SURFACE=document.body.dataset.surface==='president'?'president':'user';
let modalPinMode=false,modalPinPending=null;
function sessionToken(){try{return localStorage.getItem(SESSION_KEY)||''}catch{return''}}
function currentVersion(){return q('versionSelect')?.value||''}
async function control(action,payload={}){const headers={'content-type':'application/json'};const t=sessionToken();if(t)headers['x-setka-session']=t;const r=await fetch(CONTROL,{method:'POST',headers,body:JSON.stringify({action,...payload})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||d.error||'Ошибка управления PIN');return d}
function cssEscape(s){try{return CSS.escape(String(s))}catch{return String(s).replace(/[^a-zA-Z0-9_-]/g,'\\$&')}}
function openPinCard(){return document.querySelector('#pinReadModal.open,#v016PinReadModal.open')}
function parentPinCode(modal){if(!modal)return'';const source=modal.id==='v016PinReadModal'?q('v016PinReadCode'):q('pinReadCode');return String(source?.textContent||'').match(/PIN-[A-Z0-9]+/)?.[0]||''}
function updateModalPinUi(){document.querySelectorAll('.modalPinTool018').forEach(b=>{b.classList.toggle('active',modalPinMode);b.textContent=modalPinMode?'✓ Выбери место':'📌 Пин на карточке'});q('modalPinInstruction018')?.classList.toggle('show',modalPinMode)}
function installModalPinning(){
 for(const id of ['pinReadModal','v016PinReadModal']){const modal=q(id),card=modal?.querySelector('.modalCard');if(!card||card.querySelector('.modalPinTool018'))continue;const b=document.createElement('button');b.type='button';b.className='modalPinTool018';b.textContent='📌 Пин на карточке';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();modalPinMode=!modalPinMode;updateModalPinUi()});card.querySelector('h2')?.after(b)}
 if(!q('modalPinInstruction018')){const d=document.createElement('div');d.id='modalPinInstruction018';d.className='modalPinInstruction018';d.textContent='Тапни место на карточке, куда поставить PIN';document.body.appendChild(d)}
 if(!q('modalPinComposer018')){const d=document.createElement('div');d.id='modalPinComposer018';d.className='modalPinComposer018';d.innerHTML='<div class="modalPinComposerCard018"><div class="modalPinComposerTitle018">Новый PIN на карточке</div><div id="modalPinComposerMeta018" class="modalPinComposerMeta018"></div><textarea id="modalPinComment018" maxlength="4000" placeholder="Что здесь нужно изменить или проверить?"></textarea><div class="modalPinComposerActions018"><button id="modalPinCancel018">Отмена</button><button id="modalPinSave018" class="primary">Сохранить PIN</button></div></div>';document.body.appendChild(d);q('modalPinCancel018')?.addEventListener('click',closeModalPinComposer);q('modalPinSave018')?.addEventListener('click',saveModalPin)}
}
function closeModalPinComposer(){modalPinPending=null;q('modalPinComposer018')?.classList.remove('open');const t=q('modalPinComment018');if(t)t.value=''}
function describeModalPoint(e,modal){const card=e.target.closest('.modalCard');let anchorEl=e.target.closest('[id]');if(!anchorEl||!card?.contains(anchorEl)||anchorEl.id==='modalPinComposer018')anchorEl=card;const selector=anchorEl?.id?`#${cssEscape(anchorEl.id)}`:`#${cssEscape(modal.id)} .modalCard`;const r=anchorEl.getBoundingClientRect();const rx=r.width?Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)):.5,ry=r.height?Math.max(0,Math.min(1,(e.clientY-r.top)/r.height)):.5;const code=parentPinCode(modal);const raw=(e.target.getAttribute?.('aria-label')||e.target.title||e.target.textContent||anchorEl.id||'область карточки').trim().replace(/\s+/g,' ').slice(0,180);return{version:currentVersion(),surface:SURFACE,pageKey:'__modal__',targetKey:`modal:${code||modal.id}:${anchorEl.id||'card'}`,targetLabel:`Карточка ${code||'PIN'} · ${raw||'область'}`,anchor:{kind:'modal-element',selector,modal_id:modal.id,parent_pin_code:code,rx,ry},viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1}}}
function captureModalPin(e){if(!modalPinMode)return;const modal=openPinCard();if(!modal||!modal.contains(e.target)||e.target.closest('.modalPinTool018,.modalPinComposer018,.pinNeighborNav018'))return;const card=e.target.closest('.modalCard');if(!card)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();modalPinPending=describeModalPoint(e,modal);modalPinMode=false;updateModalPinUi();q('modalPinComposerMeta018').textContent=modalPinPending.targetLabel;q('modalPinComposer018').classList.add('open');setTimeout(()=>q('modalPinComment018')?.focus(),40)}
async function saveModalPin(){const p=modalPinPending,comment=q('modalPinComment018')?.value.trim();if(!p||!comment)return;const b=q('modalPinSave018');if(b)b.disabled=true;try{await control('pin_create',{...p,comment});closeModalPinComposer();window.FoundationControlPatchV016?.reloadPins?.();window.FoundationPinsV018?.reload?.();setTimeout(()=>window.FoundationPinOriginV018?.decorate?.(),350)}catch(e){alert('Не удалось сохранить PIN: '+e.message)}finally{if(b)b.disabled=false}}

/* Direct previous/next navigation inside an opened PIN card. */
function canonicalPins(){const all=window.FoundationPinsV018?.pins?.();if(!Array.isArray(all))return[];const v=currentVersion();return all.filter(p=>p&&p.version===v&&p.surface===SURFACE&&p.status!=='deleted'&&p.status!=='rejected').slice().sort((a,b)=>new Date(a.created_at||a.createdAt||0)-new Date(b.created_at||b.createdAt||0)||String(a.pin_code).localeCompare(String(b.pin_code)))}
function activePinCode(){const modal=openPinCard();return parentPinCode(modal)}
function neighborFor(dir){const pins=canonicalPins(),code=activePinCode(),i=pins.findIndex(p=>p.pin_code===code);if(i<0)return null;return pins[i+dir]||null}
function installPinNeighbors(){
 for(const id of ['pinReadModal','v016PinReadModal']){
  const modal=q(id),card=modal?.querySelector('.modalCard');if(!card||card.querySelector('.pinNeighborNav018'))continue;
  const nav=document.createElement('div');nav.className='pinNeighborNav018';nav.innerHTML='<button type="button" data-pin-neighbor="-1">← Предыдущий</button><span class="pinNeighborPosition018">PIN</span><button type="button" data-pin-neighbor="1">Следующий →</button>';
  const actions=card.querySelector('.modalActions');(actions||card).insertAdjacentElement(actions?'beforebegin':'beforeend',nav);
  nav.querySelectorAll('[data-pin-neighbor]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const p=neighborFor(Number(b.dataset.pinNeighbor));if(!p)return;modal.classList.remove('open');setTimeout(()=>window.FoundationPinsV018?.open?.(p.pin_code),30)}));
 }
}
function updatePinNeighbors(){const modal=openPinCard();if(!modal)return;const pins=canonicalPins(),code=activePinCode(),i=pins.findIndex(p=>p.pin_code===code),nav=modal.querySelector('.pinNeighborNav018');if(!nav)return;const prev=nav.querySelector('[data-pin-neighbor="-1"]'),next=nav.querySelector('[data-pin-neighbor="1"]'),pos=nav.querySelector('.pinNeighborPosition018');if(prev)prev.disabled=i<=0;if(next)next.disabled=i<0||i>=pins.length-1;if(pos)pos.textContent=i>=0?`${i+1} / ${pins.length}`:code||'PIN'}
const modalObserver=new MutationObserver(()=>{installPinNeighbors();updatePinNeighbors()});
for(const id of ['pinReadModal','v016PinReadModal']){const m=q(id);if(m)modalObserver.observe(m,{attributes:true,attributeFilter:['class'],subtree:false})}

document.addEventListener('click',captureModalPin,true);
setInterval(install,500);setTimeout(install,200);
window.FoundationPinBoardMobileV018={collapse:()=>setCollapsed(true),expand:()=>setCollapsed(false),neighbors:()=>({prev:neighborFor(-1)?.pin_code||null,next:neighborFor(1)?.pin_code||null})};
})();