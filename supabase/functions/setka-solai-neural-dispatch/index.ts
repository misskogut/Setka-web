import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST") return json({ok:false,error:"method_not_allowed"},405);

  const base=Deno.env.get("SUPABASE_URL");
  const svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!base||!svc) return json({ok:false,error:"missing_internal_secret"},500);

  const auth=req.headers.get("authorization")||"";
  if(auth!==`Bearer ${svc}`) return json({ok:false,error:"unauthorized_internal_service"},401);

  const r=await fetch(`${base}/rest/v1/rpc/setka_neural_dispatch_batch_v1`,{
    method:"POST",
    headers:{apikey:svc,Authorization:`Bearer ${svc}`,"content-type":"application/json"},
    body:JSON.stringify({p_limit:4})
  });
  const raw=await r.text();
  let batch:any[]=[];
  try{batch=JSON.parse(raw)}catch{}
  if(!r.ok) return json({ok:false,error:"queue_read_failed"},500);
  if(!Array.isArray(batch)||!batch.length) return json({ok:true,state:"idle"});

  const results=await Promise.all(batch.map(async(sig:any)=>{
    const x=await fetch(`${base}/functions/v1/setka-synthetic-neural-run`,{
      method:"POST",
      headers:{Authorization:`Bearer ${svc}`,"content-type":"application/json"},
      body:JSON.stringify({signalId:sig.id})
    });
    const t=await x.text();
    let b:any;
    try{b=JSON.parse(t)}catch{b={raw:t}}
    return {target:sig.target_identity_ref,signal:sig.signal_code,status:x.status,ok:x.ok,body:b};
  }));

  const ok=results.every(x=>x.ok);
  return json({ok,batchSize:results.length,results},ok?200:207);
});
