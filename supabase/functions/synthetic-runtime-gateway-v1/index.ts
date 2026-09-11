import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const H={
  "content-type":"application/json; charset=utf-8",
  "cache-control":"no-store",
  "x-content-type-options":"nosniff",
  "referrer-policy":"no-referrer",
  "access-control-allow-origin":"*",
  "access-control-allow-headers":"content-type,x-setka-id,x-setka-capability",
  "access-control-allow-methods":"POST,OPTIONS"
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:H});
const clean=(v:unknown,n=4000)=>String(v??"").trim().slice(0,n);
async function sha256(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:H});
  if(req.method!=="POST") return json({ok:false,error:"method_not_allowed",required:"POST_WITH_CAPABILITY_HEADER"},405);

  const body=await req.json().catch(()=>({} as any));
  const setkaId=clean(req.headers.get("x-setka-id")||body.setka_id,80);
  const cap=clean(req.headers.get("x-setka-capability"),300);
  const action=(clean(body.action,30)||"open").toLowerCase();
  if(!/^SETKA-S-[A-Z0-9-]+$/i.test(setkaId)||!cap) return json({ok:false,error:"invalid_identity_capability"},400);

  const base=Deno.env.get("SUPABASE_URL"),svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!base||!svc) return json({ok:false,error:"missing_server_secret"},500);
  const db=createClient(base,svc,{auth:{persistSession:false,autoRefreshToken:false}});
  const rpc=async(name:string,args:Record<string,unknown>)=>{const q=await db.rpc(name,args);if(q.error)throw q.error;return q.data};

  try{
    const allowed=await rpc("synthetic_chat_runtime_capability_check_v1",{p_setka_id:setkaId,p_cap_sha256:await sha256(cap)});
    if(allowed!==true) return json({ok:false,error:"unauthorized_identity_capability"},401);

    if(action==="open"){
      const result=await rpc("synthetic_chat_runtime_open_v1",{p_setka_id:setkaId});
      const runId=result?.runId || result?.run_id || result?.result?.runId || result?.result?.run_id || null;
      if(!runId) return json({ok:false,error:"open_missing_run_id",result},500);
      return json({ok:true,transport:"EDGE_CAPABILITY_HEADER_V4",setkaId,runId,result,next:{protocol:{method:"POST",action:"protocol",run_id:runId},closePassed:{method:"POST",action:"close",run_id:runId,status:"passed"},closeFailed:{method:"POST",action:"close",run_id:runId,status:"failed"}}});
    }

    const runId=clean(body.run_id,80);
    if(!/^[0-9a-f-]{36}$/i.test(runId)) return json({ok:false,error:"invalid_run_id"},400);
    if(action==="protocol"){
      const summary=clean(body.summary,3000)||"Hourly synthetic RUN protocol via trusted edge bridge";
      const result=await rpc("synthetic_chat_runtime_protocol_v1",{p_setka_id:setkaId,p_run_id:runId,p_summary:summary,p_details:{transport:"EDGE_CAPABILITY_HEADER_V4",source:"chat_timer",setkaId,runId}});
      return json({ok:true,action:"protocol",setkaId,runId,result});
    }
    if(action==="close"){
      const status=(clean(body.status,20)||"failed").toLowerCase();
      if(!["passed","failed"].includes(status)) return json({ok:false,error:"invalid_status"},400);
      const summary=clean(body.summary,3000)||`Hourly synthetic RUN ${status} via trusted edge bridge`;
      const errorText=status==="failed"?(clean(body.error,3000)||"runtime_failed"):null;
      const result=await rpc("synthetic_chat_runtime_close_v1",{p_run_id:runId,p_status:status,p_summary:{summary,transport:"EDGE_CAPABILITY_HEADER_V4",setkaId},p_error:errorText});
      return json({ok:true,action:"close",setkaId,runId,status,result});
    }
    return json({ok:false,error:"unknown_action"},400);
  }catch(e){
    console.error("synthetic-runtime-gateway-v1",action,setkaId,String((e as any)?.message||e));
    return json({ok:false,error:"trusted_bridge_failed",action},500);
  }
});
