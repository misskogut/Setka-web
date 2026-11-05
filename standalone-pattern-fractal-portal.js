/* SETKA_PATTERN_DESCRIPTOR
{
 "id":"fractal-portal",
 "title":"Фрактальный портал",
 "version":3,
 "legacyVersions":[1,2],
 "legacyVersions":[1],
 "schemaVersion":1,
 "introducedAt":"2026-11-05T04:54:00.000Z",
 "module":"standalone-pattern-fractal-portal.js",
 "colorModes":9,
 "palettes":[[255,255,255],[255,90,160],[70,225,255],[185,110,255],[255,255,255],[0,180,255],[255,155,65],[90,255,180],[255,215,95]],
 "defaults":{"patternId":"fractal-portal","speedFactor":1.2,"rotation":0.7,"depth":80,"complexity":2.5,"glow":65,"lineWidth":1,"distortion":1,"zoom":1,"warpX":0,"warpY":0,"shape":0,"colorModeIndex":0},
 "controls":[
 ["Скорость полёта","speedFactor",0,4,0.1,"Снизу ←→",1],
 ["Вращение","rotation",-3,3,0.1,"Сверху ←→",1],
 ["Количество слоёв","depth",20,140,5,"Слева ↑↓",1],
 ["Сложность геометрии","complexity",0,6,0.1,"Справа ↑↓",1],
 ["Свечение","glow",0,100,5,"Ползунок",0],
 ["Толщина линий","lineWidth",0.2,6,0.1,"Ползунок",0],
 ["Искривление","distortion",0,4,0.1,"Ползунок",0],
 ["Масштаб","zoom",0.3,3,0.01,"Пинч",2],
 ["Геометрия: 0 гекса, 1 треугольники, 2 квадраты, 3 круги","shape",0,3,1,"Тап",1],
 ["Искривление X","warpX",-10,10,0.01,"Один палец ←→",1],
 ["Искривление Y","warpY",-10,10,0.01,"Один палец ↑↓",1]
 ],
 "schema":{},
 "keyFields":["speedFactor","rotation","depth","complexity","glow","lineWidth","distortion","zoom","warpX","warpY","shape","colorModeIndex"]
}
END_SETKA_PATTERN_DESCRIPTOR */
(()=>{
"use strict";
if(typeof window!=="object"||typeof document!=="object")return;
const registry=window.SetkaPatternRegistryV1;
const id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
const TAU=Math.PI*2, fract=x=>x-Math.floor(x);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function render(ctx,width,height,c,frame,preview){
 const w=Math.max(1,width),h=Math.max(1,height),tick=Math.max(0,Number(frame)||0);
 const speed=Number(c.speedFactor)||0;
 // The SETKA host passes a wall-clock-derived frame (RAF timestamp / 16.6667),
 // not a frame counter. Thus this timebase is independent of actual display FPS.
 const time=tick/60*speed;
 const n=Math.max(20,Math.round(Number(c.depth)||80));
 const zoom=clamp(Number.isFinite(Number(c.zoom))?Number(c.zoom):1,.3,3);
 const sides=[6,3,4,96][Math.round(c.shape)||0]||6;
 const colors=registry.get(id).palettes;
 const mode=clamp(Math.round(c.colorModeIndex)||0,0,8);
 const rgb=colors[mode]||colors[0];
 const glow=clamp(Number(c.glow)||0,0,100);
 const lineWidth=clamp(Number.isFinite(Number(c.lineWidth))?Number(c.lineWidth):1,.2,6);
 const complexity=Number(c.complexity)||0;
 const distortion=Number(c.distortion)||0;
 const rotation=Number(c.rotation)||0;
 const warpX=Number(c.warpX)||0,warpY=Number(c.warpY)||0;
 ctx.save();ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);
 ctx.translate(w/2,h/2);ctx.globalCompositeOperation="lighter";
 // Match the approved canvas preview: scale against the longer viewport side.
 const maxR=Math.max(w,h)*1.1*zoom;
 const offset=time*.12;
 // Each ring is phase-shifted by a fixed spacing. Boundary opacity goes to zero
 // at both ends, so recycling never produces a visible pop.
 for(let i=0;i<n;i++){
  const phase=fract(i/n+offset);
  const fade=clamp(phase*14,0,1)*clamp((1-phase)*9,0,1);
  if(fade<=0)continue;
  const r=Math.pow(phase,1.65)*maxR;
  if(r<.5)continue;
  const theta=time*rotation*.25+phase*complexity*2.2+i*.09;
  const alpha=(.12+phase*.5)*(.3+glow/130)*fade;
  // The rainbow mode cycles hue continuously through the depth of the tunnel.
  // All other modes preserve the original palette choices.
  if(mode===4){
   // Exact approved rainbow: hue follows layer identity and elapsed time,
   // not the ring depth (which previously changed the whole palette).
   const hue=((i*7+time*25)%360+360)%360;
   ctx.strokeStyle="hsla("+hue.toFixed(1)+",100%,65%,"+alpha.toFixed(4)+")";
  }else{
   ctx.strokeStyle="rgba("+rgb[0]+","+rgb[1]+","+rgb[2]+","+alpha.toFixed(4)+")";
  }
  ctx.lineWidth=(.5+phase*1.4)*lineWidth;
  ctx.beginPath();
  for(let j=0;j<=sides;j++){
   const a=j/sides*TAU+theta;
   const wave=Math.sin(a*3+phase*12+time)*complexity*.035;
   const rr=r*(1+wave);
   let x=Math.cos(a)*rr,y=Math.sin(a)*rr;
   const bend=distortion*phase*phase;
   x+=Math.sin(y*.008+warpX)*r*.07*bend;
   y+=Math.cos(x*.008+warpY)*r*.07*bend;
   if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.closePath();ctx.stroke();
 }
 ctx.restore();
}
registry.bindRenderer(id,render);
})();