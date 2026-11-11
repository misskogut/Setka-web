(() => {
"use strict";
const groups=[
 {id:"overview",label:"Главная",tabs:["overview"],description:"Сводные показатели. Не смешивать гостей, ID и исторические данные без общей методики."},
 {id:"lab",label:"Лаборатория",tabs:["journey","timing","symptoms","notes","insights","pattern-metrics","sensors"],description:"Протоколы, динамика состояния, экспозиции паттернов, физиология и воспроизводимость."},
 {id:"audience",label:"Аудитория",tabs:["participants","guests","invites"],description:"Гости и ID — состояния одной идентичности. Связь только после подтверждённой регистрации."},
 {id:"growth",label:"Рост и бизнес",tabs:["community"],description:"Кампании, ссылки, подписки и партнёрские кабинеты будут подключены после проверки единой телеметрии."}
];
const names={overview:"Обзор",journey:"Путь",participants:"Участники",timing:"Таймер и удержание",symptoms:"Симптомы",notes:"Заметки",invites:"Инвайты",insights:"Запросы и эффект","pattern-metrics":"Паттерны · статистика",community:"Сообщество",guests:"Гостевой путь",sensors:"Физиология"};
function start(){
 const dashboard=document.getElementById("dashboard"),oldTabs=dashboard?.querySelector(".tabs");if(!oldTabs)return;
 const header=document.createElement("div");header.className="v6-head";header.innerHTML='<div><h2>SETKA · Research & Business <small>V6 PREVIEW</small></h2><p>Исследования, аудитория, рост и управление — единая навигация без изменения старых исследовательских экранов.</p></div><div class="v6-status">Текущая версия: экспериментальная · <a class="v6-compare" href="admin-v4.html">Открыть прежнюю V4</a></div>';
 oldTabs.before(header);
 const main=document.createElement("nav");main.className="v6-nav";main.setAttribute("aria-label","Основные разделы");
 const sub=document.createElement("nav");sub.className="v6-sections";sub.setAttribute("aria-label","Вкладки раздела");
 header.after(main,sub);
 const notice=document.createElement("div");notice.className="v6-panel";notice.innerHTML='<strong>Состояние данных</strong><p>Исторические панели пока используют разные серверные API. До подтверждения единого потока не следует считать их метрики полностью сопоставимыми. Персональные заметки не являются общедоступной аналитикой.</p>';sub.after(notice);
 oldTabs.classList.add("v6-hidden-tab");
 let group="overview";
 function render(){
  main.replaceChildren();sub.replaceChildren();
  for(const g of groups){const b=document.createElement("button");b.textContent=g.label;b.className=group===g.id?"active":"";b.onclick=()=>{group=g.id;render();const first=g.tabs.find(t=>oldTabs.querySelector('[data-tab="'+t+'"]'));if(first)oldTabs.querySelector('[data-tab="'+first+'"]').click();};main.appendChild(b)}
  const selected=groups.find(g=>g.id===group);
  notice.querySelector("p").textContent=selected.description+" Исторические показатели могут происходить из разных API; сверяйте полноту синхронизации.";
  for(const tab of selected.tabs){const original=oldTabs.querySelector('[data-tab="'+tab+'"]');if(!original)continue;const b=document.createElement("button");b.textContent=names[tab]||tab;b.className=original.classList.contains("active")?"active":"";b.onclick=()=>{original.click();render()};sub.appendChild(b)}
 }
 oldTabs.addEventListener("click",e=>{const b=e.target.closest("[data-tab]");if(!b)return;const g=groups.find(g=>g.tabs.includes(b.dataset.tab));if(g)group=g.id;queueMicrotask(render)});
 render();
 const observer=new MutationObserver(()=>{const tabs=oldTabs.querySelectorAll("[data-tab]").length;if(tabs!==observer.lastCount){observer.lastCount=tabs;render()}});observer.lastCount=oldTabs.querySelectorAll("[data-tab]").length;observer.observe(oldTabs,{childList:true,subtree:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();