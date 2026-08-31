(() => {
  "use strict";
  if(!window.SetkaOwnerV32?.active)return;
  const app=document.getElementById("app"),library=document.getElementById("libraryScreen"),game=document.getElementById("gameScreen");
  if(!app||!library||!game)return;

  const style=document.createElement("style");
  style.textContent=`
    #ownerBadge32{position:fixed;z-index:400000;left:14px;top:calc(env(safe-area-inset-top,0px) + 16px);height:34px;padding:0 12px;border:1px solid rgba(255,255,255,.38);border-radius:18px;background:rgba(0,0,0,.7);display:flex;align-items:center;gap:7px;color:#fff;font:9px -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;letter-spacing:.12em;pointer-events:none}#ownerBadge32 i{width:6px;height:6px;border-radius:50%;background:#fff}
    #ownerNav32{position:fixed;z-index:390000;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 8px);transform:translateX(-50%);width:min(calc(100% - 22px),430px);height:58px;border:1px solid rgba(255,255,255,.19);border-radius:29px;background:rgba(5,5,5,.97);display:grid;grid-template-columns:repeat(4,1fr);padding:4px}#ownerNav32.hidden{display:none!important}#ownerNav32 button{border:0;background:transparent;color:rgba(255,255,255,.46);border-radius:24px;font-size:9px;touch-action:manipulation}#ownerNav32 button span{display:block;font-size:17px;line-height:20px}#ownerNav32 button.active{background:#fff;color:#000}
    #libraryScreen button,.pattern-tile,#gameScreen button{pointer-events:auto!important;touch-action:manipulation!important}
  `;
  document.head.appendChild(style);
  const badge=document.createElement("div");badge.id="ownerBadge32";badge.innerHTML='<i></i><span>OWNER · TEST</span>';document.body.appendChild(badge);
  const nav=document.createElement("div");nav.id="ownerNav32";nav.innerHTML='<button data-p="today"><span>◉</span>Сегодня</button><button data-p="patterns" class="active"><span>⌁</span>Паттерны</button><button data-p="symptoms"><span>◇</span>Симптомы</button><button data-p="me"><span>○</span>Я</button>';document.body.appendChild(nav);

  const setActive=p=>nav.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.p===p));
  const closeLayers=()=>{document.getElementById("sensorLayer")?.classList.add("hidden");document.getElementById("guestLayer")?.classList.add("hidden");app.style.visibility="visible";app.style.pointerEvents="auto"};
  const patterns=()=>{closeLayers();if(game.classList.contains("active"))document.getElementById("libraryButton")?.click();try{window.SetkaApp?.setLibraryPage?.("all");window.SetkaApp?.renderLibrary?.()}catch(_){}setActive("patterns")};
  const guestHome=()=>{const m=document.getElementById("guestMenuButton");if(m){m.click();return true}return false};
  const today=()=>{setActive("today");guestHome()};
  const me=()=>{setActive("me");guestHome()};
  const symptoms=()=>{setActive("symptoms");if(!guestHome())return;setTimeout(()=>{const x=[...document.querySelectorAll("#guestLayer .g-action")].find(b=>b.querySelector("b")?.textContent?.trim()==="Симптомы");x?.click()},40)};
  const actions={today,patterns,symptoms,me};
  nav.addEventListener("click",e=>{const b=e.target.closest("button[data-p]");if(b)actions[b.dataset.p]?.()});

  let sx=0,sy=0,moved=false;
  document.addEventListener("touchstart",e=>{const t=e.touches?.[0];if(!t)return;sx=t.clientX;sy=t.clientY;moved=false},{capture:true,passive:true});
  document.addEventListener("touchmove",e=>{const t=e.touches?.[0];if(!t)return;if(Math.hypot(t.clientX-sx,t.clientY-sy)>18)moved=true},{capture:true,passive:true});
  function hit(el,x,y){if(!el)return false;const r=el.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom&&r.width>0&&r.height>0}
  document.addEventListener("touchend",e=>{
    if(moved)return;const t=e.changedTouches?.[0];if(!t)return;const x=t.clientX,y=t.clientY;
    for(const b of nav.querySelectorAll("button[data-p]")){if(hit(b,x,y)){e.preventDefault();actions[b.dataset.p]?.();return}}
    const pagers=[["libraryPagerButton","all"],["communityPagerButton","community"],["favoritesPagerButton","favorites"]];
    for(const [id,page] of pagers){const b=document.getElementById(id);if(hit(b,x,y)){e.preventDefault();try{window.SetkaApp?.setLibraryPage?.(page)}catch(_){}return}}
    const sensor=document.getElementById("sensorMenuButton");if(hit(sensor,x,y)){e.preventDefault();sensor.click();return}
    const guest=document.getElementById("guestMenuButton");if(hit(guest,x,y)){e.preventDefault();guest.click();return}
    const info=[...document.querySelectorAll(".pattern-info-button,#patternInfoButton")].find(el=>hit(el,x,y));if(info){e.preventDefault();info.click();return}
    const tile=[...library.querySelectorAll(".pattern-tile")].find(el=>hit(el,x,y));
    if(tile){e.preventDefault();const kind=tile.dataset.kind;if(kind==="base"){window.SetkaApp?.openConfig?.(window.SetkaApp.DEFAULT_CONFIG,{type:"base",id:tile.dataset.itemId||"tentacle-orbit",communityId:null});return}try{tile.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,cancelable:true,pointerId:777,clientX:x,clientY:y}))}catch(_){tile.click()}return}
    const gameButtons=["libraryButton","favoriteButton","prevButton","nextButton","colorButton","instructionsButton","visibilityButton"];
    for(const id of gameButtons){const b=document.getElementById(id);if(hit(b,x,y)){e.preventDefault();b.click();return}}
  },{capture:true,passive:false});

  function sync(){app.style.visibility="visible";app.style.pointerEvents="auto";nav.classList.toggle("hidden",game.classList.contains("active"));}
  new MutationObserver(sync).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:["class","style"]});
  setInterval(sync,1000);sync();
  window.SetkaOwnerShellV32={today,patterns,symptoms,me,sync};
})();