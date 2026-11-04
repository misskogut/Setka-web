/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "branching-impulse",
  "title": "Ветвящийся импульс",
  "version": 2,
  "introducedAt": "2026-11-03T23:06:00.000Z",
  "schemaVersion": 1,
  "module": "standalone-pattern-branching-impulse.js",
  "colorModes": 9,
  "palettes": [
    [
      255,
      255,
      255
    ],
    [
      100,
      245,
      224
    ],
    [
      109,
      219,
      255
    ],
    [
      180,
      135,
      255
    ],
    [
      255,
      138,
      95
    ],
    [
      255,
      213,
      118
    ],
    [
      100,
      235,
      170
    ],
    [
      255,
      255,
      255
    ],
    [
      255,
      255,
      255
    ]
  ],
  "defaults": {
    "patternId": "branching-impulse",
    "speed": 1,
    "rays": 12,
    "depth": 7,
    "scale": 1,
    "lineWidth": 0.8,
    "spread": 1,
    "angle": 0,
    "spin": 0,
    "touchStrength": 100,
    "breath": 0,
    "pulse": 85,
    "neon": 85,
    "flowSpeed": 1,
    "glow": 65,
    "tips": 20,
    "hueShift": 0,
    "invert": 0,
    "rotation": 0,
    "rotationFrame": 0,
    "phase": 5.5,
    "phaseFrame": 0,
    "flowPhase": 0,
    "flowFrame": 0,
    "touchRoot": -1,
    "touchNode": -1,
    "touchFrame": 0,
    "touchEndFrame": 0,
    "touchDX": 0,
    "touchDY": 0,
    "touchX": 0.5,
    "touchY": 0.5,
    "touchActive": false,
    "interactionMode": 0,
    "colorModeIndex": 0,
    "touchRetractEpoch": 0
  },
  "controls": [
    [
      "Скорость движения",
      "speed",
      0,
      3,
      0.1,
      "Ползунок",
      0
    ],
    [
      "Количество лучей",
      "rays",
      4,
      20,
      1,
      "Ползунок",
      0
    ],
    [
      "Глубина ветвления",
      "depth",
      3,
      8,
      1,
      "Ползунок",
      0
    ],
    [
      "Масштаб",
      "scale",
      0.5,
      1.5,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Толщина линий",
      "lineWidth",
      0.04,
      3.5,
      0.02,
      "Ползунок",
      0
    ],
    [
      "Раскрытие ветвей",
      "spread",
      0.1,
      2.5,
      0.05,
      "Ползунок",
      0
    ],
    [
      "Поворот оси",
      "angle",
      -180,
      180,
      1,
      "Ползунок",
      0
    ],
    [
      "Автовращение",
      "spin",
      -2,
      2,
      0.1,
      "Ползунок",
      0
    ],
    [
      "Глубина втягивания",
      "touchStrength",
      0,
      200,
      5,
      "Ползунок",
      0
    ],
    [
      "Дыхание",
      "breath",
      0,
      100,
      5,
      "Ползунок",
      0
    ],
    [
      "Скорость втягивания",
      "pulse",
      0,
      100,
      5,
      "Ползунок",
      0
    ],
    [
      "Сила неона",
      "neon",
      0,
      100,
      5,
      "Ползунок",
      0
    ],
    [
      "Скорость световой волны",
      "flowSpeed",
      0.1,
      3,
      0.1,
      "Ползунок",
      0
    ],
    [
      "Мягкость свечения",
      "glow",
      0,
      100,
      5,
      "Ползунок",
      0
    ],
    [
      "Светящиеся окончания",
      "tips",
      0,
      100,
      5,
      "Ползунок",
      0
    ],
    [
      "Сдвиг оттенка",
      "hueShift",
      0,
      360,
      5,
      "Ползунок",
      0
    ],
    [
      "Инверсия фона",
      "invert",
      0,
      1,
      1,
      "Ползунок",
      0
    ]
  ],
  "gestureHints": [
    [
      "Касание ветки",
      "Коснись линии — ветка втянется; отпусти — раскроется"
    ],
    [
      "Поворот",
      "На свободном участке вращай одним пальцем"
    ]
  ],
  "schema": {
    "rotation": {
      "type": "number",
      "min": -100000,
      "max": 100000
    },
    "rotationFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    },
    "phase": {
      "type": "number",
      "min": -100000,
      "max": 100000
    },
    "phaseFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    },
    "flowPhase": {
      "type": "number",
      "min": -100000,
      "max": 100000
    },
    "flowFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    },
    "touchRoot": {
      "type": "number",
      "min": -1,
      "max": 20,
      "integer": true
    },
    "touchNode": {
      "type": "number",
      "min": -1,
      "max": 1024,
      "integer": true
    },
    "touchFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    },
    "touchEndFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    },
    "touchDX": {
      "type": "number",
      "min": -250,
      "max": 250
    },
    "touchDY": {
      "type": "number",
      "min": -250,
      "max": 250
    },
    "touchX": {
      "type": "number",
      "min": 0,
      "max": 1
    },
    "touchY": {
      "type": "number",
      "min": 0,
      "max": 1
    },
    "touchActive": {
      "type": "boolean"
    },
    "interactionMode": {
      "type": "number",
      "min": 0,
      "max": 2,
      "integer": true
    },
    "touchRetractEpoch": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    }
  },
  "keyFields": [
    "speed",
    "rays",
    "depth",
    "scale",
    "lineWidth",
    "spread",
    "angle",
    "spin",
    "touchStrength",
    "breath",
    "pulse",
    "neon",
    "flowSpeed",
    "glow",
    "tips",
    "hueShift",
    "invert",
    "rotation",
    "rotationFrame",
    "phase",
    "phaseFrame",
    "flowPhase",
    "flowFrame",
    "touchRoot",
    "touchNode",
    "touchFrame",
    "touchEndFrame",
    "touchDX",
    "touchDY",
    "touchX",
    "touchY",
    "touchActive",
    "interactionMode",
    "colorModeIndex",
    "touchRetractEpoch"
  ],
  "legacyVersions": [
    1
  ]
}
END_SETKA_PATTERN_DESCRIPTOR */
(()=>{
"use strict";
// One-file SETKA v2 module. All render state is config + frame (no private animation state).
// Original: 12 radial roots, 7 recursive levels, Penner-like opening and noise-driven branches.
const registry=window.SetkaPatternRegistryV1;
const id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
const rgb=registry.get(id).palettes;
const ease=(a,b,t)=>a+(b-a)*t;
const round=x=>Math.round(x*100000)/100000;
function hash(x,y){
 let a=(Math.imul(x,374761393)+Math.imul(y,668265263))|0;
 a=Math.imul(a^(a>>>13),1274126177);
 return ((a^(a>>>16))>>>0)/4294967295;
}
function noise(x,y){
 const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
 const a=fx*fx*(3-2*fx),b=fy*fy*(3-2*fy);
 const p=ease(hash(ix,iy),hash(ix+1,iy),a);
 const q=ease(hash(ix,iy+1),hash(ix+1,iy+1),a);
 return ease(p,q,b);
}
const timeAt=(c,f)=>c.phase+(f-c.phaseFrame)*(.01*c.speed);
const flowAt=(c,f)=>c.flowPhase+(f-c.flowFrame)*(.02*c.flowSpeed);
const rotationAt=(c,f)=>c.rotation+c.angle*Math.PI/180+(f-c.rotationFrame)*c.spin*TAU/3600;
const powerAt=(c,f)=>{
 if(c.touchRoot<0||c.touchNode<0||f<c.touchFrame)return 0;
 return c.touchActive?1:Math.exp(-3*Math.max(0,f-c.touchEndFrame)/60);
};
// New touches are an involuntary retract-and-release reflex. The epoch
// field preserves legacy saved recipes: absent/zero remains the v1 behavior.
// Short taps have a guaranteed visible retreat before reopening.
const retractAt=(c,f)=>{
 if(!(c.touchRetractEpoch>0)||c.touchRoot<0||c.touchNode<0||f<c.touchFrame)return 0;
 const elapsed=Math.max(0,f-c.touchFrame);
 const pull=1-Math.exp(-elapsed*(.12+.30*c.pulse/100));
 if(c.touchActive)return pull;
 const holdUntil=Math.max(c.touchEndFrame,c.touchFrame+15);
 if(f<=holdUntil)return pull;
 const u=clamp((f-holdUntil)/28,0,1);
 return pull*(1-u*u*(3-2*u));
};
function hsl(h,s,l){
 h=((h%360)+360)%360;s/=100;l/=100;
 const a=s*Math.min(l,1-l);
 const chan=n=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1))))};
 return [chan(0),chan(8),chan(4)];
}
function rgba(a,alpha){return "rgba("+a[0]+","+a[1]+","+a[2]+","+clamp(alpha,0,1)+")"}
function tint(c,root,depth,radius,dist,flow){
 const mode=c.colorModeIndex|0,shift=c.hueShift;
 if(mode===1)return hsl(170+116*(.5+.5*Math.sin(dist/165-flow*.48))+shift,96,70);
 if(mode===7)return hsl(root*360/c.rays+depth*13+flow*7+shift,96,69);
 if(mode===8)return hsl(Math.min(1,radius/400)*304+flow*9+shift,96,69);
 const base=rgb[mode]||rgb[0];
 if(shift&&mode!==0)return hsl(({2:188,3:265,4:21,5:40,6:145}[mode]||0)+shift,95,70);
 return base;
}
function wave(dist,flow){
 const a=.5+.5*Math.cos(TAU*(dist/175-flow*.23));
 const b=.5+.5*Math.cos(TAU*(dist/99-flow*.125));
 return clamp(Math.pow(a,8)*.83+Math.pow(b,12)*.23,0,1);
}
function project(x,y,angle){
 const dx=x-360,dy=y-360,co=Math.cos(angle),si=Math.sin(angle);
 return {x:360+dx*co-dy*si,y:360+dx*si+dy*co};
}
// The same analytic traversal is used by paint() and finger hit testing.
function walk(c,f,visitor,withHit=false){
 const t=timeAt(c,f),rot=rotationAt(c,f),opening=Math.sin(t/5)**2/3*c.spread;
 const breathing=1+Math.sin(t*1.5)*c.breath*.0008;
 const retractMode=c.touchRetractEpoch>0;
 const retreat=retractMode?retractAt(c,f):0;
 const touchPower=(retractMode?retreat:powerAt(c,f))*c.touchStrength/100;
 const active=touchPower>.005,phase=Math.max(0,f-c.touchFrame);
 function branch(d,s,x,y,l,root,node,depth,dist,inherited){
  if(s<=0)return;
  const force=20-s,n=noise(x/720-t,y/720+t)*force;
  let endX=x+l*breathing*Math.cos(d)+force*Math.cos(n);
  let endY=y+l*breathing*Math.sin(d)+force*Math.sin(n);
  const selected=active&&root===c.touchRoot&&node===c.touchNode;
  const propagated=inherited||selected;
  const collapse=retractMode&&propagated?clamp(touchPower*.94,0,.985):0;
  if(retractMode&&collapse){
   // Each chosen segment and each of its descendants folds toward its
   // parent joint; the whole branch visibly disappears into its stem.
   endX=x+(endX-x)*(1-collapse);
   endY=y+(endY-y)*(1-collapse);
  }else if(selected&&!retractMode){
   const pulse=Math.sin(phase*.16)*c.pulse/100;
   endX+=touchPower*(c.touchDX+12*pulse);
   endY+=touchPower*(c.touchDY+12*Math.cos(phase*.16)*c.pulse/100);
  }
  const a=project(x,y,rot),b=project(endX,endY,rot);
  const span=Math.hypot(endX-x,endY-y);
  const hit={a,b,s,root,node,depth,dist,span,propagated,selected,phase,touchPower,collapse,retractMode};
  visitor(hit);
  const next=dist+span;
  branch(d+opening,s-1,endX,endY,l*.8,root,node*2,depth+1,next,propagated);
  branch(d-opening,s-1,endX,endY,l*.8,root,node*2+1,depth+1,next,propagated);
 }
 for(let i=c.rays-1;i>=0;i--)branch(TAU*i/c.rays,c.depth,360,360,70*c.scale,i,1,0,0,false);
}
function paint(ctx,h,c,f,preview){
 const flow=flowAt(c,f),neon=c.neon/100;
 const scale=Math.min(h.width,h.height)/720;
 ctx.save();
 ctx.fillStyle=c.invert?"#fff":"#000";
 ctx.fillRect(0,0,h.width,h.height);
 ctx.translate(h.width/2,h.height/2);
 ctx.scale(scale,scale);
 ctx.translate(-360,-360);
 ctx.lineCap="round";ctx.lineJoin="round";
 const total=(1<<c.depth)-1;
 walk(c,f,e=>{
  const mid=(e.dist+e.span/2),r=Math.hypot((e.a.x+e.b.x)/2-360,(e.a.y+e.b.y)/2-360);
  const palette=tint(c,e.root,e.depth,r,mid,flow);
  const color=c.invert&&c.colorModeIndex===0?[0,0,0]:palette;
  const branchWave=!e.retractMode&&e.propagated?e.touchPower*c.pulse/100*(.5+.5*Math.sin(e.phase*.2-e.depth*.9)):0;
  const ww=wave(mid,flow),intensity=clamp(ww*neon+branchWave*.9,0,1);
  const width=Math.max(.04,e.s*2*c.lineWidth*(e.selected?1.18:1));
  ctx.shadowBlur=0;
  ctx.lineWidth=width;
  ctx.strokeStyle=rgba(color,1-e.collapse*.70);
  ctx.beginPath();ctx.moveTo(e.a.x,e.a.y);ctx.lineTo(e.b.x,e.b.y);ctx.stroke();
  if(intensity>.055&&(neon||branchWave)){
   let light=c.invert&&c.colorModeIndex===0?[0,0,0]:[Math.round(color[0]*.32+255*.68),Math.round(color[1]*.32+255*.68),Math.round(color[2]*.32+255*.68)];
   ctx.lineWidth=width*(1+intensity*.21);
   ctx.strokeStyle=rgba(light,Math.min(.98,intensity*.85)*(1-e.collapse*.70));
   if(intensity>.55&&c.glow>0&&!preview){
    ctx.shadowColor=rgba(color,.85);
    ctx.shadowBlur=clamp(c.glow/100*15*intensity,0,17);
   }
   ctx.beginPath();ctx.moveTo(e.a.x,e.a.y);ctx.lineTo(e.b.x,e.b.y);ctx.stroke();
   ctx.shadowBlur=0;
  }
  if(e.s===1&&c.tips>0){
   ctx.fillStyle=rgba(color,c.tips/100);
   ctx.beginPath();ctx.arc(e.b.x,e.b.y,Math.max(.15,c.lineWidth*(.45+c.tips*.023)),0,TAU);ctx.fill();
  }
 },true);
 ctx.restore();
}
function render(ctx,width,height,c,frame,preview=false){
 const h={width:clamp(width,1,10000),height:clamp(height,1,10000)};
 paint(ctx,h,c,Math.max(0,Number(frame)||0),Boolean(preview));
}
function nearest(c,f,x,y,w,h){
 const scale=Math.min(w,h)/720;
 const px=360+(x-w/2)/scale,py=360+(y-h/2)/scale;
 let best=null,d=Infinity;
 walk(c,f,e=>{
  const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y,den=dx*dx+dy*dy||1;
  const q=clamp(((px-e.a.x)*dx+(py-e.a.y)*dy)/den,0,1);
  const dist=Math.hypot(px-e.a.x-q*dx,py-e.a.y-q*dy);
  if(dist<d){d=dist;best=e}
 });
 return d<=Math.max(20,Math.min(33,20+c.lineWidth*4))?best:null;
}
function angleDiff(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b))}
function interact(c,event){
 const e=event||{},f=clamp(Number(e.frame),0,1000000000);
 if(e.type==="patch"){
  const patch=e.patch||{};
  const next={...c,...patch};
  if(Object.hasOwn(patch,"speed")&&!Object.hasOwn(patch,"phaseFrame")){
   next.phase=timeAt(c,f);next.phaseFrame=f;
  }
  if(Object.hasOwn(patch,"flowSpeed")&&!Object.hasOwn(patch,"flowFrame")){
   next.flowPhase=flowAt(c,f);next.flowFrame=f;
  }
  if((Object.hasOwn(patch,"spin")||Object.hasOwn(patch,"angle"))&&!Object.hasOwn(patch,"rotationFrame")){
   // Preserve current orientation when changing the spin rate or the axis slider.
   next.rotation=rotationAt(c,f)-(Object.hasOwn(patch,"angle")?next.angle:c.angle)*Math.PI/180;
   next.rotationFrame=f;
  }
  return next;
 }
 if(e.type!=="gesture"||e.fingers!==1)return c;
 const w=Math.max(1,Number(e.width)||390),h=Math.max(1,Number(e.height)||844);
 const x=Number(e.x),y=Number(e.y),phase=e.phase||"move";
 if(!Number.isFinite(x)||!Number.isFinite(y))return c;
 if(phase==="end")return {...c,touchActive:false,touchEndFrame:f,interactionMode:0};
 if(phase==="start"){
  const hit=c.touchStrength>0?nearest(c,f,x,y,w,h):null;
  if(hit){
   return {...c,interactionMode:1,touchRoot:hit.root,touchNode:hit.node,touchRetractEpoch:f+1,
    touchFrame:f,touchEndFrame:f,touchDX:0,touchDY:0,touchX:clamp(x/w,0,1),touchY:clamp(y/h,0,1),touchActive:true};
  }
  return {...c,interactionMode:2,touchActive:false,touchEndFrame:f};
 }
 if(phase!=="move")return c;
 const dx=Number(e.dx)||0,dy=Number(e.dy)||0;
 if(c.interactionMode===1&&c.touchActive){
  // Touch no longer drags the branch: it stays tucked while the finger rests.
  return {...c,touchX:round(clamp(x/w,0,1)),touchY:round(clamp(y/h,0,1))};
 }
 if(c.interactionMode===2){
  const prev=Math.atan2(y-dy-h/2,x-dx-w/2);
  const now=Math.atan2(y-h/2,x-w/2);
  const change=angleDiff(now,prev);
  return {...c,rotation:round(rotationAt(c,f)+clamp(change,-.65,.65)-c.angle*Math.PI/180),rotationFrame:f};
 }
 return c;
}
registry.bindRenderer(id,render);
registry.bindInteraction?.(id,interact);
})();
