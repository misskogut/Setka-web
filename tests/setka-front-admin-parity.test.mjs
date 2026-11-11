import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(p,'utf8');

test('frontend and research admin use the same canonical registry',()=>{
 const front=read('standalone-v34.html');
 const admin=read('standalone-research-admin-v1.html');
 const app=read('research-v1/app.mjs');
 const renderer=read('research-v1/renderer.mjs');
 const editor=read('research-v1/pattern-editor.mjs');
 assert.match(front,/standalone-pattern-registry-v1\.js/,'frontend missing canonical registry');
 assert.match(admin,/research-v1\/app\.mjs/,'admin missing app entrypoint');
 assert.match(app,/\.\/renderer\.mjs/,'admin missing shared renderer');
 assert.match(renderer,/standalone-pattern-registry-v1\.js|SetkaPatternRegistryV1/,'admin renderer not bound to canonical registry');
 assert.match(editor,/standalone-pattern-registry-v1\.js/,'admin editor not bound to canonical registry');
 assert.match(app,/mountPatternEditor/,'admin editor not mounted');
 assert.match(app,/registry\.applyDefaults\(/,'admin not applying saved defaults');
 assert.match(app,/registry\.applyOrder\(/,'admin not applying canonical order');
});

test('generated server manifest and frontend registry contain identical pattern descriptors',()=>{
 const manifest=JSON.parse(read('setka-pattern-manifest-v1.json'));
 const ctx={window:{dispatchEvent(){}},CustomEvent:class{}};
 vm.runInNewContext(read('standalone-pattern-registry-v1.js'),ctx);
 const registry=ctx.window.SetkaPatternRegistryV1;
 const local=registry.list();
 const ids=rows=>Array.from(rows,x=>String(x.id)).sort();
 assert.deepEqual(ids(local),ids(manifest.patterns),'server and client pattern IDs differ');
 for(const p of manifest.patterns){
  const front=registry.get(p.id);
  assert.ok(front,'missing frontend pattern '+p.id);
  assert.equal(front.version,p.version,'version mismatch '+p.id);
  assert.deepEqual(JSON.parse(JSON.stringify(front.controls)),p.controls,'controls mismatch '+p.id);
  assert.deepEqual(JSON.parse(JSON.stringify(front.defaults)),p.defaults,'defaults mismatch '+p.id);
 }
});

test('admin catalog updates are versioned and reject stale defaults/order/publication',()=>{
 const ctx={window:{dispatchEvent(){}},CustomEvent:class{}};
 vm.runInNewContext(read('standalone-pattern-registry-v1.js'),ctx);
 const registry=ctx.window.SetkaPatternRegistryV1;
 const p=registry.list().find(x=>x.module&&x.controls?.some(c=>typeof x.defaults[c[1]]==='number'));
 assert.ok(p,'No descriptor with an editable numeric control');
 const control=p.controls.find(c=>typeof p.defaults[c[1]]==='number');
 const key=control[1];
 const old=registry.defaults(p.id);
 const nextValue=old[key]===control[2]?control[3]:control[2];
 const updated={...old,[key]:nextValue};
 const row={pattern_id:p.id,pattern_version:p.version,schema_version:p.schemaVersion,revision:10,config:updated};
 assert.equal(registry.applyDefaults([row]),true,'new admin defaults not accepted');
 assert.equal(registry.defaults(p.id)[key],nextValue,'front did not receive updated default');
 assert.equal(registry.applyDefaults([{...row,revision:9,config:old}]),false,'stale admin default accepted');
 assert.equal(registry.defaults(p.id)[key],nextValue,'stale default overwrote current value');
 assert.equal(registry.applyDefaults([{...row,revision:11,pattern_version:p.version+1,config:old}]),false,'incompatible pattern version accepted');
 const first=registry.orderedIds().slice(0,2);
 assert.equal(first.length,2);
 assert.equal(registry.applyOrder({patternIds:first.slice().reverse(),revision:10}),true);
 assert.deepEqual(Array.from(registry.orderedIds().slice(0,2)),Array.from(first.slice().reverse()));
 assert.equal(registry.applyOrder({patternIds:first,revision:9}),false,'stale order accepted');
 assert.deepEqual(Array.from(registry.orderedIds().slice(0,2)),Array.from(first.slice().reverse()));
 registry.usePublicCatalog(true);
 assert.equal(registry.applyPublication([p.id],10),true);
 assert.equal(registry.isActive(p.id),true);
 assert.equal(registry.applyPublication([],9),false,'stale publication accepted');
 assert.equal(registry.isActive(p.id),true);
});
