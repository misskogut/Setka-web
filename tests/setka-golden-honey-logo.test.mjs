import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const moduleSource=fs.readFileSync('experiments/setka-metaball-mesh-v1.js','utf8');
const originalLogoScript=fs.readFileSync('experiments/standalone-vertical-logo-globe-v3.js','utf8');
const experimentalHtml=fs.readFileSync('standalone-v34-cycle-logo3d.html','utf8');
const canonicalHtml=fs.readFileSync('standalone-v34.html','utf8');
const sandbox={module:{exports:{}},console};
vm.runInNewContext(moduleSource,sandbox,{filename:'setka-metaball-mesh-v1.js'});
const honey=sandbox.module.exports;

test('approved honey #08 is a single closed implicit volume, with no radial sphere strips',()=>{
 assert.equal(honey.geometry,'marching-tetrahedra-smooth-union');
 assert.equal(honey.material,'golden-honey-08');
 const m=honey.create({steps:15});
 assert.ok(m.triangleCount>1200,'only '+m.triangleCount+' triangles');
 assert.equal(m.vertices.length,m.triangleCount*18);
 assert.ok(m.bounds.min[2]>0,'floating object must be in front of the card');
 assert.ok(m.bounds.max[2]>m.bounds.min[2]+90,'metaball must retain volumetric depth');
 assert.ok(m.bounds.max[0]-m.bounds.min[0]>110);
 assert.ok(Array.from(m.vertices).every(Number.isFinite));
});

test('every triangle edge belongs to exactly two faces: no cracks or holes',()=>{
 const {vertices:v}=honey.create({steps:14});
 const edges=new Map();
 const vertex=i=>[v[6*i],v[6*i+1],v[6*i+2]].map(x=>x.toFixed(4)).join(',');
 const add=(a,b)=>{const edge=[a,b].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1)};
 for(let i=0;i<v.length/6;i+=3){
  const a=vertex(i),b=vertex(i+1),c=vertex(i+2);
  assert.notEqual(a,b);assert.notEqual(b,c);assert.notEqual(a,c);
  add(a,b);add(b,c);add(c,a);
 }
 const bad=[...edges.entries()].filter(([,count])=>count!==2);
 assert.equal(bad.length,0,'open/overlapping surface edges: '+bad.slice(0,3).map(x=>x.join(' -> ')).join('; '));
});

test('experimental page wires honey before renderer; main SETKA App stays unchanged',()=>{
 const generator='experiments/setka-metaball-mesh-v1.js';
 const renderer='experiments/standalone-vertical-logo-globe-v3.js';
 assert.ok(experimentalHtml.indexOf(generator)>=0);
 assert.ok(experimentalHtml.indexOf(renderer)>experimentalHtml.indexOf(generator));
 assert.ok(!canonicalHtml.includes(generator));
 assert.ok(!canonicalHtml.includes('standalone-vertical-logo-globe-v3.js'));
 assert.match(originalLogoScript,/SETKA_METABALL_MESH\.create\(\{steps:23,scale:94,zOffset:110\}\)/);
 assert.doesNotMatch(originalLogoScript,/const latCount=30,lonCount=68/);
 assert.doesNotMatch(originalLogoScript,/colorPlanet\(/);
});

test('continuous honey vertex deformation leaves existing orbit and card-depth occlusion intact',()=>{
 assert.match(originalLogoScript,/if\(aMaterial<\.5\)/);
 assert.match(originalLogoScript,/uniform vec3 uMotion\[5\]/);
 assert.match(originalLogoScript,/startAnimation\(\)/);
 assert.match(originalLogoScript,/stopAnimation\(\)/);
 assert.match(originalLogoScript,/cardPlane\(f\.w,f\.h,scale\)/);
 assert.match(originalLogoScript,/gl\.colorMask\(false,false,false,false\)/);
 assert.match(originalLogoScript,/word\("СКВИШ"/);
 assert.match(originalLogoScript,/word\("ДЛЯ МОЗГА"/);
 assert.match(originalLogoScript,/tube\(t=>\[134\*Math\.cos/);
});
