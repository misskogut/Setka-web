// Shared reconstruction law. Never creates an opening state or invents touches.
export function recordedStates(events=[],notes=[],sessionId=null){
 const result=[];
 for(const e of events){
  if(e.tMs==null||!Number.isFinite(Number(e.tMs)))continue;
  const p=e.payload||{},state=p.state||(e.type==='app_state'?p:null);
  if(state&&typeof state==='object')result.push({tMs:Number(e.tMs),state,source:e.source||'recorded-event'});
 }
 for(const n of notes){
  if(!sessionId||String(n.sessionId)!==String(sessionId)||n.sessionElapsedMs==null)continue;
  const state=n.replaySnapshot||n.state||n.visualRecipe;
  if(state?.patternId&&state.config&&Number.isFinite(Number(n.sessionElapsedMs)))
   result.push({tMs:Number(n.sessionElapsedMs),state:{...n.state,...state,view:'game'},source:'note-snapshot'});
 }
 const seen=new Set();return result.sort((a,b)=>a.tMs-b.tMs).filter(s=>{const key=JSON.stringify([s.tMs,s.state]);if(seen.has(key))return false;seen.add(key);return true});
}
export function screenAt(events,stateEntry,t){
 let visible=true,view=stateEntry?.state?.view||null,overlay=null,screenAt=-1,viewAt=-1,ui=null,uiAt=-1;
 for(const e of events){
  if(e.tMs>t)break;const p=e.payload||{};
  if(e.type==='visibility')visible=!(p.hidden===true||[p.visibility,p.visibilityState,p.state].includes('hidden'));
  if(['view','session_view'].includes(e.type)&&p.view){viewAt=e.tMs;if(e.tMs>=(stateEntry?.tMs??-1))view=p.view;if(e.tMs>=screenAt)overlay=null;}
  if(['screen','session_screen'].includes(e.type)&&e.tMs>=viewAt){overlay={title:p.title||'Экран приложения',kicker:p.kicker||'SETKA'};screenAt=e.tMs;}
  if(e.type==='ui_visibility'&&p.visible===false)overlay=null;
  if(p.state?.ui){ui=p.state.ui;uiAt=e.tMs;}
 }
 if(uiAt<viewAt&&ui?.kind!==view||uiAt<screenAt)ui=null;
 if(ui?.kind==='game'||ui?.kind==='library')overlay=null;
 if(ui?.kind==='overlay')overlay={title:ui.title||overlay?.title||'Экран приложения',kicker:ui.kicker||'SETKA'};
 return {visible,view,overlay,ui};
}
