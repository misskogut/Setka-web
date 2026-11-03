/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "medusa",
  "title": "Медузы · Medusa",
  "version": 1,
  "introducedAt": "2026-11-03T21:47:43.000Z",
  "schemaVersion": 1,
  "module": "standalone-pattern-medusa.js",
  "colorModes": 9,
  "tapOverflow": "clamp",
  "palettes": [
    [255,255,255], [80,242,221], [98,139,255],
    [195,140,255], [255,131,187], [255,209,118],
    [255,255,255], [255,255,255], [255,255,255]
  ],
  "defaults": {
    "patternId": "medusa",
    "medusaCount": 3,
    "tentacleCount": 10,
    "tentacleLength": 50,
    "speed": 1,
    "sizeFactor": 1,
    "swayStrength": 1,
    "seed": 2011,
    "colorModeIndex": 0
  },
  "controls": [
    ["Медузы · тап = добавить", "medusaCount", 1, 30, 1, "Тап", 1],
    ["Щупальца", "tentacleCount", 6, 16, 1, "Справа ↑↓", 1],
    ["Длина щупалец", "tentacleLength", 20, 70, 1, "Слева ↑↓", 1],
    ["Скорость", "speed", 0.4, 2, 0.1, "Сверху ←→", 1],
    ["Размер медузы", "sizeFactor", 0.5, 2, 0.01, "Ползунок", 0],
    ["Покачивание", "swayStrength", 0.2, 2, 0.01, "Ползунок", 0]
  ],
  "schema": {
    "seed": {"type":"number","min":0,"max":4294967295,"integer":true}
  },
  "keyFields": ["medusaCount","tentacleCount","tentacleLength","speed","sizeFactor","swayStrength","seed","colorModeIndex"]
}
END_SETKA_PATTERN_DESCRIPTOR */
/*
 * Medusa, Denis Hovart, 2011 — CC BY 2.0.
 * https://creativecommons.org/licenses/by/2.0/
 * Processing / PVector / Penner physics adapted to deterministic SETKA Canvas 2D.
 * All bodies are seeded independently: adding a 4th–30th medusa leaves the
 * trajectories and tentacles of the original three unchanged.
 */
