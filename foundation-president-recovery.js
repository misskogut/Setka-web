(()=>{
'use strict';
const API='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-v018';
const SESSION_KEY='setka:foundation:president:recovery-session';
const $=id=>document.getElementById(id);
let session='';
async function call(action,payload={}){
  const headers={'content-type':'application/json'};
  if(session) headers['x-setka-session']=session;
  const r=await fetch(API,{method:'POST',headers,body:JSON.stringify({action,...payload})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.detail||d.error||`HTTP ${r.status}`);
  return d;
}
function setStatus(msg,kind=''){const el=$('status');el.textContent=msg;el.dataset.kind=kind;}
function showApp(){ $('login').hidden=true; $('app').hidden=false; }
function showLogin(){ $('app').hidden=true; $('login').hidden=false; }
function renderSnapshot(s){
  const c=s?.counts||{};
  $('who').textContent='SETKA-0001-0001 · PRESIDENT';
  $('counts').innerHTML=`<div><b>${c.users??'—'}</b><span>Люди</span></div><div><b>${c.synthetics??'—'}</b><span>Синтетики</span></div><div><b>${c.opens??'—'}</b><span>Открытия</span></div><div><b>${c.favorites??'—'}</b><span>♥</span></div>`;
}
async function enter(){
  const d=await call('admin_snapshot');
  renderSnapshot(d.snapshot);
  showApp();
  setStatus('Вход подтверждён. Back отвечает, сессия активна.','ok');
}
async function login(){
  setStatus('Проверяю вход…');
  const id=$('presidentId').value.trim().toUpperCase();
  const key=$('presidentKey').value.trim();
  try{
    const d=await call('president_login',{setkaId:id,presidentKey:key});
    session=d.sessionToken;
    try{localStorage.setItem(SESSION_KEY,session)}catch{}
    await enter();
  }catch(e){
    session='';
    try{localStorage.removeItem(SESSION_KEY)}catch{}
    setStatus(e.message==='invalid_credentials'?'Неверный SETKA ID или ключ.':`Ошибка входа: ${e.message}`,'error');
  }
}
async function restore(){
  try{session=localStorage.getItem(SESSION_KEY)||''}catch{}
  if(!session) return;
  try{await enter()}catch{session='';try{localStorage.removeItem(SESSION_KEY)}catch{};showLogin();}
}
async function loadProtocol(){
  $('panel').textContent='Загружаю протокол…';
  try{
    const d=await call('admin_protocol');
    const p=d.protocol||{};
    const ptr=p.pointers||{};
    const versions=(p.versions||[]).slice().reverse().slice(0,12);
    $('panel').innerHTML=`<h2>Протокол</h2><p>CANON ${ptr.canon||'—'} · WORKING ${ptr.working||'—'} · STABLE ${ptr.stable||'—'}</p>${versions.map(v=>`<div class="item"><b>Foundation ${v.version}</b><span>${v.status||'—'}</span></div>`).join('')}`;
  }catch(e){$('panel').textContent=`Ошибка протокола: ${e.message}`;}
}
async function refresh(){try{const d=await call('admin_snapshot');renderSnapshot(d.snapshot);setStatus('Данные обновлены.','ok');}catch(e){setStatus(`Ошибка обновления: ${e.message}`,'error');}}
function logout(){session='';try{localStorage.removeItem(SESSION_KEY)}catch{};showLogin();setStatus('Сессия очищена.');}
$('loginButton').addEventListener('click',login);
$('presidentKey').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
$('refresh').addEventListener('click',refresh);
$('protocol').addEventListener('click',loadProtocol);
$('logout').addEventListener('click',logout);
restore();
})();
