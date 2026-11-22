(()=>{
"use strict";
/*
  SETKA | minimalist white-outline navigation objects v2.
  Original 22px white SVG icons remain pixel-identical at rest.
  During horizontal turning, five genuine XYZ solids reveal rounded side
  contours as WHITE THIN LINES ONLY: no new colored or filled icons.
  One shared WebGL context, five independently triangulated solid meshes.
  The navigation capsule / buttons / labels are NEVER transformed here.
  render(angle) is driven exclusively by the horizontal card swipe engine.
  No dependencies, network requests, image textures or additional contexts.
*/
if(window.SETKA_CYCLE_3D_MODELS)return;
const dock=document.getElementById("st34Nav");
if(!dock)return;
const KINDS=["today","notes","pulse","symptoms","me"];
const TAU=Math.PI*2;
// Mesh color attributes are white; the fragment shader only reveals the
// geometric view-dependent contour, never the filled surface or a material.
const WHITE=[1,1,1];
const C=Object.fromEntries(["steel","silver","rim","slate","paper",
  "purple","heart","red","crystal","skin","shadow","gold","ink"]
  .map(key=>[key,WHITE]));
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const n=Math.hypot(...a)||1;return a.map(x=>x/n)};
function builder(){
 const data=[];
 function vertex(p,n,c){data.push(...p,...n,...c)}
 function tri(a,b,c,color){
   const n=norm(cross(sub(b,a),sub(c,a)));
   vertex(a,n,color);vertex(b,n,color);vertex(c,n,color);
 }
 function smooth(points,faces,color){
   const ns=points.map(()=>[0,0,0]);
   for(const [a,b,c] of faces){
     const n=cross(sub(points[b],points[a]),sub(points[c],points[a]));
     for(const i of [a,b,c])ns[i]=[ns[i][0]+n[0],ns[i][1]+n[1],ns[i][2]+n[2]];
   }
   for(const [a,b,c] of faces){
     for(const i of [a,b,c])vertex(points[i],norm(ns[i]),color);
   }
 }
 function quad(a,b,c,d,color){tri(a,b,c,color);tri(a,c,d,color)}
 function box(x,y,z,w,h,d,color){
   const X=w/2,Y=h/2,Z=d/2;
   const a=[x-X,y-Y,z+Z],b=[x+X,y-Y,z+Z],c=[x+X,y+Y,z+Z],e=[x-X,y+Y,z+Z];
   const f=[x-X,y-Y,z-Z],g=[x+X,y-Y,z-Z],i=[x+X,y+Y,z-Z],j=[x-X,y+Y,z-Z];
   quad(a,b,c,e,color);quad(g,f,j,i,color);
   quad(f,a,e,j,color);quad(b,g,i,c,color);quad(e,c,i,j,color);quad(f,g,b,a,color);
 }
 function rod(x1,y1,x2,y2,z,width,thick,color){
   const vx=x2-x1,vy=y2-y1,n=Math.hypot(vx,vy)||1;
   const dx=-vy/n*width/2,dy=vx/n*width/2,Z=thick/2;
   const p=[x1+dx,y1+dy],q=[x2+dx,y2+dy],r=[x2-dx,y2-dy],s=[x1-dx,y1-dy];
   const a=[p[0],p[1],z+Z],b=[s[0],s[1],z+Z],c=[r[0],r[1],z+Z],d=[q[0],q[1],z+Z];
   const e=[p[0],p[1],z-Z],f=[s[0],s[1],z-Z],g=[r[0],r[1],z-Z],h=[q[0],q[1],z-Z];
   quad(a,b,c,d,color);quad(f,e,h,g,color);
   quad(e,a,d,h,color);quad(b,f,g,c,color);quad(d,c,g,h,color);quad(e,f,b,a,color);
 }
 function cylinder(cx,cy,cz,r,depth,color,n=28){
   const lo=cz-depth/2,hi=cz+depth/2;
   for(let i=0;i<n;i++){
     const a=i*TAU/n,b=(i+1)*TAU/n;
     const ax=cx+r*Math.cos(a),ay=cy+r*Math.sin(a),bx=cx+r*Math.cos(b),by=cy+r*Math.sin(b);
     tri([cx,cy,hi],[ax,ay,hi],[bx,by,hi],color);
     tri([cx,cy,lo],[bx,by,lo],[ax,ay,lo],color);
     quad([ax,ay,lo],[bx,by,lo],[bx,by,hi],[ax,ay,hi],color);
   }
 }
 function ellipsoid(cx,cy,cz,rx,ry,rz,color,stacks=13,slices=22){
   const pts=[],faces=[];
   for(let i=0;i<=stacks;i++){
     const lat=-Math.PI/2+Math.PI*i/stacks;
     for(let j=0;j<=slices;j++){
       const lng=TAU*j/slices;
       pts.push([cx+rx*Math.cos(lat)*Math.cos(lng),cy+ry*Math.sin(lat),cz+rz*Math.cos(lat)*Math.sin(lng)]);
     }
   }
   for(let i=0;i<stacks;i++)for(let j=0;j<slices;j++){
     const a=i*(slices+1)+j,b=a+slices+1;
     faces.push([a,b,a+1],[a+1,b,b+1]);
   }
   smooth(pts,faces,color);
 }
 function inflatedHeart(){
   // Each XY ring follows the real heart silhouette, continuously inflated
   // across Z. The silhouette and side cross-sections change with viewpoint:
   // this cannot be reproduced by copying a flat outline into depth slices.
   const sides=48,rings=20,pts=[],faces=[];
   for(let k=0;k<=rings;k++){
     const q=-1+2*k/rings;
     const f=Math.sqrt(Math.max(.001,1-q*q));
     const z=q*.54;
     for(let i=0;i<=sides;i++){
       const t=TAU*i/sides;
       const x=(16*Math.sin(t)**3)/17;
       const y=(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/17;
       pts.push([x*.93*f,(y+.015)*.93*f,z]);
     }
   }
   for(let k=0;k<rings;k++)for(let i=0;i<sides;i++){
     const a=k*(sides+1)+i,b=a+sides+1;
     faces.push([a,a+1,b],[a+1,b+1,b]);
   }
   // Wind triangles outward. The outer surface faces the volume's exterior.
   const t0=faces[Math.round(faces.length/3)];
   const p0=pts[t0[0]],p1=pts[t0[1]],p2=pts[t0[2]];
   const outward=cross(sub(p1,p0),sub(p2,p0));
   if(dot(outward,[p0[0],p0[1]*.6,p0[2]])<0)
      for(const f of faces){const t=f[1];f[1]=f[2];f[2]=t}
   smooth(pts,faces,C.heart);
 }
 function clock(){
   // Keep the original simple clock-sketch identity: one round outline and
   // two hands, with a REAL rounded case. No markers, crown or metal paint.
   cylinder(0,0,0,.79,.43,C.steel,48);
   for(const sign of [-1,1]){
     cylinder(0,0,sign*.23,.70,.012,C.rim,48);
     rod(0,0,0,.38,sign*.26,.062,.037,C.silver);
     rod(0,0,.29,-.18,sign*.27,.054,.037,C.silver);
   }
 }
 function note(){
   // The source icon is a minimalist PLUS, not a notebook. Represent the
   // EXACT SAME cross with two intersecting rounded 3D capsule-like bars.
   ellipsoid(0,0,0,.115,.72,.265,C.silver,15,26);
   ellipsoid(0,0,0,.72,.115,.265,C.silver,15,26);
 }
 function diamond(){
   // A faceted double-crown jewel with true beveled side surfaces.
   // Two inner girdles and two apexes: the lateral facets remain visible
   // throughout a Y rotation, not just a thick silhouette line.
   const n=16,outer=[],front=[],rear=[];
   for(let i=0;i<n;i++){
     const a=TAU*i/n+Math.PI/8;
     const x=Math.cos(a),y=Math.sin(a);
     outer.push([x*.83,y*.92,0]);
     front.push([x*.49,y*.60,.40]);
     rear.push([x*.49,y*.60,-.40]);
   }
   const nose=[0,0,.76],tail=[0,0,-.76];
   for(let i=0;i<n;i++){
     const j=(i+1)%n;
     const shade=i%4===0?C.silver:i%2?C.crystal:C.steel;
     quad(outer[i],outer[j],front[j],front[i],shade);
     quad(outer[j],outer[i],rear[i],rear[j],i%2?C.rim:C.purple);
     tri(nose,front[i],front[j],i%2?C.paper:C.crystal);
     tri(tail,rear[j],rear[i],i%2?C.steel:C.rim);
   }
 }
 function bust(){
   // Original sketch: only a round head and simple shoulder outline.
   // Two closed curved XYZ surfaces create a real head and curved shoulders.
   ellipsoid(0,-.48,0,.81,.46,.43,C.silver,18,36);
   ellipsoid(0,.39,0,.36,.39,.36,C.silver,18,32);
 }
 function get(){return new Float32Array(data)}
 return{tri,quad,box,rod,cylinder,ellipsoid,clock,note,inflatedHeart,diamond,bust,get};
}
const models=KINDS.map((key,i)=>{
 const b=builder();
 if(key==="today")b.clock();
 if(key==="notes")b.note();
 if(key==="pulse")b.inflatedHeart();
 if(key==="symptoms")b.diamond();
 if(key==="me")b.bust();
 return{key,index:i,vertices:b.get()};
});
// We retain five REAL closed XYZ solids. For a 22px monochrome sketch,
// however, their triangulation must never leak into the visual strokes.
// Find each solid's projected outer silhouette using 48 radial support rays:
// ONE perimeter, not the hundreds of intersecting polygon edges that
// previously made the clock, heart and profile look like tangled wire.
function buildSilhouetteSamples(model){
  const raw=model.vertices,unique=new Map();
  for(let i=0;i<raw.length;i+=9){
    const x=raw[i],y=raw[i+1],z=raw[i+2];
    const id=[x,y,z].map(v=>Math.round(v*200)).join("/");
    if(!unique.has(id))unique.set(id,[x,y,z]);
  }
  model.silhouetteSamples=Array.from(unique.values());
}
for(const model of models)buildSilhouetteSamples(model);
const HULL_STEPS=48;
function project(p,c,s){
  const z=-s*p[0]+c*p[2];
  const k=3.65/(3.65-z);
  return[(c*p[0]+s*p[2])*k,p[1]*k];
}
function outlineHull(points,c,s,steps=HULL_STEPS){
  const projected=points.map(p=>project(p,c,s));
  const selected=[];
  for(let i=0;i<steps;i++){
    const a=TAU*i/steps,dx=Math.cos(a),dy=Math.sin(a);
    let best=-Infinity,bi=-1;
    for(let j=0;j<projected.length;j++){
      const p=projected[j],v=p[0]*dx+p[1]*dy;
      if(v>best){best=v;bi=j}
    }
    if(bi<0)continue;
    if(!selected.length||selected[selected.length-1]!==bi)selected.push(bi);
  }
  if(selected.length>1&&selected[0]===selected[selected.length-1])selected.pop();
  const out=[];
  for(let i=0;i<selected.length;i++){
    const pa=points[selected[i]],pb=points[selected[(i+1)%selected.length]];
    if(Math.hypot(...sub(pa,pb))<.015)continue;
    out.push(...pa,...pb);
  }
  return out;
}
function strokedLine(out,a,b){out.push(...a,...b)}
function outlineFor(model,radians){
  const c=Math.cos(radians),s=Math.sin(radians);
  // This is a *viewpoint-dependent projection of the real 3D solid*,
  // not a duplicate copy of an SVG shifted along Z.
  if(model.key==="today"){
    const out=outlineHull(model.silhouetteSamples,c,s);
    // The native clock icon has just two hands. No concentric dial rings,
    // dozens of tick marks or crown/metal ornament in the 3D sketch.
    if(Math.abs(c)>.22){
      const z=c>=0?.27:-.27;
      strokedLine(out,[0,0,z],[0,.39,z]);
      strokedLine(out,[0,0,z],[.29,-.19,z]);
    }
    return new Float32Array(out);
  }
  if(model.key==="notes"){
    // Preserve the tiny '+' sign: two continuous rods in 3D. The
    // horizontal rod foreshortens naturally and the pair has real Z depth.
    const out=[],z=c>=0?.24:-.24;
    strokedLine(out,[0,-.67,z],[0,.67,z]);
    strokedLine(out,[-.67,0,z],[.67,0,z]);
    if(Math.abs(s)>.68){
      // Only two short side edges, not another whole outline on top.
      strokedLine(out,[0,.67,-.23],[0,.67,.23]);
      strokedLine(out,[0,-.67,-.23],[0,-.67,.23]);
    }
    return new Float32Array(out);
  }
  if(model.key==="me"){
    const out=[];
    // True ellipsoid silhouette in the camera-facing tangent plane.
    // Head and SHOULDER ARCH only: no lower-body oval, overlapping
    // sphere rings, ears or newly drawn facial features.
    function contour(cx,cy,rx,ry,rz,start,end,steps){
      const r=Math.max(.0001,Math.hypot(rx*c,rz*s));
      let previous=null;
      for(let i=0;i<=steps;i++){
        const a=start+(end-start)*i/steps;
        const p=[cx+(rx*rx*c/r)*Math.cos(a),
                 cy+ry*Math.sin(a),
                 (rz*rz*s/r)*Math.cos(a)];
        if(previous)strokedLine(out,previous,p);
        previous=p;
      }
    }
    contour(0,.39,.36,.39,.36,0,TAU,30);
    contour(0,-.48,.81,.46,.43,0,Math.PI,24);
    // The shoulder curve connects to the short straight sides of original
    // SVG profile, but does not draw an enclosing bottom ellipse.
    const shoulderR=Math.max(.0001,Math.hypot(.81*c,.43*s));
    const left=[-.81*.81*c/shoulderR,-.48,-.43*.43*s/shoulderR],
          right=[.81*.81*c/shoulderR,-.48,.43*.43*s/shoulderR];
    strokedLine(out,left,[left[0],-.78,left[2]]);
    strokedLine(out,right,[right[0],-.78,right[2]]);
    return new Float32Array(out);
  }
  // Heart is the inflated 3D heart solid; the diamond is its actual
  // faceted volume. One smooth changing silhouette each (no mesh grid).
  return new Float32Array(outlineHull(model.silhouetteSamples,c,s));
}
const info=models.map(m=>({key:m.key,vertexCount:m.vertices.length/9,
  object3D:true,solidMesh:true,surfaceEdges:m.silhouetteSamples.length,
  silhouetteSegmentsMax:60}));
let canvas=null,gl=null,program=null,buffer=null,outlineBuffer=null;
let live=false,lastAngle=0,renderCount=0,rects=[],lastW=0,lastH=0;
const dpr=()=>Math.min(2,Math.max(1,window.devicePixelRatio||1));
function fail(){
 live=false;
 if(canvas){canvas.remove();canvas=null}
 dock.classList.remove("setka-cycle-webgl-objects");
}
function shader(type,src){
 const x=gl.createShader(type);gl.shaderSource(x,src);gl.compileShader(x);
 if(!gl.getShaderParameter(x,gl.COMPILE_STATUS)){
   const detail=gl.getShaderInfoLog(x);gl.deleteShader(x);throw Error(detail);
 }
 return x;
}
function init(){
 canvas=document.createElement("canvas");
 canvas.id="setkaCycle3DObjects";
 canvas.setAttribute("aria-hidden","true");
 canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;background:transparent;";
 dock.appendChild(canvas);
 try{
   gl=canvas.getContext("webgl",{alpha:true,depth:true,antialias:true,
     premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:"low-power"});
   if(!gl)throw Error("WebGL unavailable");
   const vs=shader(gl.VERTEX_SHADER,[
     "precision highp float;",
     "attribute vec3 aPos;",
     "uniform float uAngle;",
     "void main(){",
     " float c=cos(uAngle),s=sin(uAngle);",
     " vec3 p=vec3(c*aPos.x+s*aPos.z,aPos.y,-s*aPos.x+c*aPos.z);",
     " float z=3.65-p.z;",
     " gl_Position=vec4(p.x*3.65,p.y*3.65,(z-2.)*1.3,z);",
     "}"
   ].join("\n"));
   const fs=shader(gl.FRAGMENT_SHADER,[
     "precision mediump float;",
     "void main(){",
     " // Only actual XYZ silhouette/crease LINES: no filled faces or colors.",
     " gl_FragColor=vec4(1.0,1.0,1.0,1.0);",
     "}"
   ].join("\n"));
   program=gl.createProgram();
   gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))
     throw Error(gl.getProgramInfoLog(program));
   gl.deleteShader(vs);gl.deleteShader(fs);
   gl.useProgram(program);
   buffer=gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   let total=0;
   for(const m of models){m.offset=total;total+=m.vertices.length/9}
   const all=new Float32Array(total*9);
   let at=0;for(const m of models){all.set(m.vertices,at);at+=m.vertices.length}
   gl.bufferData(gl.ARRAY_BUFFER,all,gl.STATIC_DRAW);
   const loc=gl.getAttribLocation(program,"aPos");
   gl.enableVertexAttribArray(loc);
   gl.vertexAttribPointer(loc,3,gl.FLOAT,false,36,0);
   outlineBuffer=gl.createBuffer();
   gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
   gl.enable(gl.SCISSOR_TEST);gl.disable(gl.CULL_FACE);
   gl.clearColor(0,0,0,0);
   const uAngle=gl.getUniformLocation(program,"uAngle");
   gl.uniform1f(uAngle,0);
   canvas.addEventListener("webglcontextlost",event=>{event.preventDefault();fail()});
   canvas.addEventListener("webglcontextrestored",()=>{location.reload()});
   live=true;
   dock.classList.add("setka-cycle-webgl-objects");
   return{uAngle};
 }catch(error){
   console.warn("[SETKA 3D nav] WebGL unavailable, retaining original SVG",error);
   fail();return null;
 }
}
const uniforms=init();
function measure(){
 if(!live)return;
 const navRect=dock.getBoundingClientRect();
 const w=dock.clientWidth||navRect.width,h=dock.clientHeight||navRect.height;
 if(w<100||h<32)return;
 const ratio=dpr(),pw=Math.round(w*ratio),ph=Math.round(h*ratio);
 if(canvas.width!==pw||canvas.height!==ph){
   canvas.width=pw;canvas.height=ph;gl.viewport(0,0,pw,ph);
   lastW=pw;lastH=ph;
 }
 const icons=dock.querySelectorAll(".st-dock-icon");
 if(icons.length!==KINDS.length)return;
 const tabs=dock.querySelectorAll("button[data-p]");
 rects=Array.from(icons,(icon,i)=>{
   const r=icon.getBoundingClientRect();
   const cx=(r.left+r.width/2-navRect.left)*ratio;
   const cy=(r.top+r.height/2-navRect.top)*ratio;
   // Respect the exact existing 22px dock glyph size, including on iPhone.
   const size=Math.round(Math.min(22*ratio,r.width*ratio));
   const tab=icon.closest("button");
   return{x:Math.round(cx-size/2),y:Math.round(ph-(cy+size/2)),
     size,intensity:tab?.classList.contains("active")?1:0.85,
     key:tab?.dataset?.p||KINDS[i]};
 });
}
function draw(angle){
 if(!live||!uniforms)return;
 // During vertical flip, a transformed #app changes DOM bounding boxes.
 // Preserve the stationary nav's last calibrated icon positions: the canvas
 // itself travels with the dock as part of the logo-facing physical card.
 const vertical=document.body.classList.contains("setka-vlogo-flip-active");
 if(!vertical||rects.length!==KINDS.length)measure();
 if(!rects.length||!canvas.width||!canvas.height)return;
 gl.useProgram(program);
 gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 gl.uniform1f(uniforms.uAngle,angle*Math.PI/180);
 // Clear all pixels (with scissor) including previous objects; keep alpha 0.
 gl.scissor(0,0,canvas.width,canvas.height);
 gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 for(let i=0;i<models.length;i++){
   const r=rects[i],m=models[i];
   if(r.size<10||r.x<0||r.y<0||r.x+r.size>canvas.width||r.y+r.size>canvas.height)continue;
   gl.viewport(r.x,r.y,r.size,r.size);
   gl.scissor(r.x,r.y,r.size,r.size);
   gl.clear(gl.DEPTH_BUFFER_BIT);
   const lines=outlineFor(m,angle*Math.PI/180);
   m.lineVertices=lines.length/3;
   if(lines.length<6)continue;
   gl.bindBuffer(gl.ARRAY_BUFFER,outlineBuffer);
   gl.bufferData(gl.ARRAY_BUFFER,lines,gl.DYNAMIC_DRAW);
   gl.vertexAttribPointer(gl.getAttribLocation(program,"aPos"),3,gl.FLOAT,false,12,0);
   gl.drawArrays(gl.LINES,0,lines.length/3);
 }
 renderCount++;
}
function render(degrees){
 lastAngle=Number.isFinite(degrees)?degrees:0;
 // Native SVG is exact at rest (0/180). As the real card turns, crossfade
 // into the view-dependent white wire silhouette. No size / color jump.
 // Don't ghost the 3D edge over the original sketch as soon as the card
 // moves a few degrees: early frames must remain visually identical.
 const depth=Math.abs(Math.sin(lastAngle*Math.PI/180));
 const t=Math.max(0,Math.min(1,(depth-.26)/.62));
 const ink=t*t*(3-2*t);
 dock.style.setProperty("--setka-dock-3d-blend",ink.toFixed(4));
 draw(lastAngle);
}
function rest(onCycle){render(onCycle?180:0)}
if(live){
 window.addEventListener("resize",()=>render(lastAngle),{passive:true});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)render(lastAngle)});
}
window.SETKA_CYCLE_3D_MODELS={
 render,rest,isLive:()=>live,
 getAngle:()=>lastAngle,
 getInfo:()=>({live,renderCount,drawCalls:models.length,models:info,
   lastLineVertices:models.map(m=>m.lineVertices||0),
   oneWebGLContext:true,staticDock:true,trueVolume:true,
   lineOnly:true,silhouetteOnly:true,strokeColor:"white",nativeSizePx:22,
   vertexCount:info.reduce((s,x)=>s+x.vertexCount,0)})
};
})();