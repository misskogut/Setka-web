import test from 'node:test';
import assert from 'node:assert/strict';
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
