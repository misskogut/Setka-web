(()=>{
"use strict";
if(window.SetkaGestureBindingsV1)return;
const registry=window.SetkaPatternRegistryV1;
const storage=window.SetkaDataScopeV1?.storage||localStorage;
const storageKey="setka-gestures:personal:v1";
let saved=Object.create(null);
try{const data=JSON.parse(storage.getItem(storageKey)||"{}");if(data&&typeof data==="object"&&!Array.isArray(data))saved=Object.assign(Object.create(null),data)}catch(_){}
const canonical=["1:left:v","1:right:v","1:top:h","1:bottom:h","2:left:v","2:right:v","2:top:h","2:bottom:h","pinch","none"];
const labels={left:"Слева",right:"Справа",top:"Сверху",bottom:"Снизу",any:"Весь экран"};
function native(row){
 const g=String(row[5]||""),n=row[6];
 if(!n||g==="Тап")return "none";
 if(g.includes("Пинч"))return "pinch";
 const z=g.includes("Слева")?"left":g.includes("Справа")?"right":g.includes("Сверху")?"top":g.includes("Снизу")?"bottom":"any";
 const axis=/[↑↓]/.test(g)?"v":/[←→]/.test(g)?"h":null;
 return axis&&(n===1||n===2)?n+":"+z+":"+axis:"none";
}
const cache=new Map();
window.addEventListener("setka:registry-changed",()=>cache.clear());
function plan(id){
 const old=cache.get(id);if(old)return old;
 const rows=registry?.controls?.(id)||[];
 const defaults=Object.create(null),mapping=Object.create(null),over=saved[id]&&typeof saved[id]==="object"?saved[id]:{};
 const allowed=new Set([...canonical,...rows.map(native)]);
 for(const row of rows){const k=row[1];defaults[k]=native(row);mapping[k]=allowed.has(over[k])?over[k]:defaults[k]}
 const custom=rows.some(row=>mapping[row[1]]!==defaults[row[1]]);
 const p={rows,defaults,mapping,custom,options:[...canonical.slice(0,-1),...Array.from(allowed).filter(g=>!canonical.includes(g)),"none"]};
 cache.set(id,p);return p;
}
function persist(){try{storage.setItem(storageKey,JSON.stringify(saved))}catch(_){}}
function assign(id,k,g){
 const p=plan(id);if(!Object.hasOwn(p.defaults,k)||!p.options.includes(g))return false;
 const next={...p.mapping};
 if(g!=="none")for(const other of Object.keys(next))if(other!==k&&next[other]===g)next[other]="none";
 next[k]=g;
 const delta=Object.create(null);for(const name of Object.keys(next))if(next[name]!==p.defaults[name])delta[name]=next[name];
 if(Object.keys(delta).length)saved[id]=delta;else delete saved[id];
 cache.delete(id);persist();return true;
}
function reset(id){delete saved[id];cache.delete(id);persist()}
function snapshot(id,config){if(!saved[id])return null;const p=plan(id);if(!p.custom)return null;const values=Object.create(null);for(const row of p.rows)values[row[1]]=config[row[1]];return {p,values}}
function zoneAt(x,y,w,h,axis){
 // Corners are resolved by the movement axis, not by arbitrary edge priority.
 if(axis==="v")return x<=w*.25?"left":x>=w*.75?"right":"center";
 return y<=h*.25?"top":y>=h*.75?"bottom":"center";
}
let motion=null;
function clearMotion(){motion=null}
for(const event of ["setka:gesture-start","setka:gesture-end","setka:pattern-open","setka:view"])window.addEventListener(event,clearMotion);
function apply(id,config,snap,input){
 if(!snap)return config;
 const {p,values}=snap,{x,y,dx,dy,sx,sy,width:w,height:h,fingers,pinch}=input;
 // Native pointer physics and transient fields remain untouched. Only
 // declared numeric swipe controls and explicitly customized controls are routed here.
 const result={...config};
 for(const row of p.rows){const k=row[1];if(p.defaults[k]!=="none"||p.mapping[k]!==p.defaults[k])result[k]=values[k]}
 if(!(w>0&&h>0)||!(fingers===1||fingers===2))return result;
 if(!motion||motion.id!==id||motion.fingers!==fingers){
   motion={id,fingers,sx,sy,dx:0,dy:0,pinch:0,mode:null,key:null,amount:0,base:0};
 }
 const m=motion;
 m.dx+=dx||0;m.dy+=dy||0;
 const log=Number.isFinite(pinch)&&pinch>0?Math.log(pinch):0;
 m.pinch+=log;
 const axis=Math.abs(m.dy)>Math.abs(m.dx)?"v":"h";
 // Pinching and parallel two-finger swipes are exclusive within one maneuver.
 if(!m.mode){
   const travel=Math.hypot(m.dx,m.dy),spread=Math.abs(m.pinch)*Math.min(w,h);
   if(fingers===2&&p.rows.some(r=>p.mapping[r[1]]==="pinch")&&spread>=5&&spread>travel*.8)m.mode="pinch";
   else if(travel>=5)m.mode=axis;
   else return result;
   const zone=zoneAt(m.sx,m.sy,w,h,m.mode);
   const exact=fingers+":"+zone+":"+m.mode;
   const global=fingers+":any:"+m.mode;
   const legacy=fingers+":"+((m.sy<=h*.25)?"top":(m.sy>=h*.75)?"bottom":zone)+":"+m.mode;
   const target=m.mode==="pinch"?"pinch":p.rows.some(r=>p.mapping[r[1]]===exact)?exact:p.rows.some(r=>p.mapping[r[1]]===legacy)?legacy:global;
   const row=p.rows.find(r=>p.mapping[r[1]]===target);
   if(row){m.key=row[1];m.base=Number(values[m.key]);m.amount=m.mode==="pinch"?m.pinch:m.mode==="v"?-m.dy:m.dx}
 }else if(m.key)m.amount+=m.mode==="pinch"?log:m.mode==="v"?-(dy||0):(dx||0);
 if(!m.key||!Number.isFinite(m.base))return result;
 const row=p.rows.find(r=>r[1]===m.key);if(!row)return result;
 const [,k,min,max,step]=row;
 const fraction=m.mode==="pinch"?m.amount*0.65:m.amount/(m.mode==="v"?h:w);
 const raw=m.base+fraction*(max-min);
 const next=Math.min(max,Math.max(min,min+Math.round((raw-min)/step)*step));
 result[k]=Number(next.toFixed(10));
 return result;
}
function label(g){if(g==="none")return "Без жеста";if(g==="pinch")return "Щипок";return labels[g.split(":")[1]]||"Весь экран"}
window.SetkaGestureBindingsV1={plan,assign,reset,snapshot,apply,clearMotion,label};
})();

