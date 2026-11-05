/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "rainbow-road-tunnel",
  "title": "Радужный тоннель · 3DFP",
  "version": 5,
  "schemaVersion": 5,
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
    "size": 1,
    "hillsFrequency": 5,
    "touchX": 0,
    "touchY": 0,
    "touchScale": 1,
    "touchMode": 0,
    "touchReleaseFrame": 0
  },
  "controls": [
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
      "Спуски и подъёмы",
      "hills",
      0,
      8,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Частота спусков и подъёмов",
      "hillsFrequency",
      0,
      10,
      0.1,
      "Ползунок",
      0,
      "От протяжённых пологих перепадов высоты до частых смен подъёма и спуска, независимо от их силы"
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
      "Форма тоннеля",
      "shape",
      0,
      1,
      0.05,
      "Ползунок",
      0
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
      "Следование камеры",
      "follow",
      0,
      1.3,
      0.05,
      "Ползунок",
      0
    ],
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
      "Масштаб обзора",
      "zoom",
      0.65,
      1.55,
      0.01,
      "Ползунок",
      0,
      "Базовый масштаб камеры. Жест двумя пальцами временно приближает/отдаляет, не меняя это значение."
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
      "Смещение взгляда",
      "yawOffset",
      -0.27,
      0.27,
      0.001,
      "Ползунок",
      0
    ],
    [
      "Постоянный изгиб ←→",
      "steerX",
      -2.5,
      2.5,
      0.01,
      "Ползунок",
      0,
      "Постоянное боковое искривление. Жест одним пальцем действует независимо и временно."
    ],
    [
      "Постоянный изгиб ↑↓",
      "steerY",
      -2.5,
      2.5,
      0.01,
      "Ползунок",
      0,
      "Постоянное вертикальное искривление. Жест одним пальцем действует независимо и временно."
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
    },
    "touchX": {
      "type": "number",
      "min": -4,
      "max": 4
    },
    "touchY": {
      "type": "number",
      "min": -4,
      "max": 4
    },
    "touchScale": {
      "type": "number",
      "min": 0.3,
      "max": 3
    },
    "touchMode": {
      "type": "number",
      "min": 0,
      "max": 2,
      "integer": true
    },
    "touchReleaseFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    }
  },
  "gestureHints": [
    [
      "Свободный изгиб",
      "1 палец ←→↑↓ — временно изгибает дорогу независимо от силы поворотов и подъёмов; после отпускания плавно восстанавливается"
    ],
    [
      "Свободный масштаб",
      "2 пальца свести/развести — временный зум; после отпускания возврат к установленному масштабу"
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
    "size",
    "hillsFrequency"
  ],
  "legacyVersions": [
    1,
    2,
    3,
    4
  ],
  "transientFields": [
    "touchX",
    "touchY",
    "touchScale",
    "touchMode",
    "touchReleaseFrame"
  ],
  "capabilities": {
    "pairedSettings": true
  }
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
 const key=[c.turns,c.frequency,c.randomness,c.hills,c.hillsFrequency,c.bank,c.seed].join("|");
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
  const elevationRate=.009+.004*c.hillsFrequency,tempo=elevationRate/.029;
  return strength*mix(Math.sin(elevationRate*s+.36),
   clamp(.74*noiseSeed(s*.012*tempo,14)+.28*Math.sin(.018*s*tempo+1.8),-1,1),chaos);
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
 const camera=at(camS),ahead=at(camS+5);
 const forward0=[camera.fx,camera.fy,camera.fz],follow=clamp(c.follow,0,1),extra=Math.max(0,c.follow-1);
 let forward=unit(forward0.map((v,i)=>v*follow+(1-follow)*(i===2?1:0)+extra*([ahead.fx,ahead.fy,ahead.fz][i]-v)));
 const upGuess=unit([camera.ux*follow,camera.uy*follow+1-follow,camera.uz*follow]);
 let right=unit(cross3(upGuess,forward)),up=unit(cross3(forward,right));
 const turn=c.yawOffset||0,ca=Math.cos(turn),sa=Math.sin(turn),old=forward;
 forward=unit(old.map((v,i)=>ca*v+sa*right[i]));
 right=unit(right.map((v,i)=>ca*v-sa*old[i]));
 up=unit(cross3(forward,right));
 const eye=[camera.x+camera.ux*1.55,camera.y+camera.uy*1.55,camera.z+camera.uz*1.55];
 const active=Number(c.touchMode)>0,elapsed=Math.max(0,f-(Number(c.touchReleaseFrame)||0));
 const touchBlend=active?1:Math.exp(-elapsed/12);
 const temporaryScale=1+((Number(c.touchScale)||1)-1)*touchBlend;
 const horizon=height*.552,focal=Math.min(width*.485,height*.86)*clamp(temporaryScale,.3,3)/c.zoom;
 const roofWidth=4.7,roofHeight=4.7+6*c.shape;
 const sx=(c.steerX||0)*9+(c.touchX||0)*13*touchBlend,
       sy=(c.steerY||0)*8.7+(c.touchY||0)*13*touchBlend,
       steering=Math.abs(sx)+Math.abs(sy)>.00001;
 const frameCache=new Map();
 const position=s=>{
  const q=at(s),t=smooth((s-camS)/72);
  return[q.x+camera.rx*sx*t+camera.ux*sy*t,
         q.y+camera.ry*sx*t+camera.uy*sy*t,
         q.z+camera.rz*sx*t+camera.uz*sy*t];
 };
 function frameAt(s){
  if(frameCache.has(s))return frameCache.get(s);
  const base=at(s);
  if(!steering){frameCache.set(s,base);return base;}
  const p=position(s),a=position(s-.26),b=position(s+.26),tf=unit([b[0]-a[0],b[1]-a[1],b[2]-a[2]]);
  const tu=unit([base.ux,base.uy,base.uz]),tr=unit(cross3(tu,tf)),newUp=unit(cross3(tf,tr));
  const result={x:p[0],y:p[1],z:p[2],
   rx:tr[0],ry:tr[1],rz:tr[2],ux:newUp[0],uy:newUp[1],uz:newUp[2],fx:tf[0],fy:tf[1],fz:tf[2]};
  frameCache.set(s,result);return result;
 }
 function xyz(s,x,y,pose){
  const p=pose||frameAt(s);
  return[x*p.rx+y*p.ux+p.x,x*p.ry+y*p.uy+p.y,x*p.rz+y*p.uz+p.z];
 }
 function rel(p){
  const d=[p[0]-eye[0],p[1]-eye[1],p[2]-eye[2]];
  return{x:dot3(d,right),y:dot3(d,up),z:dot3(d,forward)};
 }
 function pc(q){
  if(q.z<CLIP)return null;
  const k=focal/q.z;return{x:width*.5+q.x*k,y:horizon-q.y*k,z:q.z};
 }
 function proj(s,x,y,p){return pc(rel(xyz(s,x,y,p)))}
 function polygon(points,opacity,fill){
  if(opacity<=0)return false;
  const verts=points.map(rel),out=[];
  for(let i=0;i<verts.length;i++){
   const a=verts[i],b=verts[(i+1)%verts.length],inside=a.z>=CLIP,end=b.z>=CLIP;
   if(inside)out.push(a);
   if(inside!==end){
    const t=(CLIP-a.z)/(b.z-a.z);
    out.push({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),z:CLIP});
   }
  }
  if(out.length<3)return false;
  ctx.globalAlpha=opacity;ctx.fillStyle=fill;ctx.beginPath();
  out.forEach((q,i)=>{const p=pc(q);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y)});
  ctx.closePath();ctx.fill();return true;
 }
 function floor(a,b){
  if(c.roadOpacity<=0)return;
  polygon([xyz(a,-roofWidth,0),xyz(a,roofWidth,0),xyz(b,roofWidth,0),xyz(b,-roofWidth,0)],c.roadOpacity,"#000");
 }
 function shell(a,b){
  if(c.opacity<=0)return;
  for(let j=0;j<19;j++){
   const t=j*PI/19,u=(j+1)*PI/19;
   polygon([xyz(a,-roofWidth*Math.cos(t),roofHeight*Math.sin(t)),
    xyz(a,-roofWidth*Math.cos(u),roofHeight*Math.sin(u)),
    xyz(b,-roofWidth*Math.cos(u),roofHeight*Math.sin(u)),
    xyz(b,-roofWidth*Math.cos(t),roofHeight*Math.sin(t))],c.opacity,"#000");
  }
 }
 const spriteAvailable=typeof document.createElement==="function"&&typeof ctx.drawImage==="function";
 const spriteSheet=spriteAvailable?sprites(c.colorModeIndex|0,c.solid||0):null,seed=c.seed>>>0;
 function dot(o,s){
  // Physical sphere positions are attached to a fixed road slab, not the camera.
  let pose;
  if(steering)pose=frameAt(s);
  else{
   if(o._trackModel!==model){o._trackModel=model;o._trackPose=at(s)}
   pose=o._trackPose;
  }
  const p=proj(s,-roofWidth*Math.cos(o.a)*.965,roofHeight*Math.sin(o.a)*.965,pose);
  if(!p||p.x<-35||p.x>width+35||p.y<-35||p.y>height+35)return;
  const size=clamp(2.9*focal*o.r*c.size/p.z,1.1,30),idx=clamp(Math.floor(o.a/PI*59),0,59);
  ctx.globalAlpha=clamp(o.alpha*c.glow,0,1);
  if(spriteSheet)ctx.drawImage(spriteSheet[idx],p.x-size*.5,p.y-size*.5,size,size);
  else{
   const rgb=color(o.a/PI,c.colorModeIndex|0);ctx.fillStyle=(c.colorModeIndex|0)===0?"#fff":"hsl("+rgb[0]+","+rgb[1]+"%,"+rgb[2]+"%)";
   ctx.beginPath();ctx.arc(p.x,p.y,size*.45,0,TAU);ctx.fill();
  }
 }
 function marker(s){
  const pulse=Math.max(.5,1+c.pulse*(.11*Math.sin(s*.86)+.09*Math.sin(s*1.3)));
  const a=s-.17,b=s+.17,fa=frameAt(a),fb=frameAt(b);
  for(let lane=-1;lane<=1;lane++){
   const x=lane*3.08,width=.058*pulse;
   const fill=(c.colorModeIndex|0)===0?"#fff":lane===-1?"#93fb6c":lane===0?"#ff6dab":"#5ddfff";
   polygon([xyz(a,x-width,.032,fa),xyz(a,x+width,.032,fa),
    xyz(b,x+width,.032,fb),xyz(b,x-width,.032,fb)],.96,fill);
  }
 }
 ctx.save();ctx.globalAlpha=1;ctx.fillStyle="#000";ctx.fillRect(0,0,width,height);
 const near=.56,far=preview?108:146,step=1.75,nSeg=Math.ceil((far-near)/step);
 const spheresBySegment=Array.from({length:nSeg},()=>[]),marks=Array.from({length:nSeg},()=>[]);
 const cellStart=Math.floor((camS+near)/SLAB),cellEnd=Math.ceil((camS+far)/SLAB);
 const perCell=Math.min(SLAB_CAP,Math.floor((preview?43:66)*c.density));
 for(let cell=cellStart;cell<=cellEnd;cell++){
  const cloud=particles(seed,cell);
  for(let i=0;i<perCell;i++){
   const o=cloud[i],d=o.s-camS;
   if(d<near||d>=far)continue;
   spheresBySegment[Math.min(nSeg-1,Math.floor((d-near)/step))].push(o);
  }
 }
 for(let n=Math.ceil((camS+near)/.65);n*.65<camS+far;n++){
  const s=n*.65,depth=s-camS;
  marks[Math.min(nSeg-1,Math.max(0,Math.floor((depth-near)/step)))].push(s);
 }
 // V15 scene layering: distant black wall/road polygons first, then attached
 // solid/bokeh spheres and FLAT road markings at their same track segment.
 for(let k=nSeg-1;k>=0;k--){
  const a=camS+near+k*step,b=a+step;
  shell(a,b);floor(a,b);
  for(const o of spheresBySegment[k])dot(o,o.s);
  for(const s of marks[k])marker(s);
 }
 ctx.restore();
}
function interact(c,e){
 if(e?.type==="patch")return {...c,...e.patch};
 if(e?.type!=="gesture")return c;
 const frame=Math.max(0,Number(e.frame)||0),mode=Math.min(2,Math.max(1,Number(e.fingers)||1));
 if(e.phase==="start"){
  const decay=(c.touchMode||0)>0?1:Math.exp(-Math.max(0,frame-(c.touchReleaseFrame||0))/12);
  return {...c,touchMode:mode,
   touchX:mode===1?(c.touchX||0)*decay:0,
   touchY:mode===1?(c.touchY||0)*decay:0,
   touchScale:mode===2?1+((c.touchScale||1)-1)*decay:1};
 }
 if(e.phase==="end"||e.phase==="cancel"){
  return {...c,touchMode:0,touchReleaseFrame:frame};
 }
 if(e.phase!=="move")return c;
 const dx=Number(e.dx)||0,dy=Number(e.dy)||0;
 if(mode>=2){
  const ratio=Number(e.pinch);
  const prev=Number(e.previousPinchDistance),current=Number(e.pinchDistance);
  const valid=Number.isFinite(ratio)&&ratio>0?ratio:
    Number.isFinite(prev)&&prev>0&&Number.isFinite(current)?current/prev:null;
  const zoomFactor=valid&&Number.isFinite(valid)?valid:Math.exp(-dy*.012);
  return {...c,touchMode:2,touchScale:clamp((c.touchScale||1)*zoomFactor,.3,3)};
 }
 const width=Math.max(1,Number(e.width)||390),height=Math.max(1,Number(e.height)||780),sensitivity=c.sensitivity||1;
 return {...c,touchMode:1,
  touchX:clamp((c.touchX||0)+dx/width*3.5*sensitivity,-4,4),
  touchY:clamp((c.touchY||0)-dy/height*3.5*sensitivity,-4,4)};
}
registry.bindInteraction(id,interact);
registry.bindRenderer(id,render);
})();
