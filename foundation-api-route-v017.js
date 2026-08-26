(()=>{
'use strict';
const FROM='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-v016';
const TO='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-v017';
const nativeFetch=window.fetch.bind(window);
window.fetch=(input,init)=>{
  if(typeof input==='string'&&input.startsWith(FROM))return nativeFetch(input.replace(FROM,TO),init);
  if(input instanceof Request&&input.url.startsWith(FROM))return nativeFetch(new Request(input.url.replace(FROM,TO),input),init);
  return nativeFetch(input,init);
};
window.__SETKA_FOUNDATION_ROUTE_V017__={from:FROM,to:TO};
})();