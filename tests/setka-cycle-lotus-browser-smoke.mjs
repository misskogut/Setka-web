/* Real Chromium/WebKit iPhone swipe: verify that one original ALMA SVG
   is reparented into CSS 3D and then restored into the original React button. */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdirSync} from "node:fs";
import {PNG} from "pngjs";
import {chromium,webkit} from "playwright";
const port=48481,root="http://127.0.0.1:"+port;
const engine=process.env.SETKA_BROWSER==="webkit"?webkit:chromium;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=t=>new Promise(r=>setTimeout(r,t));
let browser;
try{
 let up=false;
 for(let i=0;i<60;i++){try{const r=await fetch(root+"/experiments/alma-cycle-source/index.html");if(r.ok){up=true;break}}catch{}await sleep(100)}
 assert.ok(up,"SETKA static server not ready");
 browser=await engine.launch({headless:true,args:process.env.SETKA_BROWSER==="webkit"?[]:["--no-sandbox","--enable-webgl","--use-gl=angle","--use-angle=swiftshader"]});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.route("**/*",route=>{
  const u=route.request().url();
  if(u.startsWith(root+"/")||u.startsWith("blob:")||u.startsWith("data:"))return route.continue();
  return route.abort();
 });
 await page.goto(root+"/standalone-v34-cycle-logo3d.html",{waitUntil:"domcontentloaded",timeout:30000});
 await page.waitForFunction(()=>document.querySelector("#setkaCycleBack iframe")?.contentDocument?.querySelector(".cycle-lotus-button svg.cycle-lotus"),null,{timeout:18000});
 await page.evaluate(()=>{
  window.__setkaRealSVG=document.querySelector("#setkaCycleBack iframe").contentDocument.querySelector(".cycle-lotus-button svg.cycle-lotus");
 });
 const initial=await page.evaluate(()=>({node:!!window.__setkaRealSVG,api:!!window.SETKA_CYCLE_LOTUS_AXIS,canvas:!!document.querySelector("#setkaCycleLotusTurn")}));
 assert.equal(initial.node,true);assert.equal(initial.api,true);assert.equal(initial.canvas,false,"legacy WebGL is not loaded");
 await page.mouse.move(379,420);await page.mouse.down();await page.mouse.move(190,420,{steps:15});
 const ready=await page.waitForFunction(()=>window.SETKA_CYCLE_LOTUS_AXIS?.getInfo().originalIn3D,null,{timeout:10000});
 assert.ok(ready,"one native SVG must enter the direct 3D scene");
 const during=await page.evaluate(()=>{
  const svg=window.__setkaRealSVG,portal=document.getElementById("setkaCycleLotusDirectPortal");
  const holder=portal?.querySelector(".setka-cycle-lotus-direct-holder");
  return{original:svg===holder?.querySelector("svg.cycle-lotus"),
    missingFromButton:!document.querySelector("#setkaCycleBack iframe")?.contentDocument?.querySelector(".cycle-lotus-button svg.cycle-lotus"),
    counter:holder?.dataset.counterYaw,info:window.SETKA_CYCLE_LOTUS_AXIS.getInfo(),
    svgCount:portal?.querySelectorAll("svg.cycle-lotus").length};
 });
 assert.equal(during.original,true,"the floated SVG must be IDENTICAL to the original object");
 assert.equal(during.missingFromButton,true,"no second lotus may exist");
 assert.equal(during.svgCount,1);
 assert.equal(during.info.nativeOriginal,true);
 assert.equal(during.info.hasClone,false);
 assert.ok(Math.abs(during.info.cardYaw+during.info.counterYaw)<1e-4);
 mkdirSync("tests/visual-smoke",{recursive:true});
 const shot=PNG.sync.read(await page.screenshot({
  path:"tests/visual-smoke/lotus-native-3d-"+(process.env.SETKA_BROWSER||"chromium")+".png"
 }));
 const scale=shot.width/390,halves=[];
 for(const [a,b] of [[10,150],[240,380]]){
  let lit=0;
  for(let y=Math.round(205*scale);y<Math.round(500*scale);y+=2)
   for(let x=Math.round(a*scale);x<Math.round(b*scale);x+=2){
    const i=(y*shot.width+x)*4,r=shot.data[i],g=shot.data[i+1],blue=shot.data[i+2];
    if(r>95&&blue>110&&r>g*1.3&&blue>g*1.45)lit++;
   }
  halves.push(lit);
 }
 console.log("NATIVE ALMA 3D TWO VISIBLE HALVES",JSON.stringify(halves));
 assert.ok(halves[0]>80&&halves[1]>80,
  "in Safari the original lotus must remain wide, not collapse into an edge-on line");
 await page.mouse.up();
 await page.waitForFunction(()=>window.SETKA_CYCLE_LOTUS_AXIS?.getInfo().turning===false,null,{timeout:25000});
 const rest=await page.evaluate(()=>{
  const btn=document.querySelector("#setkaCycleBack iframe")?.contentDocument?.querySelector(".cycle-lotus-button");
  return{same:btn?.querySelector("svg.cycle-lotus")===window.__setkaRealSVG,
   empty:!document.getElementById("setkaCycleLotusDirectPortal")?.querySelector("svg.cycle-lotus")};
 });
 assert.equal(rest.same,true,"the original clickable SVG is back inside ALMA");
 assert.equal(rest.empty,true,"the 3D portal no longer contains a lotus");
 await page.mouse.move(10,430);await page.mouse.down();await page.mouse.move(240,430,{steps:12});
 const reverse=await page.waitForFunction(()=>window.SETKA_CYCLE_LOTUS_AXIS?.getInfo().originalIn3D,null,{timeout:9000});
 assert.ok(reverse,"reverse swipe reuses the same original SVG");
 await page.mouse.up();
 await page.waitForFunction(()=>!window.SETKA_CYCLE_LOTUS_AXIS?.getInfo().turning,null,{timeout:25000});
}finally{await browser?.close().catch(()=>{});server.kill("SIGTERM")}
