/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "gravity-atom",
  "title": "Атом · Гравитация",
  "version": 1,
  "introducedAt": "2026-11-10T12:00:00.000Z",
  "schemaVersion": 1,
  "module": "standalone-pattern-gravity-atom.js",
  "colorModes": 4,
  "palettes": [
    [
      255,
      255,
      255
    ],
    [
      108,
      223,
      235
    ],
    [
      191,
      165,
      255
    ],
    [
      247,
      204,
      147
    ]
  ],
  "defaults": {
    "patternId": "gravity-atom",
    "shape": 1,
    "gravity": 55,
    "atomForce": 48,
    "radius": 75,
    "damping": 14,
    "softening": 38,
    "rotation": 32,
    "density": 74,
    "mirror": 88,
    "shine": 68,
    "particleSize": 56,
    "colorModeIndex": 0,
    "fingerX": 0,
    "fingerY": 0,
    "fingerActive": 0,
    "seed": 20261110
  },
  "transientFields": [
    "fingerX",
    "fingerY",
    "fingerActive"
  ],
  "controls": [
    [
      "Форма частиц (0 сферы · 1 квадраты · 2 шестигранники)",
      "shape",
      0,
      2,
      1,
      "Ползунок",
      0
    ],
    [
      "Сила притяжения пальца",
      "gravity",
      0,
      100,
      1,
      "Ползунок",
      0
    ],
    [
      "Сила удержания атома",
      "atomForce",
      0,
      100,
      1,
      "Ползунок",
      0
    ],
    [
      "Радиус гравитации пальца",
      "radius",
      0,
      100,
      1,
      "Ползунок",
      0
    ],
    [
      "Демпфирование",
      "damping",
      0,
      100,
      1,
      "Ползунок",
      0
    ],
    [
      "Мягкость центра",
      "softening",
      0,
      100,
      1,
      "Ползунок",
      0
    ],
    [
      "Вращение облака",
      "rotation",
      0,
      100,
      1,
      "Ползунок",
      0
    ],
    [
      "Плотность частиц",
      "density",
      10,
      100,
      1,
      "Ползунок",
      0
    ],
    [
      "Зеркальность",
      "mirror",
      0,
      100,
      1,
      "Ползунок",
      0
    ],
    [
      "Сияние",
      "shine",
      0,
      100,
      1,
      "Ползунок",
      0
    ],
    [
      "Размер частиц",
      "particleSize",
      0,
      100,
      1,
      "Ползунок",
      0
    ]
  ],
  "gestureHints": [
    [
      "Одним пальцем",
      "Удерживай и перемещай палец по облаку: частицы притягиваются к нему и конкурируют с атомом. Отпусти, чтобы убрать гравитацию пальца."
    ]
  ],
  "schema": {
    "fingerX": {
      "type": "number",
      "min": 0,
      "max": 10000
    },
    "fingerY": {
      "type": "number",
      "min": 0,
      "max": 10000
    },
    "fingerActive": {
      "type": "number",
      "min": 0,
      "max": 1,
      "integer": true
    },
    "seed": {
      "type": "number",
      "min": 0,
      "max": 4294967295,
      "integer": true
    }
  },
  "keyFields": [
    "shape",
    "gravity",
    "atomForce",
    "radius",
    "damping",
    "softening",
    "rotation",
    "density",
    "mirror",
    "shine",
    "particleSize",
    "colorModeIndex",
    "seed"
  ]
}
END_SETKA_PATTERN_DESCRIPTOR */
(()=>{
"use strict";
if(typeof window!=="object"||typeof document!=="object")return;
const registry=window.SetkaPatternRegistryV1;
const id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
const TAU=Math.PI*2,MAX=2100,states=new WeakMap();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rnd(i,k,seed){let v=(Math.imul(i+1,0x9e3779b1)^Math.imul(k+1,0x85ebca6b)^seed)>>>0;v=Math.imul(v^(v>>>16),0x7feb352d);v=Math.imul(v^(v>>>15),0x846ca68b);return ((v^(v>>>16))>>>0)/4294967296}
function create(w,h,seed){
 const P=[],R=Math.min(w,h)*.31;
 for(let i=0;i<MAX;i++){
  const theta=rnd(i,1,seed)*TAU,z=rnd(i,2,seed)*2-1,r=Math.pow(rnd(i,3,seed),.56),f=Math.sqrt(1-z*z);
  const ox=f*Math.cos(theta)*r,oy=f*Math.sin(theta)*r,oz=z*r;
  P.push({ox,oy,oz,x:w*.5+ox*R,y:h*.49+oy*R*.88,vx:0,vy:0,lum:rnd(i,4,seed),sz:rnd(i,5,seed),phase:rnd(i,6,seed)*TAU,spin:rnd(i,7,seed)*2-1,tilt:rnd(i,8,seed)*TAU});
 }
 return {P,w,h,seed,lastFrame:null,time:0};
}
function polygon(ctx,x,y,r,sides,angle,flat){
 ctx.beginPath();
 for(let j=0;j<sides;j++){
  const q=angle+j*TAU/sides,px=x+Math.cos(q)*r,py=y+Math.sin(q)*r*flat;
  if(j===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
 }
 ctx.closePath();
}
function render(ctx,width,height,c,frame,preview){
 const w=Math.max(1,width),h=Math.max(1,height),seed=c.seed>>>0;
 let st=states.get(ctx);
 if(!st||st.seed!==seed||Math.abs(st.w-w)>1||Math.abs(st.h-h)>1||frame<(st.lastFrame??-1)-1){
  st=create(w,h,seed);states.set(ctx,st);
 }
 const previous=st.lastFrame;
 const delta=previous===null?1:clamp(frame-previous,0,3);
 st.lastFrame=frame;
 const dt=delta/60;
 st.time+=dt*(.12+c.rotation*.016);
 const time=st.time,cx=w*.5,cy=h*.49,R=Math.min(w,h)*.31;
 const n=preview?Math.min(480,Math.round(130+c.density*3)):Math.min(MAX,Math.round(450+c.density*16));
 const [red,green,blue]=registry.get(id).palettes[c.colorModeIndex]||[255,255,255];
 const rgb=red+","+green+","+blue;
 const angle=time*.23,ca=Math.cos(angle),sa=Math.sin(angle);
 const reach=45+c.radius*3.7,eps=7+c.softening*.38;
 const fingerGM=c.gravity===0?0:1600*Math.pow(1+c.gravity/13,3);
 const atomSpring=.6+c.atomForce*.115,drag=.16+c.damping*.035;
 const held=c.fingerActive===1,fx=c.fingerX,fy=c.fingerY;
 if(dt>0){
  const steps=2,step=dt/steps;
  for(let s=0;s<steps;s++)for(let i=0;i<n;i++){
   const p=st.P[i],rx=p.ox*ca-p.oz*sa,rz=p.ox*sa+p.oz*ca;
   const hx=cx+rx*R,hy=cy+(p.oy*.88+rz*.14)*R;
   let ax=(hx-p.x)*atomSpring,ay=(hy-p.y)*atomSpring;
   if(held&&fingerGM>0){
    const dx=fx-p.x,dy=fy-p.y,r2=dx*dx+dy*dy,dist=Math.sqrt(r2);
    if(dist<reach){
     const cutoff=Math.pow(Math.max(0,1-dist/reach),1.3);
     const f=fingerGM*cutoff/Math.pow(r2+eps*eps,1.5);
     ax+=dx*f;ay+=dy*f;
    }
   }
   p.vx=(p.vx+ax*step)*Math.exp(-drag*step);
   p.vy=(p.vy+ay*step)*Math.exp(-drag*step);
   const v=Math.hypot(p.vx,p.vy);
   if(v>850){p.vx*=850/v;p.vy*=850/v}
   p.x+=p.vx*step;p.y+=p.vy*step;
  }
 }
 ctx.save();ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);
 const m=c.mirror/100,shine=c.shine/100,scale=.48+c.particleSize*.012;
 ctx.globalCompositeOperation="lighter";
 for(let i=0;i<n;i++){
  const p=st.P[i],r=(.45+p.sz*1.45)*scale;
  const shimmer=.74+.26*Math.sin(time*.65+p.phase);
  const spin=p.tilt+time*(.16+p.spin*.26),flat=.22+.78*Math.abs(Math.cos(p.phase+time*.28));
  const reflection=Math.pow(Math.abs(Math.cos(spin+time*.12)),3);
  if(shine>0){
   ctx.fillStyle="rgba("+rgb+","+(0.018+p.lum*.04)*shine*shimmer+")";
   ctx.beginPath();ctx.arc(p.x,p.y,r*(2.2+shine*1.6),0,TAU);ctx.fill();
  }
  if(c.shape===0){
   ctx.fillStyle="rgba("+rgb+","+(0.17+p.lum*.35)+")";
   ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.fill();
   if(m>0){
    ctx.fillStyle="rgba(255,255,255,"+m*(.3+p.lum*.65)*shimmer+")";
    ctx.beginPath();ctx.arc(p.x-r*.24,p.y-r*.27,Math.max(.18,r*.35),0,TAU);ctx.fill();
   }
  }else{
   const sides=c.shape===1?4:6,rot=spin+(sides===4?Math.PI/4:0);
   polygon(ctx,p.x,p.y,r*1.28,sides,rot,flat);
   ctx.fillStyle="rgba("+rgb+","+(.12+p.lum*.35+m*reflection*.18)+")";ctx.fill();
   ctx.strokeStyle="rgba(255,255,255,"+m*(.16+.58*reflection)+")";ctx.lineWidth=.45;ctx.stroke();
   if(m>0){
    ctx.fillStyle="rgba(255,255,255,"+m*(.12+.7*reflection)*shimmer+")";
    polygon(ctx,p.x-r*.12,p.y-r*.12,r*.55,sides,rot,flat);ctx.fill();
   }
  }
 }
 ctx.globalCompositeOperation="source-over";
 const core=ctx.createRadialGradient(cx,cy,0,cx,cy,27);
 core.addColorStop(0,"rgba(255,255,255,.97)");
 core.addColorStop(.13,"rgba(225,235,255,.83)");
 core.addColorStop(.38,"rgba(139,175,245,.18)");
 core.addColorStop(1,"rgba(139,175,245,0)");
 ctx.fillStyle=core;ctx.beginPath();ctx.arc(cx,cy,27,0,TAU);ctx.fill();
 if(held&&fingerGM>0&&!preview){
  const haloR=20+c.radius*.38;
  const halo=ctx.createRadialGradient(fx,fy,0,fx,fy,haloR);
  halo.addColorStop(0,"rgba("+rgb+",.34)");halo.addColorStop(1,"rgba("+rgb+",0)");
  ctx.fillStyle=halo;ctx.beginPath();ctx.arc(fx,fy,haloR,0,TAU);ctx.fill();
 }
 ctx.restore();
}
function interact(c,e){
 if(e.type!=="gesture")return c;
 if(e.fingers!==1){if(e.phase==="end"||e.phase==="start")return {...c,fingerActive:0};return c}
 if(e.phase==="end")return {...c,fingerActive:0};
 if(e.phase==="start"||e.phase==="move"){
  return {...c,fingerX:clamp(e.x,0,10000),fingerY:clamp(e.y,0,10000),fingerActive:1};
 }
 return c;
}
registry.bindRenderer(id,render);
registry.bindInteraction(id,interact);
})();