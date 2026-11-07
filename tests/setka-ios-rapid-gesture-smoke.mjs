import assert from "node:assert/strict";
import fs from "node:fs";
import {spawn} from "node:child_process";
import {chromium,webkit} from "playwright";

const port=49687,base="http://127.0.0.1:"+port;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
 for(let i=0;i<50;i++){
  try{if((await fetch(base+"/standalone-v34.html")).ok)break}catch{}
  await sleep(100);
 }
 browser=await (process.env.SETKA_BROWSER==="webkit"?webkit:chromium).launch({
  headless:true,args:process.env.SETKA_BROWSER==="webkit"?[]:["--no-sandbox"]
 });
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[],crashes=[];
 page.on("pageerror",e=>errors.push(e.message));
 page.on("crash",()=>crashes.push("WebContent renderer process crashed"));
 await page.route("**/functions/v1/**",route=>{
  const body=route.request().postDataJSON?.()||{};
  const rows=JSON.parse(fs.readFileSync("setka-pattern-manifest-v1.json","utf8")).patterns;
  const payload=body.action==="catalog"
   ?{ok:true,publicationRevision:1,items:rows.map(p=>({pattern_id:p.id,title:p.title,revision:1}))}
   :{ok:true,items:[],notes:[],sessions:[],profile:{},metrics:{}};
  return route.fulfill({status:200,contentType:"application/json",
   headers:{"access-control-allow-origin":"*"},body:JSON.stringify(payload)});
 });
 await page.goto(base+"/standalone-v34.html?ios-gesture-stress=1",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>window.SetkaApp&&window.SetkaStandaloneV34&&window.SetkaPatternRegistryV1.isActive("tentacle-orbit"),null,{timeout:15000});
 const run=async count=>page.evaluate(async count=>{
  const S=window.SetkaApp,C=window.SetkaStandaloneV34,R=window.SetkaPatternRegistryV1;
  const opened=S.openConfig(R.defaults("tentacle-orbit"),{
   type:"base",id:"tentacle-orbit",patternId:"tentacle-orbit"
  });
  if(!opened||S.getState().view!=="game")throw Error("gameplay not opened");
  // Recording every rapid swipe is still required, but cannot serialize the
  // entire personal research archive on every touch.
  C.getData().settings.replayDetailsEnabled=true;
  let writes=0,configWrites=0;
  const dataKey=window.SetkaDataScopeV1?.key?.("setka-standalone:v34")||"setka-standalone:v34";
  const configsKey=window.SetkaDataScopeV1?.key?.("setka-patterns:last-config:v1")||"setka-patterns:last-config:v1";
  const proto=Storage.prototype,original=proto.setItem;
  proto.setItem=function(k,v){
   if(k===dataKey)writes++;
   if(k===configsKey)configWrites++;
   return original.call(this,k,v);
  };
  const before=C.getData().events.length;
  const initialColor=S.getState().config.colorModeIndex;
  const canvas=document.getElementById("patternCanvas");
  // Touch constructors are intentionally unavailable in some automation
  // browsers ("Illegal constructor"); synthetic UI events still exercise
  // the exact app touch handlers without pretending to be trusted hardware.
  const mk=(x,y,id)=>({identifier:id,target:canvas,clientX:x,clientY:y,pageX:x,pageY:y,screenX:x,screenY:y});
  const emit=(name,touches,changed)=>{
   const e=new Event(name,{bubbles:true,cancelable:true});
   for(const [key,value] of Object.entries({touches,targetTouches:touches,changedTouches:changed}))
    Object.defineProperty(e,key,{value});
   return canvas.dispatchEvent(e);
  };
  try{
   // Many real gesture lifecycles in one JS turn: an earlier implementation
   // rewrote the whole archive 2*N times and WebKit could terminate.
   for(let i=0;i<count;i++){
    const x=140+(i%7)*9,y=350+(i%8)*12;
    const down=mk(x,y,i+1),moved=mk(x+25,y+30,i+1);
    emit("touchstart",[down],[down]);
    emit("touchmove",[moved],[moved]);
    emit("touchend",[],[moved]);
   }
   // Also exercise consented replay pointer records, without 120-node DOM
   // layout walks inside each pointer handler.
   for(let i=0;i<24;i++)canvas.dispatchEvent(new PointerEvent("pointermove",{
    bubbles:true,pointerId:100+i,pointerType:"touch",buttons:1,clientX:150,clientY:400
   }));
   if(S.getState().view!=="game")throw Error("rapid dragging unexpectedly exited gameplay");
   // A synthetic stray click over the floating Back button must not navigate.
   document.getElementById("libraryButton").dispatchEvent(new MouseEvent("click",{
    bubbles:true,cancelable:true,detail:1
   }));
   if(S.getState().view!=="game")throw Error("stray overlay click unexpectedly exited gameplay");
  }finally{proto.setItem=original}
  const after=C.getData().events.length;
  return {writes,configWrites,events:after-before,view:S.getState().view,pattern:S.getState().patternId,
   colorUnchanged:S.getState().config.colorModeIndex===initialColor};
 },count);
 for(const count of [70,45]){
  const stats=await run(count);
  assert.equal(stats.view,"game","gameplay survives many consecutive rapid gestures");
  assert.equal(stats.pattern,"tentacle-orbit");
  assert.equal(stats.colorUnchanged,true,"dragging must never count as a triple tap");
  assert.ok(stats.events>=count*2,"all start/end gestures are retained in live research archive");
  assert.ok(stats.writes<Math.ceil(count/5)+5,
   "rapid interactions must coalesce full archive writes: "+JSON.stringify(stats));
  assert.ok(stats.configWrites<Math.ceil(count/5)+5,
   "rapid interactions must also coalesce last-pattern-config writes: "+JSON.stringify(stats));
  await page.waitForTimeout(1100);
  const durable=await page.evaluate(async()=>{
   const C=window.SetkaStandaloneV34;
   const key=window.SetkaDataScopeV1?.key?.("setka-standalone:v34")||"setka-standalone:v34";
   await C.whenSaved?.();
   const status=C.storageStatus?.()||{};
   let local=null;
   try{local=JSON.parse(localStorage.getItem(key)||"null")}catch(_){}
   let indexed=null;
   if(status.kind==="indexedDB"){
    try{indexed=(await window.SetkaPersonalStorageV1?.read?.())?.payload||null}catch(_){}
   }
   return {
    saved:!!(local?.events?.some(e=>e.type==="gesture_end")||indexed?.events?.some(e=>e.type==="gesture_end")),
    inMemory:C.getData().events.filter(e=>e.type==="gesture_end").length,
    localEvents:local?.events?.length||0,indexedEvents:indexed?.events?.length||0,
    storageStatus:status,scope:key
   };
  });
  assert.equal(durable.saved,true,
   "batched touch events must be durable in localStorage or IndexedDB: "+JSON.stringify(durable));
  assert.deepEqual(crashes,[],"Safari WebContent process stays alive");
  if(count===70){
   await page.locator("#libraryButton").click();
   assert.equal(await page.evaluate(()=>window.SetkaApp.getState().view),"library",
    "a genuine press on Back still exits normally");
  }
 }
 // Real short stationary taps still cycle color on the third release.
 const triple=await page.evaluate(()=>{
  const S=window.SetkaApp,C=window.SetkaStandaloneV34,canvas=document.getElementById("patternCanvas");
  const prior=S.getState().config.colorModeIndex;
  const mk=i=>({identifier:i,target:canvas,clientX:195,clientY:420});
  const emit=(type,active,changed)=>{
   const event=new Event(type,{bubbles:true,cancelable:true});
   for(const [key,value] of Object.entries({touches:active,targetTouches:active,changedTouches:changed}))
    Object.defineProperty(event,key,{value});
   canvas.dispatchEvent(event);
  };
  for(let i=0;i<3;i++){
   const t=mk(500+i);
   emit("touchstart",[t],[t]);
   emit("touchend",[],[t]);
  }
  return {prior,after:S.getState().config.colorModeIndex,eventCount:C.getData().events.length};
 });
 assert.notEqual(triple.after,triple.prior,"three deliberate taps still cycle the pattern color");
 assert.deepEqual(errors,[],"no JS exceptions during or after rapid touch traffic");
 console.log("SETKA RAPID GAMEPLAY PASS",process.env.SETKA_BROWSER||"chromium");
}finally{await browser?.close();server.kill("SIGTERM")}
