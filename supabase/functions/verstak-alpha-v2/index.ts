import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const OLD="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/verstak-alpha";
const RUNTIME="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/verstak-solai-runtime";
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-verstak-access,apikey","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json; charset=utf-8"};
const json=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:CORS});

async function findQueue(db:any,action:string,req:any,out:any){
  let q:any=null;
  if(action==="create_pin" && out?.pin?.pin_code){
    const r=await db.schema("foundation").from("verstak_solai_queue").select("id").eq("pin_code",out.pin.pin_code).eq("status","PENDING").order("created_at",{ascending:false}).limit(1).maybeSingle(); q=r.data;
  }else if(action==="pin_message" && req?.pinCode){
    const r=await db.schema("foundation").from("verstak_solai_queue").select("id").eq("pin_code",String(req.pinCode)).eq("status","PENDING").order("created_at",{ascending:false}).limit(1).maybeSingle(); q=r.data;
  }else if(action==="pencil_finish" && req?.sessionId){
    const r=await db.schema("foundation").from("verstak_solai_queue").select("id").eq("source_ref",String(req.sessionId)).eq("request_kind","PENCIL_REVIEW").eq("status","PENDING").order("created_at",{ascending:false}).limit(1).maybeSingle(); q=r.data;
  }else if(action==="board_query" && out?.sourceRef){
    const r=await db.schema("foundation").from("verstak_solai_queue").select("id").eq("source_ref",String(out.sourceRef)).eq("request_kind","BOARD_QUERY").eq("status","PENDING").order("created_at",{ascending:false}).limit(1).maybeSingle(); q=r.data;
  }
  return q?.id||null;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:CORS});
  if(req.method!=="POST") return json({ok:false,error:"method_not_allowed"},405);
  const raw=await req.text();
  let body:any={}; try{body=JSON.parse(raw)}catch{}
  const upstream=await fetch(OLD,{method:"POST",headers:{"content-type":"application/json","apikey":req.headers.get("apikey")||"","x-verstak-access":req.headers.get("x-verstak-access")||""},body:raw});
  const txt=await upstream.text();
  let out:any={}; try{out=JSON.parse(txt)}catch{out={raw:txt}}

  if(upstream.ok && out?.ok!==false){
    const base=Deno.env.get("SUPABASE_URL"),svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(base&&svc){
      const db=createClient(base,svc,{auth:{persistSession:false}});
      const action=String(body.action||"");
      const ids:string[]=[];
      if(["create_pin","pin_message","pencil_finish","board_query"].includes(action)){
        const queueId=await findQueue(db,action,body,out); if(queueId) ids.push(queueId);
      }
      if(action==="bootstrap" && Array.isArray(out?.solaiQueue)){
        for(const q of out.solaiQueue.filter((x:any)=>x?.status==="PENDING").slice(0,4)) if(q?.id) ids.push(String(q.id));
      }
      const unique=[...new Set(ids)];
      if(unique.length){
        const dispatch=Promise.all(unique.map(queueId=>fetch(RUNTIME,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${svc}`},body:JSON.stringify({queueId})}).catch(()=>null)));
        const er=(globalThis as any).EdgeRuntime;
        if(er?.waitUntil) er.waitUntil(dispatch); else await dispatch;
        out.eventDrivenSolai=true;
        out.solaiDispatched=unique.length;
      }
    }
  }
  return new Response(JSON.stringify(out),{status:upstream.status,headers:CORS});
});