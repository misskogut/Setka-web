// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8"};
const J=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const T=(v,m=500)=>String(v??"").trim().slice(0,m);const N=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;const C=(v,a,b)=>Math.min(b,Math.max(a,v));
async function sha(v){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("")}
async function requireSession(id,token){if(!id||!token)return null;const h=await sha(token);const q=await db.from("sessions").select("id,participant_id,started_at,research_started,request_key").eq("id",id).eq("session_token_hash",h).maybeSingle();return q.data||null}
async function requireAdmin(key){if(!key)return false;const h=await sha(key.trim());const q=await db.from("admin_keys").select("id").eq("key_hash",h).eq("active",true).maybeSingle();return !!q.data}
function safePayload(v){if(!v||typeof v!=="object")return{};const raw=JSON.stringify(v);if(raw.length>30000)return{truncated:true};return v}
Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response("ok",{headers:H});if(req.method!=="POST")return J({error:"method_not_allowed"},405);try{const b=await req.json();const a=T(b.action,80);
 if(a==="visit-events"){
  const s=await requireSession(T(b.sessionId,80),T(b.sessionToken,220));if(!s)return J({error:"invalid_session"},403);
  const items=Array.isArray(b.items)?b.items.slice(0,300):[];
  const rows=items.map(x=>({session_id:s.id,participant_id:s.participant_id,t_ms:C(Math.round(N(x.tMs,0)),0,86400000),event_type:T(x.type,100).startsWith("journey_")?T(x.type,100):`journey_${T(x.type,92)}`,payload:safePayload(x.payload)})).filter(x=>x.event_type.length>8);
  if(rows.length){const q=await db.from("session_events").insert(rows);if(q.error)throw q.error}
  const now=new Date().toISOString();const ended=rows.some(x=>x.event_type==="journey_exit");const uq=await db.from("sessions").update(ended?{last_seen_at:now,ended_at:now}:{last_seen_at:now}).eq("id",s.id);if(uq.error)throw uq.error;
  return J({ok:true,count:rows.length});
 }
 if(a.startsWith("admin-")){
  if(!(await requireAdmin(T(b.adminKey,300))))return J({error:"invalid_admin_key"},403);
  if(a==="admin-journey-sessions"){
   const sq=await db.from("sessions").select("id,participant_id,started_at,ended_at,last_seen_at,research_started,request_key,pre_state,post_state,completed,active_ms,planned_duration_seconds,measured_active_ms,continued_after_feedback,after_feedback_active_ms,participants(access_code,label)").order("started_at",{ascending:false}).limit(1200);if(sq.error)throw sq.error;
   const sessions=sq.data||[],ids=sessions.map(x=>x.id);let ev=[];
   if(ids.length){const eq=await db.from("session_events").select("session_id,t_ms,event_type,payload").in("session_id",ids).like("event_type","journey_%").order("t_ms").limit(20000);if(eq.error)throw eq.error;ev=eq.data||[]}
   const map=new Map();for(const e of ev){let r=map.get(e.session_id);if(!r){r={eventCount:0,maxMs:0,screens:new Set(),patterns:0,choices:[]};map.set(e.session_id,r)}r.eventCount++;r.maxMs=Math.max(r.maxMs,N(e.t_ms));if(e.event_type==="journey_screen")r.screens.add(T(e.payload?.screen,120));if(e.event_type==="journey_pattern_open")r.patterns++;if(e.event_type==="journey_session_choice")r.choices.push(T(e.payload?.choice,40))}
   return J({ok:true,items:sessions.map(s=>{const m=map.get(s.id)||{eventCount:0,maxMs:0,screens:new Set(),patterns:0,choices:[]};return{...s,journeyEventCount:m.eventCount,journeyDurationMs:m.maxMs,screenCount:m.screens.size,patternOpens:m.patterns,sessionChoices:m.choices}})});
  }
  if(a==="admin-journey"){
   const id=T(b.sessionId,80);const sq=await db.from("sessions").select("id,participant_id,started_at,ended_at,last_seen_at,research_started,request_key,pre_state,post_state,completed,planned_duration_seconds,measured_active_ms,continued_after_feedback,after_feedback_active_ms,participants(access_code,label)").eq("id",id).maybeSingle();if(sq.error)throw sq.error;if(!sq.data)return J({error:"not_found"},404);
   const eq=await db.from("session_events").select("id,t_ms,event_type,payload,created_at").eq("session_id",id).like("event_type","journey_%").order("t_ms").limit(10000);if(eq.error)throw eq.error;
   return J({ok:true,session:sq.data,events:eq.data||[]});
  }
 }
 return J({error:"unknown_action"},400);
}catch(e){console.error(e);return J({error:"server_error",detail:String(e?.message||e)},500)}});