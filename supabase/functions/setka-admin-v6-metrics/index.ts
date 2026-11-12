import {createClient} from "https://esm.sh/@supabase/supabase-js@2.49.8";
import {summarizeV6,V6_SOURCES} from "./analytics-v6.mjs";
import {summarizeJourneyV3} from "./journey-v3-analytics.mjs";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"apikey,authorization,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
async function authorized(key:unknown){
 if(typeof key!=="string"||key.length<12||key.length>400)return false;
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(key.trim()));
 const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
 const r=await db.from("admin_keys").select("id").eq("key_hash",hash).eq("active",true).maybeSingle();
 if(r.error)throw r.error;
 return Boolean(r.data);
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return response({ok:true});
 if(req.method!=="POST")return response({error:"method_not_allowed"},405);
 try{
  const body=await req.json().catch(()=>({}));
  if(!(await authorized(body.adminKey)))return response({error:"forbidden"},403);
  if(body.action==="quality"){
   const tables=["setka_research_events_v2","setka_research_identity_links_v1","prototype_v40_service_exposures","prototype_v41_account_exposures","prototype_v34_devices","prototype_v34_sessions"];
   const results=await Promise.all(tables.map(async table=>{
    const q=await db.from(table).select("*",{count:"exact",head:true});
    return {table,count:q.count??null,error:q.error?"source_unavailable":null};
   }));
   return response({ok:true,checkedAt:new Date().toISOString(),sources:results,unifiedIngestionVerified:false,description:"Counts show storage only; ingestion end-to-end remains unverified"});
  }
  if(body.action==="lab-summary"){
   const source=typeof body.source==="string"&&Object.hasOwn(V6_SOURCES,body.source)?body.source:null;
   const days=Number(body.days);
   if(!source||![0,1,7,30,90].includes(days))return response({error:"invalid_lab_query"},400);
   const from=body.from==null?null:body.from,to=body.to==null?null:body.to;
   const custom=from!==null||to!==null;
   if(custom&&(typeof from!=="string"||typeof to!=="string"||
      !Number.isFinite(Date.parse(from))||!Number.isFinite(Date.parse(to))||
      Date.parse(from)>=Date.parse(to)||Date.parse(to)-Date.parse(from)>370*86400000))
    return response({error:"invalid_date_range"},400);
   const cfg=V6_SOURCES[source],isV2=source==="unified_v2";
   const columns=isV2?
    "event_id,device_id,actor_type,account_id,pattern_id,event_type,session_id,duration_ms,occurred_at,received_at,properties":
    "exposure_id,"+cfg.actor+",pattern_id,"+(source==="account_v41"?"session_id,":"")+"duration_ms,started_at,ended_at,updated_at";
   const rows:any[]=[],size=500,limit=12000;
   let truncated=false;
   for(let offset=0;offset<limit;offset+=size){
    const r=await db.from(cfg.table).select(columns)
      .order(cfg.time,{ascending:false})
      .order(isV2?"event_id":"exposure_id",{ascending:false})
      .range(offset,offset+size-1);
    if(r.error)throw r.error;
    const batch=r.data||[];rows.push(...batch);
    if(batch.length<size)break;
    if(rows.length>=limit)truncated=true;
   }
   const report=summarizeV6(rows,source,{days,from,to});
   const journey=source==="unified_v2"?summarizeJourneyV3(rows,{days,from,to,scope:"guest"}):null;
   const accountJourney=source==="unified_v2"?summarizeJourneyV3(rows,{days,from,to,scope:"account"}):null;
   let accountInventory:null|{registeredAccounts:number,existingFavorites:number,recordedSessions:number,verifiedDeviceLinks:number}=null;
   if(source==="account_v41"){
    // These are lifetime inventory counters, never period visits or unique users.
    // Only aggregate counts cross this protected admin endpoint.
    const [registered,favorites,sessions,links]=await Promise.all([
     db.from("prototype_v40_tester_accounts").select("tester_id",{count:"exact",head:true}).eq("active",true).not("password_set_at","is",null),
     db.from("prototype_v41_account_favorites").select("config_key",{count:"exact",head:true}),
     db.from("prototype_v41_account_sessions").select("session_id",{count:"exact",head:true}),
     db.from("setka_research_identity_links_v1").select("device_id",{count:"exact",head:true})
    ]);
    if(!registered.error&&!favorites.error&&!sessions.error&&!links.error){
     accountInventory={registeredAccounts:registered.count??0,existingFavorites:favorites.count??0,recordedSessions:sessions.count??0,verifiedDeviceLinks:links.count??0};
    }
   }
   return response({ok:true,...report,...(journey?{journey}:{}),...(accountJourney?{accountJourney}:{}),...(accountInventory?{accountInventory}:{}),truncated,checkedAt:new Date().toISOString(),
     identityScope:source==="account_v41"?"account_ids":source==="unified_v2"?"unlinked_device_or_account_ids":"legacy_guest_keys",
     caveat:"Counts are within this source only. Cross-source unique-user counts and clinical efficacy cannot be inferred."});
  }
  if(body.action!=="pattern-summary")return response({error:"unknown_action"},400);
  if(body.source==="unified_v2"){
   const {count,error}=await db.from("setka_research_events_v2").select("event_id",{count:"exact",head:true});
   if(error)throw error;
   if(!count)return response({ok:true,source:"setka_research_events_v2",sourceScope:"unified_v2_empty",truncated:false,scannedRows:0,patternCount:0,items:[],warning:"No unified events have been received; historical records are not automatically merged."});
   const rows:any[]=[];let truncated=false;
   for(let offset=0;offset<50000;offset+=500){
    const r=await db.from("setka_research_events_v2").select("event_id,device_id,account_id,pattern_id,event_type,duration_ms,received_at").order("received_at",{ascending:false}).order("event_id",{ascending:false}).range(offset,offset+499);
    if(r.error)throw r.error;rows.push(...(r.data||[]));if((r.data||[]).length<500)break;if(rows.length>=50000)truncated=true;
   }
   const by=new Map<string,{pattern_id:string,exposures:number,active_ms:number,participants:Set<string>,latest:string|null}>();
   const seen=new Set<string>();
   for(const x of rows){
    if(!x.pattern_id||seen.has(x.event_id))continue;seen.add(x.event_id);
    const id=String(x.pattern_id);let v=by.get(id);
    if(!v){v={pattern_id:id,exposures:0,active_ms:0,participants:new Set(),latest:null};by.set(id,v)}
    if(x.event_type==="pattern_open"||x.event_type==="pattern_exposure")v.exposures++;
    if(x.event_type==="pattern_active_time"||x.event_type==="pattern_exposure")v.active_ms+=Math.min(86400000,Math.max(0,Number(x.duration_ms)||0));
    if(x.account_id||x.device_id)v.participants.add(x.account_id?"account:"+x.account_id:"device:"+x.device_id);
    if(!v.latest||x.received_at>v.latest)v.latest=x.received_at;
   }
   return response({ok:true,source:"setka_research_events_v2",sourceScope:"unified_v2_unverified_identity",truncated,scannedRows:rows.length,patternCount:by.size,items:[...by.values()].map(x=>({pattern_id:x.pattern_id,exposures:x.exposures,active_ms:x.active_ms,unique_participants:x.participants.size,latest:x.latest})).sort((a,b)=>b.active_ms-a.active_ms),warning:"Device/account identity links are not yet applied to distinct-participant counts."});
  }
  const source=body.source==="account_v41"?"prototype_v41_account_exposures":"prototype_v40_service_exposures";
  const actorField=source==="prototype_v41_account_exposures"?"tester_id":"participant_key";
  // Supabase/PostgREST may cap individual responses at 1,000 rows.
  // Read in bounded pages and flag incomplete aggregates instead of silently
  // presenting the first page as the complete pattern population.
  const pageSize=500,maxRows=50000,rows:any[]=[];
  let truncated=false;
  for(let offset=0;offset<maxRows;offset+=pageSize){
   const r=await db.from(source)
    .select("exposure_id,"+actorField+",pattern_id,duration_ms,started_at,updated_at")
    .order("updated_at",{ascending:false})
    .order("exposure_id",{ascending:false})
    .range(offset,offset+pageSize-1);
   if(r.error)throw r.error;
   const batch=r.data||[];
   rows.push(...batch);
   if(batch.length<pageSize)break;
   if(rows.length>=maxRows)truncated=true;
  }
  const by=new Map<string,{pattern_id:string,exposures:number,active_ms:number,participants:Set<string>,latest:string|null}>();
  const seenExposures=new Set<string>();
  for(const x of rows){
   const exposureKey=String(x.exposure_id||"");
   if(exposureKey){if(seenExposures.has(exposureKey))continue;seenExposures.add(exposureKey);}
   const id=String(x.pattern_id||"").slice(0,120);if(!id)continue;
   let v=by.get(id);if(!v){v={pattern_id:id,exposures:0,active_ms:0,participants:new Set(),latest:null};by.set(id,v)}
   v.exposures++;v.active_ms+=Number.isFinite(Number(x.duration_ms))?Math.min(86400000,Math.max(0,Number(x.duration_ms))):0;
   if(x[actorField])v.participants.add(String(x[actorField]));
   if(!v.latest||String(x.updated_at)>v.latest)v.latest=x.updated_at;
  }
  return response({ok:true,source,sourceScope:source==="prototype_v41_account_exposures"?"account_v41_only":"legacy_v40_only",truncated,scannedRows:rows.length,patternCount:by.size,items:[...by.values()].map(x=>({pattern_id:x.pattern_id,exposures:x.exposures,active_ms:x.active_ms,unique_participants:x.participants.size,latest:x.latest})).sort((a,b)=>b.active_ms-a.active_ms)});
 }catch(e){console.error("admin_v6_pattern_summary",e);return response({error:"server_error"},500)}
});