(() => {
"use strict";
const ENDPOINT="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-standalone-v34";
const KEY_NAME="setka-research:admin-key:v1";
const CHANNEL="yulia_lab_v34";
const escapeHTML=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let panel=null,request=0;
function setup(){
 const dashboard=document.getElementById("dashboard"),nav=dashboard?.querySelector(".v6-head");if(!nav)return;
 panel=document.createElement("section");panel.className="v6-panel";panel.id="v6-data-health";panel.setAttribute("aria-live","polite");
 panel.innerHTML='<strong>Контроль синхронизации</strong><p>Проверка ещё не выполнена.</p><button type="button" class="btn" id="v6-check-data">Проверить реальные данные</button>';
 nav.after(panel);
 panel.querySelector("button").addEventListener("click",check);
 dashboard.querySelector("#refreshBtn")?.addEventListener("click",()=>setTimeout(check,250));
 const obs=new MutationObserver(()=>{if(!dashboard.classList.contains("hidden")&&request===0){request++;check()}});
 obs.observe(dashboard,{attributes:true,attributeFilter:["class"]});
 if(!dashboard.classList.contains("hidden")){request++;check()}
}
async function check(){
 if(!panel)return;
 const key=localStorage.getItem(KEY_NAME)||"";
 const p=panel.querySelector("p"),button=panel.querySelector("button");
 if(!key){p.textContent="Нет подтверждённой административной сессии. Данные не загружаются.";return}
 button.disabled=true;p.textContent="Проверяем серверный источник…";
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  let res;
  try{res=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"admin-overview",adminKey:key,channel:CHANNEL}),signal:controller.signal})}finally{clearTimeout(timer)}
  const data=await res.json();
  if(!res.ok||data.ok!==true)throw Error(data.error||"server_unavailable");
  const devices=Array.isArray(data.devices)?data.devices:[],sessions=Array.isArray(data.sessions)?data.sessions:[];
  const now=Date.now(),recent=devices.filter(x=>Number.isFinite(Date.parse(x.last_seen_at))&&now-Date.parse(x.last_seen_at)<86400000).length;
  const latest=devices.reduce((v,x)=>Math.max(v,Date.parse(x.last_seen_at)||0),0);
  p.innerHTML='<strong>Зарегистрировано устройств:</strong> '+escapeHTML(devices.length)+' · <strong>Активны за 24 часа:</strong> '+escapeHTML(recent)+' · <strong>Исторических сессий в этом источнике:</strong> '+escapeHTML(sessions.length)+' · <strong>Последний heartbeat:</strong> '+escapeHTML(latest?new Date(latest).toLocaleString("ru-RU"):"нет данных")+'<br><small>Источник: setka-standalone-v34 / admin-overview. Это не доказательство доставки событий в единый реестр V2. Счётчики из разных API не складываются.</small>';

 }catch(e){p.textContent="Исторический источник V34 недоступен: "+String(e.message||e)+". Проверка V2 продолжается отдельно."}

 const quality=panel.querySelector("#v6-quality")||document.createElement("div");quality.id="v6-quality";quality.style.marginTop="10px";if(!quality.isConnected)panel.appendChild(quality);
 const qcontroller=new AbortController(),qtimer=setTimeout(()=>qcontroller.abort(),12000);
 try{
  const qr=await fetch("https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-admin-v6-metrics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"quality",adminKey:key}),signal:qcontroller.signal});
  const qd=await qr.json();if(!qr.ok||!qd.ok)throw Error(qd.error||"quality_unavailable");
  const labels={setka_research_events_v2:"Единые события V2",setka_research_identity_links_v1:"Подтверждённые связи гость → ID",prototype_v40_service_exposures:"Экспозиции V40",prototype_v41_account_exposures:"Экспозиции V41",prototype_v34_devices:"Устройства V34",prototype_v34_sessions:"Сессии V34"};
  quality.innerHTML='<strong>Источники данных · '+escapeHTML(new Date(qd.checkedAt).toLocaleString("ru-RU"))+'</strong><ul>'+qd.sources.map(x=>'<li>'+escapeHTML(labels[x.table]||x.table)+': '+escapeHTML(x.error?"недоступен":x.count)+'</li>').join("")+'</ul><p>Сквозная доставка событий V2: <strong>не подтверждена</strong>. Значения из разных таблиц не суммируются.</p>';
 }catch(e){quality.textContent="Проверка источников недоступна: "+String(e.message||e)}
 finally{clearTimeout(qtimer)}
 finally{button.disabled=false}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);else setup();
})();