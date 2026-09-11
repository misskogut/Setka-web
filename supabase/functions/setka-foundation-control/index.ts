// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store,max-age=0","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-setka-session","Access-Control-Allow-Methods":"POST,OPTIONS","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
const json=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const text=(v:any,m=1000)=>String(v??"").trim().slice(0,m);
const num=(v:any,f=0)=>Number.isFinite(Number(v))?Number(v):f;
async function sha256(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function rpc(name:string,args:Record<string,unknown>={}){const q=await db.rpc(name,args);if(q.error)throw q.error;return q.data}
async function resolveActor(req:Request,body:any){const token=text(req.headers.get("x-setka-session")||body.sessionToken,256);if(!token)return null;const hash=await sha256(token),actor=await rpc("foundation_session_actor_v018",{p_session_hash:hash}).catch(()=>null);if(!actor?.identityId)return null;return {...actor,hash}}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 try{
  const body=await req.json().catch(()=>({})),action=text(body.action,80);
  if(action==="manifest")return json({ok:true,manifest:await rpc("foundation_control_manifest")});
  const s=await resolveActor(req,body);if(!s)return json({error:"invalid_control_session"},401);
  if(action==="set_pointer"){if(!s.president)return json({error:"president_only"},403);return json(await rpc("foundation_control_set_pointer",{p_session_hash:s.hash,p_pointer:text(body.pointer,20),p_version:text(body.version,20)}))}
  if(action==="pin_list"){if(!s.canAnnotate)return json({error:"annotation_forbidden"},403);return json(await rpc("foundation_pin_list_v018",{p_session_hash:s.hash,p_version:text(body.version,20),p_surface:text(body.surface,20)}))}
  if(action==="pin_create"){if(!s.canAnnotate)return json({error:"annotation_forbidden"},403);return json(await rpc("foundation_pin_create_v018",{p_session_hash:s.hash,p_version:text(body.version,20),p_surface:text(body.surface,20),p_page_key:text(body.pageKey,160),p_target_key:text(body.targetKey,300),p_target_label:text(body.targetLabel,500),p_anchor:body.anchor&&typeof body.anchor==="object"?body.anchor:{},p_viewport:body.viewport&&typeof body.viewport==="object"?body.viewport:{},p_comment:text(body.comment,4000)}))}
  if(action==="pin_delete"){if(!s.canAnnotate)return json({error:"annotation_forbidden"},403);return json(await rpc("foundation_pin_delete_v018",{p_session_hash:s.hash,p_pin_code:text(body.pinCode,40).toUpperCase()}))}
  if(action==="pin_status"){if(!s.president&&s.mode!=="synthetic_admin")return json({error:"pin_status_forbidden"},403);return json(await rpc("foundation_pin_status_v018",{p_session_hash:s.hash,p_pin_code:text(body.pinCode,40).toUpperCase(),p_status:text(body.status,30),p_implemented_in_version:text(body.implementedInVersion,20)}))}
  if(action==="pin_review"){if(!s.president)return json({error:"president_only"},403);return json(await rpc("foundation_pin_review_v018",{p_session_hash:s.hash,p_pin_code:text(body.pinCode,40).toUpperCase(),p_decision:text(body.decision,20)}))}
  if(action==="pin_thread"){if(!s.canAnnotate)return json({error:"annotation_forbidden"},403);return json(await rpc("foundation_pin_thread_v018",{p_session_hash:s.hash,p_pin_code:text(body.pinCode,40).toUpperCase()}))}
  if(action==="pin_semantic_brief"){if(!s.canAnnotate)return json({error:"annotation_forbidden"},403);return json(await rpc("foundation_pin_semantic_brief_create_v018",{p_session_hash:s.hash,p_pin_code:text(body.pinCode,40).toUpperCase(),p_origin_kind:text(body.originKind,40),p_president_idea:text(body.presidentIdea,12000),p_assistant_interpretation:text(body.assistantInterpretation,12000),p_summary:text(body.summary,3000),p_implications:Array.isArray(body.implications)?body.implications:[],p_source_context:text(body.sourceContext,1000),p_supersedes_id:body.supersedesId||null}))}
  if(action==="pin_message"){if(!s.canAnnotate)return json({error:"annotation_forbidden"},403);return json(await rpc("foundation_pin_message_create_v018",{p_session_hash:s.hash,p_pin_code:text(body.pinCode,40).toUpperCase(),p_message:text(body.message,6000)}))}
  if(action==="pin_execute"){if(!s.president)return json({error:"president_only"},403);return json(await rpc("foundation_pin_execute_request_v018",{p_session_hash:s.hash,p_pin_code:text(body.pinCode,40).toUpperCase()}))}
  if(action==="priority_list"){if(!s.president)return json({error:"president_only"},403);return json(await rpc("foundation_priority_list_v018",{p_session_hash:s.hash}))}
  if(action==="priority_set"){if(!s.president)return json({error:"president_only"},403);return json(await rpc("foundation_priority_set_v018",{p_session_hash:s.hash,p_entity_type:text(body.entityType,20),p_entity_code:text(body.entityCode,80).toUpperCase(),p_active:Boolean(body.active),p_note:text(body.note,1000)}))}
  if(action==="trace_status"){if(!s.president)return json({error:"president_only"},403);return json(await rpc("foundation_trace_status_v018",{p_session_hash:s.hash,p_trace_code:text(body.traceCode,80).toUpperCase(),p_status:text(body.status,30),p_note:text(body.note,1000)}))}
  if(action==="transcript_list"){if(!s.president)return json({error:"president_only"},403);return json(await rpc("foundation_system_transcript_v018",{p_session_hash:s.hash,p_limit:Math.max(20,Math.min(500,Math.round(num(body.limit,250)))),p_before:body.before?text(body.before,80):null}))}
  const syntheticTrace=s.nature==="synthetic";
  if(["trace_start","trace_append","trace_finalize"].includes(action)&&!s.president&&!syntheticTrace)return json({error:"trace_forbidden"},403);
  if(["trace_list","trace_get","control_events"].includes(action)&&!s.president)return json({error:"president_only"},403);
  if(action==="trace_start")return json(await rpc("diamond_trace_start",{p_session_hash:s.hash,p_checkpoint:text(body.checkpoint,120),p_front_version:text(body.frontVersion,120),p_viewport:body.viewport&&typeof body.viewport==="object"?body.viewport:{}}));
  if(action==="trace_append")return json(await rpc("diamond_trace_append",{p_session_hash:s.hash,p_trace_code:text(body.traceCode,80).toUpperCase(),p_checkpoint:text(body.checkpoint,120),p_front_version:text(body.frontVersion,120),p_segment_key:text(body.segmentKey,120),p_chunk_seq:Math.max(0,Math.round(num(body.chunkSeq))),p_viewport:body.viewport&&typeof body.viewport==="object"?body.viewport:{},p_summary:body.summary&&typeof body.summary==="object"?body.summary:{},p_events:Array.isArray(body.events)?body.events:[]}));
  if(action==="trace_finalize")return json(await rpc("diamond_trace_finalize",{p_session_hash:s.hash,p_trace_code:text(body.traceCode,80).toUpperCase(),p_title:text(body.title,240),p_comment:text(body.comment,6000),p_summary:body.summary&&typeof body.summary==="object"?body.summary:{}}));
  if(action==="trace_list")return json(await rpc("diamond_trace_list_v2",{p_session_hash:s.hash,p_limit:Math.max(1,Math.min(100,Math.round(num(body.limit,60))))}));
  if(action==="trace_get")return json(await rpc("diamond_trace_get_v2",{p_session_hash:s.hash,p_trace_code:text(body.traceCode,80).toUpperCase()}));
  if(action==="control_events")return json(await rpc("foundation_control_events",{p_session_hash:s.hash,p_limit:Math.max(1,Math.min(100,Math.round(num(body.limit,40))))}));
  return json({error:"unknown_action"},400);
 }catch(e){console.error("setka-foundation-control",e);return json({error:"server_error",detail:String(e?.message||e)},500)}
});