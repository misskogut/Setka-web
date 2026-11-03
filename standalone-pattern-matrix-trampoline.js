/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "matrix-trampoline",
  "title": "Батут · Матрица",
  "version": 2,
  "introducedAt": "2026-11-04T00:00:00.000Z",
  "schemaVersion": 2,
  "module": "standalone-pattern-matrix-trampoline.js",
  "colorModes": 9,
  "palettes": [
    [
      255,
      255,
      255
    ],
    [
      130,
      192,
      255
    ],
    [
      49,
      245,
      232
    ],
    [
      186,
      135,
      255
    ],
    [
      255,
      117,
      188
    ],
    [
      255,
      195,
      84
    ],
    [
      157,
      255,
      70
    ],
    [
      255,
      255,
      255
    ],
    [
      94,
      244,
      202
    ]
  ],
  "defaults": {
    "patternId": "matrix-trampoline",
    "bounceDistance": 100,
    "bounceSpeed": 1,
    "bounceElasticity": 75,
    "cameraZoom": 100,
    "shapeIndex": 0,
    "lineWidth": 1,
    "yaw": 0.18,
    "pitch": -0.16,
    "colorModeIndex": 0,
    "manualDepth": 0,
    "depthSensitivity": 1,
    "bounceEnabled": 1
  },
  "controls": [
    [
      "Дальность отскока",
      "bounceDistance",
      10,
      300,
      5,
      "Ползунок",
      0
    ],
    [
      "Скорость прыжков",
      "bounceSpeed",
      0.2,
      4,
      0.1,
      "Ползунок",
      0
    ],
    [
      "Упругость",
      "bounceElasticity",
      0,
      100,
      5,
      "Ползунок",
      0
    ],
    [
      "Погружение в матрицу",
      "manualDepth",
      0,
      6.2,
      0.05,
      "Справа ↑↓",
      1
    ],
    [
      "Чувствительность погружения",
      "depthSensitivity",
      0.3,
      3,
      0.1,
      "Ползунок",
      0
    ],
    [
      "Автопрыжки: 0 — выкл, 1 — вкл",
      "bounceEnabled",
      0,
      1,
      1,
      "Ползунок",
      0
    ],
    [
      "Приближение",
      "cameraZoom",
      60,
      180,
      5,
      "Ползунок",
      0
    ],
    [
      "Фигуры (0 куб, 1 сфера, 2 полиэдр)",
      "shapeIndex",
      0,
      2,
      1,
      "Ползунок",
      0
    ],
    [
      "Толщина линий",
      "lineWidth",
      0.3,
      3,
      0.1,
      "Ползунок",
      0
    ],
    [
      "Обзор по горизонтали",
      "yaw",
      -3.1416,
      3.1416,
      0.01,
      "В центре ←→",
      1
    ],
    [
      "Обзор по вертикали",
      "pitch",
      -1.48,
      1.48,
      0.01,
      "В центре ↑↓",
      1
    ]
  ],
  "gestureHints": [
    [
      "Вращение камеры",
      "Один палец в центре ←→↑↓"
    ],
    [
      "Погружение",
      "Один палец от правого края: вверх — вглубь между кубиками, вниз — назад"
    ]
  ],
  "keyFields": [
    "bounceDistance",
    "bounceSpeed",
    "bounceElasticity",
    "cameraZoom",
    "shapeIndex",
    "lineWidth",
    "yaw",
    "pitch",
    "colorModeIndex",
    "manualDepth",
    "depthSensitivity",
    "bounceEnabled"
  ],
  "legacyVersions": [
    1
  ]
}
END_SETKA_PATTERN_DESCRIPTOR */
(()=>{
"use strict";
// Deterministic projection of the original 10×10×10 WEBGL lattice.
// Camera reaches the near grid plane (landing), then moves AWAY from the
// figures (positive depth). At no point is the cube translated upward.
// An octahedron is used for the missing external OBJ, not claimed identical.
const registry=window.SetkaPatternRegistryV1;
const id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number.isFinite(n)?n:a));
const PI=Math.PI,TAU=PI*2;
// The original p5.js lattice used a cube side exactly one tenth of
// its center-to-center step (90% clear gap), on all three axes.
const gridSpan=4.25, gridStep=gridSpan/9, cubeHalf=gridStep/20;
const points=[];
for(let k=0;k<10;k++)for(let j=0;j<10;j++)for(let i=0;i<10;i++)
 points.push({x:(i/9-.5)*gridSpan,y:(j/9-.5)*gridSpan,z:(k/9-.5)*gridSpan,i,j,k});
