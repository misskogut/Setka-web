// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8"};
const J=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const T=(v:any,m=500)=>String(v??"").trim().slice(0,m);
const CONSENT_VERSION="research-v2-2026-09-17";
const CONSENT_TEXT="SETKA не запрашивает имя, телефон или электронную почту. Личная история, заметки, состояния и персональная аналитика могут храниться в приватном контуре SETKA и использоваться системой для персонализации, динамики и восстановления кабинета. Эти данные не публикуются и не показываются другим пользователям. Визуальные превью паттернов по умолчанию создаются на устройстве и хранятся только во временном локальном кэше; источником истины служит компактная кодовая капсула с числовым рецептом паттерна. Для общего исследовательского слоя используются отдельные обезличенные показатели паттернов и конфигураций. Публичная публикация заметки возможна только отдельным действием пользователя и после модерации. Для одобренной публичной заметки SETKA может хранить уменьшенную серверную миниатюру связанного визуала для быстрого отображения. После снятия публикации эта миниатюра перестаёт отдаваться публично, но может сохраняться во внутреннем архиве SETKA вместе с кодовой капсулой.";
const ITER=210000,SESSION_DAYS=30;
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function rnd(n=32){const a=new Uint8Array(n);crypto.getRandomValues(a);return[...a].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function pbkdf(password:string,saltHex:string,iterations=ITER){const enc=new TextEncoder(),base=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);const salt=new Uint8Array((saltHex.match(/../g)||[]).map(x=>parseInt(x,16)));const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations},base,256);return[...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function adminAuth(k:string){if(!k)return false;const q=await db.from("admin_keys").select("id").eq("key_hash",await sha(T(k,300))).eq("active",true).maybeSingle();if(q.error)throw q.error;return!!q.data}
async function account(tid:string){const q=await db.from("prototype_v40_tester_accounts").select("tester_id,password_salt,password_hash,password_iterations,password_set_at,consent_version,consent_at,active,last_login_at,created_at,updated_at").eq("tester_id",tid).maybeSingle();if(q.error)throw q.error;return q.data||null}
async function ensureAccount(tid:string){let a=await account(tid);if(a)return a;const q=await db.from("prototype_v40_tester_accounts").insert({tester_id:tid}).select("tester_id,password_salt,password_hash,password_iterations,password_set_at,consent_version,consent_at,active,last_login_at,created_at,updated_at").single();if(q.error)throw q.error;return q.data}
async function ensureDevice(deviceId:string,tid:string,userAgent:any=null,viewport:any=null){
 if(!deviceId)throw new Error("device_id_required");
 // Identity is immutable for this browser/device. Neither login nor password
 // recovery is allowed to silently reassign another tester's device and archive.
 const [existing,archives,claims]=await Promise.all([
  db.from("prototype_v34_devices").select("device_id,subject_key").eq("device_id",deviceId).maybeSingle(),
  db.from("prototype_v37_tester_private_archives").select("tester_id").eq("device_id",deviceId).maybeSingle(),
  db.from("prototype_v34_tester_codes").select("tester_id").eq("claimed_device_id",deviceId).eq("active",true).limit(2)
 ]);
 for(const q of [existing,archives,claims])if(q.error)throw q.error;
 if((existing.data?.subject_key&&existing.data.subject_key!==tid)||
    (archives.data?.tester_id&&archives.data.tester_id!==tid)||
    (claims.data||[]).some(x=>x.tester_id!==tid))throw new Error("device_already_has_tester_id");
 const now=new Date().toISOString(),row={device_id:deviceId,label:"Тестировщик",
  subject_key:tid,channel:"yulia_lab_v34",last_seen_at:now,user_agent:T(userAgent,1000)||null,
  viewport:viewport&&typeof viewport==="object"?viewport:{},
  app_version:"standalone-v40-private-cloud",active:true,updated_at:now};
 if(existing.data){
  // Compare-and-swap: if another login bound it between read and update,
  // never overwrite the new owner.
  let query=db.from("prototype_v34_devices").update(row).eq("device_id",deviceId);
  query=existing.data.subject_key?query.eq("subject_key",tid):query.is("subject_key",null);
  const updated=await query.select("device_id").maybeSingle();
  if(updated.error)throw updated.error;
  if(!updated.data)throw new Error("device_already_has_tester_id");
 }else{
  const inserted=await db.from("prototype_v34_devices").insert({...row,first_seen_at:now});
  if(inserted.error){
   if(inserted.error.code==="23505")throw new Error("device_already_has_tester_id");
   throw inserted.error;
  }
 }
}
async function rate(scope:string,action:string,limit=8,minutes=15){const scopeHash=await sha(scope),since=new Date(Date.now()-minutes*60000).toISOString(),q=await db.from("prototype_v40_auth_attempts").select("id",{count:"exact",head:true}).eq("scope_hash",scopeHash).eq("action",action).eq("success",false).gte("attempted_at",since);if(q.error)throw q.error;return{scopeHash,blocked:(q.count||0)>=limit}}
async function attempt(scopeHash:string,action:string,success:boolean){const q=await db.from("prototype_v40_auth_attempts").insert({scope_hash:scopeHash,action,success});if(q.error)console.error(q.error)}
async function revokeDeviceSessions(tid:string,deviceId:string|null){if(!deviceId)return;const dh=await sha(deviceId),now=new Date().toISOString(),q=await db.from("prototype_v40_tester_sessions").update({revoked_at:now}).eq("tester_id",tid).eq("device_hash",dh).is("revoked_at",null);if(q.error)throw q.error}
async function issue(tid:string,deviceId:string|null){const token=rnd(32),tokenHash=await sha(token),now=new Date(),exp=new Date(now.getTime()+SESSION_DAYS*86400000),q=await db.from("prototype_v40_tester_sessions").insert({tester_id:tid,token_hash:tokenHash,device_hash:deviceId?await sha(deviceId):null,expires_at:exp.toISOString()});if(q.error)throw q.error;return{token,expiresAt:exp.toISOString()}}
async function session(token:string,touch=true){if(!token)return null;const h=await sha(token),now=new Date().toISOString(),q=await db.from("prototype_v40_tester_sessions").select("id,tester_id,expires_at,revoked_at").eq("token_hash",h).is("revoked_at",null).gt("expires_at",now).maybeSingle();if(q.error)throw q.error;if(!q.data)return null;if(touch)await db.from("prototype_v40_tester_sessions").update({last_seen_at:now}).eq("id",q.data.id);return q.data}
async function consent(tid:string){const a=await account(tid);return{consented:!!(a?.consent_at&&a?.consent_version===CONSENT_VERSION),version:a?.consent_version||null,at:a?.consent_at||null}}
async function recordConsent(tid:string){const now=new Date().toISOString(),textHash=await sha(CONSENT_TEXT),iq=await db.from("prototype_v40_tester_consents").insert({tester_id:tid,consent_version:CONSENT_VERSION,accepted:true,accepted_at:now,text_hash:textHash});if(iq.error)throw iq.error;const uq=await db.from("prototype_v40_tester_accounts").update({consent_version:CONSENT_VERSION,consent_at:now,updated_at:now}).eq("tester_id",tid);if(uq.error)throw uq.error;return{version:CONSENT_VERSION,at:now}}
async function statusFor(tid:string,authenticated=false,expiresAt:any=null){const a=await ensureAccount(tid),c=await consent(tid);return{testerId:tid,authenticated,hasPassword:!!a.password_hash,passwordSetAt:a.password_set_at||null,consented:c.consented,consentVersion:c.version,consentAt:c.at,requiredConsentVersion:CONSENT_VERSION,sessionExpiresAt:expiresAt||null,privacyMode:"private-account-corpus",personalizationCorpus:authenticated?"available":"locked",researchBridge:c.consented?"eligible":"off"}}
Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response("ok",{headers:H});if(req.method!=="POST")return J({error:"method_not_allowed"},405);try{const b=await req.json().catch(()=>({})),action=T(b.action,60),deviceId=T(b.deviceId,180),token=T(b.sessionToken,200);
 if(action==="consent-copy")return J({ok:true,version:CONSENT_VERSION,text:CONSENT_TEXT});
 if(action==="claim"){
  const code=T(b.testerCode,120).toUpperCase();if(!deviceId||!code)return J({error:"missing_identity"},400);const rr=await rate(`claim|${deviceId}`,"claim",8,15);if(rr.blocked)return J({error:"too_many_attempts"},429);const hash=await sha(code),q=await db.from("prototype_v34_tester_codes").select("tester_id,active,claimed_device_id,claimed_at,consumed_at").eq("claim_hash",hash).maybeSingle();if(q.error)throw q.error;if(!q.data||!q.data.active||q.data.consumed_at){await attempt(rr.scopeHash,"claim",false);return J({error:"invalid_tester_code"},404)}
  const current=await db.from("prototype_v34_tester_codes").select("tester_id").eq("claimed_device_id",deviceId).eq("active",true).maybeSingle();if(current.error)throw current.error;if(current.data&&current.data.tester_id!==q.data.tester_id){await attempt(rr.scopeHash,"claim",false);return J({error:"device_already_has_tester_id",testerId:current.data.tester_id},409)}if(q.data.claimed_device_id&&q.data.claimed_device_id!==deviceId){await attempt(rr.scopeHash,"claim",false);return J({error:"tester_id_already_claimed"},409)}
  const now=new Date().toISOString();await ensureDevice(deviceId,q.data.tester_id,b.userAgent,b.viewport);const u=await db.from("prototype_v34_tester_codes").update({claimed_device_id:deviceId,claimed_at:q.data.claimed_at||now,consumed_at:now,updated_at:now}).eq("tester_id",q.data.tester_id).is("consumed_at",null).select("tester_id").maybeSingle();if(u.error)throw u.error;if(!u.data){await attempt(rr.scopeHash,"claim",false);return J({error:"invalid_tester_code"},409)}await ensureAccount(q.data.tester_id);await attempt(rr.scopeHash,"claim",true);return J({ok:true,claimed:true,codeConsumed:true,...await statusFor(q.data.tester_id,false,null)});
 }
 if(action==="status"){const hadToken=!!token,s=await session(token);if(s)return J({ok:true,claimed:true,sessionInvalid:false,...await statusFor(s.tester_id,true,s.expires_at)});if(deviceId){const q=await db.from("prototype_v34_tester_codes").select("tester_id,claimed_at").eq("claimed_device_id",deviceId).eq("active",true).maybeSingle();if(q.error)throw q.error;if(q.data)return J({ok:true,claimed:true,claimedAt:q.data.claimed_at,sessionInvalid:hadToken,...await statusFor(q.data.tester_id,false,null)})}return J({ok:true,claimed:false,authenticated:false,sessionInvalid:hadToken,requiredConsentVersion:CONSENT_VERSION,privacyMode:"private-account-corpus"})}
 if(action==="set-password"){const tid=T(b.testerId,80),password=String(b.password||"");if(!tid||!deviceId)return J({error:"missing_identity"},400);if(password.length<8||password.length>128)return J({error:"password_length"},400);if(b.acceptConsent!==true||T(b.consentVersion,80)!==CONSENT_VERSION)return J({error:"consent_required",requiredConsentVersion:CONSENT_VERSION},400);const cq=await db.from("prototype_v34_tester_codes").select("claimed_device_id,active,consumed_at").eq("tester_id",tid).maybeSingle();if(cq.error)throw cq.error;if(!cq.data?.active||!cq.data.consumed_at||cq.data.claimed_device_id!==deviceId)return J({error:"claim_proof_required"},403);const a=await ensureAccount(tid);if(a.password_hash)return J({error:"password_already_set"},409);const salt=rnd(16),ph=await pbkdf(password,salt,ITER),now=new Date().toISOString(),uq=await db.from("prototype_v40_tester_accounts").update({password_salt:salt,password_hash:ph,password_iterations:ITER,password_set_at:now,updated_at:now}).eq("tester_id",tid);if(uq.error)throw uq.error;await recordConsent(tid);await revokeDeviceSessions(tid,deviceId);const ss=await issue(tid,deviceId);return J({ok:true,...await statusFor(tid,true,ss.expiresAt),sessionToken:ss.token})}
 if(action==="login"){const tid=T(b.testerId,80).toUpperCase(),password=String(b.password||"");if(!tid||!password)return J({error:"missing_credentials"},400);if(!deviceId)return J({error:"device_id_required"},400);const rr=await rate(`login|${tid}|${deviceId||"none"}`,"login",10,15);if(rr.blocked)return J({error:"too_many_attempts"},429);const a=await account(tid);if(!a?.active||!a.password_hash||!a.password_salt){await attempt(rr.scopeHash,"login",false);return J({error:"invalid_credentials"},403)}const ph=await pbkdf(password,a.password_salt,a.password_iterations||ITER);if(ph!==a.password_hash){await attempt(rr.scopeHash,"login",false);return J({error:"invalid_credentials"},403)}await attempt(rr.scopeHash,"login",true);const now=new Date().toISOString();await db.from("prototype_v40_tester_accounts").update({last_login_at:now,updated_at:now}).eq("tester_id",tid);if(deviceId)await ensureDevice(deviceId,tid,b.userAgent,b.viewport);await revokeDeviceSessions(tid,deviceId||null);const ss=await issue(tid,deviceId||null);return J({ok:true,...await statusFor(tid,true,ss.expiresAt),sessionToken:ss.token})}
 if(action==="accept-consent"){const s=await session(token);if(!s)return J({error:"auth_required"},401);if(b.acceptConsent!==true||T(b.consentVersion,80)!==CONSENT_VERSION)return J({error:"consent_required",requiredConsentVersion:CONSENT_VERSION},400);await recordConsent(s.tester_id);return J({ok:true,...await statusFor(s.tester_id,true,s.expires_at)})}
 if(action==="change-password"){const s=await session(token);if(!s)return J({error:"auth_required"},401);const current=String(b.currentPassword||""),next=String(b.newPassword||"");if(next.length<8||next.length>128)return J({error:"password_length"},400);const a=await account(s.tester_id);if(!a?.password_hash||await pbkdf(current,a.password_salt,a.password_iterations||ITER)!==a.password_hash)return J({error:"invalid_credentials"},403);const salt=rnd(16),ph=await pbkdf(next,salt,ITER),now=new Date().toISOString(),q=await db.from("prototype_v40_tester_accounts").update({password_salt:salt,password_hash:ph,password_iterations:ITER,password_set_at:now,updated_at:now}).eq("tester_id",s.tester_id);if(q.error)throw q.error;await db.from("prototype_v40_tester_sessions").update({revoked_at:now}).eq("tester_id",s.tester_id).neq("id",s.id).is("revoked_at",null);return J({ok:true,...await statusFor(s.tester_id,true,s.expires_at)})}
 if(action==="logout"){const s=await session(token,false);if(s)await db.from("prototype_v40_tester_sessions").update({revoked_at:new Date().toISOString()}).eq("id",s.id);return J({ok:true})}
 if(action==="diagnostic"){const s=await session(token);if(!s)return J({ok:true,ignored:true});const q=await db.from("prototype_v40_client_diagnostics").insert({tester_id:s.tester_id,build:T(b.build,100)||"unknown",kind:T(b.kind,80)||"event",code:T(b.code,160)||null,screen:T(b.screen,80)||null,online:b.online==null?null:!!b.online});if(q.error)throw q.error;return J({ok:true})}
 if(action==="admin-create-recovery"){
   if(!(await adminAuth(T(b.adminKey,300))))return J({error:"invalid_admin_key"},403);
   const tid=T(b.testerId,80).toUpperCase();if(!tid)return J({error:"tester_id_required"},400);
   const a=await account(tid);if(!a?.active)return J({error:"tester_not_found"},404);if(!a?.password_hash)return J({error:"password_not_set"},409);
   const now=new Date(),exp=new Date(now.getTime()+24*60*60*1000),code=`REC-${rnd(4).toUpperCase()}-${rnd(4).toUpperCase()}`,hash=await sha(code);
   const old=await db.from("prototype_v40_tester_recovery_codes").update({consumed_at:now.toISOString()}).eq("tester_id",tid).is("consumed_at",null);if(old.error)throw old.error;
   const iq=await db.from("prototype_v40_tester_recovery_codes").insert({tester_id:tid,code_hash:hash,expires_at:exp.toISOString()});if(iq.error)throw iq.error;
   return J({ok:true,testerId:tid,recoveryCode:code,expiresAt:exp.toISOString()});
 }
 if(action==="recover-password"){
   const tid=T(b.testerId,80).toUpperCase(),code=T(b.recoveryCode,120).toUpperCase(),password=String(b.newPassword||"");
   if(!tid||!code||!deviceId)return J({error:"missing_recovery_fields"},400);
   if(password.length<8||password.length>128)return J({error:"password_length"},400);
   const rr=await rate(`recover|${tid}|${deviceId}`,"recover-password",8,30);if(rr.blocked)return J({error:"too_many_attempts"},429);
   const hash=await sha(code),now=new Date().toISOString(),rq=await db.from("prototype_v40_tester_recovery_codes").select("id,expires_at").eq("tester_id",tid).eq("code_hash",hash).is("consumed_at",null).gt("expires_at",now).maybeSingle();
   if(rq.error)throw rq.error;if(!rq.data){await attempt(rr.scopeHash,"recover-password",false);return J({error:"invalid_recovery_code"},403)}
   const a=await account(tid);if(!a?.active){await attempt(rr.scopeHash,"recover-password",false);return J({error:"invalid_recovery_code"},403)}
   await ensureDevice(deviceId,tid,b.userAgent,b.viewport);const salt=rnd(16),ph=await pbkdf(password,salt,ITER),uq=await db.from("prototype_v40_tester_accounts").update({password_salt:salt,password_hash:ph,password_iterations:ITER,password_set_at:now,last_login_at:now,updated_at:now}).eq("tester_id",tid);if(uq.error)throw uq.error;
   const rv=await db.from("prototype_v40_tester_sessions").update({revoked_at:now}).eq("tester_id",tid).is("revoked_at",null);if(rv.error)throw rv.error;
   const cq=await db.from("prototype_v40_tester_recovery_codes").update({consumed_at:now}).eq("id",rq.data.id).is("consumed_at",null);if(cq.error)throw cq.error;
   await attempt(rr.scopeHash,"recover-password",true);const ss=await issue(tid,deviceId);
   return J({ok:true,recovered:true,...await statusFor(tid,true,ss.expiresAt),sessionToken:ss.token});
 }
 if(action==="admin-list"){if(!(await adminAuth(T(b.adminKey,300))))return J({error:"invalid_admin_key"},403);const q=await db.from("prototype_v40_tester_accounts").select("tester_id,password_set_at,consent_version,consent_at,active,last_login_at,created_at,updated_at").order("created_at",{ascending:false}).limit(500);if(q.error)throw q.error;return J({ok:true,items:q.data||[]})}
 return J({error:"unknown_action"},400)
}catch(e){if(e?.message==="device_already_has_tester_id")return J({error:"device_already_has_tester_id"},409);if(e?.message==="device_id_required")return J({error:"device_id_required"},400);console.error(e);return J({error:"server_error"},500)}});