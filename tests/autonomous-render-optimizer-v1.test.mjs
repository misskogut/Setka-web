import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../standalone-auto-optimizer-v1.js",import.meta.url),"utf8");
function setup(){
  let clock=0;const window={};
  vm.runInNewContext(source,{window,performance:{now:()=>clock}});
  const setTime=n=>{clock=n},el=(w=180,h=180)=>({width:w,height:h});
  return{engine:window.SetkaAutoOptimizerV1,setTime,el};
}
test("the registry-driven optimizer schedules every visible mother with no 8-pattern whitelist",()=>{
  const {engine,setTime,el}=setup();
  const items=Array.from({length:11},(_,i)=>[el(),{patternId:"new-plugin-"+i}]);
  setTime(100);
  const choice=engine.choose("library",items,100,{interval:30,maxPaint:12});
  assert.equal(choice.length,11,"all eleven light-weight future patterns are included");
  const config=Object.freeze({waveFreq:3,numSnakes:60,colorModeIndex:0});
  for(let i=0;i<11;i++){
    const [canvas,item]=choice[i];
    engine.paint("library",canvas,item.patternId,100,()=>{setTime(100+i*.2);return config;});
  }
  const info=engine.status();
  assert.equal(info.patterns.length,11);
  assert.deepEqual(JSON.parse(JSON.stringify(config)),{waveFreq:3,numSnakes:60,colorModeIndex:0});
  assert.equal(info.groups[0].painted,11);
});
test("under known measured overload the same generic canvas policy lowers backing resolution but not config or CSS geometry",()=>{
  const {engine,setTime,el}=setup(),items=Array.from({length:9},(_,i)=>[el(),{patternId:"autonomy-"+i}]);
  setTime(100);
  engine.choose("library",items,100,{interval:30});
  const first=items[0][0],base={x:17,frequency:3,patternId:"autonomy-0"};
  for(let i=0;i<48;i++){
    const at=200+i*33;
    setTime(at);
    engine.paint("library",first,"autonomy-0",at,()=>{setTime(at+6);});
  }
  const row=engine.status().patterns.find(p=>p.id==="autonomy-0");
  assert.ok(row.samples>=48);
  assert.ok(row.resolutionScale>=.7&&row.resolutionScale<=1);
  assert.equal(JSON.stringify(base),JSON.stringify({x:17,frequency:3,patternId:"autonomy-0"}));
  assert.equal(first.width/first.height,1,"adaptive quality must preserve geometry aspect ratio");
});
test("unhelpful raster adaptation reverts itself instead of permanently degrading visual fidelity",()=>{
  const {engine,setTime,el}=setup(),canvas=el(240,240);
  engine.choose("library",Array.from({length:9},(_,i)=>[i?el():canvas,{patternId:"heavy-"+i}]),100);
  for(let i=0;i<60;i++){
    const at=200+i*33;
    setTime(at);
    engine.paint("library",canvas,"heavy-0",at,()=>{setTime(at+6)});
  }
  const p=engine.status().patterns.find(x=>x.id==="heavy-0");
  assert.equal(p.resolutionScale,1,"do not maintain lower resolution if throughput did not improve");
  assert.equal(p.limitation,"renderer-bound","expose capability gap instead of claiming to optimize an unresponsive renderer");
});
test("the performance governor shares one work budget across mother and note previews",()=>{
  const {engine,setTime,el}=setup();
  setTime(100);
  const a=[[el(),{patternId:"spiral-snakes-3d"}]];
  const b=[[el(),{patternId:"another-future-renderer"}]];
  assert.equal(engine.choose("library",a,100).length,1);
  engine.paint("library",a[0][0],"spiral-snakes-3d",100,()=>{setTime(114);});
  const aux=engine.choose("auxiliary",b,100);
  assert.ok(aux.length>=1);
  engine.paint("auxiliary",aux[0][0],"another-future-renderer",100,()=>{setTime(116);});
  const snapshot=engine.status();
  assert.equal(snapshot.groups.length,2);
  assert.equal(snapshot.groups.reduce((sum,x)=>sum+x.painted,0),2);
});

test("sparse-line art is automatically protected from resolution reduction",()=>{
  const {engine,setTime,el}=setup(),canvas=el();
  const data=new Uint8ClampedArray(canvas.width*canvas.height*4);
  for(let i=0;i<15;i++){const o=i*400;data[o]=255;data[o+1]=255;data[o+2]=255;data[o+3]=255;}
  canvas.getContext=()=>({getImageData:()=>({data})});
  engine.choose("library",Array.from({length:9},(_,i)=>[i?el():canvas,{patternId:"sparse-"+i}]),100);
  for(let i=0;i<44;i++){
    const at=200+i*33;setTime(at);
    engine.paint("library",canvas,"sparse-0",at,()=>{setTime(at+7)});
  }
  const p=engine.status().patterns.find(x=>x.id==="sparse-0");
  assert.equal(p.resolutionScale,1,"small numbers of lines must never disappear");
  assert.equal(p.limitation,"renderer-bound","report a true algorithm bottleneck instead");
});
