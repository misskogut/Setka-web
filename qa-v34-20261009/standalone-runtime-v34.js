(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;

  // Physiological streams may arrive every second. Keep the UI live without rewriting
  // the whole local archive for every heart-rate sample.
  let physioSaveTimer=0,physioSinceSave=0;
  C.addPhysioSample=sample=>{
    const d=C.getData();
    d.physio=d.physio||{samples:[],sources:[]};
    const normalized={...sample,quality:sample?.quality||"unknown",confidence:sample?.confidence??null};
    d.physio.samples.push(normalized);
    if(d.physio.samples.length>10000)d.physio.samples.splice(0,d.physio.samples.length-10000);
    physioSinceSave++;
    if(physioSinceSave>=5){physioSinceSave=0;clearTimeout(physioSaveTimer);physioSaveTimer=0;C.save()}
    else if(!physioSaveTimer){physioSaveTimer=setTimeout(()=>{physioSaveTimer=0;physioSinceSave=0;C.save()},2200)}
  };

  const originalRecord=C.recordEvent;
  C.recordEvent=(type,payload,sessionScoped=true)=>{
    if(type==="physio")return null;
    return originalRecord(type,payload,sessionScoped);
  };

  // v35.2 canonical entity: Pattern Exposure.
  // One exposure = one uninterrupted period in real gameplay with one exact config.
  // session.usage remains only as a compatibility projection generated from exposures.
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const makeId=(p="exposure")=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  let visitId="";
  try{visitId=sessionStorage.getItem("setka-v35:visit-id")||makeId("visit");sessionStorage.setItem("setka-v35:visit-id",visitId)}catch(_){visitId=makeId("visit")}
  let current=null;
  const ensureExposures=()=>{const d=C.getData();if(!Array.isArray(d.patternExposures))d.patternExposures=[];return d.patternExposures};
  const activeSession=()=>C.getActiveSession?.()||null;
  const contextOf=s=>{
    if(!s)return"free";
    if(s.isExploration||s.sessionType==="exploration"||s.requestKey==="explore")return"exploration";
    return s.phase==="after_feedback"?"after_feedback":"measured";
  };
  function canonicalState(state=Setka.getState?.()){
    if(!state||state.view!=="game"||!state.config)return null;
    const patternId=state.patternId||state.config?.patternId||"tentacle-orbit";
    const config=clone(state.config);
    const configKey=Setka.configKey?.(config,patternId)||state.configKey||null;
    if(!configKey)return null;
    return{patternId,configKey,config,sourceType:state.sourceType||"working",sourceId:state.sourceId||patternId,communityId:state.communityId||null,previewFrame:Number.isFinite(Number(state.frame))?Number(state.frame):44};
  }
  function mirrorSessionUsage(sessionId){
    if(!sessionId)return;
    const d=C.getData(),session=d.sessions?.find(x=>x.id===sessionId);if(!session)return;
    const all=ensureExposures().filter(x=>x.sessionId===sessionId);
    session.usage=all.map(x=>({patternId:x.patternId,communityConfigId:x.communityId||null,configKey:x.configKey,config:clone(x.config),startedMs:Math.max(0,Date.parse(x.startedAt)-Date.parse(session.startedAt)),endedMs:Math.max(0,Date.parse(x.endedAt)-Date.parse(session.startedAt)),durationMs:x.durationMs,saved:!!x.saved,phase:x.context==="after_feedback"?"after_feedback":"measured",previewFrame:x.previewFrame}));
    const s=activeSession();if(s?.id===sessionId)s.usage=clone(session.usage);
  }
  function closeExposure(reason="close"){
    if(!current)return null;
    const end=Date.now(),durationMs=Math.max(0,end-current.startedMs),exposure={...current,endedAt:new Date(end).toISOString(),durationMs,closeReason:reason};
    current=null;
    if(durationMs<150)return null;
    const list=ensureExposures();list.push(exposure);if(list.length>3000)list.splice(0,list.length-3000);
    mirrorSessionUsage(exposure.sessionId);
    C.save();
    window.dispatchEvent(new CustomEvent("setka:pattern-exposure",{detail:clone(exposure)}));
    return exposure;
  }
  function openExposure(reason="state",state=Setka.getState?.()){
    const st=canonicalState(state);if(document.hidden||!st){closeExposure(reason);return}
    const s=activeSession(),sessionId=s?.id||null,context=contextOf(s),requestKey=s?.requestKey||null,sessionType=s?(context==="exploration"?"exploration":"outcome"):null;
    if(current&&current.configKey===st.configKey&&current.sessionId===sessionId&&current.context===context)return;
    closeExposure(reason);
    const now=Date.now();current={exposureId:makeId(),visitId,sessionId,sessionType,context,requestKey,...st,entryReason:reason,startedAt:new Date(now).toISOString(),startedMs:now,saved:!!state?.favoriteId};
  }
  function restartIfChanged(reason="config-change"){
    const st=canonicalState();if(!st){closeExposure(reason);return}
    if(!current||current.configKey!==st.configKey||current.context!==contextOf(activeSession())||current.sessionId!==(activeSession()?.id||null))openExposure(reason,Setka.getState?.())
  }

  window.addEventListener("setka:pattern-open",e=>openExposure("pattern-open",e.detail?.state||Setka.getState?.()));
  window.addEventListener("setka:gesture-end",()=>restartIfChanged("gesture-end"));
  window.addEventListener("setka:color",()=>setTimeout(()=>restartIfChanged("color"),0));
  window.addEventListener("setka:pattern-special",()=>setTimeout(()=>restartIfChanged("pattern-special"),0));
  window.addEventListener("setka:favorite-saved",()=>{if(current){current.saved=true;C.save()}});
  window.addEventListener("setka:view",e=>{if(e.detail?.view==="library")closeExposure("leave-game");else if(e.detail?.view==="game")setTimeout(()=>openExposure("enter-game",Setka.getState?.()),0)});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)closeExposure("hidden");else if(Setka.getState?.()?.view==="game")setTimeout(()=>openExposure("visible",Setka.getState?.()),0)});
  window.addEventListener("pagehide",()=>{closeExposure("pagehide");clearTimeout(physioSaveTimer);C.save()});
  window.addEventListener("setka:standalone-event",e=>{
    const ev=e.detail;
    if(ev?.type==="feedback_prompt"||ev?.type==="session_end")closeExposure(ev.type);
    if(ev?.type==="continuation_start")setTimeout(()=>openExposure("continuation",Setka.getState?.()),0);
    if(ev?.type==="exploration_start")setTimeout(()=>restartIfChanged("exploration-start"),0);

    if(ev?.type==="note_create"&&ev.payload?.noteId){
      const n=C.getData().notes.find(x=>x.id===ev.payload.noteId);
      if(n&&n.phase==="free"){n.phase="standalone";C.save()}
    }
    if(ev?.type==="screen"&&C.getActiveSession())originalRecord("session_screen",{title:ev.payload?.title||"",kicker:ev.payload?.kicker||""},true);
  });

  window.addEventListener("setka:view",e=>{if(C.getActiveSession())originalRecord("session_view",{view:e.detail?.view,state:C.stateSnapshot()},true)});
  window.addEventListener("setka:library-page",e=>{if(C.getActiveSession())originalRecord("session_library_page",{page:e.detail?.page,state:C.stateSnapshot()},true)});
  setTimeout(()=>{if(Setka.getState?.()?.view==="game")openExposure("runtime-init",Setka.getState?.())},100);

  C.patternExposure={visitId,list:()=>clone(ensureExposures()),flush:()=>closeExposure("flush")};
  window.__SETKA_STANDALONE_V34_READY__=true;
  window.__SETKA_PATTERN_EXPOSURE_V35_2__=true;
})();