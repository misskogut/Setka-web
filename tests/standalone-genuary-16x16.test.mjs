import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync("standalone-pattern-genuary-16x16.js","utf8");
const match=source.match(/^\/\* SETKA_PATTERN_DESCRIPTOR\n([\s\S]*?)\nEND_SETKA_PATTERN_DESCRIPTOR/);
assert.ok(match,"package has an auto-discovered descriptor");
const d=JSON.parse(match[1]);
const host={window:{dispatchEvent(){}},CustomEvent:class{}};
vm.runInNewContext(fs.readFileSync("standalone-pattern-registry-v1.js","utf8"),host);
const R=host.window.SetkaPatternRegistryV1;
if(!R.has(d.id))R.register(d);
vm.runInNewContext(source,{window:{SetkaPatternRegistryV1:R},document:{currentScript:{dataset:{patternId:d.id}}},Math},{timeout:2000});
const base=()=>structuredClone(d.defaults);
function capture(c,frame=0,width=720,height=720,preview=true){
 const lines=[],fills=[],p=[0,0],q=[0,0];
 const ctx={
  save(){},restore(){},beginPath(){},moveTo(x,y){p=[x,y]},lineTo(x,y){q=[x,y]},
  stroke(){lines.push([p[0],p[1],q[0],q[1],this.lineWidth,this.strokeStyle,this.globalAlpha])},
  fillRect(x,y,w,h){fills.push([x,y,w,h,this.fillStyle])}
 };
 R.render(ctx,width,height,c,frame,preview,d.id);
 return {lines,fills};
}
function gesture(c,phase,frame,x,y,dx=0,dy=0,w=400,h=800){
 return R.interact(d.id,c,{type:"gesture",phase,frame,x,y,dx,dy,fingers:1,width:w,height:h,zone:"center"});
}
const drag=(c,x,y,dx,dy)=>{
 let next=gesture(c,"start",100,x,y);
 next=gesture(next,"move",101,x+dx/2,y+dy/2,dx/2,dy/2);
 next=gesture(next,"move",102,x+dx,y+dy,dx/2,dy/2);
 return next;
};

