import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdirSync} from "node:fs";
import {PNG} from "pngjs";
import {chromium,webkit} from "playwright";
const port=48489,root="http://127.0.0.1:"+port,engine=process.env.SETKA_BROWSER==="webkit"?webkit:chromium;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=t=>new Promise(r=>setTimeout(r,t));
let browser;
try{
 let ok=false;
 for(let i=0;i<70;i++){try{if((await fetch(root+"/standalone-v34-cycle-logo3d-gpu-v20.html")).ok){ok=true;break}}catch{}await sleep(100)}
 assert.ok(ok,"static server");
 browser=await engine.launch({headless:true,args:process.env.SETKA_BROWSER==="webkit"?[]:["--no-sandbox","--enable-webgl","--use-gl=angle","--use-angle=swiftshader"]});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.route("**/*",route=>{
  const url=route.request().url();
  if(url.startsWith(root+"/")||url.startsWith("blob:")||url.startsWith("data:"))return route.continue();
  return route.abort();
 });
 await page.goto(root+"/standalone-v34-cycle-logo3d-gpu-v20.html",{waitUntil:"domcontentloaded",timeout:30000});
 await page.waitForFunction(()=>window.SETKA_CYCLE_LOTUS_AXIS?.getInfo().ready,null,{timeout:28000});
 await page.mouse.move(378,430);await page.mouse.down();await page.mouse.move(195,430,{steps:10});
 await page.waitForFunction(()=>window.SETKA_CYCLE_LOTUS_AXIS?.getInfo().frames>0,null,{timeout:10000});
 mkdirSync("tests/visual-smoke",{recursive:true});
 for(const d of [-1,1]){
  for(const p of [.52,.7]){
   await page.evaluate(([p,d])=>{
    const axis=window.SETKA_CYCLE_LOTUS_AXIS,back=document.getElementById("setkaCycleBack");
    back.style.transform="perspective(1450px) rotateY("+axis.geometry(p,d).cardYaw+"deg)";
    axis.render(p,d);
   },[p,d]);
   const shot=await page.screenshot({path:"tests/visual-smoke/lotus-gpu-"+(process.env.SETKA_BROWSER||"chromium")+"-"+(d<0?"left":"right")+"-"+p+".png"});
   const png=PNG.sync.read(shot),mid=png.width/2;let left=0,right=0;
   for(let y=Math.round(png.height*.22);y<Math.round(png.height*.63);y+=2)
    for(let x=16;x<png.width-16;x+=2){
     const i=(y*png.width+x)*4,r=png.data[i],g=png.data[i+1],b=png.data[i+2];
     if(r>70&&b>95&&r>g*1.32&&b>g*1.35){
      if(x<mid-85)left++;if(x>mid+85)right++;
     }
    }
   console.log("ALMA GPU V20 PIXELS",JSON.stringify({d,p,left,right}));
   const out=d<0?right:left;
   assert.ok(out>55,"exposed ORIGINAL half must remain full-size in "+(process.env.SETKA_BROWSER||"Chromium"));
  }
 }
 await page.mouse.up();
 await page.waitForFunction(()=>!window.SETKA_CYCLE_LOTUS_AXIS?.getInfo().turning,null,{timeout:25000});
 const visible=await page.evaluate(()=>{
  const btn=document.querySelector("#setkaCycleBack iframe")?.contentDocument?.querySelector(".cycle-lotus-button");
  return !!btn?.querySelector("svg.cycle-lotus")&&!document.querySelector("#setkaCycleLotusTurn")?.offsetParent;
 });
 assert.ok(visible,"return to clickable original SVG after animation");
}finally{await browser?.close().catch(()=>{});server.kill("SIGTERM")}