const cube=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
const cubeEdges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
const poly=[[0,-1,0],[1,0,0],[0,1,0],[-1,0,0],[0,0,-1],[0,0,1]];
const polyEdges=[[0,1],[1,2],[2,3],[3,0],[0,4],[1,4],[2,4],[3,4],[0,5],[1,5],[2,5],[3,5]];
const rgb=[[255,255,255],[130,192,255],[49,245,232],[186,135,255],[255,117,188],[255,195,84],[157,255,70],[255,255,255],[94,244,202]];
function color(mode,p,frame){
 if(mode===0)return "#fff";
 if(mode===7)return "hsl("+((p.i*23+p.j*19+p.k*13+frame*.3)%360)+" 94% 72%)";
 const c=rgb[mode],t=clamp((p.i+p.j+p.k)/27,0,1);
 const blend=t*.26+Math.sin(frame*.015+p.i*.3+p.k*.25)*.08;
 return "rgb("+[0,1,2].map(i=>Math.round(clamp(c[i]*(1-blend)+255*blend,0,255))).join(",")+")";
}
// Pure analytic spring cycle. At phase=0 the camera lands on the near face,
// then rebounds backward (larger cameraZ), reaches the apex, and returns.
// No accumulated mutable physics: notes, saved configs, previews and Replay
// reproduce the same frame regardless of which frames were rendered before.
function displacement(c,frame){
 if(Number(c.bounceEnabled)===0)return 0;
 const speed=clamp(c.bounceSpeed,.2,4);
 const phase=((Math.max(0,frame)/60)*speed*.8)%1;
 const height=.35+clamp(c.bounceDistance,10,300)*.025;
 const elastic=clamp(c.bounceElasticity,0,100)/100;
 const curve=Math.pow(Math.max(0,Math.sin(PI*phase)),2.05-1.42*elastic);
 return height*curve;
}
function interact(c,event){
 const e=event||{};
 // The shared controls use this canonical patch event for every slider.
 if(e.type==="patch")return {...c,...(e.patch||{})};
 if(e.type!=="gesture"||e.fingers!==1)return c;
 const dx=Number.isFinite(e.dx)?e.dx:0,dy=Number.isFinite(e.dy)?e.dy:0;
 if(e.zone==="right"){
  // Right-edge vertical swipe moves the CAMERA itself through the lattice;
  // no scale, orientation, bounce-frequency or palette changes.
  return {...c,manualDepth:clamp((c.manualDepth||0)-dy*.036*
   clamp(c.depthSensitivity,.3,3),0,6.2)};
 }
 if(e.zone!=="center"||(!dx&&!dy))return c;
 const side=Math.max(1,Math.min(Number(e.width)||390,Number(e.height)||844));
 const step=2.0/side;
 return {...c,
  yaw:clamp(c.yaw+dx*step,-3.1416,3.1416),
  pitch:clamp(c.pitch-dy*step,-1.48,1.48)};
}
function render(ctx,width,height,c,frame){
 const w=Math.max(1,width),h=Math.max(1,height);
 const mode=Math.round(clamp(c.colorModeIndex,0,8));
 const shape=Math.round(clamp(c.shapeIndex,0,2));
 const line=clamp(c.lineWidth,.3,3);
 const angleY=clamp(c.yaw,-3.1416,3.1416),angleX=clamp(c.pitch,-1.48,1.48);
 const cy=Math.cos(angleY),sy=Math.sin(angleY),cp=Math.cos(angleX),sp=Math.sin(angleX);
 // A real camera-axis translation; at large manualDepth the view crosses
 // multiple lattice planes. The analytic spring is independent and optional.
 const camera=5.35-clamp(c.manualDepth,0,6.2)+displacement(c,frame);
 const focal=Math.min(w,h)*1.06*clamp(c.cameraZoom,60,180)/100;
 const cx=w/2,centerY=h/2;
 function project(x,y,z){
  const px=x*cy+z*sy,pz=-x*sy+z*cy;
  const py=y*cp-pz*sp,zz=y*sp+pz*cp;
  const depth=camera-zz;
  if(depth<=.08)return null;
  const s=focal/depth;
  return [cx+px*s,centerY-py*s,s,depth];
 }
 const visible=[];
 for(const p of points){
  const center=project(p.x,p.y,p.z);
  if(!center||center[0]<-40||center[0]>w+40||center[1]<-40||center[1]>h+40)continue;
  visible.push({p,center});
 }
 visible.sort((a,b)=>b.center[3]-a.center[3]);
 ctx.save();ctx.globalAlpha=1;ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);
 for(const obj of visible){
  const p=obj.p,q=obj.center;
  ctx.globalAlpha=clamp(1-(q[3]-1.2)*.07,.28,1);
  ctx.strokeStyle=color(mode,p,frame);
  ctx.fillStyle=ctx.strokeStyle;
  if(shape===1){
   ctx.beginPath();ctx.arc(q[0],q[1],clamp(cubeHalf*q[2],.5,16),0,TAU);ctx.fill();
   continue;
  }
  const verts=shape===0?cube:poly,edges=shape===0?cubeEdges:polyEdges;
  const side=shape===0?cubeHalf:gridStep/16;
  const pv=verts.map(v=>project(p.x+v[0]*side,p.y+v[1]*side,p.z+v[2]*side));
  ctx.lineWidth=line;
  ctx.beginPath();
  for(const e of edges){
   const a=pv[e[0]],b=pv[e[1]];
   if(!a||!b)continue;
   ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);
  }
  ctx.stroke();
 }
 ctx.restore();
}
registry.bindRenderer(id,render);
registry.bindInteraction?.(id,interact);
})();
