(()=>{
'use strict';
const VERSION='0.1.8';
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
let scheduled=false;
function carry(){try{return window.FoundationAdminPatchV018?.carry?.()||{}}catch{return{}}}
function origin(k){return k==='president'?'Президент':k==='synthetic_admin'?'Synthetic Admin':k==='back_participant'?'Back-участник':'legacy / база'}
function access(x){const a=[];if(x.frontEnabled)a.push('FRONT');if(x.backEnabled)a.push('BACK / ADMIN');return a.join(' + ')||'без поверхности'}
function row(x){return `<div class="constantIdentityRow"><div><b>${esc(x.setkaId||'—')}</b><span>${esc(x.displayName||'без метки')}</span></div><div><span>${x.nature==='synthetic'?'СИНТЕТИК':'ЧЕЛОВЕК'}</span><span>${esc(access(x))}</span></div><div><span>создал: ${esc(origin(x.creatorKind))}</span>${x.personaKey?`<span>persona: ${esc(x.personaKey)}</span>`:''}</div></div>`}
function render(){
  scheduled=false;
  const card=document.querySelector('#page-constants .constantPrimary');
  if(!card)return;
  let box=card.querySelector('.constantGenomeV018');
  if(!box){box=document.createElement('div');box.className='constantGenomeV018';card.appendChild(box)}
  const ids=carry()?.directory?.identities||[];
  box.innerHTML=`<div class="constantGenomeHead"><b>СТАНДАРТ / «ГЕН» SETKA ID</b><span>Это единый закон рождения всех идентичностей Foundation.</span></div><div class="constantGenomeGrid"><div><span>ФОРМАТ КОРНЯ</span><b>SETKA-XXXX-XXXX</b><small>создаётся только системой</small></div><div><span>УНИКАЛЬНОСТЬ</span><b>ОБЩАЯ БАЗА ID</b><small>перед выдачей проверяется, что корень свободен</small></div><div><span>НЕИЗМЕННО</span><b>SETKA ID</b><small>корень не меняется при перенастройке сущности</small></div><div><span>МЕНЯЕТСЯ ПОВЕРХ</span><b>ПРИРОДА · ДОСТУП · ЗАДАЧА</b><small>человек/синтетик, Front/Back, активность, задача, характер</small></div></div><div class="constantGenomeNote">personaKey у синтетика — внутренний ключ персоны, а не новый SETKA ID и не часть корневого имени.</div><div class="constantIdentityHead"><b>ТЕКУЩИЕ КОРНИ В СИСТЕМЕ</b><span>${ids.length} записей в доступном снимке</span></div><div class="constantIdentityList">${ids.length?ids.map(row).join(''):'<div class="constantEmpty">Пока нет доступных ID.</div>'}</div>`;
}
function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(render)}
window.addEventListener('foundation:v018-directory',queue);
document.addEventListener('click',e=>{if(e.target.closest?.('.nav button[data-page="constants"],#refresh'))setTimeout(queue,80)},true);
const page=document.getElementById('page-constants');
if(page)new MutationObserver(m=>{if(m.some(x=>x.type==='childList'))queue()}).observe(page,{childList:true});
setTimeout(queue,300);
window.FoundationAdminConstantsUXV018={version:VERSION,render:queue};
})();
