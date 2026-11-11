import test from 'node:test';
import assert from 'node:assert/strict';
import {orbitUnit,orbitDepthProfile,orbitEarlyReflectionProfile,clampOrbitRadius,ORBIT_RADIUS_MIN,ORBIT_RADIUS_MAX} from '../standalone-music-audio-v1.mjs';
const EPS=1e-10;
test('visual orbit cardinal angles match acoustic coordinates',()=>{
 const checks=[[0,0,-1],[Math.PI/2,1,0],[Math.PI,0,1],[3*Math.PI/2,-1,0]];
 for(const [angle,x,z] of checks){const actual=orbitUnit(angle);assert.ok(Math.abs(actual.x-x)<EPS);assert.ok(Math.abs(actual.z-z)<EPS)}
});
test('orbit distance, direct attenuation and room response remain bounded and continuous',()=>{
 let previous=null;
 for(let i=0;i<=2000;i++){
  const r=ORBIT_RADIUS_MIN+(ORBIT_RADIUS_MAX-ORBIT_RADIUS_MIN)*i/2000;
  const p=orbitDepthProfile(r);
  for(const k of ['distance','depth','directAttenuation','roomSend'])assert.ok(Number.isFinite(p[k]),k);
  assert.ok(p.distance>0&&p.directAttenuation>0&&p.directAttenuation<=1);
  if(previous){assert.ok(p.distance>=previous.distance-1e-8);assert.ok(p.directAttenuation<=previous.directAttenuation+1e-8);assert.ok(Math.abs(p.distance-previous.distance)<.04)}
  previous=p;
 }
 assert.equal(clampOrbitRadius(-100),ORBIT_RADIUS_MIN);
 assert.equal(clampOrbitRadius(100),ORBIT_RADIUS_MAX);
 assert.equal(clampOrbitRadius(Number.NaN),.62);
});
test('early reflections remain physical and bounded at 3600 sampled placements',()=>{
 for(let i=0;i<120;i++)for(let j=0;j<30;j++){
  const angle=i*Math.PI*2/120;
  const radius=ORBIT_RADIUS_MIN+(ORBIT_RADIUS_MAX-ORBIT_RADIUS_MIN)*j/29;
  const reflections=orbitEarlyReflectionProfile(angle,radius);
  assert.equal(reflections.length,2);
  for(const q of reflections){
   for(const k of ['delay','gain','cutoff','x','z','pathLength'])assert.ok(Number.isFinite(q[k]),k);
   assert.ok(q.delay>=.009&&q.delay<=.11);
   assert.ok(q.gain>=0&&q.gain<=.16);
   assert.ok(q.cutoff>=3900&&q.cutoff<=9000);
   assert.ok(q.pathLength>0);
  }
 }
});
