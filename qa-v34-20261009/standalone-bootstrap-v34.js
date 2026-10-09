(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;

  // v38: community is cloud-backed only. Remove legacy local clones of favorites.
  try{
    const d=C.getData?.();
    if(d&&Array.isArray(d.localCommunity)&&d.localCommunity.length){d.localCommunity=[];C.save?.()}
    localStorage.setItem("setka-standalone:v38-real-community","1");
  }catch(_){}

  // Put the note control into the same bottom control row as the working key button.
  function placeNoteButton(){
    const note=document.getElementById("st34Note"),key=document.getElementById("instructionsButton"),controls=key?.closest?.(".bottom-controls");
    if(!note||!key||!controls)return false;
    if(note.parentElement!==controls||note.previousElementSibling!==key)key.insertAdjacentElement("afterend",note);
    note.classList.add("round-control");
    note.setAttribute("aria-label","Добавить заметку");
    note.style.touchAction="manipulation";
    if(!note.dataset.touchFixed){
      note.dataset.touchFixed="1";
      note.addEventListener("pointerdown",e=>e.stopPropagation());
      note.addEventListener("pointerup",e=>e.stopPropagation());
      note.addEventListener("touchstart",e=>e.stopPropagation(),{passive:true});
      note.addEventListener("touchend",e=>e.stopPropagation(),{passive:true});
    }
    return true;
  }
  const noteStyle=document.createElement("style");
  noteStyle.textContent=`
    #st34Note{position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;inset:auto!important;z-index:2!important;width:46px!important;height:46px!important;min-width:46px!important;min-height:46px!important;flex:0 0 46px!important;border:1px solid rgba(255,255,255,.46)!important;border-radius:50%!important;background:transparent!important;color:#fff!important;font-size:27px!important;font-weight:300!important;line-height:1!important;padding:0!important;align-items:center!important;justify-content:center!important;-webkit-tap-highlight-color:transparent!important}
    #st34Note.show{display:grid!important}
    #st34Note:active{background:rgba(255,255,255,.13)!important;transform:scale(.94)}
  `;
  document.head.appendChild(noteStyle);
  placeNoteButton();
  setTimeout(placeNoteButton,120);
  setTimeout(placeNoteButton,700);
})();