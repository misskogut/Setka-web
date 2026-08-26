import { chromium } from 'playwright-core';

const FRONT='https://misskogut.github.io/Setka-web/standalone-new-chat-v1.html';
const SIM='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-simulation-v1';
const post=async body=>{const r=await fetch(SIM,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||d.error||`sim_${r.status}`);return d};
const pick=(v,d)=>Array.isArray(v)&&v.length===2?Math.round(Number(v[0])+Math.random()*(Number(v[1])-Number(v[0]))):d;
const chance=p=>Math.random()<Number(p||0);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function runPersona(browser,p){
 const seed=`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
 const begin=await post({action:'begin',personaKey:p.personaKey,frontVersion:'public-new-chat-v1.1',seed,targetType:'headquarters',targetKey:'public',scenarioKey:'scheduled_browser_behavior'});
 const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'ru-RU'}); const page=await ctx.newPage(); let seq=0;
 const log=(actionType,target,payload={})=>post({action:'ui_action',runId:begin.runId,runToken:begin.runToken,seq:++seq,actionType,target,payload}).catch(()=>{});
 await page.route('**/functions/v1/setka-standalone-v34',async route=>{try{const body=JSON.parse(route.request().postData()||'{}');const out=await post({action:'ingest',kind:'legacy',runId:begin.runId,runToken:begin.runToken,requestBody:body});await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out)})}catch(e){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,updatedAt:new Date().toISOString(),acceptedEvents:0,retentionDays:90,sampleHz:8})})}});
 await page.route('**/functions/v1/setka-semantic-v35',async route=>{try{const body=JSON.parse(route.request().postData()||'{}');const out=await post({action:'ingest',kind:'semantic',runId:begin.runId,runToken:begin.runToken,requestBody:body});await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out)})}catch(e){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,favorites:0,acceptedExposures:0,facts:true})})}});
 let ok=true,error='';
 try{
  await page.goto(FRONT,{waitUntil:'domcontentloaded',timeout:45000}); await page.waitForSelector('.pattern-tile',{timeout:20000}); await log('front_open','library',{archetype:p.archetype});
  const policy=p.behaviorPolicy||{};
  if(chance(policy.communityProbability)){await page.click('#communityPagerButton').catch(()=>{});await log('library_page','community');await sleep(400);await page.click('#libraryPagerButton').catch(()=>{})}
  await page.locator('.pattern-tile').first().click(); await page.waitForSelector('#gameScreen.active',{timeout:10000}); await log('pattern_open','first_pattern');
  if(chance(policy.readInstructions)){await page.click('#instructionsButton').catch(()=>{});await log('instructions_open','instructions');await sleep(300);await page.click('#closeInstructionsButton').catch(()=>{})}
  const gestures=Math.min(8,pick(policy.gestures,3));
  for(let i=0;i<gestures;i++){const box=await page.locator('#patternCanvas').boundingBox();if(!box)break;const x=box.x+box.width*(.2+Math.random()*.6),y=box.y+box.height*(.25+Math.random()*.5);await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+(Math.random()-.5)*100,y+(Math.random()-.5)*120,{steps:4});await page.mouse.up();await log('gesture','patternCanvas',{i});if(chance(.35))await page.click('#colorButton').catch(()=>{});await sleep(180)}
  const switches=Math.min(4,pick(policy.patternSwitches,1));for(let i=0;i<switches;i++){await page.click(i%2?'#prevButton':'#nextButton').catch(()=>{});await log('pattern_switch',i%2?'prev':'next');await sleep(220)}
  if(chance(policy.saveProbability)){await page.click('#favoriteButton').catch(()=>{});await log('favorite_toggle','gameplay')}
  const dwell=Math.min(12,Math.max(2,pick(policy.dwellSeconds,10)));await sleep(dwell*1000);
  if(chance(policy.abandonProbability)){await log('abandon','gameplay')}else{await page.click('#libraryButton').catch(()=>{});await log('return_library','library');if(chance(policy.returnProbability)){await page.locator('.pattern-tile').first().click().catch(()=>{});await sleep(800);await page.click('#libraryButton').catch(()=>{});await log('revisit','first_pattern')}}
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide'))).catch(()=>{});await sleep(1000);
 }catch(e){ok=false;error=String(e?.message||e)}
 await post({action:'complete',runId:begin.runId,runToken:begin.runToken,ok,steps:seq,error,note:`${p.displayName} / ${p.archetype}`}).catch(()=>{}); await ctx.close(); if(!ok)throw new Error(`${p.personaKey}: ${error}`);
}

const executable=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox']});
try{const data=await post({action:'personas'});for(const p of data.personas||[]){try{await runPersona(browser,p)}catch(e){console.error(e)}}}finally{await browser.close()}
