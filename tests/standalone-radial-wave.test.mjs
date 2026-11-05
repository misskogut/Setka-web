import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync("standalone-pattern-radial-wave.js","utf8");
const match=source.match(/^\/\* SETKA_PATTERN_DESCRIPTOR\n([\s\S]*?)\nEND_SETKA_PATTERN_DESCRIPTOR/);
assert.ok(match,"package has build-discoverable descriptor");
const descriptor=JSON.parse(match[1]);
const context={window:{dispatchEvent(){}},CustomEvent:class{}};
vm.runInNewContext(fs.readFileSync("standalone-pattern-registry-v1.js","utf8"),context);
const R=context.window.SetkaPatternRegistryV1;
if(!R.has(descriptor.id))R.register(descriptor);
vm.runInNewContext(source,{
 window:{SetkaPatternRegistryV1:R},document:{currentScript:{dataset:{patternId:descriptor.id}}},
 Math
},{timeout:1500});
function draw(c,f=70,preview=false){
 const commands=[],ctx={
  fillStyle:"#000",strokeStyle:"#fff",globalAlpha:1,
  save(){},restore(){},beginPath(){},arc(x,y,r){this.arcValues=[x,y,r]},
  fillRect(x,y,w,h){if(this.fillStyle==="#000")commands.push(["black",x,y,w,h])},
  fill(){if(this.arcValues&&commands.length<10000)commands.push(["dot",...this.arcValues,this.fillStyle,this.globalAlpha])},
  stroke(){if(this.arcValues&&commands.length<150)commands.push(["trail",...this.arcValues,this.strokeStyle,this.globalAlpha])}
 };
 R.render(ctx,250,300,c,f,preview,descriptor.id);
 return commands;
}
const conf=()=>structuredClone(descriptor.defaults);
const gesture=(c,phase,frame,x=100,y=200,dx=0,dy=0)=>R.interact(descriptor.id,c,
 {type:"gesture",phase,frame,x,y,dx,dy,width:400,height:800,fingers:1,zone:"center"});
