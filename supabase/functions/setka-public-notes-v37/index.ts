// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8"};
const J=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const T=(v:any,m=500)=>String(v??"").trim().slice(0,m),O=(v:any)=>v&&typeof v==="object"&&!Array.isArray(v)?v:{},N=(v:any)=>Number.isFinite(Number(v))?Number(v):null,NOW=()=>new Date().toISOString();
const MAX_PUBLIC_PREVIEW_BYTES=180*1024;
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function shaBytes(v:Uint8Array){const d=await crypto.subtle.digest("SHA-256",v);return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function decode64(s:string){const bin=atob(s),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
function preview(v:any){const s=String(v||"");const m=s.match(/^data:(image\/(?:webp|png|jpeg));base64,([A-Za-z0-9+/=]+)$/);if(!m)return null;let bytes;try{bytes=decode64(m[2])}catch(_){return null}if(bytes.byteLength>MAX_PUBLIC_PREVIEW_BYTES)return null;return{mime:m[1],base64:m[2],bytes}}
function cleanVisualMeta(v:any){const x=O(v);if(!Object.keys(x).length)return null;return{version:Math.max(2,Math.round(Number(x.version)||2)),kind:"recipe-cache",cacheKey:T(x.cacheKey,1200)||null,recipeVersion:Math.max(1,Math.round(Number(x.recipeVersion)||1)),rendererVersion:T(x.rendererVersion,120)||"app-v7",patternId:T(x.patternId,100)||null,patternVersion:Math.max(1,Math.round(Number(x.patternVersion)||1)),frame:N(x.frame),configHash:T(x.configHash,500)||null,seed:T(x.seed,200)||null,capturedAt:x.capturedAt?new Date(x.capturedAt).toISOString():null,width:N(x.width),height:N(x.height),sourceWidth:N(x.sourceWidth),sourceHeight:N(x.sourceHeight),mime:T(x.mime,80)||null,bytes:N(x.bytes),storage:"device-cache"}}
function makeCapsule(n:any,pid:string|null,pv:number,cfg:any,frame:number|null,configHash:string|null){const x=O(n.visualCapsule||n.visualRecipe),vp=O(x.viewport),w=Math.max(1,Math.min(1024,Math.round(N(vp.width)||256))),h=Math.max(1,Math.min(1024,Math.round(N(vp.height)||180)));return{version:1,rendererVersion:T(x.rendererVersion,120)||"app-v7",rendererAsset:T(x.rendererAsset,120)||null,patternId:pid,patternVersion:pv,configHash:configHash||null,frame:frame==null?44:frame,seed:T(x.seed,200)||null,viewport:{width:w,height:h,mode:T(vp.mode,40)||"public-note"},config:cfg}}
function renderSignature(cap:any,pv:number,configHash:string|null){return `${cap.rendererVersion}|pv${pv}|f${Number.isFinite(Number(cap.frame))?Number(cap.frame):44}|${configHash||""}`}
async function profile(deviceId:string,token:string){deviceId=T(deviceId,180);token=T(token,300);if(!deviceId||token.length<16)throw new Error("profile_auth_required");const hash=await sha(token);let q=await db.from("prototype_v36_public_profiles").select("device_id,token_hash").eq("device_id",deviceId).maybeSingle();if(q.error)throw q.error;if(!q.data){const ins=await db.from("prototype_v36_public_profiles").insert({device_id:deviceId,token_hash:hash,nickname:"anonymous"}).select("device_id,token_hash").single();if(ins.error)throw ins.error;q={data:ins.data,error:null}}if(q.data.token_hash!==hash)throw new Error("profile_auth_failed");return q.data}
async function accountSession(token:string,deviceId:string){
  token=T(token,200);deviceId=T(deviceId,180);if(!token||!deviceId)return null;
  const now=NOW(),h=await sha(token),dh=await sha(deviceId);
  const q=await db.from("prototype_v40_tester_sessions").select("id,tester_id,device_hash,expires_at").eq("token_hash",h).is("revoked_at",null).gt("expires_at",now).maybeSingle();if(q.error)throw q.error;
  if(!q.data||q.data.device_hash!==dh)return null;
  const a=await db.from("prototype_v40_tester_accounts").select("tester_id,active,password_set_at").eq("tester_id",q.data.tester_id).eq("active",true).maybeSingle();if(a.error)throw a.error;
  if(!a.data?.password_set_at)return null;
  await db.from("prototype_v40_tester_sessions").update({last_seen_at:now}).eq("id",q.data.id);
  return String(a.data.tester_id);
}
async function capsuleMap(keys:string[]){const out=new Map();if(!keys.length)return out;const q=await db.from("prototype_v40_visual_capsules").select("capsule_key,pattern_id,pattern_version,renderer_version,config_key,config,frame,seed,viewport,capsule,snapshot_base64,snapshot_mime,snapshot_bytes,snapshot_sha256,snapshot_signature,public_visible,retain_internal,updated_at").in("capsule_key",keys);if(q.error)throw q.error;for(const x of q.data||[])out.set(String(x.capsule_key),x);return out}
async function feed(testerId:any,limit=100){
  limit=Math.max(1,Math.min(200,Math.round(Number(limit)||100)));
  const q=await db.from("prototype_v36_public_notes").select("id,note_text,pattern_id,pattern_version,config_key,config,preview_frame,visual_snapshot,visual_capsule_key,published_at,created_at").eq("is_public",true).eq("moderation_status","published").not("author_tester_id","is",null).order("published_at",{ascending:false}).limit(limit);if(q.error)throw q.error;
  const notes=q.data||[],ids=notes.map((x:any)=>x.id),cm=await capsuleMap(notes.map((x:any)=>x.visual_capsule_key).filter(Boolean));
  let saves:any[]=[],mine:any[]=[];
  if(ids.length){
    const s=await db.from("prototype_v41_note_saves").select("note_id,saver_tester_id").in("note_id",ids);if(s.error)throw s.error;saves=s.data||[];
    if(testerId){const m=await db.from("prototype_v41_note_saves").select("note_id").eq("saver_tester_id",testerId).in("note_id",ids);if(m.error)throw m.error;mine=m.data||[]}
  }
  const counts=new Map();for(const s of saves)counts.set(s.note_id,(counts.get(s.note_id)||0)+1);const my=new Set(mine.map((x:any)=>x.note_id));
  return notes.map((x:any)=>{const meta=cleanVisualMeta(x.visual_snapshot),cap=x.visual_capsule_key?cm.get(String(x.visual_capsule_key)):null;const fallback={version:1,rendererVersion:meta?.rendererVersion||"app-v7",patternId:x.pattern_id,patternVersion:x.pattern_version||1,configHash:x.config_key||null,frame:x.preview_frame,seed:meta?.seed||null,viewport:{width:256,height:180,mode:"public-note"},config:x.config||{}};const visualCapsule=cap?.capsule&&Object.keys(cap.capsule).length?{...cap.capsule,config:cap.config||x.config||{}}:fallback;const snapshotDataUrl=cap?.public_visible&&cap?.snapshot_base64&&cap?.snapshot_mime?`data:${cap.snapshot_mime};base64,${cap.snapshot_base64}`:null;return{id:x.id,text:x.note_text,patternId:x.pattern_id,patternVersion:x.pattern_version||1,configKey:x.config_key,config:x.config||{},frame:x.preview_frame,visualSnapshot:meta,visualRecipe:visualCapsule,visualCapsule,capsuleKey:x.visual_capsule_key||null,snapshotDataUrl,snapshotSignature:cap?.snapshot_signature||null,createdAt:x.published_at||x.created_at,saves:counts.get(x.id)||0,savedByMe:my.has(x.id)}})
}
async function statusFor(testerId:string){const q=await db.from("prototype_v36_public_notes").select("id,source_note_key,visual_capsule_key,is_public,moderation_status,submitted_at,moderated_at,moderation_reason,published_at").eq("author_tester_id",testerId);if(q.error)throw q.error;return(q.data||[]).map((x:any)=>({id:x.id,sourceNoteKey:x.source_note_key,capsuleKey:x.visual_capsule_key||null,isPublic:!!x.is_public,status:x.moderation_status||"private",moderationStatus:x.moderation_status||"private",submittedAt:x.submitted_at||null,moderatedAt:x.moderated_at||null,reason:x.moderation_reason||null,publishedAt:x.published_at||null}))}
async function existing(testerId:string,source:string){const q=await db.from("prototype_v36_public_notes").select("id,visual_capsule_key,moderation_status,is_public,submitted_at,published_at").eq("author_tester_id",testerId).eq("source_note_key",source).maybeSingle();if(q.error)throw q.error;return q.data}
async function upsertCapsule(noteId:string,n:any,pid:string|null,pv:number,cfg:any,frame:number|null,configHash:string|null){if(!pid)return null;const cap=makeCapsule(n,pid,pv,cfg,frame,configHash),shot=preview(n.publicPreviewDataUrl),key=`public-note:${noteId}`,now=NOW(),row:any={capsule_key:key,scope:"published_note",owner_ref:noteId,pattern_id:pid,pattern_version:pv,renderer_version:cap.rendererVersion,config_key:configHash,config:cfg,frame:cap.frame,seed:cap.seed,viewport:cap.viewport,capsule:cap,public_visible:false,retain_internal:true,updated_at:now};if(shot){row.snapshot_base64=shot.base64;row.snapshot_mime=shot.mime;row.snapshot_bytes=shot.bytes.byteLength;row.snapshot_sha256=await shaBytes(shot.bytes);row.snapshot_signature=renderSignature(cap,pv,configHash)}const q=await db.from("prototype_v40_visual_capsules").upsert(row,{onConflict:"capsule_key"}).select("capsule_key").single();if(q.error)throw q.error;return q.data.capsule_key}
async function hideCapsule(key:string|null,markEnd=false){if(!key)return;const patch:any={public_visible:false,retain_internal:true,updated_at:NOW()};if(markEnd)patch.public_to=NOW();const q=await db.from("prototype_v40_visual_capsules").update(patch).eq("capsule_key",key);if(q.error)throw q.error}
async function submit(testerId:string,deviceId:string,n:any){const source=T(n.id,220),text=T(n.text,5000);if(!source||!text)return{error:"invalid_note",http:400};const ex=await existing(testerId,source);if(ex?.moderation_status==="published"&&ex.is_public)return{ok:true,id:ex.id,capsuleKey:ex.visual_capsule_key||null,status:"published",moderationStatus:"published",already:true,publishedAt:ex.published_at};if(ex?.moderation_status==="pending")return{ok:true,id:ex.id,capsuleKey:ex.visual_capsule_key||null,status:"pending",moderationStatus:"pending",already:true,submittedAt:ex.submitted_at};const now=NOW(),cfg=O(n.visualCapsule?.config||n.visualRecipe?.config||n.config||n.state?.config),pid=T(n.visualCapsule?.patternId||n.visualRecipe?.patternId||n.patternId||n.state?.patternId||cfg?.patternId,100)||null,frame=N(n.visualCapsule?.frame??n.visualRecipe?.frame??n.frame),configHash=T(n.visualCapsule?.configHash||n.visualRecipe?.configHash||n.configHash||n.state?.configKey,500)||null,pv=Math.max(1,Math.round(Number(n.visualCapsule?.patternVersion||n.visualRecipe?.patternVersion||n.patternVersion)||1));const row={author_device_id:deviceId,author_tester_id:testerId,source_note_key:source,note_text:text,session_id:null,pattern_id:pid,pattern_version:pv,config_key:configHash,config:cfg,preview_frame:frame,visual_snapshot:cleanVisualMeta(n.visualSnapshot||{patternId:pid,patternVersion:pv,configHash,frame,rendererVersion:n.visualCapsule?.rendererVersion||n.visualRecipe?.rendererVersion}),is_public:false,moderation_status:"pending",submitted_at:now,moderated_at:null,moderation_reason:null,published_at:null,updated_at:now};const q=await db.from("prototype_v36_public_notes").upsert(row,{onConflict:"author_tester_id,source_note_key"}).select("id,submitted_at").single();if(q.error)throw q.error;const capsuleKey=await upsertCapsule(q.data.id,n,pid,pv,cfg,frame,configHash);if(capsuleKey){const u=await db.from("prototype_v36_public_notes").update({visual_capsule_key:capsuleKey,updated_at:now}).eq("id",q.data.id);if(u.error)throw u.error}return{ok:true,id:q.data.id,capsuleKey,status:"pending",moderationStatus:"pending",submittedAt:q.data.submitted_at}}
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:H});
  if(req.method!=="POST")return J({error:"method_not_allowed"},405);
  try{
    const b=await req.json().catch(()=>({})),action=T(b.action,80),deviceId=T(b.deviceId,180),sessionToken=T(b.sessionToken,200);
    const testerId=await accountSession(sessionToken,deviceId);
    if(action==="feed")return J({ok:true,items:await feed(testerId,b.limit),visuals:"capsule-plus-retained-preview"});
    if(!testerId)return J({error:"account_auth_required"},403);
    if(action==="my-status")return J({ok:true,items:await statusFor(testerId)});
    if(action==="submit"||action==="publish"){
      const me=await profile(deviceId,T(b.profileToken,300));
      const r:any=await submit(testerId,me.device_id,O(b.note));if(r?.error)return J({error:r.error},r.http||400);return J(r)
    }
    if(action==="cancel-submit"||action==="cancel-submission"){
      const source=T(b.sourceNoteKey,220),now=NOW(),old=await existing(testerId,source);
      const q=await db.from("prototype_v36_public_notes").update({moderation_status:"private",is_public:false,submitted_at:null,moderated_at:null,moderation_reason:null,published_at:null,updated_at:now}).eq("author_tester_id",testerId).eq("source_note_key",source).eq("moderation_status","pending").select("id,visual_capsule_key").maybeSingle();if(q.error)throw q.error;if(q.data)await hideCapsule(q.data.visual_capsule_key||old?.visual_capsule_key||null,false);
      return J({ok:true,cancelled:!!q.data,status:"private",moderationStatus:"private"})
    }
    if(action==="unpublish"){
      const source=T(b.sourceNoteKey,220),now=NOW();
      const q=await db.from("prototype_v36_public_notes").update({moderation_status:"unpublished",is_public:false,moderated_at:now,updated_at:now}).eq("author_tester_id",testerId).eq("source_note_key",source).eq("moderation_status","published").select("id,visual_capsule_key").maybeSingle();if(q.error)throw q.error;if(q.data)await hideCapsule(q.data.visual_capsule_key||null,true);
      return J({ok:true,unpublished:!!q.data,status:"unpublished",moderationStatus:"unpublished"})
    }
    if(action==="save"){
      const id=T(b.id,80),chk=await db.from("prototype_v36_public_notes").select("id").eq("id",id).eq("is_public",true).eq("moderation_status","published").not("author_tester_id","is",null).maybeSingle();if(chk.error)throw chk.error;if(!chk.data)return J({error:"note_not_public"},404);
      const q=await db.from("prototype_v41_note_saves").upsert({note_id:id,saver_tester_id:testerId},{onConflict:"note_id,saver_tester_id"});if(q.error)throw q.error;
      return J({ok:true,saved:true})
    }
    return J({error:"unknown_action"},400)
  }catch(e){console.error(e);const msg=String(e?.message||e);return J({error:msg.includes("profile_auth")?"profile_auth_failed":"server_error",detail:msg},msg.includes("profile_auth")?403:500)}
});