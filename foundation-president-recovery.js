(()=>{
'use strict';
const API='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-v018';
const PROJECT_API='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-v016';
const SESSION_KEY='setka:foundation:president:recovery-session';
const PRESIDENT_SESSION='setka:foundation:president:session';
const $=id=>document.getElementById(id);
let session='';
let projectSession='';
function persistSessions(recoveryToken,projectToken){try{if(recoveryToken)localStorage.setItem(SESSION_KEY,recoveryToken);else localStorage.removeItem(SESSION_KEY);if(projectToken)localStorage.setItem(PRESIDENT_SESSION,projectToken);else localStorage.removeItem(PRESIDENT_SESSION)}catch{}}
async function rawCall(url,action,payload={},token='',headersExtra={}){const headers={'content-type':'application/json',...headersExtra};if(token)headers['x-setka-session']=token;const r=await fetch(url,{method:'POST',headers,body:JSON.stringify({action,...payload})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||d.error||`HTTP ${r.status}`);return d;}
async function call(action,payload={}){return rawCall(API,action,payload,session)}
async function projectLogin(id,key){return rawCall(PROJECT_API,'president_login',{setkaId:id,presidentKey:key,pairVersion:'0.1.6'},'',{'x-setka-foundation-version':'0.1.6'})}
function setStatus(msg,kind=''){const el=$('status');el.textContent=msg;el.dataset.kind=kind;}
function showApp(){$('login').hidden=true;$('app').hidden=false;}
function showLogin(){$('app').hidden=true;$('login').hidden=false;}
function renderSnapshot(s){const c=s?.counts||{};$('who').textContent='SETKA-0001-0001 · PRESIDENT';$('counts').innerHTML=`<div><b>${c.users??'—'}</b><span>Люди</span></div><div><b>${c.synthetics??'—'}</b><span>Синтетики</span></div><div><b>${c.opens??'—'}</b><span>Открытия</span></div><div><b>${c.favorites??'—'}</b><span>♥</span></div>`;}
async function enter(){const d=await call('admin_snapshot');persistSessions(session,projectSession);renderSnapshot(d.snapshot);showApp();setStatus(projectSession?'Вход подтверждён. Аварийный лифт готов передать проектную сессию без второго логина.':'Recovery-сессия активна, но для бесшовного входа в проект нужен один повторный вход после обновления лифта.','ok');}
async function login(){setStatus('Проверяю вход и скрепляю две сессии…');const id=$('presidentId').value.trim().toUpperCase();const key=$('presidentKey').value.trim();try{const d=await rawCall(API,'president_login',{setkaId:id,presidentKey:key});session=d.sessionToken;const p=await projectLogin(id,key);projectSession=p.sessionToken;persistSessions(session,projectSession);await enter();}catch(e){session='';projectSession='';persistSessions('','');setStatus(e.message==='invalid_credentials'?'Неверный SETKA ID или ключ.':`Ошибка входа: ${e.message}`,'error');}}
async function restore(){try{session=localStorage.getItem(SESSION_KEY)||'';projectSession=localStorage.getItem(PRESIDENT_SESSION)||''}catch{}if(!session)return;try{await enter()}catch{session='';projectSession='';persistSessions('','');showLogin();}}
function enterMother(){if(!session){setStatus('Сначала нужен подтверждённый президентский вход.','error');return;}if(!projectSession||projectSession===session){setStatus('Обновлённому лифту нужно один раз заново принять ID/ключ, чтобы выпустить отдельную проектную сессию. Выйди и войди в лифт ещё раз.','error');return;}persistSessions(session,projectSession);setStatus('Передаю проектную President-сессию внутрь материнского SETKA…','ok');location.assign('foundation-president.html?ingress=emergency-elevator&build=018-yandex-unfreeze1');}
async function loadProtocol(){$('panel').textContent='Загружаю протокол…';try{const d=await call('admin_protocol');const p=d.protocol||{};const ptr=p.pointers||{};const versions=(p.versions||[]).slice().reverse().slice(0,12);$('panel').innerHTML=`<h2>Протокол</h2><p>CANON ${ptr.canon||'—'} · WORKING ${ptr.working||'—'} · STABLE ${ptr.stable||'—'}</p>${versions.map(v=>`<div class="item"><b>Foundation ${v.version}</b><span>${v.status||'—'}</span></div>`).join('')}`;}catch(e){$('panel').textContent=`Ошибка протокола: ${e.message}`;}}
async function refresh(){try{const d=await call('admin_snapshot');renderSnapshot(d.snapshot);setStatus('Данные обновлены.','ok');}catch(e){setStatus(`Ошибка обновления: ${e.message}`,'error');}}
function logout(){session='';projectSession='';persistSessions('','');showLogin();setStatus('Сессии лифта и проекта очищены.');}
$('loginButton').addEventListener('click',login);$('presidentKey').addEventListener('keydown',e=>{if(e.key==='Enter')login()});$('enterMother').addEventListener('click',enterMother);$('refresh').addEventListener('click',refresh);$('protocol').addEventListener('click',loadProtocol);$('logout').addEventListener('click',logout);restore();
})();