test("new single-pattern package stays white, sharp, slider-only, nine palettes",()=>{
 assert.equal(descriptor.colorModes,9);
 assert.deepEqual(descriptor.palettes[0],[255,255,255]);
 assert.equal(descriptor.defaults.colorModeIndex,0);
 assert.equal(R.ready(descriptor.id),true);
 assert.equal(R.hasInteraction(descriptor.id),true);
 assert.equal(descriptor.controls.length,10);
 assert.ok(descriptor.controls.every(row=>row[5]==="Бегунок"&&row[6]===0));
 assert.ok(!Object.hasOwn(descriptor.defaults,"motionMode"));
 assert.ok(descriptor.gestureHints.some(row=>row[1].includes("1 палец")));
 const a=draw(conf(),51),b=draw(conf(),51);
 assert.deepEqual(a,b,"a render depends on only config/frame");
 assert.ok(a.some(row=>row[0]==="dot"&&row[4]==="#fff"));
 assert.notDeepEqual(draw(conf(),51),draw(conf(),71),"animated points actually move");
 for(let mode=0;mode<9;mode++){
  const c={...conf(),colorModeIndex:mode};
  assert.equal(R.validate(c,descriptor.id).ok,true);
  const restored=R.restore(R.snapshot({patternId:descriptor.id,config:c,frame:71}));
  assert.equal(restored.ok,true);assert.equal(restored.snapshot.config.colorModeIndex,mode);
  assert.ok(draw(c,70).some(row=>row[0]==="dot"),"visible mode "+mode);
 }
});
test("touch begins precisely at absolute position and glides independently of settings",()=>{
 const c=conf();
 const tap=gesture(c,"start",60,360,600);
 assert.equal(tap.centerX,.9);assert.equal(tap.centerY,.75);
 assert.equal(tap.fromX,.5);assert.equal(tap.fromY,.5);
 assert.equal(tap.touchActive,true);
 assert.equal(tap.speed,c.speed);
 assert.notDeepEqual(draw(tap,66),draw(c,66));
 const moved=gesture(tap,"move",70,50,100,-20,12);
 assert.equal(moved.centerX,.125);assert.equal(moved.centerY,.125);
 assert.equal(moved.lastTapFrame,60,"drag never fakes a new tap");
 assert.equal(moved.colorModeIndex,0);
 const released=gesture(moved,"end",73,50,100);
 assert.equal(released.touchActive,false);
 assert.equal(released.releaseFrame,73);
 assert.equal(R.restore(R.snapshot({patternId:descriptor.id,config:released,frame:76})).ok,true);
 assert.equal(c.centerX,.5,"original config not mutated");
});
test("double tap resets wave center; simultaneous impulse/twist/magnet use one renderer",()=>{
 let c=conf();
 c={...c,pulse:80,twist:60,magnet:45};
 c=gesture(c,"start",40,340,600);
 assert.equal(c.pulses.length,3);
 c=gesture(c,"move",49,330,590,-10,-10);
 assert.equal(c.pulses.length,6);
 assert.notEqual(c.spin,0);
 assert.deepEqual(draw(c,53),draw(c,53),"combined effects are replayable");
 assert.notEqual(R.configKey(c,descriptor.id),R.configKey({...c,pulses:[]},descriptor.id),"pulse position must contribute to canonical configuration identity");
 c=gesture(c,"end",55,330,590);
 assert.equal(c.touchActive,false);
 c=gesture(c,"start",57,340,600);
 assert.equal(c.centerX,.5);assert.equal(c.centerY,.5,"nearby double tap restores center");
 assert.equal(c.lastTapFrame,-1000);
});
test("all ten sliders survive snapshot and replay; trail does not add blur",()=>{
 let c=conf();
 for(const row of descriptor.controls){
  const [,key,min,max]=row;
  const to=key==="magnet"?-75:Math.min(max,Math.max(min,Number(c[key])+1));
  c=R.interact(descriptor.id,c,{type:"patch",frame:75,patch:{[key]:to}});
  assert.equal(c[key],to,key);
  assert.equal(R.validate(c,descriptor.id).ok,true);
 }
 const snap=R.snapshot({patternId:descriptor.id,config:c,frame:90});
 const restored=R.restore(snap);
 assert.equal(restored.ok,true);
 assert.deepEqual(draw(restored.snapshot.config,90),draw(c,90));
 const noTrail=draw({...conf(),trail:0},90,true);
 const withTrail=draw({...conf(),trail:100},90,true);
 assert.equal(noTrail.filter(x=>x[0]==="trail").length,0);
 assert.ok(withTrail.some(x=>x[0]==="trail"));
});
test("generic gesture dispatcher provides absolute x/y and distinct pointer phases",()=>{
 const host=fs.readFileSync("app-v7-multipattern.js","utf8");
 assert.match(host,/type:"gesture",phase:"move",frame:currentFrame,zone,x,y,dx,dy,fingers/);
 assert.match(host,/pluginPointerPhase\("start",p\.x,p\.y,touch\.fingers\)/);
 assert.match(host,/pluginPointerPhase\("end",touch\.x,touch\.y,touch\.fingers/);
 assert.match(host,/pluginPointerPhase\("start",mouse\.x,mouse\.y,mouse\.fingers/);
 assert.match(host,/pluginPointerPhase\("end",mouse\.x,mouse\.y,mouse\.fingers/);
 assert.match(host,/if\(fingers<1\|\|!registry\.hasInteraction\?\.\(runtimePatternId\)\)return false/);
});

test("all real gestures and all ten slider explanations are unambiguous",()=>{
 const d=R.get(descriptor.id);
 assert.equal(d.tapColorCycle,false,"a third touch must not unexpectedly change color");
 assert.equal(d.gestureHints.length,2,"only actual touch actions, no invented modes");
 assert.match(d.gestureHints[0][1],/1 палец/);
 assert.match(d.gestureHints[1][1],/Два быстрых касания/);
 assert.match(d.gestureHints[0][0],/Центр волны/);
 assert.match(d.gestureHints[1][0],/Сброс центра/);
 const help=Object.fromEntries(d.controls.map(row=>[row[1],row[7]]));
 for(const row of d.controls){
  assert.equal(row.length,8,"exactly one explanation per declared slider: "+row[1]);
  assert.ok(typeof row[7]==="string"&&row[7].length>18,"real meaningful help: "+row[1]);
  assert.equal(row[6],0,"no slider falsely claims finger gesture: "+row[1]);
 }
 assert.match(help.pulse,/выше 0.*коснись/);
 assert.match(help.twist,/выше 0.*проведи/);
 assert.match(help.magnet,/Плюс.*минус.*0/);
 assert.match(help.follow,/центр волны.*догоняет палец/);
 assert.match(help.amplitude,/При 0/);
 const key=fs.readFileSync("standalone-pattern-key-v1.js","utf8");
 assert.match(key,/for\(const \[label,k,min,max,step,gesture,fingers,help\]/);
 assert.match(key,/input\.setAttribute\("aria-description",help\)/);
 assert.match(key,/Что делают бегунки\?/);
 assert.match(key,/sk-help-disclosure/);
 assert.ok(!d.gestureHints.some(row=>row[0]==="Дополнительное движение"));
 const host=fs.readFileSync("app-v7-multipattern.js","utf8");
 assert.match(host,/registry\.get\(runtimePatternId\)\?\.tapColorCycle!==false/);
});
test("a drag cannot accidentally arm the double-tap reset",()=>{
 let c=gesture(conf(),"start",150,310,470);
 c=R.interact(descriptor.id,c,{
  type:"gesture",phase:"move",frame:153,x:350,y:520,startX:310,startY:470,
  dx:40,dy:50,width:400,height:800,fingers:1
 });
 assert.equal(c.lastTapFrame,-1000,"movement cancelled candidate for double tap");
 c=gesture(c,"end",157,350,520);
 c=gesture(c,"start",164,311,470);
 assert.ok(c.centerX>.7,"next single tap follows the finger instead of unexpectedly resetting");
 assert.equal(c.centerX,311/400);
 assert.equal(c.centerY,470/800);
});
test("an unknown future pattern can declare an explanation without custom UI edits",()=>{
 const nextId="fixture-control-help-future";
 const future={
  id:nextId,title:"Fixture",version:1,schemaVersion:1,
  module:"standalone-pattern-"+nextId+".js",
  colorModes:1,palettes:[[255,255,255]],
  defaults:{speed:1,colorModeIndex:0},
  controls:[["Скорость","speed",.1,3,.1,"Бегунок",0,"Меняет скорость движения точек."]],
  tapColorCycle:false
 };
 const entry=R.register(future);
 assert.equal(entry.controls[0][7],"Меняет скорость движения точек.");
 assert.equal(entry.tapColorCycle,false);
 assert.equal(R.validate(R.defaults(nextId),nextId).ok,true);
 const invalid={...future,id:"fixture-control-help-invalid",controls:[["Скорость","speed",.1,3,.1,"Бегунок",0,""]]};
 assert.throws(()=>R.register(invalid),/invalid_control_help/);
 assert.throws(()=>R.register({...future,id:"fixture-color-policy-invalid",tapColorCycle:"false"}),/invalid_tap_color_cycle/);
});
