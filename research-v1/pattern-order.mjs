// One editor for the installed catalog, including testing/disabled modules.
// Draft survives routine research refreshes; only a confirmed revision is public.
export function mountPatternOrder(root,{registry,order,api,draft,onCommitted}){
 root.replaceChildren();
 const heading=document.createElement('h2');heading.textContent='Порядок паттернов';
 const help=document.createElement('p');help.className='muted small';help.textContent='Выберите позицию или перемещайте стрелками. Этот порядок общий для пользователей. Непросмотренные паттерны сначала показываются сверху — новые первыми; после открытия занимают своё место здесь. Скрытые паттерны сохраняют позицию.';
 const status=document.createElement('p');status.setAttribute('role','status');
 root.append(heading,help,status);
 if(!order||!Number.isSafeInteger(order.revision)){status.textContent='Порядок не загружен. Обновите данные при восстановлении связи.';return;}
 if(!draft.dirty){draft.ids=registry.orderedIds();draft.revision=order.revision;}
 const ids=draft.ids.filter(id=>registry.has(id));for(const id of registry.orderedIds())if(!ids.includes(id))ids.push(id);draft.ids=ids;
 const list=document.createElement('ol');list.style.cssText='list-style:none;padding:0;display:grid;gap:8px';
 const save=document.createElement('button');save.type='button';save.textContent='Сохранить порядок';
 const reset=document.createElement('button');reset.type='button';reset.textContent='Отменить изменения';
 const actions=document.createElement('div');actions.className='row';actions.style.flexWrap='wrap';actions.append(save,reset);root.append(list,actions);
 let saving=false;
 const move=(from,to)=>{if(saving||from===to)return;const [id]=draft.ids.splice(from,1);draft.ids.splice(to,0,id);draft.dirty=true;render();};
 function render(){
  list.replaceChildren();status.textContent=draft.dirty?'Порядок изменён. Нажмите «Сохранить порядок», чтобы применить его у всех.':'Порядок подтверждён сервером.';
  draft.ids.forEach((id,index)=>{
   const row=document.createElement('li');row.dataset.patternId=id;row.className='row';row.style.cssText='flex-wrap:wrap;border-bottom:1px solid #ddd;padding:8px 0;gap:8px';
   const name=document.createElement('span');name.textContent=registry.title(id);name.style.cssText='flex:1;min-width:130px';
   const position=document.createElement('select');position.setAttribute('aria-label','Позиция: '+registry.title(id));
   draft.ids.forEach((_,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=String(i+1);position.append(o)});position.value=String(index);position.onchange=()=>move(index,Number(position.value));
   row.append(name,position);
   for(const [delta,label] of [[-1,'Вверх'],[1,'Вниз']]){const b=document.createElement('button');b.type='button';b.textContent=delta<0?'↑':'↓';b.setAttribute('aria-label',label+': '+registry.title(id));b.disabled=index+delta<0||index+delta>=draft.ids.length;b.onclick=()=>move(index,index+delta);row.append(b)}
   list.append(row);
  });save.disabled=!draft.dirty;reset.disabled=!draft.dirty;
 }
 reset.onclick=()=>{draft.dirty=false;draft.ids=registry.orderedIds();draft.revision=order.revision;render()};
 save.onclick=async()=>{
  saving=true;root.querySelectorAll('button,select').forEach(b=>b.disabled=true);status.textContent='Сохраняем порядок…';
  const requested=draft.ids.slice();
  try{
   const out=await api('set-pattern-order',{patternIds:requested,expectedRevision:draft.revision});
   if(out.ok!==true||JSON.stringify(out.order?.patternIds)!==JSON.stringify(requested)||!Number.isSafeInteger(out.order?.revision)||out.order.revision<draft.revision)throw Error('order_not_confirmed');
   const confirmed=await api('manage-catalog');
   if(confirmed.order?.revision!==out.order.revision||JSON.stringify(confirmed.order.patternIds)!==JSON.stringify(requested))throw Error('order_readback_changed');
   registry.applyOrder(confirmed.order);draft.dirty=false;draft.revision=confirmed.order.revision;await onCommitted();
  }catch(e){
   status.textContent=e.message.includes('revision_conflict')||e.message==='order_readback_changed'?'Порядок уже изменён в другом окне. Нажмите «Загрузить текущий порядок» и повторите изменения.':'Сохранение не подтверждено. Черновик сохранён; проверьте связь и повторите.';
   save.disabled=false;reset.disabled=false;reset.textContent='Загрузить текущий порядок';
   reset.onclick=async()=>{reset.disabled=true;try{const out=await api('manage-catalog');registry.applyOrder(out.order);draft.dirty=false;await onCommitted()}catch(_){status.textContent='Не удалось загрузить порядок. Черновик сохранён.';reset.disabled=false}};
  }finally{saving=false;}
 };
 render();
}
