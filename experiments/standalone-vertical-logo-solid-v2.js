(()=>{
"use strict";
/* SETKA: true 3D Cyrillic glyph solids. Glyph masks become FRONT/BACK
   triangles and real contour side walls, shaded by WebGL lighting. The
   rotating card remains flat; this mesh is rendered independently above it.
   CSS letter layers remain fallback for unavailable WebGL. No remote assets. */
const card=document.getElementById("setkaVerticalLogoCard");
const object=document.getElementById("setkaVerticalTitleObject");
if(!card||!object||window.SETKA_SOLID_WORDMARK)return;
const canvas=document.createElement("canvas");
canvas.id="setkaVerticalSolidText";
canvas.setAttribute("aria-hidden","true");
canvas.style.cssText="position:fixed;left:50%;top:var(--setka-cycle-card-top,12px);"+
 "width:min(calc(100% - 28px),432px);height:calc(100dvh - var(--setka-cycle-card-top,12px) - var(--setka-cycle-card-bottom,84px));"+
 "transform:translateX(-50%);pointer-events:none;z-index:144;"+
 "background:transparent;display:none;contain:layout style;";
document.body.appendChild(canvas);
const gl=canvas.getContext("webgl",{alpha:true,antialias:true,depth:true,
 premultipliedAlpha:true,stencil:false,preserveDrawingBuffer:false,powerPreference:"low-power"});
if(!gl){canvas.remove();return}
const vert=[
"precision highp float;",
"attribute vec3 aPosition; attribute vec3 aNormal;",
"uniform mat4 uProjection; uniform float uRx; uniform float uRy;",
"varying vec3 vNormal; varying vec3 vPosition; varying float vMaterial;",
"vec3 rotate3(vec3 q){",
"float sx=sin(uRx),cx=cos(uRx),sy=sin(uRy),cy=cos(uRy);",
"vec3 r=vec3(q.x,q.y*cx-q.z*sx,q.y*sx+q.z*cx);",
"return vec3(r.x*cy+r.z*sy,r.y,-r.x*sy+r.z*cy);}",
"void main(){vec3 p=rotate3(aPosition);vPosition=p;",
"vNormal=normalize(rotate3(aNormal));vMaterial=aNormal.z;",
"gl_Position=uProjection*vec4(p.x,p.y,p.z-940.0,1.0);}"
].join("\n");
const frag=[
"precision highp float;",
"varying vec3 vNormal;varying vec3 vPosition;varying float vMaterial;",
"void main(){",
"vec3 n=normalize(vNormal);",
"vec3 eye=normalize(vec3(-vPosition.x*.15,-vPosition.y*.15,800.0));",
"vec3 key=normalize(vec3(-0.55,0.78,1.0));",
"vec3 fill=normalize(vec3(0.85,-0.36,0.48));",
"float k=max(dot(n,key),0.0),f=max(dot(n,fill),0.0);",
"float front=step(0.5,vMaterial);",
"float back=step(-vMaterial,-0.5);",
"vec3 faceBase=mix(vec3(.39,.20,.54),vec3(.92,.73,.96),",
"clamp(.54+.35*sin(vPosition.x*.029+vPosition.y*.016),0.0,1.0));",
"vec3 sideBase=mix(vec3(.085,.025,.13),vec3(.56,.25,.68),",
"clamp(.35+.33*sin(vPosition.x*.065-vPosition.y*.018),0.0,1.0));",
"vec3 base=mix(sideBase,faceBase,front);",
"base=mix(base,vec3(.20,.085,.29),back*.48);",
"float diffuse=.22+.59*k+.23*f;",
"vec3 halfv=normalize(key+eye);",
"float spec=pow(max(dot(n,halfv),0.0),38.0)*(.6+front*.6);",
"float edge=pow(1.0-max(dot(n,eye),0.0),3.0);",
"float ribbon=pow(max(dot(n,normalize(fill+vec3(.05,.25,.0))),0.0),11.0);",
"vec3 color=base*diffuse+vec3(.65,.32,.82)*spec+",
"vec3(.22,.065,.33)*edge+vec3(.13,.08,.24)*ribbon;",
"color=pow(clamp(color,0.0,1.0),vec3(.91));",
"gl_FragColor=vec4(color,1.0);}"
].join("\n");
function shader(type,body){
 const s=gl.createShader(type);gl.shaderSource(s,body);gl.compileShader(s);
 if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
   const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(message);
 }
 return s;
}
let program,buffer,count;
try{
 const v=shader(gl.VERTEX_SHADER,vert),f=shader(gl.FRAGMENT_SHADER,frag);
 program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);
 gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
}catch(error){
 console.warn("[SETKA Solid 3D] fallback:",error);canvas.remove();return;
}
const attributes={
 pos:gl.getAttribLocation(program,"aPosition"),
 normal:gl.getAttribLocation(program,"aNormal")
};
const uniforms={
 projection:gl.getUniformLocation(program,"uProjection"),
 rx:gl.getUniformLocation(program,"uRx"),
 ry:gl.getUniformLocation(program,"uRy")
};
function createMesh(){
 const vertices=[];
 const push=(v,n)=>{vertices.push(v[0],v[1],v[2],n[0],n[1],n[2])};
 const triangle=(a,b,c,n)=>{push(a,n);push(b,n);push(c,n)};
 const quad=(a,b,c,d,n)=>{triangle(a,b,c,n);triangle(a,c,d,n)};
 const step=1.8,depth=38;
 const shapes=[
  {text:"СКВИШ",font:86,w:364,h:115,dy:58},
  {text:"ДЛЯ МОЗГА",font:49,w:364,h:78,dy:-57}
 ];
 for(const shape of shapes){
  const cols=Math.ceil(shape.w/step),rows=Math.ceil(shape.h/step);
  const off=document.createElement("canvas");
  off.width=cols*2;off.height=rows*2;
  const ctx=off.getContext("2d",{willReadFrequently:true});
  if(!ctx)continue;
  ctx.font="900 "+shape.font*2+"px system-ui, sans-serif";
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#fff";
  ctx.fillText(shape.text,off.width/2,off.height/2,off.width-8);
  const pixels=ctx.getImageData(0,0,off.width,off.height).data;
  const occupied=new Uint8Array(cols*rows);
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const sx=x*2,sy=y*2,offW=off.width;
   let sum=0;
   for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++){
    const idx=((sy+yy)*offW+sx+xx)*4+3;sum+=pixels[idx];
   }
   occupied[y*cols+x]=sum>448?1:0;
  }
  const on=(x,y)=>x>=0&&x<cols&&y>=0&&y<rows&&occupied[y*cols+x]===1;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   if(!on(x,y))continue;
   const x1=x*step-cols*step/2,x2=x1+step;
   const y1=shape.dy+rows*step/2-y*step,y2=y1-step;
   const F=depth/2,B=-depth/2;
   quad([x1,y2,F],[x2,y2,F],[x2,y1,F],[x1,y1,F],[0,0,1]);
   quad([x2,y2,B],[x1,y2,B],[x1,y1,B],[x2,y1,B],[0,0,-1]);
   if(!on(x-1,y))quad([x1,y2,B],[x1,y2,F],[x1,y1,F],[x1,y1,B],[-1,0,0]);
   if(!on(x+1,y))quad([x2,y2,F],[x2,y2,B],[x2,y1,B],[x2,y1,F],[1,0,0]);
   if(!on(x,y-1))quad([x1,y1,F],[x2,y1,F],[x2,y1,B],[x1,y1,B],[0,1,0]);
   if(!on(x,y+1))quad([x2,y2,F],[x1,y2,F],[x1,y2,B],[x2,y2,B],[0,-1,0]);
  }
 }
 return new Float32Array(vertices);
}
try{
 const mesh=createMesh();count=mesh.length/6;
 if(count<1200)throw Error("Font geometry empty");
 buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
}catch(error){
 console.warn("[SETKA Solid 3D] fallback mesh:",error);canvas.remove();return;
}
gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
gl.clearColor(0,0,0,0);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
gl.vertexAttribPointer(attributes.pos,3,gl.FLOAT,false,24,0);
gl.enableVertexAttribArray(attributes.pos);
gl.vertexAttribPointer(attributes.normal,3,gl.FLOAT,false,24,12);
gl.enableVertexAttribArray(attributes.normal);
let active=false,lost=false,stopped=false,lastAngle=0,lastX=-12,lastY=-18;
function projection(aspect){
 const n=.5,far=3000,f=1/Math.tan(38*Math.PI/360),nf=1/(n-far);
 return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+n)*nf,-1,0,0,2*far*n*nf,0]);
}
function resize(){
 const rect=card.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
 const w=Math.round(Math.max(1,rect.width)*dpr),h=Math.round(Math.max(1,rect.height)*dpr);
 if(w!==canvas.width||h!==canvas.height){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
 return Math.max(.25,rect.width/Math.max(1,rect.height));
}
function draw(){
 if(!active||lost||stopped)return;
 canvas.style.display="block";
 gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.useProgram(program);
 gl.uniformMatrix4fv(uniforms.projection,false,projection(resize()));
 gl.uniform1f(uniforms.rx,(lastAngle+lastX)*Math.PI/180);
 gl.uniform1f(uniforms.ry,lastY*Math.PI/180);
 gl.drawArrays(gl.TRIANGLES,0,count);
}
function render({angle=0,visible=true,tiltX=-12,tiltY=-18}={}){
 if(stopped||lost)return;
 active=!!visible;lastAngle=angle;lastX=tiltX;lastY=tiltY;
 canvas.style.display=active?"block":"none";
 if(active)draw();
}
canvas.addEventListener("webglcontextlost",e=>{
 e.preventDefault();lost=true;active=false;canvas.style.display="none";
 document.body.classList.remove("setka-vlogo-webgl");
});
canvas.addEventListener("webglcontextrestored",()=>{location.reload()});
window.addEventListener("resize",()=>{if(active)draw()},{passive:true});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&active)draw()});
window.SETKA_SOLID_WORDMARK={
 render,getInfo:()=>({real3D:true,renderer:"WebGL",vertices:count,depth:38,active}),
 dispose(){stopped=true;document.body.classList.remove("setka-vlogo-webgl");
  canvas.remove();gl.deleteBuffer(buffer);gl.deleteProgram(program)}
};
document.body.classList.add("setka-vlogo-webgl");
render({visible:false});
})();