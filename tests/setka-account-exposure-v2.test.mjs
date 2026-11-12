import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import {sanitizeAccountJourney} from '../supabase/functions/setka-semantic-v35/journey-account-v1.mjs';

const uuid=()=>webcrypto.randomUUID();
test('server accepts account pattern duration and explicit session mode; never accepts private fields',()=>{
 const event={eventId:uuid(),eventType:'pattern_exposure',patternId:'hexwave',sessionId:'session-1',
  sessionType:'exploration',durationMs:17845,occurredAt:new Date().toISOString()};
 const records=sanitizeAccountJourney([event],{deviceId:'device-1',testerId:'T-ONE'});
 assert.equal(records.length,1);
 assert.equal(records[0].actor_type,'account');
 assert.equal(records[0].account_id,'T-ONE');
 assert.equal(records[0].properties.session_type,'exploration');
 assert.equal(records[0].duration_ms,17845);
 assert.ok(!JSON.stringify(records).includes('config'));
 assert.equal(sanitizeAccountJourney([{...event,sessionType:'guess'}],{deviceId:'device-1',testerId:'T-ONE'}),null);
 assert.equal(sanitizeAccountJourney([{...event,sessionId:null}],{deviceId:'device-1',testerId:'T-ONE'}),null);
 assert.equal(sanitizeAccountJourney([{...event,durationMs:0}],{deviceId:'device-1',testerId:'T-ONE'}),null);
 const free=sanitizeAccountJourney([{...event,sessionId:null,sessionType:null}],{deviceId:'device-1',testerId:'T-ONE'});
 assert.equal(free[0].properties.session_type,null);
 assert.equal(free[0].session_id,null);
});

function fixture({hydrated=true,authenticated=true,scope='tester:T-ONE'}={}){
 const store=new Map([['setka-standalone:v34-yulia-device','device-one']]);
 if(authenticated)store.set('setka-v40:cabinet-session',JSON.stringify({testerId:'T-ONE',token:'private-token'}));
 const ls={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))};
 const listeners=new Map(),docs=new Map(),timers=new Map(),requests=[],data={patternExposures:[]};
 let sequence=0,online=true;
 const on=(map,k,fn)=>map.set(k,[...(map.get(k)||[]),fn]);
 const window={SetkaStandaloneV34:{getData:()=>data},SetkaDataScopeV1:null,
  __SETKA_PRIVATE_CORPUS_V40__:{authoritative:()=>hydrated},
  addEventListener:(k,fn)=>on(listeners,k,fn),
  dispatchEvent:()=>{}};
 window.SetkaDataScopeV1={id:scope};
 const document={readyState:'complete',hidden:false,addEventListener:(k,fn)=>on(docs,k,fn)};
 const context={window,document,localStorage:ls,sessionStorage:{getItem:()=>null},
  crypto:webcrypto,TextEncoder,Uint8Array,Date,AbortController,CustomEvent:class {constructor(name,{detail}={}){this.type=name;this.detail=detail}},
  setInterval:()=>{},
  setTimeout:(fn,ms)=>{const id=++sequence;timers.set(id,{fn,ms});return id},
  clearTimeout:id=>timers.delete(id),
  fetch:async(_url,options)=>{
   const body=JSON.parse(options.body);requests.push(body);
   if(!online)throw Error('offline');
   return {ok:true,json:async()=>({ok:true,accepted:body.events.length})};
  }};
 vm.runInNewContext(readFileSync('standalone-account-exposure-v2.js','utf8'),context);
 return {store,data,requests,timers,window,setHydrated:v=>hydrated=v,online:v=>online=v,
  emit:k=>{for(const fn of listeners.get(k)||[])fn({type:k})},
  step:async ms=>{
   const entry=[...timers].find(([,timer])=>timer.ms===ms);
   assert.ok(entry,'expected scheduled '+ms+'ms step');
   timers.delete(entry[0]);await entry[1].fn();
   for(let i=0;i<10;i++)await Promise.resolve();
  }};
}
test('post-login exposure is sent and acknowledged; old guest history is not re-attributed',async()=>{
 const f=fixture();
 const old={exposureId:'old-guest',patternId:'hexwave',sessionId:null,sessionType:null,
  durationMs:2200,startedAt:new Date(Date.now()-60000).toISOString(),endedAt:new Date(Date.now()-58000).toISOString()};
 const later=new Date(Date.now()+1500).toISOString();
 const fresh={...old,exposureId:'new-account',sessionId:'session-2',sessionType:'exploration',
  durationMs:1300,startedAt:later,endedAt:new Date(Date.now()+2700).toISOString(),
  privateNote:'NEVER-SEND',config:{secret:'NEVER-SEND'}};
 f.data.patternExposures.push(old,fresh);
 await f.step(100);await f.step(100);
 assert.equal(f.requests.length,1);
 const sent=f.requests[0].events;
 assert.equal(sent.length,1);
 assert.equal(sent[0].patternId,'hexwave');
 assert.equal(sent[0].sessionType,'exploration');
 assert.equal(sent[0].durationMs,1300);
 assert.ok(!JSON.stringify(f.requests).includes('NEVER-SEND'));
 assert.ok(!JSON.stringify(f.requests).includes('old-guest'));
 assert.equal(JSON.parse(f.store.get('setka:v2-account-exposure-pending')).length,0);
});
test('owner isolation, hydration barrier and offline retry preserve pending exposure',async()=>{
 const f=fixture({hydrated:false});
 const start=new Date(Date.now()+1800).toISOString(),end=new Date(Date.now()+3000).toISOString();
 f.data.patternExposures.push({exposureId:'A',patternId:'hexwave',durationMs:1200,startedAt:start,endedAt:end});
 await f.step(100);assert.equal(f.requests.length,0);
 f.setHydrated(true);f.emit('setka:v40-private-corpus-restored');
 await f.step(100);
 f.online(false);await f.step(100);assert.equal(f.requests.length,1);
 assert.equal(JSON.parse(f.store.get('setka:v2-account-exposure-pending')).length,1);
 // Switching to another account must never upload T-ONE's old queued event.
 f.store.set('setka-v40:cabinet-session',JSON.stringify({testerId:'T-TWO',token:'other-token'}));
 f.window.SetkaDataScopeV1.id='tester:T-TWO';
 f.online(true);f.emit('online');
 await f.step(100);
 assert.equal(f.requests.length,1);
 assert.equal(JSON.parse(f.store.get('setka:v2-account-exposure-pending'))[0].accountId,'T-ONE');
});

test('front loads account V2 exposure collector independently of original guest and V41 streams',()=>{
 const html=readFileSync('standalone-v34.html','utf8');
 assert.match(html,/standalone-account-exposure-v2\\.js/);
 assert.match(html,/standalone-guest-telemetry-v2\\.js/);
 assert.match(html,/standalone-sync-v34\\.js/);
 assert.match(readFileSync('supabase/functions/setka-semantic-v35/index.ts','utf8'),/persistAccountJourney/);
});
