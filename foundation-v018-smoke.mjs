import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const BASE='https://misskogut.github.io/Setka-web/';
const API='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-v018';
const CONTROL='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-control';
async function post(url,body){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const d=await r.json();assert.equal(r.ok,true,`${url} ${r.status} ${JSON.stringify(d)}`);return d}
const version=await post(API,{action:'version'});assert.equal(version.pairVersion,'0.1.8');
const manifest=await post(CONTROL,{action:'manifest'});const row=manifest.manifest.versions.find(v=>v.version==='0.1.8');assert.ok(row);assert.equal(row.parentVersion,'0.1.7');assert.equal(row.backendSlug,'setka-foundation-v018');assert.equal(manifest.manifest.pointers.working,'0.1.8');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
  const p=await browser.newPage({viewport:{width:440,height:820}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(BASE+'foundation.html?view=0.1.8&synthetic=mira_explorer',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>document.querySelector('#versionSelect')?.value==='0.1.8',{timeout:20000});
  await p.waitForFunction(()=>window.FoundationContextV018?.version==='0.1.8'&&!!window.FoundationPinsV018,{timeout:15000});
  await p.waitForSelector('#pinListTool',{timeout:10000});
  const f=p.frameLocator('#appFrame');await f.locator('.patternCard').first().waitFor({timeout:20000});assert.equal(await f.locator('.patternCard').count(),2);
  assert.equal(await f.locator('body').getAttribute('data-foundation-version'),'018');
  const a=await browser.newPage({viewport:{width:1180,height:820}});const aerrors=[];a.on('pageerror',e=>aerrors.push(String(e)));a.on('console',m=>{if(m.type()==='error')aerrors.push(m.text())});
  await a.goto(BASE+'foundation-president.html?view=0.1.8',{waitUntil:'domcontentloaded'});
  await a.evaluate(()=>localStorage.setItem('setka:foundation:viewing:context:president','synthetics'));
  await a.reload({waitUntil:'domcontentloaded'});
  await a.waitForFunction(()=>document.querySelector('#versionSelect')?.value==='0.1.8',{timeout:20000});
  await a.waitForFunction(()=>window.FoundationContextV018?.version==='0.1.8'&&!!window.FoundationPinsV018,{timeout:15000});
  await a.waitForSelector('#pinListTool',{timeout:10000});
  await a.waitForFunction(()=>document.querySelector('#appFrame')?.contentDocument?.querySelector('.nav button[data-page="synthetics"]')?.classList.contains('active'),{timeout:15000});
  const html=await (await fetch(BASE+'foundation-president.html')).text();assert.match(html,/foundation-control-context-v018\.js/);assert.match(html,/foundation-control-pins-v018\.js/);
  if(errors.length)throw new Error('front errors: '+errors.join(' | '));if(aerrors.length)throw new Error('president errors: '+aerrors.join(' | '));
  console.log('Foundation 0.1.8 live smoke passed: WORKING pointer, front pair, guarded context restore, pin-board shell, President surface.');
}finally{await browser.close()}
