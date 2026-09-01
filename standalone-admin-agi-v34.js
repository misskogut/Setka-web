(() => {
  "use strict";

  const RPC = "https://gfchgaphzhxufwdhrcis.supabase.co/rest/v1/rpc/get_setka_agi_progress_v1";
  const API_KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const POLL_MS = 15000;

  function ensureStyles(){
    if(document.getElementById("setka-agi-meter-style")) return;
    const style = document.createElement("style");
    style.id = "setka-agi-meter-style";
    style.textContent = `
      #setkaAgiMeter{display:flex;align-items:center;gap:9px;border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:8px 11px;background:rgba(255,255,255,.055);color:#fff;cursor:pointer;min-width:184px;user-select:none;transition:.18s ease}
      #setkaAgiMeter:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.28)}
      #setkaAgiMeter .agi-orb{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(255,255,255,.2);font-size:16px;background:rgba(0,0,0,.28)}
      #setkaAgiMeter .agi-main{font-size:12px;font-weight:700;letter-spacing:.02em;white-space:nowrap}
      #setkaAgiMeter .agi-sub{font-size:10px;opacity:.58;margin-top:2px;white-space:nowrap}
      #setkaAgiMeter .agi-bar{height:3px;width:100%;background:rgba(255,255,255,.11);border-radius:999px;margin-top:5px;overflow:hidden}
      #setkaAgiMeter .agi-fill{height:100%;background:currentColor;border-radius:999px;opacity:.78}
      #setkaAgiPanel{position:fixed;right:18px;top:72px;z-index:99999;width:min(360px,calc(100vw - 36px));border:1px solid rgba(255,255,255,.18);border-radius:18px;padding:15px;background:rgba(8,8,10,.96);backdrop-filter:blur(18px);box-shadow:0 18px 55px rgba(0,0,0,.45);color:#fff;font-family:inherit}
      #setkaAgiPanel.hidden{display:none}
      #setkaAgiPanel .agi-title{font-size:15px;font-weight:800;margin-bottom:4px}
      #setkaAgiPanel .agi-note{font-size:11px;opacity:.58;line-height:1.35;margin-bottom:12px}
      #setkaAgiPanel .agi-score{font-size:34px;font-weight:800;letter-spacing:-.04em}
      #setkaAgiPanel .agi-level{font-size:12px;opacity:.7;margin-bottom:12px}
      #setkaAgiPanel .agi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:10px 0 13px}
      #setkaAgiPanel .agi-cell{padding:9px;border-radius:11px;background:rgba(255,255,255,.055);font-size:11px}
      #setkaAgiPanel .agi-cell b{display:block;font-size:16px;margin-bottom:2px}
      #setkaAgiPanel .agi-section{font-size:10px;text-transform:uppercase;letter-spacing:.09em;opacity:.48;margin-top:11px;margin-bottom:5px}
      #setkaAgiPanel .agi-list{font-size:11px;line-height:1.45;opacity:.82;overflow-wrap:anywhere}
      @media(max-width:900px){#setkaAgiMeter{min-width:0;padding:7px 9px}#setkaAgiMeter .agi-sub{display:none}}
    `;
    document.head.appendChild(style);
  }

  function ensureUi(){
    ensureStyles();
    let meter = document.getElementById("setkaAgiMeter");
    if(!meter){
      meter = document.createElement("div");
      meter.id = "setkaAgiMeter";
      meter.setAttribute("role","button");
      meter.setAttribute("tabindex","0");
      meter.innerHTML = `<div class="agi-orb">🧠</div><div style="min-width:0;flex:1"><div class="agi-main">К миссии AGI · —</div><div class="agi-sub">доказательный индекс</div><div class="agi-bar"><div class="agi-fill" style="width:0%"></div></div></div>`;
      const top = document.querySelector(".top");
      const spacer = top?.querySelector(".spacer");
      if(top) top.insertBefore(meter,spacer || null);
      else document.body.appendChild(meter);
    }
    let panel = document.getElementById("setkaAgiPanel");
    if(!panel){
      panel = document.createElement("div");
      panel.id = "setkaAgiPanel";
      panel.className = "hidden";
      document.body.appendChild(panel);
      const toggle = () => panel.classList.toggle("hidden");
      meter.addEventListener("click",toggle);
      meter.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();toggle();}});
      document.addEventListener("click",e=>{if(!panel.contains(e.target)&&!meter.contains(e.target)) panel.classList.add("hidden");});
    }
    return {meter,panel};
  }

  function fmtDimension(x){
    return String(x||"").replace(/^AGI_/,"").replaceAll("_"," · ");
  }

  function render(data){
    const {meter,panel} = ensureUi();
    const pct = Number(data?.progressPct || 0);
    const level = data?.claimLevel || "—";
    meter.querySelector(".agi-main").textContent = `К миссии AGI · ${pct.toFixed(1)}% · ${level}`;
    meter.querySelector(".agi-fill").style.width = `${Math.max(0,Math.min(100,pct))}%`;
    meter.title = data?.claimLabelRu || "AGI progress";

    const open = Array.isArray(data?.topOpenDimensions) ? data.topOpenDimensions : [];
    const next = data?.nextExperiment || null;
    const trend = Number(data?.trendDelta || 0);
    panel.innerHTML = `
      <div class="agi-title">🧠🚀 Прогресс к AGI · SETKA</div>
      <div class="agi-note">Внутренний доказательный индекс исследовательской миссии. Это не «процент AGI».</div>
      <div class="agi-score">${pct.toFixed(2)}%</div>
      <div class="agi-level">${data?.claimLabelRu || level}${trend ? ` · Δ ${trend>0?"+":""}${trend.toFixed(2)}` : ""}</div>
      <div class="agi-grid">
        <div class="agi-cell"><b>${Number(data?.positive||0)}</b>POSITIVE</div>
        <div class="agi-cell"><b>${Number(data?.watch||0)}</b>WATCH</div>
        <div class="agi-cell"><b>${Number(data?.unknown||0)}</b>UNKNOWN</div>
      </div>
      <div class="agi-section">Следующий наиболее информативный тест</div>
      <div class="agi-list">${next ? `${next.experimentRef}<br><span style="opacity:.58">${fmtDimension(next.dimension)} · priority ${Number(next.priorityScore||0).toFixed(2)}</span>` : "Нет готового кандидата"}</div>
      <div class="agi-section">Главные открытые координаты</div>
      <div class="agi-list">${open.length ? open.map(fmtDimension).join("<br>") : "—"}</div>
    `;
  }

  async function load(){
    try{
      const r = await fetch(RPC,{
        method:"POST",
        headers:{"Content-Type":"application/json","apikey":API_KEY,"Authorization":`Bearer ${API_KEY}`},
        body:"{}",
        cache:"no-store"
      });
      if(!r.ok) throw new Error(`agi_progress_${r.status}`);
      render(await r.json());
    }catch(err){
      const {meter} = ensureUi();
      meter.querySelector(".agi-main").textContent = "К миссии AGI · данные недоступны";
      meter.title = String(err?.message || err);
    }
  }

  window.addEventListener("DOMContentLoaded",()=>{ensureUi();load();setInterval(load,POLL_MS);});
})();
