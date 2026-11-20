/* Experimental SETKA cycle shell: one-step return to the actual
   originating Today card, rather than closing the panel or guessing "Me".
   This is presentation-only; it never modifies check-ins or stored data. */
(()=>{
  "use strict";
  const C=window.SetkaStandaloneV34;
  const layer=document.getElementById("st34Layer");
  const wrap=layer?.querySelector(".st-wrap");
  if(!C||!layer||!wrap||window.__SETKA_TODAY_RETURN_V1__)return;

  const destinations=new Map([
    ["Отметить состояние",new Set(["Симптомы","Состояния"])],
    ["Мои наблюдения",new Set(["Мои наблюдения"])]
  ]);
  let origin=null,patchedButton=null,originalBack=null;
  const currentTitle=()=>wrap.querySelector(".st-title")?.textContent?.trim()||"";
  const visible=()=>!layer.classList.contains("hidden");
  function restoreOriginal(){
    if(patchedButton&&originalBack&&patchedButton.isConnected){
      patchedButton.onclick=originalBack;
    }
    patchedButton=null;originalBack=null;
  }
  function clear(){
    restoreOriginal();
    origin=null;
  }
  function updateBack(){
    if(!origin||!visible())return;
    const title=currentTitle();
    if(title==="Сегодня")return;
    if(!origin.targets.has(title)){clear();return}
    const button=wrap.querySelector(".st-back");
    if(!button)return;
    if(button===patchedButton)return;
    restoreOriginal();
    patchedButton=button;
    originalBack=button.onclick;
    button.onclick=event=>{
      event?.preventDefault?.();
      clear();
      C.showToday();
    };
  }
  // Only these two action buttons, when pressed INSIDE Today, create a
  // contextual history step. Dock navigation does not create such a step.
  window.addEventListener("click",event=>{
    if(!visible()||currentTitle()!=="Сегодня")return;
    const action=event.target?.closest?.("#st34Layer .st-action");
    const label=action?.querySelector("b")?.textContent?.trim();
    const targets=destinations.get(label);
    if(targets){clear();origin={targets};}
  },true);
  // The native Symptoms screen redraws itself after changing time filters
  // or saving a check-in. Keep the same Back destination on every redraw.
  new MutationObserver(updateBack).observe(wrap,{subtree:true,childList:true});
  // The bottom dock is a new root navigation choice. Do not let it inherit
  // the previous contextual return path.
  document.addEventListener("pointerdown",event=>{
    if(event.target?.closest?.("#st34Nav button[data-p]"))clear();
  },true);
  document.addEventListener("keydown",event=>{
    if((event.key==="Enter"||event.key===" ")&&event.target?.closest?.("#st34Nav button[data-p]"))clear();
  },true);
  window.addEventListener("setka:sheet-presentation",event=>{
    if(event.detail?.open===false)clear();
  });
  window.addEventListener("setka:view",event=>{
    if(event.detail?.view==="game")clear();
  });
  window.__SETKA_TODAY_RETURN_V1__={
    status:()=>({origin:origin?[...origin.targets]:null,title:currentTitle(),patched:!!patchedButton})
  };
})();
