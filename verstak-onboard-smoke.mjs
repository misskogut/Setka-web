import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const BASE='https://misskogut.github.io/Setka-web/';
const ENDPOINT='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-verstak-onboard';
async function gotoRetry(page,url){let last;for(let i=0;i<4;i++){try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});return}catch(e){last=e;await new Promise(r=>setTimeout(r,1500*(i+1)))}}throw last}
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1180,height:820}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route(ENDPOINT,async route=>{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,turnId:'SMOKE-TURN',intent:'NAVIGATE_NEXT',aiUsed:false,response:'Бортовой компьютер: тестовый детерминированный ответ.',routes:[{title:'Маршрут A',whyNow:'Готов к проверке',risk:'LOW'},{title:'Маршрут B',whyNow:'Альтернатива',risk:'LOW'}]})})});
 await gotoRetry(page,BASE+'verstak-onboard-v1.html');
 await page.waitForSelector('#onboardChatButton',{timeout:20000});
 await page.click('#onboardChatButton');
 await page.waitForSelector('#onboardChatPanel.open',{timeout:10000});
 await page.evaluate(()=>localStorage.setItem('setka:foundation:president:session','browser-smoke-session'));
 await page.fill('.onboardChatInput','что сейчас лучше сделать?');
 await page.click('.onboardChatSend');
 await page.waitForFunction(()=>document.querySelectorAll('.onboardRoute').length===2,{timeout:10000});
 assert.match(await page.locator('.onboardMsg.computer').last().innerText(),/детерминированный ответ/);
 assert.equal(await page.locator('.onboardRoute').count(),2);
 assert.equal(errors.length,0,errors.join(' | '));
 console.log('VERSTAK onboard Front smoke passed: persistent button, open panel, user submit, deterministic response rendering, 2 routes.');
}finally{await browser.close()}
