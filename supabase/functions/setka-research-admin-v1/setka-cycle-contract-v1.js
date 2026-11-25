(function contract(){
 "use strict";
 const FIELD="almaCycleV1",BACKUP="almaCycleLocalBackupV1",NOTICE="alma-linked-research-v1";
 const KEYS=["setka-alma-source-cycle-v1","setka-alma-cycle-history-v1","setka-cycle-lotus-lab-v1"],names=["snapshot","history","legacy"];
 const slot=k=>names[KEYS.indexOf(k)]||null;
 const obj=v=>v&&typeof v==="object"&&!Array.isArray(v);
 const clone=v=>JSON.parse(JSON.stringify(v));
 const validOwner=v=>typeof v==="string"&&/^(tester|device):[^\s]{1,180}$/.test(v);
 const stamp=v=>Number.isSafeInteger(v)&&v>0&&v<8640000000000000;
 const empty=owner=>({version:1,owner,slots:{},consent:null});
 function normalize(v,owner){
  if(!validOwner(owner)||!obj(v)||v.version!==1||v.owner!==owner||!obj(v.slots))return null;
  const out=empty(owner);
  for(const n of names){
   const x=v.slots[n];if(!obj(x)||!stamp(x.at)||!obj(x.value))continue;
   let raw;try{raw=JSON.stringify(x.value)}catch(_){continue}
   if(raw.length>350000)continue;out.slots[n]={at:x.at,value:JSON.parse(raw)};
  }
  const c=v.consent;
  if(obj(c)&&c.notice===NOTICE&&typeof c.accepted==="boolean"&&stamp(c.at))out.consent={notice:NOTICE,accepted:c.accepted,at:c.at};
  return out;
 }
 function newest(a,b){
  if(!a)return b;if(!b)return a;
  if(a.at!==b.at)return a.at>b.at?a:b;
  if("accepted" in a&&"accepted" in b&&a.accepted!==b.accepted)return a.accepted?b:a;
  return JSON.stringify(a)>=JSON.stringify(b)?a:b;
 }
 function merge(a,b,owner){
  const x=normalize(a,owner),y=normalize(b,owner);if(!x&&!y)return null;
  const out=empty(owner);for(const n of names){const v=newest(x?.slots[n],y?.slots[n]);if(v)out.slots[n]=v}
  out.consent=newest(x?.consent,y?.consent)||null;return out;
 }
 function cloud(v,owner){const x=normalize(v,owner);if(!x?.consent)return null;return x.consent.accepted?x:{...x,slots:{}}}
 const hasData=v=>!!(v&&Object.values(v.slots||{}).some(x=>x?.value));
 const date=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(Date.parse(v)).toISOString().slice(0,10)===v;
 const length=v=>v!=null&&Number.isInteger(Number(v))&&Number(v)>=1&&Number(v)<=60?Number(v):null;
 function summary(v,owner){
  const x=cloud(v,owner);if(!x?.consent.accepted)return null;
  const snap=x.slots.snapshot?.value||{},profile=obj(snap.profile)?snap.profile:{};
  const hist=x.slots.history?.value||{},legacy=x.slots.legacy?.value||{},periods=new Map();
  function add(start,n,source){if(date(start))periods.set(start,{start,periodLength:length(n),source})}
  for(const row of Array.isArray(legacy.periods)?legacy.periods:Array.isArray(legacy.records)?legacy.records:[]){
   const n=date(row?.start)&&date(row?.end)?Math.round((Date.parse(row.end)-Date.parse(row.start))/86400000)+1:row?.periodLength;add(row?.start,n,"legacy")
  }
  for(const row of Array.isArray(hist.records)?hist.records:[])add(row?.start,row?.periodLength,row?.source||"history");
  if(snap.configured===true)add(profile.lastPeriodStart,profile.periodLength,"current");
  const days=[...periods.values()].sort((a,b)=>a.start.localeCompare(b.start)),events=[];
  for(const [day,labels] of Object.entries(obj(snap.events)?snap.events:{}))if(date(day)&&Array.isArray(labels))for(const label of [...new Set(labels.filter(v=>typeof v==="string"&&v.length<=500))])events.push({date:day,label});
  events.sort((a,b)=>a.date.localeCompare(b.date)||a.label.localeCompare(b.label));
  return {owner,consentAt:new Date(x.consent.at).toISOString(),updatedAt:new Date(Math.max(x.consent.at,...Object.values(x.slots).map(r=>r.at))).toISOString(),configured:snap.configured===true,periodCount:days.length,markCount:events.length,periods:days,events,profile,raw:x.slots};
 }
 globalThis.SETKA_ALMA_CYCLE_CONTRACT_V1=Object.freeze({FIELD,BACKUP,NOTICE,KEYS,names,slot,empty,normalize,merge,cloud,summary,hasData,validOwner,clone});
})();
