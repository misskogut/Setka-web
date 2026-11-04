// Isolated two-client product flow. Every external call is mocked; no real
// credential, participant, publication or production metric is changed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
import {buildData} from '../research-v1/model.mjs';
import '../standalone-pattern-registry-v1.js';
const R=globalThis.SetkaPatternRegistryV1,id='fixture-next-publication';
const fixture={id,title:'Следующий тестовый паттерн',version:1,colorModes:1,defaults:{radius:5,colorModeIndex:0},controls:[['Радиус','radius',1,20,1,'Слева ↑↓',1]],module:'standalone-pattern-fixture-next-publication.js'};
R.register(fixture);
const port=49745,base='http://127.0.0.1:'+port;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
let browser,revision=1,failed=false,order={patternIds:[],revision:0},orderFailure=false;
const startupDefaults=[],names=new Map();
const rows=R.list().map(p=>({pattern_id:p.id,state:p.id===id?'testing':'published',revision:1})),writes=[];
const archive={notes:[{id:'retained-note',text:'Retained original',patternId:id,config:R.defaults(id)}]};
const original=JSON.stringify(archive);
const data=buildData({accounts:[],archives:[],patternCatalog:[]},[]);
try{
 for(let n=0;n<40;n++){try{if((await fetch(base+'/standalone-v34.html')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(process.env.SETKA_BROWSER==='webkit'?webkit:chromium).launch({headless:true});
 const context=await browser.newContext({viewport:{width:1100,height:900}});
 const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 await context.route('**/standalone-pattern-registry-v1.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('standalone-pattern-registry-v1.js','utf8')+'\nwindow.SetkaPatternRegistryV1.register('+JSON.stringify(fixture)+');'}));
 await context.route('**/standalone-pattern-fixture-next-publication.js*',r=>r.fulfill({contentType:'text/javascript',body:`window.SetkaPatternRegistryV1.bindRenderer('${id}',(c,w,h,p,f)=>{c.fillStyle='#000';c.fillRect(0,0,w,h);c.fillStyle='#fff';c.fillRect(w/2+Math.sin(f/20)*20,h/2,p.radius,p.radius);});`}));
 await context.route('**/functions/v1/**',async route=>{
  const request=route.request(),cors={'access-control-allow-origin':base,'access-control-allow-credentials':'true','access-control-allow-headers':'content-type,apikey,authorization,x-client-info','access-control-allow-methods':'POST,OPTIONS'};
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:cors,body:''});
  let b={};try{b=request.postDataJSON()||{};}catch{}
  let out={ok:true,items:[],metrics:{},patternMetrics:[],notes:[]},status=200;
  if(['catalog','manage-catalog'].includes(b.action)){
   if(failed&&b.action==='catalog'){status=503;out={error:'publication_unavailable'};}
   else out={ok:true,order,registryAvailable:true,registryRevision:R.revision(),publicationRevision:revision,publication:rows,
    items:R.list().filter(p=>b.action==='manage-catalog'||rows.find(r=>r.pattern_id===p.id)?.state==='published').map(p=>({pattern_id:p.id,title:names.get(p.id)?.title||p.title,revision:names.get(p.id)?.revision||1})),defaults:startupDefaults};
  }
  if(b.action==='set-pattern-order'){
   if(orderFailure){status=503;out={error:'isolated_order_unavailable'};}
   else if(b.expectedRevision!==order.revision){status=409;out={error:'revision_conflict'};}
   else{order={patternIds:b.patternIds.slice(),revision:order.revision+1};out={ok:true,order};}
  }
  if(b.action==='set-pattern-publication'){
   const row=rows.find(r=>r.pattern_id===b.patternId);assert.equal(b.expectedRevision,row.revision);
   row.state=b.state;row.revision=++revision;writes.push(b);out={ok:true,item:row};
  }
  if(b.action==='save-pattern-defaults'){const item={pattern_id:b.patternId,pattern_version:b.patternVersion,schema_version:b.schemaVersion,config:b.config,revision:1};startupDefaults.push(item);out={ok:true,item};}
  if(b.action==='rename-pattern'){const item={pattern_id:b.patternId,title:b.title,revision:2};names.set(b.patternId,item);out={ok:true,item};}
  if(b.action==='overview')out={ok:true,data};
  await route.fulfill({status,headers:cors,contentType:'application/json',body:JSON.stringify(out)});
 });
 const front=await context.newPage(),admin=await context.newPage();
 await front.goto(base+'/standalone-v34.html');
 await front.waitForFunction(()=>window.__SETKA_PATTERN_CATALOG_V1__?.status()?.ok);
 const tile=front.locator('#allPatternsPanel [data-pattern-id="'+id+'"]');
 assert.equal(await tile.count(),0,'new module is not public');
 assert.equal(await front.locator('#allPatternsPanel .setka-new-pattern').count(),R.list().length-1,'first visit: every available pattern is new');
 await admin.goto(base+'/standalone-research-admin-v1.html#patterns');
 await admin.locator('#key').fill('isolated-test-credential');await admin.locator('#login-button').click();
 await admin.locator('.pattern-card[data-id="'+id+'"]').click();
 const publication=admin.locator('#pattern-publication');
 await publication.getByRole('button',{name:'Открыть тестовую область',exact:true}).click();
 await publication.getByRole('slider',{name:'Радиус',exact:true}).press('End');
 assert.equal(writes.length,0,'sandbox cannot publish or record a participant');
 assert.equal(await tile.count(),0,'sandbox edits stay private');
 await publication.getByRole('button',{name:'Опубликовать',exact:true}).click();
 await admin.locator('#pattern-publication').getByRole('button',{name:'Выключить',exact:true}).waitFor();
 await front.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());
 assert.equal(await tile.count(),1,'publication reaches a second client');
 await front.evaluate(id=>window.SetkaApp.openConfig(window.SetkaApp.getPatternDefaults(id),{type:'base',id,patternId:id}),id);
 await front.locator('#gameScreen.active').waitFor();
 await admin.locator('#pattern-publication').getByRole('button',{name:'Выключить',exact:true}).click();
 await admin.locator('#pattern-publication').getByRole('button',{name:'Опубликовать',exact:true}).waitFor();
 await front.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());
 assert.equal(await tile.count(),0,'disable removes public tile');
 assert.equal(await front.locator('#gameScreen.active').count(),0,'open disabled pattern returns to library');
 assert.equal(await front.evaluate(id=>window.SetkaApp.openConfig(window.SetkaApp.getPatternDefaults(id),{type:'base',id,patternId:id}),id),false,'direct-open cannot bypass publication');
 await admin.locator('#pattern-publication').getByRole('button',{name:'Опубликовать',exact:true}).click();
 await admin.locator('#pattern-publication').getByRole('button',{name:'Выключить',exact:true}).waitFor();
 await front.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());
 assert.equal(await tile.count(),1,'same algorithm can be republished without replacing its identity');
 failed=true;await front.reload();
 await front.waitForFunction(()=>window.__SETKA_PATTERN_CATALOG_V1__?.status()?.ok===false);
 assert.equal(await front.locator('#allPatternsPanel .pattern-tile').count(),0,'fresh client fails closed during unavailable publication service');
 failed=false;await front.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());assert.equal(await tile.count(),1,'reconnection recovers confirmed catalog');
 // The real admin editor changes one server-owned order, independently of publication.
 await admin.locator('#close-dialog').click();
 const editor=admin.locator('#pattern-order');
 await admin.setViewportSize({width:390,height:844});
 const mini=admin.locator('#pattern-mini-order'),miniIds=()=>mini.locator('.pattern-mini-tile').evaluateAll(ts=>ts.map(t=>t.dataset.patternId));
 assert.equal(await mini.locator('.pattern-mini-tile').count(),R.list().length,'four-column grid includes future unknown module');
 await mini.locator('.pattern-mini-tile').first().scrollIntoViewIfNeeded();
 const boxes=await mini.locator('.pattern-mini-tile').evaluateAll(ts=>ts.slice(0,5).map(t=>{const r=t.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}}));
 assert.ok(boxes.slice(0,4).every(r=>Math.abs(r.y-boxes[0].y)<2),'four miniature cards in a row on mobile');
 assert.ok(boxes[4].y>boxes[0].y,'fifth card starts next row');
 const beforeMini=await miniIds();
 await admin.mouse.move(boxes[0].x+boxes[0].w/2,boxes[0].y+boxes[0].h/2);await admin.mouse.down();
 await admin.mouse.move(boxes[1].x+boxes[1].w/2,boxes[1].y+boxes[1].h/2,{steps:10});await admin.mouse.up();
 assert.deepEqual((await miniIds()).slice(0,2),[beforeMini[1],beforeMini[0]],'pointer drag changes only draft');
 assert.equal(order.revision,0,'drag does not publish order before Save');
 await mini.getByRole('button',{name:'Отменить изменения',exact:true}).click();assert.deepEqual(await miniIds(),beforeMini);
 await mini.locator('.pattern-mini-tile').first().focus();await admin.keyboard.press('ArrowRight');await admin.keyboard.press('ArrowLeft');
 assert.deepEqual(await miniIds(),beforeMini,'keyboard has equivalent accessible control');
 await mini.getByRole('button',{name:'Отменить изменения',exact:true}).click();

 assert.equal(await editor.locator('.pattern-manage-card').count(),R.list().length,'every algorithm has a real card');
 assert.equal(await editor.locator('.pattern-manage-card .pattern-order-controls select').count(),R.list().length,'positions live on cards');
 assert.equal(await editor.locator('.pattern-manage-card .pattern-quick-publication').count(),R.list().length,'publication lives on cards');
 const quickCard=editor.locator('.pattern-manage-card[data-pattern-id="'+id+'"]');
 await quickCard.getByRole('button',{name:'Выключить',exact:true}).click();
 await quickCard.getByRole('button',{name:'Опубликовать',exact:true}).waitFor();
 await front.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());assert.equal(await tile.count(),0);
 await quickCard.getByRole('button',{name:'Опубликовать',exact:true}).click();
 await quickCard.getByRole('button',{name:'Выключить',exact:true}).waitFor();
 await front.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());assert.equal(await tile.count(),1);
 await quickCard.locator('summary').click();
 await quickCard.getByRole('slider',{name:'Радиус',exact:true}).waitFor();
 assert.equal(await admin.locator('#detail-dialog[open]').count(),0,'startup editor stays inline');
 await quickCard.getByRole('slider',{name:'Радиус',exact:true}).press('End');
 assert.equal(await quickCard.getByRole('slider',{name:'Радиус',exact:true}).inputValue(),'20');
 await admin.locator('#refresh').click();
 assert.equal(await quickCard.getByRole('slider',{name:'Радиус',exact:true}).inputValue(),'20','refresh preserves inline draft');
 await quickCard.getByRole('button',{name:'Сохранить стартовые настройки',exact:true}).click();
 await quickCard.getByRole('status').filter({hasText:'Настройки сохранены.'}).waitFor();
 await front.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());
 assert.equal(await front.evaluate(id=>window.SetkaApp.getPatternDefaults(id).radius,id),20,'inline startup reaches front defaults');
 assert.equal(await tile.locator('canvas').count(),1,'updated shared preview remains available');
 await quickCard.locator('summary').click();
 await editor.locator('.pattern-manage-card[data-pattern-id="'+id+'"] .pattern-order-controls select').selectOption('0');
 await admin.locator('#refresh').click();
 assert.equal(await editor.locator('.pattern-order-controls select').first().getAttribute('aria-label'),'Позиция: '+fixture.title,'routine refresh keeps unsaved draft');
 orderFailure=true;await editor.getByRole('button',{name:'Сохранить порядок',exact:true}).first().click();
 await editor.getByRole('status').filter({hasText:'Сохранение не подтверждено'}).first().waitFor();
 assert.equal(order.revision,0,'network failure cannot claim a commit');
 orderFailure=false;await editor.getByRole('button',{name:'Сохранить порядок',exact:true}).first().click();
 await editor.getByRole('status').filter({hasText:'Порядок подтверждён сервером'}).first().waitFor();
 assert.equal(order.patternIds[0],id);assert.equal(order.revision,1);
 fs.mkdirSync('tests/visual-smoke',{recursive:true});await admin.screenshot({path:'tests/visual-smoke/platform-order-'+(process.env.SETKA_BROWSER||'chromium')+'.png',fullPage:true});
 await front.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());
 const baseIds=()=>front.locator('#allPatternsPanel > .base-tile').evaluateAll(ts=>ts.map(t=>t.dataset.patternId));
 const newestUnseen=R.ids().filter(x=>x!==id).at(-1);
 assert.equal((await baseIds())[0],newestUnseen,'unseen patterns stay above manually promoted viewed pattern');
 // An intentional information-preview opening counts; passive library rendering does not.
 const infoTile=front.locator('#allPatternsPanel [data-pattern-id="'+newestUnseen+'"]');
 const exposuresBefore=await front.evaluate(()=>window.SetkaStandaloneV34.getData().patternExposures.length);
 await infoTile.locator('.st34-info').click();
 await front.locator('#st34InfoOverlay').waitFor();
 await front.locator('#st34InfoOverlay .st34-close').click();
 assert.equal(await infoTile.locator('.setka-new-pattern').count(),0,'preview opening removes New');
 assert.equal(await front.evaluate(()=>window.SetkaStandaloneV34.getData().patternExposures.length),exposuresBefore,'preview does not invent gameplay exposure');
 assert.equal(await front.locator('#gameScreen.active').count(),0);
 // Every gameplay entry follows the same rule, even for a future unknown module.
 for(const pid of R.ids()){
  const ok=await front.evaluate(pid=>window.SetkaApp.openConfig(window.SetkaApp.getPatternDefaults(pid),{type:'base',id:pid,patternId:pid}),pid);
  assert.equal(ok,true);await front.locator('#libraryButton').click();
 }
 assert.equal(await front.locator('#allPatternsPanel .setka-new-pattern').count(),0);
 assert.deepEqual(await baseIds(),order.patternIds,'after opening: exact owner order, not tap dates');
 await front.evaluate(async()=>{await window.SetkaStandaloneV34.whenSaved?.()});await front.reload();
 await front.waitForFunction(()=>window.__SETKA_PATTERN_CATALOG_V1__?.status()?.ok);
 assert.equal(await front.locator('#allPatternsPanel .setka-new-pattern').count(),0,'seen survives reload/archive hydration');
 assert.deepEqual(await baseIds(),order.patternIds);
 // A concurrent owner edit must produce an explicit revision conflict, never a silent overwrite.
 await admin.locator('#refresh').click();await admin.locator('#refresh').waitFor({state:'visible'});
 await editor.getByRole('button',{name:'Вниз: '+fixture.title,exact:true}).click();
 await editor.getByRole('status').filter({hasText:'Порядок изменён.'}).first().waitFor();
 order={patternIds:order.patternIds.slice().reverse(),revision:2};
 await editor.getByRole('button',{name:'Сохранить порядок',exact:true}).first().click();
 await editor.getByRole('status').filter({hasText:'другом окне'}).first().waitFor();
 assert.equal(order.revision,2);
 await editor.getByRole('button',{name:'Загрузить текущий порядок',exact:true}).first().click();
 await editor.getByRole('status').filter({hasText:'Порядок подтверждён сервером'}).first().waitFor();
 await front.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());
 assert.deepEqual(await baseIds(),order.patternIds,'second client sees concurrent confirmed order');
 await front.evaluate(()=>{window.SetkaPatternRegistryV1.applyOrder({patternIds:[],revision:1});window.__SETKA_PATTERN_CATALOG_V1__.decorate()});
 assert.deepEqual(await baseIds(),order.patternIds,'late order response is ignored');

 await admin.locator('.pattern-manage-card[data-pattern-id="'+id+'"]').getByRole('button',{name:'Изменить название',exact:true}).click();
 await admin.locator('#pattern-title').fill('Новое название <тест>');
 await admin.getByRole('button',{name:'Сохранить для всех',exact:true}).click();
 await admin.locator('#detail-dialog[open]').waitFor({state:'hidden'});
 assert.equal(await admin.locator('.pattern-manage-card[data-pattern-id="'+id+'"] h2').innerText(),'Новое название <тест>');
 assert.equal(await mini.locator('[data-pattern-id="'+id+'"] .mini-pattern-label').innerText(),'Новое название <тест>');
 await front.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());
 assert.equal(await front.getByRole('button',{name:'Открыть паттерн Новое название <тест>. Удерживай, чтобы сохранить',exact:true}).count(),1,'rename reaches second client safely');
 await admin.locator('.pattern-manage-card[data-pattern-id="'+id+'"]').getByRole('button',{name:'Изменить название',exact:true}).click();
 await admin.getByRole('button',{name:'Сохранить для всех',exact:true}).click();
 await admin.locator('#detail-dialog[open]').waitFor({state:'hidden'});
 assert.equal(JSON.stringify(archive),original);assert.deepEqual(errors,[]);
 console.log('ORDER: ADMIN → SAVE/READBACK → TWO CLIENTS → PREVIEW/NEW → RELOAD → CONFLICT → STALE PASS; PUBLICATION: DRAFT → SANDBOX → PUBLISH → SECOND CLIENT → DISABLE → DIRECT-OPEN GUARD → REPUBLISH → OUTAGE/RECOVERY PASS');
}finally{await browser?.close();server.kill('SIGTERM');}
