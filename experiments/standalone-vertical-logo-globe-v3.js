(()=>{
"use strict";
/*
  SETKA #08 — faceted liquid gold 3D metaball, mounted above the black card.
  No globe or orbital grid. Independent wireframe title circles one watertight irregular
  tetrahedral surface; its individual face normals and facet palettes survive
  3D rotation and aperiodic zero-gravity deformation. CSS fallback on WebGL loss.
*/
const card=document.getElementById("setkaVerticalLogoCard");
if(!card||window.SETKA_SOLID_WORDMARK)return;
const canvas=document.createElement("canvas");
canvas.id="setkaVerticalSolidText";
canvas.setAttribute("aria-hidden","true");
canvas.style.cssText=[
 "position:fixed","left:50%","top:var(--setka-cycle-card-top,12px)",
 "width:min(calc(100% - 28px),432px)",
 "height:calc(100dvh - var(--setka-cycle-card-top,12px) - var(--setka-vlogo-card-bottom,calc(8px + env(safe-area-inset-bottom,0px))))",
 "transform:translateX(-50%)","pointer-events:none","z-index:144",
 "background:transparent","display:none","contain:layout style"
].join(";")+";";
document.body.appendChild(canvas);
let gl=null;
try{gl=canvas.getContext("webgl",{alpha:true,depth:true,antialias:true,
 premultipliedAlpha:true,preserveDrawingBuffer:false,powerPreference:"low-power"})}catch(_){}
if(!gl){canvas.remove();return}
function shader(kind,src){
 const sh=gl.createShader(kind);gl.shaderSource(sh,src);gl.compileShader(sh);
 if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){
   const problem=gl.getShaderInfoLog(sh);gl.deleteShader(sh);
   throw Error("GL shader: "+problem);
 }
 return sh;
}
const vert="precision highp float;\nattribute vec3 aPosition;attribute vec3 aNormal;attribute float aMaterial;\nuniform mat4 uProjection;uniform float uFlip;uniform float uScale;uniform float uTitlePass;uniform vec2 uTitleViewport;\nvarying vec3 vN;varying float vAngle;\nvec3 rotX(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,p.y*c-p.z*s,p.y*s+p.z*c);}\nvoid main(){\n vec3 p=aPosition*uScale;\n vec3 world=rotX(p,uFlip);\n vN=normalize(rotX(aNormal,uFlip));\n vAngle=aMaterial;\n gl_Position=uProjection*vec4(world.xy,world.z-1450.,1.);\n if(uTitlePass>.5){\n  vec3 end=rotX((aPosition+aNormal)*uScale,uFlip);\n  vec4 other=uProjection*vec4(end.xy,end.z-1450.,1.);\n  vec2 delta=(other.xy/other.w-gl_Position.xy/gl_Position.w)*uTitleViewport;\n  float len=length(delta);vec2 perp=len>.0001?vec2(-delta.y,delta.x)/len:vec2(0.,1.);\n  float side=sign(aMaterial);\n  gl_Position.xy+=perp*side*vec2(2./uTitleViewport.x,2./uTitleViewport.y)*3.8*gl_Position.w;\n  vN=vec3(side,0.,0.);vAngle=abs(aMaterial);\n }\n}";
const frag="precision highp float;\nvarying vec3 vN;varying float vAngle;\nuniform float uTime;\nuniform float uTitlePass;\nvoid main(){\n if(uTitlePass > 0.5){\n  float channel=floor((vAngle-1.)*.5);\n  float distanceAlong=mod(vAngle-1.,2.);\n  float wave=fract(distanceAlong*3.-uTime*.48);\n  float d=(wave-.34)*8.;float pulse=exp(-d*d);\n  float edge=abs(vN.x);\n  float core=1.-smoothstep(.21,.43,edge);\n  float halo=exp(-edge*edge*5.5)*(1.-smoothstep(.77,1.,edge));\n  float weight=channel<.5?1.:(channel<1.5?.62:.74);\n  vec3 blue=mix(vec3(.27,.23,1.),vec3(.20,.90,1.),pulse);\n  vec3 hot=mix(vec3(.63,.79,1.),vec3(.98,1.,1.),pulse);\n  float alpha=weight*max(core*.97,halo*(.24+.24*pulse));\n  gl_FragColor=vec4(mix(blue,hot,core),alpha);return;\n }\n vec3 n=normalize(vN);\n vec3 light=normalize(vec3(-.52,.77,.95));\n vec3 specLight=normalize(vec3(-.30,.42,1.19));\n float lam=max(dot(n,light),0.);\n float rim=pow(1.-abs(n.z),2.4);\n float spec=pow(max(dot(n,specLight),0.),27.);\n float env=pow(abs(sin((n.x*.71+n.y*.23+n.z*.37)*10.8+uTime*.33)),13.)\n          +.38*pow(abs(sin((n.x*1.2+n.z*.13)*3.9+2.)),12.);\n float flick=.16*max(0.,sin(vAngle+uTime*.39));\n vec3 rgb=vec3(87.+127.*lam+115.*env+40.*spec+flick*30.,\n               37.+104.*lam+86.*env+37.*spec+flick*18.,\n               4.+45.*lam+28.*env+20.*spec+flick*4.);\n gl_FragColor=vec4(clamp(rgb/255.,0.,1.),1.);\n}";
let prog=null,buf=null,total=0,stats=null;
try{
 const v=shader(gl.VERTEX_SHADER,vert),f=shader(gl.FRAGMENT_SHADER,frag);
 prog=gl.createProgram();gl.attachShader(prog,v);gl.attachShader(prog,f);
 gl.linkProgram(prog);gl.deleteShader(v);gl.deleteShader(f);
 if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));
}catch(e){console.warn("[SETKA golden honey] no WebGL shader",e);canvas.remove();return}
const A={pos:gl.getAttribLocation(prog,"aPosition"),
 normal:gl.getAttribLocation(prog,"aNormal"),
 material:gl.getAttribLocation(prog,"aMaterial")};
