import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium,webkit} from "playwright";

const port=48375,root="http://127.0.0.1:"+port;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  for(let i=0;i<30;i++){try{if((await fetch(root+"/standalone-admin-pattern-knowledge-v40.js")).ok)break}catch{}await sleep(100)}
  browser=await (process.env.SETKA_BROWSER==="webkit"?webkit:chromium).launch({headless:true,args:["--no-sandbox"]});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(root+"/standalone-renderer-v40.html",{waitUntil:"domcontentloaded"});
  await page.setContent('<button class="tab" data-tab="pattern-knowledge">Карточки паттернов</button><button id="refreshBtn">Обновить</button><section id="tab-pattern-knowledge"></section>');
  await page.evaluate(()=>{
    localStorage.setItem("setka-research:admin-key:v1","synthetic-ci-key-only");
    const data={
      patterns:[],configs:[],patternHistory:[],
      serviceMetrics:{connected_accounts:1,sessions:3,exposures:37,saved_configurations:11,configuration_saves:11},
      observedConfigs:[
        {patternId:"dandelion",configKey:"a",exposures:12,sessions:2,viewingAccounts:1,totalDurationMs:44000,saveAccounts:0},
        {patternId:"tentacle-orbit",configKey:"b",exposures:25,sessions:2,viewingAccounts:1,totalDurationMs:83000,saveAccounts:1}
      ],
      observedTruncated:false
    };
    window.fetch=async()=>new Response(JSON.stringify({ok:true,...data}),{status:200,headers:{"Content-Type":"application/json"}});
  });
  await page.addScriptTag({url:root+"/standalone-admin-pattern-knowledge-v40.js"});
  await page.locator(".tab[data-tab='pattern-knowledge']").click();
  await page.waitForFunction(()=>document.querySelectorAll("#pk40Patterns button").length===7,{timeout:10000});
  const patterns=await page.locator("#pk40Patterns button").allInnerTexts();
  assert.equal(patterns.length,7);
  assert.ok(patterns.some(t=>t.includes("Одуванчик")));
  assert.ok(patterns.some(t=>t.includes("Stereo DNA")));
  assert.equal(await page.locator("#pk40Observed .card").count(),2);
  assert.match(await page.locator("#pk40Observed").innerText(),/Не сохраняли в избранное/);
  await page.locator("#pk40Patterns button").filter({hasText:"Одуванчик"}).click();
  assert.equal(await page.locator("#pk40Observed .card").count(),1);
  assert.match(await page.locator("#pk40Observed").innerText(),/12 просмотров/);
  console.log("ADMIN 7 CATALOG + UNSAVED CONFIG VIEWS PASS");

  // Admin preview must prefer frozen recipe identity to the structural shape.
  const fresh=await (await fetch(root+"/standalone-admin-note-snapshot-fix-v34.js")).text();
  const start=fresh.indexOf("  function pidOf(item) {"),end=fresh.indexOf("  function recipeOf(item)",start);
  assert.ok(start>=0&&end>start);
  const resolver=fresh.slice(start,end);
  assert.ok(resolver.indexOf("for(const v of [item?.replaySnapshot?.patternId")<resolver.indexOf("if (c.eyeSeparation"));
  assert.ok(fresh.includes("config:replay.config || item?.config"));
  console.log("ADMIN NOTE IMMUTABLE PATTERN REPLAY PASS");

  const saved=await page.evaluate(async()=>{
    const native=window.fetch;
    window.fetch=async()=>new Response(JSON.stringify({ok:true,devices:[],sessions:[]}),{status:200,headers:{"Content-Type":"application/json"}});
    const script=document.createElement("script");script.src="/standalone-admin-bridge-v34b.js";document.body.appendChild(script);
    await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=reject});
    const resp=await fetch("https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-research-api",{method:"POST",body:JSON.stringify({action:"admin-toggle-active",adminKey:"synthetic",participantId:"fake"})});
    const out=await resp.json();
    return{status:resp.status,ok:out.ok,error:out.error};
  });
  assert.equal(saved.status,409);
  assert.equal(saved.ok,undefined);
  assert.match(saved.error,/Изменений не было/);
  console.log("ADMIN MUTATIONS FAIL CLOSED PASS");
  assert.deepEqual(errors,[]);
}finally{await browser?.close();server.kill("SIGTERM")}
