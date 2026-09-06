(()=>{
'use strict';
const API='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-mother-president-v4';
const SESSION='setka:foundation:president:session';
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
function token(){try{return localStorage.getItem(SESSION)||''}catch{return''}}
async function api(action,payload={}){const h={'content-type':'application/json'};const t=token();if(t)h['x-setka-session']=t;const r=await fetch(API,{method:'POST',headers:h,body:JSON.stringify({action,...payload})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||d.error||'Ошибка Atlas');return d}
function modal(html){const m=document.getElementById('modal'),b=document.getElementById('modalBody');if(!m||!b)return;b.innerHTML=html;m.classList.add('open')}
function best(r){for(const k of ['display_name_ru','title_ru','title','summary','name','ship_code','setka_id','identity_ref','entity_ref','event_type','report_ref','mission_ref','source_ref'])if(r?.[k]!=null&&r[k]!=='')return String(r[k]);const p=Object.entries(r||{}).find(([,v])=>['string','number','boolean'].includes(typeof v));return p?`${p[0]}: ${p[1]}`:'Запись'}
function meta(r){return ['state','status','kind','scope_ref','source_ref','created_at','updated_at','occurred_at','generated_at'].filter(k=>r?.[k]!=null&&r[k]!=='').slice(0,3).map(k=>`${k}: ${typeof r[k]==='object'?JSON.stringify(r[k]):r[k]}`).join(' · ')}
async function openRelation(row){
 if(row.exposure_class!=='PRESIDENT_READ'){modal(`<h2>🔒 ${esc(row.table_schema)}.${esc(row.table_name)}</h2><p>Источник зарегистрирован в backend, но его строки намеренно не выводятся во фронт: <strong>${esc(row.exposure_class)}</strong>.</p><p>Это не пробел фронта, а защитная граница для credential/token/secret данных.</p>`);return}
 modal(`<h2>🗺️ ${esc(row.table_schema)}.${esc(row.table_name)}</h2><p>Загружаю безопасный preview…</p>`);
 try{
  const d=await api('atlas_source',{schema:row.table_schema,relation:row.table_name,limit:100});
  const rows=Array.isArray(d.rows)?d.rows:[];
  const html=rows.length?rows.map((r,i)=>`<details class="row"><summary><span class="rowTitle">${i+1}. ${esc(best(r))}</span><span class="rowMeta">${esc(meta(r))}</span></summary><pre>${esc(JSON.stringify(r,null,2))}</pre></details>`).join(''):'<div class="empty">Источник существует, но сейчас пуст.</div>';
  modal(`<h2>🗺️ ${esc(d.schema)}.${esc(d.relation)}</h2><p>${esc(d.backendFamily||'')} · ${esc(d.tableType||'')} · ${rows.length} строк preview</p><div class="rows">${html}</div>`);
 }catch(e){modal(`<h2>🗺️ ${esc(row.table_schema)}.${esc(row.table_name)}</h2><div class="sourceError">${esc(e.message)}</div>`)}
}
function enhance(){
 const title=document.getElementById('moduleTitle');if(!title||!title.textContent.includes('Атлас backend'))return;
 document.querySelectorAll('#sourceGrid .row').forEach(rowEl=>{
  if(rowEl.dataset.atlasEnhanced==='1')return;
  const pre=rowEl.querySelector('pre');if(!pre)return;
  let row;try{row=JSON.parse(pre.textContent)}catch{return}
  if(!row.table_name||!row.table_schema)return;
  rowEl.dataset.atlasEnhanced='1';rowEl.dataset.pin=`atlas:${row.table_schema}.${row.table_name}`;
  const t=rowEl.querySelector('.rowTitle'),m=rowEl.querySelector('.rowMeta');
  if(t)t.textContent=`${row.table_schema}.${row.table_name}`;
  if(m)m.textContent=`${row.backend_family||'OTHER'} · ${row.table_type||''} · ${row.exposure_class||''}`;
  const btn=document.createElement('button');btn.className='miniBtn';btn.type='button';btn.textContent=row.exposure_class==='PRESIDENT_READ'?'Открыть данные →':'🔒 Чувствительный источник';btn.style.margin='10px 0 0 15px';btn.style.marginBottom='12px';btn.onclick=e=>{e.preventDefault();e.stopPropagation();openRelation(row)};rowEl.appendChild(btn);
 });
}
const obs=new MutationObserver(()=>enhance());
const start=()=>{const grid=document.getElementById('sourceGrid');if(grid)obs.observe(grid,{childList:true,subtree:true});const title=document.getElementById('moduleTitle');if(title)obs.observe(title,{childList:true,subtree:true,characterData:true});enhance()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
