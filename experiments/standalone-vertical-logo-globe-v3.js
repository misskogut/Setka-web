(()=>{
"use strict";
/*
  SETKA WORLD / mounted emblem — original 3D globe + Cyrillic orbit lettering.
  Single rigid body, one transform matrix, pivot = Z0 card surface. It cannot
  stretch: all coordinates are immutable object-space points; the camera stays
  fixed; every vertex uses the same rigid rotation as the flat card.
  CSS-only graceful fallback remains for WebGL-disabled browsers.
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
"uniform float uFlip;",
"vec3 colorHoney(vec3 n,float lam,float highlight,float rim){",
" float env=pow(abs(sin((n.x*.71+n.y*.23+n.z*.37)*10.8)),13.0)",
"           +.38*pow(abs(sin((n.x*1.2+n.z*.13)*3.9+2.0)),12.0);",
" vec3 rgb=vec3(87.+127.*lam+115.*env+40.*highlight,",
"               37.+104.*lam+86.*env+37.*highlight,",
"               4.+45.*lam+28.*env+20.*highlight);",
" rgb+=vec3(18.,10.,2.)*rim;",
" return clamp(rgb/255.,0.,1.);",
"}",
"void main(){",
" vec3 n=normalize(vN);",
" vec3 light=normalize(vec3(-.52,.74,1.0));",
" vec3 fill=normalize(vec3(.81,-.28,.49));",
" vec3 viewDir=normalize(vec3(.0,.0,1.0));",
" float lam=max(dot(n,light),.0),side=max(dot(n,fill),.0);",
" float highlight=pow(max(dot(reflect(-light,n),viewDir),.0),35.0);",
" float rim=pow(1.0-abs(dot(n,viewDir)),3.2);",
" vec3 col;",
" if(vMat<.5){",
"   col=colorHoney(n,lam,highlight,rim);",
" }else if(vMat<1.5){",
"   col=mix(vec3(.31,.12,.45),vec3(.65,.36,.84),clamp(lam+.30,0.,1.));",
"   col+=vec3(.30,.11,.44)*rim;",
" }else if(vMat<2.5){",
"   col=mix(vec3(.25,.10,.34),vec3(.70,.34,.89),clamp(lam+.35,0.,1.));",
" }else if(vMat<3.5){",
"   col=mix(vec3(.61,.40,.73),vec3(.99,.92,1.),clamp(.32+lam*.72,0.,1.));",
"   col+=vec3(.30,.18,.38)*highlight*.45;",
" }else if(vMat<4.5){",
"   col=mix(vec3(.15,.056,.27),vec3(.66,.33,.80),clamp(lam*.92+side*.21,0.,1.));",
"   col+=vec3(.28,.08,.37)*highlight*.5;",
" }else{col=vec3(.13,.05,.22)*(.52+lam*.4);}",
" gl_FragColor=vec4(clamp(pow(col,vec3(.91)),0.,1.),1.);",
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
 const tri=(a,b,c,na,nb,nc,m)=>{
  push(a,na,m);push(b,nb,m);push(c,nc,m);
 };
 const flat=(a,b,c,n,m)=>tri(a,b,c,n,n,n,m);
 const quad=(a,b,c,d,n,m)=>{flat(a,b,c,n,m);flat(a,c,d,n,m)};
 const C=[0,0,110],R=108;
 const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
 const plus=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
 const mul=(a,v)=>[a[0]*v,a[1]*v,a[2]*v];
 const norm=p=>{const n=Math.hypot(...p)||1;return[p[0]/n,p[1]/n,p[2]/n]};
 function sph(t,p,r=R){
   return[C[0]+r*Math.sin(t)*Math.cos(p),
          C[1]+r*Math.cos(t),
          C[2]+r*Math.sin(t)*Math.sin(p)];
 }
 // Original #08 material: closed marching-tetrahedra isosurface.
 // A single smooth union of five lobes; no latitude strips or holes.
 if(!window.SETKA_METABALL_MESH)throw Error("Missing SETKA honey geometry");
 const honey=window.SETKA_METABALL_MESH.create({steps:23,scale:94,zOffset:110});
 const surface=honey.vertices;
 for(let i=0;i<surface.length;i+=6)
  push([surface[i],surface[i+1],surface[i+2]],[surface[i+3],surface[i+4],surface[i+5]],0);

 // Two rings that cross the hemisphere at different inclinations; the
 // native depth buffer naturally hides their rear halves behind the globe.
 function tube(point,radius,mat,segments=128,sides=5){
  const pts=Array.from({length:segments},(_,i)=>point(i/segments*Math.PI*2));
  const loops=[];
  for(let i=0;i<segments;i++){
   const prev=pts[(i+segments-1)%segments],next=pts[(i+1)%segments];
   const tangent=norm(sub(next,prev));
   const ref=Math.abs(tangent[2])<.88?[0,0,1]:[0,1,0];
   const u=norm([tangent[1]*ref[2]-tangent[2]*ref[1],
                  tangent[2]*ref[0]-tangent[0]*ref[2],
                  tangent[0]*ref[1]-tangent[1]*ref[0]]);
   const v=norm([tangent[1]*u[2]-tangent[2]*u[1],
                  tangent[2]*u[0]-tangent[0]*u[2],
                  tangent[0]*u[1]-tangent[1]*u[0]]);
   loops.push(Array.from({length:sides},(_,s)=>{
      const a=2*Math.PI*s/sides;
      const n=norm(plus(mul(u,Math.cos(a)),mul(v,Math.sin(a))));
      return{pos:plus(pts[i],mul(n,radius)),n};
   }));
  }
  for(let i=0;i<segments;i++)for(let k=0;k<sides;k++){
   const a=loops[i][k],b=loops[(i+1)%segments][k],
      c=loops[(i+1)%segments][(k+1)%sides],
      d=loops[i][(k+1)%sides];
   tri(a.pos,b.pos,c.pos,a.n,b.n,c.n,mat);
   tri(a.pos,c.pos,d.pos,a.n,c.n,d.n,mat);
  }
 }
 tube(t=>[134*Math.cos(t),43*Math.sin(t),110+69*Math.sin(t+.27)],1.25,2,130,6);
 tube(t=>[86*Math.cos(t),124*Math.sin(t),110+55*Math.cos(t+.60)],.8,1,112,5);
 // Wordmark letters are real extruded outlines, each positioned and yawed
 // around a curved orbital arc in front of the globe, not billboard planes.
 function glyph(char,fontPx,step,material,position,theta){
   if(char===" ")return;
   const W=Math.ceil(fontPx*.95),H=Math.ceil(fontPx*1.25);
   const cols=Math.ceil(W/step),rows=Math.ceil(H/step);
   const off=document.createElement("canvas");
   off.width=cols*2;off.height=rows*2;
   const ctx=off.getContext("2d",{willReadFrequently:true});
   if(!ctx)return;
   ctx.font="900 "+Math.round(fontPx*2)+"px system-ui,Arial,sans-serif";
   ctx.fillStyle="white";ctx.textAlign="center";ctx.textBaseline="middle";
   ctx.fillText(char,off.width/2,off.height/2,off.width-4);
   const pixels=ctx.getImageData(0,0,off.width,off.height).data;
   const mask=new Uint8Array(cols*rows);
   for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    let sum=0;const sx=x*2,sy=y*2;
    for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++)
      sum+=pixels[((sy+yy)*off.width+sx+xx)*4+3];
    mask[y*cols+x]=sum>424?1:0;
   }
   const on=(x,y)=>x>=0&&y>=0&&x<cols&&y<rows&&mask[y*cols+x]===1;
   const ct=Math.cos(theta),st=Math.sin(theta);
   const point=(gx,gy,gz)=>[position[0]+gx*ct+gz*st,
       position[1]+gy,position[2]-gx*st+gz*ct];
   const normal=n=>norm([n[0]*ct+n[2]*st,n[1],-n[0]*st+n[2]*ct]);
   const extrusion=fontPx>.40*100?16:9;
   for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
     if(!on(x,y))continue;
     const x1=(x-cols/2)*step,x2=x1+step;
     const y1=(rows/2-y)*step,y2=y1-step;
     const B=0,F=extrusion;
     const P=(a,b,c)=>point(a,b,c);
     quad(P(x1,y2,F),P(x2,y2,F),P(x2,y1,F),P(x1,y1,F),normal([0,0,1]),material);
     quad(P(x2,y2,B),P(x1,y2,B),P(x1,y1,B),P(x2,y1,B),normal([0,0,-1]),5);
     if(!on(x-1,y))quad(P(x1,y2,B),P(x1,y2,F),P(x1,y1,F),P(x1,y1,B),normal([-1,0,0]),4);
     if(!on(x+1,y))quad(P(x2,y2,F),P(x2,y2,B),P(x2,y1,B),P(x2,y1,F),normal([1,0,0]),4);
     if(!on(x,y-1))quad(P(x1,y1,F),P(x2,y1,F),P(x2,y1,B),P(x1,y1,B),normal([0,1,0]),4);
     if(!on(x,y+1))quad(P(x2,y2,F),P(x1,y2,F),P(x1,y2,B),P(x2,y2,B),normal([0,-1,0]),4);
   }
 }
 function word(text,font,y,stepAngle,radius,raise,step){
   const letters=Array.from(text),len=letters.length;
   letters.forEach((ch,i)=>{
    if(ch===" ")return;
    const angle=(i-(len-1)/2)*stepAngle;
    const x=radius*Math.sin(angle),z=110+radius*Math.cos(angle)+raise;
    glyph(ch,font,step,3,[x,y,z],angle*.90);
   });
 }
 word("СКВИШ",52,25,.34,123,13,2.15);
 word("ДЛЯ МОЗГА",27,-75,.204,131,9,1.65);
 return{data:new Float32Array(data),planetRadius:R,center:C,honeyTriangles:honey.triangleCount,honeyBounds:honey.bounds};
}
try{
 const result=buildMesh();
 total=result.data.length/7;
 stats={vertices:total,metaballTriangles:result.honeyTriangles,metaballBounds:result.honeyBounds,
       material:"golden-honey-08",closedSurface:true,irregularCells:true};
 if(total<8000||total>280000)throw Error("Unexpected geometry size: "+total);
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
 // so the raised globe is hidden ONLY when geometrically behind the card.
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
 // box. Otherwise the globe would stretch grotesquely at the 90° midpoint.
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
 // changes, no rotating of individual components relative to the globe.
 // Match CSS screen-down rotation to WebGL's Y-up coordinate system.
 gl.uniform1f(U.flip,-angle*Math.PI/180);
 gl.uniform1f(U.scale,scale);
 gl.uniform1f(U.time,phase);
 gl.uniform3fv(U.motion,new Float32Array(movers.flatMap(m=>m.p)));
 // First draw an invisible, infinitely thin card to the DEPTH BUFFER.
 // The sphere is rendered on every frame, including angle=180° and 90°;
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
 getInfo:()=>({...stats,real3D:true,renderer:"WebGL golden honey #08",angle,active,rigid:true,continuous:true,metaball:true,animatedFluid:true,depthOcclusion:true}),
 dispose(){
  disposed=true;active=false;stopAnimation();canvas.remove();
  gl.deleteBuffer(buf);gl.deleteBuffer(plateBuffer);gl.deleteProgram(prog);
  document.body.classList.remove("setka-vlogo-webgl");
 }
};
document.body.classList.add("setka-vlogo-webgl");
render({visible:false});
})();