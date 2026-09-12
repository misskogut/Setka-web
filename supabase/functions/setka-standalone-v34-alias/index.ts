// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8"};
const J=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const T=(v,m=300)=>String(v??"").trim().slice(0,m);
async function sha(v){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("")}
async function requireAdmin(key){if(!key)return false;const h=await sha(String(key).trim());const q=await db.from("admin_keys").select("id").eq("key_hash",h).eq("active",true).maybeSingle();return !!q.data}
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:H});
  if(req.method!=="POST")return J({error:"method_not_allowed"},405);
  try{
    const b=await req.json();
    if(!(await requireAdmin(T(b.adminKey,300))))return J({error:"invalid_admin_key"},403);
    const action=T(b.action,80);
    if(action==="admin-list-aliases"){
      const q=await db.from("prototype_v34_participant_aliases").select("device_id,label,updated_at");
      if(q.error)throw q.error;
      return J({ok:true,items:q.data||[]});
    }
    if(action==="admin-set-alias"){
      const deviceId=T(b.deviceId,160),label=T(b.label,120);
      if(!deviceId)return J({error:"missing_device_id"},400);
      if(!label){const q=await db.from("prototype_v34_participant_aliases").delete().eq("device_id",deviceId);if(q.error)throw q.error;return J({ok:true,deviceId,label:null});}
      const exists=await db.from("prototype_v34_devices").select("device_id").eq("device_id",deviceId).maybeSingle();
      if(exists.error)throw exists.error;if(!exists.data)return J({error:"device_not_found"},404);
      const q=await db.from("prototype_v34_participant_aliases").upsert({device_id:deviceId,label,updated_at:new Date().toISOString()},{onConflict:"device_id"}).select("device_id,label,updated_at").single();
      if(q.error)throw q.error;
      return J({ok:true,item:q.data});
    }
    return J({error:"unknown_action"},400);
  }catch(e){console.error(e);return J({error:"server_error",detail:String(e?.message||e)},500)}
});