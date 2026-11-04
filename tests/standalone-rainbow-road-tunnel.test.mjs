import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

// Opt-in, reusable acceptance contract: any *future* road-tunnel package
// declaring these capabilities must preserve paint order and flat dashes.
const files=fs.readdirSync(".").filter(f=>/^standalone-pattern-[a-z0-9-]+\.js$/.test(f));
const registryContext={window:{dispatchEvent(){}},CustomEvent:class{}};
vm.runInNewContext(fs.readFileSync("standalone-pattern-registry-v1.js","utf8"),registryContext);
const registry=registryContext.window.SetkaPatternRegistryV1;
const candidates=[];
for(const file of files){
 const source=fs.readFileSync(file,"utf8");
 const match=source.match(/^\/\* SETKA_PATTERN_DESCRIPTOR\n([\s\S]*?)\nEND_SETKA_PATTERN_DESCRIPTOR/);
 if(!match)continue;
 const d=JSON.parse(match[1]);
 if(!d.capabilities?.paintedRoadDashes&&!d.capabilities?.stableEmitterLayering)continue;
 registry.register(d);
 const doc={
  currentScript:{dataset:{patternId:d.id}},
  createElement(){
   return {width:0,height:0,getContext(){return {
    createRadialGradient(){return {addColorStop(){}}},fillRect(){},fillStyle:""
   }}};
  }
 };
 vm.runInNewContext(source,{window:{SetkaPatternRegistryV1:registry},document:doc,Math},{timeout:3000});
 candidates.push(d);
}
assert.ok(candidates.length>0,"at least one released road tunnel declares an occlusion-safe road-paint contract");

class CanvasRecorder{
 constructor(){this.fillStyle="#000";this.globalAlpha=1;this.calls=[];this.path=null;this.stack=[]}
 save(){this.stack.push({fillStyle:this.fillStyle,globalAlpha:this.globalAlpha})}
 restore(){Object.assign(this,this.stack.pop()||{})}
 beginPath(){this.path=[];this.shape="poly"}
 moveTo(x,y){this.path.push([x,y]);this.shape="poly"}
 lineTo(x,y){this.path.push([x,y])}
 closePath(){}
 arc(x,y,r){this.path=[[x,y,r]];this.shape="circle"}
 ellipse(){this.calls.push({kind:"ellipse"})}
 translate(){}
 rotate(){}
 fill(){
  this.calls.push({kind:"fill",shape:this.shape,coords:this.path?.flat()||[],
   color:this.fillStyle,alpha:this.globalAlpha});
 }
 fillRect(x,y,w,h){this.calls.push({kind:"rect",coords:[x,y,w,h],
  color:this.fillStyle,alpha:this.globalAlpha})}
 drawImage(){this.calls.push({kind:"halo"})}
}
function draw(d,changes={},frame=120,preview=false){
 const c={...d.defaults,...changes},ctx=new CanvasRecorder();
 registry.render(ctx,390,844,c,frame,preview,d.id);
 return ctx.calls;
}
function painted(calls){
 return calls.filter(c=>c.color?.startsWith("hsl(") &&
  (c.kind==="rect"||(c.kind==="fill"&&c.shape==="poly")));
}
const extreme=d=>({...d.defaults,
 colorModeIndex:Math.min(2,d.colorModes-1),
 turns:d.controls.find(x=>x[1]==="turns")?.[3]??d.defaults.turns,
 hills:d.controls.find(x=>x[1]==="hills")?.[3]??d.defaults.hills,
 randomness:d.controls.find(x=>x[1]==="randomness")?.[3]??d.defaults.randomness,
 steerX:d.controls.find(x=>x[1]==="steerX")?.[3]??d.defaults.steerX,
 steerY:d.controls.find(x=>x[1]==="steerY")?.[2]??d.defaults.steerY,
 density:.5,sphereSolidity:1});

