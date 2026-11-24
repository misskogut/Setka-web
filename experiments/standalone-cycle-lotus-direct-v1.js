(()=>{
"use strict";
/* ALMA common-space 3D volume, native original React lotus.
   No SVG copies, no path deformation, no screen-space billboard or masks.
   The original SVG is adopted into the same 3D card as the real iframe face.
   Its -theta pivot intersects the physical calendar face, with actual Z depth.
*/
if(window.SETKA_CYCLE_LOTUS_AXIS)return;
const back=document.getElementById("setkaCycleBack");
const card=document.getElementById("setkaCycle3DCard");
const world=document.getElementById("setkaCycle3DWorld");
const volume=document.getElementById("setkaCycleCardVolume");
// The iframe compositor in WebKit flattens nested native SVG 3D. Hold
// the SAME SVG at the common world Y hinge, as a sibling of the 3D card.
const webkitWorld=typeof navigator!=="undefined"&&
 /AppleWebKit/i.test(navigator.userAgent||"")&&
 !/Chrome\/\d|Chromium|Edg\/\d/i.test(navigator.userAgent||"");
const iframe=back?.querySelector("iframe");
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rad=Math.PI/180;
let portal=null,holder=null,active=null,turning=false,progress=0,direction=-1,frames=0;
let originalRef=null;
function geometry(p,d=-1){
 const progress=clamp(Number.isFinite(p)?p:0,0,1),direction=d>=0?1:-1;
 const cardYaw=progress===1?0:-direction*180*(1-progress);
 const counterYaw=-cardYaw;
 const s=Math.sin(cardYaw*rad);
 return{progress,direction,cardYaw,counterYaw,yaw:cardYaw+counterYaw,
  frontFacing:progress>=.5, submergedSide:s>=0?"left":"right",
  halfDepth:Math.abs(s),interiorLength:180};
}
function ensurePortal(){
 if(portal)return true;
 if(!card||!world)return false;
 portal=document.createElement("div");
 portal.id="setkaCycleLotusDirectPortal";
 portal.setAttribute("aria-hidden","true");
 portal.style.cssText="position:absolute;inset:0;pointer-events:none;transform-style:preserve-3d;-webkit-transform-style:preserve-3d;visibility:hidden;";
 holder=document.createElement("div");
 holder.className="setka-cycle-lotus-direct-holder";
 portal.appendChild(holder);
 (webkitWorld?world:card).appendChild(portal);
 return true;
}
function getOriginal(){
 try{
  const doc=iframe?.contentDocument;
  const button=doc?.querySelector(".cycle-lotus-button");
  const svg=button?.querySelector("svg.cycle-lotus");
  return svg&&button?{doc,button,svg}:null;
 }catch(_){return null}
}
function start(){
 turning=true;
 if(active)return true;
 if(!ensurePortal())return false;
 const found=getOriginal();
 if(!found)return false;
 const {doc,button,svg}=found;
 const frame=iframe.getBoundingClientRect(),r=svg.getBoundingClientRect();
 if(!r.width||!r.height)return false;
 // Capture hinge position while the card is unrotated. The same hinge is
 // invariant in CARD-LOCAL coordinates throughout either swipe.
 const x=frame.left+r.left,y=frame.top+r.top;
 holder.style.left=x+"px";holder.style.top=y+"px";
 holder.style.width=r.width+"px";holder.style.height=r.height+"px";
 try{
  const hero=doc.querySelector(".cycle-hero");
  const color=iframe.contentWindow.getComputedStyle(hero).getPropertyValue("--cycle-color");
  if(color)portal.style.setProperty("--cycle-color",color.trim());
 }catch(_){}
 originalRef=svg;
 active={doc,button,svg,naturalWidth:r.width,naturalHeight:r.height};
 // ADOPT this ONE original live React SVG node. There are no copies.
 holder.appendChild(svg);
 portal.style.visibility="hidden";
 return true;
}
function render(p,d=-1){
 progress=p;direction=d;
 if(!turning)return;
 if(!active&&!start())return;
 const g=geometry(p,d);
 // The squish face is completely opaque before the card is edge-on.
 const show=g.frontFacing;
 portal.style.visibility=show?"visible":"hidden";
 if(volume)volume.style.visibility=show?"visible":"hidden";
 // The card (parent) rotates +theta, original lotus pivots -theta at the
 // same Y axis. Thus the exposed half emerges (+Z) and the submerged half
 // travels behind the actual calendar surface (-Z) without deforming petals.
 holder.style.transform=webkitWorld?"rotateY(0deg)":
  "rotateY("+g.counterYaw.toFixed(5)+"deg)";
 holder.style.webkitTransform=holder.style.transform;
 // Use the actual FACE MATERIAL's optical transmission for the buried half.
 // This is not a masking rectangle or a synthetic extra flower.
 // Its opacity goes back to 1 when ALMA rests in the viewer's plane.
 const faceTransmission=1-.29*g.halfDepth;
 if(show)back.style.opacity=faceTransmission.toFixed(5);
 if(volume)volume.style.setProperty("--cycle-inner-opacity",(0.74+.18*g.halfDepth).toFixed(4));
 holder.dataset.cardYaw=g.cardYaw.toFixed(5);
 holder.dataset.counterYaw=g.counterYaw.toFixed(5);
 holder.dataset.depth=String(g.interiorLength);
 holder.dataset.submergedSide=g.submergedSide;
 frames++;
}
function rest(){
 turning=false;
 if(!active){if(portal)portal.style.visibility="hidden";if(volume)volume.style.visibility="hidden";return}
 const {button,svg}=active;
 // Return EXACT same native SVG to its React-owned button at rest.
 try{
  if(button.isConnected&&svg.parentNode===holder)button.appendChild(svg);
  else if(button.isConnected&&!button.querySelector("svg.cycle-lotus"))button.appendChild(svg);
  else if(svg.parentNode===holder)svg.remove();
 }catch(e){console.warn("[SETKA ALMA common 3D] restore",e)}
 active=null;
 if(portal)portal.style.visibility="hidden";
 if(volume)volume.style.visibility="hidden";
 back.style.removeProperty("opacity");
}
if(iframe)iframe.addEventListener("load",rest);
window.addEventListener("pagehide",rest);
ensurePortal();
window.SETKA_CYCLE_LOTUS_AXIS={start,render,rest,geometry,
 getInfo:()=>{
 const g=geometry(progress,direction);
 return{...g,turning,nativeOriginal:true,hasClone:false,real3D:!!card&&!!volume,
  common3DScene:portal?.parentNode===(webkitWorld?world:card),
  webkitWorld,volumeVisible:volume?.style.visibility==="visible",
  hasSource:!!active||!!getOriginal(),ready:!!active||!!getOriginal(),
  originalIn3D:!!active&&active.svg===originalRef&&active.svg.parentNode===holder,
  originalRestored:!active&&!!originalRef&&!!originalRef.closest(".cycle-lotus-button"),
  originalPetalCount:active?.svg?.querySelectorAll("path.lotus-petal").length??0,
  originalAspectRatio:active?active.naturalHeight/active.naturalWidth:null,
  frames,portalVisible:portal?.style.visibility||"hidden"}
 }
};
})();