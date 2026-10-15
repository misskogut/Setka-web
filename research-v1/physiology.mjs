// Shared contract for real physiological observations in the front and research admin.
// Historic simulations are retained as evidence, never counted as measurements.
export function physioKind(x){
  if(!x||typeof x!=='object')return 'invalid';
  const source=String(x.sourceType||'').toLowerCase(),quality=String(x.quality||'').toLowerCase();
  if(x.simulated===true||x.payload?.simulated===true||/demo|simulat|synthetic|test/.test(source+' '+quality)||x.sourceId==='demo')return 'simulated';
  if(source!=='ble_heart_rate')return 'unverified';
  if(quality==='no_contact'||quality==='invalid'||quality==='unknown'||x.payload?.contactSupported===true&&x.payload?.contactDetected!==true)return 'invalid';
  const value=Number(x.value);
  if(x.value==null||!Number.isFinite(value)||value<=0||!Number.isFinite(Date.parse(x.observedAt)))return 'invalid';
  if(x.metric==='heart_rate'&&(x.unit==='bpm'||!x.unit)&&value<=65535)return 'real';
  if(x.metric==='rr_interval'&&x.unit==='ms'&&value<64000)return 'real';
  return 'invalid';
}
export const isRealPhysio=x=>physioKind(x)==='real';
export const realHeartRates=rows=>(Array.isArray(rows)?rows:[]).filter(x=>x.metric==='heart_rate'&&isRealPhysio(x)).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt));

export function parseHeartRateMeasurement(value){
  if(!value||typeof value.getUint8!=='function'||value.byteLength<2)return null;
  try{
    const flags=value.getUint8(0);let offset=1;
    if(flags&1&&value.byteLength<3)return null;
    const bpm=flags&1?value.getUint16(offset,true):value.getUint8(offset);offset+=flags&1?2:1;
    let energyExpended=null;
    if(flags&8){if(offset+2>value.byteLength)return null;energyExpended=value.getUint16(offset,true);offset+=2}
    const rrMs=[];
    if(flags&16){if(offset+2>value.byteLength||(value.byteLength-offset)%2)return null;while(offset+2<=value.byteLength){rrMs.push(value.getUint16(offset,true)*1000/1024);offset+=2}}
    return {bpm,rrMs,energyExpended,contactSupported:!!(flags&4),contactDetected:flags&4?!!(flags&2):null};
  }catch(_){return null}
}

// Match only the same confirmed person, and only an actually recorded interval.
// Ambiguous legacy matches remain unknown. Opening a sheet is not pattern viewing.
export function relatePhysio(samples,exposures){
  return (samples||[]).filter(isRealPhysio).map(sample=>{
    if(sample.payload?.patternVisible===false)return {...sample,matchedExposure:null,linkStatus:'outside-pattern'};
    const at=Date.parse(sample.observedAt),key=sample.exposureId||sample.payload?.exposureId;
    const matches=(exposures||[]).filter(e=>{
      if(e.participantId!==sample.participantId)return false;
      if(sample.deviceId&&e.deviceId&&sample.deviceId!==e.deviceId)return false;
      if(sample.patternId&&e.patternId!==sample.patternId)return false;
      if(sample.sessionId&&e.sessionId!==sample.sessionId)return false;
      if(sample.visitId&&e.visitId&&sample.visitId!==e.visitId)return false;
      if(key&&![e.id,e.exposureId,e.originalId].includes(key))return false;
      if(sample.configKey&&e.configKey!==sample.configKey)return false;
      const start=Date.parse(e.startedAt),end=Date.parse(e.endedAt);
      return Number.isFinite(start)&&Number.isFinite(end)&&at>=start&&at<end;
    });
    return {...sample,matchedExposure:matches.length===1?matches[0]:null,linkStatus:matches.length===1?'recorded':matches.length>1?'ambiguous':'not-recorded'};
  });
}

export function pulseByConfiguration(samples,exposures){
  const groups=new Map();
  for(const sample of relatePhysio(samples,exposures)){
    const e=sample.matchedExposure;if(sample.metric!=='heart_rate'||!e?.configKey)continue;
    const key=`${e.patternId}:${e.configKey}`,g=groups.get(key)||{patternId:e.patternId,configKey:e.configKey,config:e.config,values:[],participants:new Set(),sessions:new Set(),exposures:new Set()};
    g.values.push(Number(sample.value));g.participants.add(sample.participantId);if(sample.sessionId)g.sessions.add(sample.sessionId);g.exposures.add(e.id||e.exposureId);groups.set(key,g);
  }
  return [...groups.values()].map(g=>{const values=g.values.sort((a,b)=>a-b),middle=Math.floor(values.length/2);return {...g,participants:g.participants.size,sessions:g.sessions.size,exposures:g.exposures.size,samples:values.length,mean:values.reduce((a,b)=>a+b,0)/values.length,median:values.length%2?values[middle]:(values[middle-1]+values[middle])/2,min:values[0],max:values.at(-1)}});
}
