(()=>{
"use strict";
/* SETKA / ALMA: 3D turn of the ORIGINAL calendar lotus.
 * ALMA's actual SVG is sampled for the moving visual; the live React lotus
 * remains untouched and interactive on the settled cycle face.
 *
 * The live lotus and the cycle side begin COPLANAR at p=1. While the
 * card turns, the lotus counter-rotates by EXACTLY the opposite angle
 * in the card's own frame. Its WORLD yaw is therefore always zero.
 * The rotating physical card occludes the lotus progressively: none
 * is visible on the SETKA face, half at the 90-degree edge, and all
 * of it on the ALMA cycle face. Opposite swipes mirror the exposed side.
 * No second calendar, no copied user data and no modifications to ALMA.
 */
if(window.SETKA_CYCLE_LOTUS_AXIS)return;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function geometry(progress,direction=-1){
 const p=clamp(Number.isFinite(progress)?progress:0,0,1);
 const sign=direction>=0?1:-1;
 // The actual ALMA card in the host is transformed with this Y angle.
 // The lotus's LOCAL counter-turn precisely cancels it at every frame,
 // not just at 90 degrees. As the visual is mounted outside the card,
 // its rendered WORLD yaw must be constant 0deg.
 const cardYaw=-sign*180*(1-p);
 const counterYaw=-cardYaw;
 const yaw=cardYaw+counterYaw;
 // The card is in front at p=0, edge-on at p=.5, and fully exposes
 // the ALMA lotus at p=1. Unlike the old easing/fading mask this
 // maintains the same full-size, front-facing SVG through the turn.
 const visibleFraction=p;
 const hide=100*(1-visibleFraction);
 const clip=sign<0
   ? "inset(0 "+hide.toFixed(3)+"% 0 0)"
   : "inset(0 0 0 "+hide.toFixed(3)+"%)";
 return {progress:p,direction:sign,cardYaw,counterYaw,yaw,
  visibleFraction,hide,clip,opacity:1,enabled:p>0};
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
 // A real overflow-clipping viewport is reliable in iOS WebKit. The old
 // clip-path on an out-of-flow 3D overlay let the full flower leak through.
 const mask=document.createElement("div");
 mask.className="setka-cycle-lotus-turn-mask";
 const pivot=document.createElement("div");
 pivot.className="setka-cycle-lotus-turn-pivot";
 const twin=svg.cloneNode(true);
 twin.setAttribute("aria-hidden","true");
 twin.removeAttribute("tabindex");
 twin.classList.add("setka-cycle-lotus-turn-svg");
 try{copyStyleTree(svg,twin,iframe.contentWindow)}catch(_){}
 pivot.appendChild(twin);
 mask.appendChild(pivot);
 outer.appendChild(mask);
 document.body.appendChild(outer);
 overlay={outer,mask,pivot,twin,button,sourceDoc:doc};
 position();
 return true;
}
// Never render two flowers at once: while the mobile-safe projection is
// showing, temporarily suppress ALMA's real SVG inside its own iframe.
// Only a class on the iframe document changes; React, dates, and handlers
// remain intact. On both settled faces the original is restored.
function setOriginalHidden(hidden){
 if(!overlay)return;
 try{
  const doc=overlay.sourceDoc;
  if(!doc)return;
  let rule=doc.getElementById("setka-cycle-single-lotus-rule");
  if(!rule){
   rule=doc.createElement("style");
   rule.id="setka-cycle-single-lotus-rule";
   rule.textContent="html.setka-cycle-hides-original-lotus .cycle-lotus-button svg.cycle-lotus{visibility:hidden!important}";
   doc.head.appendChild(rule);
  }
  if(hidden)doc.documentElement.classList.add("setka-cycle-hides-original-lotus");
  else doc.documentElement.classList.remove("setka-cycle-hides-original-lotus");
 }catch(_){}
}
function position(){
 if(!overlay)return;
 try{
  const frame=iframe.getBoundingClientRect();
  const button=overlay.button.getBoundingClientRect();
  // The iframe isn't rotated until the card's draw() phase starts.
  // During a swipe these saved values never depend on a collapsing width.
  const width=button.width||iframe.clientWidth||360;
  const height=button.height||278;
  if(width<20||height<20)return;
  // The card collapses to a line when rotated. Never use its transformed
  // getBoundingClientRect().left as the flower's pivot: keep the shared
  // center of the original, unrotated card for the whole gesture.
  const frameWidth=iframe.clientWidth||frame.width||width;
  const left=Number.isFinite(window.innerWidth)
    ? (window.innerWidth-frameWidth)/2+button.left
    : frame.left+button.left;
  const top=(Number.isFinite(iframe.offsetTop)?iframe.offsetTop:frame.top)+button.top;
  overlay.outer.style.left=left.toFixed(2)+"px";
  overlay.outer.style.top=top.toFixed(2)+"px";
  overlay.outer.style.width=width.toFixed(2)+"px";
  overlay.outer.style.height=height.toFixed(2)+"px";
  // The projection always retains the ORIGINAL lotus width. Its mask
  // changes size, but must not shrink/recenter the SVG as it changes.
  overlay.pivot.style.width=width.toFixed(2)+"px";
  overlay.pivot.style.height=height.toFixed(2)+"px";
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
 const {outer,mask,pivot}=overlay;
 // The native ALMA SVG must NEVER reappear while its iframe is still
 // turning. Otherwise iOS paints it sideways behind the projection.
 // Restore it only after setAtRest() resets the card transforms.
 setOriginalHidden(true);
 outer.style.display=state.enabled?"block":"none";
 if(!state.enabled)return;
 // The flower stays at the unrotated card's pivot; only the visible
 // side of the physical Y-plane is exposed through an overflow mask.
 // At the 90-degree edge the mask width is EXACTLY half, not an SVG
 // duplicate freely floating above the calendar.
 const width=parseFloat(outer.style.width)||iframe.clientWidth||360;
 const hiddenWidth=width*(1-state.visibleFraction);
 mask.style.width=(state.visibleFraction*100).toFixed(3)+"%";
 mask.style.left=(state.direction<0?0:hiddenWidth).toFixed(2)+"px";
 pivot.style.left=(state.direction<0?0:-hiddenWidth).toFixed(2)+"px";
 pivot.style.transform="perspective(1450px) rotateY("+state.yaw.toFixed(3)+"deg)";
 outer.style.opacity="1";
 outer.dataset.cardYaw=state.cardYaw.toFixed(3);
 outer.dataset.counterYaw=state.counterYaw.toFixed(3);
 outer.dataset.worldYaw=state.yaw.toFixed(3);
 outer.dataset.progress=state.progress.toFixed(3);
 outer.dataset.cardEdge=String(Math.abs(state.progress-.5)<.001);
 frameCount++;
}
function rest(){
 turning=false;
 if(overlay){
  setOriginalHidden(false);
  overlay.outer.remove();
  overlay=null;
 }
}
if(iframe)iframe.addEventListener("load",()=>{
 // An iframe navigation invalidates the old SVG and source document.
 if(overlay){setOriginalHidden(false);overlay.outer.remove();overlay=null}
 if(turning){build();render(lastP,lastDirection)}
});
window.SETKA_CYCLE_LOTUS_AXIS={
 start,render,rest,geometry,
 getInfo:()=>({turning,hasSource:!!overlay,frames:frameCount,...geometry(lastP,lastDirection)})
};
})();