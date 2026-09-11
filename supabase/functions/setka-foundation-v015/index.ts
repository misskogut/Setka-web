// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const PAIR_VERSION="0.1.5";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store,max-age=0","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-setka-session,x-setka-foundation-version","Access-Control-Allow-Methods":"POST,OPTIONS","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","X-SETKA-Foundation-Version":PAIR_VERSION};
const json=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const text=(v:any,m=1000)=>String(v??"").trim().slice(0,m);
const num=(v:any,f=0)=>Number.isFinite(Number(v))?Number(v):f;
async function sha256(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function randomHex(bytes=18){const a=new Uint8Array(bytes);crypto.getRandomValues(a);return [...a].map(b=>b.toString(16).padStart(2,"0")).join("").toUpperCase()}
function personalKey(){const x=randomHex(9);return `KEY-${x.slice(0,6)}-${x.slice(6,12)}-${x.slice(12,18)}`}
async function rpc(name:string,args:Record<string,unknown>){const q=await db.rpc(name,args);if(q.error)throw q.error;return q.data}
async function resolveSession(raw:string){const token=text(raw,256);if(!token)return null;const hash=await sha256(token);const rows=await rpc("diamond_resolve_session",{p_session_hash:hash});const row=Array.isArray(rows)?rows[0]:null;if(!row)return null;return {...row,hash,capabilities:Array.isArray(row.capabilities)?row.capabilities:[]}}
async function makeSession(identityId:string,hours=168){const token=randomHex(32).toLowerCase(),hash=await sha256(token),expiresAt=new Date(Date.now()+hours*3600000).toISOString();await rpc("diamond_create_session",{p_identity_id:identityId,p_session_hash:hash,p_expires_at:expiresAt});return {token,expiresAt}}
async function userSession(req:Request,body:any){const s=await resolveSession(req.headers.get("x-setka-session")||text(body.sessionToken,256));if(!s)return null;try{const snap=await rpc("foundation_user_snapshot_v014",{p_identity_id:s.identity_id});return {...s,snapshot:snap}}catch{return null}}
async function presidentSession(req:Request,body:any){const s=await resolveSession(req.headers.get("x-setka-session")||text(body.sessionToken,256));if(!s||!s.capabilities.includes("president"))return null;return s}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return json({error:"method_not_allowed",pairVersion:PAIR_VERSION},405);
 try{
  const body=await req.json().catch(()=>({})),action=text(body.action,80);
  if(action==="version")return json({ok:true,pairVersion:PAIR_VERSION});
  if(action==="user_login"){
    const setkaId=text(body.setkaId,80).toUpperCase(),key=text(body.personalKey,200);if(!setkaId||!key)return json({error:"invalid_credentials",pairVersion:PAIR_VERSION},403);
    const rows=await rpc("diamond_resolve_credentials",{p_setka_id:setkaId,p_secret_hash:await sha256(key)}),row=Array.isArray(rows)?rows[0]:null;if(!row)return json({error:"invalid_credentials",pairVersion:PAIR_VERSION},403);
    let snap;try{snap=await rpc("foundation_user_snapshot_v014",{p_identity_id:row.identity_id})}catch{return json({error:"not_foundation_user",pairVersion:PAIR_VERSION},403)}
    const sess=await makeSession(row.identity_id,168);await rpc("foundation_record_event",{p_identity_id:row.identity_id,p_event_type:"login",p_pattern_id:null,p_run_id:null,p_metadata:{source:"human_front",pairVersion:PAIR_VERSION}});return json({ok:true,pairVersion:PAIR_VERSION,sessionToken:sess.token,expiresAt:sess.expiresAt,setkaId:row.setka_id,...snap});
  }
  if(action==="president_login"){
    const setkaId=text(body.setkaId,80).toUpperCase(),key=text(body.presidentKey,300),rows=await rpc("diamond_resolve_credentials",{p_setka_id:setkaId,p_secret_hash:await sha256(key)}),row=Array.isArray(rows)?rows[0]:null,caps=Array.isArray(row?.capabilities)?row.capabilities:[];if(!row||!caps.includes("president"))return json({error:"invalid_credentials",pairVersion:PAIR_VERSION},403);const sess=await makeSession(row.identity_id,12);return json({ok:true,pairVersion:PAIR_VERSION,sessionToken:sess.token,expiresAt:sess.expiresAt,setkaId:row.setka_id});
  }
  if(action==="synthetic_login"){
    const personaKey=text(body.personaKey,120),persona=await rpc("foundation_resolve_synthetic_persona",{p_persona_key:personaKey});if(!persona?.identityId)return json({error:"unknown_synthetic",pairVersion:PAIR_VERSION},404);const sess=await makeSession(persona.identityId,2),run=await rpc("foundation_start_synthetic_run",{p_identity_id:persona.identityId,p_persona_key:personaKey}),snap=await rpc("foundation_user_snapshot_v014",{p_identity_id:persona.identityId});return json({ok:true,pairVersion:PAIR_VERSION,sessionToken:sess.token,expiresAt:sess.expiresAt,runId:run.runId,setkaId:persona.setkaId,persona,...snap});
  }
  if(action.startsWith("admin_")||action.startsWith("trace_")){
    const s=await presidentSession(req,body);if(!s)return json({error:"invalid_president_session",pairVersion:PAIR_VERSION},401);
    if(action==="admin_create_user"){const raw=personalKey(),out=await rpc("foundation_admin_issue_user",{p_session_hash:s.hash,p_display_name:text(body.displayName,120),p_secret_hash:await sha256(raw)});return json({...out,pairVersion:PAIR_VERSION,personalKey:raw})}
    if(action==="admin_snapshot")return json({ok:true,pairVersion:PAIR_VERSION,snapshot:await rpc("foundation_admin_snapshot_v014",{p_session_hash:s.hash})});
    if(action==="admin_protocol")return json({ok:true,pairVersion:PAIR_VERSION,protocol:await rpc("foundation_protocol_snapshot_v014",{p_session_hash:s.hash})});
    if(action==="admin_traces")return json({ok:true,pairVersion:PAIR_VERSION,...await rpc("diamond_trace_list_v2",{p_session_hash:s.hash,p_limit:Math.max(1,Math.min(100,Math.round(num(body.limit,40))))})});
    if(action==="admin_trace_get")return json({ok:true,pairVersion:PAIR_VERSION,...await rpc("diamond_trace_get_v2",{p_session_hash:s.hash,p_trace_code:text(body.traceCode,80).toUpperCase()})});
    if(action==="trace_start")return json(await rpc("diamond_trace_start",{p_session_hash:s.hash,p_checkpoint:text(body.checkpoint,120),p_front_version:text(body.frontVersion,120),p_viewport:body.viewport&&typeof body.viewport==="object"?body.viewport:{}}));
    if(action==="trace_append")return json(await rpc("diamond_trace_append",{p_session_hash:s.hash,p_trace_code:text(body.traceCode,80).toUpperCase(),p_checkpoint:text(body.checkpoint,120),p_front_version:text(body.frontVersion,120),p_segment_key:text(body.segmentKey,120),p_chunk_seq:Math.max(0,Math.round(num(body.chunkSeq))),p_viewport:body.viewport&&typeof body.viewport==="object"?body.viewport:{},p_summary:body.summary&&typeof body.summary==="object"?body.summary:{},p_events:Array.isArray(body.events)?body.events:[]}));
    if(action==="trace_finalize")return json(await rpc("diamond_trace_finalize",{p_session_hash:s.hash,p_trace_code:text(body.traceCode,80).toUpperCase(),p_title:text(body.title,240),p_comment:text(body.comment,6000),p_summary:body.summary&&typeof body.summary==="object"?body.summary:{}}));
  }
  if(action==="user_snapshot"){const s=await userSession(req,body);if(!s)return json({error:"invalid_user_session",pairVersion:PAIR_VERSION},401);return json({ok:true,pairVersion:PAIR_VERSION,setkaId:s.setka_id,...s.snapshot})}
  if(action==="pattern_open"){const s=await userSession(req,body);if(!s)return json({error:"invalid_user_session",pairVersion:PAIR_VERSION},401);const runId=s.snapshot?.profile?.synthetic?text(body.runId,80)||null:null;return json(await rpc("foundation_record_event",{p_identity_id:s.identity_id,p_event_type:"pattern_open",p_pattern_id:text(body.patternId,80),p_run_id:runId,p_metadata:{source:s.snapshot.profile.synthetic?"synthetic_front":"human_front",pairVersion:PAIR_VERSION}}))}
  if(action==="favorite_set"){
    const s=await userSession(req,body);if(!s)return json({error:"invalid_user_session",pairVersion:PAIR_VERSION},401);const runId=s.snapshot?.profile?.synthetic?text(body.runId,80)||null:null;const result=await rpc("foundation_set_favorite",{p_identity_id:s.identity_id,p_pattern_id:text(body.patternId,80),p_value:Boolean(body.value),p_run_id:runId,p_metadata:{source:s.snapshot.profile.synthetic?"synthetic_front":"human_front",pairVersion:PAIR_VERSION}}),snapshot=await rpc("foundation_user_snapshot_v014",{p_identity_id:s.identity_id});return json({ok:true,pairVersion:PAIR_VERSION,result,snapshot});
  }
  if(action==="synthetic_finish"){const s=await userSession(req,body);if(!s||!s.snapshot?.profile?.synthetic)return json({error:"invalid_synthetic_session",pairVersion:PAIR_VERSION},401);return json(await rpc("foundation_finish_synthetic_run",{p_identity_id:s.identity_id,p_run_id:text(body.runId,80),p_status:text(body.status,20),p_summary:body.summary&&typeof body.summary==="object"?{...body.summary,pairVersion:PAIR_VERSION}:{pairVersion:PAIR_VERSION},p_error:body.error?text(body.error,2000):null}))}
  if(action==="logout"){const s=await userSession(req,body);if(!s)return json({ok:true,pairVersion:PAIR_VERSION});await rpc("foundation_record_event",{p_identity_id:s.identity_id,p_event_type:"logout",p_pattern_id:null,p_run_id:null,p_metadata:{source:"human_front",pairVersion:PAIR_VERSION}}).catch(()=>{});await rpc("diamond_revoke_session",{p_session_hash:s.hash});return json({ok:true,pairVersion:PAIR_VERSION})}
  return json({error:"unknown_action",pairVersion:PAIR_VERSION},400);
 }catch(e){console.error("setka-foundation-v015",e);return json({error:"server_error",detail:String(e?.message||e),pairVersion:PAIR_VERSION},500)}
});