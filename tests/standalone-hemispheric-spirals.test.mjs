import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const id="hemispheric-spirals";
const source=fs.readFileSync("standalone-pattern-"+id+".js","utf8");
const match=source.match(/^\/\* SETKA_PATTERN_DESCRIPTOR\n([\s\S]*?)\nEND_SETKA_PATTERN_DESCRIPTOR/);
assert.ok(match,"source contains valid discovery descriptor");
const d=JSON.parse(match[1]);
const scope={window:{dispatchEvent(){}},CustomEvent:class{}};
vm.runInNewContext(fs.readFileSync("standalone-pattern-registry-v1.js","utf8"),scope);
const R=scope.window.SetkaPatternRegistryV1;
if(!R.has(id))R.register(d);
vm.runInNewContext(source,{window:{SetkaPatternRegistryV1:R},document:{currentScript:{dataset:{patternId:id}}}}, {timeout:4000});
function canvas(config=R.defaults(id),frame=120,preview=true){
 const ops=[],colors=[];
 const c={
  fillStyle:"",strokeStyle:"",globalAlpha:1,lineWidth:0,lineCap:"",lineJoin:"",
  save(){},restore(){},translate(){},scale(){},beginPath(){this.points=[]},
  moveTo(x,y){if(this.points.length<3)this.points.push([x,y]);},
  lineTo(x,y){if(this.points.length<3)this.points.push([x,y]);},
  stroke(){ops.push({points:this.points,color:this.strokeStyle,alpha:this.globalAlpha,width:this.lineWidth});colors.push(this.strokeStyle)},
  fillRect(){}
 };
 R.render(c,390,844,config,frame,preview,id);
 return {ops,colors};
}
const conf=()=>structuredClone(d.defaults);
const gesture=(config,phase,f,x,y,dx=0,dy=0,fingers=1,extra={})=>
 R.interact(id,config,{type:"gesture",phase,frame:f,x,y,dx,dy,fingers,width:400,height:800,...extra});
