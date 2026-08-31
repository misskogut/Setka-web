(() => {
  "use strict";

  const detail=document.getElementById("detail");
  const participantsPage=document.getElementById("tab-participants");
  if(!detail||!participantsPage)return;

  const originalParent=detail.parentNode;
  const anchor=document.createComment("setka-participant-detail-anchor-v34.10");
  originalParent.insertBefore(anchor,detail);

  const style=document.createElement("style");
  style.textContent=`
    .v3410-participant-modal{position:fixed;inset:0;z-index:300000;background:rgba(0,0,0,.82);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;opacity:1;transition:opacity .16s ease}
    .v3410-participant-modal.hidden{display:none!important}
    .v3410-participant-window{position:relative;width:min(1180px,100%);height:min(900px,calc(100vh - 40px));background:#050505;border:1px solid rgba(255,255,255,.18);border-radius:24px;box-shadow:0 30px 100px rgba(0,0,0,.7);overflow:hidden;display:flex;flex-direction:column}
    .v3410-participant-head{height:58px;min-height:58px;display:flex;align-items:center;padding:0 12px 0 20px;border-bottom:1px solid rgba(255,255,255,.1);background:rgba(5,5,5,.96);position:relative;z-index:2}
    .v3410-participant-head b{font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:rgba(255,255,255,.58)}
    .v3410-participant-close{margin-left:auto;width:40px;height:40px;border:1px solid rgba(255,255,255,.2);border-radius:50%;background:transparent;color:#fff;font-size:27px;line-height:34px;font-weight:200;display:grid;place-items:center;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
    .v3410-participant-close:hover{background:rgba(255,255,255,.08)}
    .v3410-participant-close:active{transform:scale(.95)}
    .v3410-participant-scroll{flex:1;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;padding:18px 20px 28px}
    .v3410-participant-scroll>#detail{margin-top:0!important;display:block;width:100%;box-sizing:border-box}
    body.v3410-modal-open{overflow:hidden!important}
    @media(max-width:760px){
      .v3410-participant-modal{padding:0;align-items:stretch}
      .v3410-participant-window{width:100%;height:100%;max-height:none;border:0;border-radius:0}
      .v3410-participant-head{padding-left:16px;padding-top:env(safe-area-inset-top,0px);height:calc(56px + env(safe-area-inset-top,0px));min-height:calc(56px + env(safe-area-inset-top,0px))}
      .v3410-participant-scroll{padding:14px 12px calc(24px + env(safe-area-inset-bottom,0px))}
      .v3410-participant-scroll>#detail .split{grid-template-columns:1fr!important}
    }
  `;
  document.head.appendChild(style);

  const modal=document.createElement("div");
  modal.id="participantModalV3410";
  modal.className="v3410-participant-modal hidden";
  modal.setAttribute("role","dialog");
  modal.setAttribute("aria-modal","true");
  modal.setAttribute("aria-label","Карточка участника");
  modal.innerHTML=`<div class="v3410-participant-window"><div class="v3410-participant-head"><b>Карточка участника</b><button class="v3410-participant-close" type="button" aria-label="Закрыть">×</button></div><div class="v3410-participant-scroll"></div></div>`;
  document.body.appendChild(modal);
  const scroll=modal.querySelector(".v3410-participant-scroll");
  const closeBtn=modal.querySelector(".v3410-participant-close");

  let opened=false,restoreY=0,moving=false;
  const participantsActive=()=>!participantsPage.classList.contains("hidden")&&document.querySelector('.tab[data-tab="participants"]')?.classList.contains("active");

  function openModal(){
    if(opened||detail.classList.contains("hidden")||!participantsActive())return;
    opened=true;moving=true;restoreY=window.scrollY||0;
    scroll.scrollTop=0;
    scroll.appendChild(detail);
    detail.classList.remove("hidden");
    modal.classList.remove("hidden");
    document.body.classList.add("v3410-modal-open");
    moving=false;
    requestAnimationFrame(()=>closeBtn.focus({preventScroll:true}));
  }

  function closeModal(){
    if(!opened)return;
    opened=false;moving=true;
    detail.classList.add("hidden");
    originalParent.insertBefore(detail,anchor.nextSibling);
    modal.classList.add("hidden");
    document.body.classList.remove("v3410-modal-open");
    moving=false;
    requestAnimationFrame(()=>window.scrollTo({top:restoreY,left:0,behavior:"auto"}));
  }

  closeBtn.addEventListener("click",closeModal);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&opened){e.preventDefault();closeModal()}});

  // The existing admin renders participant detail into #detail at the bottom of the page.
  // Move that exact node into the modal only while the Participants tab is active, so all
  // existing session, symptom, notes and activity modules keep working unchanged.
  new MutationObserver(()=>{
    if(moving)return;
    if(opened&&detail.classList.contains("hidden")){closeModal();return}
    if(!opened&&!detail.classList.contains("hidden")&&participantsActive())openModal();
  }).observe(detail,{attributes:true,attributeFilter:["class"],childList:true,subtree:false});

  document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{
    if(opened&&tab.dataset.tab!=="participants")closeModal();
  }));

  // Capture participant-card clicks so the loading state opens immediately rather than
  // making the administrator wait for the participant API call at the bottom of the page.
  participantsPage.addEventListener("click",e=>{
    if(!e.target.closest?.(".participant"))return;
    setTimeout(openModal,0);
  },true);

  window.SetkaParticipantModalV3410={open:openModal,close:closeModal,get opened(){return opened}};
})();
