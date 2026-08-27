(()=>{
'use strict';
const CONTROL='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-control';
const SESSION_KEY='setka:foundation:president:session';
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
let lastCode='',loading=false;
function token(){try{return localStorage.getItem(SESSION_KEY)||''}catch{return''}}
function code(){return String(document.getElementById('pinReadCode')?.textContent||'').match(/PIN-[A-Z0-9]+/)?.[0]||''}
async function call(pinCode){const t=token();if(!t)throw new Error('Нужна Президентская сессия');const r=await fetch(CONTROL,{method:'POST',headers:{'content-type':'application/json','x-setka-session':t},body:JSON.stringify({action:'pin_thread',pinCode})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||d.error||'Не удалось загрузить смысловой паспорт');return d}
function ensure(){let box=document.getElementById('pinSemanticBrief018');if(box)return box;const anchor=document.getElementById('pinReadComment');if(!anchor)return null;box=document.createElement('section');box.id='pinSemanticBrief018';box.className='pinSemanticBrief018';anchor.after(box);return box}
function implications(v){const a=Array.isArray(v)?v:[];return a.length?`<div class="pinSemanticImplications018">${a.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:'<div class="pinSemanticEmpty018">Следствия пока не формализованы.</div>'}
function renderBrief(b,count){const when=b.createdAt?new Date(b.createdAt).toLocaleString('ru-RU',{timeZone:'Europe/Saratov',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';return `<div class="pinSemanticHead018"><div><b>Смысловой паспорт</b><small>${count>1?`версия ${count} · `:''}${esc(when)} · append-only</small></div><span>👑✎</span></div><div class="pinSemanticSummary018">${esc(b.summary||'')}</div><details open><summary>👑 Идея Президента</summary><div>${esc(b.presidentIdea||'—')}</div></details><details><summary>✎ Системная интерпретация GPT</summary><div>${esc(b.assistantInterpretation||'—')}</div></details><details><summary>Следствия для системы</summary>${implications(b.implications)}</details>`}
function render(data){const box=ensure();if(!box)return;const briefs=Array.isArray(data.semanticBriefs)?data.semanticBriefs:[];if(!briefs.length){box.innerHTML='';box.classList.remove('show');return}const b=briefs[briefs.length-1];box.innerHTML=renderBrief(b,briefs.length);box.classList.add('show')}
async function load(force=false){const c=code();const modal=document.getElementById('pinReadModal');if(!c||!modal?.classList.contains('open')||loading)return;if(!force&&c===lastCode&&document.getElementById('pinSemanticBrief018')?.classList.contains('show'))return;loading=true;try{render(await call(c));lastCode=c}catch(e){const box=ensure();if(box){box.innerHTML=`<div class="pinSemanticEmpty018">${esc(e.message)}</div>`;box.classList.add('show')}}finally{loading=false}}
const observer=new MutationObserver(()=>{const modal=document.getElementById('pinReadModal');if(modal?.classList.contains('open'))setTimeout(()=>load(true),40);else{lastCode='';document.getElementById('pinSemanticBrief018')?.classList.remove('show')}});
setTimeout(()=>{const modal=document.getElementById('pinReadModal');if(modal)observer.observe(modal,{attributes:true,attributeFilter:['class']});},250);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-pin-open],.pinMarker'))setTimeout(()=>load(true),350)},true);
window.FoundationPinSemanticV018={reload:()=>load(true)};
})();