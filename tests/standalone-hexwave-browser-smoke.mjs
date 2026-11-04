import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium,webkit} from "playwright";
import "../standalone-pattern-registry-v1.js";

const R=globalThis.SetkaPatternRegistryV1,port=49829,base="http://127.0.0.1:"+port;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browserName=process.env.SETKA_BROWSER==="webkit"?"webkit":"chromium";
let browser;
try{
 for(let i=0;i<50;i++){try{if((await fetch(base+"/standalone-v34.html")).ok)break}catch{}await sleep(100)}
 browser=await (browserName==="webkit"?webkit:chromium).launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];
 context.on("page",page=>page.on("pageerror",e=>errors.push(e.message)));
 await context.route("**/functions/v1/**",async route=>{
  const headers=route.request().headers();
  const cors={"access-control-allow-origin":headers.origin||base,"access-control-allow-credentials":"true",
   "access-control-allow-headers":headers["access-control-request-headers"]||"content-type,apikey,authorization",
   "access-control-allow-methods":"GET,POST,OPTIONS"};
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
 await page.waitForFunction(()=>window.SetkaPatternRegistryV1?.ready("hexwave")&&
  !!window.SetkaPatternKeyV1?.open&&!!window.SetkaApp?.openConfig,{timeout:30000});
 const opened=await page.evaluate(()=>{
  const r=window.SetkaPatternRegistryV1;
  r.applyPublication(r.ids(),100000);
  return window.SetkaApp.openConfig(r.defaults("hexwave"),{type:"base",id:"hexwave",patternId:"hexwave"});
 });
 assert.equal(opened,true,"real HexWave gameplay opens");
 await page.waitForFunction(()=>document.getElementById("gameScreen")?.classList.contains("active"));
 await page.evaluate(()=>window.SetkaPatternKeyV1.open());
 const controls=await page.evaluate(()=>{
  const sheet=document.getElementById("st34KeySheet"),rows=[...sheet.querySelectorAll(".sk-setting")];
  return {
   rows:rows.map(r=>({name:r.querySelector(".sk-label")?.textContent?.trim(),
     badge:r.querySelector(".sk-gesture")?.textContent?.trim()||null,
     help:r.querySelector("input")?.getAttribute("aria-description")})),
   hints:[...sheet.querySelectorAll(".sk-gesture-info")].map(x=>x.textContent.trim()),
   text:sheet.textContent,visibleNumbers:sheet.querySelectorAll("output,.sk-value").length
  };
 });
 assert.equal(controls.rows.length,6);
 assert.deepEqual(controls.rows.slice(0,4).map(x=>x.badge),["Справа ↑↓","Снизу ←→","Слева ↑↓","Сверху ←→"]);
 assert.ok(controls.hints.some(t=>t.includes("2 пальца")));
 assert.ok(controls.hints.some(t=>t.includes("3 быстрых касания")));
 assert.equal(controls.visibleNumbers,0);
 assert.ok(!/ТОЛЬКО БЕГУНКОМ/.test(controls.text));
 assert.ok(controls.rows.every(x=>x.help&&x.help.length>20));
 await page.evaluate(()=>window.SetkaPatternKeyV1.close());
 // Read actual on-screen pixels: the canvas is already full-size; the pattern
 // must be populated at its four edges, both portrait and landscape.
 await page.evaluate(()=>{
  window.__hxCoverage=()=>{
   const canvas=document.getElementById("patternCanvas");
   const r=canvas.getBoundingClientRect(),w=canvas.width,h=canvas.height;
   const data=canvas.getContext("2d").getImageData(0,0,w,h).data;
   const bright=[0,0,0,0],band=.09;
   for(let y=2;y<h-2;y+=4)for(let x=2;x<w-2;x+=4){
    const idx=4*(y*w+x),sum=data[idx]+data[idx+1]+data[idx+2];
    if(sum<250)continue;
    if(y<h*band)bright[0]++;
    if(y>h*(1-band))bright[1]++;
    if(x<w*band)bright[2]++;
    if(x>w*(1-band))bright[3]++;
   }
   return {bright,width:r.width,height:r.height,pixelsW:w,pixelsH:h};
  };
 });
 await page.waitForTimeout(220);
 const tall=await page.evaluate(()=>window.__hxCoverage());
 assert.ok(tall.height>tall.width*1.45,"real mobile canvas spans a tall viewport");
 assert.ok(tall.bright.every(v=>v>20),"live HexWave reaches all portrait edges: "+JSON.stringify(tall));
 await page.evaluate(()=>{
  const canvas=document.getElementById("patternCanvas");
  const point=(id,x,y)=>{
   const r=canvas.getBoundingClientRect();
   return {identifier:id,clientX:r.left+r.width*x,clientY:r.top+r.height*y};
  };
  const send=(type,ts)=>{
   const event=new Event(type,{bubbles:true,cancelable:true});
   Object.defineProperty(event,"touches",{value:ts});
   canvas.dispatchEvent(event);
   return window.SetkaApp.getConfig();
  };
  window.__hxTouch={
   swipe(x,y,dx,dy){
    const r=canvas.getBoundingClientRect();
    const x2=x+dx/r.width,y2=y+dy/r.height;
    send("touchstart",[point(100,x,y)]);
    const mid=send("touchmove",[point(100,x2,y2)]);
    const end=send("touchend",[]);
    return {mid,end};
   },
   tap(x=.5,y=.5){
    send("touchstart",[point(100,x,y)]);
    return send("touchend",[]);
   },
   pan(){
    send("touchstart",[point(100,.32,.4)]);
    send("touchstart",[point(100,.32,.4),point(101,.64,.4)]);
    const old=window.SetkaApp.getConfig();
    const moving=send("touchmove",[point(100,.40,.46),point(101,.72,.46)]);
    send("touchend",[point(100,.40,.46)]);
    // No new one-finger action is allowed when a second finger lifts.
    const leftover=send("touchmove",[point(100,.40,.25)]);
    send("touchend",[]);
    return {old,moving,leftover};
   }
  };
 });
 const original=await page.evaluate(()=>window.SetkaApp.getConfig());
 const amp=await page.evaluate(()=>window.__hxTouch.swipe(.85,.5,0,-90));
 assert.ok(amp.end.waveAmplitude>original.waveAmplitude,"right U/D modifies amplitude");
 assert.equal(amp.end.dotSize,original.dotSize);
 const size=await page.evaluate(()=>window.__hxTouch.swipe(.15,.15,100,0));
 assert.ok(size.end.dotSize>amp.end.dotSize,"upper-left L/R modifies diameter");
 assert.equal(size.end.waveAmplitude,amp.end.waveAmplitude);
 const speed=await page.evaluate(()=>window.__hxTouch.swipe(.15,.86,80,0));
 assert.ok(speed.end.waveSpeed>size.end.waveSpeed,"lower-left L/R modifies speed");
 const density=await page.evaluate(()=>window.__hxTouch.swipe(.15,.5,0,-90));
 assert.ok(density.end.hexRadius>speed.end.hexRadius,"left-middle U/D modifies cell size");
 const overlapping=await page.evaluate(()=>window.__hxTouch.swipe(.76,.12,0,75));
 assert.ok(overlapping.end.waveAmplitude<density.end.waveAmplitude,"upper-right U/D still controls amplitude");
 assert.equal(overlapping.end.dotSize,density.end.dotSize);
 const pan=await page.evaluate(()=>window.__hxTouch.pan());
 assert.ok(pan.moving.panX>pan.old.panX&&pan.moving.panY>pan.old.panY,
  "two fingers pan through actual platform touch handlers");
 assert.equal(pan.leftover.waveAmplitude,pan.moving.waveAmplitude);
 assert.equal(pan.leftover.hexRadius,pan.moving.hexRadius);
 const before=await page.evaluate(()=>window.SetkaApp.getConfig());
 assert.equal(before.colorModeIndex,0,"drag/pan never count as taps");
 for(let i=0;i<3;i++)await page.evaluate(()=>window.__hxTouch.tap());
 const changed=await page.evaluate(()=>window.SetkaApp.getConfig());
 assert.equal(changed.colorModeIndex,1,"three short taps change the palette once");
 // Large two-finger pan must re-tile the whole visible viewport, not expose a
 // missing square below/above the original 640x640 source scene.
 await page.waitForTimeout(180);
 const tallAfterPan=await page.evaluate(()=>window.__hxCoverage());
 assert.ok(tallAfterPan.bright.every(v=>v>20),
  "panning keeps all long-phone edges populated: "+JSON.stringify(tallAfterPan));
 await page.setViewportSize({width:844,height:390});
 await page.waitForTimeout(250);
 const wide=await page.evaluate(()=>window.__hxCoverage());
 assert.ok(wide.width>wide.height*1.45,"app canvas responds to landscape resize");
 assert.ok(wide.bright.every(v=>v>20),
  "live HexWave reaches all landscape edges: "+JSON.stringify(wide));
 const stored=await page.evaluate(()=>{
  const r=window.SetkaPatternRegistryV1,config=window.SetkaApp.getConfig();
  const snap=r.snapshot({patternId:"hexwave",config,frame:75});
  const result=r.restore(snap);
  return {ok:result.ok,same:result.ok&&r.configKey(result.snapshot.config,"hexwave")===r.configKey(config,"hexwave")};
 });
 assert.deepEqual(stored,{ok:true,same:true});
 assert.deepEqual(errors,[],"no frontend runtime errors");
 console.log("HexWave live 1/2 finger swipe and triple tap:",browserName,"PASS");
 await context.close();
}finally{await browser?.close();server.kill("SIGTERM")}