const U={projection:gl.getUniformLocation(prog,"uProjection"),
 flip:gl.getUniformLocation(prog,"uFlip"),
 scale:gl.getUniformLocation(prog,"uScale"),
 time:gl.getUniformLocation(prog,"uTime"),
 titlePass:gl.getUniformLocation(prog,"uTitlePass"),
 titleViewport:gl.getUniformLocation(prog,"uTitleViewport"),
 motion:null};

/* Port of the original approved #08 CPU isosurface renderer.
   The entire surface is rebuilt from the moving SDF; facet normals are only
   lighting attributes and NEVER used to displace individual triangle corners. */
function buildMesh(time=0,centers=null,press=0,contact=[0,0]){
 if(!window.SETKA_METABALL_MESH)throw Error("Missing original #08 field");
 const honey=window.SETKA_METABALL_MESH.create({
  steps:23,scale:94,zOffset:110,time,centers,press,contact
 });
 const mesh=honey.vertices,out=new Float32Array(mesh.length/6*7);
 let at=0;
 for(let i=0;i<mesh.length;i+=18){
  // Original #08 computed one color per irregular polygon using its
  // averaged SDF normal and centroid, not painted grid lines.
  const cx=(mesh[i]+mesh[i+6]+mesh[i+12])/(3*94);
  const cy=(mesh[i+1]+mesh[i+7]+mesh[i+13])/(3*94);
  const angle=cx*5+cy*7;
  for(let j=i;j<i+18;j+=6){
   out[at++]=mesh[j];
   out[at++]=mesh[j+1];
   out[at++]=mesh[j+2];
   out[at++]=mesh[j+3];
   out[at++]=mesh[j+4];
   out[at++]=mesh[j+5];
   out[at++]=angle;
  }
 }
 return {data:out,honeyTriangles:honey.triangleCount,honeyBounds:honey.bounds};
}

try{
 const result=buildMesh();
 total=result.data.length/7;
 stats={vertices:total,metaballTriangles:result.honeyTriangles,metaballBounds:result.honeyBounds,
       material:"golden-honey-08-original",closedSurface:true,irregularCells:true,liveRebuild:true};
 if(total<5000||total>130000)throw Error("Unexpected geometry size: "+total);
 buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
 gl.bufferData(gl.ARRAY_BUFFER,result.data,gl.DYNAMIC_DRAW);
}catch(e){
 console.warn("[SETKA golden honey] geometry failed",e);
 canvas.remove();return;
}
gl.useProgram(prog);
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);
gl.disable(gl.CULL_FACE);
gl.clearColor(0,0,0,0);
// This invisible 3D plane is the CARD ITSELF. It writes only depth,
 // so the raised honey metaball is hidden ONLY when geometrically behind the card.
 // The WebGL canvas is above the page in compositing order, therefore CSS
 // backface-visibility cannot substitute for this depth occlusion.
