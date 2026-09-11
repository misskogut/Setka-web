// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store,max-age=0","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-setka-session","Access-Control-Allow-Methods":"POST,OPTIONS","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
const json=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const text=(v:any,m=1000)=>String(v??"").trim().slice(0,m);
const lim=(v:any,d=100,max=500)=>Math.max(1,Math.min(max,Number(v)||d));
async function sha256(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function rpc(name:string,args:any={}){const q=await db.rpc(name,args);if(q.error)throw q.error;return q.data}
async function actor(req:Request,body:any){const token=text(req.headers.get("x-setka-session")||body.sessionToken,256);if(!token)return null;const hash=await sha256(token);const a=await rpc("foundation_session_actor_v018",{p_session_hash:hash}).catch(()=>null);if(!a?.identityId||!a?.president)return null;return {...a,hash}}
async function q(schema:string,name:string,limit=100,order?:string,ascending=false){let x=db.schema(schema).from(name).select("*");if(order)x=x.order(order,{ascending});x=x.limit(limit);const r=await x;if(r.error)throw r.error;return r.data||[]}
async function count(schema:string,name:string,filter?:[string,string,any]){let x=db.schema(schema).from(name).select("*",{count:"exact",head:true});if(filter)x=x.filter(filter[0],filter[1],filter[2]);const r=await x;if(r.error)throw r.error;return r.count||0}
Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:H});if(req.method!=="POST")return json({error:"method_not_allowed"},405);try{const body=await req.json().catch(()=>({}));const a=await actor(req,body);if(!a)return json({error:"invalid_president_session"},401);const action=text(body.action,50);
if(action==="overview"){
 const [subjects,facets,transcript,domains,concerns,tech,positions,sectors,reports,pins,tasks,missions,graphs]=await Promise.all([
  count("foundation","entity_subject_registry_v1"),count("foundation","entity_passports"),count("foundation","system_transcript_events"),count("foundation","setka_structure_domains"),count("foundation","setka_structure_concerns"),count("foundation","setka_technical_object_registry"),count("foundation","ship_position_index"),count("foundation","ship_sectors"),count("foundation","synthetic_session_reports"),count("foundation","annotation_pins","deleted_at","is",null).catch(()=>0),count("foundation","atomic_tasks"),count("foundation","mission_cards"),count("foundation","canonical_graphs")]);
 return json({ok:true,asOf:new Date().toISOString(),counts:{subjects,facets,transcript,domains,concerns,technicalObjects:tech,positions,sectors,reports,pins,tasks,missions,graphs}})
}
if(action==="transcript")return json({ok:true,items:await rpc("foundation_system_transcript_v018",{p_session_hash:a.hash,p_limit:lim(body.limit,250),p_before:body.before?text(body.before,80):null})});
if(action==="entities")return json({ok:true,items:await q("foundation","setka_entity_card_v6",lim(body.limit,300))});
if(action==="crew")return json({ok:true,positions:await q("foundation","ship_position_index",100),sectors:await q("foundation","ship_sectors",100),reports:await q("foundation","synthetic_session_reports",lim(body.limit,120),"created_at",false)});
if(action==="structure")return json({ok:true,domains:await q("foundation","setka_structure_domains",100),concerns:await q("foundation","setka_structure_concerns",100),coverage:await q("foundation","entity_structure_coverage_v1",100),spine:await q("foundation","setka_canonical_spine",100)});
if(action==="traces")return json({ok:true,...await rpc("diamond_trace_list_v2",{p_session_hash:a.hash,p_limit:lim(body.limit,100,100)})});
if(action==="pins")return json({ok:true,items:await q("foundation","annotation_pins",lim(body.limit,250),"created_at",false)});
if(action==="work")return json({ok:true,missions:await q("foundation","mission_cards",100,"updated_at",false),tasks:await q("foundation","atomic_tasks",lim(body.limit,250),"updated_at",false)});
if(action==="versions")return json({ok:true,items:await q("foundation","setka_version_lineage_registry",lim(body.limit,300),"updated_at",false),legacyManifest:await rpc("foundation_control_manifest").catch(()=>null)});
if(action==="graph")return json({ok:true,graphs:await q("foundation","canonical_graphs",100,"created_at",false),liveRequests:await q("foundation","graph_live_requests",100,"created_at",false),points:await q("foundation","graph_observed_metric_points",lim(body.limit,300),"observed_at",false).catch(()=>[])});
return json({error:"unknown_action"},400)}catch(e){console.error(e);return json({error:"server_error",detail:String(e?.message||e)},500)}});