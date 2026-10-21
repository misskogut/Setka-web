// Isolated end-to-end UI audit. Every external API is mocked in the browser,
// never writes to real accounts, real admin access or production Supabase.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
import {buildData} from '../research-v1/model.mjs';

const port=49599,base='http://127.0.0.1:'+port;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sourceKeys=['accounts','patternCatalog','accountSessions','accountFavorites'];
const sources=sourceKeys.map(key=>({key,ok:true,truncated:false,count:0,label:key}));
const raw={accounts:[],devices:[],archives:[],patternCatalog:[]};
const overview=buildData(raw,sources,'2026-10-21T20:00:00Z');
let browser;
try{
 for(let n=0;n<45;n++){try{if((await fetch(base+'/standalone-v34.html')).ok)break}catch{}await sleep(100)}
 browser=await (process.env.SETKA_BROWSER==='webkit'?webkit:chromium).launch({headless:true,args:process.env.SETKA_BROWSER==='webkit'?[]:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 let catalogFail=false,feedMalformed=false;
 const errors=[];
 const route=async r=>{
  const req=r.request(),url=req.url();let input={};
  try{input=req.postDataJSON()||{}}catch{}
  const headers={'access-control-allow-origin':req.headers().origin||base,
    'access-control-allow-credentials':'true',
    'access-control-allow-methods':'POST,OPTIONS',
    'access-control-allow-headers':'content-type,apikey,authorization,x-client-info'};
  if(req.method()==='OPTIONS')return r.fulfill({status:204,headers,body:''});
  let payload={ok:true,items:[],metrics:{},notes:[],patternMetrics:[]},status=200;
  if(url.includes('setka-research-admin-v1')){
   if(input.action==='check')payload={ok:true};
   if(input.action==='catalog'){
    if(catalogFail){status=503;payload={error:'audit_catalog_temporarily_unavailable'}}
    else payload={ok:true,items:[],defaults:[]};
   }
   if(input.action==='overview')payload={ok:true,data:overview};
  }
  if(url.includes('setka-community-patterns-v38')&&input.action==='feed')
   payload=feedMalformed?{ok:true}:{ok:true,items:[],metrics:{},patternMetrics:[]};
  return r.fulfill({status,contentType:'application/json',headers,body:JSON.stringify(payload)});
 };
 await context.route('**/functions/v1/**',route);
 const front=await context.newPage();front.on('pageerror',e=>errors.push(['front',e.message]));
 await front.goto(base+'/standalone-v34.html',{waitUntil:'domcontentloaded'});
 await front.waitForFunction(()=>!!window.SetkaStandaloneV34?.cloudCommunity);
 await front.locator('#communityPagerButton').click();
 await front.waitForFunction(()=>!!window.SetkaStandaloneV34?.cloudCommunity?.status()?.lastOkAt);
 assert.equal(await front.locator('#st40CommunityLoadError').count(),0);
 feedMalformed=true;
 await front.evaluate(()=>window.SetkaStandaloneV34.cloudCommunity.refresh());
 const state=await front.evaluate(()=>window.SetkaStandaloneV34.cloudCommunity.status());
 assert.match(state.lastError,/community_invalid_response/,'HTTP 200 without items cannot masquerade as empty confirmed feed');
 await front.locator('#st40CommunityLoadError').waitFor();
 assert.match(await front.locator('#st40CommunityLoadError').innerText(),/не подтверждены сервером/);
 feedMalformed=false;
 await front.evaluate(()=>window.SetkaStandaloneV34.cloudCommunity.refresh());
 assert.equal(await front.locator('#st40CommunityLoadError').count(),0,'recovered feed removes false outage banner');
 assert.equal((await front.evaluate(()=>window.SetkaStandaloneV34.cloudCommunity.status())).lastError,null);
 console.log('FRONT: MALFORMED FEED → OUTAGE STATUS → RECOVERY PASS');
 // Returning from the game follows the original library, not always "all".
 for(const [source,pageId] of [['favorite','favoritesPagerButton'],['community','communityPagerButton'],['base','libraryPagerButton']]){
  const opened=await front.evaluate(type=>{
   const app=window.SetkaApp,id='dandelion';
   return app.openConfig(app.getPatternDefaults(id),{type,id,patternId:id});
  },source);
  assert.equal(opened,true);
  await front.locator('#libraryButton').click();
  assert.match(await front.locator('#'+pageId).getAttribute('class'),/active/,
   'game exit must restore its source library: '+source);
 }
 console.log('FRONT: BASE / FAVORITES / COMMUNITY RETURN NAVIGATION PASS');

 const admin=await context.newPage();admin.on('pageerror',e=>errors.push(['research-admin',e.message]));
 await admin.goto(base+'/standalone-research-admin-v1.html',{waitUntil:'domcontentloaded'});
 await admin.locator('#key').fill('test-only-credential');
 await admin.locator('#login-button').click();
 await admin.locator('#workspace').waitFor();
 await admin.getByText('Данные получены',{exact:true}).waitFor();
 const pages=[['home','Главная'],['sessions','Сессии и Replay'],['participants','Участники'],
   ['patterns','Паттерны'],['community','Сообщество'],['research','Исследования']];
 for(const [section,label] of pages){
  await admin.locator('.nav[data-page="'+section+'"]').click();
  assert.equal(await admin.locator('#page-title').innerText(),label);
  assert.ok((await admin.locator('#content').innerText()).trim().length>10,'empty admin surface '+section);
 }
 catalogFail=true;
 await admin.locator('#refresh').click();
 await admin.getByText('Данные неполные',{exact:true}).waitFor();
 assert.match(await admin.locator('#notice').innerText(),/Каталог паттернов не подтверждён сервером/);
 assert.equal(await admin.locator('#workspace').isVisible(),true,'data outage must not silently log out');
 catalogFail=false;
 await admin.locator('#refresh').click();
 await admin.getByText('Данные получены',{exact:true}).waitFor();
 assert.doesNotMatch(await admin.locator('#notice').innerText(),/Каталог паттернов не подтверждён сервером/);
 assert.deepEqual(errors,[],'all front and research admin pages must be error-free');
 console.log('RESEARCH: SIX NAV SCREENS + CATALOG FAILURE/RECOVERY PASS');
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