const plateBuffer=gl.createBuffer();
function bindMesh(buffer){
 gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 gl.vertexAttribPointer(A.pos,3,gl.FLOAT,false,28,0);
 gl.enableVertexAttribArray(A.pos);
 gl.vertexAttribPointer(A.normal,3,gl.FLOAT,false,28,12);
 gl.enableVertexAttribArray(A.normal);
 gl.vertexAttribPointer(A.material,1,gl.FLOAT,false,28,24);
 gl.enableVertexAttribArray(A.material);
}
bindMesh(buf);
function cardPlane(w,h,scale){
 const x=w/(2*scale),y=h/(2*scale),z=0;
 const v=[-x,-y,z,x,-y,z,x,y,z,-x,y,z];
 const vertices=[];
 for(const i of [0,1,2,0,2,3]){
   const k=i*3;vertices.push(v[k],v[k+1],v[k+2],0,0,1,5);
 }
 gl.bindBuffer(gl.ARRAY_BUFFER,plateBuffer);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
}
let active=false,lost=false,disposed=false,angle=0;

const ORIGINAL=[[-.52,.34,.04],[.47,.32,-.18],[-.35,-.48,.12],[.52,-.38,.24],[0,-.06,.05]];
const random=(a,b)=>a+Math.random()*(b-a);
const movers=ORIGINAL.map(h=>({
 p:h.slice(),home:h.slice(),v:[random(-.13,.13),random(-.13,.13),random(-.13,.13)],
 target:h.slice(),timer:random(.35,.9)
}));
let phase=0,loopId=0,lastStep=0,lastPaint=0,lastMesh=0;
let press=0,pressGoal=0,contact=[0,0],activeTouch=null;
let excitement=0,tapCount=0;
let titlePhase=0,titleVelocity=.12,titleDrag=null;
const titleBuffer=gl.createBuffer();
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const FLUID_REBUILD_MS=82;
/* Thin, hollow Cyrillic capitals: front/back outline with short connecting
   edges. One phrase on a closed, tilted 3D path, no repeated copies. */
