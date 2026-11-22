(()=>{
"use strict";
/* Third, genuinely 3D typography face for the isolated SETKA + ALMA demo.
   The original Y-axis swipe and gameplay remain owned by their modules.
   Only a small top/bottom grip accepts vertical flips from another face.
   The logo face also accepts a vertical swipe anywhere on its card. */
const $=id=>document.getElementById(id);
const logo=$("setkaVerticalLogo");
const card=$("setkaVerticalLogoCard");
const lib=$("libraryScreen");
const app=$("app");
const cycle=$("setkaCycleBack");
const game=$("gameScreen");
const top=$("setkaVerticalGripTop");
const bottom=$("setkaVerticalGripBottom");
if(!logo||!card||!lib||!app||!cycle||!game||!top||!bottom)return;
if(window.SETKA_VERTICAL_LOGO_LAB)return;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const ease=t=>1-Math.pow(1-t,3);
const usable=()=>lib.classList.contains("active")&&!game.classList.contains("active");
const horizontalBusy=()=>document.body.classList.contains("cycle-flip-active")||document.body.classList.contains("cycle-busy");
const fromCycle=()=>window.SETKA_CYCLE_LAB?.getSide?.()==="cycle";
const currentSource=()=>origin==="cycle"?cycle:lib;
const edgeControls=[top,bottom];
let logoVisible=false,origin="setka",progress=0,direction=1,pointer=null;
let animating=false,raf=0,token=0;

function makeType(){
  for(const [id,value] of [["setkaVerticalTitleOne","СКВИШ"],["setkaVerticalTitleTwo","ДЛЯ МОЗГА"]]){
    const el=$(id);
    if(!el||el.children.length)return;
    // Fallback only: do not create stacked 3D DOM planes, which became
    // stretched purple bars at the card's 90-degree turn on iOS Safari.
    // Real depth belongs entirely to the rigid WebGL planet/logo model.
    const face=document.createElement("span");
    face.className="setka-vlogo-slice surface";
    face.textContent=value;
    face.setAttribute("aria-hidden","true");
    el.appendChild(face);
  }
}
makeType();

/* One rigid assembly. Planet and all 3D letters are permanently attached
   to the logo-side card at fixed model-space positions. Gesture controls
   change ONLY the card's vertical angle, not the object's individual axes. */
function renderSolid({angle=0,visible=logoVisible}={}){
  window.SETKA_SOLID_WORDMARK?.render({angle,visible});
}
function applyTilt(){/* No independent tilt: the globe is card-mounted. */}
function resetTilt(){/* Stable mounted pose at rest. */}

function setDocumentHash(value){
  try{
    const hash=value==="logo"?"#logo":value==="cycle"?"#cycle":"";
    history.replaceState(history.state,"",location.pathname+location.search+hash);
  }catch(_){}
}
function clear3D(){
  for(const el of [lib,cycle,logo]){
    el.style.removeProperty("transform");
    el.style.removeProperty("transform-origin");
    el.style.removeProperty("opacity");
    el.style.removeProperty("will-change");
    el.style.removeProperty("pointer-events");
  }
}
function rest(showLogo,{restoreHash=true}={}){
  cancel();
  logoVisible=!!showLogo;
  progress=logoVisible?1:0;
  document.body.classList.toggle("setka-vlogo-side",logoVisible);
  document.body.classList.remove("setka-vlogo-flip-active","setka-vlogo-busy");
  logo.hidden=!logoVisible;
  logo.inert=!logoVisible;
  clear3D();
  // Do NOT touch the other face or app visibility. The original horizontal
  // module owns them and keeps the calendar scroll/history exactly as it was.
  if(logoVisible){
    currentSource().style.visibility="hidden";
    logo.style.visibility="";
    resetTilt();
  }else{
    lib.style.removeProperty("visibility");
    cycle.style.removeProperty("visibility");
    logo.style.removeProperty("visibility");
  }
  renderSolid({angle:0,visible:logoVisible});
  if(restoreHash)setDocumentHash(logoVisible?"logo":origin);
}
function cancel(){
  token++;
  if(raf)cancelAnimationFrame(raf);
  raf=0;animating=false;
}
function startVisual(){
  logo.hidden=false;
  logo.inert=true;
  document.body.classList.add("setka-vlogo-flip-active");
  const source=currentSource();
  // The full-screen DOM planes must turn around the CENTER OF THE CARD,
  // not the middle of the phone viewport. The WebGL wordmark uses that
  // same card-centered origin, with all of its Z above the card surface.
  const plate=card.getBoundingClientRect();
  const pivotX=(plate.left+plate.right)/2,pivotY=(plate.top+plate.bottom)/2;
  for(const face of [source,logo]){
    const bounds=face.getBoundingClientRect();
    face.style.transformOrigin=(pivotX-bounds.left).toFixed(2)+"px "+
      (pivotY-bounds.top).toFixed(2)+"px";
  }
  source.style.visibility=logoVisible?"hidden":"visible";
  source.style.opacity=logoVisible?"0":"1";
  logo.style.visibility=logoVisible?"visible":"hidden";
  logo.style.opacity=logoVisible?"1":"0";
  renderSolid({visible:false});
}
function draw(v){
  const p=progress=clamp(v,0,1);
  const source=currentSource(),front=p<.5;
  source.style.visibility=front?"visible":"hidden";
  source.style.opacity=front?"1":"0";
  logo.style.visibility=front?"hidden":"visible";
  logo.style.opacity=front?"0":"1";
  source.style.transform="perspective(1450px) rotateX("+(-direction*180*p).toFixed(3)+"deg)";
  logo.style.transform="perspective(1450px) rotateX("+(direction*180*(1-p)).toFixed(3)+"deg)";
  // Keep the rigid globe + raised title rendered for the ENTIRE gesture.
  // WebGL's depth-only card plane hides only geometry physically BEHIND it.
  // Never switch the model off at 50%: that used to make the planet pop out.
  renderSolid({angle:direction*180*(1-p),visible:true});
}
function settle(toLogo){
  const end=toLogo?1:0;
  cancel();
  const start=progress,dist=Math.abs(end-start);
  if(dist<.001){rest(toLogo);return}
  animating=true;
  document.body.classList.add("setka-vlogo-busy");
  const myToken=token, duration=270+420*dist;
  let started=null;
  function frame(now){
    if(myToken!==token)return;
    if(!usable()){rest(false);return}
    if(started===null)started=now;
    const a=clamp((now-started)/duration,0,1);
    draw(start+(end-start)*ease(a));
    if(a<1)raf=requestAnimationFrame(frame);
    else{raf=0;animating=false;rest(toLogo)}
  }
  raf=requestAnimationFrame(frame);
}
function begin(e){
  if(!usable()||horizontalBusy()||animating||pointer)return;
  if(e.pointerType==="mouse"&&e.button!==0)return;
  if(!logoVisible&&e.currentTarget===card)return;
  origin=logoVisible?origin:(fromCycle()?"cycle":"setka");
  pointer={
    id:e.pointerId,startX:e.clientX,startY:e.clientY,
    fromLogo:logoVisible,gesture:false,rejected:false,
    isGrip:e.currentTarget===top||e.currentTarget===bottom
  };
  try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
}
function move(e){
  const p=pointer;
  if(!p||e.pointerId!==p.id)return;
  if(!usable()){pointer=null;rest(false);return}
  const dx=e.clientX-p.startX,dy=e.clientY-p.startY;
  if(!p.gesture&&!p.rejected){
    if(Math.abs(dx)>14&&Math.abs(dx)>Math.abs(dy)*1.3){p.rejected=true;return}
    if(Math.abs(dy)>11&&Math.abs(dy)>Math.abs(dx)*1.1){
      p.gesture=true;
      const fingerSign=dy>0?1:-1;
      // The visible face rotates in the same direction as the finger
      // when coming back, not mirror-reversed as on the old iOS bug.
      direction=p.fromLogo?-fingerSign:fingerSign;
      cancel();
      startVisual();
    }
  }
  if(p.rejected||!p.gesture){
    if(p.fromLogo&&Math.abs(dx)<22&&Math.abs(dy)<22){
      const rect=card.getBoundingClientRect();
      applyTilt((e.clientX-(rect.left+rect.width/2))/Math.max(1,rect.width/2),
                (e.clientY-(rect.top+rect.height/2))/Math.max(1,rect.height/2));
    }
    return;
  }
  e.preventDefault();
  const height=card.getBoundingClientRect().height||innerHeight;
  const distance=Math.max(250,Math.min(height*.69,630));
  const advance=Math.abs(dy)/distance;
  draw(p.fromLogo?1-advance:advance);
}
function end(e,cancelled){
  if(!pointer||pointer.id!==e.pointerId)return;
  const p=pointer;
  pointer=null;
  if(!usable()){rest(false);return}
  if(p.rejected){resetTilt();return}
  if(!p.gesture){
    // The two understated chevrons are also tappable for accessibility.
    if(p.isGrip&&!cancelled&&Math.abs(e.clientY-p.startY)<10){
      direction=e.currentTarget===top?-1:1;
      if(p.fromLogo)direction*=-1;
      startVisual();draw(p.fromLogo?1:0);settle(!p.fromLogo);
    }
    else resetTilt();
    return;
  }
  if(cancelled){settle(p.fromLogo);return}
  settle(progress>=.5);
}
function bind(el){
  el.addEventListener("pointerdown",begin);
  el.addEventListener("pointermove",move,{passive:false});
  el.addEventListener("pointerup",e=>end(e,false));
  el.addEventListener("pointercancel",e=>end(e,true));
  el.addEventListener("lostpointercapture",e=>end(e,true));
  if(el!==card)el.addEventListener("keydown",e=>{
    if((e.key==="Enter"||e.key===" ")&&usable()&&!animating&&!pointer){
      e.preventDefault();
      flip(!logoVisible);
    }
  });
}
for(const el of [...edgeControls,card])bind(el);
function syncAvailability(){
  const allowed=usable();
  document.body.classList.toggle("setka-vlogo-gameplay",!allowed);
  for(const el of edgeControls){
    el.hidden=!allowed;
    el.tabIndex=allowed?0:-1;
    el.setAttribute("aria-hidden",String(!allowed));
  }
  if(!allowed){
    pointer=null;
    rest(false,{restoreHash:false});
  }
}
function flip(toLogo){
  if(!usable()||horizontalBusy()||animating||pointer||logoVisible===!!toLogo)return false;
  if(!logoVisible)origin=fromCycle()?"cycle":"setka";
  direction=toLogo?-1:1;
  startVisual();
  draw(logoVisible?1:0);
  settle(!!toLogo);
  return true;
}
window.addEventListener("setka:view",syncAvailability);
new MutationObserver(syncAvailability).observe(lib,{attributes:true,attributeFilter:["class"]});
new MutationObserver(syncAvailability).observe(game,{attributes:true,attributeFilter:["class"]});
document.addEventListener("pointerdown",e=>{
  // If someone selects a dock tab while looking at the third face, do
  // not leave an invisible rotated page on the next screen.
  if(logoVisible&&e.target?.closest?.("#st34Nav button[data-p]")){
    rest(false,{restoreHash:false});
  }
},true);
window.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&logoVisible&&usable()){e.preventDefault();flip(false)}
});
window.addEventListener("pageshow",()=>{
  if(!usable())rest(false,{restoreHash:false});
});
origin=fromCycle()?"cycle":"setka";
rest(location.hash==="#logo"&&usable(),{restoreHash:false});
syncAvailability();
window.SETKA_VERTICAL_LOGO_LAB={
  flip,getSide:()=>logoVisible?"logo":window.SETKA_CYCLE_LAB?.getSide?.()||"setka",
  getAngle:()=>Math.round(180*progress),
  getState:()=>({logoVisible,origin,progress,animating,gameplayBlocked:!usable(),solid3D:!!window.SETKA_SOLID_WORDMARK}),
  reset:()=>rest(false)
};
})();