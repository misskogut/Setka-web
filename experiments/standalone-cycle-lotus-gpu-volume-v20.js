(()=>{
"use strict";
/* ALMA v20 GPU volume: one original live SVG, physically intersecting a 3D
   card body. No path squeeze, second flower or screen-space crop. */
if(window.SETKA_CYCLE_LOTUS_AXIS)return;
const DEG=Math.PI/180, CLEARANCE=10;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const iframe=document.getElementById("setkaCycleBack")?.querySelector("iframe");
let view=null,turning=false,lastP=0,lastDirection=-1,frames=0;
let prewarmTimer=0,refreshTimer=0,sourceObserver=null,textureFailures=0;
let lastTextureSource="none";
function geometry(progress,direction=-1,width=390){
 const p=clamp(Number.isFinite(progress)?progress:0,0,1),sign=direction>=0?1:-1;
 const cardYaw=p===1?0:-sign*180*(1-p);
 const counterYaw=p===1?0:-cardYaw;
 const yaw=cardYaw+counterYaw,a=cardYaw*DEG;
 const depthAtX=x=>x*Math.sin(a)+CLEARANCE*Math.cos(a);
 // Inside the card is a translucent volume, not a discarded half-plane.
 // Near the edge the submerged petals are visible; the opaque SETKA face
 // conceals them as the card settles flat. Full ALMA-facing petals stay bright.
 const s=Math.abs(Math.sin(a));
 // The host shows SETKA until p=.5, then ALMA. Internal petals must
 // NEVER transmit while the opaque squish face is actually rendered.
 const facing=clamp(Math.cos(a)/.4,0,1);
 const smoothFacing=facing*facing*(3-2*facing);
 const almaTransmission=p>=.5?.48+.52*smoothFacing:0;
 // Keep the buried HALF in its ORIGINAL side of the lotus, inside the
 // visible ALMA card surface. v8 mistakenly folded it onto the exposed
 // half, making the calendar-side petal disappear completely.
 const submergedAtX=x=>Math.max(0,-depthAtX(x));
 const cardFace=Math.abs(Math.cos(a));
 const chamberWidth=cardFace*(.8+.2*cardFace)+.04*s;
 const projectInteriorX=x=>x*chamberWidth;
 const interiorZAtX=x=>-submergedAtX(x)*(.18+.22*s);
 const edge=clamp((s-.02)/.53,0,1);
 const edgeTransmission=edge*edge*(3-2*edge);
 const transmissionAtX=x=>{
  const d=depthAtX(x);
  // The JS acceptance geometry and WebGL material use ONE attenuation law.
  return d>=0?1:almaTransmission*edgeTransmission*(.48+.52*Math.exp(d/190));
 };
 const visibleFraction=s<1e-7?(Math.cos(a)>0?1:0):
  clamp(.5+CLEARANCE*Math.cos(a)/(Math.max(1,width)*s),0,1);
 return {progress:p,direction:sign,cardYaw,counterYaw,yaw,radians:a,
  emergingSide:sign<0?"right":"left",depthAtX,transmissionAtX,
  projectInteriorX,interiorZAtX,chamberWidth,almaTransmission,
  visibleFraction,opacity:1,enabled:p>0};
}
function original(hidden,doc=view?.doc){
 if(!doc)return;
 try{
  let rule=doc.getElementById("setka-cycle-single-lotus-rule");
  if(!rule){
   rule=doc.createElement("style");rule.id="setka-cycle-single-lotus-rule";
   rule.textContent="html.setka-cycle-hides-original-lotus .cycle-lotus-button svg.cycle-lotus{visibility:hidden!important}";
   doc.head.appendChild(rule);
  }
  doc.documentElement.classList.toggle("setka-cycle-hides-original-lotus",!!hidden);
 }catch(_){}
}
function copyStyleTree(from,to,win){
 const props=["color","fill","fill-opacity","stroke","stroke-width","stroke-opacity",
 "stroke-linecap","stroke-linejoin","stroke-dasharray","stroke-dashoffset","opacity",
 "filter","mix-blend-mode","paint-order","vector-effect","transform","transform-origin",
 "transform-box","visibility","font-size","font-family","font-weight","font-style",
 "letter-spacing","text-anchor","dominant-baseline","stop-color","stop-opacity"];
 const src=[from,...from.querySelectorAll("*")],dst=[to,...to.querySelectorAll("*")];
 const renamed=new Map();
 for(const n of dst)if(n.id){let id="setka-lotus-3d-"+n.id;renamed.set(n.id,id);n.id=id}
 const fix=s=>String(s).replace(/url\(\s*["']?[^)"']*#([A-Za-z0-9_-]+)["']?\s*\)/g,
  (whole,id)=>renamed.has(id)?"url(#"+renamed.get(id)+")":whole);
 for(let i=0;i<src.length;i++){
  const style=win.getComputedStyle(src[i]),node=dst[i];
  for(const prop of props){
   let v=style.getPropertyValue(prop);
   if(v&&v!=="none"&&v!=="normal"&&v!=="auto")node.style.setProperty(prop,fix(v));
  }
  for(const prop of ["fill","stroke","filter","mask","clip-path","href","xlink:href"]){
   let v=node.getAttribute?.(prop);if(!v)continue;
   if((prop==="href"||prop==="xlink:href")&&v[0]==="#")
    node.setAttribute(prop,"#"+(renamed.get(v.slice(1))||v.slice(1)));
   else node.setAttribute(prop,fix(v));
  }
 }
}
function dimensions(svg,button){
 // Stable iframe box, independent of the rotating CSS bounding rectangle.
 const W=iframe.clientWidth||390,H=iframe.clientHeight||Math.max(400,window.innerHeight-110);
 const top=Number.isFinite(iframe.offsetTop)?iframe.offsetTop:12;
 const left=(window.innerWidth-W)/2;
 const r=svg.getBoundingClientRect(),b=button.getBoundingClientRect();
 const w=Math.min(W,svg.clientWidth||r.width||button.clientWidth||W);
 const h=svg.clientHeight||r.height||250;
 const x=Number.isFinite(r.left)?r.left:b.left||0;
 const y=Number.isFinite(r.top)?r.top:b.top||174;
 const pivotX=left+x+w/2,pivotY=top+y+h/2;
 return {W,H,w,h,pivotX,pivotY,topY:top-pivotY,bottomY:top+H-pivotY};
}
const VS=String.raw\`
precision highp float;
attribute vec2 aPos;
attribute vec2 aUV;
uniform vec2 uScreen,uPivot;
uniform float uAngle,uIsLotus,uLayer,uClearance,uCardHalf,uDepth;
varying vec2 vUV;
varying float vDepth,vBoxFrac;
vec3 ry(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}
void main(){
 vec3 world;
 if(uIsLotus>.5){
  // Original SVG stays full-sized and viewer-facing. Its quad crosses the
  // physically rotating ALMA volume around one genuine vertical hinge.
  world=vec3(aPos,uClearance);
  vDepth=aPos.x*sin(uAngle)+uClearance*cos(uAngle);
  vBoxFrac=0.;
 }else{
  vec3 local;
  if(uLayer<2.5)local=vec3(-uCardHalf,aPos.y,aPos.x);
  else if(uLayer<3.5)local=vec3(uCardHalf,aPos.y,aPos.x);
  else local=vec3(aPos.x,aPos.y,-uDepth);
  world=ry(local,uAngle);
  vBoxFrac=clamp(-aPos.x/uDepth,0.,1.);
  vDepth=0.;
 }
 vUV=aUV;
 float focal=1450.,d=focal-world.z,near=15.,far=3000.;
 vec2 pivotNDC=vec2(2.*uPivot.x/uScreen.x-1.,1.-2.*uPivot.y/uScreen.y);
 vec2 clip=pivotNDC*d+vec2(2.*world.x/uScreen.x,-2.*world.y/uScreen.y)*focal;
 float z=(far+near)/(far-near)*d-2.*far*near/(far-near);
 gl_Position=vec4(clip,z,d);
}\`;
const FS=String.raw\`
precision highp float;
uniform sampler2D uTex;
uniform float uIsLotus,uLayer,uAngle,uDepth,uCycleFace;
varying vec2 vUV;
varying float vDepth,vBoxFrac;
void main(){
 if(uCycleFace<.5)discard;
 if(uIsLotus<.5){
  float slope=abs(sin(uAngle));
  // These are the actual 3D back and SIDE surfaces of the cycle card.
  // The sides transmit a little violet interior light into the depth.
  float a=uLayer>3.5?.45*slope:(.79-.15*vBoxFrac)*slope;
  vec3 ink=uLayer>3.5?vec3(.010,.005,.023):vec3(.018,.007,.034);
  gl_FragColor=vec4(ink,a);
  return;
 }
 vec4 c=texture2D(uTex,vUV);
 if(c.a<.008)discard;
 if(uLayer<.5){
  if(vDepth>=0.)discard;
  // Real submerged distance behind the ALMA front plane, rather than an
  // artificial 2D crop or a duplicate petal drawing.
  float depth=clamp(-vDepth/uDepth,0.,1.);
  if(depth>=.999)discard;
  c.rgb*=mix(.80,.44,depth);
  c.a*=.82*exp(-.7*depth);
 }else{
  if(vDepth<0.)discard;
 }
 gl_FragColor=c;
}\`;
function renderer(canvas){
 let gl;
 try{gl=canvas.getContext("webgl",{alpha:true,depth:true,antialias:true,
  premultipliedAlpha:false,preserveDrawingBuffer:false});}catch(_){}
 if(!gl)return null;
 const compile=(kind,src)=>{
  const sh=gl.createShader(kind);gl.shaderSource(sh,src);gl.compileShader(sh);
  if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))
   throw Error(gl.getShaderInfoLog(sh));
  return sh;
 };
 let program;
 try{
  const v=compile(gl.VERTEX_SHADER,VS),f=compile(gl.FRAGMENT_SHADER,FS);
  program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);
  gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))
   throw Error(gl.getProgramInfoLog(program));
 }catch(e){
  console.warn("[SETKA ALMA 3D] shader",e);
  // Failed shader links must NOT leak the WebGL context. Previously the
  // 100 prewarm retries eventually evicted working library canvases.
  try{gl.deleteProgram(program)}catch(_){}
  try{gl.getExtension("WEBGL_lose_context")?.loseContext()}catch(_){}
  return null;
 }
 const at={pos:gl.getAttribLocation(program,"aPos"),uv:gl.getAttribLocation(program,"aUV")};
 const u={screen:gl.getUniformLocation(program,"uScreen"),
  pivot:gl.getUniformLocation(program,"uPivot"),
  angle:gl.getUniformLocation(program,"uAngle"),
  lotus:gl.getUniformLocation(program,"uIsLotus"),
  layer:gl.getUniformLocation(program,"uLayer"),
  cycleFace:gl.getUniformLocation(program,"uCycleFace"),
  clearance:gl.getUniformLocation(program,"uClearance"),
  cardHalf:gl.getUniformLocation(program,"uCardHalf"),
  depth:gl.getUniformLocation(program,"uDepth"),
  texture:gl.getUniformLocation(program,"uTex")};
 const buffer=gl.createBuffer(),texture=gl.createTexture();
 function upload(image){
  gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])
   gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const error=gl.getError();
  if(error!==gl.NO_ERROR)throw Error("WebGL texture upload error "+error);
 }
 function quad(x0,y0,x1,y1){
  return new Float32Array([
   x0,y0,0,0,x1,y0,1,0,x1,y1,1,1,
   x0,y0,0,0,x1,y1,1,1,x0,y1,0,1]);
 }
 // Tessellate the original SVG for a continuous 3D bend.
 function strips(x0,y0,x1,y1,count=48){
  const vertices=new Float32Array(count*24);
  for(let i=0;i<count;i++){
   const a=i/count,b=(i+1)/count;
   const xa=x0+(x1-x0)*a,xb=x0+(x1-x0)*b;
   vertices.set([
    xa,y0,a,0,xb,y0,b,0,xb,y1,b,1,
    xa,y0,a,0,xb,y1,b,1,xa,y1,a,1
   ],i*24);
  }
  return vertices;
 }
 function draw(box,g){
  const W=window.innerWidth,H=window.innerHeight,dpr=Math.min(2,window.devicePixelRatio||1);
  const pw=Math.max(2,Math.round(W*dpr)),ph=Math.max(2,Math.round(H*dpr));
  if(canvas.width!==pw||canvas.height!==ph){
   canvas.width=pw;canvas.height=ph;gl.viewport(0,0,pw,ph);
  }
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(program);
  const cardDepth=190;
  gl.uniform2f(u.screen,W,H);gl.uniform2f(u.pivot,box.pivotX,box.pivotY);
  gl.uniform1f(u.angle,g.radians);gl.uniform1f(u.clearance,1.7);
  gl.uniform1f(u.cardHalf,box.W/2);gl.uniform1f(u.depth,cardDepth);
  gl.uniform1f(u.cycleFace,g.progress>=.5?1:0);
  gl.uniform1i(u.texture,0);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.vertexAttribPointer(at.pos,2,gl.FLOAT,false,16,0);
  gl.vertexAttribPointer(at.uv,2,gl.FLOAT,false,16,8);
  gl.enableVertexAttribArray(at.pos);gl.enableVertexAttribArray(at.uv);
  function paint(lotus,layer,vertices){
   gl.uniform1f(u.lotus,lotus);gl.uniform1f(u.layer,layer);
   gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);
   gl.drawArrays(gl.TRIANGLES,0,vertices.length/4);
  }
  // A single physical 3D cycle-card volume around its real face plane.
  // The original live SVG is sampled once into ONE translucent quad, then
  // intersected with the volume. No extra SVG DOM elements ever appear.
  const lotus=quad(-box.w/2,-box.h/2,box.w/2,box.h/2);
  const wall=quad(-cardDepth,box.topY,0,box.bottomY);
  paint(0,4,quad(-box.W/2,box.topY,box.W/2,box.bottomY));
  paint(1,0,lotus);    // submerged part in the body of the card
  paint(0,2,wall);     // real left volume wall, not a 2D curtain
  paint(0,3,wall);     // real right volume wall
  paint(1,1,lotus);    // outward part in front of the calendar face
  gl.disable(gl.BLEND);gl.depthMask(true);
 }
 function dispose(){gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program)}
 return{gl,upload,draw,dispose};
}
function build(){
 if(view)return !!view.gl;
 let doc,svg,button;
 try{
  doc=iframe?.contentDocument;button=doc?.querySelector(".cycle-lotus-button");
  svg=button?.querySelector("svg.cycle-lotus")||doc?.querySelector("svg.cycle-lotus");
 }catch(_){return false}
 if(!svg||!button)return false;
 const box=dimensions(svg,button);
 const canvas=document.createElement("canvas");
 canvas.id="setkaCycleLotusTurn";
 canvas.className="setka-cycle-lotus-webgl";
 canvas.setAttribute("aria-hidden","true");
 canvas.style.display="none";
 document.body.appendChild(canvas);
 const gl=renderer(canvas);
 if(!gl){canvas.remove();return false}
 const v={canvas,gl,box,doc,ready:false,lost:false,url:null};
 view=v;
 canvas.addEventListener("webglcontextlost",e=>{
  e.preventDefault();v.lost=true;v.ready=false;canvas.style.display="none";original(false,doc);
 });
 canvas.addEventListener("webglcontextrestored",()=>{
  if(view!==v)return;
  discardView();
  schedulePrewarm();
  if(turning){start();render(lastP,lastDirection)}
 });
 try{
  const copy=svg.cloneNode(true);
  copyStyleTree(svg,copy,iframe.contentWindow);
  copy.setAttribute("xmlns","http://www.w3.org/2000/svg");
  copy.setAttribute("width",String(Math.max(2,Math.round(box.w*2))));
  copy.setAttribute("height",String(Math.max(2,Math.round(box.h*2))));
  copy.removeAttribute("tabindex");
  const encoded=new XMLSerializer().serializeToString(copy);
  v.url=URL.createObjectURL(new Blob([encoded],{type:"image/svg+xml;charset=utf-8"}));
  const picture=new Image();
  let attemptedDataURL=false;
  function releaseURL(){
   if(v.url){URL.revokeObjectURL(v.url);v.url=null}
  }
  picture.onload=()=>{
   if(view!==v){releaseURL();return}
   try{
    gl.upload(picture);
    v.ready=true;
    lastTextureSource=attemptedDataURL?"data-url":"blob-url";
    releaseURL();
    // The texture is already ready BEFORE the user's first swipe.
    if(turning)render(lastP,lastDirection);
    attachSourceObserver();
   }catch(e){
    console.warn("[SETKA ALMA 3D] upload",e);
    textureFailures++;
    releaseURL();
    if(turning)original(false,doc);
    canvas.style.display="none";
   }
  };
  picture.onerror=()=>{
   if(view!==v){releaseURL();return}
   // Mobile Safari may reject SVG blob URLs, but permit an inline
   // data URI. Retry the same original artwork, not a substitute.
   releaseURL();
   if(!attemptedDataURL){
    attemptedDataURL=true;
    try{
     picture.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(encoded);
     return;
    }catch(_){}
   }
   textureFailures++;
   lastTextureSource="failed";
   console.warn("[SETKA ALMA 3D] SVG image decode failed");
   if(turning)original(false,doc);
   canvas.style.display="none";
  };
  picture.src=v.url;
 }catch(e){console.warn("[SETKA ALMA 3D] clone",e);rest();return false}
 return true;
}
function discardView(){
 const v=view;view=null;
 if(!v)return;
 original(false,v.doc);
 if(v.url)URL.revokeObjectURL(v.url);
 try{v.gl.dispose()}catch(_){}
 v.canvas.remove();
}
function attachSourceObserver(){
 if(sourceObserver||!view?.ready)return;
 const doc=view.doc;
 const root=doc?.querySelector(".cycle-hero");
 if(!root||typeof MutationObserver!=="function")return;
 sourceObserver=new MutationObserver(()=>{
  if(turning)return;
  if(refreshTimer)clearTimeout(refreshTimer);
  refreshTimer=setTimeout(()=>{
   refreshTimer=0;
   if(turning)return;
   if(sourceObserver){sourceObserver.disconnect();sourceObserver=null}
   discardView();
   schedulePrewarm();
  },160);
 });
 sourceObserver.observe(root,{
  subtree:true,childList:true,attributes:true,
  attributeFilter:["class","style","d","fill","stroke","transform"]
 });
}
function schedulePrewarm(attempt=0){
 if(prewarmTimer){clearTimeout(prewarmTimer);prewarmTimer=0}
 if(view){
  if(view.ready)attachSourceObserver();
  return;
 }
 if(build())return;
 // ALMA mounts React asynchronously *after* the iframe load event.
 // Retry until CycleHero and its actual SVG exist.
 if(attempt<100){
  prewarmTimer=setTimeout(()=>{
   prewarmTimer=0;
   schedulePrewarm(attempt+1);
  },100);
 }
}
function start(){
 turning=true;
 if(view?.ready){
  // Prewarm runs while the CALENDAR CARD IS HIDDEN by CSS. At that
  // moment the SVG's rect is 0x0; remeasure immediately after
  // startVisual() removes back.hidden, BEFORE the first card transform.
  // Keep the same WebGL texture: only its card-fixed hinge position changes.
  try{
   const btn=view.doc.querySelector(".cycle-lotus-button");
   const svg=btn?.querySelector("svg.cycle-lotus");
   if(svg&&btn)view.box=dimensions(svg,btn);
  }catch(_){}
  return;
 }
 // First launch can race asynchronous ALMA React mount; subsequent
 // swipes use the predecoded and GPU-uploaded original.
 if(!view)build();
}
function render(p,direction=-1){
 lastP=p;lastDirection=direction;
 if(!turning)return;
 if(!view&&!build())return;
 const v=view;if(!v?.ready||v.lost)return;
 const g=geometry(p,direction,v.box.w);
 original(true,v.doc);
 v.canvas.style.display=g.progress>=.5?"block":"none";
 if(g.progress<.5)return;
 v.gl.draw(v.box,g);
 v.canvas.dataset.cardYaw=g.cardYaw.toFixed(3);
 v.canvas.dataset.lotusYaw=g.counterYaw.toFixed(3);
 v.canvas.dataset.worldYaw=g.yaw.toFixed(3);
 v.canvas.dataset.cycleSide=g.emergingSide;
 v.canvas.dataset.depthIntersection="true";
 frames++;
}
function rest(){
 // Cache the completed WebGL texture across transitions. Previously we
 // deleted it on every pointerup; iOS could never finish the async SVG
 // decode before the same short gesture ended.
 turning=false;
 if(!view)return;
 original(false,view.doc);
 view.canvas.style.display="none";
}
if(iframe){
 iframe.addEventListener("load",()=>{
  if(sourceObserver){sourceObserver.disconnect();sourceObserver=null}
  discardView();
  schedulePrewarm();
  if(turning){start();render(lastP,lastDirection)}
 });
 // The calendar may already be loaded when this module is evaluated.
 schedulePrewarm();
}
if(typeof window.addEventListener==="function")window.addEventListener("pagehide",()=>{
 if(prewarmTimer)clearTimeout(prewarmTimer);
 if(refreshTimer)clearTimeout(refreshTimer);
 if(sourceObserver){sourceObserver.disconnect();sourceObserver=null}
 discardView();
});
window.SETKA_CYCLE_LOTUS_AXIS={
 start,render,rest,geometry,
 getInfo:()=>({turning,hasSource:!!view,ready:!!view?.ready,
  prewarmed:!!view?.ready&&!turning,textureSource:lastTextureSource,
  pivotX:view?.box?.pivotX??null,pivotY:view?.box?.pivotY??null,
  lotusWidth:view?.box?.w??null,cardWidth:view?.box?.W??null,
  textureFailures,real3D:!!view?.gl,depthIntersection:true,frames,
  ...geometry(lastP,lastDirection,view?.box.w||390)})
};
})();