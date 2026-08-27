(()=>{
'use strict';
const q=id=>document.getElementById(id);
function mobile(){return matchMedia('(max-width:700px)').matches}
function setCollapsed(v){
 const board=q('pinBoard');
 const btn=q('pinBoardMinimize018');
 if(!board)return;
 board.classList.toggle('pinBoardCollapsed018',!!v);
 if(btn){btn.textContent=v?'☷':'−';btn.title=v?'Развернуть список пинов':'Свернуть список пинов'}
}
function install(){
 const board=q('pinBoard');
 const head=board?.querySelector('.pinBoardHead');
 if(!board||!head)return;
 let btn=q('pinBoardMinimize018');
 if(!btn){
  btn=document.createElement('button');
  btn.id='pinBoardMinimize018';
  btn.className='pinBoardMinimize018';
  btn.type='button';
  btn.textContent='−';
  btn.title='Свернуть список пинов';
  const close=q('pinBoardClose');
  head.insertBefore(btn,close||null);
  btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setCollapsed(!board.classList.contains('pinBoardCollapsed018'))});
  head.addEventListener('dblclick',e=>{if(!mobile())return;e.preventDefault();setCollapsed(!board.classList.contains('pinBoardCollapsed018'))});
 }
 const tool=q('pinListTool');
 if(tool&&!tool.dataset.mobileBoardHook){
  tool.dataset.mobileBoardHook='1';
  tool.addEventListener('click',()=>{if(!board.classList.contains('open'))setCollapsed(false)},true);
 }
}
addEventListener('resize',()=>{if(!mobile())setCollapsed(false)});
setInterval(install,500);setTimeout(install,200);
window.FoundationPinBoardMobileV018={collapse:()=>setCollapsed(true),expand:()=>setCollapsed(false)};
})();