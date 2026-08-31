(() => {
  "use strict";
  if (!window.SetkaOwnerV31?.active) return;
  const app = document.getElementById("app");
  const library = document.getElementById("libraryScreen");
  const game = document.getElementById("gameScreen");
  if (!app || !library || !game) return;

  app.style.visibility = "visible";
  app.style.pointerEvents = "auto";

  const style = document.createElement("style");
  style.textContent = `
    #ownerBadge31{position:fixed;z-index:200000;left:14px;top:calc(env(safe-area-inset-top,0px) + 16px);height:34px;padding:0 12px;border:1px solid rgba(255,255,255,.38);border-radius:18px;background:rgba(0,0,0,.68);display:flex;align-items:center;gap:7px;color:#fff;font:9px -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;letter-spacing:.12em;pointer-events:none}#ownerBadge31 i{width:6px;height:6px;border-radius:50%;background:#fff}
    #ownerNav31{position:fixed;z-index:190000;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 8px);transform:translateX(-50%);width:min(calc(100% - 22px),430px);height:58px;border:1px solid rgba(255,255,255,.19);border-radius:29px;background:rgba(5,5,5,.96);display:grid;grid-template-columns:repeat(4,1fr);padding:4px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}#ownerNav31.hidden{display:none!important}#ownerNav31 button{border:0;background:transparent;color:rgba(255,255,255,.46);border-radius:24px;font-size:9px}#ownerNav31 button span{display:block;font-size:17px;line-height:20px}#ownerNav31 button.active{background:#fff;color:#000}
    #ownerToast31{position:fixed;z-index:210000;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 78px);transform:translateX(-50%);padding:8px 12px;border-radius:15px;background:rgba(20,20,20,.96);border:1px solid rgba(255,255,255,.18);font:10px -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;color:#fff;opacity:0;pointer-events:none;transition:opacity .2s}#ownerToast31.show{opacity:1}
    #libraryScreen{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 88px)!important}
  `;
  document.head.appendChild(style);

  const badge = document.createElement("div"); badge.id = "ownerBadge31"; badge.innerHTML = "<i></i><span>OWNER · TEST</span>"; document.body.appendChild(badge);
  const nav = document.createElement("div"); nav.id = "ownerNav31"; nav.innerHTML = `<button data-p="today"><span>◉</span>Сегодня</button><button data-p="patterns" class="active"><span>⌁</span>Паттерны</button><button data-p="symptoms"><span>◇</span>Симптомы</button><button data-p="me"><span>○</span>Я</button>`; document.body.appendChild(nav);
  const toast = document.createElement("div"); toast.id = "ownerToast31"; document.body.appendChild(toast);

  let toastTimer = 0;
  function say(t){ toast.textContent=t; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove("show"),1200); }
  function active(p){ nav.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.p===p)); }
  function closeGuest(){ document.getElementById("guestLayer")?.classList.add("hidden"); app.style.visibility="visible"; app.style.pointerEvents="auto"; }
  function patterns(){ closeGuest(); if(game.classList.contains("active")) document.getElementById("libraryButton")?.click(); try{window.SetkaApp?.setLibraryPage?.("all");window.SetkaApp?.renderLibrary?.()}catch(_){} active("patterns"); }
  function openHome(cb){
    const menu=document.getElementById("guestMenuButton");
    if(!menu){ say("Подключаем раздел…"); setTimeout(()=>openHome(cb),250); return; }
    menu.click(); setTimeout(()=>cb?.(),30);
  }
  function symptoms(){ active("symptoms"); openHome(()=>{const buttons=[...document.querySelectorAll("#guestLayer .g-action")];const b=buttons.find(x=>x.querySelector("b")?.textContent?.trim()==="Симптомы");if(b)b.click();}); }
  function today(){ active("today"); openHome(); }
  function me(){ active("me"); openHome(); }

  nav.addEventListener("click",e=>{const b=e.target.closest("button[data-p]");if(!b)return;({today,patterns,symptoms,me}[b.dataset.p])?.();});

  // Core pager fallbacks so the library remains clickable even if an optional module is late.
  document.getElementById("libraryPagerButton")?.addEventListener("click",()=>{try{window.SetkaApp?.setLibraryPage?.("all")}catch(_){}});
  document.getElementById("communityPagerButton")?.addEventListener("click",()=>{try{window.SetkaApp?.setLibraryPage?.("community")}catch(_){}});
  document.getElementById("favoritesPagerButton")?.addEventListener("click",()=>{try{window.SetkaApp?.setLibraryPage?.("favorites")}catch(_){}});

  function sync(){
    app.style.visibility="visible";
    app.style.pointerEvents="auto";
    const inGame=game.classList.contains("active"); nav.classList.toggle("hidden",inGame);
  }
  new MutationObserver(sync).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:["class","style"]});
  window.addEventListener("setka:view",sync); setInterval(sync,1000); sync();
  window.SetkaOwnerShellV31={patterns,today,symptoms,me,sync};
})();