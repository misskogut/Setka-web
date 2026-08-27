// Synthetic User Lab browser runner · pointer-tap UI semantics
import { chromium } from 'playwright-core';
import { createHash } from 'node:crypto';

const FRONT='https://misskogut.github.io/Setka-web/standalone-new-chat-v1.html';
const SIM='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-simulation-v1';
const post=async body=>{const r=await fetch(SIM,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||d.error||`sim_${r.status}`);return d};
const pick=(v,d)=>Array.isArray(v)&&v.length===2?Math.round(Number(v[0])+Math.random()*(Number(v[1])-Number(v[0]))):d;
const chance=p=>Math.random()<Number(p||0);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hashInt=s=>parseInt(createHash('sha256').update(String(s)).digest('hex').slice(0,8),16)>>>0;
function localParts(date,timeZone){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const get=t=>parts.find(x=>x.type===t)?.value||'';
 return {date:`${get('year')}-${get('month')}-${get('day')}`,hour:Number(get('hour'))};
}
function rhythmPlan(p,now=new Date()){
 const r=p.dailyRhythm;
 if(!r?.active)return {due:true,waitMs:0,reason:'legacy_no_rhythm'};
 const tz=r.timezone||'Europe/Saratov',cur=localParts(now,tz),variance=Math.max(0,Math.min(6,Number(r.hourVariance)||0));
 const base=hashInt(`${p.personaKey}|${cur.date}|${r.scheduleSeed||'rhythm-v1'}`);
 const hourOffset=variance?base%(variance*2+1)-variance:0;
 const plannedHour=(Number(r.preferredLocalHour||0)+hourOffset+24)%24;
 const jitterMax=Math.max(0,Math.min(14,Number(r.jitterMinutes)||0));
 const jitterMinutes=jitterMax?hashInt(`${p.personaKey}|${cur.date}|jitter|${r.scheduleSeed||''}`)%(jitterMax+1):0;
 const last=p.lastScheduledAt?localParts(new Date(p.lastScheduledAt),tz).date:null;
 const alreadyRanToday=last===cur.date;
 return {due:!alreadyRanToday&&cur.hour===plannedHour,waitMs:jitterMinutes*60000,reason:alreadyRanToday?'already_ran_today':cur.hour===plannedHour?'due':'different_hour',date:cur.date,currentHour:cur.hour,plannedHour,jitterMinutes,timeZone:tz};
}
async function tapFirstTile(page){
 const tile=page.locator('.pattern-tile').first(); await tile.scrollIntoViewIfNeeded();
 await tile.evaluate(async el=>{const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,old=el.setPointerCapture;try{el.setPointerCapture=()=>{};const base={bubbles:true,cancelable:true,pointerId:77,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,button:0,buttons:1};el.dispatchEvent(new PointerEvent('pointerdown',base));await new Promise(res=>setTimeout(res,75));el.dispatchEvent(new PointerEvent('pointerup',{...base,buttons:0}))}finally{if(old)el.setPointerCapture=old}});
}

