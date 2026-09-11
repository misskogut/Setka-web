import "jsr:@supabase/functions-js/edge-runtime.d.ts";
Deno.serve(async(req:Request)=>{
 const base=Deno.env.get("SUPABASE_URL"),svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),key=Deno.env.get("OPENAI_API_KEY");
 const auth=req.headers.get("authorization")||""; if(!svc||auth!==`Bearer ${svc}`) return Response.json({ok:false,error:"unauthorized_internal_service"},{status:401});
 if(!key||!base)return Response.json({ok:false,error:"missing_server_secret"},{status:500});
 const b=await req.json().catch(()=>({})); if(!b.signalId)return Response.json({ok:false,error:"signalId_required"},{status:400}); const H={apikey:svc,Authorization:`Bearer ${svc}`,"content-type":"application/json"};
 const rpc=async(name:string,body:any)=>{const r=await fetch(`${base}/rest/v1/rpc/${name}`,{method:"POST",headers:H,body:JSON.stringify(body)});const t=await r.text();let x:any;try{x=JSON.parse(t)}catch{x=t}return {r,x}};
 const p=await rpc("setka_neural_runtime_packet_v1",{p_signal_id:b.signalId}); if(!p.r.ok||!p.x)return Response.json({ok:false,error:"runtime_packet_failed",detail:p.x},{status:404}); if(p.x.error)return Response.json({ok:false,...p.x},{status:409});
 const sig=p.x.signal,target=sig.target_identity_ref,runRef=`SYN-NEURAL-${target}-${crypto.randomUUID()}`,model="gpt-5.2";
 const st=await rpc("setka_neural_run_start_v1",{p_signal_id:b.signalId,p_run_ref:runRef,p_model:model,p_context:{signal:sig.signal_code,selfCache:p.x.selfCache,memoryCache:p.x.memoryCache}}); if(!st.r.ok||st.x!==true)return Response.json({ok:false,error:"run_start_failed",detail:st.x},{status:409});
 const input=`Ты neural runtime синтетика ${target}. Канонический источник истины — SETKA-контейнеры ниже. Не смешивай identity contexts, не выдумывай выполненные системные изменения. Выполни только WAKE-задачу и верни компактный JSON: {status,decision,next_actions,automation_candidates,evidence_needed}.\nSELF=${JSON.stringify(p.x.self)}\nMEMORY=${JSON.stringify(p.x.memory)}\nWAKE=${JSON.stringify(sig)}`;
 const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({model,input,max_output_tokens:1400})}); const out=await r.json(); const text=out.output_text??out.output?.flatMap((o:any)=>o.content??[]).map((c:any)=>c.text??"").join("")??"";
 await rpc("setka_neural_run_finish_v1",{p_signal_id:b.signalId,p_run_ref:runRef,p_ok:r.ok,p_response_text:text,p_meta:{openai_status:r.status,response_id:out.id??null,error:r.ok?null:(out.error??out)}});
 return Response.json({ok:r.ok,runRef,target,signal:sig.signal_code,openaiStatus:r.status,selfLoaded:true,memoryLoaded:true,response:text,error:r.ok?null:(out.error??out)},{status:r.ok?200:502});
});