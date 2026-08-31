(()=>{
'use strict';
const CONTROL='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-control';
const SESSION_KEY='setka:foundation:president:session';
const SURFACE=document.body.dataset.surface==='president'?'president':'user';
const frame=document.getElementById('appFrame');
const select=document.getElementById('versionSelect');
let byCode=new Map(),loadedVersion='',loading=false,lastPage='';
function token(){try{return localStorage.getItem(SESSION_KEY)||''}catch{return''}}
function page(){try{const c=window.FoundationContextV018?.current?.();if(c)return String(c);const d=frame?.contentDocument,w=frame?.contentWindow;if(SURFACE==='president')return d?.querySelector('.nav button.active')?.dataset?.page||'president';const s=w?.FoundationUser?.state?.();if(s?.currentPattern)return`pattern:${s.currentPattern}`;return'patterns'}catch{return SURFACE}}
async function load(force=false){const t=token(),v=select?.value||'';if(!t||!v)return;if(loading)return;if(!force&&v===loadedVersion&&byCode.size)return;loading=true;try{const r=await fetch(CONTROL,{method:'POST',headers:{'content-type':'application/json','x-setka-session':t},body:JSON.stringify({action:'pin_list',version:v,surface:SURFACE})}),d=await r.json().catch(()=>({}));if(!r.ok)return;byCode=new Map((d.pins||[]).map(p=>[p.pin_code,p]));loadedVersion=v;apply()}finally{loading=false}}
function belongs(pin,current){if(!pin)return false;const pk=String(pin.page_key||'').trim();if(!pk)return true;return pk===current}
function apply(){const current=page();document.querySelectorAll('.pinMarker[data-pin-code],.v016PinMarker[data-pin-code]').forEach(m=>{const p=byCode.get(m.dataset.pinCode);if(!p)return;m.hidden=!belongs(p,current);m.dataset.pinAddressVisible=m.hidden?'0':'1'});lastPage=current}
function pulse(){const p=page();if(p!==lastPage)apply();if((select?.value||'')!==loadedVersion)load(true);else apply()}
select?.addEventListener('change',()=>{loadedVersion='';byCode.clear();setTimeout(()=>load(true),120)});
frame?.addEventListener('load',()=>setTimeout(()=>{load(true);apply()},180));
window.addEventListener('storage',e=>{if(e.key==='setka:foundation:viewing:pulse')setTimeout(()=>{load(true);apply()},120)});
const obs=new MutationObserver(()=>apply());['pinsLayer','contextPinsLayer','shellPinsLayer'].forEach(id=>{const el=document.getElementById(id);if(el)obs.observe(el,{childList:true,subtree:true})});
setInterval(pulse,250);
setTimeout(()=>load(true),250);
window.FoundationPinAddressV018={version:'0.1.8',currentPage:page,refresh:()=>load(true),apply};
})();
