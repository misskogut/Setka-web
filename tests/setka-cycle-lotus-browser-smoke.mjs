/* Real mobile Chromium and WebKit: original SVG and calendar card
   participate in one 3D coordinate space. Screen captures are acceptance
   evidence; DOM-only passes are NOT a visual sign-off. */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdirSync} from "node:fs";
import {chromium,webkit} from "playwright";
const port=48481,root="http://127.0.0.1:"+port;
const engine=process.env.SETKA_BROWSER==="webkit"?webkit:chromium;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=t=>new Promise(r=>setTimeout(r,t));
let browser;
try{
 let up=false;
 for(let i=0;i<60;i++){try{const r=await fetch(root+"/experiments/alma-cycle-source/index.html");if(r.ok){up=true;break}}catch{}await sleep(100)}
 assert.ok(up,"SETKA local static site not ready");
 browser=await engine.launch({headless:true,args:process.env.SETKA_BROWSER==="webkit"?[]:["--no-sandbox","--enable-webgl","--use-gl=angle","--use-angle=swiftshader"]});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.route("**/*",route=>{
  const u=route.request().url();
  if(u.startsWith(root+"/")||u.startsWith("blob:")||u.startsWith("data:"))return route.continue();
  return route.abort();
 });
 await page.goto(root+"/standalone-v34-cycle-logo3d.html",{waitUntil:"domcontentloaded",timeout:30000});
 await page.waitForFunction(()=>document.querySelector("#setkaCycleBack iframe")?.contentDocument?.querySelector(".cycle-lotus-button svg.cycle-lotus"),null,{timeout:18000});
 await page.evaluate(()=>{window.__originalLotus=document.querySelector("#setkaCycleBack iframe").contentDocument.querySelector(".cycle-lotus-button svg.cycle-lotus")});
 await page.mouse.move(379,420);await page.mouse.down();await page.mouse.move(190,420,{steps:15});
 await page.waitForFunction(()=>window.SETKA_CYCLE_LOTUS_AXIS?.getInfo().originalIn3D,null,{timeout:10000});
 const observations=await page.evaluate(()=>{
  const axis=window.SETKA_CYCLE_LOTUS_AXIS;
  const stage=document.getElementById("setkaCycle3DCard");
  const back=document.getElementById("setkaCycleBack");
  const lotus=window.__originalLotus;
  const portal=document.getElementById("setkaCycleLotusDirectPortal");
  const volume=document.getElementById("setkaCycleCardVolume");
  const before=axis.getInfo(),old=stage.style.transform,oldBack=back.style.transform;
  const rows=[];
  for(const d of [-1,1])for(const p of [.5,.6,.75,.9,.98]){
   const g=axis.geometry(p,d);
   stage.style.transform="rotateY("+g.cardYaw+"deg)";
   back.style.transform="translateZ(0px)";
   axis.render(p,d);
   const holder=portal.querySelector(".setka-cycle-lotus-direct-holder");
   const hingeRect=holder.getBoundingClientRect();
   const cardRect=back.getBoundingClientRect();
   rows.push({d,p,cardYaw:g.cardYaw,counterYaw:g.counterYaw,
    cardWidth:cardRect.width,flowerWidth:hingeRect.width,
    sameSVG:lotus===holder.querySelector("svg.cycle-lotus"),
    preserved3D:getComputedStyle(stage).transformStyle,
    portal3D:getComputedStyle(portal).transformStyle,
    holderTransform:getComputedStyle(holder).transform,
    calendarOpacity:Number(getComputedStyle(back).opacity),
    depthVisible:volume.style.visibility==="visible",
    oneLotus:portal.querySelectorAll("svg.cycle-lotus").length===1,
    webkitWorld:axis.getInfo().webkitWorld,
    portalParent:portal.parentElement?.id});
  }
  stage.style.transform=old;back.style.transform=oldBack;
  axis.render(before.progress,before.direction);
  return rows;
 });
 console.log("ALMA COMMON 3D INTERSECTION",JSON.stringify(observations));
 for(const o of observations){
  assert.ok(o.sameSVG&&o.oneLotus,"original React SVG must be SINGLE within the card");
  assert.equal(o.preserved3D,"preserve-3d","the calendar must share 3D depth with the lotus");
  assert.equal(o.portal3D,"preserve-3d");
  assert.equal(o.cardYaw+o.counterYaw,0);
  assert.equal(o.depthVisible,true);
  assert.equal(o.portalParent,o.webkitWorld?"setkaCycle3DWorld":"setkaCycle3DCard");
  assert.ok(o.flowerWidth>120,"native lotus cannot shrink to a tiny image");
  assert.ok(o.calendarOpacity>=.69&&o.calendarOpacity<=1);
 }
 mkdirSync("tests/visual-smoke",{recursive:true});
 await page.evaluate(()=>{
  const axis=window.SETKA_CYCLE_LOTUS_AXIS,stage=document.getElementById("setkaCycle3DCard");
  stage.style.transform="rotateY(82deg)";
  axis.render(.544444,-1);
 });
 const shot=await page.screenshot({path:"tests/visual-smoke/lotus-volume-"+(process.env.SETKA_BROWSER||"chromium")+".png"});
 // The prior v17 WebKit job incorrectly passed a 2px-wide lotus.
 // Require actual purple petal pixels on BOTH sides of the hinge.
 const {PNG}=await import("pngjs");
 const png=PNG.sync.read(shot),mid=png.width/2;
 let left=0,right=0;
 for(let y=Math.round(png.height*.22);y<Math.round(png.height*.62);y+=2)
  for(let x=20;x<png.width-20;x+=2){
   const i=(y*png.width+x)*4,r=png.data[i],g=png.data[i+1],b=png.data[i+2];
   if(r>85&&b>100&&r>g*1.42&&b>g*1.42){
    if(x<mid-75)left++;
    if(x>mid+75)right++;
   }
  }
 console.log("LOTUS TRUE PETAL PIXELS",JSON.stringify({left,right,engine:process.env.SETKA_BROWSER||"chromium"}));
 assert.ok(left>80&&right>80,"webkit: original lotus MUST remain wide at the card edge, not collapse");
 // Diagonal frame is critical: depth must emerge gradually, not only
 // at an exactly edge-on orientation.
 await page.evaluate(()=>{
  const a=window.SETKA_CYCLE_LOTUS_AXIS;
  document.getElementById("setkaCycle3DCard").style.transform="rotateY(48deg)";
  a.render(1-48/180,-1);
 });
 await page.screenshot({path:"tests/visual-smoke/lotus-volume-diagonal-"+(process.env.SETKA_BROWSER||"chromium")+".png"});
 await page.mouse.up();
 await page.waitForFunction(()=>!window.SETKA_CYCLE_LOTUS_AXIS.getInfo().turning,null,{timeout:25000});
 const restored=await page.evaluate(()=>document.querySelector("#setkaCycleBack iframe")?.contentDocument?.querySelector(".cycle-lotus-button svg.cycle-lotus")===window.__originalLotus);
 assert.ok(restored,"original native SVG must be restored after gesture");
 await page.mouse.move(10,430);await page.mouse.down();await page.mouse.move(240,430,{steps:12});await page.mouse.up();
 await page.waitForFunction(()=>!window.SETKA_CYCLE_LOTUS_AXIS.getInfo().turning,null,{timeout:25000});
 const clicked=await page.evaluate(()=>{
  const btn=document.querySelector("#setkaCycleBack iframe")?.contentDocument?.querySelector(".cycle-lotus-button");
  if(!btn||btn.querySelector("svg.cycle-lotus")!==window.__originalLotus)return false;
  btn.click();return true;
 });
 assert.ok(clicked,"native ALMA interaction survives two original-node transfers");
 await page.waitForFunction(()=>!!document.querySelector("#setkaCycleBack iframe")?.contentDocument?.querySelector(".sheet-layer"),null,{timeout:7000});
}finally{await browser?.close().catch(()=>{});server.kill("SIGTERM")}