test("one auto-discovered module contains the true mirrored, live, white-start drawing",()=>{
 assert.equal(d.module,"standalone-pattern-"+id+".js");
 assert.equal(d.colorModes,9);
 assert.deepEqual(d.palettes[0],[255,255,255]);
 assert.equal(d.defaults.arms,5);
 assert.equal(d.defaults.layers,6);
 assert.equal(d.defaults.waveDir,1);
 assert.equal(R.ready(id),true);
 assert.equal(R.hasInteraction(id),true);
 assert.equal(d.controls.length,6);
 assert.deepEqual(d.controls.map(r=>r[1]),["speed","arms","layers","waveIntensity","zoom","thickness"]);
 assert.deepEqual(d.controls.map(r=>r[6]),[1,1,1,1,2,0]);
 assert.equal(d.tapColorCycle,false);
 const a=canvas(),b=canvas();
 assert.deepEqual(a,b,"render must be deterministic from config and frame");
 assert.equal(a.ops.length,5*6*2,"both mirrored halves render every arm and layer");
 for(let i=0;i<30;i++){
  assert.equal(a.ops[i].points.length,3);
  assert.equal(a.ops[i+30].points.length,3);
  // Both halves use identical geometry mirrored across X.
  for(let j=0;j<3;j++)assert.deepEqual(a.ops[i].points[j],a.ops[i+30].points[j]);
 }
 assert.ok(a.ops.every(x=>x.width>.35&&x.alpha>.25));
 assert.ok(a.colors.every(x=>x==="#fff"||/^rgb\(/.test(x)),"all lines have real nonblack color");
 const after=canvas(conf(),152);
 for(let i=0;i<a.ops.length;i++)assert.notDeepEqual(a.ops[i].points,after.ops[i].points,
   "every layer must vary with time: "+i);
 assert.ok(source.includes("TAU*10*t")&&source.includes("TAU*5.5*t"));
 assert.ok(source.includes("1100"));
});
test("nine palettes remain visibly colored including gold, pastel and aurora",()=>{
 for(let colorModeIndex=0;colorModeIndex<9;colorModeIndex++){
  const c={...conf(),colorModeIndex};
  assert.equal(R.validate(c,id).ok,true);
  const strokes=canvas(c).ops;
  assert.ok(strokes.length===60);
  assert.ok(strokes.every(row=>row.color&&!row.color.includes("NaN")));
  assert.ok(strokes.some(row=>row.alpha>.75));
  assert.equal(R.restore(R.snapshot({patternId:id,config:c,frame:122})).ok,true);
 }
});
test("single-finger zones never share commands and preserve movement phase",()=>{
 let c=conf();
 const bottom=gesture(c,"start",50,300,710);
 c=gesture(bottom,"move",52,375,700,75,-10,1,{startX:300,startY:710});
 assert.ok(c.speed>1.1);
 assert.equal(c.arms,5);
 assert.equal(c.layers,6);
 assert.equal(c.waveIntensity,1);
 assert.equal(c.zoom,1);
 const phase=(data,frame)=>data.phaseStart+(frame-data.phaseFrame)/60*data.speed;
 assert.ok(Math.abs(phase(bottom,52)-phase(c,52))<1e-9,"speed change preserves phase");
 const speedResult=gesture(c,"end",53,375,700);
 assert.equal(speedResult.touchActive,false);
 assert.equal(speedResult.colorModeIndex,0,"drag is not a tap");
 c=gesture(conf(),"start",60,365,400);
 c=gesture(c,"move",61,365,345,0,-55,1,{startX:365,startY:400});
 assert.equal(c.arms,6,"right edge increases arms on upward movement");
 assert.equal(c.layers,6);
 assert.equal(c.speed,1);
 c=gesture(conf(),"start",70,35,400);
 c=gesture(c,"move",71,35,345,0,-55,1,{startX:35,startY:400});
 assert.equal(c.layers,7,"left edge increases layers");
 assert.equal(c.arms,5);
 c=gesture(conf(),"start",80,210,60);
 c=gesture(c,"move",81,270,60,60,0,1,{startX:210,startY:60});
 assert.ok(c.waveIntensity>1.2,"top changes only wave strength");
 assert.equal(c.speed,1);
 c=gesture(conf(),"start",90,210,390);
 c=gesture(c,"move",91,340,450,130,60,1,{startX:210,startY:390});
 assert.equal(c.speed,1);
 assert.equal(c.arms,5);
 assert.equal(c.layers,6);
 assert.equal(c.waveIntensity,1,"center drag has no random behavior");
});
test("pinch, cancel, center tap and three outside taps never conflict",()=>{
 let c=gesture(conf(),"start",100,200,400);
 c=gesture(c,"end",101,200,400,0,0,1,{cancelled:true});
 assert.equal(c.waveDir,1,"second finger cancelling a pending tap cannot invert direction");
 c=gesture(c,"move",105,200,400,0,0,2,{pinchDistance:170,previousPinchDistance:100});
 assert.ok(c.zoom>1.1,"pinch changes zoom");
 assert.equal(c.waveDir,1);
 assert.equal(c.speed,1);
 c=gesture(conf(),"start",120,200,400);
 c=gesture(c,"end",121,200,400);
 assert.equal(c.waveDir,-1,"center tap reverses spatial wave");
 assert.equal(c.colorModeIndex,0);
 const centerOutside=()=>[40,400];
 for(let i=0;i<3;i++){
  const [x,y]=centerOutside();
  c=gesture(c,"start",130+i*5,x,y);
  c=gesture(c,"end",131+i*5,x,y);
 }
 assert.equal(c.colorModeIndex,1,"triple outside center cycles palette exactly once");
 assert.equal(c.waveDir,-1,"outside color tap does not toggle wave direction");
 c=gesture(c,"start",161,200,400,0,0,1,{pointerType:"mouse"});
 c=gesture(c,"end",162,200,400,0,0,1,{pointerType:"mouse"});
 assert.equal(c.colorModeIndex,2,"desktop click cycles palette");
 assert.equal(c.waveDir,-1,"desktop click does not change wave direction");
 c=R.interact(id,c,{type:"wheel",frame:165,deltaY:-100});
 assert.ok(c.zoom>1,"wheel zoom works");
});
test("sliders and snapshots use the same canonical config, with no fake modes",()=>{
 const base=conf(),p=R.interact(id,base,{type:"patch",frame:120,patch:{speed:2}});
 assert.equal(p.speed,2);
 assert.equal(p.phaseFrame,120);
 assert.ok(Math.abs(p.phaseStart-2)<1e-10);
 const more=R.interact(id,p,{type:"patch",frame:121,patch:{arms:8,layers:9,thickness:2.5}});
 assert.equal(more.armsFloat,8);
 assert.equal(more.layersFloat,9);
 const snapshot=R.snapshot({patternId:id,config:more,frame:124});
 const restored=R.restore(snapshot);
 assert.equal(restored.ok,true);
 assert.deepEqual(canvas(restored.snapshot.config,124),canvas(more,124));
 assert.deepEqual(base,conf(),"input config not mutated");
 assert.ok(d.controls.every(row=>row.length===8&&row[7].length>=20));
 assert.ok(d.gestureHints.every(row=>!row[0].includes("Эффект")));
});
test("generic host passes real start zones, touch/mouse, pinch/cancel and wheel",()=>{
 const host=fs.readFileSync("app-v7-multipattern.js","utf8");
 assert.match(host,/startX:sx,startY:sy,width:r\.width,height:r\.height,pinch,pointerType/);
 assert.match(host,/pluginPointerPhase\("end",touch\.x,touch\.y,1,"touch",true\)/);
 assert.match(host,/pointerType,cancelled/);
 assert.match(host,/pluginPointerPhase\("end",mouse\.x,mouse\.y,mouse\.fingers,"mouse"\)/);
 assert.match(host,/type:"wheel",frame:currentFrame,deltaY:e\.deltaY/);
 assert.match(host,/if\(configKey\(config,runtimePatternId\)===before\)return/);
});