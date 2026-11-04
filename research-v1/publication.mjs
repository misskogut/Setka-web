import {mountPatternEditor} from './pattern-editor.mjs';
export const publicationLabel=state=>({testing:'На проверке',published:'Опубликован',disabled:'Выключен'})[state]||'Статус не подтверждён';
// One generic editor for current and future descriptor IDs. No user telemetry
// is initialized by this admin-only sandbox.
export async function mountPublication(root,{id,api,onCommitted,onChange,initial=null,compact=false}){
 root.replaceChildren();
 const heading=document.createElement('h2');heading.textContent='Публикация и тестовая область';
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Проверяем статус публикации…';
 const help=document.createElement('p');help.className='muted small';help.textContent='На проверке и выключенные паттерны скрыты в приложении. История, заметки и статистика сохраняются. Открытые приложения получают изменения при следующем обновлении каталога (обычно до 30 секунд при наличии связи).';
 const actions=document.createElement('div');actions.className='row';actions.style.flexWrap='wrap';
 if(compact)root.append(status,actions);else root.append(heading,status,help,actions);
 let current;
 try{if(initial)current=initial;else{const out=await api('manage-catalog');current=out.publication?.find(p=>p.pattern_id===id);}if(!current)throw Error('publication_unavailable');}
 catch(_){status.textContent='Статус не подтверждён. Откройте карточку заново.';return;}
 if(!root.isConnected)return;
 status.textContent=publicationLabel(current.state);
 for(const [state,label] of [['published','Опубликовать'],['disabled','Выключить'],['testing','Вернуть на проверку']]){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=current.state===state;actions.append(button);
  button.onclick=async()=>{
   actions.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent='Сохраняем статус…';
   try{const out=await api('set-pattern-publication',{patternId:id,state,expectedRevision:Number(current.revision)});
    if(out.ok!==true||out.item?.state!==state)throw Error('not_confirmed');
    status.textContent=publicationLabel(state)+' · подтверждено сервером';if(compact)await mountPublication(root,{id,api,onCommitted,onChange,initial:out.item,compact});await onCommitted();
   }catch(e){status.textContent=e.message.includes('revision_conflict')?'Статус уже изменён в другом окне. Откройте карточку заново.':'Изменение не подтверждено. Откройте карточку заново перед повтором.';}
  };
 }
 if(compact)return;
 const test=document.createElement('button');test.type='button';test.textContent='Открыть тестовую область';test.setAttribute('aria-expanded','false');
 const area=document.createElement('div');area.hidden=true;root.append(test,area);
 test.onclick=()=>{const open=area.hidden;area.hidden=!open;test.setAttribute('aria-expanded',String(open));test.textContent=open?'Свернуть тестовую область':'Открыть тестовую область';
  if(open&&!area.childNodes.length)mountPatternEditor(area,{id,api,onChange,draftOnly:true});
  onChange();
 };
}
