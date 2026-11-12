import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeOutcomeSessions,summarizePatternTransitions} from '../supabase/functions/setka-admin-v6-metrics/outcomes-v1.mjs';

const now=Date.parse('2026-11-12T08:00:00Z');
const ses=(id,request_key,pre_state,post_state,extra={})=>({
 session_id:id,request_key,pre_state,post_state,session_type:'outcome',
 completed:true,started_at:'2026-11-11T22:00:00Z',...extra
});
test('only completed tracked sessions with both ratings contribute; explore is excluded',()=>{
 const rows=[
  ...Array.from({length:5},(_,i)=>ses('s'+i,'sleep',2,3)),
  ses('unfinished','sleep',1,5,{completed:false}),
  ses('bad','sleep',0,5),
  ses('free','explore',1,5,{session_type:'exploration'}),
  ses('legacy-explore','explore',1,5,{session_type:'outcome'})
 ];
 const r=summarizeOutcomeSessions(rows,{days:1,now});
 assert.equal(r.trackedSessions,7);
 assert.equal(r.completedSessions,6);
 assert.equal(r.pairedSessions,5);
 assert.equal(r.excludedExplorationSessions,2);
 assert.equal(r.overall.meanPre,2);
 assert.equal(r.overall.meanPost,3);
 assert.equal(r.overall.meanChange,1);
 assert.equal(r.groups.length,1);
 assert.equal(r.groups[0].requestKey,'sleep');
 assert.equal(r.groups[0].pairedSessions,5);
 assert.match(r.caveat,/No control group/);
});
test('suppresses weak groups, small sample means and custom dates',()=>{
 const r=summarizeOutcomeSessions([ses('s1','sleep',1,5),ses('s2','sleep',1,5)],{days:1,now});
 assert.equal(r.overall,null);
 assert.equal(r.privacySuppressed,true);
 assert.deepEqual(r.groups,[]);
 const more=[...Array.from({length:5},(_,i)=>ses('s'+i,'sleep',1,4)),ses('other','energy',1,5)];
 const r2=summarizeOutcomeSessions(more,{days:1,now});
 assert.equal(r2.groups.length,1);
 assert.equal(r2.groups[0].requestKey,'sleep');
 const x=summarizeOutcomeSessions(more,{days:0,now,from:'2026-11-10T00:00:00Z',to:'2026-11-11T00:00:00Z'});
 assert.equal(x.pairedSessions,0);
 assert.throws(()=>summarizeOutcomeSessions([],{days:1,from:'bad',to:'2026-11-12T00:00:00Z',now}),/invalid_period/);
});
test('sequence counts distinct sessions and hides transitions observed fewer than 3 times',()=>{
 const rows=[];
 for(let n=0;n<4;n++){
  const session_id='session-'+n,tester_id=n%2?'Account-A':'Account-B';
  for(const [k,pattern_id] of ['medusa','medusa','gravity-atom','hexwave'].entries())
   rows.push({session_id,tester_id,pattern_id,started_at:'2026-11-10T10:0'+k+':00Z'});
 }
 rows.push({session_id:null,tester_id:'Account-X',pattern_id:'not-a-session',started_at:'2026-11-10T10:00:00Z'});
 const r=summarizePatternTransitions(rows);
 assert.equal(r.sessionsWithSequence,4);
 assert.equal(r.transitions.length,2);
 assert.deepEqual(r.transitions.map(x=>[x.fromPattern,x.toPattern,x.sessionCount]),[['medusa','gravity-atom',4],['gravity-atom','hexwave',4]]);
 assert.equal(summarizePatternTransitions(rows,{minimumSessions:5}).transitions.length,0);
});
test('the protected admin endpoint never returns raw observations or private note text',()=>{
 const src=readFileSync('supabase/functions/setka-admin-v6-metrics/index.ts','utf8');
 assert.match(src,/if\(!\(await authorized\(body\.adminKey\)\)\)return response\(\{error:"forbidden"\},403\)/);
 assert.match(src,/summarizeOutcomeSessions\(rq\.data\|\|\[\],\{days,from,to\}\)/);
 assert.match(src,/summarizePatternTransitions\(rows\)/);
 assert.match(src,/select\("started_at,request_key,session_type,completed,pre_state,post_state"\)/);
 assert.doesNotMatch(src,/\.select\(".*(?:note|symptom_text|password_hash)/);
});
