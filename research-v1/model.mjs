// Shared, pure data contract. The server supplies rows; this module never makes up rows.
export const VERSION = 'SETKA-RESEARCH-1.1.0';
export const ARRAY = v => Array.isArray(v) ? v : [];
export const num = (v, fallback = null) => v !== null && v !== '' && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : fallback;
export const time = v => { const t = typeof v === 'number' ? v : Date.parse(v || ''); return Number.isFinite(t) ? t : null; };
export const stamp = r => time(r.updatedAt || r.updated_at || r.observedAt || r.startedAt || r.started_at || r.saved_at) || 0;
const unique = (rows, key) => { const m = new Map(); for (const r of rows) { const k = key(r); if (!k) continue; const old = m.get(k); if (!old || stamp(r) >= stamp(old)) m.set(k, r); } return [...m.values()]; };
const dateMin = values => values.filter(v => time(v) !== null).sort((a,b) => time(a)-time(b))[0] || null;
const dateMax = values => values.filter(v => time(v) !== null).sort((a,b) => time(b)-time(a))[0] || null;
export function exactSnapshot(note) {
  // Immutable note-time state has priority over any mutable/latest device state.
  const candidates = [note?.replaySnapshot, note?.state, note?.visualRecipe, note];
  for (const s of candidates) {
    const config = s?.config, pid = s?.patternId || config?.patternId || note?.patternId;
    if (!pid || !config || !Object.keys(config).length) continue;
    return { patternId: pid, config: structuredClone(config), frame: num(s.frame ?? s.preview_frame ?? note.frame), patternVersion: num(s.patternVersion ?? note.patternVersion), configKey: s.configHash || s.configKey || note.configHash || null, rendererVersion: s.rendererVersion || note.rendererVersion || null, viewport: s.viewport || note.viewport || null, source: s === note?.replaySnapshot ? 'creation-snapshot' : 'recorded-recipe' };
  }
  return null;
}
function sessionRow(x, participantId, source, deviceId=null) {
  const sid = x.session_id || x.id;
  if (!sid) return null;
  return { ...x, id: `${participantId}::${sid}`, originalId: String(sid), participantId, deviceId,
    source, current: source === 'account', startedAt: x.started_at || x.startedAt || null,
    endedAt: x.ended_at || x.endedAt || null, updatedAt: x.updated_at || x.updatedAt,
    requestKey: x.request_key || x.requestKey || null, preState: num(x.pre_state ?? x.preState),
    postState: num(x.post_state ?? x.postState), helped: num(x.helped), completed: !!x.completed,
    sessionType: x.session_type || x.sessionType || null, measuredActiveMs: num(x.measured_active_ms ?? x.measuredActiveMs),
    plannedSeconds: num(x.planned_seconds ?? x.planned_duration_seconds ?? x.plannedSeconds),
    completionReason: x.completion_reason || x.completionReason || null };
}
function exposureRow(x, participantId, source, deviceId=null) {
  const xid=x.exposure_id || x.exposureId || x.id;
  const pid=x.pattern_id || x.patternId || x.config?.patternId;
  if (!xid || !pid) return null;
  const sid=x.session_id || x.sessionId;
  return { id:`${participantId}::${xid}`, originalId:String(xid), participantId,deviceId,source,
    current:source==='account',sessionId:sid ? `${participantId}::${sid}` : null, patternId:pid,
    configKey:x.config_key || x.configKey || null,config:x.config || null,
    startedAt:x.started_at || x.startedAt || null,endedAt:x.ended_at || x.endedAt || null,
    durationMs:num(x.duration_ms ?? x.durationMs),phase:x.context || x.phase || null,
    updatedAt:x.updated_at || x.updatedAt };
}
export function buildData(raw, sources=[], now=new Date().toISOString()) {
  const devices=ARRAY(raw.devices), accounts=ARRAY(raw.accounts), archives=ARRAY(raw.archives), snapshots=ARRAY(raw.snapshots);
  const accountIds=new Set(accounts.map(x=>x.tester_id)), aliases=new Map(ARRAY(raw.aliases).map(x=>[x.device_id,x.label]));
  const archivedDevice=new Map(archives.filter(x=>accountIds.has(x.tester_id)).map(x=>[x.device_id,x.tester_id]));
  const participantForDevice = d => {
    const row=devices.find(x=>x.device_id===d);
    const verified=archivedDevice.get(d) || (accountIds.has(row?.subject_key) ? row.subject_key : null);
    return verified ? `account:${verified}` : `device:${d}`;
  };
  const participants=new Map();
  for (const a of accounts) participants.set(`account:${a.tester_id}`,{id:`account:${a.tester_id}`,label:a.tester_id,status:'tester',current:true,
    firstAt:a.created_at,lastAt:a.last_seen_at || a.updated_at,consentVersion:a.consent_version || null,consentAt:a.consent_at || null,devices:[],source:'account',active:a.active!==false});
  devices.forEach((d,i)=>{
    const id=participantForDevice(d.device_id),old=participants.get(id);
    if(old){old.devices.push(d.device_id);old.firstAt=dateMin([old.firstAt,d.first_seen_at]);old.lastAt=dateMax([old.lastAt,d.last_seen_at]);}
    else participants.set(id,{id,label:aliases.get(d.device_id)||`Гостевое устройство ${i+1}`,status:'guest',current:false,firstAt:d.first_seen_at,lastAt:d.last_seen_at,devices:[d.device_id],source:'legacy-device',active:d.active!==false,identityNote:'Устройство не подтверждает личность человека.'});
  });
  for(const p of ARRAY(raw.legacyParticipants))participants.set(`legacy:${p.id}`,{id:`legacy:${p.id}`,label:p.label||p.access_code||'Участник ранней версии',status:'tester',current:false,firstAt:p.created_at,lastAt:p.last_seen_at,devices:[],source:'legacy-research',active:p.active!==false});
  const sessions=[],exposures=[],favorites=[],notes=[],symptoms=[],checkins=[],physio=[],invites=[],archiveEvents=[];
  const metadataSessions=new Map();
  for(const row of [...snapshots.map(x=>({...x,tester_id:archivedDevice.get(x.device_id),source:'legacy-snapshot'})),...archives.map(x=>({...x,source:'private-archive'}))]){
    const participantId=row.tester_id&&accountIds.has(row.tester_id)?`account:${row.tester_id}`:participantForDevice(row.device_id);
    const payload=row.payload||{},isCurrent=participantId.startsWith('account:');
    for(const x of ARRAY(payload.sessions)){const s=sessionRow(x,participantId,isCurrent?'account':'legacy-snapshot',row.device_id);if(s){s.metadataSource=row.source;sessions.push(s);metadataSessions.set(s.id,s);}}
    for(const x of ARRAY(payload.patternExposures)){const e=exposureRow(x,participantId,isCurrent?'account-archive':'legacy-snapshot',row.device_id);if(e)exposures.push(e);}
    for(const x of ARRAY(payload.notes)){if(!x.id)continue;notes.push({...x,id:`${participantId}::${x.id}`,originalId:x.id,participantId,deviceId:row.device_id,sessionId:x.sessionId?`${participantId}::${x.sessionId}`:null,source:row.source,current:isCurrent,observedAt:x.observedAt||null,snapshot:exactSnapshot(x)});}
    for(const x of ARRAY(row.favorites)){favorites.push({...x,id:`${participantId}::${x.configKey||x.id}`,participantId,current:isCurrent,source:row.source,patternId:x.patternId||x.baseId||x.config?.patternId,configKey:x.configKey||null,savedAt:x.savedAt||x.createdAt});}
    for(const [key,target] of [['symptoms',symptoms],['checkins',checkins],['invites',invites]])for(const x of ARRAY(payload[key]))target.push({...x,participantId,deviceId:row.device_id,source:row.source,current:isCurrent});
    for(const x of ARRAY(payload.physio?.samples))physio.push({...x,participantId,current:isCurrent,source:row.source});
    for(const x of ARRAY(payload.events))archiveEvents.push({...x,participantId,deviceId:row.device_id,source:row.source});
  }
  for(const x of ARRAY(raw.legacySessions)){const id=`legacy:${x.participant_id}`,s=sessionRow(x,id,'legacy-research');if(s){delete s.session_token_hash;sessions.push(s);}}
  for(const x of ARRAY(raw.deviceSessions)){const id=participantForDevice(x.device_id),s=sessionRow(x,id,id.startsWith('account:')?'account':'legacy-device',x.device_id);if(s)sessions.push({...s,...(metadataSessions.get(s.id)||{})});}
  for(const x of ARRAY(raw.accountSessions)){const id=`account:${x.tester_id}`,s=sessionRow(x,id,'account');if(s)sessions.push({...s,...(metadataSessions.get(s.id)||{}),source:'account',current:true});}
  // Prefer canonical account exposures; drop ALL archival exposures for an account
  // that has canonical rows, preventing differently-named legacy backfills from doubling time.
  const exposureMetadata=new Map(exposures.map(x=>[x.id,x]));
  const canonicalAccounts=new Set(ARRAY(raw.accountExposures).map(x=>`account:${x.tester_id}`));
  const kept=exposures.filter(x=>!canonicalAccounts.has(x.participantId));exposures.length=0;exposures.push(...kept);
  for(const x of ARRAY(raw.deviceExposures)){const id=participantForDevice(x.device_id);if(canonicalAccounts.has(id))continue;const e=exposureRow(x,id,'legacy-device',x.device_id);if(e)exposures.push(e);}
  for(const x of ARRAY(raw.accountExposures)){const e=exposureRow(x,`account:${x.tester_id}`,'account');if(e){const meta=exposureMetadata.get(e.id);exposures.push({...meta,...e,config:meta?.config||null,phase:meta?.phase||null});}}
  for(const x of ARRAY(raw.legacyUsage)){const sid=`legacy:${x.participant_id}::${x.session_id}`;exposures.push({id:`legacy-usage:${x.id}`,participantId:`legacy:${x.participant_id}`,sessionId:sid,source:'legacy-usage',current:false,patternId:x.pattern_id,configKey:x.config_hash,config:x.config||null,durationMs:num(x.duration_ms),startedAt:sessions.find(s=>s.id===sid)?.startedAt||null,phase:null});}
  const canonicalFavoriteAccounts=new Set((sources.some(s=>s.key==='accountFavorites'&&s.ok&&!s.truncated)?ARRAY(raw.accounts):ARRAY(raw.accountFavorites)).map(x=>`account:${x.tester_id}`));
  const favKept=favorites.filter(x=>!canonicalFavoriteAccounts.has(x.participantId));favorites.length=0;favorites.push(...favKept);
  for(const x of ARRAY(raw.accountFavorites))favorites.push({id:`account:${x.tester_id}::${x.config_key}`,participantId:`account:${x.tester_id}`,source:'account',current:true,patternId:x.pattern_id,configKey:x.config_key,config:x.config,savedAt:x.saved_at});
  for(const x of ARRAY(raw.deviceFavorites)){const id=participantForDevice(x.device_id);if(canonicalFavoriteAccounts.has(id))continue;favorites.push({id:`${id}::${x.config_key}`,participantId:id,current:false,source:'legacy-device',patternId:x.pattern_id,configKey:x.config_key,config:x.config,savedAt:x.saved_at});}
  for(const x of ARRAY(raw.legacyNotes))notes.push({...x,id:`legacy:${x.participant_id}::${x.id}`,originalId:x.id,participantId:`legacy:${x.participant_id}`,sessionId:x.session_id?`legacy:${x.participant_id}::${x.session_id}`:null,current:false,source:'legacy-research',text:x.note_text,observedAt:x.observed_at,snapshot:exactSnapshot({...x,patternId:x.pattern_id,patternVersion:x.pattern_version,frame:x.preview_frame})});
  const ds=unique(sessions,x=>x.id),es=unique(exposures,x=>x.id),fs=unique(favorites,x=>`${x.participantId}|${x.configKey||x.id}`),ns=unique(notes,x=>x.id);
  const visits=ARRAY(raw.visits).map(x=>({...x,id:`visit:${x.device_id}:${x.visit_id}`,participantId:participantForDevice(x.device_id),startedAt:x.started_at,endedAt:x.ended_at,lastAt:x.last_seen_at,current:false,source:'legacy-visit'}));
  const digests=ARRAY(raw.digests).map(x=>({...x,id:`replay:${x.device_id}:${x.replay_key}`,participantId:participantForDevice(x.device_id),source:'legacy-digest',current:false}));
  for(const p of participants.values()){
    const ss=ds.filter(s=>s.participantId===p.id),ee=es.filter(e=>e.participantId===p.id);
    p.sessionCount=ss.length;p.visitCount=visits.filter(v=>v.participantId===p.id).length;
    p.durationMs=ee.some(e=>e.durationMs!==null)?ee.reduce((n,e)=>n+(e.durationMs||0),0):null;
    p.firstAt=dateMin([p.firstAt,...ss.map(x=>x.startedAt),...ee.map(x=>x.startedAt)]);
    p.lastAt=dateMax([p.lastAt,...ss.map(x=>x.endedAt||x.startedAt),...ee.map(x=>x.endedAt||x.startedAt)]);
    const ar=archives.filter(x=>x.tester_id&&p.id===`account:${x.tester_id}`);
    p.archiveAt=dateMax(ar.map(x=>x.updated_at));p.syncState=ar.length?'cloud-archive':p.current?'no-cloud-archive':'historical';
  }
  return {version:VERSION,projectId:'gfchgaphzhxufwdhrcis',updatedAt:now,sources,
    participants:[...participants.values()],sessions:ds,exposures:es,favorites:fs,notes:ns,visits,digests,
    symptoms:unique(symptoms,x=>`${x.participantId}:${x.id}`),checkins:unique(checkins,x=>`${x.participantId}:${x.id}`),physio:unique(physio.filter(x=>x.quality!=='simulated'&&x.simulated!==true&&!String(x.sourceType||'').includes('demo')),x=>`${x.participantId}:${x.id||x.observedAt}`),excludedSimulatedPhysio:physio.filter(x=>x.quality==='simulated'||x.simulated===true||String(x.sourceType||'').includes('demo')).length,invites:unique(invites,x=>`${x.participantId}:${x.id}`),archiveEvents,
    communityMetrics:raw.serviceMetrics?.[0]||null,patternMetrics:ARRAY(raw.patternMetrics),configMetrics:ARRAY(raw.configMetrics),
    experiments:ARRAY(raw.experiments),experimentRevisions:ARRAY(raw.experimentRevisions),contributions:ARRAY(raw.contributions),consents:ARRAY(raw.consents),diagnostics:ARRAY(raw.diagnostics),publicNotes:ARRAY(raw.publicNotes),
    warnings:[{code:'guest-local-only',message:'Текущие гости хранят историю на своём устройстве. В этих показателях их использование не учтено.'},{code:'identity',message:'Исторические гостевые устройства не объединены в людей. Число устройств не равно числу людей.'},...sources.filter(s=>!s.ok||s.truncated).map(s=>({code:'source-incomplete',message:`Источник «${s.label}» ${s.truncated?'загружен не полностью':'недоступен'}.`}))]};
}
export function sliceData(data,{scope='current',from=null,to=null}={}) {
  const inScope=r=>scope==='all'||(scope==='current'?r.current:!r.current);
  const low=time(from),high=time(to);
  const inPeriod=v=>{const t=time(v);return t!==null&&(low===null||t>=low)&&(high===null||t<high);};
  const sessions=data.sessions.filter(s=>inScope(s)&&inPeriod(s.startedAt));
  const exposures=data.exposures.filter(s=>inScope(s)&&inPeriod(s.startedAt));
  const favorites=data.favorites.filter(s=>inScope(s)&&inPeriod(s.savedAt));
  const notes=data.notes.filter(s=>inScope(s)&&inPeriod(s.observedAt));
  const visits=data.visits.filter(s=>inScope(s)&&inPeriod(s.startedAt));
  const activeIds=new Set([...sessions,...exposures,...favorites,...notes,...visits].map(x=>x.participantId));
  const participants=data.participants.filter(inScope),active=participants.filter(p=>activeIds.has(p.id));
  const durations=exposures.map(x=>x.durationMs).filter(x=>x!==null&&x>=0);
  const returners=active.filter(p=>{
    const dates=new Set([...data.sessions.filter(s=>s.participantId===p.id).map(s=>s.startedAt),...data.exposures.filter(s=>s.participantId===p.id).map(s=>s.startedAt)].filter(v=>time(v)!==null).map(v=>new Date(time(v)+14400000).toISOString().slice(0,10)));
    return dates.size>1;
  });
  return {sessions,exposures,favorites,notes,visits,participants,active,returners,inPeriod,
    metrics:{active:active.length,new:participants.filter(p=>inPeriod(p.firstAt)).length,sessions:sessions.length,visits:scope==='current'?null:visits.length,
      durationMs:durations.length?durations.reduce((a,b)=>a+b,0):null,averageMs:durations.length?durations.reduce((a,b)=>a+b,0)/durations.length:null,
      returners:returners.length,completed:sessions.filter(s=>s.completed).length,configurations:new Set(favorites.map(x=>x.configKey).filter(Boolean)).size,notes:notes.length}};
}
export function replayCoverage({events=[],states=[],digest=null,truncated=false}={}) {
  if(!events.length&&!states.length)return digest?'summary':'none';
  // Full is only admissible when the recorder explicitly attests complete coverage.
  if(digest?.metrics?.coverage?.complete===true&&!truncated&&states.length&&events.length)return 'full';
  return 'partial';
}
export const median=a=>{if(!a.length)return null;const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2;};
