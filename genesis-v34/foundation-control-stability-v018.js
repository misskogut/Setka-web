(()=>{
'use strict';
const VIEW_PULSE='setka:foundation:viewing:pulse';
const nativeSetInterval=window.setInterval.bind(window);
window.addEventListener('storage',e=>{
  if(e.key===VIEW_PULSE){
    e.stopImmediatePropagation();
  }
},true);
window.setInterval=(fn,delay,...args)=>{
  const src=typeof fn==='function' ? `${fn.name||''} ${Function.prototype.toString.call(fn)}` : '';
  if(Number(delay)===15000 && /refreshManifest/.test(src)){
    return 0;
  }
  return nativeSetInterval(fn,delay,...args);
};
window.FoundationControlStabilityV018={
  version:'0.1.8',
  policy:'navigation_only_by_explicit_action',
  blocks:['periodic_working_autofollow','cross_tab_view_pulse_autofollow']
};
})();