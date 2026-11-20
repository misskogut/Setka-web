/* SETKA ALMA lotus port — standalone experiment.
   Geometry, flower states, pollen and continuous dial are based on
   misskogut/Alma components/cycle-hero.tsx (original ALMA source).
   No writes to SETKA, ALMA or research databases. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const root=$("alHero"), dial=$("cycleDial"), group=$("dateNodes");
if(!root||!dial||!group)return;
const DAY=86400000, STEP=35, today=localToday(), KEY="setka-cycle-lotus-lab-v1";
const STAGES={
  menstruation:{key:"menstruation",color:"#ff435f",petals:1},
  low:{key:"low",color:"#4fd39a",petals:3},
  follicular:{key:"follicular",color:"#48a8ff",petals:5},
  ovulation:{key:"ovulation",color:"#c45cff",petals:7}
};
const LOTUS_PETAL_PATH="M190 27 C159 64 141 103 142 138 C143 172 166 200 190 200 C214 200 237 172 238 138 C239 103 221 64 190 27Z";
const PETALS=[
  {layer:"outer",side:-1,cls:"outer left"},
  {layer:"outer",side:1,cls:"outer right"},
  {layer:"middle",side:-1,cls:"middle left"},
  {layer:"middle",side:1,cls:"middle right"},
  {layer:"inner",side:-1,cls:"inner left"},
  {layer:"inner",side:1,cls:"inner right"},
  {layer:"center",side:0,cls:"lotus-drop center"}
];
const stored={cycleLength:28,periods:[]};
try {
  const prior=JSON.parse(localStorage.getItem(KEY)||"null");
  if(prior){
    // Reuse the first experimental edition's records too.
    const entries=Array.isArray(prior.periods)?prior.periods:Array.isArray(prior.records)?prior.records:[];
    stored.cycleLength=normalizeLength(prior.cycleLength??prior.length);
    stored.periods=entries.filter(x=>x&&valid(x.start)&&x.start<=today&&(!x.end||valid(x.end)&&x.end>=x.start)).map(x=>({id:String(x.id||x.start),start:x.start,end:x.end||""})).sort((a,b)=>a.start.localeCompare(b.start));
  }
}catch(_){}
function normalizeLength(x){const n=Number(x);return Number.isInteger(n)&&n>=15&&n<=60?n:28}
function fromIso(s){return new Date(s+"T12:00:00.000Z")}
function toIso(d){return d.toISOString().slice(0,10)}
function valid(s){return typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(fromIso(s).getTime())&&toIso(fromIso(s))===s}
function localToday(){const x=new Date();return [x.getFullYear(),String(x.getMonth()+1).padStart(2,"0"),String(x.getDate()).padStart(2,"0")].join("-")}
function add(iso,n){const d=fromIso(iso);d.setUTCDate(d.getUTCDate()+n);return toIso(d)}
function between(a,b){return Math.round((fromIso(b)-fromIso(a))/DAY)}
function format(s,options){return new Intl.DateTimeFormat("ru-RU",Object.assign({timeZone:"UTC",day:"numeric",month:"long"},options||{})).format(fromIso(s))}
function save(){
  try{localStorage.setItem(KEY,JSON.stringify(stored));return true}catch(_){return false}
}
function profileDay(s){
  if(!stored.periods.length)return null;
  const len=stored.cycleLength;
  let anchor=stored.periods[0];
  for(const period of stored.periods){if(period.start<=s)anchor=period;else break}
  const elapsed=between(anchor.start,s);
  const cycleDay=((elapsed%len)+len)%len+1;
  const periodLength=anchor.end?Math.min(10,between(anchor.start,anchor.end)+1):5;
  const ovulation=Math.max(periodLength+5,len-14); // same baseline phase calculation as ALMA
  const marker=stored.periods.find(p=>p.start<=s&&p.end&&p.end>=s);
  let phase="luteal";
  if(marker||cycleDay<=periodLength)phase="menstruation";
  else if(cycleDay===ovulation)phase="ovulation";
  else if(cycleDay>=ovulation-4&&cycleDay<ovulation)phase="fertile";
  else if(cycleDay<ovulation)phase="follicular";
  const stage=phase==="menstruation"?"menstruation":phase==="ovulation"?"ovulation":phase==="fertile"||(phase==="luteal"&&cycleDay<=ovulation+2)?"follicular":"low";
  const predicted=s>today||elapsed<0||elapsed>=len;
  let next=add(anchor.start,(Math.floor(elapsed/len)+1)*len);
  for(const p of stored.periods){if(p.start>s&&p.start<next)next=p.start}
  return{cycleDay,phase,stage,predicted,next,ovulation};
}
function phaseLabel(phase){
  return{menstruation:"Менструация",follicular:"Фолликулярная фаза",fertile:"Фолликулярная фаза",ovulation:"Овуляция",luteal:"Лютеиновая фаза"}[phase];
}
function fertility(day){
  const d=day.cycleDay,o=day.ovulation;
  if(d===o)return ["Высокая вероятность беременности","Расчётный день овуляции"];
  if(d>=o-2&&d<o)return ["Высокая вероятность беременности","Расчётное фертильное окно"];
  if(d>=o-5&&d<o-2)return ["Вероятность беременности возможна","Расчётное фертильное окно"];
  if(d>=o+1&&d<=o+2)return ["Вероятность беременности ещё возможна","Первые дни после расчётной овуляции"];
  return ["Низкая вероятность беременности",d<=5?"Менструальные дни":"Вне расчётного фертильного окна"];
}
function countWord(n){if(n%10===1&&n%100!==11)return "день";if(n%10>=2&&n%10<=4&&!(n%100>=12&&n%100<=14))return "дня";return "дней"}
function timing(d){
  if(d.cycleDay<d.ovulation){const n=d.ovulation-d.cycleDay;return "Овуляция через "+n+" "+countWord(n)}
  if(d.cycleDay===d.ovulation)return "Расчётная овуляция сегодня";
  const n=stored.cycleLength-d.cycleDay+1;return "Месячные через "+n+" "+countWord(n);
}
function stageAt(s){const d=profileDay(s);return d?STAGES[d.stage]:STAGES.low}
function svg(tag,attrs){const e=document.createElementNS("http://www.w3.org/2000/svg",tag);for(const [k,v] of Object.entries(attrs||{}))e.setAttribute(k,String(v));return e}
const petalEls=PETALS.map(p=>{const e=svg("path",{d:LOTUS_PETAL_PATH,class:"lotus-petal "+p.cls});$("lotusBloom").appendChild(e);return e});
function makePollen(id,n,front){
  for(let i=0;i<n;i++){
    const x=front?126+((i*67)%132):42+((i*79)%296);
    const y=front?55+((i*47)%132):34+((i*53)%172);
    const r=front?.55+(i%4)*.31:.65+(i%5)*.34;
    const c=svg("circle",{cx:x,cy:y,r,class:"lotus-pollen pollen-"+((i+(front?1:0))%3)});
    c.style.setProperty("--pollen-delay",(-(i%(front?9:11))*(front?.81:.73))+"s");
    c.style.setProperty("--pollen-duration",((front?6.4:5.8)+(i%(front?6:7))*(front?.68:.72))+"s");
    c.style.setProperty("--pollen-x",((i*(front?13:17))%(front?19:25)-(front?9:12))+"px");
    c.style.setProperty("--pollen-y",(-10-(i%(front?5:6))*4)+"px");
    $(id).appendChild(c);
  }
}
const shine=svg("path",{class:"lotus-drop-shine",d:"M171 76 C159 101 155 127 160 151"});$("lotusBloom").appendChild(shine);
makePollen("pollenBack",34,false);
makePollen("pollenFront",18,true);
for(let i=0;i<42;i++)$("cosmicDust").appendChild(document.createElement("i"));
let position=0,selected=0,velocity=0,pointer=null,frame=null,prevFrame=0,mode="idle",lastTouch=0,paintRequested=false,ctx=null;
function arcPoint(offset){
  const normalized=Math.max(-1.08,Math.min(1.08,offset/6.4)),angle=normalized*1.14;
  return{x:190+Math.sin(angle)*187,y:27+(1-Math.cos(angle))*104}
}
function audioClick(n=1){
  try {
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return;
    if(!ctx)ctx=new Audio();
    if(ctx.state==="suspended")void ctx.resume();
    for(let i=0;i<Math.min(n,4);i++){
      const start=ctx.currentTime+i*.014,osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type="triangle";osc.frequency.setValueAtTime(920,start);osc.frequency.exponentialRampToValueAtTime(460,start+.026);
      gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.022,start+.002);gain.gain.exponentialRampToValueAtTime(.0001,start+.034);
      osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+.036)
    }
  }catch(_){}
}
function dateNodes(){
  const f=document.createDocumentFragment();
  for(let i=Math.floor(position)-7;i<=Math.floor(position)+8;i++){
    const offset=i-position;
    if(Math.abs(offset)>6.45)continue;
    const s=add(today,i),p=arcPoint(offset),st=stageAt(s);
    const node=svg("g",{class:"dial-date"+(i===Math.round(position)?" is-selected":"")+(s===today?" is-today":""),transform:"translate("+p.x+" "+p.y+")","data-index":i});
    node.style.setProperty("--dot-color",st.color);
    node.style.opacity=String(Math.max(.18,1-Math.abs(offset)/11));
    node.appendChild(svg("circle",{class:"dial-date-dot",r:profileDay(s)?.phase==="ovulation"?3.35:2.45}));
    const num=svg("text",{class:"dial-date-number",y:15,"text-anchor":"middle"});
    num.textContent=String(fromIso(s).getUTCDate());node.appendChild(num);
    if(fromIso(s).getUTCDate()===1){const month=svg("text",{class:"dial-date-month",y:24,"text-anchor":"middle"});month.textContent=format(s,{month:"short"}).replace(".","");node.appendChild(month)}
    f.appendChild(node);
  }
  group.replaceChildren(f);
}
function animatePetals(stage){
  root.className="cycle-hero lotus-stage-"+stage.key+(pointer||mode!=="idle"?" is-cycle-scrubbing":"");
  root.style.setProperty("--cycle-color",stage.color);
  PETALS.forEach((petal,i)=>{
    let angle=0;
    if(petal.layer!=="center"&&stage.petals!==1){
      if(stage.petals===3)angle=27*petal.side;
      else if(stage.petals===5)angle=(petal.layer==="inner"?27:52)*petal.side;
      else angle=(petal.layer==="inner"?27:petal.layer==="middle"?52:76)*petal.side;
    }
    petalEls[i].style.setProperty("--petal-angle",angle+"deg");
  });
  $("petalCount").textContent=stage.petals+" "+(stage.petals===1?"лепесток":stage.petals===3?"лепестка":"лепестков");
}
function preview(){
  const index=Math.round(position),s=add(today,index),m=profileDay(s),stage=m?STAGES[m.stage]:STAGES.low;
  const last=selected;selected=index;
  if(index!==last&&pointer)audioClick(Math.min(4,Math.abs(index-last)));
  animatePetals(stage);
  $("cycleStage").textContent=m?timing(m):"Добавь дату последней менструации";
  $("cyclePhase").textContent=m?phaseLabel(m.phase):"Мой цикл";
  $("lotusDay").textContent=m?String(m.cycleDay):"—";
  $("cycleTitle").textContent=m?fertility(m)[0]:"Лотос твоего цикла";
  $("cycleDescription").textContent=m?fertility(m)[1]+". Календарный ориентир, не определяет безопасные дни.":"Отметь начало и продолжительность менструации, чтобы открыть календарный прогноз.";
  $("returnToday").hidden=index===0;
  $("selectedDate").textContent=format(s,{day:"numeric",month:"long",year:"numeric"});
}
function paint(){paintRequested=false;dateNodes();preview()}
function schedulePaint(){if(paintRequested)return;paintRequested=true;requestAnimationFrame(paint)}
function stop(){if(frame!=null)cancelAnimationFrame(frame);frame=null;prevFrame=0;mode="idle";velocity=0}
function settle(){position=Math.round(position);velocity=0;mode="idle";frame=null;root.classList.remove("is-cycle-scrubbing");schedulePaint()}
function step(t){
  const dt=Math.max(1,Math.min(34,t-(prevFrame||t)));prevFrame=t;
  if(mode==="inertia"){
    position+=velocity*dt;
    velocity*=Math.exp(-.0065*dt);
    if(Math.abs(velocity)<=.00072)mode="snap";
  }else if(mode==="snap"){
    const distance=Math.round(position)-position;
    position+=distance*(1-Math.exp(-dt*.028));
    if(Math.abs(distance)<.0018){settle();return}
  }else{return}
  schedulePaint();frame=requestAnimationFrame(step)
}
function animateToSettle(){if(Math.abs(velocity)>=.0024)mode="inertia";else mode="snap";prevFrame=0;frame=requestAnimationFrame(step)}
function jump(index){stop();position=index;selected=index;schedulePaint()}
dial.addEventListener("pointerdown",e=>{
  if(e.pointerType==="mouse"&&e.button!==0)return;
  e.preventDefault();stop();pointer={id:e.pointerId,x:e.clientX,time:e.timeStamp,velocity:0,downX:e.clientX,node:e.target.closest?.(".dial-date")?.dataset.index,moved:false};
  audioClick(1);
  try{dial.setPointerCapture(e.pointerId)}catch(_){}
  root.classList.add("is-cycle-scrubbing");
});
dial.addEventListener("pointermove",e=>{
  if(!pointer||pointer.id!==e.pointerId)return;
  e.preventDefault();
  const delta=e.clientX-pointer.x,dt=Math.max(1,e.timeStamp-pointer.time);
  position-=delta/STEP;
  const newVelocity=-(delta/STEP)/dt;
  pointer.velocity=pointer.velocity*.28+newVelocity*.72;
  if(Math.abs(e.clientX-pointer.downX)>6)pointer.moved=true;
  pointer.x=e.clientX;pointer.time=e.timeStamp;lastTouch=e.timeStamp;
  schedulePaint();
});
dial.addEventListener("pointerup",e=>{
  if(!pointer||pointer.id!==e.pointerId)return;
  const p=pointer;pointer=null;
  if(!p.moved&&p.node!=null){jump(Number(p.node));root.classList.remove("is-cycle-scrubbing");return}
  velocity=p.velocity;animateToSettle();
});
dial.addEventListener("pointercancel",()=>{pointer=null;velocity=0;stop();mode="snap";frame=requestAnimationFrame(step)});
dial.addEventListener("wheel",e=>{e.preventDefault();jump(Math.round(position)+Math.sign(e.deltaY||e.deltaX))},{passive:false});
dial.addEventListener("keydown",e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();audioClick();jump(Math.round(position)+(e.key==="ArrowRight"?1:-1))}});
$("prevCycle").addEventListener("click",()=>jump(Math.round(position)-stored.cycleLength));
$("nextCycle").addEventListener("click",()=>jump(Math.round(position)+stored.cycleLength));
$("returnToday").addEventListener("click",()=>jump(0));
const overlay=$("overlay"),start=$("start"),end=$("end"),length=$("length"),message=$("notice"),form=$("form");
let editing=null;
function listHistory(){
  const holder=$("history");holder.replaceChildren();
  if(!stored.periods.length){const empty=document.createElement("div");empty.className="empty";empty.textContent="Отметок пока нет";holder.appendChild(empty);return}
  for(const p of stored.periods.slice().reverse()){
    const row=document.createElement("div");row.className="history-row";
    const label=document.createElement("span");label.textContent=format(p.start)+(p.end?" — "+format(p.end):" · окончание не отмечено");
    const actions=document.createElement("span");
    const edit=document.createElement("button");edit.type="button";edit.textContent="Изменить";edit.addEventListener("click",()=>openSheet(p));
    const remove=document.createElement("button");remove.type="button";remove.textContent="×";remove.setAttribute("aria-label","Удалить "+p.start);
    remove.addEventListener("click",()=>{if(confirm("Удалить запись?")){stored.periods=stored.periods.filter(x=>x.id!==p.id);save();listHistory();schedulePaint()}});
    actions.append(edit,remove);row.append(label,actions);holder.appendChild(row);
  }
}
function openSheet(p){
  editing=p?p.id:null;start.value=p?p.start:add(today,Math.min(0,Math.round(position)));end.value=p?p.end:"";
  start.max=today;end.max=today;end.min=start.value;length.value=String(stored.cycleLength);
  $("save").textContent=p?"Сохранить изменения":"Сохранить запись";message.textContent="";overlay.classList.add("open");listHistory();
}
function closeSheet(){overlay.classList.remove("open");message.textContent=""}
$("lotusOpen").addEventListener("click",()=>openSheet(null));
$("record").addEventListener("click",()=>openSheet(null));
$("recordBottom").addEventListener("click",()=>openSheet(null));
$("closeSheet").addEventListener("click",closeSheet);
overlay.addEventListener("pointerdown",e=>{if(e.target===overlay)closeSheet()});
start.addEventListener("change",()=>{end.min=start.value;if(end.value&&end.value<start.value)end.value=""});
form.addEventListener("submit",e=>{
  e.preventDefault();
  const s=start.value,t=end.value,n=Number(length.value);
  if(!valid(s)||s>today||(t&&(!valid(t)||t<s||t>today))||!Number.isInteger(n)||n<15||n>60){message.textContent="Проверь даты и продолжительность цикла.";return}
  if(stored.periods.some(x=>x.start===s&&x.id!==editing)){message.textContent="Такая дата начала уже записана.";return}
  const next=stored.periods.filter(x=>x.id!==editing);
  next.push({id:editing||Date.now()+"-"+s,start:s,end:t});
  next.sort((a,b)=>a.start.localeCompare(b.start));
  stored.periods=next;stored.cycleLength=n;
  const persisted=save();
  jump(between(today,s));openSheet(null);
  message.textContent=persisted?"Запись сохранена в этом браузере.":"Браузер заблокировал сохранение: запись останется только до перезагрузки.";
});
window.addEventListener("keydown",e=>{if(e.key==="Escape"&&overlay.classList.contains("open"))closeSheet()});
$("selectedDate").textContent=format(today,{day:"numeric",month:"long",year:"numeric"});
schedulePaint();
window.SETKA_CYCLE_LAB=Object.assign(window.SETKA_CYCLE_LAB||{},{selectDate:s=>{if(valid(s))jump(between(today,s))},getRecords:()=>stored.periods.slice(),getModel:profileDay});
})();