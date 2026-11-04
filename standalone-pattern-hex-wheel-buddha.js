/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "hex-wheel-buddha",
  "title": "Колесо Будды · Hex Grid",
  "version": 1,
  "schemaVersion": 1,
  "introducedAt": "2026-11-04T01:34:00.000Z",
  "module": "standalone-pattern-hex-wheel-buddha.js",
  "colorModes": 9,
  "palettes": [
    [
      255,
      255,
      255
    ],
    [
      201,
      153,
      45
    ],
    [
      80,
      180,
      255
    ],
    [
      255,
      105,
      180
    ],
    [
      180,
      80,
      255
    ],
    [
      67,
      232,
      207
    ],
    [
      156,
      245,
      108
    ],
    [
      255,
      144,
      69
    ],
    [
      255,
      255,
      255
    ]
  ],
  "defaults": {
    "patternId": "hex-wheel-buddha",
    "omega": 0,
    "hexSize": 44,
    "strokeW": 1.6,
    "angleOffset": 0,
    "anchorFrame": 0,
    "colorModeIndex": 0
  },
  "controls": [
    [
      "Скорость и направление вращения",
      "omega",
      -0.2,
      0.2,
      0.001,
      "Снизу ←→",
      1,
      "Низ экрана: вправо — ускорить по часовой, влево — замедлить или вращать против часовой; ноль — остановка."
    ],
    [
      "Толщина линий",
      "strokeW",
      0.5,
      6,
      0.1,
      "Сверху ←→",
      1,
      "Верх экрана: вправо толще, влево тоньше."
    ],
    [
      "Размер ячеек",
      "hexSize",
      5,
      120,
      1,
      "Слева ↑↓",
      1,
      "Левый край: вверх уменьшает, вниз увеличивает размер гекса."
    ]
  ],
  "gestureHints": [
    [
      "Вращение",
      "Снизу ←→ — скорость от −0.2 до +0.2 рад/кадр; 0 — стоп"
    ],
    [
      "Толщина",
      "Сверху ←→ — линии от 0.5 до 6"
    ],
    [
      "Размер ячеек",
      "Слева ↑↓ — вверх меньше, вниз больше (5–120)"
    ],
    [
      "Цвет",
      "Три быстрых касания — следующий из 9 цветовых режимов"
    ]
  ],
  "tapColorCycle": true,
  "schema": {
    "angleOffset": {
      "type": "number",
      "min": -1000000000,
      "max": 1000000000
    },
    "anchorFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    }
  },
  "keyFields": [
    "omega",
    "hexSize",
    "strokeW",
    "angleOffset",
    "anchorFrame",
    "colorModeIndex"
  ]
}
END_SETKA_PATTERN_DESCRIPTOR */

