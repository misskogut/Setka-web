// Evidence of observed input, not a diagnosis of a person's physical or mental state.
export const validInterval=x=>x?.coverage==='observed'&&Number.isFinite(Date.parse(x.startedAt))&&Date.parse(x.endedAt)>Date.parse(x.startedAt)&&['touches','moves','configChanges'].every(k=>Number.isInteger(x[k])&&x[k]>=0);
export function activityForSample(sample,intervals){
 const at=Date.parse(sample.observedAt);
 const matches=(intervals||[]).filter(x=>validInterval(x)&&x.participantId===sample.participantId&&x.sessionId===sample.sessionId&&
  (!sample.deviceId||!x.deviceId||sample.deviceId===x.deviceId)&&x.patternId===sample.patternId&&x.configKey===sample.configKey&&
  (!sample.exposureId||sample.exposureId===x.exposureId)&&at>=Date.parse(x.startedAt)&&at<Date.parse(x.endedAt));
 return matches.length===1?matches[0]:null;
}
export const activityLabel=x=>!validInterval(x)?'Действия не записаны':x.moves>0||x.configChanges>0?'Движения и настройки':x.touches>0?'Касания':'Просмотр без касаний';
