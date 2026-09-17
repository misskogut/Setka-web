(() => {
  "use strict";
  if(window.__SETKA_PRIVACY_EGRESS_V40__)return;
  const nativeFetch=window.fetch.bind(window);
  function urlOf(input){try{return typeof input==="string"?input:(input?.url||String(input||""))}catch(_){return""}}
  function jsonBody(init){if(!init?.body||typeof init.body!=="string")return null;try{return JSON.parse(init.body)}catch(_){return null}}
  function localOk(data={}){return Promise.resolve(new Response(JSON.stringify({ok:true,privacyMode:"local-personal-corpus",...data}),{status:200,headers:{"Content-Type":"application/json; charset=utf-8"}}))}
  window.fetch=function(input,init){
    const url=urlOf(input);
    // Legacy private archive is intentionally disabled: personal corpus must never leave this device through this route.
    if(url.includes("/functions/v1/setka-tester-archive-v37"))return localOk({syncDisabled:true,duplicateStore:false,counts:{sessions:0,notes:0}});
    if(url.includes("/functions/v1/setka-standalone-v34")){
      const b=jsonBody(init);if(b){delete b.archive;delete b.eventsDelta;delete b.visitId;delete b.userAgent;delete b.viewport;b.build=b.build||"v40-private-local";init={...(init||{}),body:JSON.stringify(b)}}
    }
    if(url.includes("/functions/v1/setka-semantic-v35")){
      const b=jsonBody(init);if(b){delete b.exposuresDelta;delete b.visit;init={...(init||{}),body:JSON.stringify(b)}}
    }
    return nativeFetch(input,init);
  };
  window.__SETKA_PRIVACY_EGRESS_V40__={active:true,mode:"local-personal-corpus",blocked:["private-archive"],stripped:["archive","eventsDelta","exposuresDelta","visit","userAgent","viewport"]};
})();