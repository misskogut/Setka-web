/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "interlaced-spirals",
  "title": "Переплетённые спирали",
  "version": 1,
  "introducedAt": "2026-11-04T02:07:00.000Z",
  "schemaVersion": 1,
  "module": "standalone-pattern-interlaced-spirals.js",
  "colorModes": 9,
  "palettes": [
    [
      255,
      255,
      255
    ],
    [
      90,
      210,
      255
    ],
    [
      255,
      118,
      180
    ],
    [
      255,
      155,
      76
    ],
    [
      80,
      255,
      140
    ],
    [
      170,
      98,
      255
    ],
    [
      185,
      143,
      255
    ],
    [
      255,
      200,
      235
    ],
    [
      90,
      235,
      205
    ]
  ],
  "defaults": {
    "patternId": "interlaced-spirals",
    "speed": 1,
    "waveIntensity": 1,
    "arms": 6,
    "layers": 7,
    "zoom": 1,
    "thickness": 1,
    "braid": 1,
    "breathing": 1,
    "armsFloat": 6,
    "layerFloat": 7,
    "phaseStart": 0,
    "phaseFrame": 0,
    "tapStartX": 0.5,
    "tapStartY": 0.5,
    "tapStartFrame": 0,
    "tapMoved": false,
    "touchActive": false,
    "touchZone": "center",
    "lastTapFrame": -1000,
    "tapCount": 0,
    "colorModeIndex": 0
  },
  "controls": [
    [
      "Скорость",
      "speed",
      0.003,
      3.5,
      0.003,
      "Снизу ←→",
      1,
      "Свайп по нижней трети ←→ регулирует скорость обеих волн одновременно, без изменения соотношения частот."
    ],
    [
      "Сила волны",
      "waveIntensity",
      0,
      3.2,
      0.05,
      "Сверху ←→",
      1,
      "Свайп по верхней трети ←→ меняет амплитуду основных волн; микроколебания и переплетение остаются."
    ],
    [
      "Лучи",
      "arms",
      3,
      14,
      1,
      "Справа ↑↓",
      1,
      "Свайп справа ↑ добавляет лучи, ↓ уменьшает. Минимум 3: спираль не исчезнет."
    ],
    [
      "Слои",
      "layers",
      2,
      18,
      1,
      "Слева ↑↓",
      1,
      "Свайп слева ↑ добавляет вложенные слои, ↓ убирает. Минимум 2 слоя сохраняется."
    ],
    [
      "Масштаб",
      "zoom",
      0.55,
      2.6,
      0.05,
      "Пинч",
      2,
      "Сведение/разведение двух пальцев приближает или отдаляет рисунок. На компьютере — колесо мыши."
    ],
    [
      "Толщина линий",
      "thickness",
      0.5,
      3,
      0.05,
      "Бегунок",
      0,
      "Диаметр линии; геометрия спирали не меняется. При 1× — толщина из оригинала."
    ],
    [
      "Переплетение",
      "braid",
      0,
      2.5,
      0.1,
      "Бегунок",
      0,
      "Усиливает или ослабляет волнообразное переплетение радиусов; 1× — исходная формула."
    ],
    [
      "Дыхание",
      "breathing",
      0,
      2.5,
      0.1,
      "Бегунок",
      0,
      "Регулирует общее плавное расширение и сжатие спиралей; 1× — исходная формула."
    ]
  ],
  "gestureHints": [
    [
      "Цветовая палитра",
      "Три быстрых касания в любой части паттерна — следующий цвет"
    ],
    [
      "На компьютере",
      "Один клик меняет цвет, колесо мыши — масштаб"
    ]
  ],
  "tapColorCycle": false,
  "schema": {
    "armsFloat": {
      "type": "number",
      "min": 3,
      "max": 14
    },
    "layerFloat": {
      "type": "number",
      "min": 2,
      "max": 18
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
    "speed",
    "waveIntensity",
    "arms",
    "layers",
    "zoom",
    "thickness",
    "braid",
    "breathing",
    "armsFloat",
    "layerFloat",
    "phaseStart",
    "phaseFrame",
    "tapStartX",
    "tapStartY",
    "tapStartFrame",
    "tapMoved",
    "touchActive",
    "touchZone",
    "lastTapFrame",
    "tapCount",
    "colorModeIndex"
  ]
}
END_SETKA_PATTERN_DESCRIPTOR */
(()=>{
"use strict";
// Original p5 Fractal-Wave Interlaced Spirals translated to deterministic
// Canvas2D. One registry module supplies game, preview, archive, notes,
// research and replay; no private mutable animation timeline or UI modes.
const registry=window.SetkaPatternRegistryV1,id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
const TAU=Math.PI*2;
const clamp=(n,lo,hi)=>Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):lo;
const hsv=(h,s,v)=>{
 const x=((h%1)+1)%1*6,i=Math.floor(x),f=x-i;
 const p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s);
 const rgb=i===0?[v,t,p]:i===1?[q,v,p]:i===2?[p,v,t]:
  i===3?[p,q,v]:i===4?[t,p,v]:[v,p,q];
 return "rgb("+rgb.map(n=>Math.round(n*255)).join(",")+")";
};
function color(m,arm,L,k,t){
 switch(m){
  case 0:return "#fff";
  case 1:return "rgb(90,210,255)";
  case 2:return hsv(t*.04+arm*.08+L*.12,.78,1);
  case 3:return hsv(.04+.03*Math.sin(t*.45)+arm*.01,.75,1);
  case 4:return hsv(.33+.06*Math.sin(t*.25+L),.92,1);
  case 5:return hsv(.62+.12*Math.sin(t*.35+arm*.6),1,1);
  case 6:return hsv(.76+.05*Math.sin(t*.18+.2*arm),.7,1);
  case 7:return hsv(t*.03+L*.09+arm*.03,.35,1);
  default:return hsv(.5+.12*Math.sin(t*.22+arm*.7)+.08*Math.sin(t*.11+L),.8,1);
 }
}
const timeAt=(c,f)=>c.phaseStart+(f-c.phaseFrame)/60*c.speed;
function patched(c,patch,f){
 const next={...c,...patch};
 if(Object.hasOwn(patch,"speed")&&!Object.hasOwn(patch,"phaseFrame")){
  next.phaseStart=timeAt(c,f);
  next.phaseFrame=f;
 }
 if(Object.hasOwn(patch,"arms")&&!Object.hasOwn(patch,"armsFloat"))next.armsFloat=patch.arms;
 if(Object.hasOwn(patch,"layers")&&!Object.hasOwn(patch,"layerFloat"))next.layerFloat=patch.layers;
 return next;
}
function render(ctx,width,height,c,frame,preview){
 const W=clamp(Number(width),1,20000),H=clamp(Number(height),1,20000);
 const f=clamp(Number(frame),0,1e9),t=timeAt(c,f);
 const arms=Math.round(clamp(c.arms,3,14)),layerCount=Math.floor(clamp(c.layers,2,18));
 const lines=2*arms*layerCount;
 // Same continuous curve as the source at every quality level; preserve
 // original 1100 vertices/line at the default 6 × 7 in full gameplay.
 const budget=preview?22000:100000;
 const steps=Math.max(110,Math.min(1100,Math.floor(budget/lines)));
 const coh=.6*Math.sin(TAU*10*t)+.4*Math.sin(TAU*5.5*t+.7);
 const breath=1+c.breathing*(.06*Math.sin(t*.6)+.04*coh);
 const m=Math.max(0,Math.min(8,Math.round(c.colorModeIndex)));
 ctx.save();
 ctx.fillStyle="#000";ctx.globalAlpha=1;ctx.fillRect(0,0,W,H);
 ctx.translate(W/2,H/2);
 const scale=Math.min(W,H)/900*c.zoom;ctx.scale(scale,scale);
 ctx.lineCap="round";ctx.lineJoin="round";
 function half(){
  for(let arm=0;arm<arms;arm++){
   const armBase=-.9+arm/(arms-1)*1.8;
   const armPhase=arm*.85+.35*Math.sin(t*.7+arm);
   for(let L=0;L<layerCount;L++){
    const k=L/(layerCount-1);
    const fractS=Math.pow(.62,L);
    const layerPhase=armPhase+L*1.25;
    const waveAmt=(.22+.78*(.85-.60*k))*c.waveIntensity;
    ctx.lineWidth=Math.max(.65,1.25-.35*k)*c.thickness;
    // RGB grey-depth becomes exact white with equivalent composite opacity
    // for platform's strict white-on-black initial frame.
    const depthA=m===0?((235-90*k)*(210-70*k))/(255*255):
     m===1?(210-75*k)/255:m===2?(215-75*k)/255:
     m===3?(205-75*k)/255:m===4?(210-75*k)/255:
     m===5?(220-75*k)/255:m===6?(210-75*k)/255:
     m===7?(200-70*k)/255:(210-70*k)/255;
    ctx.globalAlpha=depthA;
    ctx.strokeStyle=color(m,arm,L,k,t);
    const tight=.02+.01*Math.sin(t*.25+L*.6);
    const microFactor=.10+.12*(1-k),braidFactor=(.07+.05*(1-k))*c.braid;
    const waveA0=TAU*10*t+layerPhase,waveT0=TAU*5.5*t-layerPhase*.7;
    const radialBreath=t; // one shared timeline, no hidden draw() state
    ctx.beginPath();
    for(let i=0;i<steps;i++){
     const u=i/(steps-1),radialGain=Math.pow(u,.85);
     const r0=u*420*breath;
     const baseAng=armBase+layerPhase+r0*tight;
     const waveA=Math.sin(waveA0+u*18),waveT=Math.sin(waveT0+u*9);
     const wave=waveAmt*radialGain*(.55*waveA+.45*waveT);
     const micro=microFactor*Math.sin(u*(30+18*L)+radialBreath*(.7+.08*L)+arm);
     const braid=braidFactor*Math.sin(u*(14+3*arm)-t*.9+L);
     const cohTwist=.1*(1-.6*k)*coh*radialGain;
     const angle=baseAng+.55*wave+.18*micro+cohTwist;
     const rr=r0*(1+braid*radialGain+.03*micro+.04*coh*radialGain)*fractS;
     const x=rr*Math.cos(angle)+10*(1-Math.pow(u,.6)),y=rr*Math.sin(angle);
     if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();
   }
  }
 }
 half();ctx.scale(-1,1);half();ctx.restore();
}
function startingZone(x,y,W,H){
 // Source precedence: bottom > top > left > right.
 return y>H*.66?"bottom":y<H*.33?"top":x<W*.33?"left":x>W*.66?"right":"center";
}
function interact(c,event){
 const e=event||{},f=clamp(Number(e.frame),0,1e9);
 if(e.type==="patch")return patched(c,e.patch||{},f);
 if(e.type==="wheel"){
  if(!Number.isFinite(e.deltaY))return c;
  return {...c,zoom:clamp(c.zoom-e.deltaY*.0006,.55,2.6)};
 }
 if(e.type!=="gesture")return c;
 const W=Math.max(1,Number(e.width)||390),H=Math.max(1,Number(e.height)||844);
 if(e.fingers>=2&&e.phase==="move"){
  const dist=Number(e.pinchDistance),prev=Number(e.previousPinchDistance);
  const delta=Number.isFinite(dist)&&Number.isFinite(prev)&&dist>0&&prev>0?
   (dist-prev)*.0022:Number.isFinite(e.pinch)?(e.pinch-1)*c.zoom:0;
  if(!Number.isFinite(delta)||Math.abs(delta)<1e-9)return c;
  return {...c,zoom:clamp(c.zoom+delta,.55,2.6),tapMoved:true,touchActive:false};
 }
 if(e.fingers!==1)return c;
 const x=Number(e.x)||0,y=Number(e.y)||0;
 if(e.phase==="start")return {...c,tapStartX:clamp(x/W,0,1),
  tapStartY:clamp(y/H,0,1),tapStartFrame:f,
  touchZone:startingZone(x,y,W,H),touchActive:true,tapMoved:false};
 if(e.phase==="move"){
  const sx=Number.isFinite(e.startX)?e.startX:c.tapStartX*W;
  const sy=Number.isFinite(e.startY)?e.startY:c.tapStartY*H;
  const moved=c.tapMoved||Math.hypot(x-sx,y-sy)>10;
  if(!moved)return c;
  const dx=clamp(Number(e.dx)||0,-200,200),dy=clamp(Number(e.dy)||0,-200,200);
  const patch={tapMoved:true};
  if(c.touchZone==="bottom"&&dx!==0)patch.speed=clamp(c.speed+dx*.002,.003,3.5);
  else if(c.touchZone==="top"&&dx!==0)
   patch.waveIntensity=clamp(c.waveIntensity+dx*.005,0,3.2);
  else if(c.touchZone==="left"&&dy!==0){
   patch.layerFloat=clamp(c.layerFloat-dy*.02,2,18);
   patch.layers=Math.floor(patch.layerFloat);
  }else if(c.touchZone==="right"&&dy!==0){
   patch.armsFloat=clamp(c.armsFloat-dy*.02,3,14);
   patch.arms=Math.round(patch.armsFloat);
  }
  return patched(c,patch,f);
 }
 if(e.phase!=="end")return c;
 const out={...c,touchActive:false};
 if(e.cancelled||c.tapMoved||Math.hypot(x-c.tapStartX*W,y-c.tapStartY*H)>10)
  return out;
 if(e.pointerType==="mouse")
  return {...out,colorModeIndex:(c.colorModeIndex+1)%9,tapCount:0,lastTapFrame:-1000};
 const count=f-c.lastTapFrame<=22?c.tapCount+1:1;
 return count>=3?{...out,colorModeIndex:(c.colorModeIndex+1)%9,tapCount:0,lastTapFrame:-1000}:
  {...out,tapCount:count,lastTapFrame:f};
}
registry.bindRenderer(id,render);
registry.bindInteraction?.(id,interact);
})();