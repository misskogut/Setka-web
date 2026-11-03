import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium,webkit} from "playwright";
const port=48391,base="http://127.0.0.1:"+port;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
// All public cards follow the registry; no fixed list of mother algorithms.
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
  const allIds=await page.evaluate(()=>window.SetkaPatternRegistryV1.ids());
  assert.equal(await page.locator("#patterns article[data-pattern-id]").count(),allIds.length);
  const names=await page.locator("#patterns article[data-pattern-id]").evaluateAll(a=>a.map(n=>n.dataset.patternId));
  assert.deepEqual(names,allIds);
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

  // The current owner recovery link is a one-time ticket in a URL query.
  // It is scrubbed before loading scripts, consumed only by an explicit click,
  // and exchanged for a new key. Existing stale keys cannot override it.
  const ownerPage=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const ticket="SETKA1-"+"a".repeat(64),freshAdminKey="SKA-"+"b".repeat(48),ownerRequests=[];
  await ownerPage.addInitScript(()=>localStorage.setItem("setka-research:admin-key:v1","stale-invalid-key"));
  await ownerPage.route("**/functions/v1/**",async route=>{
    const req=route.request(),body=req.postDataJSON(),url=req.url();
    ownerRequests.push({action:body.action,adminKey:body.adminKey,ticket:body.ticket,url});
    const cors={"access-control-allow-origin":"*"};
    if(url.includes("setka-admin-owner-recovery-v1")){
      assert.equal(body.action,"redeem");
      assert.equal(body.ticket,ticket);
      return route.fulfill({status:200,contentType:"application/json",headers:cors,
        body:JSON.stringify({ok:true,adminKey:freshAdminKey})});
    }
    // Public catalog/telemetry requests need no key. Only reject a *present* rogue admin key.
    if(body.adminKey&&body.adminKey!=="stale-invalid-key"&&body.adminKey!==freshAdminKey)
      throw Error("An unexpected admin key was sent to the fixture");
    if(body.adminKey==="stale-invalid-key")return route.fulfill({status:403,contentType:"application/json",headers:cors,
      body:JSON.stringify({error:"invalid_admin_key"})});
    await route.fulfill({status:200,contentType:"application/json",headers:cors,
      body:JSON.stringify(body.action==="admin-overview"?{devices:[]}:{ok:true,devices:[],items:[],participants:[],sessions:[],symptoms:[],invites:[],insights:[]})});
  });
  await ownerPage.goto(base+"/standalone-admin-v34.html?owner_ticket="+ticket,{waitUntil:"domcontentloaded"});
  assert.equal(new URL(ownerPage.url()).searchParams.has("owner_ticket"),false,"one-use ticket must leave the URL immediately");
  assert.equal(await ownerPage.evaluate(()=>location.hash),"");
  assert.equal(await ownerPage.evaluate(()=>localStorage.getItem("setka-research:admin-key:v1")),"stale-invalid-key",
    "opening the page alone may not consume a ticket or mutate stored credentials");
  assert.equal(await ownerPage.locator("#keyInput").isHidden(),true,"one-time link must have its own explicit confirmation");
  assert.equal(ownerRequests.filter(x=>x.action==="redeem").length,0,"no ticket redemption on passive page load");
  await ownerPage.locator("#loginBtn").click();
  await ownerPage.waitForFunction(()=>!document.getElementById("dashboard")?.classList.contains("hidden"),{timeout:12000});
  await ownerPage.waitForFunction(key=>localStorage.getItem("setka-research:admin-key:v1")===key,freshAdminKey,{timeout:12000});
  assert.equal(ownerRequests.filter(x=>x.action==="redeem").length,1,"owner ticket redeems exactly once");
  assert.ok(ownerRequests.some(x=>x.action==="admin-check"&&x.adminKey===freshAdminKey));
  assert.ok(ownerRequests.filter(x=>x.adminKey).every(x=>x.adminKey===freshAdminKey),"stale keys must never reach authenticated actions");
  assert.ok((await ownerPage.locator("#dashboard .tab[data-tab]").count())>=11);
  console.log("OWNER TICKET SCRUB / EXPLICIT ONE-TIME REDEEM / STALE KEY OVERRIDE PASS");
}finally{await browser?.close();server.kill("SIGTERM")}
