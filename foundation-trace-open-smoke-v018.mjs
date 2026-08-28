import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const BASE='https://misskogut.github.io/Setka-web/';
const CONTROL_GLOB='**/functions/v1/setka-foundation-control';
const FOUNDATION_API_GLOB='**/functions/v1/setka-foundation-v016';
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'content-type,x-setka-session,x-setka-foundation-version','access-control-allow-methods':'POST,OPTIONS'};
const SESSION_KEY='setka:foundation:president:session';
const SESSION='smoke-trace-session';
const TRACE={
  traceCode:'TRACE-SMOKE-OPEN',
  title:'Smoke trace open',
  comment:'Browser regression fixture',
  status:'open',
  workStatus:'open',
  recordingStatus:'finalized',
  frontVersion:'foundation-president-v0.1.8',
  eventCount:3,
  chunks:[],
  authorSetkaId:'SETKA-S-SMOKE',
  authorDisplayName:'Synthetic Smoke',
  createdAt:'2026-08-28T00:00:00Z',
  startedAt:'2026-08-28T00:00:00Z',
  finalizedAt:'2026-08-28T00:00:01Z',
  actionableAt:'2026-08-28T00:00:01Z',
  priorityActive:false
};
const SNAPSHOT={
  counts:{users:0,synthetics:0,opens:0,favorites:0},
  users:[],patterns:[],recentEvents:[],syntheticRuns:[]
};

async function gotoRetry(page,url){let last;for(let i=0;i<3;i++){try{await page.goto(url,{waitUntil:'commit',timeout:60000});return}catch(e){last=e;await new Promise(r=>setTimeout(r,1500*(i+1)))}}throw last}
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
  const context=await browser.newContext({viewport:{width:1180,height:820},serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];
  const requests=[];
  let traceGetSeen=false;
  page.on('pageerror',e=>errors.push(String(e)));

  const jsonReply=(route,payload,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(payload)});

  await context.route(FOUNDATION_API_GLOB,async route=>{
    const req=route.request();
    if(req.method()==='OPTIONS'){await route.fulfill({status:204,headers:CORS,body:''});return;}
    let body={};
    try{body=req.postDataJSON()||{}}catch{}
    const action=body.action||'';
    if(action==='admin_snapshot'){await jsonReply(route,{snapshot:SNAPSHOT});return;}
    if(action==='admin_protocol'){await jsonReply(route,{protocol:{versions:[],pointers:{}}});return;}
    if(action==='admin_traces'){await jsonReply(route,{traces:[]});return;}
    if(action==='admin_trace_get'){await jsonReply(route,{trace:TRACE});return;}
    await jsonReply(route,{});
  });

  await context.route(CONTROL_GLOB,async route=>{
    const req=route.request();
    let body={};
    try{body=req.postDataJSON()||{}}catch{}
    requests.push({method:req.method(),url:req.url(),action:body.action||'',traceCode:body.traceCode||'',session:req.headers()['x-setka-session']||''});
    if(req.method()==='OPTIONS'){
      await route.fulfill({status:204,headers:CORS,body:''});return;
    }
    if(body.action==='priority_list'){await jsonReply(route,{pins:[],traces:[]});return;}
    if(body.action==='trace_list'){await jsonReply(route,{traces:[TRACE]});return;}
    if(body.action==='trace_get'){
      traceGetSeen=true;
      assert.equal(String(body.traceCode||'').toUpperCase(),TRACE.traceCode);
      assert.equal(req.headers()['x-setka-session'],SESSION);
      await jsonReply(route,{ok:true,trace:TRACE});return;
    }
    if(body.action==='pin_list'){await jsonReply(route,{pins:[],actor:{president:true}});return;}
    await route.continue();
  });

  await gotoRetry(page,BASE+'foundation-president.html?view=0.1.8');
  await page.evaluate(({k,v})=>localStorage.setItem(k,v),{k:SESSION_KEY,v:SESSION});
  await page.reload({waitUntil:'commit',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#versionSelect')?.value==='0.1.8',{timeout:30000});
  await page.waitForFunction(()=>!!window.FoundationTraceMailV018,{timeout:20000});
  await page.waitForFunction(()=>!!document.querySelector('#appFrame')?.contentWindow?.FoundationTraceUXV018,{timeout:30000});

  const appHandle=await page.locator('#appFrame').elementHandle();
  const app=await appHandle.contentFrame();
  assert(app,'appFrame contentFrame missing');
  const iframeToken=await app.evaluate(k=>localStorage.getItem(k),SESSION_KEY);
  assert.equal(iframeToken,SESSION,'iframe cannot see synthetic smoke session');

  await page.evaluate(()=>window.FoundationTraceMailV018.open());
  await page.waitForSelector(`.traceMailItem018[data-mail-trace-code="${TRACE.traceCode}"]`,{timeout:15000});
  await page.locator(`.traceMailItem018[data-mail-trace-code="${TRACE.traceCode}"]`).click();

  const frame=page.frameLocator('#appFrame');
  await frame.locator('#traceModal018.open').waitFor({state:'visible',timeout:15000});
  await frame.locator('#traceModalTitle018').filter({hasText:TRACE.title}).waitFor({state:'visible',timeout:15000});
  const title=await frame.locator('#traceModalTitle018').textContent();
  const code=await frame.locator('#traceModalCode018').textContent();
  const body=await frame.locator('#traceModalBody018').textContent();
  if(title!==TRACE.title){
    throw new Error('trace open diagnostic failure: '+JSON.stringify({iframeTokenPresent:iframeToken===SESSION,traceGetSeen,title,code,body,requests,errors}));
  }
  assert.equal(traceGetSeen,true,'trace_get request was not observed');
  assert.equal(code,`${TRACE.traceCode} · ${TRACE.frontVersion}`);
  if(errors.length)throw new Error('trace open page errors: '+errors.join(' | '));
  console.log('Foundation 0.1.8 trace open smoke passed: synthetic auth bootstrap -> trace mail card -> iframe postMessage -> trace_get -> matching modal.');
}finally{
  await browser.close();
}
