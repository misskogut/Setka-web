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
 }catch(e){p.textContent="Проверка не удалась: "+String(e.message||e)+". Статистика не подтверждена."}
 finally{button.disabled=false}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);else setup();
})();