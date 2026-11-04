import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium,webkit} from "playwright";
import "../standalone-pattern-registry-v1.js";

const R=globalThis.SetkaPatternRegistryV1;
const id="interlaced-spirals",port=49793,base="http://127.0.0.1:"+port;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const pause=ms=>new Promise(ok=>setTimeout(ok,ms));
let browser;
try{
 for(let i=0;i<50;i++){try{if((await fetch(base+"/standalone-v34.html")).ok)break}catch{}await pause(100)}
 browser=await (process.env.SETKA_BROWSER==="webkit"?webkit:chromium).launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];
 context.on("page",page=>page.on("pageerror",e=>errors.push(String(e.message))));
 await context.route("**/functions/v1/**",async route=>{
  const req=route.request(),headers=req.headers(),cors={
   "access-control-allow-origin":headers.origin||base,
   "access-control-allow-credentials":"true",
   "access-control-allow-headers":headers["access-control-request-headers"]||"content-type,apikey,authorization",
   "access-control-allow-methods":"GET,POST,OPTIONS"};
  if(req.method()==="OPTIONS")return route.fulfill({status:204,headers:cors,body:""});
  let payload={};try{payload=req.postDataJSON()||{}}catch{}
  const list=R.list();
  const response=["catalog","manage-catalog"].includes(payload.action)?
   {ok:true,descriptors:list,registryRevision:R.revision(),publicationRevision:12,
     publication:list.map(p=>({pattern_id:p.id,state:"published",revision:12})),
     items:list.map(p=>({pattern_id:p.id,title:p.title,revision:1})),
     defaults:[],order:{patternIds:list.map(p=>p.id),revision:1}}:
   {ok:true,items:[],metrics:{},notes:[],profile:{}};
  await route.fulfill({status:200,contentType:"application/json",headers:cors,body:JSON.stringify(response)});
 });
 const page=await context.newPage();
 await page.goto(base+"/standalone-v34.html",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(id=>window.SetkaPatternRegistryV1?.ready(id)&&window.SetkaApp?.openConfig, id,{timeout:30000});
 const opened=await page.evaluate(id=>{
  const reg=window.SetkaPatternRegistryV1;reg.applyPublication(reg.ids(),100000);
  return window.SetkaApp.openConfig(reg.defaults(id),{type:"base",id,patternId:id});
 },id);
 assert.equal(opened,true);
 await page.waitForFunction(()=>document.getElementById("gameScreen")?.classList.contains("active"),{timeout:8000});
 await page.evaluate(()=>window.SetkaPatternKeyV1.open());
 await page.locator("#st34KeySheet").waitFor({state:"visible"});
 const controlDetails=await page.evaluate(()=>{
  const doc=document.getElementById("st34KeySheet");
  const controls=[...doc.querySelectorAll(".sk-setting")];
  return {names:controls.map(el=>el.querySelector("input")?.getAttribute("aria-label")),
    gestures:controls.map(el=>el.querySelector(".sk-gesture")?.textContent??null),
    hints:[...doc.querySelectorAll(".sk-gesture-info")].map(el=>el.innerText),
    readable:doc.querySelector(".sk-help-disclosure summary")?.textContent,
    paletteCount:window.SetkaPatternRegistryV1.get("interlaced-spirals").colorModes};
 });
 assert.deepEqual(controlDetails.names,["Скорость","Сила волны","Лучи","Слои","Масштаб","Толщина линий","Переплетение","Дыхание"]);
 assert.equal(controlDetails.paletteCount,9);
 assert.ok(controlDetails.gestures.some(s=>s?.includes("Слева")));
 assert.ok(controlDetails.gestures.some(s=>s?.includes("Снизу")));
 assert.ok(controlDetails.gestures.some(s=>s?.includes("Пинч")||s?.includes("Свести")));
 assert.equal(controlDetails.hints.length,2);
 assert.equal(controlDetails.readable,"Что делают бегунки?");
 await page.locator(".sk-help-disclosure summary").click();
 assert.equal(await page.locator(".sk-help-entry").count(),8);
 await page.evaluate(()=>window.SetkaPatternKeyV1.close());

 // Touch events are delivered to the ACTUAL pattern canvas and app event
 // dispatcher. No direct module reducer calls in this browser test.
 async function touch(steps){
  return page.evaluate(steps=>{
   const canvas=document.getElementById("patternCanvas"),r=canvas.getBoundingClientRect();
   const xy=(id,x,y)=>({identifier:id,clientX:r.left+x*r.width,clientY:r.top+y*r.height});
   const send=(type,touches)=>{
    const e=new Event(type,{bubbles:true,cancelable:true});
    Object.defineProperty(e,"touches",{value:touches});
    canvas.dispatchEvent(e);
   };
   for(const item of steps){
    send(item.type,item.coords.map(([id,x,y])=>xy(id,x,y)));
   }
   return window.SetkaApp.getConfig();
  },steps);
 }
 // Every position is valid for a 3-tap palette cycle, including center.
 let c=await touch([{type:"touchstart",coords:[[11,.5,.5]]},{type:"touchend",coords:[]}]);
 assert.equal(c.colorModeIndex,0,"one tap never changes the palette");
 c=await touch([
  {type:"touchstart",coords:[[11,.35,.5]]},
  {type:"touchstart",coords:[[11,.35,.5],[12,.55,.5]]},
  {type:"touchmove",coords:[[11,.25,.5],[12,.65,.5]]},
  {type:"touchend",coords:[]}
 ]);
 assert.equal(c.colorModeIndex,0,"adding a second finger cancels the tap");
 assert.ok(c.zoom>1,"two-finger pinch changes zoom without palette cycle");
 const initialColor=c.colorModeIndex;
 for(let i=0;i<3;i++){
  c=await touch([{type:"touchstart",coords:[[11,.5,.5]]},{type:"touchend",coords:[]}]);
 }
 assert.equal(c.colorModeIndex,(initialColor+1)%9,"three center taps select next palette once");
 // A bottom-right start must be bottom speed, not right-edge arms.
 const prevSpeed=c.speed,prevArms=c.arms;
 c=await touch([{type:"touchstart",coords:[[11,.8,.8]]},
                {type:"touchmove",coords:[[11,.95,.82]]},
                {type:"touchend",coords:[]}]);
 assert.ok(c.speed>prevSpeed);
 assert.equal(c.arms,prevArms);
 const prevLayers=c.layers;
 c=await touch([{type:"touchstart",coords:[[11,.12,.5]]},
                {type:"touchmove",coords:[[11,.12,.32]]},
                {type:"touchend",coords:[]}]);
 assert.ok(c.layers>prevLayers,"left swipe increases layers");
 const prevArms2=c.arms;
 c=await touch([{type:"touchstart",coords:[[11,.88,.5]]},
                {type:"touchmove",coords:[[11,.88,.28]]},
                {type:"touchend",coords:[]}]);
 assert.ok(c.arms>prevArms2,"right swipe increases arms");
 const prevWave=c.waveIntensity;
 c=await touch([{type:"touchstart",coords:[[11,.5,.1]]},
                {type:"touchmove",coords:[[11,.7,.1]]},
                {type:"touchend",coords:[]}]);
 assert.ok(c.waveIntensity>prevWave,"top swipe increases wave");
 const unchanged=c.colorModeIndex;
 await page.evaluate(()=>{
  const canvas=document.getElementById("patternCanvas"),rect=canvas.getBoundingClientRect();
  const e=new WheelEvent("wheel",{bubbles:true,cancelable:true,deltaY:-200});
  canvas.dispatchEvent(e);
 });
 assert.ok((await page.evaluate(()=>window.SetkaApp.getConfig().zoom))>c.zoom,"wheel zoom uses same config");
 assert.equal((await page.evaluate(()=>window.SetkaApp.getConfig().colorModeIndex)),unchanged);
 assert.deepEqual(errors,[],"no JavaScript errors in live UI");
 console.log("Interlaced spirals real mobile gesture/key",process.env.SETKA_BROWSER||"chromium","PASS");
 await context.close();
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}