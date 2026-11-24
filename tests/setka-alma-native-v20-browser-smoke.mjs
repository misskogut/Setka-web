/* Native React ALMA and its one original SVG share one 3D scene.
   Reject a line-shaped flower in real Chromium and iPhone WebKit. */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdirSync} from "node:fs";
import {chromium,webkit} from "playwright";
import {PNG} from "pngjs";
const port=48761,origin="http://127.0.0.1:"+port;
const engine=process.env.SETKA_BROWSER==="webkit"?webkit:chromium;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
 let up=false;
 for(let i=0;i<80;i++){try{if((await fetch(origin+"/standalone-v34-cycle-native3d-v20.html")).ok){up=true;break}}catch{}await pause(100)}
 assert.ok(up,"static site unavailable");
 browser=await engine.launch({headless:true,args:process.env.SETKA_BROWSER==="webkit"?[]:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader"]});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.route("**/*",route=>{
  const u=route.request().url();
  if(u.startsWith(origin+"/")||u.startsWith("data:")||u.startsWith("blob:"))return route.continue();
  return route.abort();
 });
 const errors=[];page.on("pageerror",e=>errors.push(String(e).slice(0,500)));
 await page.goto(origin+"/standalone-v34-cycle-native3d-v20.html",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.querySelector("#alma-cycle-root .cycle-lotus-button svg.cycle-lotus"),null,{timeout:20000});
 const nativeBefore=await page.evaluate(()=>{
  const root=document.querySelector("#alma-cycle-root");
  return{svg:!!root.querySelector(".cycle-lotus-button svg.cycle-lotus"),calendar:!!root.querySelector(".cycle-hero"),
   style:!!document.getElementById("setkaAlmaNativeScopedStyles"),
   iframe:!!document.querySelector("#setkaCycleBack iframe")};
 });
 assert.equal(nativeBefore.svg,true);
 assert.equal(nativeBefore.calendar,true);
 assert.equal(nativeBefore.iframe,false,"must not have flattening iframe");
 await page.mouse.move(379,420);await page.mouse.down();await page.mouse.move(190,420,{steps:16});
 await page.waitForFunction(()=>window.SETKA_CYCLE_LOTUS_AXIS?.getInfo().originalIn3D,null,{timeout:10000});
 const info=await page.evaluate(()=>{
   const axis=window.SETKA_CYCLE_LOTUS_AXIS,card=document.getElementById("setkaCycle3DCard"),
   root=document.querySelector("#alma-cycle-root"),portal=document.querySelector("#setkaCycleLotusDirectPortal"),
   original=portal?.querySelector("svg.cycle-lotus");
   card.style.transform="rotateY(82deg)";
   axis.render(.544444,-1);
   return{one:portal?.querySelectorAll("svg.cycle-lotus").length===1,
    original:!!original,appStill:!!root.querySelector(".cycle-hero"),
    hierarchy:portal?.parentElement===card,
    width:original?.getBoundingClientRect().width,
    cardWidth:document.getElementById("setkaCycleBack")?.getBoundingClientRect().width,
    preserve:getComputedStyle(card).transformStyle,
    counter:axis.getInfo().counterYaw};
 });
 console.log("ALMA native depth",JSON.stringify(info));
 assert.ok(info.one&&info.original&&info.appStill&&info.hierarchy);
 assert.equal(info.preserve,"preserve-3d");
 mkdirSync("tests/visual-smoke",{recursive:true});
 const results=[];
 // Both directions, same original SVG, asymmetric attenuation from the
 // actual material (buried half is dim, exposed half remains bright).
 for(const direction of [-1,1]){
  const a=direction<0?82:-82;
  await page.evaluate(([direction,angle])=>{
   const card=document.getElementById("setkaCycle3DCard");
   card.style.transform="rotateY("+angle+"deg)";
   window.SETKA_CYCLE_LOTUS_AXIS.render(.544444,direction);
  },[direction,a]);
  const filename="tests/visual-smoke/alma-native-v20-"+(process.env.SETKA_BROWSER||"chromium")+"-"+(direction<0?"left":"right")+".png";
  const shot=await page.screenshot({path:filename});
  const png=PNG.sync.read(shot),mid=png.width/2;
  let inner=0,outer=0;
  for(let y=png.height*.25|0;y<png.height*.57;y+=2)
   for(let x=15;x<png.width-15;x+=2){
    const i=(y*png.width+x)*4,r=png.data[i],green=png.data[i+1],b=png.data[i+2];
    const left=x<mid-70,right=x>mid+70;
    if(!left&&!right)continue;
    const dimPurple=r>32&&b>39&&r>green*1.3&&b>green*1.3;
    const brightPurple=r>80&&b>95&&r>green*1.35&&b>green*1.35;
    if((direction<0?left:right)&&dimPurple)inner++;
    if((direction<0?right:left)&&brightPurple)outer++;
   }
  results.push({direction,inner,outer,engine:process.env.SETKA_BROWSER||"chromium"});
 }
 console.log("ALMA native physical inner / outer petals",JSON.stringify({results,errors}));
 for(const {direction,inner,outer} of results){
  assert.ok(inner>130,"inside half must visibly transmit through the card material, gesture "+direction);
  assert.ok(outer>140,"exposed original petals must remain bright, gesture "+direction);
 }
 await page.mouse.up();
 await page.waitForFunction(()=>window.SETKA_CYCLE_LOTUS_AXIS?.getInfo().turning===false,null,{timeout:30000});
 assert.ok(await page.evaluate(()=>!!document.querySelector("#alma-cycle-root .cycle-lotus-button svg.cycle-lotus")));
}finally{await browser?.close().catch(()=>{});server.kill("SIGTERM")}
