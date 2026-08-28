(()=>{
'use strict';
const API='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-v018';
const RECOVERY_SESSION='setka:foundation:president:recovery-session';
const CONTROL_SESSION='setka:foundation:president:control-session';
const PRESIDENT_SESSION='setka:foundation:president:session';
const LEGACY_SESSION_MAP='setka:foundation:president:sessions-by-version';
const $=id=>document.getElementById(id);
let session='';
async function rawCall(action,payload={},token=''){const headers={'content-type':'application/json'};if(token)headers['x-setka-session']=token;const r=await fetch(API,{method:'POST',headers,body:JSON.stringify({action,...payload})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||d.error||`HTTP ${r.status}`);return d;}
function persistSystemSession(token){session=token||'';try{if(session){localStorage.setItem(RECOVERY_SESSION,session);localStorage.setItem(CONTROL_SESSION,session);localStorage.setItem(PRESIDENT_SESSION,session)}else{localStorage.removeItem(RECOVERY_SESSION);localStorage.removeItem(CONTROL_SESSION);localStorage.removeItem(PRESIDENT_SESSION)}localStorage.removeItem(LEGACY_SESSION_MAP)}catch{}}
function setStatus(msg,kind=''){const el=$('status');el.textContent=msg;el.dataset.kind=kind;}
function showApp(){$('login').hidden=true;$('app').hidden=false;}
function showLogin(){$('app').hidden=true;$('login').hidden=false;}
function renderSnapshot(s){const c=s?.counts||{};$('who').textContent='SETKA-0001-0001 · PRESIDENT';$('counts').innerHTML=`<div><b>${c.users??'—'}</b><span>Люди</span></div><div><b>${c.synthetics??'—'}</b><span>Синтетики</span></div><div><b>${c.opens??'—'}</b><span>Открытия</span></div><div><b>${c.favorites??'—'}</b><span>♥</span></div>`;}
async function enter(){const d=await rawCall('admin_snapshot',{},session);persistSystemSession(session);renderSnapshot(d.snapshot);showApp();setStatus('Президент подтверждён. Активна единая сессия всего корабля — версии являются внутренними состояниями, отдельный вход в них не требуется.','ok');}
async function login(){setStatus('Проверяю единый Президентский доступ к SETKA…');const id=$('presidentId').value.trim().toUpperCase();const key=$('presidentKey').value.trim();try{const d=await rawCall('president_login',{setkaId:id,presidentKey:key});persistSystemSession(d.sessionToken);await enter();}catch(e){persistSystemSession('');setStatus(e.message==='invalid_credentials'?'Неверный SETKA ID или ключ.':`Ошибка входа: ${e.message}`,'error');}}
async function restore(){try{session=localStorage.getItem(CONTROL_SESSION)||localStorage.getItem(RECOVERY_SESSION)||localStorage.getItem(PRESIDENT_SESSION)||''}catch{session=''}if(!session)return;try{await enter()}catch{persistSystemSession('');showLogin();}}
function enterMother(){if(!session){setStatus('Сначала нужен подтверждённый Президентский вход.','error');return;}persistSystemSession(session);setStatus('Открываю материнский SETKA с единой Президентской сессией…','ok');location.assign('foundation-president.html?ingress=emergency-elevator&build=021-system-session');}
async function loadProtocol(){$('panel').textContent='Загружаю протокол…';try{const d=await rawCall('admin_protocol',{},session);const p=d.protocol||{};const ptr=p.pointers||{};const versions=(p.versions||[]).slice().reverse().slice(0,12);$('panel').innerHTML=`<h2>Протокол</h2><p>CANON ${ptr.canon||'—'} · WORKING ${ptr.working||'—'} · STABLE ${ptr.stable||'—'}</p>${versions.map(v=>`<div class="item"><b>Foundation ${v.version}</b><span>${v.status||'—'}</span></div>`).join('')}`;}catch(e){$('panel').textContent=`Ошибка протокола: ${e.message}`;}}
async function refresh(){try{const d=await rawCall('admin_snapshot',{},session);renderSnapshot(d.snapshot);setStatus('Данные обновлены.','ok');}catch(e){setStatus(`Ошибка обновления: ${e.message}`,'error');}}
async function logout(){try{if(session)await rawCall('logout',{},session)}catch{}persistSystemSession('');showLogin();setStatus('Единая Президентская сессия SETKA завершена.');}
$('loginButton').addEventListener('click',login);$('presidentKey').addEventListener('keydown',e=>{if(e.key==='Enter')login()});$('enterMother').addEventListener('click',enterMother);$('refresh').addEventListener('click',refresh);$('protocol').addEventListener('click',loadProtocol);$('logout').addEventListener('click',logout);restore();
})();