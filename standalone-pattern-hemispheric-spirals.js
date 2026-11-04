/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "hemispheric-spirals",
  "title": "Полусферические спирали",
  "version": 1,
  "introducedAt": "2026-11-04T01:33:00.000Z",
  "schemaVersion": 1,
  "module": "standalone-pattern-hemispheric-spirals.js",
  "colorModes": 9,
  "palettes": [
    [
      255,
      255,
      255
    ],
    [
      60,
      230,
      255
    ],
    [
      255,
      190,
      90
    ],
    [
      255,
      120,
      120
    ],
    [
      50,
      255,
      190
    ],
    [
      255,
      170,
      230
    ],
    [
      90,
      255,
      150
    ],
    [
      255,
      220,
      90
    ],
    [
      80,
      230,
      255
    ]
  ],
  "defaults": {
    "patternId": "hemispheric-spirals",
    "speed": 1,
    "arms": 5,
    "layers": 6,
    "waveIntensity": 1,
    "zoom": 1,
    "thickness": 1,
    "armsFloat": 5,
    "layersFloat": 6,
    "waveDir": 1,
    "phaseStart": 0,
    "phaseFrame": 0,
    "tapStartX": 0.5,
    "tapStartY": 0.5,
    "tapStartFrame": 0,
    "tapMoved": false,
    "touchActive": false,
    "touchZone": "center",
    "lastOutsideTapFrame": -1000,
    "outsideTapCount": 0,
    "colorModeIndex": 0
  },
  "controls": [
    [
      "Скорость",
      "speed",
      0.02,
      3.5,
      0.02,
      "Снизу ←→",
      1,
      "Горизонтальный свайп в нижней трети: вправо быстрее, влево медленнее. Частоты обеих волн меняются вместе."
    ],
    [
      "Лучи",
      "arms",
      3,
      14,
      1,
      "Справа ↑↓",
      1,
      "Вертикальный свайп из правой трети: вверх больше лучей, вниз меньше."
    ],
    [
      "Слои",
      "layers",
      3,
      14,
      1,
      "Слева ↑↓",
      1,
      "Вертикальный свайп из левой трети: вверх больше глубинных слоёв, вниз меньше."
    ],
    [
      "Сила волны",
      "waveIntensity",
      0.2,
      3,
      0.05,
      "Сверху ←→",
      1,
      "Горизонтальный свайп в верхней трети: вправо волна выраженнее; даже минимум сохраняет движение каждого слоя."
    ],
    [
      "Масштаб",
      "zoom",
      0.55,
      2.6,
      0.05,
      "Пинч",
      2,
      "Своди и разводи два пальца для приближения и удаления. На компьютере работает колесо мыши."
    ],
    [
      "Толщина линий",
      "thickness",
      0.5,
      3,
      0.05,
      "Бегунок",
      0,
      "Утолщает или истончает все линии, не меняя количество лучей и форму спиралей."
    ]
  ],
  "gestureHints": [
    [
      "Центр — направление",
      "Касание центра меняет ход волны: обычный ↔ из центра"
    ],
    [
      "Цвет — палитра",
      "Три быстрых касания вне центра; мышью — один клик вне центра"
    ]
  ],
  "tapColorCycle": false,
  "schema": {
    "armsFloat": {
      "type": "number",
      "min": 3,
      "max": 14
    },
    "layersFloat": {
      "type": "number",
      "min": 3,
      "max": 14
    },
    "waveDir": {
      "type": "number",
      "min": -1,
      "max": 1,
      "integer": true
    },
    "phaseStart": {
      "type": "number",
      "min": -100000000,
      "max": 100000000
    },
    "phaseFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    },
    "tapStartX": {
      "type": "number",
      "min": 0,
      "max": 1
    },
    "tapStartY": {
      "type": "number",
      "min": 0,
      "max": 1
    },
    "tapStartFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    },
    "tapMoved": {
      "type": "boolean"
    },
    "touchActive": {
      "type": "boolean"
    },
    "touchZone": {
      "type": "string",
      "maxLength": 16
    },
    "lastOutsideTapFrame": {
      "type": "number",
      "min": -1000,
      "max": 1000000000
    },
    "outsideTapCount": {
      "type": "number",
      "min": 0,
      "max": 2,
      "integer": true
    }
  },
  "keyFields": [
    "speed",
    "arms",
    "layers",
    "waveIntensity",
    "zoom",
    "thickness",
    "armsFloat",
    "layersFloat",
    "waveDir",
    "phaseStart",
    "phaseFrame",
    "tapStartX",
    "tapStartY",
    "tapStartFrame",
    "tapMoved",
    "touchActive",
    "touchZone",
    "lastOutsideTapFrame",
    "outsideTapCount",
    "colorModeIndex"
  ]
}
END_SETKA_PATTERN_DESCRIPTOR */
(()=>{
"use strict";
// One deterministic Canvas2D renderer for SETKA front, previews, notes,
// favorites, admin and replay. The two halves and all layer wave phases are
// the user's original Processing/p5 mathematical construction.
const registry=window.SetkaPatternRegistryV1,id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
const TAU=2*Math.PI,clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const c01=v=>clamp(v,0,1),P=(r,g,b)=>[r,g,b];
const mix=(a,b,f)=>{const t=c01(f);return a.map((v,i)=>v+(b[i]-v)*t)};
const tri=(a,b,c,t)=>t<.5?mix(a,b,t*2):mix(b,c,(t-.5)*2);
const quad=(a,b,c,d,t)=>t<1/3?mix(a,b,t*3):t<2/3?mix(b,c,(t-1/3)*3):mix(c,d,(t-2/3)*3);
const rgb=c=>"rgb("+c.map(v=>Math.round(clamp(v,0,255))).join(",")+")";
function hsv(h,s,v){
 const hh=((h%1)+1)%1*6,k=Math.floor(hh),f=hh-k;
 const p=v*(1-s),q=v*(1-f*s),tt=v*(1-(1-f)*s);
 const c= k===0?[v,tt,p]:k===1?[q,v,p]:k===2?[p,v,tt]:
          k===3?[p,q,v]:k===4?[tt,p,v]:[v,p,q];
 return rgb(c.map(x=>Math.max(20,x*255)));
}
// Exactly nine stable palettes. These correspond to the source's modes
// White/Ocean/Sunset/Spectral/Neon/Pastel/Emerald+Amber/Gold/Aurora.
function color(m,aK,k,arm,L,t){
 const d=c01(.65*k+.25*Math.sin(t*.22+arm*.7));
 const p=c01(.55*aK+.25*Math.sin(t*.18+L*.4));
 switch(m){
 case 0:return "#fff";
 case 1:return rgb(mix(P(60,230,255),P(180,90,255),d));
 case 2:return rgb(tri(P(255,190,90),P(210,90,255),P(80,230,255),d));
 case 3:return hsv(t*.05+aK*.18+k*.55,.85,1);
 case 4:{
   const pal=[P(50,255,190),P(80,210,255),P(210,110,255),P(255,210,90)];
   const i=(arm+2*L)%4;
   return rgb(mix(pal[i],pal[(i+1)%4],c01(.35+.25*Math.sin(t*.35+arm*.6+L*.4))));
 }
 case 5:return rgb(quad(P(255,170,230),P(170,220,255),P(190,255,210),P(255,230,170),d));
 case 6:{
   const source=(arm+L)%2===0?P(90,255,150):P(255,200,90);
   return rgb(mix(source,P(255,255,255),.10+.08*(1-k)));
 }
 case 7:{
   const c=mix(P(255,220,90),P(255,120,210),c01(.45+.35*Math.sin(t*.30+aK*TAU)));
   return rgb(c.map(v=>v*(1-.14*k)));
 }
 default:return hsv(.55+.22*Math.sin(t*.22+arm*.7)+.18*k,.75+.15*(1-k),1);
 }
}
function timeAt(c,f){return c.phaseStart+(f-c.phaseFrame)/60*c.speed;}
function rebase(c,patch,f){
 const next={...c,...patch};
 if(Object.hasOwn(patch,"speed")&&!Object.hasOwn(patch,"phaseFrame")){
  next.phaseStart=timeAt(c,f);next.phaseFrame=f;
 }
 if(Object.hasOwn(patch,"arms"))next.armsFloat=patch.arms;
 if(Object.hasOwn(patch,"layers"))next.layersFloat=patch.layers;
 return next;
}
// Full quality at normal starting density: 1100 vertices per curve and 60
// mirrored curves. High density/miniature previews use the same continuous
// geometry with denser or sparser sampling, not a different algorithm.
function render(ctx,width,height,c,frame,preview){
 const W=clamp(Number(width)||1,1,20000),H=clamp(Number(height)||1,1,20000);
 const f=Math.max(0,Number(frame)||0),t=timeAt(c,f);
 const arms=Math.round(clamp(c.arms,3,14)),layers=Math.round(clamp(c.layers,3,14));
 const lines=2*arms*layers;
 const maxSamples=preview?16000:66000;
 const steps=Math.max(120,Math.min(1100,Math.floor(maxSamples/lines)));
 const mode=Math.round(clamp(c.colorModeIndex,0,8));
 ctx.save();ctx.globalAlpha=1;ctx.fillStyle="#000";ctx.fillRect(0,0,W,H);
 ctx.translate(W/2,H/2);
 const scale=Math.min(W,H)/900*c.zoom;ctx.scale(scale,scale);
 ctx.lineCap="round";ctx.lineJoin="round";
 function half(){
  for(let arm=0;arm<arms;arm++)for(let L=0;L<layers;L++){
   const k=L/(layers-1),aK=arm/(arms-1);
   // White is an exact white stroke to honor the universal initial palette.
   // Preserve the ORIGINAL composite depth tint through alpha instead:
   // source white intensity (250-110k)/255 * original layer alpha.
   ctx.globalAlpha=mode===0?((250-110*k)*(220-85*k))/(255*255):
     (mode===5?205-75*k:220-85*k)/255;
   ctx.lineWidth=(1.25-.35*k)*c.thickness;
   ctx.strokeStyle=color(mode,aK,k,arm,L,t);
   const mix=(.18+.82*(1-k))*c.waveIntensity;
   ctx.beginPath();
   for(let i=0;i<steps;i++){
    const u=i/(steps-1),r=u*420;
    const spiral=r*.02+arm*.8+L*1.1;
    const waveA=Math.sin(TAU*10*t+c.waveDir*u*20);
    const waveT=Math.sin(TAU*5.5*t+c.waveDir*u*10);
    const ang=spiral+(.6*waveA+.4*waveT)*mix;
    const x=r*Math.cos(ang),y=r*Math.sin(ang);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
   }
   ctx.stroke();
  }
 }
 half();
 ctx.scale(-1,1);half();
 ctx.restore();
}
function pickZone(x,y,W,H){
 // From INITIAL touch, in source priority: bottom > right > left > top.
 return y>H*.66?"bottom":x>W*.66?"right":x<W*.33?"left":y<H*.33?"top":"center";
}
function interact(c,event){
 const e=event||{},f=Math.max(0,Number(e.frame)||0);
 if(e.type==="patch")return rebase(c,e.patch||{},f);
 if(e.type==="wheel"){
  if(!Number.isFinite(e.deltaY))return c;
  return {...c,zoom:clamp(c.zoom-e.deltaY*.0006,.55,2.6)};
 }
 if(e.type!=="gesture")return c;
 const W=Math.max(1,Number(e.width)||390),H=Math.max(1,Number(e.height)||844);
 // A second finger affects ZOOM alone. The host locks out any remaining
 // single finger after a multitouch session, preventing command crossover.
 if(e.fingers>=2&&e.phase==="move"){
  const d=Number(e.pinchDistance),prev=Number(e.previousPinchDistance);
  const delta=Number.isFinite(d)&&Number.isFinite(prev)&&d>0&&prev>0
     ?(d-prev)*.0022 : Number.isFinite(e.pinch)?(e.pinch-1)*c.zoom:0;
  if(!Number.isFinite(delta)||Math.abs(delta)<1e-9)return c;
  return {...c,zoom:clamp(c.zoom+delta,.55,2.6),tapMoved:true,touchActive:false};
 }
 if(e.fingers!==1)return c;
 const x=Number(e.x)||0,y=Number(e.y)||0;
 const nx=c01(x/W),ny=c01(y/H);
 if(e.phase==="start"){
  return {...c,tapStartX:nx,tapStartY:ny,tapStartFrame:f,
   tapMoved:false,touchActive:true,touchZone:pickZone(x,y,W,H)};
 }
 if(e.phase==="move"){
  const startX=Number.isFinite(e.startX)?e.startX:c.tapStartX*W;
  const startY=Number.isFinite(e.startY)?e.startY:c.tapStartY*H;
  const moved=c.tapMoved||Math.hypot(x-startX,y-startY)>10;
  if(!moved)return {...c,tapMoved:false};
  const dx=clamp(Number(e.dx)||0,-200,200),dy=clamp(Number(e.dy)||0,-200,200);
  let patch={tapMoved:true};
  if(c.touchZone==="bottom"&&dx!==0)patch.speed=clamp(c.speed+dx*.002,.02,3.5);
  else if(c.touchZone==="right"&&dy!==0){
   patch.armsFloat=clamp(c.armsFloat-dy*.020,3,14);
   patch.arms=Math.round(patch.armsFloat);
  }else if(c.touchZone==="left"&&dy!==0){
   patch.layersFloat=clamp(c.layersFloat-dy*.020,3,14);
   patch.layers=Math.round(patch.layersFloat);
  }else if(c.touchZone==="top"&&dx!==0)
   patch.waveIntensity=clamp(c.waveIntensity+dx*.005,.2,3);
  // Same gesture changes the same canonical config used by the sliders.
  return rebase(c,patch,f);
 }
 if(e.phase!=="end")return c;
 let next={...c,touchActive:false};
 if(e.cancelled||c.tapMoved||Math.hypot(x-c.tapStartX*W,y-c.tapStartY*H)>10)
  return next;
 const center=Math.hypot(x-W*.5,y-H*.5)<=Math.min(W,H)*.18;
 if(e.pointerType==="mouse"){
  return {...next,colorModeIndex:(c.colorModeIndex+1)%9,outsideTapCount:0,lastOutsideTapFrame:-1000};
 }
 if(center){
  return {...next,waveDir:-c.waveDir,outsideTapCount:0,lastOutsideTapFrame:-1000};
 }
 const count=f-c.lastOutsideTapFrame<=22?c.outsideTapCount+1:1;
 return count>=3?
   {...next,colorModeIndex:(c.colorModeIndex+1)%9,outsideTapCount:0,lastOutsideTapFrame:-1000}:
   {...next,outsideTapCount:count,lastOutsideTapFrame:f};
}
registry.bindRenderer(id,render);
registry.bindInteraction?.(id,interact);
})();