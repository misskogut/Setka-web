import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium,webkit} from "playwright";
const port=48391,base="http://127.0.0.1:"+port;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
const eight=["tentacle-orbit","dandelion","fish-wave","breathing-fractal","breathing-fractal-growth","rgb-glitch-rings","stereo-dna","breathing-grid"];
const fixture={ok:true,metrics:{connectedAccounts:2,sessions:3,exposures:37,patterns:2,savedConfigurations:3,configurationSaves:5,activeAccounts30d:1},
 patternMetrics:[{patternId:"tentacle-orbit",viewingAccounts:1,sessions:2,exposures:25,likes:1,savedConfigurations:2,totalDurationMs:83000},
 {patternId:"dandelion",viewingAccounts:1,sessions:2,exposures:12,likes:1,savedConfigurations:1,totalDurationMs:44000}],
 patternScenarios:[{patternId:"tentacle-orbit",cohortSessions:8,scenarios:[{key:"sleep",count:6,share:.75}]}],
 historicalPatterns:[{patternId:"tentacle-orbit",devices:6,sessions:12,exposures:395,totalDurationMs:2000000}],
 items:[{patternId:"dandelion",saveCount:1,useCount:12},{patternId:"tentacle-orbit",saveCount:1,useCount:25}]};
try{
  for(let i=0;i<25;i++){try{if((await fetch(base+"/standalone-admin-public-v34.html")).ok)break}catch{}await sleep(100)}
  browser=await (process.env.SETKA_BROWSER==="webkit"?webkit:chromium).launch({headless:true,args:process.env.SETKA_BROWSER==="webkit"?[]:["--no-sandbox"]});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errs=[],calls=[];
  page.on("pageerror",err=>errs.push(err.message));
  page.on("request",req=>{if(req.url().includes("/functions/v1/"))calls.push(req.url())});
  await page.route("**/functions/v1/**",async route=>{
    const url=route.request().url();
    if(!url.includes("setka-community-patterns-v38"))throw Error("Private API was called in public admin: "+url);
    await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(fixture)});
  });
  await page.goto(base+"/standalone-admin-public-v34.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.getElementById("totals")?.querySelectorAll(".stat").length===7,{timeout:15000});
  assert.equal(await page.locator("#keyInput").count(),0);
  assert.equal(await page.locator("#loginBtn").count(),0);
  assert.match(await page.locator("#totals").innerText(),/37/);
  assert.equal(await page.locator("a[href='standalone-admin-private-v34.html']").count(),1);
  await page.locator('[data-panel="patterns"]').click();
  assert.equal(await page.locator("#patterns article[data-pattern-id]").count(),8);
  const names=await page.locator("#patterns article[data-pattern-id]").evaluateAll(a=>a.map(n=>n.dataset.patternId));
  assert.deepEqual(names,eight);
  assert.match(await page.locator("#patterns").innerText(),/пока нет зарегистрированных данных/);
  assert.match(await page.locator("article[data-pattern-id=\"tentacle-orbit\"]").innerText(),/Уснуть · 75%/);
  assert.match(await page.locator("article[data-pattern-id=\"tentacle-orbit\"]").innerText(),/395 просмотров/);
  assert.match(await page.locator("article[data-pattern-id=\"dandelion\"]").innerText(),/недостаточно обезличенных данных/);
  await page.locator('[data-panel="variants"]').click();
  assert.equal(await page.locator("#variantList .variant").count(),2);
  await page.locator("#refresh").click();
  await page.waitForFunction(()=>document.getElementById("refresh")?.disabled===false);
  assert.ok(calls.length>=2);
  assert.ok(calls.every(x=>x.includes("setka-community-patterns-v38")));
  assert.deepEqual(errs,[]);
  console.log("PUBLIC SAFE ADMIN WEBKIT/CHROMIUM PASS",JSON.stringify({patterns:names.length,variants:2,networkRequests:calls.length}));
  const privatePage=await browser.newPage();
  await privatePage.goto(base+"/standalone-admin-private-v34.html",{waitUntil:"domcontentloaded"});
  assert.equal(await privatePage.locator("#keyInput").count(),1);
  assert.equal(await privatePage.locator("#loginBtn").count(),1);
  await privatePage.goto(base+"/standalone-admin-v34.html",{waitUntil:"domcontentloaded"});
  assert.ok((await privatePage.locator("#dashboard .tab[data-tab]").count())>=11,"full admin lost one of the original 11 sections");
  assert.equal(await privatePage.locator('#dashboard .tab[data-tab="participants"]').count(),1);
  assert.equal(await privatePage.locator('#dashboard .tab[data-tab="moderation"]').count(),1);
  assert.equal(await privatePage.locator('#dashboard .tab[data-tab="notes"]').count(),1);
  assert.equal(await privatePage.locator('#dashboard .tab[data-tab="pattern-knowledge"]').count(),1);
  console.log("FULL MAIN ADMIN ALL 11 SECTIONS PRESENT PASS");

  // A private owner link must override any stale invalid stored password.
  // The fragment is removed immediately, never hardcoded into public JS.
  const ownerPage=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const fakeOwner="SKA-"+"a".repeat(48),ownerRequests=[];
  await ownerPage.addInitScript(()=>{
    localStorage.setItem("setka-research:admin-key:v1","stale-invalid-key");
  });
  await ownerPage.route("**/functions/v1/**",async route=>{
    const req=route.request(),body=req.postDataJSON();
    ownerRequests.push({action:body.action,adminKey:body.adminKey});
    await route.fulfill({status:200,contentType:"application/json",
      headers:{"access-control-allow-origin":"*"},
      body:JSON.stringify(body.action==="admin-overview"?{devices:[]}:{ok:true,devices:[],items:[],participants:[],sessions:[],symptoms:[],invites:[],insights:[]})});
  });
  await ownerPage.goto(base+"/standalone-admin-v34.html#access="+fakeOwner,{waitUntil:"domcontentloaded"});
  await ownerPage.waitForFunction(()=>!document.getElementById("dashboard")?.classList.contains("hidden"),{timeout:12000});
  assert.equal(await ownerPage.evaluate(()=>location.hash),"","secret fragment must be removed from address bar");
  assert.equal(await ownerPage.evaluate(()=>localStorage.getItem("setka-research:admin-key:v1")),fakeOwner);
  assert.ok(ownerRequests.some(x=>x.action==="admin-overview"&&x.adminKey===fakeOwner));
  assert.ok(ownerRequests.filter(x=>x.adminKey).every(x=>x.adminKey===fakeOwner),"all authenticated admin calls must use new owner credential");
  assert.ok((await ownerPage.locator("#dashboard .tab[data-tab]").count())>=11);
  console.log("ONE-CLICK OWNER LOGIN WITH STALE PREVIOUS KEY PASS");
  console.log("PRIVATE ADMIN REMAINS AUTHENTICATED PASS");
}finally{await browser?.close();server.kill("SIGTERM")}
