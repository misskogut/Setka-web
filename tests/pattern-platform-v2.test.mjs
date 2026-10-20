import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {parseManifest,assertConfiguration,catalogRows} from '../supabase/functions/_shared/pattern-catalog.mjs';
const source=fs.readFileSync('standalone-pattern-registry-v1.js','utf8');
function registry(){const context={window:{dispatchEvent(){}},CustomEvent:class{}};vm.runInNewContext(source,context);return context.window.SetkaPatternRegistryV1}
const plain=x=>JSON.parse(JSON.stringify(x));
const fixture=id=>({id,title:id,version:1,colorModes:3,defaults:{radius:12,tempo:.3,seed:7,outline:false,colorModeIndex:2},
 controls:[['Радиус','radius',3,40,1,'Слева ↑↓',1],['Темп','tempo',.05,2,.05,'Снизу ←→',1]],
 schema:{seed:{type:'number',min:0,max:999,integer:true},outline:{type:'boolean'}},
 render(){}});
test('every built-in parameter has a typed contract and all defaults validate',()=>{
 const R=registry();for(const p of R.list()){
  assert.equal(R.validate(p.defaults,p.id).ok,true,p.id);
  assert.deepEqual(Object.keys(p.schema).sort(),Object.keys(p.defaults).filter(k=>k!=='patternId').sort());
  assert.equal(assertConfiguration(p,plain(p.defaults)).patternId,p.id);
 }
 assert.equal(R.defaults('stereo-dna').colorModeIndex,1,'first launch retains original colored DNA');
});
test('two new algorithms and a subsequent third integrate through the same registration contract',()=>{
 const R=registry(),before=R.revision();
 for(const id of ['fixture-shapes','fixture-fields','fixture-later']){
  const def=fixture(id);if(id==='fixture-fields'){def.defaults={density:6,bend:.4,colorModeIndex:0};def.controls=[['Плотность','density',1,30,1,'↑↓',1],['Изгиб','bend',0,1,.01,'←→',1]];def.schema={}}
  R.register(def);assert.ok(R.ready(id));assert.equal(R.ids().includes(id),true);
  const saved=R.snapshot({patternId:id,config:R.defaults(id),frame:0});
  assert.equal(R.restore(saved).ok,true);assert.equal(saved.frame,0);assert.ok(R.controls(id).length);assert.ok(R.supports(id,'notes'));assert.ok(R.supports(id,'statistics'));
 }
 assert.notEqual(before,R.revision());assert.equal(R.list().length,11);
});
test('normalization preserves zero, false, seed, colors and rounds declared integer values',()=>{
 const R=registry();R.register(fixture('fixture-values'));
 const c=R.normalize({patternId:'fixture-values',radius:8.6,tempo:0,seed:0,outline:false,colorModeIndex:2});
 assert.equal(c.radius,9);assert.equal(c.tempo,.05);assert.equal(c.seed,0);assert.equal(c.outline,false);assert.equal(c.colorModeIndex,2);
 assert.ok(Number.isFinite(R.normalize({patternId:'breathing-grid',amp:NaN}).amp));
 assert.equal(R.normalize({patternId:'breathing-grid',amp:0}).amp,0);
 assert.throws(()=>assertConfiguration(R.get('fixture-values'),{...plain(c),radius:Infinity}));
 assert.throws(()=>R.register(fixture('fixture-values')));
});
test('unknown explicit IDs and incompatible snapshots never become a starter pattern',()=>{
 const R=registry();assert.throws(()=>R.normalize({patternId:'future-unknown',numTentacles:24}),/unknown_pattern/);
 assert.equal(R.inference({patternId:'future-unknown',numTentacles:24,tentacleLength:80,circleSize:1}),null);
 const original={patternId:'future-unknown',patternVersion:80,config:{custom:7}};
 const failed=R.restore(original);assert.equal(failed.reason,'unknown_pattern');assert.deepEqual(plain(failed.snapshot),original);
 assert.equal(R.restore({patternId:'breathing-grid',patternVersion:22,config:{}}).reason,'unsupported_version');
 assert.equal(R.restore({patternId:'breathing-grid',schemaVersion:99,config:{}}).reason,'unsupported_schema');
 assert.equal(R.restore({patternId:'breathing-grid',config:{patternId:'stereo-dna'}}).reason,'pattern_identity_conflict');
 const broken=plain(R.snapshot({patternId:'breathing-grid',config:R.defaults('breathing-grid'),frame:0}));broken.config.cols='corrupt';
 assert.equal(R.restore(broken).reason,'invalid_configuration');assert.equal(broken.config.cols,'corrupt');
});
test('a saved snapshot is independent of input mutations and future administrative defaults',()=>{
 const R=registry(),config=R.defaults('breathing-grid');config.cols=27;
 const snapshot=R.snapshot({patternId:'breathing-grid',config,frame:19,seed:0});config.cols=6;
 const defaults=R.defaults('breathing-grid');defaults.cols=33;
 R.applyDefaults([{pattern_id:'breathing-grid',pattern_version:1,schema_version:1,config:defaults,revision:1}]);
 assert.equal(R.defaults('breathing-grid').cols,33);assert.equal(snapshot.config.cols,27);assert.equal(snapshot.seed,0);
 assert.ok(Object.isFrozen(snapshot.config));assert.equal(R.restore(snapshot).snapshot.config.cols,27);
});
test('editorial name revisions do not replace algorithm versions',()=>{
 const R=registry(),manifest=parseManifest({schema:1,patterns:plain(R.list())});
 const rows=catalogRows(manifest,[{pattern_id:'fish-wave',title:'Новое имя',revision:18}]);
 const fish=rows.find(x=>x.pattern_id==='fish-wave');assert.equal(fish.pattern_version,35);assert.equal(fish.revision,18);
 R.setTitles([{pattern_id:'fish-wave',title:'Новое имя',revision:18}]);R.setTitles([{pattern_id:'fish-wave',title:'Старая копия',revision:17}]);
 assert.equal(R.title('fish-wave'),'Новое имя');assert.equal(R.get('fish-wave').version,35);
});
test('v2 links round-trip every pattern rather than converting recipes to Tentacle',()=>{
 const R=registry(),window={SetkaPatternRegistryV1:R,SetkaApp:{DEFAULT_CONFIG:R.defaults('tentacle-orbit'),cloneConfig:R.normalize,configKey:R.configKey,
  openConfig:c=>c,getFavorites:()=>[]},SetkaStandaloneV34:{},dispatchEvent(){}};
 vm.runInNewContext(fs.readFileSync('standalone-config-links-v34.js','utf8'),{window,location:{href:'https://test.invalid/standalone-v34.html',search:''},URL,URLSearchParams,JSON,Number,String,Array,Math,
  CustomEvent:class{},btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),escape,unescape,encodeURIComponent,decodeURIComponent});
 const C=window.SetkaStandaloneV34;
 for(const p of R.list()){const c=R.defaults(p.id);assert.deepEqual(plain(C.decodeConfigLink(C.encodeConfigLink(c))),plain(c),p.id)}
 assert.equal(C.decodeConfigLink('v2.corrupt'),null);
});
test('local archives are isolated between accounts and a guest while original history remains intact',()=>{
 const values=new Map([['setka-standalone:v34','{"notes":[{"id":"legacy"}]}']]);
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const load=owner=>{
  if(owner){storage.setItem('setka-v40:cabinet-session',JSON.stringify({token:'isolated-'+owner,testerId:owner}))}else storage.removeItem('setka-v40:cabinet-session');
  const window={dispatchEvent(){}};vm.runInNewContext(fs.readFileSync('standalone-data-scope-v1.js','utf8'),{window,localStorage:storage,sessionStorage:{getItem:()=>null},JSON,String,Object,CustomEvent:class{}});return window.SetkaDataScopeV1;
 };
 const guest=load(null);assert.ok(guest.storage.getItem('setka-standalone:v34').includes('legacy'));
 const a=load('A');assert.equal(a.storage.getItem('setka-standalone:v34'),null);a.storage.setItem('setka-standalone:v34','{"notes":["A"]}');
 const b=load('B');assert.equal(b.storage.getItem('setka-standalone:v34'),null);b.storage.setItem('setka-standalone:v34','{"notes":["B"]}');
 assert.equal(load('A').storage.getItem('setka-standalone:v34'),'{"notes":["A"]}');assert.ok(load(null).storage.getItem('setka-standalone:v34').includes('legacy'));
 assert.ok(values.get('setka-standalone:v34').includes('legacy'),'pre-migration rollback copy retained');
});
test('a cloud response from an earlier account cannot hydrate the current page or confirm its states',async()=>{
 const rows=new Map([['setka-v40:cabinet-session',JSON.stringify({token:'isolated-A',testerId:'A'})]]),data={notes:[{id:'local-A'}],symptoms:[],checkins:[],sessions:[],events:[],settings:{}};
 let release;const waiting=new Promise(ok=>release=ok),actions=[];
 const storage={getItem:k=>rows.get(k)||null,setItem:(k,v)=>rows.set(k,v)};
 const context={JSON,Blob,Date,Number,Error,String,CustomEvent:class{},localStorage:storage,sessionStorage:storage,
  setTimeout:()=>0,setInterval:()=>0,clearTimeout(){},addEventListener(){},dispatchEvent(){},document:{addEventListener(){}},
  SetkaDataScopeV1:{id:'tester:A',key:k=>k},SetkaStandaloneV34:{sandbox:{deviceId:'isolated-device'},getData:()=>data,save(){}},SetkaApp:{getFavorites:()=>[]},
  fetch:async(_url,init)=>{actions.push(JSON.parse(init.body).action);await waiting;return {ok:true,json:async()=>({ok:true,archive:{payload:{notes:[{id:'remote-after-switch'}],symptoms:[{id:'wrong-owner'}]}}})}}};context.window=context;
 vm.runInNewContext(fs.readFileSync('standalone-private-corpus-v40.js','utf8'),context);
 const sending=context.__SETKA_PRIVATE_CORPUS_V40__.sync();
 rows.set('setka-v40:cabinet-session',JSON.stringify({token:'isolated-B',testerId:'B'}));release();
 assert.equal(await sending,false);assert.deepEqual(data.notes,[{id:'local-A'}]);assert.deepEqual(data.symptoms,[]);assert.deepEqual(actions,['pull']);
 assert.equal(await context.__SETKA_PRIVATE_CORPUS_V40__.sync(),false,'new token cannot upload the old page scope');
});
