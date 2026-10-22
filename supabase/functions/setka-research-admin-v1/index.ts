// Reuses the existing admin_keys authentication contract. No new login flow.
// Read-only product analytics. Explicit research-plan edits use a service-only transaction.
// Moderation is delegated to the existing API; no experiment assigns real participants.
import { buildData, replayCoverage, ARRAY, num, time } from './model.mjs';
import { recordedStates } from './replay-model.mjs';
import {loadManifest,catalogRows,assertConfiguration} from '../_shared/pattern-catalog.mjs';
import {issueInvites} from './invites.mjs';
const URL_BASE = Deno.env.get('SUPABASE_URL') || '';
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ORIGIN = 'https://misskogut.github.io';
const HEADERS = { 'Access-Control-Allow-Origin':ORIGIN, 'Access-Control-Allow-Headers':'content-type,apikey,authorization',
  'Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store',
  'Vary':'Origin','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer' };
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
async function read(table:string,select:string,filters:Record<string,string>={},limit=100000,order='') {
  const result:any[]=[];let truncated=false;
  for(let offset=0;offset<limit;offset+=1000){
    const url=new URL(`${URL_BASE}/rest/v1/${table}`);url.searchParams.set('select',select);
    for(const [k,v] of Object.entries(filters))url.searchParams.set(k,v);
    if(order)url.searchParams.set('order',order);
    url.searchParams.set('offset',String(offset));url.searchParams.set('limit',String(Math.min(1000,limit-offset)));
    const res=await fetch(url,{headers:{apikey:SERVICE,Authorization:`Bearer ${SERVICE}`},signal:AbortSignal.timeout(25000)});
    if(!res.ok)throw new Error(`source_unavailable:${table}:${res.status}`);
    const rows=await res.json();if(!Array.isArray(rows))throw new Error(`invalid_source:${table}`);
    result.push(...rows);if(rows.length<Math.min(1000,limit-offset))return {rows:result,truncated:false};
    if(offset+1000>=limit)truncated=true;
  }
  return {rows:result,truncated};
}
async function sha(v:string){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function authorized(key:unknown){if(typeof key!=='string'||!key.trim()||key.length>300)return false;const x=await read('admin_keys','id',{key_hash:`eq.${await sha(key.trim())}`,active:'eq.true'},2);return x.rows.length===1?x.rows[0].id:false;}
const SOURCES = [
  ['patternCatalog','setka_research_v1_pattern_catalog','pattern_id,title,revision,updated_at','Названия паттернов','pattern_id'],
  ['patternNameHistory','setka_research_v1_pattern_names_history','pattern_id,revision,title,created_at','История названий','pattern_id,revision'],
  ['issuedInvites','setka_research_v1_invites','*','Выданные пригласительные ID','created_at,tester_id'],
  ['inviteBatches','setka_research_v1_invite_batches','id,label,issued_by_tester_id,requested_count,created_at','Пакеты приглашений','created_at,id'],
  ['devices','prototype_v34_devices','device_id,label,subject_key,channel,first_seen_at,last_seen_at,viewport,app_version,active,updated_at','Устройства','device_id'],
  ['aliases','prototype_v34_participant_aliases','device_id,label,updated_at','Названия участников','device_id'],
  ['accounts','prototype_v40_tester_accounts','tester_id,research_subject_id,password_set_at,consent_version,consent_at,active,last_login_at,created_at,updated_at','Аккаунты тестировщиков','tester_id'],
  ['consents','prototype_v40_tester_consents','tester_id,consent_version,accepted,accepted_at,created_at','Согласия','id'],
  ['archives','prototype_v37_tester_private_archives','device_id,tester_id,schema_version,payload,favorites,captured_at,updated_at','Личные облачные архивы','device_id'],
  ['snapshots','prototype_v34_snapshots','device_id,schema_version,payload,captured_at,updated_at','Исторические снимки','device_id'],
  ['accountSessions','prototype_v41_account_sessions','tester_id,session_id,started_at,ended_at,completed,updated_at','Сессии аккаунтов','tester_id,session_id'],
  ['accountExposures','prototype_v41_account_exposures','tester_id,exposure_id,session_id,pattern_id,config_key,duration_ms,started_at,ended_at,updated_at','Просмотры аккаунтов','tester_id,exposure_id'],
  ['accountFavorites','prototype_v41_account_favorites','tester_id,config_key,pattern_id,config,saved_at,updated_at','Сохранения аккаунтов','tester_id,config_key'],
  ['deviceSessions','prototype_v34_sessions','device_id,session_id,started_at,ended_at,request_key,pre_state,post_state,helped,planned_seconds,measured_active_ms,after_feedback_active_ms,continued_after_feedback,completed,completion_reason,updated_at,session_type','Исторические сессии','device_id,session_id'],
  ['deviceExposures','prototype_v35_pattern_exposures','exposure_id,device_id,visit_id,session_id,session_type,context,request_key,pattern_id,config_key,config,source_type,source_id,community_id,started_at,ended_at,duration_ms,updated_at','Исторические просмотры','device_id,exposure_id'],
  ['deviceFavorites','prototype_v35_favorites','device_id,config_key,pattern_id,config,favorite_id,saved_at,updated_at','Исторические сохранения','device_id,config_key'],
  ['visits','prototype_v35_visits','visit_id,device_id,started_at,last_seen_at,ended_at,updated_at','Исторические визиты','device_id,visit_id'],
  ['digests','prototype_v34_replay_digests','device_id,replay_key,visit_id,kind,started_at,ended_at,duration_ms,event_count,metrics,pinned,raw_until,compacted_at,updated_at','Сводки воспроизведения','device_id,replay_key'],
  ['legacyParticipants','participants','id,access_code,label,active,created_at,last_seen_at,invited_by','Участники ранней версии','id'],
  ['legacySessions','sessions','id,participant_id,started_at,ended_at,last_seen_at,app_version,viewport,request_key,pre_state,post_state,helped,active_ms,completed,research_started,measured_active_ms,planned_duration_seconds,completion_reason','Сессии ранней версии','id'],
  ['legacyUsage','session_pattern_usage','id,participant_id,session_id,pattern_id,config_hash,duration_ms,started_ms,ended_ms,saved,created_at','Просмотры ранней версии','id'],
  ['legacyNotes','participant_notes','id,participant_id,session_id,note_text,phase,observed_at,session_elapsed_ms,request_key,pattern_id,pattern_version,config_hash,config,preview_frame,created_at','Заметки ранней версии','id'],
  ['serviceMetrics','prototype_v41_service_metrics_current','*','Общественная статистика',''],
  ['patternMetrics','prototype_v41_pattern_metrics_current','*','Общественная статистика паттернов','pattern_id'],
  ['configMetrics','prototype_v41_config_metrics_current','*','Общественная статистика конфигураций','pattern_id,config_key'],
  ['contributions','prototype_v40_pattern_contributions','id,research_subject_id,pattern_id,pattern_version,config_key,config,phase,request_key,duration_ms,saved,pre_state,post_state,helped,completed,daypart,heart_rate_avg,heart_rate_samples,participation_weight,created_at,updated_at','Обезличенные исследовательские наблюдения','id'],
  ['diagnostics','prototype_v40_client_diagnostics','id,tester_id,build,kind,code,screen,online,created_at','Ошибки синхронизации','id'],
  ['experiments','setka_research_v1_experiments','*','Планы экспериментов','id'],
  ['experimentRevisions','setka_research_v1_experiment_revisions','experiment_id,revision,content,decision,created_at','История планов экспериментов','experiment_id,revision'],
  ['publicNotes','prototype_v36_public_notes','id,author_tester_id,note_text,pattern_id,pattern_version,config_key,config,preview_frame,created_at,updated_at,submitted_at,moderated_at,published_at,is_public,moderation_status,moderation_reason','Публикации и решения','id']
];
async function overview(){
  const raw:Record<string,unknown>={},statuses:any[]=[];
  // Limit simultaneous DB reads; private content is kept in this request only.
  for(let start=0;start<SOURCES.length;start+=6){
    await Promise.all(SOURCES.slice(start,start+6).map(async([key,table,select,label,order])=>{
      try { const r=await read(table,select,table==='prototype_v34_devices'?{channel:'eq.yulia_lab_v34'}:{},100000,order);
        raw[key]=r.rows;statuses.push({key,table,label,ok:true,count:r.rows.length,truncated:r.truncated,updatedAt:new Date().toISOString()});
      }catch(_){raw[key]=[];statuses.push({key,table,label,ok:false,count:null,truncated:false,updatedAt:new Date().toISOString()});}
    }));
  }
  // Without these sources no current KPI is admissible.
  if(['accounts','accountSessions','accountExposures','accountFavorites'].some(k=>statuses.find(s=>s.key===k)?.ok!==true))
    return reply({error:'core_data_unavailable',sources:statuses},503);
  return reply({ok:true,data:buildData(raw,statuses)});
}
function validId(v:unknown,max=220){return typeof v==='string'&&v.length>0&&v.length<=max&&!/[\u0000-\u001f]/.test(v);}
async function rpc(name:string,args:any){
 const res=await fetch(`${URL_BASE}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:SERVICE,Authorization:`Bearer ${SERVICE}`,'Content-Type':'application/json'},body:JSON.stringify(args)});
 const out=await res.json();if(!res.ok)throw new Error(out.message||'write_failed');return out;
}
let manifestCache:any=null,manifestAt=0,manifestTask:Promise<any>|null=null;
async function catalogManifest(){
 if(manifestCache&&Date.now()-manifestAt<60000)return manifestCache;
 if(manifestTask)return manifestTask;
 manifestTask=(async()=>{
  const manifest=await loadManifest();
  const existing=await read('setka_research_v1_pattern_catalog','pattern_id',{},1000),known=new Set(existing.rows.map(x=>x.pattern_id));
  const missing=manifest.patterns.filter((p:any)=>!known.has(p.id)).map((p:any)=>({pattern_id:p.id,title:p.title,revision:1}));
  if(missing.length){const res=await fetch(`${URL_BASE}/rest/v1/setka_research_v1_pattern_catalog?on_conflict=pattern_id`,{
   method:'POST',headers:{apikey:SERVICE,Authorization:`Bearer ${SERVICE}`,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(missing)});
   if(!res.ok)throw Error('catalog_registration_failed');}
  manifestCache=manifest;manifestAt=Date.now();return manifest;
 })().finally(()=>{manifestTask=null});return manifestTask;
}
async function catalog(){
 let manifest=null;try{manifest=await catalogManifest()}catch(_){}
 const names=await read('setka_research_v1_pattern_catalog','pattern_id,title,revision,updated_at',{},1000,'pattern_id');
 const defaults=await read('setka_pattern_defaults_v2','pattern_id,pattern_version,schema_version,config,revision,updated_at',{},1000,'pattern_id');
 // DB catalogue retains retired titles for forensic history; public/editable
 // selectors must never resurrect them when the active manifest is missing.
 const active=new Set((manifest?.patterns||[]).map((p:any)=>p.id));
 return {ok:true,items:manifest?catalogRows(manifest,names.rows):[],
  defaults:defaults.rows.filter((row:any)=>active.has(row.pattern_id)),
  registryRevision:manifest?.registryRevision||null,registryAvailable:!!manifest,updatedAt:new Date().toISOString()};
}
async function savePatternDefaults(b:any,adminId:string){
 try{
  const manifest=await catalogManifest(),p=manifest.patterns.find((p:any)=>p.id===b.patternId);
  if(!p)return reply({error:'unknown_pattern'},400);
  if(!Number.isInteger(b.expectedRevision)||b.expectedRevision<0||b.patternVersion!==p.version||b.schemaVersion!==p.schemaVersion)return reply({error:'unsupported_version'},409);
  assertConfiguration(p,b.config);
  return reply({ok:true,item:await rpc('setka_save_pattern_defaults_v2',{p_pattern_id:p.id,p_pattern_version:p.version,
   p_schema_version:p.schemaVersion,p_config:b.config,p_expected_revision:b.expectedRevision,p_admin_key_id:adminId})});
 }catch(e){const code=String(e.message);return reply({error:code==='revision_conflict'?code:code.startsWith('invalid_')||code==='unknown_parameter'?code:'configuration_save_failed'},code==='revision_conflict'?409:400)}
}
async function renamePattern(b:any,adminId:string){
 const title=String(b.title||'').trim();if(!validId(b.patternId,100)||!title||title.length>80||/[\u0000-\u001f]/.test(title)||!Number.isInteger(b.expectedRevision))return reply({error:'invalid_title'},400);
 try{const manifest=await catalogManifest();
  if(!manifest.patterns.some((p:any)=>p.id===b.patternId))return reply({error:'unknown_pattern'},400);
  return reply({ok:true,item:await rpc('setka_research_v1_rename_pattern',{p_pattern_id:b.patternId,p_title:title,p_expected_revision:b.expectedRevision,p_admin_key_id:adminId})});}
 catch(e){return reply({error:e.message==='revision_conflict'?'revision_conflict':'rename_failed'},e.message==='revision_conflict'?409:503);}
}
function normalEvent(x:any,start:any,participantId:string){
  const at=x.wall_at||x.created_at||x.wallAt;
  const offset=num(x.t_ms??x.tMs);const relative=offset!==null?offset:(time(at)!==null&&time(start)!==null?Math.max(0,time(at)!-time(start)!):null);
  return {id:String(x.event_id||x.id||''),type:x.type||x.event_type,tMs:relative,wallAt:at,participantId,payload:x.payload||{},source:x.source||'recorded-event'};
}
async function replay(b:any){
  const kind=b.kind==='legacy'?'legacy':'device';
  if(kind==='legacy'){
    if(!validId(b.sessionId,80))return reply({error:'invalid_selection'},400);
    const [s,ev,st]=await Promise.all([read('sessions','id,participant_id,started_at,ended_at,last_seen_at,app_version,viewport,request_key,pre_state,post_state,completed',{id:`eq.${b.sessionId}`},1),
      read('session_events','id,t_ms,event_type,payload,created_at',{session_id:`eq.${b.sessionId}`},100000,'t_ms,id'),
      read('session_snapshots','id,t_ms,app_state,created_at',{session_id:`eq.${b.sessionId}`},100000,'t_ms,id')]);
    if(!s.rows.length)return reply({error:'record_not_found'},404);
    const session=s.rows[0],events=ev.rows.map(x=>normalEvent(x,session.started_at,`legacy:${session.participant_id}`)),states=[...recordedStates(events),...st.rows.map(x=>({tMs:x.t_ms,state:x.app_state,source:'session-snapshot'}))].sort((a,b)=>a.tMs-b.tMs);
    return reply({ok:true,session,events,states,coverage:replayCoverage({events,states,truncated:ev.truncated||st.truncated}),truncated:ev.truncated||st.truncated,durationMs:Math.max(0,(time(session.ended_at||session.last_seen_at)||0)-(time(session.started_at)||0))});
  }
  if(!validId(b.deviceId)||(!validId(b.sessionId)&&!validId(b.replayKey,500)))return reply({error:'invalid_selection'},400);
  const filters:Record<string,string>={device_id:`eq.${b.deviceId}`};
  if(b.replayKey)filters.replay_key=`eq.${b.replayKey}`;else filters.session_id=`eq.${b.sessionId}`;
  const [ev,dg,idx,snapshot,ar]=await Promise.all([
    read('prototype_v34_raw_events_all_v2','event_id,type,wall_at,visit_id,session_id,t_ms,payload,replay_key',filters,100000,'wall_at,event_id'),
    read('prototype_v34_replay_digests','*',{device_id:`eq.${b.deviceId}`,...(b.replayKey?{replay_key:`eq.${b.replayKey}`}:{kind:'eq.session'})},10000,'started_at,replay_key'),
    b.sessionId?read('prototype_v34_sessions','*',{device_id:`eq.${b.deviceId}`,session_id:`eq.${b.sessionId}`},1):Promise.resolve({rows:[],truncated:false}),
    read('prototype_v34_snapshots','payload',{device_id:`eq.${b.deviceId}`},1),
    read('prototype_v37_tester_private_archives','tester_id,payload',{device_id:`eq.${b.deviceId}`},1)
  ]);
  const payloads=[...snapshot.rows,...ar.rows].map(x=>x.payload||{});
  const ss=payloads.flatMap(p=>ARRAY(p.sessions)).find(x=>String(x.id)===String(b.sessionId));
  const session=idx.rows[0]||ss||null;
  const dig=b.replayKey?dg.rows.find(x=>x.replay_key===b.replayKey):dg.rows.find(x=>x.replay_key===`pv34::${b.deviceId}::${b.sessionId}`||String(x.replay_key).endsWith(`::${b.sessionId}`));
  const start=session?.started_at||session?.startedAt||dig?.started_at||ev.rows[0]?.wall_at||null;
  const map=new Map();
  for(const p of payloads)for(const x of ARRAY(p.events)){
    if(b.sessionId?String(x.sessionId||'')===String(b.sessionId):String(x.replayKey||'')===String(b.replayKey))map.set(String(x.id),{...x,source:'archive-event'});
  }
  for(const x of ev.rows)map.set(String(x.event_id),x);
  const events=[...map.values()].map(x=>normalEvent(x,start,b.deviceId)).sort((a,b)=>(a.tMs??Infinity)-(b.tMs??Infinity));
  const states=recordedStates(events,payloads.flatMap(p=>ARRAY(p.notes)),b.sessionId);
  const durationMs=Math.max(0,num(dig?.duration_ms,0),...events.map(e=>num(e.tMs,0)),...(session?[Math.max(0,(time(session.ended_at||session.endedAt)||time(start)||0)-(time(start)||0))]:[]));
  const truncated=ev.truncated||dg.truncated;
  return reply({ok:true,session:session||{started_at:start,ended_at:dig?.ended_at},digest:dig||null,events,states,durationMs,coverage:replayCoverage({events,states,digest:dig,truncated}),truncated,
    provenance:{raw:'prototype_v34_raw_events_all_v2',containsArchivedRaw:true,initialStateKnown:states.some(x=>x.tMs===0),screenPixelsStored:false}});
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function isRegisteredPattern(id:any){
  const pid=String(id||'');if(!/^[a-z][a-z0-9-]{2,79}$/.test(pid))return false;
  const manifest=await catalogManifest();return manifest.patterns.some((p:any)=>p.id===pid);
}
async function saveExperiment(b:any,adminId:string){
  const title=String(b.title||'').trim(),hypothesis=String(b.hypothesis||'').trim();
  if(title.length<3||title.length>160||hypothesis.length<10||hypothesis.length>4000||!/^[a-z][a-z0-9-]{2,79}$/.test(String(b.patternId||''))||
    !['view_duration','completion','state_delta'].includes(b.metric)||!['draft','prepared','paused','closed'].includes(b.status)||
    !Number.isInteger(b.minimumParticipants)||b.minimumParticipants<2||b.minimumParticipants>100000||
    !Number.isInteger(b.expectedRevision)||b.expectedRevision<0||b.id&&!UUID.test(b.id)||
    !b.groupA||!b.groupB||Array.isArray(b.groupA)||Array.isArray(b.groupB)||JSON.stringify(b.groupA).length>3000||JSON.stringify(b.groupB).length>3000)
    return reply({error:'invalid_plan'},400);
  if(!await isRegisteredPattern(b.patternId))return reply({error:'unknown_pattern'},400);
  const res=await fetch(`${URL_BASE}/rest/v1/rpc/setka_research_v1_save_experiment`,{method:'POST',
    headers:{apikey:SERVICE,Authorization:`Bearer ${SERVICE}`,'Content-Type':'application/json'},
    body:JSON.stringify({p_id:b.id||null,p_expected_revision:b.expectedRevision,p_title:title,p_hypothesis:hypothesis,
      p_pattern_id:b.patternId,p_target_metric:b.metric,p_minimum_participants:b.minimumParticipants,
      p_group_a:b.groupA,p_group_b:b.groupB,p_status:b.status,p_decision:b.decision==='rollback'?'rollback':b.id?'edit':'create',p_admin_key_id:adminId})});
  const out=await res.json();if(!res.ok)return reply({error:String(out.message||'').includes('revision_conflict')?'revision_conflict':'plan_save_failed'},res.status===400?409:503);
  return reply({ok:true,item:out,runtimeAssignments:false});
}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:HEADERS});
  if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
  const origin=req.headers.get('Origin');if(origin&&origin!==ORIGIN)return reply({error:'origin_not_allowed'},403);
  if(!URL_BASE||!SERVICE)return reply({error:'server_unavailable'},503);
  if(Number(req.headers.get('Content-Length')||0)>16000)return reply({error:'request_too_large'},413);
  try{
    const text=await req.text();if(text.length>16000)return reply({error:'request_too_large'},413);
    const b=JSON.parse(text);
    // Only public display names are released here. No account or research rows.
    if(b.action==='catalog')return reply(await catalog());
    const adminId=await authorized(b.adminKey);if(!adminId)return reply({error:'invalid_admin_key'},403);
    if(b.action==='save-pattern-defaults')return await savePatternDefaults(b,adminId);
    if(b.action==='rename-pattern')return await renamePattern(b,adminId);
    if(b.action==='issue-invites'){try{return reply(await issueInvites(b,{adminId},rpc));}catch(e){const code=e.message;return reply({error:code},/invalid_|request_already_issued|batch_complete|batch_not_owned/.test(code)?409:503);}}
    if(b.action==='save-experiment')return await saveExperiment(b,adminId);
    if(b.action==='overview')return await overview();
    if(b.action==='replay')return await replay(b);
    if(b.action==='check')return reply({ok:true,projectId:'gfchgaphzhxufwdhrcis',version:'SETKA-RESEARCH-1.4.0'});
    return reply({error:'unknown_action'},400);
  }catch(e){console.error('Research read failed',e instanceof Error?e.message:'unknown');return reply({error:'data_unavailable'},503);}
});
