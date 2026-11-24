import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const meshCode=fs.readFileSync('experiments/setka-metaball-mesh-v1.js','utf8');
const rendererCode=fs.readFileSync('experiments/standalone-vertical-logo-globe-v3.js','utf8');
const experiment=fs.readFileSync('standalone-v34-cycle-logo3d.html','utf8');

function harness(){
 let clock=1000;
 const handlers=new Map(), frames=[];
 const history=[],titleDraws=[];
 let titlePass=0,lastBuffer=null;
 const gl=new Proxy({},{
  get(target,key){
   if(key==='getShaderParameter'||key==='getProgramParameter')return ()=>true;
   if(key==='createShader'||key==='createProgram'||key==='createBuffer')return ()=>({});
   if(key==='getAttribLocation')return ()=>0;
   if(key==='getUniformLocation')return (_,name)=>name;
   if(key==='uniform1f')return (name,value)=>{if(name==='uTitlePass')titlePass=value};
   if(key==='drawArrays')return (mode,start,count)=>{if(titlePass===1)titleDraws.push({count,finite:Array.from(lastBuffer||[]).every(Number.isFinite)});};
   if(key==='bufferData')return (kind,value,usage)=>{
    lastBuffer=value;
    if(value?.length>20000)history.push({vertices:value.length/7,finite:Array.from(value).every(Number.isFinite)});
   };
   if(typeof key==='string'&&key===key.toUpperCase())return 1;
   return ()=>{};
  }
 });
 const card={
  offsetWidth:390,offsetHeight:720,
  getBoundingClientRect:()=>({left:0,top:0,width:390,height:720}),
  addEventListener(type,fn){
   if(!handlers.has(type))handlers.set(type,[]);
   handlers.get(type).push(fn);
  }
 };
 const canvas={style:{},setAttribute(){},getContext(){return gl},addEventListener(){},remove(){}};
 const window={innerWidth:390,innerHeight:820,devicePixelRatio:1,addEventListener(){}};
 const document={
  body:{appendChild(){},classList:{add(){},remove(){}}},
  getElementById(id){return id==='setkaVerticalLogoCard'?card:null},
  createElement(){return canvas},
  addEventListener(){},
  hidden:false
 };
 const performance={now:()=>clock};
 const requestAnimationFrame=fn=>{frames.push(fn);return frames.length};
 const cancelAnimationFrame=()=>{};
 const context={window,document,performance,requestAnimationFrame,cancelAnimationFrame,location:{reload(){}},console};
 vm.runInNewContext(meshCode,context,{filename:'setka-metaball-mesh-v1.js'});
 vm.runInNewContext(rendererCode,context,{filename:'standalone-vertical-logo-globe-v3.js'});
 const api=window.SETKA_SOLID_WORDMARK;
 assert.ok(api,'live renderer should mount');
 api.render({visible:true,angle:0});
 const send=(type,options={})=>{
  const e={pointerType:'touch',pointerId:7,clientX:195,clientY:360,...options};
  for(const cb of handlers.get(type)||[])cb(e);
 };
 const advance=(ms)=>{
  clock+=ms;
  const next=frames.shift();
  if(next)next(clock);
 };
 return {send,advance,api,history,titleDraws};
}

test('tap on honey immediately increases zero-G excitement, repeated tap stacks',()=>{
 const h=harness();
 const baseline=h.api.getInfo();
 assert.equal(baseline.taps,0);
 assert.equal(baseline.excitationLevel,0);
 h.send('pointerdown');
 h.advance(100);
 h.send('pointerup');
 const first=h.api.getInfo();
 assert.equal(first.taps,1);
 assert.ok(first.excitationLevel>=1,'first tap must excite the fluid');
 h.send('pointerdown');
 h.advance(90);
 h.send('pointerup');
 const second=h.api.getInfo();
 assert.equal(second.taps,2);
 assert.ok(second.excitationLevel>first.excitationLevel,'a second tap must strengthen activity');
 for(let i=0;i<24;i++)h.advance(70);
 const recovered=h.api.getInfo();
 assert.equal(recovered.taps,2);
 assert.ok(recovered.excitationLevel<second.excitationLevel,'excitement must decay automatically');
 assert.ok(h.history.length>2,'fluid must continue rebuilding as it moves');
 assert.ok(h.history.every(x=>x.vertices>5000&&x.finite),'no invalid or missing dynamic mesh');
});

test('vertical swipe, long press, far-off touch and cancellation do not trigger tap',()=>{
 const h=harness();
 const taps=()=>h.api.getInfo().taps;
 h.send('pointerdown');
 h.send('pointermove',{clientY:455});
 h.send('pointerup',{clientY:455});
 assert.equal(taps(),0,'card flip gesture must not excite the honey');
 h.send('pointerdown');
 h.advance(600);
 h.send('pointerup');
 assert.equal(taps(),0,'long touch is not a tap');
 h.send('pointerdown',{clientX:15,clientY:90});
 h.send('pointerup',{clientX:15,clientY:90});
 assert.equal(taps(),0,'outside honey should not activate');
 h.send('pointerdown');
 h.send('pointercancel');
 assert.equal(taps(),0,'cancelled touch should not activate');
 h.api.render({visible:true,angle:90});
 h.send('pointerdown');
 h.send('pointerup');
 assert.equal(taps(),0,'middle of card flip should not fire a tap');
});

test('new tap version is loaded only in isolated 3D experiment',()=>{
 const canonical=fs.readFileSync('standalone-v34.html','utf8');
 assert.match(experiment,/standalone-vertical-logo-globe-v3\.js\?v=20261123-honey08-tap-energy/);
 assert.match(rendererCode,/function exciteHoney\(x,y\)/);
 assert.match(rendererCode,/excitement\*=Math\.exp\(-dt\*\.61\)/);
 assert.match(rendererCode,/tapCount\+\+/);
 assert.doesNotMatch(rendererCode,/uniform vec3 uMotion\[5\]/);
 assert.ok(!canonical.includes('honey08-tap-energy'));
});

 test('electric title uses original thin line geometry and preserves inertial drag, with separate material pass',()=>{
 const h=harness();
 assert.equal(h.api.getInfo().titleStyle,'thin-iridescent-contours');
 assert.ok(h.titleDraws.length>0);
 assert.ok(h.titleDraws.every(x=>x.count===1038&&x.finite));
 const start=h.api.getInfo().titlePhase;
 h.send('pointerdown',{clientX:65,clientY:350});
 h.advance(40);
 h.send('pointermove',{clientX:130,clientY:350});
 h.send('pointerup',{clientX:130,clientY:350});
 const released=h.api.getInfo();
 assert.ok(released.titlePhase>start);
 assert.ok(released.titleVelocity>0);
 h.advance(40);
 assert.ok(h.api.getInfo().titlePhase>released.titlePhase);
 assert.match(rendererCode,/if\(uTitlePass > 0\.5\)/);
 assert.match(rendererCode,/float pulse=exp\(-d\*d\)/);
 assert.match(rendererCode,/gl\.drawArrays\(gl\.LINES,0,data\.length\/7\)/);
 assert.doesNotMatch(rendererCode,/uTitleViewport|gl\.lineWidth\(/);
 });
