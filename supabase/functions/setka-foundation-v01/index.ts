// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store,max-age=0","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-setka-session","Access-Control-Allow-Methods":"POST,OPTIONS","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
const json=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const text=(v:any,m=1000)=>String(v??"").trim().slice(0,m);
async function sha256(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function randomHex(bytes=18){const a=new Uint8Array(bytes);crypto.getRandomValues(a);return [...a].map(b=>b.toString(16).padStart(2,"0")).join("").toUpperCase()}
function personalKey(){const x=randomHex(9);return `KEY-${x.slice(0,6)}-${x.slice(6,12)}-${x.slice(12,18)}`}
async function rpc(name:string,args:Record<string,unknown>){const q=await db.rpc(name,args);if(q.error)throw q.error;return q.data}
async function resolveSession(raw:string){const token=text(raw,256);if(!token)return null;const hash=await sha256(token);const rows=await rpc("diamond_resolve_session",{p_session_hash:hash});const row=Array.isArray(rows)?rows[0]:null;if(!row)return null;return {...row,hash,capabilities:Array.isArray(row.capabilities)?row.capabilities:[]}}
async function makeSession(identityId:string,hours=168){const token=randomHex(32).toLowerCase(),hash=await sha256(token),expiresAt=new Date(Date.now()+hours*3600000).toISOString();await rpc("diamond_create_session",{p_identity_id:identityId,p_session_hash:hash,p_expires_at:expiresAt});return {token,expiresAt}}
async function userSession(req:Request,body:any){const s=await resolveSession(req.headers.get("x-setka-session")||text(body.sessionToken,256));if(!s)return null;try{const snap=await rpc("foundation_user_snapshot",{p_identity_id:s.identity_id});return {...s,snapshot:snap}}catch{return null}}
async function presidentSession(req:Request,body:any){const s=await resolveSession(req.headers.get("x-setka-session")||text(body.sessionToken,256));if(!s||!s.capabilities.includes("president"))return null;return s}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 try{
  const body=await req.json().catch(()=>({})),action=text(body.action,80);
  if(action==="user_login"){
    const setkaId=text(body.setkaId,80).toUpperCase(),key=text(body.personalKey,200);
    if(!setkaId||!key)return json({error:"invalid_credentials"},403);
    const rows=await rpc("diamond_resolve_credentials",{p_setka_id:setkaId,p_secret_hash:await sha256(key)}),row=Array.isArray(rows)?rows[0]:null;
    if(!row)return json({error:"invalid_credentials"},403);
    let snap;try{snap=await rpc("foundation_user_snapshot",{p_identity_id:row.identity_id})}catch{return json({error:"not_foundation_user"},403)}
    const sess=await makeSession(row.identity_id,168);
    await rpc("foundation_record_event",{p_identity_id:row.identity_id,p_event_type:"login",p_pattern_id:null,p_run_id:null,p_metadata:{source:"human_front"}});
    return json({ok:true,sessionToken:sess.token,expiresAt:sess.expiresAt,setkaId:row.setka_id,...snap});
  }
  if(action==="president_login"){
    const setkaId=text(body.setkaId,80).toUpperCase(),key=text(body.presidentKey,300);
    const rows=await rpc("diamond_resolve_credentials",{p_setka_id:setkaId,p_secret_hash:await sha256(key)}),row=Array.isArray(rows)?rows[0]:null,caps=Array.isArray(row?.capabilities)?row.capabilities:[];
    if(!row||!caps.includes("president"))return json({error:"invalid_credentials"},403);
    const sess=await makeSession(row.identity_id,12);
    return json({ok:true,sessionToken:sess.token,expiresAt:sess.expiresAt,setkaId:row.setka_id});
  }
  if(action==="synthetic_login"){
    const personaKey=text(body.personaKey,120);
    const persona=await rpc("foundation_resolve_synthetic_persona",{p_persona_key:personaKey});
    if(!persona?.identityId)return json({error:"unknown_synthetic"},404);
    const sess=await makeSession(persona.identityId,2);
    const run=await rpc("foundation_start_synthetic_run",{p_identity_id:persona.identityId,p_persona_key:personaKey});
    const snap=await rpc("foundation_user_snapshot",{p_identity_id:persona.identityId});
    return json({ok:true,sessionToken:sess.token,expiresAt:sess.expiresAt,runId:run.runId,setkaId:persona.setkaId,persona,...snap});
  }
  if(action==="admin_create_user"){
    const s=await presidentSession(req,body);if(!s)return json({error:"invalid_president_session"},401);
    const raw=personalKey();
    const out=await rpc("foundation_admin_issue_user",{p_session_hash:s.hash,p_display_name:text(body.displayName,120),p_secret_hash:await sha256(raw)});
    return json({...out,personalKey:raw});
  }
  if(action==="admin_attach_synthetics"){
    const s=await presidentSession(req,body);if(!s)return json({error:"invalid_president_session"},401);
    return json(await rpc("foundation_attach_existing_synthetics",{p_session_hash:s.hash}));
  }
  if(action==="admin_snapshot"){
    const s=await presidentSession(req,body);if(!s)return json({error:"invalid_president_session"},401);
    return json({ok:true,snapshot:await rpc("foundation_admin_snapshot",{p_session_hash:s.hash})});
  }
  if(action==="user_snapshot"){
    const s=await userSession(req,body);if(!s)return json({error:"invalid_user_session"},401);
    return json({ok:true,setkaId:s.setka_id,...s.snapshot});
  }
  if(action==="pattern_open"){
    const s=await userSession(req,body);if(!s)return json({error:"invalid_user_session"},401);
    const runId=s.snapshot?.profile?.synthetic?text(body.runId,80)||null:null;
    return json(await rpc("foundation_record_event",{p_identity_id:s.identity_id,p_event_type:"pattern_open",p_pattern_id:text(body.patternId,80),p_run_id:runId,p_metadata:{source:s.snapshot.profile.synthetic?"synthetic_front":"human_front"}}));
  }
  if(action==="favorite_set"){
    const s=await userSession(req,body);if(!s)return json({error:"invalid_user_session"},401);
    const runId=s.snapshot?.profile?.synthetic?text(body.runId,80)||null:null;
    return json(await rpc("foundation_set_favorite",{p_identity_id:s.identity_id,p_pattern_id:text(body.patternId,80),p_value:Boolean(body.value),p_run_id:runId,p_metadata:{source:s.snapshot.profile.synthetic?"synthetic_front":"human_front"}}));
  }
  if(action==="synthetic_finish"){
    const s=await userSession(req,body);if(!s||!s.snapshot?.profile?.synthetic)return json({error:"invalid_synthetic_session"},401);
    return json(await rpc("foundation_finish_synthetic_run",{p_identity_id:s.identity_id,p_run_id:text(body.runId,80),p_status:text(body.status,20),p_summary:body.summary&&typeof body.summary==="object"?body.summary:{},p_error:body.error?text(body.error,2000):null}));
  }
  if(action==="logout"){
    const s=await userSession(req,body);if(!s)return json({ok:true});
    await rpc("foundation_record_event",{p_identity_id:s.identity_id,p_event_type:"logout",p_pattern_id:null,p_run_id:null,p_metadata:{source:"human_front"}}).catch(()=>{});
    await rpc("diamond_revoke_session",{p_session_hash:s.hash});return json({ok:true});
  }
  return json({error:"unknown_action"},400);
 }catch(e){console.error("setka-foundation-v01",e);return json({error:"server_error",detail:String(e?.message||e)},500)}
});