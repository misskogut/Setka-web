import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const BASE='https://misskogut.github.io/Setka-web/';
const URL=BASE+'history/foundation-017-final/?view=0.1.7';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try {
  const p=await browser.newPage({viewport:{width:440,height:800}});
  const pageErrors=[]; const consoleErrors=[]; const dialogs=[];
  p.on('pageerror',e=>pageErrors.push(String(e)));
  p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  p.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss()});
  const r=await p.goto(URL,{waitUntil:'domcontentloaded'});
  assert.equal(r?.status(),200,'restored 0.1.7 page must return 200');
  await p.waitForFunction(()=>document.querySelector('#versionSelect')?.value==='0.1.7',{timeout:20000});
  for(const id of ['prevVersion','nextVersion','versionSelect','recordTool','pinTool','eyeTool','refreshVersions','appFrame']) assert.ok(await p.locator('#'+id).count(),`missing #${id}`);

  // Prove shell controls are wired, not just painted.
  const eye=p.locator('#eyeTool');
  const before=await eye.evaluate(el=>el.classList.contains('active'));
  await eye.click();
  const after=await eye.evaluate(el=>el.classList.contains('active'));
  assert.notEqual(after,before,'eyeTool click must change active state');

  const options=await p.locator('#versionSelect option').evaluateAll(xs=>xs.map(x=>x.value));
  assert.ok(options.includes('0.1.7'),'manifest must expose 0.1.7');
  const alternate=options.find(x=>x!=='0.1.7');
  if(alternate){
    await p.selectOption('#versionSelect',alternate);
    await p.waitForFunction(v=>document.querySelector('#versionSelect')?.value===v,alternate,{timeout:10000});
    await p.selectOption('#versionSelect','0.1.7');
    await p.waitForFunction(()=>document.querySelector('#versionSelect')?.value==='0.1.7',{timeout:10000});
  }

  const frame=p.frameLocator('#appFrame');
  await frame.locator('body').waitFor({timeout:20000});
  const login=frame.locator('#login');
  const app=frame.locator('#app');
  const loginVisible=await login.count()?await login.isVisible():false;
  const appVisible=await app.count()?await app.isVisible():false;
  assert.ok(loginVisible||appVisible,'inner Foundation must expose either login or app, not a dead hidden surface');
  if(loginVisible){
    const idInput=frame.locator('#presidentId');
    assert.equal(await idInput.isVisible(),true,'President ID input must be visible');
    await idInput.fill('SETKA-TEST-CLICK');
    assert.equal(await idInput.inputValue(),'SETKA-TEST-CLICK');
    await idInput.fill('');
  } else {
    const nav=frame.locator('.nav button[data-page]');
    assert.ok(await nav.count()>0,'visible app must have navigation');
    const visibleNav=nav.filter({visible:true}).first();
    await nav.first().click({force:true});
  }

  // PIN has a real handler; without a President session it must produce the historical guard dialog.
  await p.locator('#pinTool').click();
  await p.waitForTimeout(150);
  assert.ok(dialogs.some(x=>/Президентск/i.test(x)),'PIN button must execute its historical guard when no session exists');

  if(pageErrors.length) throw new Error('page errors: '+pageErrors.join(' | '));
  console.log(JSON.stringify({status:'PASS',url:URL,options,loginVisible,appVisible,dialogs,consoleErrors},null,2));
} finally { await browser.close(); }
