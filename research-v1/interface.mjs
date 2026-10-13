import {resolveRecipe} from './recipe.mjs?v=1.1.2';
import {draw} from './renderer.mjs?v=1.1.2';
const finite=v=>v!=null&&Number.isFinite(Number(v));
const color=v=>/^#[\da-f]{3,8}$|^rgba?\([\d\s.,%]+\)$/i.test(String(v))?String(v):'transparent';
// Render recorded primitives only. No HTML, input values, executable SVG or URLs.
export function paintInterface(root,ui,width,height,state={}){
 root.replaceChildren();if(!ui?.elements||!Array.isArray(ui.elements))return false;
 const vw=Number(ui.viewport?.width),vh=Number(ui.viewport?.height);
 if(!(vw>0&&vh>0))return false;
 root.style.width=`${vw}px`;root.style.height=`${vh}px`;root.style.transform=`scale(${width/vw},${height/vh})`;
 for(const e of ui.elements.slice(0,120)){
  if(!Array.isArray(e.rect)||e.rect.length!==4||!e.rect.every(finite))continue;
  const [x,y,w,h]=e.rect.map(Number);if(w<=0||h<=0||w>5000||h>5000)continue;
  const el=document.createElement(e.visual?'canvas':'div');
  Object.assign(el.style,{position:'absolute',left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`,boxSizing:'border-box',overflow:'hidden'});
  if(e.visual){el.width=Math.max(1,Math.round(w));el.height=Math.max(1,Math.round(h));const r=resolveRecipe(e.visual);if(r.ok&&finite(e.visual.frame))draw(el,r.config,Number(e.visual.frame),r.renderId,e.visual.preview===true);}
  else if(e.svg){
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.style.width='100%';svg.style.height='100%';
   if(/^[-\d.,\s]+$/.test(String(e.svg.viewBox)))svg.setAttribute('viewBox',e.svg.viewBox);
   for(const s of (e.svg.shapes||[]).slice(0,40)){
    if(!['path','rect','circle','line','polyline','polygon','ellipse'].includes(s.tag))continue;
    const n=document.createElementNS('http://www.w3.org/2000/svg',s.tag);
    for(const [k,v] of Object.entries(s.attrs||{}))if(['d','x','y','width','height','rx','ry','cx','cy','r','x1','y1','x2','y2','points'].includes(k)&&/^[-\d.,\sMmLlHhVvCcSsQqTtAaZzEe+]+$/.test(String(v)))n.setAttribute(k,String(v));
    n.setAttribute('fill',s.fill==='none'?'none':color(s.fill));n.setAttribute('stroke',s.stroke==='none'?'none':color(s.stroke));n.setAttribute('stroke-width',String(Math.max(0,Math.min(20,Number(s.strokeWidth)||0))));svg.appendChild(n);
   }el.appendChild(svg);
  }
  else{
   const pad=Array.isArray(e.padding)?e.padding:[0,0];
   Object.assign(el.style,{color:color(e.color),background:color(e.background),border:`${Math.max(0,Math.min(8,Number(e.border)||0))}px solid ${color(e.borderColor)}`,
    borderRadius:`${Math.max(0,Math.min(300,Number(e.radius)||0))}px`,fontSize:`${Math.max(6,Math.min(80,Number(e.fontSize)||12))}px`,
    fontWeight:/^\d{3}$/.test(String(e.fontWeight))?String(e.fontWeight):'400',textAlign:['left','center','right'].includes(e.align)?e.align:'left',
    padding:`${Number(pad[1])||0}px ${Number(pad[0])||0}px`,opacity:Math.max(0,Math.min(1,finite(e.opacity)?Number(e.opacity):1)),whiteSpace:'pre-wrap'});
   el.textContent=e.control==='favoriteButton'&&Object.hasOwn(state,'favoriteId')?(state.favoriteId?'♥':'♡'):String(e.text||'').slice(0,350);
  }
  root.appendChild(el);
 }
 return true;
}
