import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
const savePrelude='let saveGeneration=0,usingPersonalStore=false,persisting,storageState;const personalStore=null;\n';
test('an older tab cannot erase a state and checkin saved by another tab',()=>{
 const source=read('standalone-core-v34.js'),from=source.indexOf('  function mergeStateRecords('),start=from<0?source.indexOf('  function save(){'):from,end=source.indexOf('  function saveActive()',start),key='setka-standalone:v34';
 const store=new Map(),storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},base={createdAt:'2026-10-15T13:00:00Z',symptoms:[],checkins:[]},a=copy(base),b=copy(base);
 const save=d=>vm.runInNewContext(savePrelude+source.slice(start,end)+'\nsave;',{data:d,localStorage:storage,KEY:key,JSON,Date,Array,Map})();
 a.symptoms.push({id:'state-A',name:'Усталость',active:true,createdAt:'2026-10-15T13:01:00Z',updatedAt:'2026-10-15T13:01:00Z'});a.checkins.push({id:'check-A',symptomId:'state-A',intensity:6,observedAt:'2026-10-15T13:01:01Z'});save(a);save(b);
 const persisted=JSON.parse(storage.getItem(key));assert.equal(persisted.symptoms.length,1);assert.equal(persisted.checkins[0].intensity,6);assert.equal(b.symptoms[0].id,'state-A');
});
test('reset copies stay separate and newer state activation is not rolled back',()=>{
 const s=read('standalone-core-v34.js'),a=s.indexOf('  function mergeStateRecords('),b=s.indexOf('  function saveActive()',a),rows=new Map(),store={getItem:k=>rows.get(k)||null,setItem:(k,v)=>rows.set(k,v)},data={createdAt:'same',symptoms:[{id:'s',active:false,updatedAt:'2026-10-15T13:02:00Z'}],checkins:[]};
 rows.set('key',JSON.stringify({createdAt:'same',symptoms:[{id:'s',active:true,updatedAt:'2026-10-15T13:01:00Z'}],checkins:[]}));vm.runInNewContext(savePrelude+s.slice(a,b)+'\nsave();',{data,localStorage:store,KEY:'key',JSON,Date,Array,Map});assert.equal(JSON.parse(rows.get('key')).symptoms[0].active,false);
 data.createdAt='reset-copy';data.symptoms=[];vm.runInNewContext(savePrelude+s.slice(a,b)+'\nsave();',{data,localStorage:store,KEY:'key',JSON,Date,Array,Map});assert.equal(JSON.parse(rows.get('key')).symptoms.length,0);
});
test('an in-flight archive receipt never confirms a state added after that request',async()=>{
 const rows=new Map([['setka-v40:cabinet-session',JSON.stringify({token:'isolated-only'})]]),data={sessions:[],notes:[],symptoms:[],checkins:[],events:[],settings:{}},storage={getItem:k=>rows.get(k)||null,setItem:(k,v)=>rows.set(k,v)};let release;const request=new Promise(ok=>release=ok);
 const context={JSON,Blob,Date,Number,Error,CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}},setTimeout:()=>1,setInterval:()=>1,clearTimeout(){},localStorage:storage,sessionStorage:storage,document:{addEventListener(){}},addEventListener(){},dispatchEvent(){},SetkaStandaloneV34:{sandbox:{deviceId:'isolated'},getData:()=>data,save(){}},SetkaApp:{getFavorites:()=>[]}};context.window=context;
 context.fetch=async(url,init)=>{const body=JSON.parse(init.body);if(body.action==='pull')return{ok:true,json:async()=>({archive:null})};await request;return{ok:true,json:async()=>({ok:true,updatedAt:'2026-10-15T13:01:00Z',stateHistory:{symptoms:body.archive.symptoms,checkins:body.archive.checkins},counts:{symptoms:0,checkins:0}})}};
 vm.runInNewContext(read('standalone-private-corpus-v40.js'),context);const sending=context.__SETKA_PRIVATE_CORPUS_V40__.sync();await new Promise(ok=>setImmediate(ok));data.symptoms.push({id:'new-after-request',name:'Усталость',active:true});release();await sending;
 assert.equal(context.__SETKA_PRIVATE_CORPUS_V40__.status().statesPending,true);assert.equal(data.symptoms.length,1);
 await context.__SETKA_PRIVATE_CORPUS_V40__.sync();assert.equal(context.__SETKA_PRIVATE_CORPUS_V40__.status().statesPending,false);
});
test('a malformed old browser value does not block saving a new registered state',()=>{
 const source=read('standalone-core-v34.js'),a=source.indexOf('  function mergeStateRecords('),b=source.indexOf('  function saveActive()',a),rows=new Map([['key','{broken']]),data={createdAt:'new',symptoms:[{id:'s',name:'Усталость'}],checkins:[]},localStorage={getItem:k=>rows.get(k)||null,setItem:(k,v)=>rows.set(k,v)};
 const result=vm.runInNewContext(savePrelude+source.slice(a,b)+'\nsave();',{data,localStorage,KEY:'key',JSON,Date,Array,Map});assert.equal(result,true);assert.equal(JSON.parse(rows.get('key')).symptoms[0].id,'s');
});
test('a hydrated page starts its keepalive write inside the pagehide handler',async()=>{
 const listeners=new Map(),calls=[],storage={getItem:()=>JSON.stringify({token:'isolated-only'}),setItem(){}},data={sessions:[],notes:[],symptoms:[],checkins:[],events:[],settings:{}};
 const context={JSON,Blob,Date,Number,Error,CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}},localStorage:storage,sessionStorage:storage,document:{addEventListener(){}},setTimeout:()=>1,setInterval:()=>1,clearTimeout(){},addEventListener:(name,fn)=>listeners.set(name,fn),dispatchEvent(){},SetkaStandaloneV34:{sandbox:{deviceId:'isolated'},getData:()=>data,save(){}},SetkaApp:{getFavorites:()=>[]},fetch:async(url,init)=>{calls.push({body:JSON.parse(init.body),keepalive:init.keepalive});return{ok:true,json:async()=>({ok:true,archive:null,counts:{},stateHistory:{symptoms:[],checkins:[]}})}}};context.window=context;
 vm.runInNewContext(read('standalone-private-corpus-v40.js'),context);await context.__SETKA_PRIVATE_CORPUS_V40__.sync();calls.length=0;data.symptoms.push({id:'last-state',name:'Усталость',createdAt:'2026-10-15T13:05:00Z'});
 const finishing=listeners.get('pagehide')();assert.equal(calls.length,1,'keepalive must begin before pagehide returns');assert.equal(calls[0].keepalive,true);await finishing;
});

