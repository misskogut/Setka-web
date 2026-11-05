import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('standalone-pattern-gravity-cubes.js','utf8');
const descriptor=JSON.parse(source.match(/SETKA_PATTERN_DESCRIPTOR\n([\s\S]*?)\nEND_SETKA_PATTERN_DESCRIPTOR/)[1]);
function load(){const context={window:{SetkaPatternRegistryV1:{has:()=>true,bindRenderer(){},bindInteraction(){}}},document:{currentScript:{dataset:{patternId:descriptor.id}}}};vm.createContext(context);vm.runInContext(source.replace('registry.bindRenderer(id,render);','window.inspectCubes={at,interact,render};registry.bindRenderer(id,render);'),context);return context.window.inspectCubes;}
const config={...descriptor.defaults,count:200};
const span=b=>Math.max(...b.map(b=>b.position.length()));
test('solid cube package fills the entire initial volume, scatters to unequal depths, and has repeatable random-access replay',()=>{
 const a=load(),initial=a.at(config,0);assert.equal(initial.length,200);
 const radii=initial.map(b=>b.position.length()),max=Math.max(...radii);
 assert.ok(radii.some(r=>r<max*.4),'inner volume contains cubes');
 assert.ok(radii.some(r=>r>max*.8),'outer volume contains cubes');
 const open=a.at(config,130);assert.ok(span(open)>span(initial)*2);
 const depths=open.map(b=>b.position.z);assert.ok(Math.max(...depths)-Math.min(...depths)>max*3);
 const serialize=bs=>bs.map(b=>[b.half,...b.position.toArray(),b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w]);
 assert.equal(JSON.stringify(serialize(a.at(config,44))),JSON.stringify(serialize(load().at(config,44))),'fresh direct-open frame equals backwards replay');
 const returning=a.at(config,480);assert.ok(span(returning)<span(open),'central attraction recollects the spread volume');
});
test('pointer rotation, pinch zoom and settings use durable isolated config fields',()=>{const {interact}=load();const move=interact(config,{type:'gesture',phase:'move',fingers:1,dx:50,dy:-25});assert.equal(move.yaw,.2);assert.equal(move.pitch,-.1);assert.equal(move.blast,config.blast);const pinch=interact(move,{type:'gesture',phase:'move',fingers:2,pinchDistance:120,previousPinchDistance:100});assert.equal(pinch.zoom,1.2);assert.equal(pinch.yaw,move.yaw);assert.equal(interact(config,{type:'patch',patch:{gravity:2}}).gravity,2);});
test('physics runtime is bundled and renders opaque cube silhouettes without runtime network or timers',()=>{const body=source.slice(source.indexOf('END_SETKA_PATTERN_DESCRIPTOR */'));assert.doesNotMatch(body,/\b(?:fetch|requestAnimationFrame|setInterval|setTimeout)\s*\(/);assert.match(body,/new C\.Box/);assert.match(body,/ctx\.fillStyle='#000';ctx\.fill\(\)/);assert.match(body,/world\.step\(dt\)/);});
