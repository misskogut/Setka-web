import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as readFileSyncImport} from 'node:fs';
import {summarizeV6} from '../supabase/functions/setka-admin-v6-metrics/analytics-v6.mjs';
const NOW=Date.parse('2026-11-12T01:00:00Z');
const a=(event_id,device_id,occurred_at,duration_ms=30000)=>({event_id,device_id,account_id:null,pattern_id:'gravity-atom',event_type:'pattern_exposure',duration_ms,occurred_at,received_at:'2026-11-12T01:00:00Z'});
test('source-scoped v2 reports free guest views, late receipts and no cross-device identity merge',()=>{
 const x=a('id-1','device-A','2026-11-11T22:30:00Z');
 const report=summarizeV6([x,x,a('id-2','device-B','2026-11-11T22:15:00Z')],'unified_v2',{days:7,now:NOW});
 assert.equal(report.exposures,2);assert.equal(report.distinctIdentities,2);
 assert.equal(report.duplicateRows,1);assert.equal(report.recordedMs,60000);
 assert.equal(report.timeline.length,7);
 assert.equal(report.timeline.at(-1).date,'2026-11-12');
 assert.equal(report.timeline.at(-1).exposures,2,'UTC+4 day boundary');
 assert.equal(report.patterns[0].distinct_identities,2);
 assert.equal(report.lastIngestAt,'2026-11-12T01:00:00.000Z');
});
test('account exposure IDs are distinct per authenticated account; duplicate rows count once',()=>{
 const x={tester_id:'T-A',exposure_id:'same-id',pattern_id:'dandelion',duration_ms:12000,
   started_at:'2026-11-11T21:00:00Z',ended_at:'2026-11-11T21:01:00Z',updated_at:'2026-11-11T21:01:00Z'};
 const y={...x,tester_id:'T-B'};
 const r=summarizeV6([x,x,y],'account_v41',{days:30,now:NOW});
 assert.equal(r.exposures,2);assert.equal(r.distinctIdentities,2);
 assert.equal(r.duplicateRows,1);assert.equal(r.recordedMs,24000);
});
test('period filtering ignores old, future and non-exposure data without inventing participants',()=>{
 const old=a('old','device-A','2026-09-01T12:00:00Z'),future=a('future','device-A','2026-11-14T12:00:00Z');
 const bogus={...a('open','device-A','2026-11-11T22:00:00Z'),event_type:'pattern_open'};
 const r=summarizeV6([old,future,bogus],'unified_v2',{days:7,now:NOW});
 assert.equal(r.exposures,0);assert.equal(r.excludedRows,3);
 assert.equal(r.timeline.length,7);assert.equal(r.patternCount,0);assert.equal(r.distinctIdentities,0);
 assert.equal(r.lastIngestAt,null);
});
test('legacy source kept separate and time never exceeds one day per exposure',()=>{
 const old={participant_key:'anonymous-A',exposure_id:'e1',pattern_id:'medusa',duration_ms:1000000000,
   started_at:'2026-08-01T10:00:00Z',ended_at:'2026-08-01T10:00:01Z',updated_at:'2026-08-01T10:00:02Z'};
 const r=summarizeV6([old],'guest_v40',{days:0,now:NOW});
 assert.equal(r.recordedMs,86400000);assert.equal(r.exposures,1);assert.equal(r.timeline.length,1);
 assert.throws(()=>summarizeV6([], 'other'),/unknown_source/);
 assert.throws(()=>summarizeV6([],'guest_v40',{days:100}),/invalid_period/);
});

test('custom interval uses occurred-at, not ingestion-time, and local Saratov days',()=>{
 const rows=[
  a('inside','guest-one','2026-11-11T22:30:00Z'),
  a('before','guest-two','2026-11-11T19:55:00Z'),
  a('after','guest-three','2026-11-12T00:00:00Z')
 ];
 const from='2026-11-11T20:00:00Z',to='2026-11-12T00:00:00Z';
 const r=summarizeV6(rows,'unified_v2',{days:0,from,to,now:NOW});
 assert.equal(r.exposures,1);
 assert.equal(r.guestDevices,1);
 assert.equal(r.timeline.length,1);
 assert.equal(r.timeline[0].date,'2026-11-12');
 assert.equal(r.periodFrom,from.replace('Z','.000Z'));
 assert.equal(r.periodTo,to.replace('Z','.000Z'));
 assert.throws(()=>summarizeV6(rows,'unified_v2',{days:0,from:to,to:from,now:NOW}),/invalid_period/);
});

