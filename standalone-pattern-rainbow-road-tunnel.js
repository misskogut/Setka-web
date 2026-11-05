/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "rainbow-road-tunnel",
  "title": "Радужный тоннель · 3DFP",
  "version": 4,
  "schemaVersion": 4,
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
    "sensitivity": 1,
    "frequency": 5,
    "bank": 0,
    "solid": 0,
    "size": 1
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
      30,
      0.1,
      "Ползунок",
      0,
      "Угол отклонения вправо и влево: чем больше, тем круче настоящие повороты змейкой; не путать с частотой"
    ],
    [
      "Частота поворотов",
      "frequency",
      0,
      10,
      0.1,
      "Ползунок",
      0,
      "От редких длинных дуг до частой змейки; не меняет максимальный угол поворота"
    ],
    [
      "Сила виража · скручивание",
      "bank",
      0,
      3,
      0.05,
      "Ползунок",
      0,
      "Скручивает поперечное сечение полотна, боковых стен и сфер тоннеля вокруг направления движения"
    ],
    [
      "Непредсказуемость дороги",
      "randomness",
      0,
      2,
      0.01,
      "Ползунок",
      0,
      "Случайный выбор только разрешённых поворотов и подъёмов; при нулевой силе поворотов и нулевых подъёмах дорога остаётся прямой"
    ],
    [
      "Спуски и подъёмы",
      "hills",
      0,
      8,
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
      "Вид сфер: боке → плотные",
      "solid",
      0,
      1,
      0.01,
      "Ползунок",
      0,
      "0 — мягкое боке; 1 — плотная цельная сфера"
    ],
    [
      "Размер сфер",
      "size",
      0.4,
      2.3,
      0.05,
      "Ползунок",
      0,
      "Размер точек на стенах независимо от плотности"
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
      "Управление дорогой",
      "1 палец ←→↑↓ — изгиб в пределах силы поворотов и подъёмов"
    ],
    [
      "Масштаб",
      "2 пальца ↑↓ — увеличение/уменьшение без изменения траектории"
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
    "sensitivity",
    "frequency",
    "bank",
    "solid",
    "size"
  ],
  "legacyVersions": [
    1,
    2,
    3
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


const PATH_STEP=.65,ROUTE_COUNT=13500,ROUTE_PERIOD=(ROUTE_COUNT-1)*PATH_STEP;
const dot3=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross3=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n)};
const I3=[1,0,0,0,1,0,0,0,1];
const mix=(a,b,t)=>a+(b-a)*t;
function mv(m,v){return [m[0]*v[0]+m[1]*v[1]+m[2]*v[2],m[3]*v[0]+m[4]*v[1]+m[5]*v[2],m[6]*v[0]+m[7]*v[1]+m[8]*v[2]]}
function mm(a,b){let v=[];for(let i=0;i<3;i++)for(let j=0;j<3;j++)v.push(a[i*3]*b[j]+a[i*3+1]*b[3+j]+a[i*3+2]*b[6+j]);return v}
function transpose(m){return [m[0],m[3],m[6],m[1],m[4],m[7],m[2],m[5],m[8]]}
function noise(t,channel){
 const i=Math.floor(t),f=t-i,v=smooth(f),offset=Math.imul(channel,0x9e3779b9);
 return mix(hash(i+offset)*2-1,hash(i+1+offset)*2-1,v);
}
const modelCache=new Map();
function buildModel(c){
 const key=[c.turns,c.frequency,c.randomness,c.hills,c.bank,c.seed].join("|");
 if(modelCache.has(key)){const value=modelCache.get(key);modelCache.delete(key);modelCache.set(key,value);return value}
 const power=clamp(c.turns/30,0,1),chaos=clamp(c.randomness/2,0,1),hill=clamp(c.hills/8,0,1);
 const magnitude=1.44*Math.pow(power,.55),w=.014+.0056*c.frequency,strength=1.06*Math.pow(hill,.8);
 const seed=(c.seed|0)^92341;
 function noiseSeed(s,ch){return noise(s,ch+(seed&31)*31)}
 function yawRaw(s){
  const regular=Math.sin(w*s+.26);
  const random=clamp(.78*noiseSeed(s*w*.43,4)+.36*Math.sin(s*w*.53+1.1)+.30*noiseSeed(s*w*.9,12),-1,1);
  return magnitude*mix(regular,random,chaos);
 }
 function pitchRaw(s){
  return strength*mix(Math.sin(.029*s+.36),
   clamp(.74*noiseSeed(s*.012,14)+.28*Math.sin(.018*s+1.8),-1,1),chaos);
 }
 const yaw0=yawRaw(0),pitch0=pitchRaw(0);
 function heading(s){
  // The last 45m smoothly matches the first orientation before rigid tiling.
  const seam=smooth(clamp((ROUTE_PERIOD-s)/45,0,1));
  return [mix(yaw0,yawRaw(s),seam),mix(pitch0,pitchRaw(s),seam)];
 }
 const X=new Float64Array(ROUTE_COUNT),Y=new Float64Array(ROUTE_COUNT),Z=new Float64Array(ROUTE_COUNT);
 for(let i=1;i<ROUTE_COUNT;i++){
  const s=(i-.5)*PATH_STEP,[yaw,pitch]=heading(s),cp=Math.cos(pitch);
  X[i]=X[i-1]+Math.sin(yaw)*cp*PATH_STEP;
  Y[i]=Y[i-1]+Math.sin(pitch)*PATH_STEP;
  Z[i]=Z[i-1]+Math.cos(yaw)*cp*PATH_STEP;
 }
 function localPos(s){
  const q=clamp(s/PATH_STEP,0,ROUTE_COUNT-1),i=Math.min(ROUTE_COUNT-2,Math.floor(q)),t=q-i;
  return[mix(X[i],X[i+1],t),mix(Y[i],Y[i+1],t),mix(Z[i],Z[i+1],t)];
 }
 function localFrame(s){
  const p=localPos(s),a=localPos(Math.max(0,s-.26)),b=localPos(Math.min(ROUTE_PERIOD,s+.26));
  const forward=unit([b[0]-a[0],b[1]-a[1],b[2]-a[2]]);
  let right=unit(cross3([0,1,0],forward)),up=unit(cross3(forward,right));
  const roll=(c.hills/8)*chaos*Math.min(.48,c.turns*.035)*Math.sin(s*.020)+
   c.bank*(1.42*Math.sin(s*.024+.25)+.40*Math.sin(s*.041-.7));
  const cs=Math.cos(roll),sn=Math.sin(roll);
  const r=right.map((v,i)=>v*cs+up[i]*sn);
  const u=up.map((v,i)=>v*cs-right[i]*sn);
  return {p,f:forward,r,u};
 }
 const head=localFrame(0),tail=localFrame(ROUTE_PERIOD);
 const matrix=fr=>[fr.r[0],fr.u[0],fr.f[0],fr.r[1],fr.u[1],fr.f[1],fr.r[2],fr.u[2],fr.f[2]];
 const seamRotation=mm(matrix(tail),transpose(matrix(head)));
 const endTranslation=tail.p;
 const transforms=new Map([[0,{m:I3,t:[0,0,0]}]]);
 function compose(a,b){
  const q=mv(a.m,b.t);
  return{m:mm(a.m,b.m),t:[a.t[0]+q[0],a.t[1]+q[1],a.t[2]+q[2]]};
 }
 function tilePose(tile){
  if(transforms.has(tile))return transforms.get(tile);
  let out={m:I3,t:[0,0,0]},base={m:seamRotation,t:endTranslation},count=tile;
  while(count>0){if(count%2)out=compose(out,base);base=compose(base,base);count=Math.floor(count/2);}
  transforms.set(tile,out);if(transforms.size>30)transforms.delete(transforms.keys().next().value);
  return out;
 }
 function at(s){
  s=Math.max(0,s);
  const tile=Math.floor(s/ROUTE_PERIOD),local=clamp(s-tile*ROUTE_PERIOD,0,ROUTE_PERIOD);
  const base=localFrame(local),pose=tilePose(tile);
  const p=mv(pose.m,base.p),r=mv(pose.m,base.r),u=mv(pose.m,base.u),f=mv(pose.m,base.f);
  return {x:p[0]+pose.t[0],y:p[1]+pose.t[1],z:p[2]+pose.t[2],
   rx:r[0],ry:r[1],rz:r[2],ux:u[0],uy:u[1],uz:u[2],fx:f[0],fy:f[1],fz:f[2]};
 }
 const model={at,key};
 modelCache.set(key,model);
 if(modelCache.size>3)modelCache.delete(modelCache.keys().next().value);
 return model;
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
function sprites(mode,solid){
 const key=mode+"|"+Math.round(solid*100);
 if(spriteCache.has(key))return spriteCache.get(key);
 const arr=Array.from({length:60},(_,i)=>{
  const can=document.createElement("canvas");can.width=can.height=48;
  const g=can.getContext("2d"),col=color(i/59,mode),h=col[0],ss=col[1],l=col[2];
  const gr=g.createRadialGradient(24,24,0,24,24,24);
  gr.addColorStop(0,"hsla("+h+","+ss+"%,"+Math.min(90,l+10)+"%,.98)");
  gr.addColorStop(.35,"hsla("+h+","+ss+"%,"+l+"%,.89)");
  gr.addColorStop(.66,"hsla("+h+","+ss+"%,"+(l-7)+"%,.20)");
  gr.addColorStop(1,"hsla("+h+","+ss+"%,"+(l-7)+"%,0)");
  g.globalAlpha=1-solid;g.fillStyle=gr;g.fillRect(0,0,48,48);
  if(solid>0){
   g.globalAlpha=solid;g.fillStyle="hsl("+h+","+ss+"%,"+l+"%)";
   g.beginPath();g.arc(24,24,17.8,0,TAU);g.fill();
   g.globalAlpha=solid*.21;g.fillStyle="white";g.beginPath();
   g.ellipse(19,18,6,4,-.6,0,TAU);g.fill();
  }
  return can;
 });
 spriteCache.set(key,arr);if(spriteCache.size>27)spriteCache.delete(spriteCache.keys().next().value);
 return arr;
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
