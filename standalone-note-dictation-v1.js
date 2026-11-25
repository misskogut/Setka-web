(()=>{
 "use strict";
 if(window.SetkaNoteDictationV1)return;
 let active=null;
 const mounted=new WeakMap();
 const fallback="В этом браузере голосовой ввод недоступен. Используй микрофон на системной клавиатуре, если он есть.";
 function appendText(field,text){
  const phrase=String(text||"").trim();if(!phrase)return false;
  const old=field.value,sep=old&&!/\s$/.test(old)?" ":"";
  const next=old+sep+phrase,limit=field.maxLength>0?field.maxLength:5000;
  if(next.length>limit)return false;
  field.value=next;field.dispatchEvent(new Event("input",{bubbles:true}));return true;
 }
 function attach(field,save){
  if(!field||!field.parentNode)return null;
  if(mounted.has(field))return mounted.get(field);
  const wrap=document.createElement("div");wrap.className="st-note-dictation";
  field.parentNode.insertBefore(wrap,field);wrap.appendChild(field);
  const mic=document.createElement("button");mic.type="button";mic.className="st-note-mic";
  mic.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3m-3 0h6"/></svg>';
  const hint=document.createElement("p");hint.className="st-note-mic-status";hint.setAttribute("role","status");
  const notice=document.createElement("p");notice.className="st-note-mic-notice";notice.textContent="Речь распознаёт браузер; аудио может обрабатываться его сервисом. SETKA сохраняет только текст заметки.";
  wrap.appendChild(mic);wrap.after(hint,notice);
  const paint=(phase,message="")=>{
   mic.dataset.phase=phase;mic.setAttribute("aria-pressed",String(phase!=="idle"));
   const label=phase==="idle"?"Диктовать заметку":phase==="stopping"?"Завершение диктовки":"Остановить диктовку";
   mic.setAttribute("aria-label",label);mic.title=label;hint.textContent=message;
  };
  paint("idle");
  const visible=()=>field.isConnected&&!document.hidden&&!field.closest("#st34Layer.hidden");
  // One queued save per recognition session. The existing note save handler
  // is invoked only after the final speech results, never before them.
  function finish(session,{abort=false,commit=false,message=""}={}){
   if(active!==session)return;
   active=null;clearTimeout(session.timer);
   if(abort)try{session.rec.abort()}catch(_){}
   const queued=session.pendingSave;
   if(queued&&save)save.disabled=false;
   paint("idle",message);
   if(!commit||!queued||!visible()||!save?.isConnected)return;
   if(!field.value.trim()){paint("idle","Речь не распознана. Запиши текст или попробуй ещё раз.");return}
   // Re-enter the original form submit / gameplay save flow, with active
   // cleared so the capture listener cannot intercept the same save again.
   save.click();
  }
  const controller={field,stop:(discard=true,message="")=>{
   const session=active;if(session?.controller!==controller)return;
   if(discard){finish(session,{abort:true,message});return}
   if(session.stopping)return;session.stopping=true;paint("stopping",session.pendingSave?"Завершаем диктовку и сохраняем…":"Завершаем распознавание…");
   clearTimeout(session.timer);
   try{session.rec.stop()}catch(_){finish(session,{abort:true,commit:true,message:"Диктовка остановлена."});return}
   if(active===session)session.timer=setTimeout(()=>finish(session,{abort:true,commit:true,message:"Диктовка остановлена. Последние нераспознанные слова могут отсутствовать."}),4000);
  }};
  mic.onclick=()=>{
   if(active?.controller===controller){controller.stop(false);return}
   if(active)active.controller.stop(true);
   const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
   if(!Recognition){paint("idle",fallback);field.focus();return}
   if(save?.disabled)return;
   let rec;try{rec=new Recognition()}catch(_){paint("idle",fallback);return}
   rec.lang="ru-RU";rec.continuous=true;rec.interimResults=true;rec.maxAlternatives=1;
   const session={controller,rec,done:new Set(),stopping:false,timer:0,pendingSave:false};
   active=session;
   const valid=()=>active===session&&visible();
   rec.onstart=()=>{if(valid()&&!session.stopping){clearTimeout(session.timer);paint("listening","Слушаю… Говори.")}};
   rec.onresult=ev=>{
    if(!valid())return;
    const interim=[];
    for(let i=ev.resultIndex||0;i<ev.results.length;i++){
     const result=ev.results[i],text=result[0]?.transcript||"";
     if(result.isFinal&&!session.done.has(i)){
      session.done.add(i);
      if(!appendText(field,text)&&text.trim()){finish(session,{abort:true,commit:true,message:"Достигнут лимит заметки."});return}
     }else if(!result.isFinal)interim.push(text);
    }
    if(!session.stopping)paint("listening",interim.length?"Распознаю: "+interim.join(" "):"Слушаю… Говори.");
   };
   rec.onerror=ev=>{
    if(active!==session)return;
    const message=({"not-allowed":"Разреши доступ к микрофону и распознаванию речи в настройках браузера.","service-not-allowed":"Сервис распознавания недоступен. "+fallback,"audio-capture":"Не удалось получить доступ к микрофону.","no-speech":"Речь не распознана. Попробуй ещё раз.","network":"Нет связи с сервисом распознавания. "+fallback,"language-not-supported":"Русский язык недоступен в сервисе браузера. "+fallback})[ev.error]||"Диктовка прервана. Распознанный текст остаётся в поле.";
    finish(session,{abort:true,commit:true,message});
   };
   rec.onend=()=>finish(session,{commit:true,message:"Диктовка завершена. Текст можно отредактировать."});
   paint("starting","Подключаем микрофон…");
   try{rec.start();if(active===session&&mic.dataset.phase==="starting")session.timer=setTimeout(()=>{if(active===session&&mic.dataset.phase==="starting")controller.stop(true,"Не удалось запустить микрофон. "+fallback)},15000)}
   catch(_){controller.stop(true,"Не удалось запустить микрофон. "+fallback)}
  };
  function queueSave(ev){
   const session=active;if(session?.controller!==controller)return;
   ev.preventDefault();ev.stopImmediatePropagation();
   if(session.pendingSave)return;
   session.pendingSave=true;
   if(save)save.disabled=true;
   if(session.stopping)paint("stopping","Завершаем диктовку и сохраняем…");
   else controller.stop(false);
  }
  // The click is intercepted even while the required textarea is empty;
  // final words may arrive only after stop(). Form submit covers Enter.
  if(save)save.addEventListener("click",queueSave,true);
  const form=field.closest("form");
  if(form)form.addEventListener("submit",queueSave,true);
  mounted.set(field,controller);return controller;
 }
 function stop(){if(active)active.controller.stop(true)}
 const layer=document.getElementById("st34Layer");
 const watch=()=>{if(active&&(!active.controller.field.isConnected||active.controller.field.closest("#st34Layer.hidden")))stop()};
 if(layer&&typeof MutationObserver==="function")new MutationObserver(watch).observe(layer,{attributes:true,attributeFilter:["class"],childList:true,subtree:true});
 for(const event of ["pagehide","setka:account-switch-start","setka:local-reset-started"])window.addEventListener(event,stop);
 document.addEventListener("visibilitychange",()=>{if(document.hidden)stop()});
 window.SetkaNoteDictationV1={attach,appendText,stop};
})();
