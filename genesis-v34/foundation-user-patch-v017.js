(()=>{
'use strict';
function patch(){
  const base=window.FoundationUser;if(!base||base.__v017)return false;
  const oldState=typeof base.state==='function'?base.state.bind(base):()=>({});
  window.FoundationUser={...base,version:'0.1.7',__v017:true,state:()=>({...oldState(),pairVersion:'0.1.7'})};
  window.FoundationV017=window.FoundationUser;
  document.querySelectorAll('.version').forEach(el=>{if(/0\.1\.6/.test(el.textContent||''))el.textContent=(el.textContent||'').replaceAll('0.1.6','0.1.7')});
  return true;
}
let n=0;const t=setInterval(()=>{if(patch()||++n>20)clearInterval(t)},100);
})();