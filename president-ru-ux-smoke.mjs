import { chromium } from 'playwright-core';
const url=process.env.PRESIDENT_RU_URL||'https://misskogut.github.io/Setka-web/diamond-president-v081.html';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:820}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForSelector('#versionSelect',{timeout:15000});
 await page.waitForSelector('#pencil',{timeout:15000});
 await page.waitForTimeout(1200);
 const state=await page.evaluate(()=>({
   title:document.title,
   brand:document.querySelector('.brand')?.innerText||'',
   status:document.querySelector('#versionStatus')?.textContent||'',
   working:document.querySelector('#workingBadge')?.textContent||'',
   drawer:document.querySelector('#drawerBtn')?.textContent||'',
   pencil:document.querySelector('#pencil')?.innerText||'',
   pencilWidth:document.querySelector('#pencil')?.getBoundingClientRect().width||0,
   loadError:document.body.innerText.includes('ОШИБКА ЗАГРУЗКИ')
 }));
 if(state.loadError)throw new Error('load_error');
 if(!/ИССЛЕДОВАНИЕ ВЕРСИЙ/.test(state.brand))throw new Error('brand_not_ru:'+state.brand);
 if(!/СМОТРИМ/.test(state.status))throw new Error('viewing_not_ru:'+state.status);
 if(!/РАБОЧАЯ/.test(state.working))throw new Error('working_not_ru:'+state.working);
 if(!/ЗАПИСИ/.test(state.drawer))throw new Error('drawer_not_ru:'+state.drawer);
 if(!/Записать путь/.test(state.pencil))throw new Error('pencil_not_clear:'+state.pencil);
 if(state.pencilWidth<120)throw new Error('pencil_too_small:'+state.pencilWidth);
 if(errors.length)throw new Error('page_errors:'+errors.join(' | '));
 console.log('President RU UX smoke OK',state);
} finally {await browser.close();}
