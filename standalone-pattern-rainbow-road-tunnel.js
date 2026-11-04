/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "rainbow-road-tunnel",
  "title": "Радужный тоннель · 3DFP",
  "version": 1,
  "schemaVersion": 1,
  "introducedAt": "2026-11-04T20:44:00.000Z",
  "module": "standalone-pattern-rainbow-road-tunnel.js",
  "colorModes": 9,
  "palettes": [
    [
      255,
      255,
      255
    ],
    [
      118,
      255,
      166
    ],
    [
      74,
      246,
      255
    ],
    [
      255,
      82,
      222
    ],
    [
      255,
      144,
      57
    ],
    [
      70,
      255,
      177
    ],
    [
      255,
      214,
      96
    ],
    [
      149,
      218,
      255
    ],
    [
      211,
      168,
      255
    ]
  ],
  "defaults": {
    "patternId": "rainbow-road-tunnel",
    "speed": 1,
    "follow": 1,
    "turns": 1,
    "randomness": 0,
    "hills": 0,
    "shape": 0,
    "opacity": 1,
    "roadOpacity": 1,
    "density": 1,
    "glow": 1,
    "pulse": 1,
    "zoom": 1,
    "yawOffset": 0,
    "seed": 92341,
    "colorModeIndex": 0
  },
  "controls": [
    [
      "Скорость езды",
      "speed",
      0,
      3,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Следование камеры",
      "follow",
      0,
      1.3,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Сила поворотов",
      "turns",
      0,
      5,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Непредсказуемость дороги",
      "randomness",
      0,
      1,
      0.01,
      "Ползунок",
      0
    ],
    [
      "Спуски и подъёмы",
      "hills",
      0,
      3,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Форма тоннеля",
      "shape",
      0,
      1,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Непрозрачность стен",
      "opacity",
      0,
      1,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Непрозрачность дороги",
      "roadOpacity",
      0,
      1,
      0.05,
      "Ползунок",
      0,
      "0% — дорожное полотно невидимо, разметка остаётся; 100% — чёрная сплошная дорога"
    ],
    [
      "Плотность сфер",
      "density",
      0.3,
      1.7,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Свечение",
      "glow",
      0.4,
      1.6,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Пульсация разметки",
      "pulse",
      0,
      2,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Масштаб обзора",
      "zoom",
      0.65,
      1.55,
      0.01,
      "2 пальца ↑↓",
      2
    ],
    [
      "Ручной обзор",
      "yawOffset",
      -0.27,
      0.27,
      0.001,
      "В центре ←→",
      1
    ]
  ],
  "schema": {
    "seed": {
      "type": "number",
      "min": 0,
      "max": 4294967295,
      "integer": true
    }
  },
  "gestureHints": [
    [
      "Направление взгляда",
      "Один палец в центре ←→ — ручной обзор по горизонтали"
    ],
    [
      "Масштаб",
      "Два пальца ↑↓ — приближение или отдаление"
    ]
  ],
  "keyFields": [
    "speed",
    "follow",
    "turns",
    "randomness",
    "hills",
    "shape",
    "opacity",
    "roadOpacity",
    "density",
    "glow",
    "pulse",
    "zoom",
    "yawOffset",
    "seed",
    "colorModeIndex"
  ]
}
END_SETKA_PATTERN_DESCRIPTOR */

