(()=>{
'use strict';
const KEY='setka:foundation:president:zoom:v018-transform1';
const MIN=.18,MAX=2.25,WORKSPACE_WIDTH=1280;
const frame=document.getElementById('appFrame');
if(!frame)return;
let scale=1,pinch=null,extentRaf=0,mutationObserver=null;
function clamp(v){return Math.max(MIN,Math.min(MAX,Number(v)||1))}
function frameWidth(){try{return frame.clientWidth||innerWidth||390}catch{return 390}}
function fitValue(){return clamp(Math.max(1,frameWidth()-12)/WORKSPACE_WIDTH)}
function persist(){try{localStorage.setItem(KEY,String(scale))}catch{}}
function midpoint(t){return{x:(t[0].clientX+t[1].clientX)/2,y:(t[0].clientY+t[1].clientY)/2}}
function distance(t){const dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY;return Math.hypot(dx,dy)}
function ensureWorkspace(d){
 const shell=d.getElementById('app')||d.querySelector('.shell');
 if(!shell)return null;
 let wrap=d.getElementById('foundationWorkspace018');
 if(!wrap){
   wrap=d.createElement('div');
   wrap.id='foundationWorkspace018';
   shell.parentNode?.insertBefore(wrap,shell);
   wrap.appendChild(shell);
 }
 shell.style.width=`${WORKSPACE_WIDTH}px`;
 shell.style.minWidth=`${WORKSPACE_WIDTH}px`;
 shell.style.maxWidth='none';
 shell.style.zoom='';
 shell.style.transformOrigin='0 0';
 wrap.style.position='relative';
 wrap.style.transform='none';
 wrap.style.transformOrigin='0 0';
 return{shell,wrap};
}
function rawHeight(shell){return Math.max(shell.scrollHeight,shell.offsetHeight,900)}
function updateExtent(workspace){
 if(!workspace)return;
 const {shell,wrap}=workspace;
 const h=rawHeight(shell);
 wrap.style.width=`${Math.ceil(WORKSPACE_WIDTH*scale)}px`;
 wrap.style.height=`${Math.ceil(h*scale)}px`;
 wrap.style.minHeight=`${Math.ceil(900*scale)}px`;
}
function queueExtent(workspace){
 cancelAnimationFrame(extentRaf);
 extentRaf=requestAnimationFrame(()=>updateExtent(workspace));
}
function apply(save=true){
 let d;
 try{d=frame.contentDocument}catch{return}
 if(!d)return;
 const workspace=ensureWorkspace(d);
 if(!workspace)return;
 const {shell}=workspace,root=d.documentElement,body=d.body;
 if(!root||!body)return;
 shell.style.zoom='';
 shell.style.transform=`scale(${scale})`;
 shell.style.transformOrigin='0 0';
 root.style.overflow='auto';
 body.style.overflow='auto';
 root.style.scrollBehavior='auto';
 body.style.scrollBehavior='auto';
 root.style.overscrollBehavior='contain';
 body.style.overscrollBehavior='contain';
 root.dataset.shellZoom=String(scale);
 root.dataset.shellZoomMode='transform-hit-safe';
 updateExtent(workspace);
 if(save)persist();
 try{frame.contentWindow.dispatchEvent(new CustomEvent('foundation:admin-zoom',{detail:{scale,source:'gesture-canvas-transform'}}))}catch{}
}
function bindDoc(){
 let d;
 try{d=frame.contentDocument}catch{return}
 if(!d||d.documentElement.dataset.gestureZoomBound==='4')return;
 d.documentElement.dataset.gestureZoomBound='4';
 const workspace=ensureWorkspace(d);
 if(!workspace)return;
 const scroller=()=>d.scrollingElement||d.documentElement;
 const start=e=>{
   if(!e.touches||e.touches.length!==2)return;
   const m=midpoint(e.touches),s=scroller();
   pinch={distance:Math.max(1,distance(e.touches)),scale,contentX:(s.scrollLeft+m.x)/scale,contentY:(s.scrollTop+m.y)/scale};
   e.preventDefault();
 };
 const move=e=>{
   if(!pinch||!e.touches||e.touches.length<2)return;
   e.preventDefault();
   const m=midpoint(e.touches);
   scale=clamp(pinch.scale*(distance(e.touches)/pinch.distance));
   apply(false);
   const s=scroller();
   s.scrollLeft=Math.max(0,pinch.contentX*scale-m.x);
   s.scrollTop=Math.max(0,pinch.contentY*scale-m.y);
 };
 const end=e=>{
   if(pinch&&(!e.touches||e.touches.length<2)){
     pinch=null;
     apply(true);
   }
 };
 d.addEventListener('touchstart',start,{passive:false,capture:true});
 d.addEventListener('touchmove',move,{passive:false,capture:true});
 d.addEventListener('touchend',end,{passive:false,capture:true});
 d.addEventListener('touchcancel',end,{passive:false,capture:true});
 d.addEventListener('wheel',e=>{
   if(!(e.ctrlKey||e.metaKey))return;
   e.preventDefault();
   const s=scroller(),before=scale,contentX=(s.scrollLeft+e.clientX)/before,contentY=(s.scrollTop+e.clientY)/before;
   scale=clamp(scale*(e.deltaY>0?.92:1.08));
   apply(true);
   s.scrollLeft=Math.max(0,contentX*scale-e.clientX);
   s.scrollTop=Math.max(0,contentY*scale-e.clientY);
 },{passive:false,capture:true});
 mutationObserver?.disconnect();
 mutationObserver=new MutationObserver(()=>queueExtent(workspace));
 mutationObserver.observe(workspace.shell,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','open']});
 apply(false);
}
try{
 const stored=Number(localStorage.getItem(KEY));
 if(Number.isFinite(stored))scale=clamp(stored);
 else if(frameWidth()<760)scale=fitValue();
}catch{
 if(frameWidth()<760)scale=fitValue();
}
frame.addEventListener('load',()=>requestAnimationFrame(()=>{
 if(frameWidth()<760){
   try{
     if(!localStorage.getItem(KEY))scale=fitValue();
   }catch{scale=fitValue()}
 }
 bindDoc();
}));
window.addEventListener('resize',()=>{if(frameWidth()<760&&scale>1.2)scale=fitValue();apply(false)});
requestAnimationFrame(bindDoc);
window.FoundationControlZoomV018={
 get:()=>scale,
 set:v=>{scale=clamp(v);apply(true);return scale},
 reset:()=>{scale=1;apply(true);return scale},
 fit:()=>{scale=fitValue();apply(true);return scale},
 mode:'stable-canvas-transform',
 workspaceWidth:WORKSPACE_WIDTH
};
})();