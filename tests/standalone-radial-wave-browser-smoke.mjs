import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdirSync} from "node:fs";
import {chromium,webkit} from "playwright";
import "../standalone-pattern-registry-v1.js";

const R=globalThis.SetkaPatternRegistryV1;
const port=49791,base="http://127.0.0.1:"+port;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browserName=process.env.SETKA_BROWSER==="webkit"?"webkit":"chromium";
let browser;
try{
 for(let i=0;i<40;i++){try{if((await fetch(base+"/standalone-v34.html")).ok)break}catch{}await sleep(100)}
 browser=await (browserName==="webkit"?webkit:chromium).launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];
 context.on("page",page=>page.on("pageerror",e=>errors.push(e.message)));
 await context.route("**/functions/v1/**",async route=>{
  const headers=route.request().headers();
  const cors={
   "access-control-allow-origin":headers.origin||base,
   "access-control-allow-credentials":"true",
   "access-control-allow-headers":headers["access-control-request-headers"]||"content-type,apikey,authorization",
   "access-control-allow-methods":"GET,POST,OPTIONS"
  };
  if(route.request().method()==="OPTIONS")return route.fulfill({status:204,headers:cors,body:""});
  let request={};try{request=route.request().postDataJSON()||{}}catch{}
  const list=R.list();
  let response={ok:true,items:[],metrics:{},notes:[],profile:{}};
  if(["catalog","manage-catalog"].includes(request.action))response={
   ok:true,descriptors:list,registryRevision:R.revision(),publicationRevision:11,
   publication:list.map(p=>({pattern_id:p.id,state:"published",revision:11})),
   items:list.map(p=>({pattern_id:p.id,title:p.title,revision:1})),defaults:[],
   order:{patternIds:list.map(p=>p.id),revision:1}
  };
  await route.fulfill({status:200,contentType:"application/json",headers:cors,body:JSON.stringify(response)});
 });
 const page=await context.newPage();
 await page.goto(base+"/standalone-v34.html",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>window.SetkaPatternRegistryV1?.ready("radial-wave")&&!!window.SetkaPatternKeyV1?.open&&!!window.SetkaApp?.openConfig,{timeout:30000});
 assert.equal(await page.evaluate(()=>{
  const registry=window.SetkaPatternRegistryV1;
  registry.applyPublication(registry.ids(),100000);
  return window.SetkaApp.openConfig(registry.defaults("radial-wave"),{type:"base",id:"radial-wave",patternId:"radial-wave"});
 }),true,"real gameplay opens the published module");
 await page.waitForFunction(()=>document.getElementById("gameScreen")?.classList.contains("active"));
 await page.evaluate(()=>window.SetkaPatternKeyV1.open());
 const sheet=page.locator("#st34KeySheet");
 await sheet.waitFor({state:"visible"});
 const controls=await page.evaluate(()=>{
  const sheet=document.getElementById("st34KeySheet");
  return{
   labels:[...sheet.querySelectorAll(".sk-setting .sk-label")].map(e=>e.textContent.trim()),
   explanations:[...sheet.querySelectorAll(".sk-setting .sk-help")].map(e=>e.textContent.trim()),
   sliders:[...sheet.querySelectorAll('.sk-setting input[type="range"]')].map(e=>({
    name:e.getAttribute("aria-label"),
    help:e.getAttribute("aria-describedby"),
    realHelp:!!document.getElementById(e.getAttribute("aria-describedby"))
   })),
   gestures:[...sheet.querySelectorAll(".sk-gesture-info")].map(e=>({
    badge:e.querySelector(".sk-gesture")?.textContent.trim(),
    outcome:e.querySelector(".sk-label")?.textContent.trim()
   })),
   gestureHeading:[...sheet.querySelectorAll(".sk-section")].map(e=>e.textContent.trim())
  };
 });
 assert.equal(controls.sliders.length,10,"ten independent sliders, no mode buttons");
 assert.equal(controls.explanations.length,10,"all ten sliders explain their actual effect");
 assert.ok(controls.sliders.every(c=>c.help&&c.realHelp),"slider descriptions are screen-reader linked");
 assert.equal(controls.gestures.length,2,"no bogus third interaction row");
 assert.deepEqual(controls.gestures.map(g=>g.badge),["1 палец","2 касания"]);
 assert.ok(controls.gestures[0].outcome.includes("центр волн"));
 assert.ok(controls.gestures[1].outcome.includes("центр вернётся"));
 assert.ok(controls.gestureHeading.includes("ЖЕСТЫ НА ПАТТЕРНЕ"));
 assert.ok(controls.gestureHeading.includes("НАСТРОЙКИ · БЕГУНКИ"));
 const help=controls.explanations.join(" ");
 assert.ok(help.includes("Установи выше 0 и коснись"));
 assert.ok(help.includes("Плюс притягивает точки"));
 assert.ok(!controls.gestures.some(g=>/импульс|вихрь|магнит|бегунк/i.test(g.outcome)),
  "effect sliders must never masquerade as separate touch actions");
 mkdirSync("tests/visual-smoke",{recursive:true});
 await page.locator("#st34KeySheet .sk-scroll").evaluate(el=>{el.scrollTop=el.scrollHeight});
 await sheet.screenshot({path:"tests/visual-smoke/platform-radial-help-"+browserName+".png"});
 await page.evaluate(()=>window.SetkaPatternKeyV1.close());
 // Dispatch actual app touch handlers, not a direct pattern-reducer call.
 await page.evaluate(()=>{
  const canvas=document.getElementById("patternCanvas");
  window.__radialSmokeTouch=(type,x,y)=>{
   const r=canvas.getBoundingClientRect();
   const finger={identifier:101,clientX:r.left+x*r.width,clientY:r.top+y*r.height};
   const event=new Event(type,{bubbles:true,cancelable:true});
   Object.defineProperty(event,"touches",{value:type==="touchend"?[]:[finger]});
   canvas.dispatchEvent(event);
   return window.SetkaApp.getConfig();
  };
 });
 let c=await page.evaluate(()=>window.__radialSmokeTouch("touchstart",.74,.67));
 assert.equal(c.centerX,.74,"a tap moves the target to the touched X");
 assert.equal(c.centerY,.67,"a tap moves the target to the touched Y");
 assert.equal(c.touchActive,true);
 c=await page.evaluate(()=>window.__radialSmokeTouch("touchend",.74,.67));
 assert.equal(c.touchActive,false);
 await page.waitForTimeout(95);
 c=await page.evaluate(()=>window.__radialSmokeTouch("touchstart",.74,.67));
 assert.equal(c.centerX,.5,"double tap restores middle X");
 assert.equal(c.centerY,.5,"double tap restores middle Y");
 await page.evaluate(()=>window.__radialSmokeTouch("touchend",.74,.67));
 await page.evaluate(()=>window.SetkaApp.setConfigPatch({pulse:60,twist:70,magnet:-45}));
 c=await page.evaluate(()=>window.__radialSmokeTouch("touchstart",.30,.30));
 assert.equal(c.pulse,60);
 assert.equal(c.twist,70);
 assert.equal(c.magnet,-45);
 assert.ok(c.pulses.length>=3,"touch creates an impulse when slider >0");
 c=await page.evaluate(()=>window.__radialSmokeTouch("touchmove",.55,.52));
 assert.equal(c.centerX,.55,"drag moves center continuously");
 assert.equal(c.centerY,.52);
 assert.notEqual(c.spin,0,"drag applies rotation momentum");
 assert.ok(c.pulses.length>=3,"touch pulse survives into an active drag");
 await page.evaluate(()=>window.__radialSmokeTouch("touchend",.55,.52));
 assert.equal((await page.evaluate(()=>window.SetkaApp.getConfig())).touchActive,false);
 const palette=await page.evaluate(()=>window.SetkaApp.getConfig().colorModeIndex);
 for(let i=0;i<3;i++){
  await page.evaluate(()=>{window.__radialSmokeTouch("touchstart",.45,.45);window.__radialSmokeTouch("touchend",.45,.45)});
  await page.waitForTimeout(75);
 }
 assert.equal(await page.evaluate(()=>window.SetkaApp.getConfig().colorModeIndex),palette,
  "three taps may not override a pattern that owns double-tap gestures");
 assert.deepEqual(errors,[],"mobile page must have no JavaScript runtime errors");
 console.log("Radial Wave mobile key and real touch:",browserName,"PASS");
 await context.close();
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
