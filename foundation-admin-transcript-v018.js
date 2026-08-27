(()=>{
'use strict';
const TRANSCRIPT='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-transcript';
const SESSION_KEY='setka:foundation:president:session';
const page=document.getElementById('page-transcript');
if(!page)return;
const state={events:[],hasMore:false,loading:false,filter:'all',loaded:false,timer:null,query:'',searchMode:false,searchTotal:0};
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
function token(){try{return localStorage.getItem(SESSION_KEY)||''}catch{return''}}
async function call(payload){const t=token();if(!t)throw new Error('Нужна Президентская сессия');const r=await fetch(TRANSCRIPT,{method:'POST',headers:{'content-type':'application/json','x-setka-session':t},body:JSON.stringify(payload)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||d.error||'Не удалось загрузить стенограмму');return d}
function time(v){if(!v)return'—';try{return new Date(v).toLocaleString('ru-RU',{timeZone:'Europe/Saratov',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',fractionalSecondDigits:3})+' · Саратов'}catch{try{return new Date(v).toLocaleString('ru-RU',{timeZone:'Europe/Saratov',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})+' · Саратов'}catch{return String(v)}}}
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
function detailHtml(e){const parts=[];parts.push(`<span><b>№ записи:</b> ${esc(e.eventNo??'—')}</span>`);if(e.entityType||e.entityRef)parts.push(`<span><b>Сущность:</b> ${esc(e.entityType||'—')}${e.entityRef?` · ${esc(e.entityRef)}`:''}</span>`);if(e.version)parts.push(`<span><b>Версия:</b> ${esc(e.version)}</span>`);if(e.actorIdentityId||e.actorSetkaId)parts.push(`<span><b>Автор/исполнитель:</b> ${esc(actor(e))}</span>`);parts.push(`<span><b>Время события:</b> ${esc(time(e.occurredAt))}</span>`);parts.push(`<span><b>Записано в стенограмму:</b> ${esc(time(e.recordedAt))}</span>`);return parts.join('')}
function searchHtml(){return `<form id="transcriptSearchForm018" class="transcriptSearch018">
 <input id="transcriptSearchInput018" type="search" autocomplete="off" spellcheck="false" value="${esc(state.query)}" placeholder="№ события, PIN, TRACE, SETKA ID, роль, версия…" aria-label="Поиск по всей Стенограмме">
 <button type="submit" class="protocolRefresh">⌕ Найти</button>
 ${state.searchMode?'<button id="transcriptSearchClear018" type="button" class="protocolRefresh transcriptSearchClear018">Сбросить</button>':''}
 </form>`}
function render(){
 const visible=state.filter==='all'?state.events:state.events.filter(e=>filterKey(e)===state.filter);
 const filterHtml=filters().map(f=>`<button class="transcriptFilter018 ${state.filter===f.k?'active':''}" data-transcript-filter="${f.k}">${esc(f.t)}</button>`).join('');
 const rows=visible.map(e=>`<article class="transcriptEvent018" data-transcript-id="${esc(e.id)}" data-event-no="${esc(e.eventNo)}">
   <div class="transcriptRail018"><span class="transcriptDot018 ${surfaceClass(e.surface)}"></span><span class="transcriptLine018"></span></div>
   <div class="transcriptBody018">
     <div class="transcriptTop018"><span class="transcriptNo018">№ ${esc(e.eventNo??'—')}</span><time>${esc(time(e.occurredAt))}</time><span class="transcriptSurface018 ${surfaceClass(e.surface)}">${esc(e.surface||'СИСТЕМА')}</span></div>
     <div class="transcriptLabel018">${esc(e.eventLabel||'Системное событие')}</div>
     <div class="transcriptSummary018">${esc(e.summary||e.eventLabel||'Событие записано')}</div>
     <div class="transcriptActor018">${esc(actor(e))}</div>
     <details class="transcriptDetails018"><summary>Связи события</summary><div>${detailHtml(e)}</div></details>
   </div>
 </article>`).join('');
 const first=state.events[0]?.eventNo??'—',last=state.events.at(-1)?.eventNo??'—';
 const meta=state.searchMode
   ? `Найдено ${state.searchTotal} · показано ${state.events.length} · запрос: «${esc(state.query)}»`
   : `${state.events.length} событий загружено · № ${esc(first)}–${esc(last)}`;
 page.innerHTML=`<div class="sectionHead"><div><div class="title">Стенограмма</div><div class="sub">Единая системная хронология. Только подтверждённые события сущностей и системы; тапы, свайпы и скроллы сюда не входят.</div></div><button id="transcriptRefresh018" class="protocolRefresh">Обновить</button></div>
 <div class="transcriptLaw018"><b>Два корня порядка:</b> № записи задаёт неизменяемую последовательность стенограммы; время показывает, когда событие фактически произошло. Номера никогда не пересчитываются.</div>
 ${searchHtml()}
 <div class="transcriptFilters018">${filterHtml}</div>
 <div class="transcriptMeta018"><span>${meta}</span><span>${state.searchMode?'поиск по всей истории':'порядок: по № записи'}</span></div>
 ${!state.searchMode&&state.hasMore?'<button id="transcriptOlder018" class="transcriptOlder018">↑ Загрузить более ранние номера</button>':''}
 <div class="transcriptTimeline018">${rows||'<div class="emptyProtocol">В этой выборке событий пока нет.</div>'}</div>`;
 page.querySelectorAll('[data-transcript-filter]').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.transcriptFilter;render()}));
 document.getElementById('transcriptRefresh018')?.addEventListener('click',()=>state.searchMode?search(state.query):load(true));
 document.getElementById('transcriptOlder018')?.addEventListener('click',loadOlder);
 document.getElementById('transcriptSearchForm018')?.addEventListener('submit',e=>{e.preventDefault();const q=document.getElementById('transcriptSearchInput018')?.value||'';search(q)});
 document.getElementById('transcriptSearchClear018')?.addEventListener('click',clearSearch);
}
function merge(list){const map=new Map(state.events.map(e=>[e.id,e]));for(const e of list)map.set(e.id,e);state.events=[...map.values()].sort((a,b)=>Number(a.eventNo||0)-Number(b.eventNo||0));}
async function search(raw){const q=String(raw||'').trim();if(!q){clearSearch();return}if(state.loading)return;state.loading=true;state.query=q;try{const d=await call({query:q,limit:300});state.events=Array.isArray(d.events)?d.events:[];state.events.sort((a,b)=>Number(a.eventNo||0)-Number(b.eventNo||0));state.searchTotal=Number(d.total||state.events.length);state.searchMode=true;state.hasMore=false;state.loaded=true;render();requestAnimationFrame(()=>{const main=document.querySelector('.main');if(main)main.scrollTop=0})}catch(e){alert('Не удалось найти событие: '+e.message)}finally{state.loading=false}}
function clearSearch(){state.query='';state.searchMode=false;state.searchTotal=0;state.filter='all';state.loaded=false;state.events=[];state.hasMore=false;load(true)}
async function load(force=false){if(state.loading)return;if(state.searchMode){if(force)return search(state.query);render();return}if(state.loaded&&!force){render();return}state.loading=true;if(!state.loaded)page.innerHTML='<div class="emptyProtocol">Загружаю стенограмму…</div>';try{const d=await call({limit:300});state.events=Array.isArray(d.events)?d.events:[];state.events.sort((a,b)=>Number(a.eventNo||0)-Number(b.eventNo||0));state.hasMore=Boolean(d.hasMore);state.loaded=true;render();requestAnimationFrame(()=>{const main=document.querySelector('.main');if(main)main.scrollTop=main.scrollHeight})}catch(e){page.innerHTML=`<div class="emptyProtocol">Не удалось загрузить стенограмму: ${esc(e.message)}</div>`}finally{state.loading=false}}
async function loadOlder(){if(state.loading||state.searchMode||!state.events.length)return;state.loading=true;try{const beforeNo=Number(state.events[0].eventNo||0);const d=await call({limit:300,beforeNo});merge(Array.isArray(d.events)?d.events:[]);state.hasMore=Boolean(d.hasMore);render()}catch(e){alert('Не удалось загрузить ранние события: '+e.message)}finally{state.loading=false}}
function active(){return document.querySelector('.nav button[data-page="transcript"]')?.classList.contains('active')&&!page.classList.contains('hidden')}
document.querySelector('.nav button[data-page="transcript"]')?.addEventListener('click',()=>setTimeout(()=>load(false),20));
document.getElementById('refresh')?.addEventListener('click',()=>{if(active())setTimeout(()=>state.searchMode?search(state.query):load(true),120)});
state.timer=setInterval(()=>{if(active()&&token()&&!state.searchMode)load(true)},15000);
window.FoundationSystemTranscriptV018={version:'0.1.8',order:'event_no',refresh:()=>state.searchMode?search(state.query):load(true),search,clearSearch,events:()=>state.events.slice()};
})();