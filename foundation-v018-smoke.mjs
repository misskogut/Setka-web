import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const BASE='https://misskogut.github.io/Setka-web/';
const API='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-v018';
const CONTROL='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-control';
async function post(url,body){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const d=await r.json();assert.equal(r.ok,true,`${url} ${r.status} ${JSON.stringify(d)}`);return d}
async function gotoRetry(page,url){let last;for(let i=0;i<3;i++){try{await page.goto(url,{waitUntil:'commit',timeout:60000});return}catch(e){last=e;await new Promise(r=>setTimeout(r,1500*(i+1)))}}throw last}
const version=await post(API,{action:'version'});assert.equal(version.pairVersion,'0.1.8');
const manifest=await post(CONTROL,{action:'manifest'});const row=manifest.manifest.versions.find(v=>v.version==='0.1.8');assert.ok(row);assert.equal(row.parentVersion,'0.1.7');assert.equal(row.backendSlug,'setka-foundation-v018');
for(const key of ['working','canon','stable']){const target=manifest.manifest.pointers?.[key];assert.equal(typeof target,'string',`${key} pointer missing`);assert.ok(manifest.manifest.versions.some(v=>v.version===target),`${key} pointer targets unknown version ${target}`)}
const pointersBefore=structuredClone(manifest.manifest.pointers);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
  const p=await browser.newPage({viewport:{width:440,height:820}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await gotoRetry(p,BASE+'foundation.html?view=0.1.8');
  await p.waitForFunction(()=>document.querySelector('#versionSelect')?.value==='0.1.8',{timeout:30000});
  await p.waitForFunction(()=>window.FoundationContextV018?.version==='0.1.8'&&!!window.FoundationPinsV018,{timeout:20000});
  await p.waitForSelector('#pinListTool',{timeout:15000});
  const f=p.frameLocator('#appFrame');await f.locator('#login').waitFor({state:'attached',timeout:30000});await f.locator('#patterns').waitFor({state:'attached',timeout:15000});
  await p.waitForFunction(()=>document.querySelector('#appFrame')?.contentWindow?.FoundationV018?.version==='0.1.8'&&document.querySelector('#appFrame')?.contentDocument?.body?.dataset?.foundationVersion==='018',{timeout:20000});
  assert.equal(await f.locator('body').getAttribute('data-foundation-version'),'018');
  await f.locator('body').evaluate(()=>{if(!window.FoundationV018||window.FoundationV018.version!=='0.1.8')throw new Error('FoundationV018 missing')});

  const a=await browser.newPage({viewport:{width:1180,height:820}});const aerrors=[];a.on('pageerror',e=>aerrors.push(String(e)));a.on('console',m=>{if(m.type()==='error')aerrors.push(m.text())});
  await gotoRetry(a,BASE+'foundation-president.html?view=0.1.8');
  await a.waitForFunction(()=>document.readyState==='interactive'||document.readyState==='complete',{timeout:30000});
  await a.evaluate(()=>localStorage.setItem('setka:foundation:viewing:context:president','synthetics'));
  await a.reload({waitUntil:'commit',timeout:60000});
  await a.waitForFunction(()=>document.querySelector('#versionSelect')?.value==='0.1.8',{timeout:30000});
  await a.waitForFunction(()=>window.FoundationContextV018?.version==='0.1.8'&&!!window.FoundationPinsV018,{timeout:20000});
  await a.waitForSelector('#pinListTool',{timeout:15000});
  await a.waitForFunction(()=>document.querySelector('#appFrame')?.contentDocument?.body?.dataset?.foundationVersion==='018',{timeout:30000});
  const af=a.frameLocator('#appFrame');
  assert.equal(await af.locator('body').getAttribute('data-foundation-version'),'018','President iframe must be the 0.1.8 pair, not a blank/old page');
  await af.locator('#login').waitFor({state:'attached',timeout:15000});
  await af.locator('.nav button[data-page="synthetics"]').waitFor({state:'attached',timeout:15000});
  await af.locator('.nav button[data-page="constants"]').waitFor({state:'attached',timeout:15000});
  await af.locator('body').evaluate(()=>{if(!window.FoundationAdminPatchV018||window.FoundationAdminPatchV018.version!=='0.1.8')throw new Error('FoundationAdminPatchV018 missing')});
  await a.waitForFunction(()=>document.querySelector('#appFrame')?.contentDocument?.querySelector('.nav button[data-page="synthetics"]')?.classList.contains('active'),{timeout:25000});
  const html=await (await fetch(BASE+'foundation-president.html')).text();assert.match(html,/foundation-control-context-v018\.js/);assert.match(html,/foundation-control-pins-v018\.js/);assert.match(html,/foundation-control-build-v018\.js/);

  // Historical traversal invariant: VIEWING may move backward/forward, but live release pointers must not move.
  await gotoRetry(a,BASE+'foundation-president.html?view=0.1.7');
  await a.waitForFunction(()=>document.querySelector('#versionSelect')?.value==='0.1.7',{timeout:30000});
  await a.waitForFunction(()=>document.querySelector('#appFrame')?.contentDocument?.body?.dataset?.foundationVersion==='017',{timeout:30000});
  assert.equal(await a.frameLocator('#appFrame').locator('body').getAttribute('data-foundation-version'),'017','Historical traversal must load the 0.1.7 President pair');
  await a.frameLocator('#appFrame').locator('#login').waitFor({state:'attached',timeout:15000});

  await gotoRetry(a,BASE+'foundation-president.html?view=0.1.8');
  await a.waitForFunction(()=>document.querySelector('#versionSelect')?.value==='0.1.8',{timeout:30000});
  await a.waitForFunction(()=>document.querySelector('#appFrame')?.contentDocument?.body?.dataset?.foundationVersion==='018',{timeout:30000});
  assert.equal(await a.frameLocator('#appFrame').locator('body').getAttribute('data-foundation-version'),'018','Return traversal must restore the 0.1.8 President pair');
  const manifestAfterTraversal=await post(CONTROL,{action:'manifest'});
  assert.deepEqual(manifestAfterTraversal.manifest.pointers,pointersBefore,'VIEWING historical versions must never mutate WORKING/CANON/STABLE pointers');

  const q=await browser.newPage({viewport:{width:1180,height:820}});const qerrors=[];q.on('pageerror',e=>qerrors.push(String(e)));
  await q.route(CONTROL,async route=>{let body={};try{body=route.request().postDataJSON()||{}}catch{}if(body.action==='pin_list'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({pins:[{pin_code:'PIN-SMOKE-ADDRESS',version:'0.1.8',surface:'president',page_key:'transcript',status:'open',authorKind:'assistant'}],actor:{president:true}})});return}await route.continue()});
  await gotoRetry(q,BASE+'foundation-president.html?view=0.1.8');
  await q.evaluate(()=>{localStorage.setItem('setka:foundation:president:session','smoke-address-session');localStorage.setItem('setka:foundation:viewing:context:president','synthetics')});
  await q.reload({waitUntil:'commit',timeout:60000});
  await q.waitForFunction(()=>window.FoundationPinAddressV018?.version==='0.1.8'&&window.FoundationContextV018?.current?.()==='synthetics',{timeout:30000});
  await q.evaluate(()=>{const m=document.createElement('button');m.id='pinAddressSmokeMarker';m.className='pinMarker';m.dataset.pinCode='PIN-SMOKE-ADDRESS';document.body.appendChild(m);window.FoundationPinAddressV018.refresh()});
  await q.waitForFunction(()=>document.querySelector('#pinAddressSmokeMarker')?.hidden===true,{timeout:10000});
  await q.waitForFunction(()=>!!document.querySelector('#appFrame')?.contentDocument?.querySelector('.nav button[data-page="transcript"]'),{timeout:15000});
  await q.evaluate(()=>document.querySelector('#appFrame').contentDocument.querySelector('.nav button[data-page="transcript"]').click());
  await q.waitForFunction(()=>window.FoundationPinAddressV018?.currentPage?.()==='transcript',{timeout:10000});
  await q.waitForFunction(()=>document.querySelector('#pinAddressSmokeMarker')?.hidden===false,{timeout:10000});
  assert.equal(await q.locator('#pinAddressSmokeMarker').getAttribute('data-pin-address-visible'),'1');
  if(qerrors.length)throw new Error('pin address errors: '+qerrors.join(' | '));

  if(errors.length)throw new Error('front errors: '+errors.join(' | '));if(aerrors.length)throw new Error('president errors: '+aerrors.join(' | '));
  console.log('Foundation 0.1.8 historical smoke passed: fixed pair + lineage + historical traversal + UI structure remain valid; VIEWING does not mutate live release pointers.');
}finally{await browser.close()}
