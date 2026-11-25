// Executed in CI against the isolated static page. Hardware iPhone testing is separate.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {PNG} from 'pngjs';
const base=process.env.FLOWER_URL||'http://127.0.0.1:4173/';
const engineName=process.env.FLOWER_BROWSER||'chromium';
const engine=engineName==='webkit'?webkit:chromium;
const out=new URL('./output/'+engineName+'/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await engine.launch({headless:true,args:engineName==='chromium'?['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']:[],env:{...process.env,LIBGL_ALWAYS_SOFTWARE:'1'}});
const report={engine:engineName,realIPhone:false,angles:[],errors:[]};
try{
 const context=await browser.newContext({viewport:{width:600,height:700},deviceScaleFactor:1,hasTouch:true,isMobile:true});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
 page.setDefaultNavigationTimeout(90000);page.setDefaultTimeout(90000);
 for(const angle of [0,30,60,90,120,180]){
  await page.goto(base+'?capture=1&angle='+angle,{waitUntil:'load'});
  await page.waitForFunction(()=>window.SETKA_FLOWER_DIAGNOSTICS?.frames>3,{},{timeout:90000});
  const stats=await page.evaluate(()=>window.SETKA_FLOWER_DIAGNOSTICS);
  const bytes=await page.screenshot({path:new URL('angle-'+angle+'.png',out).pathname});const img=PNG.sync.read(bytes);let bright=0;
  for(let i=0;i<img.data.length;i+=4)if(Math.max(img.data[i],img.data[i+1],img.data[i+2])>100)bright++;
  report.angles.push({angle,brightPixels:bright,stats});assert.equal(Math.round(stats.angle),angle);assert.ok(stats.vertices>6000);assert.ok(stats.shellTriangles>1000);assert.ok(bright>100,'visible 3D content at '+angle);
 }
 await page.goto(base+'?capture=1');await page.waitForFunction(()=>window.SETKA_FLOWER_DIAGNOSTICS?.frames>6,{},{timeout:60000});
 // Hold an off-centre surface point; a gesture on the core can reach through the glass.
 await page.mouse.move(335,350);await page.mouse.down();
 await page.waitForFunction(()=>window.SETKA_FLOWER_DIAGNOSTICS?.pressed,{},{timeout:15000});
 await page.mouse.move(360,375,{steps:12});
 await page.waitForFunction(()=>window.SETKA_FLOWER_DIAGNOSTICS.energy>.01,{},{timeout:15000});
 report.holdEnergy=await page.evaluate(()=>window.SETKA_FLOWER_DIAGNOSTICS.energy);
 await page.screenshot({path:new URL('held.png',out).pathname});await page.mouse.up();
 await page.waitForFunction(()=>!window.SETKA_FLOWER_DIAGNOSTICS.pressed&&window.SETKA_FLOWER_DIAGNOSTICS.energy<.001,{},{timeout:60000});report.release=true;
 // A real pointer flip, originating outside the soft object.
 await page.mouse.move(480,250);await page.mouse.down();await page.mouse.move(480,530,{steps:18});await page.mouse.up();
 await page.waitForFunction(()=>Math.abs(window.SETKA_FLOWER_DIAGNOSTICS.angle)>179,{},{timeout:60000});report.swipe=true;
 await page.setViewportSize({width:390,height:844});await page.goto(base+'?capture=1');await page.waitForFunction(()=>window.SETKA_FLOWER_DIAGNOSTICS?.frames>6,{},{timeout:60000});
 await page.screenshot({path:new URL('iphone-viewport.png',out).pathname});report.mobileViewport={width:390,height:844,stats:await page.evaluate(()=>window.SETKA_FLOWER_DIAGNOSTICS)};
 assert.deepEqual(report.errors,[]);report.pass=true;
}finally{await browser.close();await writeFile(new URL('report.json',out),JSON.stringify(report,null,2))}
