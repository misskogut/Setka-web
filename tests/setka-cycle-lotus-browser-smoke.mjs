/* Run with node tests/setka-cycle-lotus-browser-smoke.mjs in Playwright image.
   Real in-browser GPU draw and mobile swipe, not just geometry-unit math.
   No external production APIs are permitted; screenshots are local artifacts. */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdirSync} from "node:fs";
import {chromium,webkit} from "playwright";
import {PNG} from "pngjs";

const port=48481,root="http://127.0.0.1:"+port;
const engine=process.env.SETKA_BROWSER==="webkit"?webkit:chromium;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=t=>new Promise(r=>setTimeout(r,t));
let browser;
try{
 let up=false;
 for(let i=0;i<50;i++){
  try{const r=await fetch(root+"/experiments/alma-cycle-source/index.html");if(r.ok){up=true;break}}catch{}
  await sleep(100);
 }
 assert.ok(up,"local SETKA static server was not ready");
 browser=await engine.launch({
  headless:true,
  args:process.env.SETKA_BROWSER==="webkit"?[]:[
   "--no-sandbox","--enable-webgl","--use-gl=angle",
   "--use-angle=swiftshader","--disable-dev-shm-usage"
  ]
 });
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const notices=[];
 page.on("pageerror",e=>notices.push("PAGE ERROR "+e.message));
 page.on("console",m=>{
  if(/ALMA 3D|WebGL|image decode|source texture/i.test(m.text()))
   notices.push("CONSOLE "+m.text().slice(0,250));
 });
 await page.route("**/*",route=>{
  const u=route.request().url();
  if(u.startsWith(root+"/")||u.startsWith("blob:")||u.startsWith("data:"))return route.continue();
  return route.abort();
 });
 await page.goto(root+"/standalone-v34-cycle-logo3d.html",{waitUntil:"domcontentloaded",timeout:30000});
 await page.waitForFunction(
  ()=>document.querySelector("#setkaCycleBack iframe")?.contentDocument?.querySelector(".cycle-lotus-button svg.cycle-lotus"),
  null,{timeout:18000}
 );
 const ready=await page.waitForFunction(()=>window.SETKA_CYCLE_LOTUS_AXIS?.getInfo().ready,null,{timeout:16000}).catch(()=>null);
 if(!ready){
  const debug=await page.evaluate(()=>{
   const info=window.SETKA_CYCLE_LOTUS_AXIS?.getInfo?.();
   const c=document.getElementById("setkaCycleLotusTurn");
   const iframe=document.querySelector("#setkaCycleBack iframe");
   return {info,canvas:!!c,canvasWidth:c?.width,iframeLoaded:iframe?.contentDocument?.readyState,
    sourceSVG:!!iframe?.contentDocument?.querySelector(".cycle-lotus-button svg.cycle-lotus")};
  });
  mkdirSync("tests/visual-smoke",{recursive:true});
  await page.screenshot({path:"tests/visual-smoke/lotus-not-ready-"+(process.env.SETKA_BROWSER||"chromium")+".png"});
  console.log("NOT READY DIAGNOSTIC",JSON.stringify(debug),"BROWSER WARNINGS",JSON.stringify(notices));
  throw Error("ALMA WebGL texture never became ready before first swipe");
 }
 const before=await page.evaluate(()=>window.SETKA_CYCLE_LOTUS_AXIS.getInfo());
 console.log("PREWARM",JSON.stringify(before));
 assert.equal(before.prewarmed,true,"WebGL lotus texture must be ready *before* user gestures");
 assert.equal(before.real3D,true);
 assert.equal(before.textureFailures,0,"the mobile GPU must accept the ALMA shader and texture");

 await page.mouse.move(379,420);
 await page.mouse.down();
 await page.mouse.move(179,420,{steps:16});
 await sleep(180);
 const during=await page.evaluate(()=>{
  const o=window.SETKA_CYCLE_LOTUS_AXIS.getInfo();
  const c=document.getElementById("setkaCycleLotusTurn");
  const original=document.querySelector("#setkaCycleBack iframe")?.contentDocument?.documentElement;
  return {...o,display:c?.style.display,dimensions:[c?.width,c?.height],
   originalHidden:original?.classList.contains("setka-cycle-hides-original-lotus")};
 });
 console.log("ROTATING",JSON.stringify(during));
 assert.equal(during.originalHidden,true,"ALMA original cannot double-paint");
 assert.equal(during.display,"block","3D lotus canvas must be visible mid-turn");
 assert.ok(during.frames>0,"GPU should render at least one card+lotus frame");
 assert.equal(during.worldYaw,undefined); // world yaw is represented as 'yaw' in geometry
 assert.equal(during.yaw,0);
 assert.equal(during.depthIntersection,true);
 assert.ok(during.pivotY>230&&during.pivotY<550,
  "live 3D hinge must follow ALMA lotus, not hidden iframe's zero rect");

 mkdirSync("tests/visual-smoke",{recursive:true});
 const image=PNG.sync.read(await page.screenshot({
  path:"tests/visual-smoke/lotus-real-3d-"+(process.env.SETKA_BROWSER||"chromium")+".png"
 }));
 // There must be violet pixels visible in the protruding ALMA region.
 // This catches a successfully linked shader drawing an EMPTY texture.
 let violet=0;
 const scaleX=image.width/390,scaleY=image.height/844;
 for(let y=160;y<580;y++){
  for(let x=190;x<385;x++){
   const px=Math.min(image.width-1,Math.floor(x*scaleX));
   const py=Math.min(image.height-1,Math.floor(y*scaleY));
   const i=(py*image.width+px)*4,r=image.data[i],g=image.data[i+1],b=image.data[i+2];
   if(r>95&&b>110&&r>g*1.3&&b>g*1.5)violet++;
  }
 }
 console.log("VISIBLE LOTUS PIXELS",violet,"WARNINGS",JSON.stringify(notices.slice(-8)));
 assert.ok(violet>60,"a real neon lotus must be painted on the visible ALMA side, not a blank WebGL canvas");

 await page.mouse.up();
 // Software WebGL in CI can deliver only a few animation frames per second.
 // Wait for the real flip controller's settled state, not an assumed 700 ms.
 await page.waitForFunction(
  ()=>window.SETKA_CYCLE_LOTUS_AXIS?.getInfo().turning===false,
  null,{timeout:25000}
 );
 const rest=await page.evaluate(()=>window.SETKA_CYCLE_LOTUS_AXIS.getInfo());
 console.log("SETTLED",JSON.stringify(rest));
 assert.equal(rest.prewarmed,true,"GPU texture stays ready after first swipe");
 await page.mouse.move(10,430);
 await page.mouse.down();
 await page.mouse.move(222,430,{steps:12});
 await sleep(100);
 const second=await page.evaluate(()=>window.SETKA_CYCLE_LOTUS_AXIS.getInfo());
 console.log("REVERSE",JSON.stringify(second));
 assert.ok(second.frames>during.frames,"second swipe reuses GPU instead of waiting for SVG decode");
 await page.mouse.up();
}finally{
 await browser?.close().catch(()=>{});
 server.kill("SIGTERM");
}