const TITLE="СКВИШ ДЛЯ МОЗГА";
const contours={
 "С":[[[9,1],[3,1],[1,3],[1,13],[3,15],[9,15],[9,13],[4,13],[3,12],[3,4],[4,3],[9,3],[9,1]]],
 "К":[[[1,1],[3,1],[3,7],[8,1],[11,1],[5,8],[11,15],[8,15],[3,9],[3,15],[1,15],[1,1]]],
 "В":[[[1,1],[7,1],[10,3],[10,6],[8,8],[11,10],[11,13],[8,15],[1,15],[1,1]],[[3,3],[7,3],[8,4],[8,6],[7,7],[3,7],[3,3]],[[3,9],[7,9],[9,10],[9,12],[7,13],[3,13],[3,9]]],
 "И":[[[1,1],[3,1],[3,11],[9,1],[11,1],[11,15],[9,15],[9,5],[3,15],[1,15],[1,1]]],
 "Ш":[[[1,1],[3,1],[3,13],[6,13],[6,1],[8,1],[8,13],[11,13],[11,1],[13,1],[13,15],[1,15],[1,1]]],
 "Д":[[[1,13],[3,13],[5,1],[11,1],[11,13],[13,13],[13,17],[11,17],[11,15],[3,15],[3,17],[1,17],[1,13]],[[5,13],[9,13],[9,3],[7,3],[5,13]]],
 "Л":[[[0,15],[3,1],[11,1],[11,15],[9,15],[9,3],[5,3],[2,15],[0,15]]],
 "Я":[[[11,1],[4,1],[1,3],[1,7],[4,9],[0,15],[3,15],[7,9],[9,9],[9,15],[11,15],[11,1]],[[9,3],[4,3],[3,4],[3,6],[4,7],[9,7],[9,3]]],
 "М":[[[1,15],[1,1],[3,1],[7,8],[11,1],[13,1],[13,15],[11,15],[11,5],[7,11],[3,5],[3,15],[1,15]]],
 "О":[[[3,1],[9,1],[11,3],[11,13],[9,15],[3,15],[1,13],[1,3],[3,1]],[[4,3],[8,3],[9,4],[9,12],[8,13],[4,13],[3,12],[3,4],[4,3]]],
 "З":[[[1,1],[8,1],[11,3],[11,6],[9,8],[11,10],[11,13],[8,15],[1,15],[1,13],[7,13],[9,12],[9,10],[7,9],[4,9],[4,7],[7,7],[9,6],[9,4],[7,3],[1,3],[1,1]]],
 "Г":[[[1,1],[11,1],[11,3],[3,3],[3,15],[1,15],[1,1]]],
 "А":[[[0,15],[5,1],[8,1],[13,15],[10,15],[9,11],[4,11],[3,15],[0,15]],[[5,9],[8,9],[6.5,4],[5,9]]]
};
const titleWidths={"Ш":14,"М":14,"А":14,"Д":14,"С":11," ":7};
function titleGeometry(){
 const out=[],segments=[],R=145,depth=99,tilt=.36,unit=1.35;
 let travelled=0;
 const widths=[...TITLE].map(c=>titleWidths[c]||12);
 const span=widths.reduce((a,b)=>a+b+2,0)*unit;
 let cursor=-span/2;
 function point(theta,x,y,z){
  const sn=Math.sin(theta),cs=Math.cos(theta);
  const px=R*sn+x*cs+z*sn;
  const pz=depth*cs-x*sn+z*cs;
  return [px*Math.cos(tilt)-y*Math.sin(tilt),px*Math.sin(tilt)+y*Math.cos(tilt)-18,110+pz];
 }
 function line(a,b,channel,start,end){segments.push({a,b,channel,start,end})}
 [...TITLE].forEach((c,i)=>{
  const width=widths[i],theta=titlePhase+(cursor+width*unit/2)/R;
  cursor+=(width+2)*unit;
  for(const contour of contours[c]||[]){
   const at=(p,z)=>point(theta,(p[0]-width/2)*unit,(8-p[1])*unit,z);
   for(let j=0;j<contour.length-1;j++){
    const a=contour[j],b=contour[j+1];
    const length=Math.hypot(b[0]-a[0],b[1]-a[1])*unit;
    const start=travelled,end=travelled+length;
    line(at(a,0),at(b,0),0,start,end);
    line(at(a,-3.2),at(b,-3.2),1,start,end);
    line(at(a,0),at(a,-3.2),2,start,start);
    travelled=end;
   }
  }
 });
 // Expand every 3D contour segment to a camera-facing ribbon. Unlike
 // gl.lineWidth this is consistently thick on mobile Safari and desktop.
 for(const {a,b,channel,start,end} of segments){
  const delta=b.map((v,i)=>v-a[i]);
  if(Math.hypot(...delta)<.0001)continue;
  const t0=1+channel*2+start/Math.max(1,travelled)*.999;
  const t1=1+channel*2+end/Math.max(1,travelled)*.999;
  for(const [p,t,side] of [[a,t0,-1],[a,t0,1],[b,t1,-1],[b,t1,-1],[a,t0,1],[b,t1,1]])out.push(...p,...delta,t*side);
 }
 return new Float32Array(out);
}
function drawTitle(){
 const data=titleGeometry();
 gl.bindBuffer(gl.ARRAY_BUFFER,titleBuffer);
 bindMesh(titleBuffer);
 // Explicit draw-pass selection: the honey facet phase can be negative too.
 gl.uniform1f(U.titlePass,1);
 gl.enable(gl.BLEND);
 gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
 gl.depthMask(false);
 // Keep small chunks for mobile GPU uploads; each has whole triangles.
 const chunk=6*7*200;
 for(let i=0;i<data.length;i+=chunk){
  const part=data.subarray(i,i+chunk);
  gl.bufferData(gl.ARRAY_BUFFER,part,gl.DYNAMIC_DRAW);
  gl.drawArrays(gl.TRIANGLES,0,part.length/7);
 }
 gl.depthMask(true);
 gl.disable(gl.BLEND);
 gl.uniform1f(U.titlePass,0);
}
// All 5 moving lobes are resampled into ONE watertight isosurface.
// No GPU position changes depend on separately shaded polygon normals.
function refreshFluid(){
 const result=buildMesh(phase,movers.map(q=>q.p),press,contact);
 const count=result.data.length/7;
 if(count<5000||count>160000)throw Error("Unexpected live mesh size: "+count);
 gl.bindBuffer(gl.ARRAY_BUFFER,buf);
 gl.bufferData(gl.ARRAY_BUFFER,result.data,gl.DYNAMIC_DRAW);
 total=count;
 stats.vertices=count;
 stats.metaballTriangles=result.honeyTriangles;
 stats.metaballBounds=result.honeyBounds;
}
// Tapping the visible honey energizes all five lobes for a few seconds.
// Repeated taps build intensity, which decays smoothly; the fluid stays whole.
function exciteHoney(x,y){
 excitement=Math.min(2.25,excitement+1.1);
 tapCount++;
 contact=[x,y];press=Math.min(.65,press+.44);pressGoal=0;
 for(let i=0;i<movers.length;i++){
  const b=movers[i],dx=b.p[0]-x,dy=b.p[1]-y;
  const distance=Math.hypot(dx,dy),falloff=Math.exp(-distance*distance*2.3);
  const force=(.27+.24*falloff)*(1+.24*excitement);
  const direction=1/(distance+.25);
  b.v[0]=clamp(b.v[0]+force*dx*direction+random(-.20,.20),-.78,.78);
  b.v[1]=clamp(b.v[1]+force*dy*direction+random(-.20,.20),-.78,.78);
  b.v[2]=clamp(b.v[2]+random(-.35,.35),-.78,.78);
  b.timer=Math.min(b.timer,.06);
 }
 // Render the deformation on the very next animation frame.
 lastMesh=0;
}
function fluidInput(x,y,dx,dy){
 contact=[x,y];pressGoal=.43;
 for(const b of movers){
  const distance=(b.p[0]-x)**2+(b.p[1]-y)**2;
  const influence=Math.exp(-distance*3);
  b.v[0]+=dx*2.4*influence;
  b.v[1]+=dy*2.4*influence;
 }
}
function animate(now){
 loopId=0;
 if(!active||lost||disposed)return;
 const dt=lastStep?Math.min(.05,(now-lastStep)/1000):.016;
 lastStep=now;phase+=dt;
 if(!titleDrag?.horizontal){titleVelocity+=(.12-titleVelocity)*(1-Math.exp(-dt*1.25));titlePhase=(titlePhase+titleVelocity*dt)%(Math.PI*2);}
 // The baseline is unchanged; a tap temporarily multiplies movement energy.
 const boost=excitement;
 excitement*=Math.exp(-dt*.61);
 if(excitement<.005)excitement=0;
 // The exact approved #08 zero-gravity physics, with nonrepeating impulses.
 for(const b of movers){
  b.timer-=dt*(1+boost*.75);
  if(b.timer<=0){
   b.timer=random(.28,.85)/(1+boost*.38);
   const amplitude=.19+.052*boost;
   b.target=b.home.map((x,i)=>x+random(-amplitude*(i===2?.82:1),amplitude*(i===2?.82:1)));
  }
  for(let i=0;i<3;i++){
   const force=(b.target[i]-b.p[i])*(2.35+.8*boost)+(b.home[i]-b.p[i])*.48+random(-.50,.50)*(1+.8*boost);
   b.v[i]=(b.v[i]+force*dt)*Math.exp(-.83*dt);
   b.v[i]=clamp(b.v[i],-.43-.14*boost,.43+.14*boost);
   b.p[i]+=b.v[i]*dt;
   // Bound the fluid inside the SDF volume; no clipped outer lobes or holes.
   const maxDrift=i===2?.22:.27;
   b.p[i]=clamp(b.p[i],b.home[i]-maxDrift,b.home[i]+maxDrift);
   if(Math.abs(b.p[i]-b.home[i])>=maxDrift-.0001)b.v[i]*=-.32;
  }
 }
 press+=(pressGoal-press)*Math.min(1,dt*8);
 if(now-lastMesh>=FLUID_REBUILD_MS){
  try{refreshFluid()}catch(error){
   console.warn("[SETKA #08] live mesh frame skipped",error);
  }
  lastMesh=now;
 }
 if(now-lastPaint>32){paint();lastPaint=now}
 loopId=requestAnimationFrame(animate);
}
function startAnimation(){if(!loopId&&active&&!lost&&!disposed)loopId=requestAnimationFrame(animate)}
function stopAnimation(){
 if(loopId){cancelAnimationFrame(loopId);loopId=0}
 lastStep=0;lastMesh=0;pressGoal=0;activeTouch=null;titleDrag=null;
}
function projection(frame){
 const D=1450,near=.5,far=3800,f=2*D/frame.renderH,nf=1/(near-far);
 return new Float32Array([
    f/frame.aspect,0,0,0, 0,f,0,0,
    0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0
 ]);
}
function resize(){
 // Use the untransformed card dimensions, not its changing rotated bounding
 // box. Otherwise the 3D model would stretch grotesquely at the 90° midpoint.
 const w=card.offsetWidth||Math.min(window.innerWidth-28,432);
 const h=card.offsetHeight||Math.max(400,window.innerHeight-110);
 // Add transparent overscan around the flat card so the planet can extend
 // past its edge while the user holds it at an intermediate rotation.
 const padX=72,padY=60,renderW=w+2*padX,renderH=h+2*padY;
 const dpr=Math.min(1.8,window.devicePixelRatio||1);
 const pw=Math.max(2,Math.round(renderW*dpr)),ph=Math.max(2,Math.round(renderH*dpr));
 if(canvas.width!==pw||canvas.height!==ph){
   canvas.style.width=renderW+"px";
   canvas.style.height=renderH+"px";
   canvas.style.top="calc(var(--setka-cycle-card-top,12px) - "+padY+"px)";
   canvas.width=pw;canvas.height=ph;gl.viewport(0,0,pw,ph);
 }
 return{w,h,renderW,renderH,aspect:renderW/renderH};
}
function paint(){
 if(!active||lost||disposed)return;
 const f=resize(),scale=Math.min(1,Math.max(.62,(f.w-34)/370));
 gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.useProgram(prog);
 gl.uniformMatrix4fv(U.projection,false,projection(f));
 // All elements move as one solid frame. No extra tilt, no perspective
 // changes, no rotating of individual components relative to the metaball.
 // Match CSS screen-down rotation to WebGL's Y-up coordinate system.
 gl.uniform1f(U.flip,-angle*Math.PI/180);
 gl.uniform1f(U.scale,scale);
 gl.uniform1f(U.time,phase);
 gl.uniform2f(U.titleViewport,f.renderW,f.renderH);
 gl.uniform1f(U.titlePass,0);

 // First draw an invisible, infinitely thin card to the DEPTH BUFFER.
 // The metaball is rendered on every frame, including angle=180° and 90°;
 // only the parts naturally behind the card are occluded. No 50% toggle.
 cardPlane(f.w,f.h,scale);
 gl.bindBuffer(gl.ARRAY_BUFFER,plateBuffer);
 bindMesh(plateBuffer);
 gl.colorMask(false,false,false,false);
 gl.depthMask(true);
 gl.drawArrays(gl.TRIANGLES,0,6);
 gl.colorMask(true,true,true,true);
 bindMesh(buf);
 gl.drawArrays(gl.TRIANGLES,0,total);
 drawTitle();
}
function render(opts={}){
 if(disposed||lost)return;
 active=opts.visible!==false;
 angle=Number.isFinite(opts.angle)?opts.angle:0;
 canvas.style.display=active?"block":"none";
 if(active){paint();startAnimation();}
 else stopAnimation();
}
canvas.addEventListener("webglcontextlost",e=>{
 e.preventDefault();lost=true;active=false;stopAnimation();
 canvas.style.display="none";document.body.classList.remove("setka-vlogo-webgl");
});
canvas.addEventListener("webglcontextrestored",()=>location.reload());
window.addEventListener("resize",()=>{if(active)paint()},{passive:true});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&active)paint()});

