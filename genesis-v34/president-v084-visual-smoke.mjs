import { chromium } from 'playwright-core';
const url=process.env.PRESIDENT_V084_URL||'https://misskogut.github.io/Setka-web/diamond-president-v084.html?v=diamond-v0.8.4';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:430,height:932},deviceScaleFactor:3,isMobile:true,hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
await page.goto(url,{waitUntil:'networkidle',timeout:60000});
await page.waitForTimeout(2500);
const state=await page.evaluate(()=>{
 const bar=document.querySelector('#setkaResearchBar');
 const pencil=document.querySelector('#setkaPencil');
 const login=document.querySelector('.login');
 const shell=document.querySelector('.shell');
 const body=getComputedStyle(document.body);
 const loginStyle=login?getComputedStyle(login):null;
 return {
   iframeCount:document.querySelectorAll('iframe').length,
   barVisible:!!bar&&getComputedStyle(bar).display!=='none'&&bar.getBoundingClientRect().height>40,
   pencilText:pencil?.textContent?.trim()||'',
   pencilWidth:pencil?.getBoundingClientRect().width||0,
   loginExists:!!login,
   shellExists:!!shell,
   bodyBg:body.backgroundColor,
   bodyFont:body.fontFamily,
   loginBg:loginStyle?.backgroundColor||'',
   styleCount:document.querySelectorAll('style').length,
   researchStyle:!!document.querySelector('#setkaResearchStyle'),
   title:document.title,
   text:(document.body.innerText||'').slice(0,500)
 };
});
console.log(JSON.stringify({state,errors},null,2));
if(state.iframeCount!==0)throw new Error('iframe_present');
if(!state.barVisible)throw new Error('research_bar_missing');
if(!state.pencilText.includes('Записать путь'))throw new Error('pencil_missing');
if(state.pencilWidth<150)throw new Error('pencil_too_small:'+state.pencilWidth);
if(!state.loginExists||!state.shellExists)throw new Error('historical_structure_missing');
if(!state.researchStyle||state.styleCount<2)throw new Error('styles_missing');
if(!/rgb\(0, 0, 0\)|rgba\(0, 0, 0/.test(state.bodyBg))throw new Error('body_not_black:'+state.bodyBg);
if(!state.loginBg||state.loginBg==='rgba(0, 0, 0, 0)')throw new Error('historical_css_not_applied:'+state.loginBg);
if(/Times New Roman/i.test(state.bodyFont))throw new Error('default_serif_font');
if(errors.some(e=>/Content Security Policy|Refused to apply style|Refused to execute/i.test(e)))throw new Error('csp_visual_block:'+errors.join(' | '));
await browser.close();
