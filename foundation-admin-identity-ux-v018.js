(()=>{
'use strict';
const VERSION='0.1.8';
const $=id=>document.getElementById(id);
let resultObserver=null;

function fieldFor(id){return $(id)?.closest?.('.field')||null}
function setLabel(id,text){const f=fieldFor(id);const l=f?.querySelector('label');if(l)l.textContent=text}
function accessLabel(inputId,title,desc){
  const input=$(inputId),label=input?.closest?.('label');
  if(!input||!label||label.dataset.v018Meaning==='1')return;
  label.dataset.v018Meaning='1';
  [...label.childNodes].filter(n=>n!==input).forEach(n=>n.remove());
  const box=document.createElement('span');box.className='identityAccessMeaning';
  const b=document.createElement('b');b.textContent=title;
  const s=document.createElement('small');s.textContent=desc;
  box.append(b,s);label.appendChild(box);
}
function rolePreview(){
  const modal=$('identity018Modal'),preview=$('identity018RolePreview');if(!modal||!preview)return;
  const nature=$('identity018Nature')?.value||'human',front=!!$('identity018Front')?.checked,back=!!$('identity018Back')?.checked;
  const bits=[nature==='synthetic'?'СИНТЕТИК':'ЧЕЛОВЕК'];if(front)bits.push('FRONT');if(back)bits.push('BACK / ADMIN');
  let meaning='Природа H/S фиксируется при выпуске ID. Front/Back, задача и характер могут меняться позже без смены SETKA ID.';
  if(nature==='synthetic'&&back)meaning='Синтетик + BACK / ADMIN = Synthetic Admin. Природа S и сам SETKA ID остаются неизменными.';
  preview.innerHTML=`<b>${bits.join(' · ')}</b><span>${meaning}</span>`;
}
function policyText(){
  const p=$('identity018Policy');if(!p)return;
  const nature=$('identity018Nature');
  const root=!nature?.disabled;
  if(root)p.textContent='Сначала выбирается природа ID. Система выпускает SETKA-H-… для человека или SETKA-S-… для синтетика; H/S после выпуска не меняется.';
  else p.textContent='Этот Back-актор может создавать только собственных синтетиков SETKA-S-… с доступом к Front. Выдать им Back / Admin может только Президент.';
}
function decorateResults(){
  const box=$('identity018Result');if(!box)return;
  [...box.querySelectorAll('.v017Credential')].forEach(card=>{
    if(card.querySelector('.identityGeneratedLabel'))return;
    const tag=document.createElement('div');tag.className='identityGeneratedLabel';tag.textContent='СИСТЕМА СГЕНЕРИРОВАЛА КОРНЕВОЙ ID';card.prepend(tag);
  });
}
function fixDirectoryCopy(){
  const sub=$('page-users')?.querySelector('.sectionHead .sub');
  if(sub)sub.textContent='SETKA ID выпускается с неизменяемым префиксом природы: SETKA-H-… — человек, SETKA-S-… — синтетик. Front/Back, задачи и доступы — отдельные изменяемые слои.';
}
function fixEditNature(){
  const nature=$('identityEdit018Nature');if(!nature)return;
  nature.disabled=true;
  setLabel('identityEdit018Nature','Природа ID · неизменяема');
}
function enhance(){
  const modal=$('identity018Modal');if(!modal)return;
  const h=modal.querySelector('h2');if(h)h.textContent='Создать SETKA ID';
  let rule=modal.querySelector('.identityRootRule');
  if(!rule){
    rule=document.createElement('div');rule.className='identityRootRule';
    const policy=$('identity018Policy');policy?.parentNode?.insertBefore(rule,policy);
  }
  rule.innerHTML='<b>SETKA ID · КОРЕНЬ</b><span>Канонический формат зависит от природы: SETKA-H-XXXX-XXXX — человек, SETKA-S-XXXX-XXXX — синтетик. Префикс H/S фиксируется при выпуске; роли, задачи и доступы могут меняться без смены ID.</span>';
  setLabel('identity018Name','Метка / имя (не SETKA ID)');
  if($('identity018Name'))$('identity018Name').placeholder='Например, тестировщик';
  setLabel('identity018Count','Сколько корневых ID создать');
  setLabel('identity018Nature','Природа ID · фиксируется при создании');
  setLabel('identity018Task','Задача поверх ID');
  setLabel('identity018Personality','Характер / поведенческая установка');
  accessLabel('identity018Front','FRONT','доступ к пользовательской поверхности');
  accessLabel('identity018Back','BACK / ADMIN','доступ к административной поверхности');
  const checks=modal.querySelector('.v017Checks');
  if(checks&&!$('identity018RolePreview')){
    const p=document.createElement('div');p.id='identity018RolePreview';p.className='identityRolePreview';checks.insertAdjacentElement('afterend',p);
  }
  policyText();rolePreview();decorateResults();fixDirectoryCopy();fixEditNature();
  if(!resultObserver&&$('identity018Result')){
    resultObserver=new MutationObserver(()=>decorateResults());
    resultObserver.observe($('identity018Result'),{childList:true});
  }
}

document.addEventListener('click',e=>{
  if(e.target.closest?.('#createIdentity018,#createSynthetic018'))setTimeout(enhance,0);
  if(e.target.closest?.('[data-edit-id]'))setTimeout(fixEditNature,0);
},true);
document.addEventListener('change',e=>{
  if(e.target?.id==='identity018Nature'||e.target?.id==='identity018Front'||e.target?.id==='identity018Back'){policyText();rolePreview()}
},true);
window.addEventListener('foundation:v018-directory',()=>setTimeout(()=>{fixDirectoryCopy();enhance();fixEditNature()},0));
setTimeout(()=>{enhance();fixDirectoryCopy();fixEditNature()},80);
window.FoundationAdminIdentityUXV018={version:VERSION,enhance,preview:rolePreview};
})();
