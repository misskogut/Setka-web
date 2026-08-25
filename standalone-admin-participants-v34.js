(() => {
  "use strict";

  const SANDBOX_API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-standalone-v34";
  const ALIAS_API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-standalone-v34-alias";
  const API_KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const TARGETS=["setka-research-api","setka-research-extensions","setka-research-v5","setka-journey","setka-guest-v11","setka-sensors-v13"];
  const previousFetch=window.fetch.bind(window);
  const participantId=deviceId=>`pv34p::${deviceId}`;
  const deviceFromParticipant=id=>String(id||"").startsWith("pv34p::")?String(id).slice(7):null;
  const deviceFromSession=id=>{const s=String(id||"");if(!s.startsWith("pv34::"))return null;const p=s.split("::");return p[1]||null};
  const arr=v=>Array.isArray(v)?v:[];
  const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":"*"}});

  let cache=null,cacheAt=0,loading=null,currentParticipantId=null;

  async function post(url,body){
    const r=await previousFetch(url,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify(body)});
    const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||"request_failed");e.status=r.status;throw e}return d;
  }
  async function raw(adminKey,force=false){
    if(!force&&cache&&Date.now()-cacheAt<2500)return cache;
    if(loading)return loading;
    loading=(async()=>{
      const [overview,aliasData]=await Promise.all([
        post(SANDBOX_API,{action:"admin-overview",adminKey}),
        post(ALIAS_API,{action:"admin-list-aliases",adminKey})
      ]);
      const devices=arr(overview.devices).slice().sort((a,b)=>Date.parse(a.first_seen_at||0)-Date.parse(b.first_seen_at||0)||String(a.device_id).localeCompare(String(b.device_id)));
      const details=await Promise.all(devices.map(d=>post(SANDBOX_API,{action:"admin-device",adminKey,deviceId:d.device_id}).catch(()=>null)));
      const byDevice=new Map(details.filter(Boolean).map(x=>[x.device.device_id,x]));
      const aliases=new Map(arr(aliasData.items).map(x=>[x.device_id,x.label]));
      cache={devices,byDevice,aliases,overview};cacheAt=Date.now();loading=null;return cache;
    })();
    try{return await loading}catch(e){loading=null;throw e}
  }
  function meta(r,deviceId){
    const idx=Math.max(0,r.devices.findIndex(x=>x.device_id===deviceId));
    const ordinal=`Участник ${idx+1}`;
    const alias=String(r.aliases.get(deviceId)||"").trim();
    return{deviceId,id:participantId(deviceId),ordinal,alias,display:alias||ordinal,secondary:alias?ordinal:"Без имени"};
  }
  function decorateParticipantRef(r,deviceId){const m=meta(r,deviceId);return{id:m.id,access_code:m.display,label:m.secondary}}
  function payloadFor(r,deviceId){return r.byDevice.get(deviceId)?.snapshot?.payload||{}}
  function participantRow(r,d){
    const m=meta(r,d.device_id),p=payloadFor(r,d.device_id),sessions=arr(p.sessions),days=new Set(sessions.map(s=>String(s.startedAt||"").slice(0,10)).filter(Boolean));
    return{id:m.id,access_code:m.display,label:m.secondary,active:d.active!==false,bound:true,device_hash:d.device_id,bound_at:d.first_seen_at,created_at:d.first_seen_at,last_seen_at:d.last_seen_at,sessionCount:sessions.length,activeDays:days.size,symptomCount:arr(p.symptoms).filter(x=>x.active!==false).length,inviteCount:arr(p.invites).length,profile:null};
  }
  function rewriteSession(r,s){
    const deviceId=s.device_hash||deviceFromSession(s.id);if(!deviceId)return s;const ref=decorateParticipantRef(r,deviceId);
    return{...s,participant_id:ref.id,participants:ref,device_hash:deviceId};
  }
  function participantSymptoms(r,deviceId){
    const p=payloadFor(r,deviceId),symptoms=arr(p.symptoms),checks=arr(p.checkins),sessions=arr(p.sessions),groups=new Map();
    for(const s of symptoms){const key=String(s.name||"Состояние").trim().toLowerCase();if(!groups.has(key))groups.set(key,{name:s.name||"Состояние",ids:[]});groups.get(key).ids.push(s.id)}
    const out=[];
    for(const g of groups.values()){
      const pts=checks.filter(c=>g.ids.some(id=>String(id)===String(c.symptomId))).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt));
      const vals=pts.map(x=>n(x.intensity));const deltas=[];let improved=0,worsened=0;
      for(const s of sessions){const pre=pts.find(x=>String(x.sessionId||"")===String(s.id)&&x.phase==="pre"),post=pts.find(x=>String(x.sessionId||"")===String(s.id)&&x.phase==="post");if(pre&&post){const drop=n(pre.intensity)-n(post.intensity);deltas.push(drop);if(drop>0)improved++;if(drop<0)worsened++}}
      const history=pts.map(c=>({observed_at:c.observedAt,intensity:c.intensity,phase:c.phase})),last=history.at(-1);
      out.push({name:g.name,lastCheckin:last?{intensity:last.intensity,observed_at:last.observed_at}:null,checkinCount:history.length,history,summary:{count:pts.length,avgIntensity:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0,peak:vals.length?Math.max(...vals):0,avgSessionDrop:deltas.length?deltas.reduce((a,b)=>a+b,0)/deltas.length:0,improvedSessions:improved,worsenedSessions:worsened}});
    }
    return out;
  }
  function noteRows(r){
    const out=[];
    for(const d of r.devices){const ref=decorateParticipantRef(r,d.device_id),p=payloadFor(r,d.device_id);for(const x of arr(p.notes))out.push({id:`${d.device_id}::${x.id}`,participant_id:ref.id,session_id:x.sessionId?`pv34::${d.device_id}::${x.sessionId}`:null,note_text:x.text,phase:x.phase==="free"?"standalone":x.phase,observed_at:x.observedAt,local_offset_minutes:x.localOffsetMinutes,session_elapsed_ms:x.sessionElapsedMs,request_key:x.requestKey,pattern_id:x.patternId,pattern_version:x.patternVersion,source_type:x.sourceType,source_id:x.sourceId,community_config_id:null,config_hash:x.configHash,config:x.config||x.state?.config||{},preview_frame:x.frame??x.state?.frame??44,participants:ref})}
    return out.sort((a,b)=>Date.parse(b.observed_at||0)-Date.parse(a.observed_at||0));
  }
  function inviteRows(r){
    const out=[];for(const d of r.devices){const ref=decorateParticipantRef(r,d.device_id),p=payloadFor(r,d.device_id);for(const x of arr(p.invites))out.push({id:`${d.device_id}::${x.id}`,participant_id:ref.id,code:x.code,created_at:x.createdAt,activated_at:x.activatedAt,status:x.status,participants:ref})}return out;
  }
  function overviewPatch(r,o){
    const counts=r.devices.map(d=>arr(payloadFor(r,d.device_id).sessions).length),participants=r.devices.length,returners=counts.filter(x=>x>1).length;
    return{...o,participants,returners};
  }
  async function rename(adminKey,pid,label){
    const deviceId=deviceFromParticipant(pid);if(!deviceId)throw new Error("invalid_participant");
    await post(ALIAS_API,{action:"admin-set-alias",adminKey,deviceId,label:String(label||"").trim()});cache=null;cacheAt=0;return true;
  }

  window.fetch=async function(input,init={}){
    const url=typeof input==="string"?input:(input?.url||"");
    if(!TARGETS.some(x=>url.includes(`/functions/v1/${x}`)))return previousFetch(input,init);
    let body={};try{body=typeof init.body==="string"?JSON.parse(init.body):{}}catch(_){body={}}
    const action=body.action||"",adminKey=body.adminKey||"";
    if(action==="admin-rename-participant"){
      try{await rename(adminKey,body.participantId,body.label);return response({ok:true})}catch(e){return response({error:e.message||"rename_failed"},e.status||500)}
    }
    if(action==="admin-participants-v4"){
      try{const r=await raw(adminKey,true);return response({participants:r.devices.map(d=>participantRow(r,d))})}catch(e){return response({error:e.message||"load_failed"},e.status||500)}
    }
    if(action==="admin-participant-symptoms"){
      try{const r=await raw(adminKey),deviceId=deviceFromParticipant(body.participantId);currentParticipantId=body.participantId||null;return response({items:deviceId?participantSymptoms(r,deviceId):[]})}catch(e){return response({error:e.message||"load_failed"},e.status||500)}
    }
    if(action==="admin-notes"){
      try{const r=await raw(adminKey);return response({items:noteRows(r)})}catch(e){return response({error:e.message||"load_failed"},e.status||500)}
    }
    if(action==="admin-invites"){
      try{const r=await raw(adminKey);return response({items:inviteRows(r)})}catch(e){return response({error:e.message||"load_failed"},e.status||500)}
    }

    const base=await previousFetch(input,init);let json=null;try{json=await base.clone().json()}catch(_){return base}
    if(!base.ok)return base;
    try{
      const r=await raw(adminKey);
      if(action==="admin-overview-v4")json.overview=overviewPatch(r,json.overview||{});
      else if(action==="admin-sessions-v4")json.sessions=arr(json.sessions).map(s=>rewriteSession(r,s));
      else if(action==="admin-session-timing")json.items=arr(json.items).map(s=>rewriteSession(r,s));
      else if(action==="admin-journey-sessions")json.items=arr(json.items).map(s=>rewriteSession(r,s));
      else if(action==="admin-journey"&&json.session)json.session=rewriteSession(r,json.session);
      else if(action==="admin-session"&&json.session)json.session=rewriteSession(r,json.session);
    }catch(_){return base}
    return response(json,base.status);
  };

  function injectRename(){
    const detail=document.getElementById("detail");if(!detail||detail.classList.contains("hidden"))return;
    const controls=detail.querySelector(".controls");if(!controls||controls.querySelector("#renameParticipantV34")||!currentParticipantId)return;
    const b=document.createElement("button");b.id="renameParticipantV34";b.className="btn";b.textContent="Переименовать";
    b.onclick=async e=>{
      e.preventDefault();e.stopPropagation();
      const adminKey=localStorage.getItem("setka-research:admin-key:v1")||"";
      const r=await raw(adminKey),deviceId=deviceFromParticipant(currentParticipantId),m=deviceId?meta(r,deviceId):null;
      if(!m)return;const value=prompt("Имя участника:",m.alias||"");if(value===null)return;
      try{await rename(adminKey,currentParticipantId,value);document.getElementById("refreshBtn")?.click();detail.classList.add("hidden")}catch(_){alert("Не удалось сохранить имя")}
    };
    controls.prepend(b);
  }
  const detail=document.getElementById("detail");if(detail)new MutationObserver(()=>setTimeout(injectRename,0)).observe(detail,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});

  window.SetkaAdminParticipantsV34={participantId,deviceFromParticipant,rename,refresh:()=>{cache=null;cacheAt=0},get currentParticipantId(){return currentParticipantId}};
})();