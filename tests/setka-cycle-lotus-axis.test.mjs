import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const js=fs.readFileSync("experiments/standalone-cycle-lotus-axis-v1.js","utf8");
const css=fs.readFileSync("experiments/standalone-cycle-lotus-axis-v1.css","utf8");
const host=fs.readFileSync("standalone-v34-cycle-logo3d.html","utf8");
const canonical=fs.readFileSync("standalone-v34.html","utf8");
function geometry(){
 const win={};
 const document={getElementById(){return null}};
 vm.runInNewContext(js,{window:win,document,console,Math,Number},{filename:"standalone-cycle-lotus-axis-v1.js"});
 return win.SETKA_CYCLE_LOTUS_AXIS.geometry;
}
const g=geometry();
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,"expected "+a+" ~ "+b);

test("physical card and lotus have two opposed Y axes throughout both swipes",()=>{
 for(const direction of [-1,1]){
  for(const p of [0,.05,.1,1/6,.25,1/3,.45,.5,.55,2/3,.75,5/6,.9,.95,1]){
   const state=g(p,direction);
   close(state.cardYaw+state.counterYaw,0);
   assert.equal(state.yaw,0,"the original lotus always faces the viewer");
   assert.equal(state.opacity,1,"never fade the lotus as a substitute for depth");
   assert.equal(state.emergingSide,direction<0?"right":"left");
  }
  close(g(1,direction).cardYaw,0);
  close(Math.abs(g(.5,direction).cardYaw),90);
  close(g(.5,direction).visibleFraction,.5);
  close(g(0,direction).visibleFraction,0);
  close(g(1,direction).visibleFraction,1);
 }
});

test("3D half-space selects only the ALMA-facing half, never SETKA's reverse",()=>{
 const pivot=0,edge=110;
 for(const direction of [-1,1]){
  const s=g(.5,direction);
  close(s.depthAtX(pivot),0);
  const exposed=direction<0?edge:-edge;
  const buried=-exposed;
  assert.ok(s.depthAtX(exposed)>0,"exposed petal belongs to ALMA half-space");
  assert.ok(s.depthAtX(buried)<0,"opposite petal is inside the card");
  for(const p of [1/6,.25,.5,.75,5/6]){
   const state=g(p,direction);
   assert.ok(state.depthAtX(exposed)>state.depthAtX(buried));
  }
  assert.ok(g(.75,direction).visibleFraction>.5);
  assert.ok(g(.25,direction).visibleFraction<.5);
  assert.equal(g(0,direction).enabled,false);
  assert.equal(g(1,direction).enabled,true);
 }
});

