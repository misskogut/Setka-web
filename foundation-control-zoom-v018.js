(()=>{
'use strict';
const KEY='setka:foundation:president:zoom:v018';
const MIN=.18,MAX=2.25,WORKSPACE_WIDTH=1280;
const frame=document.getElementById('appFrame');
if(!frame)return;
let scale=1,pinch=null,raf=0,resizeObserver=null,mutationObserver=null;
try{const x=Number(localStorage.getItem(KEY));if(Number.isFinite(x))scale=Math.max(MIN,Math.min(MAX,x))}catch{}
function clamp(v){return Math.max(MIN,Math.min(MAX,Number(v)||1))}
function persist(){try{localStorage.setItem(KEY,String(scale))}catch{}}
function midpoint(t){return{x:(t[0].clientX+t[1].clientX)/2,y:(t[0].clientY+t[1].clientY)/2}}
function distance(t){const dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY;return Math.hypot(dx,dy)}
function ensureWorkspace(d){const shell=d.getElementById('app')||d.querySelector('.shell');if(!shell)return null;let wrap=d.getElementById('foundationWorkspace018');if(!wrap){wrap=d.createElement('div');wrap.id='foundationWorkspace018';shell.parentNode?.insertBefore(wrap,shell);wrap.appendChild(shell)}shell.style.width=`${WORKSPACE_WIDTH}px`;shell.style.minWidth=`${WORKSPACE_WIDTH}px`;shell.style.maxWidth='none';return{shell,wrap}}
function updateExtent(d,workspace){if(!workspace)return;const {shell,wrap}=workspace;const h=Math.max(shell.scrollHeight,shell.offsetHeight,900);wrap.style.width=`${Math.ceil(WORKSPACE_WIDTH*scale)}px`;wrap.style.height=`${Math.ceil(h*scale)}px`}
function apply(save=true){
 let d;try{d=frame.contentDocument}catch{return}if(!d)return;const workspace=ensureWorkspace(d);if(!workspace)return;const {shell,wrap}=workspace;const root=d.documentElement,body=d.body;if(!root||!body)return;
 shell.style.zoom='';shell.style.transformOrigin='0 0';shell.style.transform=`scale(${scale})`;
 wrap.style.transform='';root.style.overflow='auto';body.style.overflow='auto';root.style.scrollBehavior='auto';body.style.scrollBehavior='auto';root.style.overscrollBehavior='contain';body.style.overscrollBehavior='contain';root.dataset.shellZoom=String(scale);
 updateExtent(d,workspace);if(save)persist();
 try{frame.contentWindow.dispatchEvent(new CustomEvent('foundation:admin-zoom',{detail:{scale,source:'gesture-canvas'}}))}catch{}
}
function schedule(save=false){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>apply(save))}
function bindDoc(){
 let d;try{d=frame.contentDocument}catch{return}if(!d||d.documentElement.dataset.gestureZoomBound==='2')return;d.documentElement.dataset.gestureZoomBound='2';const scroller=()=>d.scrollingElement||d.documentElement;
 const start=e=>{if(!e.touches||e.touches.length!==2)return;const m=midpoint(e.touches),s=scroller();pinch={distance:Math.max(1,distance(e.touches)),scale,contentX:(s.scrollLeft+m.x)/scale,contentY:(s.scrollTop+m.y)/scale};e.preventDefault()};
 const move=e=>{if(!pinch||!e.touches||e.touches.length<2)return;e.preventDefault();const m=midpoint(e.touches);scale=clamp(pinch.scale*(distance(e.touches)/pinch.distance));apply(false);const s=scroller();s.scrollLeft=Math.max(0,pinch.contentX*scale-m.x);s.scrollTop=Math.max(0,pinch.contentY*scale-m.y)};
 const end=e=>{if(pinch&&(!e.touches||e.touches.length<2)){pinch=null;apply(true)}};
 d.addEventListener('touchstart',start,{passive:false,capture:true});d.addEventListener('touchmove',move,{passive:false,capture:true});d.addEventListener('touchend',end,{passive:false,capture:true});d.addEventListener('touchcancel',end,{passive:false,capture:true});
 d.addEventListener('wheel',e=>{if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();const s=scroller(),before=scale,contentX=(s.scrollLeft+e.clientX)/before,contentY=(s.scrollTop+e.clientY)/before;scale=clamp(scale*(e.deltaY>0 ? .92 : 1.08));apply(true);s.scrollLeft=Math.max(0,contentX*scale-e.clientX);s.scrollTop=Math.max(0,contentY*scale-e.clientY)},{passive:false,capture:true});
 const workspace=ensureWorkspace(d);if(workspace){resizeObserver?.disconnect();resizeObserver=new ResizeObserver(()=>schedule(false));resizeObserver.observe(workspace.shell);mutationObserver?.disconnect();mutationObserver=new MutationObserver(()=>schedule(false));mutationObserver.observe(workspace.shell,{subtree:true,childList:true,attributes:true,attributeFilter:['class']})}
 apply(false);
}
frame.addEventListener('load',()=>requestAnimationFrame(bindDoc));requestAnimationFrame(bindDoc);
window.FoundationControlZoomV018={get:()=>scale,set:v=>{scale=clamp(v);apply(true);return scale},reset:()=>{scale=1;apply(true);return scale},fit:()=>{let w=390;try{w=frame.clientWidth||innerWidth}catch{}scale=clamp((w-12)/WORKSPACE_WIDTH);apply(true);return scale},mode:'stable-canvas',workspaceWidth:WORKSPACE_WIDTH};
})();