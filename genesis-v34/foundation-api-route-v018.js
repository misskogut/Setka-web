(()=>{
'use strict';
const HOST='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/';
const TO=HOST+'setka-foundation-v018';
const FROM=[HOST+'setka-foundation-v016',HOST+'setka-foundation-v017'];
const nativeFetch=window.fetch.bind(window);
window.fetch=(input,init)=>{
  if(typeof input==='string'){
    const hit=FROM.find(x=>input.startsWith(x));
    if(hit)return nativeFetch(input.replace(hit,TO),init);
  }
  if(input instanceof Request){
    const hit=FROM.find(x=>input.url.startsWith(x));
    if(hit)return nativeFetch(new Request(input.url.replace(hit,TO),input),init);
  }
  return nativeFetch(input,init);
};
window.__SETKA_FOUNDATION_ROUTE_V018__={from:FROM,to:TO};
})();