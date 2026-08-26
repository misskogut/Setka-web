import { chromium } from 'playwright-core';
const url=process.env.PRESIDENT_RESEARCH_URL||'https://misskogut.github.io/Setka-web/diamond-president-v082.html?v=diamond-v0.3';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:820,height:1180},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForSelector('#setkaResearchBar',{timeout:20000});
 await page.waitForSelector('#setkaPencil',{timeout:10000});
 await page.waitForFunction(()=>document.documentElement.dataset.setkaResearchLoaded==='true',{timeout:15000});
 const state=await page.evaluate(()=>({
  iframes:document.querySelectorAll('iframe').length,
  bg:getComputedStyle(document.body).backgroundColor,
  text:(document.body.innerText||'').slice(0,1500),
  bar:document.querySelector('#setkaResearchBar')?.innerText||'',
  pencil:document.querySelector('#setkaPencil')?.innerText||'',
  version:document.body.dataset.setkaResearchVersion||''
 }));
 if(state.iframes!==0)throw new Error('research_still_uses_iframe:'+state.iframes);
 if(!/0, 0, 0/.test(state.bg))throw new Error('body_not_black:'+state.bg);
 if(!state.text.includes('SETKA'))throw new Error('historical_content_not_visible');
 if(!state.bar.includes('ИССЛЕДОВАНИЕ ВЕРСИЙ'))throw new Error('research_bar_missing');
 if(!state.pencil.includes('Записать путь'))throw new Error('pencil_missing');
 if(state.version!=='diamond-v0.3')throw new Error('wrong_version:'+state.version);
 if(errors.some(e=>/frame|ancestor/i.test(e)))throw new Error('frame_block_detected:'+errors.join(' | '));
 console.log('PASS top-level mobile research',JSON.stringify(state));
} finally {await browser.close();}
