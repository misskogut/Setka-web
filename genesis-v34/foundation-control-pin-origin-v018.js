(()=>{
'use strict';
const $=id=>document.getElementById(id);
function originFromItem(item){
 const text=(item.querySelector('.pinItemComment')?.textContent||'').trim();
 const author=(item.querySelector('.pinAuthorBadge')?.textContent||'').trim();
 if(text.startsWith('👑✎'))return{key:'president_protocolled',mark:'👑✎',label:'Президент → GPT'};
 if(text.startsWith('❤️'))return{key:'gpt_proactive',mark:'❤️',label:'GPT проактивно'};
 if(author==='PRESIDENT')return{key:'president_direct',mark:'👑',label:'Президент'};
 return{key:'other',mark:'•',label:'Другое'};
}
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
function decorate(){
 const board=$('pinBoard'); if(!board)return;
 const items=[...board.querySelectorAll('.pinListItem[data-pin-open]')];
 const counts={president_direct:0,president_protocolled:0,gpt_proactive:0,other:0};
 items.forEach(item=>{
  const o=originFromItem(item); counts[o.key]++;
  item.dataset.pinOrigin=o.key;
  let badge=item.querySelector('.pinOriginBadge018');
  if(!badge){badge=document.createElement('span');badge.className='pinOriginBadge018';item.querySelector('.pinItemCode')?.before(badge)}
  setText(badge,`${o.mark} ${o.label}`);
 });
 let summary=$('pinOriginSummary018');
 if(!summary){summary=document.createElement('div');summary.id='pinOriginSummary018';summary.className='pinOriginSummary018';$('pinBoardMeta')?.after(summary)}
 setText(summary,`👑 ${counts.president_direct} · 👑✎ ${counts.president_protocolled} · ❤️ ${counts.gpt_proactive}`);
}
function hook(){
 const list=$('pinBoardList');
 if(list&&!list.dataset.originObserver){list.dataset.originObserver='1';new MutationObserver(()=>decorate()).observe(list,{childList:true,subtree:true})}
 const tool=$('pinListTool');
 if(tool&&!tool.dataset.originClick){tool.dataset.originClick='1';tool.addEventListener('click',()=>setTimeout(decorate,180))}
 decorate();
}
setInterval(hook,500);setTimeout(hook,300);
window.FoundationPinOriginV018={decorate};
})();