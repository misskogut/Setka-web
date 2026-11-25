(function bridge(){
 "use strict";
 const K=window.SETKA_ALMA_CYCLE_CONTRACT_V1,C=window.SetkaStandaloneV34,S=window.SetkaDataScopeV1;
 if(!K||!C||!S)return;
 const did=C.sandbox?.deviceId,owner=S.id==="guest"?(did?"device:"+did:null):S.id;
 if(!K.validOwner(owner))return;
 const storageKey=S.key("setka-alma-linked-cycle-v1"),legacyClaim="setka-alma-cycle-legacy-owner-v1";
 const read=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch(_){return null}};
 let state=K.normalize(read(storageKey),owner)||K.empty(owner),pending=null,locked=false,firstSnapshot=true,error=null;
 let frame=null,frameReady=false;
 const latest=()=>K.merge(state,pending,owner)||state;
 const at=()=>Math.max(Date.now(),1+Math.max(0,latest().consent?.at||0,...Object.values(latest().slots).map(x=>x.at)));
 function durable(next){if(locked)throw Error("account_switch");localStorage.setItem(storageKey,JSON.stringify(next));state=next;error=null}
 function publish(){
  const d=C.getData();d.settings=d.settings||{};
  const v=K.cloud(latest(),owner),previous=d.settings[K.FIELD];
  if(JSON.stringify(v??null)===JSON.stringify(previous??null))return;
  if(v)d.settings[K.FIELD]=v;else delete d.settings[K.FIELD];
  C.save();window.dispatchEvent(new Event("setka:v34-sync-request"));
 }
 function reloadFrame(){if(frame&&frameReady){frameReady=false;firstSnapshot=true;frame.contentWindow.location.reload()}}
 function flush(reload=true){
  if(!pending||locked)return;const next=K.merge(state,pending,owner);
  if(next&&JSON.stringify(next)!==JSON.stringify(state)){durable(next);pending=null;if(reload)reloadFrame()}else pending=null
 }
 function receive(v){
  const x=K.normalize(v,owner);if(!x||locked)return false;
  const next=K.merge(latest(),x,owner);if(JSON.stringify(next)===JSON.stringify(latest()))return false;
  pending=next;const back=document.getElementById("setkaCycleBack");
  if(!back||back.hidden||!frameReady)flush(true);return true;
 }
 function getItem(key){const n=K.slot(key);if(!n||locked)return null;const x=state.slots[n];return x?JSON.stringify(x.value):null}
 function setItem(key,raw){
  if(locked)throw Error("account_switch");const n=K.slot(key);if(!n)throw Error("invalid_cycle_key");const v=JSON.parse(raw);
  if(n==="snapshot"&&firstSnapshot){firstSnapshot=false;if(!state.slots.snapshot&&!v.configured&&!Object.keys(v.events||{}).length)return}
  if(JSON.stringify(state.slots[n]?.value)===JSON.stringify(v))return;
  const next={...state,slots:{...state.slots,[n]:{at:at(),value:v}}},verified=K.normalize(next,owner);
  if(!verified?.slots[n]||JSON.stringify(verified.slots[n].value)!==JSON.stringify(v))throw Error("invalid_or_large_cycle");
  try{durable(verified);publish()}catch(e){error=String(e?.message||e);throw e}
 }
 function setSharing(accepted){
  if(locked)return false;const next=K.merge(latest(),{...K.empty(owner),consent:{accepted:!!accepted,notice:K.NOTICE,at:at()}},owner);
  durable(next);pending=null;publish();return true;
 }
 function legacyAvailable(){const claim=read(legacyClaim);return (!claim||claim===owner)&&K.KEYS.some(k=>read(k)&&!latest().slots[K.slot(k)])}
 function importLegacy(){
  if(!legacyAvailable()||locked)return false;let next=K.clone(latest()),changed=false;
  for(const k of K.KEYS){const n=K.slot(k),v=read(k);if(v&&!next.slots[n]){next.slots[n]={at:at(),value:v};changed=true}}
  if(!changed)return false;next=K.normalize(next,owner);if(!next)throw Error("invalid_legacy_cycle");
  durable(next);localStorage.setItem(legacyClaim,JSON.stringify(owner));pending=null;publish();reloadFrame();return true;
 }
 function guestData(){
  if(!owner.startsWith("tester:")||!did)return null;
  const g=K.normalize(read("setka-alma-linked-cycle-v1::scope:"+encodeURIComponent("guest")),"device:"+did);
  return K.hasData(g)?g:null;
 }
 function guestAvailable(){const g=guestData();return !!g&&K.names.some(n=>!latest().slots[n]&&g.slots[n])}
 function importGuest(){
  const g=guestData();if(!g||locked)return false;const next=K.clone(latest());let changed=false;
  for(const n of K.names)if(!next.slots[n]&&g.slots[n]){next.slots[n]=g.slots[n];changed=true}
  if(!changed)return false;durable(next);pending=null;publish();reloadFrame();return true;
 }
 function backup(){const x=K.clone(latest());x.consent=null;return K.hasData(x)?x:null}
 function importBackup(v,scope){
  const oldOwner=v?.owner;if(oldOwner!==owner&&!(scope==="guest"&&typeof oldOwner==="string"&&oldOwner.startsWith("device:")))throw Error("different_cycle_owner");
  const old=K.normalize(v,oldOwner);if(!old)throw Error("invalid_cycle_backup");
  const next=K.merge(latest(),{...old,owner,consent:null},owner);durable(next);pending=null;publish();reloadFrame();return true;
 }
 function attach(){
  frame=document.querySelector("#setkaCycleBack iframe");const back=document.getElementById("setkaCycleBack");
  if(frame){frame.addEventListener("load",()=>{frameReady=true});if(frame.contentDocument?.readyState==="complete")frameReady=true}
  if(back&&typeof MutationObserver==="function")new MutationObserver(()=>{if(back.hidden)try{flush(true)}catch(e){error=String(e?.message||e)}}).observe(back,{attributes:true,attributeFilter:["hidden"]});
 }
 window.SETKA_ALMA_CYCLE_LINK_V1=Object.freeze({owner,getItem,setItem,receive,setSharing,legacyAvailable,importLegacy,guestAvailable,importGuest,backup,importBackup,
  status:()=>({owner,sharing:latest().consent?.accepted===true,consentAt:latest().consent?.at||null,pending:!!pending,error,legacyAvailable:legacyAvailable(),guestAvailable:guestAvailable()})});
 window.addEventListener("setka:account-switch-start",()=>{locked=true;pending=null});
 window.addEventListener("storage",e=>{if(e.key===storageKey&&!locked){const x=K.normalize(read(storageKey),owner);if(x)try{receive(x)}catch(err){error=String(err?.message||err)}}});
 Promise.resolve(C.ready).then(()=>{if(!locked){receive(C.getData()?.settings?.[K.FIELD]);publish()}}).catch(e=>{error=String(e?.message||e)});
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",attach,{once:true});else attach();
})();
