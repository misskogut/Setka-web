(() => {
  "use strict";
  if(window.__SETKA_PRIVACY_EGRESS_V40__)return;
  const nativeFetch=window.fetch.bind(window);
  function urlOf(input){try{return typeof input==="string"?input:(input?.url||String(input||""))}catch(_){return""}}
  function jsonBody(init){if(!init?.body||typeof init.body!=="string")return null;try{return JSON.parse(init.body)}catch(_){return null}}
  function localOk(data={}){return Promise.resolve(new Response(JSON.stringify({ok:true,...data}),{status:200,headers:{"Content-Type":"application/json; charset=utf-8"}}))}
  function stripHeavyVisuals(v){
    if(v==null||typeof v!=="object")return v;
    if(Array.isArray(v))return v.map(stripHeavyVisuals);
    const out={};
    for(const [k,val] of Object.entries(v)){
      if(k==="dataUrl"||k==="imageDataUrl"||k==="blob"||k==="imageBlob")continue;
      out[k]=stripHeavyVisuals(val);
    }
    return out;
  }
  function stripPublicIdentity(b){
    if(!b||typeof b!=="object")return b;
    delete b.testerId;delete b.subjectKey;delete b.email;delete b.phone;delete b.name;delete b.fullName;delete b.userName;
    if(b.note&&typeof b.note==="object"){
      delete b.note.testerId;delete b.note.subjectKey;delete b.note.deviceId;delete b.note.email;delete b.note.phone;delete b.note.name;delete b.note.fullName;delete b.note.userName;
    }
    return b;
  }
  window.fetch=function(input,init){
    const url=urlOf(input),body=jsonBody(init);
    if(url.includes("/functions/v1/setka-tester-archive-v37")&&body&&!body.sessionToken)return localOk({legacyCallerIgnored:true,privacy:"private-account-only"});
    let b=body;
    const isPrivateArchive=url.includes("/functions/v1/setka-tester-archive-v37");
    const isPublic=url.includes("/functions/v1/setka-public-notes-v37")||url.includes("/functions/v1/setka-community-patterns-v38");
    if((isPrivateArchive||isPublic)&&b){
      b=stripHeavyVisuals(b);
      if(isPublic)b=stripPublicIdentity(b);
      init={...(init||{}),body:JSON.stringify(b)};
    }
    return nativeFetch(input,init);
  };
  window.__SETKA_PRIVACY_EGRESS_V40__={
    active:true,
    mode:"private-system-public-anonymous",
    privateCorpusAllowed:true,
    generatedVisuals:"device-cache-only-by-default",
    publicIdentityStripped:["testerId","subjectKey","email","phone","name","fullName","userName"],
    heavyVisualFieldsStripped:["dataUrl","imageDataUrl","blob","imageBlob"]
  };
})();