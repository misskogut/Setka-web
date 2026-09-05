(() => {
  "use strict";

  const BASE = "https://gfchgaphzhxufwdhrcis.supabase.co/rest/v1/rpc/";
  const API_KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const POLL_MS = 20000;
  let lastHub = null;

  const rpc = async (name, body = {}) => {
    const r = await fetch(BASE + name, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: API_KEY,
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify(body),
      cache: "no-store"
    });
    if (!r.ok) throw new Error(`${name}_${r.status}`);
    return r.json();
  };

  function esc(v){
    return String(v ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]);
  }

  function ensureStyles(){
    if(document.getElementById("setka-board-style")) return;
    const s = document.createElement("style");
    s.id = "setka-board-style";
    s.textContent = `
      #setkaBoardButton{display:flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:8px 11px;background:rgba(255,255,255,.055);color:#fff;cursor:pointer;user-select:none;transition:.18s ease;white-space:nowrap}
      #setkaBoardButton:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.28)}
      #setkaBoardButton .board-orb{width:29px;height:29px;border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.2)}
      #setkaBoardButton .board-title{font-size:12px;font-weight:800}
      #setkaBoardButton .board-sub{font-size:10px;opacity:.58;margin-top:2px}
      #setkaBoardButton .board-dot{width:7px;height:7px;border-radius:50%;background:currentColor;opacity:.25}
      #setkaBoardButton.has-action .board-dot{opacity:1;box-shadow:0 0 12px currentColor}
      #setkaBoardPanel{position:fixed;right:18px;top:72px;z-index:100001;width:min(430px,calc(100vw - 24px));max-height:calc(100vh - 90px);display:flex;flex-direction:column;border:1px solid rgba(255,255,255,.18);border-radius:20px;background:rgba(7,7,10,.97);backdrop-filter:blur(18px);box-shadow:0 22px 70px rgba(0,0,0,.55);color:#fff;font-family:inherit;overflow:hidden}
      #setkaBoardPanel.hidden{display:none}
      #setkaBoardPanel .board-head{padding:15px 15px 11px;border-bottom:1px solid rgba(255,255,255,.1)}
      #setkaBoardPanel .board-headline{display:flex;align-items:center;gap:9px}
      #setkaBoardPanel .board-name{font-size:15px;font-weight:850;flex:1}
      #setkaBoardPanel .board-close{border:0;background:transparent;color:#fff;opacity:.6;font-size:20px;cursor:pointer}
      #setkaBoardPanel .board-note{font-size:10px;line-height:1.35;opacity:.48;margin-top:5px}
      #setkaBoardPanel .board-counters{display:flex;gap:7px;margin-top:10px;flex-wrap:wrap}
      #setkaBoardPanel .board-pill{font-size:10px;padding:5px 8px;border:1px solid rgba(255,255,255,.13);border-radius:999px;background:rgba(255,255,255,.05)}
      #setkaBoardPanel .board-quick{display:flex;gap:6px;padding:10px 12px 4px;overflow-x:auto}
      #setkaBoardPanel .board-quick button{flex:0 0 auto;border:1px solid rgba(255,255,255,.13);border-radius:10px;background:rgba(255,255,255,.05);color:#fff;padding:7px 9px;font:inherit;font-size:10px;cursor:pointer}
      #setkaBoardPanel .board-answer{margin:8px 12px 4px;padding:10px 11px;border-radius:12px;background:rgba(255,255,255,.07);font-size:11px;line-height:1.45;display:none}
      #setkaBoardPanel .board-answer.show{display:block}
      #setkaBoardPanel .board-list{padding:8px 12px 10px;overflow:auto;min-height:120px}
      #setkaBoardPanel .board-event{padding:10px 10px 9px;margin-bottom:7px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(255,255,255,.035)}
      #setkaBoardPanel .board-event.action{border-color:rgba(255,255,255,.24);background:rgba(255,255,255,.07)}
      #setkaBoardPanel .board-meta{display:flex;align-items:center;gap:6px;font-size:9px;letter-spacing:.04em;text-transform:uppercase;opacity:.48;margin-bottom:5px}
      #setkaBoardPanel .board-event-text{font-size:11px;line-height:1.42}
      #setkaBoardPanel .board-doc{font-size:9px;opacity:.55;margin-top:6px}
      #setkaBoardPanel .board-chat{display:flex;gap:7px;padding:10px 12px 12px;border-top:1px solid rgba(255,255,255,.1)}
      #setkaBoardPanel .board-chat input{min-width:0;flex:1;border:1px solid rgba(255,255,255,.14);border-radius:11px;background:rgba(255,255,255,.055);color:#fff;padding:9px 10px;font:inherit;font-size:11px;outline:none}
      #setkaBoardPanel .board-chat button{border:1px solid rgba(255,255,255,.16);border-radius:11px;background:rgba(255,255,255,.09);color:#fff;padding:8px 11px;font:inherit;font-size:11px;cursor:pointer}
      #setkaBoardPanel .board-empty{padding:18px 5px;text-align:center;font-size:11px;opacity:.5}
      @media(max-width:900px){#setkaBoardButton .board-sub{display:none}#setkaBoardPanel{right:12px;top:64px;width:calc(100vw - 24px);max-height:calc(100vh - 78px)}}
    `;
    document.head.appendChild(s);
  }

  const cat = x => ({REPORT:"Рапорт",ACHIEVEMENT:"Ачивка",EXPERIMENT:"Эксперимент",SYSTEM_CHANGE:"Система",COMMAND:"Команда"}[x] || String(x || "Событие").replaceAll("_"," "));
  const fmtTime = x => { try { return new Date(x).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}); } catch { return ""; } };

  function ensureUi(){
    ensureStyles();
    let button = document.getElementById("setkaBoardButton");
    if(!button){
      button = document.createElement("div");
      button.id = "setkaBoardButton";
      button.setAttribute("role","button");
      button.setAttribute("tabindex","0");
      button.innerHTML = `<div class="board-orb">🛰️</div><div><div class="board-title">Бортовой · —</div><div class="board-sub">HUMAN_RU · VERSTAK</div></div><span class="board-dot"></span>`;
      const top = document.querySelector(".top");
      const spacer = top?.querySelector(".spacer");
      if(top) top.insertBefore(button, spacer || null); else document.body.appendChild(button);
    }
    let panel = document.getElementById("setkaBoardPanel");
    if(!panel){
      panel = document.createElement("div");
      panel.id = "setkaBoardPanel";
      panel.className = "hidden";
      panel.innerHTML = `
        <div class="board-head">
          <div class="board-headline"><span>🛰️</span><div class="board-name">Бортовой компьютер · VERSTAK</div><button class="board-close" aria-label="Закрыть">×</button></div>
          <div class="board-note">Единая лента важных событий. Эта публичная поверхность — только чтение; управляющие команды во внутреннем контуре проходят Command Bus и проверку полномочий.</div>
          <div class="board-counters"><span class="board-pill" data-count="new">Новые · —</span><span class="board-pill" data-count="action">Требует решения · —</span><span class="board-pill">Язык · HUMAN_RU</span></div>
        </div>
        <div class="board-quick">
          <button data-q="Что нового?">Что нового</button><button data-q="Что требует решения?">Требует решения</button><button data-q="Покажи последние рапорты">Рапорты</button><button data-q="Какие новые ачивки?">Ачивки</button><button data-q="Какие документы готовы?">Документы</button>
        </div>
        <div class="board-answer"></div>
        <div class="board-list"><div class="board-empty">Загрузка событий…</div></div>
        <form class="board-chat"><input maxlength="500" placeholder="Спроси: что нового, какие рапорты…" autocomplete="off"><button type="submit">Спросить</button></form>
      `;
      document.body.appendChild(panel);
      panel.querySelector(".board-close").addEventListener("click",()=>panel.classList.add("hidden"));
      panel.querySelectorAll("[data-q]").forEach(b=>b.addEventListener("click",()=>ask(b.dataset.q)));
      panel.querySelector(".board-chat").addEventListener("submit",e=>{
        e.preventDefault();
        const input = panel.querySelector(".board-chat input");
        const q = input.value.trim();
        if(q){ ask(q); input.value=""; }
      });
    }
    const toggle = () => {
      panel.classList.toggle("hidden");
      const agi = document.getElementById("setkaAgiPanel");
      if(!panel.classList.contains("hidden") && agi) agi.classList.add("hidden");
    };
    if(!button.dataset.bound){
      button.dataset.bound="1";
      button.addEventListener("click",toggle);
      button.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();toggle();}});
    }
    return {button,panel};
  }

  function renderHub(data){
    lastHub = data;
    const {button,panel} = ensureUi();
    const newCount = Number(data?.newCount || 0);
    const actionCount = Number(data?.requiresActionCount || 0);
    button.querySelector(".board-title").textContent = `Бортовой · ${newCount + actionCount}`;
    button.classList.toggle("has-action", actionCount > 0);
    panel.querySelector('[data-count="new"]').textContent = `Новые · ${newCount}`;
    panel.querySelector('[data-count="action"]').textContent = `Требует решения · ${actionCount}`;
    const events = Array.isArray(data?.events) ? data.events : [];
    const list = panel.querySelector(".board-list");
    if(!events.length){ list.innerHTML = `<div class="board-empty">Важных событий пока нет.</div>`; return; }
    list.innerHTML = events.map(e => `
      <div class="board-event ${e.requiresAction ? "action" : ""}">
        <div class="board-meta"><span>${esc(cat(e.category))}</span><span>·</span><span>${esc(e.state)}</span><span>·</span><span>${esc(fmtTime(e.occurredAt))}</span>${e.requiresAction?`<span>· НУЖНО РЕШЕНИЕ</span>`:""}</div>
        <div class="board-event-text">${esc(e.summary)}</div>
        ${e.hasDocument ? `<div class="board-doc">📎 Канонический документ готов во внутреннем контуре</div>` : ""}
      </div>`).join("");
  }

  async function load(){
    try{
      renderHub(await rpc("get_verstak_onboard_hub_v1",{p_limit:14}));
    }catch(err){
      const {button,panel}=ensureUi();
      button.querySelector(".board-title").textContent="Бортовой · нет связи";
      panel.querySelector(".board-list").innerHTML=`<div class="board-empty">Данные Бортового компьютера временно недоступны.</div>`;
      button.title=String(err?.message||err);
    }
  }

  async function ask(text){
    const {panel}=ensureUi();
    const a=panel.querySelector(".board-answer");
    a.classList.add("show");
    a.textContent="Бортовой компьютер читает каноническую ленту…";
    try{
      const data=await rpc("ask_verstak_onboard_v1",{p_message:text});
      a.textContent=data?.response || "Ответ не сформирован.";
    }catch(err){
      a.textContent="Не удалось получить ответ: "+String(err?.message||err);
    }
  }

  window.addEventListener("DOMContentLoaded",()=>{
    ensureUi();
    load();
    setInterval(load,POLL_MS);
  });
})();