import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {sanitizeAccountJourney,persistAccountJourney} from '../supabase/functions/setka-semantic-v35/journey-account-v1.mjs';

const uuid=()=>webcrypto.randomUUID();
const now=Date.parse('2026-11-12T08:00:00Z');
const event=(type,extra={})=>({eventId:uuid(),eventType:type,occurredAt:'2026-11-12T07:00:00Z',sessionId:'v4-visit-id',patternId:null,...extra});

test('authenticated high-level events are validated and contain no private notes or raw config',()=>{
 const rows=sanitizeAccountJourney([event('visit_start'),event('visit_end',{durationMs:12000}),event('music_play',{trackId:'track-1'})],{deviceId:'device-1',testerId:'T-ABC',now});
 assert.equal(rows.length,3);
 assert.equal(rows[0].account_id,'T-ABC');
 assert.equal(rows[0].actor_type,'account');
 assert.equal(rows[0].device_id,'device-1');
 assert.equal(rows[1].duration_ms,12000);
 assert.equal(rows[2].properties.track_id,'track-1');
 assert.equal(JSON.stringify(rows).includes('token'),false);
 assert.equal(JSON.stringify(rows).includes('note'),false);
 assert.equal(JSON.stringify(rows).includes('config'),false);
 for(const bad of [
  event('unknown'),event('pattern_open'),event('music_play'),
  event('visit_end',{durationMs:-1}),
  event('favorite_save',{durationMs:20}),
  event('visit_start',{occurredAt:'2020-01-01T00:00:00Z'}),
  event('visit_start',{eventId:'bad-uuid'})
 ])assert.equal(sanitizeAccountJourney([bad],{deviceId:'device-1',testerId:'T-ABC',now}),null);
});

function db({consent=true,existing=0}={}){
 const writes=[];
 const client={from(table){
  const q={select(){return this},eq(){return this},gte(){return this},maybeSingle:async()=>({data:{tester_id:'T-ABC',active:true,consent_at:consent?'2026-11-01T00:00:00Z':null},error:null}),
  then(resolve,reject){return Promise.resolve({count:existing,error:null}).then(resolve,reject)},
  upsert:async(rows,opts)=>{writes.push({table,rows,opts});return {error:null}}};
  return q;
 }};
 return{client,writes};
}
test('account uploads require consent, rate limit and idempotent event IDs',async()=>{
 const good=db(),payload={deviceId:'device-1',testerId:'T-ABC',events:[event('visit_start')],now};
 assert.deepEqual(await persistAccountJourney(good.client,payload),{ok:true,accepted:1});
 assert.equal(good.writes.length,1);
 assert.equal(good.writes[0].opts.ignoreDuplicates,true);
 assert.equal(good.writes[0].table,'setka_research_events_v2');
 assert.equal((await persistAccountJourney(db({consent:false}).client,payload)).status,403);
 assert.equal((await persistAccountJourney(db({existing:240}).client,payload)).status,429);
 const dup=event('visit_start');
 assert.equal((await persistAccountJourney(db().client,{...payload,events:[dup,dup]})).status,400);
});

