// Pure, source-scoped research aggregation; no credentials, user IDs or notes leave this module.
export const V6_SOURCES = Object.freeze({
 guest_v40:{actor:"participant_key",time:"updated_at",table:"prototype_v40_service_exposures"},
 account_v41:{actor:"tester_id",time:"updated_at",table:"prototype_v41_account_exposures"},
 unified_v2:{actor:"device_id",time:"received_at",table:"setka_research_events_v2"}
});
const DAY=86400000, SARATOV=4*3600000;
const dateKey=i=>new Date(i*DAY).toISOString().slice(0,10);
const validTime=v=>{const t=Date.parse(String(v||""));return Number.isFinite(t)?t:null};
const bounded=v=>Number.isFinite(Number(v))?Math.max(0,Math.min(DAY,Number(v))):0;

export function summarizeV6(rows,source,{days=30,now=Date.now(),from=null,to=null}={}){
 if(!Object.hasOwn(V6_SOURCES,source))throw Error("unknown_source");
 if(![0,1,7,30,90].includes(days)||!Number.isFinite(now))throw Error("invalid_period");
 const custom=from!==null||to!==null;
 const fromMs=custom?Date.parse(from):null,toMs=custom?Date.parse(to):null;
 if(custom&&(!Number.isFinite(fromMs)||!Number.isFinite(toMs)||fromMs>=toMs||toMs-fromMs>370*DAY))throw Error("invalid_period");
 const today=Math.floor((now+SARATOV)/DAY);
 const first=custom?Math.floor((fromMs+SARATOV)/DAY):days?today-days+1:-Infinity;
 const last=custom?Math.floor((toMs-1+SARATOV)/DAY):today;
 const daily=new Map(),patterns=new Map(),actors=new Set(),seen=new Set(),guestDevices=new Set(),accountActors=new Set(),sessionBreakdown={outcome:0,exploration:0,unbound:0,legacy_unknown:0};
 let duplicates=0,excluded=0,exposures=0,recordedMs=0,lastIngestAt=null;
 for(const x of Array.isArray(rows)?rows:[]){
  const id=String(x?.pattern_id||"").trim(),actor=source==="unified_v2"?
   (x?.account_id?"account:"+x.account_id:x?.device_id?"device:"+x.device_id:""):
   String(x?.[V6_SOURCES[source].actor]||"");
  const exposureId=String(source==="unified_v2"?x?.event_id:x?.exposure_id||"");
  const occurrence=validTime(source==="unified_v2"?x?.occurred_at:(x?.ended_at||x?.started_at||x?.updated_at));
  const day=occurrence===null?null:Math.floor((occurrence+SARATOV)/DAY);
  if(!id||!actor||!exposureId||day===null||day>today||day>last||day<first||
     (custom&&(occurrence<fromMs||occurrence>=toMs))||
     (source==="unified_v2"&&x?.event_type!=="pattern_exposure")){excluded++;continue}
  const eventKey=actor+"|"+exposureId;
  if(seen.has(eventKey)){duplicates++;continue}
  seen.add(eventKey);
  const ms=bounded(x?.duration_ms),receipt=validTime(x?.[V6_SOURCES[source].time]);
  exposures++;recordedMs+=ms;actors.add(actor);
  const mode=source==="unified_v2"?(x?.properties?.session_type==="outcome"?"outcome":x?.properties?.session_type==="exploration"?"exploration":x?.session_id==null?"unbound":"legacy_unknown"):null;
  if(mode)sessionBreakdown[mode]++;
  if(source==="unified_v2"){if(x.account_id)accountActors.add(String(x.account_id));else if(x.device_id)guestDevices.add(String(x.device_id));}
  if(receipt!==null&&(lastIngestAt===null||receipt>lastIngestAt))lastIngestAt=receipt;
  if(!daily.has(day))daily.set(day,{day,exposures:0,recorded_ms:0,actors:new Set()});
  const d=daily.get(day);d.exposures++;d.recorded_ms+=ms;d.actors.add(actor);
  if(!patterns.has(id))patterns.set(id,{pattern_id:id,exposures:0,recorded_ms:0,actors:new Set(),durations:[],viewsByActor:new Map(),sessionBreakdown:{outcome:0,exploration:0,unbound:0,legacy_unknown:0}});
  const p=patterns.get(id);p.exposures++;p.recorded_ms+=ms;p.actors.add(actor);p.durations.push(ms);p.viewsByActor.set(actor,(p.viewsByActor.get(actor)||0)+1);if(mode)p.sessionBreakdown[mode]++;
 }
 const entry=(d)=>({date:dateKey(d.day),exposures:d.exposures,recorded_ms:d.recorded_ms,distinct_identities:d.actors.size});
 const timeline=(custom||days)?Array.from({length:custom?last-first+1:days},(_,i)=>entry(daily.get(first+i)||{day:first+i,exposures:0,recorded_ms:0,actors:new Set()})):
  [...daily.values()].sort((a,b)=>a.day-b.day).map(entry);
 return {
  source,periodDays:custom?0:days,periodFrom:custom?new Date(fromMs).toISOString():null,periodTo:custom?new Date(toMs).toISOString():null,timeZone:"UTC+04:00",exposures,distinctIdentities:actors.size,
  recordedMs,patternCount:patterns.size,sessionBreakdown:source==="unified_v2"?sessionBreakdown:null,guestDevices:guestDevices.size,accountActors:accountActors.size,rowsConsidered:Array.isArray(rows)?rows.length:0,
  duplicateRows:duplicates,excludedRows:excluded,lastIngestAt:lastIngestAt===null?null:new Date(lastIngestAt).toISOString(),
  timeline,patterns:[...patterns.values()].map(p=>{
   const ordered=p.durations.slice().sort((a,b)=>a-b),middle=Math.floor(ordered.length/2);
   const median=ordered.length?(ordered.length%2?ordered[middle]:(ordered[middle-1]+ordered[middle])/2):0;
   return {pattern_id:p.pattern_id,exposures:p.exposures,
    recorded_ms:p.recorded_ms,distinct_identities:p.actors.size,
    average_ms:p.exposures?Math.round(p.recorded_ms/p.exposures):0,
    median_ms:Math.round(median),repeat_identities:[...p.viewsByActor.values()].filter(n=>n>=2).length,
    mode_breakdown:source==="unified_v2"?p.sessionBreakdown:null};
  })
   .sort((a,b)=>b.recorded_ms-a.recorded_ms||b.exposures-a.exposures||a.pattern_id.localeCompare(b.pattern_id))
 };
}
