function mergeNoteDeletions(...settings:any[]){
  const ids=new Map<string,string>();
  for(const s of settings)for(const [id,at] of Object.entries(s?.noteDeletionsV1||{})){
    if(!id||id.length>250||typeof at!=="string"||!Number.isFinite(Date.parse(at)))continue;
    if(!ids.has(id)||Date.parse(at)>Date.parse(ids.get(id)))ids.set(id,at);
  }
  return Object.fromEntries(ids);
}
function filterDeletedNotes(notes:any,deleted:any){
  return (Array.isArray(notes)?notes:[]).filter((n:any)=>!n?.id||!Object.prototype.hasOwnProperty.call(deleted,String(n.id)));
}

// Guest archive: secret-bound, never accessible by deviceId alone.
// @ts-nocheck
import "../setka-tester-archive-v37/setka-cycle-contract-v1.js";
const cycleContract=globalThis.SETKA_ALMA_CYCLE_CONTRACT_V1;
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,authorization,apikey,x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
const hash=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,"0")).join("");
const good=s=>typeof s==="string"&&/^[a-f0-9-]{32,80}$/i.test(s);
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return J({ok:false,error:"method_not_allowed"},405);
 try{
  const raw=await req.text();
  if(raw.length>1800000)return J({ok:false,error:"archive_too_large"},413);
  const b=JSON.parse(raw),deviceId=b.deviceId,secret=b.secret;
  if(!good(deviceId)||!good(secret))return J({ok:false,error:"invalid_credentials"},400);
  const secretHash=await hash(secret);
  const q=await db.from("setka_guest_archives_v1").select("device_id,secret_hash,payload,favorites,revision,updated_at").eq("device_id",deviceId).maybeSingle();
  if(q.error)throw q.error;
  if(q.data&&q.data.secret_hash!==secretHash)return J({ok:false,error:"invalid_credentials"},403);
  if(b.action==="pull")return J({ok:true,exists:!!q.data,archive:q.data?{payload:q.data.payload,favorites:q.data.favorites,revision:q.data.revision,updatedAt:q.data.updated_at}:null});
  if(b.action!=="sync")return J({ok:false,error:"unknown_action"},400);
  if(!b.archive||typeof b.archive!=="object"||Array.isArray(b.archive)||!Array.isArray(b.favorites))return J({ok:false,error:"invalid_archive"},400);
  // Client must restore the last remote revision before writing. Prevent
  // stale tabs from overwriting more recent notes and settings.
  const expected=Number(b.revision);
  if(!Number.isSafeInteger(expected)||expected<0)return J({ok:false,error:"invalid_revision"},400);
  if(q.data&&q.data.revision!==expected)return J({ok:false,error:"revision_conflict"},409);
  if(!q.data&&expected!==0)return J({ok:false,error:"revision_conflict"},409);
  // The guest secret and optimistic revision have already been verified.
  const owner="device:"+deviceId,settings=b.archive.settings&&typeof b.archive.settings==="object"&&!Array.isArray(b.archive.settings)?{...b.archive.settings}:{};
  const cycle=cycleContract.merge(q.data?.payload?.settings?.almaCycleV1,settings.almaCycleV1,owner);
  delete settings.almaCycleV1;delete settings.almaCycleLocalBackupV1;
  const safeCycle=cycleContract.cloud(cycle,owner);if(safeCycle)settings.almaCycleV1=safeCycle;
  const deleted=mergeNoteDeletions(q.data?.payload?.settings,settings);settings.noteDeletionsV1=deleted;b.archive.notes=filterDeletedNotes(b.archive.notes,deleted);
  b.archive.settings=settings;
  const now=new Date().toISOString();
  if(!q.data){
    const ins=await db.from("setka_guest_archives_v1").insert({device_id:deviceId,secret_hash:secretHash,payload:b.archive,favorites:b.favorites,revision:1,updated_at:now});
    if(ins.error){if(ins.error.code==="23505")return J({ok:false,error:"revision_conflict"},409);throw ins.error}
    return J({ok:true,revision:1,updatedAt:now,counts:{notes:Array.isArray(b.archive.notes)?b.archive.notes.length:0,favorites:b.favorites.length}});
  }
  const up=await db.from("setka_guest_archives_v1").update({payload:b.archive,favorites:b.favorites,revision:expected+1,updated_at:now}).eq("device_id",deviceId).eq("secret_hash",secretHash).eq("revision",expected).select("revision").maybeSingle();
  if(up.error)throw up.error;
  if(!up.data)return J({ok:false,error:"revision_conflict"},409);
  return J({ok:true,revision:up.data.revision,updatedAt:now,counts:{notes:Array.isArray(b.archive.notes)?b.archive.notes.length:0,favorites:b.favorites.length}});
 }catch(e){console.error("guest_archive_error",String(e));return J({ok:false,error:"server_error"},500)}
});
