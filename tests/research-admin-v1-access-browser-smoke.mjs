// Isolated credentials and API fixtures. No request reaches production Supabase.
import assert from 'node:assert/strict';import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {resolve,extname} from 'node:path';import {chromium,webkit} from 'playwright';
import {buildData} from '../research-v1/model.mjs';
const root=process.cwd(),base='http://127.0.0.1:49321',entry=base+'/standalone-research-admin-v1.html',storageKey='setka-research:admin-key:v1',key='SKA-'+'x'.repeat(43),ticket='SETKA1-'+'y'.repeat(64),errors=[];
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+new URL(req.url,base).pathname);if(!path.startsWith(root+'/')){res.writeHead(403).end();return}res.writeHead(200,{'Content-Type':{'.html':'text/html','.mjs':'text/javascript','.css':'text/css'}[extname(path)]||'text/javascript'}).end(await readFile(path));}catch(_){res.writeHead(404).end()}});
let browser;
try{
 await new Promise(ok=>server.listen(49321,'127.0.0.1',ok));browser=await(process.env.SETKA_BROWSER==='webkit'?webkit:chromium).launch({headless:true,args:process.env.SETKA_BROWSER==='webkit'?[]:['--no-sandbox']});
 async function scenario({saved=false,blocked=false,expired=false,originDenied=false}={}){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),requests=[];
  if(saved)await context.addInitScript(k=>{if(!localStorage.getItem('isolated-seeded')){localStorage.setItem(k,'isolated-stale-key');sessionStorage.setItem(k,'isolated-stale-session');localStorage.setItem('isolated-seeded','1')}},storageKey);
  if(blocked)await context.addInitScript(()=>{Storage.prototype.getItem=Storage.prototype.setItem=Storage.prototype.removeItem=function(){throw new DOMException('Blocked in isolated fixture','SecurityError')}});
  await context.route('**/functions/v1/**',async route=>{
   if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'content-type,apikey','access-control-allow-methods':'POST,OPTIONS'}});return}
   const b=route.request().postDataJSON();requests.push({url:route.request().url(),...b});let status=200,out={ok:true};
   if(b.action==='redeem'){if(expired){status=403;out={error:'owner_link_expired_or_revoked'}}else{assert.equal(b.ticket,ticket);out={ok:true,adminKey:key}}}
   else if(b.adminKey!==key||originDenied){status=403;out={error:originDenied?'origin_not_allowed':'invalid_admin_key'}}
   else if(b.action==='overview')out={ok:true,data:buildData({},[])};
   await route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(out)});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));return{page,context,requests};
 }
 const owner=await scenario({saved:true});await owner.page.goto(entry+'?owner_ticket='+ticket);await owner.page.getByText('Доступ владельца подготовлен.',{exact:false}).waitFor();
 assert.equal(new URL(owner.page.url()).searchParams.has('owner_ticket'),false);assert.equal(owner.requests.length,0,'no automatic ticket consumption');assert.equal(await owner.page.locator('#key').isVisible(),false);
 await owner.page.locator('#login-button').click();await owner.page.locator('#workspace').waitFor();assert.deepEqual(owner.requests.map(x=>x.action),['redeem','check','catalog','overview']);assert.ok(owner.requests[0].url.endsWith('/setka-admin-owner-recovery-v1'));assert.equal(await owner.page.locator('.nav').count(),6);
 assert.deepEqual(await owner.page.evaluate(k=>[localStorage.getItem(k),sessionStorage.getItem(k)],storageKey),[key,null]);
 await owner.page.reload();await owner.page.locator('#workspace').waitFor();assert.equal(owner.requests.filter(x=>x.action==='redeem').length,1,'reload reuses validated credential, never a consumed ticket');
 const denied=await scenario({saved:true,expired:true});await denied.page.goto(entry+'?owner_ticket='+ticket);await denied.page.locator('#login-button').click();await denied.page.getByText(/Ссылка уже использована/).waitFor();assert.equal(await denied.page.locator('#workspace').isVisible(),false);assert.equal(await denied.page.locator('#key').isVisible(),true);assert.equal(denied.requests.length,1);
 const privateBrowser=await scenario({blocked:true});await privateBrowser.page.goto(entry);await privateBrowser.page.locator('#key').fill(key);await privateBrowser.page.locator('#login-button').click();await privateBrowser.page.locator('#workspace').waitFor();await privateBrowser.page.getByText(/Браузер не разрешил запомнить доступ/).waitFor();
 const rejected=await scenario({saved:true});await rejected.page.goto(entry);await rejected.page.getByText(/Сервер не подтвердил этот ключ/).waitFor();assert.equal(rejected.requests.length,1);assert.equal(await rejected.page.evaluate(k=>sessionStorage.getItem(k),storageKey),null);
 await rejected.page.locator('#key').fill(key);await rejected.page.locator('#login-button').click();await rejected.page.locator('#workspace').waitFor();assert.deepEqual(await rejected.page.evaluate(k=>[localStorage.getItem(k),sessionStorage.getItem(k)],storageKey),[null,key]);
 const fragment=await scenario({saved:true});await fragment.page.goto(entry+'#access='+key);await fragment.page.locator('#workspace').waitFor();assert.equal(new URL(fragment.page.url()).hash,'#home');assert.ok(fragment.requests.every(x=>x.adminKey===key));
 const origin=await scenario({originDenied:true});await origin.page.goto(entry);await origin.page.locator('#key').fill(key);await origin.page.locator('#login-button').click();await origin.page.getByText(/Этот адрес не разрешён/).waitFor();assert.equal(await origin.page.locator('#workspace').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('EXISTING OWNER RECOVERY, ONE EXPLICIT REDEMPTION, STALE KEYS, BLOCKED STORAGE, RELOAD AND CLOSED PRIVATE DATA PASS');
}finally{await browser?.close();await new Promise(ok=>server.close(ok))}
