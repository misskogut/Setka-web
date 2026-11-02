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
let browser,revision=1,failed=false;
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
   else out={ok:true,registryAvailable:true,registryRevision:R.revision(),publicationRevision:revision,publication:rows,
    items:R.list().filter(p=>b.action==='manage-catalog'||rows.find(r=>r.pattern_id===p.id)?.state==='published').map(p=>({pattern_id:p.id,title:p.title,revision:1})),defaults:[]};
  }
  if(b.action==='set-pattern-publication'){
   const row=rows.find(r=>r.pattern_id===b.patternId);assert.equal(b.expectedRevision,row.revision);
   row.state=b.state;row.revision=++revision;writes.push(b);out={ok:true,item:row};
  }
  if(b.action==='overview')out={ok:true,data};
  await route.fulfill({status,headers:cors,contentType:'application/json',body:JSON.stringify(out)});
 });
 const front=await context.newPage(),admin=await context.newPage();
 await front.goto(base+'/standalone-v34.html');
 await front.waitForFunction(()=>window.__SETKA_PATTERN_CATALOG_V1__?.status()?.ok);
 const tile=front.locator('#allPatternsPanel [data-pattern-id="'+id+'"]');
 assert.equal(await tile.count(),0,'new module is not public');
 await admin.goto(base+'/standalone-research-admin-v1.html#patterns');
 await admin.locator('#key').fill('isolated-test-credential');await admin.locator('#login-button').click();
 await admin.locator('.pattern-card[data-id="'+id+'"]').click();
 const publication=admin.locator('#pattern-publication');
 await publication.getByRole('button',{name:'Открыть тестовую область',exact:true}).click();
 await publication.getByRole('slider',{name:'Радиус',exact:true}).press('End');
 assert.equal(writes.length,0,'sandbox cannot publish or record a participant');
 assert.equal(await tile.count(),0,'sandbox edits stay private');
 await publication.getByRole('button',{name:'Опубликовать',exact:true}).click();
 await admin.getByRole('button',{name:'Выключить',exact:true}).waitFor();
 await front.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());
 assert.equal(await tile.count(),1,'publication reaches a second client');
 await front.evaluate(id=>window.SetkaApp.openConfig(window.SetkaApp.getPatternDefaults(id),{type:'base',id,patternId:id}),id);
 await front.locator('#gameScreen.active').waitFor();
 await admin.locator('#pattern-publication').getByRole('button',{name:'Выключить',exact:true}).click();
 await admin.getByRole('button',{name:'Опубликовать',exact:true}).waitFor();
 await front.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());
 assert.equal(await tile.count(),0,'disable removes public tile');
 assert.equal(await front.locator('#gameScreen.active').count(),0,'open disabled pattern returns to library');
 assert.equal(await front.evaluate(id=>window.SetkaApp.openConfig(window.SetkaApp.getPatternDefaults(id),{type:'base',id,patternId:id}),id),false,'direct-open cannot bypass publication');
 await admin.locator('#pattern-publication').getByRole('button',{name:'Опубликовать',exact:true}).click();
 await admin.getByRole('button',{name:'Выключить',exact:true}).waitFor();
 await front.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());
 assert.equal(await tile.count(),1,'same algorithm can be republished without replacing its identity');
 failed=true;await front.reload();
 await front.waitForFunction(()=>window.__SETKA_PATTERN_CATALOG_V1__?.status()?.ok===false);
 assert.equal(await front.locator('#allPatternsPanel .pattern-tile').count(),0,'fresh client fails closed during unavailable publication service');
 failed=false;await front.evaluate(()=>window.__SETKA_PATTERN_CATALOG_V1__.refresh());assert.equal(await tile.count(),1,'reconnection recovers confirmed catalog');
 assert.equal(JSON.stringify(archive),original);assert.deepEqual(errors,[]);
 console.log('PUBLICATION: DRAFT → SANDBOX → PUBLISH → SECOND CLIENT → DISABLE → DIRECT-OPEN GUARD → REPUBLISH → OUTAGE/RECOVERY PASS');
}finally{await browser?.close();server.kill('SIGTERM');}
