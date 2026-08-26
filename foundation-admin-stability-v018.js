(()=>{
'use strict';
const VERSION='0.1.8';
let queued=false,fixing=false;
const qa=s=>[...document.querySelectorAll(s)];
function fix(){
  if(fixing)return;fixing=true;
  try{
    if(document.body.dataset.foundationVersion!=='018')document.body.dataset.foundationVersion='018';
    qa('.version,.topTitle,.root span').forEach(el=>{
      const t=el.textContent||'';
      const n=t.replaceAll('0.1.6',VERSION).replaceAll('0.1.7',VERSION);
      if(n!==t)el.textContent=n;
    });
    const rootPair=document.querySelector('.root span');
    if(rootPair&&rootPair.textContent!==`ПАРА · ${VERSION}`)rootPair.textContent=`ПАРА · ${VERSION}`;
    const protocol=document.getElementById('page-protocol');
    if(protocol){
      qa('.versionCard').forEach(card=>card.classList.toggle('viewingVersion',card.dataset.version===VERSION));
      qa('.versionCard .badge.viewing').forEach(x=>x.remove());
      const current=protocol.querySelector(`.versionCard[data-version="${VERSION}"]`);
      const badges=current?.querySelector('.versionBadges');
      if(badges&&!badges.querySelector('.badge.viewing'))badges.insertAdjacentHTML('afterbegin','<span class="badge viewing">● СМОТРИМ</span>');
    }
  }finally{fixing=false;queued=false}
}
function schedule(){if(queued||fixing)return;queued=true;queueMicrotask(fix)}
const observer=new MutationObserver(schedule);
observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','data-foundation-version']});
fix();
window.FoundationAdminStabilityV018={version:VERSION,fix};
})();