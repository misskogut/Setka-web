import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
import {installPublicationCatalog} from './publication-fixture.mjs';
const port=49329, base=`http://127.0.0.1:${port}`;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
try {
  for(let i=0;i<40;i++){try{if((await fetch(base+'/standalone-v34.html')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
  const engine=process.env.SETKA_BROWSER==='webkit'?webkit:chromium;
  browser=await engine.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true,items:[],notes:[],sessions:[],metrics:{},profile:{}})}));
  await installPublicationCatalog(page);
  await page.goto(base+'/standalone-v34.html',{waitUntil:'domcontentloaded'});
  await page.locator('#allPatternsPanel .pattern-tile').first().waitFor();
  async function geometry(){return page.evaluate(()=>{
    const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
    return {app:rect('#app'),canvas:rect('#patternCanvas'),tile:rect('#allPatternsPanel .pattern-tile'),cols:getComputedStyle(document.querySelector('#allPatternsPanel')).gridTemplateColumns.split(' ').length,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth};
  })}
  for(const [width,height] of [[1366,768],[1920,1080],[1024,600],[768,600],[390,844]]){
    await page.setViewportSize({width,height});
    const g=await geometry();
    assert.equal(g.app.width,width);assert.equal(g.app.height,height);
    assert.equal(g.overflow,false);assert.ok(Math.abs(g.tile.width-g.tile.height)<1);
    assert.ok(width>=1024?g.cols>4:g.cols===4,JSON.stringify(g));
    console.log('LAYOUT PASS',width,height,g.cols);
  }
  await page.setViewportSize({width:1366,height:768});
  // Future modules inherit square layout without adding an ID to shared code.
  await page.evaluate(()=>{const tile=document.createElement('button');tile.className='pattern-tile';tile.dataset.patternId='future-layout-test';document.querySelector('#allPatternsPanel').append(tile)});
  const future=await page.locator('[data-pattern-id="future-layout-test"]').boundingBox();
  assert.ok(Math.abs(future.width-future.height)<1);
  await page.evaluate(()=>document.querySelector('[data-pattern-id="future-layout-test"]').remove());
  await page.locator('#st34Nav [data-p="today"]').click();
  await page.locator('#st34Layer').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelector('#st34Layer').getBoundingClientRect().bottom<=document.querySelector('#st34Nav').getBoundingClientRect().top);
  const sheet=await page.locator('#st34Layer').boundingBox();assert.ok(sheet.width>520&&sheet.width<1366);
  await page.getByRole('button',{name:'Свернуть карточку',exact:true}).click();
  await page.locator('#st34Layer').waitFor({state:'hidden'});
  // Use the same real card pointer handler as the existing v34 smoke suite.
  await page.locator('#allPatternsPanel .pattern-tile[data-pattern-id="tentacle-orbit"]').dispatchEvent('pointerup',{pointerId:491,pointerType:'mouse',bubbles:true});
  console.log('OPEN DEBUG',await page.evaluate(()=>({view:window.SetkaApp.getState(),active:window.SetkaPatternRegistryV1.isActive('tentacle-orbit'),ready:window.SetkaPatternRegistryV1.ready('tentacle-orbit'),toast:document.querySelector('#toast').textContent,body:document.body.innerText.slice(-1000)})));
  await page.locator('#gameScreen.active').waitFor();
  for(const [width,height] of [[1366,768],[1024,600],[390,844]]){
    await page.setViewportSize({width,height});
    await page.waitForFunction(()=>{const a=document.querySelector('#app').getBoundingClientRect(),c=document.querySelector('#patternCanvas');return Math.abs(parseFloat(c.style.width)-a.width)<1&&Math.abs(parseFloat(c.style.height)-a.height)<1});
    const g=await geometry();assert.equal(g.canvas.width,width);assert.equal(g.canvas.height,height);
  }
  await page.locator('#libraryButton').click();
  await page.locator('#libraryScreen.active').waitFor();
  await page.reload();await page.locator('#allPatternsPanel .pattern-tile').first().waitFor();
  assert.equal((await geometry()).cols,4);
  console.log('DESKTOP / MOBILE / RESIZE / SHEET / FUTURE TILE / RELOAD PASS');
} finally {await browser?.close();server.kill()}
