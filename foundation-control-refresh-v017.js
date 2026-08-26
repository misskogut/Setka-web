(()=>{
'use strict';
const VIEW_MODE='setka:foundation:viewing:mode';
const VIEW_AT='setka:foundation:viewing:at';
const btn=document.getElementById('refreshVersions');if(!btn)return;
function refreshToWorking(){btn.disabled=true;btn.textContent='↻ …';try{localStorage.setItem(VIEW_MODE,'working');localStorage.setItem(VIEW_AT,'0')}catch{}const u=new URL(location.href);u.searchParams.delete('view');u.searchParams.set('_refresh',String(Date.now()));location.replace(u.toString())}
btn.addEventListener('click',refreshToWorking);window.FoundationRefreshV017={version:'0.1.7',refreshToWorking};
})();