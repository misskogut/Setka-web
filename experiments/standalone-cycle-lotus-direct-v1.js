(()=>{
"use strict";
/* SETKA ALMA direct native lotus.
 * There is ONE SVG: the real live interactive SVG from the ALMA iframe.
 * While turning, move that SAME node to an unclipped 3D layer of the card.
 * Restore it to its original React button at rest. No clones, WebGL texture,
 * second flower, alpha-cut halves, shader masks or rendered substitutes.
 */
if(window.SETKA_CYCLE_LOTUS_AXIS)return;
const back=document.getElementById("setkaCycleBack");
const iframe=back?.querySelector("iframe");
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let portal=null,holder=null,active=null,turning=false,progress=0,direction=-1,frames=0;
let originalRef=null;
const CARD_INSET_PX=5;
function fitInsideCard(cardScreenWidth,svgNaturalWidth){
 // Preserve the ONE original SVG and all its live children. Its horizontal
 // projection must contract with the real perspective of its ALMA card.
 // At edge-on the visible space approaches zero rather than a detached
 // world-space billboard covering both sides of SETKA.
 if(!Number.isFinite(cardScreenWidth)||!Number.isFinite(svgNaturalWidth)||svgNaturalWidth<=0)return 0;
 return clamp((Math.max(0,cardScreenWidth)-2*CARD_INSET_PX)/svgNaturalWidth,0,1);
}
function geometry(p,d=-1){
 const progress=clamp(Number.isFinite(p)?p:0,0,1),direction=d>=0?1:-1;
 const cardYaw=progress===1?0:-direction*180*(1-progress);
 return{progress,direction,cardYaw,counterYaw:-cardYaw,yaw:0,
  enabled:progress>0,emergingSide:direction<0?"right":"left",opacity:1};
}
function ensurePortal(){
 if(portal)return true;
 if(!back)return false;
 portal=document.createElement("div");
 portal.id="setkaCycleLotusDirectPortal";
 portal.setAttribute("aria-hidden","true");
 portal.style.cssText="position:fixed;inset:0;z-index:125;overflow:visible;pointer-events:none;visibility:hidden;";
 // Nested iframe transforms flatten under WebKit: render the SAME original
 // node on the world axis in top-level light DOM, without copies.
 holder=document.createElement("div");
 holder.className="setka-cycle-lotus-direct-holder";
 portal.appendChild(holder);
 document.body.appendChild(portal);
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
 // The central Y hinge stays fixed while the card rotates.
 const x=frame.left+r.left,y=frame.top+r.top;
 holder.style.left=x+"px";holder.style.top=y+"px";
 holder.style.width=r.width+"px";holder.style.height=r.height+"px";
 // Cycle colors are inherited in the original iframe; pass that ONE value
 // to the original SVG while it is temporarily in the world-facing layer.
 try{
  const hero=doc.querySelector(".cycle-hero");
  const color=iframe.contentWindow.getComputedStyle(hero).getPropertyValue("--cycle-color");
  if(color)portal.style.setProperty("--cycle-color",color.trim());
 }catch(_){}
 originalRef=svg;
 active={doc,button,svg,naturalWidth:r.width,naturalHeight:r.height,fitScale:1};
 // Native adoption: this is the actual React SVG node, not a duplication.
 // Keep button in iframe for its original React click handler.
 holder.appendChild(svg);
 portal.style.visibility="hidden";
 return true;
}
function render(p,d=-1){
 progress=p;direction=d;
 if(!turning)return;
 if(!active&&!start())return;
 const g=geometry(p,d);
 // The back face must be hidden while the opaque SETKA/squish side
 // is toward the viewer. The original flower stays a single SVG node.
 portal.style.visibility=g.progress>=.5?"visible":"hidden";
 // iOS Safari cannot keep a true 3D SVG crossing the iframe compositor.
 // Retain the live original SVG, but bind its SCREEN-SPACE X extent to the
 // actual perspective-projected ALMA card on every gesture frame.
 // This fixes the oversized billboard that pierced BOTH card boundaries.
 // Uniform scale maintains the ORIGINAL petal proportions. The earlier
 // X-only squeeze kept the bounds but made the lotus a distorted spike.
 const cardRect=back.getBoundingClientRect();
 const centerX=cardRect.left+cardRect.width/2;
 const fitScale=fitInsideCard(cardRect.width,active.naturalWidth);
 holder.style.left=(centerX-active.naturalWidth/2)+"px";
 holder.style.transform="scale("+fitScale.toFixed(6)+")";
 holder.style.webkitTransform=holder.style.transform;
 active.fitScale=fitScale;
 holder.dataset.cardYaw=g.cardYaw.toFixed(4);
 holder.dataset.counterYaw=g.counterYaw.toFixed(4);
 holder.dataset.fitScale=fitScale.toFixed(6);
 holder.dataset.cardScreenWidth=cardRect.width.toFixed(3);
 frames++;
}
function rest(){
 turning=false;
 if(!active){if(portal)portal.style.visibility="hidden";return}
 const {button,svg}=active;
 // Return the SAME node to React's original button; React can resume
 // all interactions and live color/petal updates without any proxy.
 try{
  if(button.isConnected&&!button.querySelector("svg.cycle-lotus"))button.appendChild(svg);
  else if(!svg.isConnected)button.appendChild(svg);
  else if(svg.parentNode===holder&&button.isConnected)button.appendChild(svg);
  else if(svg.parentNode===holder)svg.remove();
 }catch(e){console.warn("[SETKA ALMA direct lotus] restore",e)}
 active=null;
 if(portal)portal.style.visibility="hidden";
}
if(iframe)iframe.addEventListener("load",()=>{
 // React mounted a fresh calendar. A previously adopted node must not linger.
 rest();
});
if(typeof window.addEventListener==="function")window.addEventListener("pagehide",rest);
// Install the native 3D layer before the first gesture.
if(back)ensurePortal();
window.SETKA_CYCLE_LOTUS_AXIS={
 start,render,rest,geometry,fitInsideCard,
 getInfo:()=>{
  const state=geometry(progress,direction);
  return{...state,turning,hasSource:!!active||!!getOriginal(),ready:!!active||!!getOriginal(),
   real3D:true,nativeOriginal:true,hasClone:false,originalPreserved:!!originalRef,
   originalIn3D:!!active&&active.svg===originalRef&&active.svg.parentNode===holder,
   originalRestored:!active&&!!originalRef&&!!originalRef.closest(".cycle-lotus-button"),
   fitScale:active?.fitScale??null,originalAspectRatio:active?active.naturalHeight/active.naturalWidth:null,
   cardScreenWidth:active?back.getBoundingClientRect().width:null,
   frames,portalVisible:portal?.style.visibility||"hidden"};
 }
};
})();
