// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store,max-age=0","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-setka-session","Access-Control-Allow-Methods":"POST,OPTIONS","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
const json=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const text=(v:any,m=512)=>String(v??"").trim().slice(0,m);
const num=(v:any,f=0)=>Number.isFinite(Number(v))?Number(v):f;
async function sha256(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function rpc(name:string,args:Record<string,unknown>={}){const q=await db.rpc(name,args);if(q.error)throw q.error;return q.data}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 try{
  const body=await req.json().catch(()=>({}));
  const token=text(req.headers.get("x-setka-session")||body.sessionToken,256);
  if(!token)return json({error:"invalid_control_session"},401);
  const hash=await sha256(token);
  const actor=await rpc("foundation_session_actor_v018",{p_session_hash:hash}).catch(()=>null);
  if(!actor?.identityId)return json({error:"invalid_control_session"},401);
  if(!actor?.president)return json({error:"president_only"},403);
  const limit=Math.max(1,Math.min(500,Math.round(num(body.limit,300))));
  const query=text(body.query,240);
  if(query)return json(await rpc("foundation_system_transcript_search_v018",{p_session_hash:hash,p_query:query,p_limit:limit}));
  const beforeNo=body.beforeNo===null||body.beforeNo===undefined||body.beforeNo===''?null:Math.max(1,Math.floor(num(body.beforeNo,1)));
  return json(await rpc("foundation_system_transcript_v019",{p_session_hash:hash,p_limit:Math.max(20,limit),p_before_no:beforeNo}));
 }catch(e){console.error("setka-foundation-transcript",e);return json({error:"server_error",detail:String(e?.message||e)},500)}
});