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
 const ids=rows=>rows.map(x=>x.id).sort();
 assert.deepEqual(ids(local),ids(manifest.patterns),'server and client pattern IDs differ');
 for(const p of manifest.patterns){
  const front=registry.get(p.id);
  assert.ok(front,'missing frontend pattern '+p.id);
  assert.equal(front.version,p.version,'version mismatch '+p.id);
  assert.deepEqual(JSON.parse(JSON.stringify(front.controls)),p.controls,'controls mismatch '+p.id);
  assert.deepEqual(JSON.parse(JSON.stringify(front.defaults)),p.defaults,'defaults mismatch '+p.id);
 }
});
