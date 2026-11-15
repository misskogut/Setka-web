// SETKA local-first personal recovery. No cloud requests and no credentials in the backup.
// A user may save the encrypted JSON in their own Files or private cloud storage.
(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;

  const FORMAT="setka-personal-encrypted-backup-v1";
  const CONTENT="setka-personal-history-v1";
  const ITERATIONS=250000;
  const MAX_PLAINTEXT=24*1024*1024;
  const MAX_FILE=48*1024*1024;
  const KINDS=["sessions","notes","symptoms","checkins","events","patternExposures",
    "activityIntervals","openedPatterns","invites"];
  const clone=x=>JSON.parse(JSON.stringify(x));
  const currentScope=()=>String(window.SetkaDataScopeV1?.id||"guest");
  const b64=x=>{
    const bytes=x instanceof Uint8Array?x:new Uint8Array(x);
    let output="";
    for(let i=0;i<bytes.length;i+=8192)output+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(output);
  };
  const raw=encoded=>{
    if(typeof encoded!=="string"||encoded.length>MAX_FILE*2)throw Error("invalid_encrypted_backup");
    const data=atob(encoded),out=new Uint8Array(data.length);
    for(let i=0;i<data.length;i++)out[i]=data.charCodeAt(i);
    return out;
  };
  async function key(pass,salt){
    if(!crypto?.subtle)throw Error("secure_browser_required");
    if(typeof pass!=="string"||pass.length<12)throw Error("passphrase_too_short");
    const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(pass),
      {name:"PBKDF2"},false,["deriveKey"]);
    return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:ITERATIONS,hash:"SHA-256"},base,
      {name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  }
  function archiveData(){
    const d=C.getData?.();
    if(!d||typeof d!=="object")throw Error("personal_archive_unavailable");
    const p={version:Number(d.version)||34,createdAt:d.createdAt||null};
    for(const name of KINDS)p[name]=Array.isArray(d[name])?clone(d[name]):[];
    p.physio=d.physio&&typeof d.physio==="object"?clone(d.physio):{samples:[],sources:[]};
    p.settings=d.settings&&typeof d.settings==="object"&&!Array.isArray(d.settings)?clone(d.settings):{};
    const fav=Setka.getFavorites?.();
    return {kind:CONTENT,scope:currentScope(),createdAt:new Date().toISOString(),
      personal:p,favorites:Array.isArray(fav)?clone(fav):[]};
  }
  async function exportArchive(pass){
    if(C.ready)await C.ready;
    const payload=archiveData();
    const clear=new TextEncoder().encode(JSON.stringify(payload));
    if(clear.byteLength>MAX_PLAINTEXT)throw Error("archive_too_large");
    const salt=crypto.getRandomValues(new Uint8Array(16));
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},await key(pass,salt),clear);
    return {format:FORMAT,version:1,kdf:"PBKDF2-SHA256",iterations:ITERATIONS,
      algorithm:"AES-256-GCM",salt:b64(salt),iv:b64(iv),ciphertext:b64(cipher)};
  }
  async function restoreArchive(content,pass){
    const file=typeof content==="string"?JSON.parse(content):content;
    if(!file||file.format!==FORMAT||file.version!==1||
      file.kdf!=="PBKDF2-SHA256"||file.iterations!==ITERATIONS||
      file.algorithm!=="AES-256-GCM"||typeof file.ciphertext!=="string"||
      file.ciphertext.length>MAX_FILE*2)throw Error("invalid_encrypted_backup");
    const salt=raw(file.salt),iv=raw(file.iv),bytes=raw(file.ciphertext);
    if(salt.length!==16||iv.length!==12||bytes.length>MAX_FILE)throw Error("invalid_encrypted_backup");
    let clear;
    try{clear=await crypto.subtle.decrypt({name:"AES-GCM",iv},await key(pass,salt),bytes)}
    catch(_){throw Error("bad_passphrase_or_corrupted_file")}
    if(clear.byteLength>MAX_PLAINTEXT)throw Error("archive_too_large");
    const payload=JSON.parse(new TextDecoder().decode(clear));
    if(!payload||payload.kind!==CONTENT||typeof payload.scope!=="string"||
      !payload.personal||typeof payload.personal!=="object"||
      !Array.isArray(payload.favorites)||payload.favorites.length>10000)throw Error("invalid_archive_content");
    const owner=currentScope();
    // Prevent a tester's private history from merging into another account or guest.
    if(payload.scope.startsWith("tester:")&&payload.scope!==owner)throw Error("different_account");
    if(owner.startsWith("tester:")&&payload.scope.startsWith("tester:")&&owner!==payload.scope)
      throw Error("different_account");
    for(const name of KINDS){
      const a=payload.personal[name];if(!Array.isArray(a)||a.length>40000)throw Error("invalid_archive_content");
    }
    if(!payload.personal.settings||typeof payload.personal.settings!=="object"||
       Array.isArray(payload.personal.settings))throw Error("invalid_archive_content");
    const corpus=window.__SETKA_PRIVATE_CORPUS_V40__;
    if(typeof corpus?.mergeGuest!=="function")throw Error("archive_merge_unavailable");
    if(C.ready)await C.ready;
    const merged=await corpus.mergeGuest(payload.personal,payload.favorites);
    if(!merged)throw Error("archive_merge_failed");
    if(C.whenSaved&&await C.whenSaved()===false)throw Error("local_storage_unavailable");
    window.dispatchEvent(new CustomEvent("setka:states-restored"));
    window.dispatchEvent(new CustomEvent("setka:personal-archive-restored"));
    return merged;
  }
  function show(){
    const body=C.screen?.("Личный резерв","Зашифрованная копия заметок, состояний, сессий и избранного. Работает без Supabase.","НА УСТРОЙСТВЕ",C.showMe);
    if(!body)return;
    const add=(kind,text)=>{
      const el=document.createElement(kind);el.textContent=text;
      el.style.cssText=kind==="button"?
        "display:block;width:100%;padding:13px;margin:12px 0;border:1px solid #888;border-radius:12px;background:#222;color:white;font:inherit":
        "display:block;width:100%;padding:11px;margin:8px 0;border:1px solid #555;border-radius:8px;background:#111;color:white;font:inherit";
      body.appendChild(el);return el;
    };
    const hint=document.createElement("p");
    hint.textContent="Файл шифруется на этом телефоне. Никому не передавай пароль. Без него архив восстановить невозможно. В GitHub файл автоматически не отправляется. Не публикуй даже зашифрованный архив в открытом репозитории.";
    hint.style.cssText="font-size:12px;line-height:1.6;color:#bbb";
    body.appendChild(hint);
    const pass=add("input","");
    pass.type="password";pass.placeholder="Пароль для архива — минимум 12 символов";
    pass.autocomplete="new-password";pass.setAttribute("aria-label","Пароль резервной копии");
    const confirmField=add("input","");
    confirmField.type="password";confirmField.placeholder="Повтори пароль для архива";
    confirmField.autocomplete="new-password";
    const save=add("button","Сохранить зашифрованную копию");
    const file=add("input","");
    file.type="file";file.accept=".json,application/json";
    file.setAttribute("aria-label","Выбрать зашифрованную копию SETKA");
    const restore=add("button","Восстановить из файла");
    const status=document.createElement("p");status.setAttribute("role","status");
    status.style.cssText="white-space:pre-wrap;font-size:12px;line-height:1.6;color:#ddd";
    body.appendChild(status);
    const fail=e=>{
      const v=String(e?.message||e);
      status.textContent=({
        passphrase_too_short:"Пароль должен содержать минимум 12 символов.",
        invalid_encrypted_backup:"Неверный формат зашифрованной копии.",
        bad_passphrase_or_corrupted_file:"Неверный пароль или повреждённый файл.",
        different_account:"Этот архив принадлежит другому Tester ID. Нельзя смешивать личные данные.",
        archive_too_large:"Объём локальной истории слишком велик для одной мобильной копии.",
        secure_browser_required:"Для защиты файлов требуется HTTPS и WebCrypto.",
        local_storage_unavailable:"Не удалось подтвердить сохранение после восстановления."
      })[v]||"Не удалось завершить операцию. Личные данные не отправлялись на сервер.";
    };
    save.onclick=async()=>{
      if(pass.value!==confirmField.value){status.textContent="Пароли не совпадают.";return}
      save.disabled=true;status.textContent="Шифрую личную историю на устройстве…";
      try{
        const packet=await exportArchive(pass.value);
        const filename="SETKA-personal-encrypted-"+new Date().toISOString().slice(0,10)+".json";
        const blob=new Blob([JSON.stringify(packet)],{type:"application/json"});
        const url=URL.createObjectURL(blob),a=document.createElement("a");
        a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),30000);
        status.textContent="Зашифрованный архив подготовлен. Проверь, что файл сохранился в «Файлы», и не теряй пароль.";
      }catch(e){fail(e)}finally{pass.value="";confirmField.value="";save.disabled=false}
    };
    restore.onclick=async()=>{
      if(!file.files?.length){status.textContent="Сначала выбери файл резервной копии.";return}
      if(!pass.value){status.textContent="Введи пароль архива в первое поле.";return}
      if(!window.confirm("Объединить личные записи из файла с уже сохранёнными на этом устройстве?"))return;
      restore.disabled=true;status.textContent="Расшифровываю и объединяю личную историю…";
      try{
        const selected=file.files[0];
        if(selected.size>MAX_FILE){throw Error("archive_too_large")}
        const counts=await restoreArchive(await selected.text(),pass.value);
        status.textContent="Личная история восстановлена на этом устройстве: заметки "+
          (counts.notes||0)+", сессии "+(counts.sessions||0)+", события "+(counts.events||0)+
          ". Облачная синхронизация будет доступна после восстановления Supabase.";
      }catch(e){fail(e)}finally{pass.value="";confirmField.value="";restore.disabled=false}
    };
  }
  window.__SETKA_OFFLINE_BACKUP_V1__={show,exportArchive,restoreArchive,format:FORMAT};
})();
