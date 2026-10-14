import test from 'node:test';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {inviteRequest,issueInvites} from '../research-v1/invites.mjs';
import {activityForSample,activityLabel} from '../research-v1/activity.mjs';
import {buildData,sliceData} from '../research-v1/model.mjs';import {realHeartRates} from '../research-v1/physiology.mjs';
const request={label:'Кампания',count:2,requestedCount:101,requestId:'00000000-0000-4000-8000-000000000001'};
test('invite input rejects unknown counts, missing request identity and control characters',()=>{
 for(const b of [{count:0},{count:101},{count:1.2},{label:''},{label:'Bad\nlabel'},{requestId:'bad'},{batchId:'bad'},{requestedCount:1}])assert.throws(()=>inviteRequest({...request,...b}));
 assert.equal(inviteRequest(request).requestedCount,101);
});
test('only hashes reach the atomic invite RPC and ownership comes from authenticated server context',async()=>{
 let args;const out=await issueInvites({...request,testerId:'ATTACKER',adminId:'ATTACKER'},{testerId:'T-OWNERAAA'},async(n,a)=>{assert.equal(n,'setka_research_v1_issue_invites');args=a;return {batchId:'known',issued:2}},webcrypto);
 assert.equal(args.p_issuer_tester_id,'T-OWNERAAA');assert.equal(args.p_admin_key_id,null);assert.equal(out.items.length,2);
 for(const x of out.items)assert.match(x.code,/^SETKA-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
 assert.ok(args.p_items.every(x=>Object.keys(x).join(',')==='testerId,claimHash'&&/^[a-f0-9]{64}$/.test(x.claimHash)));assert.ok(!JSON.stringify(args).includes(out.items[0].code));
});
const interval={id:'i',participantId:'account:A',deviceId:'d1',sessionId:'account:A::s',exposureId:'e',patternId:'dandelion',configKey:'cfg',startedAt:'2026-10-14T17:00:00Z',endedAt:'2026-10-14T17:00:15Z',durationMs:15000,touches:0,moves:0,configChanges:0,coverage:'observed'};
const sample={participantId:'account:A',deviceId:'d1',sessionId:'account:A::s',exposureId:'e',patternId:'dandelion',configKey:'cfg',observedAt:'2026-10-14T17:00:05Z'};
test('quiet viewing requires a recorded interval; absent actions stay unknown',()=>{assert.equal(activityLabel(null),'Действия не записаны');assert.equal(activityLabel(interval),'Просмотр без касаний');assert.equal(activityForSample(sample,[interval]),interval);assert.equal(activityLabel({...interval,touches:1}),'Касания');assert.equal(activityLabel({...interval,moves:1}),'Движения и настройки');});
test('physiology cannot be joined across people, devices, configs, exposures or ambiguous intervals',()=>{
 for(const patch of [{participantId:'account:B'},{deviceId:'d2'},{sessionId:'account:B::s'},{configKey:'another'},{exposureId:'other'},{observedAt:interval.endedAt}])assert.equal(activityForSample({...sample,...patch},[interval]),null);
 assert.equal(activityForSample(sample,[interval,{...interval,id:'j'}]),null);
});
test('canonical account projection retains visit/version and period filters keep genuine pulse and behavior',()=>{
 const raw={accounts:[{tester_id:'A'}],devices:[{device_id:'d1',subject_key:'A'}],accountExposures:[{tester_id:'A',exposure_id:'e',session_id:'s',pattern_id:'dandelion',config_key:'cfg',started_at:interval.startedAt,ended_at:interval.endedAt}],archives:[{device_id:'d1',tester_id:'A',payload:{patternExposures:[{exposureId:'e',sessionId:'s',patternId:'dandelion',patternVersion:7,visitId:'v',configKey:'cfg',config:{patternId:'dandelion'}}],activityIntervals:[{...interval,sessionId:'s'}],physio:{samples:[{...sample,id:'p',sessionId:'s',metric:'heart_rate',unit:'bpm',sourceType:'ble_heart_rate',quality:'ok',value:72}]}}}]};
 const d=buildData(raw),v=sliceData(d,{scope:'current',from:'2026-10-14T16:00:00Z',to:'2026-10-14T18:00:00Z'});assert.equal(d.exposures[0].visitId,'v');assert.equal(d.exposures[0].patternVersion,7);assert.equal(v.physio.length,1);assert.equal(v.activityIntervals.length,1);assert.equal(v.activityIntervals[0].sessionId,v.physio[0].sessionId);assert.equal(sliceData(d,{to:interval.startedAt}).physio.length,0);
});
test('community contribution uses measurements in exact usage interval, with no proportional synthetic sample counts',()=>{
 const source=readFileSync(new URL('../standalone-research-bridge-v40.js',import.meta.url),'utf8'),start=source.indexOf('function pulse('),end=source.indexOf('function finished(',start);
 const samples=[{id:'before',value:70,observedAt:'2026-10-14T17:00:01Z'},{id:'within',value:82,observedAt:'2026-10-14T17:00:06Z'},{id:'next',value:100,observedAt:'2026-10-14T17:00:10Z'}].map(x=>({...x,sessionId:'s',metric:'heart_rate',unit:'bpm',sourceType:'ble_heart_rate',quality:'ok',patternId:'dandelion',configKey:'cfg',payload:{patternVisible:true}}));
 samples.push({...samples[1],value:999,sourceType:'demo_heart_rate'});
 const pulse=vm.runInNewContext(source.slice(start,end)+'\npulse',{C:{getData:()=>({physio:{samples}}),pulse:{realHeartRates}},Date,Number,Math});
 const out=pulse('s',{patternId:'dandelion',configKey:'cfg',startedMs:5000,endedMs:10000},{startedAt:'2026-10-14T17:00:00Z'});assert.equal(out.avg,82);assert.equal(out.samples,1);assert.equal(pulse('s',{patternId:'dandelion',configKey:'missing',startedMs:0,endedMs:15000},{startedAt:'2026-10-14T17:00:00Z'}),null);
});
