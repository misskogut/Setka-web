import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('every discovered slider has a writable normalized value at its boundaries',()=>{
 const ctx={window:{dispatchEvent(){}},CustomEvent:class{}};
 vm.runInNewContext(fs.readFileSync('standalone-pattern-registry-v1.js','utf8'),ctx);
 const R=ctx.window.SetkaPatternRegistryV1;
 for(const p of R.list().filter(p=>p.module)){
  const defaults=R.defaults(p.id);
  for(const [label,key,min,max,step] of p.controls){
   assert.ok(Object.hasOwn(defaults,key),`${p.id}: ${label} has no default`);
   for(const v of [min,max]){
    const next=R.normalize({...defaults,[key]:v},p.id);
    assert.ok(Number.isFinite(Number(next[key])),`${p.id} ${key}: non-finite slider value`);
    assert.ok(Math.abs(Number(next[key])-v)<=Math.max(Number(step)||0,1e-7),`${p.id} ${key}: slider cannot reach ${v}`);
   }
  }
 }
});

test('start-view editor applies patches independently of gesture reducers',()=>{
 const source=fs.readFileSync('research-v1/pattern-editor.mjs','utf8');
 assert.match(source,/const patch=changes=>\{[^\n]*registry\.normalize\(\{\.\.\.config,\.\.\.changes\},id\)/);
 assert.doesNotMatch(source,/type:\s*['"]patch['"]/);
});

test('gravity atom follows exact pointer coordinates and clears them on release',()=>{
 const descriptor=fs.readFileSync('standalone-pattern-gravity-atom.js','utf8').match(/SETKA_PATTERN_DESCRIPTOR\s*\n([\s\S]*?)\nEND_SETKA_PATTERN_DESCRIPTOR/);
 assert.ok(descriptor,'gravity atom descriptor missing');
 const p=JSON.parse(descriptor[1]);
 const source=fs.readFileSync('standalone-pattern-registry-v1.js','utf8');

 const ctx={window:{dispatchEvent(){}},document:{currentScript:{dataset:{patternId:p.id}}},CustomEvent:class{}};
 vm.runInNewContext(source,ctx);
 vm.runInNewContext(fs.readFileSync('standalone-pattern-gravity-atom.js','utf8'),ctx);
 const R=ctx.window.SetkaPatternRegistryV1;
 assert.equal(R.hasInteraction(p.id),true);
 const defaults=R.defaults(p.id);
 const start=R.interact(p.id,defaults,{type:'gesture',phase:'start',fingers:1,x:37,y:119});
 assert.equal(start.fingerX,37);assert.equal(start.fingerY,119);assert.equal(start.fingerActive,1);
 const move=R.interact(p.id,start,{type:'gesture',phase:'move',fingers:1,x:219,y:67});
 assert.equal(move.fingerX,219);assert.equal(move.fingerY,67);
 const end=R.interact(p.id,move,{type:'gesture',phase:'end',fingers:1,x:219,y:67});
 assert.equal(end.fingerActive,0);
 const cancelled=R.interact(p.id,start,{type:'gesture',phase:'end',fingers:1,cancelled:true});
 assert.equal(cancelled.fingerActive,0);
});
