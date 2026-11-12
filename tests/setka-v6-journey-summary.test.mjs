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
