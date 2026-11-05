import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const id="interlaced-spirals",file="standalone-pattern-"+id+".js";
const source=fs.readFileSync(file,"utf8");
const match=source.match(/^\/\* SETKA_PATTERN_DESCRIPTOR\n([\s\S]*?)\nEND_SETKA_PATTERN_DESCRIPTOR/);
assert.ok(match,"new pattern auto-discoverable without hardcoded consumer changes");
const d=JSON.parse(match[1]);
const scope={window:{dispatchEvent(){}},CustomEvent:class{}};
vm.runInNewContext(fs.readFileSync("standalone-pattern-registry-v1.js","utf8"),scope);
const R=scope.window.SetkaPatternRegistryV1;if(!R.has(id))R.register(d);
vm.runInNewContext(source,{window:{SetkaPatternRegistryV1:R},document:{currentScript:{dataset:{patternId:id}}}}, {timeout:4000});
const conf=()=>structuredClone(d.defaults);
function trace(c=conf(),f=94,preview=true){
 const ops=[];
 const ctx={
  fillStyle:"",strokeStyle:"",globalAlpha:1,lineWidth:0,save(){},restore(){},
  translate(){},scale(){},fillRect(){},beginPath(){this.coords=[];this.n=0},
  moveTo(x,y){if(this.coords.length<4)this.coords.push([x,y]);this.n++},
  lineTo(x,y){if(this.coords.length<4)this.coords.push([x,y]);this.n++},
  stroke(){ops.push({coords:this.coords,n:this.n,color:this.strokeStyle,alpha:this.globalAlpha,width:this.lineWidth})}
 };
 R.render(ctx,400,800,c,f,preview,id);
 return ops;
}
const gesture=(c,phase,frame,x,y,dx=0,dy=0,fingers=1,extra={})=>R.interact(id,c,{
 type:"gesture",phase,frame,x,y,dx,dy,fingers,width:400,height:800,...extra
});
test("original rich formula, exactly two mirrored halves, nine dark-background palettes",()=>{
 assert.equal(d.module,file);
 assert.equal(d.version,1);
 assert.deepEqual(d.palettes[0],[255,255,255]);
 assert.equal(d.colorModes,9);
 assert.equal(d.defaults.colorModeIndex,0);
 assert.equal(d.controls.length,8);
 assert.equal(d.defaults.arms,6);
 assert.equal(d.defaults.layers,7);
 assert.equal(R.ready(id),true);
 assert.equal(R.hasInteraction(id),true);
 assert.deepEqual(d.controls.map(r=>r[1]),["speed","waveIntensity","arms","layers","zoom","thickness","braid","breathing"]);
 assert.equal(d.tapColorCycle,false);
 const a=trace(),b=trace();
 assert.deepEqual(a,b);
 assert.equal(a.length,6*7*2,"all arms and layers of both halves draw");
 assert.ok(a.every(op=>op.n>120&&op.color==="#fff"&&op.alpha>0&&op.alpha<1&&op.width>.3));
 for(let j=0;j<42;j++)assert.deepEqual(a[j].coords,a[j+42].coords,"mirrored halves use identical source geometry");
 assert.ok(source.includes("Math.pow(.62,L)"),"self-similar layer scale from original code");
 assert.ok(source.includes("TAU*10*t")&&source.includes("TAU*5.5*t"),"source carrier frequencies");
 assert.ok(source.includes("u*(30+18*L)")&&source.includes("u*(14+3*arm)"),"original micro and braid survive");
 assert.ok(source.includes("10*(1-Math.pow(u,.6))"),"original line bias survives");
 const exact=trace(conf(),94,false);
 assert.equal(exact[0].n,1100,"full gameplay retains 1100 samples per line at start density");
 assert.notDeepEqual(trace(conf(),100),trace(conf(),120),"animated and replay-deterministic");
});
test("every source color mode kept except merged redundant second gray; no black lines",()=>{
 for(let colorModeIndex=0;colorModeIndex<9;colorModeIndex++){
  const c={...conf(),colorModeIndex};
  assert.equal(R.validate(c,id).ok,true);
  const lines=trace(c);
  assert.equal(lines.length,84);
  assert.ok(lines.every(line=>line.color!== "#000"&&!line.color.includes("NaN")&&line.alpha>.2),"visible mode "+colorModeIndex);
  const snap=R.snapshot({patternId:id,config:c,frame:95});
  const restored=R.restore(snap);
  assert.equal(restored.ok,true);
  assert.deepEqual(trace(restored.snapshot.config,95),trace(c,95));
 }
});
test("eight sliders, axis-exclusive swipe zones, no collapse of arms and layers",()=>{
 let c=conf();
 const f=60,now=t=>t.phaseStart+(t.phaseFrame===0?f:0);
 c=gesture(c,"start",f,320,730);
 let next=gesture(c,"move",f+2,375,726,55,-4,1,{startX:320,startY:730});
 assert.ok(next.speed>c.speed&&next.speed<=3.5);
 assert.equal(next.arms,6);assert.equal(next.layers,7);assert.equal(next.waveIntensity,1);
 const beforePhase=c.phaseStart+(f+2-c.phaseFrame)/60*c.speed;
 const afterPhase=next.phaseStart+(f+2-next.phaseFrame)/60*next.speed;
 assert.ok(Math.abs(beforePhase-afterPhase)<1e-8,"speed slider never jumps in running phase");
 c=gesture(conf(),"start",75,210,40);
 next=gesture(c,"move",77,330,45,120,5,1,{startX:210,startY:40});
 assert.ok(next.waveIntensity>1);assert.equal(next.speed,1);assert.equal(next.arms,6);
 c=gesture(conf(),"start",85,20,390);
 next=gesture(c,"move",87,20,325,0,-65,1,{startX:20,startY:390});
 assert.ok(next.layers>=8&&next.arms===6);
 c=gesture(conf(),"start",90,365,390);
 next=gesture(c,"move",92,365,330,0,-60,1,{startX:365,startY:390});
 assert.ok(next.arms>=7&&next.layers===7);
 c=gesture(conf(),"start",95,375,700);
 next=gesture(c,"move",97,200,300,-175,-200,1,{startX:375,startY:700});
 assert.equal(next.arms,6,"corner drag remains locked to bottom and never adjusts arms");
 assert.equal(next.layers,7);assert.ok(next.speed<1);
 next=R.interact(id,conf(),{type:"patch",frame:90,patch:{arms:3,layers:2}});
 assert.equal(next.arms,3);assert.equal(next.layers,2);
 assert.equal(trace(next).length,3*2*2,"minimum still draws 12 lines");
 assert.ok(trace(next).every(op=>op.n>10&&op.alpha>0));
 assert.deepEqual(conf(),d.defaults);
});
test("pinch, wheel, triple touch, single desktop click and cancelling multitouch are independent",()=>{
 let c=gesture(conf(),"start",100,200,400);
 c=gesture(c,"end",101,200,400,0,0,1,{cancelled:true});
 assert.equal(c.tapCount,0);
 c=gesture(c,"move",103,200,400,0,0,2,{pinchDistance:180,previousPinchDistance:100});
 assert.ok(c.zoom>1.16);assert.equal(c.colorModeIndex,0);
 c=gesture(conf(),"start",120,200,400);
 for(let i=0;i<3;i++){
  c=gesture(c,"start",130+i*6,200,400);
  c=gesture(c,"end",131+i*6,200,400);
 }
 assert.equal(c.colorModeIndex,1,"triple tap cycles one palette");
 assert.equal(c.tapCount,0);
 c=gesture(c,"start",155,150,400,0,0,1,{pointerType:"mouse"});
 c=gesture(c,"end",156,150,400,0,0,1,{pointerType:"mouse"});
 assert.equal(c.colorModeIndex,2);
 const oldZoom=c.zoom;
 c=R.interact(id,c,{type:"wheel",frame:160,deltaY:-120});
 assert.ok(c.zoom>oldZoom);
 c=gesture(c,"start",165,20,450);
 c=gesture(c,"move",167,20,300,0,-150,1,{startX:20,startY:450});
 c=gesture(c,"end",168,20,300);
 assert.equal(c.colorModeIndex,2,"drag doesn't count as tap");
});
test("additional breadth and braid sliders preserve the exact authored baseline at 1×",()=>{
 let c=conf();
 for(const row of d.controls){
  const [,key,min,max]=row;
  const value=Math.abs(c[key]-min)>.01?min:max;
  c=R.interact(id,c,{type:"patch",frame:101,patch:{[key]:value}});
  assert.equal(c[key],value,key);
  assert.equal(R.validate(c,id).ok,true);
 }
 assert.equal(c.armsFloat,c.arms);
 assert.equal(c.layerFloat,c.layers);
 assert.notDeepEqual(trace({...conf(),braid:0}),trace({...conf(),braid:2.5}));
 assert.notDeepEqual(trace({...conf(),breathing:0}),trace({...conf(),breathing:2.5}));
 const restored=R.restore(R.snapshot({patternId:id,config:c,frame:109}));
 assert.equal(restored.ok,true);
 assert.deepEqual(trace(c,109),trace(restored.snapshot.config,109));
 assert.equal(d.gestureHints.length,2);
 assert.equal(d.controls.filter(row=>row[6]===0).length,3);
 assert.ok(d.controls.every(row=>row.length===8&&row[7].length>20));
});
test("shared app remains unaware of this pattern ID; inherited gestures stay unchanged",()=>{
 const host=fs.readFileSync("app-v7-multipattern.js","utf8");
 assert.ok(!host.includes('"interlaced-spirals"'));
 assert.match(host,/pluginPointerPhase\("start",mouse\.x,mouse\.y,mouse\.fingers,"mouse"\)/);
 assert.match(host,/pinchDistance:currentDist,previousPinchDistance:touch\.lastDist/);
 assert.match(host,/type:"wheel",frame:currentFrame,deltaY:e\.deltaY/);
});