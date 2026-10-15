import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accessLink,accessStorage,accessError,ADMIN_STORAGE} from '../research-v1/access.mjs';
const memory=()=>{const rows=new Map();return {getItem:k=>rows.get(k)||null,setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)};};
test('an owner ticket takes precedence and is removed without dropping other URL state',()=>{
 const ticket='SETKA1-'+'a'.repeat(64),key='SKA-'+'b'.repeat(43);
 assert.deepEqual(accessLink(`https://misskogut.github.io/Setka-web/standalone-research-admin-v1.html?owner_ticket=${ticket}&view=1#access=${key}`),{ticket,key:'',consumed:true,path:'/Setka-web/standalone-research-admin-v1.html?view=1'});
 const bad=accessLink('https://misskogut.github.io/Setka-web/standalone-research-admin-v1.html?owner_ticket=incomplete#patterns');assert.equal(bad.ticket,'');assert.equal(bad.path,'/Setka-web/standalone-research-admin-v1.html#patterns');
});
test('the existing owner fragment is accepted while ordinary section hashes survive',()=>{
 const key='SKA-'+'c'.repeat(43);assert.equal(accessLink(`https://a.test/#access=${key}`).key,key);
 assert.deepEqual(accessLink('https://a.test/admin#patterns'),{ticket:'',key:'',consumed:false,path:'/admin#patterns'});
});
test('storage failures never prevent a server-validated in-memory login',()=>{
 const store=accessStorage(()=>{throw new Error('SecurityError')});assert.deepEqual(store.load(),{key:'',remember:false});assert.equal(store.save('isolated',true),false);assert.doesNotThrow(()=>store.clear());
});
test('local fallback is read when session storage is blocked',()=>{
 const local=memory();local.setItem(ADMIN_STORAGE,'isolated-local');const store=accessStorage(n=>{if(n==='sessionStorage')throw Error('blocked');return local});assert.deepEqual(store.load(),{key:'isolated-local',remember:true});
});
test('a fresh chosen persistence mode clears both stale copies',()=>{
 const stores={sessionStorage:memory(),localStorage:memory()},store=accessStorage(n=>stores[n]);stores.localStorage.setItem(ADMIN_STORAGE,'old');stores.sessionStorage.setItem(ADMIN_STORAGE,'old-session');
 assert.equal(store.save('new',true),true);assert.equal(stores.sessionStorage.getItem(ADMIN_STORAGE),null);assert.deepEqual(store.load(),{key:'new',remember:true});
 assert.equal(store.save('new-session',false),true);assert.equal(stores.localStorage.getItem(ADMIN_STORAGE),null);assert.deepEqual(store.load(),{key:'new-session',remember:false});
 stores.localStorage.setItem(ADMIN_STORAGE,'new-other-tab');store.clear('new-session');assert.equal(stores.localStorage.getItem(ADMIN_STORAGE),'new-other-tab');
});
test('a rejected key, expired recovery link and origin failure have different messages',()=>{
 const messages=['invalid_admin_key','owner_link_expired_or_revoked','origin_not_allowed'].map(message=>accessError({status:403,message}));assert.equal(new Set(messages).size,3);assert.equal(accessError({status:503,message:'unknown'}),null);
});
