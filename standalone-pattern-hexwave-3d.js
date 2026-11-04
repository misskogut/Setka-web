/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "hexwave-3d",
  "title": "Гексаволна 3D",
  "version": 1,
  "schemaVersion": 1,
  "introducedAt": "2026-11-04T03:45:00.000Z",
  "module": "standalone-pattern-hexwave-3d.js",
  "colorModes": 9,
  "palettes": [
    [
      255,
      255,
      255
    ],
    [
      255,
      80,
      80
    ],
    [
      255,
      150,
      50
    ],
    [
      0,
      170,
      255
    ],
    [
      255,
      0,
      128
    ],
    [
      215,
      90,
      255
    ],
    [
      50,
      240,
      210
    ],
    [
      130,
      235,
      140
    ],
    [
      255,
      240,
      110
    ]
  ],
  "defaults": {
    "patternId": "hexwave-3d",
    "hexCount": 14,
    "lineW": 1.4,
    "colorSpeed": 1,
    "spinRate": 2,
    "savedSpin": 2,
    "waveSpeed": 250,
    "perspective": 900,
    "waves": [],
    "densityFloat": 14,
    "tapCount": 0,
    "lastTapFrame": -1000,
    "holdStartFrame": 0,
    "holdX": 0.5,
    "holdY": 0.5,
    "holdPossible": false,
    "colorModeIndex": 0
  },
  "controls": [
    [
      "Плотность сетки",
      "hexCount",
      2,
      120,
      1,
      "Слева ↑↓",
      1,
      "Одним пальцем на левой трети экрана: вверх — больше ячеек, вниз — меньше."
    ],
    [
      "Толщина линий",
      "lineW",
      0.3,
      10,
      0.1,
      "Сверху ←→",
      1,
      "Горизонтально в верхней трети: меняет толщину каждого гекса."
    ],
    [
      "Скорость кручения",
      "spinRate",
      0,
      6,
      0.01,
      "Снизу ←→",
      1,
      "Нижняя треть: вправо быстрее вращение гексов вокруг вертикальной оси, влево медленнее. Ноль — пауза."
    ],
    [
      "Скорость цвета",
      "colorSpeed",
      0.05,
      10,
      0.05,
      "Снизу ←→",
      2,
      "Двумя пальцами по нижней трети меняй скорость переливов в цветных режимах."
    ],
    [
      "Скорость фронта волны",
      "waveSpeed",
      50,
      800,
      10,
      "Ползунок",
      0,
      "Скорость распространения 3D-волны из точки двойного касания, пикселей в секунду; исходно 250."
    ],
    [
      "3D-перспектива",
      "perspective",
      200,
      1800,
      20,
      "Ползунок",
      0,
      "Перспективное сокращение гексов по оси глубины; исходно 900."
    ]
  ],
  "gestureHints": [
    [
      "Волна",
      "Два быстрых тапа в одной области — новый фронт 3D-вращения из точки касания"
    ],
    [
      "Цвет",
      "Три быстрых тапа — следующий из 9 цветовых режимов"
    ],
    [
      "Стоп",
      "Удерживай палец не менее 700 мс без движения — остановка и очистка всех волн"
    ],
    [
      "Плотность",
      "Слева ↑↓ — больше или меньше гексов"
    ],
    [
      "Линии",
      "Сверху ←→ — толщина"
    ],
    [
      "Кручение",
      "Снизу ←→ — скорость вращения"
    ],
    [
      "Переливы",
      "Два пальца снизу ←→ — скорость цвета"
    ]
  ],
  "tapColorCycle": true,
  "schema": {
    "waves": {
      "type": "array",
      "maxItems": 63
    },
    "densityFloat": {
      "type": "number",
      "min": 2,
      "max": 120
    },
    "tapCount": {
      "type": "number",
      "min": 0,
      "max": 2,
      "integer": true
    },
    "lastTapFrame": {
      "type": "number",
      "min": -1000000000,
      "max": 1000000000
    },
    "holdStartFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    },
    "holdX": {
      "type": "number",
      "min": 0,
      "max": 1
    },
    "holdY": {
      "type": "number",
      "min": 0,
      "max": 1
    },
    "holdPossible": {
      "type": "boolean"
    }
  },
  "keyFields": [
    "hexCount",
    "lineW",
    "colorSpeed",
    "spinRate",
    "savedSpin",
    "waveSpeed",
    "perspective",
    "waves",
    "densityFloat",
    "tapCount",
    "lastTapFrame",
    "holdStartFrame",
    "holdX",
    "holdY",
    "holdPossible",
    "colorModeIndex"
  ]
}
END_SETKA_PATTERN_DESCRIPTOR */

