(()=>{
"use strict";
/* SETKA ALMA: original lotus on an independent 3D Y pivot. Physical ALMA
   card and lotus are two intersecting planes, not two screen-space images.
   ALMA-facing half-space and a depth-only card determine occlusion. */
if(window.SETKA_CYCLE_LOTUS_AXIS)return;
const DEG=Math.PI/180, CLEARANCE=10;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const iframe=document.getElementById("setkaCycleBack")?.querySelector("iframe");
let view=null,turning=false,lastP=0,lastDirection=-1,frames=0;
function geometry(progress,direction=-1,width=390){
 const p=clamp(Number.isFinite(progress)?progress:0,0,1),sign=direction>=0?1:-1;
 const cardYaw=p===1?0:-sign*180*(1-p);
 const counterYaw=p===1?0:-cardYaw;
 const yaw=cardYaw+counterYaw,a=cardYaw*DEG;
 const depthAtX=x=>x*Math.sin(a)+CLEARANCE*Math.cos(a);
 const s=Math.abs(Math.sin(a));
 const visibleFraction=s<1e-7?(Math.cos(a)>0?1:0):
  clamp(.5+CLEARANCE*Math.cos(a)/(Math.max(1,width)*s),0,1);
 return {progress:p,direction:sign,cardYaw,counterYaw,yaw,radians:a,
  emergingSide:sign<0?"right":"left",depthAtX,
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
const VS=[
"precision highp float;",
"attribute vec2 aPos;attribute vec2 aUV;",
"uniform vec2 uScreen,uPivot;",
"uniform float uAngle,uIsLotus,uClearance;",
"varying vec2 vUV;varying float vCycleSide;",
"vec3 ry(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}",
"void main(){",
" vec3 inCard=uIsLotus>.5?ry(vec3(aPos,0.),-uAngle):vec3(aPos,0.);",
" vec3 world=ry(inCard,uAngle);",
" if(uIsLotus>.5)world.z+=uClearance;",
" vCycleSide=inCard.z+(uIsLotus>.5?uClearance*cos(uAngle):0.);vUV=aUV;",
" float focal=1450.,d=focal-world.z,near=15.,far=3000.;",
" vec2 pivotNDC=vec2(2.*uPivot.x/uScreen.x-1.,1.-2.*uPivot.y/uScreen.y);",
" vec2 clip=pivotNDC*d+vec2(2.*world.x/uScreen.x,-2.*world.y/uScreen.y)*focal;",
" float z=(far+near)/(far-near)*d-2.*far*near/(far-near);",
" gl_Position=vec4(clip,z,d);",
"}"].join("\n");
const FS=[
"precision mediump float;",
"uniform sampler2D uTex;uniform float uIsLotus;",
"varying vec2 vUV;varying float vCycleSide;",
"void main(){",
" if(uIsLotus<.5){gl_FragColor=vec4(0.);return;}",
" // Positive 3D card-local Z belongs to the ALMA side, not SETKA.",
" if(vCycleSide<0.)discard;",
" vec4 c=texture2D(uTex,vUV);if(c.a<.008)discard;",
" gl_FragColor=c;",
"}"].join("\n");
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
 }catch(e){console.warn("[SETKA ALMA 3D] shader",e);return null}
 const at={pos:gl.getAttribLocation(program,"aPos"),uv:gl.getAttribLocation(program,"aUV")};
 const u={screen:gl.getUniformLocation(program,"uScreen"),
  pivot:gl.getUniformLocation(program,"uPivot"),
  angle:gl.getUniformLocation(program,"uAngle"),
  lotus:gl.getUniformLocation(program,"uIsLotus"),
  clearance:gl.getUniformLocation(program,"uClearance"),
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
 }
 function quad(x0,y0,x1,y1){
  return new Float32Array([
   x0,y0,0,0,x1,y0,1,0,x1,y1,1,1,
   x0,y0,0,0,x1,y1,1,1,x0,y1,0,1]);
 }
 function draw(box,g){
  const W=window.innerWidth,H=window.innerHeight,dpr=Math.min(2,window.devicePixelRatio||1);
  const pw=Math.max(2,Math.round(W*dpr)),ph=Math.max(2,Math.round(H*dpr));
  if(canvas.width!==pw||canvas.height!==ph){
   canvas.width=pw;canvas.height=ph;gl.viewport(0,0,pw,ph);
  }
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
  gl.useProgram(program);
  gl.uniform2f(u.screen,W,H);gl.uniform2f(u.pivot,box.pivotX,box.pivotY);
  gl.uniform1f(u.angle,g.radians);gl.uniform1f(u.clearance,CLEARANCE);
  gl.uniform1i(u.texture,0);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.vertexAttribPointer(at.pos,2,gl.FLOAT,false,16,0);
  gl.vertexAttribPointer(at.uv,2,gl.FLOAT,false,16,8);
  gl.enableVertexAttribArray(at.pos);gl.enableVertexAttribArray(at.uv);
  // Exactly the physical ALMA card: an invisible depth-only plane.
  gl.uniform1f(u.lotus,0);
  gl.bufferData(gl.ARRAY_BUFFER,quad(-box.W/2,box.topY,box.W/2,box.bottomY),gl.DYNAMIC_DRAW);
  gl.disable(gl.BLEND);gl.colorMask(false,false,false,false);
  gl.depthMask(true);gl.drawArrays(gl.TRIANGLES,0,6);
  gl.colorMask(true,true,true,true);
  // The ORIGINAL SVG is a textured plane on a separate Y axis;
  // its negative card-local depth is inside the card and stays hidden.
  gl.uniform1f(u.lotus,1);
  gl.bufferData(gl.ARRAY_BUFFER,quad(-box.w/2,-box.h/2,box.w/2,box.h/2),gl.DYNAMIC_DRAW);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.drawArrays(gl.TRIANGLES,0,6);gl.disable(gl.BLEND);
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
  const active=turning;rest();
  if(active){start();render(lastP,lastDirection)}
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
  picture.onload=()=>{
   if(view!==v)return;
   try{gl.upload(picture);v.ready=true;render(lastP,lastDirection)}
   catch(e){console.warn("[SETKA ALMA 3D] texture",e);original(false,doc);canvas.style.display="none"}
   finally{if(v.url){URL.revokeObjectURL(v.url);v.url=null}}
  };
  picture.onerror=()=>{
   if(view!==v)return;
   console.warn("[SETKA ALMA 3D] source texture");
   original(false,doc);canvas.style.display="none";
   if(v.url){URL.revokeObjectURL(v.url);v.url=null}
  };
  picture.src=v.url;
 }catch(e){console.warn("[SETKA ALMA 3D] clone",e);rest();return false}
 return true;
}
function start(){turning=true;build()}
function render(p,direction=-1){
 lastP=p;lastDirection=direction;
 if(!turning)return;
 if(!view&&!build())return;
 const v=view;if(!v?.ready||v.lost)return;
 const g=geometry(p,direction,v.box.w);
 original(true,v.doc);
 v.canvas.style.display=g.enabled?"block":"none";
 if(!g.enabled)return;
 v.gl.draw(v.box,g);
 v.canvas.dataset.cardYaw=g.cardYaw.toFixed(3);
 v.canvas.dataset.lotusYaw=g.counterYaw.toFixed(3);
 v.canvas.dataset.worldYaw=g.yaw.toFixed(3);
 v.canvas.dataset.cycleSide=g.emergingSide;
 v.canvas.dataset.depthIntersection="true";
 frames++;
}
function rest(){
 const v=view;view=null;turning=false;
 if(!v)return;
 original(false,v.doc);
 if(v.url)URL.revokeObjectURL(v.url);
 try{v.gl.dispose()}catch(_){}
 v.canvas.remove();
}
if(iframe)iframe.addEventListener("load",()=>{
 const active=turning;rest();
 if(active){start();render(lastP,lastDirection)}
});
window.SETKA_CYCLE_LOTUS_AXIS={
 start,render,rest,geometry,
 getInfo:()=>({turning,hasSource:!!view,ready:!!view?.ready,
  real3D:!!view?.gl,depthIntersection:true,frames,
  ...geometry(lastP,lastDirection,view?.box.w||390)})
};
})();