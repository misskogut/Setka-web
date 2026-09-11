// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store,max-age=0","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-setka-session","Access-Control-Allow-Methods":"POST,OPTIONS","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
const json=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const text=(v:any,m=512)=>String(v??"").trim().slice(0,m);
async function sha256(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:H});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const body=await req.json().catch(()=>({}));
    const token=text(req.headers.get("x-setka-session")||body.sessionToken,256);
    if(!token)return json({error:"invalid_control_session"},401);
    const hash=await sha256(token);
    const q=await db.rpc("foundation_autonomy_dashboard_v018",{p_session_hash:hash});
    if(q.error){
      const msg=String(q.error.message||q.error);
      if(msg.includes("president_only"))return json({error:"president_only"},403);
      throw q.error;
    }
    return json(q.data);
  }catch(e){console.error("setka-foundation-autonomy-v018",e);return json({error:"server_error",detail:String(e?.message||e)},500)}
});