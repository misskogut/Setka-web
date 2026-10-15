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
      constructor(){this.sampleRate=44100;this.state="running";this.destination={speaker:true}}
      createMediaStreamSource(){return{connect(){},disconnect(){}}}
      createGain(){const sink={gain:{value:1},connect(destination){meter.sinkValue=this.gain.value;meter.sinkConnected=destination?.speaker===true},disconnect(){}};return sink}
      createAnalyser(){return {fftSize:1024,smoothingTimeConstant:0,frequencyBinCount:512,connect(target){meter.analyserConnected=!!target},disconnect(){},
        getByteFrequencyData(out){
          if(meter.signal==="music"){out.fill(210);return}
          out.fill(0);
          const range=meter.signal==="bass"?[70,320]:meter.signal==="middle"?[400,1500]:meter.signal==="treble"?[2300,6500]:null;
          if(range)for(let i=0;i<out.length;i++){const hz=i*44100/1024;if(hz>=range[0]&&hz<range[1])out[i]=230}
        },
        getByteTimeDomainData(out){for(let i=0;i<out.length;i++)out[i]=meter.signal!=="silent"?Math.round(128+48*Math.sin(i*.17)):128}
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
  assert.equal(await toggle.locator("#st34AudioModeDots .st34-audio-dot.lit").count(),1,
    "the first press must show one glowing dot");
  assert.equal(await page.evaluate(()=>window.SetkaAudioReactiveV1.status().mode),1);
  const frame=await page.evaluate(()=>{
    // Analyzer is fed synthetic frequency energy; assert it really changes
    // the frame passed to every canonical pattern through the shared clock.
    const audio=window.SetkaAudioReactiveV1;let t=1000;
    const patterns=window.SetkaApp.getPatterns(),details=[];
    for(const p of patterns){
      window.SetkaApp.openConfig(p.defaults,{type:"base",id:p.id,patternId:p.id});
      audio.nextFrame(60,t,p.id);t+=20;
      const changed=audio.nextFrame(61.2,t,p.id);t+=20;
      details.push({id:p.id,changed});
    }
    return details;
  });
  assert.equal(frame.length,7);
  // Musical expressivity must come from GEOMETRY, not 7x animation speed.
  frame.forEach(x=>assert.ok(x.changed>60&&x.changed<61.2,
    "music clock should slow and remain continuous in "+x.id+": "+JSON.stringify(x)));
  const dandelion=frame.find(x=>x.id==="dandelion");
  assert.ok(dandelion.changed<60.60,"Dandelion must not spin at audio-driven high speed: "+JSON.stringify(dandelion));
  const geometry=await page.evaluate(()=>{
    const audio=window.SetkaAudioReactiveV1;
    const patterns=window.SetkaApp.getPatterns();
    const cases=patterns.map(p=>{
      const canonical=JSON.parse(JSON.stringify(p.defaults));
      const original=JSON.parse(JSON.stringify(p.defaults));
      const live=audio.renderConfig(p.defaults,p.id);
      const changed=Object.keys(live).filter(key=>typeof canonical[key]==="number"&&Math.abs(live[key]-canonical[key])>1e-6);
      const untouched=JSON.stringify(p.defaults)===JSON.stringify(original);
      return{id:p.id,changed,untouched};
    });
    const future={patternId:"future-renderer",zoom:1};
    const futureSafe=audio.renderConfig(future,"future-renderer")===future;
    const viewport=audio.viewportScale();
    return{cases,futureSafe,viewport,bands:audio.status().bands};
  });
  assert.equal(geometry.cases.length,7);
  geometry.cases.forEach(x=>{
    assert.equal(x.untouched,true,"canonical configuration was mutated: "+x.id);
    assert.ok(x.changed.length>=4,"music should modulate multiple geometric controls in "+x.id+": "+JSON.stringify(x));
  });
  assert.equal(geometry.futureSafe,true,"new pattern recipes must remain untouched");
  const dnaKeys=geometry.cases.find(x=>x.id==="stereo-dna").changed;
  for(const key of ["eyeSeparation","amplitude","spacing","zoom","stereoAngle","pointSize","glowStrength"])
    assert.ok(dnaKeys.includes(key),"DNA must use real manual control "+key);
  const offsets=await page.evaluate(()=>{
    const a=window.SetkaAudioReactiveV1;
    return {dna:a.offsets("stereo-dna",390,844),dandelion:a.offsets("dandelion",390,844)};
  });
  for(const p of Object.values(offsets)){
    assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
    assert.ok(Math.abs(p.x)<=44&&Math.abs(p.y)<=42);
  }
  // Both canvas axes are driven by independent music bands; results cannot
  // be merely the original image moving faster.
  const movement=await page.evaluate(async ()=>{
    const a=window.SetkaAudioReactiveV1,samples=[];
    window.__setkaMicFixture.signal="music";
    for(let i=0;i<50;i++)a.nextFrame(i,performance.now()+i*17,"stereo-dna");
    for(let k=0;k<5;k++){
      samples.push(a.offsets("stereo-dna",390,844));
      await new Promise(resolve=>setTimeout(resolve,180));
    }
    return samples;
  });
  for(const axis of ["x","y"]){
    const values=movement.map(p=>p[axis]);
    assert.ok(Math.max(...values)-Math.min(...values)>.05,
      "DNA must move on "+axis+" across a musical cycle: "+JSON.stringify(movement));
  }
  assert.ok(geometry.viewport>1&&geometry.viewport<=1.05,"future renderers need universal viewport modulation");
  for(const name of ["low","mid","high"])
    assert.ok(geometry.bands[name]>.1,"independent "+name+" music channel must be measured");
  console.log("MULTIBAND GEOMETRY IN ALL 7 PATTERNS",JSON.stringify(geometry));
  // Frequency-specific fixture: switching the same synthetic microphone from
  // bass to treble must move different independent channels, not just speed.
  const frequencyTest=await page.evaluate(()=>{
    const audio=window.SetkaAudioReactiveV1;
    let now=5000;const step=(signal)=>{
      window.__setkaMicFixture.signal=signal;
      for(let i=0;i<48;i++){now+=17;audio.nextFrame(now/16.67,now)}
      return {...audio.status().bands};
    };
    return{bass:step("bass"),treble:step("treble")};
  });
  assert.ok(frequencyTest.bass.low>frequencyTest.bass.high+.15,"bass needs a distinct low-frequency response: "+JSON.stringify(frequencyTest));
  assert.ok(frequencyTest.treble.high>frequencyTest.treble.low+.15,"treble needs a distinct high-frequency response: "+JSON.stringify(frequencyTest));
  console.log("INDEPENDENT BASS AND TREBLE RESPONSE PASS",JSON.stringify(frequencyTest));
  // The same note cycles five real equalizer variants, THEN OFF. Switching
  // styles must NOT reopen the microphone or change canonical presets.
  const names=["Баланс","Пульс","Волна","Пространство","Детали"];
  const profiles=[];
  for(let index=0;index<names.length;index++){
    if(index>0)await toggle.click();
    const n=index+1;
    assert.equal(await toggle.getAttribute("aria-pressed"),"true");
    assert.equal(await toggle.locator("#st34AudioModeDots .st34-audio-dot.lit").count(),n,
      "EQ mode "+n+" should light precisely "+n+" dots");
    assert.equal(await page.evaluate(()=>window.SetkaAudioReactiveV1.status().mode),n);
    assert.equal(await page.evaluate(()=>window.__setkaMicFixture.started),1,
      "switching EQ variants must reuse the same microphone stream");
    await page.waitForTimeout(420); // the geometric interpolation finishes
    const measurement=await page.evaluate(()=>{
      const eq=window.SetkaAudioReactiveV1;
      window.__setkaMicFixture.signal="music";
      const t=performance.now();
      for(let i=0;i<48;i++)eq.nextFrame(70+i,t+i*17,"stereo-dna");
      const shapes=window.SetkaApp.getPatterns().map(pattern=>{
        const result=eq.renderConfig(pattern.defaults,pattern.id);
        return {id:pattern.id,
          changes:Object.keys(result).filter(key=>Number.isFinite(pattern.defaults[key])&&
            Math.abs(result[key]-pattern.defaults[key])>.00001).map(key=>[key,Math.round(result[key]*10000)/10000])};
      });
      const motion=window.SetkaApp.getPatterns().map(p=>({id:p.id,...eq.offsets(p.id,390,844)}));
      return{mode:eq.status().mode,name:eq.status().modeName,shapes,motion,scale:eq.viewportScale()};
    });
    assert.equal(measurement.name,names[index]);
    assert.equal(measurement.shapes.length,7);
    measurement.shapes.forEach(p=>assert.ok(p.changes.length>=1,
      "Each style must modulate the real geometry for "+p.id+": "+JSON.stringify(measurement)));
    if(n===4)for(const p of measurement.motion)assert.ok(Math.abs(p.x)+Math.abs(p.y)>.05,
      "Spatial mode must move ALL seven patterns in X/Y: "+JSON.stringify(p));
    if(n===5)assert.ok(measurement.scale<1.01,"Detail mode should emphasize small elements instead of zoom");
    profiles.push(measurement);
  }
  const dnaSignatures=profiles.map(m=>JSON.stringify(m.shapes.find(p=>p.id==="stereo-dna").changes));
  assert.equal(new Set(dnaSignatures).size,5,
    "EQ modes must produce five actually different DNA configurations: "+JSON.stringify(dnaSignatures));
  assert.ok(profiles[1].shapes.find(p=>p.id==="stereo-dna").changes.every(([key])=>
    ["amplitude","eyeSeparation","zoom"].includes(key)),
    "Pulse should favor bass-driven swelling, not every control");
  assert.ok(profiles[4].shapes.find(p=>p.id==="stereo-dna").changes.some(([key])=>key==="pointSize"),
    "Detail should activate high-frequency dots");
  console.log("FIVE EQUALIZER MODES / DOTS / ONE STREAM / 7 PATTERNS PASS",
    JSON.stringify(profiles.map(p=>({mode:p.mode,name:p.name,changes:p.shapes.map(x=>[x.id,x.changes.map(c=>c[0])])}))));
  assert.equal(await toggle.getAttribute("aria-pressed"),"true","pattern navigation must not disable audio");
  const after=await page.evaluate(()=>({config:window.SetkaApp.getConfig(),favorites:window.SetkaApp.getFavorites(),meter:window.__setkaMicFixture,source:window.SetkaAudioReactiveV1.status().source}));
  assert.deepEqual(after.favorites,initial.favorites,"favorited recipes must not change");
  assert.equal(after.source,"microphone");
  assert.equal(after.meter.sinkValue,0,"microphone must NEVER be sent audibly to the speaker");
  assert.equal(after.meter.sinkConnected,true,"analyzer graph must be pulled by Safari");
  assert.equal(after.meter.analyserConnected,true);
  assert.equal(await page.evaluate(()=>window.SetkaAudioReactiveV1.status().heard),true);
  const silent=await page.evaluate(()=>{
    window.__setkaMicFixture.signal="silent";
    const audio=window.SetkaAudioReactiveV1;
    for(let i=0;i<90;i++)audio.nextFrame(100+i,2000+i*16.667);
    const measure=audio.nextFrame(200,4000);
    return {offset:measure-200,level:audio.status().level};
  });
  assert.ok(silent.level<.03,"silence must not invent music: "+JSON.stringify(silent));
  const silenceGeometry=await page.evaluate(()=>{
    const p=window.SetkaApp.getPatterns()[0];
    const out=window.SetkaAudioReactiveV1.renderConfig(p.defaults,p.id);
    return Object.keys(p.defaults).every(k=>typeof p.defaults[k]!=="number"||Math.abs(out[k]-p.defaults[k])<.005);
  });
  assert.equal(silenceGeometry,true,"silence must return to original pattern parameters");
  await toggle.click(); // mode 5 -> completely OFF
  assert.equal(await toggle.getAttribute("aria-pressed"),"false");
  assert.equal(await page.evaluate(()=>window.SetkaAudioReactiveV1.status().mode),0);
  assert.equal(await toggle.locator("#st34AudioModeDots .st34-audio-dot.lit").count(),0,
    "all equalizer dots must disappear on OFF");
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
