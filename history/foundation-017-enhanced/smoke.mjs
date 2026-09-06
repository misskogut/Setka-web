import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const URL='https://misskogut.github.io/Setka-web/history/foundation-017-enhanced/?view=0.1.7';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
  const p=await browser.newPage({viewport:{width:440,height:800}});
  const pageErrors=[]; const consoleErrors=[]; const dialogs=[];
  p.on('pageerror',e=>pageErrors.push(String(e)));
  p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  p.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss()});
  const r=await p.goto(URL,{waitUntil:'domcontentloaded'});
  assert.equal(r?.status(),200,'enhanced 0.1.7 page must return 200');
  await p.waitForFunction(()=>window.Foundation017Enhancements?.version==='1.0.0',{timeout:20000});
  await p.waitForFunction(()=>document.querySelector('#versionSelect')?.value==='0.1.7',{timeout:20000});
  for(const id of ['prevVersion','nextVersion','versionSelect','recordTool','pinTool','eyeTool','refreshVersions','appFrame','pinMailTool','pinMailBadge','pinMailModal','pinThreadModal']) assert.ok(await p.locator('#'+id).count(),`missing #${id}`);
  const frame=p.frameLocator('#appFrame');
  await frame.locator('body').waitFor({timeout:20000});
  const login=frame.locator('#login');
  if(await login.count()){
    await frame.locator('#presidentId').fill('SMOKE');
    assert.equal(await frame.locator('#presidentId').inputValue(),'SMOKE');
  }
  await p.locator('#pinMailTool').click();
  await p.locator('#pinMailModal.open').waitFor({timeout:5000});
  assert.match(await p.locator('#pinMailState').innerText(),/Президент|PIN|Загружаю/);
  await p.locator('[data-mail-filter="all"]').click();
  assert.ok(await p.locator('[data-mail-filter="all"].active').count(),'mail filter must be clickable');
  await p.locator('#pinMailClose').click();
  assert.equal(await p.locator('#pinMailModal.open').count(),0,'mail modal must close');
  const options=await p.locator('#versionSelect option').evaluateAll(xs=>xs.map(x=>x.value));
  assert.ok(options.includes('0.1.7'),'manifest must expose 0.1.7');
  if(pageErrors.length)throw new Error('page errors: '+pageErrors.join(' | '));
  console.log(JSON.stringify({status:'PASS',url:URL,options,dialogs,consoleErrors},null,2));
}finally{await browser.close()}
