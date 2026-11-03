/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "radial-wave",
  "title": "Радиальная волна",
  "version": 1,
  "introducedAt": "2026-11-03T21:43:00.000Z",
  "schemaVersion": 1,
  "module": "standalone-pattern-radial-wave.js",
  "colorModes": 9,
  "palettes": [[255,255,255],[109,238,255],[107,141,255],[199,136,255],[255,139,206],[255,208,100],[103,242,167],[255,255,255],[255,255,255]],
  "defaults": {
    "patternId": "radial-wave",
    "speed": 1, "amplitude": 1, "frequency": 1, "density": 25,
    "size": 1, "trail": 35, "follow": 1, "pulse": 0, "twist": 0, "magnet": 0,
    "centerX": 0.5, "centerY": 0.5, "fromX": 0.5, "fromY": 0.5, "centerFrame": 0,
    "pointerX": 0.5, "pointerY": 0.5, "touchActive": false, "releaseFrame": 0,
    "spin": 0, "spinFrame": 0, "spinX": 0.5, "spinY": 0.5,
    "pulses": [], "lastPulseFrame": -1000, "lastTapFrame": -1000,
    "lastTapX": 0.5, "lastTapY": 0.5, "phase": 0, "phaseFrame": 0,
    "colorModeIndex": 0
  },
  "controls": [
    ["Скорость", "speed", 0.1, 3, 0.1, "Бегунок", 0],
    ["Размах волны", "amplitude", 0, 2.5, 0.1, "Бегунок", 0],
    ["Частота колец", "frequency", 0.3, 4, 0.1, "Бегунок", 0],
    ["Плотность точек", "density", 12, 48, 1, "Бегунок", 0],
    ["Размер точек", "size", 0.4, 2.5, 0.1, "Бегунок", 0],
    ["Шлейф", "trail", 0, 100, 1, "Бегунок", 0],
    ["Следование", "follow", 0.1, 3, 0.1, "Бегунок", 0],
    ["Импульс касания", "pulse", 0, 100, 1, "Бегунок", 0],
    ["Закручивание", "twist", 0, 100, 1, "Бегунок", 0],
    ["Магнит (− / +)", "magnet", -100, 100, 5, "Бегунок", 0]
  ],
  "gestureHints": [
    ["Центр волны", "1 палец: коснись или веди — волна следует за пальцем"],
    ["Сброс центра", "Два быстрых касания по одной точке — вернуть центр"],
    ["Дополнительное движение", "Импульс, вихрь и магнит работают вместе; сила задаётся бегунками"]
  ],
  "schema": {
    "centerX":{"type":"number","min":0,"max":1},"centerY":{"type":"number","min":0,"max":1},
    "fromX":{"type":"number","min":0,"max":1},"fromY":{"type":"number","min":0,"max":1},
    "centerFrame":{"type":"number","min":0,"max":1000000000},
    "pointerX":{"type":"number","min":0,"max":1},"pointerY":{"type":"number","min":0,"max":1},
    "touchActive":{"type":"boolean"},"releaseFrame":{"type":"number","min":0,"max":1000000000},
    "spin":{"type":"number","min":-2,"max":2},
    "spinFrame":{"type":"number","min":0,"max":1000000000},
    "spinX":{"type":"number","min":0,"max":1},"spinY":{"type":"number","min":0,"max":1},
    "pulses":{"type":"array","maxItems":12},
    "lastPulseFrame":{"type":"number","min":-1000,"max":1000000000},
    "lastTapFrame":{"type":"number","min":-1000,"max":1000000000},
    "lastTapX":{"type":"number","min":0,"max":1},"lastTapY":{"type":"number","min":0,"max":1},
    "phase":{"type":"number","min":-1000000000,"max":1000000000},
    "phaseFrame":{"type":"number","min":0,"max":1000000000}
  },
  "keyFields": ["speed","amplitude","frequency","density","size","trail","follow","pulse","twist","magnet","centerX","centerY","fromX","fromY","centerFrame","pointerX","pointerY","touchActive","releaseFrame","spin","spinFrame","spinX","spinY","pulses","lastPulseFrame","lastTapFrame","lastTapX","lastTapY","phase","phaseFrame","colorModeIndex"]
}
END_SETKA_PATTERN_DESCRIPTOR */
(()=>{
"use strict";
// One analytic Canvas renderer for library, gameplay, notes, research and replay.
// No mutable draw state, glow, bokeh, independent modes or seeded fake activity.
const registry=window.SetkaPatternRegistryV1;
const id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
const palettes=registry.get(id).palettes;
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Number.isFinite(v)?Math.min(b,Math.max(a,v)):a;
const norm=(v,den)=>clamp(v/Math.max(1,den),0,1);
const round=v=>Math.round(v*1000000)/1000000;
const elapsed=(f,anchor)=>Math.max(0,(f-anchor)/60);

function centerAt(c,f){
 if(f<c.centerFrame)return{x:c.centerX,y:c.centerY};
 const blend=1-Math.exp(-12*c.follow*elapsed(f,c.centerFrame));
 return {x:c.fromX+(c.centerX-c.fromX)*blend,y:c.fromY+(c.centerY-c.fromY)*blend};
}
function phaseAt(c,f){return c.phase-TAU/180*c.speed*(f-c.phaseFrame)}
function color(mode,d,p,f){
 if(mode===0)return "#fff";
 if(mode===7)return "hsl("+(((d*.66+phaseAt(p.config,f)*110)%360+360)%360)+" 95% 70%)";
 if(mode===8)return "hsl("+(155+145*(.5+.5*Math.sin(d*.019+p.phase)))+" 95% 74%)";
 const rgb=palettes[mode]||palettes[0];
 return "rgb("+rgb.join(",")+")";
}
function paint(ctx,w,h,c,f,shadow=false,preview=false){
 const unit=w/c.density,maxD=Math.hypot(w/2,h/2);
 const waveCenter=centerAt(c,f),ox=waveCenter.x*w,oy=waveCenter.y*h;
 const t=phaseAt(c,f);
 const pointRows=Math.ceil(h/unit)+1;
 const spinValue=c.spin*Math.exp(-2.3*elapsed(f,c.spinFrame));
 const mx=c.pointerX*w,my=c.pointerY*h;
 const fade=c.touchActive?1:(f<c.releaseFrame?0:Math.exp(-3.5*elapsed(f,c.releaseFrame)));
 const pulseItems=c.pulse>0?c.pulses:[];
 const mode=c.colorModeIndex|0;
 const staticColor=mode>0&&mode<7?"rgb("+palettes[mode].join(",")+")":"#fff";
 ctx.fillStyle=staticColor;
 ctx.strokeStyle=staticColor;
 for(let j=0;j<pointRows;j++){
  const y=j*unit;
  for(let i=0;i<=c.density;i++){
   const x=i*unit,dx=x-ox,dy=y-oy,d=Math.hypot(dx,dy);
   const phase=t+d/maxD*TAU*c.frequency,v=Math.sin(phase);
   const shift=(v+1)*.5*(w*.1)*c.amplitude;
   let X=x+(d>1e-8?dx/d:1)*shift;
   let Y=y+(d>1e-8?dy/d:0)*shift;
   for(const p of pulseItems){
    const age=elapsed(f,p.frame);
    if(f<p.frame||age>2.2)continue;
    const qx=X-p.x*w,qy=Y-p.y*h,dist=Math.hypot(qx,qy);
    const front=age*unit*8,spread=Math.max(1,unit*2.2);
    const envelope=Math.exp(-.5*((dist-front)/spread)**2)*Math.pow(1-age/2.2,1.25);
    const force=unit*4*envelope*(c.pulse/100)*c.amplitude;
    X+=(dist>1e-6?qx/dist:1)*force;
    Y+=(dist>1e-6?qy/dist:0)*force;
   }
   if(c.twist>0&&Math.abs(spinValue)>.0005){
    const sx=X-c.spinX*w,sy=Y-c.spinY*h,r=Math.hypot(sx,sy);
    const a=spinValue*1.65*(c.twist/100)*Math.exp(-.5*(r/(unit*8))**2);
    const cs=Math.cos(a),sn=Math.sin(a);
    X=c.spinX*w+sx*cs-sy*sn;
    Y=c.spinY*h+sx*sn+sy*cs;
   }
   if(c.magnet!==0&&fade>.001){
    const qx=mx-X,qy=my-Y,r=Math.hypot(qx,qy);
    const force=.67*c.magnet/100*fade*Math.exp(-.5*(r/(unit*6.5))**2);
    X+=qx*force;Y+=qy*force;
   }
   if(X<-unit||Y<-unit||X>w+unit||Y>h+unit)continue;
   const diameter=Math.max(.15,unit*(.15-.05*v)*c.size);
   if(mode===7)ctx[shadow?"strokeStyle":"fillStyle"]="hsl("+(((d*.66+t*110)%360+360)%360)+" 95% 70%)";
   if(mode===8)ctx[shadow?"strokeStyle":"fillStyle"]="hsl("+(155+145*(.5+.5*Math.sin(d*.019+t)))+" 95% 74%)";
   ctx.beginPath();
   ctx.arc(X,Y,diameter*.5,0,TAU);
   if(shadow)ctx.stroke();else ctx.fill();
  }
 }
}
function render(ctx,width,height,c,frame,preview){
 const w=clamp(width,1,10000),h=clamp(height,1,10000),f=Math.max(0,Number(frame)||0);
 ctx.save();
 ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);
 const samples=Math.max(0,Math.min(preview?2:4,Math.round(c.trail/25)));
 for(let i=samples;i>=1;i--){
  ctx.globalAlpha=(c.trail/100)*(.19/samples)*(samples-i+1);
  paint(ctx,w,h,c,Math.max(0,f-i*3),true,preview);
 }
 ctx.globalAlpha=1;
 paint(ctx,w,h,c,f,false,preview);
 ctx.restore();
}
function interaction(c,event){
 const e=event||{},f=clamp(Number(e.frame),0,1e9);
 if(e.type==="patch"){
  const patch=e.patch||{};
  if(!Object.hasOwn(patch,"speed")||Object.hasOwn(patch,"phaseFrame"))return {...c,...patch};
  // Preserve phase at the moment the slider changes speed.
  return {...c,...patch,phase:phaseAt(c,f),phaseFrame:f};
 }
 if(e.type!=="gesture"||e.fingers!==1)return c;
 const width=Number(e.width)||1,height=Number(e.height)||1;
 const x=norm(Number(e.x),width),y=norm(Number(e.y),height);
 const phase=e.phase||"move";
 if(phase==="end"){
  return {...c,touchActive:false,releaseFrame:f};
 }
 if(phase!=="start"&&phase!=="move")return c;
 if(!Number.isFinite(Number(e.x))||!Number.isFinite(Number(e.y)))return c;
 let targetX=x,targetY=y;
 const doubleTap=phase==="start"&&f>c.lastTapFrame&&f-c.lastTapFrame<=20&&
   Math.hypot((x-c.lastTapX)*width,(y-c.lastTapY)*height)<42;
 if(doubleTap){targetX=.5;targetY=.5;}
 const current=centerAt(c,f);
 let next={...c,fromX:round(current.x),fromY:round(current.y),
   centerX:targetX,centerY:targetY,centerFrame:f,
   pointerX:x,pointerY:y,touchActive:true,
   lastTapFrame:phase==="start"?(doubleTap?-1000:f):c.lastTapFrame,
   lastTapX:phase==="start"?x:c.lastTapX,lastTapY:phase==="start"?y:c.lastTapY};
 if(phase==="move"){
  const deltaX=clamp(Number(e.dx)||0,-200,200),deltaY=clamp(Number(e.dy)||0,-200,200);
  const momentum=c.spin*Math.exp(-2.3*elapsed(f,c.spinFrame));
  next.spin=clamp(momentum+(deltaX+deltaY*.32)/Math.max(150,width)*5,-1.4,1.4);
  next.spinFrame=f;next.spinX=x;next.spinY=y;
 }else{next.spinX=x;next.spinY=y;}
 if(c.pulse>0&&(phase==="start"||f-c.lastPulseFrame>=7)){
  next.pulses=[...c.pulses.filter(p=>f-p.frame<132),{x,y,frame:f}].slice(-12);
  next.lastPulseFrame=f;
 }
 return next;
}
registry.bindRenderer(id,render);
registry.bindInteraction?.(id,interaction);
})();