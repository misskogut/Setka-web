import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const file="standalone-pattern-matrix-trampoline.js";
const text=fs.readFileSync(file,"utf8");
const descriptor=JSON.parse(text.match(/^\/\* SETKA_PATTERN_DESCRIPTOR\n([\s\S]*?)\nEND_SETKA_PATTERN_DESCRIPTOR/)[1]);
const engines={};
const registry={
 has:id=>id===descriptor.id,
 bindRenderer:(id,fn)=>engines.render=fn,
 bindInteraction:(id,fn)=>engines.interact=fn
};
vm.runInNewContext(text,{window:{SetkaPatternRegistryV1:registry},document:{currentScript:{dataset:{patternId:descriptor.id}}},Math},{timeout:1500});
function capture(config,frame){
 const edges=[],dots=[],fills=[];
 let start=null;
 const ctx={
  save(){},restore(){},beginPath(){},
  fillRect(x,y,w,h){fills.push({x,y,w,h,color:this.fillStyle})},
  moveTo(x,y){start=[x,y]},
  lineTo(x,y){if(start){edges.push({x:start[0],y:start[1],tx:x,ty:y,color:this.strokeStyle});start=[x,y]}},
  stroke(){},
  arc(x,y,r){dots.push({x,y,r,color:this.fillStyle})},fill(){}
 };
 engines.render(ctx,360,360,config,frame);
 return {edges,dots,fills};
}
const config=descriptor.defaults;
test("one-file pattern describes a canonical monochrome 1000-element camera bounce",()=>{
 assert.equal(descriptor.palettes.length,9);
 assert.deepEqual(descriptor.palettes[descriptor.defaults.colorModeIndex],[255,255,255]);
 assert.equal(descriptor.module,file);
 assert.ok(descriptor.controls.some(c=>c[1]==="bounceDistance"));
 assert.ok(descriptor.controls.some(c=>c[1]==="bounceSpeed"));
 assert.ok(descriptor.controls.some(c=>c[1]==="bounceElasticity"));
 assert.ok(engines.render&&engines.interact);
 const initial=capture(config,0);
 assert.equal(initial.fills[0].color,"#000");
 assert.ok(initial.edges.length>4000,"wireframe cubes render");
 assert.ok(initial.edges.every(e=>e.color==="#fff"),"white on black");
 assert.deepEqual(initial,capture(config,0),"deterministic Replay");
});
test("bounce departs from grid after impact, never lifts the entire cube vertically",()=>{
 const landing=capture(config,0),apex=capture(config,37);
 // Compare the projected dimensions of the same center-nearest grid
 // rather than merely trusting an inverted sign in the math.
 const spread=items=>Math.max(...items.map(e=>Math.abs(e.tx-180)));
 assert.ok(spread(apex.edges)<spread(landing.edges),
  "away-from-grid camera produces a smaller projected lattice at apex");
 assert.notDeepEqual(apex,landing);
 const farther=capture({...config,bounceDistance:300},37);
 assert.ok(spread(farther.edges)<spread(apex.edges),"greater distance means farther from grid");
});
test("spring, speed, zoom, geometry, palette and camera gesture independently affect rendered frames",()=>{
 const base=capture(config,24);
 for(const [key,value] of [["bounceElasticity",5],["bounceSpeed",2],["cameraZoom",145],["shapeIndex",2],["colorModeIndex",7]]){
  assert.notDeepEqual(capture({...config,[key]:value},24),base,key);
 }
 const spheres=capture({...config,shapeIndex:1},24);
 assert.ok(spheres.dots.length>50&&spheres.edges.length===0);
 const patched=engines.interact({...config},{type:"patch",patch:{bounceDistance:230}});
 assert.equal(patched.bounceDistance,230,"shared slider patch must take effect");
 const moved=engines.interact({...config},{type:"gesture",fingers:1,zone:"center",dx:60,dy:-30,width:390,height:844});
 assert.ok(moved.yaw>config.yaw&&moved.pitch>config.pitch);
 const two=engines.interact({...config},{type:"gesture",fingers:2,zone:"center",dx:60,dy:0});
 assert.equal(two.yaw,config.yaw,"multi-touch never leaks into camera rotation");
 assert.deepEqual(capture(config,24),base,"no hidden renderer state");
});


test("original p5 matrix keeps cube edge at one tenth of center spacing",()=>{
 const normal={...config,yaw:0,pitch:0,bounceEnabled:0};
 const picture=capture(normal,0).edges;
 const bounds=(i)=>{
  const group=picture.slice(i*12,(i+1)*12);
  assert.equal(group.length,12,"every cube keeps its 12 edges");
  const xs=group.flatMap(e=>[e.x,e.tx]);
  const lo=Math.min(...xs),hi=Math.max(...xs);
  return {center:(lo+hi)/2,width:hi-lo};
 };
 const left=bounds(4),right=bounds(5);
 const proportion=left.width/(right.center-left.center);
 assert.ok(Math.abs(proportion-.1)<.005,"cube side / step = 1:10; got "+proportion);
 assert.equal(descriptor.defaults.manualDepth,0);
 assert.equal(descriptor.defaults.depthSensitivity,1);
 assert.equal(descriptor.defaults.bounceEnabled,1);
});
test("right-edge vertical swipe travels THROUGH layers, and returns without rotation or zoom",()=>{
 let current={...config,bounceEnabled:0};
 const initial=capture(current,12);
 const event=(dy)=>({type:"gesture",phase:"move",zone:"right",fingers:1,dx:0,dy,width:390,height:844});
 current=engines.interact(current,event(-65));
 assert.ok(current.manualDepth>0,"swipe upward goes forward");
 assert.equal(current.yaw,config.yaw);
 assert.equal(current.pitch,config.pitch);
 assert.equal(current.cameraZoom,config.cameraZoom);
 assert.notDeepEqual(capture(current,12),initial,"camera physically moves through 3D projection");
 assert.equal(capture(current,4).edges.length,capture(current,40).edges.length,
  "turning off spring freezes depth regardless of frame");
 const farther=engines.interact(current,{...event(-65),dx:100});
 assert.ok(farther.manualDepth>current.manualDepth);
 assert.equal(farther.yaw,current.yaw,"horizontal drift on depth rail does not rotate");
 const back=engines.interact(farther,event(80));
 assert.ok(back.manualDepth<farther.manualDepth,"downward moves back");
 assert.equal(engines.interact(current,event(-100000)).manualDepth,6.2);
 assert.equal(engines.interact(current,event(100000)).manualDepth,0);
 const fast=engines.interact({...config,depthSensitivity:2},event(-60));
 const slow=engines.interact({...config,depthSensitivity:.5},event(-60));
 assert.ok(fast.manualDepth>slow.manualDepth);
 const center=engines.interact(current,{...event(-65),zone:"center"});
 assert.equal(center.manualDepth,current.manualDepth,"center swipe cannot change depth");
 assert.notEqual(center.pitch,current.pitch,"center swipe retains rotation control");
 const double=engines.interact(current,{...event(-65),fingers:2});
 assert.equal(double.manualDepth,current.manualDepth,"pinch cannot leak into depth gesture");
 const snapped=engines.interact({...config},{type:"patch",patch:{manualDepth:2.5,bounceEnabled:0}});
 assert.equal(snapped.manualDepth,2.5);
 assert.equal(snapped.bounceEnabled,0);
 assert.deepEqual(capture(snapped,37),capture(snapped,37),"depth is replay-deterministic");
});
