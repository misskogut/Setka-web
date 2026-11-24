(()=>{
"use strict";
/* Native ALMA React and its ONE original SVG share the physical 3D card.
 No iframe, clipped compositor, copy, path deformation, fake volume or mask. */
if(window.SETKA_CYCLE_LOTUS_AXIS)return;
const back=document.getElementById("setkaCycleBack");
const card=document.getElementById("setkaCycle3DCard");
const volume=document.getElementById("setkaCycleCardVolume");
const root=back?.querySelector("#alma-cycle-root");
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
let portal=null,holder=null,active=null,turning=false,progress=0,direction=-1,frames=0,originalRef=null;
function geometry(p,d=-1){
 const progress=clamp(Number.isFinite(p)?p:0,0,1),direction=d>=0?1:-1;
 const cardYaw=progress===1?0:-direction*180*(1-progress);
 return{progress,direction,cardYaw,counterYaw:-cardYaw,yaw:0,
  frontFacing:progress>=.5,submergedSide:Math.sin(cardYaw*Math.PI/180)>0?"left":"right"};
}
function ensurePortal(){
 if(portal)return true;if(!card||!root)return false;
 portal=document.createElement("div");
 portal.id="setkaCycleLotusDirectPortal";
 portal.setAttribute("aria-hidden","true");
 portal.style.cssText="position:absolute;inset:0;pointer-events:none;transform-style:preserve-3d;-webkit-transform-style:preserve-3d;visibility:hidden;";
 holder=document.createElement("div");
 holder.className="setka-cycle-lotus-direct-holder";
 portal.appendChild(holder);card.appendChild(portal);return true;
}
function getOriginal(){
 const button=root?.querySelector(".cycle-lotus-button");
 const svg=button?.querySelector("svg.cycle-lotus");
 return svg&&button?{button,svg}:null;
}
function start(){
 turning=true;if(active)return true;if(!ensurePortal())return false;
 const found=getOriginal();if(!found)return false;
 const{button,svg}=found,r=svg.getBoundingClientRect();
 if(!r.width||!r.height)return false;
 holder.style.left=r.left+"px";holder.style.top=r.top+"px";
 holder.style.width=r.width+"px";holder.style.height=r.height+"px";
 try{const color=window.getComputedStyle(root.querySelector(".cycle-hero")).getPropertyValue("--cycle-color");
  if(color)portal.style.setProperty("--cycle-color",color.trim());}catch(_){}
 originalRef=svg;active={button,svg,w:r.width,h:r.height};
 holder.appendChild(svg);portal.style.visibility="hidden";return true;
}
function render(p,d=-1){
 progress=p;direction=d;if(!turning)return;if(!active&&!start())return;
 const g=geometry(p,d);
 portal.style.visibility=g.frontFacing?"visible":"hidden";
 if(volume)volume.style.visibility=g.frontFacing?"visible":"hidden";
 holder.style.transform="rotateY("+g.counterYaw.toFixed(5)+"deg)";
 holder.style.webkitTransform=holder.style.transform;
 holder.dataset.cardYaw=g.cardYaw.toFixed(5);
 holder.dataset.counterYaw=g.counterYaw.toFixed(5);
 frames++;
}
function rest(){
 turning=false;
 if(active){
  const {button,svg}=active;
  if(button.isConnected&&svg.parentNode===holder)button.appendChild(svg);
  else if(button.isConnected&&!button.querySelector("svg.cycle-lotus"))button.appendChild(svg);
  else if(svg.parentNode===holder)svg.remove();
 }
 active=null;
 if(portal)portal.style.visibility="hidden";
 if(volume)volume.style.visibility="hidden";
}
window.addEventListener("pagehide",rest);
ensurePortal();
window.SETKA_CYCLE_LOTUS_AXIS={start,render,rest,geometry,
 getInfo:()=>{
  const g=geometry(progress,direction);
  return{...g,turning,inlineReact:!!root,real3D:!!card&&!!volume,
   sameDOMScene:portal?.parentNode===card,
   originalIn3D:!!active&&active.svg===originalRef&&active.svg.parentNode===holder,
   originalRestored:!active&&!!originalRef&&!!originalRef.closest(".cycle-lotus-button"),
   originalPetalCount:active?.svg.querySelectorAll("path.lotus-petal").length??0,
   volumeVisible:volume?.style.visibility==="visible",hasSource:!!active||!!getOriginal(),frames};
 }
};
})();