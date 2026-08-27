(()=>{
'use strict';
const CONTROL='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-control';
const SESSION_KEY='setka:foundation:president:session';
const page=document.getElementById('page-transcript');
if(!page)return;
const state={events:[],hasMore:false,loading:false,filter:'all',loaded:false,timer:null};
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
function token(){try{return localStorage.getItem(SESSION_KEY)||''}catch{return''}}
async function call(payload){const t=token();if(!t)throw new Error('Нужна Президентская сессия');const r=await fetch(CONTROL,{method:'POST',headers:{'content-type':'application/json','x-setka-session':t},body:JSON.stringify(payload)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||d.error||'Не удалось загрузить стенограмму');return d}
function time(v){if(!v)return'—';try{return new Date(v).toLocaleString('ru-RU',{timeZone:'Europe/Saratov',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})+' · Саратов'}catch{return String(v)}}
function actor(e){const name=e.actorDisplayName||'';const id=e.actorSetkaId||'';if(name&&id)return `${name} · ${id}`;return name||id||e.actorKind||'Система'}
function surfaceClass(v){const x=String(v||'').toLowerCase();if(x==='front')return'front';if(x==='back')return'back';if(x==='pin')return'pin';if(x==='карандаш')return'trace';if(x==='синтетик')return'synthetic';if(x==='приоритет')return'priority';return'system'}
function filterKey(e){const s=String(e.surface||'').toUpperCase();if(s==='FRONT')return'front';if(s==='BACK')return'back';if(s==='PIN')return'pin';if(s==='КАРАНДАШ')return'trace';if(s==='СИНТЕТИК')return'synthetic';if(s==='ПРИОРИТЕТ')return'priority';if(String(e.actorKind||'').toLowerCase()==='president'||String(e.actorSetkaId||'').includes('PRESIDENT'))return'president';return'system'}
function filters(){return [
 {k:'all',t:'Все события'},
 {k:'president',t:'Президент'},
 {k:'front',t:'Front'},
 {k:'back',t:'Back'},
 {k:'pin',t:'PIN'},
 {k:'trace',t:'Карандаши'},
 {k:'synthetic',t:'Синтетики'},
 {k:'priority',t:'Приоритеты'},
 {k:'system',t:'Система'}
]}
function detailHtml(e){const parts=[];if(e.entityType||e.entityRef)parts.push(`<span><b>Сущность:</b> ${esc(e.entityType||'—')}${e.entityRef?` · ${esc(e.entityRef)}`:''}</span>`);if(e.version)parts.push(`<span><b>Версия:</b> ${esc(e.version)}</span>`);if(e.actorIdentityId)parts.push(`<span><b>Автор/исполнитель:</b> ${esc(actor(e))}</span>`);parts.push(`<span><b>Записано:</b> ${esc(time(e.recordedAt))}</span>`);return parts.join('')}
function render(){
 const visible=state.filter==='all'?state.events:state.events.filter(e=>filterKey(e)===state.filter);
 const filterHtml=filters().map(f=>`<button class="transcriptFilter018 ${state.filter===f.k?'active':''}" data-transcript-filter="${f.k}">${esc(f.t)}</button>`).join('');
 const rows=visible.map(e=>`<article class="transcriptEvent018" data-transcript-id="${esc(e.id)}">
   <div class="transcriptRail018"><span class="transcriptDot018 ${surfaceClass(e.surface)}"></span><span class="transcriptLine018"></span></div>
   <div class="transcriptBody018">
     <div class="transcriptTop018"><time>${esc(time(e.occurredAt))}</time><span class="transcriptSurface018 ${surfaceClass(e.surface)}">${esc(e.surface||'СИСТЕМА')}</span></div>
     <div class="transcriptLabel018">${esc(e.eventLabel||'Системное событие')}</div>
     <div class="transcriptSummary018">${esc(e.summary||e.eventLabel||'Событие записано')}</div>
     <div class="transcriptActor018">${esc(actor(e))}</div>
     <details class="transcriptDetails018"><summary>Связи события</summary><div>${detailHtml(e)}</div></details>
   </div>
 </article>`).join('');
 page.innerHTML=`<div class="sectionHead"><div><div class="title">Стенограмма</div><div class="sub">Единая системная хронология. Только подтверждённые события сущностей и системы; тапы, свайпы и скроллы сюда не входят.</div></div><button id="transcriptRefresh018" class="protocolRefresh">Обновить</button></div>
 <div class="transcriptLaw018"><b>Правило времени:</b> прошлое не переписывается. Любое решение, изменение или вычислительный переход создаёт новое событие со своим фактическим временем.</div>
 <div class="transcriptFilters018">${filterHtml}</div>
 <div class="transcriptMeta018"><span>${state.events.length} событий загружено</span><span>порядок: от прошлого → к настоящему</span></div>
 ${state.hasMore?'<button id="transcriptOlder018" class="transcriptOlder018">↑ Загрузить более ранние события</button>':''}
 <div class="transcriptTimeline018">${rows||'<div class="emptyProtocol">В этой выборке событий пока нет.</div>'}</div>`;
 page.querySelectorAll('[data-transcript-filter]').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.transcriptFilter;render()}));
 document.getElementById('transcriptRefresh018')?.addEventListener('click',()=>load(true));
 document.getElementById('transcriptOlder018')?.addEventListener('click',loadOlder);
}
function merge(list,prepend=false){const map=new Map(state.events.map(e=>[e.id,e]));for(const e of list)map.set(e.id,e);state.events=[...map.values()].sort((a,b)=>new Date(a.occurredAt)-new Date(b.occurredAt)||(String(a.id).localeCompare(String(b.id))));}
async function load(force=false){if(state.loading)return;if(state.loaded&&!force){render();return}state.loading=true;if(!state.loaded)page.innerHTML='<div class="emptyProtocol">Загружаю стенограмму…</div>';try{const d=await call({action:'transcript_list',limit:300});state.events=Array.isArray(d.events)?d.events:[];state.hasMore=Boolean(d.hasMore);state.loaded=true;render();requestAnimationFrame(()=>{const main=document.querySelector('.main');if(main)main.scrollTop=main.scrollHeight})}catch(e){page.innerHTML=`<div class="emptyProtocol">Не удалось загрузить стенограмму: ${esc(e.message)}</div>`}finally{state.loading=false}}
async function loadOlder(){if(state.loading||!state.events.length)return;state.loading=true;try{const before=state.events[0].occurredAt;const d=await call({action:'transcript_list',limit:300,before});merge(Array.isArray(d.events)?d.events:[],true);state.hasMore=Boolean(d.hasMore);render()}catch(e){alert('Не удалось загрузить ранние события: '+e.message)}finally{state.loading=false}}
function active(){return document.querySelector('.nav button[data-page="transcript"]')?.classList.contains('active')&&!page.classList.contains('hidden')}
document.querySelector('.nav button[data-page="transcript"]')?.addEventListener('click',()=>setTimeout(()=>load(false),20));
document.getElementById('refresh')?.addEventListener('click',()=>{if(active())setTimeout(()=>load(true),120)});
state.timer=setInterval(()=>{if(active()&&token())load(true)},15000);
window.FoundationSystemTranscriptV018={version:'0.1.8',refresh:()=>load(true),events:()=>state.events.slice()};
})();