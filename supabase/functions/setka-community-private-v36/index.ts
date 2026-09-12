// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8"};
const J=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const T=(v:any,m=500)=>String(v??"").trim().slice(0,m);
const N=(v:any,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const A=(v:any)=>Array.isArray(v)?v:[];
const O=(v:any)=>v&&typeof v==="object"&&!Array.isArray(v)?v:{};
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}

async function profile(deviceId:string,token:string){
  deviceId=T(deviceId,180);token=T(token,300);
  if(!deviceId||token.length<16)throw new Error("profile_auth_required");
  const hash=await sha(token);
  const q=await db.from("prototype_v36_public_profiles").select("device_id,public_profile_id,token_hash,nickname").eq("device_id",deviceId).maybeSingle();
  if(q.error)throw q.error;if(!q.data||q.data.token_hash!==hash)throw new Error("profile_auth_failed");return q.data;
}

async function snapshotNotes(me:any){
  const snap=await db.from("prototype_v34_snapshots").select("payload,updated_at").eq("device_id",me.device_id).maybeSingle();if(snap.error)throw snap.error;
  const notes=A(O(snap.data?.payload).notes);
  const pub=await db.from("prototype_v36_public_notes").select("id,source_note_key,is_public").eq("author_device_id",me.device_id);if(pub.error)throw pub.error;
  const byKey=new Map((pub.data||[]).filter((x:any)=>x.source_note_key).map((x:any)=>[x.source_note_key,x]));
  return notes.map((n:any)=>{
    const s=O(n.state),key=T(n.id||n.observedAt||"",220),p=byKey.get(key);
    return{sourceNoteKey:key,text:T(n.text??n.noteText??n.note_text??n.body,5000),observedAt:n.observedAt||n.createdAt||null,sessionId:T(n.sessionId,180)||null,patternId:T(n.patternId||s.patternId,100)||null,configKey:T(n.configHash||s.configKey,500)||null,config:O(n.config||s.config),published:!!p?.is_public,publicNoteId:p?.id||null};
  }).filter((n:any)=>n.sourceNoteKey&&n.text).sort((a:any,b:any)=>Date.parse(b.observedAt||0)-Date.parse(a.observedAt||0));
}

async function publishSourceNote(me:any,key:string){
  key=T(key,220);if(!key)return J({error:"note_not_found"},404);
  const notes=await snapshotNotes(me);const n=notes.find((x:any)=>x.sourceNoteKey===key);if(!n)return J({error:"note_not_found"},404);
  const row={author_device_id:me.device_id,source_note_key:key,note_text:n.text,session_id:n.sessionId,pattern_id:n.patternId,config_key:n.configKey,config:n.config||{},is_public:true,updated_at:new Date().toISOString()};
  const q=await db.from("prototype_v36_public_notes").upsert(row,{onConflict:"author_device_id,source_note_key"}).select("id,created_at").single();if(q.error)throw q.error;
  return J({ok:true,id:q.data.id,createdAt:q.data.created_at});
}

async function myCruises(me:any){
  const q=await db.from("prototype_v36_cruises").select("id,title,duration_ms,timeline,timeline_version,timeline_mode,is_public,created_at,updated_at").eq("author_device_id",me.device_id).order("created_at",{ascending:false}).limit(100);if(q.error)throw q.error;
  return(q.data||[]).map((x:any)=>({id:x.id,title:x.title,durationMs:N(x.duration_ms),timeline:A(x.timeline),timelineVersion:N(x.timeline_version,2),timelineMode:x.timeline_mode,isPublic:!!x.is_public,createdAt:x.created_at,updatedAt:x.updated_at}));
}

async function ownCruise(me:any,id:string,fields="id,title,duration_ms,timeline,timeline_version,timeline_mode,is_public,created_at,updated_at"){
  const q=await db.from("prototype_v36_cruises").select(fields).eq("id",T(id,80)).eq("author_device_id",me.device_id).maybeSingle();if(q.error)throw q.error;return q.data;
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:H});
  if(req.method!=="POST")return J({error:"method_not_allowed"},405);
  try{
    const b=await req.json(),action=T(b.action,80),me=await profile(T(b.deviceId,180),T(b.profileToken,300));
    if(action==="my-notes")return J({ok:true,items:await snapshotNotes(me)});
    if(action==="publish-note-source")return await publishSourceNote(me,T(b.sourceNoteKey,220));
    if(action==="my-cruises")return J({ok:true,items:await myCruises(me)});
    if(action==="start-cruise"){
      const q=await db.from("prototype_v36_cruises").insert({author_device_id:me.device_id,title:T(b.title,120)||"Новый Cruise",duration_ms:0,timeline:[],timeline_version:2,timeline_mode:"config-snapshots",is_public:false}).select("id,created_at").single();if(q.error)throw q.error;return J({ok:true,id:q.data.id,createdAt:q.data.created_at});
    }
    if(action==="append-cruise"){
      const id=T(b.id,80),frames=A(b.frames).slice(0,300);const row=await ownCruise(me,id,"id,timeline,is_public");if(!row)return J({error:"cruise_not_found"},404);if(row.is_public)return J({error:"cruise_already_public"},409);
      const timeline=[...A(row.timeline),...frames].slice(0,12000);const q=await db.from("prototype_v36_cruises").update({timeline,updated_at:new Date().toISOString()}).eq("id",id).eq("author_device_id",me.device_id);if(q.error)throw q.error;return J({ok:true,frames:timeline.length});
    }
    if(action==="finish-cruise"){
      const id=T(b.id,80),row=await ownCruise(me,id,"id,is_public");if(!row)return J({error:"cruise_not_found"},404);if(row.is_public)return J({error:"cruise_already_public"},409);
      const q=await db.from("prototype_v36_cruises").update({title:T(b.title,120)||"Cruise",duration_ms:Math.max(0,Math.round(N(b.durationMs))),updated_at:new Date().toISOString()}).eq("id",id).eq("author_device_id",me.device_id);if(q.error)throw q.error;return J({ok:true,id});
    }
    if(action==="publish-cruise-draft"){
      const id=T(b.id,80),row=await ownCruise(me,id,"id");if(!row)return J({error:"cruise_not_found"},404);
      const q=await db.from("prototype_v36_cruises").update({is_public:true,updated_at:new Date().toISOString()}).eq("id",id).eq("author_device_id",me.device_id);if(q.error)throw q.error;return J({ok:true,id});
    }
    return J({error:"unknown_action"},400);
  }catch(e){console.error(e);const msg=String(e?.message||e),code=msg.includes("profile_auth")?403:500;return J({error:code===403?"profile_auth_failed":"server_error",detail:msg},code)}
});