async function runPersona(browser,p,plan){
 const seed=`${p.personaKey}:${plan?.date||'manual'}:${plan?.plannedHour??'x'}:${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
 const begin=await post({action:'begin',personaKey:p.personaKey,frontVersion:'public-new-chat-v1.1',seed,targetType:'headquarters',targetKey:'public',scenarioKey:'scheduled_browser_behavior'});
 const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'ru-RU'}); const page=await ctx.newPage(); let seq=0;
 const log=(actionType,target,payload={})=>post({action:'ui_action',runId:begin.runId,runToken:begin.runToken,seq:++seq,actionType,target,payload}).catch(()=>{});
 await page.route('**/functions/v1/setka-standalone-v34',async route=>{try{const body=JSON.parse(route.request().postData()||'{}');const out=await post({action:'ingest',kind:'legacy',runId:begin.runId,runToken:begin.runToken,requestBody:body});await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out)})}catch(e){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,updatedAt:new Date().toISOString(),acceptedEvents:0,retentionDays:90,sampleHz:8})})}});
 await page.route('**/functions/v1/setka-semantic-v35',async route=>{try{const body=JSON.parse(route.request().postData()||'{}');const out=await post({action:'ingest',kind:'semantic',runId:begin.runId,runToken:begin.runToken,requestBody:body});await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out)})}catch(e){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,favorites:0,acceptedExposures:0,facts:true})})}});
 let ok=true,error='';
 try{
  await page.goto(FRONT,{waitUntil:'domcontentloaded',timeout:45000}); await page.waitForSelector('.pattern-tile',{timeout:20000}); await log('front_open','library',{archetype:p.archetype,dailyRhythm:plan||null});
  const policy=p.behaviorPolicy||{};
  if(chance(policy.communityProbability)){await page.click('#communityPagerButton').catch(()=>{});await log('library_page','community');await sleep(400);await page.click('#libraryPagerButton').catch(()=>{})}
  await tapFirstTile(page); await page.waitForSelector('#gameScreen.active',{timeout:10000}); await log('pattern_open','first_pattern');
  if(chance(policy.readInstructions)){await page.click('#instructionsButton').catch(()=>{});await log('instructions_open','instructions');await sleep(300);await page.click('#closeInstructionsButton').catch(()=>{})}
  const gestures=Math.min(8,pick(policy.gestures,3));
  for(let i=0;i<gestures;i++){const box=await page.locator('#patternCanvas').boundingBox();if(!box)break;const x=box.x+box.width*(.2+Math.random()*.6),y=box.y+box.height*(.25+Math.random()*.5);await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+(Math.random()-.5)*100,y+(Math.random()-.5)*120,{steps:4});await page.mouse.up();await log('gesture','patternCanvas',{i});if(chance(.35))await page.click('#colorButton').catch(()=>{});await sleep(180)}
  const switches=Math.min(4,pick(policy.patternSwitches,1));for(let i=0;i<switches;i++){await page.click(i%2?'#prevButton':'#nextButton').catch(()=>{});await log('pattern_switch',i%2?'prev':'next');await sleep(220)}
  if(chance(policy.saveProbability)){await page.click('#favoriteButton').catch(()=>{});await log('favorite_toggle','gameplay')}
  const dwell=Math.min(12,Math.max(2,pick(policy.dwellSeconds,10)));await sleep(dwell*1000);
  if(chance(policy.abandonProbability)){await log('abandon','gameplay')}else{await page.click('#libraryButton').catch(()=>{});await log('return_library','library');if(chance(policy.returnProbability)){await tapFirstTile(page).catch(()=>{});await sleep(800);await page.click('#libraryButton').catch(()=>{});await log('revisit','first_pattern')}}
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide'))).catch(()=>{});await sleep(1000);
 }catch(e){ok=false;error=String(e?.message||e)}
 await post({action:'complete',runId:begin.runId,runToken:begin.runToken,ok,steps:seq,error,note:`${p.displayName} / ${p.archetype} / ${plan?.timeZone||'no-rhythm'} ${plan?.plannedHour??'—'}h`}).catch(()=>{}); await ctx.close(); if(!ok)throw new Error(`${p.personaKey}: ${error}`);
}

const executable=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const data=await post({action:'personas'});
const planned=(data.personas||[]).map(p=>({p,plan:rhythmPlan(p)}));
console.log('Synthetic daily plans:',planned.map(x=>({persona:x.p.personaKey,...x.plan})));
const due=planned.filter(x=>x.plan.due).sort((a,b)=>a.plan.waitMs-b.plan.waitMs);
if(!due.length){console.log('No synthetic personas due in this hourly window.');process.exit(0)}
const browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox']});
const started=Date.now();
try{for(const x of due){const remaining=Math.max(0,x.plan.waitMs-(Date.now()-started));if(remaining)await sleep(remaining);try{await runPersona(browser,x.p,x.plan)}catch(e){console.error(e)}}}finally{await browser.close()}
