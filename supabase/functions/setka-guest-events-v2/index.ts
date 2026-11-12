import {createClient} from "https://esm.sh/@supabase/supabase-js@2.49.8";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,apikey,authorization","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const J=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:H});
const validId=(s:unknown,max=180)=>typeof s==="string"&&s.length>0&&s.length<=max&&/^[a-zA-Z0-9_:.\-]+$/.test(s);
const uuid=(s:unknown)=>typeof s==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
const JOURNEY_EVENTS=new Set(["visit_start","visit_end","app_return","pattern_open","favorite_save","favorite_remove","music_play"]);
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return J({ok:true});
 if(req.method!=="POST")return J({error:"method_not_allowed"},405);
 if(Number(req.headers.get("content-length")||0)>24000)return J({error:"too_large"},413);
 try{
  const body=await req.json();
  if(!validId(body.deviceId)||!Array.isArray(body.events)||body.events.length>25)return J({error:"invalid_payload"},400);
  if(body.events.length===0)return J({ok:true,accepted:0});
  const now=Date.now(),records=[];
  for(const e of body.events){
   const exposure=e.eventType==="pattern_exposure",journey=JOURNEY_EVENTS.has(e.eventType);
   if(!uuid(e.eventId)||(!exposure&&!journey)||!(e.sessionId==null||validId(e.sessionId,180)))return J({error:"invalid_event"},400);
   if(exposure){
    if(e.sessionType!=null&&e.sessionType!=="outcome"&&e.sessionType!=="exploration")return J({error:"invalid_session_type"},400);
    if(!validId(e.patternId,120)||!Number.isInteger(e.durationMs)||e.durationMs<1||e.durationMs>86400000)return J({error:"invalid_event"},400);
   }else{
    if(e.patternId!=null&&!validId(e.patternId,120))return J({error:"invalid_event"},400);
    if(e.eventType==="pattern_open"&&!validId(e.patternId,120))return J({error:"invalid_event"},400);
    if(e.eventType==="music_play"&&!validId(e.trackId,120))return J({error:"invalid_event"},400);
    if(e.eventType==="visit_end"){
     if(!Number.isInteger(e.durationMs)||e.durationMs<0||e.durationMs>86400000)return J({error:"invalid_event"},400);
    }else if(e.durationMs!=null)return J({error:"invalid_event"},400);
   }
   const at=Date.parse(e.occurredAt);
   if(!Number.isFinite(at)||at>now+300000||at<now-90*86400000)return J({error:"invalid_timestamp"},400);
   records.push({event_id:e.eventId,device_id:body.deviceId,actor_type:"guest",account_id:null,event_type:e.eventType,session_id:e.sessionId??null,pattern_id:e.patternId??null,occurred_at:new Date(at).toISOString(),duration_ms:e.durationMs??null,properties:{source:"standalone-v34",schema:exposure?2:3,...(exposure?{session_type:e.sessionType??null}:{}),...(e.eventType==="music_play"?{track_id:e.trackId}:{})}});
  }
  const {count:hourCount,error:countError}=await db.from("setka_research_events_v2").select("event_id",{count:"exact",head:true}).eq("device_id",body.deviceId).gte("received_at",new Date(now-3600000).toISOString());
  if(countError)throw countError;
  if((hourCount||0)+records.length>120)return J({error:"device_rate_limited"},429);
  const {error}=await db.from("setka_research_events_v2").upsert(records,{onConflict:"event_id",ignoreDuplicates:true});
  if(error)throw error;
  return J({ok:true,accepted:records.length});
 }catch(e){console.error("guest_v2_ingest",e);return J({error:"server_error"},500)}
});