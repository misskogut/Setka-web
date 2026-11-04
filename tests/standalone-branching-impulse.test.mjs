import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync("standalone-pattern-branching-impulse.js","utf8");
const match=source.match(/^\/\* SETKA_PATTERN_DESCRIPTOR\n([\s\S]*?)\nEND_SETKA_PATTERN_DESCRIPTOR/);
assert.ok(match,"module has auto-discoverable descriptor");
const d=JSON.parse(match[1]);
const host={window:{dispatchEvent(){}},CustomEvent:class{}};
vm.runInNewContext(fs.readFileSync("standalone-pattern-registry-v1.js","utf8"),host);
const R=host.window.SetkaPatternRegistryV1;
if(!R.has(d.id))R.register(d);
vm.runInNewContext(source,{window:{SetkaPatternRegistryV1:R},document:{currentScript:{dataset:{patternId:d.id}}},Math},{timeout:2000});
const clone=()=>structuredClone(d.defaults);
function capture(config,frame=150,preview=true){
 const segments=[],fills=[],arcs=[];
 let from=[0,0],to=[0,0];
 const ctx={
  save(){},restore(){},translate(){},scale(){},beginPath(){},
  moveTo(x,y){from=[x,y]},lineTo(x,y){to=[x,y]},
  stroke(){segments.push([from[0],from[1],to[0],to[1],this.lineWidth,this.strokeStyle])},
  fillRect(x,y,w,h){fills.push([x,y,w,h,this.fillStyle])},
  arc(x,y,r){arcs.push([x,y,r,this.fillStyle])},fill(){}
 };
 R.render(ctx,720,720,config,frame,preview,d.id);
 return {segments,fills,arcs};
}
const gesture=(c,phase,frame,x,y,dx=0,dy=0)=>R.interact(d.id,c,{
 type:"gesture",phase,frame,x,y,dx,dy,width:720,height:720,fingers:1,zone:"center"
});
test("one-file pattern integrates by registry without consumer modifications and starts white on black",()=>{
 assert.equal(d.module,"standalone-pattern-"+d.id+".js");
 assert.equal(d.colorModes,9);
 assert.deepEqual(d.palettes[d.defaults.colorModeIndex],[255,255,255]);
 assert.ok(d.controls.some(c=>c[1]==="lineWidth"&&c[2]<=.04));
 assert.ok(d.controls.every(c=>c[6]===0&&c[5]==="Ползунок"));
 assert.ok(d.gestureHints.some(h=>h[1].includes("ветк")));
 assert.equal(R.ready(d.id),true);
 assert.equal(R.hasInteraction(d.id),true);
 assert.ok(R.validate(clone(),d.id).ok);
 const first=capture(clone(),80);
 assert.equal(first.fills[0][4],"#000");
 assert.ok(first.segments.length>1000,"all original recursive branches included");
 assert.ok(first.segments.every(s=>Number.isFinite(s[0])&&Number.isFinite(s[4])));
 assert.ok(first.segments.some(s=>s[5]==="rgba(255,255,255,1)"));
});
test("same frame and configuration reproduce exactly; phase changes geometry and neon moves independently",()=>{
 const c=clone(),a=capture(c,90),b=capture(c,90);
 assert.deepEqual(a,b);
 assert.notDeepEqual(capture(c,150).segments.slice(0,20),a.segments.slice(0,20));
 const stopped={...c,speed:0,colorModeIndex:1};
 assert.notDeepEqual(capture(stopped,90).segments.slice(0,50),capture(stopped,160).segments.slice(0,50),"neon continues to travel when geometry stops");
});
test("ultra-thin line slider and thick stroke are real; nine palettes and radial rainbow vary",()=>{
 const base=capture({...clone(),neon:0,tips:0,lineWidth:.04},180);
 const thick=capture({...clone(),neon:0,tips:0,lineWidth:3.5},180);
 assert.ok(thick.segments[0][4]>base.segments[0][4]*60,"line width reaches a clearly thinner state");
 for(let mode=0;mode<9;mode++){
  const c={...clone(),colorModeIndex:mode};
  assert.ok(R.validate(c,d.id).ok,"valid palette "+mode);
  assert.ok(capture(c,100).segments.length>1000);
 }
 const radial=capture({...clone(),colorModeIndex:8,neon:0},180).segments;
 assert.notEqual(radial[0][5],radial[radial.length-1][5],"rainbow changes along the radius");
});
test("approved broad finger taps retract an entire root branch, hold, release and preserve rotation isolation",()=>{
 const original=clone(),initial=capture({...original,neon:0},100).segments[0];
 const x=(initial[0]+initial[2])/2,y=(initial[1]+initial[3])/2;
 const touched=gesture(original,"start",100,x,y);
 assert.equal(touched.interactionMode,1,"touch selects branch, not rotation");
 assert.ok(touched.touchRoot>=0&&touched.touchNode>=1&&touched.touchNode<=3,"select a visible ancestor bundle");
 assert.equal(touched.touchRetractEpoch,101);
 const early=capture(touched,101),later=capture(touched,116),reference=capture(original,116);
 assert.notDeepEqual(early.segments,later.segments,"withdrawal grows with elapsed contact");
 assert.notDeepEqual(later.segments,reference.segments,"branch visibly retracts while held");
 // The very first root segment is selected. It must visibly shorten.
 const length=s=>Math.hypot(s[2]-s[0],s[3]-s[1]);
 assert.ok(length(later.segments[0])<length(reference.segments[0])*.3,"the selected stem shrinks dramatically");
 const moved=gesture(touched,"move",119,x+70,y-35,70,-35);
 assert.equal(moved.touchDX,0,"drag does not pull or stretch the branch");
 assert.equal(moved.touchDY,0,"drag does not pull or stretch the branch");
 assert.equal(moved.rotation,0,"drag does not rotate when a branch was selected");
 const ended=gesture(moved,"end",119,x+70,y-35);
 assert.equal(ended.touchActive,false);
 assert.notDeepEqual(capture(ended,123).segments,capture(original,123).segments,"a brief tap still retracts visibly");
 assert.deepEqual(capture(ended,180),capture(original,180),"after release, exact original form returns");
 const snap=R.snapshot({patternId:d.id,config:ended,frame:125});
 const restored=R.restore(snap);
 assert.equal(restored.ok,true,"contact saves and replays");
 assert.deepEqual(capture(restored.snapshot.config,125),capture(ended,125),"retraction is deterministic after restore");
 // Hairline segments can be difficult to hit exactly on a phone: tap near.
 const broad=gesture(original,"start",100,540,550);
 assert.equal(broad.interactionMode,1,"tap inside the broad interactive area triggers the reflex");
 const free=gesture(original,"start",100,5,5);
 assert.equal(free.interactionMode,2);
 const spun=gesture(free,"move",102,30,100,25,95);
 assert.notEqual(spun.rotation,original.rotation);
 assert.notDeepEqual(capture(spun,103).segments[0],capture(original,103).segments[0]);
 assert.equal(gesture(spun,"end",104,30,100).interactionMode,0);
});
test("old v1 recordings retain their historic bend while new taps use v2 reflex",()=>{
 const original=clone();
 const legacy={...original,touchRoot:11,touchNode:1,touchFrame:100,touchEndFrame:100,touchDX:40,touchDY:14,touchActive:true};
 delete legacy.touchRetractEpoch;
 const snapshot={...R.snapshot({patternId:d.id,config:original,frame:110}),patternVersion:1,config:legacy};
 const restored=R.restore(snapshot);
 assert.equal(restored.ok,true,"v1 recipes are still readable");
 assert.equal(restored.snapshot.config.touchRetractEpoch,0,"previous touches remain in old mode");
 assert.notDeepEqual(capture(restored.snapshot.config,110),capture(original,110),"previous bending is not rewritten");
 const touched=gesture(restored.snapshot.config,"start",120,360,360);
 assert.equal(touched.touchRetractEpoch,121,"the next new touch uses the approved reflex");
});
test("sliders use the shared patch reducer and preserve animation phase during speed changes",()=>{
 let c=clone();
 const original=capture(c,100);
 c=R.interact(d.id,c,{type:"patch",frame:100,patch:{speed:2,flowSpeed:2}});
 assert.equal(c.speed,2);assert.equal(c.flowSpeed,2);
 assert.ok(R.validate(c,d.id).ok);
 assert.deepEqual(capture(c,100),original,"the speed change does not teleport a shape or light wave");
 for(const row of d.controls){
  const [,key,min,max]=row,value=min===c[key]?max:min;
  c=R.interact(d.id,c,{type:"patch",frame:110,patch:{[key]:value}});
  assert.equal(c[key],value,key);
  assert.ok(R.validate(c,d.id).ok,key+" validates");
 }
 const restored=R.restore(R.snapshot({patternId:d.id,config:c,frame:115}));
 assert.equal(restored.ok,true);
 assert.deepEqual(capture(restored.snapshot.config,115),capture(c,115));
});
