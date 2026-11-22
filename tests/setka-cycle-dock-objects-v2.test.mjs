import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync("experiments/standalone-cycle-dock-objects-v2.js","utf8");
const adapter=fs.readFileSync("experiments/standalone-cycle-dock-rotation-v1.js","utf8");
const css=fs.readFileSync("experiments/standalone-cycle-dock-rotation-v1.css","utf8");
const html=fs.readFileSync("standalone-v34-cycle-logo3d.html","utf8");
function fakeGL(){
 const calls={draws:[],angles:[],buffers:[],viewports:[],clear:[]};
 const gl={
   VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
   ARRAY_BUFFER:34962,STATIC_DRAW:35044,FLOAT:5126,TRIANGLES:4,
   DEPTH_TEST:2929,LEQUAL:515,SCISSOR_TEST:3089,CULL_FACE:2884,
   COLOR_BUFFER_BIT:16384,DEPTH_BUFFER_BIT:256,
   createShader:()=>({}),shaderSource(){},compileShader(){},
   getShaderParameter:()=>true,getShaderInfoLog:()=>"",deleteShader(){},
   createProgram:()=>({}),attachShader(){},linkProgram(){},
   getProgramParameter:()=>true,getProgramInfoLog:()=>"",useProgram(){},
   createBuffer:()=>({}),bindBuffer(){},
   bufferData(_target,data){calls.buffers.push(data)},
   getAttribLocation:(_prog,name)=>({aPos:0,aNormal:1,aColor:2})[name],
   enableVertexAttribArray(){},vertexAttribPointer(){},
   enable(){},disable(){},depthFunc(){},clearColor(){},
   getUniformLocation:(_p,name)=>name,
   uniform1f(name,v){if(name==="uAngle")calls.angles.push(v)},
   viewport(...v){calls.viewports.push(v)},
   scissor(){},clear(v){calls.clear.push(v)},
   drawArrays(...v){calls.draws.push(v)}
 };
 return{gl,calls};
}
class E{
 constructor(tag="span",id=""){
  this.tagName=tag;this.id=id;this.className="";this.dataset={};
  this.children=[];this.parentNode=null;this.style={};
  this.style.setProperty=(k,v)=>{this.style[k]=v};
  this.style.removeProperty=k=>{delete this.style[k]};
  this.attrs={};this.hidden=false;this.handlers={};
  this.classes=new Set();
  this.classList={
   add:(...a)=>a.forEach(x=>this.classes.add(x)),
   remove:(...a)=>a.forEach(x=>this.classes.delete(x)),
   contains:n=>this.classes.has(n)
  };
 }
 appendChild(x){
  if(x.parentNode)x.parentNode.removeChild(x);
  this.children.push(x);x.parentNode=this;return x;
 }
 removeChild(x){this.children.splice(this.children.indexOf(x),1);x.parentNode=null}
 remove(){if(this.parentNode)this.parentNode.removeChild(this)}
 setAttribute(k,v){this.attrs[k]=String(v)}
 addEventListener(k,f){this.handlers[k]=f}
 querySelectorAll(sel){
  if(sel===".st-dock-icon")return this.children.flatMap(x=>x.children.filter(e=>e.className==="st-dock-icon"));
  if(sel==="button[data-p]")return this.children.filter(x=>x.tagName==="button");
  return[];
 }
 querySelector(sel){
  if(sel==="svg")return this.children.find(e=>e.tagName==="svg")||null;
  if(sel===".setka-cycle-icon-front")return this.children.find(e=>e.className.includes("setka-cycle-icon-front"))||null;
  return null;
 }
 cloneNode(){return new E(this.tagName)}
 closest(sel){return sel==="button"?this.parentNode:null}
 getBoundingClientRect(){return this.rect||{left:0,top:0,width:390,height:64,right:390,bottom:64}}
}
function fixture({webgl=true}={}){
 const {gl,calls}=fakeGL();
 const dock=new E("nav","st34Nav"),body=new E("body");
 dock.clientWidth=390;dock.clientHeight=64;
 dock.rect={left:11,top:700,width:390,height:64,right:401,bottom:764};
 body.appendChild(dock);
 const icons=[],buttons=[];
 for(let i=0;i<5;i++){
  const btn=new E("button");btn.dataset.p=["today","notes","pulse","symptoms","me"][i];
  const icon=new E();icon.className="st-dock-icon";
  icon.rect={left:11+(i+.5)*78-11,top:709,width:22,height:22,right:0,bottom:731};
  // viewport is relative to the fixed dock. 5 evenly spaced visual centers.
  icon.rect.left=11+(i+.5)*78-11;
  const svg=new E("svg");icon.appendChild(svg);
  const label=new E();label.className="st-dock-label";
  btn.appendChild(icon);btn.appendChild(label);dock.appendChild(btn);
  buttons.push(btn);icons.push(icon);
 }
 const ctx={
  document:{
   body,
   getElementById:id=>id==="st34Nav"?dock:null,
   createElement:tag=>{
    const e=new E(tag);
    if(tag==="canvas"){
      e.width=0;e.height=0;
      e.getContext=()=>webgl?gl:null;
    }
    return e;
   },
   addEventListener(){}
  },
  window:{devicePixelRatio:2,addEventListener(){}},
  console:{warn(){}},
  location:{reload(){}}
 };
 vm.runInNewContext(source,ctx,{filename:"standalone-cycle-dock-objects-v2.js"});
 vm.runInNewContext(adapter,ctx,{filename:"standalone-cycle-dock-rotation-v1.js"});
 return{ctx,dock,body,icons,buttons,calls};
}
test("five distinct native XYZ meshes, one shared WebGL, with real 3-axis extent",()=>{
 const x=fixture(),eng=x.ctx.window.SETKA_CYCLE_3D_MODELS;
 const inf=eng.getInfo();
 assert.equal(inf.live,true);
 assert.equal(inf.trueVolume,true);
 assert.equal(inf.oneWebGLContext,true);
 assert.equal(inf.models.length,5);
 assert.deepEqual(Array.from(inf.models.map(m=>m.key)),["today","notes","pulse","symptoms","me"]);
 assert.ok(inf.models.every(m=>m.vertexCount>150));
 const combined=x.calls.buffers[0];
 assert.ok(ArrayBuffer.isView(combined),"WebGL receives a Float32Array vertex buffer even across VM realms");
 assert.equal(combined.length,inf.vertexCount*9);
 let at=0;
 for(const model of inf.models){
  const begin=at,end=at+model.vertexCount*9;
  const xyz=[[],[],[]];
  for(let i=begin;i<end;i+=9){
    for(let a=0;a<3;a++)xyz[a].push(combined[i+a]);
  }
  assert.ok(xyz.every(p=>Math.max(...p)-Math.min(...p)>.4),
    model.key+" must have actual 3D width, height and depth");
  at=end;
 }
 assert.equal(x.dock.parentNode,x.body);
 assert.equal(x.icons.length,5);
 assert.equal(x.dock.classList.contains("setka-cycle-webgl-objects"),true);
 assert.ok(x.icons.every(icon=>icon.children.length===1&&icon.children[0].tagName==="svg"),
   "SVG originals remain untouched as fallback");
});
test("render uses the exact signed card angle for five separate solids; dock never moves",()=>{
 const x=fixture(),rotor=x.ctx.window.SETKA_CYCLE_DOCK_ROTATION;
 const initial=x.calls.draws.length;
 rotor.render(-68.25);
 assert.equal(x.ctx.window.SETKA_CYCLE_3D_MODELS.getAngle(),-68.25);
 assert.equal(rotor.getAngle(),-68.25);
 assert.equal(x.calls.draws.length-initial,5);
 assert.ok(Math.abs(x.calls.angles.at(-1)-(-68.25*Math.PI/180))<1e-8);
 assert.equal(x.dock.style.transform,undefined);
 assert.equal(x.dock.parentNode,x.body);
 assert.equal(x.calls.viewports.filter(p=>p.length===4).length>=5,true);
 rotor.rest(true);
 assert.equal(x.ctx.window.SETKA_CYCLE_3D_MODELS.getAngle(),180);
 rotor.rest(false);
 assert.equal(x.ctx.window.SETKA_CYCLE_3D_MODELS.getAngle(),0);
});
test("webgl fallback retains the native SVGs and does not crash the card swipe",()=>{
 const x=fixture({webgl:false}),r=x.ctx.window.SETKA_CYCLE_DOCK_ROTATION;
 assert.equal(x.ctx.window.SETKA_CYCLE_3D_MODELS.isLive(),false);
 assert.equal(x.dock.classList.contains("setka-cycle-webgl-objects"),false);
 assert.equal(x.dock.querySelectorAll(".st-dock-icon").length,5);
 assert.ok(x.icons.every(icon=>icon.children.length===2));
 r.render(-75);
 assert.equal(Number.parseFloat(x.dock.style["--setka-cycle-dock-angle"]),-75);
 assert.equal(r.getGeometry().fallback,true);
});
test("the experiment integrates WebGL first and still preserves previous vertical and horizontal rotations",()=>{
 const obj=html.indexOf("standalone-cycle-dock-objects-v2.js");
 const adapter=html.indexOf("standalone-cycle-dock-rotation-v1.js");
 assert.ok(obj>0&&adapter>obj,"WebGL solids must initialize before the adapter");
 assert.match(css,/setka-cycle-webgl-objects \.st-dock-icon>svg/);
 assert.match(css,/#setkaCycle3DObjects/);
 assert.doesNotMatch(css,/setka-cycle-icon-depth/);
 assert.match(html,/SETKA_CYCLE_DOCK_ROTATION\?\.render\(angle\)/);
 assert.match(html,/standalone-vertical-logo-v1\.js/);
});