test('a cloud pull resolving after pagehide cannot start a late upload',async()=>{
 const listeners=new Map(),calls=[],storage={getItem:()=>JSON.stringify({token:'isolated-only'}),setItem(){}},data={sessions:[],notes:[],symptoms:[],checkins:[],events:[],settings:{}};let finishPull;const delayed=new Promise(ok=>finishPull=ok);
 const context={JSON,Blob,Date,Number,Error,CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}},localStorage:storage,sessionStorage:storage,document:{addEventListener(){}},setTimeout:()=>1,setInterval:()=>1,clearTimeout(){},addEventListener:(name,fn)=>listeners.set(name,fn),dispatchEvent(){},SetkaStandaloneV34:{sandbox:{deviceId:'isolated'},getData:()=>data,save(){}},SetkaApp:{getFavorites:()=>[]},fetch:async(url,init)=>{const body=JSON.parse(init.body);calls.push(body.action);if(body.action==='pull')await delayed;return{ok:true,json:async()=>({ok:true,archive:null})}}};context.window=context;
 vm.runInNewContext(read('standalone-private-corpus-v40.js'),context);const sending=context.__SETKA_PRIVATE_CORPUS_V40__.sync();assert.deepEqual(calls,['pull']);await listeners.get('pagehide')();finishPull();assert.equal(await sending,false);assert.deepEqual(calls,['pull']);
 await listeners.get('pageshow')({persisted:true});assert.equal(await context.__SETKA_PRIVATE_CORPUS_V40__.sync(),true);assert.deepEqual(calls,['pull','pull','sync']);
});

