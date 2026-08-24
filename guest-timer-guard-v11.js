(() => {
  "use strict";
  const KEY="setka-research:guest-active-session:v11";
  setInterval(()=>{
    try{
      const a=JSON.parse(localStorage.getItem(KEY)||"null");
      if(!a||a.phase!=="measured"||!a.deadlineAt)return;
      if(Date.now()<Date.parse(a.deadlineAt))return;
      const pill=document.getElementById("guestSessionPill");
      if(pill&&!pill.dataset.timerForced){pill.dataset.timerForced="1";pill.click();setTimeout(()=>{if(pill)pill.dataset.timerForced=""},1200)}
    }catch(_){}
  },400);
})();