test('deep pattern metrics use source-scoped median and repeat IDs without cropping the catalog',()=>{
 const rows=[
  a('ex1','device-A','2026-11-11T22:00:00Z',10000),
  a('ex2','device-A','2026-11-11T22:02:00Z',30000),
  a('ex3','device-B','2026-11-11T22:03:00Z',60000)
 ];
 const report=summarizeV6(rows,'unified_v2',{days:1,now:NOW});
 const p=report.patterns[0];
 assert.equal(p.exposures,3);
 assert.equal(p.recorded_ms,100000);
 assert.equal(p.average_ms,33333);
 assert.equal(p.median_ms,30000);
 assert.equal(p.repeat_identities,1);
 assert.equal(p.distinct_identities,2);
 const catalog=Array.from({length:27},(_,i)=>({...rows[0],event_id:'pattern-'+i,pattern_id:'setka-pattern-'+i}));
 const r=summarizeV6(catalog,'unified_v2',{days:1,now:NOW});
 assert.equal(r.patterns.length,27,'details must not silently report zero for less popular patterns');
});

test('V41 account usage counts in-session and just-watch separately without inferring intent',()=>{
 const x={tester_id:'ACCOUNT-A',exposure_id:'a-1',session_id:null,pattern_id:'medusa',duration_ms:15000,
   started_at:'2026-11-11T21:00:00Z',ended_at:'2026-11-11T21:01:00Z',updated_at:'2026-11-11T21:01:00Z'};
 const rows=[x,{...x,exposure_id:'a-2',session_id:'s-1'},{...x,exposure_id:'a-3',session_id:'s-1'},x];
 const r=summarizeV6(rows,'account_v41',{days:1,now:NOW});
 assert.equal(r.exposures,3,'two session views and one just-watch view');
 assert.deepEqual(r.usageMode,{duringSession:2,justWatch:1});
 assert.equal(r.patterns[0].usage_mode.duringSession,2);
 assert.equal(r.patterns[0].usage_mode.justWatch,1);
 assert.equal(r.duplicateRows,1);
 assert.equal(r.distinctIdentities,1);
 const guest={...rows[0],exposure_id:'guest',participant_key:'x'};
 const other=summarizeV6([guest],'guest_v40',{days:1,now:NOW});
 assert.equal(other.usageMode,null,'legacy guests have no supported session discriminator');
});
test('V2 explicit exploration intent stays in a session; nullable session is just-watch',()=>{
 const x=a('x-1','guest-A','2026-11-11T22:00:00Z');
 const report=summarizeV6([
  {...x,session_id:'s-exploration',properties:{session_type:'exploration'}},
  {...x,event_id:'x-2',session_id:null,properties:{}}
 ],'unified_v2',{days:1,now:NOW});
 assert.deepEqual(report.usageMode,{duringSession:1,justWatch:1});
 assert.equal(report.sessionBreakdown.exploration,1);
 assert.equal(report.sessionBreakdown.unbound,1);
});
test('only authenticated admin summary reads account inventory and session IDs from V41',()=>{
 const {readFileSync}=awaitImportGuard();
 const source=readFileSync('supabase/functions/setka-admin-v6-metrics/index.ts','utf8');
 assert.match(source,/if\(!\(await authorized\(body\.adminKey\)\)\)return response\(\{error:"forbidden"\},403\)/);
 assert.match(source,/source==="account_v41"\?"session_id,"/);
 assert.match(source,/prototype_v40_tester_accounts/);
 assert.match(source,/prototype_v41_account_favorites/);
 assert.match(source,/prototype_v41_account_sessions/);
 assert.match(source,/accountInventory/);
});
function awaitImportGuard(){return {readFileSync:readFileSyncImport}}
