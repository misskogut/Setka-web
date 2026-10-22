import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
import {buildData} from '../research-v1/model.mjs';
import '../standalone-pattern-registry-v1.js';
const R=globalThis.SetkaPatternRegistryV1;
const port=49741,base='http://127.0.0.1:'+port;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fixture=(id,second=false)=>({id,title:id,version:1,colorModes:3,module:'standalone-pattern-'+id+'.js',
 defaults:second?{cells:7,bend:.3,colorModeIndex:0}:{radius:12,tempo:.3,colorModeIndex:0},
 controls:second?[['Число ячеек','cells',3,25,1,'↑↓',1],['Изгиб','bend',0,1,.01,'←→',1]]:
 [['Радиус','radius',3,40,1,'Слева ↑↓',1],['Темп','tempo',.05,2,.05,'Снизу ←→',1]]});
const fixtures=[fixture('fixture-shapes'),fixture('fixture-fields',true)];
for(const p of fixtures)R.register(p);
const names=new Map(),defaults=new Map();
let browser,apiFailure=false,outdated=false,observed=null;
try{
 for(let n=0;n<45;n++){try{if((await fetch(base+'/standalone-v34.html')).ok)break}catch{}await sleep(100)}
 browser=await (process.env.SETKA_BROWSER==='webkit'?webkit:chromium).launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];context.on('page',page=>page.on('pageerror',e=>errors.push(e.stack||e.message)));
 await context.route('**/standalone-pattern-registry-v1.js*',route=>route.fulfill({contentType:'text/javascript',body:
  fs.readFileSync('standalone-pattern-registry-v1.js','utf8')+'\n'+fixtures.map(p=>'window.SetkaPatternRegistryV1.register('+JSON.stringify(p)+');').join('\n')}));
 await context.route('**/standalone-pattern-fixture-*.js*',route=>{
  const id=new URL(route.request().url()).pathname.match(/standalone-pattern-(fixture-[a-z-]+)\.js/)[1];
  return route.fulfill({contentType:'text/javascript',body:`window.SetkaPatternRegistryV1.bindRenderer(document.currentScript.dataset.patternId,function(ctx,w,h,c,f){ctx.save();ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.fillStyle=c.colorModeIndex?'cyan':'white';const size=c.radius||c.cells*3;ctx.fillRect(w/2-size/2+Math.sin(f*(c.tempo||.1))*15,h/2-size/2,size,size);ctx.restore()});`});
 });
 await context.route('**/functions/v1/**',async route=>{
  // Credentialed CORS must reflect the origin, especially in Safari/WebKit.
  const request=route.request(),headers=request.headers();
  const cors={
   'access-control-allow-origin':headers.origin||new URL(base).origin,
   'access-control-allow-credentials':'true',
   'access-control-allow-headers':headers['access-control-request-headers']||'content-type,apikey,authorization,x-client-info',
   'access-control-allow-methods':'GET,POST,OPTIONS',
   'vary':'Origin'
  };
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:cors,body:''});
  let body={};try{body=request.postDataJSON()||{}}catch{}
  if(apiFailure&&body.action==='catalog')return route.fulfill({status:503,contentType:'application/json',headers:cors,body:JSON.stringify({error:'isolated_unavailable'})});
  let out={ok:true,items:[],metrics:{},patternMetrics:[],notes:[],profile:{}};
  if(body.action==='catalog')out={ok:true,registryRevision:outdated?'future-isolated-registry':R.revision(),items:R.list().map(p=>({pattern_id:p.id,title:names.get(p.id)?.title||p.title,revision:names.get(p.id)?.revision||1})),defaults:[...defaults.values()]};
  if(body.action==='overview')out={ok:true,data:buildData({accounts:observed?[{tester_id:'T-ISOLATED',created_at:observed.createdAt}]:[],archives:observed?[{tester_id:'T-ISOLATED',device_id:'fixture-browser',payload:observed}]:[],patternCatalog:R.list().map(p=>({pattern_id:p.id,title:names.get(p.id)?.title||p.title,revision:names.get(p.id)?.revision||1}))})};
  if(body.action==='rename-pattern'){
   const old=names.get(body.patternId)||{revision:1};assert.equal(body.expectedRevision,old.revision);
   const item={pattern_id:body.patternId,title:body.title,revision:old.revision+1};names.set(body.patternId,item);out={ok:true,item};
  }
  if(body.action==='save-pattern-defaults'){
   assert.equal(body.expectedRevision,defaults.get(body.patternId)?.revision||0);
   const item={pattern_id:body.patternId,pattern_version:body.patternVersion,schema_version:body.schemaVersion,config:body.config,revision:body.expectedRevision+1};defaults.set(body.patternId,item);out={ok:true,item};
  }
  await route.fulfill({status:200,contentType:'application/json',headers:cors,body:JSON.stringify(out)});
 });
 const page=await context.newPage();await page.goto(base+'/standalone-v34.html');
 await page.waitForFunction(()=>window.SetkaPatternRegistryV1.ready('fixture-fields'));
 await page.evaluate(async()=>{await window.SetkaPatternPluginsV1.ready();await window.SetkaStandaloneV34.ready;await window.__SETKA_PATTERN_CATALOG_V1__.refresh()});
 assert.deepEqual(errors,[],'front startup must complete before testing integration');
 // Release order is NOT the library order: every unviewed new module appears
 // first, then its first successful opening places it last, persistently.
 await page.waitForFunction(()=>document.querySelector('#allPatternsPanel > .pattern-tile')?.dataset.patternId==='fixture-fields');
 const baseIds=()=>page.locator('#allPatternsPanel > .pattern-tile[data-kind="base"]')
    .evaluateAll(tiles=>tiles.map(t=>t.dataset.patternId));
 let initialIds=await baseIds();
 assert.equal(initialIds[0],'fixture-fields','last auto-registered package is first while unviewed');
 assert.equal(initialIds[1],'fixture-shapes','next newest unopened pattern is next');
 assert.equal(await page.locator('.base-tile[data-pattern-id="fixture-fields"] .setka-new-pattern').count(),1);
 const grid=await page.locator('#allPatternsPanel > .pattern-tile').evaluateAll(tiles=>tiles.slice(0,8).map(el=>{
  const a=el.getBoundingClientRect(),canvas=el.querySelector('canvas'),c=canvas?.getBoundingClientRect();
  return {left:a.left,top:a.top,width:a.width,height:a.height,canvasX:c?c.left+c.width/2:null,tileX:a.left+a.width/2};
 }));
 assert.ok(grid.length>=8,'responsive library has two complete rows');
 for(let i=0;i<grid.length;i++){
  assert.ok(Math.abs(grid[i].width-grid[i].height)<1,'all tiles square '+i);
  assert.ok(Math.abs(grid[i].canvasX-grid[i].tileX)<1,'preview canvas centered '+i);
  if(i%4!==0)assert.ok(Math.abs(grid[i].top-grid[i-1].top)<1,'all four tiles in one straight row '+i);
 }
 const firstView=await page.evaluate(()=>{
  const id='fixture-fields',S=window.SetkaApp;
  return S.openConfig(S.getPatternDefaults(id),{type:'base',id,patternId:id});
 });
 assert.equal(firstView,true);
 await page.locator('#libraryButton').click();
 await page.waitForFunction(()=>document.querySelector('#allPatternsPanel')?.lastElementChild?.dataset.patternId==='fixture-fields');
 const afterFirst=await baseIds();
 assert.equal(afterFirst[0],'fixture-shapes','the next unviewed new module rises to first');
 assert.equal(afterFirst.at(-1),'fixture-fields','opened new pattern goes to the very bottom');
 assert.equal(await page.locator('.base-tile[data-pattern-id="fixture-fields"] .setka-new-pattern').count(),0,'new badge disappears after first view');
 await page.evaluate(async()=>{await window.SetkaStandaloneV34.whenSaved?.()});
 await page.reload();await page.waitForFunction(()=>window.SetkaPatternRegistryV1.ready('fixture-fields'));
 await page.evaluate(async()=>{await window.SetkaStandaloneV34.ready;await window.SetkaPatternPluginsV1.ready()});
 await page.waitForFunction(()=>document.querySelector('#allPatternsPanel')?.lastElementChild?.dataset.patternId==='fixture-fields');
 assert.equal((await baseIds()).at(-1),'fixture-fields','opened status and order survive reload');
 assert.equal(await page.locator('.base-tile[data-pattern-id="fixture-fields"] .setka-new-pattern').count(),0);
 // Open the earlier-released fixture LAST. After both have been seen their
 // display order must nevertheless remain fixture-shapes, fixture-fields.
 await page.evaluate(()=>{
  const S=window.SetkaApp,id='fixture-shapes';
  S.openConfig(S.getPatternDefaults(id),{type:'base',id,patternId:id});
 });
 await page.locator('#libraryButton').click();
 await page.waitForFunction(()=>{
  const ids=[...document.querySelectorAll('#allPatternsPanel > .base-tile')].map(x=>x.dataset.patternId);
  return ids.at(-2)==='fixture-shapes'&&ids.at(-1)==='fixture-fields';
 });
 assert.deepEqual((await baseIds()).slice(-2),['fixture-shapes','fixture-fields'],
   'release order persists even though user opened fields then shapes');
 await page.reload();
 await page.waitForFunction(()=>window.SetkaPatternRegistryV1.ready('fixture-fields'));
 await page.evaluate(async()=>{await window.SetkaStandaloneV34.ready;await window.SetkaPatternPluginsV1.ready()});
 assert.deepEqual((await baseIds()).slice(-2),['fixture-shapes','fixture-fields'],
   'chronological viewed order survives reload');
 // Every mother and every dynamically registered plugin gets its exact
 // shared gesture contract shown in the key: fingers, side, or slider-only.
 for(const pattern of R.list()){
  await page.evaluate(id=>window.SetkaApp.openConfig(window.SetkaApp.getPatternDefaults(id),{type:'base',id,patternId:id}),pattern.id);
  await page.locator('#instructionsButton').click();
  const result=await page.evaluate(id=>{
   const registry=window.SetkaPatternRegistryV1,rows=registry.controls(id),host=document.getElementById('st34KeySheet');
   const panels=[...host.querySelectorAll('.sk-setting')],headings=[...host.querySelectorAll('.sk-section')].map(x=>x.textContent);
   const badges=panels.map(x=>x.querySelector('.sk-gesture').textContent);
   const expected=rows.map(row=>row[6]===0?'Бегунок':row[5]==='Тап'?'Тап по паттерну':row[5]==='Пинч'?'Свести / развести':row[5]);
   const changed=[];
   for(let i=0;i<rows.length;i++){
    const [label,key,min,max]=rows[i],input=panels[i].querySelector('input');
    if(!input||input.getAttribute('aria-label')!==label)throw Error('Wrong range label '+id+'/'+key);
    const config=window.SetkaApp.getConfig(),initial=config[key];
    input.value=Math.abs(initial-min)>0.0000001?String(min):String(max);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    const current=window.SetkaApp.getConfig()[key];
    if(current===initial)throw Error('Slider failed to change '+id+'/'+key);
    changed.push(key);
   }
   return {count:panels.length,expected,badges,headings,changed,description:host.querySelector('.sk-description')?.textContent};
  },pattern.id);
  assert.equal(result.count,pattern.controls.length,'every control has a live slider '+pattern.id);
  assert.deepEqual(result.badges,result.expected,'accurate control gesture names '+pattern.id);
  assert.equal(result.changed.length,pattern.controls.length,'sliders change every parameter '+pattern.id);
  assert.ok(!result.headings.some(x=>/ТОЧНАЯ НАСТРОЙКА/.test(x)));
  assert.ok(!/точной настройкой/i.test(result.description||''));
  for(const control of pattern.controls){
   const [,key,,,,gesture,fingers]=control;
   const title=fingers===0?'ТОЛЬКО БЕГУНКОМ':gesture==='Тап'?'КАСАНИЕ':fingers===2?'ЖЕСТЫ · 2 ПАЛЬЦАМИ':'СВАЙП · 1 ПАЛЬЦЕМ';
   assert.ok(result.headings.includes(title),'gesture title '+pattern.id+'/'+key);
  }
  await page.locator('#st34KeySheet [data-action="close"]').click();
 }
 // Regression: after all patterns have been opened, the grid must be
 // ordered by creation/publication, never by the order the user viewed them.
 await page.locator('#libraryButton').click();
 const viewedOrder=await baseIds();
 assert.deepEqual(viewedOrder,R.list().map(p=>p.id),
  'once every pattern is viewed, release chronology matches the registry exactly');
 assert.ok(viewedOrder.includes('rain'),'the remaining new plugin is still visible');
 assert.ok(!viewedOrder.includes('orbital-threads'),
  'retired Orbital Threads never appears in the active base library');
 assert.equal(await page.locator('[data-kind="base"][data-pattern-id="orbital-threads"]').count(),0,
  'no retired base tile in the visible user front');
 // Rain's actual swipe must change the same field described in the key.
 await page.evaluate(()=>window.SetkaApp.openConfig(window.SetkaApp.getPatternDefaults('rain'),{type:'base',id:'rain',patternId:'rain'}));
 const rainCanvas=page.locator('#patternCanvas'),bounds=await rainCanvas.boundingBox();
 const swipe=async(sx,sy,dx,dy,key)=>{
  const before=await page.evaluate(key=>window.SetkaApp.getConfig()[key],key);
  await page.mouse.move(bounds.x+bounds.width*sx,bounds.y+bounds.height*sy);
  await page.mouse.down();
  await page.mouse.move(bounds.x+bounds.width*sx+dx,bounds.y+bounds.height*sy+dy,{steps:8});
  await page.mouse.up();
  const after=await page.evaluate(key=>window.SetkaApp.getConfig()[key],key);
  assert.notEqual(after,before,'Rain swipe changes '+key);
 };
 await swipe(.52,.85,70,0,'speedFactor');
 await swipe(.20,.52,0,-95,'density');
 await swipe(.80,.52,0,-90,'streakLength');
 await swipe(.52,.12,80,0,'waveStrength');
 // A tap changes Rain motion mode, while a dragging swipe does not.
 const tapBefore=await page.evaluate(()=>window.SetkaApp.getConfig().motionMode);
 await rainCanvas.tap({position:{x:bounds.width*.52,y:bounds.height*.55}});
 const tapAfter=await page.evaluate(()=>window.SetkaApp.getConfig().motionMode);
 assert.equal(tapAfter,(tapBefore+1)%4,'Rain single touch advances its motion mode');
 await page.locator('#libraryButton').click();
 console.log('KEY GESTURES PASS: all mother + plugin sliders, accurate finger zones, Rain swipes and tap');
 await page.evaluate(()=>{
  const C=window.SetkaStandaloneV34,R=window.SetkaPatternRegistryV1,host=document.createElement('div');
  const snapshot=JSON.parse(JSON.stringify(R.snapshot({patternId:'breathing-grid',config:R.defaults('breathing-grid'),frame:0})));
  snapshot.patternVersion=999;
  for(const n of [{id:'isolated-unknown',config:{patternId:'future-unknown'},patternId:'tentacle-orbit'}, {id:'isolated-version',replaySnapshot:snapshot,config:snapshot.config}]){
   C.renderParticipantNoteCard(host,{...n,text:'isolated unavailable snapshot',observedAt:new Date().toISOString()});
  }
  if(host.querySelector('canvas')||host.querySelectorAll('.st34-note-no-preview').length!==2)throw Error('unavailable notes must retain text without substituting a renderer');
 });
 assert.equal(await page.locator('.base-tile').count(),R.list().length,'every existing/new algorithm appears without UI edits');
 for(const id of fixtures.map(p=>p.id)){
  const tile=page.locator(`.base-tile[data-pattern-id="${id}"] canvas`);await tile.scrollIntoViewIfNeeded();const image=await tile.evaluate(c=>c.toDataURL());
  await page.waitForFunction(({id,image})=>document.querySelector(`.base-tile[data-pattern-id="${id}"] canvas`)?.toDataURL()!==image,{id,image});
  await page.evaluate(id=>{const S=window.SetkaApp;S.openConfig(S.getPatternDefaults(id),{type:'exact',id,patternId:id})},id);
  await page.locator('#gameScreen.active').waitFor();
  if(id==='fixture-shapes')await page.evaluate(()=>window.SetkaStandaloneV34.startSession({requestKey:'focus',preState:3,plannedSeconds:600}));
  await page.locator('#instructionsButton').click();
  assert.equal(await page.locator('#st34KeySheet.open .sk-setting').count(),2);
  await page.locator('#st34KeySheet input').first().evaluate((e,value)=>{e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}))},id==='fixture-shapes'?'27':'11');
  await page.locator('#st34KeySheet [data-action="close"]').click();
  await page.waitForFunction(()=>{const x=window.SetkaStandaloneV34.patternExposure.current();return x&&Date.now()-x.startedMs>=200});
  await page.locator('#favoriteButton').click();
  await page.locator('#st34Note').click();
  await page.locator('#st34Layer textarea').last().fill('saved-'+id);
  await page.locator('#st34Layer .st-primary').filter({hasText:'Сохранить'}).click();
  await page.locator('#libraryButton').click();
 }
 await page.evaluate(()=>window.SetkaStandaloneV34.finishSession());
 const saved=await page.evaluate(()=>window.SetkaStandaloneV34.getData().notes.map(n=>n.replaySnapshot));
 observed=await page.evaluate(()=>JSON.parse(JSON.stringify(window.SetkaStandaloneV34.getData())));
 for(const id of fixtures.map(p=>p.id)){assert.ok(observed.patternExposures.some(x=>x.patternId===id&&x.durationMs>0&&x.patternVersion===1),'recorded usage and stable algorithm version '+id);assert.ok(observed.sessions.some(s=>s.usage.some(x=>x.patternId===id)),'new algorithm inherits session history '+id);}
 assert.equal(saved.length,2);assert.deepEqual(saved.map(x=>x.patternId),fixtures.map(p=>p.id));assert.equal(saved[0].config.radius,27);assert.equal(saved[1].config.cells,11);
 assert.equal(await page.evaluate(()=>window.SetkaApp.getFavorites().filter(f=>f.patternId.startsWith('fixture-')).length),2);
 // Retired algorithms can have multiple personal favorites even when their
 // renderer is withdrawn. All five original records must survive, without
 // producing five giant "Слепок сохранён" overlapping gallery placeholders.
 const savedBeforeArchive=await page.evaluate(()=>window.SetkaApp.getFavorites());
 const archivalIds=Array.from({length:5},(_,i)=>'archived-retired-'+i);
 await page.evaluate(async ids=>{
  const S=window.SetkaApp,existing=S.getFavorites();
  const old=ids.map((id,i)=>({
   id,baseId:'orbital-threads',patternId:'orbital-threads',
   patternVersion:1,previewFrame:44+i,createdAt:1761100000000+i,
   config:{patternId:'orbital-threads',lineCount:380+i,trail:75,colorModeIndex:0}
  }));
  await S.restoreFavorites([...old,...existing]);
 },archivalIds);
 // The Today inline sheet may be open after the note/session scenario;
 // switch the canonical page API rather than clicking through that sheet.
 await page.evaluate(()=>window.SetkaApp.setLibraryPage('favorites'));
 const archivedView=await page.evaluate(()=>{
  const host=document.getElementById('favoritesPanel');
  const archived=host.querySelector('.saved-archive-details');
  const cards=[...host.querySelectorAll('.pattern-tile')].map(x=>x.dataset.patternId);
  const rows=[...archived?.querySelectorAll('.saved-archive-entry')||[]];
  const original=window.SetkaApp.getFavorites();
  const stored=window.SetkaStandaloneV34.getData().settings.favoriteCollection.rows;
  return {cards,details:!!archived,closed:!archived?.open,summary:archived?.querySelector('summary')?.textContent,
   archiveCount:rows.length,ids:original.filter(x=>x.unavailable).map(x=>x.id),
   storedCount:stored.length,placeholderCount:host.querySelectorAll('.unavailable-pattern').length};
 });
 assert.equal(archivedView.placeholderCount,0,'unsupported archived renderers never become gallery placeholders');
 assert.ok(archivedView.details&&archivedView.closed,'archived records are accessible but collapsed by default');
 assert.equal(archivedView.archiveCount,5,'all five historical snapshots are retained in archive');
 assert.ok(archivedView.summary.includes('5'),'compact archive count stays visible');
 assert.ok(archivedView.cards.every(id=>id!=='orbital-threads'),'no retired tile in main gallery');
 assert.deepEqual(archivedView.ids,archivalIds,'raw archived favorite identities must survive unchanged');
 assert.equal(archivedView.storedCount,savedBeforeArchive.length+5,'no saved records were deleted');
 await page.evaluate(()=>document.querySelector('#favoritesPanel .saved-archive-details summary').click());
 assert.equal(await page.locator('#favoritesPanel .saved-archive-details').evaluate(e=>e.open),true);
 assert.equal(await page.locator('#favoritesPanel .saved-archive-entry').count(),5);
 await page.evaluate(async rows=>window.SetkaApp.restoreFavorites(rows),savedBeforeArchive);
 await page.reload();await page.waitForFunction(()=>window.SetkaPatternRegistryV1.ready('fixture-fields'));
 const restored=await page.evaluate(()=>window.SetkaStandaloneV34.getData().notes.map(n=>n.replaySnapshot));assert.deepEqual(restored,saved);
 await page.evaluate(()=>window.SetkaStandaloneV34.showNotes());
 await page.locator('.st34-note-card').filter({hasText:'saved-fixture-shapes'}).locator('.st34-note-preview-button').click();
 assert.equal(await page.evaluate(()=>window.SetkaApp.getState().patternId),'fixture-shapes');assert.equal(await page.evaluate(()=>window.SetkaApp.getConfig().radius),27);
 // C: front and admin execute the identical function with the same config/time.
 const admin=await context.newPage();await admin.goto(base+'/standalone-renderer-v40.html');
 await admin.waitForFunction(()=>window.SetkaPatternRegistryV1.ready('fixture-fields'));
 const render=async(p,id)=>p.evaluate(id=>{const S=window.SetkaApp,c=document.createElement('canvas');c.width=220;c.height=260;S.renderPreview(c,S.getPatternDefaults(id),77,id);return c.toDataURL()},id);
 for(const p of R.list())assert.equal(await render(page,p.id),await render(admin,p.id),'shared rendering '+p.id);
 // B: use the real editor and mocked, isolated server contract. No live rows.
 await admin.goto(base+'/standalone-research-admin-v1.html#patterns');
 await admin.getByLabel('Действующий ключ администратора SETKA').fill('isolated-ci-only');
 await admin.getByRole('button',{name:'Открыть исследования'}).click();
 await admin.locator('#workspace:not([hidden])').waitFor();
 for(const p of R.list()){
  const image=await admin.evaluate(async id=>{const {draw}=await import('/research-v1/renderer.mjs?v=ci-parity');const c=document.createElement('canvas');c.width=220;c.height=260;draw(c,window.SetkaPatternRegistryV1.defaults(id),77,id,true);return c.toDataURL()},p.id);
  assert.equal(image,await render(page,p.id),'actual research renderer equals frontend '+p.id);
 }

 assert.match(await admin.locator('.pattern-card[data-id="fixture-shapes"]').innerText(),/1\s+Аккаунтов/,'research statistics derive from browser-recorded exposure');
 await admin.locator('.pattern-card[data-id="fixture-shapes"]').click();
 await admin.locator('#detail-content').getByText('saved-fixture-shapes',{exact:true}).waitFor();
 await admin.locator('#pattern-settings input').first().waitFor();
 await admin.getByRole('button',{name:'Изменить название',exact:true}).click();
 await admin.locator('#pattern-title').fill('Исследовательский новый паттерн');
 await admin.getByRole('button',{name:'Сохранить для всех',exact:true}).click();
 await admin.locator('#pattern-settings input').first().waitFor();
 await admin.getByLabel('Радиус',{exact:true}).evaluate(e=>{e.value='31';e.dispatchEvent(new Event('input',{bubbles:true}))});
 await admin.getByRole('button',{name:'Сохранить стартовые настройки'}).click();
 await admin.getByText('Настройки сохранены. Фронт получит их при обновлении каталога.').waitFor();
 assert.equal(names.get('fixture-shapes')?.title,'Исследовательский новый паттерн','rename reached the authoritative contract');
 await page.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());

 assert.equal(await page.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.status()?.ok),true,'catalog request confirmed');
 assert.equal(await page.evaluate(()=>window.SetkaApp.getPatternTitle('fixture-shapes')),'Исследовательский новый паттерн');
 assert.equal(await page.evaluate(()=>window.SetkaApp.getPatternDefaults('fixture-shapes').radius),31);
 assert.equal(await page.evaluate(()=>window.SetkaStandaloneV34.getData().notes[0].replaySnapshot.config.radius),27,'old note is immutable after administrative edit');
 // G: a missing algorithm and an unknown version preserve the running state.
 const before=await page.evaluate(()=>window.SetkaApp.getState().patternId);
 assert.equal(await page.evaluate(()=>window.SetkaApp.openConfig({patternId:'unavailable-future'},{patternId:'unavailable-future'})),false);
 assert.equal(await page.evaluate(()=>window.SetkaApp.getState().patternId),before);
 apiFailure=true;await page.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());
 assert.equal(await page.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.status().ok),false);
 assert.equal(await page.evaluate(()=>window.SetkaApp.getPatternTitle('fixture-shapes')),'Исследовательский новый паттерн','failed API cannot overwrite confirmed names');
 apiFailure=false;outdated=true;await page.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());
 await page.locator('#libraryButton').click();await page.locator('#setkaCatalogUpdate').waitFor();outdated=false;
 await page.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());assert.equal(await page.locator('#setkaCatalogUpdate').count(),0);
 await context.setOffline(true);
 await page.locator('#st34Nav [data-p="symptoms"]').click();await page.locator('.st34-add-state').click();await page.getByRole('button',{name:'Усталость',exact:true}).tap();
 await page.locator('.st34-state-card').waitFor();await page.locator('.st34-mark-btn').click();await page.locator('.st34-mark-editor.open input').fill('6');await page.getByRole('button',{name:'Сохранить отметку',exact:true}).tap();
 assert.equal(await page.evaluate(async()=>{const C=window.SetkaStandaloneV34;C.save();return C.whenSaved()}),true);
 await context.setOffline(false);await page.reload();await page.locator('#st34Nav [data-p="symptoms"]').click();await page.getByText('Усталость',{exact:true}).waitFor();assert.match(await page.locator('.st34-state-now').innerText(),/6\/10/);
 // I: later addition changes only the descriptor/module fixture source.
 const third=fixture('fixture-later');fixtures.push(third);R.register(third);
 await page.reload();await page.waitForFunction(()=>window.SetkaPatternRegistryV1.ready('fixture-later'));
 assert.equal(await page.locator('.base-tile[data-pattern-id="fixture-later"]').count(),1);
 await admin.reload();await admin.waitForFunction(()=>window.SetkaPatternRegistryV1.ready('fixture-later'));
 await admin.locator('#workspace:not([hidden])').waitFor();
 // Saved admin access opens the workspace before the asynchronous catalog
 // and overview fetch complete. Count rendered cards only after data loads.
 await admin.locator('.pattern-card[data-id="fixture-later"]').waitFor();
 assert.equal(await admin.locator('.pattern-card').count(),R.list().length,'research automatically lists each registered algorithm');
 await page.evaluate(()=>window.SetkaStandaloneV34.showPatterns());
 // H: bounded scheduling with many algorithms; no edits to library/notes/admin.
 await page.evaluate(()=>{const R=window.SetkaPatternRegistryV1;for(let i=0;i<60;i++)window.SetkaApp.registerPattern({id:'load-fixture-'+i,title:'Load '+i,version:1,defaults:{radius:5,tempo:.1,colorModeIndex:0},controls:[['Радиус','radius',1,10,1,'↑↓',1]],render(ctx,w,h,c,f){ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.fillStyle='white';ctx.fillRect(f%30,10,c.radius,c.radius)}})});
 assert.equal(await page.evaluate(()=>window.SetkaApp.previewStatus().maxPerPaint),12,"scheduler handles all nine real mothers and remains bounded under stress");
 assert.equal(await page.locator('.base-tile').count(),R.list().length+60,'preview scheduler scales with additional patterns');
 const loadSamples=await page.evaluate(async()=>{
  const R=window.SetkaPatternRegistryV1,original=R.render,samples=[];let calls=0;
  R.render=function(...args){calls++;return original.apply(this,args)};
  try{for(let i=0;i<12;i++){await new Promise(requestAnimationFrame);samples.push(calls);calls=0}}finally{R.render=original}
  return samples;
 });
 assert.ok(loadSamples.some(n=>n>0),'visible previews really render under load');
 assert.ok(Math.max(...loadSamples)<=12,'render calls remain bounded per animation frame');
 console.log('BOUNDED REAL RENDER LOAD',JSON.stringify(loadSamples));
 assert.deepEqual(errors,[]);
 fs.mkdirSync('tests/visual-smoke',{recursive:true});await page.screenshot({path:'tests/visual-smoke/platform-'+(process.env.SETKA_BROWSER||'chromium')+'.png'});
 await admin.screenshot({path:'tests/visual-smoke/platform-admin-'+(process.env.SETKA_BROWSER||'chromium')+'.png'});
 await page.evaluate(()=>{const S=window.SetkaApp;S.registerPattern({id:'fixture-readonly',title:'Isolated capabilities',version:1,colorModes:1,defaults:{colorModeIndex:0},controls:[],capabilities:{settings:false,favorites:false,notes:false,audio:false},render(ctx,w,h){ctx.fillStyle='#000';ctx.fillRect(0,0,w,h)}});S.openConfig(S.getPatternDefaults('fixture-readonly'),{type:'exact',patternId:'fixture-readonly'})});
 for(const selector of ['#favoriteButton','#instructionsButton','#st34AudioButton','#st34Note'])assert.equal(await page.locator(selector).isVisible(),false,'declared capability '+selector);
 assert.deepEqual(errors,[]);
 console.log('PLATFORM A/B/C/D/G/H/I PASS: two initial plugins, saved snapshots, admin name/defaults, identical renderer, third plugin, bounded previews');
}finally{await browser?.close();server.kill('SIGTERM')}
