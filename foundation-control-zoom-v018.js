(()=>{
'use strict';
const KEY='setka:foundation:president:zoom:v018';
const MIN=.5,MAX=1.5;
const frame=document.getElementById('appFrame');
if(!frame)return;
let scale=1,pinch=null,raf=0;
try{const x=Number(localStorage.getItem(KEY));if(Number.isFinite(x))scale=Math.max(MIN,Math.min(MAX,x))}catch{}
function clamp(v){return Math.max(MIN,Math.min(MAX,Number(v)||1))}
function persist(){try{localStorage.setItem(KEY,String(scale))}catch{}}
function apply(save=true){
 const d=frame.contentDocument;if(!d)return;
 const root=d.documentElement,body=d.body;if(!root||!body)return;
 if('zoom' in root.style){root.style.zoom=String(scale);root.style.transform='';root.style.width=''}
 else{root.style.zoom='';body.style.transformOrigin='0 0';body.style.transform=`scale(${scale})`;body.style.width=`${100/scale}%`}
 root.style.overflow='auto';body.style.overflow='visible';root.dataset.shellZoom=String(scale);
 if(save)persist();
 try{frame.contentWindow.dispatchEvent(new CustomEvent('foundation:admin-zoom',{detail:{scale,source:'gesture'}}))}catch{}
}
function schedule(save=false){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>apply(save))}
function distance(t){const dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY;return Math.hypot(dx,dy)}
function bindDoc(){
 const d=frame.contentDocument;if(!d||d.documentElement.dataset.gestureZoomBound==='1')return;
 d.documentElement.dataset.gestureZoomBound='1';
 const start=e=>{if(e.touches&&e.touches.length===2){pinch={distance:Math.max(1,distance(e.touches)),scale};e.preventDefault()}};
 const move=e=>{if(!pinch||!e.touches||e.touches.length<2)return;e.preventDefault();scale=clamp(pinch.scale*(distance(e.touches)/pinch.distance));schedule(false)};
 const end=e=>{if(pinch&&(!e.touches||e.touches.length<2)){pinch=null;apply(true)}};
 d.addEventListener('touchstart',start,{passive:false,capture:true});
 d.addEventListener('touchmove',move,{passive:false,capture:true});
 d.addEventListener('touchend',end,{passive:false,capture:true});
 d.addEventListener('touchcancel',end,{passive:false,capture:true});
 d.addEventListener('wheel',e=>{if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();scale=clamp(scale*(e.deltaY>0?.94:1.06));apply(true)},{passive:false,capture:true});
 apply(false);
}
frame.addEventListener('load',()=>requestAnimationFrame(bindDoc));
requestAnimationFrame(bindDoc);
window.FoundationControlZoomV018={
 get:()=>scale,
 set:v=>{scale=clamp(v);apply(true);return scale},
 reset:()=>{scale=1;apply(true);return scale},
 mode:'gesture'
};
})();