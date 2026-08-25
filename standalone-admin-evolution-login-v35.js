(() => {
  "use strict";
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-admin-evolution-v35";
  const API_KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const KEY="setka-research:admin-key:v1";
  const $=id=>document.getElementById(id);
  const login=$("login"),dashboard=$("dashboard"),input=$("keyInput"),btn=$("loginBtn"),err=$("loginError"),logout=$("logoutBtn"),refresh=$("refreshBtn"),create=$("createCodeBtn");
  if(!login||!dashboard||!input||!btn)return;
  async function check(key){const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify({action:"admin-overview",adminKey:key})});if(!r.ok)throw new Error("invalid_admin_key");return r.json()}
  async function enter(silent=false){const key=input.value.trim()||localStorage.getItem(KEY)||"";if(!key){if(!silent)err.textContent="Введите Admin key.";return}btn.disabled=true;err.textContent="";try{await check(key);localStorage.setItem(KEY,key);login.classList.add("hidden");dashboard.classList.remove("hidden");window.dispatchEvent(new CustomEvent("setka:evolution-login"))}catch(_){localStorage.removeItem(KEY);if(!silent)err.textContent="Неверный ключ или нет соединения.";btn.disabled=false}}
  btn.onclick=()=>enter(false);input.addEventListener("keydown",e=>{if(e.key==="Enter")enter(false)});
  logout.onclick=()=>{localStorage.removeItem(KEY);location.reload()};
  refresh.onclick=()=>location.reload();
  if(create)create.onclick=()=>alert("В текущем исследовательском прототипе новый участник создаётся автоматически, когда новый браузер начинает активность. Ручное имя задаётся в карточке участника.");
  const saved=localStorage.getItem(KEY)||"";if(saved){input.value=saved;setTimeout(()=>enter(true),50)}
})();