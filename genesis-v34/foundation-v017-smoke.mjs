// Foundation 0.1.7 release gate
// Final merge-gate trigger after admin patch syntax fix.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const BASE='https://misskogut.github.io/Setka-web/';
const API='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-v017';
const CONTROL='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-control';
async function post(url,body){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const d=await r.json();assert.equal(r.ok,true,`${url} ${r.status} ${JSON.stringify(d)}`);return d}
function criticalNetworkErrors(page,bag){page.on('pageerror',e=>bag.push(`pageerror: ${String(e)}`));page.on('response',r=>{const type=r.request().resourceType();if(r.status()>=400&&['document','script','stylesheet'].includes(type))bag.push(`${type} ${r.status()} ${r.url()}`)})}
const version=await post(API,{action:'version'});assert.equal(version.pairVersion,'0.1.7');
const manifest=await post(CONTROL,{action:'manifest'});assert.ok(manifest.manifest.versions.some(v=>v.version==='0.1.7'&&v.parentVersion==='0.1.6'));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const p=await browser.newPage({viewport:{width:440,height:800}});const errs=[];criticalNetworkErrors(p,errs);
 await p.goto(BASE+'foundation-user-v017.html?synthetic=mira_explorer',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.FoundationUser?.version==='0.1.7',{timeout:15000});await p.waitForSelector('.patternCard',{timeout:15000});assert.equal(await p.locator('.patternCard').count(),2);
 const a=await browser.newPage({viewport:{width:440,height:800}});const aerrs=[];criticalNetworkErrors(a,aerrs);
 await a.goto(BASE+'foundation-shell-president-v017.html?view=0.1.7',{waitUntil:'domcontentloaded'});await a.evaluate(()=>localStorage.setItem('setka:foundation:viewing:context:president','synthetics'));await a.reload({waitUntil:'domcontentloaded'});await a.waitForFunction(()=>document.querySelector('#versionSelect')?.value==='0.1.7',{timeout:15000});
 const f=a.frameLocator('#appFrame');await f.locator('.nav button[data-page="synthetics"]').waitFor({state:'attached',timeout:15000});await a.waitForFunction(()=>document.querySelector('#appFrame')?.contentDocument?.querySelector('.nav button[data-page="synthetics"]')?.classList.contains('active'),{timeout:15000});
 await a.selectOption('#versionSelect','0.1.6');await a.waitForFunction(()=>document.querySelector('#appFrame')?.getAttribute('src')?.includes('foundation-admin-v016.html'),{timeout:15000});await f.locator('.nav button[data-page="synthetics"]').waitFor({state:'attached',timeout:15000});await a.waitForFunction(()=>document.querySelector('#appFrame')?.contentDocument?.querySelector('.nav button[data-page="synthetics"]')?.classList.contains('active'),{timeout:15000});
 assert.equal(await a.evaluate(()=>localStorage.getItem('setka:foundation:viewing:context:president')),'synthetics');
 const staticHtml=await (await fetch(BASE+'foundation-admin-v017.html')).text();assert.match(staticHtml,/foundation-admin-patch-v017\.js/);assert.match(staticHtml,/foundation-api-route-v017\.js/);assert.match(staticHtml,/Создать ID/);
 const shellHtml=await (await fetch(BASE+'foundation-shell-president-v017.html')).text();assert.match(shellHtml,/foundation-control-context-v017\.js/);assert.match(shellHtml,/foundation-control-refresh-v017\.js/);
 if(errs.length)throw new Error('user critical errors: '+errs.join(' | '));if(aerrs.length)throw new Error('admin/shell critical errors: '+aerrs.join(' | '));
 console.log('Foundation 0.1.7 smoke passed: API, two patterns, identity runtime, Create ID, and same-page version switching.');
}finally{await browser.close()}