test('quota fallback preserves complete history and another tab cannot erase its states or notes',async()=>{
 const source=read('standalone-core-v34.js'),helpers=source.slice(source.indexOf('  function mergePersonalRows('),source.indexOf('  const localReady=')),saveCode=source.slice(source.indexOf('  function mergeStateRecords('),source.indexOf('  function saveActive()'));
 let stored=null;const personalStore={write:async(row,merge)=>stored=copy(merge(stored,row))},base={version:41,createdAt:'same-copy',sessions:[{id:'kept-session',startedAt:'2026-10-15T13:00:00Z',completed:false}],symptoms:[],checkins:[],notes:[],events:[{id:'old-history',payload:{value:'x'.repeat(100000)}}]},localStorage={getItem:()=>JSON.stringify(base),setItem(){const e=new Error('quota');e.name='QuotaExceededError';throw e}};
 const bind=data=>vm.runInNewContext("let saveGeneration=0,usingPersonalStore=false,persisting,storageState;const localRoot='same-copy';const archiveFields=['sessions','notes','symptoms','checkins','events','patternExposures','activityIntervals','openedPatterns','invites'];const clone=v=>JSON.parse(JSON.stringify(v));\n"+helpers+saveCode+'\n({save,whenSaved:()=>persisting,status:()=>storageState});',{data,personalStore,localStorage,KEY:'key',JSON,Date,Array,Map,window:{dispatchEvent(){}},CustomEvent:class{}});
 const first=copy(base),old=copy(base);first.sessions[0].completed=true;first.sessions[0].endedAt='2026-10-15T13:05:00Z';first.symptoms.push({id:'actual-state',name:'Усталость',updatedAt:'2026-10-15T14:00:00Z'});const a=bind(first);assert.equal(a.save(),false);assert.equal(a.status().pending,true);assert.equal(await a.whenSaved(),true);assert.equal(a.status().kind,'indexedDB');
 old.notes.push({id:'plain-note',noteType:'text',text:'Личная мысль',patternId:null,config:null,updatedAt:'2026-10-15T14:01:00Z'});const b=bind(old);b.save();assert.equal(await b.whenSaved(),true);
 assert.equal(stored.payload.symptoms[0].id,'actual-state');assert.equal(stored.payload.notes[0].config,null);assert.equal(stored.payload.events[0].payload.value.length,100000);assert.equal(old.symptoms[0].id,'actual-state');assert.equal(stored.payload.sessions[0].completed,true);
});

test('plain notes never acquire an octopus capsule while being submitted',()=>{
 const window={fetch:async()=>({}),SetkaApp:{cloneConfig(){throw new Error('must not normalize absent visuals')}}};
 vm.runInNewContext(read('standalone-public-visual-capsules-v40.js'),{window,JSON,Number,String,Math,console});
 const api=window.__SETKA_PUBLIC_VISUAL_CAPSULES_V40__;
 assert.equal(api.recipeFor({noteType:'text',patternId:null,config:null}),null);assert.equal(api.recipeFor({config:{}}),null);assert.equal(api.encodePreview(null),null);
});

test('large closing archives stay local until foreground sync instead of exceeding keepalive limits',async()=>{
 const listeners=new Map(),calls=[],data={sessions:[],notes:[],symptoms:[],checkins:[],events:[],settings:{}},storage={getItem:()=>JSON.stringify({token:'isolated-only'}),setItem(){}};
 const context={JSON,Blob,Date,Number,Error,CustomEvent:class{},localStorage:storage,sessionStorage:storage,document:{addEventListener(){}},setTimeout:()=>0,setInterval:()=>0,clearTimeout(){},addEventListener:(k,v)=>listeners.set(k,v),dispatchEvent(){},SetkaStandaloneV34:{sandbox:{deviceId:'isolated'},getData:()=>data,save(){}},SetkaApp:{getFavorites:()=>[]},fetch:async(url,init)=>{const b=JSON.parse(init.body);calls.push(b);return{ok:true,json:async()=>({ok:true,archive:null,updatedAt:'2026-10-15T14:00:00Z',stateHistory:{symptoms:b.archive?.symptoms||[],checkins:[]}})}}};context.window=context;
 vm.runInNewContext(read('standalone-private-corpus-v40.js'),context);await context.__SETKA_PRIVATE_CORPUS_V40__.sync();calls.length=0;
 data.symptoms.push({id:'large-state',name:'Усталость'});data.events.push({id:'existing-history',payload:{recorded:'x'.repeat(100000)}});
 assert.equal(await listeners.get('pagehide')(),false);assert.equal(calls.length,0);assert.equal(context.__SETKA_PRIVATE_CORPUS_V40__.status().statesPending,true);
 listeners.get('pageshow')({persisted:true});assert.equal(await context.__SETKA_PRIVATE_CORPUS_V40__.sync(),true);assert.equal(calls[0].archive.events[0].payload.recorded.length,100000);assert.equal(context.__SETKA_PRIVATE_CORPUS_V40__.status().statesPending,false);
});
