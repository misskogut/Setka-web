(()=>{
'use strict';
let active='all';
function q(id){return document.getElementById(id)}
function origin(item){
 const text=(item.querySelector('.pinItemComment')?.textContent||'').trim();
 const author=(item.querySelector('.pinAuthorBadge')?.textContent||'').trim();
 if(text.startsWith('👑✎'))return'president_protocolled';
 if(text.startsWith('❤️'))return'gpt_proactive';
 if(author==='PRESIDENT')return'president_direct';
 return'other';
}
function button(row,key,label){
 const b=document.createElement('button');
 b.className='pinOriginFilter018'+(active===key?' active':'');
 b.textContent=label;
 b.addEventListener('click',()=>{active=key;render()});
 row.appendChild(b);
}
function render(){
 const list=q('pinBoardList'),statusRow=q('pinFilters');
 if(!list||!statusRow)return;
 const items=[...list.querySelectorAll('.pinListItem[data-pin-open]')];
 const count={president_direct:0,president_protocolled:0,gpt_proactive:0};
 items.forEach(item=>{const k=origin(item);if(count[k]!==undefined)count[k]++;item.hidden=active!=='all'&&k!==active});
 let row=q('pinOriginFilters018');
 if(!row){row=document.createElement('div');row.id='pinOriginFilters018';row.className='pinOriginFilters018';statusRow.after(row)}
 row.replaceChildren();
 button(row,'all','Все источники');
 button(row,'president_direct',`👑 Президент · ${count.president_direct}`);
 button(row,'president_protocolled',`👑✎ Президент → GPT · ${count.president_protocolled}`);
 button(row,'gpt_proactive',`❤️ GPT · ${count.gpt_proactive}`);
}
function hook(){
 const list=q('pinBoardList');
 if(list&&!list.dataset.originFilterObserver){list.dataset.originFilterObserver='1';new MutationObserver(render).observe(list,{childList:true,subtree:true})}
 render();
}
setInterval(hook,700);setTimeout(hook,350);
})();