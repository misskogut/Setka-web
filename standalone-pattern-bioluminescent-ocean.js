/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "bioluminescent-ocean",
  "title": "Биолюминесцентный океан",
  "version": 1,
  "introducedAt": "2026-11-05T06:30:00.000Z",
  "schemaVersion": 1,
  "module": "standalone-pattern-bioluminescent-ocean.js",
  "colorModes": 6,
  "palettes": [
    [
      255,
      255,
      255
    ],
    [
      60,
      235,
      255
    ],
    [
      90,
      255,
      155
    ],
    [
      170,
      110,
      255
    ],
    [
      255,
      190,
      90
    ],
    [
      255,
      255,
      255
    ]
  ],
  "defaults": {
    "patternId": "bioluminescent-ocean",
    "speed": 0.6,
    "waves": 1.2,
    "refraction": 1.4,
    "depth": 1.2,
    "brightness": 1.5,
    "zoom": 1,
    "originX": 0,
    "originY": 0,
    "impactX": 10,
    "impactY": 10,
    "impulse": 0,
    "impactFrame": 0,
    "colorModeIndex": 0
  },
  "controls": [
    [
      "Скорость течения",
      "speed",
      0,
      2,
      0.05,
      "Бегунок",
      0,
      "Скорость движения световых узоров."
    ],
    [
      "Высота волн",
      "waves",
      0,
      3,
      0.05,
      "Бегунок",
      0,
      "Сила искривления водной поверхности."
    ],
    [
      "Преломление",
      "refraction",
      0.3,
      3,
      0.05,
      "Бегунок",
      0,
      "Масштаб световых каустик."
    ],
    [
      "Глубина воды",
      "depth",
      0.2,
      3,
      0.05,
      "Бегунок",
      0,
      "Затухание света в глубине."
    ],
    [
      "Яркость света",
      "brightness",
      0.2,
      3,
      0.05,
      "Бегунок",
      0,
      "Интенсивность световых узоров."
    ],
    [
      "Масштаб",
      "zoom",
      0.4,
      3,
      0.05,
      "Бегунок",
      0,
      "Приближение и отдаление рисунка."
    ]
  ],
  "gestureHints": [
    [
      "Рябь",
      "Одним пальцем коснись или проведи по воде — возникает затухающая рябь."
    ],
    [
      "Масштаб",
      "Два пальца: разведи или сведи для изменения масштаба."
    ]
  ],
  "schema": {
    "originX": {
      "type": "number",
      "min": -100,
      "max": 100
    },
    "originY": {
      "type": "number",
      "min": -100,
      "max": 100
    },
    "impactX": {
      "type": "number",
      "min": -100,
      "max": 100
    },
    "impactY": {
      "type": "number",
      "min": -100,
      "max": 100
    },
    "impulse": {
      "type": "number",
      "min": 0,
      "max": 2
    },
    "impactFrame": {
      "type": "number",
      "min": 0,
      "max": 1000000000
    }
  },
  "keyFields": [
    "speed",
    "waves",
    "refraction",
    "depth",
    "brightness",
    "zoom",
    "originX",
    "originY",
    "impactX",
    "impactY",
    "impulse",
    "impactFrame",
    "colorModeIndex"
  ],
  "tapColorCycle": true
}
END_SETKA_PATTERN_DESCRIPTOR */
(()=>{
"use strict";
const registry=window.SetkaPatternRegistryV1;
const id=document.currentScript?.dataset.patternId;
if(!id||!registry?.has(id))return;
const caches=new WeakMap();
const vertex="attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0.,1.);}";
const fragment="precision mediump float;\nvarying vec2 v;uniform vec2 res,origin,impact;uniform float t,waves,refraction,depth,brightness,zoom,mode,impulse;\nfloat caustic(vec2 p){float x=0.;for(int i=0;i<3;i++){float f=float(i)+1.;vec2 q=p*f*.9+vec2(sin(t*.19*f),cos(t*.16*f));q+=vec2(sin(q.y*1.7+t*.37),cos(q.x*1.5-t*.29))*.45;float a=sin(q.x*2.5+sin(q.y*2.1+t*.3));float b=sin(q.y*2.8+cos(q.x*2.3-t*.24));x+=pow(1.-abs(a*b),10.)/f;}return x;}\nvoid main(){vec2 p=(v-.5)*vec2(res.x/res.y,1.)*3./zoom-origin;float r=length(p-impact);float ripple=sin(r*22.-t*6.)*exp(-r*3.)*impulse;vec2 q=p+vec2(sin(p.y*3.+t*.32),cos(p.x*2.7-t*.27))*.12*waves;q+=normalize(p-impact+vec2(.001))*ripple*.08;float c=caustic(q*refraction);float c2=caustic(q*refraction*1.7+vec2(2.7,4.1));float light=clamp(c*.7+c2*.2,0.,2.)*brightness;float beam=pow(max(0.,sin(p.x*2.4+p.y*.5+t*.08)),8.)*.15;float falloff=exp(-max(0.,-p.y+.2)*depth*.5);vec3 base,shine;if(mode<.5){base=vec3(.006);shine=vec3(1.);}else if(mode<1.5){base=vec3(.002,.025,.045);shine=vec3(.15,.88,1.);}else if(mode<2.5){base=vec3(.005,.035,.025);shine=vec3(.25,1.,.55);}else if(mode<3.5){base=vec3(.025,.005,.055);shine=vec3(.65,.32,1.);}else if(mode<4.5){base=vec3(.045,.012,.006);shine=vec3(1.,.65,.25);}else{base=vec3(.008,.01,.025);shine=.5+.5*cos(6.28318*(vec3(0.,.33,.67)+c*.12+t*.01));}vec3 col=base+shine*(light*.55+beam)*falloff;col+=shine*pow(max(0.,ripple),2.)*.2;col*=1.-.25*length(v-.5);gl_FragColor=vec4(1.-exp(-max(col,vec3(0.))*1.6),1.);}";
function makeShader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function create(ctx){const canvas=document.createElement("canvas");const gl=canvas.getContext("webgl",{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:"low-power"});if(!gl)return null;const prog=gl.createProgram();gl.attachShader(prog,makeShader(gl,gl.VERTEX_SHADER,vertex));gl.attachShader(prog,makeShader(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))return null;gl.useProgram(prog);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(prog,"a");gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);const u={};for(const k of ["res","origin","impact","t","waves","refraction","depth","brightness","zoom","mode","impulse"])u[k]=gl.getUniformLocation(prog,k);return{canvas,gl,u};}
function render(ctx,width,height,c,frame,preview){
 const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1),f=Math.max(0,Number(frame)||0);
 if(typeof document!=="undefined"&&typeof document.createElement==="function"&&typeof ctx.drawImage==="function"){
  let cache=caches.get(ctx);
  if(!cache){try{cache=create(ctx);}catch(_){cache=null;}if(cache)caches.set(ctx,cache);}
  if(cache){
   const {canvas,gl,u}=cache,scale=Math.min(preview?.75:1,Math.sqrt(900000/(w*h)));
   const rw=Math.max(1,Math.round(w*scale)),rh=Math.max(1,Math.round(h*scale));
   if(canvas.width!==rw||canvas.height!==rh){canvas.width=rw;canvas.height=rh;gl.viewport(0,0,rw,rh);}
   const t=f/60*c.speed,age=Math.max(0,(f-c.impactFrame)/60),impulse=c.impulse*Math.exp(-age*1.8);
   gl.uniform2f(u.res,rw,rh);gl.uniform2f(u.origin,c.originX,c.originY);
   gl.uniform2f(u.impact,c.impactX,c.impactY);gl.uniform1f(u.t,t);
   for(const k of ["waves","refraction","depth","brightness","zoom"])gl.uniform1f(u[k],c[k]);
   gl.uniform1f(u.mode,c.colorModeIndex);gl.uniform1f(u.impulse,impulse);
   gl.drawArrays(gl.TRIANGLES,0,6);
   ctx.save();ctx.drawImage(canvas,0,0,w,h);ctx.restore();return;
  }
 }
 // Deterministic Canvas fallback for environments without WebGL and contract replay.
 
 ctx.save();ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);
 const t=f/60*c.speed,unit=Math.min(w,h),spacing=Math.max(9,unit/(preview?17:26)),cols=Math.ceil(w/spacing)+3,rows=Math.ceil(h/spacing)+3;
 const age=Math.max(0,(f-c.impactFrame)/60),strength=c.impulse*Math.exp(-age*1.8);
 const rgb=[[255,255,255],[60,235,255],[90,255,155],[170,110,255],[255,190,90]][Math.min(4,c.colorModeIndex)]||[255,255,255];
 const point=(i,j)=>{
  const x=i*spacing,y=j*spacing;
  const xx=(x-w*.5)/unit*3/c.zoom-c.originX,yy=(h*.5-y)/unit*3/c.zoom-c.originY;
  const r=Math.hypot(xx-c.impactX,yy-c.impactY);
  const ripple=Math.sin(r*22-t*6)*Math.exp(-r*3)*strength;
  const qx=xx+Math.sin(yy*3+t*.32)*.12*c.waves+ripple*.08;
  const qy=yy+Math.cos(xx*2.7-t*.27)*.12*c.waves+ripple*.08;
  const a=Math.sin(qx*2.5*c.refraction+Math.sin(qy*2.1+t*.3));
  const b=Math.sin(qy*2.8*c.refraction+Math.cos(qx*2.3-t*.24));
  const light=Math.pow(1-Math.abs(a*b),10)*c.brightness;
  const lift=Math.min(1.5,light)*spacing*.38;
  return{x:x+Math.sin(qy*3+t*.2)*lift,y:y+Math.cos(qx*3-t*.23)*lift,light};
 };
 ctx.strokeStyle="rgb("+rgb.join(",")+")";ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=Math.max(.45,unit/650);
 for(let j=-2;j<rows;j++){
  ctx.beginPath();
  for(let i=-2;i<cols;i++){const p=point(i,j);if(i===-2)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
  ctx.stroke();
 }
 for(let i=-2;i<cols;i++){
  ctx.beginPath();
  for(let j=-2;j<rows;j++){const p=point(i,j);if(j===-2)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
  ctx.stroke();
 }
 ctx.restore();
}
function interaction(c,e){if(e?.type==="patch")return{...c,...(e.patch||{})};if(e?.type!=="gesture")return c;const f=Math.max(0,Number(e.frame)||0);if(e.fingers===2&&e.phase==="move"){const dy=Number(e.dy)||0;return{...c,zoom:Math.max(.4,Math.min(3,c.zoom+dy/Math.max(1,Number(e.height)||1)*2))};}if(e.fingers!==1||(e.phase!=="start"&&e.phase!=="move"))return c;const w=Math.max(1,Number(e.width)||1),h=Math.max(1,Number(e.height)||1);const x=Math.max(0,Math.min(1,Number(e.x)/w)),y=Math.max(0,Math.min(1,Number(e.y)/h));return{...c,impactX:(x-.5)*w/h*3/c.zoom-c.originX,impactY:(.5-y)*3/c.zoom-c.originY,impulse:2,impactFrame:f};}
registry.bindRenderer(id,render);registry.bindInteraction?.(id,interaction);
})();
