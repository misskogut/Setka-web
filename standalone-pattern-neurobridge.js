/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "neurobridge",
  "title": "Нейромост · пространственная дорога",
  "version": 1,
  "introducedAt": "2026-11-04T00:00:00.000Z",
  "schemaVersion": 1,
  "module": "standalone-pattern-neurobridge.js",
  "colorModes": 9,
  "palettes": [
    [
      255,
      255,
      255
    ],
    [
      85,
      187,
      255
    ],
    [
      80,
      255,
      217
    ],
    [
      152,
      100,
      255
    ],
    [
      255,
      118,
      205
    ],
    [
      255,
      115,
      55
    ],
    [
      255,
      213,
      115
    ],
    [
      90,
      245,
      201
    ],
    [
      255,
      130,
      170
    ]
  ],
  "defaults": {
    "patternId": "neurobridge",
    "speed": 1,
    "turns": 1,
    "climbs": 1,
    "bank": 0.45,
    "proximity": 0.72,
    "fov": 78,
    "sensitivity": 1,
    "follow": 0.62,
    "width": 1,
    "density": 1,
    "glow": 0.62,
    "particles": 0.43,
    "pulse": 0.35,
    "mode": 0,
    "steerX": 0,
    "steerY": 0,
    "lookYaw": 0,
    "lookPitch": 0,
    "anchorFrame": 0,
    "anchorTravel": 12,
    "colorModeIndex": 0,
    "turnSharpness": 1,
    "dropDepth": 1,
    "hillSharpness": 1,
    "growthPosition": 0.25,
    "lanePosition": 0,
    "randomness": 0.7,
    "routeSeed": 1
  },
  "controls": [
    [
      "Скорость",
      "speed",
      0.2,
      3,
      0.1,
      "Ползунок",
      0
    ],
    [
      "Амплитуда поворотов",
      "turns",
      0,
      3.5,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Резкость поворотов",
      "turnSharpness",
      0.4,
      3.5,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Высота подъёмов",
      "climbs",
      0,
      5,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Глубина спусков",
      "dropDepth",
      0,
      5,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Крутизна подъёмов/спусков",
      "hillSharpness",
      0.4,
      3.5,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Непредсказуемость маршрута",
      "randomness",
      0,
      1.5,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Вариант маршрута",
      "routeSeed",
      1,
      9,
      1,
      "Ползунок",
      0
    ],
    [
      "Крен",
      "bank",
      0,
      1,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Высота наблюдателя",
      "proximity",
      0,
      1,
      0.02,
      "Ползунок",
      0
    ],
    [
      "По дороге: готовая ↔ рождается",
      "growthPosition",
      0,
      1,
      0.02,
      "Ползунок",
      0
    ],
    [
      "По ширине: слева ↔ справа",
      "lanePosition",
      -1,
      1,
      0.02,
      "Ползунок",
      0
    ],
    [
      "Угол обзора",
      "fov",
      50,
      115,
      1,
      "Ползунок",
      0
    ],
    [
      "Чувствительность пальца",
      "sensitivity",
      0.3,
      2.2,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Плавность камеры",
      "follow",
      0,
      1,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Ширина дороги",
      "width",
      0.5,
      1.9,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Частота секций",
      "density",
      0.45,
      1.9,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Свечение",
      "glow",
      0,
      1,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Частицы",
      "particles",
      0,
      1,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Пульсация",
      "pulse",
      0,
      1,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Режим: руль / взгляд / вместе",
      "mode",
      0,
      2,
      1,
      "Ползунок",
      0
    ],
    [
      "Направление дороги ←→",
      "steerX",
      -1,
      1,
      0.01,
      "В центре ←→",
      1
    ],
    [
      "Направление дороги ↑↓",
      "steerY",
      -1,
      1,
      0.01,
      "В центре ↑↓",
      1
    ],
    [
      "Поворот головы ←→",
      "lookYaw",
      -1.15,
      1.15,
      0.01,
      "2 пальца ←→",
      2
    ],
    [
      "Наклон головы ↑↓",
      "lookPitch",
      -0.75,
      0.75,
      0.01,
      "2 пальца ↑↓",
      2
    ]
  ],
  "gestureHints": [
    [
      "Рулить",
      "Режим 0: 1 палец ←→↑↓ — траектория; 2 пальца — взгляд"
    ],
    [
      "Осматриваться",
      "Режим 1: 1 палец ←→↑↓ — голова; 2 пальца — траектория"
    ],
    [
      "Вместе",
      "Режим 2: 1 палец слева — дорога, справа — взгляд; 2 пальца — взгляд"
    ]
  ],
  "schema": {
    "anchorFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    },
    "anchorTravel": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    }
  },
  "keyFields": [
    "speed",
    "turns",
    "climbs",
    "bank",
    "proximity",
    "fov",
    "sensitivity",
    "follow",
    "width",
    "density",
    "glow",
    "particles",
    "pulse",
    "mode",
    "steerX",
    "steerY",
    "lookYaw",
    "lookPitch",
    "anchorFrame",
    "anchorTravel",
    "colorModeIndex",
    "turnSharpness",
    "dropDepth",
    "hillSharpness",
    "growthPosition",
    "lanePosition",
    "randomness",
    "routeSeed"
  ]
}
END_SETKA_PATTERN_DESCRIPTOR */
(()=>{
"use strict";
const registry=window.SetkaPatternRegistryV1;
const id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
// Deterministic frame/config renderer: the same road in gameplay, thumbnails,
// saved configurations, notes and research Replay. No canvas-specific state.
const TAU=2*Math.PI,clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),lerp=(a,b,t)=>a+(b-a)*t;
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mul=(v,k)=>[v[0]*k,v[1]*k,v[2]*k];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=v=>{const d=Math.hypot(v[0],v[1],v[2])||1;return mul(v,1/d)};
const frac=x=>x-Math.floor(x);
const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t)};
const palette=registry.get(id).palettes;
function travel(c,frame){return c.anchorTravel+(frame-c.anchorFrame)*.07*c.speed}
// A 3D centerline (not a 2D screen warp), with independently controllable
// horizontal bends, hills, and a forward-only steering deformation.
function hash1(i,seed,channel){
 let n=Math.imul((i|0)^Math.imul(seed|0,0x9e3779b1)^Math.imul(channel|0,0x85ebca6b),0x27d4eb2d);
 n=Math.imul(n^(n>>>15),0x7feb352d);
 n=Math.imul(n^(n>>>16),0x846ca68b);
 return (((n^(n>>>16))>>>0)/2147483648)-1;
}
function noise1(x,seed,channel){
 const i=Math.floor(x),t=x-i,k=t*t*t*(t*(6*t-15)+10);
 return lerp(hash1(i,seed,channel),hash1(i+1,seed,channel),k);
}
function road(c,s,here){
 // Independent knobs: the amplitude sets excursion, the sharpness sets
 // spatial frequency / curvature. Seeded gradient noise makes every
 // route distinct while preserving deterministic saved Replay.
 const turnFrequency=c.turnSharpness,upFrequency=c.hillSharpness,seed=c.routeSeed|0;
 const xBase=4.5*Math.sin(s*.043*turnFrequency+seed*.23)+2*Math.sin(s*.094*turnFrequency+1.4+seed*.13)+.7*Math.sin(s*.18*turnFrequency+2);
 const xRandom=c.randomness*(3.2*noise1(s*.038*turnFrequency,seed,1)+1.2*noise1(s*.12*turnFrequency,seed,2));
 const rawY=2.4*Math.sin(s*.048*upFrequency+.4+seed*.15)+1.1*Math.sin(s*.117*upFrequency+1.7+seed*.21)+.5*Math.sin(s*.21*upFrequency+.6)
   +c.randomness*(1.7*noise1(s*.05*upFrequency,seed,3)+.7*noise1(s*.13*upFrequency,seed,4));
 const posBlend=(1+rawY/Math.sqrt(rawY*rawY+.0144))*.5;
 const verticalAmplitude=lerp(c.dropDepth,c.climbs,posBlend);
 const approach=smooth((s-here)/16);
 return [(c.turns*(xBase+xRandom))+c.steerX*4.3*approach,
         rawY*verticalAmplitude+c.steerY*3.6*approach,s];
}
function color(c,s,a){
 const mode=c.colorModeIndex,alpha=clamp(a,0,1);
 if(mode===0)return "rgba(255,255,255,"+alpha+")";
 const rgb=palette[mode]||palette[1];
 if(mode===8){
  const phase=s*.095,shift=(Math.sin(phase)+1)*.5;
  const r=Math.round(80+175*shift),g=Math.round(100+140*(Math.sin(phase+2.09)+1)*.5),b=Math.round(100+155*(Math.sin(phase+4.18)+1)*.5);
  return "rgba("+r+","+g+","+b+","+alpha+")";
 }
 const wave=.80+.20*Math.sin(s*.05+c.anchorTravel*.006);
 return "rgba("+Math.round(rgb[0]*wave)+","+Math.round(rgb[1]*wave)+","+Math.round(rgb[2]*wave)+","+alpha+")";
}
function frameColor(c,s,frame){
 return color(c,s,.5+.5*Math.sin(frame*.035+s*.24));
}
function render(ctx,width,height,c,frame,preview){
 const w=Math.max(1,width),h=Math.max(1,height),m=Math.min(w,h),f=Math.max(0,Number(frame)||0);
 const here=travel(c,f),near=road(c,here,here);
 const ahead=road(c,here+3.5+c.follow*6,here);
 const direction=norm(sub(ahead,near));
 const eyeHeight=.35+(1-c.proximity)*3.15;
 const backward=(1-c.proximity)*2.1;
 const trackSide=norm(cross([0,1,0],direction));
 const eye=add(add(sub(near,mul(direction,backward)),[0,eyeHeight,0]),mul(trackSide,c.lanePosition*1.8*c.width*.98));
 // Follow tangent naturally, then rotate the observer's HEAD independently.
 const baseYaw=Math.atan2(direction[0],direction[2]);
 const basePitch=Math.atan2(direction[1],Math.hypot(direction[0],direction[2]));
 const yaw=baseYaw+c.lookYaw,pitch=basePitch+c.lookPitch-.07;
 const forward=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];
 const side=[Math.cos(yaw),0,-Math.sin(yaw)],up=norm(cross(forward,side));
 const tilt=clamp((Math.atan2((road(c,here+4,here)[0]-near[0]),4)-baseYaw)*c.bank,-.32,.32);
 const right=add(mul(side,Math.cos(tilt)),mul(up,Math.sin(tilt)));
 const vertical=sub(mul(up,Math.cos(tilt)),mul(side,Math.sin(tilt)));
 const focal=m*.5/Math.tan(c.fov*Math.PI/360);
 const project=p=>{
  const v=sub(p,eye),z=dot(v,forward);
  if(z<=.28)return null;
  return {x:w*.5+dot(v,right)*focal/z,y:h*.5-dot(v,vertical)*focal/z,z};
 };
 ctx.save();ctx.globalAlpha=1;ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);
 const stars=Math.round((preview?38:105)*c.particles);
 for(let i=0;i<stars;i++){
  const sx=frac(Math.sin((i+7)*17.317)*43758.7),sy=frac(Math.sin((i+19)*8.729)*16389.6);
  const x=frac(sx+here*.00015*(1+i%7))*w,y=sy*h;
  ctx.fillStyle=color(c,i*7,.09+.23*(i%8)/8*c.particles);
  ctx.fillRect(x,y,.55+(i%4)*.18,.55+(i%4)*.18);
 }
 const spacing=clamp(1.45/c.density,.5,3);
 // The emergence frontier follows the observer. At 100% position, new
 // crossbars are born just ahead; at 0% they grow far down the track.
 const growthAhead=10.5+93.5*(1-c.growthPosition);
 const frontier=here+growthAhead;
 const first=Math.ceil((here+.22+(1-c.proximity)*3.5)/spacing)*spacing;
 const count=Math.min(preview?76:155,Math.ceil(95/spacing));
 const ribs=[];
 for(let i=0;i<count;i++){
  const s=first+i*spacing;
  if(s>frontier)break;
  const center=road(c,s,here),tangent=norm(sub(road(c,s+.2,here),road(c,s-.2,here)));
  const r=norm(cross([0,1,0],tangent)),u=norm(cross(tangent,r));
  const curvature=road(c,s+2,here)[0]-road(c,s-2,here)[0];
  const roll=c.bank*clamp(curvature*.035,-.33,.33);
  const rr=add(mul(r,Math.cos(roll)),mul(u,Math.sin(roll)));
  const uu=sub(mul(u,Math.cos(roll)),mul(r,Math.sin(roll)));
  const widthScale=1.8*c.width*(1+c.pulse*.10*Math.sin(s*.43-here*.65));
  const point=(dx,dy)=>project(add(center,add(mul(rr,dx*widthScale),mul(uu,dy*widthScale))));
  const p={s,C:project(center),L:point(-1,0),R:point(1,0),
    BL:point(-1.15,0),BR:point(1.15,0),
    TL:point(-1.15,.65),TR:point(1.15,.65),
    DL:point(-.82,-.18),DR:point(.82,-.18)};
  if(Object.keys(p).some(k=>k!=="s"&&(!p[k]||!Number.isFinite(p[k].x))))continue;
  ribs.push(p);
 }
 // The far end is drawn first, so close new sections visibly appear UNDER
 // the observer rather than forming a wall across eye level.
 for(const sideName of ["BL","BR"]){
  ctx.beginPath();let started=false;
  for(let i=ribs.length-1;i>=0;i--){
   const v=ribs[i][sideName];
   if(!started){ctx.moveTo(v.x,v.y);started=true}else ctx.lineTo(v.x,v.y);
  }
  ctx.strokeStyle=color(c,here+11,.29);ctx.lineWidth=1.1;ctx.stroke();
 }
 for(let i=ribs.length-1;i>=0;i--){
  const p=ribs[i],z=p.C.z,close=clamp(7/z,.08,1);
  const fade=smooth((95-z)/38)*smooth((p.s-here-.2)/2)*smooth((frontier-p.s)/4);
  const opacity=fade*(.17+.78*close);
  if(opacity<.015)continue;
  ctx.beginPath();
  ctx.moveTo(p.L.x,p.L.y);ctx.lineTo(p.R.x,p.R.y);
  ctx.moveTo(p.TL.x,p.TL.y);ctx.lineTo(p.BL.x,p.BL.y);ctx.lineTo(p.DR.x,p.DR.y);
  ctx.moveTo(p.TR.x,p.TR.y);ctx.lineTo(p.BR.x,p.BR.y);ctx.lineTo(p.DL.x,p.DL.y);
  ctx.lineWidth=.55+1.55*close;
  ctx.strokeStyle=color(c,p.s,opacity);
  if(c.glow>0&&i%3===0){ctx.shadowBlur=12*c.glow;ctx.shadowColor=color(c,p.s,.7)}
  ctx.stroke();ctx.shadowBlur=0;
  if(c.pulse>0&&i%7===0){
   const q=(1+Math.sin(here*.35-p.s*.55))*.5;
   ctx.beginPath();ctx.arc(lerp(p.L.x,p.R.x,q),lerp(p.L.y,p.R.y,.5),.5+2*close,0,TAU);
   ctx.fillStyle=frameColor(c,p.s,f);ctx.globalAlpha=opacity*c.pulse;ctx.fill();ctx.globalAlpha=1;
  }
 }
 ctx.restore();
}
// The shared gesture host reports one/two-finger CENTROID deltas. It cannot
// independently report two pointer trajectories, so "together" selects
// left/right one-finger start zones and uses two-finger movement for look.
function interact(c,event){
 const e=event||{},f=Number.isFinite(e.frame)?e.frame:0;
 if(e.type==="patch"){
  const patch=e.patch||{};
  if(patch.speed!==undefined&&patch.speed!==c.speed){
   return {...c,...patch,anchorFrame:f,anchorTravel:travel(c,f)};
  }
  return {...c,...patch};
 }
 if(e.type!=="gesture")return c;
 const dx=Number(e.dx)||0,dy=Number(e.dy)||0;
 if(!dx&&!dy)return c;
 const width=Math.max(1,Number(e.width)||390),height=Math.max(1,Number(e.height)||780);
 const scale=c.sensitivity;
 let steer=false;
 if(e.fingers>=2)steer=c.mode===1;
 else if(e.fingers===1)steer=c.mode===0||(c.mode===2&&(Number.isFinite(e.startX)?e.startX<width/2:e.zone!=="right"));
 else return c;
 const x=dx/width*2.55*scale,y=-dy/height*2.55*scale;
 if(steer)return {...c,steerX:clamp(c.steerX+x,-1,1),steerY:clamp(c.steerY+y,-1,1)};
 return {...c,lookYaw:clamp(c.lookYaw+x,-1.15,1.15),lookPitch:clamp(c.lookPitch+y,-.75,.75)};
}
registry.bindRenderer(id,render);
registry.bindInteraction?.(id,interact);
})();
