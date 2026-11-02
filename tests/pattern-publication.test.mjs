import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {publishedManifest,activePatternIds,onlyActivePatterns} from '../supabase/functions/_shared/pattern-catalog.mjs';
const plain=x=>JSON.parse(JSON.stringify(x));
function registry(){const c={window:{dispatchEvent(){}},CustomEvent:class{}};vm.runInNewContext(fs.readFileSync('standalone-pattern-registry-v1.js','utf8'),c);return c.window.SetkaPatternRegistryV1;}
test('future unknown module remains testing until published, with exact history across disable/re-enable',()=>{
 const R=registry(),id='fixture-next-publication';
 R.register({id,title:'Future',version:1,colorModes:1,defaults:{radius:5,colorModeIndex:0},controls:[['Radius','radius',1,20,1]],render(){}});
 const config=R.defaults(id),note=R.snapshot({patternId:id,config,frame:71}),before=plain(note);
 R.usePublicCatalog();assert.equal(R.activeItems(R.list()).length,0,'no flash before server confirmation');
 const manifest={schema:1,patterns:plain(R.list())};
 assert.equal(activePatternIds(publishedManifest(manifest,[])).has(id),false,'missing row is testing');
 for(const [state,revision,visible] of [['testing',1,false],['published',2,true],['disabled',3,false],['published',4,true]]){
  const publicManifest=publishedManifest(manifest,[{pattern_id:id,state}]);
  R.applyPublication(publicManifest.patterns,revision);
  assert.equal(R.isActive(id),visible);assert.equal(activePatternIds(publicManifest).has(id),visible);
  assert.equal(onlyActivePatterns([{patternId:id}],activePatternIds(publicManifest)).length,visible?1:0);
  assert.deepEqual(plain(note),before);assert.equal(R.restore(note).ok,true,'publication never corrupts recorded snapshots');
 }
 assert.equal(R.applyPublication([],3),false,'late disable response cannot overwrite a newer publish');
 assert.equal(R.isActive(id),true);
 assert.throws(()=>R.applyPublication([],NaN));
});
test('admin registry retains all algorithms, including those hidden from the public projection',()=>{
 const R=registry(),items=R.list(),manifest={schema:1,patterns:plain(items)};
 R.applyPublication([],12);assert.equal(R.isActive(items[0].id),true,'admin inspection remains possible');
 assert.equal(publishedManifest(manifest,items.map(p=>({pattern_id:p.id,state:'disabled'}))).patterns.length,0,'all-disabled catalog is a valid confirmed empty result');
 assert.equal(R.list().length,items.length);
});
test('all public transports use publication policy and sandbox has no telemetry lifecycle',()=>{
 for(const slug of ['setka-community-patterns-v38','setka-public-notes-v37','setka-public-pattern-stats-v36','setka-v34-entity-catalog'])assert.match(fs.readFileSync(`supabase/functions/${slug}/index.ts`,'utf8'),/loadPublishedManifest/);
 const api=fs.readFileSync('supabase/functions/setka-research-admin-v1/index.ts','utf8');
 assert.ok(api.indexOf("const adminId=await authorized")<api.indexOf("if(b.action==='manage-catalog')"));
 assert.ok(api.indexOf("const adminId=await authorized")<api.indexOf("if(b.action==='set-pattern-publication')"));
 const sandbox=fs.readFileSync('research-v1/publication.mjs','utf8');
 assert.doesNotMatch(sandbox,/recordEvent|startSession|account-archive|session_id/);
});

test('editorial order is independent of release chronology and future new badges',()=>{
 const R=registry(),before=R.revision(),release=plain(R.ids()),id='fixture-future-order';
 R.register({id,title:'Future order',version:1,colorModes:1,defaults:{radius:5,colorModeIndex:0},controls:[['Radius','radius',1,20,1]],render(){}});
 const version=R.revision(),all=plain(R.ids()),manual=all.slice().reverse(),seen=new Set(all);
 assert.notEqual(before,version);
 R.applyOrder({patternIds:manual,revision:2});
 assert.deepEqual(plain(R.libraryIds(seen)),manual);
 assert.deepEqual(plain(R.libraryIds(new Set())),all.slice().reverse(),'unopened: newest first');
 seen.delete(release[0]);assert.equal(R.libraryIds(seen)[0],release[0],'unopened beats editorial rank');
 assert.equal(R.applyOrder({patternIds:all,revision:1}),false,'old response is ignored');
 assert.deepEqual(plain(R.orderedIds()),manual);assert.equal(R.revision(),version,'editorial rank is not a renderer version');
 R.applyOrder({patternIds:[release[2],release[0]],revision:3});
 assert.deepEqual(plain(R.orderedIds()),[release[2],release[0],...all.filter(x=>![release[2],release[0]].includes(x))],'unknown new IDs inherit release order automatically');
 assert.throws(()=>R.applyOrder({patternIds:[id,id],revision:4}));
 assert.throws(()=>R.applyOrder({patternIds:[null],revision:4}));
 assert.throws(()=>R.applyOrder({patternIds:[],revision:-1}));
 R.usePublicCatalog();R.applyPublication([id],10);R.applyOrder({patternIds:manual,revision:4});
 assert.deepEqual(plain(R.activeItems(R.orderedIds())),[id],'ordering cannot publish hidden modules');
});
