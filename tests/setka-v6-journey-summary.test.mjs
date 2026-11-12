import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeJourneyV3} from '../supabase/functions/setka-admin-v6-metrics/journey-v3-analytics.mjs';
import {readFileSync} from 'node:fs';
const now=Date.parse('2026-11-12T08:00:00Z');
const row=(event_id,device_id,event_type,occurred_at,extra={})=>({
 event_id,device_id,actor_type:'guest',event_type,occurred_at,
 duration_ms:null,pattern_id:null,properties:{source:'standalone-v34',schema:3},...extra
});
const data=[
 row('old-a','A','pattern_exposure','2026-11-09T11:00:00Z',{pattern_id:'gravity-atom',duration_ms:5000}),
 row('visit-old','A','visit_start','2026-11-10T11:00:00Z'),
 row('visit-a','A','visit_start','2026-11-11T22:00:00Z'),
 row('visit-b','B','visit_start','2026-11-11T23:00:00Z'),
 row('end-a','A','visit_end','2026-11-11T22:05:00Z',{duration_ms:300000}),
 row('return-a','A','app_return','2026-11-11T23:12:00Z'),
 row('open-a','A','pattern_open','2026-11-11T22:02:00Z',{pattern_id:'gravity-atom'}),
 row('fav-a','A','favorite_save','2026-11-11T22:03:00Z',{pattern_id:'gravity-atom'}),
 row('music-a','A','music_play','2026-11-11T22:04:00Z',{properties:{track_id:'track-1'}}),
 row('account','AccountDev','visit_start','2026-11-11T22:00:00Z',{actor_type:'account'}),
];
test('one-day V3 dashboard reports factual guest visits, returns, active devices and music',()=>{
 const r=summarizeJourneyV3([...data,data[3]],{days:1,now});
 assert.equal(r.visits,2);
 assert.equal(r.activeGuestDevices,2);
 assert.equal(r.firstSeenGuestDevices,1);
 assert.equal(r.returningGuestDevices,1);
 assert.equal(r.returns,1);
 assert.equal(r.foregroundMs,300000);
 assert.equal(r.visitEnds,1);
 assert.equal(r.patternOpens,1);
 assert.equal(r.favoriteSaves,1);
 assert.equal(r.favoritesByPattern[0].pattern_id,'gravity-atom');
 assert.equal(r.favoritesByPattern[0].saves,1);
 assert.equal(r.favoriteRemoves,0);
 assert.equal(r.musicStarts,1);
 assert.equal(r.duplicateRows,1);
 assert.equal(r.timeline.length,1);
 assert.deepEqual(r.timeline[0],{date:'2026-11-12',visits:2});
 assert.equal(r.patternOpensById[0].pattern_id,'gravity-atom');
 assert.equal(r.topPlayedTracks[0].track_id,'track-1');
 assert.match(r.caveat,/not unique people/);
});
test('new vs returning devices use available history, custom ranges use actual occurrence',()=>{
 const r=summarizeJourneyV3(data,{days:0,now,from:'2026-11-11T20:00:00Z',to:'2026-11-12T00:00:00Z'});
 assert.equal(r.visits,2);
 assert.equal(r.activeGuestDevices,2);
 assert.equal(r.firstSeenGuestDevices,1);
 assert.equal(r.returningGuestDevices,1);
 assert.throws(()=>summarizeJourneyV3([],{days:7,now,from:'bad',to:'2026-11-12T00:00:00Z'}),/invalid_period/);
 assert.throws(()=>summarizeJourneyV3([],{days:12,now}),/invalid_period/);
});
test('production V2 summary reads metadata for guest journey without bypassing existing admin key',()=>{
 const src=readFileSync('supabase/functions/setka-admin-v6-metrics/index.ts','utf8');
 assert.match(src,/if\(!\(await authorized\(body\.adminKey\)\)\)return response\(\{error:"forbidden"\},403\)/);
 assert.match(src,/const journey=source==="unified_v2"\?summarizeJourneyV3/);
 assert.match(src,/actor_type,account_id,pattern_id,event_type,session_id/);
 assert.match(src,/\.\.\.\(journey\?\{journey\}:\{\}\)/);
});

test('account history is scoped by verified account ID, not by guest device',()=>{
 const rows=[
  row('guest-same','device-1','visit_start','2026-11-11T22:00:00Z'),
  row('account-early','device-1','visit_start','2026-11-09T21:00:00Z',{actor_type:'account',account_id:'T-ONE'}),
  row('account-new','device-1','visit_start','2026-11-11T22:00:00Z',{actor_type:'account',account_id:'T-ONE'}),
  row('account-second','device-1','visit_start','2026-11-11T22:05:00Z',{actor_type:'account',account_id:'T-TWO'}),
  row('account-end','device-1','visit_end','2026-11-11T22:07:00Z',{actor_type:'account',account_id:'T-ONE',duration_ms:60000}),
  row('account-music','device-1','music_play','2026-11-11T22:02:00Z',{actor_type:'account',account_id:'T-ONE',properties:{track_id:'tone-1'}})
 ];
 const account=summarizeJourneyV3(rows,{scope:'account',days:1,now});
 assert.equal(account.visits,2);
 assert.equal(account.activeAccounts,2);
 assert.equal(account.firstSeenAccounts,1);
 assert.equal(account.returningAccounts,1);
 assert.equal(account.musicStarts,1);
 assert.equal(account.foregroundMs,60000);
 assert.equal(account.identityScope,'verified_account_ids');
 const guest=summarizeJourneyV3(rows,{scope:'guest',days:1,now});
 assert.equal(guest.visits,1);
 assert.equal(guest.activeGuestDevices,1);
 assert.equal(guest.musicStarts,0);
 assert.throws(()=>summarizeJourneyV3(rows,{scope:'merged',days:1,now}),/invalid_scope/);
});

