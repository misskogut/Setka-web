import {MOTION,MOTION_LABELS} from "./standalone-music-audio-v1.mjs";
const paths={
 static:'<circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>',
 cw:'<path d="M20 7a9 9 0 1 0 1 8M20 3v5h-5"/>',
 ccw:'<path d="M4 7a9 9 0 1 1-1 8M4 3v5h5"/>',
 counter:'<path d="M2 8h17l-4-4m4 4-4 4M22 16H5l4-4m-4 4 4 4"/>',
 eight:'<path d="M12 12C8 5 2 4 2 11s7 9 10 1c3-8 10-6 10 0s-6 8-10 0Z"/>',
 chaos:'<path d="M2 19 20 4m-5 0h5v5M2 5l18 15m-5 0h5v-5"/>',
 spiral:'<path d="M12 12c0-2 3-2 3 0 0 5-9 6-9-1 0-10 16-10 16 1 0 15-21 15-21 0"/>',
 breath:'<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="10"/>'
};
const moveSVG=m=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[m]+'</svg>';
const speedIcon=(which)=>which==="slow"?'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 19c0-6 5-11 11-11s10 4 11 10h4v4H5zM8 23l-2 4m16-4 2 4M25 14h4M13 9v11"/></svg>':'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M12 13 9 2l6 8M18 12l2-10 4 13M6 22c1-9 8-13 16-9l6 7-6 2-3 6h-7l-5-3-5 3M21 16h.1M4 19H1"/></svg>';
export function createOrbitUI(mixer,trackHTML){
 const root=document.createElement("section");root.className="sm-orbits";root.hidden=true;
 const stage=document.createElement("div");stage.className="sm-stage";stage.setAttribute("aria-label","Пространственное расположение активных звуков");
 stage.innerHTML='<span class="sm-ring sm-ring-inner"></span><span class="sm-ring sm-ring-middle"></span><span class="sm-ring sm-ring-outer"></span><span class="sm-listener"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="24" r="14"/><path d="M14 27v-5a18 18 0 0 1 36 0v5M10 25h8v14h-8zm36 0h8v14h-8zM12 57c2-11 12-17 20-17s18 6 20 17"/></svg></span>';
 root.append(stage);
 const row=document.createElement("div");row.className="sm-motion-row";row.setAttribute("role","group");row.setAttribute("aria-label","Режим движения звуков");root.append(row);
 const speed=document.createElement("div");speed.className="sm-speed";
 speed.innerHTML=speedIcon("slow")+'<input type="range" min="0" max="100" value="'+mixer.speed+'" aria-label="Скорость движения звуков">'+speedIcon("fast");
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
   b.title=MOTION_LABELS[mode];b.setAttribute("aria-label",MOTION_LABELS[mode]);b.innerHTML=moveSVG(mode);
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
    const radius=Math.max(.33,Math.min(.84,Math.hypot(x,y)/(.5*Math.min(box.width,box.height))));
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
 window.addEventListener("resize",updatePositions);
 return {root,render,updatePositions};
}
