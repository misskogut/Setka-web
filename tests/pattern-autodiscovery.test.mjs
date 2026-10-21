import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

function workspace(){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'setka-patterns-'));
 fs.mkdirSync(path.join(tmp,'scripts'));
 for(const file of ['standalone-pattern-registry-v1.js','scripts/build-pattern-manifest.mjs']){
  fs.copyFileSync(file,path.join(tmp,file));
 }
 // The test workspace, like the production build, discovers all new pattern
 // modules from files. Never manually append the next pattern to test setup.
 for(const file of fs.readdirSync('.').filter(name=>/^standalone-pattern-[a-z0-9-]+\.js$/.test(name))){
  if(fs.readFileSync(file,'utf8').startsWith('/* SETKA_PATTERN_DESCRIPTOR'))fs.copyFileSync(file,path.join(tmp,file));
 }
 return tmp;
}
function build(dir){
 execFileSync(process.execPath,['scripts/build-pattern-manifest.mjs'],{cwd:dir,stdio:'pipe'});
 return {
  source:fs.readFileSync(path.join(dir,'standalone-pattern-registry-v1.js'),'utf8'),
  manifest:JSON.parse(fs.readFileSync(path.join(dir,'setka-pattern-manifest-v1.json'),'utf8'))
 };
}
function loadRegistry(source){
 const context={window:{dispatchEvent(){}},CustomEvent:class{}};
 vm.runInNewContext(source,context,{timeout:1500});
 return context.window.SetkaPatternRegistryV1;
}
const mini=(id,extra={})=>({
 id,title:id,version:1,schemaVersion:1,module:'standalone-pattern-'+id+'.js',
 defaults:{speed:1,seed:123,colorModeIndex:0},
 controls:[['Скорость','speed',0.1,10,0.1,'←→',1]],
 colorModes:2,palettes:[[255,255,255],[0,200,255]],...extra
});
const packageContent=meta=>'/* SETKA_PATTERN_DESCRIPTOR\n'+JSON.stringify(meta,null,2)+'\nEND_SETKA_PATTERN_DESCRIPTOR */\n'+
 'window.SetkaPatternRegistryV1.bindRenderer(document.currentScript.dataset.patternId,()=>{});\n';

