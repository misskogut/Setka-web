(()=>{
"use strict";
/*
  SETKA #08 — faceted liquid gold 3D metaball, mounted above the black card.
  No globe or orbital grid. Independent solid circular seal surrounds one watertight irregular
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
const vert="precision highp float;\nattribute vec3 aPosition;attribute vec3 aNormal;attribute float aMaterial;\nuniform mat4 uProjection;uniform float uFlip,uScale,uTitlePass,uLogoShift;\nuniform vec3 uTitleCenter,uTitleRight,uTitleUp;\nvarying vec3 vN,vP;varying float vAngle;varying vec2 vCaptionUV;\nvec3 rotX(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,p.y*c-p.z*s,p.y*s+p.z*c);}\nvoid main(){\n vec3 p=aPosition,n=aNormal;\n if(uTitlePass>.5&&uTitlePass<2.5){p=uTitleCenter+uTitleRight*p.x+uTitleUp*p.y+vec3(0.,0.,p.z);n=uTitleRight*n.x+uTitleUp*n.y+vec3(0.,0.,n.z);}\n vec3 world=rotX(p*uScale+vec3(0.,uLogoShift,0.),uFlip);\n vP=world;vN=normalize(rotX(n,uFlip));vAngle=aMaterial;vCaptionUV=aNormal.xy;\n gl_Position=uProjection*vec4(world.xy,world.z-1450.,1.);\n}";
const frag="precision highp float;\nvarying vec3 vN,vP;varying float vAngle;varying vec2 vCaptionUV;\nuniform float uTime,uTitlePass,uTitleHue;\nuniform sampler2D uCaption;\nvoid main(){\n if(uTitlePass>2.5){vec4 ink=texture2D(uCaption,vCaptionUV);if(ink.a<.003)discard;gl_FragColor=ink;return;}\n if(uTitlePass>.5){\n vec3 n=normalize(vN),E=normalize(vec3(0.,0.,1450.)-vP);\n vec3 L=normalize(vec3(-372.,532.,845.)-vP),H=normalize(L+E);\n float nl=max(dot(n,L),0.),nh=max(dot(n,H),0.);\n float shine=pow(nh,77.5)*1.35,sharp=pow(nh,181.25)*.81;\n float fresnel=pow(1.-clamp(abs(dot(n,E)),0.,1.),3.);\n vec3 rgb;\n if(uTitlePass<1.5){\n vec3 green=vec3(.015,.85,.42),blue=vec3(.025,.46,.95),violet=vec3(.58,.045,.95);\n vec3 jelly=uTitleHue<.5?mix(green,blue,uTitleHue*2.):mix(blue,violet,(uTitleHue-.5)*2.);\n jelly=mix(vec3(.22,.53,.77),jelly,.85);\n // Glossy inflated latex: reflect two off-camera elongated studio softboxes.\n // Their positions are in world space, not in the rotating letter UVs.\n vec3 reflection=reflect(-E,n);\n vec3 keyAxis=normalize(cross(vec3(0.,1.,0.),L));\n vec3 keyUp=normalize(cross(L,keyAxis));\n float keyX=dot(reflection,keyAxis),keyY=dot(reflection,keyUp);\n float keyFacing=smoothstep(.68,.95,dot(reflection,L));\n float keyStrip=exp(-pow(abs(keyX/.105),2.)-pow(abs(keyY/.43),2.))*keyFacing;\n float keyHalo=exp(-pow(abs(keyX/.22),2.)-pow(abs(keyY/.56),2.))*keyFacing;\n vec3 fillLight=normalize(vec3(590.,110.,710.)-vP);\n vec3 fillAxis=normalize(cross(vec3(0.,1.,0.),fillLight));\n vec3 fillUp=normalize(cross(fillLight,fillAxis));\n float fillX=dot(reflection,fillAxis),fillY=dot(reflection,fillUp);\n float fillStrip=exp(-pow(abs(fillX/.075),2.)-pow(abs(fillY/.33),2.))*smoothstep(.72,.96,dot(reflection,fillLight));\n // High contrast body colour plus bright, narrow white reflections.\n rgb=jelly*(.16+.69*nl)+jelly*fresnel*.50;\n rgb=mix(rgb,jelly*(.38+.48*nl)+fresnel*.22,clamp(vAngle,0.,1.)*.55);\n rgb+=keyHalo*vec3(.24,.28,.32)+keyStrip*vec3(1.10,1.12,1.16);\n rgb+=fillStrip*vec3(.60,.72,.87)+shine*vec3(.28,.32,.38)+sharp*.38;\n }else{\n vec3 refl=reflect(-E,n);\n vec3 spectrum=.58+.42*cos(6.283185*(refl.x*.45+refl.y*.3+vP.x*.008+uTime*.06+vec3(0.,.333,.667)));\n vec3 chrome=mix(vec3(.10,.12,.18),vec3(.96,.98,1.),smoothstep(.17,.83,.5+.5*sin(refl.y*9.+refl.x*2.)));\n rgb=chrome*(.55+.75*spectrum)+spectrum*.19+shine*.6+sharp*.3;\n }\n gl_FragColor=vec4(clamp(rgb,0.,1.),1.);return;\n }\n vec3 n=normalize(vN);\n vec3 light=normalize(vec3(-.52,.77,.95));\n vec3 specLight=normalize(vec3(-.30,.42,1.19));\n float lam=max(dot(n,light),0.);\n float rim=pow(1.-abs(n.z),2.4);\n float spec=pow(max(dot(n,specLight),0.),27.);\n float env=pow(abs(sin((n.x*.71+n.y*.23+n.z*.37)*10.8+uTime*.33)),13.)\n          +.38*pow(abs(sin((n.x*1.2+n.z*.13)*3.9+2.)),12.);\n float flick=.16*max(0.,sin(vAngle+uTime*.39));\n vec3 rgb=vec3(87.+127.*lam+115.*env+40.*spec+flick*30.,\n               37.+104.*lam+86.*env+37.*spec+flick*18.,\n               4.+45.*lam+28.*env+20.*spec+flick*4.);\n gl_FragColor=vec4(clamp(rgb/255.,0.,1.),1.);\n}";
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
 logoShift:gl.getUniformLocation(prog,"uLogoShift"),
 time:gl.getUniformLocation(prog,"uTime"),
 titlePass:gl.getUniformLocation(prog,"uTitlePass"),caption:gl.getUniformLocation(prog,"uCaption"),
 titleCenter:gl.getUniformLocation(prog,"uTitleCenter"),titleRight:gl.getUniformLocation(prog,"uTitleRight"),titleUp:gl.getUniformLocation(prog,"uTitleUp"),titleHue:gl.getUniformLocation(prog,"uTitleHue"),
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
let titlePhase=0,titleVelocity=-.121,titleDrag=null;
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const FLUID_REBUILD_MS=82;
/* Selected circular seal: real solid letters, centred at the honey's z=110 plane. */
const TITLE="СКВИШ ДЛЯ МОЗГА";
const LOGO_Y=.45;
const CAPTION=Object.freeze({text:"АНТИСТРЕСС ТРЕКЕР",y:.94,fontSize:8,spacing:3.2,weight:200,opacity:.82,depth:110});
const TITLE_PRESET=Object.freeze({
 layout:"circular-seal",depth:0,tilt:0,speed:22,clockwise:true,honeyMotion:150,honeySize:100,
 top:Object.freeze({text:"СКВИШ",font:"Mega Bubble",material:"colored-jelly",size:170,spacing:2,radius:154,rainbow:85,volume:100}),
 bottom:Object.freeze({text:"ДЛЯ МОЗГА",font:"Cyber Blade",material:"chrome-hologram",size:94,spacing:3,radius:154,rainbow:100,volume:300})
});
const megaPaths={С:"M16 4 C11 -2 1 1 1 10 C1 19 12 22 16 16",К:"M2 1 Q0 10 2 20 M17 1 Q13 7 5 10 Q13 14 17 20",В:"M2 20 V1 H8 C20 1 20 10 8 10 H2 M8 10 C21 10 21 20 8 20 H2",И:"M2 1 Q0 10 2 20 L18 1 Q20 11 18 20",Ш:"M1 1 V15 Q1 20 6 20 H20 Q25 20 25 15 V1 M13 1 V20"};
const bladePaths={Д:"M1 15 L5 1 H13 V15 M0 18 V15 H15 V18",Л:"M0 15 L6 1 H13 V15",Я:"M13 15 V1 H5 L1 5 L5 9 H13 M6 9 L1 15",М:"M1 15 V1 L7 7 L13 1 V15",О:"M5 1 H9 L13 5 V11 L9 15 H5 L1 11 V5 Z",З:"M1 1 H9 L13 5 L9 8 L13 11 L9 15 H1 M5 8 H9",Г:"M1 15 V1 H13",А:"M0 15 L7 1 L14 15 M3 10 H11"};
function strokeSegments(path,k,ox,oy){
 const a=path.match(/[A-Z]|-?(?:\d*\.)?\d+/g),out=[];
 let i=0,x=0,y=0,sx=0,sy=0;
 const line=(nx,ny)=>{out.push([x*k+ox,y*k+oy,nx*k+ox,ny*k+oy]);x=nx;y=ny;};
 while(i<a.length){
 const cmd=a[i++],num=()=>Number(a[i++]);
 if(cmd==="M"){x=num();y=num();sx=x;sy=y;}
 else if(cmd==="L")line(num(),num());
 else if(cmd==="H")line(num(),y);
 else if(cmd==="V")line(x,num());
 else if(cmd==="Z")line(sx,sy);
 else if(cmd==="Q"||cmd==="C"){
 const x0=x,y0=y,x1=num(),y1=num(),x2=num(),y2=num();
 const x3=cmd==="C"?num():x2,y3=cmd==="C"?num():y2;
 for(let j=1;j<=18;j++){const t=j/18,q=1-t;
 line(cmd==="Q"?q*q*x0+2*q*t*x1+t*t*x2:q*q*q*x0+3*q*q*t*x1+3*q*t*t*x2+t*t*t*x3,
 cmd==="Q"?q*q*y0+2*q*t*y1+t*t*y2:q*q*q*y0+3*q*q*t*y1+3*q*t*t*y2+t*t*t*y3);}
 }else throw Error("Unknown title stroke "+cmd);
 }return out;
}
// Foil balloon skin: two inflated sheets welded at their actual perimeter.
// Trace every outside AND inside outline of the signed glyph field. Corrugations
// run from that seam into the inflated sheet, rather than crossing the letter.
function balloonSeamLoops(field,S){
 const nodes=new Map(),segments=[],key=p=>p.map(v=>Math.round(v*1e6)).join(",");
 function add(p,q){
  const ka=key(p),kb=key(q);if(ka===kb)return;
  const id=segments.length;segments.push({p,q,ka,kb});
  for(const k of [ka,kb]){if(!nodes.has(k))nodes.set(k,[]);nodes.get(k).push(id);}
 }
 function tri(v){
  const cuts=[];for(let i=0;i<3;i++){const a=v[i],b=v[(i+1)%3];if((a[2]>=0)===(b[2]>=0))continue;
   const t=a[2]/(a[2]-b[2]);cuts.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
  if(cuts.length===2)add(cuts[0],cuts[1]);
 }
 const sample=(x,y)=>[x,y,field[y*S+x]];
 for(let y=0;y<S-1;y++)for(let x=0;x<S-1;x++){
  const a=sample(x,y),b=sample(x,y+1),c=sample(x+1,y+1),d=sample(x+1,y);tri([a,b,c]);tri([a,c,d]);
 }
 const used=new Set(),loops=[];
 for(let i=0;i<segments.length;i++){
  if(used.has(i))continue;
  const first=segments[i],points=[first.p],origin=first.ka;
  let current=first.kb;points.push(first.q);used.add(i);
  while(current!==origin){
   const j=(nodes.get(current)||[]).find(v=>!used.has(v));if(j===undefined)break;
   const q=segments[j],forward=q.ka===current;points.push(forward?q.q:q.p);current=forward?q.kb:q.ka;used.add(j);
  }
  if(current!==origin||points.length<4)continue;
  const edges=[];let length=0;
  for(let j=0;j<points.length-1;j++){
   const p=points[j],q=points[j+1],dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy);if(len<1e-7)continue;
   edges.push({x:p[0],y:p[1],ux:dx/len,uy:dy/len,len,arc:length});length+=len;
  }
  if(length>1)loops.push({edges,length});
 }
 return loops;
}
// Radial tension fans originate in the void inside each bend, not on
// the outside perimeter. Each ray diverges from a shared centre.
const radialTensionFans={
 С:[[10,10,[-151,-132,-112],4.6,4.5,.18]],
 К:[[15.3,10.5,[154,180,207],2.2,5.0,.19],[6.0,3.8,[67,95,120],1.3,3.6,.14],[6.0,16.5,[-120,-94,-68],1.3,3.1,.14]],
 В:[[8.6,5.5,[-155,-115,-76,-36],.85,4.2,.19],[9.1,15.1,[28,66,109,150],1.1,4.0,.16]],
 И:[[5.7,7.6,[64,95,128],2.0,4.3,.19],[14.4,13.4,[-116,-85,-52],2.0,4.3,.19]],
 Ш:[[7,13.8,[65,91,119],2.35,4.2,.115],[19,13.8,[61,89,117],2.35,4.2,.115]]
};
function radialTensionFold(ch,x,y,inside){
 let dent=0,shoulder=0,active=false;
 const edge=clamp((inside-.23)/.85,0,1),edgeFade=edge*edge*(3-2*edge);
 if(edgeFade===0)return {dent,shoulder,active};
 for(const [cx,cy,angles,r0,length,amount] of radialTensionFans[ch]||[]){
  const px=x-cx,py=y-cy,r=Math.hypot(px,py);
  if(r<r0||r>r0+length||r<1e-6)continue;
  const theta=Math.atan2(py,px);
  for(let j=0;j<angles.length;j++){
   const a=angles[j]*Math.PI/180,delta=Math.atan2(Math.sin(theta-a),Math.cos(theta-a));
   const t=(r-r0)/(length*(1-.09*(j%2)));
   if(t<=0||t>=1)continue;
   const v=delta/(.115+.045*(1-t));
   if(Math.abs(v)>1.9)continue;
   const rise=clamp(t/.27,0,1),fade=rise*rise*(3-2*rise)*(1-t)*(1-t)*edgeFade;
   const valley=Math.max(0,1-v*v),lip=Math.max(0,1-Math.pow((v-.94)/.8,2));
   const d=amount*fade*valley*valley,h=amount*.22*fade*lip*lip;
   dent=Math.max(dent,d);shoulder=Math.max(shoulder,h);
   if(d>0||h>0)active=true;
  }
 }
 return {dent,shoulder,active};
}
function solidLetter(ch,upper,preset){
 const pixelScale=upper?1.5:1,S=Math.round(96*pixelScale),unit=4.275*pixelScale,scale=preset.size*.0135,k=upper?(ch==="Ш"?3.2:3.9):5,width=upper?(ch==="Ш"?26:19):14;
 const seg=strokeSegments((upper?megaPaths:bladePaths)[ch],k*.75*pixelScale,(64-width*k/2)*.75*pixelScale,(upper?64-10*k:23)*.75*pixelScale);
 const radius=(upper?7.6:2)*k*.75*pixelScale/2,field=new Float32Array(S*S),height=new Float32Array(S*S),creases=new Float32Array(S*S);
 let foldDepth=0,foldVertices=0,protectedLowerSamples=0,protectedLowerDent=0,straightSamples=0,straightDent=0,edgeFoldDepth=0;
 const yStretch=upper&&ch==="Ш"?1.25:1;
 let xmin=S,xmax=0,ymin=S,ymax=0,peak=1;
 const strokes=seg.map(([ax,ay,bx,by])=>{const len=Math.hypot(bx-ax,by-ay)||1;return{ax,ay,len,ux:(bx-ax)/len,uy:(by-ay)/len};});
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){
 let d=-1e4;for(const q of strokes){const dx=x-q.ax,dy=y-q.ay,t=dx*q.ux+dy*q.uy,side=Math.abs(-dx*q.uy+dy*q.ux);
 const a=upper?radius-Math.hypot(t-clamp(t,0,q.len),side):Math.min(radius-side,t+radius,q.len+radius-t);d=Math.max(d,a);}

 if(!x||!y||x===S-1||y===S-1)d=Math.min(-1,d);
 field[y*S+x]=d;if(d>=0){xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);peak=Math.max(peak,d);}
 }
 const half=upper?peak*1.15:Math.max(2.85,Math.min(6.75,peak*.8+2.25)),bevel=upper?peak:Math.max(1,peak*.45);
 const seamLoops=upper?balloonSeamLoops(field,S):[];
 const base=new Float32Array(S*S);
 for(let i=0;i<field.length;i++){
  const t=clamp(field[i]/bevel,0,1);
  base[i]=half*Math.sqrt(t*(2-t));
 }
 // Smooth the medial-axis ridge of the underlying stroke union before
 // sculpting. Preserve the exact perimeter and zero-thickness seam.
 if(upper)for(let pass=0;pass<3;pass++){
  const prev=base.slice();
  for(let y=1;y<S-1;y++)for(let x=1;x<S-1;x++){
   const i=y*S+x;if(field[i]<2*pixelScale)continue;
   const t=clamp((field[i]/pixelScale-2)/3,0,1);
   const avg=(prev[i-1]+prev[i+1]+prev[i-S]+prev[i+S])*.25;
   base[i]=prev[i]+(avg-prev[i])*.62*t;
  }
 }
 for(let i=0;i<field.length;i++){
  const baseHeight=base[i];height[i]=baseHeight;
  if(!upper||baseHeight<=0)continue;
  const x=i%S,y=Math.floor(i/S);
  const gx=(x/(.75*pixelScale)-(64-width*k/2))/k;
  const gy=(y/(.75*pixelScale)-(64-10*k))/k;
  const {dent,shoulder,active}=radialTensionFold(ch,gx,gy,field[i]/(k*.75*pixelScale));
  height[i]=baseHeight*(1-dent+shoulder);
  // No raised seam band or textured shading around the perimeter.
  creases[i]=0;
  if(!active){straightSamples++;straightDent=Math.max(straightDent,Math.max(0,baseHeight-height[i])/unit*scale);}
  if((ch==="С"||ch==="Ш")&&(y-ymin)/Math.max(1,ymax-ymin)>.60&&!active){
   protectedLowerSamples++;
   protectedLowerDent=Math.max(protectedLowerDent,Math.max(0,baseHeight-height[i])/unit*scale);
  }
  if(field[i]/(k*.75*pixelScale)<=.23)edgeFoldDepth=Math.max(edgeFoldDepth,dent);
  foldDepth=Math.max(foldDepth,baseHeight*dent/unit*scale);
  if(dent>.015)foldVertices++;
 }

 const cx=(xmin+xmax)/2,cy=(ymin+ymax)/2,front=[],back=[],read=(a,x,y)=>a[clamp(Math.round(y),0,S-1)*S+clamp(Math.round(x),0,S-1)];
 const sample=(x,y)=>({x,y,d:read(field,x,y),z:read(height,x,y)});
 const cut=(a,b)=>{const t=a.d/(a.d-b.d);return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,d:0,z:0};};
 const interp=(a,x,y)=>{
  x=clamp(x,0,S-1);y=clamp(y,0,S-1);
  const ix=Math.floor(x),iy=Math.floor(y),tx=x-ix,ty=y-iy,jx=Math.min(S-1,ix+1),jy=Math.min(S-1,iy+1);
  return (a[iy*S+ix]*(1-tx)+a[iy*S+jx]*tx)*(1-ty)+(a[jy*S+ix]*(1-tx)+a[jy*S+jx]*tx)*ty;
 };
 function vertex(q,sign){
 let nx=-(read(height,q.x+1,q.y)-read(height,q.x-1,q.y))*.5,ny=(read(height,q.x,q.y+1)-read(height,q.x,q.y-1))*.5,nz=sign/(preset.volume/100);
 if(q.z===0){nx=-(read(field,q.x+1,q.y)-read(field,q.x-1,q.y));ny=read(field,q.x,q.y+1)-read(field,q.x,q.y-1);nz=0;if(Math.hypot(nx,ny)<1e-6)nz=sign;}
 if(upper){
  const d=Math.max(0,interp(field,q.x,q.y)),r=1.3*pixelScale;
  const fx=-(interp(field,q.x+r,q.y)-interp(field,q.x-r,q.y))/(2*r),fy=(interp(field,q.x,q.y+r)-interp(field,q.x,q.y-r))/(2*r);
  const t=clamp(d/bevel,0,1),z=Math.sqrt(Math.max(1e-8,t*(2-t))),slope=half/bevel*(1-t);
  const edgeMix=clamp(1-d/(3*pixelScale),0,1),w=edgeMix*edgeMix*(3-2*edgeMix);
  const a=Math.hypot(nx,ny,nz)||1,b=Math.hypot(fx*slope,fy*slope,z/(preset.volume/100))||1;
  nx=nx/a*(1-w)+fx*slope/b*w;ny=ny/a*(1-w)+fy*slope/b*w;nz=nz/a*(1-w)+sign*z/(preset.volume/100)/b*w;
 }
 ny/=yStretch;
 const l=Math.hypot(nx,ny,nz)||1;
 return [(q.x-cx)/unit*scale,(cy-q.y)/unit*scale*yStretch,sign*q.z/unit*scale*preset.volume/100,nx/l,ny/l,nz/l,upper?read(creases,q.x,q.y):0];
 }
 function tri(t){let p=[];for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3];if(a.d>=0)p.push(a);if((a.d>=0)!==(b.d>=0))p.push(cut(a,b));}
 for(let i=1;i+1<p.length;i++){const q=[p[0],p[i],p[i+1]];for(const v of q)front.push(...vertex(v,1));for(const v of q.slice().reverse())back.push(...vertex(v,-1));}}
 for(let y=0;y<S-1;y++)for(let x=0;x<S-1;x++){const a=sample(x,y),b=sample(x,y+1),c=sample(x+1,y+1),d=sample(x+1,y);tri([a,b,c]);tri([a,c,d]);}
 const data=new Float32Array(back.concat(front)),buffer=gl.createBuffer();
 if(!data.length||!data.every(Number.isFinite))throw Error("Invalid solid title "+ch);
 gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
 return {buffer,count:data.length/7,width:Math.max(4,(xmax-xmin+1)/unit)*scale,depth:2*half/unit*scale*preset.volume/100,foldDepth,foldVertices,protectedLowerSamples,protectedLowerDent,straightSamples,straightDent,edgeFoldDepth,seamLoops:seamLoops.length,height:(ymax-ymin+1)/unit*scale*yStretch,yStretch};
}
const titleParts=[TITLE_PRESET.top,TITLE_PRESET.bottom].map((preset,i)=>{
 const entries=[...preset.text].map((ch,j)=>{const g=ch===" "?null:solidLetter(ch,i===0,preset);return {g,j,width:(g?g.width:6*preset.size*.0135)+preset.spacing*preset.size*.0135};});
 const total=entries.reduce((a,e)=>a+e.width,0),span=Math.min(i===0?2.9:3.1,total/preset.radius*1.18);
 let cursor=-total/2;
 return entries.map(e=>{const offset=(i===0?Math.PI/2:-Math.PI/2)+(i===0?-1:1)*(cursor+e.width/2)/total*span;cursor+=e.width;return {...e,offset,preset,upper:i===0};}).filter(e=>e.g);
});
// A single transparent text plane in the same 3D scene as the seal.
 // The texture has no thickness or lighting, and never follows titlePhase.
