import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const BASE='https://misskogut.github.io/Setka-web/';
const CONTROL='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-control';
const DOWN=['0.1.8','0.1.7','0.1.6','0.1.5','0.1.4','0.1.3','0.1.2'];
const ROUTE=[...DOWN,...DOWN.slice(0,-1).reverse()];

async function post(body){
  const r=await fetch(CONTROL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json();
  assert.equal(r.ok,true,`control ${r.status} ${JSON.stringify(d)}`);
  return d;
}
async function gotoRetry(page,url){
  let last;
  for(let i=0;i<3;i++){
    try{await page.goto(url,{waitUntil:'commit',timeout:60000});return}
    catch(e){last=e;await new Promise(r=>setTimeout(r,1200*(i+1)))}
  }
  throw last;
}
async function expectShellVersion(page,version){
  await page.waitForFunction(v=>document.querySelector('#versionSelect')?.value===v,version,{timeout:30000});
}
async function expectVersionLabel(frame,version){
  await frame.locator('#login').waitFor({state:'attached',timeout:30000});
  await frame.locator('.version').first().waitFor({state:'attached',timeout:15000});
  assert.match(await frame.locator('.version').first().innerText(),new RegExp(version.replaceAll('.','\\.')));
}
async function expectPresidentPair(page,version){
  await expectShellVersion(page,version);
  const frame=page.frameLocator('#appFrame');
  await expectVersionLabel(frame,version);
  if(version==='0.1.8'||version==='0.1.7'){
    const marker=version==='0.1.8'?'018':'017';
    await page.waitForFunction(m=>document.querySelector('#appFrame')?.contentDocument?.body?.dataset?.foundationVersion===m,marker,{timeout:30000});
    assert.equal(await frame.locator('body').getAttribute('data-foundation-version'),marker);
  }
}
async function expectUserPair(page,version){
  await expectShellVersion(page,version);
  const frame=page.frameLocator('#appFrame');
  await expectVersionLabel(frame,version);
  if(version==='0.1.8'){
    await page.waitForFunction(()=>document.querySelector('#appFrame')?.contentDocument?.body?.dataset?.foundationVersion==='018',{timeout:30000});
    assert.equal(await frame.locator('body').getAttribute('data-foundation-version'),'018');
  }
}
async function traverse(page,shell,expectPair){
  for(const version of ROUTE){
    await gotoRetry(page,BASE+shell+'?view='+version);
    await expectPair(page,version);
  }
}

const before=await post({action:'manifest'});
const pointersBefore=structuredClone(before.manifest.pointers);
for(const key of ['working','canon','stable']){
  const target=pointersBefore?.[key];
  assert.equal(typeof target,'string',`${key} missing`);
  assert.ok(before.manifest.versions.some(v=>v.version===target),`${key} points to unknown ${target}`);
}
assert.equal(pointersBefore.stable,'0.1.2','stable pointer moved away from traversal floor');
for(const version of DOWN){
  assert.ok(before.manifest.versions.some(v=>v.version===version),`${version} missing from manifest`);
}
for(let i=0;i<DOWN.length-1;i++){
  const child=DOWN[i], parent=DOWN[i+1];
  assert.equal(before.manifest.versions.find(v=>v.version===child)?.parentVersion,parent,`${child} parent drifted from ${parent}`);
}

const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
  const president=await browser.newPage({viewport:{width:1180,height:820}});
  const presidentErrors=[];
  president.on('pageerror',e=>presidentErrors.push(String(e)));
  await traverse(president,'foundation-president.html',expectPresidentPair);

  const user=await browser.newPage({viewport:{width:440,height:820}});
  const userErrors=[];
  user.on('pageerror',e=>userErrors.push(String(e)));
  await traverse(user,'foundation.html',expectUserPair);

  const after=await post({action:'manifest'});
  assert.deepEqual(after.manifest.pointers,pointersBefore,'historical VIEWING mutated WORKING/CANON/STABLE');
  for(let i=0;i<DOWN.length-1;i++){
    const child=DOWN[i], parent=DOWN[i+1];
    assert.equal(after.manifest.versions.find(v=>v.version===child)?.parentVersion,parent,`${child} lineage changed during traversal`);
  }

  if(presidentErrors.length)throw new Error('President traversal pageerror: '+presidentErrors.join(' | '));
  if(userErrors.length)throw new Error('User traversal pageerror: '+userErrors.join(' | '));
  console.log(`History traversal passed: President+User ${ROUTE.join(' → ')}; native historical fingerprints, release pointers and full lineage remain intact.`);
} finally {
  await browser.close();
}
