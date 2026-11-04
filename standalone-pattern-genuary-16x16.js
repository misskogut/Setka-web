/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "genuary-16x16",
  "title": "Пространственная сетка 16×16",
  "version": 1,
  "introducedAt": "2026-11-04T01:20:00.000Z",
  "schemaVersion": 1,
  "module": "standalone-pattern-genuary-16x16.js",
  "colorModes": 9,
  "palettes": [
    [
      255,
      255,
      255
    ],
    [
      90,
      228,
      255
    ],
    [
      176,
      154,
      255
    ],
    [
      255,
      133,
      143
    ],
    [
      124,
      242,
      175
    ],
    [
      211,
      151,
      255
    ],
    [
      255,
      192,
      120
    ],
    [
      120,
      207,
      255
    ],
    [
      236,
      177,
      235
    ]
  ],
  "tapColorCycle": false,
  "defaults": {
    "patternId": "genuary-16x16",
    "turn": 0,
    "turnFrom": 0,
    "turnFrame": 0,
    "num": 20,
    "numFrom": 20,
    "numFrame": 0,
    "lineW": 1.2,
    "lineWFrom": 1.2,
    "lineWFrame": 0,
    "pitch": 0,
    "pitchFrom": 0,
    "pitchFrame": 0,
    "zFrom": 0,
    "zFrame": 0,
    "colorSpeed": 1,
    "colorPhase": 0,
    "colorFrame": 0,
    "glow": 0,
    "invert": 0,
    "gestureRegion": 0,
    "gestureAxis": 0,
    "gestureStartX": 0.5,
    "gestureStartY": 0.5,
    "gestureMoved": false,
    "gestureStartFrame": 0,
    "lastTapFrame": -1000,
    "tapCount": 0,
    "colorModeIndex": 0,
    "autoTurn": 0.15
  },
  "controls": [
    [
      "Скручивание",
      "turn",
      -30,
      30,
      0.01,
      "Снизу ←→",
      1,
      "Нижняя половина: веди пальцем влево или вправо; слои скручиваются вокруг центра."
    ],
    [
      "Толщина линий",
      "lineW",
      0.3,
      6,
      0.01,
      "Сверху ←→",
      1,
      "Верхняя половина: свайп горизонтально. Меняет общую равномерную толщину всех линий."
    ],
    [
      "Плотность линий",
      "num",
      16,
      96,
      0.1,
      "Слева ↑↓",
      1,
      "Левый край по всей высоте: вверх больше линий, вниз меньше."
    ],
    [
      "Наклон 3D",
      "pitch",
      -0.95,
      0.95,
      0.005,
      "Справа ↑↓",
      1,
      "Правый край по всей высоте: пространственный наклон всей стопки вокруг оси X; у нуля слои сходятся."
    ],
    [
      "Скорость цвета",
      "colorSpeed",
      0,
      3,
      0.05,
      "Ползунок",
      0,
      "Темп плавных цветовых переливов; не влияет на геометрию."
    ],
    [
      "Свечение",
      "glow",
      0,
      100,
      1,
      "Ползунок",
      0,
      "Мягкий дополнительный ореол цвета. 0 — без свечения, как в оригинале."
    ],
    [
      "Инверсия ч/б",
      "invert",
      0,
      1,
      1,
      "Ползунок",
      0,
      "Для монохромной палитры: чёрные линии на белом фоне вместо белых на чёрном."
    ],
    [
      "Автодвижение",
      "autoTurn",
      0,
      2,
      0.05,
      "Ползунок",
      0,
      "Очень мягкое самостоятельное скручивание стопки. 0 — полностью неподвижные слои, как в оригинале."
    ]
  ],
  "gestureHints": [
    [
      "Тройное касание",
      "3 быстрых касания — смена цвета по кругу (10 сочетаний, включая инверсию)."
    ]
  ],
  "schema": {
    "turnFrom": {
      "type": "number",
      "min": -30,
      "max": 30
    },
    "turnFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    },
    "numFrom": {
      "type": "number",
      "min": 16,
      "max": 96
    },
    "numFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    },
    "lineWFrom": {
      "type": "number",
      "min": 0.3,
      "max": 6
    },
    "lineWFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    },
    "pitchFrom": {
      "type": "number",
      "min": -0.95,
      "max": 0.95
    },
    "pitchFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    },
    "zFrom": {
      "type": "number",
      "min": 0,
      "max": 34
    },
    "zFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    },
    "colorPhase": {
      "type": "number",
      "min": 0,
      "max": 10000000
    },
    "colorFrame": {
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
    "gestureAxis": {
      "type": "number",
      "min": 0,
      "max": 2,
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
    "gestureMoved": {
      "type": "boolean"
    },
    "gestureStartFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
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
    "turn",
    "turnFrom",
    "turnFrame",
    "num",
    "numFrom",
    "numFrame",
    "lineW",
    "lineWFrom",
    "lineWFrame",
    "pitch",
    "pitchFrom",
    "pitchFrame",
    "zFrom",
    "zFrame",
    "colorSpeed",
    "colorPhase",
    "colorFrame",
    "glow",
    "invert",
    "gestureRegion",
    "gestureAxis",
    "gestureStartX",
    "gestureStartY",
    "gestureMoved",
    "gestureStartFrame",
    "lastTapFrame",
    "tapCount",
    "colorModeIndex",
    "autoTurn"
  ]
}
END_SETKA_PATTERN_DESCRIPTOR */
(()=>{
"use strict";
// Adapted from Genuary 2026 16x16 WEBGL. This renderer is 3D perspective
// projected into the platform Canvas2D context, shared by game and Replay.
const registry=window.SetkaPatternRegistryV1;
const id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
const TAU=Math.PI*2,PI=Math.PI;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,Number.isFinite(v)?v:a));
const lerp=(a,b,x)=>a+(b-a)*x;
const smooth=(a,b,t)=>a+(b-a)*Math.max(0,Math.min(1,t));
const round=n=>Math.round(n*1000000)/1000000;
const ZMAX=34,PMAX=.95,ZGAMMA=1.15,LOCK=10,SLOP=6;
const STEP={turn:.012,num:.06,lineW:.01,pitch:.0042};
const RATE={turn:.12,num:.10,lineW:.15,pitch:.14,z:.18};
const layerPhase=Array.from({length:8},(_,i)=>{
 const x=Math.sin((i+1)*78.233+23.734)*43758.5453;
 return (x-Math.floor(x))*TAU;
});
const stateAt=(c,key,f)=>{
 const base=c[key+"From"],start=c[key+"Frame"],target=c[key];
 return target+(base-target)*Math.pow(1-RATE[key],Math.max(0,f-start));
};
const zTarget=p=>ZMAX*Math.pow(Math.abs(p)/PMAX,ZGAMMA);
const zAt=(c,f)=>zTarget(c.pitch)+(c.zFrom-zTarget(c.pitch))*Math.pow(1-RATE.z,Math.max(0,f-c.zFrame));
const phaseAt=(c,f)=>c.colorPhase+Math.max(0,f-c.colorFrame)*c.colorSpeed/60;
const frac=x=>x-Math.floor(x);
function hsv2rgb(h,s,v){
 h=frac(h);const i=Math.floor(h*6),ff=h*6-i,p=v*(1-s),q=v*(1-ff*s),tt=v*(1-(1-ff)*s);
 let r,g,b;
 switch(i%6){
 case 0:r=v;g=tt;b=p;break;case 1:r=q;g=v;b=p;break;
 case 2:r=p;g=v;b=tt;break;case 3:r=p;g=q;b=v;break;
 case 4:r=tt;g=p;b=v;break;default:r=v;g=p;b=q;
 }
 return [Math.floor(r*255),Math.floor(g*255),Math.floor(b*255)];
}
function lerpHue(h1,h2,amt){
 let d=h2-h1;if(d>.5)d-=1;if(d<-.5)d+=1;return frac(h1+d*amt);
}
// Nine registry palettes represent ten original modes.
// Mode 0 includes the two monochromes (invert=0 or 1);
 // modes 1..8 exactly reproduce source modes 2..9.
function modeOf(c){return c.colorModeIndex===0?(c.invert===1?0:1):c.colorModeIndex+1}
function background(mode,t){
 if(mode===0)return [255,255,255];if(mode===5)return [0,0,8+8*(.5+.5*Math.sin(t*.3))];
 if(mode===9)return [0,0,10];return [0,0,0];
}
function lineColor(mode,t,i,n,x,div){
 const idx=i/Math.max(1,n-1),pos=(x+250)/500,layer=div-1,ph=layerPhase[layer]||0;
 if(mode===0)return [0,0,0,255];
 if(mode===1)return [255,255,255,255];
 if(mode===2){const p=.65+.35*Math.sin(t*2);return [90,Math.floor(220*p+35),255,240]}
 if(mode===3){
  const q=.5+.5*Math.sin(t*.9+idx*TAU);
  return [Math.floor(lerp(120,200,q)),Math.floor(lerp(140,180,q)),Math.floor(lerp(255,210,q)),230];
 }
 if(mode===4)return [...hsv2rgb(t*.1+idx*1.2,.95,1),240];
 if(mode===5)return [...hsv2rgb(t*.12+pos*.9+idx*.25,.85,1),220];
 if(mode===6){
  const h=frac(ph/TAU+t*.06*(.7+.12*layer));
  return [...hsv2rgb(h+idx*.85,.95,1),240];
 }
 if(mode===7){
  const h=frac(ph/TAU+layer*.07),mix=.5+.5*Math.sin(t*(.8+.12*layer)+idx*TAU*.6);
  return [...hsv2rgb(lerpHue(h,frac(h+.5),mix),.9,1),235];
 }
 if(mode===8){
  const wave=pos-t*(.18+.03*layer)+ph/TAU;
  return [...hsv2rgb(wave,.95,1),230];
 }
 const h=t*.07+idx*.75+ph/TAU*.6+layer*.03;
 const sat=.55+.25*(.5+.5*Math.sin(t*.9+layer));
 const alpha=150+80*(.5+.5*Math.sin(t*1.2+idx*TAU+layer));
 return [...hsv2rgb(h,sat,.92),Math.floor(alpha)];
}
function geometry(c,f,width,height,visit){
 const turn=stateAt(c,"turn",f)+.12*c.autoTurn*Math.sin(f/95),num=stateAt(c,"num",f),
       lineW=stateAt(c,"lineW",f),pitch=stateAt(c,"pitch",f),z=zAt(c,f);
 const n=Math.floor(num),baseScale=height/628,cam=628*Math.sqrt(3)/2,
       coP=Math.cos(pitch),siP=Math.sin(pitch),t=phaseAt(c,f),mode=modeOf(c);
 const center=3.5;
 const project=(x,y,zz)=>{
  const yy=y*coP-zz*siP,depth=y*siP+zz*coP;
  const fac=cam/(cam-depth);
  return {x:width/2+x*baseScale*fac,y:height/2+yy*baseScale*fac,fac,depth};
 };
 for(let oi=0;oi<8;oi++){
  const idx=pitch>=0?7-oi:oi,div=idx+1;
  const zz=(idx-center)*z,ang=turn/5*div;
  const a=Math.cos(ang),b=Math.sin(ang);
  for(let i=0;i<n;i++){
   // Source uses num (smoothed float), not floor(num), in cell spacing.
   const x=-250+(500/num)*i;
   const p1=project(x*a+250*b,x*b-250*a,zz);
   const p2=project(x*a-250*b,x*b+250*a,zz);
   const col=lineColor(mode,t,i,n,x,div);
   visit(p1,p2,col,Math.max(.05,lineW*baseScale*(p1.fac+p2.fac)/2),idx,i);
  }
 }
 return {turn,num,lineW,pitch,z,mode};
}
function render(ctx,width,height,c,frame,preview=false){
 const f=Math.max(0,Number(frame)||0),w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1);
 const t=phaseAt(c,f),mode=modeOf(c),bg=background(mode,t);
 ctx.save();
 ctx.globalAlpha=1;ctx.shadowBlur=0;
 ctx.fillStyle=bg.every(x=>x===0)?"#000":bg.every(x=>x===255)?"#fff":"rgb("+bg.map(Math.round).join(",")+")";ctx.fillRect(0,0,w,h);
 ctx.lineCap="round";ctx.lineJoin="round";
 geometry(c,f,w,h,(a,b,col,weight)=>{
  const alpha=col[3]/255;
  ctx.globalAlpha=alpha;
  ctx.strokeStyle="rgb("+col[0]+","+col[1]+","+col[2]+")";
  ctx.lineWidth=weight;
  if(c.glow>0&&!preview){ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=c.glow/100*6}
  else ctx.shadowBlur=0;
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 });
 ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.restore();
}
function updateTarget(c,key,next,f){
 const target=clamp(next,...({turn:[-30,30],num:[16,96],lineW:[.3,6],pitch:[-PMAX,PMAX]}[key]));
 if(key==="pitch"){
  return {...c,
   pitchFrom:stateAt(c,"pitch",f),pitchFrame:f,pitch:target,
   zFrom:clamp(zAt(c,f),0,ZMAX),zFrame:f};
 }
 return {...c,[key+"From"]:stateAt(c,key,f),[key+"Frame"]:f,[key]:target};
}
function cycle10(c){
 const cur=c.colorModeIndex===0?(c.invert===1?1:0):c.colorModeIndex+1;
 const next=(cur+1)%10;
 if(next===0)return {...c,colorModeIndex:0,invert:0};
 if(next===1)return {...c,colorModeIndex:0,invert:1};
 return {...c,colorModeIndex:next-1,invert:0};
}
function interact(c,event){
 const e=event||{},f=clamp(Number(e.frame)||0,0,1000000000);
 if(e.type==="patch"){
  const patch=e.patch||{};
  const next={...c,...patch};
  for(const key of ["turn","num","lineW","pitch"]){
   if(!Object.hasOwn(patch,key))continue;
   const updated=updateTarget(c,key,patch[key],f);
   next[key]=updated[key];
   next[key+"From"]=updated[key+"From"];
   next[key+"Frame"]=updated[key+"Frame"];
   if(key==="pitch"){next.zFrom=updated.zFrom;next.zFrame=updated.zFrame}
  }
  if(Object.hasOwn(patch,"colorSpeed")&&!Object.hasOwn(patch,"colorFrame")){
   next.colorPhase=clamp(phaseAt(c,f),0,10000000);next.colorFrame=f;
  }
  return next;
 }
 if(e.type!=="gesture"||e.fingers!==1)return c;
 const w=Math.max(1,Number(e.width)||390),h=Math.max(1,Number(e.height)||780);
 const x=Number(e.x),y=Number(e.y);if(!Number.isFinite(x)||!Number.isFinite(y))return c;
 const phase=e.phase||"move",startX=clamp(x/w,0,1),startY=clamp(y/h,0,1);
 if(phase==="start"){
  const edge=Math.max(44,w*.12);
  const region=x<edge?4:x>w-edge?3:y<h/2?1:2;
  return {...c,gestureRegion:region,gestureAxis:0,
   gestureStartX:startX,gestureStartY:startY,gestureMoved:false,gestureStartFrame:f};
 }
 if(phase==="end"){
  let next={...c,gestureRegion:0,gestureAxis:0};
  if(c.gestureRegion>0&&!c.gestureMoved&&f-c.gestureStartFrame<=33){
   const recent=f-c.lastTapFrame<=20&&f>=c.lastTapFrame;
   const hits=recent?c.tapCount+1:1;
   next={...next,lastTapFrame:f,tapCount:hits>=3?0:hits};
   if(hits>=3)next=cycle10(next);
  }
  return next;
 }
 if(phase!=="move"||!c.gestureRegion)return c;
 const dx=Number(e.dx)||0,dy=Number(e.dy)||0;
 const totalX=x-c.gestureStartX*w,totalY=y-c.gestureStartY*h;
 let axis=c.gestureAxis;
 if(!axis&&(Math.abs(totalX)>LOCK||Math.abs(totalY)>LOCK))axis=Math.abs(totalX)>=Math.abs(totalY)?1:2;
 const moved=c.gestureMoved||Math.abs(totalX)>SLOP||Math.abs(totalY)>SLOP;
 let next={...c,gestureAxis:axis,gestureMoved:moved};
 if(c.gestureRegion===4&&axis===2)next=updateTarget(next,"num",next.num-dy*STEP.num,f);
 else if(c.gestureRegion===3&&axis===2)next=updateTarget(next,"pitch",next.pitch+dy*STEP.pitch,f);
 else if(c.gestureRegion===1&&axis===1)next=updateTarget(next,"lineW",next.lineW+dx*STEP.lineW,f);
 else if(c.gestureRegion===2&&axis===1)next=updateTarget(next,"turn",next.turn+dx*STEP.turn,f);
 return next;
}
registry.bindRenderer(id,render);
registry.bindInteraction?.(id,interact);
})();
