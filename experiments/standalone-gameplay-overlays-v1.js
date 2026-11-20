(() => {
  "use strict";
  // Scoped to experimental SETKA + lotus page: keep all native save/snapshot
  // handlers intact, change ONLY gameplay overlay presentation/toggling.
  const game=document.getElementById("gameScreen");
  const ui=game?.querySelector(".game-ui");
  const note=document.getElementById("st34Note");
  const key=document.getElementById("instructionsButton");
  const layer=document.getElementById("st34Layer");
  const nav=document.getElementById("st34Nav");
  const keySheet=document.getElementById("st34KeySheet");
  const C=window.SetkaStandaloneV34;
  if(!game||!ui||!note||!key||!layer||!nav||!keySheet||!C)return;
  const originalParent=layer.parentElement;
  const gameActive=()=>game.classList.contains("active");
  const layerOpen=()=>!layer.classList.contains("hidden");
  const noteComposerOpen=()=>layerOpen()&&layer.querySelector(".st-title")?.textContent?.trim()==="Записать мысль";
  const settingsOpen=()=>keySheet.classList.contains("open");
  let syncing=false;
  let queued=false;
  let saveReopenScheduled=false;

  // The two ORIGINAL action buttons keep all original click listeners.
  const actions=keySheet.querySelector(".sk-actions");
  const header=keySheet.querySelector(".sk-head .sk-row");
  if(actions&&header&&actions.parentElement!==header)header.appendChild(actions);

  function sync(){
    if(syncing)return;
    syncing=true;
    try{
      const open=gameActive()&&noteComposerOpen();
      document.body.classList.toggle("setka-game-note-open",open);
      document.body.classList.toggle("setka-game-settings-open",gameActive()&&settingsOpen());
      note.setAttribute("aria-expanded",String(open));
      // Reparent only while the native note composer is open. The sheet
      // controller's original element, form, save handler and draft all survive.
      if(open&&layer.parentElement!==ui)ui.appendChild(layer);
      if(!open&&layer.parentElement===ui)originalParent.appendChild(layer);
    }finally{syncing=false}
  }
  function queueSync(){
    if(queued)return;
    queued=true;
    queueMicrotask(()=>{queued=false;sync()});
  }
  function prepareNote(){
    if(!gameActive())return;
    document.body.classList.add("setka-game-note-open");
    if(layer.parentElement!==ui)ui.appendChild(layer);
  }

  // Capture runs before the legacy note's click handler, but NEVER replaces
  // the native composer or its pattern-state snapshot logic.
  window.addEventListener("click",event=>{
    if(!gameActive())return;
    const plus=event.target?.closest?.("#st34Note");
    if(plus){
      if(settingsOpen())window.SetkaPatternKeyV1?.close?.();
      if(noteComposerOpen()){
        event.preventDefault();
        event.stopImmediatePropagation();
        C.hideLayer(); // existing sheet controller retains unsaved draft
        sync();
        return;
      }
      prepareNote();
      queueSync(); // original note handler / saved-draft interception runs next
      return;
    }
    if(event.target?.closest?.("#instructionsButton")&&noteComposerOpen()){
      C.hideLayer();
      sync();
      // Original key toggle runs next; all gameplay buttons remain available.
    }
  },true);

  // Native note-save code closes its generic sheet. Reopen a fresh empty
  // composer with a "saved" acknowledgement so the + button, not a dock tab,
  // is still the user's explicit way to fold it away.
  window.addEventListener("setka:standalone-event",event=>{
    const e=event.detail;
    if(e?.type!=="note_create"||!gameActive()||!noteComposerOpen())return;
    if(e.payload?.state?.view!=="game")return;
    if(saveReopenScheduled)return;
    saveReopenScheduled=true;
    setTimeout(()=>{
      saveReopenScheduled=false;
      if(!gameActive()||!layer.classList.contains("hidden"))return;
      prepareNote();
      // Use original onclick (wrapped by the existing visual snapshot saver).
      if(typeof note.onclick==="function")note.onclick();
      const body=layer.querySelector("#stBody");
      if(body){
        const status=document.createElement("p");
        status.className="st-muted";
        status.setAttribute("role","status");
        status.textContent="Заметка сохранена ✓";
        status.style.cssText="color:#c9c9c9;font-size:11px;margin:2px 0 8px";
        body.prepend(status);
      }
      sync();
    },0);
  });

  new MutationObserver(queueSync).observe(layer,{attributes:true,attributeFilter:["class"]});
  new MutationObserver(queueSync).observe(keySheet,{attributes:true,attributeFilter:["class"]});
  new MutationObserver(queueSync).observe(game,{attributes:true,attributeFilter:["class"]});
  window.addEventListener("setka:view",queueSync);
  window.addEventListener("setka:sheet-presentation",queueSync);
  window.addEventListener("pagehide",()=>{
    document.body.classList.remove("setka-game-note-open","setka-game-settings-open");
  });
  sync();
  window.SETKA_GAMEPLAY_OVERLAYS_LAB={
    status:()=>({note:gameActive()&&noteComposerOpen(),settings:gameActive()&&settingsOpen(),game:gameActive(),layerInGame:layer.parentElement===ui}),
    closeNote:()=>{if(gameActive()&&noteComposerOpen())C.hideLayer();sync()}
  };
})();