test("the actual painter uses physical WebGL 3D rather than a 2D cropping mask",()=>{
 assert.match(js,/getContext\("webgl"/);
 assert.match(js,/const FS=\[/);
 assert.match(js,/"precision highp float;"/g);
 assert.doesNotMatch(js,/"precision mediump float;"/);
 assert.match(js,/WEBGL_lose_context/);
 assert.match(js,/attribute vec2 aPos/);
 assert.match(js,/vec3 inCard=uIsLotus>\.5\?ry\(vec3\(aPos,0\.\),-uAngle\)/);
 assert.match(js,/vec3 world=ry\(inCard,uAngle\)/);
 assert.match(js,/vCycleSide=inCard\.z/);
 assert.match(js,/if\(vCycleSide<0\.\)discard/);
 assert.match(js,/gl\.enable\(gl\.DEPTH_TEST\)/);
 assert.match(js,/gl\.colorMask\(false,false,false,false\)/);
 assert.match(js,/gl\.drawArrays\(gl\.TRIANGLES,0,6\)/);
 assert.match(js,/quad\(-box\.W\/2,box\.topY,box\.W\/2,box\.bottomY\)/);
 assert.match(js,/quad\(-box\.w\/2,-box\.h\/2,box\.w\/2,box\.h\/2\)/);
 assert.doesNotMatch(js,/mask\.style\.width|pivot\.style\.left|style\.clipPath|webkitClipPath/);
 assert.doesNotMatch(css,/clip-path|overflow:hidden|turn-mask|turn-pivot/);
 assert.match(css,/canvas|lotus-webgl/);
});

test("original ALMA is restored when the flip ends, with the same calendar and gestures",()=>{
 assert.match(js,/svg\.cloneNode\(true\)/);
 assert.match(js,/copyStyleTree\(svg,copy,iframe\.contentWindow\)/);
 assert.match(js,/XMLSerializer/);
 assert.match(js,/original\(true,v\.doc\)/);
 assert.match(js,/original\(false,v\.doc\)/);
 assert.match(js,/v\.canvas\.remove\(\)/);
 assert.match(js,/setka-cycle-single-lotus-rule/);
 assert.match(css,/pointer-events:none!important/);
 assert.match(css,/body:not\(\.cycle-flip-active\)/);
});

test("3D animation is isolated to experimental front; canonical SETKA stays unchanged",()=>{
 const revision="20261123-lotus-hinged-3d-depth-v4-live-pivot";
 assert.ok(host.includes("standalone-cycle-lotus-axis-v1.js?v="+revision));
 assert.ok(host.includes("standalone-cycle-lotus-axis-v1.css?v="+revision));
 assert.match(host,/SETKA_CYCLE_LOTUS_AXIS\?\.start\(\)/);
 assert.match(host,/SETKA_CYCLE_LOTUS_AXIS\?\.render\(progress,direction\)/);
 assert.match(host,/SETKA_CYCLE_LOTUS_AXIS\?\.rest\(\)/);
 assert.doesNotMatch(canonical,/standalone-cycle-lotus-axis-v1/);
 assert.ok(host.indexOf("standalone-cycle-lotus-axis-v1.js")<host.indexOf("function setAtRest(cycle)"));
});


test("mobile first swipe: 3D lotus texture is decoded BEFORE gesture and GPU is reused after release",()=>{
 let paints=0,createdImages=0;
 const waiting=[];
 const classes=()=>({
  values:new Set(),
  add(x){this.values.add(x)},
  remove(x){this.values.delete(x)},
  contains(x){return this.values.has(x)},
  toggle(x,flag){if(flag)this.values.add(x);else this.values.delete(x)}
 });
 function el(id=""){
  const node={id,children:[],style:{setProperty(k,v){this[k]=v}},classList:classes(),
   dataset:{},clientWidth:390,clientHeight:250,offsetTop:0,
   setAttribute(){},removeAttribute(){},getAttribute(){return null},
   appendChild(c){this.children.push(c);return c},remove(){this.removed=true},
   addEventListener(){},querySelectorAll(){return []},
   getBoundingClientRect(){return {left:0,top:174,width:390,height:250}},
   cloneNode(){return el("copy")},
  };
  return node;
 }
 const hero=el("hero"),button=el("button"),svg=el("cycle-lotus");
 let sourceTop=0; // hidden iframe layout has no top position while prewarming
 svg.getBoundingClientRect=()=>({left:0,top:sourceTop,width:390,height:250});
 button.querySelector=q=>q==="svg.cycle-lotus"?svg:null;
 const doc={
  head:el("head"),documentElement:el("html"),
  createElement:()=>el("style"),
  getElementById(id){return this.head.children.find(x=>x.id===id)||null},
  querySelector:q=>q===".cycle-lotus-button"?button:q===".cycle-hero"?hero:null
 };
 const gl=new Proxy({},{
  get(_target,key){
   if(key==="NO_ERROR")return 0;
   if(key==="getError")return ()=>0;
   if(key==="getShaderParameter"||key==="getProgramParameter")return ()=>true;
   if(key==="getAttribLocation")return ()=>0;
   if(key==="getUniformLocation")return ()=>0;
   if(key==="getShaderInfoLog"||key==="getProgramInfoLog")return ()=>"";
   if(["createShader","createProgram","createTexture","createBuffer"].includes(key))return ()=>({});
   if(key==="drawArrays")return ()=>{paints++};
   if(typeof key==="string"&&/^[A-Z0-9_]+$/.test(key))return 1;
   return ()=>{};
  }
 });
 const iframe={clientWidth:390,clientHeight:700,offsetTop:12,
  contentDocument:doc,contentWindow:{getComputedStyle(){return {getPropertyValue(){return ""}}}},
  addEventListener(){},getBoundingClientRect(){return {left:0,top:12,width:390,height:700}}
 };
 const parent=el("body");
 const back={querySelector:q=>q==="iframe"?iframe:null};
 const browserDocument={
  body:parent,
  getElementById:id=>id==="setkaCycleBack"?back:null,
  createElement:tag=>{
   const node=el(tag);
   if(tag==="canvas")node.getContext=kind=>kind==="webgl"?gl:null;
   return node;
  }
 };
 class FakeImage{
  constructor(){createdImages++}
  set src(url){this.url=url;waiting.push(this)}
 }
 const Window={innerWidth:390,innerHeight:844,devicePixelRatio:2,addEventListener(){}};
 const URL={createObjectURL:()=> "blob:setka-alma-3d",revokeObjectURL(){}};
 const context={document:browserDocument,window:Window,Image:FakeImage,URL,
  Blob:class{constructor(){}},XMLSerializer:class{serializeToString(){return '<svg xmlns="http://www.w3.org/2000/svg"/>'}},
  setTimeout:()=>1,clearTimeout(){},Math,Number,console};
 vm.runInNewContext(js,context);
 const api=Window.SETKA_CYCLE_LOTUS_AXIS;
 assert.equal(api.getInfo().hasSource,true,"texture begins prewarming while user is idle");
 assert.equal(api.getInfo().ready,false,"decode can legitimately be asynchronous");
 assert.equal(createdImages,1,"prepare one copy of the live ALMA SVG");
 waiting.shift().onload();
 assert.equal(api.getInfo().ready,true);
 assert.equal(api.getInfo().prewarmed,true);
 const hiddenPivot=api.getInfo().pivotY;
 sourceTop=174; // startVisual() has now unhidden the ALMA card
 api.start();
 assert.equal(api.getInfo().pivotY,hiddenPivot+174,
  "3D hinge must be measured AFTER the calendar card becomes visible");
 api.render(.5,-1);
 assert.equal(paints,2,"one depth-only card plane plus lotus are rendered");
 assert.equal(doc.documentElement.classList.contains("setka-cycle-hides-original-lotus"),true);
 api.rest();
 assert.equal(api.getInfo().ready,true,"releasing swipe must preserve prepared GPU texture");
 assert.equal(api.getInfo().prewarmed,true);
 assert.equal(doc.documentElement.classList.contains("setka-cycle-hides-original-lotus"),false);
 api.start();api.render(.65,1);
 assert.equal(paints,4,"second gesture renders immediately without async load");
 assert.equal(createdImages,1,"no image reload after normal release");
 api.rest();
});
