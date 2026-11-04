/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "hexwave",
  "title": "Волновая гексасетка",
  "version": 2,
  "introducedAt": "2026-11-04T02:38:00.000Z",
  "schemaVersion": 1,
  "module": "standalone-pattern-hexwave.js",
  "colorModes": 5,
  "palettes": [
    [
      255,
      255,
      255
    ],
    [
      120,
      200,
      255
    ],
    [
      255,
      105,
      180
    ],
    [
      138,
      43,
      226
    ],
    [
      255,
      255,
      255
    ]
  ],
  "tapColorCycle": false,
  "capabilities": {
    "rgbGlitchOverlay": true
  },
  "defaults": {
    "patternId": "hexwave",
    "hexRadius": 5,
    "waveAmplitude": 8,
    "waveSpeed": 0.05,
    "dotSize": 5,
    "glitchAlpha": 90,
    "glitchOffset": 1.3,
    "panX": 0,
    "panY": 0,
    "wavePhase": 0,
    "waveFrame": 0,
    "colorModeIndex": 0,
    "gestureRegion": 0,
    "gestureStartX": 0.5,
    "gestureStartY": 0.5,
    "gestureStartFrame": 0,
    "gestureMoved": false,
    "gestureAmpStart": 8,
    "gestureSpeedStart": 0.05,
    "gestureDotStart": 5,
    "gestureHexStart": 5,
    "lastTapFrame": -1000,
    "tapCount": 0
  },
  "controls": [
    [
      "Амплитуда",
      "waveAmplitude",
      0,
      50,
      0.1,
      "Справа ↑↓",
      1,
      "Правая часть рисунка, от 40% ширины до края: вверх волна сильнее, вниз слабее. Значение запоминается."
    ],
    [
      "Скорость",
      "waveSpeed",
      0.001,
      0.3,
      0.001,
      "Снизу ←→",
      1,
      "Нижняя левая зона: веди вправо для ускорения, влево для замедления. Правая часть зарезервирована под амплитуду."
    ],
    [
      "Размер ячейки",
      "hexRadius",
      2,
      120,
      0.1,
      "Слева ↑↓",
      1,
      "Левая центральная зона: вверх — крупнее ячейки, вниз — мельче. В верхней/нижней частях действуют другие горизонтальные жесты."
    ],
    [
      "Диаметр точек",
      "dotSize",
      1,
      40,
      0.1,
      "Сверху ←→",
      1,
      "Верхняя левая зона: влево точки меньше, вправо больше. Правая часть управляет амплитудой."
    ],
    [
      "RGB-ореол",
      "glitchAlpha",
      0,
      255,
      1,
      "Ползунок",
      0,
      "Сила глич-ореола красного, зелёного и синего цвета. 0 отключает его полностью."
    ],
    [
      "Разнос RGB",
      "glitchOffset",
      0,
      8,
      0.1,
      "Ползунок",
      0,
      "Насколько разнесены три цветные копии точки относительно основной."
    ]
  ],
  "gestureHints": [
    [
      "Панорамирование",
      "2 пальца — перемещай сетку в любую сторону"
    ],
    [
      "Смена цвета",
      "3 быстрых касания — белый, голубой, розовый, фиолетовый, радуга"
    ]
  ],
  "schema": {
    "panX": {
      "type": "number",
      "min": -100000,
      "max": 100000
    },
    "panY": {
      "type": "number",
      "min": -100000,
      "max": 100000
    },
    "wavePhase": {
      "type": "number",
      "min": -1000000000,
      "max": 1000000000
    },
    "waveFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    },
    "gestureRegion": {
      "type": "number",
      "min": 0,
      "max": 4,
      "integer": true
    },
    "gestureStartX": {
      "type": "number",
      "min": 0,
      "max": 1
    },
    "gestureStartY": {
      "type": "number",
      "min": 0,
      "max": 1
    },
    "gestureStartFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    },
    "gestureMoved": {
      "type": "boolean"
    },
    "gestureAmpStart": {
      "type": "number",
      "min": 0,
      "max": 50
    },
    "gestureSpeedStart": {
      "type": "number",
      "min": 0.001,
      "max": 0.3
    },
    "gestureDotStart": {
      "type": "number",
      "min": 1,
      "max": 40
    },
    "gestureHexStart": {
      "type": "number",
      "min": 2,
      "max": 120
    },
    "lastTapFrame": {
      "type": "number",
      "min": -1000,
      "max": 1000000000
    },
    "tapCount": {
      "type": "number",
      "min": 0,
      "max": 2,
      "integer": true
    }
  },
  "keyFields": [
    "hexRadius",
    "waveAmplitude",
    "waveSpeed",
    "dotSize",
    "glitchAlpha",
    "glitchOffset",
    "panX",
    "panY",
    "wavePhase",
    "waveFrame",
    "colorModeIndex",
    "gestureRegion",
    "gestureStartX",
    "gestureStartY",
    "gestureStartFrame",
    "gestureMoved",
    "gestureAmpStart",
    "gestureSpeedStart",
    "gestureDotStart",
    "gestureHexStart",
    "lastTapFrame",
    "tapCount"
  ],
  "legacyVersions": [
    1
  ]
}
END_SETKA_PATTERN_DESCRIPTOR */
(()=>{
"use strict";
// HexWave: one deterministic renderer and interaction reducer for gameplay,
// live previews, saved notes and research replay. No p5, wall clock or fake HUD.
const registry=window.SetkaPatternRegistryV1;
const id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
const TAU=Math.PI*2,SQRT3=Math.sqrt(3),BASE=640;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,Number.isFinite(v)?v:a));
const round=x=>Math.round(x*1000000)/1000000;
const colors=[[255,255,255],[120,200,255],[255,105,180],[138,43,226]];
const rainbowColors=Array.from({length:60},(_,k)=>{
 const a=TAU*(k+.5)/60;
 return [Math.round(clamp(127+128*Math.sin(a),0,255)),
  Math.round(clamp(127+128*Math.sin(a+TAU/3),0,255)),
  Math.round(clamp(127+128*Math.sin(a+2*TAU/3),0,255))];
});
const phaseAt=(c,f)=>c.wavePhase+Math.max(0,f-c.waveFrame)*c.waveSpeed;
const rgb=col=>"rgb("+col.join(",")+")";
const rgba=(col,alpha)=>"rgba("+col.join(",")+","+alpha+")";
function drawDots(ctx,points,radius,sx,sy,fill,alpha=1){
 if(!points.length)return;
 ctx.fillStyle=fill;ctx.globalAlpha=alpha;
 ctx.beginPath();
 for(const [x,y] of points){
  ctx.moveTo(x+sx+radius,y+sy);
  ctx.arc(x+sx,y+sy,radius,0,TAU);
 }
 ctx.fill();
}
function render(ctx,width,height,c,frame,preview=false){
 const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1);
 const f=Math.max(0,Number(frame)||0);
 // Keep circles round and their size unchanged, but cover the actual viewport
 // rather than limiting all sample cells to a centered BASE x BASE square.
 // Tall phones extend logicalHeight; landscape screens extend logicalWidth.
 const scale=Math.min(w,h)/BASE;
 const logicalWidth=w/scale,logicalHeight=h/scale;
 ctx.save();ctx.fillStyle="#000";ctx.globalAlpha=1;ctx.fillRect(0,0,w,h);
 const r=c.hexRadius,cellH=SQRT3*r,step=1.5*r;
 const time=phaseAt(c,f),amp=c.waveAmplitude;
 const margin=amp+c.dotSize+c.glitchOffset+8;
 const iMin=Math.floor((-c.panX-margin+2*r)/step)-1;
 const iMax=Math.ceil((logicalWidth-c.panX+margin+2*r)/step)+1;
 const jMin=Math.floor((-c.panY-margin+cellH)/cellH)-1;
 const jMax=Math.ceil((logicalHeight-c.panY+margin+cellH)/cellH)+1;
 const points=[],rainbow=c.colorModeIndex===4;
 const buckets=rainbow?Array.from({length:60},()=>[]):null;
 // The same 0.75*cellWidth staggered hex lattice as the original p5 sketch.
 for(let i=iMin;i<=iMax;i++){
  const x=i*step-2*r,stagger=((i%2)+2)%2;
  for(let j=jMin;j<=jMax;j++){
   const y=j*cellH+stagger*cellH/2-cellH;
   const d=Math.hypot(x-logicalWidth/2,y-logicalHeight/2);
   const px=x+Math.sin(time+d*.02)*amp+c.panX;
   const py=y+c.panY;
   if(px< -margin||px>logicalWidth+margin||py< -margin||py>logicalHeight+margin)continue;
   const point=[px*scale,py*scale];
   points.push(point);
   if(rainbow){
    const ph=f*.015+.10*i+.12*j;
    const bucket=Math.floor((((ph/TAU)%1+1)%1)*60)%60;
    buckets[bucket].push(point);
   }
  }
 }
 const rad=Math.max(.15,c.dotSize*scale/2);
 const glitchAlpha=c.glitchAlpha/255,offset=c.glitchOffset*scale;
 if(glitchAlpha>0){
  drawDots(ctx,points,rad,-offset,0,"#ff0000",glitchAlpha);
  drawDots(ctx,points,rad,offset,-offset,"#00ff00",glitchAlpha);
  drawDots(ctx,points,rad,offset,offset,"#0000ff",glitchAlpha);
 }
 if(rainbow){
  for(let k=0;k<60;k++)drawDots(ctx,buckets[k],rad,0,0,rgb(rainbowColors[k]));
 }else drawDots(ctx,points,rad,0,0,rgb(colors[c.colorModeIndex]||colors[0]));
 ctx.globalAlpha=1;ctx.restore();
}
function interact(c,event){
 const e=event||{},f=clamp(Number(e.frame)||0,0,1e9);
 if(e.type==="patch"){
  const p=e.patch||{};
  const next={...c,...p};
  // Continuous time remains phase-consistent if the user moves the speed slider.
  if(Object.hasOwn(p,"waveSpeed")&&!Object.hasOwn(p,"wavePhase")){
   next.wavePhase=round(phaseAt(c,f));next.waveFrame=f;
  }
  return next;
 }
 if(e.type!=="gesture")return c;
 const w=Math.max(1,Number(e.width)||390),h=Math.max(1,Number(e.height)||780);
 const phase=e.phase||"move";
 if(e.fingers===2){
  // Platform provides the two-finger centroid dx/dy. It never changes a slider.
  if(phase!=="move")return c;
  return {...c,gestureRegion:0,gestureMoved:true,
   panX:round(clamp(c.panX+(Number(e.dx)||0)*BASE/Math.min(w,h),-100000,100000)),
   panY:round(clamp(c.panY+(Number(e.dy)||0)*BASE/Math.min(w,h),-100000,100000))};
 }
 if(e.fingers!==1)return c;
 const x=Number(e.x),y=Number(e.y);
 if(!Number.isFinite(x)||!Number.isFinite(y))return c;
 if(phase==="start"){
  // Right 60% has priority: matches the approved sketch and preview.
  const region=x>=w*.40?1:y<=h*.33?2:y>=h*.67?3:x<=w*.33?4:0;
  return {...c,gestureRegion:region,gestureStartX:clamp(x/w,0,1),
   gestureStartY:clamp(y/h,0,1),gestureStartFrame:f,gestureMoved:false,
   gestureAmpStart:c.waveAmplitude,gestureSpeedStart:c.waveSpeed,
   gestureDotStart:c.dotSize,gestureHexStart:c.hexRadius};
 }
 if(phase==="end"){
  let next={...c,gestureRegion:0};
  if(e.cancelled)return {...next,gestureMoved:true};
  const deltaF=f-c.gestureStartFrame;
  if(!c.gestureMoved&&deltaF>=0&&deltaF<=33){
   const consecutive=f-c.lastTapFrame>=0&&f-c.lastTapFrame<=21;
   const count=consecutive?c.tapCount+1:1;
   next={...next,lastTapFrame:f,tapCount:count>=3?0:count};
   if(count>=3)next.colorModeIndex=(next.colorModeIndex+1)%5;
  }
  return next;
 }
 if(phase!=="move")return c;
 const totalX=x-c.gestureStartX*w,totalY=y-c.gestureStartY*h;
 const moved=c.gestureMoved||Math.abs(totalX)>6||Math.abs(totalY)>6;
 const next={...c,gestureMoved:moved};
 if(!c.gestureRegion)return next; // blank mid-zone drags must never count as taps
 if(c.gestureRegion===1){
  next.waveAmplitude=round(clamp(c.gestureAmpStart-totalY*.15,0,50));
 }else if(c.gestureRegion===2&&Math.abs(totalX)>Math.abs(totalY)){
  next.dotSize=round(clamp(c.gestureDotStart+totalX*.025,1,40));
 }else if(c.gestureRegion===3&&Math.abs(totalX)>Math.abs(totalY)){
  const speed=round(clamp(c.gestureSpeedStart+totalX*.0006,.001,.3));
  if(speed!==c.waveSpeed){
   next.wavePhase=round(phaseAt(c,f));next.waveFrame=f;
   next.waveSpeed=speed;
  }
 }else if(c.gestureRegion===4&&Math.abs(totalY)>Math.abs(totalX)){
  next.hexRadius=round(clamp(c.gestureHexStart-totalY*.08,2,120));
 }
 return next;
}
registry.bindRenderer(id,render);
registry.bindInteraction?.(id,interact);
})();
