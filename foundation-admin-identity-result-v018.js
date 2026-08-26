(()=>{
'use strict';
const VERSION='0.1.8';
const $=id=>document.getElementById(id);
let observer=null;

function copyText(text,button){
  const done=()=>{const old=button.textContent;button.textContent='✓ Скопировано';setTimeout(()=>button.textContent=old,1200)};
  if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text).then(done).catch(()=>fallback(text,done));return}
  fallback(text,done);
}
function fallback(text,done){
  const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch{}ta.remove();
}
function credentialText(card){
  const lines=(card.dataset.rawCredential||card.innerText||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const id=lines.find(x=>/^SETKA-[A-Z0-9]+-[A-Z0-9]+$/i.test(x));
  const key=lines.find(x=>/^(KEY|SKP)-/i.test(x));
  return [id,key].filter(Boolean).join('\n')||lines.join('\n');
}
function decorateCard(card){
  if(card.dataset.resultV018==='1')return;
  card.dataset.resultV018='1';
  card.dataset.rawCredential=card.innerText||'';
  const actions=document.createElement('div');actions.className='identityResultActions';
  const copy=document.createElement('button');copy.type='button';copy.className='identityCopyCredential';copy.textContent='⧉ Копировать ID + ключ';
  copy.addEventListener('click',()=>copyText(credentialText(card),copy));
  actions.appendChild(copy);card.appendChild(actions);
}
function finishState(){
  const result=$('identity018Result'),create=$('identity018Create');if(!result||!create)return;
  const cards=[...result.querySelectorAll('.v017Credential')];if(!cards.length)return;
  cards.forEach(decorateCard);
  result.dataset.createdComplete='1';
  setTimeout(()=>{if(result.dataset.createdComplete!=='1')return;create.disabled=true;create.textContent=cards.length>1?`✓ Создано ${cards.length} ID`:'✓ ID создан';},0);
  let final=result.querySelector('.identityCreationComplete');
  if(!final){
    final=document.createElement('div');final.className='identityCreationComplete';
    const text=document.createElement('div');text.innerHTML='<b>СЦЕНАРИЙ ЗАВЕРШЁН</b><span>Корневой SETKA ID уже записан в систему. Повторное создание не требуется.</span>';
    const acts=document.createElement('div');acts.className='identityCreationCompleteActions';
    const again=document.createElement('button');again.type='button';again.textContent='Создать ещё';again.addEventListener('click',()=>resetForAnother());
    const done=document.createElement('button');done.type='button';done.className='primary';done.textContent='Готово';done.addEventListener('click',()=>closeCompleted());
    acts.append(again,done);final.append(text,acts);result.appendChild(final);
  }
}
function resetForAnother(){
  const result=$('identity018Result'),create=$('identity018Create');if(!result||!create)return;
  result.innerHTML='';result.dataset.createdComplete='0';create.disabled=false;create.textContent='Создать ID';
}
function closeCompleted(){
  const modal=$('identity018Modal');modal?.classList.remove('open');
  setTimeout(resetForAnother,120);
}
function attach(){
  const result=$('identity018Result');if(!result||observer)return;
  observer=new MutationObserver(m=>{if(m.some(x=>x.type==='childList'))finishState()});
  observer.observe(result,{childList:true,subtree:false});finishState();
}
// If a completed result is on screen, stop the original create listener before it
// can accidentally issue another root. Explicit “Создать ещё” clears this gate.
document.addEventListener('click',e=>{
  const create=e.target.closest?.('#identity018Create');
  if(create&&$('identity018Result')?.dataset.createdComplete==='1'){
    e.preventDefault();e.stopImmediatePropagation();
  }
},true);

document.addEventListener('click',e=>{if(e.target.closest?.('#createIdentity018,#createSynthetic018'))setTimeout(attach,0)},true);
setTimeout(attach,120);
window.FoundationAdminIdentityResultV018={version:VERSION,finish:finishState,reset:resetForAnother};
})();
