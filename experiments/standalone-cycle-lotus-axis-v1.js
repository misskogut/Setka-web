(()=>{
"use strict";
/* SETKA / ALMA: 3D turn of the ORIGINAL calendar lotus.
 * ALMA's actual SVG is sampled for the moving visual; the live React lotus
 * remains untouched and interactive on the settled cycle face.
 *
 * Card rotates through 180 degrees around Y. Lotus has an independent Y
 * rotation phase of 90 -> 0 -> -90 degrees during the same progress.
 * At the card's edge (p=.5) it faces the viewer, but the card bisects it:
 * exactly one half of the image is covered, selected by swipe direction.
 * No second calendar, no copied user data and no modifications to ALMA.
 */
if(window.SETKA_CYCLE_LOTUS_AXIS)return;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const FULL=Math.PI;
function geometry(progress,direction=-1){
 const p=clamp(Number.isFinite(progress)?progress:0,0,1);
 const sign=direction>=0?1:-1;
 // World-space lotus yaw is opposed to the card's Y turn, front-facing at 90.
 const yaw=p===.5?0:sign*(90-180*p);
 // The visible slice grows from behind the physical card at the first edge,
 // equals EXACTLY half when the card is edge-on, then opens into the ALMA face.
 const visibleFraction=p<=.5
   ? .5*clamp((p-.08)/.42,0,1)
   : .5+.5*clamp((p-.5)/.36,0,1);
 const fadeIn=clamp((p-.12)/.24,0,1);
 const fadeOut=clamp((.89-p)/.27,0,1);
 const opacity=Math.min(fadeIn,fadeOut);
 const hide=100*(1-visibleFraction);
 const clip=sign<0
   ? "inset(0 "+hide.toFixed(3)+"% 0 0)"
   : "inset(0 0 0 "+hide.toFixed(3)+"%)";
 return {progress:p,direction:sign,yaw,visibleFraction,hide,clip,opacity,
  enabled:p>.12&&p<.89&&opacity>0};
}
const back=document.getElementById("setkaCycleBack");
const iframe=back?.querySelector("iframe");
let overlay=null,turning=false,lastP=0,lastDirection=-1,frameCount=0;
function copyStyleTree(from,to,sourceWindow){
 const styleProps=[
  "color","fill","fill-opacity","stroke","stroke-width","stroke-opacity",
  "stroke-linecap","stroke-linejoin","stroke-dasharray","stroke-dashoffset",
  "opacity","filter","mix-blend-mode","paint-order","vector-effect",
  "transform","transform-origin","transform-box","visibility",
  "font-size","font-family","font-weight","font-style","letter-spacing",
  "text-anchor","dominant-baseline","stop-color","stop-opacity"
 ];
 const listA=[from,...from.querySelectorAll("*")];
 const listB=[to,...to.querySelectorAll("*")];
 // The original ALMA SVG includes defs: give the clone private IDs so
 // the host document cannot accidentally resolve a SETKA gradient instead.
 const rename=new Map();
 for(const node of listB)if(node.id){
  const newId="setka-lotus-turn-"+node.id;
  rename.set(node.id,newId);node.id=newId;
 }
 function fixUrls(text){
  if(!text)return text;
  return String(text).replace(/url\(\s*["']?[^)"']*#([A-Za-z0-9_-]+)["']?\s*\)/g,(full,id)=>
   rename.has(id)?"url(#"+rename.get(id)+")":full);
 }
 for(let i=0;i<listA.length;i++){
  const a=listA[i],b=listB[i],style=sourceWindow.getComputedStyle(a);
  for(const key of styleProps){
   const value=style.getPropertyValue(key);
   if(value&&value!=="none"&&value!=="normal"&&value!=="auto"){
    b.style.setProperty(key,fixUrls(value));
   }
  }
  // Also rewrite URL references in SVG presentation attributes.
  for(const key of ["fill","stroke","filter","clip-path","mask","href","xlink:href"]){
   const val=b.getAttribute?.(key);
   if(!val)continue;
   if((key==="href"||key==="xlink:href")&&val.startsWith("#")){
    b.setAttribute(key,"#"+(rename.get(val.slice(1))||val.slice(1)));
   }else b.setAttribute(key,fixUrls(val));
  }
 }
}
function build(){
 if(overlay)return true;
 let doc,svg,button;
 try{
  doc=iframe?.contentDocument;
  button=doc?.querySelector(".cycle-lotus-button");
  svg=button?.querySelector("svg.cycle-lotus")||doc?.querySelector("svg.cycle-lotus");
 }catch(_){return false}
 if(!svg||!button)return false;
 const outer=document.createElement("div");
 outer.id="setkaCycleLotusTurn";
 outer.className="setka-cycle-lotus-turn";
 outer.setAttribute("aria-hidden","true");
 const pivot=document.createElement("div");
 pivot.className="setka-cycle-lotus-turn-pivot";
 const twin=svg.cloneNode(true);
 twin.setAttribute("aria-hidden","true");
 twin.removeAttribute("tabindex");
 twin.classList.add("setka-cycle-lotus-turn-svg");
 try{copyStyleTree(svg,twin,iframe.contentWindow)}catch(_){}
 pivot.appendChild(twin);
 outer.appendChild(pivot);
 document.body.appendChild(outer);
 overlay={outer,pivot,twin,button};
 position();
 return true;
}
function position(){
 if(!overlay)return;
 try{
  const frame=iframe.getBoundingClientRect();
  const button=overlay.button.getBoundingClientRect();
  // The iframe isn't rotated until the card's draw() phase starts.
  // During a swipe these saved values never depend on a collapsing width.
  const hostTop=frame.top+button.top;
  const hostLeft=frame.left+button.left;
  const width=button.width||iframe.clientWidth||360;
  const height=button.height||278;
  if(width<20||height<20)return;
  overlay.outer.style.left=hostLeft.toFixed(2)+"px";
  overlay.outer.style.top=hostTop.toFixed(2)+"px";
  overlay.outer.style.width=width.toFixed(2)+"px";
  overlay.outer.style.height=height.toFixed(2)+"px";
 }catch(_){}
}
function start(){
 turning=true;
 if(build())position();
}
function render(progress,direction=-1){
 lastP=progress;lastDirection=direction;
 if(!turning)return;
 if(!overlay&&!build())return;
 const state=geometry(progress,direction);
 const {outer,pivot}=overlay;
 outer.style.display=state.enabled?"block":"none";
 if(!state.enabled)return;
 // Keep the lotus heading toward the viewer while the CARD crosses edge-on.
 pivot.style.transform="perspective(1450px) rotateY("+state.yaw.toFixed(3)+"deg)";
 outer.style.clipPath=state.clip;
 outer.style.webkitClipPath=state.clip;
 outer.style.opacity=state.opacity.toFixed(4);
 outer.dataset.progress=state.progress.toFixed(3);
 outer.dataset.cardEdge=String(Math.abs(state.progress-.5)<.001);
 frameCount++;
}
function rest(){
 turning=false;
 if(overlay){overlay.outer.remove();overlay=null}
}
if(iframe)iframe.addEventListener("load",()=>{if(turning&&!overlay){build();render(lastP,lastDirection)}});
window.SETKA_CYCLE_LOTUS_AXIS={
 start,render,rest,geometry,
 getInfo:()=>({turning,hasSource:!!overlay,frames:frameCount,...geometry(lastP,lastDirection)})
};
})();