// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8"};
const J=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const T=(v:any,m=500)=>String(v??"").trim().slice(0,m);
const N=(v:any,d=0)=>Number.isFinite(Number(v))?Number(v):d;
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function shortHash(v:string){return(await sha(v)).slice(0,24)}
function versionFor(id:string){if(id==="fish-wave")return 35;if(id==="rgb-glitch-rings")return 36;return 1}
function day(){return new Date().toISOString().slice(0,10)}

const INTENTS=new Set(["sleep","relax","tension","focus","energy","switch","explore"]);
const MIN_GROUP_ACCOUNTS=3,MIN_GROUP_SESSIONS=5;
// Only coarse aggregate groups leave this function. No notes, state ratings,
// tester identifiers or individual goal histories are included in the feed.
function communityIntentSummary(accounts:any[],archives:any[]){
  const allowed=new Set(accounts.filter(x=>x?.active&&x?.consent_at&&x?.consent_version==="research-v2-2026-09-17").map(x=>String(x.tester_id)));
  const byPattern=new Map<string,any>(),seen=new Set<string>();
  for(const a of archives){
    const tid=String(a?.tester_id||"");if(!allowed.has(tid))continue;
    const p=a?.payload||{},sessions=new Map((Array.isArray(p.sessions)?p.sessions:[]).filter(s=>s?.id).map(s=>[String(s.id),String(s.requestKey||"")]));
    for(const x of (Array.isArray(p.patternExposures)?p.patternExposures:[])){
      const pid=String(x?.patternId||""),sid=String(x?.sessionId||"");
      if(!pid||!sid)continue;
      const intent=sessions.get(sid)||String(x.requestKey||"");
      if(!INTENTS.has(intent))continue;
      const key=JSON.stringify([tid,pid,sid]);if(seen.has(key))continue;seen.add(key);
      let m=byPattern.get(pid);if(!m){m={sessions:new Set(),accounts:new Set(),intents:new Map()};byPattern.set(pid,m)}
      m.sessions.add(key);m.accounts.add(tid);
      let group=m.intents.get(intent);if(!group){group={sessions:new Set(),accounts:new Set()};m.intents.set(intent,group)}
      group.sessions.add(key);group.accounts.add(tid);
    }
  }
  const output=[];
  for(const [patternId,m] of byPattern){
    if(m.accounts.size<MIN_GROUP_ACCOUNTS||m.sessions.size<MIN_GROUP_SESSIONS)continue;
    const scenarios=[...m.intents].filter(([,v])=>v.accounts.size>=MIN_GROUP_ACCOUNTS&&v.sessions.size>=MIN_GROUP_SESSIONS)
      .map(([key,v])=>({key,count:v.sessions.size,share:v.sessions.size/m.sessions.size}))
      .sort((a,b)=>b.count-a.count).slice(0,7);
    if(scenarios.length)output.push({patternId,cohortSessions:m.sessions.size,scenarios});
  }
  return output;
}
function historicalPatternSummary(rows:any[]){
  const seen=new Set<string>(),m=new Map<string,any>();
  for(const x of rows){
    const pid=String(x?.pattern_id||""),device=String(x?.device_id||""),eid=String(x?.exposure_id||"");
    if(!pid||!device||!eid||seen.has(eid))continue;seen.add(eid);
    let v=m.get(pid);if(!v){v={patternId:pid,devices:new Set(),sessions:new Set(),exposures:0,durationMs:0};m.set(pid,v)}
    v.devices.add(device);if(x.session_id)v.sessions.add(JSON.stringify([device,x.session_id]));
    v.exposures++;v.durationMs+=Math.max(0,N(x.duration_ms));
  }
  return [...m.values()].filter(x=>x.devices.size>=3)
    .map(x=>({patternId:x.patternId,devices:x.devices.size,sessions:x.sessions.size,exposures:x.exposures,totalDurationMs:x.durationMs}));
}
async function historicalRows(){
  const rows:any[]=[];
  for(let i=0;i<15;i++){
    const q=await db.from("prototype_v35_pattern_exposures").select("exposure_id,pattern_id,device_id,session_id,duration_ms")
      .order("exposure_id",{ascending:true}).range(i*1000,i*1000+999);
    if(q.error)throw q.error;
    rows.push(...(q.data||[]));
    if((q.data||[]).length<1000)return rows;
  }
  // Never publish partial aggregates when source pagination is exceeded.
  return [];
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:H});
  if(req.method!=="POST")return J({error:"method_not_allowed"},405);
  try{
    const b=await req.json().catch(()=>({})),action=T(b.action,40)||"feed";
    if(action!=="feed")return J({error:"unknown_action"},400);
    const limit=Math.max(1,Math.min(500,Math.round(N(b.limit,300))));
    const [svcQ,patQ,cfgQ]=await Promise.all([
      db.from("prototype_v41_service_metrics_current").select("*").maybeSingle(),
      db.from("prototype_v41_pattern_metrics_current").select("*").order("exposures",{ascending:false}).order("likes",{ascending:false}),
      db.from("prototype_v41_config_metrics_current").select("*").order("save_accounts",{ascending:false}).order("last_saved_at",{ascending:false}).limit(1000)
    ]);
    for(const q of [svcQ,patQ,cfgQ])if(q.error)throw q.error;
    const s=svcQ.data||{};
    const metrics={
      connectedAccounts:N(s.connected_accounts),
      connectedTesters:N(s.connected_accounts),
      sessions:N(s.sessions),
      exposures:N(s.exposures),
      patterns:N(s.patterns),
      savedConfigurations:N(s.saved_configurations),
      configurations:N(s.saved_configurations),
      configurationSaves:N(s.configuration_saves),
      saves:N(s.configuration_saves),
      activeAccounts30d:N(s.active_accounts_30d)
    };
    const patternMetrics=(patQ.data||[]).map((x:any)=>({
      patternId:x.pattern_id,
      viewingAccounts:N(x.viewing_accounts),
      activityAccounts:N(x.viewing_accounts),
      uniqueParticipants:N(x.viewing_accounts),
      sessions:N(x.sessions),
      exposures:N(x.exposures),
      likes:N(x.likes),
      saves:N(x.likes),
      configurationSaves:N(x.configuration_saves),
      savedConfigurations:N(x.saved_configurations),
      configurations:N(x.saved_configurations),
      totalDurationMs:N(x.duration_ms)
    }));
    const items=[];
    for(const x of cfgQ.data||[]){
      items.push({
        id:`community-${await shortHash(String(x.config_key))}`,
        pattern_id:x.pattern_id,patternId:x.pattern_id,pattern_version:versionFor(x.pattern_id),
        config_key:x.config_key,config:x.config||{},preview_frame:44,
        saveCount:N(x.save_accounts),savesTotal:N(x.saves),
        uniqueParticipants:N(x.activity_accounts),useAccounts:N(x.use_accounts),
        useCount:N(x.use_count),sessionCount:N(x.sessions),totalDurationMs:N(x.duration_ms),
        created_at:x.first_saved_at,updated_at:x.last_saved_at
      });
    }
    const [accountsQ,archiveQ,historical]=await Promise.all([
      db.from("prototype_v40_tester_accounts").select("tester_id,consent_at,consent_version,active").limit(1000),
      db.from("prototype_v37_tester_private_archives").select("tester_id,payload").limit(1000),
      historicalRows()
    ]);
    for(const q of [accountsQ,archiveQ])if(q.error)throw q.error;
    const patternScenarios=communityIntentSummary(accountsQ.data||[],archiveQ.data||[]);
    const historicalPatterns=historicalPatternSummary(historical);
    const d=day(),now=new Date().toISOString();
    const snap=await db.from("prototype_v40_service_metric_snapshots").upsert({
      day:d,participants:metrics.connectedAccounts,connected_testers:metrics.connectedAccounts,sessions:metrics.sessions,exposures:metrics.exposures,
      patterns:metrics.patterns,configurations:metrics.savedConfigurations,saves:metrics.configurationSaves,published_notes:0,
      active_participants_30d:metrics.activeAccounts30d,updated_at:now
    },{onConflict:"day"});if(snap.error)throw snap.error;
    if(patternMetrics.length){
      const rows=patternMetrics.map((x:any)=>({day:d,pattern_id:x.patternId,participants:x.viewingAccounts,sessions:x.sessions,exposures:x.exposures,configurations:x.savedConfigurations,saves:x.likes,duration_ms:x.totalDurationMs,published_notes:0,updated_at:now}));
      const q=await db.from("prototype_v40_pattern_metric_snapshots").upsert(rows,{onConflict:"day,pattern_id"});if(q.error)throw q.error;
    }
    return J({ok:true,items:items.slice(0,limit),metrics,patternMetrics,patternScenarios,historicalPatterns,source:"SETKA connected tester accounts only; historical data separate",identityExposure:false,privacy:{testerId:false,deviceId:false,sessionId:false,privateNotes:false,scenariosKAnonymous:true}});
  }catch(e){console.error(e);return J({error:"server_error",detail:String(e?.message||e)},500)}
});