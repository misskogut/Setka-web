(()=>{
'use strict';
const VERSION='0.1.8';
let reloading=false;
const $=id=>document.getElementById(id);
const qa=s=>[...document.querySelectorAll(s)];
function patchText(){
  document.body.dataset.foundationVersion='018';
  qa('.version,.topTitle,.root span').forEach(el=>{
    const t=el.textContent||'';
    if(t.includes('0.1.6')||t.includes('0.1.7'))el.textContent=t.replaceAll('0.1.6',VERSION).replaceAll('0.1.7',VERSION);
  });
  const nav=document.querySelector('.nav button[data-page="users"]');if(nav)nav.textContent='ID';
}
function fixProtocol(){
  const page=$('page-protocol');if(!page)return;
  qa('.versionCard').forEach(c=>c.classList.remove('viewingVersion'));
  qa('.versionCard .badge.viewing').forEach(x=>x.remove());
  const current=page.querySelector(`.versionCard[data-version="${VERSION}"]`);
  if(current){current.classList.add('viewingVersion');const badges=current.querySelector('.versionBadges');if(badges&&!badges.querySelector('.badge.viewing'))badges.insertAdjacentHTML('afterbegin','<span class="badge viewing">● СМОТРИМ</span>')}
}
function ensureCarryForward(){
  const hasSession=(()=>{try{return !!localStorage.getItem('setka:foundation:president:session')}catch{return false}})();
  const legacy=$('createUser');
  const ready=$('createIdentity017');
  if(hasSession&&legacy&&!ready&&!reloading&&window.FoundationAdminPatchV017?.reload){
    reloading=true;Promise.resolve(window.FoundationAdminPatchV017.reload()).finally(()=>{reloading=false});
  }
}
function patch(){patchText();fixProtocol();ensureCarryForward()}
document.addEventListener('click',e=>{
  const b=e.target.closest?.('.openLegacySynthetic017');
  if(b){e.preventDefault();e.stopImmediatePropagation();window.open(`foundation.html?view=${encodeURIComponent(VERSION)}&synthetic=${encodeURIComponent(b.dataset.persona||'')}`,'_blank')}
  if(e.target.closest?.('.nav button,#refresh'))setTimeout(patch,120);
},true);
const mo=new MutationObserver(()=>patch());
mo.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
let tries=0;const timer=setInterval(()=>{patch();if(window.FoundationAdminPatchV017?.reload&&++tries===1)window.FoundationAdminPatchV017.reload();if(tries>120)clearInterval(timer)},250);
setTimeout(patch,50);
window.FoundationAdminPatchV018={version:VERSION,refresh:()=>{window.FoundationAdminPatchV017?.reload?.();patch()}};
})();