(() => {
  "use strict";
  const C=window.SetkaStandaloneV34;if(!C)return;
  const KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-tester-account-v40";
  const SESSION_KEY="setka-v40:cabinet-session",STATE_KEY="setka-v40:cabinet-status",BRIDGE_KEY="setka-v40:research-bridge-status",CORPUS_KEY="setka-v40:private-corpus-status";
  const CONSENT_VERSION="research-v2-2026-09-17";
  const CONSENT_TEXT="SETKA не запрашивает имя, телефон или электронную почту. Личная история, заметки, состояния и персональная аналитика могут храниться в приватном контуре SETKA и использоваться системой для персонализации, динамики и восстановления кабинета. Эти данные не публикуются и не показываются другим пользователям. Для общего исследовательского слоя используются отдельные обезличенные показатели паттернов и конфигураций. Публичная публикация заметки возможна только отдельным действием пользователя и после модерации.";
  const esc=v=>String(v??"").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  let state=null,busy=false,timer=0;

  const style=document.createElement("style");style.textContent=`
    #st37MeTools{display:none!important}.st40-section{margin:18px 0 4px}.st40-label{font-size:10px;letter-spacing:.14em;color:rgba(255,255,255,.38);margin:0 0 8px}
    .st40-card{border:1px solid rgba(255,255,255,.14);border-radius:23px;background:#090909;padding:16px;margin:10px 0}.st40-id{font-size:19px;font-weight:700;letter-spacing:.04em}.st40-copy{font-size:11px;line-height:1.55;color:rgba(255,255,255,.5);margin-top:7px}.st40-ok{font-size:10px;letter-spacing:.08em;color:rgba(255,255,255,.65);margin-top:10px}.st40-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#fff;margin-right:6px;vertical-align:1px}.st40-dot.off{opacity:.25}
    .st40-btn{width:100%;min-height:44px;border:1px solid rgba(255,255,255,.18);border-radius:22px;background:transparent;color:#fff;font-size:12px;margin-top:10px}.st40-btn.primary{background:#fff;color:#000;border-color:#fff;font-weight:650}.st40-btn:disabled{opacity:.35}
    .st40-form{border:1px solid rgba(255,255,255,.14);border-radius:23px;background:#090909;padding:16px;margin:12px 0}.st40-field{display:block;margin:12px 0}.st40-field span{display:block;font-size:10px;color:rgba(255,255,255,.45);margin:0 0 6px}.st40-field input{box-sizing:border-box;width:100%;height:46px;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:#000;color:#fff;padding:0 13px;font-size:15px;outline:none}.st40-check{display:flex;gap:10px;align-items:flex-start;font-size:11px;line-height:1.5;color:rgba(255,255,255,.58);margin:14px 0}.st40-check input{margin-top:2px}.st40-msg{font-size:11px;line-height:1.45;color:rgba(255,255,255,.48);min-height:16px;margin-top:8px}.st40-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.st40-metric{border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:11px}.st40-metric b{display:block;font-size:17px}.st40-metric span{display:block;font-size:9px;color:rgba(255,255,255,.42);margin-top:4px;line-height:1.35}
  `;document.head.appendChild(style);

  function did(){return C.sandbox?.deviceId||null}
  function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}catch(_){return null}}
  function bridge(){try{return JSON.parse(localStorage.getItem(BRIDGE_KEY)||"null")}catch(_){return null}}
  function corpus(){try{return JSON.parse(localStorage.getItem(CORPUS_KEY)||"null")}catch(_){return null}}
  function cache(v){state=v;try{localStorage.setItem(STATE_KEY,JSON.stringify(v))}catch(_){}renderMe()}
  function cached(){if(state)return state;try{state=JSON.parse(localStorage.getItem(STATE_KEY)||"null")}catch(_){}return state}
  function setSession(token,expiresAt){try{localStorage.setItem(SESSION_KEY,JSON.stringify({token,expiresAt}))}catch(_){} }
  function clearSession(){try{localStorage.removeItem(SESSION_KEY)}catch(_){} }
  async function post(payload){const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify(payload)});const out=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(out.error||`http_${r.status}`);e.status=r.status;throw e}return out}
  async function refresh(force=false){if(busy)return cached();busy=true;try{const s=session(),out=await post({action:"status",deviceId:did(),sessionToken:s?.token||null});cache(out);if(s?.token&&!out.authenticated&&out.claimed)clearSession();return out}catch(_){return cached()}finally{busy=false}}
  function screen(title,copy,kicker="КАБИНЕТ"){return C.screen(title,copy,kicker,C.showMe)}
  function button(parent,title,sub,fn,primary=false){const b=document.createElement("button");b.type="button";b.className=`st40-btn${primary?" primary":""}`;b.innerHTML=sub?`<b>${esc(title)}</b><div style="font-size:10px;font-weight:400;opacity:.55;margin-top:3px">${esc(sub)}</div>`:esc(title);b.onclick=fn;parent.appendChild(b);return b}
  function field(parent,label,type="text",value=""){const l=document.createElement("label");l.className="st40-field";l.innerHTML=`<span>${esc(label)}</span>`;const i=document.createElement("input");i.type=type;i.value=value;i.autocomplete=type==="password"?"current-password":"off";l.appendChild(i);parent.appendChild(l);return i}
  function msg(parent){const m=document.createElement("div");m.className="st40-msg";parent.appendChild(m);return m}
  function friendly(e){const x=String(e?.message||e);return({invalid_tester_code:"Код не найден или уже отключён",tester_id_already_claimed:"Этот код уже использован на другом устройстве",device_already_has_tester_id:"На этом устройстве уже подключён другой Tester ID",too_many_attempts:"Слишком много попыток. Попробуй позже",password_length:"Пароль должен содержать от 8 до 128 символов",invalid_credentials:"Tester ID или пароль не подошли",claim_proof_required:"Сначала подключи одноразовый код на этом устройстве",consent_required:"Нужно подтвердить условия приватного и исследовательского режима"}[x]||"Не удалось выполнить действие")}

  async function showClaim(){const b=screen("Подключить тестирование","Публичная SETKA остаётся доступной без входа. Код нужен только для подключения приватного кабинета тестировщика.","ТЕСТИРОВАНИЕ"),f=document.createElement("div");f.className="st40-form";b.appendChild(f);const code=field(f,"Одноразовый код тестировщика"),m=msg(f),go=button(f,"Подключить Tester ID","После создания пароля личная история сможет синхронизироваться с приватным контуром SETKA",async()=>{go.disabled=true;m.textContent="Проверяем код…";try{const out=await post({action:"claim",deviceId:did(),testerCode:code.value,userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1}});cache(out);window.dispatchEvent(new CustomEvent("setka:v40-account",{detail:out}));showSetPassword()}catch(e){m.textContent=friendly(e)}finally{go.disabled=false}},true);}

  async function showSetPassword(){const st=await refresh(true);if(!st?.claimed)return showClaim();const b=screen("Создать пароль","Пароль нужен для приватного кабинета тестировщика. Имя, почта и телефон не требуются.","ТЕСТИРОВАНИЕ"),f=document.createElement("div");f.className="st40-form";b.appendChild(f);const p1=field(f,"Новый пароль","password"),p2=field(f,"Повтори пароль","password");const c=document.createElement("label");c.className="st40-check";const cb=document.createElement("input");cb.type="checkbox";const tx=document.createElement("span");tx.textContent=CONSENT_TEXT;c.append(cb,tx);f.appendChild(c);const m=msg(f),go=button(f,"Создать кабинет","Включит приватную синхронизацию и обезличенный исследовательский слой",async()=>{if(p1.value!==p2.value){m.textContent="Пароли не совпадают";return}if(!cb.checked){m.textContent="Нужно подтвердить условия приватного и исследовательского режима";return}go.disabled=true;m.textContent="Создаём кабинет…";try{const out=await post({action:"set-password",deviceId:did(),testerId:st.testerId,password:p1.value,acceptConsent:true,consentVersion:CONSENT_VERSION});setSession(out.sessionToken,out.sessionExpiresAt);cache(out);window.dispatchEvent(new CustomEvent("setka:v40-account",{detail:out}));C.showMe()}catch(e){m.textContent=friendly(e)}finally{go.disabled=false}},true);}

  async function showLogin(){const st=await refresh(true),b=screen("Войти в кабинет","SETKA по-прежнему работает без входа. Авторизация нужна для доступа к приватному персональному контуру тестировщика.","ТЕСТИРОВАНИЕ"),f=document.createElement("div");f.className="st40-form";b.appendChild(f);const id=field(f,"Tester ID","text",st?.testerId||""),pw=field(f,"Пароль","password"),m=msg(f),go=button(f,"Войти",null,async()=>{go.disabled=true;m.textContent="Входим…";try{const out=await post({action:"login",testerId:id.value,password:pw.value,deviceId:did(),userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1}});setSession(out.sessionToken,out.sessionExpiresAt);cache(out);window.dispatchEvent(new CustomEvent("setka:v40-account",{detail:out}));C.showMe()}catch(e){m.textContent=friendly(e)}finally{go.disabled=false}},true);}

  async function showConsent(){const st=await refresh(true);if(!st?.authenticated)return showLogin();const b=screen("Приватность и исследовательский режим","Личный корпус доступен SETKA только внутри приватного кабинета и используется для персонализации. В общий исследовательский слой уходят отдельные обезличенные показатели.","ПРИВАТНОСТЬ"),f=document.createElement("div");f.className="st40-form";b.appendChild(f);const c=document.createElement("label");c.className="st40-check";const cb=document.createElement("input");cb.type="checkbox";const tx=document.createElement("span");tx.textContent=CONSENT_TEXT;c.append(cb,tx);f.appendChild(c);const m=msg(f),go=button(f,"Подтвердить участие",null,async()=>{if(!cb.checked){m.textContent="Нужно подтвердить текст выше";return}try{const s=session(),out=await post({action:"accept-consent",sessionToken:s?.token,acceptConsent:true,consentVersion:CONSENT_VERSION});cache(out);window.dispatchEvent(new CustomEvent("setka:v40-account",{detail:out}));C.showMe()}catch(e){m.textContent=friendly(e)}},true);}

  async function showChangePassword(){const b=screen("Сменить пароль","Новый пароль заменит старый. Другие активные сессии кабинета будут завершены.","КАБИНЕТ"),f=document.createElement("div");f.className="st40-form";b.appendChild(f);const cur=field(f,"Текущий пароль","password"),p1=field(f,"Новый пароль","password"),p2=field(f,"Повтори новый пароль","password"),m=msg(f),go=button(f,"Сохранить новый пароль",null,async()=>{if(p1.value!==p2.value){m.textContent="Пароли не совпадают";return}try{const s=session(),out=await post({action:"change-password",sessionToken:s?.token,currentPassword:cur.value,newPassword:p1.value});cache(out);m.textContent="Пароль обновлён"}catch(e){m.textContent=friendly(e)}},true);}

  async function logout(){const s=session();try{if(s?.token)await post({action:"logout",sessionToken:s.token})}catch(_){}clearSession();await refresh(true);window.dispatchEvent(new CustomEvent("setka:v40-account",{detail:{authenticated:false}}));C.showMe()}

  async function showCabinet(){const st=await refresh(true);if(!st?.authenticated)return showLogin();const br=bridge()||{},cp=corpus()||{},b=screen("Кабинет тестировщика","Псевдонимный приватный кабинет без имени, почты и телефона.","МОЯ SETKA"),card=document.createElement("div");card.className="st40-card";card.innerHTML=`<div class="st40-id">${esc(st.testerId)}</div><div class="st40-copy">Личная история и персональная аналитика могут храниться в приватном корпусе SETKA и использоваться системой для персональной работы с тобой. Другим пользователям эти данные не показываются. Исследовательский слой получает отдельные обезличенные вклады.</div><div class="st40-grid"><div class="st40-metric"><b>${esc(cp.counts?.sessions??0)}</b><span>сессий в приватном корпусе</span></div><div class="st40-metric"><b>${esc(br.patterns??0)}</b><span>паттернов в обезличенном исследовательском слое</span></div></div><div class="st40-ok"><span class="st40-dot ${cp.ok?"":"off"}"></span>${cp.ok?"Приватный корпус синхронизирован":"Приватный корпус ожидает синхронизации"}</div><div class="st40-ok"><span class="st40-dot ${st.consented?"":"off"}"></span>${st.consented?"Исследовательский режим включён":"Нужно подтвердить актуальные условия"}</div><div class="st40-copy">Build: ${esc(window.__SETKA_PRIVATE_CORPUS_V40__?.build||"v40")} / ${esc(window.__SETKA_RESEARCH_BRIDGE_V40__?.build||"v40")}</div>`;b.appendChild(card);if(!st.consented)button(b,"Подтвердить актуальные условия",null,showConsent,true);button(b,"Сменить пароль",null,showChangePassword);button(b,"Выйти из кабинета","Публичная SETKA продолжит работать",logout);}

  function isMeScreen(){
    const layer=document.getElementById("st34Layer");
    return !!layer&&!layer.classList.contains("hidden")&&layer.querySelector(".st-title")?.textContent?.trim()==="Я";
  }
  function renderMe(){
    if(!isMeScreen())return;
    const old=document.getElementById("st37MeTools"),body=old?.parentElement;
    if(!old||!body)return;
    old.style.display="none";
    let wrap=document.getElementById("st40TesterCabinet");
    let community=[...(wrap?.querySelectorAll("button")||[]),...old.querySelectorAll("button")].find(x=>x.textContent.includes("Анонимные заметки сообщества"))||null;
    if(community)community.remove();
    if(wrap)wrap.remove();
    wrap=document.createElement("div");wrap.id="st40TesterCabinet";wrap.className="st40-section";wrap.innerHTML='<div class="st40-label">ТЕСТИРОВАНИЕ И СООБЩЕСТВО</div>';const st=cached();
    const card=document.createElement("div");card.className="st40-card";
    if(!st?.claimed){card.innerHTML='<div class="st40-id">Гость</div><div class="st40-copy">SETKA доступна без регистрации. Если у тебя есть код тестировщика, можно подключить приватный кабинет без имени, почты и телефона.</div>';button(card,"У меня есть код тестировщика",null,showClaim,true)}
    else if(!st.hasPassword){card.innerHTML=`<div class="st40-id">${esc(st.testerId)}</div><div class="st40-copy">Tester ID подключён. Создай пароль, чтобы SETKA могла безопасно синхронизировать твой приватный персональный корпус и использовать его для персонализации.</div>`;button(card,"Создать пароль кабинета",null,showSetPassword,true)}
    else if(!st.authenticated){card.innerHTML=`<div class="st40-id">${esc(st.testerId)}</div><div class="st40-copy">Tester ID подключён. Войди в кабинет своим паролем. Публичная SETKA работает и без входа.</div>`;button(card,"Войти в кабинет",null,showLogin,true)}
    else{const br=bridge()||{},cp=corpus()||{};card.innerHTML=`<div class="st40-id">${esc(st.testerId)}</div><div class="st40-copy">Кабинет активен. Личный корпус хранится приватно и используется SETKA для персональной работы; в публичную часть он не попадает.</div><div class="st40-ok"><span class="st40-dot ${cp.ok?"":"off"}"></span>${cp.ok?"Приватный корпус синхронизирован":"Синхронизация приватного корпуса ожидается"}</div><div class="st40-ok"><span class="st40-dot ${st.consented?"":"off"}"></span>${st.consented?`Исследовательский слой · ${Number(br.patterns)||0} паттернов`:"Нужно подтвердить актуальные условия"}</div>`;button(card,"Открыть кабинет",null,showCabinet,true)}
    wrap.appendChild(card);
    if(community){community.style.display="";wrap.appendChild(community)}
    body.appendChild(wrap);
  }
  const layer=document.getElementById("st34Layer");
  const mo=new MutationObserver(records=>{
    let sawMeTools=false;
    for(const record of records){
      for(const node of record.addedNodes){
        if(node.nodeType!==1)continue;
        if(node.id==="st37MeTools"||node.querySelector?.("#st37MeTools")){sawMeTools=true;break}
      }
      if(sawMeTools)break;
    }
    if(sawMeTools){clearTimeout(timer);timer=setTimeout(renderMe,0)}
  });
  if(layer)mo.observe(layer,{childList:true,subtree:true});
  window.addEventListener("setka:v40-research-bridge",renderMe);window.addEventListener("setka:v40-private-corpus",renderMe);window.addEventListener("setka:v40-account",()=>{refresh(true);renderMe()});
  setTimeout(async()=>{cached();renderMe();await refresh(true);renderMe()},700);
  window.__SETKA_TESTER_CABINET_V40__={refresh:()=>refresh(true),show:showCabinet,state:()=>cached(),logout};
})();