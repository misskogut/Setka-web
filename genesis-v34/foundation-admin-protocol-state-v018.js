(()=>{
'use strict';
// 0.1.8 owns the live VERSION VIEW state. Older renderer may draw the
// protocol cards, but it is not allowed to decide which version is VIEWING.
const VERSION='0.1.8';
const page=document.getElementById('page-protocol');
if(!page)return;
let scheduled=false;

function shellViewingVersion(){
  try{
    if(window.parent!==window){
      const select=window.parent.document.getElementById('versionSelect');
      if(select?.value)return String(select.value);
    }
  }catch{}
  return VERSION;
}

function makeViewingBadge(){
  const b=document.createElement('span');
  b.className='badge viewing';
  b.textContent='● СМОТРИМ';
  b.dataset.v018Viewing='1';
  return b;
}

function sync(){
  scheduled=false;
  const viewing=shellViewingVersion();
  const cards=[...page.querySelectorAll('.versionCard[data-version]')];
  if(!cards.length)return;
  for(const card of cards){
    const active=String(card.dataset.version||'')===viewing;
    card.classList.toggle('viewingVersion',active);
    card.setAttribute('aria-current',active?'true':'false');
    const badges=card.querySelector('.versionBadges');
    if(!badges)continue;
    const viewingBadges=[...badges.querySelectorAll('.badge.viewing')];
    if(active){
      if(!viewingBadges.length)badges.insertBefore(makeViewingBadge(),badges.firstChild||null);
      else{
        viewingBadges[0].textContent='● СМОТРИМ';
        for(let i=1;i<viewingBadges.length;i++)viewingBadges[i].remove();
      }
    }else{
      viewingBadges.forEach(b=>b.remove());
    }
  }
}
function queue(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(sync);
}

// Observe only child replacement inside Protocol. Attribute/class changes made
// by this file do not retrigger the observer, avoiding a repaint loop.
const observer=new MutationObserver(m=>{
  if(m.some(x=>x.type==='childList'))queue();
});
observer.observe(page,{childList:true,subtree:true});

document.addEventListener('click',e=>{
  if(e.target.closest?.('.nav button[data-page="protocol"],#protocolRefresh'))setTimeout(queue,40);
},true);
window.addEventListener('message',queue);
setTimeout(queue,80);
window.FoundationAdminProtocolStateV018={version:VERSION,sync:queue,viewing:shellViewingVersion};
})();
