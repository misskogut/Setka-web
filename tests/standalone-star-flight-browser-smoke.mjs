import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium,webkit} from "playwright";
import "../standalone-pattern-registry-v1.js";

const R=globalThis.SetkaPatternRegistryV1;
const port=49783,base="http://127.0.0.1:"+port;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
 for(let i=0;i<45;i++){try{if((await fetch(base+"/standalone-v34.html")).ok)break}catch{}await sleep(100)}
 browser=await (process.env.SETKA_BROWSER==="webkit"?webkit:chromium).launch({headless:true});
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
 await page.waitForFunction(()=>window.SetkaPatternRegistryV1?.ready("star-flight")&&!!window.SetkaApp?.openConfig,{timeout:30000});
 const opened=await page.evaluate(()=>{
  const R=window.SetkaPatternRegistryV1;
  R.applyPublication(R.ids(),100000);
  return window.SetkaApp.openConfig(R.defaults("star-flight"),{type:"base",id:"star-flight",patternId:"star-flight"});
 });
 assert.equal(opened,true,"the real star flight gameplay opens");
 await page.waitForFunction(()=>document.getElementById("gameScreen")?.classList.contains("active"));
 // Real app canvas handlers (no calling the module's reducer directly).
 async function gesture({zone="center",dx=0,dy=0,two=false,remaining=false}={}){
  return page.evaluate(({zone,dx,dy,two,remaining})=>{
   const canvas=document.getElementById("patternCanvas"),rect=canvas.getBoundingClientRect();
   assertWidthHeight: if(!rect.width||!rect.height)throw Error("pattern canvas not displayed");
   const centerY=zone==="top"?.09:zone==="bottom"?.87:.5;
   const centerX=zone==="left"?.08:zone==="right"?.92:.5;
   const xy=(id,x,y)=>({identifier:id,clientX:rect.left+x*rect.width,clientY:rect.top+y*rect.height});
   const first=xy(11,centerX-(two?.08:0),centerY);
   const second=xy(12,centerX+.08,centerY);
   const movedFirst={...first,clientX:first.clientX+dx,clientY:first.clientY+dy};
   const movedSecond={...second,clientX:second.clientX+dx,clientY:second.clientY+dy};
   const send=(type,touches)=>{
    const event=new Event(type,{bubbles:true,cancelable:true});
    Object.defineProperty(event,"touches",{value:touches});
    canvas.dispatchEvent(event);
   };
   send("touchstart",[first]);
   if(two)send("touchstart",[first,second]);
   send("touchmove",two?[movedFirst,movedSecond]:[movedFirst]);
   const moved=window.SetkaApp.getConfig();
   if(two&&remaining){
    send("touchend",[movedFirst]);
    send("touchmove",[{...movedFirst,clientX:movedFirst.clientX+90,clientY:movedFirst.clientY-90}]);
   }
   const leftover=window.SetkaApp.getConfig();
   send("touchend",[]);
   return {moved,leftover,final:window.SetkaApp.getConfig()};
  },{zone,dx,dy,two,remaining});
 }
 const original=await page.evaluate(()=>window.SetkaApp.getConfig());
 const center=await gesture({zone:"center",dx:55,dy:-50});
 assert.ok(center.final.yaw>0,"one finger right turns ship right");
 assert.ok(center.final.pitch>0,"one finger UP points nose UP");
 assert.equal(center.final.speed,original.speed,"steering cannot adjust speed");
 assert.equal(center.final.starCount,original.starCount);
 assert.equal(center.final.bokeh,original.bokeh);
 assert.equal(center.final.colorModeIndex,original.colorModeIndex);
 const centerAfter=center.final;
 const speed=await gesture({zone:"bottom",dx:55,dy:-40});
 assert.ok(speed.final.speed>centerAfter.speed,"bottom zone owns speed");
 assert.equal(speed.final.yaw,centerAfter.yaw);
 assert.equal(speed.final.pitch,centerAfter.pitch);
 const roll=await gesture({zone:"top",dx:-70,dy:50});
 assert.ok(roll.final.rollRate<0,"top left bank works");
 assert.equal(roll.final.speed,speed.final.speed);
 assert.equal(roll.final.yaw,speed.final.yaw);
 const density=await gesture({zone:"left",dx:55,dy:-35});
 assert.ok(density.final.starCount>roll.final.starCount);
 assert.equal(density.final.yaw,roll.final.yaw);
 assert.equal(density.final.pitch,roll.final.pitch);
 const bokeh=await gesture({zone:"right",dx:-60,dy:-40});
 assert.ok(bokeh.final.bokeh>density.final.bokeh);
 assert.equal(bokeh.final.starCount,density.final.starCount);
 const panned=await gesture({zone:"top",dx:40,dy:-30,two:true,remaining:true});
 assert.notEqual(panned.moved.originX,bokeh.final.originX,"two-finger pan moves camera");
 assert.equal(panned.moved.yaw,bokeh.final.yaw,"pan never changes heading");
 assert.equal(panned.moved.pitch,bokeh.final.pitch,"pan never changes nose angle");
 assert.equal(panned.moved.speed,bokeh.final.speed,"pan never changes speed");
 assert.equal(panned.moved.rollRate,bokeh.final.rollRate,"pan never changes roll");
 assert.deepEqual(panned.leftover,panned.moved,"remaining finger after two-finger pan cannot trigger a setting");
 assert.equal(panned.final.colorModeIndex,original.colorModeIndex,"dragging never counts as triple-tapping");
 const controls=await page.evaluate(()=>{
  window.SetkaPatternKeyV1.open();
  const list=document.querySelector("#st34KeySheet .sk-scroll")?.textContent||"";
  return {list,palette:window.SetkaApp.getConfig().colorModeIndex};
 });
 assert.match(controls.list,/2 пальца/,"shared settings displays two-finger translation hint");
 assert.match(controls.list,/Снизу/,"speed gesture displays its own zone");
 assert.equal(controls.palette,0);
 assert.deepEqual(errors,[],"no runtime errors while piloting");
 console.log("Star Flight live touch/gesture isolation:",process.env.SETKA_BROWSER||"chromium","PASS");
 await context.close();
}finally{
 if(browser)await browser.close();
 server.kill("SIGTERM");
}