/* The approved chat preview allows gently squeezing/pulling the liquid.
   Observe touches passively so the existing vertical card swipe still works. */
function fluidPointerXY(e){
 const w=card.offsetWidth||360,h=card.offsetHeight||600;
 const frame=card.getBoundingClientRect();
 const scale=Math.min(1,Math.max(.62,(w-34)/370));
 const k=94*scale;
 return [(e.clientX-frame.left-frame.width/2)/k,
         -(e.clientY-frame.top-frame.height/2)/k];
}
/* Horizontal swipes turn the title belt; vertical swipes still belong to
   the card. Keep the existing honey pointer listeners independent. */
card.addEventListener("pointerdown",e=>{
 if(!active||lost||disposed||Math.abs(angle%360)>12||(e.pointerType==="mouse"&&e.button!==0))return;
 titleDrag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastT:performance.now(),horizontal:false,vertical:false};
},{passive:true});
card.addEventListener("pointermove",e=>{
 const p=titleDrag;if(!p||p.id!==e.pointerId||p.vertical)return;
 const dx=e.clientX-p.x,dy=e.clientY-p.y;
 if(!p.horizontal){
  if(Math.abs(dy)>11&&Math.abs(dy)>Math.abs(dx)*1.1){p.vertical=true;return}
  if(Math.abs(dx)<11||Math.abs(dx)<Math.abs(dy)*1.3)return;
  p.horizontal=true;
 }
 const t=performance.now(),delta=(e.clientX-p.lastX)/Math.max(80,(card.offsetWidth||360)*.37);
 titlePhase=(titlePhase+delta)%(Math.PI*2);
 titleVelocity=clamp(delta/Math.max(.012,(t-p.lastT)/1000),-6,6);
 p.lastX=e.clientX;p.lastT=t;
},{passive:true});
function endTitle(e){
 if(titleDrag?.id!==e.pointerId)return;
 if(titleDrag.horizontal&&performance.now()-titleDrag.lastT>110)titleVelocity=0;
 titleDrag=null;
}
card.addEventListener("pointerup",endTitle,{passive:true});
card.addEventListener("pointercancel",endTitle,{passive:true});
card.addEventListener("lostpointercapture",endTitle,{passive:true});
card.addEventListener("pointerdown",e=>{
 if(!active||lost||disposed||(e.pointerType==="mouse"&&e.button!==0))return;
 const p=fluidPointerXY(e);
 if(Math.hypot(p[0],p[1])>1.05)return;
 activeTouch={id:e.pointerId,p,px:e.clientX,py:e.clientY,startX:e.clientX,startY:e.clientY,started:performance.now(),travel:0};
 contact=p;pressGoal=.2;
},{passive:true});
card.addEventListener("pointermove",e=>{
 if(!activeTouch||activeTouch.id!==e.pointerId)return;
 const p=fluidPointerXY(e);
 const scale=Math.min(1,Math.max(.62,(card.offsetWidth-34)/370));
 const unit=94*scale;
 const dx=(e.clientX-activeTouch.px)/unit;
 const dy=-(e.clientY-activeTouch.py)/unit;
 activeTouch.travel=Math.max(activeTouch.travel,Math.hypot(e.clientX-activeTouch.startX,e.clientY-activeTouch.startY));
 fluidInput(p[0],p[1],dx,dy);
 activeTouch.p=p;activeTouch.px=e.clientX;activeTouch.py=e.clientY;
},{passive:true});
function endFluidPointer(e,cancelled=false){
 if(!activeTouch||activeTouch.id!==e.pointerId)return;
 const pointer=activeTouch;activeTouch=null;pressGoal=0;
 const distance=Math.max(pointer.travel,Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY));
 const elapsed=performance.now()-pointer.started;
 // A short tap activates the honey. A vertical or horizontal swipe does not.
 if(!cancelled&&active&&!lost&&!disposed&&Math.abs(angle%360)<12&&distance<13&&elapsed<500)
  exciteHoney(pointer.p[0],pointer.p[1]);
}
card.addEventListener("pointerup",e=>endFluidPointer(e),{passive:true});
card.addEventListener("pointercancel",e=>endFluidPointer(e,true),{passive:true});
window.SETKA_SOLID_WORDMARK={
 render,
 getInfo:()=>({...stats,real3D:true,renderer:"WebGL original honey #08 live rebuilt",angle,active,rigid:true,continuous:true,metaball:true,faceted:true,globeDecorations:false,animatedFluid:true,liveRebuild:true,depthOcclusion:true,tapExcitation:true,excitationLevel:excitement,taps:tapCount,titleText:TITLE,titlePhase,titleVelocity,titleStyle:"electro-neon-contours",titleNeuralPulse:true}),
 dispose(){
  disposed=true;active=false;stopAnimation();canvas.remove();
  gl.deleteBuffer(buf);gl.deleteBuffer(plateBuffer);gl.deleteBuffer(titleBuffer);gl.deleteProgram(prog);
  document.body.classList.remove("setka-vlogo-webgl");
 }
};
document.body.classList.add("setka-vlogo-webgl");
render({visible:false});
})();