(()=>{
"use strict";
// Source parity: p5-style axial offset grid, perspective-projected 60-degree
// y-axis rotations, independent per-hex wave fronts, and nine HSB palettes.
// Wave history is stored as [x / width, y / height, startFrame] triples to
// preserve responsive geometry in gameplay, previews, notes and research Replay.
const registry=window.SetkaPatternRegistryV1;
const id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
const TAU=Math.PI*2,SQ3=Math.sqrt(3);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const round=(x,n=4)=>Math.round(x*10**n)/10**n;
const vx=[1,.5,-.5,-1,-.5,.5],vy=[0,SQ3/2,SQ3/2,0,-SQ3/2,-SQ3/2];
const cellCache=new Map();
function layout(w,h,count){
 const key=[Math.round(w*10),Math.round(h*10),count].join(":");
 let result=cellCache.get(key);
 if(result){cellCache.delete(key);cellCache.set(key,result);return result;}
 const R=w/(1.5*count+.5),dx=1.5*R,dy=SQ3*R;
 const minC=Math.ceil((-w/2-R)/dx),maxC=Math.floor((w/2+R)/dx);
 const values=[];
 for(let c=minC;c<=maxC;c++){
  const cx=c*dx,offset=(c&1)*dy/2;
  const minR=Math.ceil((-h/2-R-offset)/dy);
  const maxR=Math.floor((h/2+R-offset)/dy);
  for(let r=minR;r<=maxR;r++){
   const cy=r*dy+offset;
   values.push(cx,cy,c,r);
  }
 }
 result={radius:R,cells:new Float32Array(values)};
 cellCache.set(key,result);
 if(cellCache.size>7)cellCache.delete(cellCache.keys().next().value);
 return result;
}
const hue=(h)=>((h%360)+360)%360;
const hsl=(h)=>"hsl("+round(hue(h),2)+" 100% 50%)";
function palette(mode,r,c,frame,colorSpeed){
 const shift=frame*colorSpeed*.5;
 switch(mode){
  case 0:return "#fff";
  case 1:return hsl(r+c+shift);
  case 2:return hsl(frame+r); // Exact original: frame-based, not COLOR_SPEED.
  case 3:return "rgb(0,170,255)";
  case 4:return "rgb(255,0,128)";
  case 5:return hsl(Math.atan2(r,c)*180/Math.PI+shift);
  case 6:return hsl(c*2+shift);
  case 7:return hsl(r*2+shift);
  default:return hsl((r+c)*2+shift);
 }
}
function hueNumber(mode,r,c,frame,colorSpeed){
 const shift=frame*colorSpeed*.5;
 if(mode===1)return r+c+shift;
 if(mode===2)return frame+r;
 if(mode===5)return Math.atan2(r,c)*180/Math.PI+shift;
 if(mode===6)return c*2+shift;
 if(mode===7)return r*2+shift;
 return (r+c)*2+shift;
}
function polygon(ctx,x,y,R,angle,depth){
 const cos=Math.cos(angle),sin=Math.sin(angle);
 for(let k=0;k<6;k++){
  const ox=R*vx[k],oy=R*vy[k];
  const rx=ox*cos,z=-ox*sin;
  const factor=depth/(depth+z);
  if(k===0)ctx.moveTo(x+rx*factor,y+oy*factor);
  else ctx.lineTo(x+rx*factor,y+oy*factor);
 }
 ctx.closePath();
}
function render(ctx,width,height,c,frame){
 const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1);
 const f=Number.isFinite(frame)?Math.max(0,frame):0;
 const density=clamp(Math.round(c.hexCount),2,120);
 const {radius,cells}=layout(w,h,density);
 const mode=clamp(Math.round(c.colorModeIndex),0,8);
 const depth=clamp(c.perspective,200,1800),strokeW=clamp(c.lineW,.3,10);
 const waves=c.waves||[],nWaves=waves.length-(waves.length%3);
 const spin=clamp(c.spinRate,0,6);
 ctx.save();
 ctx.globalAlpha=1;ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);
 ctx.translate(w/2,h/2);
 ctx.lineWidth=strokeW;ctx.lineCap="square";ctx.lineJoin="miter";
 // Every wave starts at the original touch location and reaches each cell at
 // distance / waveSpeed seconds. The source continuously accumulates angle.
 function angleAt(x,y){
  let total=0;
  if(!spin)return total;
  for(let i=0;i<nWaves;i+=3){
   const elapsed=(f-waves[i+2])/60;
   if(elapsed<=0)continue;
   const d=Math.hypot(x+w/2-waves[i]*w,y+h/2-waves[i+1]*h);
   const pass=elapsed-d/clamp(c.waveSpeed,50,800);
   if(pass>0)total+=pass*spin*TAU/6;
  }
  return total;
 }
 const n=cells.length/4;
 if(mode===0||mode===3||mode===4){
  ctx.strokeStyle=palette(mode,0,0,f,c.colorSpeed);
  // A bounded row/column batch preserves the exact line geometry while
  // avoiding a single huge Canvas path on low-memory mobile devices.
  let priorColumn=NaN;
  for(let i=0;i<n;i++){
   const j=i*4,x=cells[j],y=cells[j+1],col=cells[j+2];
   if(col!==priorColumn){
    if(i)ctx.stroke();
    ctx.beginPath();priorColumn=col;
   }
   polygon(ctx,x,y,radius,angleAt(x,y),depth);
  }
  if(n)ctx.stroke();
 }else if(n<=2600){
  for(let i=0;i<n;i++){
   const j=i*4,x=cells[j],y=cells[j+1],col=cells[j+2],row=cells[j+3];
   ctx.beginPath();ctx.strokeStyle=palette(mode,row,col,f,c.colorSpeed);
   polygon(ctx,x,y,radius,angleAt(x,y),depth);
   ctx.stroke();
  }
 }else{
  // Quantize only hues which are below visual raster resolution at high
  // density. Fewer Canvas stroke calls prevent mobile GPU/main-thread stalls.
  const count=180,groups=Array.from({length:count},()=>[]);
  for(let i=0;i<n;i++){
   const j=i*4,row=cells[j+3],col=cells[j+2];
   groups[Math.floor(hue(hueNumber(mode,row,col,f,c.colorSpeed))/2)%count].push(i);
  }
  for(let b=0;b<count;b++){
   if(!groups[b].length)continue;
   ctx.beginPath();ctx.strokeStyle=hsl(b*2);
   for(const i of groups[b]){
    const j=i*4,x=cells[j],y=cells[j+1];
    polygon(ctx,x,y,radius,angleAt(x,y),depth);
   }
   ctx.stroke();
  }
 }
 ctx.restore();
}
function interact(c,event){
 const e=event||{},f=clamp(Number.isFinite(e.frame)?e.frame:0,0,1e9);
 if(e.type==="patch"){
  const patch=e.patch||{};
  // RESET supplies a complete canonical configuration (never retain waves).
  if(Object.hasOwn(patch,"waves")&&Object.hasOwn(patch,"tapCount")&&
     Object.hasOwn(patch,"holdStartFrame"))return {...c,...patch};
  let next={...c,...patch};
  if(Object.hasOwn(patch,"hexCount"))next.densityFloat=next.hexCount;
  if(Number.isFinite(patch.spinRate)&&patch.spinRate>0)next.savedSpin=patch.spinRate;
  return next;
 }
 if(e.type!=="gesture"||e.cancelled&&!["end","start"].includes(e.phase))return c;
 const w=Math.max(1,Number(e.width)||390),h=Math.max(1,Number(e.height)||800);
 const x=Number(e.x)||0,y=Number(e.y)||0;
 if(e.phase==="start"&&e.fingers===1){
  // The source counts consecutive touch starts (not finger releases).
  const delta=f-c.lastTapFrame;
  let count=delta>=0&&delta<21?c.tapCount+1:1;
  let next={...c,tapCount:count>=3?0:count,lastTapFrame:f,
            holdStartFrame:f,holdX:clamp(x/w,0,1),
            holdY:clamp(y/h,0,1),holdPossible:true};
  if(count===2){
   // One normalized position and one logical frame per launched wave.
   // A 21-wave bound guarantees durable, bounded config/history storage.
   const history=[...c.waves,round(clamp(x/w,0,1),6),round(clamp(y/h,0,1),6),round(f,4)];
   next.waves=history.slice(-63);
   next.spinRate=c.savedSpin>0?c.savedSpin:Math.max(c.spinRate,.1);
  }
  return next;
 }
 if(e.phase==="end"&&e.fingers===1){
  if(e.cancelled)return {...c,holdPossible:false};
  if(c.holdPossible&&f-c.holdStartFrame>=42){
   return {...c,spinRate:0,savedSpin:Math.max(c.spinRate,.1),
           waves:[],tapCount:0,holdPossible:false};
  }
  return {...c,holdPossible:false};
 }
 if(e.phase!=="move")return c;
 const dx=Number(e.dx)||0,dy=Number(e.dy)||0;
 if(!dx&&!dy)return c;
 if(e.fingers>=2){
  if((Number(e.startY)||y)>h*2/3&&Math.abs(dx)>Math.abs(dy)){
   return {...c,holdPossible:false,colorSpeed:clamp(round(c.colorSpeed+dx*.001),.05,10)};
  }
  return {...c,holdPossible:false};
 }
 if(e.fingers!==1)return c;
 const dragged=Math.hypot(x-c.holdX*w,y-c.holdY*h)>3;
 const next=dragged&&c.holdPossible?{...c,holdPossible:false}:c;
 const sx=Number.isFinite(e.startX)?e.startX:x;
 const sy=Number.isFinite(e.startY)?e.startY:y;
 if(Math.abs(dy)>Math.abs(dx)&&sx<w/3){
  const accum=clamp(c.densityFloat-dy*.05,2,120);
  return {...next,densityFloat:round(accum,5),hexCount:Math.round(accum)};
 }
 if(Math.abs(dx)>Math.abs(dy)&&sy<h/3){
  return {...next,lineW:clamp(round(c.lineW+dx*.01),.3,10)};
 }
 if(Math.abs(dx)>Math.abs(dy)&&sy>h*2/3){
  const spin=clamp(round(c.spinRate+dx*.004),0,6);
  return {...next,spinRate:spin,savedSpin:spin>0?spin:c.savedSpin};
 }
 return next;
}
registry.bindRenderer(id,render);
registry.bindInteraction?.(id,interact);
})();
