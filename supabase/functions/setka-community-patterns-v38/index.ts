// @ts-nocheck
import {loadManifest,onlyActivePatterns} from "../_shared/pattern-catalog.mjs";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8"};
const J=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const T=(v:any,m=500)=>String(v??"").trim().slice(0,m);
const N=(v:any,d=0)=>Number.isFinite(Number(v))?Number(v):d;
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function shortHash(v:string){return(await sha(v)).slice(0,24)}
function versionFor(id:string){return VERSIONS.get(id)||1}
function day(){return new Date().toISOString().slice(0,10)}

const INTENTS=new Set(["sleep","relax","tension","focus","energy","switch","explore"]);
// Catalog is published from the same registry as the browser at every Pages
// build. Only trusted, well-formed IDs are admitted. Keep admin-renamed titles.
const KNOWN_PATTERNS=new Set<string>();
const VERSIONS=new Map<string,number>();

let catalogLast=0,catalogPending:Promise<void>|null=null;
async function syncPatternCatalog(){
  if(catalogPending)return catalogPending;
  if(Date.now()-catalogLast<300000&&KNOWN_PATTERNS.size)return;
  catalogPending=(async()=>{
    const manifest=await loadManifest();
    const rows=manifest.patterns.map((p:any)=>({pattern_id:p.id,title:p.title,revision:1}));
    // A name revision never substitutes for the immutable algorithm version.
    const ins=await db.from("setka_research_v1_pattern_catalog").upsert(rows,{onConflict:"pattern_id",ignoreDuplicates:true});
    if(ins.error)throw ins.error;
    KNOWN_PATTERNS.clear();VERSIONS.clear();
    for(const p of manifest.patterns){KNOWN_PATTERNS.add(p.id);VERSIONS.set(p.id,p.version)}
    catalogLast=Date.now();
  })().finally(()=>{catalogPending=null});
  return catalogPending;
}

const MIN_GROUP_ACCOUNTS=3,MIN_GROUP_SESSIONS=5;
// Only coarse aggregate groups leave this function. No notes, state ratings,
// tester identifiers or individual goal histories are included in the feed.
function communityIntentSummary(accounts:any[],archives:any[]){
  const allowed=new Set(accounts.filter(x=>x?.active&&x?.password_set_at&&x?.consent_at&&x?.consent_version==="research-v2-2026-09-17").map(x=>String(x.tester_id)));
  const byPattern=new Map<string,any>(),seen=new Set<string>();
  for(const a of archives){
    const tid=String(a?.tester_id||"");if(!allowed.has(tid))continue;
    const p=a?.payload||{},sessions=new Map((Array.isArray(p.sessions)?p.sessions:[]).filter(s=>s?.id).map(s=>[String(s.id),String(s.requestKey||"")]));
    for(const x of (Array.isArray(p.patternExposures)?p.patternExposures:[])){
      const pid=String(x?.patternId||""),sid=String(x?.sessionId||"");
      if(!KNOWN_PATTERNS.has(pid)||!sid)continue;
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

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:H});
  if(req.method!=="POST")return J({error:"method_not_allowed"},405);
  try{
    const b=await req.json().catch(()=>({})),action=T(b.action,40)||"feed";
    if(action!=="feed")return J({error:"unknown_action"},400);
    await syncPatternCatalog();
    const limit=Math.max(1,Math.min(500,Math.round(N(b.limit,300))));
    const [svcQ,patQ,cfgQ]=await Promise.all([
      db.from("prototype_v41_service_metrics_current").select("*").maybeSingle(),
      db.from("prototype_v41_pattern_metrics_current").select("*").order("exposures",{ascending:false}).order("likes",{ascending:false}),
      // This view is computed exclusively from prototype_v41_account_favorites.
      // Never union in prototype_v35_favorites (anonymous device saves).
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
    const patternMetrics=onlyActivePatterns(patQ.data||[],KNOWN_PATTERNS).map((x:any)=>({
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
    for(const x of onlyActivePatterns(cfgQ.data||[],KNOWN_PATTERNS)){
      // Only server-confirmed saves by account identity create community cards.
      if(!Number.isInteger(Number(x.save_accounts))||Number(x.save_accounts)<=0)continue;
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
    const [accountsQ,archiveQ]=await Promise.all([
      db.from("setka_metric_accounts").select("tester_id,consent_at,consent_version,active,password_set_at").limit(1000),
      db.from("prototype_v37_tester_private_archives").select("tester_id,payload").limit(1000)
    ]);
    for(const q of [accountsQ,archiveQ])if(q.error)throw q.error;
    const patternScenarios=communityIntentSummary(accountsQ.data||[],archiveQ.data||[]);
    // Historical device-based metrics are retained only in their original
    // tables/research views. They are never part of the registered-account feed.
    const historicalPatterns=[];
    metrics.patterns=patternMetrics.filter(x=>x.exposures>0).length;
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
    return J({ok:true,items:items.slice(0,limit),metrics,patternMetrics,patternScenarios,historicalPatterns,source:"SETKA registered account favorites only; historical device saves excluded",feedScope:"registered_account_favorites_v41",identityExposure:false,privacy:{testerId:false,deviceId:false,sessionId:false,privateNotes:false,scenariosKAnonymous:true}});
  }catch(e){console.error(e);return J({error:"server_error",detail:String(e?.message||e)},500)}
});
