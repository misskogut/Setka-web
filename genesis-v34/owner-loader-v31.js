(() => {
  "use strict";
  if (!window.SetkaOwnerV31?.active) return;
  const mods = [
    "guest-full-v11.js?v=31-owner",
    "guest-copy-v12.js?v=31-owner",
    "guest-features-v12.js?v=31-owner",
    "journey-v7.js?v=31-owner",
    "guest-sync-v12.js?v=31-owner",
    "guest-timer-guard-v11.js?v=31-owner",
    "community-sync-v10.js?v=31-owner",
    "pattern-info-v11.js?v=31-owner",
    "sensor-v13.js?v=31-owner"
  ];
  function load(src, timeout=6500){
    return new Promise(resolve=>{
      const s=document.createElement("script"); let done=false;
      const finish=ok=>{if(done)return;done=true;clearTimeout(t);resolve(ok)};
      s.src=src; s.async=true; s.onload=()=>finish(true); s.onerror=()=>finish(false);
      const t=setTimeout(()=>finish(false),timeout);
      document.body.appendChild(s);
    });
  }
  setTimeout(async()=>{
    for(const src of mods){ await load(src); }
    try{window.SetkaOwnerShellV31?.sync?.()}catch(_){}
  },40);
})();