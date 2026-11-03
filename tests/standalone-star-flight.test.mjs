import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync("standalone-pattern-star-flight.js","utf8");
const match=source.match(/^\/\* SETKA_PATTERN_DESCRIPTOR\n([\s\S]*?)\nEND_SETKA_PATTERN_DESCRIPTOR/);
const descriptor=JSON.parse(match[1]);
const registrySource=fs.readFileSync("standalone-pattern-registry-v1.js","utf8");
const ctxEnv={window:{dispatchEvent(){}},CustomEvent:class{},Math,Float32Array};
vm.runInNewContext(registrySource,ctxEnv);
const R=ctxEnv.window.SetkaPatternRegistryV1;
if(!R.has(descriptor.id))R.register(descriptor);
vm.runInNewContext(source,{window:{SetkaPatternRegistryV1:R},document:{currentScript:{dataset:{patternId:descriptor.id}}},Math,Float32Array},{timeout:2000});

class Canvas {
 constructor(){this.fillStyle="#000";this.globalAlpha=1;this.commands=[];this.path=null}
 save(){} restore(){} translate(){}
 fillRect(x,y,w,h){if(this.fillStyle==="#000")return; if(this.commands.length<140)this.commands.push(["rect",x,y,w,h,this.fillStyle])}
 beginPath(){this.path=null}
 arc(x,y,r){this.path=[x,y,r]}
 fill(){if(this.path&&this.commands.length<140)this.commands.push(["circle",...this.path,this.fillStyle])}
}
const conf=()=>structuredClone(descriptor.defaults);
function draw(c,f,w=390,h=844){
 const ctx=new Canvas();
 const start=performance.now();R.render(ctx,w,h,c,f,false,descriptor.id);
 return {commands:ctx.commands,elapsed:performance.now()-start};
}
test("star-field module exposes all nine palettes and keeps monochrome startup",()=>{
 assert.equal(descriptor.colorModes,9);
 assert.equal(descriptor.defaults.colorModeIndex,0);
 assert.deepEqual(descriptor.palettes[0],[255,255,255]);
 assert.equal(R.ready(descriptor.id),true);
 const before=conf(),colors=[];
 for(let mode=0;mode<9;mode++){
  const c={...before,colorModeIndex:mode};
  assert.equal(R.validate(c,descriptor.id).ok,true);
  const snap=R.snapshot({patternId:descriptor.id,config:c,frame:177});
  const restored=R.restore(snap);
  assert.equal(restored.ok,true);assert.equal(restored.snapshot.config.colorModeIndex,mode);
  const a=draw(c,177),b=draw(c,177);
  assert.deepEqual(a.commands,b.commands);
  assert.ok(a.commands.length>10,"stars visible in "+mode);
  const list=[...new Set(a.commands.map(x=>x.at(-1)))];
  colors.push(list);
  if(mode===0)assert.deepEqual(list,["rgb(255,255,255)"]);
  if(mode>=5)assert.ok(list.length>3,"spatially distinct rainbow: "+mode);
 }
 for(let i=1;i<9;i++)assert.notDeepEqual(colors[i],colors[0]);
 assert.notDeepEqual(colors[5],colors[6]);
 assert.notDeepEqual(colors[6],colors[7]);
 assert.notDeepEqual(colors[7],colors[8]);
});
test("deterministic star count bounds and cached camera projection",()=>{
 for(const count of [1000,10000,30000]){
  const c={...conf(),starCount:count};
  assert.ok(draw(c,81).commands.length>2);
  assert.deepEqual(draw(c,81).commands,draw(c,81).commands);
 }
});
test("camera rebase preserves position at interaction frame and moving saved previews",()=>{
 let c=conf();
 let moved=R.interact(descriptor.id,c,{type:"patch",frame:55,patch:{speed:110}});
 assert.equal(moved.anchorFrame,55);
 assert.ok(Math.abs(moved.originZ-1100)<1e-6);
 assert.equal(moved.rollOffset,0);
 assert.deepEqual(draw(c,55).commands,draw(moved,55).commands,"speed change cannot teleport camera");
 c=moved;
 moved=R.interact(descriptor.id,c,{type:"gesture",frame:81,fingers:1,zone:"center",dx:20,dy:-15,width:390,height:844});
 assert.ok(moved.yaw>0&&moved.pitch>0);
 assert.equal(moved.anchorFrame,81);
 assert.ok(Math.abs(moved.originZ-(1100+26*110))<1e-6);
 assert.notDeepEqual(draw(moved,44).commands,draw(moved,46).commands,"preview must animate even if frame is earlier than anchor");
 const old=conf();
 assert.deepEqual(old,descriptor.defaults,"hooks never mutate caller's configuration");
});
test("one-finger nose steering follows the finger on both axes and never alters speed",()=>{
 const c=conf(),f=50;
 for(const [dx,dy,yawSign,pitchSign] of [[50,0,1,0],[-50,0,-1,0],[0,-50,0,1],
   [0,50,0,-1],[50,-50,1,1],[-50,50,-1,-1]]){
  const steered=R.interact(descriptor.id,c,{type:"gesture",frame:f,fingers:1,zone:"center",dx,dy,width:390,height:844});
  assert.equal(Math.sign(steered.yaw),yawSign, "course follows X sign");
  assert.equal(Math.sign(steered.pitch),pitchSign, "nose follows inverted pixel Y sign");
  for(const key of ["speed","starCount","bokeh","rollRate","colorModeIndex"])
    assert.equal(steered[key],c[key],"course must not touch "+key);
  assert.equal(steered.anchorFrame,f);
  assert.equal(steered.originZ,1000,"position is anchored when rotating");
  const snap=R.snapshot({patternId:descriptor.id,config:steered,frame:f});
  assert.equal(R.restore(snap).ok,true,"steering persists across exact replay");
 }
});

