import {installPublicationCatalog} from './publication-fixture.mjs';
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium,webkit} from "playwright";

const port=49584, root="http://127.0.0.1:"+port;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try {
  for(let i=0;i<35;i++){try{if((await fetch(root+"/standalone-v34.html")).ok)break}catch{}await sleep(100)}
  browser=await (process.env.SETKA_BROWSER==="webkit"?webkit:chromium).launch({
    headless:true,args:process.env.SETKA_BROWSER==="webkit"?[]:["--no-sandbox"]
  });
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/functions/v1/**",route=>route.fulfill({
    status:200,contentType:"application/json",
    headers:{"access-control-allow-origin":"*"},
    body:JSON.stringify({ok:true,items:[],notes:[],sessions:[],profile:{},metrics:{}})
  }));
  await installPublicationCatalog(page);
  await page.goto(root+"/standalone-v34.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.SetkaLivePreviewsV1?.status().mode==="code-canvas-2d");
  const info=await page.evaluate(()=>{
    const S=window.SetkaApp,C=window.SetkaStandaloneV34,L=window.SetkaLivePreviewsV1;
    const make=(klass,i)=>{
      const c=document.createElement("canvas");
      c.className=klass;c.width=320;c.height=225;
      c.style.cssText="position:fixed;left:"+(12+i*82)+"px;top:92px;width:80px;height:56px;z-index:299999;pointer-events:none";
      document.body.appendChild(c);
      return c;
    };
    const note=make("st34-note-preview",0);
    const session=make("st34-stable-preview",1);
    const publicNote=make("st37-community-preview",2);
    const infoOverlay=make("st34-preview",3);
    // Two notes can share a visible region but MUST NOT share a config.
    const fish={...S.getPatternDefaults("fish-wave"),waveSpeed:.14,waveAmplitude:46};
    const dna={...S.getPatternDefaults("stereo-dna"),numPoints:75,spacing:9,eyeSeparation:228};
    const dandelion={...S.getPatternDefaults("dandelion"),numShapes:145,tSpeed:.019};
    const fractal={...S.getPatternDefaults("breathing-fractal"),pulseSpd:.063};
    const id="live-test-note";
    const record={id,patternId:"tentacle-orbit",config:S.getPatternDefaults("tentacle-orbit"),
      replaySnapshot:{patternId:"stereo-dna",frame:91,config:dna}};
    C.getData().notes.push(record);
    const card=document.createElement("article");card.dataset.noteId=id;
    card.appendChild(note);document.body.appendChild(card);
    L.rescanNotes(); // authoritative creation-time snapshot wins over old note.config
    S.renderPreview(session,fish,57,"fish-wave");
    S.renderPreview(publicNote,dandelion,45,"dandelion");
    S.renderPreview(infoOverlay,fractal,73,"breathing-fractal");
    const canvases=[note,session,publicNote,infoOverlay];
    const hashes=()=>canvases.map(c=>{
      const data=c.getContext("2d").getImageData(0,0,c.width,c.height).data;
      let hash=2166136261,bright=0;
      for(let i=0;i<data.length;i+=4){const v=data[i]+data[i+1]+data[i+2];bright+=v>70;hash=Math.imul(hash^v,16777619)}
      return{hash:hash>>>0,bright,id:c.dataset.snapshotPatternId||""};
    });
    window.__liveTest={canvases,hashes,fish,dna,record};
    return{status:L.status(),before:hashes(),rawSaved:JSON.stringify(record.replaySnapshot.config)};
  });
  assert.equal(info.status.mode,"code-canvas-2d");
  assert.equal(info.before[0].id,"stereo-dna","note must use creation-time replay, not mutable fallback config");
  assert.equal(info.before[1].id,"fish-wave");
  assert.equal(info.before[2].id,"dandelion");
  assert.equal(info.before[3].id,"breathing-fractal");
  await page.waitForTimeout(1100);
  const after=await page.evaluate(()=>({
    samples:window.__liveTest.hashes(),status:window.SetkaLivePreviewsV1.status(),
    rawSaved:JSON.stringify(window.__liveTest.record.replaySnapshot.config),
    videoCount:document.querySelectorAll("video[src],video source").length
  }));
  assert.deepEqual(after.samples.map(x=>x.id),info.before.map(x=>x.id));
  assert.ok(after.status.frames>info.status.frames+8,"each frame must be redrawn by JS Canvas, not cached once");
  const changed=after.samples.filter((v,i)=>v.hash!==info.before[i].hash).length;
  for(let i=0;i<4;i++)assert.ok(after.samples[i].bright>8,"preview "+i+" is blank");
  assert.ok(changed>=3,"at least three different pattern engines must show visible motion: "+JSON.stringify({before:info.before,after:after.samples,status:after.status}));
  assert.equal(after.rawSaved,info.rawSaved,"live preview must never modify recorded note config");
  assert.equal(after.videoCount,0,"previews must not use recorded video");

  await page.evaluate(()=>{
    for(const c of window.__liveTest.canvases)c.remove();
  });
  await page.waitForTimeout(140);
  const detached=await page.evaluate(()=>window.SetkaLivePreviewsV1.status().active);
  assert.equal(detached,0,"detached preview canvases should not keep animating");

  // Regression: opening any bottom navigation sheet must NOT freeze the
  // native canvas thumbnails that remain visibly exposed above that sheet.
  // Previously canAnimateLibrary() stopped the clock for every open overlay.
  const tabs=["today","notes","pulse","symptoms","me"];
  await page.locator("#allPatternsPanel canvas.thumb-canvas").first().waitFor();
  await page.waitForFunction(()=>window.SetkaApp?.previewStatus()?.frames>2);
  for(const tab of tabs){
    await page.locator('#st34Nav button[data-p="'+tab+'"]').click();
    await page.locator('#st34Layer:not(.hidden)').waitFor({state:"visible"});
    // Simulate the normal partially lowered mobile sheet; the dock's
    // resizable panels support this geometry on iOS Safari.
    await page.locator("#st34Layer").evaluate(layer=>{
      layer.style.height="260px";
      layer.style.maxHeight="260px";
    });
    const exposed=await page.evaluate(()=>{
      const sheet=document.getElementById("st34Layer").getBoundingClientRect();
      const tiles=[...document.querySelectorAll("#allPatternsPanel .thumb-canvas")];
      return {
        libraryActive:document.getElementById("libraryScreen").classList.contains("active"),
        sheetTop:sheet.top,
        exposed:tiles.filter(c=>{
          const r=c.getBoundingClientRect();
          return r.width>4&&r.top<sheet.top-6&&r.bottom>0;
        }).length
      };
    });
    assert.equal(exposed.libraryActive,true,"background library remains visible under "+tab);
    assert.ok(exposed.exposed>0,"there must be exposed thumbnails above the "+tab+" sheet: "+JSON.stringify(exposed));
    const before=await page.evaluate(()=>window.SetkaApp.previewStatus().frames);
    await page.waitForFunction(b=>window.SetkaApp.previewStatus().frames>b+3,before,{timeout:4500});
    const after=await page.evaluate(()=>window.SetkaApp.previewStatus().frames);
    assert.ok(after>before+3,"visible thumbnails must continue painting under "+tab+" sheet");
  }
  // Collapse the last sheet and confirm no preview renderer gets stuck.
  await page.locator('#st34Nav button[data-p="me"]').click();
  await page.locator("#st34Layer.hidden").waitFor();
  const beforeCollapse=await page.evaluate(()=>window.SetkaApp.previewStatus().frames);
  await page.waitForFunction(b=>window.SetkaApp.previewStatus().frames>b+3,beforeCollapse,{timeout:4500});

  assert.deepEqual(errors,[]);
  console.log("FOUR LIVE CANVAS PREVIEWS / IMMUTABLE NOTE REPLAY / NO VIDEO / CLEANUP PASS",after.status);
}finally{
  await browser?.close();
  server.kill("SIGTERM");
}
