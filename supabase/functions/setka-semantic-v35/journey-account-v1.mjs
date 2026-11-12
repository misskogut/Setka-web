// Authenticated, consented account journey: metadata only, no private corpus.
// Called only after the existing token+device-hash authentication in index.ts.
const TYPES=new Set(["visit_start","visit_end","app_return","pattern_open","favorite_save","favorite_remove","music_play","pattern_exposure"]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID=/^[a-zA-Z0-9_:.\-]+$/;
const valid=(x,n=120)=>typeof x==="string"&&x.length>0&&x.length<=n&&ID.test(x);
export function sanitizeAccountJourney(events,{deviceId,testerId,now=Date.now()}={}){
 if(!valid(deviceId,180)||!valid(testerId,180)||!Array.isArray(events)||events.length<1||events.length>20)return null;
 const records=[],unique=new Set();
 for(const event of events){
  if(!event||!UUID.test(String(event.eventId||""))||!TYPES.has(event.eventType))return null;
  if(unique.has(event.eventId))return null;
  unique.add(event.eventId);
  if(!(event.sessionId==null||valid(event.sessionId,180)))return null;
  if(!(event.patternId==null||valid(event.patternId)))return null;
  if(event.eventType==="pattern_open"&&!valid(event.patternId))return null;
  if(event.eventType==="music_play"&&!valid(event.trackId))return null;
  const exposure=event.eventType==="pattern_exposure";
  if(exposure){
   if(!valid(event.patternId)||!Number.isInteger(event.durationMs)||event.durationMs<1||event.durationMs>86400000)return null;
   if(event.sessionType!=null&&event.sessionType!=="outcome"&&event.sessionType!=="exploration")return null;
   if(event.sessionType!=null&&!event.sessionId)return null;
  }else if(event.sessionType!=null)return null;
  if(event.eventType==="visit_end"){
   if(!Number.isInteger(event.durationMs)||event.durationMs<0||event.durationMs>86400000)return null;
  }else if(!exposure&&event.durationMs!=null)return null;
  const at=Date.parse(event.occurredAt);
  if(!Number.isFinite(at)||at>now+300000||at<now-90*86400000)return null;
  records.push({
   event_id:event.eventId,device_id:deviceId,actor_type:"account",account_id:testerId,
   event_type:event.eventType,session_id:event.sessionId??null,pattern_id:event.patternId??null,
   duration_ms:exposure||event.eventType==="visit_end"?event.durationMs:null,occurred_at:new Date(at).toISOString(),
   properties:{source:"standalone-v34",schema:exposure?5:4,...(exposure?{session_type:event.sessionType??null}:{}),...(event.eventType==="music_play"?{track_id:event.trackId}:{})}
  });
 }
 return records;
}
export async function persistAccountJourney(db,{deviceId,testerId,events,now=Date.now()}={}){
 const records=sanitizeAccountJourney(events,{deviceId,testerId,now});
 if(!records)return {ok:false,error:"invalid_journey",status:400};
 const account=await db.from("prototype_v40_tester_accounts")
  .select("tester_id,active,consent_at").eq("tester_id",testerId).maybeSingle();
 if(account.error)throw account.error;
 if(account.data?.active!==true||!account.data?.consent_at)return {ok:false,error:"consent_required",status:403};
 const since=new Date(now-3600000).toISOString();
 const count=await db.from("setka_research_events_v2").select("event_id",{count:"exact",head:true})
   .eq("account_id",testerId).gte("received_at",since);
 if(count.error)throw count.error;
 if((count.count||0)+records.length>240)return {ok:false,error:"rate_limited",status:429};
 const write=await db.from("setka_research_events_v2").upsert(records,{onConflict:"event_id",ignoreDuplicates:true});
 if(write.error)throw write.error;
 return {ok:true,accepted:records.length};
}
