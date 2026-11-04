import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync("standalone-pattern-hexwave.js","utf8");
const match=source.match(/^\/\* SETKA_PATTERN_DESCRIPTOR\n([\s\S]*?)\nEND_SETKA_PATTERN_DESCRIPTOR/);
assert.ok(match,"module must be automatically discoverable");
const d=JSON.parse(match[1]);
const host={window:{dispatchEvent(){}},CustomEvent:class{}};
vm.runInNewContext(fs.readFileSync("standalone-pattern-registry-v1.js","utf8"),host);
const R=host.window.SetkaPatternRegistryV1;
if(!R.has(d.id))R.register(d);
vm.runInNewContext(source,{window:{SetkaPatternRegistryV1:R},document:{currentScript:{dataset:{patternId:d.id}}},Math},{timeout:2000});
const defaults=()=>structuredClone(d.defaults);
function capture(c,frame=44,preview=true,w=320,h=320){
 const calls=[],dots=[],fills=[];let lastArc=null,arcs=0;
 const ctx={fillStyle:"#000",globalAlpha:1,
  save(){},restore(){},beginPath(){lastArc=null},moveTo(){},
  fillRect(x,y,w,h){fills.push([this.fillStyle,x,y,w,h])},
  arc(x,y,r){arcs++;lastArc=[x,y,r]},
  fill(){if(lastArc)dots.push([...lastArc,this.fillStyle,this.globalAlpha]);}
 };
 R.render(ctx,w,h,c,frame,preview,d.id);
 return {dots,fills,arcs};
}
function gesture(c,phase,f,x=200,y=400,dx=0,dy=0,fingers=1,extra={}){
 return R.interact(d.id,c,{type:"gesture",phase,frame:f,x,y,dx,dy,fingers,width:390,height:844,...extra});
}
function swipe(c,x,y,dx,dy){
 let n=gesture(c,"start",100,x,y);
 n=gesture(n,"move",101,x+dx/2,y+dy/2,dx/2,dy/2);
 return gesture(n,"move",102,x+dx,y+dy,dx/2,dy/2);
}
test("correct standalone descriptor and five original palettes; RGB halo and black/white default",()=>{
 assert.equal(d.id,"hexwave");
 assert.equal(d.colorModes,5);
 assert.equal(d.version,1);
 assert.equal(d.palettes.length,5);
 assert.deepEqual(d.palettes[0],[255,255,255]);
 assert.equal(R.ready(d.id),true);
 assert.equal(R.hasInteraction(d.id),true);
 assert.equal(d.tapColorCycle,false,"no conflicting host triple tap");
 assert.equal(d.controls.length,6);
 assert.ok(d.gestureHints.some(x=>x[0]==="Панорамирование"&&x[1].includes("2 пальца")));
 assert.ok(d.gestureHints.some(x=>x[0]==="Смена цвета"&&x[1].includes("3 быстрых касания")));
 const badges=Object.fromEntries(d.controls.map(row=>[row[1],[row[5],row[6]]]));
 assert.deepEqual(badges.waveAmplitude,["Справа ↑↓",1]);
 assert.deepEqual(badges.waveSpeed,["Снизу ←→",1]);
 assert.deepEqual(badges.dotSize,["Сверху ←→",1]);
 assert.deepEqual(badges.hexRadius,["Слева ↑↓",1]);
 const first=capture(defaults());
 assert.equal(first.fills[0][0],"#000");
 assert.ok(first.arcs>2000,"real hex lattice is rendered, not a placeholder");
 assert.deepEqual(first.dots.slice(0,4).map(row=>row[3]),
   ["#ff0000","#00ff00","#0000ff","rgb(255,255,255)"],
   "the three displacement halos are behind the original white dot");
 assert.deepEqual(capture(defaults(),44),capture(defaults(),44),"same config/frame = same pixels");
 assert.notDeepEqual(capture(defaults(),44).dots,capture(defaults(),65).dots,
   "initial wave moves by frame");
});
test("right 60% controls only amplitude with memory and clamps exact 0..50",()=>{
 const c=defaults();
 const a=swipe(c,330,100,65,-120);
 assert.ok(a.waveAmplitude>c.waveAmplitude&&a.waveAmplitude<=50);
 assert.equal(a.dotSize,c.dotSize);
 assert.equal(a.waveSpeed,c.waveSpeed);
 assert.equal(a.hexRadius,c.hexRadius);
 const first=gesture(c,"start",100,330,110);
 const upward=gesture(first,"move",103,330,0,0,-110);
 const reset=gesture(upward,"move",104,330,110,0,110);
 assert.equal(reset.waveAmplitude,8,"moving finger back returns the initial amplitude, not cumulative drifting");
 const max=gesture(first,"move",101,330,-1000,0,-1110);
 assert.equal(max.waveAmplitude,50);
 const min=gesture(first,"move",101,330,1100,0,990);
 assert.equal(min.waveAmplitude,0);
 const overlapping=swipe(c,250,80,0,-90);
 assert.ok(overlapping.waveAmplitude>c.waveAmplitude,"top-right is still amplitude");
 assert.equal(overlapping.dotSize,c.dotSize,"top-right cannot secretly change point size");
});
test("top-left, bottom-left, and left-middle each adjust one correct slider",()=>{
 const c=defaults();
 const top=swipe(c,60,80,110,0);
 assert.equal(top.gestureRegion,2);
 assert.ok(top.dotSize>c.dotSize);
 assert.equal(top.waveAmplitude,c.waveAmplitude);
 const bottom=swipe(c,60,750,90,0);
 assert.equal(bottom.gestureRegion,3);
 assert.ok(bottom.waveSpeed>c.waveSpeed);
 assert.equal(bottom.waveAmplitude,c.waveAmplitude);
 const left=swipe(c,40,360,0,-75);
 assert.equal(left.gestureRegion,4);
 assert.ok(left.hexRadius>c.hexRadius);
 assert.equal(left.dotSize,c.dotSize);
 const ignored=swipe(c,40,360,80,0);
 assert.equal(ignored.hexRadius,c.hexRadius,"wrong gesture axis has no effect");
});
test("two-finger centroid pans without changing any slider or color, cancels single finger",()=>{
 const c=defaults();
 let initial=gesture(c,"start",100,55,360);
 const cancelled=gesture(initial,"end",101,55,360,0,0,1,{cancelled:true});
 assert.equal(cancelled.tapCount,0,"adding a second finger must not register a tap");
 const panned=gesture(cancelled,"move",102,55,360,35,-25,2);
 assert.ok(panned.panX>0&&panned.panY<0,"centroid moves entire lattice");
 for(const key of ["hexRadius","waveAmplitude","waveSpeed","dotSize","glitchAlpha","glitchOffset","colorModeIndex"])
  assert.equal(panned[key],c[key],"pan does not alter "+key);
 const lone=gesture(panned,"move",103,55,200,0,-100,1);
 assert.equal(lone.waveAmplitude,c.waveAmplitude,"remaining finger cannot accidentally swipe");
 const same=capture(panned,70);
 assert.notDeepEqual(same.dots,capture(c,70).dots,"pan moves real drawn dots");
});
test("three short taps advance five colors, never on swipe or a cancelled gesture",()=>{
 let c=defaults();
 const tap=(frame)=>{
  c=gesture(c,"start",frame,230,320);
  c=gesture(c,"end",frame+1,230,320);
 };
 let visited=[c.colorModeIndex];
 for(let loop=0;loop<5;loop++){
  const k=100+loop*15;
  tap(k);tap(k+3);tap(k+6);
  visited.push(c.colorModeIndex);
 }
 assert.deepEqual(visited,[0,1,2,3,4,0]);
 for(let color=0;color<5;color++){
  const a=capture({...defaults(),colorModeIndex:color},85);
  assert.ok(a.arcs>2000,"every palette is visible "+color);
  assert.deepEqual(a,capture({...defaults(),colorModeIndex:color},85));
 }
 const rainbow=capture({...defaults(),colorModeIndex:4},80);
 assert.ok(rainbow.dots.length>25,"rainbow uses independent position-dependent colors");
 const initial=defaults();
 let swipeStart=gesture(initial,"start",10,340,310);
 swipeStart=gesture(swipeStart,"move",12,340,200,0,-110);
 const after=gesture(swipeStart,"end",13,340,200);
 assert.equal(after.tapCount,0);
 assert.equal(after.colorModeIndex,0);
 const noTap=gesture(gesture(initial,"start",20,240,200),"end",21,240,200,0,0,1,{cancelled:true});
 assert.equal(noTap.tapCount,0);
});
test("glitch sliders modify actual drawn RGB channels, can disable halo; all fields survive Replay",()=>{
 let c=defaults();
 const plain={...c,glitchAlpha:0};
 const a=capture(plain,70);
 assert.equal(a.dots.length,1,"zero halo means only one batched main-color draw");
 const spread=capture({...c,glitchOffset:6},70);
 assert.notDeepEqual(spread.dots[0],capture(c,70).dots[0],"RGB displacement is a real effect");
 const speed=R.interact(d.id,c,{type:"patch",frame:90,patch:{waveSpeed:.12,glitchAlpha:0,glitchOffset:3.6,dotSize:12,hexRadius:11,waveAmplitude:22}});
 assert.equal(speed.waveSpeed,.12);
 assert.equal(speed.glitchOffset,3.6);
 assert.equal(speed.glitchAlpha,0);
 assert.equal(speed.wavePhase,c.waveSpeed*90);
 assert.equal(speed.waveFrame,90);
 assert.ok(R.validate(speed,d.id).ok);
 const snap=R.snapshot({patternId:d.id,config:speed,frame:101});
 const back=R.restore(snap);
 assert.equal(back.ok,true);
 assert.deepEqual(capture(back.snapshot.config,101),capture(speed,101));
 assert.notDeepEqual(capture(speed,101),capture(c,101));
 assert.ok(!Object.hasOwn(d.defaults,"showParams"),"original numeric HUD is never in app");
});
test("shared platform owns frontend/notes/research, no hardcoded new IDs in host",()=>{
 const host=fs.readFileSync("app-v7-multipattern.js","utf8");
 assert.ok(!host.includes('"hexwave"'));
 assert.match(host,/pinchDistance:currentDist,previousPinchDistance:touch\.lastDist/);
 assert.match(host,/if\(e\.touches\.length>1&&touch\.fingers===1\)pluginPointerPhase\("end",touch\.x,touch\.y,1,"touch",true\)/);
 assert.match(host,/phase:"move",frame:currentFrame,zone,x,y,dx,dy,fingers/);
});