let caption=null;
function makeCaption(){
 try{
  const bitmap=document.createElement("canvas"),ctx=bitmap.getContext("2d");
  if(!ctx||!ctx.measureText)return null;
  const density=4,font=CAPTION.weight+" "+CAPTION.fontSize+"px system-ui, -apple-system, sans-serif";
  ctx.font=font;
  const chars=Array.from(CAPTION.text),widths=chars.map(ch=>ctx.measureText(ch).width);
  const width=widths.reduce((sum,x)=>sum+x,0)+CAPTION.spacing*(chars.length-1)+8;
  bitmap.width=Math.ceil(width*density);bitmap.height=20*density;
  ctx.scale(density,density);ctx.font=font;ctx.textBaseline="middle";
  ctx.fillStyle="rgba(224,204,233,"+CAPTION.opacity+")";
  let x=4;
  for(let i=0;i<chars.length;i++){ctx.fillText(chars[i],x,10);x+=widths[i]+CAPTION.spacing;}
  const texture=gl.createTexture(),buffer=gl.createBuffer();
  gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  return {texture,buffer,width:bitmap.width/density,height:20,key:""};
 }catch(e){console.warn("[SETKA] flat caption fallback",e);return null}
}
caption=makeCaption();
if(caption)document.body.classList.add("setka-vlogo-caption-webgl");
function drawCaption(frame,scale){
 if(!caption)return;
 // Match the approved 94% screen position and 8px font at rest despite
 // perspective. At intermediate angles the physical plane rotates with card.
 const depth=CAPTION.depth+TITLE_PRESET.depth;
 const factor=(1450-depth*scale)/1450/scale;
 const y=(.5-CAPTION.y)*frame.h*factor,x=caption.width*.5*factor,hh=caption.height*.5*factor;
 const key=[frame.h,scale].join(":");
 if(caption.key!==key){
  const v=[[-x,y+hh,0,0],[x,y+hh,1,0],[x,y-hh,1,1],[-x,y-hh,0,1]];
  const data=[];
  for(const i of [0,3,2,0,2,1]){const p=v[i];data.push(p[0],p[1],depth,p[2],p[3],0,0);}
  gl.bindBuffer(gl.ARRAY_BUFFER,caption.buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
  caption.key=key;
 }
 gl.uniform1f(U.logoShift,0);gl.uniform1f(U.titlePass,3);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,caption.texture);gl.uniform1i(U.caption,0);
 gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
 gl.depthMask(false);bindMesh(caption.buffer);gl.drawArrays(gl.TRIANGLES,0,6);
 gl.depthMask(true);gl.disable(gl.BLEND);gl.uniform1f(U.titlePass,0);
}
function drawTitle(){
 gl.disable(gl.BLEND);gl.depthMask(true);
 for(const entries of titleParts)for(const e of entries){
 const theta=e.offset+titlePhase,cs=Math.cos(theta),sn=Math.sin(theta),sign=e.upper?1:-1,r=e.preset.radius;
 gl.uniform1f(U.titlePass,e.upper?1:2);gl.uniform1f(U.titleHue,e.j/Math.max(1,e.preset.text.length-1));
 gl.uniform3fv(U.titleCenter,[r*cs,r*sn,110+TITLE_PRESET.depth]);
 gl.uniform3fv(U.titleRight,[sign*sn,-sign*cs,0]);gl.uniform3fv(U.titleUp,[sign*cs,sign*sn,0]);
 bindMesh(e.g.buffer);gl.drawArrays(gl.TRIANGLES,0,e.g.count);
 }
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
 if(!titleDrag?.horizontal){titleVelocity+=(-.121-titleVelocity)*(1-Math.exp(-dt*1.25));titlePhase=(titlePhase+titleVelocity*dt)%(Math.PI*2);}
 // The baseline is unchanged; a tap temporarily multiplies movement energy.
 const boost=excitement;
 excitement*=Math.exp(-dt*.61);
 if(excitement<.005)excitement=0;
 // The exact approved #08 zero-gravity physics, with nonrepeating impulses.
 for(const b of movers){
  b.timer-=dt*(1+boost*.75);
  if(b.timer<=0){
   b.timer=random(.28,.85)/(1+boost*.38);
   const amplitude=(.19+.052*boost)*1.5;
   b.target=b.home.map((x,i)=>x+random(-amplitude*(i===2?.82:1),amplitude*(i===2?.82:1)));
  }
  for(let i=0;i<3;i++){
   const force=(b.target[i]-b.p[i])*(2.35+.8*boost)+(b.home[i]-b.p[i])*.48+random(-.50,.50)*(1+.8*boost)*1.5;
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
 gl.uniform1f(U.titlePass,0);

 // First draw an invisible, infinitely thin card to the DEPTH BUFFER.
 // The metaball is rendered on every frame, including angle=180° and 90°;
 // only the parts naturally behind the card are occluded. No 50% toggle.
 gl.uniform1f(U.logoShift,0);
 cardPlane(f.w,f.h,scale);
 gl.bindBuffer(gl.ARRAY_BUFFER,plateBuffer);
 bindMesh(plateBuffer);
 gl.colorMask(false,false,false,false);
 gl.depthMask(true);
 gl.drawArrays(gl.TRIANGLES,0,6);
 gl.colorMask(true,true,true,true);
 gl.uniform1f(U.logoShift,(.5-LOGO_Y)*f.h);
 bindMesh(buf);
 gl.drawArrays(gl.TRIANGLES,0,total);
 drawTitle();
 drawCaption(f,scale);
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
 canvas.style.display="none";document.body.classList.remove("setka-vlogo-webgl","setka-vlogo-caption-webgl");
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
         -(e.clientY-frame.top-frame.height*LOGO_Y)/k];
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
 getInfo:()=>({...stats,real3D:true,renderer:"WebGL original honey #08 live rebuilt",angle,active,rigid:true,continuous:true,metaball:true,faceted:true,globeDecorations:false,animatedFluid:true,liveRebuild:true,depthOcclusion:true,tapExcitation:true,excitationLevel:excitement,taps:tapCount,titleText:TITLE,titlePhase,titleVelocity,titleStyle:"circular-seal-mega-bubble-cyber-blade",titlePreset:TITLE_PRESET,logoCardCenterY:LOGO_Y,captionPlane:CAPTION,captionWebGL:!!caption,titleSolidMeshes:true,titleJellyLighting:"world-space-latex-softboxes-v1",titleBalloonFolds:"interior-radial-tension-v6",titleFoldStats:titleParts.flat().map(e=>({depth:e.g.foldDepth,vertices:e.g.foldVertices,protectedLowerSamples:e.g.protectedLowerSamples,protectedLowerDent:e.g.protectedLowerDent,straightSamples:e.g.straightSamples,straightDent:e.g.straightDent,edgeFoldDepth:e.g.edgeFoldDepth,seamLoops:e.g.seamLoops,height:e.g.height,yStretch:e.g.yStretch})),titleMeshCounts:titleParts.flat().map(e=>e.g.count),titleMeshDepths:titleParts.flat().map(e=>e.g.depth),titleNeuralPulse:false}),
 dispose(){
  disposed=true;active=false;stopAnimation();canvas.remove();
  if(caption){gl.deleteTexture(caption.texture);gl.deleteBuffer(caption.buffer);}
  gl.deleteBuffer(buf);gl.deleteBuffer(plateBuffer);for(const e of titleParts.flat())gl.deleteBuffer(e.g.buffer);gl.deleteProgram(prog);
  document.body.classList.remove("setka-vlogo-webgl","setka-vlogo-caption-webgl");
 }
};
document.body.classList.add("setka-vlogo-webgl");
render({visible:false});
})();