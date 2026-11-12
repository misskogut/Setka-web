import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {linkVerifiedGuestDevice} from '../supabase/functions/setka-semantic-v35/identity-link-v1.mjs';

function stub({consent=true,owner='T-001',hasGuest=true,links=[],active=true,failWrite=false}={}){
 const writes=[],queries=[],data={
  prototype_v40_tester_accounts:{tester_id:'T-001',active,consent_at:consent?'2026-11-12T00:00:00Z':null},
  prototype_v34_devices:{subject_key:owner},
  setka_research_events_v2:hasGuest?[{event_id:'event-from-this-device'}]:[],
  setka_research_identity_links_v1:links.map(account_id=>({account_id}))
 };
 return {writes,queries,db:{from(table){
  const qb={select(){return this},eq(field,value){queries.push({table,field,value});return this},
   limit(){return this},maybeSingle(){return Promise.resolve({data:data[table]||null,error:null})},
   then(resolve,reject){return Promise.resolve({data:data[table],error:null}).then(resolve,reject)},
   upsert(row,options){writes.push({table,row,options});return Promise.resolve({error:failWrite?{message:'db_error'}:null})}};
  return qb;
 }}};
}
const run=(opts={})=>{const d=stub(opts);return {d,p:linkVerifiedGuestDevice(d.db,{deviceId:'device-123',testerId:'T-001'})}};

test('links only verified, consented same-device account with real guest events',async()=>{
 const {d,p}=run();
 assert.equal(await p,'linked');
 assert.equal(d.writes.length,1);
 assert.equal(d.writes[0].table,'setka_research_identity_links_v1');
 assert.equal(d.writes[0].row.device_id,'device-123');
 assert.equal(d.writes[0].row.account_id,'T-001');
 assert.equal(d.writes[0].row.link_source,'verified_v41_account_sync');
 assert.equal(d.writes[0].options.ignoreDuplicates,true);
 assert.ok(d.queries.some(x=>x.table==='setka_research_events_v2'&&x.field==='actor_type'&&x.value==='guest'));
 assert.ok(d.queries.some(x=>x.table==='setka_research_events_v2'&&x.field==='device_id'&&x.value==='device-123'));
});
test('no consent, wrong owner, no guest history, or conflicting owner means no linking',async()=>{
 for(const [opts,status] of [
  [{consent:false},'consent_required'],
  [{active:false},'consent_required'],
  [{owner:'T-OTHER'},'device_not_verified'],
  [{hasGuest:false},'no_guest_events'],
  [{links:['T-OTHER']},'identity_conflict'],
  [{links:['T-001']},'already_linked']
 ]){
  const {d,p}=run(opts);
  assert.equal(await p,status,JSON.stringify(opts));
  assert.equal(d.writes.length,0,JSON.stringify(opts));
 }
});
test('link does not rewrite event rows, guest archives, passwords, or device ownership',async()=>{
 const src=readFileSync('supabase/functions/setka-semantic-v35/index.ts','utf8');
 const helper=readFileSync('supabase/functions/setka-semantic-v35/identity-link-v1.mjs','utf8');
 assert.match(src,/const testerId=await auth\(token,deviceId\)/);
 assert.match(src,/try\{await linkVerifiedGuestDevice\(db,\{deviceId,testerId\}\)\}/);
 assert.match(helper,/consent_at/);
 assert.match(helper,/prototype_v34_devices/);
 assert.doesNotMatch(helper,/\.update\(|\.delete\(|password_hash|notes\b|symptom/);
});
test('bad IDs are rejected without querying database; failures do not return a false success',async()=>{
 const {d}=run();
 assert.equal(await linkVerifiedGuestDevice(d.db,{deviceId:'../bad',testerId:'T-001'}),'invalid_identity');
 assert.equal(d.writes.length,0);
 const failed=run({failWrite:true});
 await assert.rejects(failed.p,/db_error/);
});
