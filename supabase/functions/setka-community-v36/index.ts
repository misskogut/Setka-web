// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const H = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};
const J = (d:any, s=200) => new Response(JSON.stringify(d), { status:s, headers:H });
const T = (v:any, max=500) => String(v ?? "").trim().slice(0,max);
const N = (v:any, d=0) => Number.isFinite(Number(v)) ? Number(v) : d;
const A = (v:any) => Array.isArray(v) ? v : [];
const O = (v:any) => v && typeof v === "object" && !Array.isArray(v) ? v : {};
const uid = () => crypto.randomUUID();

async function sha(v:string){
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

async function adminAuth(k:string){
  if(!k) return false;
  const q = await db.from("admin_keys").select("id").eq("key_hash", await sha(T(k,300))).eq("active",true).maybeSingle();
  return !!q.data;
}

async function profile(deviceId:string, token:string, create=true){
  deviceId=T(deviceId,180); token=T(token,300);
  if(!deviceId || token.length < 16) throw new Error("profile_auth_required");
  const hash=await sha(token);
  let q=await db.from("prototype_v36_public_profiles").select("device_id,public_profile_id,token_hash,nickname,created_at,updated_at").eq("device_id",deviceId).maybeSingle();
  if(q.error) throw q.error;
  if(!q.data && create){
    const ins=await db.from("prototype_v36_public_profiles").insert({device_id:deviceId,token_hash:hash,nickname:"anonymous"}).select("device_id,public_profile_id,token_hash,nickname,created_at,updated_at").single();
    if(ins.error){
      q=await db.from("prototype_v36_public_profiles").select("device_id,public_profile_id,token_hash,nickname,created_at,updated_at").eq("device_id",deviceId).maybeSingle();
      if(q.error) throw q.error;
    } else q={data:ins.data,error:null};
  }
  if(!q.data || q.data.token_hash !== hash) throw new Error("profile_auth_failed");
  return q.data;
}

function publicProfile(p:any){ return { publicProfileId:p.public_profile_id, nickname:p.nickname || "anonymous" }; }
function median(xs:number[]){ const a=xs.filter(Number.isFinite).sort((x,y)=>x-y); if(!a.length)return 0; const i=Math.floor(a.length/2); return a.length%2?a[i]:(a[i-1]+a[i])/2; }

async function feed(me:any, limit=100){
  limit=Math.min(200,Math.max(1,N(limit,100)));
  const [nQ,cQ]=await Promise.all([
    db.from("prototype_v36_public_notes").select("id,author_device_id,note_text,session_id,pattern_id,config_key,config,created_at").eq("is_public",true).order("created_at",{ascending:false}).limit(limit),
    db.from("prototype_v36_cruises").select("id,author_device_id,title,duration_ms,timeline,timeline_version,timeline_mode,created_at").eq("is_public",true).order("created_at",{ascending:false}).limit(limit)
  ]);
  if(nQ.error)throw nQ.error;if(cQ.error)throw cQ.error;
  const notes=nQ.data||[], cruises=cQ.data||[];
  const deviceIds=[...new Set([...notes.map(x=>x.author_device_id),...cruises.map(x=>x.author_device_id)])];
  const noteIds=notes.map(x=>x.id), cruiseIds=cruises.map(x=>x.id);
  const [pQ,nsQ,csQ,comQ,playQ,myNS,myCS]=await Promise.all([
    deviceIds.length?db.from("prototype_v36_public_profiles").select("device_id,public_profile_id,nickname").in("device_id",deviceIds):Promise.resolve({data:[],error:null}),
    noteIds.length?db.from("prototype_v36_note_saves").select("note_id,saver_device_id").in("note_id",noteIds):Promise.resolve({data:[],error:null}),
    cruiseIds.length?db.from("prototype_v36_cruise_saves").select("cruise_id,saver_device_id").in("cruise_id",cruiseIds):Promise.resolve({data:[],error:null}),
    (noteIds.length||cruiseIds.length)?db.from("prototype_v36_comments").select("id,target_type,target_id,author_device_id,body,created_at").or([noteIds.length?`and(target_type.eq.note,target_id.in.(${noteIds.join(',')}))`:null,cruiseIds.length?`and(target_type.eq.cruise,target_id.in.(${cruiseIds.join(',')}))`:null].filter(Boolean).join(',')):Promise.resolve({data:[],error:null}),
    cruiseIds.length?db.from("prototype_v36_cruise_plays").select("cruise_id,viewer_device_id,watched_ms,is_repeat,completed").in("cruise_id",cruiseIds):Promise.resolve({data:[],error:null}),
    me&&noteIds.length?db.from("prototype_v36_note_saves").select("note_id").eq("saver_device_id",me.device_id).in("note_id",noteIds):Promise.resolve({data:[],error:null}),
    me&&cruiseIds.length?db.from("prototype_v36_cruise_saves").select("cruise_id").eq("saver_device_id",me.device_id).in("cruise_id",cruiseIds):Promise.resolve({data:[],error:null})
  ]);
  for(const q of [pQ,nsQ,csQ,comQ,playQ,myNS,myCS]) if(q.error) throw q.error;
  const profiles=new Map((pQ.data||[]).map((p:any)=>[p.device_id,p]));
  const commentAuthors=[...new Set((comQ.data||[]).map((x:any)=>x.author_device_id).filter((x:any)=>!profiles.has(x)))];
  if(commentAuthors.length){const extra=await db.from("prototype_v36_public_profiles").select("device_id,public_profile_id,nickname").in("device_id",commentAuthors);if(extra.error)throw extra.error;for(const p of extra.data||[])profiles.set(p.device_id,p)}
  const noteSaved=new Set((myNS.data||[]).map((x:any)=>x.note_id));
  const cruiseSaved=new Set((myCS.data||[]).map((x:any)=>x.cruise_id));
  const commentsBy=new Map();for(const x of comQ.data||[]){const k=`${x.target_type}:${x.target_id}`;if(!commentsBy.has(k))commentsBy.set(k,[]);const p=profiles.get(x.author_device_id);commentsBy.get(k).push({id:x.id,...publicProfile(p||{}),body:x.body,createdAt:x.created_at})}
  const noteSaveCount=new Map();for(const x of nsQ.data||[])noteSaveCount.set(x.note_id,(noteSaveCount.get(x.note_id)||0)+1);
  const cruiseSaveCount=new Map();for(const x of csQ.data||[])cruiseSaveCount.set(x.cruise_id,(cruiseSaveCount.get(x.cruise_id)||0)+1);
  const playsBy=new Map();for(const x of playQ.data||[]){if(!playsBy.has(x.cruise_id))playsBy.set(x.cruise_id,[]);playsBy.get(x.cruise_id).push(x)}
  return {
    me:publicProfile(me),
    notes:notes.map((x:any)=>({id:x.id,...publicProfile(profiles.get(x.author_device_id)||{}),text:x.note_text,sessionId:x.session_id,patternId:x.pattern_id,configKey:x.config_key,config:x.config||{},createdAt:x.created_at,saves:noteSaveCount.get(x.id)||0,savedByMe:noteSaved.has(x.id),comments:commentsBy.get(`note:${x.id}`)||[]})),
    cruises:cruises.map((x:any)=>{const ps=playsBy.get(x.id)||[],watch=ps.map((p:any)=>N(p.watched_ms));const unique=new Set(ps.map((p:any)=>p.viewer_device_id));return{id:x.id,...publicProfile(profiles.get(x.author_device_id)||{}),title:x.title,durationMs:N(x.duration_ms),timeline:x.timeline||[],timelineVersion:N(x.timeline_version,1),timelineMode:x.timeline_mode,createdAt:x.created_at,saves:cruiseSaveCount.get(x.id)||0,savedByMe:cruiseSaved.has(x.id),comments:commentsBy.get(`cruise:${x.id}`)||[],plays:ps.length,totalWatchMs:watch.reduce((a,b)=>a+b,0),averageWatchMs:watch.length?watch.reduce((a,b)=>a+b,0)/watch.length:0,medianWatchMs:median(watch),uniqueViewers:unique.size,replays:ps.filter((p:any)=>p.is_repeat).length,repeatRate:unique.size?ps.filter((p:any)=>p.is_repeat).length/unique.size:0,saveRate:unique.size?(cruiseSaveCount.get(x.id)||0)/unique.size:0,timePerViewerMs:unique.size?watch.reduce((a,b)=>a+b,0)/unique.size:0}}
  };
}

async function adminSnapshot(){
  const [pQ,nQ,cQ,nsQ,csQ,comQ,playQ,expQ,favQ]=await Promise.all([
    db.from("prototype_v36_public_profiles").select("device_id,public_profile_id,nickname,created_at,updated_at"),
    db.from("prototype_v36_public_notes").select("id,author_device_id,note_text,pattern_id,config_key,created_at,is_public"),
    db.from("prototype_v36_cruises").select("id,author_device_id,title,duration_ms,timeline_version,timeline_mode,created_at,is_public"),
    db.from("prototype_v36_note_saves").select("note_id,saver_device_id,saved_at"),
    db.from("prototype_v36_cruise_saves").select("cruise_id,saver_device_id,saved_at"),
    db.from("prototype_v36_comments").select("id,target_type,target_id,author_device_id,body,created_at"),
    db.from("prototype_v36_cruise_plays").select("cruise_id,viewer_device_id,watched_ms,is_repeat,completed,started_at"),
    db.from("prototype_v35_pattern_exposures").select("pattern_id,device_id,duration_ms,started_at,ended_at"),
    db.from("prototype_v35_favorites").select("pattern_id,device_id,config_key,saved_at")
  ]);
  for(const q of [pQ,nQ,cQ,nsQ,csQ,comQ,playQ,expQ,favQ]) if(q.error)throw q.error;
  const profiles=new Map((pQ.data||[]).map((p:any)=>[p.device_id,p]));
  const noteS=new Map();for(const s of nsQ.data||[])noteS.set(s.note_id,(noteS.get(s.note_id)||0)+1);
  const cruiseS=new Map();for(const s of csQ.data||[])cruiseS.set(s.cruise_id,(cruiseS.get(s.cruise_id)||0)+1);
  const com=new Map();for(const x of comQ.data||[]){const k=`${x.target_type}:${x.target_id}`;com.set(k,(com.get(k)||0)+1)}
  const plays=new Map();for(const x of playQ.data||[]){if(!plays.has(x.cruise_id))plays.set(x.cruise_id,[]);plays.get(x.cruise_id).push(x)}
  const patternMap=new Map();
  for(const e of expQ.data||[]){let x=patternMap.get(e.pattern_id);if(!x){x={patternId:e.pattern_id,totalMs:0,exposures:0,durations:[],users:new Map(),saves:0,savers:new Set()};patternMap.set(e.pattern_id,x)}x.totalMs+=N(e.duration_ms);x.exposures++;x.durations.push(N(e.duration_ms));x.users.set(e.device_id,(x.users.get(e.device_id)||0)+1)}
  for(const f of favQ.data||[]){let x=patternMap.get(f.pattern_id);if(!x){x={patternId:f.pattern_id,totalMs:0,exposures:0,durations:[],users:new Map(),saves:0,savers:new Set()};patternMap.set(f.pattern_id,x)}x.saves++;x.savers.add(f.device_id)}
  const patterns=[...patternMap.values()].map((x:any)=>{const uniqueUsers=x.users.size,repeatUsers=[...x.users.values()].filter((n:any)=>n>1).length;return{patternId:x.patternId,saves:x.saves,uniqueSavers:x.savers.size,totalMs:x.totalMs,exposures:x.exposures,uniqueUsers,averageSessionMs:x.exposures?x.totalMs/x.exposures:0,medianSessionMs:median(x.durations),repeatRate:uniqueUsers?repeatUsers/uniqueUsers:0,saveRate:uniqueUsers?x.savers.size/uniqueUsers:0,timePerUserMs:uniqueUsers?x.totalMs/uniqueUsers:0}}).sort((a:any,b:any)=>b.totalMs-a.totalMs);
  const notes=(nQ.data||[]).filter((x:any)=>x.is_public).map((x:any)=>({id:x.id,author:publicProfile(profiles.get(x.author_device_id)||{}),text:x.note_text,patternId:x.pattern_id,configKey:x.config_key,createdAt:x.created_at,saves:noteS.get(x.id)||0,comments:com.get(`note:${x.id}`)||0})).sort((a:any,b:any)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
  const cruises=(cQ.data||[]).filter((x:any)=>x.is_public).map((x:any)=>{const ps=plays.get(x.id)||[],watch=ps.map((p:any)=>N(p.watched_ms)),unique=new Set(ps.map((p:any)=>p.viewer_device_id));return{id:x.id,author:publicProfile(profiles.get(x.author_device_id)||{}),title:x.title,durationMs:N(x.duration_ms),timelineVersion:N(x.timeline_version),timelineMode:x.timeline_mode,createdAt:x.created_at,saves:cruiseS.get(x.id)||0,comments:com.get(`cruise:${x.id}`)||0,plays:ps.length,totalWatchMs:watch.reduce((a,b)=>a+b,0),averageWatchMs:watch.length?watch.reduce((a,b)=>a+b,0)/watch.length:0,medianWatchMs:median(watch),uniqueViewers:unique.size,replays:ps.filter((p:any)=>p.is_repeat).length,repeatRate:unique.size?ps.filter((p:any)=>p.is_repeat).length/unique.size:0,saveRate:unique.size?(cruiseS.get(x.id)||0)/unique.size:0,timePerUserMs:unique.size?watch.reduce((a,b)=>a+b,0)/unique.size:0}}).sort((a:any,b:any)=>b.totalWatchMs-a.totalWatchMs);
  return{profiles:(pQ.data||[]).map((p:any)=>publicProfile(p)),notes,cruises,patterns,summary:{publicProfiles:(pQ.data||[]).length,publicNotes:notes.length,noteSaves:(nsQ.data||[]).length,publicCruises:cruises.length,cruiseSaves:(csQ.data||[]).length,comments:(comQ.data||[]).length,cruisePlays:(playQ.data||[]).length,totalCruiseWatchMs:(playQ.data||[]).reduce((a:any,x:any)=>a+N(x.watched_ms),0)}};
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:H});
  if(req.method!=="POST")return J({error:"method_not_allowed"},405);
  try{
    const b=await req.json();const action=T(b.action,80);
    if(action==="admin-snapshot"){
      if(!(await adminAuth(T(b.adminKey,300))))return J({error:"invalid_admin_key"},403);
      return J({ok:true,...await adminSnapshot()});
    }
    const me=await profile(T(b.deviceId,180),T(b.profileToken,300),true);
    if(action==="register")return J({ok:true,profile:publicProfile(me)});
    if(action==="set-nickname"){
      const nickname=T(b.nickname,40)||"anonymous";
      const q=await db.from("prototype_v36_public_profiles").update({nickname,updated_at:new Date().toISOString()}).eq("device_id",me.device_id);if(q.error)throw q.error;
      return J({ok:true,profile:{publicProfileId:me.public_profile_id,nickname}});
    }
    if(action==="feed")return J({ok:true,...await feed(me,N(b.limit,100))});
    if(action==="publish-note"){
      const text=T(b.text,5000);if(!text)return J({error:"empty_note"},400);
      const q=await db.from("prototype_v36_public_notes").insert({author_device_id:me.device_id,note_text:text,session_id:T(b.sessionId,180)||null,pattern_id:T(b.patternId,100)||null,config_key:T(b.configKey,500)||null,config:O(b.config),is_public:true}).select("id,created_at").single();if(q.error)throw q.error;
      return J({ok:true,id:q.data.id,createdAt:q.data.created_at});
    }
    if(action==="toggle-note-save"){
      const id=T(b.id,80);const ex=await db.from("prototype_v36_note_saves").select("note_id").eq("note_id",id).eq("saver_device_id",me.device_id).maybeSingle();if(ex.error)throw ex.error;
      if(ex.data){const q=await db.from("prototype_v36_note_saves").delete().eq("note_id",id).eq("saver_device_id",me.device_id);if(q.error)throw q.error;return J({ok:true,saved:false})}
      const q=await db.from("prototype_v36_note_saves").insert({note_id:id,saver_device_id:me.device_id});if(q.error)throw q.error;return J({ok:true,saved:true});
    }
    if(action==="publish-cruise"){
      const title=T(b.title,120)||"Cruise",timeline=A(b.timeline).slice(0,12000),durationMs=Math.max(0,Math.round(N(b.durationMs)));
      const q=await db.from("prototype_v36_cruises").insert({author_device_id:me.device_id,title,duration_ms:durationMs,timeline,timeline_version:Math.max(1,Math.round(N(b.timelineVersion,2))),timeline_mode:T(b.timelineMode,60)||"config-snapshots",is_public:true}).select("id,created_at").single();if(q.error)throw q.error;
      return J({ok:true,id:q.data.id,createdAt:q.data.created_at});
    }
    if(action==="toggle-cruise-save"){
      const id=T(b.id,80);const ex=await db.from("prototype_v36_cruise_saves").select("cruise_id").eq("cruise_id",id).eq("saver_device_id",me.device_id).maybeSingle();if(ex.error)throw ex.error;
      if(ex.data){const q=await db.from("prototype_v36_cruise_saves").delete().eq("cruise_id",id).eq("saver_device_id",me.device_id);if(q.error)throw q.error;return J({ok:true,saved:false})}
      const q=await db.from("prototype_v36_cruise_saves").insert({cruise_id:id,saver_device_id:me.device_id});if(q.error)throw q.error;return J({ok:true,saved:true});
    }
    if(action==="comment"){
      const type=T(b.targetType,20),id=T(b.id,80),body=T(b.body,2000);if(!["note","cruise"].includes(type)||!body)return J({error:"invalid_comment"},400);
      const table=type==="note"?"prototype_v36_public_notes":"prototype_v36_cruises";const chk=await db.from(table).select("id,is_public").eq("id",id).eq("is_public",true).maybeSingle();if(chk.error)throw chk.error;if(!chk.data)return J({error:"target_not_public"},404);
      const q=await db.from("prototype_v36_comments").insert({target_type:type,target_id:id,author_device_id:me.device_id,body}).select("id,created_at").single();if(q.error)throw q.error;return J({ok:true,id:q.data.id,createdAt:q.data.created_at});
    }
    if(action==="play-complete"){
      const id=T(b.id,80),watchedMs=Math.max(0,Math.round(N(b.watchedMs)));const chk=await db.from("prototype_v36_cruises").select("id").eq("id",id).eq("is_public",true).maybeSingle();if(chk.error)throw chk.error;if(!chk.data)return J({error:"cruise_not_public"},404);
      const prior=await db.from("prototype_v36_cruise_plays").select("id",{count:"exact",head:true}).eq("cruise_id",id).eq("viewer_device_id",me.device_id);if(prior.error)throw prior.error;
      const q=await db.from("prototype_v36_cruise_plays").insert({cruise_id:id,viewer_device_id:me.device_id,watched_ms:watchedMs,is_repeat:(prior.count||0)>0,completed:b.completed!==false});if(q.error)throw q.error;return J({ok:true,repeat:(prior.count||0)>0});
    }
    return J({error:"unknown_action"},400);
  }catch(e){console.error(e);const msg=String(e?.message||e);const code=msg.includes("profile_auth")?403:500;return J({error:code===403?"profile_auth_failed":"server_error",detail:msg},code)}
});
