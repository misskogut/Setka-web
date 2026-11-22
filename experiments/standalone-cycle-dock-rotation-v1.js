(()=>{
"use strict";
/*
 * SETKA ↔ ALMA 3D dock glyphs, experimental page only.
 * The dock, its five buttons and their labels remain screen-fixed.
 * Each SVG is an extruded, two-sided object with actual Z-separated strokes.
 * Horizontal card gestures provide its exact signed Y angle; there is no
 * independent animation, easing, timer or pointer handler on the icons.
 */
if(window.SETKA_CYCLE_DOCK_ROTATION)return;
const dock=document.getElementById("st34Nav");
if(!dock)return;

const DEPTH_PX=9;
const DEPTH_SLICES=11;
const prepared=new WeakSet();
let lastAngle=0;

function cloneGraphic(svg){
  const copy=svg.cloneNode(true);
  copy.setAttribute("aria-hidden","true");
  copy.setAttribute("focusable","false");
  return copy;
}
function face(name,graphic){
  const el=document.createElement("span");
  el.className="setka-cycle-icon-face setka-cycle-icon-"+name;
  el.setAttribute("aria-hidden","true");
  el.appendChild(graphic);
  return el;
}
function prepare(){
  // Re-run only for genuinely new/replaced native buttons, not the same
  // five elements 60 times a second during the finger-driven card flip.
  for(const icon of dock.querySelectorAll(".st-dock-icon")){
    if(prepared.has(icon))continue;
    if(icon.querySelector(".setka-cycle-icon-front")){
      prepared.add(icon);
      continue;
    }
    const svg=icon.querySelector("svg");
    if(!svg)continue;
    const front=face("front",svg);
    const rear=face("rear",cloneGraphic(svg));
    icon.appendChild(front);
    for(let i=1;i<=DEPTH_SLICES;i++){
      const slice=document.createElement("span");
      slice.className="setka-cycle-icon-depth";
      slice.setAttribute("aria-hidden","true");
      const z=DEPTH_PX/2-DEPTH_PX*i/(DEPTH_SLICES+1);
      slice.style.setProperty("--setka-cycle-slice-z",z.toFixed(3)+"px");
      slice.appendChild(cloneGraphic(svg));
      icon.appendChild(slice);
    }
    icon.appendChild(rear);
    prepared.add(icon);
  }
}
function render(degrees){
  prepare();
  lastAngle=Number.isFinite(degrees)?degrees:0;
  dock.style.setProperty("--setka-cycle-dock-angle",lastAngle.toFixed(3)+"deg");
}
function rest(onCycle){render(onCycle?180:0)}

prepare();
window.SETKA_CYCLE_DOCK_ROTATION={
  render,rest,
  getAngle:()=>lastAngle,
  getGeometry:()=>({depthPx:DEPTH_PX,slices:DEPTH_SLICES})
};
})();