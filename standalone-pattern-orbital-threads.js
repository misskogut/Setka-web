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
function render(ctx,width,height,c,frame,preview){
 const w=Math.max(1,width),h=Math.max(1,height),f=Math.max(0,Number(frame)||0);
 const lines=c.lineCount,zoom=c.zoom,speed=c.speedFactor,rotate=c.rotationFactor;
 const mode=c.colorModeIndex;
 // Default shapeVariant=0 uses the precise original v1 untouched.
 // The tap cycles deterministic alternate forms without destroying exact v1.
 const raw=c.v1+shapeShifts[c.shapeVariant];
 const v1=c.shapeVariant===0?c.v1:0.2+((((raw-0.2)%0.4)+0.4)%0.4);
 const scale=Math.min(w,h)/500*zoom;
 const stride=preview&&lines>280?2:1;
 ctx.save();
 ctx.fillStyle="#000";
 ctx.fillRect(0,0,w,h);
 // Reconstruct a *continuous-looking* exposure from historical positions.
 // The former four weak echoes (3 frames apart) looked like hard, disconnected
 // strokes instead of the motion smear of the original sketch.
 // Sampling absolute frame positions, rather than depending on an accumulated
 // canvas, gives identical trails in gameplay, previews, notes and Replay.
 // Rendering cost stays bounded for every declared lineCount and preview size.
 const trailStrength=Math.max(0,Math.min(1,(Number(c.trail)||0)/100));
 const ghosts=trailStrength===0?0:Math.max(2,Math.ceil((preview?8:14)*trailStrength));
 const exposureFrames=trailStrength*(preview?74:112);
 for(let layer=ghosts;layer>=0;layer--){
  const age=ghosts?layer/ghosts:0;
  // Ease samples toward the present so neighbouring traces merge smoothly.
  const offset=exposureFrames*Math.pow(age,1.35);
  if(layer>0&&offset>=f)continue; // No fabricated history before frame zero.
  const past=Math.max(0,f-offset);
  const ghostAlpha=layer===0?1:trailStrength*.65*Math.pow(1-age,1.45);
  if(ghostAlpha<=0)continue;
  const phase=(past+1)*speed;
  const t=phase*.005;
  const theta=Math.sin((past+1)*.01*rotate);
  ctx.save();
  // Original p5 sketch deliberately offset the whole scene by -40 px.
  // SETKA uses a centered, square viewport so library cards align in rows.
  ctx.translate(w/2,h/2);
  ctx.rotate(theta);
  ctx.scale(scale,scale);
  ctx.lineCap="round";
  // Ghosts are cheaper than the sharp foreground but share its geometry.
  // This density cap avoids multiplying mobile Canvas work by lineCount.
  const increment=layer===0?stride:Math.max(stride,Math.ceil(lines/(preview?165:235)));
  for(let i=1;i<lines;i+=increment){
   const u=t+i;
   const sa=Math.sin(u/10),ca=Math.cos(u/10);
   const sb=Math.sin(u/v1),cb=Math.cos(u/v1);
   const [r,g,b]=rgb(mode,i,lines,past);
   const alpha=((i-1)/(lines-1))*ghostAlpha;
   if(alpha<=0)continue;
   ctx.strokeStyle="rgba("+r+","+g+","+b+","+alpha+")";
   ctx.lineWidth=.2+2.3*(i-1)/(lines-1);
   ctx.beginPath();
   ctx.moveTo(sa*100+cb*100,ca*100+sb*100);
   ctx.lineTo(sa*10+cb*100,ca*10+sb*100);
   ctx.stroke();
  }
  ctx.restore();
 }
 ctx.restore();
}
registry.bindRenderer(id,render);
})();