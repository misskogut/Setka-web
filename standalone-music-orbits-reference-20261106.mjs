import {MOTION,MOTION_LABELS,orbitUnit} from "./standalone-music-audio-v1.mjs?v=11-directional-room-v2-20261107";
import {uiIconHTML} from "./standalone-music-ui-icons-v2.mjs?v=4-exact-approved-vector-20261106";
export function createOrbitUI(mixer,trackHTML,uiIcons={}){
 const root=document.createElement("section");root.className="sm-orbits";root.hidden=true;
 const stage=document.createElement("div");stage.className="sm-stage";stage.setAttribute("aria-label","Пространственное расположение активных звуков");
 stage.innerHTML='<span class="sm-ring sm-ring-inner"></span><span class="sm-ring sm-ring-middle"></span><span class="sm-ring sm-ring-outer"></span><span class="sm-listener" style="width:min(29%,96px)!important;height:min(29%,96px)!important;top:calc(50% - 4px)!important;" aria-label="Радужная девушка в позе лотоса с наушниками"><span class="sm-lotus-portrait" aria-hidden="true"></span></span>';
 root.append(stage);
 const row=document.createElement("div");row.className="sm-motion-row";row.setAttribute("role","group");row.setAttribute("aria-label","Режим движения звуков");root.append(row);
 const speed=document.createElement("div");speed.className="sm-speed";
 speed.innerHTML='<span class="sm-speed-slow">'+uiIconHTML("speed-slow",uiIcons)+'</span><input type="range" min="0" max="100" value="'+mixer.speed+'" aria-label="Скорость движения звуков"><span class="sm-speed-fast">'+uiIconHTML("speed-fast",uiIcons)+'</span>';
 const input=speed.querySelector("input");input.addEventListener("input",()=>mixer.setSpeed(input.value));
 root.append(speed);
 const elements=new Map();
 function pos(el,a,r,frame){
  if(!el)return;
  // Safari iOS: keep the button on its own composited layer and move only
  // that layer. Updating left/top was repainting vector/mask edges into trails.
  const rect=frame||stage.getBoundingClientRect(),dist=Math.min(rect.width,rect.height)*.5*r;
  const dpr=Math.max(1,window.devicePixelRatio||1);
  const direction=orbitUnit(a);
  const dx=Math.round(direction.x*dist*dpr)/dpr;
  const dy=Math.round(direction.z*dist*dpr)/dpr;
  const transform="translate3d("+dx+"px,"+dy+"px,0) translate(-50%,-50%)";
  if(el.style.transform!==transform)el.style.transform=transform;
 }
 function updatePositions(){
  if(root.hidden)return;
  const frame=stage.getBoundingClientRect();
  for(const s of mixer.items.values())pos(elements.get(s.id),s.angle,s.radius,frame);
 }
 function updateMotions(){
  row.replaceChildren();
  for(const mode of MOTION){
   if(mode==="static")continue; // Re-tap any active motion icon to stop; no static-dot icon.
   const b=document.createElement("button");b.type="button";b.className="sm-motion"+(mixer.mode===mode?" active":"");
   b.title=MOTION_LABELS[mode];b.setAttribute("aria-label",MOTION_LABELS[mode]);b.innerHTML=uiIconHTML("motion-"+mode,uiIcons);
   b.onclick=()=>{mixer.motion(mixer.mode===mode?"static":mode);updateMotions()};
   row.append(b);
  }
 }
 function render(){
  for(const n of elements.values())n.remove();elements.clear();
  for(const s of mixer.items.values()){
   const node=document.createElement("button");node.type="button";node.className="sm-source";
   node.setAttribute("aria-label",s.track.title+": уровень "+s.level+"; переместить по орбите");
   node.innerHTML='<span class="sm-source-icon">'+trackHTML(s.track)+'<span class="sm-dots">'+new Array(s.level).fill('<i></i>').join("")+'</span></span>';
   let touch=null;
   node.addEventListener("pointerdown",e=>{
    if(e.button!==undefined&&e.button!==0)return;
    touch={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
    node.classList.add("dragging");
    node.setPointerCapture(e.pointerId);
    e.preventDefault();
   });
   node.addEventListener("pointermove",e=>{
    if(!touch||e.pointerId!==touch.id)return;
    if(Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>7)touch.moved=true;
    if(!touch.moved)return;
    const box=stage.getBoundingClientRect(),x=e.clientX-box.left-box.width/2,y=e.clientY-box.top-box.height/2;
    const radius=Math.max(.22,Math.min(.88,Math.hypot(x,y)/(.5*Math.min(box.width,box.height))));
    // mixer.drag updates both audio and screen through the same state/callback.
    const angle=Math.atan2(x,-y);mixer.drag(s.id,angle,radius);
   });
   node.addEventListener("pointerup",e=>{
    if(!touch||touch.id!==e.pointerId)return;
    const dragged=touch.moved;touch=null;
    node.classList.remove("dragging");
    if(node.hasPointerCapture?.(e.pointerId))node.releasePointerCapture(e.pointerId);
    if(!dragged){const item=mixer.items.get(s.id);if(item)mixer.change(item.track,item.level===3?0:item.level+1)}
   });
   node.addEventListener("pointercancel",()=>{touch=null;node.classList.remove("dragging")});
   node.addEventListener("lostpointercapture",()=>{touch=null;node.classList.remove("dragging")});
   elements.set(s.id,node);stage.append(node);
   pos(node,s.angle,s.radius);
  }
  updateMotions();
  requestAnimationFrame(updatePositions);
 }
 function refreshIcons(){
  // Keep the approved animated lotus portrait; refreshing admin icons must not reset it.
  speed.querySelector(".sm-speed-slow").innerHTML=uiIconHTML("speed-slow",uiIcons);
  speed.querySelector(".sm-speed-fast").innerHTML=uiIconHTML("speed-fast",uiIcons);
  updateMotions();
 }
 window.addEventListener("resize",updatePositions);
 return {root,render,updatePositions,refreshIcons};
}
