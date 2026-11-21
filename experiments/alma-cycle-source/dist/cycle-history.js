(()=>{
"use strict";
/* Independent, privacy-local history under the original ALMA lotus.
   The React application, wheel, modal and phase calculations are untouched.
   A length is measured only between two recorded period starts; predictions
   never masquerade as historical observations. */
const KEY="setka-alma-source-cycle-v1";
const LEGACY="setka-cycle-lotus-lab-v1";
const HISTORY="setka-alma-cycle-history-v1";
const MS=86400000;
const $=selector=>document.querySelector(selector);
const today=()=>new Date().toISOString().slice(0,10); // Matches ALMA's UTC calendar dates.
const isISO=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+"T12:00:00Z"))&&new Date(v+"T12:00:00Z").toISOString().slice(0,10)===v;
const day=iso=>new Date(iso+"T12:00:00Z");
const add=(iso,n)=>{const d=day(iso);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const diff=(a,b)=>Math.round((day(b).getTime()-day(a).getTime())/MS);
const integer=(n,a,b)=>Number.isInteger(Number(n))&&Number(n)>=a&&Number(n)<=b?Number(n):null;
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch(_){return null}};
const fmt=(iso,year=false)=>isISO(iso)?new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"short",...(year?{year:"numeric"}:{}),timeZone:"UTC"}).format(day(iso)).replaceAll(".",""):"—";
const grammar=(number,one,few,many)=>{const n=Math.abs(number)%100,r=n%10;return r===1&&n!==11?one:r>=2&&r<=4&&(n<12||n>14)?few:many};
const daysLabel=n=>n+" "+grammar(n,"день","дня","дней");
const esc=x=>String(x??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
let holder=null,scene=null;
let view="overview",selected=null,editStart=null,showAll=false,oldScroll=0,lastSignature="",lastHeroColor="";
let openEditor=false;

function validRecord(row){
 if(!row||!isISO(row.start)||row.start>"9999-12-31"||row.start>today())return null;
 const length=integer(row.periodLength,1,15);
 return {start:row.start,periodLength:length,source:row.source||"history"};
}
function historyStore(){
 const s=read(HISTORY);
 const records=Array.isArray(s?.records)?s.records.map(validRecord).filter(Boolean):[];
 const seen=s?.lastSeen&&isISO(s.lastSeen.start)?{start:s.lastSeen.start,periodLength:integer(s.lastSeen.periodLength,1,15)}:null;
 return {records,lastSeen:seen};
}
function saveStore(store){
 try{localStorage.setItem(HISTORY,JSON.stringify({version:1,records:store.records,lastSeen:store.lastSeen}))}catch(_){}
}
function original(){
 const s=read(KEY),p=s?.profile||{};
 const configured=!!s?.configured&&isISO(p.lastPeriodStart)&&p.lastPeriodStart<=today();
 const legacy=read(LEGACY);
 return {configured,profile:p,legacy,events:s?.events&&typeof s.events==="object"?s.events:{}};
}
function archiveIfNew(orig,store){
 if(!orig.configured)return;
 const current=orig.profile.lastPeriodStart;
 const periodLength=integer(orig.profile.periodLength,1,15);
 const previous=store.lastSeen;
 if(previous?.start===current&&previous.periodLength===periodLength)return;
 if(previous&&previous.start!==current){
   const gap=diff(previous.start,current);
   // Older start is archived only for a credible later menstrual start.
   // Date corrections inside the same 14-day window are not new cycles.
   if(gap>=14&&gap<=90&&!store.records.some(r=>r.start===previous.start)){
     store.records.push({start:previous.start,periodLength:previous.periodLength,source:"recorded"});
   }
 }
 store.lastSeen={start:current,periodLength};
 saveStore(store);
}
function getEntries(orig,store){
 const map=new Map();
 const merge=(row,priority)=>{
   const record=validRecord(row);
   if(!record)return;
   const old=map.get(record.start);
   if(!old||priority>=old.priority)map.set(record.start,{...record,priority});
 };
 const legacy=orig.legacy;
 const rows=Array.isArray(legacy?.periods)?legacy.periods:Array.isArray(legacy?.records)?legacy.records:[];
 for(const row of rows){
   const start=row?.start;
   const length=isISO(row?.end)&&isISO(start)?diff(start,row.end)+1:null;
   merge({start,periodLength:integer(length,1,15),source:"legacy"},1);
 }
 for(const row of store.records)merge(row,3);
 if(orig.configured)merge({start:orig.profile.lastPeriodStart,periodLength:orig.profile.periodLength,source:"current"},5);
 const entries=[...map.values()].sort((a,b)=>a.start.localeCompare(b.start));
 return entries.map((item,i)=>{
   const next=entries[i+1],elapsed=next?diff(item.start,next.start):null;
   const completed=!!next&&elapsed>=14&&elapsed<=90;
   const daysSoFar=diff(item.start,today())+1;
   return {...item,length:completed?elapsed:null,nextStart:next?.start||null,
      current:!next&&item.source==="current",daysSoFar:Math.max(1,daysSoFar),periodLength:item.periodLength};
 });
}
function model(){
 const orig=original(),store=historyStore();
 archiveIfNew(orig,store);
 const entries=getEntries(orig,store);
 const complete=entries.filter(r=>r.length!==null);
 const durations=entries.filter(r=>r.periodLength!==null);
 const last=entries.at(-1)||null;
 const validCompleted=complete.map(r=>r.length);
 const periodDurations=durations.map(r=>r.periodLength);
 const average=values=>values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length*10)/10:null;
 return {orig,store,entries,complete,durations,last,
   lastCompleted:complete.at(-1)||null,
   avgCycle:average(validCompleted),
   avgPeriod:average(periodDurations),
   min:validCompleted.length>=2?Math.min(...validCompleted):null,
   max:validCompleted.length>=2?Math.max(...validCompleted):null};
}
function colorSync(){
 const hero=scene?.querySelector(".cycle-hero");
 const color=hero&&getComputedStyle(hero).getPropertyValue("--cycle-color").trim();
 if(color&&color!==lastHeroColor){holder.style.setProperty("--cycle-insights-color",color);lastHeroColor=color}
}
function lineDots(r,expanded=false){
 const count=expanded?Math.min(60,r.length||Math.max(r.daysSoFar,28)):Math.min(42,r.length||Math.max(r.daysSoFar,28));
 const ov=Math.max((r.periodLength||5)+5,(r.length||28)-14);
 const dots=[];
 for(let i=1;i<=count;i++){
   let cls="ach-dot";
   if(r.periodLength&&i<=r.periodLength)cls+=" is-period";
   else if(r.length!==null&&i===ov)cls+=" is-ovulation";
   else if(r.length!==null&&i>=ov-4&&i<ov)cls+=" is-fertile";
   else if(r.current&&i>r.daysSoFar)cls+=" is-future";
   if(r.current&&i===r.daysSoFar)cls+=" is-today";
   dots.push('<i class="'+cls+'"></i>');
 }
 return '<div class="ach-dots" aria-label="Шкала дней цикла, расчётные фазы выделены цветом">'+dots.join("")+'</div>';
}
function metric(name,value,detail){
 return '<div class="ach-metric"><div class="ach-metric-name">'+esc(name)+'</div><div class="ach-metric-value'+(value==="—"?" is-empty":"")+'">'+esc(value)+'</div><div class="ach-metric-detail">'+esc(detail)+'</div></div>';
}
function entryRow(r){
 const title=r.current?"Текущий цикл: "+daysLabel(r.daysSoFar):
      r.length!==null?daysLabel(r.length):"Цикл — без точной длительности";
 const dates=fmt(r.start)+" — "+(r.length!==null?fmt(add(r.nextStart,-1)):r.current?"сегодня":"дата окончания неизвестна");
 return '<button class="ach-cycle-row" type="button" data-action="detail" data-start="'+esc(r.start)+'">'+
   '<span class="ach-row-main"><strong>'+esc(title)+'</strong><span class="ach-dates">'+
   esc(dates)+'</span>'+lineDots(r)+'</span><span class="ach-chevron" aria-hidden="true">›</span></button>';
}
function chart(rows){
 if(!rows.length)return '<p class="ach-empty">График появится после двух отмеченных начал месячных. Каждый его показатель будет рассчитан по реальным датам.</p>';
 const W=340,H=174,L=32,R=328,T=18,B=141;
 const vals=rows.map(r=>r.length),lo=Math.min(17,...vals.map(n=>n-4)),hi=Math.max(39,...vals.map(n=>n+4));
 const y=n=>T+(hi-n)/(hi-lo)*(B-T);
 const x=i=>rows.length===1?180:L+i*(R-L)/(rows.length-1);
 let g="";
 for(const v of [20,25,30,35]){
   if(v<lo||v>hi)continue;
   g+='<line class="ach-chart-grid" x1="'+L+'" y1="'+y(v)+'" x2="'+R+'" y2="'+y(v)+'"/>'+
      '<text class="ach-chart-guide" x="4" y="'+(y(v)+3)+'">'+v+'</text>';
 }
 const d=rows.map((r,i)=>(i?"L":"M")+x(i).toFixed(1)+" "+y(r.length).toFixed(1)).join(" ");
 const band='<rect class="ach-chart-area" x="'+L+'" y="'+y(Math.min(hi,35))+'" width="'+(R-L)+'" height="'+Math.max(0,y(Math.max(lo,21))-y(Math.min(hi,35)))+'"/>';
 const points=rows.map((r,i)=>'<circle class="ach-chart-point" cx="'+x(i)+'" cy="'+y(r.length)+'" r="4.8"/><text class="ach-chart-guide" x="'+x(i)+'" y="'+(y(r.length)-10)+'" text-anchor="middle">'+r.length+'</text>').join("");
 return '<svg class="ach-chart-svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Изменение длительности '+rows.length+' завершённых циклов">'+band+g+
   '<path class="ach-chart-path" d="'+d+'"/>'+points+
   '<text class="ach-chart-guide" x="'+L+'" y="163">'+esc(fmt(rows[0].start))+'</text>'+
   '<text class="ach-chart-guide" x="'+R+'" y="163" text-anchor="end">'+esc(fmt(rows.at(-1).start))+'</text></svg>';
}
function overview(m){
 const n=m.entries.length,complete=m.complete.length;
 const cards=[
  metric("Последний завершённый цикл",m.lastCompleted?daysLabel(m.lastCompleted.length):"—",m.lastCompleted?"По двум датам начала":"Требуются две даты начала"),
  metric("Указанная длительность месячных",m.avgPeriod!==null?m.avgPeriod+" дн.":"—",m.avgPeriod!==null?"Среднее по "+m.durations.length+" "+grammar(m.durations.length,"записи","записям","записям"):"Пока нет сохранённых длительностей"),
  metric("Колебания длительности",m.min!==null?m.min+"–"+m.max+" дн.":"—",m.min!==null?"Разброс завершённых циклов":"После двух завершённых циклов")
 ].join("");
 const latest=m.entries.slice().reverse();
 const rows=showAll?latest:latest.slice(0,4);
 return '<div class="ach-overview">'+
   '<div class="ach-intro"><p class="ach-overline">МОЙ ЦИКЛ · ИСТОРИЯ</p><h2 class="ach-section-heading">Мои циклы</h2>'+
   '<p>История отмеченных дат и статистика. Лотос остаётся наверху — листай вниз для подробностей.</p></div>'+
   '<section class="ach-card" aria-label="Статистика циклов"><div class="ach-card-top"><h3>Общая статистика</h3></div>'+
   '<div class="ach-metrics">'+cards+'</div>'+
   '<p class="ach-text-note">Длина цикла считается от первого дня одних месячных до первого дня следующих. Неизвестные периоды не подставляются в расчёты.</p></section>'+
   '<section class="ach-card" aria-label="История циклов"><div class="ach-card-top"><h3>История циклов</h3>'+
   (n>4?'<button class="ach-text-button" data-action="all" type="button">'+(showAll?"Свернуть":"Смотреть все")+' ›</button>':"")+'</div>'+
   (n?'<div class="ach-cycle-list">'+rows.map(entryRow).join("")+'</div>':
   '<p class="ach-empty">История пока пуста. Отметь начало месячных в лотосе или добавь прошлую запись здесь. Демонстрационные даты не используются.</p>')+
   '<div class="ach-footer-actions"><button class="ach-small-button" data-action="add" type="button">+ Добавить прошлый цикл</button></div></section>'+
   '<section class="ach-card" aria-label="Динамика цикла"><div class="ach-card-top"><h3>Динамика цикла</h3></div>'+
   '<div class="ach-chart-shell">'+chart(m.complete)+'</div>'+
   '<p class="ach-tiny-rule">На графике только завершённые циклы с двумя известными началами. Показатели — наблюдения, а не диагноз.</p></section>'+
   '<p class="ach-text-note">Фертильные дни и овуляция в подробностях — приблизительный календарный расчёт. Для контрацепции он ненадёжен.</p>'+
   '</div>';
}
function detail(m,r){
 const periodEnd=r.periodLength?add(r.start,r.periodLength-1):null;
 const shownEnd=r.length!==null&&r.nextStart?add(r.nextStart,-1):null;
 const ov=r.length!==null?Math.max((r.periodLength||5)+5,r.length-14):null;
 const windowStart=ov!==null?add(r.start,ov-5):null;
 const windowEnd=ov!==null?add(r.start,ov-1):null;
 const ovDate=ov!==null?add(r.start,ov-1):null;
 const isManual=m.store.records.some(x=>x.start===r.start&&!r.current);
 return '<div class="ach-detail">'+
   '<button type="button" class="ach-back" data-action="back"><span aria-hidden="true">‹</span> История циклов</button>'+
   '<p class="ach-detail-kicker">СВЕДЕНИЯ О ЦИКЛЕ</p>'+
   '<h2 class="ach-detail-title">'+esc(r.current?"Текущий цикл":r.length!==null?daysLabel(r.length):"Запись о цикле")+'</h2>'+
   '<p class="ach-detail-caption">Начало: '+esc(fmt(r.start,true))+(shownEnd?" · До "+esc(fmt(shownEnd,true)):r.current?" · Продолжается":" · Конец не отмечен")+'</p>'+
   '<section class="ach-card"><div class="ach-card-top"><h3>Дни цикла</h3></div>'+lineDots(r,true)+
   '<div class="ach-detail-legend"><span><i class="period"></i>Месячные</span><span><i class="fertile"></i>Расчётное окно</span><span><i></i>Расчётная овуляция</span></div></section>'+
   '<section class="ach-card">'+
   '<div class="ach-detail-metric"><h4>Продолжительность цикла</h4><div class="ach-big">'+
   esc(r.length!==null?daysLabel(r.length):r.current?daysLabel(r.daysSoFar)+" сейчас":"Неизвестна")+'</div>'+
   '<p>'+esc(r.length!==null?"По фактическим датам начала двух циклов.":r.current?"Длительность ещё не завершённого цикла, на сегодняшний день.":"Нет следующей даты начала; точно вычислить длительность нельзя.")+'</p></div>'+
   '<div class="ach-detail-metric"><h4>Продолжительность месячных</h4><div class="ach-big">'+
   esc(r.periodLength?daysLabel(r.periodLength):"Не указана")+'</div><p>'+
   esc(periodEnd?"Указанный период: "+fmt(r.start)+" — "+fmt(periodEnd)+".":"Добавь длительность месячных, чтобы увидеть даты.")+'</p></div></section>'+
   (windowStart?'<section class="ach-card"><div class="ach-card-top"><h3>Расчётные фазы</h3></div>'+
   '<div class="ach-detail-points">'+
   '<div class="ach-detail-point"><span class="ach-detail-point-icon">●</span><span>Месячные: '+esc(r.periodLength?fmt(r.start)+" — "+fmt(periodEnd):"длительность не указана")+'</span></div>'+
   '<div class="ach-detail-point"><span class="ach-detail-point-icon" style="color:#67bfc7;border-color:#67bfc74b">○</span><span>Предполагаемое фертильное окно: '+esc(fmt(windowStart)+" — "+fmt(windowEnd))+'</span></div>'+
   '<div class="ach-detail-point"><span class="ach-detail-point-icon" style="color:#b975ec;border-color:#b975ec4b">✦</span><span>Расчётная овуляция: '+esc(fmt(ovDate))+'</span></div></div>'+
   '<p class="ach-text-note">Эти даты получены математически и не подтверждают фактическую овуляцию. Не использовать для предотвращения беременности.</p></section>':
   '<p class="ach-text-note">Расчёт фаз недоступен без точной длины цикла.</p>')+
   (isManual?'<div class="ach-footer-actions"><button class="ach-small-button" data-action="edit" data-start="'+esc(r.start)+'">Исправить запись</button></div>':"")+
   '</div>';
}
function editor(m){
 const current=editStart&&m.store.records.find(x=>x.start===editStart);
 const max=today();
 return '<div class="ach-edit">'+
   '<button type="button" class="ach-back" data-action="back"><span aria-hidden="true">‹</span> Мои циклы</button>'+
   '<p class="ach-overline">ЗАПИСЬ ЦИКЛА</p><h2 class="ach-section-heading">'+(current?"Изменить запись":"Добавить прошлый цикл")+'</h2>'+
   '<form id="achHistoryForm" class="ach-card">'+
   '<label>Первый день месячных<input name="start" type="date" required max="'+esc(max)+'" value="'+esc(current?.start||"")+'"></label>'+
   '<label>Длительность месячных (дней)<input name="periodLength" type="number" min="1" max="15" step="1" inputmode="numeric" required value="'+esc(current?.periodLength||5)+'"></label>'+
   '<p class="ach-form-error" role="alert" id="achHistoryError"></p>'+
   '<button class="ach-save" type="submit">Сохранить запись</button></form>'+
   (current?'<button class="ach-delete" type="button" data-action="delete" data-start="'+esc(current.start)+'">Удалить эту запись</button>':"")+
   '<p class="ach-text-note">Запись хранится только на этом устройстве. Начало текущих месячных изменяется в самом лотосе.</p></div>';
}
function render(){
 if(!holder||!holder.isConnected)return;
 const m=model();
 // A previously selected cycle might have been edited or removed.
 let output;
 if(view==="detail"){
   const row=m.entries.find(r=>r.start===selected);
   if(!row){view="overview";selected=null;output=overview(m)}
   else output=detail(m,row);
 }else if(view==="edit")output=editor(m);
 else output=overview(m);
 holder.innerHTML=output;
 colorSync();
 lastSignature=signature();
}
function signature(){
 const a=read(KEY),b=read(HISTORY),c=read(LEGACY);
 return JSON.stringify([a?.configured,a?.profile?.lastPeriodStart,a?.profile?.periodLength,a?.profile?.cycleLength,b?.records,b?.lastSeen,c?.periods,c?.records,today()]);
}
function focusBelow(){
 if(!scene||!holder)return;
 const top=holder.getBoundingClientRect().top-scene.getBoundingClientRect().top+scene.scrollTop-12;
 try{scene.scrollTo({top:Math.max(0,top),behavior:"smooth"})}catch(_){scene.scrollTop=Math.max(0,top)}
}
function show(mode,start=null){
 if(view==="overview")oldScroll=scene?.scrollTop||0;
 view=mode;
 selected=start;
 editStart=mode==="edit"?start:null;
 render();focusBelow();
}
function back(){
 view="overview";selected=null;editStart=null;render();
 if(scene)scene.scrollTop=oldScroll;
}
function save(event){
 event.preventDefault();
 const form=event.target;
 if(form?.id!=="achHistoryForm")return;
 const error=holder.querySelector("#achHistoryError");
 const start=form.elements.start.value,periodLength=integer(form.elements.periodLength.value,1,15);
 const m=model();
 const current=m.orig.configured?m.orig.profile.lastPeriodStart:null;
 const fail=msg=>{if(error)error.textContent=msg};
 if(!isISO(start)||start>today()){fail("Выбери настоящую дату, не позже сегодняшней.");return}
 if(!periodLength){fail("Продолжительность месячных — от 1 до 15 дней.");return}
 if(start===current){fail("Текущий цикл редактируется через лотос.");return}
 if(current&&start>current){fail("Для новых месячных используй основной календарь-лотос.");return}
 const records=m.store.records.filter(r=>r.start!==editStart&&r.start!==start);
 records.push({start,periodLength,source:"manual"});
 m.store.records=records;
 saveStore(m.store);
 view="overview";selected=null;editStart=null;
 render();focusBelow();
}
function onClick(event){
 const button=event.target.closest("button[data-action]");
 if(!button||!holder.contains(button))return;
 const action=button.dataset.action;
 if(action==="detail")show("detail",button.dataset.start);
 if(action==="back")back();
 if(action==="all"){showAll=!showAll;const top=scene.scrollTop;render();scene.scrollTop=top}
 if(action==="add")show("edit");
 if(action==="edit")show("edit",button.dataset.start);
 if(action==="delete"){
   const start=button.dataset.start;
   if(!isISO(start)||!window.confirm("Удалить эту запись о цикле?"))return;
   const data=historyStore();
   data.records=data.records.filter(r=>r.start!==start);
   saveStore(data);
   back();
 }
}
function mount(){
 const root=$("#alma-cycle-root");
 if(!root)return false;
 const next=root.querySelector(".phone-scene");
 if(!next||!next.querySelector(".cycle-hero"))return false;
 scene=next;
 scene.classList.add("alma-history-scroll");
 if(!holder){
   holder=document.createElement("section");
   holder.className="alma-cycle-insights";
   holder.id="alma-cycle-insights";
   holder.setAttribute("aria-label","Статистика и история менструальных циклов");
   holder.addEventListener("click",onClick);
   holder.addEventListener("submit",save);
 }
 if(holder.parentElement!==scene)scene.appendChild(holder);
 if(!holder.innerHTML)render();
 return true;
}
let attempts=0;
const interval=setInterval(()=>{
 if(!mount()&&attempts++>100){clearInterval(interval);return}
 if(!holder)return;
 if(view==="edit")return; // Do not erase an in-progress entry.
 const next=signature();
 if(next!==lastSignature)render();
 else colorSync();
},1200);
const obs=new MutationObserver(()=>{if(scene&&!holder?.isConnected)mount()});
const root=$("#alma-cycle-root");
if(root)obs.observe(root,{childList:true,subtree:false});
window.addEventListener("storage",event=>{if([KEY,LEGACY,HISTORY].includes(event.key)&&view!=="edit")render()});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&view!=="edit")render()});
mount();
window.SETKA_ALMA_HISTORY={snapshot:()=>{const m=model();return{configured:m.orig.configured,entries:m.entries.map(r=>({start:r.start,length:r.length,periodLength:r.periodLength,current:r.current})),completed:m.complete.length,average:m.avgCycle}},refresh:render};
})();