(function child(){
 "use strict";
 const linked=new URLSearchParams(location.search).get("setka_link")==="1";
 const api=()=>{try{return linked&&parent!==window?parent.SETKA_ALMA_CYCLE_LINK_V1:null}catch(_){return null}};
 window.SETKA_ALMA_STORAGE={getItem(k){return linked?api()?.getItem(k)??null:localStorage.getItem(k)},setItem(k,v){if(!linked)return localStorage.setItem(k,v);const a=api();if(!a)throw Error("cycle_link_unavailable");return a.setItem(k,v)}};
 if(!linked)return;let panel;
 function mount(){
  const scene=document.querySelector("#alma-cycle-root .phone-scene");if(!scene)return;
  if(!panel||!panel.isConnected){
   panel=document.createElement("section");panel.setAttribute("aria-label","Синхронизация цикла с SETKA");
   panel.className="alma-cycle-sync-panel";
   const heading=document.createElement("strong");heading.textContent="Мой цикл · SETKA";panel.append(heading);
   const status=document.createElement("p");status.dataset.cycleStatus="1";status.setAttribute("role","status");panel.append(status);
   function button(key,label,fn){const b=document.createElement("button");b.type="button";b.dataset.cycleControl=key;b.textContent=label;b.onclick=()=>{try{fn();update()}catch(e){status.textContent="Не удалось сохранить изменения на устройстве."}};panel.append(b)}
   button("legacy","Перенести прежнюю историю",()=>{if(confirm("Перенести прежние локальные записи ALMA в текущий профиль SETKA? Подтверди, что это твои данные. Перенос заполнит отсутствующие разделы."))api()?.importLegacy()});
   button("guest","Перенести историю с гостевого профиля",()=>{if(confirm("Подтверди, что гостевая история принадлежит тебе. Перенос заполнит отсутствующие разделы."))api()?.importGuest()});
   button("share","Подключить синхронизацию",()=>{const a=api(),s=a?.status();if(!s)return;
    if(s.sharing){if(confirm("Остановить дальнейшую передачу данных цикла? Ранее переданные записи могут оставаться в резервных копиях."))a.setSharing(false)}
    else if(confirm("Синхронизировать данные цикла с SETKA? Даты менструаций, настройки, история и все отметки, включая интимные, будут передаваться в общий архив и доступны авторизованной исследовательской админке под твоим ID или ID устройства. Продолжить?"))a.setSharing(true)
   });
   scene.append(panel);
  }update();
 }
 function update(){
  if(!panel)return;const s=api()?.status(),status=panel.querySelector("[data-cycle-status]");
  status.textContent=!s?"Связь с SETKA недоступна.":(s.owner.startsWith("tester:")?"Привязано к аккаунту SETKA. ":"Привязано к гостевому устройству. ")+(s.sharing?"Синхронизация разрешена.":"Данные пока хранятся на устройстве.")+(s.pending?" Новые данные получены; вернись на лицевую сторону карточки для обновления.":"")+(s.error?" Ошибка локального сохранения.":"");
  for(const key of ["legacy","guest"])panel.querySelector("[data-cycle-control='"+key+"']").hidden=!s?.[key+"Available"];
  const share=panel.querySelector("[data-cycle-control='share']");share.disabled=!s;share.textContent=s?.sharing?"Остановить синхронизацию":"Подключить синхронизацию и исследовательский учёт";
 }
 document.addEventListener("DOMContentLoaded",mount);setInterval(mount,1600);
})();
