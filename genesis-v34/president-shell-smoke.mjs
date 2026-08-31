import { chromium } from 'playwright-core';

const url=process.env.PRESIDENT_URL||'https://misskogut.github.io/Setka-web/diamond-president-v073.html';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{
  const page=await browser.newPage({viewport:{width:1180,height:820}});
  const errors=[];
  page.on('pageerror',e=>{const msg=String(e.stack||e.message||e);errors.push(msg);console.error('PAGEERROR',msg)});
  await page.goto(url,{waitUntil:'networkidle',timeout:45000});
  await page.waitForSelector('#login',{timeout:15000});
  const pencil=await page.$('#pencilBtn');
  if(!pencil)throw new Error('pencil_button_missing');
  const title=await page.title();
  if(!title.includes('v0.7.3'))throw new Error('wrong_version_title:'+title);
  const boot=await page.$('#boot');
  if(boot)throw new Error('loader_did_not_replace_document');
  if(errors.length)throw new Error('page_errors:'+errors.join(' | '));
  console.log('President shell smoke OK',url);
} finally { await browser.close(); }
