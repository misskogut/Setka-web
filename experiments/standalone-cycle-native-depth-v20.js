(()=>{
"use strict";
/* Original React ALMA root is rendered directly in this document.
 * ONE live SVG is moved to a pivot sibling of the calendar surface.
 * The physical card contains front wall, back wall and depth at z=-165px.
 * No iframe, no copied SVG, no texture, no scaled petals or visual mask.
 */
const back=document.getElementById("setkaCycleBack");
const world=document.getElementById("setkaCycle3DWorld");
const card=document.getElementById("setkaCycle3DCard");
const volume=document.getElementById("setkaCycleCardVolume");
const root=document.getElementById("alma-cycle-root");
if(!back||!card||!root||!volume||window.SETKA_CYCLE_LOTUS_AXIS)return;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
let portal=null,holder=null,active=null,turning=false,progress=0,direction=-1,frames=0;
function geometry(p,d=-1){
 const progress=clamp(Number(p)||0,0,1),direction=d>=0?1:-1;
 const cardYaw=progress===1?0:-direction*180*(1-progress);
 return{progress,direction,cardYaw,counterYaw:-cardYaw,
  yaw:0,visible:progress>=.5,halfDepth:Math.abs(Math.sin(cardYaw*Math.PI/180)),
  insideSide:cardYaw>=0?"left":"right"};
}
function getOriginal(){
 const button=root.querySelector(".cycle-lotus-button");
 const svg=button?.querySelector("svg.cycle-lotus");
 return svg?{button,svg}:null;
}
function start(){
 turning=true;
 if(active)return true;
 const source=getOriginal();
 if(!source)return false;
 const r=source.svg.getBoundingClientRect();
 if(!r.width||!r.height)return false;
 const style=getComputedStyle(root.querySelector(".cycle-hero"));
 if(!portal){
  portal=document.createElement("div");
  portal.id="setkaCycleLotusDirectPortal";
  portal.style.cssText="position:absolute;inset:0;pointer-events:none;visibility:hidden;transform-style:preserve-3d;-webkit-transform-style:preserve-3d";
  holder=document.createElement("div");
  holder.className="setka-cycle-lotus-direct-holder";
  portal.appendChild(holder);
  card.appendChild(portal);
 }
 // At rest the unrotated face and SVG are measured in the same viewport.
 holder.style.left=r.left+"px";holder.style.top=r.top+"px";
 holder.style.width=r.width+"px";holder.style.height=r.height+"px";
 portal.style.setProperty("--cycle-color",style.getPropertyValue("--cycle-color").trim()||"#b96cfb");
 active=source;
 holder.appendChild(source.svg);
 return true;
}
function render(p,d=-1){
 progress=p;direction=d;
 if(!turning&&!start())return;
 if(!active&&!start())return;
 const g=geometry(p,d);
 portal.style.visibility=g.visible?"visible":"hidden";
 volume.style.visibility=g.visible?"visible":"hidden";
 // ONE original lotus rotates -theta on its own axis, while the entire
 // real-depth calendar card rotates +theta. No image duplication.
 holder.style.transform="rotateY("+g.counterYaw.toFixed(4)+"deg)";
 holder.style.webkitTransform=holder.style.transform;
 holder.dataset.cardYaw=g.cardYaw.toFixed(4);
 holder.dataset.counterYaw=g.counterYaw.toFixed(4);
 frames++;
}
function rest(){
 turning=false;
 if(active){
  const {svg,button}=active;
  if(button.isConnected&&svg.parentNode===holder)button.appendChild(svg);
  active=null;
 }
 if(portal)portal.style.visibility="hidden";
 if(volume)volume.style.visibility="hidden";
}
window.addEventListener("pagehide",rest);
window.SETKA_CYCLE_LOTUS_AXIS={start,render,rest,geometry,getInfo(){
 const g=geometry(progress,direction);
 return{...g,turning,ready:!!active||!!getOriginal(),nativeOriginal:true,
  singleSVG:!!active&&holder?.querySelectorAll("svg.cycle-lotus").length===1,
  originalIn3D:!!active&&active.svg.parentNode===holder,
  originalRestored:!active&&!!root.querySelector(".cycle-lotus-button svg.cycle-lotus"),
  common3D:portal?.parentElement===card,volumeVisible:volume?.style.visibility==="visible",frames}
}};
})();