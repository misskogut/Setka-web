// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const CHANNEL="yulia_lab_v34";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8"};
const J=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const T=(v:any,m=500)=>String(v??"").trim().slice(0,m),O=(v:any)=>v&&typeof v==="object"&&!Array.isArray(v)?v:{},A=(v:any)=>Array.isArray(v)?v:[];
const IDS=new Set(["tentacle-orbit","dandelion","fish-wave","breathing-fractal","breathing-fractal-growth","rgb-glitch-rings","stereo-dna"]);
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function infer(f:any){const x=O(f.config),id=T(f.patternId||f.baseId||x.patternId,100);if(IDS.has(id))return id;const k=T(f.configKey,800).split("|")[0];return IDS.has(k)?k:"tentacle-orbit"}
function cleanConfig(c:any,id:string){const x=O(c),o:any={patternId:id};for(const k of ["numTentacles","tentacleLength","baseRadius","movementSpeed","colorSpeed","circleSize","lineWeight","segmentStep","colorModeIndex","v1","numShapes","angleSpeed","tSpeed","backgroundAlpha","pointSize","zoom","numLayers","ringSpacing","waveSpeed","waveAmplitude","glitchOffset","ringAlpha","strokeW","baseLen","pulseSpd","pulseAmp","branches","layers","hueRate","pulseSpeed","maxDepth","levelSpeedRatio","firstLevelFactor","numRings","baseSpacing","angleStep","spacing","numPoints","amplitude","eyeSeparation","stereoAngle","glowStrength","timeSpeed"]){if(Number.isFinite(Number(x[k])))o[k]=Number(x[k])}for(const k of ["glitchEnabled","invertDirection"]){if(x[k]!=null)o[k]=!!x[k]}if(Array.isArray(x.v1History))o.v1History=x.v1History.map(Number).filter(Number.isFinite).slice(-64);return o}
async function auth(token:string,deviceId:string){
  if(!token||!deviceId)return null;
  const now=new Date().toISOString(),h=await sha(token),dh=await sha(deviceId);
  const q=await db.from("prototype_v40_tester_sessions").select("id,tester_id,device_hash,expires_at").eq("token_hash",h).is("revoked_at",null).gt("expires_at",now).maybeSingle();
  if(q.error)throw q.error;if(!q.data||q.data.device_hash!==dh)return null;
  const a=await db.from("prototype_v40_tester_accounts").select("tester_id,active,password_set_at").eq("tester_id",q.data.tester_id).eq("active",true).maybeSingle();
  if(a.error)throw a.error;if(!a.data?.password_set_at)return null;
  await db.from("prototype_v40_tester_sessions").update({last_seen_at:now}).eq("id",q.data.id);
  return a.data.tester_id;
}
function iso(v:any){try{const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString()}catch(_){return null}}
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:H});
  if(req.method!=="POST")return J({error:"method_not_allowed"},405);
  try{
    const b=await req.json().catch(()=>({}));
    if(T(b.action,40)!=="sync"||T(b.channel,80)!==CHANNEL)return J({error:"forbidden"},403);
    const deviceId=T(b.deviceId,180),token=T(b.sessionToken,200);
    if(!deviceId)return J({error:"missing_device"},400);
    const testerId=await auth(token,deviceId);
    if(!testerId)return J({ok:true,ignored:true,reason:"authenticated_tester_required",favorites:0,patternLikes:0,acceptedSessions:0,acceptedExposures:0,privacyMode:"local_guest"});

    const favorites=[];const seen=new Set<string>();
    for(const f of A(b.favorites).slice(0,400)){
      const pid=infer(f),cfg=cleanConfig(f.config,pid),key=T(f.configKey,900)||`${pid}|${JSON.stringify(cfg)}`;
      if(!key||seen.has(key))continue;seen.add(key);
      favorites.push({tester_id:testerId,config_key:key,pattern_id:pid,config:cfg,saved_at:iso(f.savedAt||f.createdAt)||new Date().toISOString(),updated_at:new Date().toISOString()});
    }
    if(b.favoritesAuthoritative===true){
      const del=await db.from("prototype_v41_account_favorites").delete().eq("tester_id",testerId);if(del.error)throw del.error;
    }
    if(favorites.length){const q=await db.from("prototype_v41_account_favorites").upsert(favorites,{onConflict:"tester_id,config_key"});if(q.error)throw q.error}

    const sessions=[];
    for(const s of A(b.sessions).slice(-5000)){
      const sid=T(s.id||s.sessionId,180);if(!sid)continue;
      sessions.push({tester_id:testerId,session_id:sid,started_at:iso(s.startedAt),ended_at:iso(s.endedAt),completed:!!(s.completed||s.endedAt),updated_at:new Date().toISOString()});
    }
    if(sessions.length){const q=await db.from("prototype_v41_account_sessions").upsert(sessions,{onConflict:"tester_id,session_id"});if(q.error)throw q.error}

    const exposures=[];
    for(const x of A(b.exposures).slice(-20000)){
      const eid=T(x.exposureId||x.id,180),pid=T(x.patternId||x.config?.patternId,100),sid=T(x.sessionId,180),ck=T(x.configKey,900);
      if(!eid||!IDS.has(pid))continue;
      exposures.push({tester_id:testerId,exposure_id:eid,session_id:sid||null,pattern_id:pid,config_key:ck||null,duration_ms:Math.max(0,Math.min(14400000,Math.round(Number(x.durationMs)||0))),started_at:iso(x.startedAt),ended_at:iso(x.endedAt),updated_at:new Date().toISOString()});
    }
    if(exposures.length){const q=await db.from("prototype_v41_account_exposures").upsert(exposures,{onConflict:"tester_id,exposure_id"});if(q.error)throw q.error}

    const likes=new Set(favorites.map(x=>x.pattern_id)).size;
    return J({ok:true,testerId,ignored:false,favorites:favorites.length,patternLikes:likes,acceptedSessions:sessions.length,acceptedExposures:exposures.length,canonicalPatterns:7,privacyMode:"authenticated-account-only",storedUsageFields:["session timestamps","patternId","configKey","duration"],excludedUsageFields:["raw deviceId","notes","states","symptoms","pulse","request text"]});
  }catch(e){console.error(e);return J({error:"server_error",detail:String(e?.message||e)},500)}
});