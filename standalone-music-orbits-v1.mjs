import {MOTION,MOTION_LABELS,clampOrbitRadius} from "./standalone-music-audio-v1.mjs?v=14-orbit-centerline-bounds-20261107";
import {uiIconHTML} from "./standalone-music-ui-icons-v2.mjs";
export function createOrbitUI(mixer,trackHTML,uiIcons={}){
 const root=document.createElement("section");root.className="sm-orbits";root.hidden=true;
 const stage=document.createElement("div");stage.className="sm-stage";stage.setAttribute("aria-label","Пространственное расположение активных звуков");
 stage.innerHTML='<span class="sm-ring sm-ring-inner"></span><span class="sm-ring sm-ring-middle"></span><span class="sm-ring sm-ring-outer"></span><span class="sm-listener" aria-label="Радужная девушка в позе лотоса с наушниками"><span class="sm-lotus-portrait" aria-hidden="true"></span></span>';
 root.append(stage);
 const row=document.createElement("div");row.className="sm-motion-row";row.setAttribute("role","group");row.setAttribute("aria-label","Режим движения звуков");root.append(row);
 const speed=document.createElement("div");speed.className="sm-speed";
 speed.innerHTML='<span class="sm-speed-slow">'+uiIconHTML("speed-slow",uiIcons)+'</span><input type="range" min="0" max="100" value="'+mixer.speed+'" aria-label="Скорость движения звуков"><span class="sm-speed-fast">'+uiIconHTML("speed-fast",uiIcons)+'</span>';
 const input=speed.querySelector("input");input.addEventListener("input",()=>mixer.setSpeed(input.value));
 root.append(speed);
 const elements=new Map();
 function pos(el,a,r){
  if(!el)return;const rect=stage.getBoundingClientRect();const dist=Math.min(rect.width,rect.height)*.5*r;
  el.style.left="calc(50% + "+(Math.sin(a)*dist).toFixed(1)+"px)";
  el.style.top="calc(50% - "+(Math.cos(a)*dist).toFixed(1)+"px)";
 }
 function updatePositions(){if(root.hidden)return;for(const s of mixer.items.values())pos(elements.get(s.id),s.angle,s.radius)}
 function updateMotions(){
  row.replaceChildren();
  for(const mode of MOTION){
   const b=document.createElement("button");b.type="button";b.className="sm-motion"+(mixer.mode===mode?" active":"");
   b.title=MOTION_LABELS[mode];b.setAttribute("aria-label",MOTION_LABELS[mode]);b.innerHTML=uiIconHTML("motion-"+mode,uiIcons);
   b.onclick=()=>{mixer.motion(mode);updateMotions()};
   row.append(b);
  }
 }
 function render(){
  for(const n of elements.values())n.remove();elements.clear();
  for(const s of mixer.items.values()){
   const node=document.createElement("button");node.type="button";node.className="sm-source";
   node.setAttribute("aria-label",s.track.title+": уровень "+s.level+"; переместить по орбите");
   node.innerHTML='<span class="sm-source-icon">'+trackHTML(s.track)+'</span><span class="sm-dots">'+new Array(s.level).fill('<i></i>').join("")+'</span>';
   let touch=null;
   node.addEventListener("pointerdown",e=>{touch={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};node.setPointerCapture(e.pointerId);e.preventDefault()});
   node.addEventListener("pointermove",e=>{
    if(!touch||e.pointerId!==touch.id)return;
    if(Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>7)touch.moved=true;
    if(!touch.moved)return;
    const box=stage.getBoundingClientRect(),x=e.clientX-box.left-box.width/2,y=e.clientY-box.top-box.height/2;
    const radius=clampOrbitRadius(Math.hypot(x,y)/(.5*Math.min(box.width,box.height)));
    const angle=Math.atan2(x,-y);mixer.drag(s.id,angle,radius);pos(node,angle,radius);
   });
   node.addEventListener("pointerup",e=>{
    if(!touch||touch.id!==e.pointerId)return;
    const dragged=touch.moved;touch=null;
    if(!dragged){const item=mixer.items.get(s.id);if(item)mixer.change(item.track,item.level===3?0:item.level+1)}
   });
   node.addEventListener("pointercancel",()=>touch=null);
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
