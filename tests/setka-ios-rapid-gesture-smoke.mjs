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
  let writes=0;
  const proto=Storage.prototype,original=proto.setItem;
  proto.setItem=function(k,v){if(k==="setka-standalone:v34")writes++;return original.call(this,k,v)};
  const before=C.getData().events.length;
  const canvas=document.getElementById("patternCanvas");
  const mk=(x,y,id)=>new Touch({identifier:id,target:canvas,clientX:x,clientY:y,pageX:x,pageY:y,screenX:x,screenY:y});
  const emit=(name,touches,changed)=>canvas.dispatchEvent(new TouchEvent(name,{
   bubbles:true,cancelable:true,touches,targetTouches:touches,changedTouches:changed
  }));
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
  return {writes,events:after-before,view:S.getState().view,pattern:S.getState().patternId};
 },count);
 for(const count of [70,45]){
  const stats=await run(count);
  assert.equal(stats.view,"game","gameplay survives many consecutive rapid gestures");
  assert.equal(stats.pattern,"tentacle-orbit");
  assert.ok(stats.events>=count*2,"all start/end gestures are retained in live research archive");
  assert.ok(stats.writes<Math.ceil(count/5)+5,
   "rapid interactions must coalesce full archive writes: "+JSON.stringify(stats));
  await page.waitForTimeout(550);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("setka-standalone:v34")||"null"));
  assert.ok(saved?.events?.some(e=>e.type==="gesture_end"),
   "batched touch events become durable without a manual action");
  assert.deepEqual(crashes,[],"Safari WebContent process stays alive");
  if(count===70){
   await page.locator("#libraryButton").click();
   assert.equal(await page.evaluate(()=>window.SetkaApp.getState().view),"library",
    "a genuine press on Back still exits normally");
  }
 }
 assert.deepEqual(errors,[],"no JS exceptions during or after rapid touch traffic");
 console.log("SETKA RAPID GAMEPLAY PASS",process.env.SETKA_BROWSER||"chromium");
}finally{await browser?.close();server.kill("SIGTERM")}
