// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store,max-age=0","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-setka-session","Access-Control-Allow-Methods":"POST,OPTIONS","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
const json=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const text=(v:any,m=2000)=>String(v??"").trim().slice(0,m);
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
  const action=text(body.action||"navigate",40).toLowerCase();
  if(action==="navigate"){
    const message=text(body.message,1200);if(!message)return json({error:"message_required"},400);
    return json(await rpc("verstak_ship_computer_navigate_v1",{p_session_hash:hash,p_message:message}));
  }
  if(action==="choose"){
    const turnId=text(body.turnId,80),routeRef=text(body.routeRef,200),decision=text(body.decision||"selected",20).toLowerCase();
    if(!turnId||!routeRef)return json({error:"choice_required"},400);
    return json(await rpc("verstak_ship_computer_choose_v1",{p_session_hash:hash,p_turn_id:turnId,p_route_ref:routeRef,p_decision:decision}));
  }
  return json({error:"unknown_action"},400);
 }catch(e){console.error("setka-verstak-onboard",e);const m=String(e?.message||e);const auth=/president_session_required|turn_not_owned_by_player/.test(m);return json({error:auth?"president_session_required":"server_error",detail:m},auth?403:500)}
});