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
 "height:calc(100dvh - var(--setka-cycle-card-top,12px) - var(--setka-cycle-card-bottom,84px))",
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
"varying vec3 vN;varying vec3 vLocal;varying float vMat;",
"vec3 rotX(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,p.y*c-p.z*s,p.y*s+p.z*c);}",
"void main(){",
"  vec3 p=aPosition*uScale;",
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
"vec3 colorPlanet(vec3 normal){",
" vec3 n=normalize(normal);",
" float lat=asin(clamp(n.y,-.999,.999));",
" float lon=atan(n.z,n.x);",
" float mer=smoothstep(.984,.998,cos(lon*12.0));",
" float par=smoothstep(.984,.998,cos(lat*13.0));",
" float grid=max(mer,par)*.70;",
" vec3 deep=mix(vec3(.025,.018,.064),vec3(.14,.062,.26),",
"      clamp(.52+n.y*.31+.21*sin(lon*2.2),.0,1.0));",
" return deep+vec3(.20,.095,.37)*grid;",
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
"   col=colorPlanet(normalize(vLocal-vec3(0.,0.,110.)));",
"   col*=.45+.55*lam+.18*side;",
"   col+=vec3(.17,.05,.26)*rim+vec3(.35,.16,.57)*highlight*.29;",
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
}catch(e){console.warn("[SETKA 3D globe] no WebGL shader",e);canvas.remove();return}
const A={pos:gl.getAttribLocation(prog,"aPosition"),
 normal:gl.getAttribLocation(prog,"aNormal"),
 material:gl.getAttribLocation(prog,"aMaterial")};
const U={projection:gl.getUniformLocation(prog,"uProjection"),
 flip:gl.getUniformLocation(prog,"uFlip"),
 scale:gl.getUniformLocation(prog,"uScale")};
function buildMesh(){
 const data=[];
 const push=(p,n,m)=>data.push(p[0],p[1],p[2],n[0],n[1],n[2],m);
 const tri=(a,b,c,na,nb,nc,m)=>{
  push(a,na);push(b,nb);push(c,nc);
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
 const latCount=30,lonCount=68;
 for(let i=0;i<latCount;i++){
  for(let j=0;j<lonCount;j++){
   const t0=i*Math.PI/latCount,t1=(i+1)*Math.PI/latCount;
   const p0=j*2*Math.PI/lonCount,p1=(j+1)*2*Math.PI/lonCount;
   const a=sph(t0,p0),b=sph(t1,p0),c=sph(t1,p1),d=sph(t0,p1);
   tri(a,b,c,norm(sub(a,C)),norm(sub(b,C)),norm(sub(c,C)),0);
   tri(a,c,d,norm(sub(a,C)),norm(sub(c,C)),norm(sub(d,C)),0);
  }
 }
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
 return{data:new Float32Array(data),planetRadius:R,center:C};
}
try{
 const result=buildMesh();
 total=result.data.length/7;
 stats={vertices:total,globeRadius:result.planetRadius,
       globeCenterZ:result.center[2],minimumGlobeZ:result.center[2]-result.planetRadius};
 if(total<8000||total>280000)throw Error("Unexpected geometry size: "+total);
 buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
 gl.bufferData(gl.ARRAY_BUFFER,result.data,gl.STATIC_DRAW);
}catch(e){
 console.warn("[SETKA 3D globe] geometry failed",e);
 canvas.remove();return;
}
gl.useProgram(prog);
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);
gl.disable(gl.CULL_FACE);
gl.clearColor(0,0,0,0);
gl.bindBuffer(gl.ARRAY_BUFFER,buf);
gl.vertexAttribPointer(A.pos,3,gl.FLOAT,false,28,0);
gl.enableVertexAttribArray(A.pos);
gl.vertexAttribPointer(A.normal,3,gl.FLOAT,false,28,12);
gl.enableVertexAttribArray(A.normal);
gl.vertexAttribPointer(A.material,1,gl.FLOAT,false,28,24);
gl.enableVertexAttribArray(A.material);
let active=false,lost=false,disposed=false,angle=0;
function projection(frame){
 const D=1450,near=.5,far=3800,f=2*D/frame.h,nf=1/(near-far);
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
 const dpr=Math.min(1.8,window.devicePixelRatio||1);
 const pw=Math.max(2,Math.round(w*dpr)),ph=Math.max(2,Math.round(h*dpr));
 if(canvas.width!==pw||canvas.height!==ph){
   canvas.width=pw;canvas.height=ph;gl.viewport(0,0,pw,ph);
 }
 return{w,h,aspect:w/h};
}
function paint(){
 if(!active||lost||disposed)return;
 const f=resize(),scale=Math.min(1,Math.max(.62,(f.w-34)/370));
 gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.useProgram(prog);
 gl.uniformMatrix4fv(U.projection,false,projection(f));
 // All elements move as one solid frame. No extra tilt, no perspective
 // changes, no rotating of individual components relative to the globe.
 gl.uniform1f(U.flip,angle*Math.PI/180);
 gl.uniform1f(U.scale,scale);
 gl.drawArrays(gl.TRIANGLES,0,total);
}
function render(opts={}){
 if(disposed||lost)return;
 active=opts.visible!==false;
 angle=Number.isFinite(opts.angle)?opts.angle:0;
 canvas.style.display=active?"block":"none";
 if(active)paint();
}
canvas.addEventListener("webglcontextlost",e=>{
 e.preventDefault();lost=true;active=false;
 canvas.style.display="none";document.body.classList.remove("setka-vlogo-webgl");
});
canvas.addEventListener("webglcontextrestored",()=>location.reload());
window.addEventListener("resize",()=>{if(active)paint()},{passive:true});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&active)paint()});
window.SETKA_SOLID_WORDMARK={
 render,
 getInfo:()=>({...stats,real3D:true,renderer:"WebGL globe v3",angle,active,rigid:true}),
 dispose(){
  disposed=true;active=false;canvas.remove();
  gl.deleteBuffer(buf);gl.deleteProgram(prog);
  document.body.classList.remove("setka-vlogo-webgl");
 }
};
document.body.classList.add("setka-vlogo-webgl");
render({visible:false});
})();