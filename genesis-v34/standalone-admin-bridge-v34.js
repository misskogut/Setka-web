(() => {
  "use strict";

  const SANDBOX_API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-standalone-v34";
  const API_KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const nativeFetch=window.fetch.bind(window);
  const TARGETS=["setka-research-api","setka-research-extensions","setka-research-v5","setka-journey","setka-guest-v11","setka-sensors-v13"];
  const SUBJECT_ID="prototype-v34-yulia";
  const SUBJECT_CODE="ЮЛЯ";
  let cache=null,cacheAt=0,loading=null;

  const arr=v=>Array.isArray(v)?v:[];
  const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
  const iso=v=>{try{return new Date(v||Date.now()).toISOString()}catch(_){return new Date().toISOString()}};
  const day=v=>{try{return new Date(v).toISOString().slice(0,10)}catch(_){return""}};
  const json=(body,status=200)=>Promise.resolve(new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":"*"}}));
  const sid=(deviceId,sessionId)=>`pv34::${deviceId}::${sessionId}`;
  const splitSid=value=>{const s=String(value||"");if(!s.startsWith("pv34::"))return null;const parts=s.split("::");return parts.length>=3?{deviceId:parts[1],sessionId:parts.slice(2).join("::")}:null};

  async function sandbox(action,adminKey,payload={}){
    const r=await nativeFetch(SANDBOX_API,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify({action,adminKey,...payload})});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(d.error||"request_failed"),{status:r.status,data:d});return d;
  }

  async function load(adminKey,force=false){
    if(!force&&cache&&Date.now()-cacheAt<2500)return cache;
    if(loading)return loading;
    loading=(async()=>{
      const o=await sandbox("admin-overview",adminKey),devices=o.devices||[];
      const details=await Promise.all(devices.map(d=>sandbox("admin-device",adminKey,{deviceId:d.device_id}).catch(()=>null)));
      const snapshots=details.filter(Boolean);
      const sessions=[],events=[],notes=[],symptoms=[],checkins=[],physio=[],invites=[],community=[];
      for(const d of snapshots){
        const deviceId=d.device.device_id,p=d.snapshot?.payload||{};
        for(const x of arr(p.sessions))sessions.push({...x,_deviceId:deviceId,_sid:sid(deviceId,x.id)});
        for(const x of arr(p.events))events.push({...x,_deviceId:deviceId});
        for(const x of arr(p.notes))notes.push({...x,_deviceId:deviceId});
        for(const x of arr(p.symptoms))symptoms.push({...x,_deviceId:deviceId});
        for(const x of arr(p.checkins))checkins.push({...x,_deviceId:deviceId});
        for(const x of arr(p.physio?.samples))physio.push({...x,_deviceId:deviceId});
        for(const x of arr(p.invites))invites.push({...x,_deviceId:deviceId});
        for(const x of arr(p.localCommunity))community.push({...x,_deviceId:deviceId});
      }
      sessions.sort((a,b)=>Date.parse(b.startedAt||0)-Date.parse(a.startedAt||0));
      events.sort((a,b)=>Date.parse(a.wallAt||0)-Date.parse(b.wallAt||0));notes.sort((a,b)=>Date.parse(b.observedAt||0)-Date.parse(a.observedAt||0));
      checkins.sort((a,b)=>Date.parse(a.observedAt||0)-Date.parse(b.observedAt||0));physio.sort((a,b)=>Date.parse(a.observedAt||0)-Date.parse(b.observedAt||0));
      cache={devices,snapshots,sessions,events,notes,symptoms,checkins,physio,invites,community};cacheAt=Date.now();loading=null;return cache;
    })();return loading;
  }

  function participant(d){
    const days=new Set(d.sessions.map(s=>day(s.startedAt)).filter(Boolean));
    const first=d.devices.map(x=>x.first_seen_at).filter(Boolean).sort()[0]||null,last=d.devices.map(x=>x.last_seen_at).filter(Boolean).sort().at(-1)||null;
    return{id:SUBJECT_ID,access_code:SUBJECT_CODE,label:"Юля",active:true,bound:d.devices.length>0,device_hash:d.devices.length?"sandbox-multi-browser":null,bound_at:first,created_at:first,last_seen_at:last,sessionCount:d.sessions.length,activeDays:days.size,symptomCount:d.symptoms.filter(x=>x.active!==false).length,inviteCount:d.invites.length,profile:null};
  }
  function sessionRow(s){return{id:s._sid,participant_id:SUBJECT_ID,device_hash:s._deviceId,started_at:s.startedAt,local_started_at:s.startedAt,ended_at:s.endedAt,last_seen_at:s.endedAt||s.startedAt,app_version:"standalone-v34",request_key:s.requestKey,pre_state:s.preState,post_state:s.postState,helped:s.helped,feedback_at:s.feedbackSubmittedAt,active_ms:num(s.measuredActiveMs),completed:!!s.completed,research_started:true,planned_duration_seconds:num(s.plannedSeconds)||null,timer_started_at:s.startedAt,timer_deadline_at:s.deadlineAt,feedback_prompted_at:s.feedbackPromptedAt,feedback_submitted_at:s.feedbackSubmittedAt,feedback_delay_ms:s.feedbackDelayMs,measured_active_ms:num(s.measuredActiveMs),continued_after_feedback:!!s.continuedAfterFeedback,continuation_started_at:s.continuationStartedAt,continuation_ended_at:s.continuationEndedAt,after_feedback_active_ms:num(s.afterFeedbackActiveMs),completion_reason:s.completionReason,participants:{id:SUBJECT_ID,access_code:SUBJECT_CODE,label:"Юля"}}}
  function findSession(d,id){const p=splitSid(id);return p?d.sessions.find(s=>s._deviceId===p.deviceId&&String(s.id)===String(p.sessionId)):null}
  function forSession(d,s){return d.events.filter(e=>e._deviceId===s._deviceId&&String(e.sessionId||"")===String(s.id)).sort((a,b)=>(num(a.tMs,Infinity)-num(b.tMs,Infinity))||(Date.parse(a.wallAt)-Date.parse(b.wallAt)))}
  function checkinsForSession(d,s){return d.checkins.filter(c=>c._deviceId===s._deviceId&&String(c.sessionId||"")===String(s.id))}
  function symptomName(d,deviceId,id){return d.symptoms.find(s=>s._deviceId===deviceId&&String(s.id)===String(id))?.name||"Симптом"}

  function originalEvent(e){
    const map={pattern_open:"pattern_open",favorite_save:"favorite_save",favorite_remove:"favorite_remove",color:"color_change",instructions_open:"instructions_open",feedback_submit:"session_feedback",library_page:"library_page"};
    return{id:e.id,session_id:e.sessionId,event_type:map[e.type]||e.type,t_ms:num(e.tMs),payload:e.payload||{},created_at:e.wallAt};
  }
  function appStateEvents(ev){
    const out=[];for(const e of ev){const st=e.payload?.state;if(!st?.config)continue;out.push({id:`state-${e.id}`,event_type:"app_state",t_ms:num(e.tMs),payload:st,created_at:e.wallAt})}return out;
  }
  function sessionDetail(d,s){
    const ev=forSession(d,s),states=appStateEvents(ev),events=[...ev.map(originalEvent),...states].sort((a,b)=>a.t_ms-b.t_ms),usage=arr(s.usage).map(u=>({pattern_id:u.patternId||"tentacle-orbit",community_config_id:u.communityConfigId||null,config_hash:u.configKey||null,started_ms:num(u.startedMs),ended_ms:num(u.endedMs),duration_ms:num(u.durationMs),saved:!!u.saved}));
    return{session:sessionRow(s),events,snapshots:states.map(x=>({t_ms:x.t_ms,app_state:x.payload})),usage};
  }

  function symptomGroups(d){
    const byName=new Map();
    for(const s of d.symptoms){const key=(s.name||"Симптом").trim().toLowerCase();if(!byName.has(key))byName.set(key,{name:s.name||"Симптом",ids:[]});byName.get(key).ids.push([s._deviceId,s.id])}
    const out=[];for(const g of byName.values()){
      const pts=d.checkins.filter(c=>g.ids.some(([dev,id])=>dev===c._deviceId&&String(id)===String(c.symptomId))),vals=pts.map(x=>num(x.intensity)),pairs=[];
      for(const s of d.sessions){const pre=pts.find(x=>x._deviceId===s._deviceId&&String(x.sessionId||"")===String(s.id)&&x.phase==="pre"),post=pts.find(x=>x._deviceId===s._deviceId&&String(x.sessionId||"")===String(s.id)&&x.phase==="post");if(pre&&post)pairs.push(num(pre.intensity)-num(post.intensity))}
      out.push({name:g.name,trackers:1,count:pts.length,avgIntensity:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0,peak:vals.length?Math.max(...vals):0,avgSessionDrop:pairs.length?pairs.reduce((a,b)=>a+b,0)/pairs.length:0,improvedSessions:pairs.filter(x=>x>0).length,unchangedSessions:pairs.filter(x=>x===0).length,worsenedSessions:pairs.filter(x=>x<0).length});
    }return out;
  }
  function participantSymptoms(d){
    return symptomGroups(d).map(g=>{const ids=d.symptoms.filter(s=>s.name===g.name).map(s=>[s._deviceId,s.id]),history=d.checkins.filter(c=>ids.some(([dev,id])=>dev===c._deviceId&&String(id)===String(c.symptomId))).map(c=>({observed_at:c.observedAt,intensity:c.intensity,phase:c.phase})).sort((a,b)=>Date.parse(a.observed_at)-Date.parse(b.observed_at)),last=history.at(-1);return{name:g.name,lastCheckin:last?{intensity:last.intensity,observed_at:last.observed_at}:null,checkinCount:history.length,history,summary:{count:g.count,avgIntensity:g.avgIntensity,peak:g.peak,avgSessionDrop:g.avgSessionDrop,improvedSessions:g.improvedSessions,worsenedSessions:g.worsenedSessions}}})
  }
  function sessionSymptoms(d,s){return checkinsForSession(d,s).filter(x=>x.phase==="pre"||x.phase==="post").map(x=>({phase:x.phase,intensity:x.intensity,participant_symptoms:{name:symptomName(d,x._deviceId,x.symptomId)}}))}

  function overview(d){
    const completed=d.sessions.filter(s=>s.completed),deltas=completed.map(s=>num(s.postState)-num(s.preState)).filter(Number.isFinite),intents={};for(const s of d.sessions){const k=s.requestKey||"none",r=intents[k]||(intents[k]={sessions:0,completed:0,improved:0,deltaSum:0});r.sessions++;if(s.completed&&s.preState!=null&&s.postState!=null){const delta=num(s.postState)-num(s.preState);r.completed++;r.deltaSum+=delta;if(delta>0)r.improved++}}
    return{participants:d.devices.length?1:0,sessions:d.sessions.length,returners:d.sessions.length>1?1:0,completed:completed.length,symptomCheckins:d.checkins.length,inviteTotal:d.invites.length,inviteActivated:d.invites.filter(x=>x.activatedAt).length,activeMs:d.sessions.reduce((a,s)=>a+num(s.measuredActiveMs),0),avgDelta:deltas.length?deltas.reduce((a,b)=>a+b,0)/deltas.length:0,symptomTrackers:d.symptoms.filter(x=>x.active!==false).length,intents};
  }

  function noteRows(d){return d.notes.map(n=>({id:n.id,participant_id:SUBJECT_ID,session_id:n.sessionId?sid(n._deviceId,n.sessionId):null,note_text:n.text,phase:n.phase==="free"?"standalone":n.phase,observed_at:n.observedAt,local_offset_minutes:n.localOffsetMinutes,session_elapsed_ms:n.sessionElapsedMs,request_key:n.requestKey,pattern_id:n.patternId,pattern_version:n.patternVersion,source_type:n.sourceType,source_id:n.sourceId,community_config_id:null,config_hash:n.configHash,config:n.config||n.state?.config||{},preview_frame:n.frame??n.state?.frame??44,participants:{id:SUBJECT_ID,access_code:SUBJECT_CODE,label:"Юля"}}))}
  function timingRows(d){return d.sessions.map(s=>({...sessionRow(s),participant_id:SUBJECT_ID,participants:{id:SUBJECT_ID,access_code:SUBJECT_CODE,label:"Юля"}}))}

  function journeyEvents(d,s){
    const ev=forSession(d,s),out=[];const add=(e,type,payload)=>out.push({id:e.id,event_type:type,t_ms:num(e.tMs),payload:payload||{},created_at:e.wallAt});
    for(const e of ev){const p=e.payload||{};switch(e.type){case"screen":case"session_screen":add(e,"journey_screen",{screen:screenKey(p.title,p.kicker),title:p.title||"",page:p.page||""});break;case"session_view":add(e,"journey_screen",{screen:p.view==="game"?"gameplay":p.view==="library"?"library":p.view||"research"});break;case"session_library_page":case"library_page":add(e,"journey_screen",{screen:"library",page:p.page||"all"});break;case"pattern_open":add(e,"journey_pattern_open",p);break;case"session_choice":add(e,"journey_session_choice",p);break;case"gesture_start":add(e,"journey_gesture_start",p);break;case"pattern_state":add(e,"journey_pattern_state",p);break;case"color":add(e,"journey_color",p);break;case"favorite_save":add(e,"journey_favorite_save",p);break;case"favorite_remove":add(e,"journey_favorite_remove",p);break;case"note_create":add(e,"journey_note_create",p);break;case"visibility":add(e,"journey_visibility",p);break;case"ui_tap":add(e,"journey_ui_action",{action:p.targetId||p.tag||"tap",page:p.view});break;case"exit":add(e,"journey_exit",p);break;default:break}}
    return out.sort((a,b)=>a.t_ms-b.t_ms);
  }
  function screenKey(title,kicker){const s=`${title||""} ${kicker||""}`.toLowerCase();if(s.includes("симптом"))return"symptoms";if(s.includes("замет"))return"notes";if(s.includes("инвай"))return"invites";if(s.includes("перед")||s.includes("начать сес"))return"pre_session";if(s.includes("оцен"))return"post_session";if(s.includes("готов")||s.includes("результ"))return"session_result";if(s.includes("сегодня"))return"today";return"research"}
  function journeySession(d,s){const ev=journeyEvents(d,s),screens=ev.filter(x=>x.event_type==="journey_screen"),choices=ev.filter(x=>x.event_type==="journey_session_choice").map(x=>x.payload?.choice).filter(Boolean);return{...sessionRow(s),participants:{id:SUBJECT_ID,access_code:SUBJECT_CODE,label:"Юля"},journeyEventCount:ev.length,journeyDurationMs:ev.length?Math.max(...ev.map(x=>num(x.t_ms))):0,patternOpens:ev.filter(x=>x.event_type==="journey_pattern_open").length,sessionChoices:choices,screenCount:new Set(screens.map(x=>`${x.payload?.screen}:${x.payload?.page||""}`)).size}}

  function communityRows(d){const seen=new Map();for(const x of d.community){const k=x.configKey||JSON.stringify(x.config||{});if(!seen.has(k))seen.set(k,{id:x.id,pattern_id:"tentacle-orbit",pattern_version:1,config_hash:k,config:x.config||{},preview_frame:x.previewFrame??44,saveCount:num(x.saveCount,1),created_at:x.createdAt,created_by:SUBJECT_ID});else seen.get(k).saveCount=Math.max(seen.get(k).saveCount,num(x.saveCount,1))}return[...seen.values()]}

  function sensorStreams(d){
    const groups=new Map();for(const p of d.physio.filter(x=>x.metric==="heart_rate")){const key=`${p._deviceId}|${p.sourceType||"source"}|${p.deviceName||"device"}|${p.sessionId||"free"}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p)}
    return[...groups.entries()].map(([key,samples],i)=>{samples.sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt));const vals=samples.map(x=>num(x.value)),first=samples[0],last=samples.at(-1),s=first.sessionId?d.sessions.find(x=>x._deviceId===first._deviceId&&String(x.id)===String(first.sessionId)):null;return{id:`pv34-stream-${i}-${btoa(unescape(encodeURIComponent(key))).replace(/[^a-z0-9]/gi,"").slice(0,16)}`,participant_id:SUBJECT_ID,session_id:s? s._sid:null,guest_archive_id:null,guest_session_id:null,source_type:first.sourceType||"heart_rate",device_name:first.deviceName||first.sourceType||"sensor",metric:"heart_rate",unit:first.unit||"bpm",started_at:first.observedAt,ended_at:last.observedAt,last_sample_at:last.observedAt,status:"stopped",sample_count:samples.length,min_value:vals.length?Math.min(...vals):null,max_value:vals.length?Math.max(...vals):null,avg_value:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null,_samples:samples,_session:s,participant:{id:SUBJECT_ID,access_code:SUBJECT_CODE,label:"Юля"},session:s?sessionRow(s):null}}
  }

  async function route(url,body){
    const action=String(body.action||""),adminKey=String(body.adminKey||"");let d;
    try{d=await load(adminKey,action==="admin-check")}catch(e){return json({error:e.data?.error||e.message},e.status||500)}
    if(action==="admin-check")return json({ok:true});
    if(action==="admin-overview-v4")return json({overview:overview(d)});
    if(action==="admin-participants-v4")return json({participants:d.devices.length?[participant(d)]:[]});
    if(action==="admin-sessions-v4")return json({sessions:d.sessions.map(sessionRow)});
    if(action==="admin-symptoms")return json({items:symptomGroups(d)});
    if(action==="admin-invites")return json({items:d.invites.map(x=>({id:x.id,participant_id:SUBJECT_ID,code:x.code,created_at:x.createdAt,activated_at:x.activatedAt,status:x.status,participants:{access_code:SUBJECT_CODE,label:"Юля"}}))});
    if(action==="admin-participant-symptoms")return json({items:participantSymptoms(d)});
    if(action==="admin-session-symptoms"){const s=findSession(d,body.sessionId);return json({items:s?sessionSymptoms(d,s):[]})}
    if(action==="admin-session"){const s=findSession(d,body.sessionId);return s?json(sessionDetail(d,s)):json({error:"session_not_found"},404)}
    if(action==="admin-notes")return json({items:noteRows(d)});
    if(action==="admin-session-timing")return json({items:timingRows(d)});
    if(action==="admin-journey-sessions")return json({items:d.sessions.map(s=>journeySession(d,s))});
    if(action==="admin-journey"){const s=findSession(d,body.sessionId);return s?json({session:journeySession(d,s),events:journeyEvents(d,s)}):json({error:"session_not_found"},404)}
    if(action==="admin-insights"){
      const by={};for(const s of d.sessions){const k=s.requestKey||"none",r=by[k]||(by[k]={request_key:k,sessions:0,completed:0,improved:0,delta_sum:0});r.sessions++;if(s.completed&&s.preState!=null&&s.postState!=null){const delta=num(s.postState)-num(s.preState);r.completed++;r.delta_sum+=delta;if(delta>0)r.improved++}}return json({insights:Object.values(by)});
    }
    if(action==="admin-community")return json({items:communityRows(d)});
    if(action==="admin-guest-overview")return json({overview:{trials:0,withSessions:0,completedSessions:0,idAttempts:0,converted:0,conversionRate:0,sessionConversionRate:0}});
    if(action==="admin-guest-trials")return json({items:[]});
    if(action==="admin-guest-trial")return json({error:"not_found"},404);
    if(action==="admin-overview"&&url.includes("setka-sensors-v13")){const streams=sensorStreams(d);return json({overview:{streams:streams.length,live:0,samples:d.physio.filter(x=>x.metric==="heart_rate").length,devices:new Set(streams.map(x=>x.device_name)).size,converted:streams.length},items:streams.map(({_samples,_session,...x})=>x)})}
    if(action==="admin-stream"&&url.includes("setka-sensors-v13")){const streams=sensorStreams(d),r=streams.find(x=>x.id===body.streamId);if(!r)return json({error:"not_found"},404);const markers=r._session?forSession(d,r._session).filter(e=>["pattern_open","favorite_save","note_create","color","session_start","session_end"].includes(e.type)).map(e=>({type:e.type,observedAt:e.wallAt,payload:e.payload||{}})):[];return json({stream:r,samples:r._samples.map(x=>({observed_at:x.observedAt,value:x.value,unit:x.unit,quality:x.quality,payload:x.payload||{}})),markers,participant:{id:SUBJECT_ID,access_code:SUBJECT_CODE,label:"Юля"},session:r._session?sessionRow(r._session):null})}
    if(action==="admin-reset-device"||action==="admin-toggle-active")return json({ok:true});
    if(action==="admin-create-code")return json({error:"sandbox_read_only"},409);
    return json({items:[],overview:{},ok:true});
  }

  window.fetch=async function(input,init={}){
    const url=typeof input==="string"?input:input?.url||"";
    if(!TARGETS.some(x=>url.includes(`/functions/v1/${x}`)))return nativeFetch(input,init);
    let body={};try{body=typeof init.body==="string"?JSON.parse(init.body):{}}catch(_){}
    return route(url,body);
  };
  window.__SETKA_SANDBOX_ADMIN_BRIDGE_V34__=true;
})();