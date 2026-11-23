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

test('visible irregular facets have flat per-triangle normals with distinct neighboring faces',()=>{
 const v=honey.create({steps:16}).vertices;
 let varied=0,previous=null;
 for(let i=0;i<v.length;i+=18){
  const n=[v[i+3],v[i+4],v[i+5]];
  const n1=[v[i+9],v[i+10],v[i+11]];
  const n2=[v[i+15],v[i+16],v[i+17]];
  for(let k=0;k<3;k++){
   assert.ok(Math.abs(n[k]-n1[k])<1e-6,'polygon corner normal mismatch');
   assert.ok(Math.abs(n[k]-n2[k])<1e-6,'polygon corner normal mismatch');
  }
  assert.ok(Math.abs(Math.hypot(...n)-1)<1e-5);
  if(previous&&n.some((x,j)=>Math.abs(x-previous[j])>.12))varied++;
  previous=n;
 }
 assert.ok(varied>450,'normals should differ between irregular polygon faces');
});

test('zero-g honey preserves full vertical 3D turn, and old globe graphics are gone',()=>{
 assert.match(originalLogoScript,/if\(aMaterial<\.5\)/);
 assert.match(originalLogoScript,/uniform vec3 uMotion\[5\]/);
 assert.match(originalLogoScript,/startAnimation\(\)/);
 assert.match(originalLogoScript,/stopAnimation\(\)/);
 assert.match(originalLogoScript,/cardPlane\(f\.w,f\.h,scale\)/);
 assert.match(originalLogoScript,/gl\.colorMask\(false,false,false,false\)/);
 assert.match(originalLogoScript,/SETKA_METABALL_MESH\.create\(\{steps:16,scale:94,zOffset:110\}\)/);
 assert.match(originalLogoScript,/const facet=\.035\+\.385/);
 assert.doesNotMatch(originalLogoScript,/tube\(/);
 assert.doesNotMatch(originalLogoScript,/function glyph\(/);
 assert.doesNotMatch(originalLogoScript,/word\("СКВИШ"/);
 assert.doesNotMatch(originalLogoScript,/word\("ДЛЯ МОЗГА"/);
});

test('experimental page cache-busts faceted renderer; CSS hides legacy globe decorations',()=>{
 const css=fs.readFileSync('experiments/standalone-vertical-logo-globe-v3.css','utf8');
 assert.match(experimentalHtml,/setka-metaball-mesh-v1\.js\?v=20261123-honey-facets/);
 assert.match(experimentalHtml,/standalone-vertical-logo-globe-v3\.js\?v=20261123-honey-facets/);
 assert.match(experimentalHtml,/standalone-vertical-logo-globe-v3\.css\?v=20261123-honey-facets/);
 assert.match(css,/\.setka-vlogo-crest,\s*\.setka-vlogo-shadow,\s*\.setka-vlogo-line,/);
 assert.match(css,/\.setka-vlogo-3d::after\s*\{\s*display:none!important;/);
 assert.match(css,/conic-gradient\(/);
});
