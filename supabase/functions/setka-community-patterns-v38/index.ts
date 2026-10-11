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
    return J({ok:true,items:items.slice(0,limit),metrics,patternMetrics,source:"SETKA connected tester accounts only",identityExposure:false,privacy:{testerId:false,deviceId:false,sessionId:false,privateNotes:false}});
  }catch(e){console.error(e);return J({error:"server_error",detail:String(e?.message||e)},500)}
});