import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const SIGNAL_ID='9a7d5868-335f-4ac4-a19b-3ce125dff57c';
const EXP='EXPERIMENT-SETKA-ENDOGENOUS-SELF-FORM-20260907-01';
const TARGET='SETKA-S-0010-0001';
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
Deno.serve(async(req:Request)=>{
  if(req.method!=='POST') return json({ok:false,error:'method_not_allowed'},405);
  const base=Deno.env.get('SUPABASE_URL');
  const svc=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!base||!svc) return json({ok:false,error:'missing_internal_secret'},500);
  const r=await fetch(`${base}/functions/v1/setka-synthetic-neural-run`,{
    method:'POST',headers:{Authorization:`Bearer ${svc}`,'content-type':'application/json'},body:JSON.stringify({signalId:SIGNAL_ID})
  });
  const t=await r.text(); let body:any; try{body=JSON.parse(t)}catch{body={raw:t}};
  return json({ok:r.ok,experimentRef:EXP,signalId:SIGNAL_ID,target:TARGET,neuralStatus:r.status,body},r.ok?200:502);
});