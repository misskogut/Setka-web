// One editor for the installed catalog, including testing/disabled modules.
// Draft survives routine research refreshes; only a confirmed revision is public.
export function mountPatternOrder(root,{registry,order,api,draft,onCommitted,miniRoot=null}){
 const status=document.createElement('p');status.setAttribute('role','status');
 if(!order||!Number.isSafeInteger(order.revision)){root.querySelectorAll('.pattern-order-controls').forEach(slot=>slot.textContent='Порядок не загружен. Обновите данные.');return;}
 if(!draft.dirty){draft.ids=registry.orderedIds();draft.revision=order.revision;}
 const ids=draft.ids.filter(id=>registry.has(id));for(const id of registry.orderedIds())if(!ids.includes(id))ids.push(id);draft.ids=ids;
 const save=document.createElement('button');save.type='button';save.textContent='Сохранить порядок';
 const reset=document.createElement('button');reset.type='button';reset.textContent='Отменить изменения';
 // Shared transaction; controls live next to the actual pattern, never in a second list.
 const state=message=>{root.querySelectorAll('.pattern-order-status').forEach(el=>el.textContent=message);miniRoot?.querySelectorAll('.pattern-order-status').forEach(el=>el.textContent=message)};
 let saving=false;
 const move=(from,to)=>{if(saving||from===to||to<0||to>=draft.ids.length)return;const [id]=draft.ids.splice(from,1);draft.ids.splice(to,0,id);draft.dirty=true;render();};
 function render(){
  status.textContent=draft.dirty?'Порядок изменён. Нажмите «Сохранить порядок», чтобы применить его у всех.':'Порядок подтверждён сервером.';
  if(miniRoot){
   let grid=miniRoot.querySelector('.pattern-mini-grid');
   if(!grid){grid=document.createElement('div');grid.className='pattern-mini-grid';grid.setAttribute('aria-label','Перетаскивание порядка паттернов');miniRoot.append(grid)}
   const previous=new Map([...grid.children].map(el=>[el.dataset.patternId,el]));
   for(const id of draft.ids){
    let tile=previous.get(id);if(!tile){tile=document.createElement('button');tile.type='button';tile.className='pattern-mini-tile';tile.dataset.patternId=id;
     const canvas=document.createElement('canvas');canvas.width=120;canvas.height=120;canvas.dataset.preview='';canvas.dataset.pattern=id;canvas.dataset.frame='44';
     const label=document.createElement('span');label.className='mini-pattern-label';tile.append(canvas,label);
    }
    tile.setAttribute('aria-label','Переместить: '+registry.title(id));tile.querySelector('.mini-pattern-label').textContent=registry.title(id);grid.append(tile);
   }
   let actions=miniRoot.querySelector('.pattern-mini-actions');if(!actions){actions=document.createElement('div');actions.className='pattern-mini-actions';miniRoot.append(actions)}actions.replaceChildren();
   for(const control of [save,reset]){const button=document.createElement('button');button.type='button';button.textContent=control.textContent;button.disabled=!draft.dirty;button.onclick=()=>control.onclick?.();actions.append(button)}
   const receipt=document.createElement('p');receipt.className='pattern-order-status small';receipt.setAttribute('role','status');receipt.textContent=status.textContent;actions.append(receipt);
   let drag=null;
   const clean=()=>{grid.querySelectorAll('.dragging,.drop-target').forEach(el=>el.classList.remove('dragging','drop-target'));draft.dragging=false;drag=null};
   grid.onpointerdown=e=>{const tile=e.target.closest('.pattern-mini-tile');if(!tile||saving||draft.saving||e.isPrimary===false||e.button!==0)return;
    drag={id:tile.dataset.patternId,pointerId:e.pointerId,x:e.clientX,y:e.clientY,target:null,moved:false};draft.dragging=true;grid.setPointerCapture(e.pointerId);
   };
   grid.onpointermove=e=>{if(!drag||e.pointerId!==drag.pointerId)return;
    if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<8)return;drag.moved=true;e.preventDefault();
    grid.querySelector(`[data-pattern-id="${drag.id}"]`)?.classList.add('dragging');
    grid.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));
    const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.pattern-mini-tile');
    drag.target=target&&grid.contains(target)?target.dataset.patternId:null;if(drag.target!==drag.id)target?.classList.add('drop-target');
   };
   grid.onpointerup=e=>{if(!drag||e.pointerId!==drag.pointerId)return;const {id,target,moved}=drag;clean();if(grid.hasPointerCapture(e.pointerId))grid.releasePointerCapture(e.pointerId);
    if(moved&&target&&target!==id)move(draft.ids.indexOf(id),draft.ids.indexOf(target));
    else if(!moved)[...root.querySelectorAll('.pattern-manage-card')].find(el=>el.dataset.patternId===id)?.scrollIntoView({behavior:'smooth',block:'center'});
   };
   grid.onpointercancel=clean;grid.onlostpointercapture=clean;
   grid.onkeydown=e=>{const tile=e.target.closest('.pattern-mini-tile'),delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-4,ArrowDown:4}[e.key];if(!tile||delta===undefined)return;e.preventDefault();const id=tile.dataset.patternId,index=draft.ids.indexOf(id);move(index,index+delta);grid.querySelector(`[data-pattern-id="${id}"]`)?.focus()};
  }
  draft.ids.forEach((id,index)=>{
   const card=[...root.querySelectorAll('.pattern-manage-card')].find(el=>el.dataset.patternId===id);if(!card)return;root.append(card);
   const slot=card.querySelector('.pattern-order-controls');slot.replaceChildren();
   const row=document.createElement('div');row.dataset.patternId=id;row.className='row';row.style.cssText='flex-wrap:wrap;border-bottom:1px solid #ddd;padding:8px 0;gap:8px';
   const name=document.createElement('span');name.textContent='Позиция';name.style.cssText='flex:1;min-width:130px';
   const position=document.createElement('select');position.setAttribute('aria-label','Позиция: '+registry.title(id));
   draft.ids.forEach((_,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=String(i+1);position.append(o)});position.value=String(index);position.onchange=()=>move(index,Number(position.value));
   row.append(name,position);
   for(const [delta,label] of [[-1,'Вверх'],[1,'Вниз']]){const b=document.createElement('button');b.type='button';b.textContent=delta<0?'↑':'↓';b.setAttribute('aria-label',label+': '+registry.title(id));b.disabled=index+delta<0||index+delta>=draft.ids.length;b.onclick=()=>move(index,index+delta);row.append(b)}
   const receipt=document.createElement('p');receipt.className='pattern-order-status small';receipt.setAttribute('role','status');receipt.textContent=status.textContent;
   slot.append(row,receipt);
   for(const [control,label] of [[save,'Сохранить порядок'],[reset,'Отменить изменения']]){
    const button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=!draft.dirty;button.onclick=()=>control.onclick?.();slot.append(button);
   }
  });save.disabled=!draft.dirty;reset.disabled=!draft.dirty;
 }
 reset.onclick=()=>{draft.dirty=false;draft.ids=registry.orderedIds();draft.revision=order.revision;render()};
 save.onclick=async()=>{
  saving=true;draft.saving=true;root.querySelectorAll('.pattern-order-controls button,.pattern-order-controls select').forEach(b=>b.disabled=true);miniRoot?.querySelectorAll('button').forEach(b=>b.disabled=true);state('Сохраняем порядок…');
  const requested=draft.ids.slice();
  try{
   const out=await api('set-pattern-order',{patternIds:requested,expectedRevision:draft.revision});
   if(out.ok!==true||JSON.stringify(out.order?.patternIds)!==JSON.stringify(requested)||!Number.isSafeInteger(out.order?.revision)||out.order.revision<draft.revision)throw Error('order_not_confirmed');
   const confirmed=await api('manage-catalog');
   if(confirmed.order?.revision!==out.order.revision||JSON.stringify(confirmed.order.patternIds)!==JSON.stringify(requested))throw Error('order_readback_changed');
   registry.applyOrder(confirmed.order);draft.dirty=false;draft.saving=false;draft.revision=confirmed.order.revision;order=confirmed.order;render();state('Порядок подтверждён сервером.');await onCommitted();
  }catch(e){
   status.textContent=e.message.includes('revision_conflict')||e.message==='order_readback_changed'?'Порядок уже изменён в другом окне. Нажмите «Загрузить текущий порядок» и повторите изменения.':'Сохранение не подтверждено. Черновик сохранён; проверьте связь и повторите.';
   if(miniRoot){miniRoot.querySelectorAll('button').forEach(b=>b.disabled=false);miniRoot.querySelectorAll('.pattern-mini-actions button').forEach(b=>{if(b.textContent==='Отменить изменения')b.textContent='Загрузить текущий порядок'})}
   state(status.textContent);root.querySelectorAll('.pattern-order-controls button').forEach(button=>{button.disabled=false});
   save.disabled=false;reset.disabled=false;reset.textContent='Загрузить текущий порядок';
   root.querySelectorAll('.pattern-order-controls button').forEach(button=>{if(button.textContent==='Отменить изменения')button.textContent=reset.textContent});
   reset.onclick=async()=>{reset.disabled=true;try{const out=await api('manage-catalog');registry.applyOrder(out.order);draft.dirty=false;await onCommitted()}catch(_){state('Не удалось загрузить порядок. Черновик сохранён.');reset.disabled=false}};
  }finally{saving=false;draft.saving=false;}
 };
 render();
}
