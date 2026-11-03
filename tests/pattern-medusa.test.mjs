import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup() {
  const host={dispatchEvent(){}};
  const env={window:host,CustomEvent:class{},Math};
  vm.runInNewContext(fs.readFileSync('standalone-pattern-registry-v1.js','utf8'),env,{timeout:2000});
  const registry=host.SetkaPatternRegistryV1;
  const d={currentScript:{dataset:{patternId:'medusa'}}};
  vm.runInNewContext(fs.readFileSync('standalone-pattern-medusa.js','utf8'),
    {window:host,document:d,Math,Float32Array,WeakMap},{timeout:2000});
  return registry;
}
function sample(R,config,frame) {
  const shapes=[],fills=[];
  const ctx={
    save(){},restore(){},translate(){},scale(){},beginPath(){},
    fillRect(x,y,w,h){fills.push(this.fillStyle);},
    arc(x,y,r){if(shapes.length<2000)shapes.push([Math.round(x*1000),Math.round(y*1000),Math.round(r*1000),this.fillStyle]);},
    fill(){}
  };
  R.render(ctx,600,600,config,frame,false,'medusa');
  return {shapes,fills};
}
test('Medusa joins the generic registry, starts monochrome, retains all nine palettes and 30-body control',()=>{
  const R=setup(),d=R.get('medusa');
  assert.ok(R.ready('medusa'));
  assert.equal(d.colorModes,9);
  assert.equal(d.tapOverflow,'clamp','new patterns can opt into non-wrapping tap without ID conditions');
  assert.deepEqual(Array.from(d.palettes[0]),[255,255,255]);
  assert.equal(d.defaults.medusaCount,3);
  assert.equal(d.controls.find(c=>c[1]==='medusaCount')[3],30);
  assert.equal(d.controls.find(c=>c[1]==='medusaCount')[5],'Тап');
  assert.equal(R.validate({...d.defaults,medusaCount:30},'medusa').ok,true);
  assert.equal(R.normalize({...d.defaults,medusaCount:900},'medusa').medusaCount,30);
  assert.equal(R.validate({...d.defaults,medusaCount:900},'medusa').ok,false);
  const image=sample(R,d.defaults,44);
  assert.ok(image.fills.includes('#000'),'black canvas');
  assert.ok(image.shapes.length>40,'segmented, moving tentacles visible');
  assert.ok(image.shapes.every(s=>/^rgba\(255,255,255,/.test(s[3])),'white drawing only');
});
test('Adding medusae preserves the preceding creatures at the same replay frame',()=>{
  const R=setup(),base=R.defaults('medusa'),small=sample(R,base,44);
  const lots=sample(R,{...base,medusaCount:30},44);
  assert.deepEqual(lots.shapes.slice(0,small.shapes.length),small.shapes,
    'first animals unaffected by count — no rebuild of seeded paths');
  assert.ok(lots.shapes.length>small.shapes.length);
});
test('Same Medusa snapshot always recreates the same drawing independent of canvas / replay path',()=>{
  const R=setup(),c={...R.defaults('medusa'),medusaCount:8,colorModeIndex:8};
  const snap=JSON.parse(JSON.stringify(R.snapshot({patternId:'medusa',config:c,frame:65})));
  assert.equal(R.restore(snap).ok,true);
  assert.equal(snap.config.medusaCount,8);
  const first=sample(R,c,65),second=sample(R,R.restore(snap).snapshot.config,65);
  assert.deepEqual(first,second);
  assert.notDeepEqual(first.shapes,sample(R,c,75).shapes,'animation advances');
  assert.ok(first.shapes.some(s=>String(s[3]).startsWith('hsla(')),'rainbow/neon mode');
});
