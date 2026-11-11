import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
const src=fs.readFileSync('standalone-guest-archive-v1.js','utf8');
test('hung guest sync aborts after 12 seconds and retries',async()=>{
 const map=new Map([['setka-standalone:v34-yulia-device','dev']]);
 const localStorage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v))};
 const timers=[];const listeners=new Map();let calls=0;
 const window={SetkaStandaloneV34:{ready:Promise.resolve()},addEventListener:(k,v)=>listeners.set(k,v),dispatchEvent:()=>{},__SETKA_PRIVATE_CORPUS_V40__:{guestArchive:()=>({notes:[{id:'n'}]}),guestFavorites:()=>[],mergeGuest:async()=>{}}};
 const fetch=async(_,opts)=>{
  const body=JSON.parse(opts.body);
  if(body.action==='pull')return {ok:true,json:async()=>({ok:true,archive:null})};
  calls++;
  return new Promise((_,reject)=>opts.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));
 };
 const ctx={window,fetch,localStorage,sessionStorage:{getItem:()=>null},crypto:{randomUUID},AbortController,setTimeout:(f,ms)=>{timers.push({f,ms});return timers.length},clearTimeout:()=>{},setInterval:()=>{},document:{addEventListener:()=>{},hidden:false},CustomEvent:class{},BroadcastChannel:class{postMessage(){}close(){}}};
 vm.runInNewContext(src,ctx);
 const drain=async()=>{for(let i=0;i<12;i++)await new Promise(r=>setImmediate(r))};
 listeners.get('setka:v34-sync-request')();timers.find(t=>t.ms===1200).f();await drain();
 assert.equal(calls,1);
 const timeout=timers.filter(t=>t.ms===12000).at(-1);assert.ok(timeout,'12 second abort timer');timeout.f();await drain();
 assert.ok(timers.some(t=>t.ms===1500),'retry scheduled after timeout');
});