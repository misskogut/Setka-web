/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "rainbow-road-tunnel",
  "title": "Радужный тоннель · 3DFP",
  "version": 3,
  "schemaVersion": 3,
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
    "colorModeIndex": 0,
    "steerX": 0,
    "steerY": 0,
    "sensitivity": 1
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
      12,
      0.05,
      "Ползунок",
      0,
      "0% — прямая горизонтальная траектория; максимум — значительно более глубокие виражи, развороты и кривые"
    ],
    [
      "Непредсказуемость дороги",
      "randomness",
      0,
      1,
      0.01,
      "Ползунок",
      0,
      "0% — регулярные левые и правые повороты; максимум — случайные прямые, длинные дуги, 3D-спирали и петли при достаточной силе поворотов и подъёмов"
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
      "Смещение взгляда",
      "yawOffset",
      -0.27,
      0.27,
      0.001,
      "Ползунок",
      0
    ],
    [
      "Изгиб дороги ←→",
      "steerX",
      -2.5,
      2.5,
      0.01,
      "Центр ←→",
      1,
      "Проведи пальцем по тоннелю вправо/влево: меняется изгиб следующих участков дороги"
    ],
    [
      "Изгиб дороги ↑↓",
      "steerY",
      -2.5,
      2.5,
      0.01,
      "Центр ↑↓",
      1,
      "Движение вверх/вниз изгибает дорогу в пространстве"
    ],
    [
      "Чувствительность касания",
      "sensitivity",
      0.3,
      3,
      0.05,
      "Ползунок",
      0,
      "Сила изменения пространственной дороги от одного движения пальца"
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
      "Изгибать трассу",
      "Один палец по визуалу ←→↑↓ — изгиб дороги впереди, как в «Нейромосте»"
    ],
    [
      "Масштаб",
      "Два пальца ↑↓ — приближение/отдаление, без изменения направления дороги"
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
    "colorModeIndex",
    "steerX",
    "steerY",
    "sensitivity"
  ],
  "legacyVersions": [
    1,
    2
  ]
}
END_SETKA_PATTERN_DESCRIPTOR */

