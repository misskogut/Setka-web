(() => {
  "use strict";
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-tester-identity-v37";
  const API_KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const ADMIN_KEY="setka-research:admin-key:v1";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  const dt=v=>{try{return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(v))}catch(_){return"—"}};

  async function api(action,extra={}){
    const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify({action,adminKey:localStorage.getItem(ADMIN_KEY)||"",...extra})});
    const out=await r.json().catch(()=>({}));if(!r.ok)throw new Error(out.error||`http_${r.status}`);return out;
  }

  async function copy(text){try{await navigator.clipboard.writeText(text);return true}catch(_){return false}}

  function modal(items){
    const wrap=document.createElement("div");
    wrap.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.86);display:grid;place-items:center;padding:18px";
    const card=document.createElement("div");card.className="card";card.style.cssText="width:min(720px,100%);max-height:85vh;overflow:auto;padding:20px";
    card.innerHTML=`<div class="rowtop"><div><div class="section-title">Новые ID тестировщиков</div><div class="small muted">Каждый код одноразовый. Тестировщик вводит его на том же телефоне/браузере, где уже пользовался SETKA.</div></div><button class="btn" data-close>Закрыть</button></div><div data-list style="margin-top:14px"></div>`;
    const list=card.querySelector("[data-list]");
    for(const x of items){
      const row=document.createElement("div");row.className="card";row.style.cssText="margin:8px 0;padding:12px";
      row.innerHTML=`<div class="rowtop"><div><b>${esc(x.testerId)}</b><div class="small muted" style="margin-top:4px">${esc(x.code)}</div></div><button class="btn" data-copy>Копировать код</button></div>`;
      row.querySelector("[data-copy]").onclick=async e=>{await copy(x.code);e.currentTarget.textContent="Скопировано ✓"};list.appendChild(row);
    }
    wrap.appendChild(card);document.body.appendChild(wrap);wrap.onclick=e=>{if(e.target===wrap||e.target.closest?.("[data-close]"))wrap.remove()};
  }

  async function generate(){
    const countRaw=prompt("Сколько ID создать?", "1");if(countRaw==null)return;
    const count=Math.min(50,Math.max(1,Math.round(Number(countRaw)||1)));
    const btn=$("createCodeBtn");const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent="Создаю…"}
    try{const out=await api("admin-generate",{count});modal(out.items||[]);await render();}
    catch(e){alert("Не удалось создать ID тестировщика.")}
    finally{if(btn){btn.disabled=false;btn.textContent=old||"+ ID"}}
  }

  async function render(){
    const el=$("tab-participants");if(!el)return;
    let box=$("v37TesterIds");
    if(!box){box=document.createElement("div");box.id="v37TesterIds";box.style.marginBottom="14px";el.prepend(box)}
    box.innerHTML='<div class="card empty">Загружаем ID тестировщиков…</div>';
    try{
      const out=await api("admin-list",{limit:300}),items=out.items||[],claimed=items.filter(x=>x.claimed).length;
      box.innerHTML=`<div class="grid kpis"><div class="card kpi"><div class="v">${items.length}</div><div class="l">ID выдано</div></div><div class="card kpi"><div class="v">${claimed}</div><div class="l">подключено</div></div><div class="card kpi"><div class="v">${items.length-claimed}</div><div class="l">ожидают</div></div></div><div class="card" style="margin-top:12px"><div class="section-title">Тестировщики браузерного прототипа</div><div class="small muted">После ввода одноразового кода уже накопленная локальная история этого браузера связывается с tester ID. В публичных заметках tester ID не показывается.</div><div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Tester ID</th><th>Статус</th><th>Создан</th><th>Подключён</th></tr></thead><tbody>${items.map(x=>`<tr><td><b>${esc(x.testerId)}</b></td><td>${x.claimed?"подключён":"ожидает"}</td><td>${dt(x.createdAt)}</td><td>${x.claimedAt?dt(x.claimedAt):"—"}</td></tr>`).join("")}</tbody></table></div></div>`;
    }catch(_){box.innerHTML='<div class="card empty">Не удалось загрузить tester ID.</div>'}
  }

  const btn=$("createCodeBtn");if(btn){btn.textContent="+ ID тестировщика";btn.onclick=generate}
  document.querySelectorAll('.tab[data-tab="participants"]').forEach(b=>b.addEventListener("click",()=>setTimeout(render,0)));
  const refresh=$("refreshBtn");refresh?.addEventListener("click",()=>setTimeout(render,120));
  setTimeout(render,250);
  window.__SETKA_ADMIN_TESTERS_V37__={generate,render};
})();