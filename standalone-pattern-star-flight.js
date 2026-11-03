/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "star-flight",
  "title": "Полёт среди звёзд",
  "version": 1,
  "introducedAt": "2026-11-03T20:58:00.000Z",
  "schemaVersion": 1,
  "module": "standalone-pattern-star-flight.js",
  "colorModes": 9,
  "palettes": [[255,255,255],[51,187,255],[255,51,153],[187,51,255],[255,255,255],[255,255,255],[255,255,255],[255,255,255],[255,255,255]],
  "defaults": {
    "patternId": "star-flight",
    "starCount": 10000,
    "speed": 20,
    "rollRate": 0,
    "bokeh": 0,
    "yaw": 0,
    "pitch": 0,
    "anchorFrame": 0,
    "originX": 0,
    "originY": 0,
    "originZ": 0,
    "rollOffset": 0,
    "seed": 1,
    "colorModeIndex": 0
  },
  "controls": [
    ["Скорость полёта", "speed", 1, 320, 0.1, "В центре ←→", 1],
    ["Автовращение", "rollRate", 0, 0.06, 0.0005, "Сверху ←→", 1],
    ["Количество звёзд", "starCount", 1000, 30000, 1, "Слева ↑↓", 1],
    ["Боке", "bokeh", 0, 1, 0.01, "Справа ↑↓", 1],
    ["Поворот камеры", "yaw", -3.1416, 3.1416, 0.001, "2 пальца ←→", 2],
    ["Наклон камеры", "pitch", -1.48, 1.48, 0.001, "2 пальца ↑↓", 2]
  ],
  "schema": {
    "anchorFrame": {"type":"number","min":0,"max":1000000000},
    "originX": {"type":"number","min":-20000,"max":20000},
    "originY": {"type":"number","min":-20000,"max":20000},
    "originZ": {"type":"number","min":-20000,"max":20000},
    "rollOffset": {"type":"number","min":-1000000,"max":1000000},
    "seed": {"type":"number","min":0,"max":4294967295,"integer":true}
  },
  "keyFields": ["starCount","speed","rollRate","bokeh","yaw","pitch","anchorFrame","originX","originY","originZ","rollOffset","seed","colorModeIndex"]
}
END_SETKA_PATTERN_DESCRIPTOR */
(()=>{
"use strict";
// Self-contained, deterministic Canvas2D module: one renderer for gameplay,
// moving previews, immutable note snapshots and research Replay.
// Modes 0–4 preserve the preparatory prototype. Modes 5–8 add four distinct
// rainbow families; all nine modes use the existing SETKA color button.
const registry=window.SetkaPatternRegistryV1;
const id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
const HALF=20000,TILE=40000,NEAR=2,TAU=Math.PI*2;
const fixed=registry.get(id).palettes;
const clamp=(v,a,b)=>Number.isFinite(v)?Math.min(b,Math.max(a,v)):a;
const wrap=v=>v-TILE*Math.floor((v+HALF)/TILE);
const positive=(v,m)=>((v%m)+m)%m;
const fields=new Map();
function hash(n){
 n=Math.imul(n^(n>>>16),0x7feb352d);
 n=Math.imul(n^(n>>>15),0x846ca68b);
 return ((n^(n>>>16))>>>0)/4294967296;
}
function starField(seed){
 let xyz=fields.get(seed);
 if(xyz){fields.delete(seed);fields.set(seed,xyz);return xyz}
 xyz=new Float32Array(30000*3);
 for(let i=0;i<30000;i++){
  const n=(Math.imul(i+1,0x9e3779b1)^seed)>>>0,j=i*3;
  xyz[j]=(hash(n^0x6d2b79f5)-.5)*TILE;
  xyz[j+1]=(hash(n^0x4cf5ad43)-.5)*TILE;
  xyz[j+2]=(hash(n^0x1b873593)-.5)*TILE;
 }
 fields.set(seed,xyz);
 if(fields.size>3)fields.delete(fields.keys().next().value);
 return xyz;
}
function basis(c,frame){
 const yaw=clamp(c.yaw,-3.1416,3.1416),pitch=clamp(c.pitch,-1.48,1.48);
 const sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);
 const fx=sy*cp,fy=-sp,fz=cy*cp;
 const r0x=cy,r0z=-sy,u0x=sy*sp,u0y=cp,u0z=cy*sp;
 const roll=clamp(c.rollOffset,-1e6,1e6)+clamp(c.rollRate,0,.06)*(frame-c.anchorFrame);
 const cr=Math.cos(roll),sr=Math.sin(roll);
 return {fx,fy,fz,roll,rx:r0x*cr+u0x*sr,ry:u0y*sr,rz:r0z*cr+u0z*sr,
  ux:u0x*cr-r0x*sr,uy:u0y*cr,uz:u0z*cr-r0z*sr};
}
function position(c,f,b){
 const dist=(f-c.anchorFrame)*c.speed;
 return {x:wrap(c.originX+b.fx*dist),y:wrap(c.originY+b.fy*dist),z:wrap(c.originZ+b.fz*dist)};
}
function rebase(c,patch,frame){
 if(!["speed","rollRate","yaw","pitch"].some(k=>Object.hasOwn(patch,k)))return {...c,...patch};
 const f=clamp(frame,0,1e9),old=basis(c,f),p=position(c,f,old);
 return {...c,...patch,anchorFrame:f,originX:p.x,originY:p.y,originZ:p.z,rollOffset:positive(old.roll+Math.PI,TAU)-Math.PI};
}
// The shared runtime dispatches this hook for a package that opts in. There
// are no star-flight branches in the application, admin or gesture host.
function interact(c,event){
 const e=event||{},f=Number.isFinite(e.frame)?e.frame:0;
 if(e.type==="patch")return rebase(c,e.patch||{},f);
 if(e.type!=="gesture")return c;
 const dx=Number.isFinite(e.dx)?e.dx:0,dy=Number.isFinite(e.dy)?e.dy:0;
 let patch={};
 if(e.fingers>=2){
  patch={yaw:positive(c.yaw+dx*.0035+Math.PI,TAU)-Math.PI,
    pitch:clamp(c.pitch+dy*.0035,-1.48,1.48)};
 }else if(e.fingers===1){
  if(e.zone==="top")patch.rollRate=clamp(c.rollRate+dx*.0005,0,.06);
  else if(e.zone==="left")patch.starCount=Math.round(clamp(c.starCount-dy*20,1000,30000));
  else if(e.zone==="right")patch.bokeh=clamp(c.bokeh-dy*.003,0,1);
  else if(e.zone==="center")patch.speed=clamp(c.speed+dx*.4,1,320);
 }
 return Object.keys(patch).length?rebase(c,patch,f):c;
}
function hsb(h,s,v){
 const c=v*s,x=c*(1-Math.abs((positive(h,360)/60)%2-1)),m=v-c;
 const sector=Math.floor(positive(h,360)/60);
 let r=0,g=0,b=0;
 if(sector===0){r=c;g=x}else if(sector===1){r=x;g=c}
 else if(sector===2){g=c;b=x}else if(sector===3){g=x;b=c}
 else if(sector===4){r=x;b=c}else{r=c;b=x}
 return "rgb("+Math.round((r+m)*255)+","+Math.round((g+m)*255)+","+Math.round((b+m)*255)+")";
}
function rainbowLut(mode,f){
 const out=new Array(72);
 const saturation=mode===6?.48:mode===8?.85:mode===5?.91:1;
 const value=mode===6?1:mode===7?.98:1;
 for(let i=0;i<72;i++)out[i]=hsb(i*5,saturation,value);
 return out;
}
function render(ctx,width,height,c,frame){
 const w=clamp(width,1,10000),h=clamp(height,1,10000),f=Math.max(0,Number.isFinite(frame)?frame:0);
 const count=Math.round(clamp(c.starCount,1000,30000)),seed=c.seed>>>0;
 const b=basis(c,f),p=position(c,f,b),xyz=starField(seed);
 const focal=Math.max(1,Math.min(w,h)*.55),bokeh=clamp(c.bokeh,0,1);
 const scale=1+2*bokeh,alphaMul=1-.65*bokeh,halo=bokeh*.6;
 const mode=Math.round(clamp(c.colorModeIndex,0,8));
 const staticColor=mode<4?"rgb("+fixed[mode].join(",")+")":mode===4?hsb(f*.6,.9,1):null;
 const lut=mode>=5?rainbowLut(mode,f):null;
 ctx.save();ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);ctx.translate(w/2,h/2);
 if(staticColor)ctx.fillStyle=staticColor;
 for(let i=0,j=0;i<count;i++,j+=3){
  const dx=wrap(xyz[j]-p.x),dy=wrap(xyz[j+1]-p.y),dz=wrap(xyz[j+2]-p.z);
  const z=dx*b.fx+dy*b.fy+dz*b.fz;
  if(!(z>NEAR))continue;
  const sx=(dx*b.rx+dy*b.ry+dz*b.rz)/z*focal;
  const sy=(dx*b.ux+dy*b.uy+dz*b.uz)/z*focal;
  if(!Number.isFinite(sx)||!Number.isFinite(sy)||Math.abs(sx)>w*.65+16||Math.abs(sy)>h*.65+16)continue;
  const depth=clamp((z-NEAR)/(HALF-NEAR),0,1);
  const size=(4-3.4*depth)*scale,alpha=(1-195/255*depth)*alphaMul;
  if(mode>=5){
   let idx;
   if(mode===5)idx=Math.floor(hash(Math.imul(i+1,0x52dce729)^seed)*72+f*.06);
   else if(mode===6)idx=Math.floor(hash(Math.imul(i+1,0x278dde6d)^seed)*72+f*.035);
   else if(mode===7)idx=Math.floor(i*0.61803398875*72+f*.55);
   else idx=Math.floor((Math.sin(i*.021+f*.017+sy*.006)+1)*35.5+f*.12);
   ctx.fillStyle=lut[positive(idx,72)];
  }
  if(halo>.01){
   ctx.globalAlpha=alpha*.25;
   ctx.beginPath();ctx.arc(sx,sy,size*(1+2.5*halo)/2,0,TAU);ctx.fill();
  }
  ctx.globalAlpha=alpha;
  if(size<1.7)ctx.fillRect(sx-size/2,sy-size/2,Math.max(.6,size),Math.max(.6,size));
  else{ctx.beginPath();ctx.arc(sx,sy,size/2,0,TAU);ctx.fill();}
 }
 ctx.restore();
}
registry.bindRenderer(id,render);
registry.bindInteraction?.(id,interact);
})();