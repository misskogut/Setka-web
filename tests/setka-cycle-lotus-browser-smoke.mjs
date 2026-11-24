/* ALMA regression: original lotus stays attached to the live React
   calendar throughout normal card flips, without GPU overlays or duplicates. */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium,webkit} from "playwright";
const port=48489,root="http://127.0.0.1:"+port;
const engine=process.env.SETKA_BROWSER==="webkit"?webkit:chromium;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=t=>new Promise(r=>setTimeout(r,t));
let browser;
try{
 let ok=false;
 for(let i=0;i<70;i++){
  try{if((await fetch(root+"/standalone-v34-cycle-logo3d.html")).ok){ok=true;break}}catch{}
  await sleep(100);
 }
 assert.ok(ok,"SETKA static server");
 browser=await engine.launch({headless:true,args:process.env.SETKA_BROWSER==="webkit"?[]:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.route("**/*",route=>{
  const url=route.request().url();
  if(url.startsWith(root+"/")||url.startsWith("blob:")||url.startsWith("data:"))return route.continue();
  return route.abort();
 });
 await page.goto(root+"/standalone-v34-cycle-logo3d.html",{waitUntil:"domcontentloaded",timeout:30000});
 await page.waitForFunction(()=>!!document.querySelector("#setkaCycleBack iframe")?.contentDocument?.querySelector(".cycle-lotus-button svg.cycle-lotus"),null,{timeout:28000});
 const initial=await page.evaluate(()=>{
  const doc=document.querySelector("#setkaCycleBack iframe").contentDocument;
  const svg=doc.querySelector(".cycle-lotus-button svg.cycle-lotus");
  window.__almaOriginalLotus=svg;
  return {original:!!svg,flowerCount:doc.querySelectorAll(".cycle-lotus-button svg.cycle-lotus").length,
   gpuOverlay:!!document.querySelector("#setkaCycleLotusTurn"),
   axisScript:!!window.SETKA_CYCLE_LOTUS_AXIS};
 });
 assert.ok(initial.original);
 assert.equal(initial.flowerCount,1);
 assert.equal(initial.gpuOverlay,false);
 assert.equal(initial.axisScript,false);
 for(const [a,b] of [[375,195],[10,235]]){
  await page.mouse.move(a,410);await page.mouse.down();
  await page.mouse.move(b,410,{steps:14});await page.mouse.up();
  await page.waitForFunction(()=>!document.body.classList.contains("cycle-flip-active"),null,{timeout:13000});
  const status=await page.evaluate(()=>{
   const iframe=document.querySelector("#setkaCycleBack iframe"),doc=iframe.contentDocument;
   const btn=doc.querySelector(".cycle-lotus-button");
   const svg=btn?.querySelector("svg.cycle-lotus");
   return {same:svg===window.__almaOriginalLotus,
    count:doc.querySelectorAll(".cycle-lotus-button svg.cycle-lotus").length,
    duplicate:!!document.querySelector("#setkaCycleLotusTurn,#setkaCycleLotusDirectPortal"),
    cardRestored:!document.getElementById("setkaCycleBack").style.transform};
  });
  assert.equal(status.same,true,"keep the exact original SVG in ALMA");
  assert.equal(status.count,1);
  assert.equal(status.duplicate,false);
  assert.ok(status.cardRestored,"no residual card transform");
 }
}finally{await browser?.close().catch(()=>{});server.kill("SIGTERM")}
