import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium,webkit} from "playwright";
import {installPublicationCatalog} from "./publication-fixture.mjs";

const name=process.env.SETKA_BROWSER==="webkit"?"webkit":"chromium";
const type=name==="webkit"?webkit:chromium,port=name==="webkit"?49482:49481;
const base="http://127.0.0.1:"+port;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const front="/standalone-v34.html";
const radii=[.22,.55,.88],angles=Array.from({length:8},(_,i)=>i*Math.PI/4);
const percentile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.ceil(p*a.length)-1];
const catalog=Array.from({length:8},(_,i)=>({
 id:"spatial-"+i,title:"Signal "+i,icon_key:"wind",category_ids:["hand"],audio_url:base+"/spatial-fixture.wav",loop:false
}));
function wav(){
 const frames=48000*40,b=Buffer.alloc(44+frames*2);
 b.write("RIFF");b.writeUInt32LE(b.length-8,4);b.write("WAVEfmt ",8);
 b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
 b.writeUInt32LE(48000,24);b.writeUInt32LE(96000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);
 b.write("data",36);b.writeUInt32LE(frames*2,40);
 let seed=123;
 for(let i=0;i<frames;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  b.writeInt16LE((seed>>>19)-4096,44+2*i);
 }
 return b;
}
let browser;
try{
 for(let i=0;i<40;i++){
  if(await fetch(base+front).then(r=>r.ok).catch(()=>false))break;
  await new Promise(r=>setTimeout(r,100));
 }
 browser=await type.launch({headless:true,...(name==="chromium"&&process.env.SETKA_CHROMIUM_EXECUTABLE?
  {executablePath:process.env.SETKA_CHROMIUM_EXECUTABLE}:{} )});
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.route("**/functions/v1/**",route=>route.fulfill({headers:{"access-control-allow-origin":"*"},json:{ok:true,items:[],notes:[],sessions:[],metrics:{}}}));
 await page.route("**/functions/v1/setka-music-v1",route=>route.fulfill({headers:{"access-control-allow-origin":"*"},json:{
  ok:true,categories:[{id:"hand",title:"Природные",visible:true}],tracks:catalog
 }}));
 const sample=wav();
 await page.route("**/spatial-fixture.wav",route=>{
  const range=/^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range||"");
  if(!range)return route.fulfill({contentType:"audio/wav",body:sample});
  const start=Number(range[1]),end=range[2]?Math.min(sample.length-1,Number(range[2])):sample.length-1;
  return route.fulfill({status:206,contentType:"audio/wav",body:sample.subarray(start,end+1),
   headers:{"accept-ranges":"bytes","content-range":`bytes ${start}-${end}/${sample.length}`,"content-length":String(end-start+1)}});
 });
 await installPublicationCatalog(page);
 await page.addInitScript(()=>{
  const direct=[],media=[],nodes=new Map(),writes=[];
  const NativeAudio=window.Audio;
  window.Audio=function(...args){const el=new NativeAudio(...args);media.push(el);return el};
  window.Audio.prototype=NativeAudio.prototype;
  const original=BaseAudioContext.prototype.createPanner;
  const automate=AudioParam.prototype.setTargetAtTime;
  let pointerAt=null;
  window.spatialProbe={direct,media,writes,get pointerAt(){return pointerAt}};
  document.addEventListener("pointermove",e=>{
   if(e.target.closest?.(".sm-source.dragging"))pointerAt=performance.now();
  },true);
  BaseAudioContext.prototype.createPanner=function(){
   const node=original.call(this);
   if(this instanceof AudioContext){
    const index=direct.length;
    direct.push(node);
    nodes.set(node.positionX,{index,axis:"x"});nodes.set(node.positionZ,{index,axis:"z"});
   }
   return node;
  };
  AudioParam.prototype.setTargetAtTime=function(value,time,constant){
   const node=nodes.get(this);
   if(node)writes.push({...node,value,time,constant,at:performance.now(),pointerAt});
   return automate.call(this,value,time,constant);
  };
 });
 await page.goto(base+front,{waitUntil:"domcontentloaded"});
 await page.locator("#setkaMusicPagerButton").click();
 await page.locator(".sm-track").first().click();
 await page.locator(".sm-orbit-category").click();
 const stage=await page.locator(".sm-stage").boundingBox(),marker=page.locator(".sm-source").first();
 assert.ok(stage&&stage.width>100);
 const cx=stage.x+stage.width/2,cy=stage.y+stage.height/2,scale=Math.min(stage.width,stage.height)/2;
 const control=[];
 for(const angle of angles)for(const radius of radii){
  const b=await marker.boundingBox();
  const x=cx+scale*radius*Math.sin(angle),y=cy-scale*radius*Math.cos(angle);
  await page.evaluate(()=>{window.spatialProbe.writes.length=0});
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2);
  await page.mouse.down();
  await page.mouse.move(x,y);
  await page.mouse.up();
  await page.waitForFunction(({angle,radius})=>{
   const s=SetkaMusicV1.state().active[0];
   return s&&Math.abs(s.radius-radius)<.011&&Math.abs(Math.atan2(Math.sin(s.angle-angle),Math.cos(s.angle-angle)))<.03;
  },{angle,radius},{timeout:3000});
  const p=await page.evaluate(async()=>{
   const {orbitDepthProfile}=await import("/standalone-music-audio-v1.mjs");
   const {angle,radius}=SetkaMusicV1.state().active[0];
   const writes=window.spatialProbe.writes.filter(w=>w.pointerAt!==null);
   const last=writes.filter(w=>w.index===0&&w.axis==="x").at(-1);
   const same=writes.filter(w=>w.time===last?.time&&w.pointerAt===last?.pointerAt).slice(-6);
   return {same,writes,distance:orbitDepthProfile(radius).distance,angle,
    lag:last?last.at-last.pointerAt:null,
    skew:Math.max(...same.map(w=>w.at))-Math.min(...same.map(w=>w.at))};
  });
  assert.equal(p.same.length,6,JSON.stringify({angle,radius,writes:p.writes}));
  assert.ok(p.same.every(w=>w.constant===.008));
  const target=axis=>p.same.find(w=>w.index===0&&w.axis===axis).value;
  assert.ok(Math.abs(target("x")-p.distance*Math.sin(p.angle))<1e-6);
  assert.ok(Math.abs(target("z")+p.distance*Math.cos(p.angle))<1e-6);
  const box=await marker.boundingBox();
  assert.ok(Math.hypot(box.x+box.width/2-x,box.y+box.height/2-y)<2);
  control.push(p);
 }
 const controlP95=percentile(control.map(p=>p.lag),.95);
 assert.ok(controlP95<65,JSON.stringify({controlP95}));
 const wallClockSkew=Math.max(...control.map(p=>p.skew));
 assert.ok(wallClockSkew<12,JSON.stringify({wallClockSkew}));

 const pcm=await page.evaluate(async({angles,radii})=>{
  const {SetkaMusicMixer,createOrbitVoice,orbitEarlyReflectionProfile}=await import("/standalone-music-audio-v1.mjs");
  const rate=48000;
  async function impulse(angle,radius,{left=1,right=null,path="dry"}={}){
   const ctx=new OfflineAudioContext(2,Math.ceil(rate*.32),rate),mixer=new SetkaMusicMixer();
   mixer.ctx=ctx;
   const room=mixer.makeRoom(ctx.destination);
   const voice=createOrbitVoice(ctx,ctx.destination,room,path==="wet"?"HRTF":undefined);
   voice.gain.gain.value=.4;
   mixer.position(voice,angle,radius,true);
   if(path==="wet")voice.panner.disconnect();
   else{
    voice.roomSend.disconnect();
    for(const wall of voice.reflections)wall.delay.disconnect();
   }
   const source=ctx.createBufferSource(),buffer=ctx.createBuffer(right===null?1:2,1,rate);
   buffer.getChannelData(0)[0]=left;
   if(right!==null)buffer.getChannelData(1)[0]=right;
   source.buffer=buffer;source.connect(voice.gain);source.start(.05);
   const rendered=await ctx.startRendering();
   return [rendered.getChannelData(0),rendered.getChannelData(1)];
  }
  const energy=x=>x.reduce((a,v)=>a+v*v,0);
  const sum=x=>energy(x[0])+energy(x[1]);
  const results=[];
  for(const angle of angles){
   const byRadius=[];
   for(const radius of radii){
    const dry=await impulse(angle,radius),wet=await impulse(angle,radius,{path:"wet"});
    const l=energy(dry[0]),r=energy(dry[1]),earliest=wet[0].findIndex((x,i)=>Math.max(Math.abs(x),Math.abs(wet[1][i]))>1e-5)/rate-.05;
    const wall=Math.min(...orbitEarlyReflectionProfile(angle,radius).map(q=>q.delay));
    byRadius.push({l,r,dry:l+r,wet:sum(wet),earliest,wall});
   }
   results.push(byRadius);
  }
  const mono=await impulse(0,.55),dual=await impulse(0,.55,{right:1});
  const rear=await impulse(Math.PI,.55),hardPan=await impulse(0,.55,{right:0});
  const inverted=await impulse(0,.55,{right:-1});
  const difference=(a,b)=>a.reduce((total,ear,i)=>total+ear.reduce((s,x,j)=>s+(x-b[i][j])**2,0),0);
  return {results,monoDelta:difference(mono,dual)/sum(mono),
   frontBackDelta:difference(mono,rear)/sum(mono),
   hardPanRight:energy(hardPan[1])/energy(mono[1]),antiPhase:sum(inverted)/sum(mono)};
 },{angles,radii});
 for(let i=0;i<8;i++){
  const row=pcm.results[i];
  for(const [j,{l,r,dry,wet,earliest,wall}] of row.entries()){
   assert.ok(l>0&&r>0&&dry>wet,JSON.stringify({i,j,l,r,dry,wet}));
   assert.ok(earliest>wall-.002&&earliest<wall+.035,JSON.stringify({i,j,earliest,wall}));
   if(i%4!==0)assert.ok((r-l)*Math.sin(angles[i])>0,JSON.stringify({i,j,l,r}));
  }
  assert.ok(row[0].dry>row[1].dry&&row[1].dry>row[2].dry);
  const ratios=row.map(p=>p.wet/p.dry);
  assert.ok(ratios[0]<ratios[1]&&ratios[1]<ratios[2],JSON.stringify({i,ratios}));
 }
 assert.ok(pcm.monoDelta<1e-8&&pcm.frontBackDelta>.02,JSON.stringify(pcm));
 assert.ok(pcm.hardPanRight>.035&&pcm.antiPhase>.19,JSON.stringify(pcm));

 // Measure the dry output after the actual UI pointer event, independently
 // of AudioParam timestamps. This excludes DAC/headphone/OS latency.
 const level=await page.evaluate(async()=>{
  const probe=window.spatialProbe,panner=probe.direct[0],ctx=panner.context;
  const split=ctx.createChannelSplitter(2),left=ctx.createAnalyser(),right=ctx.createAnalyser();
  left.fftSize=right.fftSize=256;
  panner.connect(split);split.connect(left,0);split.connect(right,1);
  const samples=new Float32Array(256),rms=analyser=>{
   analyser.getFloatTimeDomainData(samples);
   return samples.reduce((a,v)=>a+v*v,0);
  };
  window.spatialEars={read:()=>[rms(left),rms(right)],ctx};
  return {state:ctx.state,baseLatency:ctx.baseLatency,outputLatency:ctx.outputLatency};
 });
 const seek=async sign=>{
  const box=await marker.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();
  await page.mouse.move(cx+sign*scale*.7,cy);
  await page.mouse.up();
  return page.evaluate(async sign=>{
   const {read}=window.spatialEars,at=window.spatialProbe.pointerAt;
   while(performance.now()-at<500){
    const [l,r]=read();
    if(l+r>.000001&&sign*(r-l)>.17*(r+l))return performance.now()-at;
    await new Promise(requestAnimationFrame);
   }
   return null;
  },sign);
 };
 assert.ok(await seek(-1)!==null,JSON.stringify(level));
 const audible=[];
 for(const side of [1,-1,1,-1,1,-1,1,-1])audible.push(await seek(side));
 assert.ok(audible.every(n=>n!==null&&n<200),JSON.stringify({level,audible}));

 await page.locator(".sm-orbit-category").click();
 for(let i=1;i<catalog.length;i++)await page.locator(".sm-track").nth(i).click();
 await page.locator(".sm-orbit-category").click();
 await page.waitForFunction(()=>window.spatialProbe.media.filter(el=>el.currentTime>.1&&!el.paused).length===8);
 await page.locator('.sm-motion[aria-label="Встречное вращение"]').click();
 const benchmark=await page.evaluate(async()=>{
  const state=()=>SetkaMusicV1.state(),before=state();
  const frames=[],start=performance.now();let last=await new Promise(requestAnimationFrame);
  while(performance.now()-start<1400){
   const now=await new Promise(requestAnimationFrame);frames.push(now-last);last=now;
  }
  const probe=window.spatialProbe;
  return {before:before.active,after:state().active,frames,models:probe.direct.map(p=>p.panningModel)};
 });
 assert.equal(benchmark.after.length,8);
 assert.equal(benchmark.models.filter(model=>model==="HRTF").length,20);
 assert.equal(benchmark.models.filter(model=>model==="equalpower").length,4);
 for(let i=0;i<8;i++){
  const delta=benchmark.after[i].angle-benchmark.before[i].angle;
  assert.ok(delta*(i%2?-1:1)>.005);
 }
 const frameP95=percentile(benchmark.frames,.95);
 assert.ok(frameP95<80,JSON.stringify({frameP95}));
 assert.deepEqual(errors,[]);
 console.log("ORBIT_SPATIAL",JSON.stringify({name,version:browser.version(),poses:control.length,
  pointerToScheduleMs:[percentile(control.map(p=>p.lag),.5),controlP95],
  scheduleSkewMaxMs:wallClockSkew,pointerToDirectionalPcmMs:[percentile(audible,.5),percentile(audible,.95)],
  dryFrontBackDelta:pcm.frontBackDelta,frontWetDryRatios:pcm.results[0].map(p=>p.wet/p.dry),
  baseLatencyMs:level.baseLatency*1000,outputLatencyMs:level.outputLatency*1000,
  concurrentTracks:8,frameMs:[percentile(benchmark.frames,.5),frameP95]}));
}finally{
 await browser?.close();
 server.kill();
}
