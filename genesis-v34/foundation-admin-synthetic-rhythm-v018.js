(()=>{
'use strict';
const SIM='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-simulation-v1';
let profiles=new Map(),loading=false;
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const hourLabel=h=>`${String(Number(h)||0).padStart(2,'0')}:00`;
function daypart(h){h=Number(h)||0;return h<6?'ночь':h<12?'утро':h<18?'день':'вечер'}
async function load(){if(loading)return;loading=true;try{const r=await fetch(SIM,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'personas'})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||d.error||'rhythm_load_failed');profiles=new Map((d.personas||[]).map(p=>[p.personaKey,p]));decorate()}catch(e){console.warn('synthetic rhythm',e)}finally{loading=false}}
function decorate(){
 document.querySelectorAll('.syntheticCard[data-persona]').forEach(card=>{
  const key=card.dataset.persona,p=profiles.get(key),r=p?.dailyRhythm;if(!r?.active)return;
  let box=card.querySelector('.syntheticRhythm018');if(!box){box=document.createElement('div');box.className='syntheticRhythm018';const stats=card.querySelector('.syntheticStats');(stats||card.querySelector('.systemId')||card).after(box)}
  const variance=Number(r.hourVariance)||0,jitter=Number(r.jitterMinutes)||0;
  box.innerHTML=`<div class="syntheticRhythmTitle018">◷ РИТМ ДНЯ · ${esc(daypart(r.preferredLocalHour))}</div><div class="syntheticRhythmTime018">~ ${esc(hourLabel(r.preferredLocalHour))}</div><div class="syntheticRhythmMeta018">ежедневное смещение ±${variance} ч · разброс 0–${jitter} мин</div><div class="syntheticRhythmMeta018">${esc(r.timezone||'Europe/Saratov')} · план вычисляется заново каждый день</div>`;
 });
}
const obs=new MutationObserver(()=>decorate());
obs.observe(document.documentElement,{subtree:true,childList:true});
addEventListener('foundation:admin-refreshed',()=>load());
setTimeout(load,120);setInterval(()=>{if(!profiles.size)load();else decorate()},2500);
window.FoundationSyntheticRhythmV018={reload:load,decorate};
})();