test("eight original 3D layers; white strokes on black, metadata + all four swipe hints",()=>{
 assert.equal(d.id,"genuary-16x16");
 assert.equal(d.module,"standalone-pattern-genuary-16x16.js");
 assert.equal(d.colorModes,9);
 assert.deepEqual(d.palettes[0],[255,255,255]);
 assert.equal(d.defaults.colorModeIndex,0);
 assert.equal(d.tapColorCycle,false,"dedicated reducer handles ten original visual states");
 assert.equal(R.ready(d.id),true);
 assert.equal(R.hasInteraction(d.id),true);
 assert.equal(R.validate(base(),d.id).ok,true);
 const hints=Object.fromEntries(d.controls.map(c=>[c[1],[c[5],c[6]]]));
 assert.deepEqual(hints.turn,["Снизу ←→",1]);
 assert.deepEqual(hints.lineW,["Сверху ←→",1]);
 assert.deepEqual(hints.num,["Слева ↑↓",1]);
 assert.deepEqual(hints.pitch,["Справа ↑↓",1]);
 assert.equal(d.gestureHints.length,1,"color triple tap is clearly explained");
 assert.match(d.gestureHints[0][1],/3 быстрых касания/);
 const rendered=capture(base());
 assert.equal(rendered.lines.length,8*20);
 assert.equal(rendered.fills[0][4],"rgb(0,0,0)");
 assert.ok(rendered.lines.every(x=>x[5]==="rgb(255,255,255)"));
 assert.deepEqual(capture(base(),120),capture(base(),120));
});
test("true whole-stack pitch projects a Z-separated eight-layer scene and collapses to exactly one plane at pitch 0",()=>{
 const c=base(),flat=capture(c).lines;
 assert.equal(new Set(flat.map(l=>l.slice(0,4).map(v=>v.toFixed(3)).join(","))).size,20,
   "zero pitch/zero twist means eight coincident copies of each line");
 const pitched={...c,pitch:.95,pitchFrom:.95,zFrom:34};
 const threeD=capture(pitched,0).lines;
 assert.equal(threeD.length,160);
 assert.ok(new Set(threeD.map(l=>l.slice(0,4).map(v=>v.toFixed(3)).join(","))).size>130,
   "different layers have different projected XYZ positions");
 assert.notDeepEqual(threeD,flat);
 const restore=R.interact(d.id,pitched,{type:"patch",frame:0,patch:{pitch:0}});
 const flatAgain=capture(restore,1000).lines;
 assert.equal(flatAgain.length,160);
 assert.ok(Math.abs(flatAgain[0][1]-flat[0][1])<.0001,"pitch/z spacing relax back to flat scene");
});
test("edge-zone priority; vertical axis locks density/pitch; middle horizontal adjusts thickness/twist",()=>{
 const c=base();
 let left=drag(c,5,80,0,-110);
 assert.ok(left.num>c.num,"left edge upward increases grid density");
 assert.equal(left.lineW,c.lineW,"left edge never changes upper thickness");
 assert.equal(left.pitch,c.pitch);
 assert.equal(left.gestureRegion,4);
 assert.equal(left.gestureAxis,2);
 left=gesture(left,"move",103,210,18,205,0);
 assert.equal(left.num,drag(c,5,80,0,-110).num,"locked left edge ignores later horizontal movement");
 let right=drag(c,395,90,0,120);
 assert.ok(right.pitch>0,"right edge downward produces actual pitch");
 assert.equal(right.num,c.num);
 assert.equal(right.gestureRegion,3);
 const upper=drag(c,200,120,100,0);
 assert.ok(upper.lineW>c.lineW);
 assert.equal(upper.turn,0);
 const lower=drag(c,200,680,140,0);
 assert.ok(lower.turn>0);
 assert.equal(lower.lineW,c.lineW);
 const verticalUpper=drag(c,200,120,0,120);
 assert.equal(verticalUpper.lineW,c.lineW,"middle vertical is deliberately ignored");
 const horizRight=drag(c,395,100,-140,0);
 assert.equal(horizRight.pitch,c.pitch,"edge horizontal is ignored");
});
test("five moving parameters remain exact and patching several controls doesn't overwrite earlier ones",()=>{
 const c=base();
 const patched=R.interact(d.id,c,{type:"patch",frame:50,patch:{turn:5.75,num:72,lineW:2.22,pitch:.55,colorSpeed:2.1,glow:57,invert:1}});
 for(const [k,v] of Object.entries({turn:5.75,num:72,lineW:2.22,pitch:.55,colorSpeed:2.1,glow:57,invert:1})){
  assert.equal(patched[k],v,k);
 }
 assert.equal(patched.turnFrame,50);assert.equal(patched.pitchFrame,50);assert.equal(patched.zFrame,50);
 assert.ok(R.validate(patched,d.id).ok);
 const snap=R.snapshot({patternId:d.id,config:patched,frame:100});
 const restored=R.restore(snap);
 assert.equal(restored.ok,true);
 assert.deepEqual(capture(restored.snapshot.config,100),capture(patched,100));
});
test("ten original color combinations cycle with triple tap, including black on white negative",()=>{
 let c=base();
 function tap(t){
  c=gesture(c,"start",t,200,380);
  c=gesture(c,"end",t+1,200,380);
 }
 const visited=[[c.colorModeIndex,c.invert]];
 for(let cycle=0;cycle<10;cycle++){
  const f=100+cycle*12;
  tap(f);tap(f+3);tap(f+6);
  visited.push([c.colorModeIndex,c.invert]);
 }
 assert.deepEqual(visited.slice(0,4),[[0,0],[0,1],[1,0],[2,0]]);
 assert.deepEqual(visited.at(-1),[0,0]);
 assert.equal(new Set(visited.slice(0,-1).map(p=>p.join(":"))).size,10);
 const negative=capture({...base(),invert:1});
 assert.equal(negative.fills[0][4],"rgb(255,255,255)");
 assert.equal(negative.lines[0][5],"rgb(0,0,0)");
 const cyan=capture({...base(),colorModeIndex:1},0);
 assert.equal(cyan.lines[0][5],"rgb(90,178,255)");
 const animated=capture({...base(),colorModeIndex:4},0);
 assert.notDeepEqual(capture({...base(),colorModeIndex:4},120).lines,animated.lines,
  "moving rainbow colors evolve deterministically with frame");
});
test("gesture state and tap count survive canonical save and isolated one/two-finger control",()=>{
 let c=gesture(base(),"start",100,5,70);
 c=gesture(c,"move",102,5,-80,0,-150);
 const snap=R.snapshot({patternId:d.id,config:c,frame:102});
 const restored=R.restore(snap);
 assert.equal(restored.ok,true);
 assert.deepEqual(restored.snapshot.config,c);
 assert.deepEqual(capture(restored.snapshot.config,102),capture(c,102));
 const two=R.interact(d.id,c,{type:"gesture",phase:"move",frame:103,x:5,y:50,dx:0,dy:-50,fingers:2,width:400,height:800});
 assert.deepEqual(two,c,"two-finger movement cannot steal the isolated one-finger controls");
});
