// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const db=createClient(Deno.env.get("SUPABASE_URL")!,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const ORIGIN="https://misskogut.github.io";
const HEADERS={"Access-Control-Allow-Origin":ORIGIN,"Vary":"Origin",
  "Access-Control-Allow-Headers":"content-type,apikey,authorization,x-client-info",
  "Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"no-store, max-age=0","Referrer-Policy":"no-referrer"};
function reply(v,status=200){return new Response(JSON.stringify(v),{status,headers:HEADERS})}
async function sha(value){
 const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
 return Array.from(new Uint8Array(hash)).map(v=>v.toString(16).padStart(2,"0")).join("");
}
function base64url(bytes){
 let value="";for(const b of bytes)value+=String.fromCharCode(b);
 return btoa(value).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
}
async function deriveOwnerKey(ticket){
 // The ticket is not an admin key. This HMAC requires the Supabase server-side
 // secret, and the resulting admin key is sent only after validating expiry.
 const imported=await crypto.subtle.importKey("raw",
  new TextEncoder().encode("SETKA-owner-link-v1:"+serviceKey),
  {name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const mac=await crypto.subtle.sign("HMAC",imported,new TextEncoder().encode(ticket));
 return "SKA-"+base64url(new Uint8Array(mac));
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:HEADERS});
 if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
 if(req.headers.get("Origin")!==ORIGIN)return reply({error:"origin_not_allowed"},403);
 try{
  const b=await req.json().catch(()=>({}));
  if(b.action!=="redeem")return reply({error:"unsupported_action"},400);
  const ticket=String(b.ticket||"");
  if(!/^SETKA1-[a-zA-Z0-9_-]{64}$/.test(ticket))return reply({error:"invalid_link"},400);
  const hash=await sha(ticket),now=new Date().toISOString();
  // Atomic compare-and-consume prevents expired or reused ticket redemption.
  const q=await db.from("prototype_v34_admin_owner_tickets")
   .update({redeemed_at:now}).eq("ticket_hash",hash)
   .is("redeemed_at",null).gt("expires_at",now)
   .select("ticket_hash").maybeSingle();
  if(q.error)throw q.error;
  if(!q.data)return reply({error:"owner_link_expired_or_revoked"},403);
  const adminKey=await deriveOwnerKey(ticket),keyHash=await sha(adminKey);
  const existing=await db.from("admin_keys").select("id,active").eq("key_hash",keyHash).maybeSingle();
  if(existing.error)throw existing.error;
  if(existing.data?.active===false)return reply({error:"owner_access_revoked"},403);
  if(!existing.data){
   const created=await db.from("admin_keys").insert({id:crypto.randomUUID(),key_hash:keyHash,
      label:"owner-link-"+hash.slice(0,12),active:true});
   if(created.error&&created.error.code!=="23505")throw created.error;
  }
  return reply({ok:true,adminKey});
 }catch(e){
  console.error("owner recovery failed",e?.message||"unknown");
  return reply({error:"owner_recovery_unavailable"},503);
 }
});
