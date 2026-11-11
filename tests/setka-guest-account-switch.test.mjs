import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
const src=fs.readFileSync('standalone-guest-archive-v1.js','utf8');
const sessionKey='setka-v40:cabinet-session';
const deviceKey='setka-standalone:v34-yulia-device';
const store=m=>({getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)});
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
function fixture(){
 const m=new Map([[deviceKey,'device-test']]);const localStorage=store(m),sessionStorage=store(new Map());
 const listeners=new Map(),timeouts=[];let syncs=0,merges=0,gate=null;
 const window={SetkaStandaloneV34:{ready:Promise.resolve()},addEventListener:(k,f)=>listeners.set(k,f),dispatchEvent:()=>{}};
 window.__SETKA_PRIVATE_CORPUS_V40__={guestArchive:()=>({notes:[]}),guestFavorites:()=>[],mergeGuest:async()=>{merges++},ensureHydrated:async()=>true,sync:async()=>{syncs++;if(gate)await gate.promise;return true},status:()=>({ok:true})};
 const fetch=async(_url,opts)=>{const b=JSON.parse(opts.body);if(b.action==='pull')return {ok:true,json:async()=>({ok:true,archive:{revision:1,payload:{notes:[{id:'n1',text:'private'}]},favorites:[]}})};return {ok:true,json:async()=>({ok:true,revision:1})};}
 const ctx={window,localStorage,sessionStorage,fetch,crypto:{randomUUID},setTimeout:f=>{timeouts.push(f);return timeouts.length},clearTimeout:()=>{},setInterval:()=>{},document:{addEventListener:()=>{},hidden:false},CustomEvent:class{constructor(type){this.type=type}},BroadcastChannel:class{postMessage(){}close(){}}};
 vm.runInNewContext(src,ctx);
 const login=(id,token)=>localStorage.setItem(sessionKey,JSON.stringify({testerId:id,token}));
 const flush=async()=>{for(const f of timeouts.splice(0))f();for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r))};
 return {m,login,flush,listeners,gate:v=>gate=v,syncs:()=>syncs,merges:()=>merges};
}
test('switching accounts during in-flight cloud sync never marks original or new account migrated',async()=>{
 const f=fixture();f.login('A','token-A');const gate=deferred();f.gate(gate);
 f.listeners.get('setka:v40-private-corpus-restored')();await f.flush();assert.equal(f.syncs(),1);
 f.login('B','token-B');gate.resolve();await f.flush();
 assert.equal(f.m.get('setka-guest:v1-migrated:A'),undefined);
 assert.equal(f.m.get('setka-guest:v1-migrated:B'),undefined);
});
test('account unchanged during sync writes receipt',async()=>{
 const f=fixture();f.login('A','token-A');f.listeners.get('setka:v40-private-corpus-restored')();await f.flush();
 assert.equal(f.m.get('setka-guest:v1-migrated:A'),'1');
});
