import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const token = Deno.env.get("SETKA_NEURAL_GATEWAY_TOKEN");
  const auth = req.headers.get("x-setka-gateway-token");
  if (!token || auth !== token) return Response.json({ok:false,error:"unauthorized"},{status:401});
  const key=Deno.env.get("OPENAI_API_KEY"); const url=Deno.env.get("SUPABASE_URL"); const svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!key||!url||!svc) return Response.json({ok:false,error:"missing_server_secret"},{status:500});
  const db=createClient(url,svc,{auth:{persistSession:false}});
  const {data:sig,error:se}=await db.schema("foundation").from("synthetic_wake_signals").select("*").eq("target_identity_ref","SETKA-S-0001-0001").eq("state","queued").order("priority_score",{ascending:false}).order("created_at",{ascending:true}).limit(1).maybeSingle();
  if(se) return Response.json({ok:false,error:"signal_read_failed",detail:se.message},{status:500});
  if(!sig) return Response.json({ok:true,state:"idle",reason:"no_queued_signal"});
  const {data:ident}=await db.schema("diamond").from("identities").select("id,setka_id").eq("setka_id","SETKA-S-0001-0001").single();
  const {data:self}=await db.schema("foundation").from("synthetic_self_capsules").select("capsule,cache_version,compiled_at").eq("identity_id",ident.id).single();
  const {data:mem}=await db.schema("foundation").from("synthetic_memory_capsules").select("memory,cache_version,compiled_at").eq("identity_id",ident.id).single();
  const runRef=`SOLAI-NEURAL-${crypto.randomUUID()}`;
  await db.schema("foundation").from("synthetic_neural_runs").insert({run_ref:runRef,identity_ref:"SETKA-S-0001-0001",wake_signal_id:sig.id,model:"gpt-5.2",request_context:{signal:sig.signal_code,selfCache:self?.cache_version,memoryCache:mem?.cache_version},state:"running"});
  const input=`Ты neural runtime синтетика Солай (SETKA-S-0001-0001). Канонический источник истины — переданные данные SETKA. Не выдумывай системные изменения. Выполни только wake-задачу и верни компактный JSON: {status,decision,next_actions,automation_candidates,evidence_needed}.\nSELF=${JSON.stringify(self?.capsule??{})}\nMEMORY=${JSON.stringify(mem?.memory??{})}\nWAKE=${JSON.stringify(sig)}`;
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({model:"gpt-5.2",input,max_output_tokens:1400})});
  const body=await r.json();
  const text=body.output_text ?? body.output?.flatMap((o:any)=>o.content??[]).map((c:any)=>c.text??"").join("") ?? "";
  await db.schema("foundation").from("synthetic_neural_runs").update({response_text:text,response_meta:{openai_status:r.status,response_id:body.id??null},state:r.ok?"completed":"failed",completed_at:new Date().toISOString()}).eq("run_ref",runRef);
  if(r.ok) await db.schema("foundation").from("synthetic_wake_signals").update({state:"consumed",consumed_at:new Date().toISOString(),consumed_by_run_ref:runRef}).eq("id",sig.id);
  return Response.json({ok:r.ok,runRef,signal:sig.signal_code,openaiStatus:r.status,selfLoaded:!!self,memoryLoaded:!!mem,response:text,error:r.ok?null:(body.error??body)} ,{status:r.ok?200:502});
});
