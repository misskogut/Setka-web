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
    "fov": 77,
    "sensitivity": 1,
    "follow": 0.66,
    "width": 1,
    "density": 1,
    "glow": 0.46,
    "particles": 0.43,
    "pulse": 0.2,
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
    "growthPosition": 0.16,
    "lanePosition": 0,
    "randomness": 0.45,
    "routeSeed": 1,
    "starCount": 0.68,
    "starBrightness": 0.78,
    "starSize": 1.3,
    "starTwinkle": 0.42,
    "starBokeh": 0.17
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
      "Количество звёзд",
      "starCount",
      0,
      1,
      0.02,
      "Ползунок",
      0
    ],
    [
      "Яркость звёзд",
      "starBrightness",
      0,
      1,
      0.02,
      "Ползунок",
      0
    ],
    [
      "Размер звёзд",
      "starSize",
      0.4,
      2.8,
      0.1,
      "Ползунок",
      0
    ],
    [
      "Мерцание звёзд",
      "starTwinkle",
      0,
      1,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Мягкое свечение звёзд",
      "starBokeh",
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
    "routeSeed",
    "starCount",
    "starBrightness",
    "starSize",
    "starTwinkle",
    "starBokeh"
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

// Star directions are fixed in world space; looking around reveals different
// stars without their drifting with the screen or becoming non-replayable.
const sky=Array.from({length:950},(_,i)=>{
 const a=frac(Math.sin((i+1)*127.1)*43758.5453);
 const b=frac(Math.sin((i+1)*311.7+1.6)*22319.753);
 const zz=2*b-1,r=Math.sqrt(Math.max(0,1-zz*zz)),theta=a*TAU;
 return {dir:[r*Math.sin(theta),zz,r*Math.cos(theta)],
  power:frac(Math.sin(i*91.17+7)*18531),
  phase:frac(Math.sin(i*31.37+6)*8319)*TAU,
  rate:.5+frac(Math.sin(i*21.19)*7331)*2.2};
});
function render(ctx,width,height,c,frame,preview){
 const w=Math.max(1,width),h=Math.max(1,height),m=Math.min(w,h),f=Math.max(0,Number(frame)||0);
 const here=travel(c,f),near=road(c,here,here);
 const ahead=road(c,here+6.5+3*c.follow,here);
 const direction=norm(sub(ahead,near));
 const eyeHeight=.35+(1-c.proximity)*3.15;
 const backward=(1-c.proximity)*2.1;
 const trackSide=norm(cross([0,1,0],direction));
 const eye=add(add(sub(near,mul(direction,backward)),[0,eyeHeight,0]),mul(trackSide,c.lanePosition*1.75*c.width));
 const baseYaw=Math.atan2(direction[0],direction[2]),basePitch=Math.atan2(direction[1],Math.hypot(direction[0],direction[2]));
 const yaw=baseYaw+c.lookYaw,pitch=basePitch+c.lookPitch-.095;
 const forward=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];
 const side=[Math.cos(yaw),0,-Math.sin(yaw)],up=norm(cross(forward,side));
 const roll=clamp((road(c,here+5,here)[0]-road(c,here-5,here)[0])*.02,-.26,.26)*c.bank;
 const right=add(mul(side,Math.cos(roll)),mul(up,Math.sin(roll)));
 const vertical=sub(mul(up,Math.cos(roll)),mul(side,Math.sin(roll)));
 const focal=m*.5/Math.tan(c.fov*Math.PI/360);
 const project=p=>{
  const v=sub(p,eye),z=dot(v,forward);
  if(z<=.3)return null;
  return {x:w*.5+dot(v,right)*focal/z,y:h*.5-dot(v,vertical)*focal/z,z};
 };
 ctx.save();ctx.globalAlpha=1;ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);
 // True directional 3D star field, projected through the SAME observer camera.
 // Quantity, brightness, size, twinkle and soft bokeh are independent sliders.
 const starCount=Math.round(sky.length*c.starCount*(preview?.78:1));
 const baseRgb=palette[c.colorModeIndex]||palette[0];
 const cr=Math.round(lerp(baseRgb[0],255,.35)),cg=Math.round(lerp(baseRgb[1],255,.35)),cb=Math.round(lerp(baseRgb[2],255,.35));
 for(let i=0;i<starCount;i++){
  const star=sky[i],v=star.dir,z=dot(v,forward);
  if(z<=.02)continue;
  const x=w*.5+dot(v,right)*focal/z,y=h*.5-dot(v,vertical)*focal/z;
  if(x<-12||x>w+12||y<-12||y>h+12)continue;
  const glitter=(1-c.starTwinkle*.38)+c.starTwinkle*.38*(1+Math.sin(f*.024*star.rate*2+star.phase))*.5;
  const intensity=clamp(c.starBrightness*(.4+star.power*.6)*glitter,0,1);
  if(intensity<=.001)continue;
  const size=(.7+star.power*1.1)*c.starSize;
  if(c.starBokeh>0&&star.power>.69){
   ctx.beginPath();ctx.arc(x,y,size*(2.4+3*c.starBokeh),0,TAU);
   ctx.fillStyle="rgba("+cr+","+cg+","+cb+","+(intensity*c.starBokeh*.12)+")";ctx.fill();
  }
  ctx.beginPath();ctx.arc(x,y,size*.5,0,TAU);
  ctx.fillStyle="rgba("+cr+","+cg+","+cb+","+intensity+")";ctx.fill();
  if(star.power>.972){
   ctx.strokeStyle="rgba("+cr+","+cg+","+cb+","+(intensity*.45)+")";
   ctx.lineWidth=.55;ctx.beginPath();
   ctx.moveTo(x-size*1.5,y);ctx.lineTo(x+size*1.5,y);
   ctx.moveTo(x,y-size*1.5);ctx.lineTo(x,y+size*1.5);ctx.stroke();
  }
 }
 // Restore the original approved bridge proportions and clean crossbars,
 // posts, transverse diagonals, two uninterrupted side rails and perspective.
 const spacing=clamp(1.32/c.density,.48,2.9);
 const frontier=here+10.5+(1-c.growthPosition)*106;
 const first=Math.ceil((here+.22+(1-c.proximity)*3.5)/spacing)*spacing;
 const ribs=[];
 const count=Math.min(preview?85:165,Math.ceil(113/spacing));
 for(let i=0;i<count;i++){
  const s=first+i*spacing;if(s>frontier)break;
  const center=road(c,s,here);
  const tangent=norm(sub(road(c,s+.25,here),road(c,s-.25,here)));
  const r=norm(cross([0,1,0],tangent)),u=norm(cross(tangent,r));
  const curvature=road(c,s+2,here)[0]-road(c,s-2,here)[0];
  const tilt=c.bank*clamp(curvature*.027,-.32,.32);
  const rr=add(mul(r,Math.cos(tilt)),mul(u,Math.sin(tilt)));
  const uu=sub(mul(u,Math.cos(tilt)),mul(r,Math.sin(tilt)));
  const widthScale=1.92*c.width*(1+c.pulse*.035*Math.sin(s*.34-here*.62));
  const point=(dx,dy)=>project(add(center,add(mul(rr,dx*widthScale),mul(uu,dy*widthScale))));
  const p={s,C:project(center),L:point(-1,0),R:point(1,0),
   BL:point(-1.2,0),BR:point(1.2,0),
   TL:point(-1.2,.52),TR:point(1.2,.52),
   DL:point(.82,-.12),DR:point(-.82,-.12)};
  if(Object.keys(p).some(k=>k!=="s"&&(!p[k]||!Number.isFinite(p[k].x))))continue;
  ribs.push(p);
 }
 for(const edge of ["BL","BR"]){
  ctx.beginPath();let started=false;
  for(let i=ribs.length-1;i>=0;i--){
   const p=ribs[i][edge];if(!started){ctx.moveTo(p.x,p.y);started=true}else ctx.lineTo(p.x,p.y);
  }
  ctx.lineWidth=1;ctx.strokeStyle=color(c,here+5,.36);ctx.stroke();
 }
 for(let i=ribs.length-1;i>=0;i--){
  const p=ribs[i],close=clamp(8/p.C.z,.08,1);
  const fade=smooth((113-p.C.z)/48)*smooth((p.s-here-.12)/2)*smooth((frontier-p.s)/5);
  const alpha=fade*(.24+.76*close);
  if(alpha<.015)continue;
  ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle=color(c,p.s,alpha);
  ctx.lineWidth=.7+1.25*close;
  if(c.glow>0&&i%3===0){ctx.shadowColor=color(c,p.s,.9);ctx.shadowBlur=c.glow*11}
  ctx.beginPath();ctx.moveTo(p.L.x,p.L.y);ctx.lineTo(p.R.x,p.R.y);ctx.stroke();
  ctx.lineWidth=.5+1.22*close;
  ctx.beginPath();
  ctx.moveTo(p.TL.x,p.TL.y);ctx.lineTo(p.BL.x,p.BL.y);
  ctx.moveTo(p.TR.x,p.TR.y);ctx.lineTo(p.BR.x,p.BR.y);
  ctx.moveTo(p.BL.x,p.BL.y);ctx.lineTo(p.DL.x,p.DL.y);
  ctx.moveTo(p.BR.x,p.BR.y);ctx.lineTo(p.DR.x,p.DR.y);
  ctx.stroke();ctx.shadowBlur=0;
  if(c.pulse>0&&i%8===0){
   const q=(1+Math.sin(here*.31-p.s*.46))*.5;
   ctx.beginPath();ctx.arc(lerp(p.L.x,p.R.x,q),lerp(p.L.y,p.R.y,q),.45+2.1*close,0,TAU);
   ctx.fillStyle=color(c,p.s,alpha*c.pulse);ctx.fill();
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
