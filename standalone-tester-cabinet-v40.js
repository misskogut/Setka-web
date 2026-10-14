(() => {
  "use strict";
  const C=window.SetkaStandaloneV34;if(!C)return;
  const KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-tester-account-v40";
  const SESSION_KEY="setka-v40:cabinet-session",STATE_KEY="setka-v40:cabinet-status",BRIDGE_KEY="setka-v40:research-bridge-status",CORPUS_KEY="setka-v40:private-corpus-status";
  const CONSENT_VERSION="research-v2-2026-09-17";
  const CONSENT_TEXT="SETKA не запрашивает имя, телефон или электронную почту. Личная история, заметки, состояния и персональная аналитика могут храниться в приватном контуре SETKA и использоваться системой для персонализации, динамики и восстановления кабинета. Эти данные не публикуются и не показываются другим пользователям. Визуальные превью паттернов по умолчанию создаются на устройстве и хранятся во временном локальном кэше; источником истины служит компактная кодовая капсула с числовым рецептом паттерна. Для общего исследовательского слоя используются отдельные обезличенные показатели паттернов и конфигураций. Публичная публикация заметки возможна только отдельным действием пользователя и после модерации. Для одобренной публичной заметки SETKA может хранить уменьшенную серверную миниатюру связанного визуала для быстрого отображения. После снятия публикации эта миниатюра перестаёт отдаваться публично, но может сохраняться во внутреннем архиве SETKA вместе с кодовой капсулой.";
  const esc=v=>String(v??"").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  let state=null,busy=false,timer=0,sessionEpoch=0;

  const style=document.createElement("style");style.textContent=`
    #st37MeTools{display:none!important}.st40-section{margin:18px 0 4px}.st40-label{font-size:10px;letter-spacing:.14em;color:rgba(255,255,255,.38);margin:0 0 8px}
    .st40-card{border:1px solid rgba(255,255,255,.14);border-radius:23px;background:#090909;padding:16px;margin:10px 0}.st40-id{font-size:19px;font-weight:700;letter-spacing:.04em}.st40-copy{font-size:11px;line-height:1.55;color:rgba(255,255,255,.5);margin-top:7px}.st40-ok{font-size:10px;letter-spacing:.08em;color:rgba(255,255,255,.65);margin-top:10px}.st40-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#fff;margin-right:6px;vertical-align:1px}.st40-dot.off{opacity:.25}
    .st40-btn{width:100%;min-height:44px;border:1px solid rgba(255,255,255,.18);border-radius:22px;background:transparent;color:#fff;font-size:12px;margin-top:10px}.st40-btn.primary{background:#fff;color:#000;border-color:#fff;font-weight:650}.st40-btn:disabled{opacity:.35}
    /* Keep the everyday Me screen clear; account actions live behind a header shortcut. */
    .st40-account-shortcut{margin-left:auto;flex:0 0 60px;min-width:52px;min-height:50px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:1px solid rgba(255,255,255,.22);border-radius:18px;background:#090909;color:#fff;padding:5px 4px;cursor:pointer;-webkit-tap-highlight-color:transparent;position:relative}
    .st40-account-shortcut svg{display:block;width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
    .st40-account-shortcut-label{font-size:9px;line-height:1.1;color:rgba(255,255,255,.7)}
    .st40-account-shortcut-dot{position:absolute;width:6px;height:6px;border-radius:50%;background:#fff;right:8px;top:7px}
    .st40-account-shortcut:focus-visible{outline:2px solid #fff;outline-offset:3px}
    .st40-form{border:1px solid rgba(255,255,255,.14);border-radius:23px;background:#090909;padding:16px;margin:12px 0}.st40-field{display:block;margin:12px 0}.st40-field span{display:block;font-size:10px;color:rgba(255,255,255,.45);margin:0 0 6px}.st40-field input{box-sizing:border-box;width:100%;height:46px;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:#000;color:#fff;padding:0 13px;font-size:15px;outline:none}.st40-check{display:flex;gap:10px;align-items:flex-start;font-size:11px;line-height:1.5;color:rgba(255,255,255,.58);margin:14px 0}.st40-check input{margin-top:2px}.st40-msg{font-size:11px;line-height:1.45;color:rgba(255,255,255,.48);min-height:16px;margin-top:8px}.st40-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.st40-metric{border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:11px}.st40-metric b{display:block;font-size:17px}.st40-metric span{display:block;font-size:9px;color:rgba(255,255,255,.42);margin-top:4px;line-height:1.35}
  `;document.head.appendChild(style);

  function did(){return C.sandbox?.deviceId||null}
  let liveSession=null;
  function session(){
    if(liveSession?.token)return liveSession;
    try{const x=JSON.parse(localStorage.getItem(SESSION_KEY)||"null");if(x?.token){liveSession=x;return x}}catch(_){}
    try{const x=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");if(x?.token){liveSession=x;return x}}catch(_){}
    return null;
  }
  function bridge(){try{return JSON.parse(localStorage.getItem(BRIDGE_KEY)||"null")}catch(_){return null}}
  function corpus(){const current=window.__SETKA_PRIVATE_CORPUS_V40__?.status?.();if(current)return current;try{return JSON.parse(localStorage.getItem(CORPUS_KEY)||"null")}catch(_){return null}}
  function safeState(v){
    if(!v||typeof v!=="object")return v;
    const {sessionToken,recoveryCode,password,...safe}=v;
    return safe;
  }
  function cache(v){state=safeState(v);try{localStorage.setItem(STATE_KEY,JSON.stringify(state))}catch(_){}renderMe()}
  function cached(){
    if(state)return state;
    try{
      const raw=JSON.parse(localStorage.getItem(STATE_KEY)||"null");
      state=safeState(raw);
      if(raw?.sessionToken)try{localStorage.setItem(STATE_KEY,JSON.stringify(state))}catch(_){}
    }catch(_){}
    return state;
  }
  function setSession(token,expiresAt){
    sessionEpoch++;
    liveSession={token,expiresAt};
    const raw=JSON.stringify(liveSession);
    try{localStorage.setItem(SESSION_KEY,raw)}catch(_){}
    try{sessionStorage.setItem(SESSION_KEY,raw)}catch(_){}
  }
  function clearSession(){
    sessionEpoch++;liveSession=null;
    try{localStorage.removeItem(SESSION_KEY)}catch(_){}
    try{sessionStorage.removeItem(SESSION_KEY)}catch(_){}
  }
  async function post(payload){const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify(payload)});const out=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(out.error||`http_${r.status}`);e.status=r.status;throw e}return out}
  async function refresh(force=false){
    if(busy)return cached();
    busy=true;
    const startedEpoch=sessionEpoch,s=session(),startedToken=s?.token||null;
    try{
      const out=await post({action:"status",deviceId:did(),sessionToken:startedToken});
      const now=session();
      if(startedEpoch!==sessionEpoch||(now?.token||null)!==startedToken)return cached();
      if(startedToken&&out?.sessionInvalid===true){
        clearSession();
        cache({...out,authenticated:false});
        return out;
      }
      if(startedToken&&!out.authenticated){
        return cached();
      }
      cache(out);
      return out;
    }catch(_){return cached()}finally{busy=false}
  }
  function screen(title,copy,kicker="КАБИНЕТ"){return C.screen(title,copy,kicker,C.showMe)}
  function button(parent,title,sub,fn,primary=false){const b=document.createElement("button");b.type="button";b.className=`st40-btn${primary?" primary":""}`;b.innerHTML=sub?`<b>${esc(title)}</b><div style="font-size:10px;font-weight:400;opacity:.55;margin-top:3px">${esc(sub)}</div>`:esc(title);b.onclick=fn;parent.appendChild(b);return b}
  function field(parent,label,type="text",value=""){const l=document.createElement("label");l.className="st40-field";l.innerHTML=`<span>${esc(label)}</span>`;const i=document.createElement("input");i.type=type;i.value=value;i.autocomplete=type==="password"?"current-password":"off";l.appendChild(i);parent.appendChild(l);return i}
  function msg(parent){const m=document.createElement("div");m.className="st40-msg";parent.appendChild(m);return m}
  function friendly(e){const x=String(e?.message||e);return({invalid_tester_code:"Код не найден или уже отключён",tester_id_already_claimed:"Этот код уже использован на другом устройстве",device_already_has_tester_id:"Браузер уже закреплён за другим Tester ID. Для другого аккаунта потребуется отдельный браузер или устройство.",too_many_attempts:"Слишком много попыток. Попробуй позже",password_length:"Пароль должен содержать от 8 до 128 символов",invalid_credentials:"Tester ID или пароль не подошли",claim_proof_required:"Сначала подключи одноразовый код на этом устройстве",consent_required:"Нужно подтвердить условия приватного и исследовательского режима",invalid_recovery_code:"Recovery-код не подошёл или уже истёк",missing_recovery_fields:"Заполни Tester ID, recovery-код и новый пароль"}[x]||"Не удалось выполнить действие")}

  async function showClaim(){const b=screen("Подключить тестирование","Публичная SETKA остаётся доступной без входа. Код нужен только для подключения приватного кабинета тестировщика.","ТЕСТИРОВАНИЕ"),f=document.createElement("div");f.className="st40-form";b.appendChild(f);const code=field(f,"Одноразовый код тестировщика"),m=msg(f),go=button(f,"Подключить Tester ID","После создания пароля личная история сможет синхронизироваться с приватным контуром SETKA",async()=>{go.disabled=true;m.textContent="Проверяем код…";try{const out=await post({action:"claim",deviceId:did(),testerCode:code.value,userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1}});cache(out);window.dispatchEvent(new CustomEvent("setka:v40-account",{detail:out}));showSetPassword()}catch(e){m.textContent=friendly(e)}finally{go.disabled=false}},true);}

  async function showSetPassword(){const st=await refresh(true);if(!st?.claimed)return showClaim();const b=screen("Создать пароль","Пароль нужен для приватного кабинета тестировщика. Имя, почта и телефон не требуются.","ТЕСТИРОВАНИЕ"),f=document.createElement("div");f.className="st40-form";b.appendChild(f);const p1=field(f,"Новый пароль","password"),p2=field(f,"Повтори пароль","password");const c=document.createElement("label");c.className="st40-check";const cb=document.createElement("input");cb.type="checkbox";const tx=document.createElement("span");tx.textContent=CONSENT_TEXT;c.append(cb,tx);f.appendChild(c);const m=msg(f),go=button(f,"Создать кабинет","Включит приватную синхронизацию и обезличенный исследовательский слой",async()=>{if(p1.value!==p2.value){m.textContent="Пароли не совпадают";return}if(!cb.checked){m.textContent="Нужно подтвердить условия приватного и исследовательского режима";return}go.disabled=true;m.textContent="Создаём кабинет…";try{const out=await post({action:"set-password",deviceId:did(),testerId:st.testerId,password:p1.value,acceptConsent:true,consentVersion:CONSENT_VERSION});setSession(out.sessionToken,out.sessionExpiresAt);cache({...out,authenticated:true});window.dispatchEvent(new CustomEvent("setka:v40-account",{detail:safeState({...out,authenticated:true})}));C.showMe();setTimeout(()=>refresh(true),900)}catch(e){m.textContent=friendly(e)}finally{go.disabled=false}},true);}

  async function showRecover(){const st=await refresh(true),b=screen("Восстановить кабинет","Если пароль забыт, исследователь SETKA может выдать одноразовый recovery-код. Новый пароль задаёшь только ты.","ВОССТАНОВЛЕНИЕ"),f=document.createElement("div");f.className="st40-form";b.appendChild(f);const id=field(f,"Tester ID","text",st?.testerId||""),code=field(f,"Recovery-код","text"),p1=field(f,"Новый пароль","password"),p2=field(f,"Повтори новый пароль","password"),m=msg(f),go=button(f,"Задать новый пароль",null,async()=>{if(p1.value!==p2.value){m.textContent="Пароли не совпадают";return}go.disabled=true;m.textContent="Проверяем recovery-код…";try{const out=await post({action:"recover-password",testerId:id.value,recoveryCode:code.value,newPassword:p1.value,deviceId:did(),userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1}});setSession(out.sessionToken,out.sessionExpiresAt);cache({...out,authenticated:true});window.dispatchEvent(new CustomEvent("setka:v40-account",{detail:safeState({...out,authenticated:true})}));C.showMe();setTimeout(()=>refresh(true),900)}catch(e){m.textContent=friendly(e)}finally{go.disabled=false}},true);button(f,"Вернуться ко входу",null,showLogin);}
  async function showLogin(){const st=await refresh(true),b=screen("Войти в кабинет","SETKA по-прежнему работает без входа. Авторизация нужна для доступа к приватному персональному контуру тестировщика.","ТЕСТИРОВАНИЕ"),f=document.createElement("div");f.className="st40-form";b.appendChild(f);const id=field(f,"Tester ID","text",st?.testerId||""),pw=field(f,"Пароль","password"),m=msg(f),go=button(f,"Войти",null,async()=>{go.disabled=true;m.textContent="Входим…";try{const out=await post({action:"login",testerId:id.value,password:pw.value,deviceId:did(),userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1}});setSession(out.sessionToken,out.sessionExpiresAt);cache({...out,authenticated:true});window.dispatchEvent(new CustomEvent("setka:v40-account",{detail:safeState({...out,authenticated:true})}));C.showMe();setTimeout(()=>refresh(true),900)}catch(e){m.textContent=friendly(e)}finally{go.disabled=false}},true);button(f,"Восстановить по recovery-коду","Если не помнишь пароль",showRecover);}

  async function showConsent(){const st=await refresh(true);if(!st?.authenticated)return showLogin();const b=screen("Приватность и исследовательский режим","Личный корпус доступен SETKA только внутри приватного кабинета и используется для персонализации. В общий исследовательский слой уходят отдельные обезличенные показатели.","ПРИВАТНОСТЬ"),f=document.createElement("div");f.className="st40-form";b.appendChild(f);const c=document.createElement("label");c.className="st40-check";const cb=document.createElement("input");cb.type="checkbox";const tx=document.createElement("span");tx.textContent=CONSENT_TEXT;c.append(cb,tx);f.appendChild(c);const m=msg(f),go=button(f,"Подтвердить участие",null,async()=>{if(!cb.checked){m.textContent="Нужно подтвердить текст выше";return}try{const s=session(),out=await post({action:"accept-consent",sessionToken:s?.token,acceptConsent:true,consentVersion:CONSENT_VERSION});cache(out);window.dispatchEvent(new CustomEvent("setka:v40-account",{detail:out}));C.showMe()}catch(e){m.textContent=friendly(e)}},true);}

  async function showChangePassword(){const b=screen("Сменить пароль","Новый пароль заменит старый. Другие активные сессии кабинета будут завершены.","КАБИНЕТ"),f=document.createElement("div");f.className="st40-form";b.appendChild(f);const cur=field(f,"Текущий пароль","password"),p1=field(f,"Новый пароль","password"),p2=field(f,"Повтори новый пароль","password"),m=msg(f),go=button(f,"Сохранить новый пароль",null,async()=>{if(p1.value!==p2.value){m.textContent="Пароли не совпадают";return}try{const s=session(),out=await post({action:"change-password",sessionToken:s?.token,currentPassword:cur.value,newPassword:p1.value});cache(out);m.textContent="Пароль обновлён"}catch(e){m.textContent=friendly(e)}},true);}

  async function logout(){const s=session();try{if(s?.token)await post({action:"logout",sessionToken:s.token})}catch(_){}clearSession();await refresh(true);window.dispatchEvent(new CustomEvent("setka:v40-account",{detail:{authenticated:false}}));C.showMe()}

  function syncMessage(cp={}){
    if(cp.ok===true&&cp.updatedAt){
      const when=new Date(cp.updatedAt).toLocaleString("ru-RU",{dateStyle:"short",timeStyle:"short"});
      return cp.restored?`Облачный архив получен. Последнее обновление: ${when}`:`Последняя передача истории: ${when}`;
    }
    if(cp.enabled&&cp.ok===false)return "Не удалось синхронизировать историю. Данные остаются на устройстве; попробуй ещё раз.";
    return "Передача истории в облачный архив ожидается.";
  }
  async function showCabinet(){
    const st=await refresh(true);if(!st?.authenticated)return showLogin();
    const cp=corpus()||{},b=screen("Аккаунт SETKA","Состояние входа и личного облачного архива.","МОЯ SETKA"),card=document.createElement("div");
    card.className="st40-card";
    card.innerHTML=`<div class="st40-id">${esc(st.testerId)}</div><div class="st40-copy">История, заметки, состояния и сохранённые паттерны находятся в обычных разделах SETKA. После успешной синхронизации их копия доступна в личном облачном архиве.</div><div class="st40-ok"><span class="st40-dot ${cp.ok===true?"":"off"}"></span>${esc(syncMessage(cp))}</div><div class="st40-ok"><span class="st40-dot ${st.consented?"":"off"}"></span>${st.consented?"Исследовательский режим включён":"Нужно подтвердить актуальные условия"}</div>`;
    const wrap=document.createElement("div");wrap.id="st40TesterCabinet";wrap.className="st40-section";wrap.appendChild(card);b.appendChild(wrap);
    const syncButton=button(b,"Синхронизировать сейчас","Обновить личный архив и общие показатели",async()=>{
      syncButton.disabled=true;syncButton.textContent="Синхронизация…";
      try{
        const ok=await window.__SETKA_PRIVATE_CORPUS_V40__?.sync?.();
        if(ok)await C.sandbox?.sync?.();
      }finally{await showCabinet()}
    });
    if(!st.consented)button(b,"Подтвердить актуальные условия",null,showConsent,true);
    button(b,'Пригласить в SETKA','Создать пригласительный ID и посмотреть, кто его принял',showInvites);
    button(b,"Сменить пароль",null,showChangePassword);
    button(b,"Выйти","Личные заметки и история останутся в этом браузере даже после выхода.",logout);
  }

  async function showInvites(){
    const st=await refresh(true);if(!st?.authenticated)return showLogin();
    const b=C.screen('Приглашения','Каждый новый ID закрепляется за твоим аккаунтом. Другой человек принимает приглашение и создаёт свой пароль.','АККАУНТ',showCabinet);
    const f=document.createElement('div');f.className='st40-form';f.id='st40InvitePanel';b.append(f);
    const name=field(f,'Название или назначение приглашений','text','Мои приглашения'),qty=field(f,'Сколько новых ID','number','1');name.maxLength=120;qty.min='1';qty.step='1';
    const message=msg(f),result=document.createElement('div');f.append(result);let generated=[];
    const copy=button(f,'Скопировать выданные коды',null,async()=>{try{await navigator.clipboard.writeText(generated.map(x=>`${x.testerId}: ${x.code}`).join('\n'));message.textContent='Коды скопированы'}catch(_){message.textContent='Выдели и скопируй коды ниже'}});copy.hidden=true;
    const go=button(f,'Создать пригласительные ID',null,async()=>{
      const total=Number(qty.value),label=name.value.trim();if(!label||label.length>120||!Number.isInteger(total)||total<1||total>2147483647){message.textContent='Введи название и целое количество больше нуля';return}
      go.disabled=true;name.disabled=true;qty.disabled=true;generated=[];result.replaceChildren();copy.hidden=true;let batchId=null;
      try{while(generated.length<total&&f.isConnected){const out=await post({action:'issue-invites',sessionToken:session()?.token,label,count:Math.min(100,total-generated.length),requestedCount:total,batchId,requestId:crypto.randomUUID()});batchId=out.batchId;generated.push(...out.items);result.textContent=generated.map(x=>`${x.testerId}: ${x.code}`).join('\n');result.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.7;user-select:text';copy.hidden=false;message.textContent=`Создано ${generated.length} из ${total}. Скопируй коды до закрытия карточки: повторно они не показываются.`;}
      }catch(_){message.textContent=`Выдача прервалась. Получено кодов: ${generated.length}. Скопируй их и обнови историю; перед повторной выдачей проверь созданные ID.`}
      finally{go.disabled=false;name.disabled=false;qty.disabled=false;await loadList();}
    },true);
    const list=document.createElement('div');b.append(list);
    async function loadList(){try{const out=await post({action:'my-invites',sessionToken:session()?.token});if(!list.isConnected)return;list.innerHTML=`<h3>Мои приглашения · ${out.items.length}</h3>`;for(const x of out.items){const row=document.createElement('article');row.className='st40-card';row.innerHTML=`<b>${esc(x.invite_label||'Без названия')}</b><p>${esc(x.tester_id)}</p><div class="st40-copy">${!x.active?'Отключён':x.password_set_at?'Аккаунт создан':x.consumed_at?'Приглашение принято':'Ожидает активации'} · ${esc(C.dt(x.created_at))}</div>`;list.append(row)}if(!out.items.length)list.insertAdjacentHTML('beforeend','<p class="st40-copy">Ты пока не выдавал приглашения.</p>');if(out.truncated)list.insertAdjacentHTML('beforeend','<p class="st40-copy">Показаны последние 10 000 приглашений.</p>')}catch(_){list.textContent='Не удалось загрузить приглашения. Обнови карточку.'}}
    await loadList();
  }
  function isMeScreen(){
    const layer=document.getElementById("st34Layer");
    return !!layer&&!layer.classList.contains("hidden")&&layer.querySelector(".st-title")?.textContent?.trim()==="Я";
  }
  async function openAccount(){
    const st=await refresh(true);
    if(st?.authenticated)return showCabinet();
    if(!st?.claimed)return showClaim();
    if(!st.hasPassword)return showSetPassword();
    return showLogin();
  }
  function renderMe(){
    if(!isMeScreen())return;
    const header=document.querySelector("#st34Layer .st-top");
    if(!header)return;
    // A small header entry replaces the always-visible account and technical cards.
    // This continues to work when the Me screen is re-rendered after navigation.
    const old=document.getElementById("st37MeTools");
    if(old)old.style.display="none";
    let button=header.querySelector("#st40AccountButton");
    if(!button){
      button=document.createElement("button");
      button.type="button";
      button.id="st40AccountButton";
      button.className="st40-account-shortcut";
      button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M5.5 20v-1.5a6.5 6.5 0 0 1 13 0V20"></path></svg><span class="st40-account-shortcut-label">Аккаунт</span>';
      button.addEventListener("click",openAccount);
      header.appendChild(button);
    }
    const authenticated=!!cached()?.authenticated;
    button.title=authenticated?"Аккаунт SETKA · вход выполнен":"Аккаунт SETKA · вход";
    button.setAttribute("aria-label",button.title);
    let dot=button.querySelector(".st40-account-shortcut-dot");
    if(authenticated&&!dot){dot=document.createElement("span");dot.className="st40-account-shortcut-dot";dot.setAttribute("aria-hidden","true");button.appendChild(dot)}
    else if(!authenticated&&dot)dot.remove();
  }
  const layer=document.getElementById("st34Layer");
  const mo=new MutationObserver(records=>{
    let sawMeTools=false;
    for(const record of records){
      for(const node of record.addedNodes){
        if(node.nodeType!==1)continue;
        if(node.id==="stBody"||node.querySelector?.("#stBody")||node.id==="st37MeTools"||node.querySelector?.("#st37MeTools")){sawMeTools=true;break}
      }
      if(sawMeTools)break;
    }
    if(sawMeTools){clearTimeout(timer);timer=setTimeout(renderMe,0)}
  });
  if(layer)mo.observe(layer,{childList:true,subtree:true});
  window.addEventListener("setka:v40-research-bridge",renderMe);window.addEventListener("setka:v40-private-corpus",renderMe);window.addEventListener("setka:v40-account",e=>{const d=e?.detail;if(d?.authenticated)cache({...cached(),...safeState(d),authenticated:true});renderMe()});
  setTimeout(async()=>{cached();renderMe();await refresh(true);renderMe()},700);
  window.__SETKA_TESTER_CABINET_V40__={refresh:()=>refresh(true),show:showCabinet,recover:showRecover,state:()=>cached(),logout};
})();
