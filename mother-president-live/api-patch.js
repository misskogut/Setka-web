(()=>{
  const nativeFetch=window.fetch.bind(window);
  window.fetch=(input,init)=>{
    if(typeof input==='string') input=input.replace('/functions/v1/setka-mother-president-v4','/functions/v1/setka-mother-president-v5');
    return nativeFetch(input,init);
  };
})();
