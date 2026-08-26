import { chromium } from 'playwright-core';
const url=process.env.PRESIDENT_RESEARCH_URL||'https://misskogut.github.io/Setka-web/diamond-president-v08.html';
const stable=['diamond-v0.3','diamond-v0.4','diamond-v0.5','diamond-v0.6','diamond-v0.6.1','diamond-v0.7','diamond-v0.7.1','diamond-v0.7.3','diamond-v0.8'];
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{
  const page=await browser.newPage({viewport:{width:1280,height:820}});
  const parentErrors=[];
  page.on('pageerror',e=>parentErrors.push(String(e.message||e)));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForSelector('#versionSelect',{timeout:15000});
  await page.waitForSelector('#pencil',{timeout:15000});
  for(const checkpoint of stable){
    await page.selectOption('#versionSelect',checkpoint);
    const frame=page.locator('#cabinet');
    await frame.waitFor({state:'attached',timeout:10000});
    await page.waitForTimeout(1600);
    const info=await page.evaluate(()=>{
      const f=document.querySelector('#cabinet');
      const d=f?.contentDocument;
      return {body:(d?.body?.innerText||'').slice(0,500),title:d?.title||'',src:f?.getAttribute('src')||'',health:document.querySelector('#healthText')?.textContent||''};
    });
    if(!info.body.trim())throw new Error('empty historical cabinet '+checkpoint+' src='+info.src);
    if(/LOAD ERROR/i.test(info.body))throw new Error('historical load error '+checkpoint+' '+info.body);
    console.log('OK',checkpoint,info.title,info.health);
  }
  await page.selectOption('#versionSelect','diamond-v0.7.2');
  await page.waitForTimeout(1000);
  const status=await page.textContent('#versionStatus');
  if(!/FAILED/.test(status||''))throw new Error('failed checkpoint not visibly marked');
  if(parentErrors.length)throw new Error('parent page errors: '+parentErrors.join(' | '));
  console.log('Cross-version research console smoke OK');
} finally {await browser.close();}
