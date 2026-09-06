(()=>{
'use strict';
const KEY='setka:foundation:president:zoom:v018';
const LEVELS=[.6,.75,.9,1,1.15,1.3,1.4];
const frame=document.getElementById('appFrame');
const bar=document.querySelector('.controlBar');
if(!frame||!bar)return;
let scale=1;
try{const x=Number(localStorage.getItem(KEY));if(LEVELS.includes(x))scale=x}catch{}
const wrap=document.createElement('div');wrap.className='zoomTool';wrap.setAttribute('aria-label','Масштаб админки');wrap.innerHTML='<button type="button" data-zoom="out" aria-label="Уменьшить масштаб">−</button><span class="zoomValue">100%</span><button type="button" data-zoom="in" aria-label="Увеличить масштаб">+</button>';
const anchor=document.getElementById('refreshVersions');bar.insertBefore(wrap,anchor||null);
const value=wrap.querySelector('.zoomValue');
function nearestIndex(){let best=0,dist=Infinity;LEVELS.forEach((v,i)=>{const d=Math.abs(v-scale);if(d<dist){dist=d;best=i}});return best}
function apply(){value.textContent=`${Math.round(scale*100)}%`;try{localStorage.setItem(KEY,String(scale))}catch{}try{const d=frame.contentDocument;if(!d)return;const root=d.documentElement,body=d.body;if('zoom' in root.style){root.style.zoom=String(scale);root.style.transform='';root.style.width=''}else{root.style.zoom='';body.style.transformOrigin='0 0';body.style.transform=`scale(${scale})`;body.style.width=`${100/scale}%`}d.documentElement.dataset.shellZoom=String(scale);frame.contentWindow.dispatchEvent(new CustomEvent('foundation:admin-zoom',{detail:{scale}}))}catch{}}
function step(dir){const i=nearestIndex(),j=Math.max(0,Math.min(LEVELS.length-1,i+dir));scale=LEVELS[j];apply()}
wrap.addEventListener('click',e=>{const b=e.target.closest('button[data-zoom]');if(!b)return;step(b.dataset.zoom==='in'?1:-1)});
frame.addEventListener('load',()=>requestAnimationFrame(apply));
apply();
window.FoundationControlZoomV018={get:()=>scale,set:v=>{const n=Number(v);if(!Number.isFinite(n))return scale;scale=LEVELS.reduce((a,b)=>Math.abs(b-n)<Math.abs(a-n)?b:a,LEVELS[0]);apply();return scale}};
})();