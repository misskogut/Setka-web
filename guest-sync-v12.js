(() => {
  "use strict";
  const ACCESS_KEY="setka-research:access-code:v1";
  const TRIAL_KEY="setka-research:guest-trial-start:v1";
  const ARCHIVE_KEY="setka-research:guest-archive:v11";
  const TRIAL_MS=60*60*1000;
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-guest-v11";
  const API_KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const EVENT_BUFFER="setka-research:guest-events:v12";
  let sending=false,sendTimer=0,lastGesture=0;

  function trialStart(){return Number(localStorage.getItem(TRIAL_KEY))||Date.now()}
  function activeGuest(){return !localStorage.getItem(ACCESS_KEY)&&Date.now()-trialStart()<TRIAL_MS}
  function archive(){try{return window.SetkaGuestTrial?.getArchive?.()||JSON.parse(localStorage.getItem(ARCHIVE_KEY)||"null")}catch(_){return null}}
  function buffer(){try{const x=JSON.parse(localStorage.getItem(EVENT_BUFFER)||"[]");return Array.isArray(x)?x:[]}catch(_){return[]}}
  function saveBuffer(x){try{localStorage.setItem(EVENT_BUFFER,JSON.stringify(x.slice(-500)))}catch(_){}}
  function base(a){return{archiveId:a.archiveId,startedAt:a.startedAt,expiresAt:new Date(Date.parse(a.startedAt||new Date(trialStart()).toISOString())+TRIAL_MS).toISOString(),userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1}}}
  function sessionPayload(s){return{id:s.id,startedAt:s.startedAt,endedAt:s.endedAt||null,requestKey:s.requestKey||null,preState:s.preState??null,postState:s.postState??null,helped:s.helped??null,plannedSeconds:s.plannedSeconds||null,measuredActiveMs:s.measuredActiveMs||0,afterFeedbackActiveMs:s.afterFeedbackActiveMs||0,continuedAfterFeedback:!!s.continuedAfterFeedback,completed:!!s.completed,completionReason:s.completionReason||null,usage:Array.isArray(s.usage)?s.usage.slice(0,300):[]}}
  async function post(action,payload={},keepalive=false){const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify({action,...payload}),keepalive});if(!r.ok)throw new Error("guest_sync_failed");return r.json().catch(()=>({}))}
  async function heartbeat(keepalive=false){if(!activeGuest())return;const a=archive();if(!a?.archiveId)return;const sessions=(a.sessions||[]).map(sessionPayload);await post("guest-heartbeat",{...base(a),sessions,summary:{sessionCount:sessions.length,completedSessionCount:sessions.filter(x=>x.completed).length,noteCount:(a.notes||[]).length,symptomCount:(a.symptoms||[]).length,symptomCheckinCount:(a.symptomCheckins||[]).length,favoriteCount:window.SetkaApp?.getFavorites?.().length||0}},keepalive)}
  function push(type,payload={}){if(!activeGuest())return;const a=archive();if(!a?.archiveId)return;const x=buffer();x.push({eventId:`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`,wallAt:new Date().toISOString(),type,payload});saveBuffer(x);schedule()}
  function schedule(){clearTimeout(sendTimer);sendTimer=setTimeout(()=>flush(false),500)}
  async function flush(keepalive=false){if(sending||!activeGuest())return;const a=archive();if(!a?.archiveId)return;const x=buffer();if(!x.length){try{await heartbeat(keepalive)}catch(_){}return}sending=true;const batch=x.slice(0,120);try{await post("guest-events",{...base(a),items:batch},keepalive);saveBuffer(x.slice(batch.length));await heartbeat(keepalive)}catch(_){}finally{sending=false;if(buffer().length)schedule()}}
  async function idAttempt(){const a=archive();if(!a?.archiveId)return;push("id_attempt",{});try{await post("guest-id-attempt",base(a))}catch(_){}}

  window.addEventListener("setka:view",e=>push("view",{view:e.detail?.view||null,page:e.detail?.state?.libraryPage||null}));
  window.addEventListener("setka:library-page",e=>push("library_page",{page:e.detail?.page||null}));
  window.addEventListener("setka:pattern-open",e=>push("pattern_open",{sourceType:e.detail?.sourceType||null,sourceId:e.detail?.sourceId||null,communityId:e.detail?.communityId||null,configKey:e.detail?.state?.configKey||null}));
  window.addEventListener("setka:favorite-saved",e=>push("favorite_save",{favoriteId:e.detail?.favorite?.id||null,communityId:e.detail?.favorite?.communityId||null}));
  window.addEventListener("setka:favorite-removed",e=>push("favorite_remove",{favoriteId:e.detail?.favorite?.id||null}));
  window.addEventListener("setka:color",e=>push("color",{from:e.detail?.from,to:e.detail?.to}));
  window.addEventListener("setka:gesture-start",e=>push("gesture_start",{fingers:e.detail?.fingers||1,x:e.detail?.x||0,y:e.detail?.y||0}));
  window.addEventListener("setka:gesture-move",e=>{const n=Date.now();if(n-lastGesture<500)return;lastGesture=n;push("gesture_state",{fingers:e.detail?.fingers||1,configKey:e.detail?.state?.configKey||null})});
  window.addEventListener("setka:gesture-end",e=>push("gesture_end",{fingers:e.detail?.fingers||1}));
  document.addEventListener("click",e=>{if(e.target.closest?.("#setkaGuestTrial .guest-id"))idAttempt();if(e.target.closest?.("#setkaGuestTrial .guest-menu,#guestMenuButton"))push("guest_menu_open",{})},true);
  const originalTrack=window.SetkaJourney?.track;
  if(originalTrack&&!window.SetkaJourney.__guestWrapped){window.SetkaJourney.__guestWrapped=true;window.SetkaJourney.track=function(type,payload={}){try{if(String(type).startsWith("guest_"))push(type,payload)}catch(_){}return originalTrack.call(this,type,payload)}}
  document.addEventListener("visibilitychange",()=>push(document.hidden?"hidden":"visible",{}));
  window.addEventListener("pagehide",()=>flush(true));
  if(activeGuest()){push("guest_open",{remainingMs:Math.max(0,TRIAL_MS-(Date.now()-trialStart()))});setTimeout(()=>flush(false),350);setInterval(()=>flush(false),5000)}
  window.SetkaGuestSyncV12={flush,heartbeat,idAttempt};
})();