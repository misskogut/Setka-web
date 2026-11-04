import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
import {installPublicationCatalog} from './publication-fixture.mjs';
const port=49345,base=`http://127.0.0.1:${port}`;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
try{
 for(let i=0;i<40;i++){try{if((await fetch(base+'/standalone-v34.html')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 const engine=process.env.SETKA_BROWSER==='webkit'?webkit:chromium;
 browser=await engine.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true,items:[],notes:[],sessions:[],metrics:{},profile:{}})}));
 await installPublicationCatalog(page);
 await page.goto(base+'/standalone-v34.html',{waitUntil:'domcontentloaded'});
 await page.locator('#allPatternsPanel .pattern-tile').first().waitFor();
 const key=page.locator('#st34KeySheet'),layer=page.locator('#st34Layer');
 async function drag(handle,dy,touch=false){
  const box=await handle.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  if(touch&&engine===chromium){
   const cdp=await page.context().newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy*i/8}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  }else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+dy,{steps:8});await page.mouse.up()}
 }
 async function openPattern(){
  await page.locator('#allPatternsPanel .pattern-tile[data-pattern-id="tentacle-orbit"]').click({position:{x:20,y:20}});
  await page.getByRole('button',{name:'Просто посмотреть',exact:true}).click();await page.locator('#gameScreen.active').waitFor();
 }
 await openPattern();await page.locator('#instructionsButton').click();await key.waitFor({state:'visible'});
 const start=await key.boundingBox();
 await drag(key.locator('.sk-grip'),230,true);
 const reduced=await key.boundingBox();assert.ok(reduced.height<start.height-180);assert.ok(reduced.height>=239);assert.ok(reduced.y>start.y+180);assert.equal(await key.isVisible(),true);
 assert.ok(await key.locator('.sk-scroll').evaluate(e=>e.scrollHeight>e.clientHeight));
 const slider=key.locator('input[type=range]').first();
 const value=await slider.getAttribute('max');await slider.fill(value);
 assert.equal(await slider.inputValue(),value);assert.equal(await key.isVisible(),true);
 await key.locator('.sk-scroll').evaluate(e=>e.scrollTop=e.scrollHeight);
 assert.ok(await key.locator('.sk-scroll').evaluate(e=>e.scrollTop>0));
 await key.locator('.sk-close').click();await page.locator('#instructionsButton').click();
 assert.ok(Math.abs((await key.boundingBox()).height-reduced.height)<2,'reopening keeps height');
 await key.locator('.sk-grip').press('End');assert.ok((await key.boundingBox()).height>reduced.height+100);
 await key.locator('.sk-grip').press('Home');assert.ok((await key.boundingBox()).height<=241);
 await key.locator('.sk-close').click();await page.locator('#libraryButton').click();
 // Every dock destination shares the same mechanism and keeps its contents.
 for(const tab of ['today','notes','pulse','symptoms','me']){
  await page.locator(`#st34Nav [data-p="${tab}"]`).click();await layer.waitFor({state:'visible'});
  await layer.locator('#st34SheetGrip').press('End');
  const before=await layer.boundingBox();await drag(layer.locator('#st34SheetGrip'),220,true);
  assert.ok((await layer.boundingBox()).height<before.height-150);assert.equal(await layer.isVisible(),true);
  await page.locator(`#st34Nav [data-p="${tab}"]`).click();await layer.waitFor({state:'hidden'});
 }
 // Information sheets also keep a fixed grab handle and scrollable body.
 await page.locator('#allPatternsPanel .st34-info').first().click();
 const info=page.locator('#st34InfoOverlay .st34-sheet');await info.waitFor();
 const infoHeight=(await info.boundingBox()).height;await drag(info.locator('.setka-info-grip'),180);
 assert.ok((await info.boundingBox()).height<infoHeight-100);assert.equal(await info.isVisible(),true);
 await info.locator('.st34-close').click();
 // Desktop mouse, viewport shrink and cancellation on a future unknown panel.
 await page.setViewportSize({width:1366,height:768});
 await page.evaluate(()=>{
  const p=document.createElement('section'),h=document.createElement('button');p.id='future-resize-panel';p.style.cssText='position:fixed;bottom:0;left:0;width:400px;height:500px;max-height:90dvh;z-index:999999;background:#111';h.textContent='Handle';h.style.cssText='width:100%;height:34px';p.append(h);document.body.append(p);
  window.SetkaPanelResizeV1.attach(p,{handle:h,minHeight:160});
 });
 const future=page.locator('#future-resize-panel'),handle=future.locator('button');await drag(handle,180);assert.ok((await future.boundingBox()).height<325);
 const previous=(await future.boundingBox()).height;
 await handle.dispatchEvent('pointerdown',{pointerId:71,pointerType:'touch',clientY:300,isPrimary:true});
 await handle.dispatchEvent('pointermove',{pointerId:71,pointerType:'touch',clientY:430,isPrimary:true});
 await handle.dispatchEvent('pointercancel',{pointerId:71,pointerType:'touch',clientY:430,isPrimary:true});
 assert.ok(Math.abs((await future.boundingBox()).height-previous)<2);
 await handle.press('End');await page.setViewportSize({width:1024,height:400});
 assert.ok((await future.boundingBox()).height<=361);assert.ok((await future.boundingBox()).y>=0);
 await page.evaluate(()=>document.querySelector('#future-resize-panel').remove());
 assert.deepEqual(errors,[]);console.log('KEY / FIVE TABS / INFO / TOUCH / MOUSE / SCROLL / REOPEN / BOUNDS / CANCEL / FUTURE PANEL PASS');
}finally{await browser?.close();server.kill()}
