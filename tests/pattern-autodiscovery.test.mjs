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
 for(const file of ['standalone-pattern-registry-v1.js','standalone-pattern-rain.js','scripts/build-pattern-manifest.mjs']){
  fs.copyFileSync(file,path.join(tmp,file));
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
 colorModes:2,...extra
});
const packageContent=meta=>'/* SETKA_PATTERN_DESCRIPTOR\n'+JSON.stringify(meta,null,2)+'\nEND_SETKA_PATTERN_DESCRIPTOR */\n'+
 'window.SetkaPatternRegistryV1.bindRenderer(document.currentScript.dataset.patternId,()=>{});\n';

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
