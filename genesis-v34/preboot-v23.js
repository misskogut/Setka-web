(() => {
  "use strict";
  const app=document.getElementById("app");
  if(!app)return;
  app.style.visibility="visible";
  const qs=new URLSearchParams(location.search);
  window.SETKA_SAFE_MODE=qs.get("safe")==="1";

  function coreReady(){return !!window.SetkaApp && document.querySelectorAll(".pattern-tile").length>0}
  function release(){
    app.style.visibility="visible";
    const layer=document.getElementById("setkaResearchLayer");
    const title=layer?.querySelector(".research-title")?.textContent?.trim()||"";
    if(layer && (!title || title==="Подключаем SETKA")) layer.classList.add("hidden");
    document.querySelector(".portal-nav")?.classList.add("hidden");
    try{window.SetkaApp?.renderLibrary?.();if(window.SetkaApp?.getState?.()?.view!=="game")window.SetkaApp?.setLibraryPage?.("all",true)}catch(_){}
  }
  function showRecovery(){
    if(coreReady())return;
    if(document.getElementById("setkaRecovery"))return;
    const el=document.createElement("div");
    el.id="setkaRecovery";
    el.style.cssText="position:fixed;inset:0;z-index:200000;background:#000;color:#fff;display:grid;place-items:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;text-align:center";
    el.innerHTML='<div style="max-width:340px"><div style="width:52px;height:52px;border:1px solid rgba(255,255,255,.55);border-radius:50%;display:grid;place-items:center;margin:0 auto 18px;font-size:9px;letter-spacing:.12em">SETKA</div><div style="font-size:18px;font-weight:650">Перезапускаем прототип</div><div style="font-size:12px;line-height:1.5;color:rgba(255,255,255,.48);margin:9px 0 16px">Основной интерфейс не стартовал с первого раза. Запускаю чистый core без ожидания аналитики.</div><button id="setkaRecoveryBtn" style="width:100%;height:48px;border-radius:24px;border:1px solid #fff;background:#fff;color:#000;font:inherit;font-size:13px;font-weight:650">Открыть SETKA</button></div>';
    document.body.appendChild(el);
    el.querySelector("#setkaRecoveryBtn").onclick=async()=>{
      el.querySelector("#setkaRecoveryBtn").textContent="Запускаю…";
      try{
        if(!window.SetkaApp){
          await new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="app-v2.js?recover=23-"+Date.now();s.onload=resolve;s.onerror=reject;document.body.appendChild(s)});
        }
        release();
        if(coreReady())el.remove();else location.href="launch-v23.html?safe=1&t="+Date.now();
      }catch(_){location.href="launch-v23.html?safe=1&t="+Date.now()}
    };
  }

  window.addEventListener("error",()=>setTimeout(release,0));
  window.addEventListener("unhandledrejection",()=>setTimeout(release,0));
  setTimeout(release,900);
  setTimeout(()=>{if(!coreReady()){
    const s=document.createElement("script");s.src="app-v2.js?recover=23b-"+Date.now();s.onload=()=>{release();document.getElementById("setkaRecovery")?.remove()};document.body.appendChild(s);
  }},1600);
  setTimeout(showRecovery,3200);
  window.SetkaPrebootV23={release,coreReady};
})();