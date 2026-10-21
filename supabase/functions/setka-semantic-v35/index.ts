// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const CHANNEL="yulia_lab_v34";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8"};
const J=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const T=(v:any,m=500)=>String(v??"").trim().slice(0,m),O=(v:any)=>v&&typeof v==="object"&&!Array.isArray(v)?v:{},A=(v:any)=>Array.isArray(v)?v:[];
// Canonical pattern identities are registered in the shared research catalog.
async function patternIds():Promise<Set<string>>{
  const q=await db.from("setka_research_v1_pattern_catalog").select("pattern_id");
  if(q.error)throw q.error;return new Set((q.data||[]).map((p:any)=>T(p.pattern_id,100)).filter(Boolean));
}
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function infer(f:any,ids:Set<string>){
  const x=O(f.config),id=T(f.patternId||f.baseId||x.patternId,100),keyId=T(f.configKey,900).split("|")[0];
  // Never silently attribute an unknown/new pattern to another mother's statistics.
  if(!id||!ids.has(id)||(x.patternId&&x.patternId!==id)||(keyId&&keyId!==id))return null;
  return id;
}
function cleanConfig(c:any,id:string){
  const x=O(c),o:any={patternId:id};
  // Generic, bounded, non-personal parameter contract: no per-pattern whitelist.
  for(const [k,v] of Object.entries(x).slice(0,96)){
    if(k==="patternId"||!/^([a-z][A-Za-z0-9_]{0,55})$/.test(k))continue;
    if(typeof v==="number"&&Number.isFinite(v))o[k]=v;
    else if(typeof v==="boolean")o[k]=v;
    else if(Array.isArray(v)&&v.length<=64&&v.every(n=>typeof n==="number"&&Number.isFinite(n)))o[k]=v;
    else if(typeof v==="string"&&/^(?:#[0-9a-fA-F]{3,8}|[a-z][a-z0-9_-]{0,39})$/.test(v))o[k]=v;
  }
  return o;
}
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

    const ids=await patternIds();
    const favorites=[];const seen=new Set<string>();let rejectedFavorites=0,rejectedExposures=0;
    for(const f of A(b.favorites).slice(0,400)){
      const pid=infer(f,ids);
      if(!pid){rejectedFavorites++;continue}
      const cfg=cleanConfig(f.config,pid),key=T(f.configKey,900)||`${pid}|${JSON.stringify(cfg)}`;
      if(!key||seen.has(key))continue;seen.add(key);
      favorites.push({tester_id:testerId,config_key:key,pattern_id:pid,config:cfg,saved_at:iso(f.savedAt||f.createdAt)||new Date().toISOString(),updated_at:new Date().toISOString()});
    }
    // Upsert first. Never delete the prior valid set before a successful write.
    if(favorites.length){const q=await db.from("prototype_v41_account_favorites").upsert(favorites,{onConflict:"tester_id,config_key"});if(q.error)throw q.error}
    if(b.favoritesAuthoritative===true&&rejectedFavorites===0){
      const existing=await db.from("prototype_v41_account_favorites").select("config_key").eq("tester_id",testerId);
      if(existing.error)throw existing.error;
      const accepted=new Set(favorites.map(x=>x.config_key)),missing=(existing.data||[]).map((x:any)=>x.config_key).filter((key:string)=>!accepted.has(key));
      for(let i=0;i<missing.length;i+=100){
        const del=await db.from("prototype_v41_account_favorites").delete().eq("tester_id",testerId).in("config_key",missing.slice(i,i+100));
        if(del.error)throw del.error;
      }
    }

    const sessions=[];
    for(const s of A(b.sessions).slice(-5000)){
      const sid=T(s.id||s.sessionId,180);if(!sid)continue;
      sessions.push({tester_id:testerId,session_id:sid,started_at:iso(s.startedAt),ended_at:iso(s.endedAt),completed:!!(s.completed||s.endedAt),updated_at:new Date().toISOString()});
    }
    if(sessions.length){const q=await db.from("prototype_v41_account_sessions").upsert(sessions,{onConflict:"tester_id,session_id"});if(q.error)throw q.error}

    const exposures=[];
    for(const x of A(b.exposures).slice(-20000)){
      const eid=T(x.exposureId||x.id,180),pid=T(x.patternId||x.config?.patternId,100),sid=T(x.sessionId,180),ck=T(x.configKey,900);
      if(!eid)continue;
      if(!ids.has(pid)){rejectedExposures++;continue;}
      exposures.push({tester_id:testerId,exposure_id:eid,session_id:sid||null,pattern_id:pid,config_key:ck||null,duration_ms:Math.max(0,Math.min(14400000,Math.round(Number(x.durationMs)||0))),started_at:iso(x.startedAt),ended_at:iso(x.endedAt),updated_at:new Date().toISOString()});
    }
    if(exposures.length){const q=await db.from("prototype_v41_account_exposures").upsert(exposures,{onConflict:"tester_id,exposure_id"});if(q.error)throw q.error}

    const likes=new Set(favorites.map(x=>x.pattern_id)).size;
    return J({ok:true,testerId,ignored:false,favorites:favorites.length,patternLikes:likes,acceptedSessions:sessions.length,acceptedExposures:exposures.length,canonicalPatterns:ids.size,rejectedFavorites,rejectedExposures,privacyMode:"authenticated-account-only",storedUsageFields:["session timestamps","patternId","configKey","duration"],excludedUsageFields:["raw deviceId","notes","states","symptoms","pulse","request text"]});
  }catch(e){console.error(e);return J({error:"server_error",detail:String(e?.message||e)},500)}
});