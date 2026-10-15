// Isolated browser/API fixtures only. A real localhost HTTP fixture serves front
// keepalive requests through reload; admin routes preserve the production CSP.
import assert from 'node:assert/strict';import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {resolve,extname} from 'node:path';import {mkdirSync} from 'node:fs';import {chromium,webkit} from 'playwright';
import {buildData} from '../research-v1/model.mjs';import {patterns,configKey} from '../research-v1/renderer.mjs';
const port=49319,base=`http://127.0.0.1:${port}`,root=process.cwd();
const catalog=patterns.map(x=>({pattern_id:x.id,title:x.id==='dandelion'?'Одуванчик':x.title,revision:1}));let ownIssued=[],savedArchive={payload:{openedPatterns:[],symptoms:[],checkins:[]},favorites:[]};
const fixtureMerge=(old=[],next=[])=>[...new Map([...old,...next].map(x=>[x.id,x])).values()];
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,base).pathname;
  if(path.startsWith('/functions/v1/')){
   res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','content-type,apikey,authorization,x-client-info');
   res.setHeader('Access-Control-Allow-Private-Network','true');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
   if(req.method==='OPTIONS'){res.writeHead(204).end();return}
   let body='';for await(const chunk of req)body+=chunk;const b=body?JSON.parse(body):{};
   let out={ok:true,items:[],notes:[],metrics:{},profile:{}};
   if(path.endsWith('setka-research-admin-v1'))out={ok:true,items:catalog};
   if(path.endsWith('setka-tester-account-v40')){
    if(b.action==='status')out={ok:true,claimed:true,authenticated:true,hasPassword:true,consented:true,testerId:'T-OWNERAAA'};
    if(b.action==='my-invites')out={ok:true,items:ownIssued};
    if(b.action==='issue-invites'){const items=Array.from({length:b.count},(_,i)=>({testerId:`T-FIXTURE${i}`,code:`SETKA-ISOLATED-${i}`}));ownIssued.push(...items.map(x=>({tester_id:x.testerId,invite_label:b.label,active:true,issued_by_tester_id:'T-OWNERAAA',created_at:new Date().toISOString()})));out={ok:true,batchId:'00000000-0000-4000-8000-000000000021',items};}
   }
   if(path.endsWith('setka-tester-archive-v37')){
    if(b.action==='sync'){
     savedArchive={payload:{...b.archive,symptoms:fixtureMerge(savedArchive.payload.symptoms,b.archive.symptoms),checkins:fixtureMerge(savedArchive.payload.checkins,b.archive.checkins)},favorites:b.favorites||[],updatedAt:new Date().toISOString()};
     out={ok:true,updatedAt:savedArchive.updatedAt,stateHistory:{symptoms:savedArchive.payload.symptoms,checkins:savedArchive.payload.checkins},counts:{symptoms:savedArchive.payload.symptoms.length,checkins:savedArchive.payload.checkins.length}};
    }else out={ok:true,archive:{...savedArchive,sourceDevices:1}};
   }
   res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(out));return;
  }
  const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+'/')){res.writeHead(403).end();return}
  const bytes=await readFile(file),type={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'}[extname(file)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':type}).end(bytes);
 }catch(error){res.writeHead(error.code==='ENOENT'?404:500).end('Isolated fixture request failed')}
});
let browser;
const localApiTransport=()=>{const nativeFetch=window.fetch.bind(window);window.fetch=(input,init)=>{
 const prefix='https://gfchgaphzhxufwdhrcis.supabase.co';
 return nativeFetch(typeof input==='string'&&input.startsWith(prefix)?location.origin+input.slice(prefix.length):input,init);
};};
try{
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',ok)});
 browser=await (process.env.SETKA_BROWSER==='webkit'?webkit:chromium).launch({headless:true,args:process.env.SETKA_BROWSER==='webkit'?[]:['--no-sandbox']});
 const frontContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),front=await frontContext.newPage(),errors=[];
 front.on('pageerror',e=>errors.push({page:'front',message:e.message,stack:e.stack}));
 await front.addInitScript(localApiTransport);
 await front.addInitScript(()=>localStorage.setItem('setka-v40:cabinet-session',JSON.stringify({token:'isolated-fixture-only'})));
 await front.goto(base+'/standalone-v34.html',{waitUntil:'domcontentloaded'});await front.waitForFunction(()=>!!window.__SETKA_PATTERN_CATALOG_V1__&&!!window.SetkaStandaloneV34.activity);
 assert.equal(await front.locator('.base-tile .setka-new-pattern').count(),7);
 assert.equal(await front.locator('.base-tile .setka-new-pattern').first().innerText(),'new');
 const firstPreview=await front.locator('.base-tile .thumb-canvas').first().evaluate(c=>c.toDataURL());
 await front.waitForFunction(before=>document.querySelector('.base-tile .thumb-canvas').toDataURL()!==before,firstPreview);
 assert.equal(await front.evaluate(()=>(window.SetkaStandaloneV34.getData().patternExposures||[]).length),0,'animated previews are not recorded views');

 await front.locator('.base-tile[data-pattern-id="dandelion"]').click();
 assert.equal(await front.locator('.base-tile[data-pattern-id="dandelion"] .setka-new-pattern').count(),1,'choice is not a pattern opening');
 await front.getByRole('button',{name:'Просто посмотреть',exact:true}).click();await front.waitForFunction(()=>!!window.SetkaStandaloneV34.activity.current());
 assert.equal(await front.locator('.base-tile[data-pattern-id="dandelion"] .setka-new-pattern').count(),0);
 await front.locator('#patternCanvas').tap({position:{x:190,y:330}});await front.evaluate(()=>window.SetkaStandaloneV34.activity.flush());
 const activity=await front.evaluate(()=>window.SetkaStandaloneV34.getData().activityIntervals);assert.ok(activity.some(x=>x.patternId==='dandelion'&&x.touches>0&&x.coverage==='observed'));assert.ok(activity.every(x=>x.configKey&&x.exposureId));
 await front.locator('#libraryButton').click();await front.reload({waitUntil:'domcontentloaded'});await front.waitForFunction(()=>!!window.__SETKA_PATTERN_CATALOG_V1__);
 assert.equal(await front.locator('.base-tile .setka-new-pattern').count(),6);
 catalog.find(x=>x.pattern_id==='dandelion').title='Новое имя <b>паттерна</b>';
 await front.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());
 assert.equal(await front.locator('.base-tile[data-pattern-id="dandelion"]').getAttribute('aria-label'),'Открыть паттерн Новое имя <b>паттерна</b>. Удерживай, чтобы сохранить');
 await front.locator('#st34Nav [data-p="me"]').click();await front.locator('#st40AccountButton').click();await front.getByRole('button',{name:/^Пригласить в SETKA/}).click();
 await front.getByLabel('Название или назначение приглашений').fill('Изолированные приглашения');await front.getByLabel('Сколько новых ID').fill('2');await front.getByRole('button',{name:'Создать пригласительные ID',exact:true}).click();
 await front.getByText('Мои приглашения · 2',{exact:true}).waitFor();assert.equal(ownIssued.length,2);assert.equal(await front.locator('#st40InvitePanel').count(),1);

 const stale=await front.context().newPage();stale.on('pageerror',e=>errors.push({page:'older-tab',message:e.message}));await stale.addInitScript(localApiTransport);await stale.goto(base+'/standalone-v34.html');await stale.waitForFunction(()=>!!window.SetkaStandaloneV34);
 await front.locator('#st34Nav [data-p="symptoms"]').click();await front.locator('.st34-add-state').click();await front.getByRole('button',{name:'Усталость',exact:true}).tap();await front.locator('.st34-state-card').waitFor();
 await front.locator('.st34-mark-btn').click();await front.locator('.st34-mark-editor.open input').fill('6');await front.getByRole('button',{name:'Сохранить отметку',exact:true}).tap();
 await front.getByRole('button',{name:'Проверить сохранение',exact:true}).click();await front.getByText(/Состояния и отметки сохранены в аккаунте/).waitFor();
 const paused=await front.locator('.base-tile .thumb-canvas').first().evaluate(c=>c.toDataURL());await new Promise(r=>setTimeout(r,180));assert.equal(await front.locator('.base-tile .thumb-canvas').first().evaluate(c=>c.toDataURL()),paused,'previews pause behind a sheet');
 await stale.locator('#st34Nav [data-p="today"]').click();assert.ok(await stale.evaluate(()=>JSON.parse(localStorage.getItem('setka-standalone:v34')).symptoms.some(x=>x.name==='Усталость')));
 await front.reload();await front.locator('#st34Nav [data-p="symptoms"]').click();await front.getByText('Усталость',{exact:true}).waitFor();assert.match(await front.locator('.st34-state-now').innerText(),/6\/10/);
 const other=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});other.on('pageerror',e=>errors.push({page:'other-device',message:e.message}));await other.addInitScript(localApiTransport);await other.addInitScript(()=>localStorage.setItem('setka-v40:cabinet-session',JSON.stringify({token:'isolated-fixture-only'})));await other.goto(base+'/standalone-v34.html');await other.waitForFunction(()=>!!window.__SETKA_PRIVATE_CORPUS_V40__);await other.evaluate(()=>window.__SETKA_PRIVATE_CORPUS_V40__.sync());await other.locator('#st34Nav [data-p="symptoms"]').click();await other.getByText('Усталость',{exact:true}).waitFor();assert.match(await other.locator('.st34-state-now').innerText(),/6\/10/);
 console.log('NEW BADGE, LIVE PREVIEWS WITHOUT USAGE, MULTITAB STATE/CHECKIN RETENTION AND CLOUD RESTORE ON ANOTHER DEVICE PASS');
 const admin=await browser.newPage({viewport:{width:1200,height:900}});admin.on('pageerror',e=>errors.push({page:'admin',message:e.message,stack:e.stack}));
 const start='2026-10-14T17:00:00Z',cfg=patterns.find(x=>x.id==='dandelion').defaults,key=configKey(cfg,'dandelion'),issuer='T-OWNERAAA';
 const raw={accounts:[{tester_id:issuer,created_at:start}],devices:[{device_id:'fixture-device',subject_key:issuer}],patternCatalog:catalog,patternNameHistory:[{pattern_id:'dandelion',revision:1,title:'Одуванчик',created_at:start}],issuedInvites:[],inviteBatches:[],archives:[{device_id:'fixture-device',tester_id:issuer,payload:{sessions:[{id:'s',startedAt:start,endedAt:'2026-10-14T17:00:20Z',measuredActiveMs:20000}],patternExposures:[{exposureId:'e',sessionId:'s',patternId:'dandelion',patternVersion:1,configKey:key,config:cfg,startedAt:start,endedAt:'2026-10-14T17:00:20Z',durationMs:20000}],activityIntervals:[{id:'a',exposureId:'e',sessionId:'s',patternId:'dandelion',configKey:key,startedAt:start,endedAt:'2026-10-14T17:00:15Z',durationMs:15000,touches:3,moves:10,configChanges:2,coverage:'observed'}],physio:{samples:[{id:'p',sessionId:'s',exposureId:'e',patternId:'dandelion',configKey:key,value:82,metric:'heart_rate',unit:'bpm',observedAt:'2026-10-14T17:00:05Z',sourceType:'ble_heart_rate',quality:'ok',payload:{patternVisible:true,config:cfg}}]}}}]};
 raw.archives[0].payload.symptoms=savedArchive.payload.symptoms;raw.archives[0].payload.checkins=savedArchive.payload.checkins;
 const sources=['accounts','accountSessions','accountExposures','accountFavorites','issuedInvites','patternCatalog'].map(key=>({key,ok:true,truncated:false,label:key,count:0}));let chunks=[];
 await admin.context().route('**/functions/v1/**',async r=>{const b=r.request().postDataJSON();let out={ok:true};
  if(b.action==='overview')out={ok:true,data:buildData(raw,sources)};
  if(b.action==='rename-pattern'){const x=catalog.find(x=>x.pattern_id===b.patternId);assert.equal(b.expectedRevision,x.revision);x.title=b.title;x.revision++;raw.patternNameHistory.push({...x,created_at:start});out={ok:true,item:x};}
  if(b.action==='issue-invites'){chunks.push(b.count);const items=Array.from({length:b.count},(_,i)=>({testerId:`T-CI-${raw.issuedInvites.length+i}`,code:`SETKA-CI-${raw.issuedInvites.length+i}`})),batchId=b.batchId||'00000000-0000-4000-8000-000000000022';raw.issuedInvites.push(...items.map(x=>({tester_id:x.testerId,invite_label:b.label,batch_id:batchId,active:true,created_at:start,admin_key_id:'isolated'})));if(!raw.inviteBatches.length)raw.inviteBatches.push({id:batchId,label:b.label,requested_count:b.requestedCount,created_at:start});out={ok:true,items,batchId};}
  if(b.action==='replay')out={ok:true,coverage:'partial',session:{started_at:start},durationMs:20000,events:[{id:'one',type:'gesture_start',tMs:7000,payload:{}}],states:[{tMs:0,state:{view:'game',patternId:'dandelion',patternVersion:1,config:cfg,configKey:key,frame:44}}]};
  await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'content-type,apikey,authorization','access-control-allow-methods':'POST,OPTIONS'},body:JSON.stringify(out)});
 });
 await admin.goto(base+'/standalone-research-admin-v1.html');await admin.locator('#key').fill('isolated-admin-fixture-only');await admin.locator('#login-button').click();await admin.locator('#workspace').waitFor();assert.equal(await admin.locator('.nav').count(),6);
 await admin.locator('.nav[data-page="patterns"]').click();await admin.locator('.pattern-card[data-id="dandelion"]').click();await admin.getByRole('button',{name:'Изменить название',exact:true}).click();await admin.locator('#pattern-title').fill('Изменено в изолированной админке');await admin.getByRole('button',{name:'Сохранить для всех',exact:true}).click();await admin.locator('#detail-content').getByRole('heading',{name:'Изменено в изолированной админке',exact:true}).waitFor();
 await front.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());assert.match(await front.locator('.base-tile[data-pattern-id="dandelion"]').getAttribute('aria-label'),/Изменено в изолированной админке/);
 await admin.locator('#close-dialog').click();await admin.locator('.nav[data-page="participants"]').click();await admin.locator('#invites-tab').click();await admin.getByRole('button',{name:'Создать ID или пакет',exact:true}).click();await admin.locator('#invite-label').fill('Изолированный пакет 101');await admin.locator('#invite-count').fill('101');await admin.locator('#invite-generate').click();await admin.getByText('Создано 101 из 101. Коды доступны до закрытия окна.',{exact:true}).waitFor();assert.deepEqual(chunks,[100,1]);assert.equal(raw.issuedInvites.length,101);
 await admin.locator('#close-dialog').click();await admin.locator('#people-tab').click();await admin.locator('#content [data-action="person"]').first().click();assert.match(await admin.locator('#detail-content').innerText(),/Усталость/);await admin.locator('#close-dialog').click();await admin.locator('.nav[data-page="sessions"]').click();await admin.locator('#sessions-results [data-action="session"]').click();assert.match(await admin.locator('#session-pulse').innerText(),/82 уд\/мин/);assert.match(await admin.locator('#session-pulse').innerText(),/3 касаний/);await admin.locator('.event-item').click();assert.match(await admin.locator('.replay-controls-top').innerText(),/Пульс: 82 уд\/мин/);
 await admin.locator('#close-dialog').click();await admin.locator('.nav[data-page="research"]').click();assert.match(await admin.locator('#research-body').innerText(),/82 уд\/мин/);await admin.locator('[data-research-tab="behavior"]').click();assert.match(await admin.locator('#research-body').innerText(),/Движения и настройки/);
 // On WebKit a single keepalive request cancelled during the deliberate
 // front reload can be reported as a CORS load failure even though the local
 // archive fixture has already confirmed state/checkin persistence and restore.
 // Do not whitelist any real API failures, repeated failures or other scripts.
 const cancelledFixtureSync=errors.filter(e=>process.env.SETKA_BROWSER==='webkit'&&
   e.page==='front'&&String(e.message||'').includes('/functions/v1/setka-tester-archive-v37 due to access control checks.')&&
   String(e.stack||'').includes('standalone-private-corpus-v40.js')&&
   String(e.stack||'').includes('standalone-public-visual-capsules-v40.js'));
 assert.ok(cancelledFixtureSync.length<=1,'unexpected repeated WebKit fixture transport failure');
 assert.deepEqual(errors.filter(e=>!cancelledFixtureSync.includes(e)),[]);
 console.log('ISOLATED FRONT/ADMIN NAME LINK, NEW BADGE PERSISTENCE, ACCOUNT INVITES, BULK IDS, PULSE TIMELINE AND BEHAVIOR UI PASS');
}catch(error){
 for(const context of browser?.contexts()||[])for(const page of context.pages()){
  console.log('ISOLATED FIXTURE FAILURE STATE',page.url(),(await page.locator('body').innerText()).slice(-5000));
  mkdirSync('tests/visual-smoke',{recursive:true});await page.screenshot({path:`tests/visual-smoke/management-fixture-${context.pages().indexOf(page)}.png`});
 }
 throw error;
}finally{await browser?.close();await new Promise(ok=>server.close(ok))}
