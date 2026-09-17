(() => {
  "use strict";
  if(window.__SETKA_PRIVACY_CONTRACT_V40__)return;

  const ACCOUNT_PATH="/functions/v1/setka-tester-account-v40";
  const OLD_VERSION="research-v1-2026-09-17";
  const NEW_VERSION="research-v2-2026-09-17";
  const OLD_CONSENT="SETKA не запрашивает имя, телефон или электронную почту. Личная история, заметки, состояния и персональная аналитика хранятся на этом устройстве. Для исследовательского контура отправляются только обезличенные показатели взаимодействия с паттернами и конфигурациями; они агрегируются в карточках паттернов. Публичная публикация заметок возможна только отдельным действием пользователя и после модерации.";
  const NEW_CONSENT="SETKA не запрашивает имя, телефон или электронную почту. Личная история, заметки, состояния и персональная аналитика могут храниться в приватном контуре SETKA и использоваться системой для персонализации, динамики и восстановления кабинета. Эти данные не публикуются и не показываются другим пользователям. Визуальные превью паттернов по умолчанию создаются на устройстве и хранятся только во временном локальном кэше; источник истины — числовой рецепт паттерна. Для общего исследовательского слоя используются отдельные обезличенные показатели паттернов и конфигураций. Публичная публикация заметки возможна только отдельным действием пользователя и после модерации.";
  const CORPUS_KEY="setka-v40:private-corpus-status";
  const previousFetch=window.fetch.bind(window);

  function urlOf(input){try{return typeof input==="string"?input:(input?.url||"")}catch(_){return""}}
  function bodyOf(init){if(typeof init?.body!=="string")return null;try{return JSON.parse(init.body)}catch(_){return null}}

  window.fetch=function(input,init={}){
    const url=urlOf(input),body=bodyOf(init);
    if(url.includes(ACCOUNT_PATH)&&body&&(body.action==="set-password"||body.action==="accept-consent")&&body.consentVersion===OLD_VERSION){
      body.consentVersion=NEW_VERSION;
      init={...init,body:JSON.stringify(body)};
    }
    return previousFetch(input,init);
  };

  const replacements=[
    [OLD_CONSENT,NEW_CONSENT],
    ["Личная история останется на этом устройстве","Личная история будет храниться в приватном контуре SETKA"],
    ["Личная аналитика остаётся на устройстве. В карточки паттернов уходят только обезличенные агрегируемые показатели.","Персональная история используется SETKA внутри приватного контура. Публичный слой и общие карточки паттернов отделены от личной истории."],
    ["Личная история и персональная аналитика остаются в локальном корпусе этого устройства. Исследовательский слой получает только обезличенные вклады в карточки паттернов.","Персональная история и аналитика хранятся в приватном контуре SETKA и используются системой для персональной работы. Другим пользователям они не показываются."],
    ["Кабинет активен. Личная аналитика хранится локально; в исследовательскую базу уходят только обезличенные показатели паттернов.","Кабинет активен. Персональная история используется SETKA приватно; в публичное Сообщество она не попадает."],
    ["Tester ID подключён. Личная история остаётся на этом устройстве. Создай пароль, чтобы включить кабинет и обезличенный исследовательский мост.","Tester ID подключён. Создай пароль, чтобы SETKA могла приватно хранить и использовать твою историю для персональной работы."],
    ["Включит обезличенный исследовательский мост","Включит приватный персональный корпус и общий исследовательский слой"]
  ];

  function corpusStatus(){try{return JSON.parse(localStorage.getItem(CORPUS_KEY)||"null")}catch(_){return null}}
  function replaceText(root=document){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      let value=node.nodeValue||"",next=value;
      for(const [from,to] of replacements)if(next.includes(from))next=next.replaceAll(from,to);
      if(next!==value)node.nodeValue=next;
    }
  }
  async function renderStatus(){
    const wrap=document.getElementById("st40TesterCabinet");if(!wrap)return;
    let box=document.getElementById("st40PrivateCorpusStatus");if(!box){box=document.createElement("div");box.id="st40PrivateCorpusStatus";box.className="st40-card";wrap.appendChild(box)}
    const st=corpusStatus();
    let cacheCopy="Визуальные превью создаются на устройстве и могут быть очищены без потери заметок или конфигураций.";
    try{const s=await window.__SETKA_VISUAL_CACHE_V40__?.stats?.();if(s?.available)cacheCopy=`Визуальный кэш: ${Number(s.items)||0} превью · ${Math.round((Number(s.bytes)||0)/1024/1024*10)/10} МБ. Его можно очистить без потери данных.`}catch(_){}
    if(!st?.enabled){box.innerHTML=`<div class="st40-copy">Приватный персональный корпус подключится после входа в кабинет. Публичная SETKA при этом остаётся доступной без входа.</div><div class="st40-copy" style="margin-top:8px">${cacheCopy}</div>`;return}
    const c=st.counts||{};
    box.innerHTML=`<div class="st40-ok"><span class="st40-dot ${st.ok?"":"off"}"></span>${st.ok?"Приватный корпус синхронизирован":"Приватный корпус ожидает синхронизации"}</div><div class="st40-copy">${Number(c.sessions)||0} сессий · ${Number(c.notes)||0} личных заметок · ${Number(c.exposures)||0} экспозиций. Эти данные не публикуются другим пользователям.</div><div class="st40-copy" style="margin-top:8px">${cacheCopy}</div>`;
  }
  function apply(){replaceText(document);renderStatus()}
  const mo=new MutationObserver(()=>{clearTimeout(window.__setkaPrivacyContractTimer);window.__setkaPrivacyContractTimer=setTimeout(apply,20)});mo.observe(document.body,{childList:true,subtree:true,characterData:true});
  window.addEventListener("setka:v40-private-corpus",apply);
  window.addEventListener("setka:v40-account",apply);
  setTimeout(apply,300);

  window.__SETKA_PRIVACY_CONTRACT_V40__={version:3,consentVersion:NEW_VERSION,mode:"private-system-public-separated",visuals:"recipe-plus-device-cache"};
})();