(()=>{
"use strict";
const registry=window.SetkaPatternRegistryV1,id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
const PI=Math.PI,TAU=PI*2,DS=.7,COUNT=12500,SLAB=2.5,SLAB_CAP=220,SLAB_CACHE=170;
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
const dot3=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function cross3(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function unit(v){const l=Math.hypot(...v)||1;return [v[0]/l,v[1]/l,v[2]/l]}
function mv(m,v){return [m[0]*v[0]+m[1]*v[1]+m[2]*v[2],m[3]*v[0]+m[4]*v[1]+m[5]*v[2],m[6]*v[0]+m[7]*v[1]+m[8]*v[2]]}
function mm(a,b){const m=new Array(9);for(let row=0;row<3;row++)for(let col=0;col<3;col++)m[row*3+col]=a[row*3]*b[col]+a[row*3+1]*b[col+3]+a[row*3+2]*b[col+6];return m}
const I3=[1,0,0,0,1,0,0,0,1];
function buildModel(c){
 const key=[c.turns,c.randomness,c.hills,c.seed].join("|");
 if(modelCache.has(key)){const value=modelCache.get(key);modelCache.delete(key);modelCache.set(key,value);return value;}
 let state=(c.seed>>>0)||92341;
 function rand(){state=(state+0x6D2B79F5)|0;let z=state;z=Math.imul(z^(z>>>15),z|1);z^=z+Math.imul(z^(z>>>7),z|61);return ((z^(z>>>14))>>>0)/4294967296;}
 const between=(a,b)=>a+(b-a)*rand();
 const period=(COUNT-1)*DS,segments=[];
 let cursor=0,segmentIndex=0;
 const turnStrength=clamp(c.turns/7,0,2),hillStrength=clamp(c.hills/3,0,1.5);
 while(cursor<period+300){
  const q=rand(),forced=segmentIndex%7;
  const kind=forced===1?"loop":forced===3?"helix":forced===5?"straight":
   q<.17?"straight":q<.47?"yaw":q<.66?"mixed":q<.83?"pitch":"helix";
  const long=rand()<.20;
  const len=kind==="straight"?between(24,132):kind==="loop"?between(52,90):
    kind==="helix"?between(54,108):long?between(140,270):between(34,120);
  const dir=rand()<.5?-1:1;
  let yaw=0,pitch=0,roll=0;
  if(kind==="yaw")yaw=dir*between(.018,.060)*turnStrength;
  if(kind==="mixed"){
   yaw=dir*between(.022,.082)*turnStrength;
   pitch=(rand()<.5?-1:1)*between(.015,.052)*hillStrength;
  }
  if(kind==="pitch")pitch=dir*between(.024,.092)*hillStrength;
  if(kind==="loop"){
   // A complete 360° loop on high settings, without using screen-space warps.
   pitch=dir*(TAU/(len-10))*hillStrength*(.55+.53*turnStrength);
   yaw=(rand()<.5?-1:1)*between(.005,.018)*turnStrength;
  }
  if(kind==="helix"){
   yaw=dir*(TAU/(len-12))*(.35+.55*turnStrength);
   pitch=(rand()<.5?-1:1)*between(.025,.070)*hillStrength;
   roll=dir*(TAU/(len-12))*Math.min(1.6,.35+.52*turnStrength);
  }
  segments.push({start:cursor,end:cursor+len,yaw,pitch,roll});
  cursor+=len;segmentIndex++;
 }
 const X=new Float64Array(COUNT),Y=new Float64Array(COUNT),Z=new Float64Array(COUNT);
 const RX=new Float64Array(COUNT),RY=new Float64Array(COUNT),RZ=new Float64Array(COUNT);
 const UX=new Float64Array(COUNT),UY=new Float64Array(COUNT),UZ=new Float64Array(COUNT);
 const FX=new Float64Array(COUNT),FY=new Float64Array(COUNT),FZ=new Float64Array(COUNT);
 let right=[1,0,0],up=[0,1,0],forward=[0,0,1],segment=0;
 function baseYaw(s){return c.turns*.34*Math.sin(s*.085+.20)}
 function basePitch(s){
  const grade=c.hills*(.14*Math.sin(s*.045+.52)+.065*Math.sin(s*.088-1.15));
  return Math.atan(grade);
 }
 function save(i){
  RX[i]=right[0];RY[i]=right[1];RZ[i]=right[2];
  UX[i]=up[0];UY[i]=up[1];UZ[i]=up[2];
  FX[i]=forward[0];FY[i]=forward[1];FZ[i]=forward[2];
 }
 save(0);
 const randomMix=Math.pow(clamp(c.randomness,0,1),1.15);
 for(let i=1;i<COUNT;i++){
  const s=i*DS;
  while(segment<segments.length-1&&s>=segments[segment].end)segment++;
  const seg=segments[segment],edge=Math.min(s-seg.start,seg.end-s);
  const envelope=smooth(clamp(edge/Math.min(12,(seg.end-seg.start)*.22),0,1));
  const seam=smooth(clamp(Math.min(s,period-s)/32,0,1));
  const yawDelta=((1-randomMix)*(baseYaw(s)-baseYaw(s-DS))+
   randomMix*seg.yaw*DS*envelope)*seam;
  const pitchDelta=((1-randomMix)*(basePitch(s)-basePitch(s-DS))+
   randomMix*seg.pitch*DS*envelope)*seam;
  const rollDelta=randomMix*seg.roll*DS*envelope*seam;
  const old=forward;
  let ca=Math.cos(yawDelta),sa=Math.sin(yawDelta);
  let nf=[ca*forward[0]+sa*right[0],ca*forward[1]+sa*right[1],ca*forward[2]+sa*right[2]];
  let nr=[ca*right[0]-sa*forward[0],ca*right[1]-sa*forward[1],ca*right[2]-sa*forward[2]];
  ca=Math.cos(pitchDelta);sa=Math.sin(pitchDelta);
  const nf2=[ca*nf[0]+sa*up[0],ca*nf[1]+sa*up[1],ca*nf[2]+sa*up[2]];
  let nu=[ca*up[0]-sa*nf[0],ca*up[1]-sa*nf[1],ca*up[2]-sa*nf[2]];
  ca=Math.cos(rollDelta);sa=Math.sin(rollDelta);
  right=[ca*nr[0]+sa*nu[0],ca*nr[1]+sa*nu[1],ca*nr[2]+sa*nu[2]];
  up=[ca*nu[0]-sa*nr[0],ca*nu[1]-sa*nr[1],ca*nu[2]-sa*nr[2]];
  forward=nf2;
  if(i%128===0){
   forward=unit(forward);right=unit([
    right[0]-forward[0]*dot3(right,forward),
    right[1]-forward[1]*dot3(right,forward),
    right[2]-forward[2]*dot3(right,forward)
   ]);
   up=unit(cross3(forward,right));
  }
  X[i]=X[i-1]+DS*(old[0]+forward[0])*.5;
  Y[i]=Y[i-1]+DS*(old[1]+forward[1])*.5;
  Z[i]=Z[i-1]+DS*(old[2]+forward[2])*.5;
  save(i);
 }
 // A repeating route is a *rigid 3D transform*, not a world-space translation.
 // This preserves road pose even when the previous tile ends upside-down.
 const endR=[RX[COUNT-1],UX[COUNT-1],FX[COUNT-1],
             RY[COUNT-1],UY[COUNT-1],FY[COUNT-1],
             RZ[COUNT-1],UZ[COUNT-1],FZ[COUNT-1]];
 const endT=[X[COUNT-1],Y[COUNT-1],Z[COUNT-1]],transformCache=new Map([[0,{m:I3,t:[0,0,0]}]]);
 function compose(a,b){
  const moved=mv(a.m,b.t);
  return {m:mm(a.m,b.m),t:[a.t[0]+moved[0],a.t[1]+moved[1],a.t[2]+moved[2]]};
 }
 function tilePose(n){
  if(transformCache.has(n))return transformCache.get(n);
  let out={m:I3,t:[0,0,0]},base={m:endR,t:endT},count=n;
  while(count>0){if(count%2)out=compose(out,base);base=compose(base,base);count=Math.floor(count/2);}
  transformCache.set(n,out);if(transformCache.size>24)transformCache.delete(transformCache.keys().next().value);
  return out;
 }
 function at(s){
  const tile=Math.max(0,Math.floor(s/period)),q=clamp((s-tile*period)/DS,0,COUNT-1),i=Math.min(COUNT-2,Math.floor(q)),t=q-i;
  const mix=a=>a[i]+(a[i+1]-a[i])*t;
  const pose=tilePose(tile);
  const local=[mix(X),mix(Y),mix(Z)],world=mv(pose.m,local),m=pose.m;
  const r=mv(m,[mix(RX),mix(RY),mix(RZ)]),u=mv(m,[mix(UX),mix(UY),mix(UZ)]),f=mv(m,[mix(FX),mix(FY),mix(FZ)]);
  return {x:world[0]+pose.t[0],y:world[1]+pose.t[1],z:world[2]+pose.t[2],
   rx:r[0],ry:r[1],rz:r[2],ux:u[0],uy:u[1],uz:u[2],fx:f[0],fy:f[1],fz:f[2]};
 }
 const model={at};modelCache.set(key,model);if(modelCache.size>3)modelCache.delete(modelCache.keys().next().value);return model;
}
// Each sphere is permanently fixed to a world-space road slab. Unlike a
// modulo-recycled cloud, dots never teleport through the near/far planes.
const particleCache=new Map();
function particles(seed,cell){
 const key=seed+"|"+cell;
 if(particleCache.has(key))return particleCache.get(key);
 const arr=new Array(SLAB_CAP);
 for(let i=0;i<SLAB_CAP;i++){
  const base=((seed>>>0)^Math.imul(cell,0x9e3779b1)^Math.imul(i+1,0x85ebca6b))>>>0;
  arr[i]={s:(cell+hash(base^0x13d758bd))*SLAB,a:(.018+hash(base^0x49fbd340)*.964)*PI,
   r:(.019+.052*hash(base^0x3f81fa07))*(.7+.55*hash(base^0x5fb27819)),
   alpha:.48+.45*hash(base^0x82bd401c),j:-.025+.07*hash(base^0x1748bacf)};
 }
 particleCache.set(key,arr);
 if(particleCache.size>SLAB_CACHE)particleCache.delete(particleCache.keys().next().value);
 return arr;
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
 const model=buildModel(c),at=model.at,camS=48+f*12.8*c.speed/60;
 const camera=at(camS),ahead=at(camS+5),horizon=height*.551,eyeHeight=1.55;
 let follow=clamp(c.follow,0,1),extra=Math.max(0,c.follow-1);
 let forward=unit([camera.fx*follow+(1-follow)*0+extra*(ahead.fx-camera.fx),
                   camera.fy*follow+(1-follow)*0+extra*(ahead.fy-camera.fy),
                   camera.fz*follow+(1-follow)+extra*(ahead.fz-camera.fz)]);
 let upGuess=unit([camera.ux*follow,camera.uy*follow+(1-follow),camera.uz*follow]);
 let right=unit(cross3(upGuess,forward));
 if(Math.hypot(...right)<.001)right=[camera.rx,camera.ry,camera.rz];
 let up=unit(cross3(forward,right));
 const a=c.yawOffset||0,ca=Math.cos(a),sa=Math.sin(a),initial=forward;
 forward=unit([ca*initial[0]+sa*right[0],ca*initial[1]+sa*right[1],ca*initial[2]+sa*right[2]]);
 right=unit([ca*right[0]-sa*initial[0],ca*right[1]-sa*initial[1],ca*right[2]-sa*initial[2]]);
 up=unit(cross3(forward,right));
 const eye=[camera.x+eyeHeight*camera.ux,camera.y+eyeHeight*camera.uy,camera.z+eyeHeight*camera.uz];
 const focal=Math.min(width*.505,height*.88)/(1+.012*Math.max(0,c.turns-5))/c.zoom;
 const roofWidth=4.70,roofHeight=4.70+6*c.shape;
 const steerX=Number(c.steerX)||0,steerY=Number(c.steerY)||0;
 const framePoints=new Map();
 function xyz(s,x,y,pose){
  let p=pose||framePoints.get(s);
  if(!p){p=at(s);framePoints.set(s,p)}
  const t=smooth((s-camS)/42);
  // Same forward-only touch-bending principle as Neurobridge.
  const sx=steerX*10.8*t,sy=steerY*10.2*t;
  return {x:p.x+p.rx*x+p.ux*y+camera.rx*sx+camera.ux*sy,
          y:p.y+p.ry*x+p.uy*y+camera.ry*sx+camera.uy*sy,
          z:p.z+p.rz*x+p.uz*y+camera.rz*sx+camera.uz*sy};
 }
 function rel(p){
  const dx=p.x-eye[0],dy=p.y-eye[1],dz=p.z-eye[2];
  return {x:dx*right[0]+dy*right[1]+dz*right[2],
          y:dx*up[0]+dy*up[1]+dz*up[2],
          z:dx*forward[0]+dy*forward[1]+dz*forward[2]};
 }
 function pc(q){
  if(q.z<CLIP)return null;const k=focal/q.z;
  return{x:width*.5+q.x*k,y:horizon-q.y*k,z:q.z};
 }
 function proj(s,x,y,pose){return pc(rel(xyz(s,x,y,pose)))}
 function polygon(vertices){
  const ps=vertices.map(rel),out=[];
  for(let i=0;i<ps.length;i++){
   const a=ps[i],b=ps[(i+1)%ps.length],okA=a.z>=CLIP,okB=b.z>=CLIP;
   if(okA)out.push(a);
   if(okA!==okB){const t=(CLIP-a.z)/(b.z-a.z);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:CLIP})}
  }
  if(out.length<3)return;
  ctx.beginPath();out.forEach((q,i)=>{const p=pc(q);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y)});
  ctx.closePath();ctx.fill();
 }
 function floor(a,b){
  if(c.roadOpacity<=0)return;ctx.globalAlpha=c.roadOpacity;ctx.fillStyle="#000";
  polygon([xyz(b,-roofWidth,0),xyz(b,roofWidth,0),xyz(a,roofWidth,0),xyz(a,-roofWidth,0)]);
 }
 function shell(a,b){
  if(c.opacity<=0)return;ctx.globalAlpha=c.opacity;ctx.fillStyle="#000";
  for(let j=0;j<ARC;j++){
   const u=j*PI/ARC,v=(j+1)*PI/ARC;
   polygon([xyz(b,-roofWidth*Math.cos(u),roofHeight*Math.sin(u)),xyz(b,-roofWidth*Math.cos(v),roofHeight*Math.sin(v)),
    xyz(a,-roofWidth*Math.cos(v),roofHeight*Math.sin(v)),xyz(a,-roofWidth*Math.cos(u),roofHeight*Math.sin(u))]);
  }
 }
 const ss=(typeof document.createElement==="function"&&typeof ctx.drawImage==="function")?sprites(c.colorModeIndex|0):null,seed=c.seed>>>0;
 function dot(o,s){
  // World-space particle poses are immutable for this route model, so mobile
  // frames do not recalculate 3D rail orientation for thousands of dots.
  if(o._trackModel!==model){o._trackModel=model;o._trackPose=at(s)}
  const radius=1+o.j,p=proj(s,-roofWidth*Math.cos(o.a)*radius,roofHeight*Math.sin(o.a)*radius,o._trackPose);
  if(!p||p.x<-24||p.x>width+24||p.y<-24||p.y>height+24)return;
  const size=clamp(focal*o.r/p.z,.16,8.8)*1.65,i=clamp(Math.floor(o.a/PI*59),0,59);
  const alpha=clamp(o.alpha*c.glow,0,1),col=color(o.a/PI,c.colorModeIndex|0);
  ctx.fillStyle=(c.colorModeIndex|0)===0?"#fff":"hsl("+col[0]+","+col[1]+"%,"+col[2]+"%)";
  ctx.globalAlpha=alpha*clamp(.48+size*.2,.45,1);
  ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.30,size*.34),0,TAU);ctx.fill();
  if(ss&&size>.5){ctx.globalAlpha=alpha*.76*smooth((size-.5)/1.25);ctx.drawImage(ss[i],p.x-size,p.y-size,size*2,size*2)}
 }
 function marker(s,x,track){
  const p=proj(s,x,.012),prev=proj(s-.10,x,.012),next=proj(s+.10,x,.012);
  if(!p||!prev||!next||p.x<-30||p.x>width+30||p.y<-30||p.y>height+30)return;
  const angle=Math.atan2(next.y-prev.y,next.x-prev.x);
  const wave=Math.max(.50,1+c.pulse*(.20*Math.sin(s*.81+track*1.3)+.09*Math.sin(s*1.38+track)));
  const natural=(track===1?.060:.082)*focal/p.z*wave,minimum=Math.max(.28,Math.min(width,height)*.0009);
  const radius=clamp(Math.max(natural,minimum),minimum,13),length=clamp(radius*(track===1?1.45:1.13),minimum,16);
  const col=c.colorModeIndex===0?[0,0,75]:color(track===0?.08:track===1?.3:.93,c.colorModeIndex|0);
  ctx.save();ctx.globalAlpha=clamp(.63+natural*.55,.68,1);
  ctx.translate(p.x,p.y);ctx.rotate(angle);
  ctx.fillStyle=(c.colorModeIndex|0)===0?"#fff":"hsl("+col[0]+","+col[1]+"%,"+col[2]+"%)";
  ctx.beginPath();if(typeof ctx.ellipse==="function")ctx.ellipse(0,0,length,radius*.92,0,0,TAU);
  else ctx.arc(0,0,radius*.92,0,TAU);
  ctx.fill();ctx.restore();
 }
 ctx.save();ctx.globalAlpha=1;ctx.fillStyle="#000";ctx.fillRect(0,0,width,height);
 const near=.62,far=preview?108:145,step=preview?2.1:1.3,nSeg=Math.ceil((far-near)/step);
 const buckets=Array.from({length:nSeg},()=>[]),marks=Array.from({length:nSeg},()=>[]);
 const firstCell=Math.floor((camS+near)/SLAB),lastCell=Math.floor((camS+far)/SLAB);
 const perCell=Math.min(SLAB_CAP,Math.floor((preview?42:148)*c.density));
 for(let cell=firstCell;cell<=lastCell;cell++){
  const cellDots=particles(seed,cell);
  for(let i=0;i<perCell;i++){
   const ob=cellDots[i],distance=ob.s-camS;if(distance<near||distance>=far)continue;
   buckets[Math.min(nSeg-1,Math.floor((distance-near)/step))].push(ob);
  }
 }
 const gap=.45;
 for(let n=Math.ceil((camS+near)/gap);n<=Math.floor((camS+far)/gap);n++){
  const s=n*gap,d=s-camS;marks[Math.min(nSeg-1,Math.floor((d-near)/step))].push(s);
 }
 // Painter ordering uses eye-space depth of each 3D slab, not just route
 // distance, allowing vertical loops and helices to pass across the view.
 const order=Array.from({length:nSeg},(_,k)=>k);
 order.sort((a,b)=>{
  const sa=camS+near+(a+.5)*step,sb=camS+near+(b+.5)*step;
  const pa=proj(sa,0,0),pb=proj(sb,0,0);
  return (pb?.z||0)-(pa?.z||0);
 });
 for(const k of order){
  const a=camS+near+k*step,b=a+step;
  shell(a,b);floor(a,b);
  for(const ob of buckets[k])dot(ob,ob.s);
  for(const s of marks[k]){marker(s,-3.08,0);marker(s,0,1);marker(s,3.08,2);}
 }
 ctx.restore();
}
function interact(c,e){
 if(e?.type==="patch")return {...c,...e.patch};
 if(e?.type!=="gesture"||e.phase==="start"||e.phase==="end"||e.phase==="cancel")return c;
 const dx=Number(e.dx)||0,dy=Number(e.dy)||0;
 if(e.fingers>=2)return {...c,zoom:clamp(c.zoom-dy*.002,.65,1.55)};
 if(e.fingers!==1||(!dx&&!dy))return c;
 const width=Math.max(1,Number(e.width)||390),height=Math.max(1,Number(e.height)||780),sensitivity=c.sensitivity||1;
 return {...c,steerX:clamp((c.steerX||0)+dx/width*2.55*sensitivity,-2.5,2.5),
  steerY:clamp((c.steerY||0)-dy/height*2.55*sensitivity,-2.5,2.5)};
}
registry.bindInteraction(id,interact);
registry.bindRenderer(id,render);
})();
