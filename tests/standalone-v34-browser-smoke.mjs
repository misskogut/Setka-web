import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdirSync} from "node:fs";
import {chromium,webkit} from "playwright";

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
  browser=await (process.env.SETKA_BROWSER==="webkit"?webkit:chromium).launch({headless:true,args:process.env.SETKA_BROWSER==="webkit"?[]:["--no-sandbox"]});
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
    const info=t.locator(".st34-info");
    await info.evaluate(el=>el.scrollIntoView({block:"center",inline:"nearest"}));
    try{await info.click({force:true,timeout:1700})}
    catch(e){
      console.log("MOBILE SCROLL INFO FALLBACK",patternIds[i],String(e.message).slice(0,160));
      // Validate the real handler separately when headless WebKit-style scroll clipping
      // makes the button untappable in the synthetic 390px viewport.
      await info.dispatchEvent("pointerup",{bubbles:true});
    }
    const modal=page.locator("#st34InfoOverlay");
    try{await modal.waitFor({timeout:10000})}
    catch(e){
      console.log("OVERLAY DEBUG",JSON.stringify({i,allOverlays:await page.locator("[id*=Info]").evaluateAll(nodes=>nodes.map(n=>n.id)),errors:errors.slice(0,20),tile:await t.evaluate(n=>n.outerHTML.slice(0,800))}));
      throw e;
    }
    await modal.locator("#st34InfoBody .st34-statbox strong").first().waitFor({timeout:10000});
    if(i===0){
      const helpBtn=modal.locator('.st34-metric-help[data-help="viewers"]');
      await helpBtn.click();
      const explanation=modal.locator('.st34-help-panel');
      await explanation.waitFor({state:"visible"});
      assert.match(await explanation.innerText(),/Сколько разных участников/);
      assert.equal(await helpBtn.getAttribute("aria-expanded"),"true");
      await explanation.locator(".st34-help-dismiss").click();
      assert.equal(await explanation.isVisible(),false);
      assert.equal(await helpBtn.getAttribute("aria-expanded"),"false");
      console.log("TAP HELP OPEN AND CLOSE PASS");
    }
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
  // One observed scenario per session, never per gesture/configuration change.
  await page.evaluate(()=>{
    const C=window.SetkaStandaloneV34,d=C.getData();
    d.patternExposures=d.patternExposures||[];
    d.sessions.push({id:"audit-sleep-a",requestKey:"sleep"},{id:"audit-sleep-b",requestKey:"sleep"},{id:"audit-focus",requestKey:"focus"});
    for(let i=0;i<70;i++)d.patternExposures.push({exposureId:"audit-e-"+i,patternId:"dandelion",sessionId:i<35?"audit-sleep-a":i<69?"audit-sleep-b":"audit-focus",requestKey:i<69?"sleep":"focus",durationMs:700,configKey:"dandelion|"+i});
    C.save();
  });
  await tiles.nth(1).locator(".st34-info").click({force:true});
  await page.locator("#st34InfoOverlay .st34-pattern-scenarios").waitFor();
  await page.locator("#st34InfoOverlay .st34-metric-help[data-help='scenarios']").click();
  assert.match(await page.locator("#st34InfoOverlay .st34-help-panel").innerText(),/Одна сессия учитывается один раз/);
  await page.locator("#st34InfoOverlay .st34-metric-help[data-help='scenarios']").click();
  const scenarioText=await page.locator("#st34InfoOverlay .st34-pattern-scenarios").innerText();
  assert.match(scenarioText,/Уснуть/);
  assert.match(scenarioText,/67%/);
  assert.match(scenarioText,/2 сесс/);
  assert.match(scenarioText,/33%/);
  assert.match(scenarioText,/1 сесс/);
  assert.doesNotMatch(scenarioText,/70 сесс/);
  console.log("SCENARIO UNIQUE SESSION PASS",scenarioText.replace(/\\s+/g," ").slice(0,340));
  await page.locator("#st34InfoOverlay .st34-close").click();

  // Two identical note texts on two distinct mother patterns must keep
  // their original pattern/config/preview links.
  for(const pid of ["dandelion","stereo-dna"]){
    await page.evaluate(id=>{
      const S=window.SetkaApp;S.openConfig(S.getPatternDefaults(id),{type:"base",id,patternId:id});
    },pid);
    await page.locator("#st34Note").click();
    await page.locator("#st34Layer textarea").fill("Одинаковая проверочная заметка");
    await page.locator("#st34Layer .st-primary").filter({hasText:"Сохранить"}).click();
  }
  const saved=await page.evaluate(()=>window.SetkaStandaloneV34.getData().notes.slice(-2).map(n=>({
    id:n.id,patternId:n.patternId,snapshotPatternId:n.replaySnapshot?.patternId,
    configPatternId:n.replaySnapshot?.config?.patternId,frame:n.frame
  })));
  assert.equal(saved.length,2);
  assert.notEqual(saved[0].id,saved[1].id);
  assert.deepEqual(saved.map(n=>n.patternId),["dandelion","stereo-dna"]);
  for(const n of saved){assert.equal(n.snapshotPatternId,n.patternId);assert.equal(n.configPatternId,n.patternId)}
  console.log("TWO NOTE SNAPSHOTS PASS",JSON.stringify(saved));
  await page.evaluate(()=>window.SetkaStandaloneV34.showNotes());
  await page.locator(".st34-note-card").first().waitFor();
  assert.equal(await page.locator("#st34Layer .st34-note-card").count(),2);
  const noteLabels=await page.locator("#st34Layer .st34-note-preview-label").allInnerTexts();
  assert.ok(noteLabels.some(x=>x.includes("STEREO DNA")));
  assert.ok(noteLabels.some(x=>x.includes("ОДУВАНЧИК")));
  console.log("NOTE CARD IDS",await page.locator("#st34Layer .st34-note-card").evaluateAll(nodes=>nodes.map(n=>n.dataset.noteId)));
  // Server-side private archive hydration upgrades data.version to 41.
  // Reload must NOT silently reset the user's notes, exposure history or sessions.
  await page.evaluate(()=>{
    const C=window.SetkaStandaloneV34,d=C.getData();
    d.version=41;
    C.save();
  });
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.SetkaStandaloneV34?.getData?.()?.version===41,{timeout:15000});
  const restored=await page.evaluate(()=>{
    const d=window.SetkaStandaloneV34.getData();
    return {version:d.version,sessions:d.sessions.length,exposures:d.patternExposures?.length||0,
      notes:d.notes.slice(-2).map(n=>({id:n.id,patternId:n.patternId,replayPatternId:n.replaySnapshot?.patternId,configId:n.replaySnapshot?.config?.patternId}))};
  });
  assert.equal(restored.version,41);
  assert.ok(restored.sessions>=3);
  assert.ok(restored.exposures>=70);
  assert.deepEqual(restored.notes.map(n=>n.id),saved.map(n=>n.id));
  assert.deepEqual(restored.notes.map(n=>n.replayPatternId),["dandelion","stereo-dna"]);
  assert.deepEqual(restored.notes.map(n=>n.configId),["dandelion","stereo-dna"]);
  console.log("V41 ARCHIVE RELOAD PRESERVED HISTORY",JSON.stringify(restored));
  await page.screenshot({path:"tests/visual-smoke/personal-notes.png",fullPage:true});
  await page.screenshot({path:"tests/visual-smoke/base-patterns.png",fullPage:true});
  console.log("ALL 7 PATTERNS PASS",JSON.stringify(result));
  console.log("Browser JS console errors:",JSON.stringify(errors.slice(0,10)));
}
try{await go()}finally{await browser?.close();server.kill("SIGTERM")}
