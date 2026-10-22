/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "orbital-threads",
  "title": "Орбитальные нити",
  "version": 1,
  "introducedAt": "2026-10-21T18:49:43.000Z",
  "schemaVersion": 1,
  "module": "standalone-pattern-orbital-threads.js",
  "colorModes": 9,
  "palettes": [
    [255,255,255],
    [100,200,255],
    [90,255,200],
    [175,145,255],
    [255,95,200],
    [255,190,95],
    [95,140,255],
    [255,80,80],
    [190,175,255]
  ],
  "defaults": {
    "patternId": "orbital-threads",
    "v1": 0.47381959508179683,
    "lineCount": 380,
    "speedFactor": 1,
    "rotationFactor": 1,
    "trail": 75,
    "zoom": 1,
    "shapeVariant": 0,
    "colorModeIndex": 0
  },
  "controls": [
    ["Форма · v1", "v1", 0.2, 0.6, 0.00001, "Справа ↑↓", 1],
    ["Число линий", "lineCount", 80, 700, 1, "Слева ↑↓", 1],
    ["Скорость", "speedFactor", 0.1, 3, 0.05, "Снизу ←→", 1],
    ["Вращение", "rotationFactor", 0, 2, 0.05, "Сверху ←→", 1],
    ["Масштаб", "zoom", 0.4, 2, 0.05, "Пинч", 2],
    ["Шлейф", "trail", 0, 100, 1, "Бегунок", 0],
    ["Новая форма", "shapeVariant", 0, 7, 1, "Тап", 1]
  ]
}
END_SETKA_PATTERN_DESCRIPTOR */
(()=>{
"use strict";
// A single automatically discovered module serves front, saved snapshots,
// live previews, participant notes, research cards and Replay. No local state.
if(typeof window!=="object"||typeof document!=="object")return;
const registry=window.SetkaPatternRegistryV1;
const id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
const palettes=registry.get(id).palettes;
const TAU=Math.PI*2;
const shapeShifts=[0,0.079,0.144,0.216,0.287,0.343,0.381,0.041];
// Cache hues: both multicolour modes are genuinely polychromatic, not
// a single solid RGB picked from their descriptor swatch.
function hsv(h,s,v){
 const c=v*s,k=((h%360)+360)%360/60,x=c*(1-Math.abs(k%2-1)),m=v-c;
 const [r,g,b]=k<1?[c,x,0]:k<2?[x,c,0]:k<3?[0,c,x]:k<4?[0,x,c]:k<5?[x,0,c]:[c,0,x];
 return [Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)];
}
const rainbow=Array.from({length:360},(_,i)=>hsv(i,0.94,1));
const pastel=Array.from({length:360},(_,i)=>hsv(i,0.55,1));
function rgb(mode,i,n,frame){
 if(mode<7)return palettes[mode];
 const position=Math.floor((((i-1)/Math.max(1,n-1))*360+
    (mode===7?frame*.28:-frame*.12))%360+360)%360;
 return mode===7?rainbow[position]:pastel[position];
}
// p5.js original: background(0, 20) EVERY draw. The black rectangle is
// only 20/255 opaque; the PREVIOUS image remains on the same canvas.
// Do not replace this with separately painted ghost geometry.
const histories=new WeakMap(); // transient per-Canvas state, never user data
const ORIGINAL_ALPHA=20/255;
const MAX_HISTORY=96; // residual at the oldest frame is <~0.3%
// The supplied sketch used t += 0.005 and angle += 0.01 on each draw.
function drawOriginalFrame(ctx,w,h,c,frame,preview,v1,fade){
 const lines=c.lineCount,mode=c.colorModeIndex;
 const scale=Math.min(w,h)/500*c.zoom;
 const stride=preview&&lines>280?2:1;
 const t=(frame+1)*.005*c.speedFactor;
 const angle=(frame+1)*.01*c.rotationFactor;
 ctx.save();
 ctx.fillStyle=fade>=1?"#000":"rgba(0,0,0,"+fade+")";
 ctx.fillRect(0,0,w,h);
 ctx.translate(w/2,h/2);
 ctx.rotate(Math.sin(angle));
 ctx.scale(scale,scale);
 ctx.lineCap="round";
 for(let i=1;i<lines;i+=stride){
  const u=t+i;
  const sa=Math.sin(u/10),ca=Math.cos(u/10);
  const sb=Math.sin(u/v1),cb=Math.cos(u/v1);
  const [r,g,b]=rgb(mode,i,lines,frame);
  const alpha=(i-1)/(lines-1);
  if(alpha<=0)continue;
  ctx.strokeStyle="rgba("+r+","+g+","+b+","+alpha+")";
  ctx.lineWidth=.2+2.3*alpha;
  ctx.beginPath();
  ctx.moveTo(sa*100+cb*100,ca*100+sb*100);
  ctx.lineTo(sa*10+cb*100,ca*10+sb*100);
  ctx.stroke();
 }
 ctx.restore();
}
function render(ctx,width,height,c,frame,preview){
 const w=Math.max(1,width),h=Math.max(1,height);
 const index=Math.max(0,Math.floor(Number(frame)||0));
 const trail=Math.max(0,Math.min(100,Number(c.trail)||0));
 // At the established default (75), this is EXACTLY background(0,20).
 // 0 disables persistence; higher values lengthen the continuous dissolve.
 const fade=trail===0?1:1-Math.pow(1-ORIGINAL_ALPHA,75/trail);
 const historyFrames=fade>=1?0:Math.min(MAX_HISTORY,Math.ceil(Math.log(.002)/Math.log(1-fade)));
 const raw=c.v1+shapeShifts[c.shapeVariant];
 const v1=c.shapeVariant===0?c.v1:0.2+((((raw-0.2)%0.4)+0.4)%0.4);
 // Canvas resize and config changes invalidate the old accumulated pixels;
 // one original frame sequence reconstructs the exact saved/replay picture.
 const canvas=ctx.canvas;
 const signature=[w,h,canvas?.width??-1,canvas?.height??-1,!!preview,
  c.v1,c.lineCount,c.speedFactor,c.rotationFactor,c.trail,c.zoom,c.shapeVariant,c.colorModeIndex].join("|");
 const previous=histories.get(ctx);
 const incremental=previous?.signature===signature&&index>previous.frame&&index-previous.frame<=6;
 if(previous?.signature===signature&&index===previous.frame)return;
 if(!incremental){
  // The initial canvas is black, as in setup(); then each historic tick
  // applies the original partially transparent background and white lines.
  ctx.save();ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);ctx.restore();
 }
 const from=incremental?previous.frame+1:Math.max(0,index-historyFrames);
 for(let tick=from;tick<=index;tick++)
  drawOriginalFrame(ctx,w,h,c,tick,preview,v1,fade);
 histories.set(ctx,{signature,frame:index});
}
registry.bindRenderer(id,render);
})();