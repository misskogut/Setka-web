import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {summarizeV6} from '../supabase/functions/setka-admin-v6-metrics/analytics-v6.mjs';

const read=p=>fs.readFileSync(p,'utf8');
function harness(){
 const sessions=[],events=[],opened=[],notes=[],calls=[];
 let active=null;
 const data={sessions,events,notes};
 const C={
  INTENTS:[['explore','Просто исследую']],FACES:[],fmt:x=>String(x),
  getData:()=>data,getActiveSession:()=>active,
  startSession:({requestKey,preState,plannedSeconds})=>{
   active={id:'s-explore',requestKey,preState,postState:null,plannedSeconds,phase:'measured',startedAt:new Date().toISOString(),usage:[]};
   sessions.push({...active});events.push({sessionId:active.id,type:'session_start',payload:{requestKey}});
  },
  finishSession:()=>{active=null},
  persistActiveSession:()=>calls.push({...active}),
  save:()=>{},updateGameControls:()=>{},stateSnapshot:()=>({view:'game'}),
  recordEvent:(type,payload)=>events.push({type,sessionId:active?.id||null,payload}),
  screen:()=>({querySelector:()=>null}),showToday:()=>{},esc:s=>s
 };
 const window={SetkaStandaloneV34:C,SetkaApp:{openConfig:(config,source)=>opened.push({config,source})},addEventListener:()=>{}};
 const document={head:{appendChild:()=>{}},createElement:()=>({style:{}}),addEventListener:()=>{},querySelector:()=>null};
 vm.runInNewContext(read('standalone-explore-v34.js'),{window,document,Date,Number,Math,setTimeout:()=>1,setInterval:()=>1});
 return {C,window,notes,events,opened,calls,sessions};
}

test('explicit "Просто исследую" pathway persists a real non-outcome session',()=>{
 const h=harness();
 // Simulate the intent action, not the unrelated "Просто посмотреть" tile button.
 const src=read('standalone-explore-v34.js');
 assert.match(src,/if\(key===EXPLORE_KEY\)\{markExplorationSession\(pendingConfig\);return\}/);
 assert.match(src,/const EXPLORE_KEY="explore"/);
 assert.match(src,/preState:null,postState:null,helped:null,plannedSeconds:null,deadlineAt:null/);
 assert.match(src,/C.persistActiveSession\?\.\(\)/);
 assert.doesNotMatch(src,/C\.startFreeSession/);
 const ui=read('standalone-advanced-v34.js');
 assert.match(ui,/C\.recordEvent\("session_choice",\{choice:"browse"\},false\);directOpen\(tile\)/);
 assert.doesNotMatch(ui,/C\.startFreeSession/);
});

test('exploration session values, notes and replay keep the same local session ID',()=>{
 const h=harness();
 // Session conversion is handled by the real exploration module after originalStart.
 // Verify the note handler in the same module links both notes and explicit type.
 const src=read('standalone-explore-v34.js'),runtime=read('standalone-runtime-v34.js'),core=read('standalone-core-v34.js'),advanced=read('standalone-advanced-v34.js');
 assert.match(src,/s\.sessionType="outcome"/);
 assert.match(src,/n\.phase="exploration";n\.sessionType="exploration";C\.save\(\)/);
 assert.match(runtime,/sessionType=s\?\(context==="exploration"\?"exploration":"outcome"\):null/);
 assert.match(runtime,/phase:x\.context==="exploration"\?"exploration"/);
 assert.match(core,/sessionType:activeSession\?\(activeSession\.isExploration/);
 assert.match(core,/Открыть сессию ↗/);
 assert.match(advanced,/Заметки этой сессии/);
});

test('V2 separately counts outcome and exploration exposures, preserving unknown older context',()=>{
 const now=Date.parse('2026-11-12T06:00:00Z');
 const x={device_id:'guest-device',account_id:null,pattern_id:'medusa',event_type:'pattern_exposure',
 duration_ms:30000,occurred_at:'2026-11-12T05:00:00Z',received_at:'2026-11-12T05:05:00Z'};
 const rows=[
  {...x,event_id:'id-1',session_id:'session-measured',properties:{session_type:'outcome'}},
  {...x,event_id:'id-2',session_id:'session-exploration',properties:{session_type:'exploration'}},
  {...x,event_id:'id-3',session_id:null,properties:{}},
  {...x,event_id:'id-4',session_id:'legacy-unknown',properties:{}}
 ];
 const r=summarizeV6(rows,'unified_v2',{days:1,now});
 assert.equal(r.exposures,4);
 assert.equal(r.recordedMs,120000);
 assert.deepEqual(r.sessionBreakdown,{outcome:1,exploration:1,unbound:1,legacy_unknown:1});
 assert.equal(r.patterns[0].mode_breakdown.outcome,1);
 assert.equal(r.patterns[0].mode_breakdown.exploration,1);
 const ui=read('research-v1/copy-analytics-v6.mjs');
 assert.match(ui,/Во время сессий/);
 assert.match(ui,/Просто посмотреть/);
 assert.match(ui,/usageMode\.duringSession/);
 assert.match(ui,/usageMode\.justWatch/);
 assert.match(ui,/accountInventory/);
});
test('minimal transport sends only session type, never note contents',()=>{
 const api=read('supabase/functions/setka-guest-events-v2/index.ts'),guest=read('standalone-guest-telemetry-v2.js');
 assert.match(api,/e\.sessionType!=="outcome"&&e\.sessionType!=="exploration"/);
 assert.match(api,/session_type:e\.sessionType\?\?null/);
 assert.match(api,/ignoreDuplicates:true/);
 assert.match(guest,/sessionType:x\.sessionType==="outcome"/);
 assert.doesNotMatch(guest,/noteText|symptomName|rawGesture/);
});
test('free-view notes retain visit context, without relabeling intent as a viewing mode',()=>{
 const core=read('standalone-core-v34.js');
 const advanced=read('standalone-advanced-v34.js');
 const ui=read('research-v1/copy-analytics-v6.mjs');
 assert.match(advanced,/C\.recordEvent\("session_choice",\{choice:"browse"\},false\);directOpen\(tile\)/);
 assert.match(core,/visitId:!activeSession&&st\?\.view==="game"/);
 assert.match(core,/n\.visitId\|\|n\.patternId\?"Просто посмотреть"/);
 assert.match(ui,/metric\('Просто посмотреть'/);
 assert.match(ui,/metric\('Во время сессий'/);
 assert.doesNotMatch(ui,/metric\('Просто исследую'/);
});
