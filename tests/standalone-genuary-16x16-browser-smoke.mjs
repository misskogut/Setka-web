import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium,webkit} from "playwright";
import "../standalone-pattern-registry-v1.js";
const R=globalThis.SetkaPatternRegistryV1;
const port=49822,base="http://127.0.0.1:"+port;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browserName=process.env.SETKA_BROWSER==="webkit"?"webkit":"chromium";
let browser;
try{
 for(let i=0;i<50;i++){try{if((await fetch(base+"/standalone-v34.html")).ok)break}catch{}await sleep(100)}
 browser=await (browserName==="webkit"?webkit:chromium).launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];context.on("page",page=>page.on("pageerror",e=>errors.push(e.message)));
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
   ok:true,descriptors:list,registryRevision:R.revision(),publicationRevision:12,
   publication:list.map(p=>({pattern_id:p.id,state:"published",revision:12})),
   items:list.map(p=>({pattern_id:p.id,title:p.title,revision:1})),defaults:[],
   order:{patternIds:list.map(p=>p.id),revision:1}
  };
  await route.fulfill({status:200,contentType:"application/json",headers:cors,body:JSON.stringify(response)});
 });
 const page=await context.newPage();
 await page.goto(base+"/standalone-v34.html",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>window.SetkaPatternRegistryV1?.ready("genuary-16x16")&&
  !!window.SetkaPatternKeyV1?.open&&!!window.SetkaApp?.openConfig,{timeout:30000});
 const opened=await page.evaluate(()=>{
  const r=window.SetkaPatternRegistryV1;
  r.applyPublication(r.ids(),100000);
  return window.SetkaApp.openConfig(r.defaults("genuary-16x16"),{type:"base",id:"genuary-16x16",patternId:"genuary-16x16"});
 });
 assert.equal(opened,true,"real published gameplay opens");
 await page.waitForFunction(()=>document.getElementById("gameScreen")?.classList.contains("active"));
 await page.evaluate(()=>window.SetkaPatternKeyV1.open());
 const labels=await page.evaluate(()=>{
  const s=document.getElementById("st34KeySheet");
  const rows=[...s.querySelectorAll(".sk-setting")];
  return{
   rows:rows.map(r=>({label:r.querySelector(".sk-label")?.textContent.trim(),
     badge:r.querySelector(".sk-gesture")?.textContent.trim()||null,
     value:r.querySelector("input")?.value,
     help:r.querySelector("input")?.getAttribute("aria-description")})),
   text:s.innerText,outputs:s.querySelectorAll(".sk-value,output").length
  };
 });
 const map=Object.fromEntries(labels.rows.map(x=>[x.label,x]));
 assert.equal(labels.rows.length,8);
 assert.equal(map["Скручивание"].badge,"Снизу ←→");
 assert.equal(map["Толщина линий"].badge,"Сверху ←→");
 assert.equal(map["Плотность линий"].badge,"Слева ↑↓");
 assert.equal(map["Наклон 3D"].badge,"Справа ↑↓");
 assert.ok(labels.rows.every(row=>row.help&&row.help.length>14));
 assert.equal(labels.outputs,0,"no visually noisy numeric values");
 assert.ok(!/ТОЛЬКО БЕГУНКОМ|Бегунок Бегунок/i.test(labels.text));
 assert.match(labels.text,/Тройное касание/);
 await page.evaluate(()=>window.SetkaPatternKeyV1.close());
 // Exercise actual SETKA touch dispatch, not the isolated math reducer.
 await page.evaluate(()=>{
  const canvas=document.getElementById("patternCanvas");
  const send=(type,x,y,ident=30)=>{
   const r=canvas.getBoundingClientRect();
   const t={identifier:ident,clientX:r.left+x*r.width,clientY:r.top+y*r.height};
   const event=new Event(type,{bubbles:true,cancelable:true});
   Object.defineProperty(event,"touches",{value:type==="touchend"?[]:[t]});
   canvas.dispatchEvent(event);
  };
  window.__genuarySwipe=(x,y,dx,dy)=>{
   const r=canvas.getBoundingClientRect(),x2=x+dx/r.width,y2=y+dy/r.height;
   send("touchstart",x,y);
   send("touchmove",x2,y2);
   const mid=window.SetkaApp.getConfig();
   send("touchend",x2,y2);
   return {mid,final:window.SetkaApp.getConfig()};
  };
  window.__genuaryTap=()=>{
   send("touchstart",.5,.5);
   send("touchend",.5,.5);
   return window.SetkaApp.getConfig();
  };
 });
 const initial=await page.evaluate(()=>window.SetkaApp.getConfig());
 const left=await page.evaluate(()=>window.__genuarySwipe(.04,.22,0,-90));
 assert.ok(left.final.num>initial.num,"left vertical increases density");
 assert.equal(left.final.lineW,initial.lineW);
 const right=await page.evaluate(()=>window.__genuarySwipe(.96,.28,0,90));
 assert.ok(right.final.pitch>initial.pitch,"right vertical tilts the 3D stack");
 assert.equal(right.final.num,left.final.num);
 const top=await page.evaluate(()=>window.__genuarySwipe(.50,.18,90,0));
 assert.ok(top.final.lineW>left.final.lineW,"top horizontal changes thickness");
 const bottom=await page.evaluate(()=>window.__genuarySwipe(.50,.83,120,0));
 assert.ok(bottom.final.turn>0,"bottom horizontal twists layers");
 const ignored=await page.evaluate(()=>window.__genuarySwipe(.04,.18,90,0));
 assert.equal(ignored.final.num,bottom.final.num,"left horizontal is ignored by axis lock");
 const saved=await page.evaluate(()=>{
  const c=window.SetkaApp.getConfig(),r=window.SetkaPatternRegistryV1;
  const snapshot=r.snapshot({patternId:"genuary-16x16",config:c,frame:80});
  return r.restore(snapshot).ok;
 });
 assert.equal(saved,true,"config with real swipes restores through shared registry");
 for(let i=0;i<3;i++)await page.evaluate(()=>window.__genuaryTap());
 const mono=await page.evaluate(()=>window.SetkaApp.getConfig());
 assert.equal(mono.colorModeIndex,0);
 assert.equal(mono.invert,1,"three taps reach the second original monochrome");
 for(let i=0;i<3;i++)await page.evaluate(()=>window.__genuaryTap());
 const cyan=await page.evaluate(()=>window.SetkaApp.getConfig());
 assert.equal(cyan.colorModeIndex,1);
 assert.equal(cyan.invert,0,"three more taps reach the original cyan mode");
 assert.deepEqual(errors,[],"real gameplay and help must not throw runtime errors");
 console.log("Genuary 16x16 live mobile swipes + 10-color triple tap:",browserName,"PASS");
 await context.close();
}finally{await browser?.close();server.kill("SIGTERM")}
