(()=>{"use strict";
const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-admin-v6-metrics";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let loaded=false,latestRequest=0;
function init(){
 const tabs=document.querySelector(".tabs"),anchor=document.getElementById("tab-insights");
 if(!tabs||!anchor)return;
 const tab=document.createElement("button");tab.className="tab";tab.dataset.tab="pattern-metrics";tab.textContent="Паттерны · данные";
 tabs.appendChild(tab);
 const section=document.createElement("section");section.id="tab-pattern-metrics";section.className="tab-page hidden";anchor.after(section);
 section.innerHTML='<div class="v6-panel"><strong>Статистика паттернов</strong><p>Раздельные исторические потоки V40 и V41. Данные не суммируются: идентификаторы участников могут пересекаться. Единая телеметрия V2 ещё не подтверждена.</p><button class="btn" id="v6-pattern-refresh">Обновить</button><div id="v6-pattern-results"></div></div>';
 const sourceSelect=document.createElement("select");sourceSelect.setAttribute("aria-label","Источник статистики");sourceSelect.innerHTML='<option value="guest_v40">Гостевой исторический поток V40</option><option value="account_v41">Аккаунты V41</option>';section.querySelector("#v6-pattern-refresh").before(sourceSelect);sourceSelect.addEventListener("change",load);
 const load=async()=>{
  const requestId=++latestRequest;
  const target=section.querySelector("#v6-pattern-results"),key=localStorage.getItem("setka-research:admin-key:v1")||"";
  if(!key){target.textContent="Нужна подтверждённая авторизация администратора.";return}
  target.textContent="Загрузка проверяемых серверных данных…";
  try{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);let r;
   try{r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"pattern-summary",source:sourceSelect.value,adminKey:key}),signal:controller.signal})}finally{clearTimeout(timer)}
   const d=await r.json();if(requestId!==latestRequest)return;if(!r.ok||!d.ok)throw Error(d.error||"server_error");
   const items=d.items||[];
   target.innerHTML='<p>Паттернов: '+esc(items.length)+' · Источник: '+esc(d.source)+' · '+(d.truncated?"Данные частичные: достигнут лимит обработки 50 000 записей":"Полная выборка источника")+'</p><div class="table-wrap"><table><thead><tr><th>Паттерн</th><th>Экспозиций</th><th>Участников*</th><th>Время</th><th>Последняя запись</th></tr></thead><tbody>'+items.map(x=>'<tr><td>'+esc(x.pattern_id)+'</td><td>'+esc(x.exposures)+'</td><td>'+esc(x.unique_participants)+'</td><td>'+esc((x.active_ms/60000).toFixed(1))+' мин</td><td>'+esc(x.latest?new Date(x.latest).toLocaleString("ru-RU"):"—")+'</td></tr>').join("")+'</tbody></table></div><p>* Уникальные ключи участников в историческом источнике; ещё не дедуплицированы через гостевые и ID-связи. Это не доказательство эффективности паттерна.</p>';
  }catch(e){if(requestId===latestRequest)target.textContent="Ошибка загрузки: "+String(e.message||e)}
 };
 section.querySelector("#v6-pattern-refresh").onclick=load;
 tab.onclick=()=>{tabs.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));tab.classList.add("active");document.querySelectorAll(".tab-page").forEach(x=>x.classList.add("hidden"));section.classList.remove("hidden");if(!loaded){loaded=true;load()}};
 document.addEventListener("click",e=>{const b=e.target.closest?.(".tab[data-tab]");if(b&&b!==tab)section.classList.add("hidden")},true);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();