(()=>{
"use strict";
// Approved p5 Hex Grid — Buddha Wheel, remapped to deterministic SETKA Canvas2D.
// The pointy-top hex outline, axial grid, center pivot and 0.96 scale are
// exactly those of the user's sketch and approved inline preview.
const registry=window.SetkaPatternRegistryV1;
const id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
const TAU=Math.PI*2,SQRT3=Math.sqrt(3),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const palettes=registry.get(id).palettes;
function orientation(c,frame){
 return c.angleOffset+(Math.max(0,Number(frame)||0)-c.anchorFrame)*c.omega;
}
function rainbow(frame){
 // p5 millis()*0.0005 at 60fps: shared all-line hue phase.
 const t=(Math.max(0,Number(frame)||0)/120)*TAU;
 return "rgb("+Math.round(127+128*Math.sin(t))+","+
  Math.round(127+128*Math.sin(t+Math.PI/3))+","+
  Math.round(127+128*Math.sin(t+2*Math.PI/3))+")";
}
function render(ctx,width,height,c,frame){
 const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1);
 const size=clamp(c.hexSize,5,120),angle=orientation(c,frame);
 const mode=clamp(Math.round(c.colorModeIndex),0,8);
 const color=mode===8?rainbow(frame):"rgb("+palettes[mode].join(",")+")";
 ctx.save();ctx.globalAlpha=1;ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);
 ctx.translate(w/2,h/2);ctx.rotate(angle);ctx.scale(.96,.96);
 ctx.strokeStyle=color;ctx.lineWidth=clamp(c.strokeW,.5,6);
 ctx.lineCap="square";ctx.lineJoin="miter";
 const unitX=SQRT3*size,vStep=1.5*size;
 // The prototype uses a square diagonal bound. This rotated viewport bound
 // draws the same *visible* hexes without six times the invisible work at
 // minimum cell size (a critical 60fps mobile/preview performance guard).
 const cs=Math.abs(Math.cos(angle)),sn=Math.abs(Math.sin(angle));
 const boundX=(cs*w+sn*h)/1.92+size*1.5;
 const boundY=(sn*w+cs*h)/1.92+size*1.5;
 const rMin=Math.floor((-boundY-size)/vStep)-1;
 const rMax=Math.ceil((boundY+size)/vStep)+1;
 const cos=[Math.cos(Math.PI/6),0,-Math.cos(Math.PI/6),-Math.cos(Math.PI/6),0,Math.cos(Math.PI/6)];
 const sin=[.5,1,.5,-.5,-1,-.5];
 for(let r=rMin;r<=rMax;r++){
  const y=vStep*r;
  if(Math.abs(y)>boundY+size)continue;
  ctx.beginPath();
  const qMin=Math.ceil((-boundX-size)/unitX-r/2);
  const qMax=Math.floor((boundX+size)/unitX-r/2);
  for(let q=qMin;q<=qMax;q++){
   const x=unitX*(q+r/2);
   // Original hexOutline: beginShape, six vertices PI/6+k*PI/3, CLOSE.
   ctx.moveTo(x+size*cos[0],y+size*sin[0]);
   for(let k=1;k<6;k++)ctx.lineTo(x+size*cos[k],y+size*sin[k]);
   ctx.closePath();
  }
  ctx.stroke();
 }
 ctx.restore();
}
function interact(c,event){
 const e=event||{},f=Number.isFinite(e.frame)?e.frame:0;
 if(e.type==="patch"){
  const patch=e.patch||{};
  if(["omega","anchorFrame","angleOffset"].every(k=>Object.hasOwn(patch,k)))
   return {...c,...patch};
  if(patch.omega!==undefined&&patch.omega!==c.omega){
   return {...c,...patch,angleOffset:orientation(c,f),anchorFrame:f};
  }
  return {...c,...patch};
 }
 if(e.type!=="gesture"||e.phase!=="move"||e.fingers!==1)return c;
 const dx=Number(e.dx)||0,dy=Number(e.dy)||0;
 if(!dx&&!dy)return c;
 const w=Math.max(1,Number(e.width)||390),h=Math.max(1,Number(e.height)||780);
 // Priority matches the approved preview: LEFT edge first, then BOTTOM, TOP.
 // Starting zone stays locked for entire gesture, including crossed edges.
 const sx=Number.isFinite(e.startX)?e.startX:Number(e.x)||w*.5;
 const sy=Number.isFinite(e.startY)?e.startY:Number(e.y)||h*.5;
 if(sx<w*.28)return {...c,hexSize:clamp(Math.round(c.hexSize+dy*.1),5,120)};
 if(sy>h*.72){
  const omega=clamp(c.omega+dx*.0025,-.2,.2);
  if(omega===c.omega)return c;
  return {...c,omega,angleOffset:orientation(c,f),anchorFrame:f};
 }
 if(sy<h*.28)return {...c,strokeW:clamp(Math.round((c.strokeW+dx*.01)*10)/10,.5,6)};
 return c;
}
registry.bindRenderer(id,render);
registry.bindInteraction?.(id,interact);
})();
