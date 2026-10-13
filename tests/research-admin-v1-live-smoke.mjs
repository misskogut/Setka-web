// Read-only live verification. Key arrives on stdin; never logged or stored.
import {sliceData} from '../research-v1/model.mjs';
import {resolveRecipe} from '../research-v1/recipe.mjs';
if(process.stdin.isTTY)process.stdin.setRawMode(true);
console.log('Ready for verification JSON on stdin (input is hidden).');
const input=await new Promise(resolve=>{let value='';process.stdin.on('data',chunk=>{value+=chunk.toString();if(value.includes('\n')){process.stdin.pause();if(process.stdin.isTTY)process.stdin.setRawMode(false);resolve(value.slice(0,value.indexOf('\n')));}});});
const {adminKey,replaySelections=[]}=JSON.parse(input),base='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/',pub='sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv';
const checks=[];
function assert(condition,name,details={}){checks.push({name,pass:!!condition,...details});}
async function request(name,body,origin='https://misskogut.github.io',method='POST'){
 const r=await fetch(base+name,{method,headers:{'Content-Type':'application/json',apikey:pub,Origin:origin},body:method==='POST'?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});
 return {status:r.status,body:await r.json().catch(()=>({}))};
}
const endpoint='setka-research-admin-v1';
const missing=await request(endpoint,{action:'overview'});assert(missing.status===403,'unauthorized-private-read-denied');
const privateWrite=await request(endpoint,{action:'save-experiment'});assert(privateWrite.status===403,'unauthorized-experiment-write-denied');
const invalid=await request(endpoint,{action:'overview',adminKey:'invalid-verification-key'});assert(invalid.status===403,'invalid-key-denied');
const origin=await request(endpoint,{action:'check',adminKey},'https://example.org');assert(origin.status===403,'foreign-origin-denied');
const get=await request(endpoint,{},'https://misskogut.github.io','GET');assert(get.status===405,'get-requests-denied');
const check=await request(endpoint,{action:'check',adminKey});assert(check.status===200&&check.body.ok&&check.body.projectId==='gfchgaphzhxufwdhrcis','existing-admin-auth-and-project');
for(const pick of replaySelections){
 const out=await request(endpoint,{action:'replay',adminKey,deviceId:pick.device_id,replayKey:pick.replay_key});
 const states=(out.body.states||[]).filter(s=>s.state?.view==='game'),recipes=states.map(s=>resolveRecipe(s.state));
 assert(out.status===200&&states.length>0,'real-selected-replay-loaded',{status:out.status,states:states.length,coverage:out.body.coverage});
 assert(recipes.every(r=>r.ok),'real-selected-replay-recipes-restored',{restored:recipes.filter(r=>r.ok).length,missing:recipes.filter(r=>!r.ok).map(r=>r.reason)});
}
const overview=await request(endpoint,{action:'overview',adminKey});assert(overview.status===200&&overview.body.ok,'live-overview',{status:overview.status,error:overview.body.error||null});
if(overview.body.data){
 const data=overview.body.data,view=sliceData(data,{scope:'current'}),summary=data.communityMetrics;
 assert(view.sessions.length===summary.sessions,'session-aggregate-matches-current-view',{records:view.sessions.length,canonical:summary.sessions});
 assert(view.exposures.length===summary.exposures,'exposure-aggregate-matches-current-view',{records:view.exposures.length,canonical:summary.exposures});
 assert(view.favorites.length===summary.configuration_saves,'favorite-aggregate-matches-current-view',{records:view.favorites.length,canonical:summary.configuration_saves});
 assert(new Set(data.sessions.map(s=>s.id)).size===data.sessions.length,'no-session-double-count');
 assert(new Set(data.exposures.map(s=>s.id)).size===data.exposures.length,'no-exposure-double-count');
 assert(!JSON.stringify(data).includes('password_hash')&&!JSON.stringify(data).includes('session_token_hash'),'credential-fields-absent');
 const archived=data.digests.filter(d=>d.event_count>0).sort((a,b)=>b.event_count-a.event_count)[0];
 if(archived){const out=await request(endpoint,{action:'replay',adminKey,deviceId:archived.device_id,replayKey:archived.replay_key});assert(out.status===200&&out.body.events?.length>0,'historical-raw-replay',{status:out.status,events:out.body.events?.length||0,states:out.body.states?.length||0,coverage:out.body.coverage||null,error:out.body.error||null});if(out.status===200)assert(out.body.coverage!=='full'||out.body.digest?.metrics?.coverage?.complete===true,'full-replay-requires-explicit-coverage');}
 const current=data.sessions.find(s=>s.current&&s.deviceId);
 if(current){const out=await request(endpoint,{action:'replay',adminKey,deviceId:current.deviceId,sessionId:current.originalId});assert(out.status===200,'current-account-replay-contract',{status:out.status,events:out.body.events?.length||0,states:out.body.states?.length||0,coverage:out.body.coverage||null});}
 const legacy=data.sessions.find(s=>s.source==='legacy-research');
 if(legacy){const out=await request(endpoint,{action:'replay',adminKey,kind:'legacy',sessionId:legacy.originalId});assert(out.status===200,'legacy-session-replay-contract',{status:out.status,events:out.body.events?.length||0,states:out.body.states?.length||0});}
 const note=data.notes.find(n=>n.current&&n.snapshot);if(note)assert(note.snapshot.patternId===(note.replaySnapshot?.patternId||note.patternId)&&JSON.stringify(note.snapshot.config)===JSON.stringify(note.replaySnapshot?.config||note.state?.config||note.config),'note-keeps-recorded-pattern-and-config',{pattern:note.snapshot.patternId,frame:note.snapshot.frame});
 const old=await request('setka-standalone-v34',{action:'admin-overview',adminKey});assert(old.status===200&&old.body.devices?.length>0,'old-admin-api-preserved',{devices:old.body.devices?.length||0});
 const community=await request('setka-admin-community-v38',{action:'feed',adminKey});assert(community.status===200&&community.body.ok,'existing-community-and-moderation-feed',{patterns:community.body.patterns?.length||0,pending:community.body.moderation?.length||0});
 assert(data.physio.every(x=>x.quality!=='simulated'&&!String(x.sourceType||'').includes('demo')),'simulated-physiology-excluded',{excluded:data.excludedSimulatedPhysio});
 assert(data.experiments.length===0&&data.experimentRevisions.length===0,'no-synthetic-experiments-created');
 assert(data.sources.every(s=>s.ok&&!s.truncated),'all-sources-complete',{problems:data.sources.filter(s=>!s.ok||s.truncated).map(s=>s.key)});
 const periods=['2026-10-01T00:00:00+04:00','2026-08-01T00:00:00+04:00'];for(const from of periods){const p=sliceData(data,{scope:'current',from,to:'2026-11-01T00:00:00+04:00'});assert(p.sessions.every(s=>Date.parse(s.startedAt)>=Date.parse(from)),'period-filter',{from,records:p.sessions.length});}
}
console.log(JSON.stringify({checkedAt:new Date().toISOString(),allPassed:checks.every(c=>c.pass),checks},null,2));
if(checks.some(c=>!c.pass))process.exitCode=1;
