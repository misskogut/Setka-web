(()=>{
'use strict';
// Foundation 0.1.8 inherits system capabilities, but owns its live UI.
// No legacy version is allowed to repaint this DOM on a timer.
const VERSION='0.1.8';
const API='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-v018';
const SESSION_KEY='setka:foundation:president:session';
const $=id=>document.getElementById(id);
const qa=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const carry={snapshot:null,directory:null,loading:false,lastLoad:0};
function session(){try{return localStorage.getItem(SESSION_KEY)||''}catch{return''}}
async function api(action,payload={}){const headers={'content-type':'application/json','x-setka-foundation-version':VERSION};const t=session();if(t)headers['x-setka-session']=t;const r=await fetch(API,{method:'POST',headers,body:JSON.stringify({action,pairVersion:VERSION,...payload})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||d.error||'Ошибка сервера');return d}
function directory(){return carry.directory||window.FoundationAdminIdentityV018?.directory?.()||null}
function rewriteVersionText(){
  if(document.body.dataset.foundationVersion!=='018')document.body.dataset.foundationVersion='018';
  qa('.version,.topTitle,.root span').forEach(el=>{const t=el.textContent||'';const n=t.replaceAll('0.1.6',VERSION).replaceAll('0.1.7',VERSION);if(n!==t)el.textContent=n});
  const pair=document.querySelector('.root span');if(pair&&pair.textContent!==`ПАРА · ${VERSION}`)pair.textContent=`ПАРА · ${VERSION}`;
  const nav=document.querySelector('.nav button[data-page="users"]');if(nav&&nav.textContent!=='ID')nav.textContent='ID';
}
function ensureConstants(){
  const nav=document.querySelector('.nav'),main=document.querySelector('main.main');if(!nav||!main)return;
  let b=document.querySelector('.nav button[data-page="constants"]');
  if(!b){b=document.createElement('button');b.dataset.page='constants';b.textContent='Константы';const protocol=nav.querySelector('[data-page="protocol"]');nav.insertBefore(b,protocol||null);b.addEventListener('click',e=>{e.preventDefault();showConstants()})}
  let page=$('page-constants');if(!page){page=document.createElement('section');page.id='page-constants';page.className='page hidden';main.appendChild(page)}
}
function showConstants(){qa('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.page==='constants'));qa('main.main .page').forEach(x=>x.classList.toggle('hidden',x.id!=='page-constants'));renderConstants()}
function countDerived(){
  const d=directory(),ids=d?.identities||[],provided=d?.counts||{};
  const active=ids.filter(x=>x.active!==false),humans=active.filter(x=>x.nature!=='synthetic'),synthetics=active.filter(x=>x.nature==='synthetic');
  return{
    total:Number(provided.total??active.length),humans:Number(provided.humans??humans.length),synthetics:Number(provided.synthetics??synthetics.length),
    front:Number(provided.front??active.filter(x=>x.frontEnabled).length),back:Number(provided.back??active.filter(x=>x.backEnabled).length),
    createdByPresident:Number(provided.createdByPresident??active.filter(x=>x.creatorKind==='president').length),createdBySynthetic:Number(provided.createdBySynthetic??active.filter(x=>x.creatorKind==='synthetic_admin').length),
    active:active.length,inactive:ids.length-active.length,frontOnly:active.filter(x=>x.frontEnabled&&!x.backEnabled).length,backActors:active.filter(x=>x.backEnabled).length,
    syntheticFront:synthetics.filter(x=>x.frontEnabled).length,syntheticBack:synthetics.filter(x=>x.backEnabled).length
  }
}
function liveStat(label,value){return `<div class="constantLiveStat"><span>${esc(label)}</span><b>${Number(value||0)}</b></div>`}
function setkaIdLive(){
  if(!directory())return '<div class="constantLive pending"><div class="constantLiveHead"><b>ЖИВОЙ ОТЧЁТ</b><span>Загружаю состояние ID-системы…</span></div></div>';
  const c=countDerived();
  return `<div class="constantLive"><div class="constantLiveHead"><b>ЖИВОЙ ОТЧЁТ · СЕЙЧАС</b><span>Это наблюдаемое состояние константы, а не описание.</span></div><div class="constantLiveGrid">${liveStat('ВСЕ ID',c.total)}${liveStat('АКТИВНЫЕ',c.active)}${liveStat('НЕАКТИВНЫЕ',c.inactive)}${liveStat('ЛЮДИ',c.humans)}${liveStat('СИНТЕТИКИ',c.synthetics)}${liveStat('FRONT',c.front)}${liveStat('FRONT ONLY',c.frontOnly)}${liveStat('BACK / ADMIN',c.back)}${liveStat('СИНТЕТИКИ FRONT',c.syntheticFront)}${liveStat('СИНТЕТИКИ BACK',c.syntheticBack)}${liveStat('СОЗДАЛ ПРЕЗИДЕНТ',c.createdByPresident)}${liveStat('СОЗДАЛ СИНТЕТИК',c.createdBySynthetic)}</div><div class="constantLiveRule">ID — постоянный корень. Природа, Front/Back, задача и права изменяются поверх ID, не создавая новую идентичность.</div></div>`
}
function renderConstants(){
  const page=$('page-constants'),reg=window.SETKA_FOUNDATION_CONSTANTS_V018;if(!page||!reg)return;
  const cards=(reg.constants||[]).map(c=>`<div class="constantCard ${c.id==='SETKA_ID'?'constantPrimary':''}"><div class="constantKey">${esc(c.id)}</div><h3>${esc(c.name)}</h3><p>${esc(c.definition)}</p><div class="constantMeta"><span>с ${esc(c.since)}</span><span>${esc(c.level)}</span>${c.immutable?'<span>НЕ ТЕРЯТЬ</span>':''}</div>${c.id==='SETKA_ID'?setkaIdLive():''}</div>`).join('');
  const rel=(reg.relations||[]).map(r=>`<div class="relationRow"><b>${esc(r.from)}</b> → ${esc(r.label)} → <b>${esc(r.to)}</b></div>`).join('');
  page.innerHTML=`<div class="sectionHead"><div><div class="title">Константы</div><div class="sub">Не словарь: каждая системная сущность хранит закон и, где возможно, показывает своё живое состояние.</div></div></div><div class="constantsIntro"><b>Правило вытачивания</b><span>${esc(reg.principle)}</span></div><div class="constantsGrid">${cards}</div><div class="card"><div class="k">СВЯЗИ КОНСТАНТ</div><div class="relationList">${rel}</div></div>`;
}
function time(v){if(!v)return'—';const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v);return d.toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
function runView(r){const s=String(r?.status||'').toLowerCase();if(['completed','done','passed','success','ok'].includes(s))return{label:'✓ пройден',cls:'ok'};if(['error','failed','failure'].includes(s))return{label:'× ошибка',cls:'error'};if(['running','started','active','in_progress'].includes(s))return{label:'… идёт',cls:'running'};return{label:s||'… идёт',cls:'running'}}
function legacyFor(identity){const users=carry.snapshot?.users||[];return users.find(u=>(identity?.personaKey&&u.personaKey===identity.personaKey)||u.setkaId===identity?.setkaId)||null}
function runsFor(identity){const key=identity?.personaKey||legacyFor(identity)?.personaKey;if(!key)return[];return(carry.snapshot?.syntheticRuns||[]).filter(r=>r.personaKey===key).slice(0,5)}
function augmentSynthetics(){
  if(!carry.directory||!carry.snapshot)return;const ids=carry.directory.identities||[];
  qa('.synthetic017Card[data-synthetic-id]').forEach(card=>{const identity=ids.find(x=>x.identityId===card.dataset.syntheticId);if(!identity||card.querySelector('.v018CarryBlock'))return;const legacy=legacyFor(identity),runs=runsFor(identity),block=document.createElement('div');block.className='v018CarryBlock';const rows=runs.length?runs.map(r=>{const v=runView(r);return`<div class="v018Run ${v.cls}">${esc(v.label)} · ${esc(time(r.startedAt||r.createdAt||r.finishedAt))}</div>`}).join(''):'<div class="v018Run">Прогонов ещё нет</div>';block.innerHTML=`<div class="v018CarryTitle">АКТИВНОСТЬ ИЗ ПРЕДЫДУЩИХ ВЕРСИЙ · СОХРАНЕНА</div>${legacy?`<div class="syntheticStats"><span class="pill">Открытия ${Number(legacy.opens||0)}</span><span class="pill">♥ ${Number(legacy.favorites||0)}</span></div>`:''}<div class="v018RunHistory">${rows}</div>`;const actions=card.querySelector('.synthetic017Actions');if(actions)card.insertBefore(block,actions);else card.appendChild(block)})
}
async function loadCarry(force=false){
  const t=session();if(!t||carry.loading)return;if(!force&&Date.now()-carry.lastLoad<4000&&carry.snapshot&&carry.directory){augmentSynthetics();renderConstants();return}
  carry.loading=true;try{const [a,b]=await Promise.all([api('admin_snapshot'),api('admin_identity_snapshot')]);carry.snapshot=a.snapshot||null;carry.directory=b.directory||null;carry.lastLoad=Date.now();augmentSynthetics();renderConstants()}catch(e){if(!/session|access|authorized/i.test(e.message||''))console.warn('v018 carry-forward',e)}finally{carry.loading=false}
}
function tick(){rewriteVersionText();ensureConstants();augmentSynthetics()}
document.addEventListener('click',e=>{const nav=e.target.closest?.('.nav button');if(nav&&nav.dataset.page!=='constants')setTimeout(()=>{tick();loadCarry(false)},80);if(e.target.closest?.('#refresh'))setTimeout(()=>loadCarry(true),120)},true);
window.addEventListener('storage',e=>{if(e.key===SESSION_KEY)setTimeout(()=>loadCarry(true),80)});
window.addEventListener('foundation:v018-identity-rendered',()=>{carry.directory=window.FoundationAdminIdentityV018?.directory?.()||carry.directory;augmentSynthetics();renderConstants();if(!carry.snapshot)loadCarry(false)});
window.addEventListener('foundation:v018-directory',e=>{carry.directory=e.detail?.directory||carry.directory;renderConstants()});
setTimeout(()=>{tick();loadCarry(true)},100);
window.FoundationAdminPatchV018={version:VERSION,refresh:()=>loadCarry(true),constants:()=>window.SETKA_FOUNDATION_CONSTANTS_V018,carry:()=>({snapshot:carry.snapshot,directory:directory()})};
})();