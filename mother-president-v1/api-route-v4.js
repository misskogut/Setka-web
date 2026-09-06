(()=>{
'use strict';
const raw=window.fetch.bind(window);
const from='/functions/v1/setka-mother-president-v3';
const to='/functions/v1/setka-mother-president-v4';
window.fetch=function(input,init){
  if(typeof input==='string'&&input.includes(from)) input=input.replace(from,to);
  else if(input instanceof Request&&input.url.includes(from)) input=new Request(input.url.replace(from,to),input);
  return raw(input,init);
};
})();
