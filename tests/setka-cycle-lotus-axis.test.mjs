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

test("submerged lotus petals keep non-zero visible transmission in both directions",()=>{
 for(const direction of [-1,1]){
  const atEdge=g(.5,direction),outside=direction<0?110:-110;
  assert.equal(atEdge.transmissionAtX(outside),1,"exposed petals remain opaque");
  assert.ok(atEdge.transmissionAtX(-outside)>.16,"submerged petal is still visible inside ALMA");
  assert.ok(atEdge.transmissionAtX(-outside)<1,"depth absorbs the inner light");
  assert.ok(atEdge.transmissionAtX(-outside/3)>atEdge.transmissionAtX(-outside),
   "deeply submerged petal is visibly dimmer");
  assert.equal(g(0,direction).transmissionAtX(-outside),0,
   "the flat SETKA backside must not glow with interior petals");
  assert.equal(g(.25,direction).transmissionAtX(-outside),0,
   "opaque SETKA face must not transmit interior petals");
  assert.equal(g(.49,direction).transmissionAtX(-outside),0,
   "near the edge SETKA is STILL shown and remains fully opaque");
  assert.ok(g(.5,direction).transmissionAtX(-outside)>.08,
   "ALMA interior becomes visible only when its face turns to camera");
  const projected=atEdge.projectInteriorX(-outside);
  assert.equal(Math.sign(projected),-Math.sign(outside),
   "buried petals must retain their own half, not fold onto the exposed half");
  assert.ok(Math.abs(projected)>Math.abs(outside)*.03,
   "the buried half must have nonzero width even when the card stands edge-on");
  assert.ok(Math.abs(projected)<Math.abs(outside)*.06,
   "the edge-on silhouette is narrow and stays inside ALMA's card");
  assert.equal(g(1,direction).projectInteriorX(-outside),-outside,
   "resting original must preserve its geometry");
  for(const p of [.65,.7,.75,.8,.85]){
   const geometry=g(p,direction),inner=-outside;
   assert.ok(Math.abs(geometry.projectInteriorX(inner))>.25*Math.abs(inner),
    "half of the lotus must remain visibly wide inside the calendar at p="+p);
   assert.ok(geometry.transmissionAtX(inner)>.25,
    "internal petals must not disappear from over-attenuation at p="+p);
  }
  for(const p of [.35,.4,.45,.5,.55,.6,.65,.7,.75,.8,.85,.9,.95]){
   const current=g(p,direction),submerged=-outside,depth=current.depthAtX(submerged);
   if(depth>=0||current.transmissionAtX(submerged)<=.01)continue;
   const screenX=current.projectInteriorX(submerged);
   assert.equal(Math.sign(screenX),Math.sign(submerged),
    "inner petals must remain on their original side of the lotus at p="+p);
   assert.ok(Math.abs(screenX)<=Math.abs(submerged)*1.0001,
    "the buried half must remain within its original half-card footprint");
   assert.ok(current.interiorZAtX(submerged)<0,
    "inner petals recede into Z-depth behind the ALMA surface");
   // The shader and acceptance model must apply the same ALMA absorption.
   const s=Math.abs(Math.sin(current.radians));
   const e=Math.max(0,Math.min(1,(s-.02)/.53));
   const edge=e*e*(3-2*e);
   const f=Math.max(0,Math.min(1,Math.cos(current.radians)/.4));
   const face=f*f*(3-2*f);
   const alpha=(current.progress>=.5?.48+.52*face:0)*edge*(.48+.52*Math.exp(depth/190));
   close(current.transmissionAtX(submerged),alpha);
  }
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
 assert.match(js,/if\(uLayer<\.5\)/,"back petals must have their own pass");
 assert.match(js,/float absorption=\.48\+\.52\*exp\(-travel\/190\.\)/);
 assert.match(js,/float edgeTransmission=smoothstep/);
 assert.match(js,/c\.a\*=transmission/,"submerged petals transmit, not disappear");
 assert.match(js,/world\.x=aPos\.x\*chamberWidth/);
 assert.match(js,/world\.z=-immersed\*\(\.18\+\.22\*edge\)/);
 assert.match(js,/uCycleFace<\.5\)discard/,"opaque squish face must occlude interior");
 assert.match(js,/almaTransmission=\.48\+\.52\*smoothstep/);
 assert.match(js,/function strips\(/);
 assert.match(js,/gl\.disable\(gl\.DEPTH_TEST\)/,"rear transmission is not killed by the card depth");
 assert.match(js,/gl\.enable\(gl\.DEPTH_TEST\)/);
 assert.match(js,/gl\.colorMask\(false,false,false,false\)/);
 assert.match(js,/gl\.drawArrays\(gl\.TRIANGLES,0,6\)/);
 assert.match(js,/quad\(-box\.W\/2,box\.topY,box\.W\/2,box\.bottomY\)/);
 assert.match(js,/strips\(-box\.w\/2,-box\.h\/2,box\.w\/2,box\.h\/2\)/);
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
 const revision="20261123-alma-inside-half-visible-v9";
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
 assert.equal(paints,3,"rear material, depth-only card and exposed lotus all draw");
 assert.equal(doc.documentElement.classList.contains("setka-cycle-hides-original-lotus"),true);
 api.rest();
 assert.equal(api.getInfo().ready,true,"releasing swipe must preserve prepared GPU texture");
 assert.equal(api.getInfo().prewarmed,true);
 assert.equal(doc.documentElement.classList.contains("setka-cycle-hides-original-lotus"),false);
 api.start();api.render(.65,1);
 assert.equal(paints,6,"both depth layers repaint instantly on reverse gesture");
 assert.equal(createdImages,1,"no image reload after normal release");
 api.rest();
});
