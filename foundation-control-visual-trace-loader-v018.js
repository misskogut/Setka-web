(()=>{
'use strict';
const mobile=matchMedia('(max-width: 899px)').matches||/iPhone|iPad|iPod/i.test(navigator.userAgent)||navigator.maxTouchPoints>1&&innerWidth<900;
if(mobile){
  window.FoundationVisualTraceV018={active:()=>false,flush:async()=>{},version:'mobile-safe-core-trace-only'};
  try{localStorage.setItem('setka:foundation:president:trace-mode','mobile-safe-core-only')}catch{}
  return;
}
const s=document.createElement('script');
s.src='foundation-control-visual-trace-v018.js?build=018-wd-20260826-vtrace1';
s.async=false;
document.head.appendChild(s);
})();