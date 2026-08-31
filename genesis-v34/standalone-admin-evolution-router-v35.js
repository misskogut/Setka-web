(() => {
  "use strict";
  const MAIN="/functions/v1/setka-admin-evolution-v35";
  const UX="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-admin-evolution-ux-v35";
  const prior=window.fetch.bind(window);
  window.fetch=async function(input,init={}){
    const url=typeof input==="string"?input:(input?.url||"");
    if(!url.includes(MAIN))return prior(input,init);
    let action="";try{if(typeof init.body==="string")action=JSON.parse(init.body)?.action||""}catch(_){ }
    if(action==="admin-ux"||action==="admin-replay")return prior(UX,init);
    return prior(input,init);
  };
})();