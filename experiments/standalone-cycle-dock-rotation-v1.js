(()=>{
"use strict";
/*
  The existing horizontal card controller calls this adapter with its exact
  signed Y angle on every pointer move and animation frame.
  Prefer the genuine WebGL XYZ meshes from objects-v2. If WebGL is unavailable,
  keep the original two-sided SVG orientation as an accessible fallback.
  The dock, labels and existing button handlers always stay untouched.
*/
if(window.SETKA_CYCLE_DOCK_ROTATION)return;
const dock=document.getElementById("st34Nav");
if(!dock)return;
const engine=window.SETKA_CYCLE_3D_MODELS;
const nativeFallback=new WeakSet();
let lastAngle=0;
function prepareFallback(){
 if(engine?.isLive?.())return;
 for(const icon of dock.querySelectorAll(".st-dock-icon")){
   if(nativeFallback.has(icon))continue;
   if(icon.querySelector(".setka-cycle-icon-front")){
     nativeFallback.add(icon);continue;
   }
   const graphic=icon.querySelector("svg");
   if(!graphic)continue;
   const front=document.createElement("span"),rear=document.createElement("span");
   front.className="setka-cycle-icon-face setka-cycle-icon-front";
   rear.className="setka-cycle-icon-face setka-cycle-icon-rear";
   front.setAttribute("aria-hidden","true");
   rear.setAttribute("aria-hidden","true");
   const twin=graphic.cloneNode(true);
   twin.setAttribute("aria-hidden","true");twin.setAttribute("focusable","false");
   front.appendChild(graphic);rear.appendChild(twin);
   icon.appendChild(front);icon.appendChild(rear);
   nativeFallback.add(icon);
 }
}
function render(degrees){
 lastAngle=Number.isFinite(degrees)?degrees:0;
 if(engine?.isLive?.()){
   engine.render(lastAngle);
 }else{
   prepareFallback();
   dock.style.setProperty("--setka-cycle-dock-angle",lastAngle.toFixed(3)+"deg");
 }
}
function rest(onCycle){render(onCycle?180:0)}
prepareFallback();
window.SETKA_CYCLE_DOCK_ROTATION={
 render,rest,getAngle:()=>lastAngle,
 getGeometry:()=>engine?.isLive?.()?engine.getInfo():({fallback:true})
};
})();