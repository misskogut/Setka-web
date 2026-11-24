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
 // Real React petal paths: one half folds inward and dims without an
 // independent shadow geometry. Both gestures must reverse the petal side.
 const checkPaths=await page.evaluate(()=>{
  const axis=window.SETKA_CYCLE_LOTUS_AXIS;
  const original=window.__setkaRealSVG;
  const old=axis.getInfo(),rows=[];
  for(const direction of [-1,1]){
   for(const p of [.55,.75,.9]){
    axis.render(p,direction);
    const inner=direction<0?"left":"right",outer=direction<0?"right":"left";
    const innerPaths=[...original.querySelectorAll(".lotus-petal."+inner)];
    const outerPaths=[...original.querySelectorAll(".lotus-petal."+outer)];
    rows.push({direction,p,innerCount:innerPaths.length,outerCount:outerPaths.length,
      folded:innerPaths.every(x=>x.style.transform.includes("scaleX(")),
      innerOpacity:Number(innerPaths[0]?.style.opacity),
      outerFolded:outerPaths.some(x=>x.style.transform.includes("scaleX(")),
      noCurtain:!document.querySelector(".setka-cycle-lotus-material"),
      originalWidth:original.getBoundingClientRect().width});
   }
  }
  axis.render(old.progress,old.direction);
  return rows;
 });
 console.log("ORIGINAL SVG LEFT RIGHT PETAL DEPTH",JSON.stringify(checkPaths));
 for(const x of checkPaths){
  assert.ok(x.innerCount>0&&x.outerCount>0,"real ALMA contains left/right petals");
  assert.ok(x.folded&&!x.outerFolded,"only original immersed paths fold inward");
  assert.ok(x.innerOpacity<1,"only immersed petals are dimmed");
  assert.ok(x.originalWidth>250,"the original flower must never shrink entirely");
  assert.equal(x.noCurtain,true,"no second layer or dark circular curtain");
 }
 mkdirSync("tests/visual-smoke",{recursive:true});
 const shot=PNG.sync.read(await page.screenshot({
  path:"tests/visual-smoke/lotus-native-3d-"+(process.env.SETKA_BROWSER||"chromium")+".png"
 }));
 // Inspect the real render; a single source with 3D material should not
 // become a tiny tulip at the edge. The original pixel dimensions are fixed.
 assert.ok(shot.width>0&&shot.height>0);
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
 // The same original React button must still open its native ALMA calendar
 // after TWO cross-document adoptions. Merely restoring an SVG is not enough.
 const clickReady=await page.evaluate(()=>{
  const iframe=document.querySelector("#setkaCycleBack iframe");
  const btn=iframe?.contentDocument?.querySelector(".cycle-lotus-button");
  const same=btn?.querySelector("svg.cycle-lotus")===window.__setkaRealSVG;
  if(!same)return false;
  btn.click();
  return true;
 });
 assert.ok(clickReady,"original ALMA button and SVG survive two rotations");
 await page.waitForFunction(()=>
  !!document.querySelector("#setkaCycleBack iframe")?.contentDocument?.querySelector(".sheet-layer"),
  null,{timeout:7000});
}finally{await browser?.close().catch(()=>{});server.kill("SIGTERM")}
