// SETKA user-owned, browser-only encrypted local backup. Never contacts an API.
const FORMAT="setka-personal-encrypted-v1";
const CONTENT_FORMAT="setka-personal-content-v1";
const ROUNDS=240000, MAX_JSON=40*1024*1024;
const enc=new TextEncoder(),dec=new TextDecoder();
const fields=["sessions","notes","symptoms","checkins","events","patternExposures","activityIntervals","openedPatterns","invites"];
const plain=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const rand=(provider,n)=>provider.getRandomValues(new Uint8Array(n));
function toBase64(buf){
 const b=new Uint8Array(buf);let s="";
 for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));
 return btoa(s);
}
function fromBase64(s,max=MAX_JSON){
 if(typeof s!=="string"||s.length>Math.ceil(max*4/3)+20||s.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw Error("invalid_backup_file");
 const binary=atob(s),out=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);
 return out;
}
function validatePayload(payload,favorites){
 if(!plain(payload)||!Array.isArray(favorites)||favorites.length>10000||favorites.some(x=>!plain(x)))throw Error("invalid_personal_archive");
 for(const name of fields)if(!Array.isArray(payload[name])||payload[name].length>30000||payload[name].some(x=>!plain(x)))throw Error("invalid_personal_archive");
 if(!plain(payload.physio)||!Array.isArray(payload.physio.samples)||!Array.isArray(payload.physio.sources)||
   payload.physio.samples.length>30000||payload.physio.sources.length>2000||
   !plain(payload.settings))throw Error("invalid_personal_archive");
 return true;
}
async function keyFor(passphrase,salt,provider,usage){
 if(typeof passphrase!=="string"||passphrase.length<12||passphrase.length>500)throw Error("passphrase_minimum_12");
 const root=await provider.subtle.importKey("raw",enc.encode(passphrase),"PBKDF2",false,["deriveKey"]);
 return provider.subtle.deriveKey({name:"PBKDF2",salt,iterations:ROUNDS,hash:"SHA-256"},root,{name:"AES-GCM",length:256},false,[usage]);
}
export async function encryptPersonalBackup(data,passphrase,provider=globalThis.crypto){
 if(!provider?.subtle||!provider?.getRandomValues)throw Error("secure_browser_required");
 if(!plain(data)||data.format!==CONTENT_FORMAT||typeof data.scope!=="string"||!data.scope)throw Error("invalid_personal_archive");
 validatePayload(data.payload,data.favorites);
 const raw=enc.encode(JSON.stringify(data));
 if(raw.byteLength>MAX_JSON)throw Error("backup_too_large");
 const salt=rand(provider,16),iv=rand(provider,12);
 const key=await keyFor(passphrase,salt,provider,"encrypt");
 const encrypted=await provider.subtle.encrypt({name:"AES-GCM",iv},key,raw);
 return {format:FORMAT,kdf:"PBKDF2-SHA256",rounds:ROUNDS,cipher:"AES-256-GCM",
  salt:toBase64(salt),iv:toBase64(iv),payload:toBase64(encrypted)};
}
export async function decryptPersonalBackup(envelope,passphrase,provider=globalThis.crypto){
 if(!provider?.subtle)throw Error("secure_browser_required");
 if(!plain(envelope)||envelope.format!==FORMAT||envelope.kdf!=="PBKDF2-SHA256"||
   envelope.cipher!=="AES-256-GCM"||envelope.rounds!==ROUNDS)throw Error("invalid_backup_file");
 const salt=fromBase64(envelope.salt,32),iv=fromBase64(envelope.iv,24),bytes=fromBase64(envelope.payload,MAX_JSON+32);
 if(salt.length!==16||iv.length!==12)throw Error("invalid_backup_file");
 try{
  const key=await keyFor(passphrase,salt,provider,"decrypt");
  const raw=await provider.subtle.decrypt({name:"AES-GCM",iv},key,bytes);
  if(raw.byteLength>MAX_JSON)throw Error("invalid_backup_file");
  const data=JSON.parse(dec.decode(raw));
  if(!plain(data)||data.format!==CONTENT_FORMAT||typeof data.scope!=="string")throw Error("invalid_backup_file");
  validatePayload(data.payload,data.favorites);
  return data;
 }catch(error){
  if(String(error?.message||"")==="passphrase_minimum_12")throw error;
  throw Error("backup_password_or_file_invalid");
 }
}
export function checkBackupScope(data,scope,deviceId){
 if(!plain(data)||data.scope!==scope||!scope)throw Error("backup_other_account");
 // An encrypted guest archive is portable when its owner knows the passphrase.
 // Registered account archives still require the same tester ID.
 return true;
}
function personalPayload(C){
 const source=window.__SETKA_PRIVATE_CORPUS_V40__?.guestArchive?.();
 if(!plain(source))throw Error("local_archive_unavailable");
 const payload={version:Number(source.version)||41,createdAt:source.createdAt||null,
  physio:plain(source.physio)?source.physio:{samples:[],sources:[]},
  settings:plain(source.settings)?source.settings:{}};
 for(const name of fields)payload[name]=Array.isArray(source[name])?source[name]:[];
 return payload;
}
function statusText(error){
 const labels={passphrase_minimum_12:"Пароль архива должен содержать минимум 12 символов.",
  backup_other_account:"Этот архив принадлежит другому ID SETKA. Переключение аккаунта запрещено.",
  backup_too_large:"Архив слишком большой для безопасного сохранения в браузере.",
  secure_browser_required:"Браузер не поддерживает защищённое шифрование.",
  local_archive_unavailable:"Локальные данные пока недоступны.",
  backup_password_or_file_invalid:"Не удалось расшифровать: неправильный пароль или повреждённый файл.",
  invalid_backup_file:"Неверный формат резервного архива.",
  invalid_personal_archive:"В архиве обнаружены неподдерживаемые данные.",
  local_storage_unavailable:"Устройство не подтвердило сохранение. Исходный архив не удалён."};
 return labels[String(error?.message||"")]||"Не удалось завершить действие. Исходные данные не удалялись.";
}
async function prepareLocal(C){
 if(C.ready)await C.ready;
 C.save?.();
 if(C.whenSaved&&await C.whenSaved()!==true)throw Error("local_storage_unavailable");
}
function showVault(){
 const C=window.SetkaStandaloneV34;
 if(!C?.screen||!C?.getData)return;
 const panel=C.screen("Резервная копия","Зашифрованный личный архив создаётся только на устройстве. GitHub, Supabase и SETKA не получают содержимое или пароль архива.","ЛИЧНАЯ ПАМЯТЬ",C.showMe);
 const description=document.createElement("p");
 description.className="st40-copy";
 description.textContent="Содержит локальные заметки, сессии, состояния, события и избранное. Сохранённое только на сервере сюда не попадает. Гостевой архив переносится между устройствами; аккаунтный восстанавливается под тем же ID. Запомни пароль: восстановить его невозможно.";
 panel.appendChild(description);
 const pass=document.createElement("input");pass.type="password";pass.autocomplete="new-password";pass.placeholder="Пароль архива: минимум 12 символов";
 pass.setAttribute("aria-label","Пароль шифрования резервной копии");
 pass.style.cssText="box-sizing:border-box;width:100%;padding:14px;border-radius:14px;border:1px solid #666;background:#111;color:white;font-size:15px";
 panel.appendChild(pass);
 const message=document.createElement("p");message.setAttribute("role","status");
 message.className="st40-msg";message.style.whiteSpace="pre-wrap";panel.appendChild(message);
 const btn=(label,fn)=>{const b=document.createElement("button");b.type="button";b.className="st40-btn";b.textContent=label;b.onclick=()=>fn(b);panel.appendChild(b);return b};
 btn("Скачать зашифрованную копию",async b=>{
  b.disabled=true;message.textContent="Шифруем локальный архив…";
  try{
   await prepareLocal(C);
   const scope=window.SetkaDataScopeV1?.id||"guest";
   const deviceId=C.sandbox?.deviceId||null;
   if(scope==="guest"&&!deviceId)throw Error("local_archive_unavailable");
   const data={format:CONTENT_FORMAT,scope,deviceId,createdAt:new Date().toISOString(),
    payload:personalPayload(C),favorites:window.Setka?.getFavorites?.()||[]};
   const backup=await encryptPersonalBackup(data,pass.value);
   const file=new Blob([JSON.stringify(backup)],{type:"application/json"});
   const url=URL.createObjectURL(file),a=document.createElement("a");
   a.href=url;a.download="setka-personal-"+new Date().toISOString().slice(0,10)+".setkabak";
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
   message.textContent="Архив создан. Сохрани файл и пароль отдельно. На сервер ничего не отправлялось.";
  }catch(e){message.textContent=statusText(e)}finally{b.disabled=false}
 });
 const select=document.createElement("input");select.type="file";select.accept=".setkabak,application/json";
 select.setAttribute("aria-label","Выбрать архив SETKA");select.style.cssText="display:block;margin-top:18px;width:100%";
 panel.appendChild(select);
 btn("Восстановить из выбранного архива",async b=>{
  b.disabled=true;message.textContent="Проверяем и расшифровываем архив…";
  try{
   const f=select.files?.[0];if(!f||f.size>MAX_JSON*1.5)throw Error("invalid_backup_file");
   const envelope=JSON.parse(await f.text());
   const contents=await decryptPersonalBackup(envelope,pass.value);
   checkBackupScope(contents,window.SetkaDataScopeV1?.id,C.sandbox?.deviceId);
   await prepareLocal(C);
   const importer=window.__SETKA_PRIVATE_CORPUS_V40__?.mergeGuest;
   if(typeof importer!=="function")throw Error("local_archive_unavailable");
   await importer(contents.payload,contents.favorites);
   if(C.whenSaved&&await C.whenSaved()!==true)throw Error("local_storage_unavailable");
   window.dispatchEvent(new CustomEvent("setka:states-restored"));
   message.textContent="Данные объединены с существующей локальной историей. Ни один аккаунт не переключён. Облачное подтверждение пока не получено.";
  }catch(e){message.textContent=statusText(e)}finally{b.disabled=false}
 });
}
if(typeof window!=="undefined")window.SetkaPersonalOfflineVaultV1={show:showVault};
