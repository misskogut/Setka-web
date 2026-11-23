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
 assert.match(originalLogoScript,/SETKA_METABALL_MESH\.create\(\{/);
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


test('original approved #08 is rebuilt from moving lobes without any open edges',()=>{
 const homes=honey.homes.map(q=>q.slice(0,3));
 const states=[
  {time:0,centers:homes},
  {time:.7,centers:homes.map((p,i)=>[p[0]+.08*Math.sin(i+1),p[1]+.1*Math.cos(i),p[2]])},
  {time:2.5,centers:homes.map((p,i)=>[p[0]-.09*Math.cos(i),p[1]+.06*Math.sin(i+2),p[2]+.075*Math.cos(i)])},
  {time:5.8,centers:homes.map((p,i)=>[p[0]+.13*Math.cos(i+1),p[1]-.08*Math.sin(i+3),p[2]-.05])}
 ];
 let previous;
 for(const state of states){
  const v=honey.create({steps:17,scale:94,zOffset:110,...state}).vertices;
  const edges=new Map();
  const vertex=i=>[v[6*i],v[6*i+1],v[6*i+2]].map(x=>x.toFixed(4)).join(',');
  for(let i=0;i<v.length/6;i+=3){
   const p=[vertex(i),vertex(i+1),vertex(i+2)];
   for(let j=0;j<3;j++){
    const key=[p[j],p[(j+1)%3]].sort().join('|');
    edges.set(key,(edges.get(key)||0)+1);
   }
  }
  assert.ok(v.length>5000,'live mesh collapsed');
  assert.ok([...edges.values()].every(count=>count===2),'open seam at time '+state.time);
  assert.ok(Array.from(v).every(Number.isFinite),'nonfinite mesh coordinate');
  if(previous)assert.notDeepEqual(v.slice(0,18),previous.slice(0,18),'fluid does not move');
  previous=v;
 }
});

test('WebGL port uses original #08 CPU rebuild and never pulls mesh corners apart',()=>{
 assert.match(originalLogoScript,/steps:23,scale:94,zOffset:110,time,centers,press,contact/);
 assert.match(originalLogoScript,/const FLUID_REBUILD_MS=82/);
 assert.match(originalLogoScript,/refreshFluid\(\);lastMesh=now/);
 assert.match(originalLogoScript,/gl\.bufferData\(gl\.ARRAY_BUFFER,result\.data,gl\.DYNAMIC_DRAW\)/);
 assert.doesNotMatch(originalLogoScript,/aNormal\*\(3\.2\*a\+2\.4\*b\)/);
 assert.doesNotMatch(originalLogoScript,/uniform vec3 uMotion\[5\]/);
 assert.match(originalLogoScript,/b\.timer=random\(\.28,\.85\)/);
 assert.match(originalLogoScript,/Math\.exp\(-\.83\*dt\)/);
 assert.match(originalLogoScript,/cardPlane\(f\.w,f\.h,scale\)/);
 assert.match(originalLogoScript,/gl\.colorMask\(false,false,false,false\)/);
 assert.match(originalLogoScript,/fluidInput\(p\[0\],p\[1\],dx,dy\)/);
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
