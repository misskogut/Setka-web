(() => {
  "use strict";

  const BASE = "https://gfchgaphzhxufwdhrcis.supabase.co/rest/v1/rpc/";
  const API_KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const POLL_MS = 20000;

  async function rpc(name, body = {}){
    const r = await fetch(BASE + name, {
      method:"POST",
      headers:{"Content-Type":"application/json",apikey:API_KEY,Authorization:`Bearer ${API_KEY}`},
      body:JSON.stringify(body),
      cache:"no-store"
    });
    if(!r.ok) throw new Error(`${name}_${r.status}`);
    return r.json();
  }

  function ensureStyle(){
    if(document.getElementById("setka-board-quick-style")) return;
    const s=document.createElement("style");
    s.id="setka-board-quick-style";
    s.textContent=`
      #setkaBoardPanel .board-quick-title{padding:9px 12px 0;font-size:9px;text-transform:uppercase;letter-spacing:.09em;opacity:.42}
      #setkaBoardPanel .board-quick button[data-priority="top"]{background:rgba(255,255,255,.11);border-color:rgba(255,255,255,.24)}
      #setkaBoardPanel .board-quick button .qa-reason{display:block;font-size:8px;opacity:.5;margin-top:2px;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    `;
    document.head.appendChild(s);
  }

  function submitPrompt(prompt){
    const panel=document.getElementById("setkaBoardPanel");
    const form=panel?.querySelector(".board-chat");
    const input=form?.querySelector("input");
    if(!form || !input) return;
    input.value=prompt;
    form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
  }

  function render(actions){
    const panel=document.getElementById("setkaBoardPanel");
    const wrap=panel?.querySelector(".board-quick");
    if(!panel || !wrap) return false;
    ensureStyle();
    let title=panel.querySelector(".board-quick-title");
    if(!title){
      title=document.createElement("div");
      title.className="board-quick-title";
      title.textContent="Бортовой предлагает сейчас";
      wrap.parentNode.insertBefore(title,wrap);
    }
    wrap.replaceChildren();
    (Array.isArray(actions)?actions:[]).forEach((a,i)=>{
      const b=document.createElement("button");
      b.type="button";
      b.dataset.priority=i===0?"top":"normal";
      b.title=a.reasonRu || a.prompt || "";
      const label=document.createElement("span");
      label.textContent=a.label || a.prompt || "Команда";
      b.appendChild(label);
      if(a.reasonRu){
        const reason=document.createElement("span");
        reason.className="qa-reason";
        reason.textContent=a.reasonRu;
        b.appendChild(reason);
      }
      b.addEventListener("click",()=>submitPrompt(a.prompt || a.label || ""));
      wrap.appendChild(b);
    });
    return true;
  }

  async function load(){
    try{
      const data=await rpc("get_verstak_onboard_quick_actions_v1",{p_limit:5});
      render(data?.actions || []);
    }catch(err){
      console.warn("SETKA onboard quick actions unavailable",err);
    }
  }

  function bootWhenReady(attempt=0){
    if(document.getElementById("setkaBoardPanel")){
      load();
      setInterval(load,POLL_MS);
      return;
    }
    if(attempt<50) setTimeout(()=>bootWhenReady(attempt+1),200);
  }

  if(document.readyState==="loading") window.addEventListener("DOMContentLoaded",()=>bootWhenReady());
  else bootWhenReady();
})();