(()=>{
"use strict";
const registry=window.SetkaPatternRegistryV1,id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
const PI=Math.PI,TAU=PI*2,DS=.7,COUNT=12500,MAX_PARTICLES=14500,L=175;
const CLIP=.46,ARC=22;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
const hash=n=>{n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return ((n^(n>>>16))>>>0)/4294967296};
const paletteStops=[
[[0,0,0,74],[1,0,0,74]],
[[0,100,74,67],[.2,54,77,66],[.39,10,80,67],[.55,312,79,68],[.74,269,77,68],[1,204,80,68]],
[[0,94,96,65],[.2,56,95,65],[.4,4,95,65],[.58,314,94,66],[.8,258,95,65],[1,179,95,68]],
[[0,292,79,66],[.3,269,82,64],[.6,239,87,65],[1,187,91,68]],
[[0,337,85,67],[.34,305,80,65],[.65,259,82,65],[1,190,88,67]],
[[0,50,90,70],[.3,24,90,67],[.6,3,91,64],[1,320,85,66]],
[[0,76,86,63],[.3,116,87,63],[.6,157,86,63],[1,190,86,66]],
[[0,49,84,72],[.3,39,85,70],[.66,25,86,67],[1,48,87,70]],
[[0,180,80,76],[.3,205,79,72],[.6,231,82,69],[1,266,79,72]]
];
function color(u,mode){
 const stops=paletteStops[clamp(mode|0,0,8)];
 for(let j=1;j<stops.length;j++){
  const a=stops[j-1],b=stops[j];if(u>b[0])continue;
  const t=clamp((u-a[0])/(b[0]-a[0]),0,1);
  let diff=b[1]-a[1];if(diff>180)diff-=360;if(diff< -180)diff+=360;
  return[(a[1]+diff*t+360)%360,a[2]+(b[2]-a[2])*t,a[3]+(b[3]-a[3])*t];
 }
 return stops[stops.length-1].slice(1);
}
const modelCache=new Map();
function buildModel(c){
 const key=[c.turns,c.randomness,c.hills,c.seed].join("|");
 if(modelCache.has(key))return modelCache.get(key);
 let state=(c.seed>>>0)||92341;
 function rand(){state=(state+0x6D2B79F5)|0;let z=state;z=Math.imul(z^(z>>>15),z|1);z^=z+Math.imul(z^(z>>>7),z|61);return ((z^(z>>>14))>>>0)/4294967296}
 const between=(a,b)=>a+(b-a)*rand();
 const secs=[];let dist=0,angle=0;
 while(dist<COUNT*DS+500){
  const long=rand()<.23,straight=rand()<.31;
  const len=straight?between(16,95):long?between(110,255):between(26,100);
  let dir=rand()<.5?-1:1;
  if(angle>.78)dir=-1;else if(angle<-.78)dir=1;
  const next=straight?angle:clamp(angle+dir*between(.23,long?.88:.62),-1.05,1.05);
  secs.push([dist,dist+len,angle,next]);dist+=len;angle=next;
 }
 const X=new Float32Array(COUNT),Y=new Float32Array(COUNT),Z=new Float32Array(COUNT),A=new Float32Array(COUNT),G=new Float32Array(COUNT);
 const strength=1.24*Math.tanh(c.turns*.32);
 let segment=0,prev=0;
 for(let i=0;i<COUNT;i++){
  const s=i*DS;
  while(segment<secs.length-1&&s>=secs[segment][1])segment++;
  const row=secs[segment],randomAngle=row[2]+(row[3]-row[2])*smooth((s-row[0])/(row[1]-row[0]));
  const turn=strength*((1-c.randomness)*Math.sin(s*.085+.20)+c.randomness*randomAngle);
  const grade=c.hills*(.14*Math.sin(s*.045+.52)+.065*Math.sin(s*.088-1.15));
  A[i]=turn;G[i]=grade;
  if(i){const mid=(turn+prev)*.5;X[i]=X[i-1]+DS*Math.sin(mid);Z[i]=Z[i-1]+DS*Math.cos(mid);Y[i]=Y[i-1]+DS*(grade+G[i-1])*.5;}
  prev=turn;
 }
 function at(s){
  const q=clamp(s/DS,0,COUNT-1.001),i=Math.floor(q),t=q-i;
  return {x:X[i]+(X[i+1]-X[i])*t,y:Y[i]+(Y[i+1]-Y[i])*t,z:Z[i]+(Z[i+1]-Z[i])*t,
   a:A[i]+(A[i+1]-A[i])*t,g:G[i]+(G[i+1]-G[i])*t};
 }
 const m={at};modelCache.set(key,m);if(modelCache.size>3)modelCache.delete(modelCache.keys().next().value);return m;
}
const particleCache=new Map();
function particles(seed){
 if(particleCache.has(seed))return particleCache.get(seed);
 const arr=[];
 for(let i=0;i<MAX_PARTICLES;i++){
  const base=(seed^Math.imul(i+1,0x9e3779b1))>>>0;
  arr.push({s:hash(base^0x13d758bd)*L,a:(.018+hash(base^0x49fbd340)*.964)*PI,
   r:(.019+.052*hash(base^0x3f81fa07))*(.7+.55*hash(base^0x5fb27819)),
   alpha:.48+.45*hash(base^0x82bd401c),j:-.025+.07*hash(base^0x1748bacf)});
 }
 particleCache.set(seed,arr);if(particleCache.size>3)particleCache.delete(particleCache.keys().next().value);return arr;
}
const spriteCache=new Map();
function sprites(mode){
 if(spriteCache.has(mode))return spriteCache.get(mode);
 const a=Array.from({length:60},(_,i)=>{
  const can=document.createElement("canvas");can.width=can.height=36;
  const g=can.getContext("2d"),col=color(i/59,mode),h=col[0],s=col[1],l=col[2],gr=g.createRadialGradient(18,18,0,18,18,17);
  gr.addColorStop(0,"hsla("+h+","+s+"%,"+Math.min(90,l+11)+"%,1)");
  gr.addColorStop(.40,"hsla("+h+","+s+"%,"+l+"%,.93)");
  gr.addColorStop(.58,"hsla("+h+","+s+"%,"+(l-4)+"%,.78)");
  gr.addColorStop(.74,"hsla("+h+","+s+"%,"+(l-7)+"%,.12)");
  gr.addColorStop(1,"hsla("+h+","+s+"%,"+(l-7)+"%,0)");
  g.fillStyle=gr;g.fillRect(0,0,36,36);
  return can;
 });
 spriteCache.set(mode,a);return a;
}
function render(ctx,w,h,c,frame,preview=false){
 const width=Math.max(1,w),height=Math.max(1,h),f=Math.max(0,Number(frame)||0);
 const model=buildModel(c),at=model.at;
 const camS=48+f*12.8*c.speed/60;
 const camera=at(camS),behind=at(camS-1.4),ahead=at(camS+1.4),farAhead=at(camS+8);
 const yaw=c.follow*ahead.a+c.yawOffset,pitch=c.follow*Math.atan(ahead.g);
 const roll=clamp(-(farAhead.a-camera.a)*.095*c.follow,-.026,.026);
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),cb=Math.cos(roll),sb=Math.sin(roll);
 const focal=Math.min(width*.505,height*.88)/(1+.035*Math.max(0,c.turns-1))/c.zoom;
 const horizon=height*.551,eye=1.55;
 const roofWidth=4.70,roofHeight=4.70+6*c.shape;
 function xyz(s,x,y){
  const q=at(s),cc=Math.cos(q.a),ss=Math.sin(q.a);
  return{x:q.x+x*cc,y:q.y+y,z:q.z-x*ss};
 }
 function rel(p){
  const dx=p.x-camera.x,dy=p.y-camera.y-eye,dz=p.z-camera.z;
  const side=dx*cy-dz*sy,forward=dx*sy+dz*cy;
  return{x:side,y:dy*cp-forward*sp,z:forward*cp+dy*sp};
 }
 function pc(q){
  if(q.z<CLIP)return null;
  const k=focal/q.z,sx=q.x*k,yy=-q.y*k;
  return{x:width*.5+sx*cb-yy*sb,y:horizon+sx*sb+yy*cb,z:q.z};
 }
 function proj(s,x,y){return pc(rel(xyz(s,x,y)));}
 function polygon(vertices){
  const ps=vertices.map(rel),out=[];
  for(let i=0;i<ps.length;i++){
   const a=ps[i],b=ps[(i+1)%ps.length],okA=a.z>=CLIP,okB=b.z>=CLIP;
   if(okA)out.push(a);
   if(okA!==okB){
    const t=(CLIP-a.z)/(b.z-a.z);
    out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:CLIP});
   }
  }
  if(out.length<3)return;
  ctx.beginPath();out.forEach((q,i)=>{const p=pc(q);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y)});ctx.closePath();ctx.fill();
 }
 function floor(a,b){
  if(c.roadOpacity<=0)return;
  ctx.globalAlpha=c.roadOpacity;ctx.fillStyle="#000";
  polygon([xyz(b,-roofWidth,0),xyz(b,roofWidth,0),xyz(a,roofWidth,0),xyz(a,-roofWidth,0)]);
 }
 function shell(a,b){
  if(c.opacity<=0)return;
  ctx.globalAlpha=c.opacity;ctx.fillStyle="#000";
  for(let j=0;j<ARC;j++){
   const u=j*PI/ARC,v=(j+1)*PI/ARC;
   polygon([xyz(b,-roofWidth*Math.cos(u),roofHeight*Math.sin(u)),xyz(b,-roofWidth*Math.cos(v),roofHeight*Math.sin(v)),
    xyz(a,-roofWidth*Math.cos(v),roofHeight*Math.sin(v)),xyz(a,-roofWidth*Math.cos(u),roofHeight*Math.sin(u))]);
  }
 }
 const dots=particles(c.seed>>>0),maxDot=Math.min(dots.length,Math.floor((preview?2900:10200)*c.density));
 function dot(o,s){
  const radius=1+o.j,p=proj(s,-roofWidth*Math.cos(o.a)*radius,roofHeight*Math.sin(o.a)*radius);
  if(!p||p.x<-24||p.x>width+24||p.y<-24||p.y>height+24)return;
  const size=clamp(focal*o.r/p.z,.2,8.8)*1.65,i=clamp(Math.floor(o.a/PI*59),0,59);
  ctx.globalAlpha=clamp(o.alpha*c.glow*(p.z>74?.82:1),0,1);
  const col=color(o.a/PI,c.colorModeIndex|0);
  ctx.fillStyle=(c.colorModeIndex|0)===0?"#fff":"hsl("+col[0]+","+col[1]+"%,"+col[2]+"%)";
  if(size<.65)ctx.fillRect(p.x,p.y,1,1);
  else{ctx.beginPath();ctx.arc(p.x,p.y,size*.52,0,TAU);ctx.fill();}
 }
 function marker(s,x,track){
  const p=proj(s,x,.012),prev=proj(s-.10,x,.012),next=proj(s+.10,x,.012);
  if(!p||!prev||!next||p.x<-30||p.x>width+30||p.y<-30||p.y>height+30)return;
  const angle=Math.atan2(next.y-prev.y,next.x-prev.x);
  const wave=Math.max(.50,1+c.pulse*(.20*Math.sin(s*.81+track*1.3)+.09*Math.sin(s*1.38+track)));
  const natural=(track===1?.028:.051)*focal/p.z*wave;
  const radius=clamp(natural,.05,13),length=clamp(radius*(track===1?1.45:1.13),.05,15);
  const col=c.colorModeIndex===0?[0,0,75]:color(track===0?.08:track===1?.3:.93,c.colorModeIndex|0);
  ctx.save();ctx.globalAlpha=clamp(natural*2.5,.10,1)*clamp(1-p.z/230,.35,1);
  ctx.translate(p.x,p.y);ctx.rotate(angle);ctx.fillStyle=(c.colorModeIndex|0)===0?"#fff":"hsl("+col[0]+","+col[1]+"%,"+col[2]+"%)";
  ctx.beginPath();ctx.arc(0,0,Math.max(.05,radius*.92),0,TAU);ctx.fill();ctx.restore();
 }
 ctx.save();ctx.fillStyle="#000";ctx.globalAlpha=1;ctx.fillRect(0,0,width,height);
 const near=.62,far=preview?108:145,step=preview?2.1:1.3,nSeg=Math.ceil((far-near)/step);
 const buckets=Array.from({length:nSeg},()=>[]),marks=Array.from({length:nSeg},()=>[]);
 const start=((camS%L)+L)%L;
 for(let i=0;i<maxDot;i++){
  const ob=dots[i],d=(ob.s-start+L)%L+near;
  if(d>=far)continue;
  buckets[Math.min(nSeg-1,Math.floor((d-near)/step))].push([ob,camS+d]);
 }
 const gap=.45;
 for(let n=Math.ceil((camS+near)/gap);n<=Math.floor((camS+far)/gap);n++){
  const s=n*gap,d=s-camS;
  marks[Math.min(nSeg-1,Math.floor((d-near)/step))].push(s);
 }
 for(let k=nSeg-1;k>=0;k--){
  const a=camS+near+k*step,b=a+step;
  shell(a,b);floor(a,b);
  for(const [o,s] of buckets[k])dot(o,s);
  for(const s of marks[k]){marker(s,-3.08,0);marker(s,0,1);marker(s,3.08,2);}
 }
 ctx.restore();
}
function interact(c,e){
 if(e?.type==="patch")return {...c,...e.patch};
 if(e?.type!=="gesture"||e.phase==="start")return c;
 const dx=Number(e.dx)||0,dy=Number(e.dy)||0;
 if(e.fingers>=2)return {...c,zoom:clamp(c.zoom-dy*.002,.65,1.55)};
 if(e.fingers===1&&e.zone==="center")return {...c,yawOffset:clamp(c.yawOffset-dx*.001,-.27,.27)};
 return c;
}
registry.bindInteraction(id,interact);
registry.bindRenderer(id,render);
})();
