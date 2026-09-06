import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const BASE='https://misskogut.github.io/Setka-web/';
const URL=BASE+'history/foundation-017-final/?view=0.1.7';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
  const p=await browser.newPage({viewport:{width:440,height:800}});
  const pageErrors=[]; const consoleErrors=[];
  p.on('pageerror',e=>pageErrors.push(String(e)));
  p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  const r=await p.goto(URL,{waitUntil:'domcontentloaded'});
  assert.equal(r?.status(),200,'restored 0.1.7 page must return 200');
  await p.waitForFunction(()=>document.querySelector('#versionSelect')?.value==='0.1.7',{timeout:20000});
  for(const id of ['prevVersion','nextVersion','versionSelect','recordTool','pinTool','eyeTool','refreshVersions','appFrame']) assert.ok(await p.locator('#'+id).count(),`missing #${id}`);
  const frame=p.frameLocator('#appFrame');
  await frame.locator('body').waitFor({timeout:20000});
  // Verify ordinary inner navigation remains clickable when the historical admin is visible.
  const nav=frame.locator('.nav button[data-page]');
  if(await nav.count()){
    const first=nav.first();
    await first.click({timeout:5000});
  }
  // Verify top shell controls have live handlers by changing version and returning.
  const options=await p.locator('#versionSelect option').evaluateAll(xs=>xs.map(x=>x.value));
  assert.ok(options.includes('0.1.7'),'manifest must expose 0.1.7');
  const alternate=options.find(x=>x!=='0.1.7');
  if(alternate){
    await p.selectOption('#versionSelect',alternate);
    await p.waitForFunction(v=>document.querySelector('#versionSelect')?.value===v,alternate,{timeout:10000});
    await p.selectOption('#versionSelect','0.1.7');
    await p.waitForFunction(()=>document.querySelector('#versionSelect')?.value==='0.1.7',{timeout:10000});
  }
  if(pageErrors.length) throw new Error('page errors: '+pageErrors.join(' | '));
  // Cross-origin/network console noise is tolerated only if the shell itself stayed interactive.
  console.log(JSON.stringify({status:'PASS',url:URL,options,consoleErrors},null,2));
} finally { await browser.close(); }
