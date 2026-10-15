// Isolated microphone fixture: no physical microphone or private data is used.
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium,webkit} from "playwright";

const port=49321,base="http://127.0.0.1:"+port;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try{
  for(let i=0;i<40;i++){try{if((await fetch(base+"/standalone-v34.html")).ok)break}catch{}await sleep(100)}
  browser=await (process.env.SETKA_BROWSER==="webkit"?webkit:chromium).launch({headless:true,args:process.env.SETKA_BROWSER==="webkit"?[]:["--no-sandbox"]});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/functions/v1/**",r=>r.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify({ok:true,items:[],notes:[],metrics:{},profile:{}})}));
  await page.addInitScript(()=>{
    const meter={started:0,stopped:0,denied:false,signal:"music"};
    window.__setkaMicFixture=meter;
    const track={kind:"audio",stop(){meter.stopped++},addEventListener(){}};
    Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getUserMedia:async args=>{
      if(meter.denied)throw Object.assign(new Error("Permission denied"),{name:"NotAllowedError"});
      if(args.video!==false||!args.audio)throw Error("Video capture requested unexpectedly");
      meter.started++;return{getTracks:()=>[track],getAudioTracks:()=>[track]};
    }}});
    class FakeAudioContext{
      constructor(){this.sampleRate=44100;this.state="running"}
      createMediaStreamSource(){return{connect(){},disconnect(){}}}
      createAnalyser(){return {fftSize:1024,smoothingTimeConstant:0,frequencyBinCount:512,
        getByteFrequencyData(out){out.fill(meter.signal==="music"?210:0)},
        getByteTimeDomainData(out){for(let i=0;i<out.length;i++)out[i]=meter.signal==="music"?Math.round(128+48*Math.sin(i*.17)):128}
      }}
      async resume(){this.state="running"}
      async close(){this.state="closed"}
    }
    Object.defineProperty(window,"AudioContext",{configurable:true,value:FakeAudioContext});
  });
  await page.goto(base+"/standalone-v34.html",{waitUntil:"domcontentloaded"});
  // Enter gameplay through its real public API. A tile click can open the
  // optional start-session choice sheet instead of gameplay.
  await page.evaluate(()=>{
    const p=window.SetkaApp.getPatterns()[0];
    window.SetkaApp.openConfig(p.defaults,{type:"base",id:p.id,patternId:p.id});
  });
  await page.locator("#gameScreen.active").waitFor();
  const toggle=page.locator("#st34AudioButton");
  await toggle.waitFor();
  assert.equal(await toggle.isVisible(),true);
  assert.equal(await toggle.getAttribute("aria-pressed"),"false");
  assert.equal(await toggle.locator(".st34-audio-indicator").count(),0,"no activation dot");
  const offStyle=await toggle.evaluate(el=>({opacity:Number(getComputedStyle(el).opacity),border:getComputedStyle(el).borderColor}));
  assert.ok(offStyle.opacity<.45,"OFF should be faded like the eye control: "+JSON.stringify(offStyle));
  assert.equal(await page.locator("#st34Nav").isVisible(),false,"music toggle only in immersive gameplay");
  const bounds=await page.evaluate(()=>{
    const ids=["st34AudioButton","favoriteButton","libraryButton","st34Note"];
    return ids.map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return{id,x:r.x,y:r.y,w:r.width,h:r.height,visible:getComputedStyle(e).display!=="none"}});
  });
  const music=bounds[0];
  for(const other of bounds.slice(1)){
    if(!other.visible)continue;
    assert.ok(music.x+music.w<=other.x||music.x>=other.x+other.w||music.y+music.h<=other.y||music.y>=other.y+other.h,
      "music button overlaps "+other.id+": "+JSON.stringify(bounds));
  }
  const initial=await page.evaluate(()=>({favorites:window.SetkaApp.getFavorites(),audio:window.SetkaAudioReactiveV1.status()}));
  assert.equal(initial.audio.active,false);
  await toggle.click();
  await page.waitForFunction(()=>window.SetkaAudioReactiveV1?.isActive());
  assert.equal(await toggle.getAttribute("aria-pressed"),"true");
  await page.waitForFunction(()=>Number(getComputedStyle(document.getElementById("st34AudioButton")).opacity)>.90);
  const onStyle=await toggle.evaluate(el=>Number(getComputedStyle(el).opacity));
  assert.ok(onStyle>.90,"ON note must be bright without a dot: "+onStyle);
  const frame=await page.evaluate(()=>{
    // Analyzer is fed synthetic frequency energy; assert it really changes
    // the frame passed to every canonical pattern through the shared clock.
    const audio=window.SetkaAudioReactiveV1;let t=1000;
    const patterns=window.SetkaApp.getPatterns(),details=[];
    for(const p of patterns){
      window.SetkaApp.openConfig(p.defaults,{type:"base",id:p.id,patternId:p.id});
      audio.nextFrame(60,t);t+=20;
      const changed=audio.nextFrame(61.2,t);t+=20;
      details.push({id:p.id,changed});
    }
    return details;
  });
  assert.equal(frame.length,7);
  frame.forEach(x=>assert.ok(x.changed>61.9,"audible music must produce visibly stronger motion in "+x.id+": "+JSON.stringify(x)));
  assert.equal(await toggle.getAttribute("aria-pressed"),"true","pattern navigation must not disable audio");
  const after=await page.evaluate(()=>({config:window.SetkaApp.getConfig(),favorites:window.SetkaApp.getFavorites(),meter:window.__setkaMicFixture,source:window.SetkaAudioReactiveV1.status().source}));
  assert.deepEqual(after.favorites,initial.favorites,"favorited recipes must not change");
  assert.equal(after.source,"microphone");
  assert.equal(await page.evaluate(()=>window.SetkaAudioReactiveV1.status().heard),true);
  const silent=await page.evaluate(()=>{
    window.__setkaMicFixture.signal="silent";
    const audio=window.SetkaAudioReactiveV1;
    for(let i=0;i<90;i++)audio.nextFrame(100+i,2000+i*16.667);
    const measure=audio.nextFrame(200,4000);
    return {offset:measure-200,level:audio.status().level};
  });
  assert.ok(silent.level<.03,"silence must not invent music: "+JSON.stringify(silent));
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-pressed"),"false");
  assert.equal(await page.evaluate(()=>window.__setkaMicFixture.stopped),1,"OFF must stop microphone stream");
  await page.evaluate(()=>{window.__setkaMicFixture.denied=true});
  await toggle.click();
  await page.waitForFunction(()=>document.querySelector("#st34AudioFeedback")?.textContent.includes("Разреши микрофон"));
  assert.equal(await toggle.getAttribute("aria-pressed"),"false","denied permission must stay off");
  await page.evaluate(()=>{window.__setkaMicFixture.denied=false});
  await toggle.click();
  await page.waitForFunction(()=>window.SetkaAudioReactiveV1?.isActive());
  await page.locator("#libraryButton").click();
  await page.locator("#libraryScreen.active").waitFor();
  assert.equal(await page.evaluate(()=>window.SetkaAudioReactiveV1.isActive()),false,"leaving gameplay must stop mic");
  assert.ok((await page.evaluate(()=>window.__setkaMicFixture.stopped))>=2);
  assert.deepEqual(errors,[]);
  console.log("AUDIO REACTIVE TOGGLE / 7 PATTERNS / CONSENT / STOP / PRIVACY PASS",JSON.stringify(frame));
}finally{await browser?.close();server.kill("SIGTERM")}