(()=>{
"use strict";
const App=window.SetkaApp,game=document.getElementById("gameScreen"),key=document.getElementById("instructionsButton");
if(!App||!game||!key||!App.setConfigPatch)return;
// Control definitions live only in the shared pattern registry.
const registry=window.SetkaPatternRegistryV1;
const maps=new Proxy({}, {get(_target,patternId){return registry?.controls?.(patternId)||[];}});
const style=document.createElement("style");
style.textContent="\n#st34KeyBackdrop{position:absolute;inset:0;background:rgba(0,0,0,.48);display:none;z-index:950;pointer-events:auto}\n#st34KeyBackdrop.open{display:block}\n#st34KeyBackdrop{transition:background-color .12s ease}\n#st34KeyBackdrop.sk-adjusting{background:rgba(0,0,0,0)}\n#st34KeySheet{position:absolute;left:0;right:0;bottom:0;z-index:951;height:min(82%,720px);background:#101010;border:1px solid #424242;border-bottom:none;border-radius:25px 25px 0 0;display:none;flex-direction:column;pointer-events:auto;color:#fff;font-family:-apple-system,BlinkMacSystemFont,\"SF Pro Display\",Arial,sans-serif;box-shadow:0 -12px 45px #0008}\n#st34KeySheet.open{display:flex}\n#st34KeySheet{transition:background-color .12s ease,border-color .12s ease,box-shadow .12s ease}\n#st34KeySheet.sk-adjusting{background:rgba(16,16,16,.015);border-color:transparent;box-shadow:none}\n#st34KeySheet .sk-head,#st34KeySheet .sk-actions,#st34KeySheet .sk-section,#st34KeySheet .sk-setting{transition:opacity .12s ease}\n#st34KeySheet.sk-adjusting .sk-head,#st34KeySheet.sk-adjusting .sk-actions,#st34KeySheet.sk-adjusting .sk-section{opacity:.015;pointer-events:none}\n#st34KeySheet.sk-adjusting .sk-setting{opacity:.015;pointer-events:none}\n#st34KeySheet.sk-adjusting .sk-setting.sk-active{opacity:.32;pointer-events:auto}\n#st34KeySheet *{box-sizing:border-box}\n#st34KeySheet button,#st34KeySheet input{font:inherit}\n#st34KeySheet .sk-head{padding:12px 19px 15px;border-bottom:1px solid #2a2a2a;flex:0 0 auto}\n#st34KeySheet .sk-grip{width:37px;height:4px;background:#555;border-radius:3px;margin:0 auto 16px}\n#st34KeySheet .sk-row{display:flex;align-items:center;gap:12px;justify-content:space-between}\n#st34KeySheet .sk-kicker{font-size:9px;letter-spacing:1.8px;color:#888;margin-bottom:6px}\n#st34KeySheet .sk-title{font-size:21px;font-weight:650;line-height:1.2}\n#st34KeySheet .sk-description{font-size:12px;line-height:1.5;color:#aaa;margin:10px 0 0}\n#st34KeySheet .sk-close{width:35px;height:35px;border:1px solid #444;border-radius:50%;background:transparent;color:#fff;font-size:20px;display:grid;place-items:center;padding:0;flex-shrink:0}\n#st34KeySheet .sk-scroll{overflow-y:auto;overscroll-behavior:contain;flex:1;min-height:0;padding:10px 19px 20px}\n#st34KeySheet .sk-section{font-size:10px;font-weight:650;letter-spacing:1.2px;color:#ccc;margin:17px 0 9px}\n#st34KeySheet .sk-setting{border-bottom:1px solid #2b2b2b;padding:10px 0}\n#st34KeySheet .sk-setting-row{display:flex;align-items:center;gap:9px}\n#st34KeySheet .sk-setting-row.sk-slider-only{gap:0}\n#st34KeySheet .sk-setting-row.sk-slider-only .sk-label{font-size:13px;font-weight:500}\n#st34KeySheet .sk-gesture{min-width:91px;flex:0 0 91px;border:1px solid #333;background:#242424;border-radius:8px;text-align:center;padding:7px 5px;font-size:10px;white-space:normal;line-height:1.3;color:#ddd}\n#st34KeySheet .sk-label{flex:1;min-width:0;font-size:12px;color:#e5e5e5}\n#st34KeySheet .sk-help-text{font-size:11px;color:#a9a9a9;line-height:1.4;flex:1}\n#st34KeySheet .sk-help-disclosure{border:1px solid #383838;border-radius:10px;padding:11px 13px;margin:18px 0 6px;background:#191919}\n#st34KeySheet .sk-help-disclosure summary{font-size:12px;line-height:1.5;font-weight:600;color:#e8e8e8;cursor:pointer}\n#st34KeySheet .sk-help-entry{padding:10px 0;border-bottom:1px solid #303030}\n#st34KeySheet .sk-help-entry:last-child{border-bottom:0}\n#st34KeySheet .sk-help-entry strong{display:block;font-size:12px;color:#f1f1f1}\n#st34KeySheet .sk-help-entry p{font-size:11px;color:#b6b6b6;line-height:1.5;margin:4px 0 0}\n#st34KeySheet .sk-range{width:100%;margin:12px 0 3px;accent-color:#fff;touch-action:auto}\n#st34KeySheet .sk-tap-add{width:100%;min-height:40px;margin:10px 0 3px;background:#f1f2f8;color:#111;border:0;border-radius:12px;font-size:12px;font-weight:650}\n#st34KeySheet .sk-actions{display:flex;gap:10px;border-top:1px solid #292929;padding:12px 18px max(18px,env(safe-area-inset-bottom,18px))}\n#st34KeySheet .sk-action{flex:1;border:1px solid #555;border-radius:14px;min-height:44px;background:transparent;color:#fff;font-size:12px;font-weight:600}\n#st34KeySheet .sk-action.primary{background:#fff;color:#000;border-color:#fff}\n#st34KeySheet .sk-close:focus-visible,#st34KeySheet button:focus-visible{outline:2px solid #fff;outline-offset:3px}\n";
style.textContent+=`
#st34KeySheet .sk-paired-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:15px;align-items:start}
#st34KeySheet .sk-paired-grid .sk-setting{min-width:0}
#st34KeySheet .sk-paired-grid .sk-setting-row.sk-slider-only .sk-label{font-size:11.5px;line-height:1.35;overflow-wrap:anywhere}
#st34KeySheet .sk-paired-grid .sk-range{margin-top:9px}
@media(max-width:340px){#st34KeySheet .sk-paired-grid{column-gap:9px}#st34KeySheet .sk-paired-grid .sk-setting-row.sk-slider-only .sk-label{font-size:11px}}
`;
style.textContent+="\n#st34KeySheet .sk-setting{padding:10px 0}\n#st34KeySheet .sk-label{display:block;font-size:13px;font-weight:500;line-height:1.4;margin-bottom:5px}\n#st34KeySheet .sk-setting-row.sk-bind-row{display:flex;align-items:center;gap:10px}\n#st34KeySheet .sk-bind-row .sk-range{flex:1;min-width:0;width:0;margin:0;height:28px}\n#st34KeySheet .sk-bind-btn{display:inline-flex;flex:0 0 auto;align-items:center;justify-content:center;gap:4px;min-height:30px;padding:4px 6px;border:1px solid #383838;border-radius:8px;background:#232323;color:#ddd;font-size:10px;white-space:nowrap}\n#st34KeySheet .sk-bind-btn[aria-expanded=true]{background:#3a3a3a}\n#st34KeySheet .sk-bind-btn svg,#st34KeySheet .sk-gesture-mark svg{width:15px;height:15px;flex:none}\n#st34KeySheet .sk-bind-btn svg:last-child{width:11px;height:11px}\n#st34KeySheet .sk-gesture-popup{background:#1a1a1a;border:1px solid #383838;border-radius:13px;padding:9px;margin:7px 0 2px}\n#st34KeySheet .sk-gesture-head{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#ddd;font-size:12px;font-weight:600;padding:2px 4px 8px}\n#st34KeySheet .sk-info{width:22px;height:22px;flex:none;border:1px solid #aaa;border-radius:50%;background:transparent;color:#eee;padding:0;display:grid;place-items:center;font:600 13px/1 system-ui}\n#st34KeySheet .sk-gesture-option{display:flex;width:100%;align-items:center;gap:8px;text-align:left;border:0;border-radius:7px;background:transparent;color:#eee;padding:6px 4px;min-height:30px;font-size:11px}\n#st34KeySheet .sk-gesture-option[aria-pressed=true]{background:#333}\n#st34KeySheet .sk-gesture-option:nth-child(6),#st34KeySheet .sk-gesture-option:nth-child(10){border-top:1px solid #333}\n#st34KeySheet .sk-gesture-mark{display:flex;align-items:center;gap:5px;min-width:104px;white-space:nowrap}\n#st34KeySheet .sk-gesture-used{flex:1;color:#aaa;font-size:10px;overflow-wrap:anywhere}\n#st34KeySheet .sk-gesture-check svg{width:14px;height:14px}\n#st34KeySheet .sk-gesture-sub{font-size:11px;font-weight:600;color:#ddd;margin:8px 3px}\n#st34KeySheet .sk-gesture-diagrams{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}\n#st34KeySheet .sk-gesture-diagrams div{text-align:center;color:#bbb;font-size:10px}\n#st34KeySheet .sk-gesture-diagrams svg{width:100%;max-width:64px;display:block;margin:0 auto 3px}\n#st34KeySheet .sk-pinch-help{display:flex;align-items:center;gap:12px;margin-top:10px;border-top:1px solid #333;padding-top:8px;font-size:12px}\n#st34KeySheet .sk-pinch-help svg{width:45px;height:68px;flex:none}\n#st34KeySheet .sk-pinch-help p,#st34KeySheet .sk-gesture-note{color:#aaa;font-size:11px;line-height:1.45;margin:5px 0}\n";
style.textContent+="\n#st34KeySheet .sk-paired-grid{column-gap:12px;align-items:stretch}\n#st34KeySheet .sk-paired-grid .sk-setting{display:flex;flex-direction:column;justify-content:flex-end;padding:9px 0;min-width:0}\n#st34KeySheet .sk-paired-grid .sk-label{font-size:11.5px;line-height:1.35;flex:1;overflow-wrap:anywhere;margin-bottom:5px}\n#st34KeySheet .sk-paired-grid .sk-bind-row{gap:5px}\n#st34KeySheet .sk-paired-grid .sk-bind-row .sk-range{flex:1 1 0;min-width:0;width:0;margin:0;height:28px}\n#st34KeySheet .sk-paired-grid .sk-bind-btn{font-size:9.5px;gap:2px;padding:3px 4px;min-height:28px}\n#st34KeySheet .sk-paired-grid .sk-bind-btn svg{width:12px;height:12px}\n#st34KeySheet .sk-paired-grid .sk-bind-btn svg:last-child{display:none}\n#st34KeySheet .sk-paired-grid .sk-gesture-popup{grid-column:1/-1;min-width:0;margin:2px 0 4px}\n#st34KeySheet.sk-adjusting .sk-paired-grid .sk-gesture-popup{opacity:.015;pointer-events:none}\n@media(max-width:340px){\n #st34KeySheet .sk-paired-grid{column-gap:8px}\n #st34KeySheet .sk-paired-grid .sk-bind-row{gap:3px}\n #st34KeySheet .sk-paired-grid .sk-bind-btn{padding:3px;gap:1px;font-size:9px}\n}\n";
document.head.appendChild(style);
const backdrop=document.createElement("div");backdrop.id="st34KeyBackdrop";
const sheet=document.createElement("section");sheet.id="st34KeySheet";
sheet.setAttribute("aria-label","Управление паттерном");
sheet.innerHTML='<div class="sk-head"><button type="button" class="sk-grip" aria-label="Изменить высоту настроек"></button><div class="sk-row"><div><div class="sk-title">Настройки</div></div><button class="sk-close" type="button" aria-label="Закрыть настройки">×</button></div></div><div class="sk-scroll"></div><div class="sk-actions"><button class="sk-action" type="button" data-action="reset">Сбросить</button><button class="sk-action primary" type="button" data-action="close">Готово</button></div>';
game.querySelector(".game-ui")?.append(backdrop,sheet);
window.SetkaPanelResizeV1?.attach(sheet,{handle:sheet.querySelector(".sk-grip"),minHeight:240});
const close=()=>{closeGesture();endSliderDrag();sheet.classList.remove("open");backdrop.classList.remove("open");key.setAttribute("aria-expanded","false")};
const open=()=>{if(sheet.classList.contains("open"))return close();rebuild();sheet.classList.add("open");backdrop.classList.add("open");key.setAttribute("aria-expanded","true")};
let currentPattern=null,entries=[],activePointerId=null;
function endSliderDrag(){
 activePointerId=null;sheet.classList.remove("sk-adjusting");backdrop.classList.remove("sk-adjusting");
 sheet.querySelector(".sk-setting.sk-active")?.classList.remove("sk-active");
}
function finishSliderDrag(e){if(activePointerId!==null&&(!e||e.pointerId===activePointerId))endSliderDrag()}
window.addEventListener("pointerup",finishSliderDrag,true);
window.addEventListener("pointercancel",finishSliderDrag,true);
window.addEventListener("blur",endSliderDrag);
document.addEventListener("visibilitychange",()=>{if(document.hidden)endSliderDrag()});
// Whole-number accessibility feedback without rounding the actual setting.
const percent=(value,min,max)=>String(Math.round(100*(Number(value)-min)/Math.max(.000000001,max-min)))+"%";

const bindings=window.SetkaGestureBindingsV1;
let openedGesture=null,gesturePopup=null;
function gestureParts(g){
 if(g==="none")return {f:0,axis:"none",zone:"none"};
 if(g==="pinch")return {f:2,axis:"pinch",zone:"center"};
 const [f,zone,axis]=g.split(":");return {f:Number(f),axis,zone};
}
function handSvg(f){
 const path=f===1?"M9 12V4a2 2 0 0 1 4 0v7l1-2q2-1 3 2 3-1 4 3v2q0 6-6 6h-2q-4 0-6-4l-3-5q-1-3 2-2l3 3":"M9 12 6 4Q5 1 8 2l5 9 1-9q3-2 4 1v10q4 0 4 4-1 5-7 5h-2q-4 0-6-5l-2-4q-1-3 2-2z";
 return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="'+path+'"/></svg>';
}
function arrowSvg(axis){
 const d=axis==="v"?"M12 3v18m-4-14 4-4 4 4m-8 10 4 4 4-4":axis==="h"?"M3 12h18m-14-4-4 4 4 4m10-8 4 4-4 4":axis==="pinch"?"M4 9V4h5M4 4l6 6m10 5v5h-5m5 0-6-6":"M5 12h14";
 return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="'+d+'"/></svg>';
}
const chev='<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m4 6 4 4 4-4"/></svg>';
function gestureMarkup(g,chevron=false){
 const {f,axis}=gestureParts(g);
 return (f?handSvg(f)+arrowSvg(axis):"")+'<span>'+bindings.label(g)+'</span>'+(chevron?chev:"");
}
function closeGesture(){if(gesturePopup)gesturePopup.remove();if(openedGesture)openedGesture.setAttribute("aria-expanded","false");openedGesture=null;gesturePopup=null}
function refreshGestureButtons(){
 const p=bindings.plan(currentPattern);
 for(const entry of entries)if(entry.gestureButton){const g=p.mapping[entry.k]||"none";entry.gestureButton.innerHTML=gestureMarkup(g,true);entry.gestureButton.setAttribute("aria-label",entry.label+": "+(g==="none"?"Без жеста":gestureParts(g).f+" пальца, "+bindings.label(g)))}
}
function gestureDiagram(g){
 const {f,axis,zone}=gestureParts(g);
 let x=36,y=54,strip="",arr="";
 if(zone==="left"||zone==="right"){
   x=zone==="left"?13:59;strip='<rect x="'+(x-6)+'" y="14" width="12" height="80" rx="5" fill="#353535"/>';
   arr='<path d="M'+x+' 22v64m-4-59 4-5 4 5m-8 54 4 5 4-5"/>';
 }else if(zone==="top"||zone==="bottom"){
   y=zone==="top"?13:95;strip='<rect x="14" y="'+(y-6)+'" width="44" height="12" rx="5" fill="#353535"/>';
   arr='<path d="M19 '+y+'h34m-29-4-5 4 5 4m24-8 5 4-5 4"/>';
 }else arr='<path d="M20 38l12 12m-12-5v-7h7m25 32L40 58m5 12h7v-7"/>';
 let dots="";
 for(let i=0;i<f;i++){const offset=(i-(f-1)/2)*13,px=x+(zone==="top"||zone==="bottom"||zone==="center"?offset:0),py=y+(zone==="left"||zone==="right"||zone==="center"?offset:0);dots+='<circle cx="'+px+'" cy="'+py+'" r="6" fill="#a0a0a0" opacity=".4"/><circle cx="'+px+'" cy="'+py+'" r="3.3" fill="#fff"/>'}
 return '<svg viewBox="0 0 72 110" aria-hidden="true"><rect x="5" y="3" width="62" height="104" rx="9" fill="#0b0b0b" stroke="#777"/>'+strip+'<g fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round">'+arr+'</g>'+dots+'</svg>';
}
function showGestureHelp(popup,showMenu){
 popup.replaceChildren();
 const head=document.createElement("div");head.className="sk-gesture-head";head.textContent="Как управлять сквишем";
 const back=document.createElement("button");back.type="button";back.className="sk-info";back.setAttribute("aria-label","К выбору жеста");back.textContent="×";back.onclick=showMenu;head.append(back);popup.append(head);
 for(const f of [1,2]){
   const heading=document.createElement("div");heading.className="sk-gesture-sub";heading.textContent=f===1?"Один палец":"Два пальца";popup.append(heading);
   const grid=document.createElement("div");grid.className="sk-gesture-diagrams";
   for(const [zone,axis] of [["left","v"],["right","v"],["top","h"],["bottom","h"]]){
     const g=f+":"+zone+":"+axis,cell=document.createElement("div");cell.innerHTML=gestureDiagram(g)+'<span>'+bindings.label(g)+'</span>';grid.append(cell);
   }
   popup.append(grid);
 }
 const pinch=document.createElement("div");pinch.className="sk-pinch-help";pinch.innerHTML=gestureDiagram("pinch")+'<div><strong>Щипок</strong><p>Сведите или разведите два пальца.</p></div>';popup.append(pinch);
 const note=document.createElement("p");note.className="sk-gesture-note";note.textContent="Точки — положение пальцев, стрелки — направление. Начинайте движение у нужного края экрана. Если выбран «Весь экран», двигайтесь в любом месте. Один жест — один параметр.";popup.append(note);
 const hints=registry?.get(currentPattern)?.gestureHints||[];
 if(hints.length){const h=document.createElement("div");h.className="sk-gesture-sub";h.textContent="Встроенные реакции сквиша";popup.append(h);for(const [name,detail] of hints){const n=document.createElement("p");n.className="sk-gesture-note";n.textContent=name+": "+detail;popup.append(n)}}
}
function toggleGesture(box,button,k){
 if(openedGesture===button){closeGesture();return}
 closeGesture();openedGesture=button;button.setAttribute("aria-expanded","true");
 const popup=document.createElement("div");popup.className="sk-gesture-popup";gesturePopup=popup;
 const parent=box.parentElement;
 if(parent?.classList.contains("sk-paired-grid")){
   const cells=Array.from(parent.children).filter(el=>el.classList.contains("sk-setting"));
   const index=cells.indexOf(box),end=cells[Math.min(cells.length-1,index+(index%2===0?1:0))]||box;
   end.after(popup);
 }else box.append(popup);
 function showMenu(){
   popup.replaceChildren();
   const head=document.createElement("div");head.className="sk-gesture-head";head.textContent="Назначить жест";
   const info=document.createElement("button");info.type="button";info.className="sk-info";info.setAttribute("aria-label","Инструкция по жестам");info.textContent="i";info.onclick=()=>showGestureHelp(popup,showMenu);head.append(info);popup.append(head);
   const p=bindings.plan(currentPattern);
   for(const g of p.options){
     const item=document.createElement("button");item.type="button";item.className="sk-gesture-option";
     const selected=p.mapping[k]===g;item.setAttribute("aria-pressed",String(selected));
     const mark=document.createElement("span");mark.className="sk-gesture-mark";mark.innerHTML=gestureMarkup(g);item.append(mark);
     const used=p.rows.find(row=>row[1]!==k&&p.mapping[row[1]]===g&&g!=="none");
     const note=document.createElement("span");note.className="sk-gesture-used";note.textContent=g==="none"?"Только бегунок":used?used[0]:"";item.append(note);
     if(selected){const check=document.createElement("span");check.className="sk-gesture-check";check.innerHTML='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m3 8 3 3 7-7"/></svg>';item.append(check)}
     item.onclick=()=>{bindings.assign(currentPattern,k,g);closeGesture();refreshGestureButtons()};popup.append(item);
   }
 }
 showMenu();
}

function rebuild(){
 closeGesture();endSliderDrag();
 const state=App.getState?.()||{},id=state.patternId;
 currentPattern=id;
 const list=sheet.querySelector(".sk-scroll");list.replaceChildren();entries=[];
 const paired=registry?.supports?.(id,"pairedSettings")===true;
 const controlContainer=paired?document.createElement("div"):list;
 if(paired){controlContainer.className="sk-paired-grid";list.append(controlContainer)}
 for(const [label,k,min,max,step,gesture,fingers,help] of maps[id]||[]){
   const kind=gesture==="Тап"?"tap":"slider";
   const box=document.createElement("div");box.className="sk-setting";
   const line=document.createElement("div");line.className="sk-setting-row sk-bind-row";
   const title=document.createElement("label");title.className="sk-label";title.textContent=label;
   const input=document.createElement("input");input.type="range";input.className="sk-range";
   input.min=min;input.max=max;input.step=step;input.value=state.config?.[k]??min;
   input.id="sk-live-"+k;title.htmlFor=input.id;input.setAttribute("aria-label",label);input.setAttribute("aria-valuetext",percent(input.value,min,max));
   if(typeof help==="string"&&help.trim())input.setAttribute("aria-description",help);
   input.addEventListener("pointerdown",e=>{
     if(activePointerId!==null||(e.pointerType==="mouse"&&e.button!==0))return;
     activePointerId=e.pointerId;box.classList.add("sk-active");
     sheet.classList.add("sk-adjusting");backdrop.classList.add("sk-adjusting");
   });
   input.addEventListener("input",()=>{const result=App.setConfigPatch({[k]:Number(input.value)});input.setAttribute("aria-valuetext",percent(result[k]??input.value,min,max))});
   const gestureButton=document.createElement("button");gestureButton.type="button";gestureButton.className="sk-bind-btn";
   gestureButton.setAttribute("aria-expanded","false");gestureButton.onclick=()=>toggleGesture(box,gestureButton,k);
   line.append(input,gestureButton);box.append(title,line);
   const buttonLabel=kind==="tap"?registry?.get(id)?.tapButtonLabel:null;
   if(buttonLabel){
     const add=document.createElement("button");add.type="button";
     add.className="sk-tap-add";add.textContent=buttonLabel;
     add.setAttribute("aria-label",buttonLabel);
     add.addEventListener("click",()=>{
       const c=App.getConfig?.()||{},current=Number(c[k]);
       App.setConfigPatch({[k]:Math.min(max,(Number.isFinite(current)?current:min)+step)});
       sync();
     });
     box.append(add);
   }
   controlContainer.append(box);
   entries.push({k,min,max,input,label,gestureButton});
 }
 // Optional explanations remain hidden until requested. The ordinary settings
 // rows stay strictly name + slider (one shared control UI for all modules).
 const explanations=(maps[id]||[]).filter(row=>typeof row[7]==="string"&&row[7].trim());
 if(explanations.length){
   const disclosure=document.createElement("details");disclosure.className="sk-help-disclosure";
   const summary=document.createElement("summary");summary.textContent="Что делают бегунки?";
   disclosure.append(summary);
   for(const row of explanations){
     const item=document.createElement("div");item.className="sk-help-entry";
     const title=document.createElement("strong");title.textContent=row[0];
     const text=document.createElement("p");text.textContent=row[7];
     item.append(title,text);disclosure.append(item);
   }
   list.append(disclosure);
 }
 refreshGestureButtons();
 sync();
}
function sync(){
 const state=App.getState?.()||{},c=state.config||{};
 if(currentPattern!==state.patternId){if(sheet.classList.contains("open"))rebuild();return}
 for(const {k,min,max,input} of entries){
   if(Number.isFinite(c[k])){if(document.activeElement!==input)input.value=c[k];input.setAttribute("aria-valuetext",percent(c[k],min,max))}
 }
}
key.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();open()},{capture:true});
backdrop.addEventListener("click",close);
sheet.querySelector(".sk-close").addEventListener("click",close);
sheet.querySelector('[data-action="close"]').addEventListener("click",close);
sheet.querySelector('[data-action="reset"]').addEventListener("click",()=>{
 const id=App.getState?.()?.patternId,initial=App.getPatternDefaults?.(id);
 if(initial)App.setConfigPatch(initial);
 bindings.reset(id);closeGesture();refreshGestureButtons();sync();
});
window.addEventListener("setka:view",e=>{if(e.detail?.view!=="game")close()});
window.addEventListener("setka:gesture-move",sync);
window.addEventListener("setka:color",sync);
window.addEventListener("setka:pattern-open",()=>{if(sheet.classList.contains("open"))rebuild()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&sheet.classList.contains("open")){e.preventDefault();if(gesturePopup)closeGesture();else close()}});
window.SetkaPatternKeyV1={open,close,status:()=>({open:sheet.classList.contains("open"),patternId:currentPattern,controls:entries.length})};
})();