test("edge zones are exclusive, signed roll works both directions, and bottom owns speed",()=>{
 const c=conf(), zones=[
  ["top",40,20,"rollRate"],
  ["left",30,-40,"starCount"],
  ["right",30,-30,"bokeh"],
  ["bottom",40,20,"speed"]
 ];
 for(const [zone,dx,dy,key] of zones){
  const next=R.interact(descriptor.id,c,{type:"gesture",frame:40,fingers:1,zone,dx,dy,width:390,height:844});
  assert.notEqual(next[key],c[key],zone+" responds");
  for(const other of ["starCount","speed","rollRate","bokeh","yaw","pitch"].filter(x=>x!==key))
   assert.equal(next[other],c[other],zone+" must not alter "+other);
 }
 const left=R.interact(descriptor.id,c,{type:"gesture",frame:40,fingers:1,zone:"top",dx:-40,dy:10});
 assert.ok(left.rollRate<0,"roll left is as responsive as roll right");
 assert.equal(R.validate(left,descriptor.id).ok,true);
});

test("two fingers strafe in camera space, not yaw/pitch or settings",()=>{
 const c=conf(),f=40, scale=390*.045;
 for(const zone of ["center","top","bottom","left","right"]){
  const next=R.interact(descriptor.id,c,{type:"gesture",frame:f,fingers:2,zone,dx:32,dy:-48,width:390,height:844});
  assert.ok(Math.abs(next.originX-32*scale)<.001,"rightward pan moves ship right");
  assert.ok(Math.abs(next.originY+48*scale)<.001,"upward pan moves ship up");
  assert.equal(next.originZ,f*c.speed,"continuous forward movement is anchored");
  assert.equal(next.anchorFrame,f);
  for(const key of ["yaw","pitch","speed","rollRate","starCount","bokeh","colorModeIndex"])
   assert.equal(next[key],c[key],"pan cannot modify "+key);
  const snap=R.snapshot({patternId:descriptor.id,config:next,frame:f});
  assert.equal(R.restore(snap).ok,true);
  assert.deepEqual(draw(next,f).commands,draw(next,f).commands,"pan is deterministic");
 }
 const pinch=R.interact(descriptor.id,c,{type:"gesture",frame:f,fingers:2,zone:"center",dx:0,dy:0});
 assert.equal(R.configKey(pinch,descriptor.id),R.configKey(c,descriptor.id),"pinch without centroid displacement cannot steer");
 const one=R.interact(descriptor.id,c,{type:"gesture",frame:f,fingers:1,zone:"center",dx:50,dy:-50,width:390,height:844});
 assert.notDeepEqual(draw(one,80).commands,draw(c,80).commands,"orientation changes starfield visually");
});

test("gesture hints and all nine colour modes remain in one descriptor",()=>{
 const d=R.get(descriptor.id);
 assert.ok(d.gestureHints.some(row=>row[1].includes("2 пальца")));
 assert.equal(d.controls.filter(row=>row[1]==="yaw")[0][6],1);
 assert.equal(d.controls.filter(row=>row[1]==="pitch")[0][6],1);
 assert.ok(d.controls.find(row=>row[1]==="speed")[5].includes("Снизу"));
 assert.equal(d.colorModes,9);
});
