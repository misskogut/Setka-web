(()=>{
"use strict";
/*
  SETKA | true-volume navigation objects v2.
  One shared WebGL context, five independently triangulated solids in XYZ:
  clock with two dials, bound note with physical pages/plus, inflated heart,
  faceted crystal, and a sculpted head-and-shoulders bust.
  The navigation capsule / buttons / labels are NEVER transformed here.
  render(angle) is driven exclusively by the horizontal card swipe engine.
  No dependencies, network requests, image textures or additional contexts.
*/
if(window.SETKA_CYCLE_3D_MODELS)return;
const dock=document.getElementById("st34Nav");
if(!dock)return;
const KINDS=["today","notes","pulse","symptoms","me"];
const TAU=Math.PI*2;
const C={
  steel:[.69,.72,.83], silver:[.9,.89,.98], rim:[.47,.41,.62],
  slate:[.18,.18,.29], paper:[.84,.82,.95], purple:[.63,.34,.73],
  heart:[.79,.25,.47], red:[.88,.36,.52], crystal:[.53,.34,.82],
  skin:[.68,.66,.83], shadow:[.27,.24,.42], gold:[.94,.78,.51],
  ink:[.30,.30,.47]
};
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
   // Complete three-dimensional watch case, front/rear faceplates, raised
   // metallic bezels, tick markers and hands on BOTH sides.
   cylinder(0,0,0,.82,.32,C.steel);
   for(const s of [-1,1]){
     cylinder(0,0,s*.174,.72,.03,C.rim);
     cylinder(0,0,s*.200,.62,.015,C.slate);
     for(let k=0;k<12;k++){
       const a=k*TAU/12;
       rod(Math.sin(a)*.47,Math.cos(a)*.47,
           Math.sin(a)*.56,Math.cos(a)*.56,s*.229,
           k%3===0?.055:.026,.026,C.silver);
     }
     rod(0,0,-.29,.23,s*.255,.075,.038,C.silver);
     rod(0,0,.07,.40,s*.274,.055,.038,C.gold);
     ellipsoid(0,0,s*.29,.065,.065,.045,C.gold,7,12);
   }
   // The crown is a separate radial cylinder, visually distinct at 90deg.
   box(.84,.02,0,.18,.17,.24,C.silver);
 }
 function note(){
   // Small solid paper notebook: offset pages, cover, bound spine and a
   // raised '+' on both covers (not a flat plus extruded backwards).
   box(0,0,0,1.19,1.39,.28,C.steel);
   box(.045,-.025,.0,1.02,1.21,.35,C.paper);
   box(0,0,.205,1.19,1.39,.085,C.rim);
   box(0,0,-.205,1.19,1.39,.085,C.rim);
   for(const s of [-1,1]){
     box(.04,-.08,s*.265,.67,.11,.065,C.silver);
     box(.04,-.08,s*.284,.11,.67,.065,C.silver);
     for(let k=0;k<4;k++)
       ellipsoid(-.52,.46-k*.30,s*.26,.083,.061,.085,C.gold,7,10);
   }
   // Tabs along the sheet edge emphasize the independent page thickness.
   for(let k=0;k<3;k++)box(.58,-.39+k*.21,-.005,.11,.11,.26,C.silver);
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
   // Head is a closed, round 3D ellipsoid, not the old flat user glyph.
   // Shoulders are separate sculpted 3D solids; the nose casts a side shadow.
   ellipsoid(0,-.43,0,.77,.43,.43,C.rim,14,25);
   ellipsoid(0,-.64,.06,.66,.31,.44,C.shadow,12,23);
   cylinder(0,-.06,0,.205,.44,C.steel,18);
   ellipsoid(0,.40,0,.39,.50,.38,C.skin,17,28);
   ellipsoid(-.35,.35,-.004,.087,.19,.18,C.rim,10,14);
   ellipsoid(.35,.35,-.004,.087,.19,.18,C.rim,10,14);
   ellipsoid(0,.25,.39,.09,.13,.12,C.silver,10,14);
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
const info=models.map(m=>({key:m.key,vertexCount:m.vertices.length/9,
  object3D:true,solidMesh:true}));
let canvas=null,gl=null,program=null,buffer=null;
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
     premultipliedAlpha:true,preserveDrawingBuffer:false,powerPreference:"low-power"});
   if(!gl)throw Error("WebGL unavailable");
   const vs=shader(gl.VERTEX_SHADER,[
     "precision highp float;",
     "attribute vec3 aPos;attribute vec3 aNormal;attribute vec3 aColor;",
     "uniform float uAngle;uniform float uIntensity;",
     "varying vec3 vNormal;varying vec3 vColor;varying vec3 vPosition;",
     "void main(){",
     " float c=cos(uAngle),s=sin(uAngle);",
     " mat3 rot=mat3(c,0.,-s, 0.,1.,0., s,0.,c);",
     " vec3 p=rot*aPos;",
     " float z=3.65-p.z;",
     " gl_Position=vec4(p.x*3.65,p.y*3.65,(z-2.)*1.3,z);",
     " vNormal=normalize(rot*aNormal);vColor=aColor*uIntensity;vPosition=p;",
     "}"
   ].join("\n"));
   const fs=shader(gl.FRAGMENT_SHADER,[
     "precision mediump float;",
     "varying vec3 vNormal;varying vec3 vColor;varying vec3 vPosition;",
     "void main(){",
     " vec3 n=normalize(vNormal);",
     " vec3 light=normalize(vec3(-.42,.72,1.0));",
     " float lit=.40+.61*max(dot(n,light),0.);",
     " vec3 eye=normalize(vec3(0.,0.,3.65)-vPosition);",
     " vec3 halfDir=normalize(light+eye);",
     " float gloss=pow(max(dot(n,halfDir),0.),25.)*.30;",
     " vec3 col=clamp(vColor*lit+vec3(gloss),0.,1.);",
     " gl_FragColor=vec4(col,1.);",
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
   for(const [name,size,offset] of [["aPos",3,0],["aNormal",3,12],["aColor",3,24]]){
     const loc=gl.getAttribLocation(program,name);
     gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,36,offset);
   }
   gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
   gl.enable(gl.SCISSOR_TEST);gl.disable(gl.CULL_FACE);
   gl.clearColor(0,0,0,0);
   const uAngle=gl.getUniformLocation(program,"uAngle");
   const uIntensity=gl.getUniformLocation(program,"uIntensity");
   gl.uniform1f(uAngle,0);gl.uniform1f(uIntensity,1);
   canvas.addEventListener("webglcontextlost",event=>{event.preventDefault();fail()});
   canvas.addEventListener("webglcontextrestored",()=>{location.reload()});
   live=true;
   dock.classList.add("setka-cycle-webgl-objects");
   return{uAngle,uIntensity};
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
   const size=Math.round(Math.min(35*ratio,w*ratio/5*.75));
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
   gl.uniform1f(uniforms.uIntensity,r.intensity);
   gl.drawArrays(gl.TRIANGLES,m.offset,m.vertices.length/9);
 }
 renderCount++;
}
function render(degrees){
 lastAngle=Number.isFinite(degrees)?degrees:0;
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
   oneWebGLContext:true,staticDock:true,trueVolume:true,
   vertexCount:info.reduce((s,x)=>s+x.vertexCount,0)})
};
})();