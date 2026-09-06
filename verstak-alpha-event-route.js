(()=>{
  'use strict';
  const nativeFetch=window.fetch.bind(window);
  window.fetch=(input,init)=>{
    if(typeof input==='string' && input.includes('/functions/v1/verstak-alpha')){
      input=input.replace('/functions/v1/verstak-alpha','/functions/v1/verstak-alpha-v2');
    }else if(input instanceof Request && input.url.includes('/functions/v1/verstak-alpha')){
      const url=input.url.replace('/functions/v1/verstak-alpha','/functions/v1/verstak-alpha-v2');
      input=new Request(url,input);
    }
    return nativeFetch(input,init);
  };
})();