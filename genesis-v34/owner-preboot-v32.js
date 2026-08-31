(() => {
  "use strict";
  const ADMIN_KEY="setka-research:admin-key:v1";
  const ACCESS="setka-research:access-code:v1";
  const TRIAL="setka-research:guest-trial-start:v1";
  let admin="";
  try{admin=localStorage.getItem(ADMIN_KEY)||""}catch(_){}
  window.SetkaOwnerV32={active:!!admin};
  if(!admin)return;
  const keepAlive=()=>{
    try{
      localStorage.removeItem(ACCESS);
      localStorage.removeItem("setka-research:access-verified:v26");
      localStorage.removeItem("setka-research:access-verified:v27");
      localStorage.removeItem("setka-research:access-verified:v29");
      localStorage.setItem(TRIAL,String(Date.now()));
      localStorage.setItem("setka-research:owner-mode:v32","1");
    }catch(_){}
  };
  keepAlive();
  setInterval(keepAlive,1500);
})();