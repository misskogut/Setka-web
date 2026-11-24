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
 let up=false;for(let i=0;i<70;i++){try{const r=await fetch(root+"/standalone-v34-cycle-logo3d.html");if(r.ok){up=true;break}}catch{}await sleep(100)}
 assert.ok(up,"SETKA local server ready");
 browser=await engine.launch({headless:true,args:process.env.SETKA_BROWSER==="webkit"?[]:["--no-sandbox","--enable-webgl","--use-gl=angle","--use-angle=swiftshader"]});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.route("**/*",route=>{const u=route.request().url();return(u.startsWith(root+"/")||u.startsWith("blob:")||u.startsWith("data:"))?route.continue():route.abort()});
 await page.goto(root+"/standalone-v34-cycle-logo3d.html",{waitUntil:"domcontentloaded",timeout:30000});
 await page.waitForFunction(()=>document.querySelector("#setkaCycleBack #alma-cycle-root .cycle-lotus-button svg.cycle-lotus"),null,{timeout:30000});
 const initial=await page.evaluate(()=>({noIframe:!document.querySelector("#setkaCycleBack iframe"),native:!!document.querySelector("#alma-cycle-root .phone-scene"),ready:!!window.SETKA_CYCLE_LOTUS_AXIS}));
 assert.ok(initial.noIframe&&initial.native&&initial.ready,"original ALMA should be in the real DOM");
 await page.evaluate(()=>{window.__originalLotus=document.querySelector("#alma-cycle-root .cycle-lotus-button svg.cycle-lotus")});
 await page.mouse.move(379,420);await page.mouse.down();await page.mouse.move(190,420,{steps:15});
 await page.waitForFunction(()=>window.SETKA_CYCLE_LOTUS_AXIS?.getInfo().originalIn3D,null,{timeout:10000});
 const rows=await page.evaluate(()=>{
  const a=window.SETKA_CYCLE_LOTUS_AXIS,stage=document.getElementById("setkaCycle3DCard"),portal=document.getElementById("setkaCycleLotusDirectPortal");
  const orig=window.__originalLotus,prev=a.getInfo(),ret=[];
  for(const d of [-1,1])for(const p of [.5,.6,.75,.9,.98]){
   const g=a.geometry(p,d);stage.style.transform="rotateY("+g.cardYaw+"deg)";a.render(p,d);
   const holder=portal.querySelector(".setka-cycle-lotus-direct-holder");
   ret.push({d,p,angle:g.cardYaw,opposite:g.counterYaw,width:holder.getBoundingClientRect().width,
    same:orig===holder.querySelector("svg.cycle-lotus"),volume:a.getInfo().volumeVisible,
    scene:getComputedStyle(stage).transformStyle});
  }
  stage.style.removeProperty("transform");a.render(prev.progress,prev.direction);return ret;
 });
 console.log("NATIVE ALMA SAME-DOM 3D",JSON.stringify(rows));
 for(const x of rows){
  assert.ok(x.same&&x.volume);
  assert.equal(x.scene,"preserve-3d");
  assert.equal(x.angle+x.opposite,0);
  assert.ok(x.width>125,"original lotus must not collapse");
 }
 mkdirSync("tests/visual-smoke",{recursive:true});
 for(const angle of [82,45]){
  await page.evaluate(a=>{const axis=window.SETKA_CYCLE_LOTUS_AXIS;document.getElementById("setkaCycle3DCard").style.transform="rotateY("+a+"deg)";axis.render(1-a/180,-1)},angle);
  const data=await page.screenshot({path:"tests/visual-smoke/lotus-volume-"+angle+"-"+(process.env.SETKA_BROWSER||"chromium")+".png"});
  const png=PNG.sync.read(data),mid=png.width/2;let L=0,R=0;
  for(let y=Math.round(png.height*.22);y<Math.round(png.height*.62);y+=2)
   for(let x=20;x<png.width-20;x+=2){
    const i=(y*png.width+x)*4,r=png.data[i],g=png.data[i+1],b=png.data[i+2];
    if(r>75&&b>100&&r>g*1.4&&b>g*1.4){if(x<mid-70)L++;if(x>mid+70)R++}
   }
  console.log("ALMA ORIGINAL PIXELS",angle,JSON.stringify({L,R}));
  assert.ok(L>55&&R>55,"native lotus should show BOTH halves in WebKit");
 }
 await page.mouse.up();
 await page.waitForFunction(()=>!window.SETKA_CYCLE_LOTUS_AXIS.getInfo().turning,null,{timeout:25000});
 assert.equal(await page.evaluate(()=>document.querySelector("#alma-cycle-root .cycle-lotus-button svg.cycle-lotus")===window.__originalLotus),true);
 await page.mouse.move(10,430);await page.mouse.down();await page.mouse.move(240,430,{steps:12});await page.mouse.up();
 await page.waitForFunction(()=>!window.SETKA_CYCLE_LOTUS_AXIS.getInfo().turning,null,{timeout:25000});
 await page.evaluate(()=>document.querySelector("#alma-cycle-root .cycle-lotus-button").click());
 await page.waitForFunction(()=>!!document.querySelector("#alma-cycle-root .sheet-layer"),null,{timeout:9000});
}finally{await browser?.close().catch(()=>{});server.kill("SIGTERM")}
