/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "rain",
  "title": "Поток · Rain",
  "version": 1,
  "schemaVersion": 1,
  "module": "standalone-pattern-rain.js",
  "colorModes": 4,
  "palettes": [[0,200,255],[100,255,200],[150,150,255],[255,255,255]],
  "defaults": {
    "patternId": "rain",
    "speedFactor": 2,
    "density": 200,
    "zoom": 1,
    "streakLength": 1,
    "waveStrength": 1,
    "motionMode": 0,
    "seed": 417,
    "colorModeIndex": 3
  },
  "controls": [
    ["Скорость потока", "speedFactor", 0.2, 10, 0.1, "Снизу ←→", 1],
    ["Плотность капель", "density", 50, 800, 10, "Слева ↑↓", 1],
    ["Масштаб", "zoom", 0.2, 5, 0.01, "Пинч", 2],
    ["Длина светового следа", "streakLength", 0.5, 2.5, 0.05, "Справа ↑↓", 1],
    ["Выраженность движения", "waveStrength", 0, 2, 0.05, "Сверху ←→", 1],
    ["Режим движения", "motionMode", 0, 3, 1, "Тап", 1]
  ],
  "schema": {
    "seed": {"type": "number", "min": 0, "max": 4294967295, "integer": true}
  },
  "keyFields": ["speedFactor", "density", "zoom", "streakLength", "waveStrength", "motionMode", "colorModeIndex", "seed"]
}
END_SETKA_PATTERN_DESCRIPTOR */
(()=>{
"use strict";
// Only the module is authored. The build discovers the descriptor above,
// registers the ID, generates the public catalog and loads the same renderer
// for mother library, gameplay, notes, community, research and Replay.
if(typeof window!=="object"||typeof document!=="object")return;
const registry=window.SetkaPatternRegistryV1;
const id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
// The palette is a single source of truth in the shared descriptor.
const palette=registry.get(id).palettes;
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const TAU=Math.PI*2;
// Stateless integer hash: a saved pattern/config/frame always recreates the
// exact same particles; no DOM, local storage or long-lived Drop instances.
function noise(n){
 n=Math.imul(n^(n>>>16),0x7feb352d);
 n=Math.imul(n^(n>>>15),0x846ca68b);
 return ((n^(n>>>16))>>>0)/4294967296;
}
function render(ctx,width,height,c,frame,preview){
 const w=Math.max(1,width),h=Math.max(1,height);
 ctx.save();
 ctx.fillStyle="#000";
 ctx.fillRect(0,0,w,h);
 ctx.translate(w/2,h/2);
 ctx.scale(c.zoom,c.zoom);
 const vw=w/c.zoom,vh=h/c.zoom;
 const lengthScale=c.streakLength;
 const count=preview
   ?Math.min(c.density,Math.max(48,Math.round(w*h/500)))
   :c.density;
 const tick=Math.max(0,Number(frame)||0);
 const mode=c.motionMode;
 const [r,g,b]=palette[c.colorModeIndex]||palette[0];
 const baseAlpha=c.colorModeIndex===3?0.52:1;
 const seed=(c.seed>>>0);
 ctx.lineCap="round";
 for(let i=0;i<count;i++){
  const n=seed^Math.imul(i+1,0x9e3779b1);
  const nx=noise(n^0x12481bcb);
  const ny=noise(n^0x3b7c33ee);
  const nv=noise(n^0x25bfe13d);
  const nl=noise(n^0x5a328b51);
  const np=noise(n^0x4630ab37);
  const len=(20+60*nl)*lengthScale;
  const speed=(2+3*nv)*c.speedFactor;
  const span=vh+len+20;
  const position=((ny*span+tick*speed)%span+span)%span;
  const y=position-vh/2;
  const x0=(nx-.5)*vw;
  let x=x0,tip=y,tailX=x0;
  if(mode===1){
   // A coherent horizontal wind, bounded and smooth at wrap points.
   const side=(position/span-.5)*vh*.22*c.waveStrength;
   x+=side;tailX=x-len*.14*c.waveStrength;
  }else if(mode===2){
   const theta=tick*.027+y*.013+np*TAU;
   x+=Math.sin(theta)*18*c.waveStrength;
   tailX=x-4*c.waveStrength*Math.cos(theta);
  }else if(mode===3){
   tip+=Math.sin(tick*.04+np*TAU)*5*c.waveStrength;
  }
  const breath=mode===3?clamp(.68+.32*Math.sin(tick*.045+np*TAU),.18,1):1;
  const alpha=baseAlpha*breath;
  // One interpolated gradient stroke replaces up to 40 p5 line calls/drop.
  // This preserves the bright falling head and transparent upper tail.
  const gradient=ctx.createLinearGradient(tailX,tip-len,x,tip);
  gradient.addColorStop(0,'rgba('+r+','+g+','+b+',0)');
  gradient.addColorStop(.55,'rgba('+r+','+g+','+b+','+(alpha*.42)+')');
  gradient.addColorStop(1,'rgba('+r+','+g+','+b+','+(alpha*.96)+')');
  ctx.strokeStyle=gradient;
  ctx.lineWidth=1+1.5*np;
  ctx.beginPath();
  ctx.moveTo(tailX,tip-len);
  ctx.lineTo(x,tip);
  ctx.stroke();
 }
 ctx.restore();
}
registry.bindRenderer(id,render);
})();