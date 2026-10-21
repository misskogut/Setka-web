import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
const port=49742,base='http://127.0.0.1:'+port;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
try{
 for(let n=0;n<40;n++){try{if((await fetch(base+'/standalone-v34.html')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await(process.env.SETKA_BROWSER==='webkit'?webkit:chromium).launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>{
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){if(this===localStorage)throw new DOMException('Isolated full storage','QuotaExceededError');return original.call(this,k,v)};
 });
 const requests=[];
 await context.route('**/functions/v1/**',async route=>{
  let b={};try{b=route.request().postDataJSON()||{}}catch{}
  requests.push(b.action);
  let out={ok:true,items:[],notes:[],metrics:{},patternMetrics:[]};
  if(route.request().url().includes('setka-tester-account-v40')){
   const authenticated=b.action==='recover-password'||b.action==='login'||b.sessionToken==='isolated-token';
   out={ok:true,testerId:authenticated?'T-ISOLATED':null,authenticated,claimed:authenticated,hasPassword:authenticated,consented:true};
   if(b.action==='recover-password'||b.action==='login')out={...out,sessionToken:'isolated-token',sessionExpiresAt:'2099-01-01T00:00:00Z'};
  }
  if(b.action==='pull')out={ok:true,archive:null};
  await route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(out)});
 });
 const page=await context.newPage();await page.goto(base+'/standalone-v34.html');
 await page.evaluate(async()=>{await window.SetkaStandaloneV34.ready;await window.__SETKA_TESTER_CABINET_V40__.recover()});
 await page.getByLabel('Tester ID',{exact:true}).fill('T-ISOLATED');
 await page.getByLabel('Recovery-код',{exact:true}).fill('ISOLATED-ONLY');
 await page.getByLabel('Новый пароль',{exact:true}).fill('isolated-password');
 await page.getByLabel('Повтори новый пароль',{exact:true}).fill('isolated-password');
 await page.getByRole('button',{name:'Задать новый пароль',exact:true}).click();
 await page.waitForFunction(()=>window.SetkaDataScopeV1?.id==='tester:T-ISOLATED');
 assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('setka-v40:cabinet-session')).testerId),'T-ISOLATED');
 assert.equal(await page.evaluate(()=>window.SetkaDataScopeV1.legacyOwner()),'guest');
 await page.reload();await page.waitForFunction(()=>window.__SETKA_TESTER_CABINET_V40__?.state()?.authenticated===true);
 assert.equal(await page.evaluate(()=>window.SetkaDataScopeV1.id),'tester:T-ISOLATED');
 assert.ok(requests.includes('recover-password'));
 await page.evaluate(()=>{void window.__SETKA_TESTER_CABINET_V40__.logout()});
 await page.waitForFunction(()=>window.SetkaDataScopeV1?.id==='guest');
 await page.evaluate(async()=>{await window.SetkaStandaloneV34.ready;await window.__SETKA_TESTER_CABINET_V40__.show()});
 await page.getByLabel('Tester ID',{exact:true}).fill('T-ISOLATED');
 await page.getByLabel('Пароль',{exact:true}).fill('isolated-password');
 await page.getByRole('button',{name:'Войти',exact:true}).click();
 await page.waitForFunction(()=>window.SetkaDataScopeV1?.id==='tester:T-ISOLATED');
 await page.waitForFunction(()=>window.__SETKA_TESTER_CABINET_V40__?.state()?.authenticated===true);
 assert.ok(requests.includes('login'));
 console.log('RECOVERY STORAGE PASS: full localStorage, IndexedDB archive, temporary session, scoped reload, logout and ordinary password login');
}finally{await browser?.close();server.kill('SIGTERM')}
