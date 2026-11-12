// Aggregate only metadata-only SETKA guest journey records. No raw gestures,
// health information, private notes, account tokens or cross-source identity joins.
const DAY=86400000,OFFSET=4*3600000;
const TYPES=new Set(["visit_start","visit_end","app_return","pattern_open","favorite_save","favorite_remove","music_play","pattern_exposure"]);
const time=x=>{const t=Date.parse(String(x||""));return Number.isFinite(t)?t:null};
const day=t=>Math.floor((t+OFFSET)/DAY);
const label=d=>new Date(d*DAY).toISOString().slice(0,10);
const positive=x=>Number.isFinite(Number(x))?Math.max(0,Math.min(DAY,Number(x))):0;

export function summarizeJourneyV3(rows,{days=30,from=null,to=null,now=Date.now(),scope="guest"}={}){
 if(scope!=="guest"&&scope!=="account")throw Error("invalid_scope");
 if(!Number.isFinite(now)||![0,1,7,30,90].includes(days))throw Error("invalid_period");
 const custom=from!==null||to!==null,low=custom?time(from):null,high=custom?time(to):null;
 if(custom&&(low===null||high===null||low>=high||high-low>370*DAY))throw Error("invalid_period");
 const today=day(now),first=custom?day(low):days?today-days+1:-Infinity,last=custom?day(high-1):today;
 const firstSeen=new Map(),allDays=new Map(),events=[],seen=new Set();
 let invalid=0,duplicates=0;
 // First-seen/returning require the whole available source, not just rows in
 // the selected date range. All identities here are *device IDs*, not people.
 for(const row of Array.isArray(rows)?rows:[]){
  const at=time(row?.occurred_at),identity=scope==="account"?row?.account_id:row?.device_id,type=row?.event_type;
  const matching=scope==="account"?row?.actor_type==="account":row?.actor_type!=="account";
  if(at===null||at>now+300000||!identity||!matching||!TYPES.has(type)||!row?.event_id){invalid++;continue}
  const key=String(row.event_id);
  if(seen.has(key)){duplicates++;continue}seen.add(key);
  const d=day(at),id=String(identity);
  const previous=firstSeen.get(id);
  if(previous===undefined||at<previous)firstSeen.set(id,at);
  if(!allDays.has(id))allDays.set(id,new Set());
  allDays.get(id).add(d);
  events.push({...row,day:d,at,journeyIdentity:id});
 }
 const active=new Set(),newDevices=new Set(),returning=new Set();
 const visitsByDay=new Map(),opensByPattern=new Map(),favoritesByPattern=new Map(),musicByTrack=new Map();
 let visits=0,returns=0,patternOpens=0,favoriteSaves=0,favoriteRemoves=0,musicStarts=0,foregroundMs=0,visitEnds=0;
 for(const e of events){
  if(e.day>today||e.day<first||e.day>last||(custom&&(e.at<low||e.at>=high)))continue;
  const id=e.journeyIdentity,kind=e.event_type;
  active.add(id);
  if(firstSeen.get(id)>= (custom?low:days?(first*DAY-OFFSET):-Infinity))newDevices.add(id);
  if([...allDays.get(id)].some(d=>d<e.day))returning.add(id);
  if(kind==="visit_start"){visits++;visitsByDay.set(e.day,(visitsByDay.get(e.day)||0)+1)}
  if(kind==="visit_end"){visitEnds++;foregroundMs+=positive(e.duration_ms)}
  if(kind==="app_return")returns++;
  if(kind==="pattern_open"&&e.pattern_id){
   patternOpens++;const pattern=String(e.pattern_id);opensByPattern.set(pattern,(opensByPattern.get(pattern)||0)+1);
  }
  if(kind==="favorite_save"){
   favoriteSaves++;
   if(e.pattern_id){const p=String(e.pattern_id);favoritesByPattern.set(p,(favoritesByPattern.get(p)||0)+1)}
  }
  if(kind==="favorite_remove")favoriteRemoves++;
  if(kind==="music_play"){
   musicStarts++;
   const id=e.properties?.track_id;if(typeof id==="string"&&id.length<=120)musicByTrack.set(id,(musicByTrack.get(id)||0)+1);
  }
 }
 const timeline=(custom||days)?
  Array.from({length:custom?last-first+1:days},(_,i)=>({date:label(first+i),visits:visitsByDay.get(first+i)||0})):
  [...visitsByDay].sort((a,b)=>a[0]-b[0]).map(([d,n])=>({date:label(d),visits:n}));
 return {
  visits,...(scope==="guest"?{activeGuestDevices:active.size,firstSeenGuestDevices:newDevices.size,returningGuestDevices:returning.size}:{activeAccounts:active.size,firstSeenAccounts:newDevices.size,returningAccounts:returning.size}),
  returns,patternOpens,favoriteSaves,favoriteRemoves,
  musicStarts,foregroundMs,visitEnds,dayTimeZone:"UTC+04:00",
  timeline,patternOpensById:[...opensByPattern].map(([pattern_id,opens])=>({pattern_id,opens}))
   .sort((a,b)=>b.opens-a.opens).slice(0,50),
  favoritesByPattern:[...favoritesByPattern].map(([pattern_id,saves])=>({pattern_id,saves}))
   .sort((a,b)=>b.saves-a.saves).slice(0,50),
  topPlayedTracks:[...musicByTrack].map(([track_id,starts])=>({track_id,starts}))
   .sort((a,b)=>b.starts-a.starts).slice(0,12),
  scannedEvents:events.length,invalidRows:invalid,duplicateRows:duplicates,
  identityScope:scope==="account"?"verified_account_ids":"device_ids",
  caveat:scope==="account"?"Accounts represent authenticated tester IDs, not people; new means first seen in available V2 events.":"Devices are not unique people; new means first seen in available V2 data. Visits count foreground starts, and duration covers completed foreground segments."
 };
}
