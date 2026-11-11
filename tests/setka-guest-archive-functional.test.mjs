import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
const source=fs.readFileSync('standalone-guest-archive-v1.js','utf8');
const DEVICE='setka-standalone:v34-yulia-device',SESSION='setka-v40:cabinet-session';
function makeStore(map){return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}}
function harness({shared=new Map(),remote=new Map(),device='device-11111111-1111-4111-8111-111111111111',initialNotes=[]}={}){
 const localStorage=makeStore(shared),sessionStorage=makeStore(new Map());localStorage.setItem(DEVICE,device);
 const listeners=new Map(),data={notes:structuredClone(initialNotes),sessions:[],symptoms:[],checkins:[],settings:{},patternExposures:[],openedPatterns:[]},favorites=[];
 let mergeCount=0,accountSyncCount=0,accountSyncOk=true,failNext=false,accountSyncGate=null;
 const events=[];
 const window={SetkaStandaloneV34:{ready:Promise.resolve()},addEventListener:(n,cb)=>listeners.set(n,cb),dispatchEvent:e=>events.push(e.type),SetkaApp:{}};
 const corpus={
  guestArchive:()=>structuredClone(data),guestFavorites:()=>structuredClone(favorites),
  mergeGuest:async(p,f)=>{mergeCount++;const map=new Map([...(p.notes||[]),...(data.notes||[])].map(x=>[x.id,x]));data.notes=[...map.values()];Object.assign(data.settings,p.settings||{});for(const x of f||[])if(!favorites.some(y=>y.id===x.id))favorites.push(x);return {notes:data.notes.length}},
  ensureHydrated:async()=>true,sync:async()=>{accountSyncCount++;if(accountSyncGate)await accountSyncGate;return accountSyncOk},status:()=>({ok:accountSyncOk})
 };
 window.__SETKA_PRIVATE_CORPUS_V40__=corpus;
 const calls=[];
 async function fetch(_url,opts){
  const b=JSON.parse(opts.body);calls.push(b);
  let status=200,out={ok:true};
  const old=remote.get(b.deviceId);
  if(failNext){failNext=false;status=503;out={ok:false,error:'temporary_unavailable'}}
  else if(old&&old.secret!==b.secret){status=403;out={ok:false,error:'invalid_credentials'}}
  else if(b.action==='pull')out={ok:true,archive:old?{payload:structuredClone(old.payload),favorites:structuredClone(old.favorites),revision:old.revision,updatedAt:'2026-11-11T00:00:00Z'}:null};
  else if(b.action==='sync'){
   if((old?.revision||0)!==b.revision){status=409;out={ok:false,error:'revision_conflict'}}
   else{const revision=b.revision+1;remote.set(b.deviceId,{secret:b.secret,payload:structuredClone(b.archive),favorites:structuredClone(b.favorites),revision});out={ok:true,revision,updatedAt:'2026-11-11T00:00:00Z',counts:{notes:b.archive.notes.length}}}
  }else{status=400;out={ok:false,error:'bad_action'}}
  return {ok:status===200,status,json:async()=>out};
 }
 const timers=new Map();let nextTimer=1;
 const setTimeout=(fn)=>{const id=nextTimer++;timers.set(id,fn);return id};
 const clearTimeout=id=>timers.delete(id);
 const context={window,localStorage,sessionStorage,fetch,crypto:{randomUUID},setTimeout,clearTimeout,setInterval:()=>0,document:{addEventListener:()=>{},hidden:false},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail}},BroadcastChannel:class{postMessage(){}close(){}},console};
 vm.runInNewContext(source,context);
 const api=window.__SETKA_GUEST_ARCHIVE_V1__;
 return {api,data,favorites,remote,shared,calls,events,listeners,corpus,flush:async()=>{const pending=[...timers.values()];timers.clear();for(const fn of pending)await fn();await new Promise(resolve=>setImmediate(resolve))},setAccount:(id='T-01')=>localStorage.setItem(SESSION,JSON.stringify({token:'token',testerId:id})),unsetAccount:()=>localStorage.removeItem(SESSION),fail:()=>{failNext=true},setAccountSyncOk:v=>{accountSyncOk=v},setAccountSyncGate:v=>{accountSyncGate=v},merges:()=>mergeCount,accountSyncs:()=>accountSyncCount};
}
test('guest saves unpublished notes and restores on same browser after restart',async()=>{
 const shared=new Map(),remote=new Map();
 const first=harness({shared,remote,initialNotes:[{id:'n1',text:'private draft',publicationStatus:'unpublished'}]});
 assert.equal(await first.api.sync(),true);
 assert.equal(remote.size,1);
 const second=harness({shared,remote});
 assert.equal(await second.api.restore(),true);
 assert.equal(second.data.notes[0].text,'private draft');
 assert.equal(second.data.notes[0].publicationStatus,'unpublished');
 assert.equal(second.api.status().revision,1);
});
test('different browser secret cannot read the same device archive',async()=>{
 const remote=new Map();
 const first=harness({remote,initialNotes:[{id:'secret',text:'hidden'}]});
 assert.equal(await first.api.sync(),true);
 const other=harness({remote});
 assert.equal(await other.api.restore(),false);
 assert.equal(other.data.notes.length,0);
 assert.match(other.api.status().lastError,/invalid_credentials/);
});
test('network failure cannot falsely acknowledge a backup; retry preserves notes',async()=>{
 const h=harness({initialNotes:[{id:'n1',text:'important'}]});
 h.fail();assert.equal(await h.api.sync(),false);assert.equal(h.remote.size,0);
 assert.equal(await h.api.sync(),true);assert.equal(h.remote.size,1);
 assert.equal(h.remote.values().next().value.payload.notes[0].text,'important');
});
test('revision conflict merges another tab before retry, without deleting notes',async()=>{
 const shared=new Map(),remote=new Map();
 const a=harness({shared,remote,initialNotes:[{id:'a',text:'first'}]});
 const b=harness({shared,remote,initialNotes:[{id:'b',text:'second'}]});
 assert.equal(await a.api.restore(),true);
 assert.equal(await b.api.restore(),true);
 assert.equal(await a.api.sync(),true);
 assert.equal(await b.api.sync(),false);
 assert.equal(b.data.notes.length,2);
 assert.equal(await b.api.sync(),true);
 assert.equal(remote.values().next().value.payload.notes.length,2);
});
test('guest archive attaches to ID only after account cloud sync confirms',async()=>{
 const h=harness({initialNotes:[{id:'n1',text:'valuable'}]});
 assert.equal(await h.api.sync(),true);
 h.setAccount('T-55');
 const attach=h.listeners.get('setka:v40-private-corpus-restored');
 assert.ok(attach);
 attach();
 await h.flush();
 assert.equal(h.accountSyncs(),1);
 assert.equal(h.shared.get('setka-guest:v1-migrated:T-55'),'1');
 assert.equal(h.data.notes[0].text,'valuable');
});

