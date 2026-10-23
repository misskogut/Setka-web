import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {buildData,sliceData} from '../research-v1/model.mjs';

// Pages stamps relative browser imports; server imports intentionally stay plain.
// Ignore only that build-time transport suffix, never differences in model logic.
const modelSource=s=>s.replace(/((?:from\s*|import\s*)["']\.{1,2}\/[^"'?]+\.(?:mjs|js))\?build=[a-f0-9]{40}(["'])/g,'$1$2');

const date='2026-10-23T12:00:00Z';
function fixture(include=true,active=true){return {
 accounts:[{tester_id:'ordinary',active:true},{tester_id:'qa',active}],
 accountCohorts:[{tester_id:'qa',cohort:'future-group',display_name:'test01',include_in_metrics:include}],
 accountSessions:['ordinary','qa'].map(tester_id=>({tester_id,session_id:'s',started_at:date})),
 accountExposures:['ordinary','qa'].map(tester_id=>({tester_id,exposure_id:'x',pattern_id:'future-pattern',duration_ms:1000,started_at:date})),
 accountFavorites:['ordinary','qa'].map(tester_id=>({tester_id,config_key:'recipe',pattern_id:'future-pattern',saved_at:date}))
};}
test('marked accounts remain ordinary participants while enabled; labels cannot merge identities',()=>{
 const data=buildData(fixture()),v=sliceData(data);assert.equal(v.participants.length,2);assert.equal(v.sessions.length,2);
 const qa=data.participants.find(p=>p.id==='account:qa');assert.equal(qa.label,'test01');assert.equal(qa.cohort,'future-group');assert.equal(qa.isTest,true);
 assert.equal(data.participants.find(p=>p.id==='account:ordinary').isTest,false);
});
test('exclusion removes every account fact from current research KPIs, retaining exact history',()=>{
 for(const [include,active]of [[false,true],[true,false],[false,false]]){
  const raw=fixture(include,active),before=structuredClone(raw),d=buildData(raw),v=sliceData(d);
  assert.equal(v.sessions.length,1);assert.equal(v.exposures.length,1);assert.equal(v.favorites.length,1);assert.equal(v.metrics.durationMs,1000);
  assert.equal(sliceData(d,{scope:'all'}).sessions.length,2);assert.equal(d.participants.length,2);assert.deepEqual(raw,before);
 }
});
test('membership is server-owned, deactivation is non-destructive and stops concurrent token issuance',()=>{
 const sql=fs.readFileSync('research-v1/sql/account-cohorts.sql','utf8');
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);assert.match(sql,/REVOKE ALL ON public\.setka_account_cohorts FROM public,anon,authenticated/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.setka_set_cohort_state/);
 assert.match(sql,/FOR SHARE/);assert.match(sql,/BEFORE INSERT ON public\.prototype_v40_tester_sessions/);
 assert.doesNotMatch(sql,/\bDELETE\s+FROM\b|\bTRUNCATE\b|\bDROP\s+TABLE\b/i);
 for(const table of ['favorites','sessions','exposures'])assert.match(sql,new RegExp('setka_metric_'+table));
});
test('public notes and coarse scenarios consume the same account eligibility as metrics',()=>{
 const notes=fs.readFileSync('supabase/functions/setka-public-notes-v37/index.ts','utf8');
 assert.match(notes,/from\("setka_metric_public_notes"\)/);assert.match(notes,/from\("setka_metric_note_saves"\)/);
 const community=fs.readFileSync('supabase/functions/setka-community-patterns-v38/index.ts','utf8');assert.match(community,/from\("setka_metric_accounts"\)/);
 const api=fs.readFileSync('supabase/functions/setka-research-admin-v1/index.ts','utf8');
 assert.ok(api.indexOf("const adminId=await authorized")<api.indexOf("b.action==='set-cohort-state'"));
 assert.equal(modelSource(fs.readFileSync('supabase/functions/setka-research-admin-v1/model.mjs','utf8')),modelSource(fs.readFileSync('research-v1/model.mjs','utf8')));
});

test('actual Pages stamping preserves model parity and still detects changed behavior',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'setka-cohort-release-'));
 try{
  fs.mkdirSync(path.join(dir,'research-v1'));
  fs.writeFileSync(path.join(dir,'standalone-v34.html'),'<meta name="setka-release-build" content="local" />');
  const original=fs.readFileSync('supabase/functions/setka-research-admin-v1/model.mjs','utf8');
  fs.writeFileSync(path.join(dir,'research-v1/model.mjs'),original);
  execFileSync(process.execPath,[path.resolve('scripts/build-standalone-release.mjs')],{cwd:dir,env:{...process.env,GITHUB_SHA:'a'.repeat(40)},stdio:'pipe'});
  const stamped=fs.readFileSync(path.join(dir,'research-v1/model.mjs'),'utf8');
  assert.notEqual(stamped,original);assert.equal(modelSource(stamped),modelSource(original));
  assert.notEqual(modelSource(stamped+'\nthrow Error("changed model");'),modelSource(original));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
