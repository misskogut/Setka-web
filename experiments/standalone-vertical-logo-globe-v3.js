(()=>{
"use strict";
/*
  SETKA #08 — faceted liquid gold 3D metaball, mounted above the black card.
  No globe, orbital rings or orbit lettering. One watertight irregular
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
const vert=[
"precision highp float;",
"attribute vec3 aPosition;attribute vec3 aNormal;attribute float aMaterial;",
"uniform mat4 uProjection;uniform float uFlip;uniform float uScale;",
"uniform float uTime;uniform vec3 uMotion[5];",
"varying vec3 vN;varying vec3 vLocal;varying float vMat;",
"vec3 rotX(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,p.y*c-p.z*s,p.y*s+p.z*c);}",
"void main(){",
"  vec3 p=aPosition;",
"  if(aMaterial<.5){",
"   vec3 q=(p-vec3(0.,0.,110.))/94.;",
"   vec3 home[5];",
"   home[0]=vec3(-.52,.34,.04);home[1]=vec3(.47,.32,-.18);",
"   home[2]=vec3(-.35,-.48,.12);home[3]=vec3(.52,-.38,.24);home[4]=vec3(0.,-.06,.05);",
"   vec3 offset=vec3(0.);float weight=.0001;",
"   for(int i=0;i<5;i++){vec3 d=q-home[i];float w=exp(-dot(d,d)*3.2);offset+=w*uMotion[i];weight+=w;}",
"   offset/=weight;",
"   float a=sin(q.x*4.7+uTime*1.03)*sin(q.y*3.1-uTime*.68);",
"   float b=cos(q.z*4.9-uTime*.81)*sin(q.x*2.9+uTime*.43);",
"   p+=94.*offset+aNormal*(3.2*a+2.4*b);",
"  }",
"  p*=uScale;",
"  vec3 world=rotX(p,uFlip);",
"  vN=normalize(rotX(aNormal,uFlip));",
"  vLocal=aPosition;vMat=aMaterial;",
"  gl_Position=uProjection*vec4(world.xy,world.z-1450.0,1.0);",
"}"
].join("\n");
const frag=[
"precision highp float;",
"varying vec3 vN;varying vec3 vLocal;varying float vMat;",
"vec3 colorHoney(vec3 n,float lam,float highlight,float rim){",
" float env=pow(abs(sin((n.x*.71+n.y*.23+n.z*.37)*10.8)),13.0)",
"         +.38*pow(abs(sin((n.x*1.2+n.z*.13)*3.9+2.0)),12.0);",
" vec3 rgb=vec3(87.+127.*lam+115.*env+40.*highlight,",
"               37.+104.*lam+86.*env+37.*highlight,",
"               4.+45.*lam+28.*env+20.*highlight);",
" rgb+=vec3(18.,10.,2.)*rim;",
" return clamp(rgb/255.,0.,1.);",
"}",
"void main(){",
" vec3 n=normalize(vN);",
" vec3 key=normalize(vec3(-.52,.77,.95));",
" vec3 bounce=normalize(vec3(.63,-.19,.69));",
" vec3 view=vec3(0.,0.,1.);",
" float lam=max(dot(n,key),0.);",
" float fill=max(dot(n,bounce),0.);",
" float spec=pow(max(dot(reflect(-key,n),view),0.),27.);",
" float rim=pow(1.-abs(dot(n,view)),2.4);",
" vec3 honey=colorHoney(n,lam+fill*.08,spec,rim);",
" // Material channel encodes a stable per-triangle luminance value.",
" // This makes each irregular polygon visible without drawing grid lines.",
" float facet=.84+clamp(vMat,0.,.45)*.52;",
" gl_FragColor=vec4(clamp(pow(honey*facet,vec3(.91)),0.,1.),1.);",
"}"
].join("\n");
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
 motion:gl.getUniformLocation(prog,"uMotion[0]")};
function buildMesh(){
 const data=[];
 const push=(p,n,m)=>data.push(p[0],p[1],p[2],n[0],n[1],n[2],m);
 // Original #08 material: closed marching-tetrahedra isosurface.
 // A single smooth union of five lobes; no latitude strips or holes.
 if(!window.SETKA_METABALL_MESH)throw Error("Missing SETKA honey geometry");
 const honey=window.SETKA_METABALL_MESH.create({steps:16,scale:94,zOffset:110});
 const surface=honey.vertices;
 // Separate normals and one golden tone per triangle (not per vertex).
 for(let i=0;i<surface.length;i+=18){
  const mx=(surface[i]+surface[i+6]+surface[i+12])/3;
  const my=(surface[i+1]+surface[i+7]+surface[i+13])/3;
  const mz=(surface[i+2]+surface[i+8]+surface[i+14])/3;
  const variance=Math.sin(mx*.31+my*.43+mz*.19)*Math.cos(mx*.27-mz*.23);
  const facet=.035+.385*(.5+.5*variance);
  // One normal per triangle, as in the approved #08 Canvas preview:
  // the honey mesh has visibly different polygon faces, NOT smooth shading.
  const nx=surface[i+3]+surface[i+9]+surface[i+15];
  const ny=surface[i+4]+surface[i+10]+surface[i+16];
  const nz=surface[i+5]+surface[i+11]+surface[i+17];
  const length=Math.hypot(nx,ny,nz)||1;
  const faceNormal=[nx/length,ny/length,nz/length];
  for(let j=i;j<i+18;j+=6)
   push([surface[j],surface[j+1],surface[j+2]],faceNormal,facet);;
 }
 return{data:new Float32Array(data),honeyTriangles:honey.triangleCount,honeyBounds:honey.bounds};
}
try{
 const result=buildMesh();
 total=result.data.length/7;
 stats={vertices:total,metaballTriangles:result.honeyTriangles,metaballBounds:result.honeyBounds,
       material:"golden-honey-08",closedSurface:true,irregularCells:true};
 if(total<5000||total>130000)throw Error("Unexpected geometry size: "+total);
 buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
 gl.bufferData(gl.ARRAY_BUFFER,result.data,gl.STATIC_DRAW);
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
const movers=Array.from({length:5},()=>({p:[0,0,0],v:[0,0,0],target:[0,0,0],next:0}));
let phase=0,loopId=0,lastStep=0,lastPaint=0;
const random=(a,b)=>a+Math.random()*(b-a);
function animate(now){
 loopId=0;if(!active||lost||disposed)return;
 const dt=lastStep?Math.min(.05,(now-lastStep)/1000):.016;
 lastStep=now;phase+=dt;
 for(const m of movers){
  m.next-=dt;
  if(m.next<=0){m.next=random(.35,.95);m.target=[random(-.17,.17),random(-.17,.17),random(-.17,.17)];}
  for(let j=0;j<3;j++){
   const force=(m.target[j]-m.p[j])*2.15-m.p[j]*.24+random(-.32,.32);
   m.v[j]=(m.v[j]+force*dt)*Math.exp(-.82*dt);
   m.v[j]=Math.max(-.33,Math.min(.33,m.v[j]));
   m.p[j]+=m.v[j]*dt;
  }
 }
 if(now-lastPaint>36){paint();lastPaint=now;}
 loopId=requestAnimationFrame(animate);
}
function startAnimation(){if(!loopId&&active&&!lost&&!disposed)loopId=requestAnimationFrame(animate)}
function stopAnimation(){if(loopId){cancelAnimationFrame(loopId);loopId=0;}lastStep=0;}
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
 gl.uniform3fv(U.motion,new Float32Array(movers.flatMap(m=>m.p)));
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
window.SETKA_SOLID_WORDMARK={
 render,
 getInfo:()=>({...stats,real3D:true,renderer:"WebGL faceted honey #08",angle,active,rigid:true,continuous:true,metaball:true,faceted:true,globeDecorations:false,animatedFluid:true,depthOcclusion:true}),
 dispose(){
  disposed=true;active=false;stopAnimation();canvas.remove();
  gl.deleteBuffer(buf);gl.deleteBuffer(plateBuffer);gl.deleteProgram(prog);
  document.body.classList.remove("setka-vlogo-webgl");
 }
};
document.body.classList.add("setka-vlogo-webgl");
render({visible:false});
})();