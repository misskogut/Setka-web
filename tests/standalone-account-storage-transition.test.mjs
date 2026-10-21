import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const scopeSource=readFileSync('standalone-data-scope-v1.js','utf8');
const cabinet=readFileSync('standalone-tester-cabinet-v40.js','utf8');
const SESSION='setka-v40:cabinet-session';
function storage(initial={},blocked=false){const data=new Map(Object.entries(initial));return {data,getItem:k=>data.get(k)||null,setItem(k,v){if(blocked)throw Error('QuotaExceededError');data.set(k,v)},removeItem:k=>data.delete(k)}}
function page(localStorage,sessionStorage){const w={dispatchEvent(){}};vm.runInNewContext(scopeSource,{window:w,localStorage,sessionStorage,CustomEvent:class{}});return w.SetkaDataScopeV1}
function sessionWriter(localStorage,sessionStorage){const code=cabinet.slice(cabinet.indexOf('  function setSession('),cabinet.indexOf('  async function acceptAccount('));return vm.runInNewContext('let sessionEpoch=0,liveSession=null;const SESSION_KEY='+JSON.stringify(SESSION)+';'+code+';setSession',{localStorage,sessionStorage})}
test('login crosses guest scope with full localStorage and durable archive using sessionStorage',()=>{
 const local=storage({},true),tab=storage(),scope=page(local,tab);
 assert.equal(scope.id,'guest');assert.equal(scope.activate('T-ISOLATED'),true);
 sessionWriter(local,tab)('new-isolated-token','2099-01-01','T-ISOLATED');
 const afterReload=page(local,tab);
 assert.equal(afterReload.id,'tester:T-ISOLATED');assert.equal(afterReload.legacyOwner(),'guest');assert.equal(afterReload.takeLegacy,false);
});
test('failed persistent overwrite cannot shadow a new temporary account token',()=>{
 const local=storage({[SESSION]:JSON.stringify({token:'old-isolated-token',testerId:'T-OLD'})},true),tab=storage();
 sessionWriter(local,tab)('new-isolated-token','2099-01-01','T-NEW');
 assert.equal(local.getItem(SESSION),null);assert.equal(page(local,tab).id,'tester:T-NEW');
});
test('both storage failures produce an explicit failure instead of reloading into a logged-out page',()=>{
 const local=storage({},true),tab=storage({},true);
 assert.throws(()=>sessionWriter(local,tab)('isolated-token','2099-01-01','T-ISOLATED'),/account_storage_unavailable/);
 assert.throws(()=>page(local,tab).activate('T-ISOLATED'),/account_storage_unavailable/);
});
test('account transition waits for local hydration before saving or switching owner',async()=>{
 let ready,loaded=false,saved=false,reloaded=false;
 const context={C:{ready:new Promise(r=>{ready=()=>{loaded=true;r()}}),save(){assert.ok(loaded);saved=true},whenSaved:async()=>true},window:{SetkaDataScopeV1:{id:'guest',activate(){assert.ok(saved);return true}}},setSession(){},cache(){},location:{reload(){reloaded=true}}};
 const code=cabinet.slice(cabinet.indexOf('  async function acceptAccount('),cabinet.indexOf('  function clearSession('));
 const accept=vm.runInNewContext(code+';acceptAccount',context),pending=accept({testerId:'T-ISOLATED'});
 assert.equal(saved,false);ready();assert.equal(await pending,true);assert.equal(reloaded,true);
});
