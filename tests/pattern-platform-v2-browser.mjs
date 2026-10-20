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
const names=new Map(),defaults=new Map(),catalogTrace=[];
let browser;
try{
 for(let n=0;n<45;n++){try{if((await fetch(base+'/standalone-v34.html')).ok)break}catch{}await sleep(100)}
 browser=await (process.env.SETKA_BROWSER==='webkit'?webkit:chromium).launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];context.on('page',page=>page.on('pageerror',e=>errors.push(e.message)));
 await context.route('**/standalone-pattern-registry-v1.js*',route=>route.fulfill({contentType:'text/javascript',body:
  fs.readFileSync('standalone-pattern-registry-v1.js','utf8')+'\n'+fixtures.map(p=>'window.SetkaPatternRegistryV1.register('+JSON.stringify(p)+');').join('\n')}));
 await context.route('**/standalone-pattern-fixture-*.js*',route=>{
  const id=new URL(route.request().url()).pathname.match(/standalone-pattern-(fixture-[a-z-]+)\.js/)[1];
  return route.fulfill({contentType:'text/javascript',body:`window.SetkaPatternRegistryV1.bindRenderer(${JSON.stringify(id)},function(ctx,w,h,c,f){ctx.save();ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.fillStyle=c.colorModeIndex?'cyan':'white';const size=c.radius||c.cells*3;ctx.fillRect(w/2-size/2+Math.sin(f*(c.tempo||.1))*15,h/2-size/2,size,size);ctx.restore()});`});
 });
 await context.route('**/functions/v1/**',async route=>{
  let body={};try{body=route.request().postDataJSON()||{}}catch{}
  let out={ok:true,items:[],metrics:{},patternMetrics:[],notes:[],profile:{}};
  if(body.action==='catalog')catalogTrace.push({url:route.request().frame().url(),names:[...names.values()]});
  if(body.action==='catalog')out={ok:true,registryRevision:R.revision(),items:R.list().map(p=>({pattern_id:p.id,title:names.get(p.id)?.title||p.title,revision:names.get(p.id)?.revision||1})),defaults:[...defaults.values()]};
  if(body.action==='overview')out={ok:true,data:buildData({patternCatalog:R.list().map(p=>({pattern_id:p.id,title:names.get(p.id)?.title||p.title,revision:names.get(p.id)?.revision||1}))})};
  if(body.action==='rename-pattern'){
   const old=names.get(body.patternId)||{revision:1};assert.equal(body.expectedRevision,old.revision);
   const item={pattern_id:body.patternId,title:body.title,revision:old.revision+1};names.set(body.patternId,item);out={ok:true,item};
  }
  if(body.action==='save-pattern-defaults'){
   assert.equal(body.expectedRevision,defaults.get(body.patternId)?.revision||0);
   const item={pattern_id:body.patternId,pattern_version:body.patternVersion,schema_version:body.schemaVersion,config:body.config,revision:body.expectedRevision+1};defaults.set(body.patternId,item);out={ok:true,item};
  }
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'content-type,apikey,authorization,x-client-info','access-control-allow-methods':'POST,OPTIONS'},body:JSON.stringify(out)});
 });
 const page=await context.newPage();await page.goto(base+'/standalone-v34.html');
 await page.waitForFunction(()=>window.SetkaPatternRegistryV1.ready('fixture-fields'));
 await page.evaluate(async()=>{await window.SetkaPatternPluginsV1.ready();await window.SetkaStandaloneV34.ready;await window.__SETKA_PATTERN_CATALOG_V1__.refresh()});
 assert.equal(await page.locator('.base-tile').count(),10,'both new algorithms appear without UI edits');
 for(const id of fixtures.map(p=>p.id)){
  const tile=page.locator(`.base-tile[data-pattern-id="${id}"] canvas`);await tile.scrollIntoViewIfNeeded();const image=await tile.evaluate(c=>c.toDataURL());
  await page.waitForFunction(({id,image})=>document.querySelector(`.base-tile[data-pattern-id="${id}"] canvas`)?.toDataURL()!==image,{id,image});
  await page.evaluate(id=>{const S=window.SetkaApp;S.openConfig(S.getPatternDefaults(id),{type:'exact',id,patternId:id})},id);
  await page.locator('#gameScreen.active').waitFor();
  await page.locator('#instructionsButton').click();
  assert.equal(await page.locator('#st34KeySheet.open .sk-setting').count(),2);
  await page.locator('#st34KeySheet input').first().evaluate((e,value)=>{e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}))},id==='fixture-shapes'?'27':'11');
  await page.locator('#st34KeySheet [data-action="close"]').click();
  await page.locator('#favoriteButton').click();
  await page.locator('#st34Note').click();
  await page.locator('#st34Layer textarea').last().fill('saved-'+id);
  await page.locator('#st34Layer .st-primary').filter({hasText:'Сохранить'}).click();
  await page.locator('#libraryButton').click();
 }
 const saved=await page.evaluate(()=>window.SetkaStandaloneV34.getData().notes.map(n=>n.replaySnapshot));
 assert.equal(saved.length,2);assert.deepEqual(saved.map(x=>x.patternId),fixtures.map(p=>p.id));assert.equal(saved[0].config.radius,27);assert.equal(saved[1].config.cells,11);
 assert.equal(await page.evaluate(()=>window.SetkaApp.getFavorites().filter(f=>f.patternId.startsWith('fixture-')).length),2);
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
 await admin.locator('.pattern-card[data-id="fixture-shapes"]').click();
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
 console.log('CATALOG DIAGNOSTICS',JSON.stringify({trace:catalogTrace,front:await page.evaluate(()=>({title:window.SetkaPatternRegistryV1.title('fixture-shapes'),setter:typeof window.SetkaApp.setPatternTitles,status:window.__SETKA_PATTERN_CATALOG_V1__.status()}))}));
 assert.equal(await page.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.status()?.ok),true,'catalog request confirmed');
 assert.equal(await page.evaluate(()=>window.SetkaApp.getPatternTitle('fixture-shapes')),'Исследовательский новый паттерн');
 assert.equal(await page.evaluate(()=>window.SetkaApp.getPatternDefaults('fixture-shapes').radius),31);
 assert.equal(await page.evaluate(()=>window.SetkaStandaloneV34.getData().notes[0].replaySnapshot.config.radius),27,'old note is immutable after administrative edit');
 // G: a missing algorithm and an unknown version preserve the running state.
 const before=await page.evaluate(()=>window.SetkaApp.getState().patternId);
 assert.equal(await page.evaluate(()=>window.SetkaApp.openConfig({patternId:'unavailable-future'},{patternId:'unavailable-future'})),false);
 assert.equal(await page.evaluate(()=>window.SetkaApp.getState().patternId),before);
 // I: later addition changes only the descriptor/module fixture source.
 const third=fixture('fixture-later');fixtures.push(third);R.register(third);
 await page.reload();await page.waitForFunction(()=>window.SetkaPatternRegistryV1.ready('fixture-later'));
 assert.equal(await page.locator('.base-tile[data-pattern-id="fixture-later"]').count(),1);
 await admin.reload();await admin.waitForFunction(()=>window.SetkaPatternRegistryV1.ready('fixture-later'));
 await admin.locator('#workspace:not([hidden])').waitFor();
 assert.equal(await admin.locator('.pattern-card').count(),11);
 // H: bounded scheduling with many algorithms; no edits to library/notes/admin.
 await page.evaluate(()=>{const R=window.SetkaPatternRegistryV1;for(let i=0;i<60;i++)window.SetkaApp.registerPattern({id:'load-fixture-'+i,title:'Load '+i,version:1,defaults:{radius:5,tempo:.1,colorModeIndex:0},controls:[['Радиус','radius',1,10,1,'↑↓',1]],render(ctx,w,h,c,f){ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.fillStyle='white';ctx.fillRect(f%30,10,c.radius,c.radius)}})});
 assert.equal(await page.evaluate(()=>window.SetkaApp.previewStatus().maxPerPaint),8);
 assert.equal(await page.locator('.base-tile').count(),71);
 assert.deepEqual(errors,[]);
 fs.mkdirSync('tests/visual-smoke',{recursive:true});await page.screenshot({path:'tests/visual-smoke/platform-'+(process.env.SETKA_BROWSER||'chromium')+'.png'});
 console.log('PLATFORM A/B/C/D/G/H/I PASS: two initial plugins, saved snapshots, admin name/defaults, identical renderer, third plugin, bounded previews');
}finally{await browser?.close();server.kill('SIGTERM')}
