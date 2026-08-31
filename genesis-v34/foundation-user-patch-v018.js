(()=>{
'use strict';
const VERSION='0.1.8';
function patch(){
  const base=window.FoundationUser;
  if(base&&!base.__v018){
    const oldState=typeof base.state==='function'?base.state.bind(base):()=>({});
    window.FoundationUser={...base,version:VERSION,__v018:true,state:()=>({...oldState(),pairVersion:VERSION})};
    window.FoundationV018=window.FoundationUser;
  }
  document.body.dataset.foundationVersion='018';
  document.querySelectorAll('.version,.versionNote').forEach(el=>{
    const t=el.textContent||'';
    if(t.includes('0.1.6')||t.includes('0.1.7'))el.textContent=t.replaceAll('0.1.6',VERSION).replaceAll('0.1.7',VERSION);
  });
  return !!window.FoundationUser?.__v018;
}
let n=0;const timer=setInterval(()=>{patch();if(++n>80)clearInterval(timer)},100);
const mo=new MutationObserver(()=>patch());
mo.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();