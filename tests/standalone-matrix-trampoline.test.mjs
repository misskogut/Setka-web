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