test("future road emitters never receive black polygon overpaint, including maximum bends",()=>{
 for(const d of candidates.filter(x=>x.capabilities?.stableEmitterLayering)){
  for(const [frame,preview] of [[0,false],[137,false],[1000,true],[1000000,false]]){
   const calls=draw(d,extreme(d),frame,preview);
   const firstBall=calls.findIndex(c=>c.kind==="fill"&&c.shape==="circle"&&c.color?.startsWith("hsl("));
   assert.ok(firstBall>=0,d.id+" must display colored spheres at frame "+frame);
   assert.equal(calls.slice(firstBall).filter(c=>c.color==="#000"||c.color==="#050509").length,0,
    d.id+" must not draw black occluding walls/road after any sphere");
   assert.equal(calls.some(c=>c.kind==="ellipse"),false,
    d.id+" road paint must not use screen-facing ellipsoids");
   for(const c of calls.filter(c=>c.coords))
    assert.ok(c.coords.every(Number.isFinite),d.id+" must keep projected geometry finite at "+frame);
  }
 }
});

test("flat road paint remains above spheres at zero surface opacity",()=>{
 for(const d of candidates.filter(x=>x.capabilities?.paintedRoadDashes)){
  const solid=draw(d,{...extreme(d),roadOpacity:1,opacity:1},120);
  assert.ok(painted(solid).length>8,d.id+" must draw many flat projected dashes");
  const firstPaint=solid.findIndex(c=>c.color?.startsWith("hsl(")&&
   (c.kind==="rect"||(c.kind==="fill"&&c.shape==="poly")));
  assert.ok(firstPaint>=0,d.id+" must have actual flat paint shapes");
  assert.equal(solid.slice(firstPaint).some(c=>c.kind==="fill"&&c.shape==="circle"),false,
   d.id+" spheres must be drawn before the final ground-paint pass");
  const invisible=draw(d,{...extreme(d),roadOpacity:0,opacity:0},120);
  assert.ok(painted(invisible).length>8,d.id+" dashes must survive transparent floor/walls");
 }
});

test("solid-sphere material is a saved slider rather than new particles or a separate pattern",()=>{
 for(const d of candidates){
  const control=d.controls.find(x=>x[1]==="sphereSolidity");
  assert.ok(control,d.id+" must expose bokeh-to-solid material slider");
  assert.deepEqual(control.slice(2,7),[0,1,.05,"Ползунок",0]);
  assert.ok(d.keyFields.includes("sphereSolidity"),d.id+" material must participate in config hashes");
  const base={...d.defaults,colorModeIndex:Math.min(2,d.colorModes-1),density:.35};
  const bokeh=draw(d,{...base,sphereSolidity:0},120);
  const solid=draw(d,{...base,sphereSolidity:1},120);
  assert.ok(bokeh.some(c=>c.kind==="halo"),"bokeh includes halos");
  assert.equal(solid.some(c=>c.kind==="halo"),false,"solid spheres do not use bokeh sprites");
  const radii=calls=>calls.filter(c=>c.kind==="fill"&&c.shape==="circle"&&c.color?.startsWith("hsl("))
    .slice(0,25).map(c=>c.coords[2]);
  const a=radii(bokeh),b=radii(solid);
  assert.ok(a.length>5&&b.length>5);
  assert.ok(b.every((r,i)=>r>a[i]),"same emitters grow into crisp solid cores");
  const snap=registry.snapshot({patternId:d.id,config:{...base,sphereSolidity:.85},frame:120});
  const restored=registry.restore(snap);
  assert.equal(restored.ok,true);
  assert.equal(restored.snapshot.config.sphereSolidity,.85);
  assert.deepEqual(draw(d,restored.snapshot.config,120,true),draw(d,restored.snapshot.config,120,true),
   "preview and replay are deterministic");
  const oldConfig={...d.defaults};delete oldConfig.sphereSolidity;
  const legacy=registry.restore({version:3,schemaVersion:2,configSchemaVersion:3,
   patternId:d.id,patternVersion:3,config:oldConfig,frame:80});
  assert.equal(legacy.ok,true,"previous saved schema must remain readable");
  assert.equal(legacy.snapshot.config.sphereSolidity,d.defaults.sphereSolidity);
 }
});
