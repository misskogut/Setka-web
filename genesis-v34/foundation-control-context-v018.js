(()=>{
'use strict';
const SURFACE=document.body.dataset.surface==='president'?'president':'user';
const PAGE_KEY=`setka:foundation:viewing:context:${SURFACE}`;
const SESSION_KEY='setka:foundation:president:session';
const API='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-v018';
const CONTROL='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-control';
const frame=document.getElementById('appFrame'),select=document.getElementById('versionSelect'),status=document.getElementById('statusText');
let restoring=true,lastContext='',pinKinds=new Map();
function getStored(){try{return localStorage.getItem(PAGE_KEY)||''}catch{return''}}
function store(v){if(!v)return;lastContext=v;try{localStorage.setItem(PAGE_KEY,v)}catch{}}
function current(){try{const d=frame.contentDocument,w=frame.contentWindow;if(SURFACE==='president'){const b=d.querySelector('.nav button.active');return b?.dataset?.page||''}const s=w.FoundationUser?.state?.();if(s?.currentPattern)return`pattern:${s.currentPattern}`;return'patterns'}catch{return''}}
function capture(){if(restoring)return;const c=current();if(c)store(c)}
function note(t){if(!status)return;status.dataset.contextNotice=t||'';if(t)status.textContent=t}
function restorePresident(context,attempt=0){try{const d=frame.contentDocument;if(!d||!d.body)return retry();const key=context||'users',b=d.querySelector(`.nav button[data-page="${CSS.escape(key)}"]`);if(b){if(!b.classList.contains('active'))b.click();store(key);note('');return done()}if(attempt<24)return setTimeout(()=>restorePresident(context,attempt+1),100);const fallback=d.querySelector('.nav button.active')?.dataset?.page||'users';store(fallback);note(`В ${select?.value||'этой версии'} вкладки «${key}» ещё нет · открыт ${fallback}`);done()}catch{retry()}
 function retry(){if(attempt<24)setTimeout(()=>restorePresident(context,attempt+1),100);else done()}
}
function restoreUser(context,attempt=0){try{const d=frame.contentDocument;if(!d||!d.body)return retry();if(context?.startsWith('pattern:')){const id=context.slice(8),card=d.querySelector(`[data-pattern-id="${CSS.escape(id)}"]`);if(card){card.click();store(context);note('');return done()}if(attempt<28)return setTimeout(()=>restoreUser(context,attempt+1),120);store('patterns');note(`Паттерна «${id}» в ${select?.value||'этой версии'} нет · открыта библиотека`);return done()}store('patterns');note('');done()}catch{retry()}
 function retry(){if(attempt<28)setTimeout(()=>restoreUser(context,attempt+1),120);else done()}
}
function done(){restoring=false;setTimeout(capture,160);setTimeout(recolorPins,200)}
function restore(){restoring=true;const c=getStored()||(SURFACE==='president'?'users':'patterns');if(SURFACE==='president')restorePresident(c);else restoreUser(c)}
function attachFrame(){try{const w=frame.contentWindow,d=frame.contentDocument;w.addEventListener('pagehide',capture,{once:true});d.addEventListener('click',()=>setTimeout(capture,80),true);d.addEventListener('scroll',()=>setTimeout(capture,30),true)}catch{}restore()}
function token(){try{return localStorage.getItem(SESSION_KEY)||''}catch{return''}}
async function fetchPinKinds(){const t=token(),v=select?.value;if(!t||!v)return;try{const r=await fetch(CONTROL,{method:'POST',headers:{'content-type':'application/json','x-setka-session':t},body:JSON.stringify({action:'pin_list',version:v,surface:SURFACE})}),d=await r.json();if(!r.ok)return;pinKinds=new Map((d.pins||[]).map(p=>[p.pin_code,p.authorKind||'president']));recolorPins()}catch{}}
function recolorPins(){document.querySelectorAll('.v016PinMarker[data-pin-code]').forEach(m=>m.classList.toggle('syntheticAuthor',pinKinds.get(m.dataset.pinCode)!=='president'&&!!pinKinds.get(m.dataset.pinCode)))}
async function applyActorMode(){if(SURFACE!=='president'||!token())return;try{const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json','x-setka-session':token()},body:JSON.stringify({action:'admin_identity_snapshot'})}),d=await r.json();const mode=d?.directory?.actor?.mode;if(r.ok&&mode&&mode!=='president'){const rec=document.getElementById('recordTool');if(rec){rec.disabled=true;rec.title='TRACE-дорожка доступна только Президенту'}}}catch{}}
['prevVersion','nextVersion','versionSelect','followWorking','refreshVersions'].forEach(id=>document.getElementById(id)?.addEventListener(id==='versionSelect'?'change':'pointerdown',capture,true));
window.addEventListener('message',e=>{if(e.origin!==location.origin)return;if(e.data?.type==='foundation:page-changed'&&SURFACE==='president')store(String(e.data.page||''));if(e.data?.type==='foundation:view-version')capture()});
frame?.addEventListener('load',attachFrame);
const observer=new MutationObserver(()=>recolorPins());['contextPinsLayer','shellPinsLayer'].forEach(id=>{const el=document.getElementById(id);if(el)observer.observe(el,{childList:true})});
select?.addEventListener('change',()=>setTimeout(fetchPinKinds,200));window.addEventListener('storage',e=>{if(e.key==='setka:foundation:viewing:pulse')setTimeout(()=>{restore();fetchPinKinds()},180)});
setInterval(()=>{capture();recolorPins()},700);setTimeout(()=>{fetchPinKinds();applyActorMode()},350);setTimeout(()=>{if(restoring&&frame?.contentDocument?.readyState==='complete')restore()},1200);
window.FoundationContextV018={version:'0.1.8',current,restore,capture,key:PAGE_KEY};
})();