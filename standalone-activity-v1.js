(() => {
 'use strict'; const C=window.SetkaStandaloneV34,S=window.SetkaApp;if(!C||!S)return;
 let interval=null,lastMove=0,lastConfig=null;
 const current=()=>C.patternExposure?.current?.();
 function begin(now=Date.now()){const x=current();if(!x)return;interval={id:C.id('activity'),exposureId:x.exposureId,visitId:x.visitId,sessionId:x.sessionId,
 patternId:x.patternId,patternVersion:S.getState()?.patternVersion,configKey:x.configKey,startedAt:new Date(now).toISOString(),touches:0,moves:0,configChanges:0,coverage:'observed',version:1};lastConfig=x.configKey;}
 function flush(end=Date.now()){
  if(!interval)return;const x=interval;interval=null;if(end<=Date.parse(x.startedAt))return;
  const row={...x,endedAt:new Date(end).toISOString(),durationMs:end-Date.parse(x.startedAt)},d=C.getData();
  d.activityIntervals=Array.isArray(d.activityIntervals)?d.activityIntervals:[];d.activityIntervals.push(row);
  if(d.activityIntervals.length>10000){d.settings=d.settings||{};d.settings.activityTrimmed=(d.settings.activityTrimmed||0)+d.activityIntervals.length-10000;d.activityIntervals=d.activityIntervals.slice(-10000)}
  C.save();window.dispatchEvent(new CustomEvent('setka:activity-interval',{detail:row}));
 }
 function ensure(){const x=current();if(!x){flush();return null}if(interval?.exposureId!==x.exposureId){flush();begin()}return interval;}
 function allowed(e){return e.target?.closest?.('#patternCanvas,.game-ui')&&!e.target.closest('input,textarea,select,.st40-form');}
 document.addEventListener('pointerdown',e=>{if(allowed(e)){const x=ensure();if(x)x.touches++}},{passive:true,capture:true});
 document.addEventListener('pointermove',e=>{if(!e.buttons||!allowed(e)||Date.now()-lastMove<200)return;lastMove=Date.now();const x=ensure();if(x)x.moves++},{passive:true,capture:true});
 window.addEventListener('setka:gesture-move',()=>{const x=ensure(),key=S.getState()?.configKey;if(x&&key&&lastConfig!==key){x.configChanges++;lastConfig=key}});
 window.addEventListener('setka:color',()=>{const x=ensure();if(x)x.configChanges++});
 window.addEventListener('setka:pattern-exposure',e=>{if(interval?.exposureId===e.detail?.exposureId)flush(Date.parse(e.detail.endedAt));});
 window.addEventListener('setka:pattern-open',()=>setTimeout(ensure,0));
 window.addEventListener('setka:overlay-visibility',()=>{ensure()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();else ensure()});
 window.addEventListener('pagehide',()=>flush());
 setInterval(()=>{ensure();if(interval&&Date.now()-Date.parse(interval.startedAt)>=15000){flush();begin()}},1000);
 C.activity={flush:()=>{flush();begin()},current:()=>interval?{...interval,endedAt:new Date().toISOString()}:null};
})();
