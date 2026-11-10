(()=>{
 "use strict";
 const C=window.SetkaStandaloneV34,privateCorpus=()=>window.__SETKA_PRIVATE_CORPUS_V40__;
 if(!C)return;
 const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-guest-archive-v1";
 const SECRET_KEY="setka-guest:v1-secret";
 const SESSION_KEY="setka-v40:cabinet-session";
 let secret=null,revision=0,hydrated=false,loading=null,busy=false,timer=0,lastSignature="",lastError=null,lastSavedAt=null;
 const uuid=()=>crypto.randomUUID();
 function stripHeavy(v){
   if(v==null||typeof v!=="object")return v;
   if(Array.isArray(v))return v.map(stripHeavy);
   const o={};for(const [k,x] of Object.entries(v)){if(["dataUrl","imageDataUrl","blob","imageBlob"].includes(k))continue;o[k]=stripHeavy(x)}return o;
 }

 function loggedIn(){try{return !!JSON.parse(localStorage.getItem(SESSION_KEY)||sessionStorage.getItem(SESSION_KEY)||"null")?.token}catch(_){return false}}
 function credentials(){
   if(!C.sandbox?.deviceId)return null;
   if(!secret){
     try{secret=localStorage.getItem(SECRET_KEY);if(!secret){secret=uuid();localStorage.setItem(SECRET_KEY,secret)}}catch(_){return null}
   }
   return {deviceId:C.sandbox.deviceId,secret};
 }
 async function request(body){
   const r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},body:JSON.stringify(body)});
   const d=await r.json().catch(()=>({}));
   if(!r.ok||!d.ok)throw Error(d.error||"guest_archive_unavailable");
   return d;
 }
 async function restore(){
   if(loggedIn())return false;
   if(hydrated)return true;
   if(loading)return loading;
   loading=(async()=>{
     if(C.ready)await C.ready;
     const auth=credentials();if(!auth)return false;
     const out=await request({...auth,action:"pull"});
     if(loggedIn())return false;
     if(out.archive){
       await privateCorpus()?.mergeGuest?.(out.archive.payload||{},out.archive.favorites||[]);
       revision=Number(out.archive.revision)||0;
     }
     hydrated=true;lastError=null;
     window.dispatchEvent(new CustomEvent("setka:guest-archive-restored",{detail:{revision,exists:!!out.archive}}));
     return true;
   })().catch(e=>{lastError=String(e);return false}).finally(()=>{loading=null});
   return loading;
 }
 async function sync(){
   if(loggedIn()||busy)return false;
   if(!await restore()||loggedIn())return false;
   const corpus=privateCorpus();if(!corpus?.guestArchive)return false;
   const data=stripHeavy(corpus.guestArchive()),favorites=stripHeavy(corpus.guestFavorites());
   const body={...credentials(),action:"sync",revision,archive:data,favorites};
   const signature=JSON.stringify([data.notes,data.sessions,data.symptoms,data.checkins,data.settings,data.patternExposures,data.openedPatterns,favorites]);
   if(signature===lastSignature)return true;
   busy=true;
   try{
     let out;
     try{out=await request(body)}
     catch(e){
       if(String(e).includes("revision_conflict")){
         hydrated=false;
         if(!await restore())throw e;
         return false;
       }
       throw e;
     }
     revision=out.revision;lastSignature=signature;lastSavedAt=out.updatedAt;lastError=null;
     window.dispatchEvent(new CustomEvent("setka:guest-archive-saved",{detail:{revision,updatedAt:lastSavedAt,counts:out.counts}}));
     return true;
   }catch(e){lastError=String(e);return false}finally{busy=false}
 }
 const schedule=(ms=1200)=>{clearTimeout(timer);timer=setTimeout(()=>{sync()},ms)};
 for(const event of ["setka:standalone-event","setka:favorite-saved","setka:favorite-removed","setka:pattern-exposure","setka:activity-interval","setka:v34-sync-request"])window.addEventListener(event,()=>schedule());
 window.addEventListener("online",()=>schedule(200));
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule(100)});
 async function attachGuestToAccount(){
   if(!loggedIn()||!credentials())return false;
   try{
     const account=JSON.parse(localStorage.getItem(SESSION_KEY)||sessionStorage.getItem(SESSION_KEY)||"null");
     if(!account?.testerId)return false;
     const out=await request({...credentials(),action:"pull"});
     if(!out.archive)return true;
     const marker="setka-guest:v1-migrated:"+account.testerId;
     if(localStorage.getItem(marker)===String(out.archive.revision))return true;
     const corpus=privateCorpus();
     if(!await corpus?.ensureHydrated?.())return false;
     if(!loggedIn())return false;
     await corpus.mergeGuest(out.archive.payload||{},out.archive.favorites||[]);
     if(!await corpus.sync())return false;
     localStorage.setItem(marker,String(out.archive.revision));
     return true;
   }catch(e){lastError=String(e);return false}
 }
 window.addEventListener("setka:v40-account",()=>{if(!loggedIn()){hydrated=false;lastSignature="";schedule(200)}else setTimeout(attachGuestToAccount,800)});
 window.addEventListener("setka:v40-private-corpus-restored",()=>{if(loggedIn())setTimeout(attachGuestToAccount,400)});
 setInterval(()=>{if(!loggedIn())schedule(0)},45000);
 setTimeout(()=>{if(loggedIn())attachGuestToAccount();else schedule(100)},300);
 window.__SETKA_GUEST_ARCHIVE_V1__={restore,sync,status:()=>({hydrated,revision,lastSavedAt,lastError,guest:!loggedIn()})};
})();