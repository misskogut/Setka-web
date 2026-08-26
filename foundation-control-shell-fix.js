(()=>{
'use strict';
const frame=document.getElementById('appFrame');
if(!frame)return;
function hideInnerResearchTools(){
  try{
    const d=frame.contentDocument;
    ['recordPath','traceCode'].forEach(id=>{const el=d.getElementById(id);if(el)el.hidden=true});
    d.querySelectorAll('.record').forEach(el=>{el.hidden=true});
  }catch{}
}
frame.addEventListener('load',()=>{hideInnerResearchTools();setTimeout(hideInnerResearchTools,50);setTimeout(hideInnerResearchTools,500)});
})();