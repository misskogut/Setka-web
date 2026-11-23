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
 const revision="20261123-lotus-hinged-3d-depth-v2";
 assert.ok(host.includes("standalone-cycle-lotus-axis-v1.js?v="+revision));
 assert.ok(host.includes("standalone-cycle-lotus-axis-v1.css?v="+revision));
 assert.match(host,/SETKA_CYCLE_LOTUS_AXIS\?\.start\(\)/);
 assert.match(host,/SETKA_CYCLE_LOTUS_AXIS\?\.render\(progress,direction\)/);
 assert.match(host,/SETKA_CYCLE_LOTUS_AXIS\?\.rest\(\)/);
 assert.doesNotMatch(canonical,/standalone-cycle-lotus-axis-v1/);
 assert.ok(host.indexOf("standalone-cycle-lotus-axis-v1.js")<host.indexOf("function setAtRest(cycle)"));
});
