// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8"};
const J=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const T=(v:any,m=500)=>String(v??"").trim().slice(0,m);
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function adminAuth(k:string){if(!k)return false;const q=await db.from("admin_keys").select("id").eq("key_hash",await sha(T(k,300))).eq("active",true).maybeSingle();if(q.error)throw q.error;return!!q.data}
async function session(token:string){if(!token)return null;const h=await sha(token),now=new Date().toISOString();const q=await db.from("prototype_v40_tester_sessions").select("id,tester_id,expires_at,revoked_at").eq("token_hash",h).is("revoked_at",null).gt("expires_at",now).maybeSingle();if(q.error)throw q.error;if(!q.data)return null;await db.from("prototype_v40_tester_sessions").update({last_seen_at:now}).eq("id",q.data.id);return q.data}
function arr(v:any,max=20000){return Array.isArray(v)?v.slice(-max):[]}
function obj(v:any){return v&&typeof v==="object"&&!Array.isArray(v)?v:{}}
function stripHeavy(v:any):any{if(v==null||typeof v!=="object")return v;if(Array.isArray(v))return v.map(stripHeavy);const out:any={};for(const [k,val] of Object.entries(v)){if(["dataUrl","imageDataUrl","blob","imageBlob"].includes(k))continue;out[k]=stripHeavy(val)}return out}
function cleanArchive(v:any){const d=obj(stripHeavy(v));return{version:Number(d.version)||41,createdAt:d.createdAt||null,sessions:arr(d.sessions,10000),notes:arr(d.notes,10000),symptoms:arr(d.symptoms,10000),checkins:arr(d.checkins,10000),events:arr(d.events,30000),patternExposures:arr(d.patternExposures,30000),physio:obj(d.physio),invites:arr(d.invites,5000),settings:obj(d.settings)}}
function counts(payload:any,favorites:any[]=[]){const p=obj(payload),x=arr(p.patternExposures),f=arr(favorites),patterns=new Set<string>(),configs=new Set<string>();for(const e of x){if(e?.patternId)patterns.add(String(e.patternId));if(e?.configKey)configs.add(String(e.configKey))}for(const v of f){const pid=v?.patternId||v?.baseId||v?.config?.patternId;if(pid)patterns.add(String(pid));const ck=v?.configKey;if(ck)configs.add(String(ck))}return{sessions:arr(p.sessions).length,notes:arr(p.notes).length,symptoms:arr(p.symptoms).length,checkins:arr(p.checkins).length,events:arr(p.events).length,exposures:x.length,patterns:patterns.size,configs:configs.size,physio:Array.isArray(p.physio?.samples)?p.physio.samples.length:0,favorites:f.length}}
function stamp(x:any){for(const k of ["updatedAt","endedAt","observedAt","wallAt","capturedAt","createdAt","startedAt"]){const t=Date.parse(String(x?.[k]||""));if(Number.isFinite(t))return t}return 0}
function itemKey(x:any,i:number,prefix:string){if(x&&typeof x==="object"){for(const k of ["id","exposureId","sourceId"]){if(x[k]!=null&&String(x[k]))return `${prefix}:${k}:${String(x[k])}`}try{return `${prefix}:anon:${JSON.stringify(x)}`}catch(_){}}return `${prefix}:anon:${i}:${String(x)}`}
function noteCompleteness(x:any){if(!x||typeof x!=="object")return 0;let n=0;if(x.replaySnapshot?.config&&x.replaySnapshot?.patternId)n+=8;if(x.replaySnapshot?.frame!=null)n+=4;if(x.visualRecipe?.config&&x.visualRecipe?.patternId)n+=2;if(x.config&&x.patternId)n+=1;return n}
function mergeItems(rows:any[],field:string,max:number){const m=new Map<string,any>();let i=0;for(const row of rows){for(const x of arr(row?.payload?.[field],max)){const k=itemKey(x,i++,field),old=m.get(k);if(!old){m.set(k,x);continue}const t=stamp(x)-stamp(old);if(t>0||(t===0&&(field!=="notes"||noteCompleteness(x)>=noteCompleteness(old))))m.set(k,x)}}return [...m.values()].sort((a,b)=>stamp(a)-stamp(b)).slice(-max)}
function mergePhysio(rows:any[]){const samples=mergeItems(rows.map(r=>({payload:{samples:r?.payload?.physio?.samples||[]}})),"samples",10000);const sources=mergeItems(rows.map(r=>({payload:{sources:r?.payload?.physio?.sources||[]}})),"sources",2000);return{samples,sources}}
function favoriteKey(x:any,i:number){if(x?.config){try{return `cfg:${String(x.baseId||x.patternId||x.config?.patternId||"")}:${JSON.stringify(x.config)}`}catch(_){}}if(x?.id)return `id:${String(x.id)}`;return `anon:${i}:${JSON.stringify(x)}`}
function mergeRows(rows:any[]){if(!rows.length)return null;const payload:any={version:41,createdAt:null,sessions:mergeItems(rows,"sessions",10000),notes:mergeItems(rows,"notes",10000),symptoms:mergeItems(rows,"symptoms",10000),checkins:mergeItems(rows,"checkins",10000),events:mergeItems(rows,"events",30000),patternExposures:mergeItems(rows,"patternExposures",30000),physio:mergePhysio(rows),invites:mergeItems(rows,"invites",5000),settings:{}};for(const r of rows){const p=obj(r.payload);payload.version=Math.max(payload.version,Number(p.version)||0);if(p.createdAt&&(!payload.createdAt||Date.parse(p.createdAt)<Date.parse(payload.createdAt)))payload.createdAt=p.createdAt;payload.settings={...payload.settings,...obj(p.settings)}}const removed=new Set(payload.events.filter((e:any)=>e?.type==="favorite_remove"&&e?.payload?.favoriteId).map((e:any)=>String(e.payload.favoriteId)));const fm=new Map<string,any>();let i=0;for(const r of rows){for(const f of arr(r.favorites,10000)){if(f?.id&&removed.has(String(f.id)))continue;const k=favoriteKey(f,i++),old=fm.get(k);if(!old||stamp(f)>=stamp(old))fm.set(k,f)}}const favorites=[...fm.values()].slice(-10000);const latest=rows[rows.length-1];return{payload,favorites,capturedAt:latest.captured_at,updatedAt:latest.updated_at,sourceDevices:new Set(rows.map((x:any)=>String(x.device_id))).size}}
async function assertDevice(deviceId:string,testerId:string){const q=await db.from("prototype_v34_devices").select("device_id,subject_key").eq("device_id",deviceId).maybeSingle();if(q.error)throw q.error;return!!q.data&&q.data.subject_key===testerId}
async function ensureLegacyArchive(testerId:string){
  const ex=await db.from("prototype_v37_tester_private_archives").select("device_id").eq("tester_id",testerId).limit(1);if(ex.error)throw ex.error;if((ex.data||[]).length)return;
  const cq=await db.from("prototype_v34_tester_codes").select("claimed_device_id").eq("tester_id",testerId).eq("active",true).maybeSingle();if(cq.error)throw cq.error;
  const deviceId=T(cq.data?.claimed_device_id,180);if(!deviceId)return;
  const anon=`anon-${(await sha(`community|${deviceId}`)).slice(0,32)}`;
  const [snap,ses,exp,evt,fav]=await Promise.all([
    db.from("prototype_v34_snapshots").select("payload,captured_at,updated_at").eq("device_id",deviceId).order("updated_at",{ascending:false}).limit(1),
    db.from("prototype_v34_sessions").select("session_id,started_at,ended_at,request_key,pre_state,post_state,helped,planned_seconds,measured_active_ms,after_feedback_active_ms,continued_after_feedback,completed,completion_reason,session_type,updated_at").eq("device_id",deviceId).order("started_at",{ascending:true}).limit(10000),
    db.from("prototype_v35_pattern_exposures").select("exposure_id,visit_id,session_id,session_type,context,request_key,pattern_id,config_key,config,source_type,source_id,community_id,started_at,ended_at,duration_ms,entry_reason,updated_at").eq("device_id",deviceId).order("started_at",{ascending:true}).limit(30000),
    db.from("prototype_v34_raw_events").select("event_id,visit_id,session_id,type,wall_at,phase,t_ms,payload").eq("device_id",deviceId).order("wall_at",{ascending:true}).limit(30000),
    db.from("prototype_v35_favorites").select("favorite_id,config_key,pattern_id,config,saved_at,source_type,updated_at").in("device_id",[deviceId,anon]).order("saved_at",{ascending:true}).limit(10000)
  ]);
  for(const q of [snap,ses,exp,evt,fav])if(q.error)throw q.error;
  const payload=cleanArchive(snap.data?.[0]?.payload||{});
  const sm=new Map(arr(payload.sessions,10000).map((x:any)=>[String(x.id||x.sessionId||""),x]));
  for(const x of ses.data||[]){const id=String(x.session_id||"");if(!id||sm.has(id))continue;sm.set(id,{id,startedAt:x.started_at,endedAt:x.ended_at,requestKey:x.request_key,preState:x.pre_state,postState:x.post_state,helped:x.helped,plannedSeconds:x.planned_seconds,measuredActiveMs:x.measured_active_ms,afterFeedbackActiveMs:x.after_feedback_active_ms,continuedAfterFeedback:x.continued_after_feedback,completed:x.completed,completionReason:x.completion_reason,sessionType:x.session_type,updatedAt:x.updated_at})}
  payload.sessions=[...sm.values()].slice(-10000);
  const em=new Map(arr(payload.events,30000).map((x:any)=>[String(x.id||""),x]));
  for(const x of evt.data||[]){const id=String(x.event_id||"");if(!id||em.has(id))continue;em.set(id,{id,visitId:x.visit_id,sessionId:x.session_id,type:x.type,wallAt:x.wall_at,phase:x.phase,tMs:x.t_ms,payload:x.payload||{}})}
  payload.events=[...em.values()].slice(-30000);
  const xm=new Map(arr(payload.patternExposures,30000).map((x:any)=>[String(x.exposureId||x.id||""),x]));
  for(const x of exp.data||[]){const id=String(x.exposure_id||"");if(!id||xm.has(id))continue;xm.set(id,{exposureId:id,visitId:x.visit_id,sessionId:x.session_id,sessionType:x.session_type,context:x.context,requestKey:x.request_key,patternId:x.pattern_id,configKey:x.config_key,config:x.config||{},sourceType:x.source_type,sourceId:x.source_id,communityId:x.community_id,startedAt:x.started_at,endedAt:x.ended_at,durationMs:x.duration_ms,entryReason:x.entry_reason,updatedAt:x.updated_at})}
  payload.patternExposures=[...xm.values()].slice(-30000);
  const favorites=(fav.data||[]).map((x:any)=>({id:x.favorite_id||`saved-${x.config_key}`,baseId:x.pattern_id,patternId:x.pattern_id,configKey:x.config_key,config:x.config||{},createdAt:x.saved_at,savedAt:x.saved_at,sourceType:x.source_type,updatedAt:x.updated_at}));
  if(!payload.sessions.length&&!payload.notes.length&&!payload.events.length&&!payload.patternExposures.length&&!favorites.length)return;
  const now=new Date().toISOString(),captured=snap.data?.[0]?.captured_at||now;
  const iq=await db.from("prototype_v37_tester_private_archives").upsert({device_id:deviceId,tester_id:testerId,schema_version:41,payload,favorites:stripHeavy(favorites),captured_at:captured,updated_at:now},{onConflict:"device_id"});if(iq.error)throw iq.error;
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return J({error:"method_not_allowed"},405);
 try{
  const b=await req.json().catch(()=>({})),action=T(b.action,60);
  if(action==="admin-list"||action==="admin-device"){
    if(!(await adminAuth(T(b.adminKey,300))))return J({error:"invalid_admin_key"},403);
    if(action==="admin-list"){
      const q=await db.from("prototype_v37_tester_private_archives").select("device_id,tester_id,schema_version,payload,favorites,captured_at,updated_at").order("updated_at",{ascending:false}).limit(1000);if(q.error)throw q.error;
      return J({ok:true,items:(q.data||[]).map((x:any)=>({deviceId:x.device_id,testerId:x.tester_id,schemaVersion:x.schema_version,capturedAt:x.captured_at,updatedAt:x.updated_at,counts:counts(x.payload,x.favorites)})),privacy:"private-admin-only",visuals:"recipe-only"});
    }
    const deviceId=T(b.deviceId,180),testerId=T(b.testerId,100);let q=db.from("prototype_v37_tester_private_archives").select("device_id,tester_id,schema_version,payload,favorites,captured_at,updated_at");if(deviceId)q=q.eq("device_id",deviceId);else if(testerId)q=q.eq("tester_id",testerId);else return J({error:"missing_identity"},400);const r=await q.order("updated_at",{ascending:true}).limit(100);if(r.error)throw r.error;if(deviceId){const x=r.data?.at(-1)||null;return J({ok:true,archive:x?{deviceId:x.device_id,testerId:x.tester_id,schemaVersion:x.schema_version,payload:stripHeavy(x.payload||{}),favorites:stripHeavy(x.favorites||[]),capturedAt:x.captured_at,updatedAt:x.updated_at,counts:counts(x.payload,x.favorites),sourceDevices:1}:null,privacy:"private-admin-only",visuals:"recipe-only"})}const m=mergeRows(r.data||[]);return J({ok:true,archive:m?{deviceId:null,testerId, schemaVersion:41,payload:stripHeavy(m.payload),favorites:stripHeavy(m.favorites),capturedAt:m.capturedAt,updatedAt:m.updatedAt,counts:counts(m.payload,m.favorites),sourceDevices:m.sourceDevices}:null,privacy:"private-admin-only",visuals:"recipe-only"});
  }
  const s=await session(T(b.sessionToken,200));if(!s)return J({error:"auth_required"},401);
  if(action==="sync"){
    const deviceId=T(b.deviceId,180);if(!deviceId)return J({error:"missing_device_id"},400);if(!(await assertDevice(deviceId,s.tester_id)))return J({error:"device_not_bound_to_account"},403);
    const payload=cleanArchive(b.archive),favorites=arr(stripHeavy(b.favorites),10000),capturedAt=b.capturedAt?new Date(b.capturedAt).toISOString():new Date().toISOString(),now=new Date().toISOString();
    const q=await db.from("prototype_v37_tester_private_archives").upsert({device_id:deviceId,tester_id:s.tester_id,schema_version:41,payload,favorites,captured_at:capturedAt,updated_at:now},{onConflict:"device_id"}).select("device_id,tester_id,captured_at,updated_at").single();if(q.error)throw q.error;
    return J({ok:true,testerId:s.tester_id,updatedAt:q.data.updated_at,privacy:"private-account-only",visuals:"recipe-only",counts:counts(payload,favorites)})
  }
  if(action==="pull"){
    await ensureLegacyArchive(s.tester_id);
    const q=await db.from("prototype_v37_tester_private_archives").select("device_id,schema_version,payload,favorites,captured_at,updated_at").eq("tester_id",s.tester_id).order("updated_at",{ascending:true}).limit(100);if(q.error)throw q.error;const m=mergeRows(q.data||[]);return J({ok:true,testerId:s.tester_id,archive:m?{schemaVersion:41,payload:stripHeavy(m.payload),favorites:stripHeavy(m.favorites),capturedAt:m.capturedAt,updatedAt:m.updatedAt,sourceDevices:m.sourceDevices}:null,privacy:"private-account-only",visuals:"recipe-only"})
  }
  if(action==="status"){
    await ensureLegacyArchive(s.tester_id);
    const q=await db.from("prototype_v37_tester_private_archives").select("device_id,captured_at,updated_at,payload,favorites").eq("tester_id",s.tester_id).order("updated_at",{ascending:true}).limit(100);if(q.error)throw q.error;const m=mergeRows(q.data||[]);return J({ok:true,testerId:s.tester_id,hasArchive:!!m,updatedAt:m?.updatedAt||null,counts:counts(m?.payload,m?.favorites),sourceDevices:m?.sourceDevices||0,privacy:"private-account-only",visuals:"recipe-only"})
  }
  return J({error:"unknown_action"},400)
 }catch(e){console.error(e);return J({error:"server_error",detail:String(e?.message||e)},500)}
});