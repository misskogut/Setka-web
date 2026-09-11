import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"content-type,apikey",
  "Access-Control-Allow-Methods":"POST,OPTIONS",
  "Content-Type":"application/json; charset=utf-8"
};
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:CORS});
const clean=(v:any,n=500)=>String(v??"").trim().slice(0,n);
const bytesHex=(b:Uint8Array)=>[...b].map(x=>x.toString(16).padStart(2,"0")).join("");
const hexBytes=(h:string)=>new Uint8Array((h.match(/.{1,2}/g)||[]).map(x=>parseInt(x,16)));
const sha256=async(s:string)=>{const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return bytesHex(new Uint8Array(d));};
const derivePin=async(pin:string,saltHex:string,iterations:number)=>{const raw=await crypto.subtle.importKey("raw",new TextEncoder().encode(pin),"PBKDF2",false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:hexBytes(saltHex),iterations},raw,256);return bytesHex(new Uint8Array(bits));};
const sameHex=(a:string,b:string)=>{if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0;};
const randomHex=(n:number)=>{const b=new Uint8Array(n);crypto.getRandomValues(b);return bytesHex(b)};
const randomToken=()=>{const b=new Uint8Array(32);crypto.getRandomValues(b);return btoa(String.fromCharCode(...b)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","")};

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:CORS});
  if(req.method!=="POST") return json({ok:false,error:"method_not_allowed"},405);
  const url=Deno.env.get("SUPABASE_URL"),svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!svc) return json({ok:false,error:"server_not_configured"},500);
  const db=createClient(url,svc,{auth:{persistSession:false}});const f=db.schema("foundation"),d=db.schema("diamond");
  const body=await req.json().catch(()=>({}));
  const setkaId=clean(body.setkaId,64).toUpperCase(),pin=clean(body.pin,16);
  if(!/^SETKA-H-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(setkaId)||!/^\d{6}$/.test(pin)) return json({ok:false,error:"invalid_credentials"},401);

  let q=f.from("verstak_user_credentials").select("*").eq("login_setka_id",setkaId).eq("state","ACTIVE");
  const shipHint=clean(body.shipCode,100);if(shipHint)q=q.eq("ship_code",shipHint);
  const {data:creds,error:ce}=await q.limit(2);
  if(ce||!creds?.length)return json({ok:false,error:"invalid_credentials"},401);
  if(creds.length>1&&!shipHint)return json({ok:false,error:"ship_required"},409);
  const cred:any=creds[0];
  if(cred.locked_until&&Date.parse(cred.locked_until)>Date.now())return json({ok:false,error:"temporarily_locked"},429);

  let accepted=false;
  const resetArmed=cred.pin_reset_armed===true && cred.pin_reset_expires_at && Date.parse(cred.pin_reset_expires_at)>Date.now();
  if(resetArmed){
    const saltHex=randomHex(16),iterations=120000,pinHash=await derivePin(pin,saltHex,iterations);
    const {error:re}=await f.from("verstak_user_credentials").update({pin_salt_hex:saltHex,pin_hash_hex:pinHash,pbkdf2_iterations:iterations,pin_reset_armed:false,pin_reset_expires_at:null,failed_attempts:0,locked_until:null,last_failed_at:null,updated_at:new Date().toISOString()}).eq("identity_id",cred.identity_id).eq("ship_code",cred.ship_code).eq("pin_reset_armed",true);
    if(re)return json({ok:false,error:"pin_reset_failed"},500);
    accepted=true;
  } else {
    if(cred.pin_reset_armed===true){await f.from("verstak_user_credentials").update({pin_reset_armed:false,pin_reset_expires_at:null,updated_at:new Date().toISOString()}).eq("identity_id",cred.identity_id).eq("ship_code",cred.ship_code);}
    const derived=await derivePin(pin,cred.pin_salt_hex,Number(cred.pbkdf2_iterations)||120000);
    if(sameHex(derived,cred.pin_hash_hex)) accepted=true;
  }

  if(!accepted){
    const attempts=(Number(cred.failed_attempts)||0)+1;const locked=attempts>=5?new Date(Date.now()+10*60*1000).toISOString():null;
    await f.from("verstak_user_credentials").update({failed_attempts:attempts,locked_until:locked,last_failed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("identity_id",cred.identity_id).eq("ship_code",cred.ship_code);
    return json({ok:false,error:locked?"temporarily_locked":"invalid_credentials"},locked?429:401);
  }

  const {data:ident}=await d.from("identities").select("setka_id,status").eq("id",cred.identity_id).maybeSingle();
  if(!ident||ident.status!=="active")return json({ok:false,error:"identity_inactive"},403);
  const token=randomToken(),tokenHash=await sha256(token),expires=new Date(Date.now()+30*24*60*60*1000).toISOString();
  const {error:se}=await f.from("verstak_user_sessions").insert({identity_id:cred.identity_id,ship_code:cred.ship_code,session_token_sha256:tokenHash,expires_at:expires,user_agent:clean(req.headers.get("user-agent"),500),created_via:resetArmed?"SETKA_ID_PIN_FIRST_CLAIM":"SETKA_ID_PIN"});
  if(se)return json({ok:false,error:"session_create_failed"},500);
  await f.from("verstak_user_credentials").update({failed_attempts:0,locked_until:null,last_login_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("identity_id",cred.identity_id).eq("ship_code",cred.ship_code);
  const {data:inv}=await f.from("verstak_access_invites").select("display_name_ru").eq("identity_id",cred.identity_id).eq("ship_code",cred.ship_code).eq("state","ACTIVE").order("created_at",{ascending:false}).limit(1).maybeSingle();
  return json({ok:true,accessToken:token,expiresAt:expires,identity:{setkaId:ident.setka_id,displayNameRu:inv?.display_name_ru||"Пользователь"},shipCode:cred.ship_code,pinClaimed:resetArmed});
});