test('cohort D1/D7 retention is separated by identity and never inferred from exposure-only history',()=>{
 const rows=[];
 for(let i=0;i<6;i++){
  const id='device-'+i;
  rows.push(row('first-'+i,id,'visit_start','2026-11-01T12:00:00Z'));
  if(i<3)rows.push(row('d1-'+i,id,'visit_start','2026-11-02T12:00:00Z'));
  if(i<2)rows.push(row('d7-'+i,id,'visit_start','2026-11-08T12:00:00Z'));
 }
 const r=summarizeJourneyV3(rows,{days:30,now});
 assert.deepEqual(r.retentionD1,{eligible:6,returned:3,ratePct:50});
 assert.deepEqual(r.retentionD7,{eligible:6,returned:2,ratePct:33.3});
 assert.equal(r.activeLast7Days,2);
 assert.equal(r.activeToday,0);
 const few=summarizeJourneyV3(rows.filter(x=>!x.device_id.endsWith('5')&&!x.device_id.endsWith('4')),{days:30,now});
 assert.equal(few.retentionD1.eligible,4);
 assert.equal(few.retentionD1.ratePct,null,'small sample never produces a misleading percentage');
 const noVisits=summarizeJourneyV3([row('only-exposure','legacy','pattern_exposure','2026-11-01T12:00:00Z')],{days:30,now});
 assert.equal(noVisits.retentionD1.eligible,0);
 assert.equal(noVisits.activeLast7Days,0);
});
test('account-cohort retention uses account IDs even when multiple accounts shared one device',()=>{
 const rows=[];
 for(let i=0;i<6;i++){
  rows.push(row('account-first-'+i,'same-device','visit_start','2026-11-01T12:00:00Z',{actor_type:'account',account_id:'T-'+i}));
  if(i<4)rows.push(row('account-return-'+i,'same-device','visit_start','2026-11-02T12:00:00Z',{actor_type:'account',account_id:'T-'+i}));
 }
 const summary=summarizeJourneyV3(rows,{scope:'account',days:30,now});
 assert.equal(summary.activeAccounts,6);
 assert.equal(summary.retentionD1.eligible,6);
 assert.equal(summary.retentionD1.returned,4);
 assert.equal(summary.retentionD1.ratePct,66.7);
 assert.equal(summary.identityScope,'verified_account_ids');
});

test('D1 and D7 never count a cohort before its return day has fully ended',()=>{
 const cohort=Array.from({length:6},(_,i)=>row('recent-'+i,'partial-'+i,'visit_start','2026-11-11T12:00:00Z'));
 const partial=[...cohort,...Array.from({length:3},(_,i)=>row('return-today-'+i,'partial-'+i,'visit_start','2026-11-12T07:00:00Z'))];
 const r=summarizeJourneyV3(partial,{days:30,now});
 assert.equal(r.retentionD1.eligible,0,'today is an unfinished D1 observation day');
 assert.equal(r.retentionD1.ratePct,null);
 const custom=[
  ...Array.from({length:6},(_,i)=>row('custom-first-'+i,'c-'+i,'visit_start','2026-11-01T12:00:00Z')),
  ...Array.from({length:3},(_,i)=>row('custom-return-'+i,'c-'+i,'visit_start','2026-11-02T01:00:00Z'))
 ];
 const c=summarizeJourneyV3(custom,{days:0,now,from:'2026-11-01T00:00:00Z',to:'2026-11-02T02:00:00Z'});
 assert.equal(c.retentionD1.eligible,0,'custom range with partial final day cannot establish D1');
});

test('receipt telemetry reports only actually received journey events, by separate source',()=>{
 const seen='2026-11-12T07:10:00Z';
 const rows=[
  row('guest-arrived','G','visit_start','2026-11-11T22:00:00Z',{received_at:seen}),
  row('old-exposure','G','pattern_exposure','2026-11-11T22:01:00Z',
    {received_at:'2026-11-12T07:59:00Z',pattern_id:'medusa'}),
  row('account-arrived','G','visit_start','2026-11-11T23:00:00Z',
    {actor_type:'account',account_id:'A-1',received_at:'2026-11-12T07:30:00Z'})
 ];
 const guest=summarizeJourneyV3(rows,{scope:'guest',days:1,now});
 const account=summarizeJourneyV3(rows,{scope:'account',days:1,now});
 assert.equal(guest.lastJourneyReceiptAt,seen);
 assert.equal(guest.journeyEventsInPeriod,1);
 assert.equal(account.lastJourneyReceiptAt,'2026-11-12T07:30:00.000Z');
 assert.equal(account.journeyEventsInPeriod,1);
 const empty=summarizeJourneyV3([],{scope:'account',days:1,now});
 assert.equal(empty.lastJourneyReceiptAt,null);
 assert.equal(empty.journeyEventsInPeriod,0);
});
