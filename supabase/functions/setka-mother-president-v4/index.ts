// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const URL=Deno.env.get("SUPABASE_URL")!;
const db=createClient(URL,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const UP=`${URL}/functions/v1/setka-mother-president-v3`;
const H={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store,max-age=0","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-setka-session","Access-Control-Allow-Methods":"POST,OPTIONS","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
const json=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const text=(v:any,m=500)=>String(v??"").trim().slice(0,m);
async function sha256(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function president(req:Request,body:any){const tok=text(req.headers.get("x-setka-session")||body.sessionToken,256);if(!tok)return null;const hash=await sha256(tok);const r=await db.schema("foundation").rpc("foundation_session_actor_v018",{p_session_hash:hash});if(r.error)return null;const a=r.data;return a?.identityId&&a?.president?{...a,hash,token:tok}:null}
async function proxy(req:Request,body:any){const h:any={"content-type":"application/json"};const tok=req.headers.get("x-setka-session");if(tok)h["x-setka-session"]=tok;const r=await fetch(UP,{method:"POST",headers:h,body:JSON.stringify(body)});const t=await r.text();let d:any;try{d=JSON.parse(t)}catch{return new Response(t,{status:r.status,headers:H})}return {status:r.status,data:d}}
async function catalog(){const r=await db.schema("foundation").from("front_backend_catalog_v1").select("table_schema,table_name,table_type,exposure_class,backend_family").order("backend_family").order("table_schema").order("table_name").limit(1000);if(r.error)throw r.error;return r.data||[]}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 try{
  const body=await req.json().catch(()=>({}));
  const action=text(body.action,80);
  if(action==="bootstrap"){
    const p:any=await proxy(req,body);if(p.status>=400)return json(p.data,p.status);
    const rows=await catalog();const safe=rows.filter((x:any)=>x.exposure_class==="PRESIDENT_READ").length,blocked=rows.length-safe;
    const atlas={key:"ATLAS",icon:"🗺️",title:"Атлас backend",subtitle:"Полный каталог backend-отношений: что уже вынесено во фронт и что ещё требует отдельной поверхности",sources:[{name:"front_backend_catalog_v1",title:"Полный backend-каталог"}],recordCount:rows.length,countedSources:1,totalSources:1,safeRelations:safe,blockedRelations:blocked};
    const modules=Array.isArray(p.data.modules)?p.data.modules.filter((m:any)=>m.key!=="ATLAS"):[];
    return json({...p.data,frontVersion:"MOTHER-PRESIDENT-V2.1",modules:[...modules,atlas],backendCoverage:{catalogRelations:rows.length,presidentReadable:safe,sensitiveBlocked:blocked,atlas:"foundation.front_backend_catalog_v1"}});
  }
  if(action==="module"&&text(body.key,40).toUpperCase()==="ATLAS"){
    const a=await president(req,body);if(!a)return json({error:"invalid_president_session"},401);
    const rows=await catalog();return json({ok:true,module:{key:"ATLAS",icon:"🗺️",title:"Атлас backend",subtitle:"806+ безопасно читаемых отношений и явная карта закрытых чувствительных источников"},sources:{front_backend_catalog_v1:{title:"Полный backend-каталог",count:rows.length,rows}}});
  }
  if(action==="atlas_source"){
    const a=await president(req,body);if(!a)return json({error:"invalid_president_session"},401);
    const schema=text(body.schema,80),relation=text(body.relation,160),limit=Math.max(1,Math.min(100,Number(body.limit)||50));
    if(!schema||!relation)return json({error:"schema_and_relation_required"},400);
    const r=await db.schema("foundation").rpc("president_front_relation_preview_v1",{p_schema:schema,p_relation:relation,p_limit:limit});
    if(r.error){const m=String(r.error.message||r.error);if(m.includes("relation_blocked_by_front_policy"))return json({error:"sensitive_relation_blocked"},403);return json({error:"atlas_source_failed",detail:m},400)}
    return json(r.data);
  }
  const p:any=await proxy(req,body);return json(p.data,p.status);
 }catch(e){console.error("setka-mother-president-v4",e);return json({error:"server_error",detail:String(e?.message||e)},500)}
});