test('every automatically discovered pattern renders its real white-on-black start and deterministic snapshots',()=>{
 const dir=workspace();
 try{
  const {source,manifest}=build(dir),registry=loadRegistry(source);
  const packages=registry.list().filter(p=>p.module);
  assert.ok(packages.length>=2,'Rain and Orbital are independently discovered');
  assert.equal(packages.length,fs.readdirSync(dir).filter(n=>/^standalone-pattern-[a-z0-9-]+\.js$/.test(n)&&fs.readFileSync(path.join(dir,n),'utf8').startsWith('/* SETKA_PATTERN_DESCRIPTOR')).length);
  for(const pattern of packages){
   const descriptor=pattern;
   const document={currentScript:{dataset:{patternId:pattern.id}}};
   vm.runInNewContext(fs.readFileSync(path.join(dir,pattern.module),'utf8'),
      {window:{SetkaPatternRegistryV1:registry},document,Math},{timeout:1500});
   assert.equal(registry.ready(pattern.id),true,'runtime renderer '+pattern.id);
   const c=registry.defaults(pattern.id);
   assert.deepEqual(JSON.parse(JSON.stringify(descriptor.palettes[c.colorModeIndex])),[255,255,255],'white initial mode '+pattern.id);
   const snap=JSON.parse(JSON.stringify(registry.snapshot({patternId:pattern.id,config:c,frame:44})));
   assert.equal(registry.restore(snap).ok,true,'immutable snapshot '+pattern.id);
   assert.ok(manifest.patterns.some(p=>p.id===pattern.id),'same manifest '+pattern.id);
   function trace(config,frame){
     const strokes=[],fills=[],gradientStops=[];
     let start,end;
     const ctx={
       save(){},restore(){},translate(){},scale(){},rotate(){},beginPath(){},
       fillRect(){fills.push(this.fillStyle)},
       createLinearGradient(){const stops=[];gradientStops.push(stops);return {addColorStop(_,v){stops.push(v)}}},
       moveTo(x,y){start=[x,y]},
       lineTo(x,y){end=[x,y]},
       stroke(){if(strokes.length<20)strokes.push({start,end,color:this.strokeStyle});}
     };
     registry.render(ctx,250,250,config,frame,true,pattern.id);
     return {strokes,fills,gradientStops};
   }
   const a=trace(c,44),b=trace(c,44);
   assert.ok(a.fills.includes('#000'),'real black canvas '+pattern.id);
   assert.ok(a.strokes.length>4,'actual dynamic line drawing '+pattern.id);
   assert.deepEqual(a,b,'deterministic replay '+pattern.id);
   assert.notDeepEqual(a.strokes,trace(c,65).strokes,'the animation actually moves '+pattern.id);
   const paint=[...a.strokes.map(st=>st.color).filter(x=>typeof x==='string'),...a.gradientStops.flat()];
   assert.ok(paint.length>0,'visible stroke colors '+pattern.id);
   assert.ok(paint.every(color=>/rgba\(255,255,255,/.test(color)),'first frame monochrome '+pattern.id);
 }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('Orbital Threads: original exact shape, nine palettes, two genuine rainbows and controls round-trip',()=>{
 const dir=workspace();
 try{
  const {source}=build(dir),R=loadRegistry(source);
  const id='orbital-threads',p=R.get(id);
  assert.ok(p,'one-file automatic registration');
  assert.equal(p.colorModes,9);
  assert.equal(p.defaults.v1,0.47381959508179683);
  assert.equal(p.defaults.lineCount,380);
  assert.equal(p.defaults.colorModeIndex,0);
  assert.equal(p.controls.length,7);
  assert.equal(p.controls.find(c=>c[1]==='shapeVariant')[5],'Тап');
  assert.equal(p.controls.find(c=>c[1]==='zoom')[6],2);
  vm.runInNewContext(fs.readFileSync(path.join(dir,p.module),'utf8'),
      {window:{SetkaPatternRegistryV1:R},document:{currentScript:{dataset:{patternId:id}}},Math},{timeout:1500});
  function colors(config,frame=144){
   const used=new Set(),context={
    save(){},restore(){},translate(){},scale(){},rotate(){},beginPath(){},
    fillRect(){},moveTo(){},lineTo(){},
    stroke(){if(typeof this.strokeStyle==='string')used.add(this.strokeStyle.match(/rgba\((\d+),(\d+),(\d+),/)?.[0]||this.strokeStyle)}
   };
   R.render(context,300,300,config,frame,false,id);
   return [...used];
  }
  const standard=R.defaults(id);
  assert.ok(colors(standard).length>0);
  for(let mode=1;mode<9;mode++)assert.ok(colors({...standard,colorModeIndex:mode}).length>0,'color '+mode);
  assert.ok(colors({...standard,colorModeIndex:7}).length>50,'rainbow spans many distinct hues');
  assert.ok(colors({...standard,colorModeIndex:8}).length>50,'pastel rainbow spans many distinct hues');
  assert.notDeepEqual(colors({...standard,colorModeIndex:7}),colors({...standard,colorModeIndex:8}));
  const changed={...standard,v1:0.47381959508179683,shapeVariant:3,colorModeIndex:8,trail:91,lineCount:418};
  const saved=R.snapshot({patternId:id,config:changed,frame:91});
  const result=R.restore(saved);
  assert.equal(result.ok,true);
  assert.equal(result.snapshot.config.v1,0.47381959508179683);
  assert.equal(result.snapshot.config.colorModeIndex,8);
  assert.equal(result.snapshot.config.lineCount,418);
  assert.equal(R.configKey(standard,id)===R.configKey(changed,id),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('a single pattern file automatically becomes one shared catalog, repeatedly and deterministically',()=>{
 const dir=workspace();
 try{
  const first=build(dir),R=loadRegistry(first.source);
  assert.ok(R.has('rain'));
  assert.equal(first.manifest.registryRevision,R.revision());
  assert.equal(first.manifest.patterns.length,R.list().length);
  assert.deepEqual(first.manifest.patterns.map(p=>p.id),JSON.parse(JSON.stringify(R.list())).map(p=>p.id));
  assert.deepEqual(R.defaults('rain').patternId,'rain');
  assert.ok(R.controls('rain').length>=4);
  assert.equal(R.validate(R.defaults('rain'),'rain').ok,true);
  const rain=R.get('rain');
  assert.equal(rain.defaults.colorModeIndex,3,'Rain must open in its original black-and-white palette');
  assert.deepEqual(JSON.parse(JSON.stringify(rain.palettes[rain.defaults.colorModeIndex])),[255,255,255]);
  assert.deepEqual(JSON.parse(JSON.stringify(rain.palettes[0])),[0,200,255],'saved blue mode stays blue');
  const second=build(dir);
  assert.equal(second.source,first.source,'same inputs may never create registry drift');
  assert.deepEqual(second.manifest,first.manifest,'same inputs must produce the same manifest');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('later added modules are automatically discovered without editing registry, front, research or SQL',()=>{
 const dir=workspace();
 try{
  const initial=build(dir);
  for(const id of ['fixture-next','fixture-after']){
   fs.writeFileSync(path.join(dir,'standalone-pattern-'+id+'.js'),packageContent(mini(id)));
  }
  const next=build(dir),R=loadRegistry(next.source);
  for(const id of ['rain','fixture-next','fixture-after']){
   assert.ok(R.has(id));assert.ok(next.manifest.patterns.some(p=>p.id===id));
   assert.equal(R.restore(R.snapshot({patternId:id,config:R.defaults(id),frame:44})).ok,true);
  }
  assert.equal(next.manifest.patterns.length,initial.manifest.patterns.length+2);
  fs.rmSync(path.join(dir,'standalone-pattern-fixture-after.js'));
  const removed=build(dir);
  assert.equal(removed.manifest.patterns.length,next.manifest.patterns.length-1);
  assert.equal(loadRegistry(removed.source).has('fixture-after'),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('invalid package blocks the build before changing generated outputs',()=>{
 const dir=workspace();
 try{
  const valid=build(dir);
  const filename=path.join(dir,'standalone-pattern-invalid-auto.js');
  fs.writeFileSync(filename,packageContent(mini('invalid-auto',{controls:[['Broken','speed',9,1,1,'←→',1]]})));
  assert.throws(()=>build(dir));
  assert.equal(fs.readFileSync(path.join(dir,'standalone-pattern-registry-v1.js'),'utf8'),valid.source);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'setka-pattern-manifest-v1.json'),'utf8')),valid.manifest);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('automated discovery refuses undefined or fractional gesture finger counts',()=>{
 const dir=workspace();
 try{
  const before=build(dir);
  const filename=path.join(dir,'standalone-pattern-invalid-gesture.js');
  for(const count of [0.025,0.01,undefined,3]){
   const descriptor=mini('invalid-gesture',{
    controls:[['Speed','speed',0.1,10,0.1,'Снизу ←→',count]]
   });
   fs.writeFileSync(filename,packageContent(descriptor));
   assert.throws(()=>build(dir),/invalid_gesture_contract/);
   assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'setka-pattern-manifest-v1.json'),'utf8')),before.manifest);
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('no new standalone package may launch in color, even with valid controls',()=>{
 const dir=workspace();
 try{
  const valid=build(dir);
  const filename=path.join(dir,'standalone-pattern-invalid-color.js');
  fs.writeFileSync(filename,packageContent(mini('invalid-color',{
   defaults:{speed:1,seed:123,colorModeIndex:1}
  })));
  assert.throws(()=>build(dir),/black-white initial palette required|initial_palette_must_be_monochrome/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'setka-pattern-manifest-v1.json'),'utf8')),valid.manifest);
  fs.writeFileSync(filename,packageContent(mini('invalid-color',{palettes:undefined})));
  assert.throws(()=>build(dir),/black-white initial palette required/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('Rain draws actual white gradients on black in default mode and preserves blue when selected',()=>{
 const dir=workspace();
 try{
  const {source}=build(dir),R=loadRegistry(source),d={currentScript:{dataset:{patternId:'rain'}}};
  vm.runInNewContext(fs.readFileSync(path.join(dir,'standalone-pattern-rain.js'),'utf8'),
   {window:{SetkaPatternRegistryV1:R},document:d,Math},{timeout:1500});
  function capture(config){
   const gradients=[],fills=[];
   const ctx={
    save(){},restore(){},translate(){},scale(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},
    fillRect(){fills.push(this.fillStyle)},
    createLinearGradient(){const stops=[];gradients.push(stops);return {addColorStop(_position,color){stops.push(color)}}}
   };
   R.render(ctx,180,280,config,32,true,'rain');
   return {fills,gradients};
  }
  const initial=capture(R.defaults('rain'));
  assert.equal(initial.fills[0],'#000');
  assert.ok(initial.gradients.length>0);
  assert.ok(initial.gradients.every(stops=>stops.every(color=>/^rgba\(255,255,255,/.test(color))));
  const blue=capture({...R.defaults('rain'),colorModeIndex:0});
  assert.ok(blue.gradients.some(stops=>stops.some(color=>color.includes('rgba(0,200,255,'))));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('Rain registers a real deterministic renderer and changes visibly with frame/mode',()=>{
 const dir=workspace();
 try{
  const {source}=build(dir),R=loadRegistry(source);
  const document={currentScript:{dataset:{patternId:'rain'}}};
  vm.runInNewContext(fs.readFileSync(path.join(dir,'standalone-pattern-rain.js'),'utf8'),
    {window:{SetkaPatternRegistryV1:R},document,Math},{timeout:1500});
  assert.equal(R.ready('rain'),true);
  function trace(config,frame){
   const strokes=[];
   let from=null,to=null;
   const ctx={
    save(){},restore(){},fillRect(){},translate(){},scale(){},beginPath(){},
    createLinearGradient(){return {addColorStop(){}}},
    moveTo(x,y){from=[x,y]},lineTo(x,y){to=[x,y]},stroke(){if(strokes.length<12)strokes.push([from,to]);}
   };
   R.render(ctx,220,330,config,frame,true,'rain');
   return strokes;
  }
  const defaults=R.defaults('rain');
  const a=trace(defaults,8),b=trace(defaults,8);
  assert.deepEqual(a,b,'same config + frame should replay exactly');
  assert.notDeepEqual(a,trace(defaults,88),'different frame should move');
  assert.notDeepEqual(a,trace({...defaults,motionMode:2},8),'mode changes the geometry');
  assert.equal(R.restore(R.snapshot({patternId:'rain',config:defaults,frame:8})).ok,true);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
