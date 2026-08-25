(() => {
  "use strict";

  const SANDBOX_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-standalone-v34";
  const API_KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const TARGETS = ["setka-research-api","setka-research-extensions","setka-research-v5","setka-journey","setka-guest-v11","setka-sensors-v13"];
  const SUBJECT_ID = "prototype-v34-yulia";
  const SUBJECT_CODE = "ЮЛЯ";
  const nativeFetch = window.fetch.bind(window);
  let cache = null;
  let cacheAt = 0;
  let loading = null;

  const arr = v => Array.isArray(v) ? v : [];
  const n = (v,d=0) => Number.isFinite(Number(v)) ? Number(v) : d;
  const response = (body,status=200) => new Response(JSON.stringify(body), {
    status,
    headers:{"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":"*"}
  });
  const compoundId = (deviceId,sessionId) => `pv34::${deviceId}::${sessionId}`;
  function parseCompoundId(value){
    const s = String(value || "");
    if(!s.startsWith("pv34::")) return null;
    const p = s.split("::");
    return p.length >= 3 ? {deviceId:p[1],sessionId:p.slice(2).join("::")} : null;
  }

  async function sandbox(action,adminKey,payload={}){
    const r = await nativeFetch(SANDBOX_API, {
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":API_KEY},
      body:JSON.stringify({action,adminKey,...payload})
    });
    const d = await r.json().catch(()=>({}));
    if(!r.ok){
      const e = new Error(d.error || "request_failed");
      e.status = r.status;
      e.data = d;
      throw e;
    }
    return d;
  }

  async function getAll(adminKey,force=false){
    if(!force && cache && Date.now()-cacheAt < 2500) return cache;
    if(loading) return loading;
    loading = (async()=>{
      const overview = await sandbox("admin-overview",adminKey);
      const devices = overview.devices || [];
      const details = await Promise.all(devices.map(x=>sandbox("admin-device",adminKey,{deviceId:x.device_id}).catch(()=>null)));
      const sessions=[],events=[],notes=[],symptoms=[],checkins=[],physio=[],invites=[],community=[];
      for(const detail of details.filter(Boolean)){
        const deviceId = detail.device.device_id;
        const p = detail.snapshot?.payload || {};
        for(const x of arr(p.sessions)) sessions.push({...x,_deviceId:deviceId,_compoundId:compoundId(deviceId,x.id)});
        for(const x of arr(p.events)) events.push({...x,_deviceId:deviceId});
        for(const x of arr(p.notes)) notes.push({...x,_deviceId:deviceId});
        for(const x of arr(p.symptoms)) symptoms.push({...x,_deviceId:deviceId});
        for(const x of arr(p.checkins)) checkins.push({...x,_deviceId:deviceId});
        for(const x of arr(p.physio?.samples)) physio.push({...x,_deviceId:deviceId});
        for(const x of arr(p.invites)) invites.push({...x,_deviceId:deviceId});
        for(const x of arr(p.localCommunity)) community.push({...x,_deviceId:deviceId});
      }
      sessions.sort((a,b)=>Date.parse(b.startedAt||0)-Date.parse(a.startedAt||0));
      events.sort((a,b)=>Date.parse(a.wallAt||0)-Date.parse(b.wallAt||0));
      notes.sort((a,b)=>Date.parse(b.observedAt||0)-Date.parse(a.observedAt||0));
      checkins.sort((a,b)=>Date.parse(a.observedAt||0)-Date.parse(b.observedAt||0));
      physio.sort((a,b)=>Date.parse(a.observedAt||0)-Date.parse(b.observedAt||0));
      cache = {devices,sessions,events,notes,symptoms,checkins,physio,invites,community};
      cacheAt = Date.now();
      loading = null;
      return cache;
    })();
    return loading;
  }

  function participant(d){
    const days = new Set(d.sessions.map(s=>String(s.startedAt||"").slice(0,10)).filter(Boolean));
    const first = d.devices.map(x=>x.first_seen_at).filter(Boolean).sort()[0] || null;
    const last = d.devices.map(x=>x.last_seen_at).filter(Boolean).sort().at(-1) || null;
    return {
      id:SUBJECT_ID,
      access_code:SUBJECT_CODE,
      label:"Юля",
      active:true,
      bound:d.devices.length>0,
      device_hash:d.devices.length?"sandbox-multi-browser":null,
      bound_at:first,
      created_at:first,
      last_seen_at:last,
      sessionCount:d.sessions.length,
      activeDays:days.size,
      symptomCount:d.symptoms.filter(x=>x.active!==false).length,
      inviteCount:d.invites.length,
      profile:null
    };
  }

  function sessionRow(s){
    return {
      id:s._compoundId,
      participant_id:SUBJECT_ID,
      device_hash:s._deviceId,
      started_at:s.startedAt,
      local_started_at:s.startedAt,
      ended_at:s.endedAt,
      last_seen_at:s.endedAt || s.startedAt,
      app_version:"standalone-v34",
      request_key:s.requestKey,
      pre_state:s.preState,
      post_state:s.postState,
      helped:s.helped,
      feedback_at:s.feedbackSubmittedAt,
      active_ms:n(s.measuredActiveMs),
      completed:!!s.completed,
      research_started:true,
      planned_duration_seconds:n(s.plannedSeconds)||null,
      timer_started_at:s.startedAt,
      timer_deadline_at:s.deadlineAt,
      feedback_prompted_at:s.feedbackPromptedAt,
      feedback_submitted_at:s.feedbackSubmittedAt,
      feedback_delay_ms:s.feedbackDelayMs,
      measured_active_ms:n(s.measuredActiveMs),
      continued_after_feedback:!!s.continuedAfterFeedback,
      continuation_started_at:s.continuationStartedAt,
      continuation_ended_at:s.continuationEndedAt,
      after_feedback_active_ms:n(s.afterFeedbackActiveMs),
      completion_reason:s.completionReason,
      participants:{id:SUBJECT_ID,access_code:SUBJECT_CODE,label:"Юля"}
    };
  }

  function findSession(d,id){
    const p = parseCompoundId(id);
    if(!p) return null;
    return d.sessions.find(s=>s._deviceId===p.deviceId && String(s.id)===String(p.sessionId)) || null;
  }
  function eventsForSession(d,s){
    return d.events.filter(e=>e._deviceId===s._deviceId && String(e.sessionId||"")===String(s.id)).sort((a,b)=>(n(a.tMs,1e15)-n(b.tMs,1e15)) || (Date.parse(a.wallAt)-Date.parse(b.wallAt)));
  }
  function sessionCheckins(d,s){
    return d.checkins.filter(c=>c._deviceId===s._deviceId && String(c.sessionId||"")===String(s.id));
  }
  function symptomName(d,deviceId,id){
    return d.symptoms.find(s=>s._deviceId===deviceId && String(s.id)===String(id))?.name || "Симптом";
  }

  function sessionDetail(d,s){
    const raw = eventsForSession(d,s);
    const map = {pattern_open:"pattern_open",favorite_save:"favorite_save",favorite_remove:"favorite_remove",color:"color_change",instructions_open:"instructions_open",feedback_submit:"session_feedback",library_page:"library_page"};
    const events = raw.map(e=>({id:e.id,event_type:map[e.type]||e.type,t_ms:n(e.tMs),payload:e.payload||{},created_at:e.wallAt}));
    for(const e of raw){
      const st = e.payload?.state;
      if(st?.config) events.push({id:`state-${e.id}`,event_type:"app_state",t_ms:n(e.tMs),payload:st,created_at:e.wallAt});
    }
    events.sort((a,b)=>a.t_ms-b.t_ms);
    const usage = arr(s.usage).map(u=>({
      pattern_id:u.patternId||"tentacle-orbit",
      community_config_id:u.communityConfigId||null,
      config_hash:u.configKey||null,
      started_ms:n(u.startedMs),ended_ms:n(u.endedMs),duration_ms:n(u.durationMs),saved:!!u.saved
    }));
    return {session:sessionRow(s),events,snapshots:events.filter(x=>x.event_type==="app_state").map(x=>({t_ms:x.t_ms,app_state:x.payload})),usage};
  }

  function symptomAggregates(d){
    const groups = new Map();
    for(const s of d.symptoms){
      const key = String(s.name||"Симптом").trim().toLowerCase();
      if(!groups.has(key)) groups.set(key,{name:s.name||"Симптом",ids:[]});
      groups.get(key).ids.push([s._deviceId,s.id]);
    }
    const out=[];
    for(const g of groups.values()){
      const pts = d.checkins.filter(c=>g.ids.some(([dev,id])=>dev===c._deviceId && String(id)===String(c.symptomId)));
      const vals = pts.map(x=>n(x.intensity));
      const pairs=[];
      for(const s of d.sessions){
        const pre = pts.find(x=>x._deviceId===s._deviceId && String(x.sessionId||"")===String(s.id) && x.phase==="pre");
        const post = pts.find(x=>x._deviceId===s._deviceId && String(x.sessionId||"")===String(s.id) && x.phase==="post");
        if(pre&&post) pairs.push(n(pre.intensity)-n(post.intensity));
      }
      out.push({
        name:g.name,trackers:1,count:pts.length,
        avgIntensity:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0,
        peak:vals.length?Math.max(...vals):0,
        avgSessionDrop:pairs.length?pairs.reduce((a,b)=>a+b,0)/pairs.length:0,
        improvedSessions:pairs.filter(x=>x>0).length,
        unchangedSessions:pairs.filter(x=>x===0).length,
        worsenedSessions:pairs.filter(x=>x<0).length
      });
    }
    return out;
  }

  function participantSymptoms(d){
    const out=[];
    for(const g of symptomAggregates(d)){
      const ids = d.symptoms.filter(s=>s.name===g.name).map(s=>[s._deviceId,s.id]);
      const history = d.checkins.filter(c=>ids.some(([dev,id])=>dev===c._deviceId&&String(id)===String(c.symptomId))).map(c=>({observed_at:c.observedAt,intensity:c.intensity,phase:c.phase})).sort((a,b)=>Date.parse(a.observed_at)-Date.parse(b.observed_at));
      const last = history.at(-1);
      out.push({
        name:g.name,
        lastCheckin:last?{intensity:last.intensity,observed_at:last.observed_at}:null,
        checkinCount:history.length,
        history,
        summary:{count:g.count,avgIntensity:g.avgIntensity,peak:g.peak,avgSessionDrop:g.avgSessionDrop,improvedSessions:g.improvedSessions,worsenedSessions:g.worsenedSessions}
      });
    }
    return out;
  }

  function overview(d){
    const completed=d.sessions.filter(s=>s.completed);
    const deltas=completed.filter(s=>s.preState!=null&&s.postState!=null).map(s=>n(s.postState)-n(s.preState));
    const intents={};
    for(const s of d.sessions){
      const k=s.requestKey||"none";
      const r=intents[k]||(intents[k]={sessions:0,completed:0,improved:0,deltaSum:0});
      r.sessions++;
      if(s.completed&&s.preState!=null&&s.postState!=null){const delta=n(s.postState)-n(s.preState);r.completed++;r.deltaSum+=delta;if(delta>0)r.improved++;}
    }
    return {
      participants:d.devices.length?1:0,
      sessions:d.sessions.length,
      returners:d.sessions.length>1?1:0,
      completed:completed.length,
      symptomCheckins:d.checkins.length,
      inviteTotal:d.invites.length,
      inviteActivated:d.invites.filter(x=>x.activatedAt).length,
      activeMs:d.sessions.reduce((a,s)=>a+n(s.measuredActiveMs),0),
      avgDelta:deltas.length?deltas.reduce((a,b)=>a+b,0)/deltas.length:0,
      symptomTrackers:d.symptoms.filter(x=>x.active!==false).length,
      intents
    };
  }

  function noteRows(d){
    return d.notes.map(x=>({
      id:x.id,participant_id:SUBJECT_ID,session_id:x.sessionId?compoundId(x._deviceId,x.sessionId):null,
      note_text:x.text,phase:x.phase==="free"?"standalone":x.phase,observed_at:x.observedAt,
      local_offset_minutes:x.localOffsetMinutes,session_elapsed_ms:x.sessionElapsedMs,request_key:x.requestKey,
      pattern_id:x.patternId,pattern_version:x.patternVersion,source_type:x.sourceType,source_id:x.sourceId,
      community_config_id:null,config_hash:x.configHash,config:x.config||x.state?.config||{},preview_frame:x.frame??x.state?.frame??44,
      participants:{id:SUBJECT_ID,access_code:SUBJECT_CODE,label:"Юля"}
    }));
  }

  function screenKey(title,kicker){
    const s=`${title||""} ${kicker||""}`.toLowerCase();
    if(s.includes("симптом"))return"symptoms";
    if(s.includes("замет"))return"notes";
    if(s.includes("инвай"))return"invites";
    if(s.includes("начать сес")||s.includes("перед"))return"pre_session";
    if(s.includes("оцен"))return"post_session";
    if(s.includes("результ")||s.includes("готов"))return"session_result";
    if(s.includes("сегодня"))return"today";
    return"research";
  }

  function journeyEvents(d,s){
    const out=[];
    for(const e of eventsForSession(d,s)){
      const p=e.payload||{};
      const add=(type,payload={})=>out.push({id:e.id,event_type:type,t_ms:n(e.tMs),payload,created_at:e.wallAt});
      if(e.type==="screen"||e.type==="session_screen") add("journey_screen",{screen:screenKey(p.title,p.kicker),title:p.title||"",page:p.page||""});
      else if(e.type==="session_view") add("journey_screen",{screen:p.view==="game"?"gameplay":p.view==="library"?"library":p.view||"research"});
      else if(e.type==="session_library_page"||e.type==="library_page") add("journey_screen",{screen:"library",page:p.page||"all"});
      else if(e.type==="pattern_open") add("journey_pattern_open",p);
      else if(e.type==="session_choice") add("journey_session_choice",p);
      else if(e.type==="gesture_start") add("journey_gesture_start",p);
      else if(e.type==="pattern_state") add("journey_pattern_state",p);
      else if(e.type==="color") add("journey_color",p);
      else if(e.type==="favorite_save") add("journey_favorite_save",p);
      else if(e.type==="favorite_remove") add("journey_favorite_remove",p);
      else if(e.type==="note_create") add("journey_note_create",p);
      else if(e.type==="visibility") add("journey_visibility",p);
      else if(e.type==="ui_tap") add("journey_ui_action",{action:p.targetId||"tap",page:p.view});
      else if(e.type==="exit") add("journey_exit",p);
    }
    return out.sort((a,b)=>a.t_ms-b.t_ms);
  }

  function journeySession(d,s){
    const ev=journeyEvents(d,s);
    const screens=ev.filter(x=>x.event_type==="journey_screen");
    return {
      ...sessionRow(s),
      participants:{id:SUBJECT_ID,access_code:SUBJECT_CODE,label:"Юля"},
      journeyEventCount:ev.length,
      journeyDurationMs:ev.length?Math.max(...ev.map(x=>n(x.t_ms))):0,
      patternOpens:ev.filter(x=>x.event_type==="journey_pattern_open").length,
      sessionChoices:ev.filter(x=>x.event_type==="journey_session_choice").map(x=>x.payload?.choice).filter(Boolean),
      screenCount:new Set(screens.map(x=>`${x.payload?.screen}:${x.payload?.page||""}`)).size
    };
  }

  function sensorStreams(d){
    const groups=new Map();
    for(const p of d.physio.filter(x=>x.metric==="heart_rate")){
      const key=`${p._deviceId}|${p.sourceType||"source"}|${p.deviceName||"device"}|${p.sessionId||"free"}`;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(p);
    }
    const out=[];
    let index=0;
    for(const samples of groups.values()){
      samples.sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt));
      const first=samples[0],last=samples.at(-1),vals=samples.map(x=>n(x.value));
      const s=first.sessionId?d.sessions.find(x=>x._deviceId===first._deviceId&&String(x.id)===String(first.sessionId)):null;
      out.push({
        id:`pv34-stream-${index++}`,
        participant_id:SUBJECT_ID,
        session_id:s?s._compoundId:null,
        guest_archive_id:null,guest_session_id:null,
        source_type:first.sourceType||"heart_rate",device_name:first.deviceName||first.sourceType||"sensor",metric:"heart_rate",unit:first.unit||"bpm",
        started_at:first.observedAt,ended_at:last.observedAt,last_sample_at:last.observedAt,status:"stopped",
        sample_count:samples.length,min_value:vals.length?Math.min(...vals):null,max_value:vals.length?Math.max(...vals):null,avg_value:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null,
        participant:{id:SUBJECT_ID,access_code:SUBJECT_CODE,label:"Юля"},session:s?sessionRow(s):null,_samples:samples,_session:s
      });
    }
    return out;
  }

  async function route(url,body){
    const action=String(body.action||"");
    const adminKey=String(body.adminKey||"");
    let d;
    try{d=await getAll(adminKey,action==="admin-check");}
    catch(e){return response({error:e.data?.error||e.message},e.status||500);}

    if(action==="admin-check") return response({ok:true});
    if(action==="admin-overview-v4") return response({overview:overview(d)});
    if(action==="admin-participants-v4") return response({participants:d.devices.length?[participant(d)]:[]});
    if(action==="admin-sessions-v4") return response({sessions:d.sessions.map(sessionRow)});
    if(action==="admin-symptoms") return response({items:symptomAggregates(d)});
    if(action==="admin-participant-symptoms") return response({items:participantSymptoms(d)});
    if(action==="admin-session-symptoms"){
      const s=findSession(d,body.sessionId);
      return response({items:s?sessionCheckins(d,s).filter(x=>x.phase==="pre"||x.phase==="post").map(x=>({phase:x.phase,intensity:x.intensity,participant_symptoms:{name:symptomName(d,x._deviceId,x.symptomId)}})):[]});
    }
    if(action==="admin-session"){
      const s=findSession(d,body.sessionId);
      return s?response(sessionDetail(d,s)):response({error:"session_not_found"},404);
    }
    if(action==="admin-notes") return response({items:noteRows(d)});
    if(action==="admin-session-timing") return response({items:d.sessions.map(s=>({...sessionRow(s),participants:{id:SUBJECT_ID,access_code:SUBJECT_CODE,label:"Юля"}}))});
    if(action==="admin-journey-sessions") return response({items:d.sessions.map(s=>journeySession(d,s))});
    if(action==="admin-journey"){
      const s=findSession(d,body.sessionId);
      return s?response({session:journeySession(d,s),events:journeyEvents(d,s)}):response({error:"session_not_found"},404);
    }
    if(action==="admin-invites") return response({items:d.invites.map(x=>({id:x.id,participant_id:SUBJECT_ID,code:x.code,created_at:x.createdAt,activated_at:x.activatedAt,status:x.status,participants:{access_code:SUBJECT_CODE,label:"Юля"}}))});
    if(action==="admin-insights") return response({insights:[]});
    if(action==="admin-community") return response({items:[]});
    if(action==="admin-guest-overview") return response({overview:{trials:0,withSessions:0,completedSessions:0,idAttempts:0,converted:0,conversionRate:0,sessionConversionRate:0}});
    if(action==="admin-guest-trials") return response({items:[]});

    if(url.includes("setka-sensors-v13") && action==="admin-overview"){
      const streams=sensorStreams(d);
      return response({overview:{streams:streams.length,live:0,samples:d.physio.filter(x=>x.metric==="heart_rate").length,devices:new Set(streams.map(x=>x.device_name)).size,converted:streams.length},items:streams.map(({_samples,_session,...x})=>x)});
    }
    if(url.includes("setka-sensors-v13") && action==="admin-stream"){
      const r=sensorStreams(d).find(x=>x.id===body.streamId);
      if(!r)return response({error:"not_found"},404);
      const markers=r._session?eventsForSession(d,r._session).filter(e=>["pattern_open","favorite_save","note_create","color","session_start","session_end"].includes(e.type)).map(e=>({type:e.type,observedAt:e.wallAt,payload:e.payload||{}})):[];
      return response({
        stream:{...r,_samples:undefined,_session:undefined},
        samples:r._samples.map(x=>({observed_at:x.observedAt,value:x.value,unit:x.unit,quality:x.quality,payload:x.payload||{}})),
        markers,
        participant:{id:SUBJECT_ID,access_code:SUBJECT_CODE,label:"Юля"},
        session:r._session?sessionRow(r._session):null
      });
    }

    if(action==="admin-reset-device"||action==="admin-toggle-active") return response({ok:true});
    if(action==="admin-create-code") return response({error:"sandbox_read_only"},409);
    return response({items:[],overview:{},ok:true});
  }

  window.fetch=async function(input,init={}){
    const url=typeof input==="string"?input:(input?.url||"");
    if(!TARGETS.some(x=>url.includes(`/functions/v1/${x}`))) return nativeFetch(input,init);
    let body={};
    try{body=typeof init.body==="string"?JSON.parse(init.body):{};}catch(_){body={};}
    return route(url,body);
  };

  window.__SETKA_SANDBOX_FINAL_ADMIN_BRIDGE__=true;
})();