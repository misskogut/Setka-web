(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;

  // Physiological streams may arrive every second. Keep the UI live without rewriting
  // the whole local archive twice for every heart-rate sample.
  let physioSaveTimer=0,physioSinceSave=0;
  C.addPhysioSample=sample=>{
    const d=C.getData();d.physio=d.physio||{samples:[],sources:[]};d.physio.samples.push(sample);if(d.physio.samples.length>10000)d.physio.samples.splice(0,d.physio.samples.length-10000);physioSinceSave++;
    if(physioSinceSave>=5){physioSinceSave=0;clearTimeout(physioSaveTimer);physioSaveTimer=0;C.save()}else if(!physioSaveTimer)physioSaveTimer=setTimeout(()=>{physioSaveTimer=0;physioSinceSave=0;C.save()},2200);
  };
  const originalRecord=C.recordEvent;
  C.recordEvent=(type,payload,sessionScoped=true)=>{
    if(type==="physio")return null;
    return originalRecord(type,payload,sessionScoped);
  };
  window.addEventListener("pagehide",()=>{clearTimeout(physioSaveTimer);C.save()});

  // Exact pattern usage segments inside measured and after-feedback phases.
  let current=null;
  const nowElapsed=()=>{const s=C.getActiveSession();return s?Math.max(0,Date.now()-Date.parse(s.startedAt)):0};
  function row(){const s=C.getActiveSession();return s?C.getData().sessions.find(x=>x.id===s.id)||null:null}
  function closeUsage(){if(!current)return;const r=row();if(r){const end=nowElapsed(),u={...current,endedMs:end,durationMs:Math.max(0,end-current.startedMs)};if(u.durationMs>=150){r.usage=r.usage||[];r.usage.push(u)}}current=null;C.save()}
  function openUsage(state=Setka.getState?.()){const s=C.getActiveSession();if(!s||!["measured","after_feedback"].includes(s.phase)||state?.view!=="game")return;closeUsage();current={patternId:state.patternId||"tentacle-orbit",communityConfigId:state.communityId||null,configKey:state.configKey||Setka.configKey?.(state.config),config:state.config?JSON.parse(JSON.stringify(state.config)):null,startedMs:nowElapsed(),saved:false,phase:s.phase}}
  function restartIfChanged(){const st=Setka.getState?.();if(!current||!st)return openUsage(st);if(current.configKey!==st.configKey)openUsage(st)}
  window.addEventListener("setka:pattern-open",e=>openUsage(e.detail?.state||Setka.getState?.()));
  window.addEventListener("setka:gesture-end",restartIfChanged);
  window.addEventListener("setka:color",()=>setTimeout(restartIfChanged,0));
  window.addEventListener("setka:favorite-saved",()=>{if(current){current.saved=true;C.save()}});
  window.addEventListener("setka:view",e=>{if(e.detail?.view==="library")closeUsage();else if(e.detail?.view==="game")setTimeout(()=>openUsage(Setka.getState?.()),0)});
  window.addEventListener("setka:standalone-event",e=>{if(e.detail?.type==="feedback_prompt"||e.detail?.type==="session_end")closeUsage();if(e.detail?.type==="continuation_start")setTimeout(()=>openUsage(Setka.getState?.()),0)});

  // Keep screen transitions represented inside the session replay as well as globally.
  window.addEventListener("setka:view",e=>{if(C.getActiveSession())originalRecord("session_view",{view:e.detail?.view,state:C.stateSnapshot()},true)});
  window.addEventListener("setka:library-page",e=>{if(C.getActiveSession())originalRecord("session_library_page",{page:e.detail?.page,state:C.stateSnapshot()},true)});

  window.__SETKA_STANDALONE_V34_READY__=true;
})();