test('failed account cloud receipt never marks guest archive migrated',async()=>{
 const h=harness({initialNotes:[{id:'n2',text:'do not lose'}]});
 assert.equal(await h.api.sync(),true);
 h.setAccountSyncOk(false);h.setAccount('T-77');
 h.listeners.get('setka:v40-private-corpus-restored')();
 await h.flush();
 assert.equal(h.shared.get('setka-guest:v1-migrated:T-77'),undefined);
 assert.equal(h.accountSyncs(),1);
});
test('simultaneous account restore notifications migrate guest only once',async()=>{
 const h=harness({initialNotes:[{id:'n3',text:'single migration'}]});
 assert.equal(await h.api.sync(),true);
 h.setAccount('T-88');
 const cb=h.listeners.get('setka:v40-private-corpus-restored');
 cb();cb();cb();
 await h.flush();
 assert.equal(h.accountSyncs(),1);
 assert.equal(h.shared.get('setka-guest:v1-migrated:T-88'),'1');
});

test('account switching while guest migration is awaiting cloud confirmation never writes stale receipt',async()=>{
 const h=harness({initialNotes:[{id:'switch-note',text:'private draft',publicationStatus:'unpublished'}]});
 assert.equal(await h.api.sync(),true);
 let release;const gate=new Promise(resolve=>{release=resolve});
 h.setAccountSyncGate(gate);h.setAccount('A');
 h.listeners.get('setka:v40-private-corpus-restored')();
 // Start the pending migration without awaiting the intentionally blocked cloud sync.
 const pendingFlush=h.flush();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.accountSyncs(),1);
 h.setAccount('B');release();
 await pendingFlush;
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.shared.has('setka-guest:v1-migrated:A'),false);
 assert.equal(h.shared.has('setka-guest:v1-migrated:B'),false);
});
