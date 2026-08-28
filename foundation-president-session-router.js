(()=>{
'use strict';
const ACTIVE='setka:foundation:president:session';
const MAP='setka:foundation:president:sessions-by-version';
function readMap(){try{return JSON.parse(localStorage.getItem(MAP)||'{}')}catch{return{}}}
function versionFromSrc(src){try{const u=new URL(src,location.href);const p=u.pathname.split('/').pop()||'';const m=p.match(/foundation-admin-v(\d{3})\.html$/);if(m){const s=m[1];return `0.${Number(s[1])}.${Number(s[2])}`}if(p==='foundation-admin-v01.html')return'0.1.0';return''}catch{return''}}
function primeFor(src){const v=versionFromSrc(src);if(!v)return;const map=readMap();const file=new URL(src,location.href).pathname.split('/').pop();const token=map[v]||map.__byPath?.[file];if(!token)return;try{localStorage.setItem(ACTIVE,token);localStorage.setItem('setka:foundation:president:active-version',v)}catch{}}
function attach(){const frame=document.getElementById('appFrame');if(!frame)return false;primeFor(frame.getAttribute('src')||'');new MutationObserver(ms=>{for(const m of ms)if(m.type==='attributes'&&m.attributeName==='src')primeFor(frame.getAttribute('src')||'')}).observe(frame,{attributes:true,attributeFilter:['src']});return true}
if(!attach()){const rootObserver=new MutationObserver(()=>{if(attach())rootObserver.disconnect()});rootObserver.observe(document.documentElement,{childList:true,subtree:true})}
})();