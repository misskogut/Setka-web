import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdirSync} from "node:fs";
import {chromium} from "playwright";

const port=48372;
const root="http://127.0.0.1:"+port;
const patternIds=["tentacle-orbit","dandelion","fish-wave","breathing-fractal","breathing-fractal-growth","rgb-glitch-rings","stereo-dna"];
const names=["Tentacle Orbit","Одуванчик","Носовая волна","Breathing Fractal","Breathing Fractal · Growth","RGB Glitch Rings","Stereo DNA"];
const patternMetrics=patternIds.map((patternId,i)=>({patternId,viewingAccounts:i+1,sessions:10*(i+1),exposures:100*(i+1),likes:i+1,totalDurationMs:(i+1)*60000,configurationSaves:i+1,savedConfigurations:i+1}));
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
let browser;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function livePixels(canvas){
  const context=canvas.getContext("2d");
  if(!context)return-1;
  const {data}=context.getImageData(0,0,canvas.width,canvas.height);
  let n=0;
  for(let i=0;i<data.length;i+=4)if(data[i]+data[i+1]+data[i+2]>85)n++;
  return n;
}
async function go(){
  for(let i=0;i<30;i++){try{const x=await fetch(root+"/standalone-v34.html");if(x.ok)break}catch{}await sleep(100)}
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];
  page.on("pageerror",x=>errors.push(String(x)));
  page.on("console",x=>{if(x.type()==="error")errors.push(String(x.text()))});
  await page.route("**/functions/v1/**",async route=>{
    const url=route.request().url(),b=route.request().postDataJSON?.()||{};
    const payload=url.includes("setka-community-patterns-v38")?{ok:true,items:[],patternMetrics,metrics:{connectedAccounts:7}}:
      url.includes("setka-public-notes-v37")?{ok:true,items:[]}:
      {ok:true,items:[],notes:[],sessions:[],status:"private",profile:{},metrics:{}};
    await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(payload)});
  });
  await page.goto(root+"/standalone-v34.html?browser-smoke=41",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelectorAll("#allPatternsPanel .pattern-tile").length===7,{timeout:20000});
  await page.waitForFunction(()=>!!window.SetkaStandaloneV34?.cloudCommunity?.status?.().lastOkAt,{timeout:20000});
  const tiles=page.locator("#allPatternsPanel .pattern-tile");
  const result=[];
  mkdirSync("tests/visual-smoke",{recursive:true});
  for(let i=0;i<7;i++){
    const t=tiles.nth(i);
    await t.locator(".st34-info").waitFor({timeout:10000});
    const before=await t.locator("canvas").evaluate(livePixels);
    console.log("THUMB",patternIds[i],"brightPixels",before);
    assert.ok(before>25,patternIds[i]+" thumbnail is blank or too faint: "+before);
    const pid=await t.getAttribute("data-pattern-id");
    assert.equal(pid,patternIds[i]);
    await t.locator(".st34-info").click({force:true});
    const modal=page.locator("#st34InfoOverlay");
    try{await modal.waitFor({timeout:10000})}
    catch(e){
      console.log("OVERLAY DEBUG",JSON.stringify({i,allOverlays:await page.locator("[id*=Info]").evaluateAll(nodes=>nodes.map(n=>n.id)),errors:errors.slice(0,20),tile:await t.evaluate(n=>n.outerHTML.slice(0,800))}));
      throw e;
    }
    await modal.locator("#st34InfoBody .st34-statbox strong").first().waitFor({timeout:10000});
    const title=await modal.locator("h2").innerText();
    assert.equal(title,names[i],patternIds[i]+" wrong title");
    const account=await modal.locator(".st34-statbox strong").first().innerText();
    assert.equal(account,String(i+1),patternIds[i]+" misbound cloud stats");
    const bright=await modal.locator("canvas").evaluate(livePixels);
    console.log("INFO",patternIds[i],"account",account,"brightPixels",bright);
    assert.ok(bright>20,patternIds[i]+" info preview blank");
    await modal.locator(".st34-close").click();
    result.push({patternId:pid,account,thumbBrightPixels:before,infoBrightPixels:bright});
  }
  await page.screenshot({path:"tests/visual-smoke/base-patterns.png",fullPage:true});
  console.log("ALL 7 PATTERNS PASS",JSON.stringify(result));
  console.log("Browser JS console errors:",JSON.stringify(errors.slice(0,10)));
}
try{await go()}finally{await browser?.close();server.kill("SIGTERM")}
