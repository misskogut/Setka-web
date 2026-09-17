(() => {
  "use strict";

  const API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-tester-identity-v37";
  const ACCOUNT_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-tester-account-v40";
  const API_KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const ADMIN_KEY_STORAGE = "setka-research:admin-key:v1";

  const esc = v => String(v ?? "").replace(/[&<>\"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  const fmt = v => { if (!v) return "—"; try { return new Intl.DateTimeFormat("ru-RU", {day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(v)); } catch (_) { return "—"; } };

  const style = document.createElement("style");
  style.textContent = `
    .st37-admin-modal{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.82);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);display:grid;place-items:center;padding:18px}
    .st37-admin-modal.hidden{display:none}.st37-admin-panel{width:min(760px,100%);max-height:min(86vh,820px);overflow:auto;background:#090909;border:1px solid rgba(255,255,255,.16);border-radius:24px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.5)}
    .st37-admin-head{display:flex;align-items:flex-start;gap:12px;margin-bottom:16px}.st37-admin-head h2{margin:0;font-size:20px}.st37-admin-head p{margin:5px 0 0;font-size:11px;line-height:1.45;color:rgba(255,255,255,.48)}.st37-admin-head .spacer{flex:1}
    .st37-admin-close{width:38px;height:38px;border-radius:19px;border:1px solid rgba(255,255,255,.16);background:#111;color:#fff;font-size:18px}
    .st37-admin-create{width:100%;height:46px;border:0;border-radius:23px;background:#fff;color:#000;font-weight:700;margin-bottom:14px}
    .st37-admin-new{border:1px solid rgba(255,255,255,.22);border-radius:18px;padding:15px;margin-bottom:14px;background:#101010}.st37-admin-new-title{font-size:10px;letter-spacing:.12em;color:rgba(255,255,255,.45);margin-bottom:9px}.st37-admin-code{font-size:19px;letter-spacing:.06em;font-weight:700;word-break:break-word}.st37-admin-tid{font-size:12px;color:rgba(255,255,255,.55);margin-top:5px}.st37-admin-copy{margin-top:11px;height:38px;border-radius:19px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#fff;padding:0 14px}.st37-admin-warning{font-size:10px;line-height:1.45;color:rgba(255,255,255,.42);margin-top:9px}
    .st37-admin-list{display:grid;gap:8px}.st37-admin-row{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;border:1px solid rgba(255,255,255,.1);border-radius:15px;padding:12px}.st37-admin-row strong{font-size:13px;letter-spacing:.05em}.st37-admin-row small{display:block;margin-top:4px;color:rgba(255,255,255,.42);font-size:10px;line-height:1.45}.st37-admin-status{font-size:10px;padding:6px 9px;border-radius:12px;background:#151515;color:rgba(255,255,255,.55);white-space:nowrap}.st37-admin-status.claimed{background:#fff;color:#000}.st37-admin-status.ready{background:#fff;color:#000}.st37-admin-empty{padding:22px;text-align:center;color:rgba(255,255,255,.38);font-size:11px}
  `;
  document.head.appendChild(style);

  async function apiAt(url,action,extra={}) {
    const adminKey = localStorage.getItem(ADMIN_KEY_STORAGE) || "";
    const r = await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",apikey:API_KEY},body:JSON.stringify({action,adminKey,...extra})});
    let out={};try{out=await r.json()}catch(_){}if(!r.ok)throw new Error(out.error||`http_${r.status}`);return out;
  }
  const api=(action,extra={})=>apiAt(API,action,extra);
  const accountApi=(action,extra={})=>apiAt(ACCOUNT_API,action,extra);

  const modal=document.createElement("div");modal.className="st37-admin-modal hidden";modal.innerHTML=`
    <div class="st37-admin-panel" role="dialog" aria-modal="true" aria-labelledby="st37TesterTitle">
      <div class="st37-admin-head"><div><h2 id="st37TesterTitle">ID тестировщиков</h2><p>Создай одноразовый код и отправь его человеку. Публичная SETKA остаётся доступной без входа. Код подключает только псевдонимный Tester ID; затем человек сам задаёт пароль кабинета. Имя, почта и телефон не запрашиваются, личный корпус остаётся на устройстве.</p></div><div class="spacer"></div><button class="st37-admin-close" type="button" aria-label="Закрыть">×</button></div>
      <button id="st37GenerateTester" class="st37-admin-create" type="button">+ Создать новый tester ID</button>
      <div id="st37NewTester"></div><div id="st37TesterList" class="st37-admin-list"><div class="st37-admin-empty">Загружаю…</div></div>
    </div>`;document.body.appendChild(modal);
  const listEl=modal.querySelector("#st37TesterList"),newEl=modal.querySelector("#st37NewTester"),generateBtn=modal.querySelector("#st37GenerateTester");
  function close(){modal.classList.add("hidden")}modal.querySelector(".st37-admin-close").onclick=close;modal.addEventListener("click",e=>{if(e.target===modal)close()});

  function accountState(code,acc){
    if(!code.claimed)return{label:"ЖДЁТ ВВОДА",cls:"",detail:"одноразовый код ещё не использован"};
    if(!acc?.password_set_at)return{label:"НУЖЕН ПАРОЛЬ",cls:"claimed",detail:"Tester ID подключён · кабинет ещё не создан"};
    if(!acc?.consent_at)return{label:"НУЖНО СОГЛАСИЕ",cls:"claimed",detail:`пароль задан ${fmt(acc.password_set_at)} · исследовательский мост выключен`};
    return{label:"КАБИНЕТ АКТИВЕН",cls:"ready",detail:`пароль задан ${fmt(acc.password_set_at)} · согласие ${fmt(acc.consent_at)}${acc.last_login_at?` · вход ${fmt(acc.last_login_at)}`:""}`};
  }
  async function loadList(){
    listEl.innerHTML='<div class="st37-admin-empty">Загружаю…</div>';
    try{
      const [ids,accounts]=await Promise.all([api("admin-list",{limit:300}),accountApi("admin-list")]);
      const amap=new Map((accounts.items||[]).map(x=>[x.tester_id,x])),items=ids.items||[];
      if(!items.length){listEl.innerHTML='<div class="st37-admin-empty">Tester ID ещё не создавались.</div>';return}
      listEl.innerHTML=items.map(x=>{const a=amap.get(x.testerId),s=accountState(x,a);return `<div class="st37-admin-row"><div><strong>${esc(x.testerId)}</strong><small>создан ${esc(fmt(x.createdAt))}${x.claimedAt?` · ID подключён ${esc(fmt(x.claimedAt))}`:""}<br>${esc(s.detail)}</small></div><div class="st37-admin-status ${s.cls}">${esc(s.label)}</div></div>`}).join("");
    }catch(e){listEl.innerHTML=`<div class="st37-admin-empty">Не удалось загрузить ID: ${esc(e.message)}</div>`}
  }
  function showGenerated(item){newEl.innerHTML=`<div class="st37-admin-new"><div class="st37-admin-new-title">НОВЫЙ ОДНОРАЗОВЫЙ КОД</div><div class="st37-admin-code">${esc(item.code)}</div><div class="st37-admin-tid">Tester ID: ${esc(item.testerId)}</div><button class="st37-admin-copy" type="button">Скопировать код</button><div class="st37-admin-warning">Отправь человеку код SETKA-…. На сервере хранится только его хэш. После привязки человек сам создаст пароль. Личная история SETKA не переносится в кабинет и остаётся локальной.</div></div>`;const copy=newEl.querySelector(".st37-admin-copy");copy.onclick=async()=>{try{await navigator.clipboard.writeText(item.code);copy.textContent="Скопировано ✓"}catch(_){const ta=document.createElement("textarea");ta.value=item.code;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();try{document.execCommand("copy");copy.textContent="Скопировано ✓"}catch(_){copy.textContent=item.code}ta.remove()}}}
  generateBtn.onclick=async()=>{generateBtn.disabled=true;generateBtn.textContent="Создаю…";try{const out=await api("admin-generate",{count:1}),item=out.items?.[0];if(!item)throw new Error("empty_response");showGenerated(item);await loadList()}catch(e){alert(`Не удалось создать tester ID: ${e.message}`)}finally{generateBtn.disabled=false;generateBtn.textContent="+ Создать новый tester ID"}};
  function open(){modal.classList.remove("hidden");newEl.innerHTML="";loadList()}
  function installButton(){const old=document.getElementById("createCodeBtn");if(!old||old.dataset.testerIdCanonical==="1")return;const button=old.cloneNode(true);button.id="createCodeBtn";button.type="button";button.className="btn primary";button.textContent="+ ID тестировщика";button.dataset.testerIdCanonical="1";old.replaceWith(button);button.onclick=open;document.getElementById("testerIdV37Btn")?.remove()}
  installButton();document.addEventListener("DOMContentLoaded",installButton,{once:true});window.__SETKA_ADMIN_TESTER_IDS_V37__={open,loadList};
})();