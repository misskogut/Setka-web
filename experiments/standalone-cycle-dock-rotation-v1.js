(()=>{
"use strict";
/* Horizontal SETKA <-> ALMA card turn: the navigation shell never moves.
   Only its five icon glyphs rotate rigidly, frame-for-frame with the card.
   Two HTML faces prevent mirrored icons after a full 180 degree turn.
   Isolated from the regular standalone-v34.html and vertical logo gesture. */
if(window.SETKA_CYCLE_DOCK_ROTATION)return;
const dock=document.getElementById("st34Nav");
if(!dock)return;
let lastAngle=0;
function prepare(){
  for(const icon of dock.querySelectorAll(".st-dock-icon")){
    if(icon.querySelector(".setka-cycle-icon-front"))continue;
    const graphic=icon.querySelector("svg");
    if(!graphic)continue;
    const front=document.createElement("span");
    const rear=document.createElement("span");
    front.className="setka-cycle-icon-face setka-cycle-icon-front";
    rear.className="setka-cycle-icon-face setka-cycle-icon-rear";
    front.setAttribute("aria-hidden","true");
    rear.setAttribute("aria-hidden","true");
    const twin=graphic.cloneNode(true);
    twin.setAttribute("aria-hidden","true");
    twin.setAttribute("focusable","false");
    front.appendChild(graphic);
    rear.appendChild(twin);
    icon.appendChild(front);
    icon.appendChild(rear);
  }
}
function render(degrees){
  prepare(); // In case native navigation recreated its buttons.
  lastAngle=Number.isFinite(degrees)?degrees:0;
  dock.style.setProperty("--setka-cycle-dock-angle",lastAngle.toFixed(3)+"deg");
}
function rest(onCycle){render(onCycle?180:0)}
prepare();
window.SETKA_CYCLE_DOCK_ROTATION={render,rest,getAngle:()=>lastAngle};
})();