(()=>{
"use strict";
if(typeof window!=="object"||typeof document!=="object")return;
const registry=window.SetkaPatternRegistryV1;
const id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
const TAU=Math.PI*2,SPACE=3,HEAD=12,PART_SIZE=10;
const palettes=registry.get(id).palettes;
const states=new WeakMap();
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function hash(n){
 n=Math.imul(n^(n>>>16),0x7feb352d);
 n=Math.imul(n^(n>>>15),0x846ca68b);
 return ((n^(n>>>16))>>>0)/4294967296;
}
function rnd(seed,index,salt){return hash((seed^Math.imul(index+1,0x9e3779b1)^salt)>>>0)}
function expo(t,d){
 if(t<=0)return 0;
 if(t>=d)return 1;
 const n=t/(d/2);
 return n<1?.5*Math.pow(2,10*(n-1)):.5*(-Math.pow(2,-10*(n-1))+2);
}
function newCreature(index,c,at=0){
 const seed=c.seed>>>0;
 const x=rnd(seed,index,0x12481bcb)*600;
 const y=rnd(seed,index,0x3b7c33ee)*300;
 const path={start:0,duration:1,x,y,dx:0,dy:0};
 const body={
  index,seed,paths:[],pathEnd:0,lastX:x,lastY:y,
  distance:300+100*rnd(seed,index,0x478d3711),
  arms:[],len:c.tentacleLength
 };
 const arms=c.tentacleCount,len=c.tentacleLength;
 for(let a=0;a<arms;a++){
  const angle=a*TAU/arms;
  const coords=new Float32Array(len*2);
  const px=x+Math.cos(angle)*HEAD/2,py=y+Math.sin(angle)*HEAD/2;
  for(let k=0;k<len;k++){coords[k*2]=px+SPACE*k*Math.cos(angle);coords[k*2+1]=py+SPACE*k*Math.sin(angle);}
  body.arms.push(coords);
 }
 return body;
}
function pathThrough(b,t){
 while(b.pathEnd<=t){
  const ordinal=b.paths.length;
  const n=Math.imul(ordinal+1,0x85ebca6b)^Math.imul(b.index+1,0x27d4eb2d)^b.seed;
  const dur=50+Math.floor(hash(n^0x3912cc1d)*40);
  const ang=TAU*hash(n^0x42a7d9e7);
  let dx=Math.cos(ang)*b.distance,dy=Math.sin(ang)*b.distance;
  if(b.lastX+dx>600)dx=-Math.abs(dx);else if(b.lastX+dx<0)dx=Math.abs(dx);
  if(b.lastY+dy>600)dy=-Math.abs(dy);else if(b.lastY+dy<0)dy=Math.abs(dy);
  b.paths.push({start:b.pathEnd,duration:dur,x:b.lastX,y:b.lastY,dx,dy});
  b.lastX+=dx;b.lastY+=dy;b.pathEnd+=dur;
 }
}
function positionAt(b,t){
 pathThrough(b,t);
 // Segment search is small for gameplay; binary search also covers long
 // sessions opened directly from an immutable note/replay snapshot.
 let left=0,right=b.paths.length-1;
 while(left<right){
  const mid=(left+right+1)>>1;
  if(b.paths[mid].start<=t)left=mid;else right=mid-1;
 }
 const p=b.paths[left],factor=expo(t-p.start,p.duration);
 return {x:p.x+factor*p.dx,y:p.y+factor*p.dy};
}
function stepBody(b,frame,c){
 const head=positionAt(b,frame);
 const n=b.arms.length;
 // The source drifts angularly by tiny stochastic increments. A seeded
 // smooth drift avoids non-reproducible random() calls between snapshots.
 const drift=(.055*Math.sin(frame*.017+b.index*.77)+.032*Math.sin(frame*.039+b.index))*c.swayStrength;
 for(let a=0;a<n;a++){
  const angle=a*TAU/n+drift;
  const px=head.x+Math.cos(angle)*HEAD*c.sizeFactor/2,py=head.y+Math.sin(angle)*HEAD*c.sizeFactor/2;
  const p=b.arms[a];
  p[0]=px;p[1]=py;
  p[2]=px+SPACE*Math.cos(angle);p[3]=py+SPACE*Math.sin(angle);
  for(let k=2;k<b.len;k++){
   const o=k*2,prev=o-2,previousTwo=o-4;
   const vx=p[o]-p[previousTwo],vy=p[o+1]-p[previousTwo+1];
   const inv=SPACE/(Math.hypot(vx,vy)||1);
   p[o]=p[prev]+vx*inv;p[o+1]=p[prev+1]+vy*inv;
  }
 }
}
function warm(body,target,c){
 // A direct-open note may seek thousands of frames forward: reconstruct
 // head path analytically, then warm all physical tentacle links locally.
 // Live playback steps every frame without dropping any intermediate states.
 const begin=Math.max(0,target-220);
 if(begin){
  const head=positionAt(body,begin);
  for(let a=0;a<body.arms.length;a++){
   const angle=a*TAU/body.arms.length,coords=body.arms[a];
   const px=head.x+Math.cos(angle)*HEAD*c.sizeFactor/2,py=head.y+Math.sin(angle)*HEAD*c.sizeFactor/2;
   for(let k=0;k<body.len;k++){
    const o=k*2;
    coords[o]=px+SPACE*k*Math.cos(angle);
    coords[o+1]=py+SPACE*k*Math.sin(angle);
   }
  }
 }
 for(let k=begin;k<=target;k++)stepBody(body,k,c);
}
function stateFor(ctx,c,target){
 const signature=[c.seed,c.tentacleCount,c.tentacleLength].join("|");
 let s=states.get(ctx);
 if(!s||s.signature!==signature||s.frame>target||target-s.frame>500){
  s={signature,frame:target,bodies:[]};
  for(let i=0;i<c.medusaCount;i++){
   const b=newCreature(i,c);
   warm(b,target,c);
   s.bodies.push(b);
  }
  states.set(ctx,s);
  return s;
 }
 // Adding one or many medusae retains all old trajectories in-place.
 while(s.bodies.length<c.medusaCount){
  const b=newCreature(s.bodies.length,c);
  warm(b,s.frame,c);
  s.bodies.push(b);
 }
 if(s.bodies.length>c.medusaCount)s.bodies.length=c.medusaCount;
 for(let k=s.frame+1;k<=target;k++)for(const b of s.bodies)stepBody(b,k,c);
 s.frame=target;
 return s;
}
function color(mode,index,alpha,frame){
 if(mode<6){
  const [r,g,b]=palettes[mode];
  return "rgba("+r+","+g+","+b+","+alpha.toFixed(4)+")";
 }
 const hue=(mode===6?index*41+frame*.16:
            mode===7?index*49+frame*.05:index*69+frame*.47)%360;
 const sat=mode===7?68:mode===8?100:94;
 const light=mode===7?78:mode===8?63:71;
 return "hsla("+hue+","+sat+"%,"+light+"%,"+alpha.toFixed(4)+")";
}
function render(ctx,width,height,c,frame,preview=false){
 const w=Math.max(1,width),h=Math.max(1,height);
 const target=Math.max(0,Math.floor(Math.max(0,Number(frame)||0)*c.speed));
 const state=stateFor(ctx,c,target);
 const scale=Math.min(w,h)/600;
 const mode=clamp(Math.round(c.colorModeIndex),0,8);
 const skip=preview&&scale<.48&&state.bodies.length>12?2:1;
 ctx.save();
 ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);
 ctx.translate(w/2,h/2);ctx.scale(scale,scale);ctx.translate(-300,-300);
 for(let i=0;i<state.bodies.length;i++){
  const b=state.bodies[i],len=b.len;
  for(let j=len-1;j>=0;j-=skip){
   const size=PART_SIZE*c.sizeFactor*(len-j)/len;
   if(size*scale<.42)continue;
   ctx.fillStyle=color(mode,i,1-j/len,target);
   ctx.beginPath();
   for(const p of b.arms)ctx.arc(p[j*2],p[j*2+1],size/2,0,TAU);
   ctx.fill();
  }
 }
 ctx.restore();
}
registry.bindRenderer(id,render);
})();