function browserFixture(){
 const state=new Map([
  ['setka-standalone:v34-yulia-device','device-1'],
  ['setka-v40:cabinet-session',JSON.stringify({testerId:'T-ABC',token:'token-private'})]
 ]);
 const listeners=new Map(),docs=new Map(),scheduled=[],requests=[];
 let offline=true;
 const store={getItem:key=>state.get(key)||null,setItem:(key,v)=>state.set(key,String(v))};
 const add=(map,key,cb)=>map.set(key,[...(map.get(key)||[]),cb]);
 const notify=(map,key,detail)=>{for(const cb of map.get(key)||[])cb({type:key,detail})};
 const win={SetkaApp:{getState:()=>({patternId:'gravity-atom'})},addEventListener:(key,cb)=>add(listeners,key,cb)};
 const document={readyState:'complete',hidden:false,addEventListener:(key,cb)=>add(docs,key,cb)};
 const ctx={window:win,document,localStorage:store,sessionStorage:{getItem:()=>null},Date,crypto:webcrypto,Uint8Array,AbortController,
 setTimeout:(fn,ms)=>{scheduled.push({fn,ms});return scheduled.length},clearTimeout:()=>{},setInterval:()=>{},
 fetch:async(_url,opts)=>{const body=JSON.parse(opts.body);requests.push(body);if(offline)throw Error('offline');
 return {ok:true,json:async()=>({ok:true,accepted:body.events.length})};}};
 vm.runInNewContext(fs.readFileSync('standalone-account-journey-v1.js','utf8'),ctx);
 return{state,document,requests,scheduled,
  emit:(key,detail)=>notify(listeners,key,detail),
  docEvent:key=>notify(docs,key),
  pending:()=>JSON.parse(state.get('setka:v4-account-journey-pending')||'[]'),
  online:()=>{offline=false},
  flush:async()=>{const fn=[...scheduled].reverse().find(t=>[1400,2500,300,250,200,1200,1000,1500,3000,6000].includes(t.ms))?.fn;assert.ok(fn);await fn();for(let i=0;i<10;i++)await Promise.resolve()}
 };
}
test('browser records account visits offline, retries, and never sends local account ID in events',async()=>{
 const h=browserFixture();
 assert.equal(h.pending()[0].eventType,'visit_start');
 h.emit('setka:pattern-open',{state:{patternId:'gravity-atom'}});
 h.emit('setka:favorite-saved',{favorite:{id:'private-id',config:{patternId:'gravity-atom'}}});
 h.emit('setka:music-play',{trackId:'track-42'});
 assert.equal(h.pending().length,4);
 await h.flush();assert.equal(h.pending().length,4);
 h.online();h.emit('online');await h.flush();
 assert.equal(h.pending().length,0);
 assert.equal(h.requests.at(-1).action,'journey-v1');
 assert.equal(h.requests.at(-1).sessionToken,'token-private');
 assert.equal(h.requests.at(-1).events.length,4);
 assert.ok(h.requests.at(-1).events.every(e=>!('accountId' in e)));
 assert.equal(JSON.stringify(h.requests.at(-1).events).includes('private-id'),false);
 assert.equal(JSON.stringify(h.requests.at(-1).events).includes('token-private'),false);
});
test('switching accounts never uploads queued events under the next identity',async()=>{
 const h=browserFixture();
 h.state.set('setka-v40:cabinet-session',JSON.stringify({testerId:'T-OTHER',token:'other-token'}));
 h.emit('setka:v40-account',{authenticated:true});
 h.online();h.emit('online');await h.flush();
 const transmitted=h.requests.at(-1).events;
 assert.ok(transmitted.every(e=>e.eventType!=='visit_start'||e.sessionId!==h.pending().find(x=>x.accountId==='T-ABC'&&x.eventType==='visit_start')?.sessionId));
 assert.ok(h.pending().some(e=>e.accountId==='T-ABC'),'previous account events remain private and pending');
});
test('standalone frontend loads both isolated journeys; server never bypasses existing device-bound auth',()=>{
 const html=fs.readFileSync('standalone-v34.html','utf8');
 const server=fs.readFileSync('supabase/functions/setka-semantic-v35/index.ts','utf8');
 assert.match(html,/standalone-guest-journey-v3\.js/);
 assert.match(html,/standalone-account-journey-v1\.js/);
 assert.match(server,/const testerId=await auth\(token,deviceId\)/);
 assert.match(server,/if\(action==="journey-v1"\)return J\(\{error:"auth_required"\},401\)/);
 assert.match(server,/persistAccountJourney\(db,\{deviceId,testerId,events:b\.events\}\)/);
});


test('account pagehide flushes the close event with a bounded keepalive request',()=>{
 const src=fs.readFileSync('standalone-account-journey-v1.js','utf8');
 assert.match(src,/window\.addEventListener\("pagehide",\(\)=>\{end\(\);void flush\(\)\}\)/);
 assert.match(src,/keepalive:true/);
 assert.match(src,/Content-Type":"text\/plain;charset=UTF-8"/);
});
