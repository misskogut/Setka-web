import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium,webkit} from "playwright";

const port=49639,base="http://127.0.0.1:"+port;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try{
  for(let i=0;i<45;i++){try{if((await fetch(base+"/standalone-v34.html")).ok)break}catch{}await sleep(100)}
  browser=await (process.env.SETKA_BROWSER==="webkit"?webkit:chromium).launch({headless:true,args:process.env.SETKA_BROWSER==="webkit"?[]:["--no-sandbox"]});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/functions/v1/**",r=>r.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify({ok:true,items:[],metrics:{},patternMetrics:[],notes:[],profile:{}})}));
  await page.goto(base+"/standalone-v34.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.SetkaApp?.getPatterns?.().length===8);
  // The descriptor, mother thumbnail and fullscreen must all open from the
  // same canonical recipe, with DNA initially black/white. The original color
  // palettes remain selectable as personal configurations.
  const initialDNA=await page.evaluate(()=>{
    const S=window.SetkaApp,R=window.SetkaPatternRegistryV1,id="stereo-dna";
    const canonical=R.defaults(id),publicDefaults=S.getPatternDefaults(id);
    const listed=S.getPatterns().find(p=>p.id===id)?.defaults;
    const pixelStats=(config,thumb)=>{
      const cv=document.createElement("canvas");
      cv.width=thumb?180:390;cv.height=thumb?180:844;
      R.render(cv.getContext("2d"),cv.width,cv.height,config,44,thumb,id);
      const data=cv.getContext("2d").getImageData(0,0,cv.width,cv.height).data;
      let colored=0,bright=0;
      for(let i=0;i<data.length;i+=4){
        if(data[i]+data[i+1]+data[i+2]>48)bright++;
        if(Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])>3)colored++;
      }
      return {colored,bright};
    };
    const motherThumb=pixelStats(canonical,true);
    S.openConfig(canonical,{type:"base",id,patternId:id});
    const motherOpen=S.getConfig(),motherFull=pixelStats(motherOpen,false);
    const custom={...canonical,colorModeIndex:1};
    S.openConfig(custom,{type:"favorite",id:"isolated-color-fixture",patternId:id});
    const customFull=pixelStats(S.getConfig(),false);
    S.openConfig(R.defaults(id),{type:"base",id,patternId:id});
    const reopened=S.getConfig();
    const summary={registry:canonical.colorModeIndex,public:publicDefaults.colorModeIndex,
      listed:listed.colorModeIndex,opened:motherOpen.colorModeIndex,reopened:reopened.colorModeIndex,
      canonicalKey:R.configKey(canonical,id),openedKey:R.configKey(motherOpen,id),
      motherThumb,motherFull,customFull,customMode:custom.colorModeIndex};
    document.getElementById("libraryButton").click();
    return summary;
  });
  for(const key of ["registry","public","listed","opened","reopened"])
    assert.equal(initialDNA[key],0,"Stereo DNA must start in monochrome across every mother entry point: "+key);
  assert.equal(initialDNA.canonicalKey,initialDNA.openedKey,"opening mother must preserve the precise initial configuration");
  assert.ok(initialDNA.motherThumb.bright>10&&initialDNA.motherFull.bright>10,"DNA mother must remain visible");
  assert.equal(initialDNA.motherThumb.colored,0,"DNA preview must be monochrome by default");
  assert.equal(initialDNA.motherFull.colored,0,"DNA fullscreen mother must be monochrome by default");
  assert.ok(initialDNA.customFull.colored>10,"the original colored DNA must remain selectable after mode 0");
  console.log("STEREO DNA CANONICAL BLACK-WHITE START / COLOR PALETTES PRESERVED PASS",initialDNA);

  const result=await page.evaluate(()=>{
    const S=window.SetkaApp;
    const p=S.getPatterns();
    const images=p.map(pattern=>{
      const c=document.createElement("canvas");c.width=220;c.height=290;
      S.renderPreview(c,{...pattern.defaults,colorModeIndex:0},44,pattern.id);
      const rgba=c.getContext("2d").getImageData(0,0,c.width,c.height).data;
      let colored=0,visible=0;
      for(let i=0;i<rgba.length;i+=4){
        if(rgba[i]+rgba[i+1]+rgba[i+2]>36)visible++;
        if(Math.abs(rgba[i]-rgba[i+1])>2||Math.abs(rgba[i+1]-rgba[i+2])>2)colored++;
      }
      return {id:pattern.id,visible,colored};
    });
    const grid=S.getPatterns().find(p=>p.id==="breathing-grid");
    const c=document.createElement("canvas");c.width=180;c.height=240;
    S.renderPreview(c,grid.defaults,44,grid.id);
    const before=c.toDataURL();
    S.renderPreview(c,grid.defaults,95,grid.id);
    const after=c.toDataURL();
    const snapshot=S.cloneConfig({...grid.defaults,cols:27,rows:18,amp:.27,colorModeIndex:3},grid.id);
    return {patterns:p.length,images,changed:before!==after,config:snapshot,hasKey:Boolean(window.SetkaPatternKeyV1)};
  });
  assert.equal(result.patterns,8);
  for(const p of result.images){
    assert.ok(p.visible>45,"first B&W preview must be visible: "+JSON.stringify(p));
    assert.equal(p.colored,0,"FIRST color must be monochrome: "+JSON.stringify(p));
  }
  assert.equal(result.changed,true,"rotated grid preview must animate without a video or saved still");
  assert.equal(result.config.cols,27);
  assert.equal(result.config.rows,18);
  assert.equal(result.config.patternId,"breathing-grid");
  assert.equal(result.hasKey,true);
  await page.evaluate(()=>{
    const grid=window.SetkaApp.getPatternDefaults("breathing-grid");
    window.SetkaApp.openConfig(grid,{type:"base",id:"breathing-grid",patternId:"breathing-grid"});
  });
  await page.locator("#gameScreen.active").waitFor();
  assert.equal(await page.locator("#st34Note").evaluate(e=>e.parentElement?.classList.contains("bottom-controls")),true,
    "the original note '+' remains in the game's bottom control row");
  const dots=await page.locator("#colorDots .color-dot").evaluateAll(list=>list.map(e=>({
    on:e.classList.contains("visible"),opacity:getComputedStyle(e).opacity,visibility:getComputedStyle(e).visibility
  })));
  assert.equal(dots.length,9);
  assert.equal(dots.filter(d=>d.on).length,1,"only first color dot lights on default");
  assert.ok(dots.slice(1).every(d=>d.visibility==="hidden"),
    "unlit color dots must be COMPLETELY hidden");
  await page.locator("#colorButton").click();
  assert.equal(await page.locator("#colorDots .color-dot.visible").count(),2);
  assert.ok((await page.locator("#colorDots .color-dot").evaluateAll(es=>es.slice(2).every(e=>getComputedStyle(e).visibility==="hidden"))));
  await page.locator("#instructionsButton").click();
  await page.locator("#st34KeySheet.open").waitFor();
  assert.equal(await page.locator("#instructionsModal.open").count(),0,
    "key must not launch the old floating instructions modal");
  assert.equal(await page.locator("#st34KeySheet .sk-setting").count(),10);
  const desc=await page.locator("#st34KeySheet").innerText();
  assert.match(desc,/Свайпы и ползунки изменяют одни и те же параметры/);
  assert.match(desc,/Волна по горизонтали/);
  assert.match(desc,/Волна по вертикали/);
  assert.doesNotMatch(desc,/Зоны управления на экране|Фаза волны/);
  await page.locator("#sk-live-cols").evaluate(e=>{e.value="26";e.dispatchEvent(new Event("input",{bubbles:true}))});
  assert.equal(await page.evaluate(()=>window.SetkaApp.getConfig().cols),26);
  assert.equal(await page.locator("#sk-live-cols").inputValue(),"26");
  await page.locator('#st34KeySheet [data-action="close"]').click();
  assert.equal(await page.locator("#st34KeySheet.open").count(),0);
  assert.equal(await page.locator("#instructionsModal.open").count(),0);
  const gridState=await page.evaluate(()=>window.SetkaApp.getState());
  assert.equal(gridState.patternId,"breathing-grid");
  assert.equal(gridState.config.cols,26);
  // The original bottom "+" is not decorative: it must save this exact
  // breathing-grid configuration, never Octopus or another default renderer.
  await page.locator("#st34Note.show").click();
  await page.locator("#st34Layer textarea").last().fill("Проверка точного слепка Breathing Grid");
  await page.locator("#st34Layer .st-primary").filter({hasText:"Сохранить"}).click();
  const savedNote=await page.evaluate(()=>{
    const n=window.SetkaStandaloneV34?.getData?.()?.notes?.find(x=>x.text==="Проверка точного слепка Breathing Grid");
    const r=n?window.__SETKA_NOTE_REPLAY_V34__?.replayOf?.(n):null;
    return{patternId:n?.patternId,configPattern:n?.config?.patternId,cols:n?.config?.cols,
      replayPattern:r?.pid,replayCols:r?.config?.cols};
  });
  assert.equal(savedNote.patternId,"breathing-grid");
  assert.equal(savedNote.configPattern,"breathing-grid");
  assert.equal(savedNote.cols,26);
  assert.equal(savedNote.replayPattern,"breathing-grid");
  assert.equal(savedNote.replayCols,26);
  // DNA palette regression: keep mode 0 grayscale, mode 1 ORIGINAL colored
  // strands, and persist all nine modes in unique configuration keys.
  const dna=await page.evaluate(()=>{
    const S=window.SetkaApp,base=S.getPatternDefaults("stereo-dna");
    return Array.from({length:9},(_,i)=>{
      const c=S.cloneConfig({...base,colorModeIndex:i},"stereo-dna");
      const cv=document.createElement("canvas");cv.width=300;cv.height=340;
      S.renderPreview(cv,c,77,"stereo-dna");
      const d=cv.getContext("2d").getImageData(0,0,300,340).data;let colored=0;
      for(let n=0;n<d.length;n+=4)if(Math.abs(d[n]-d[n+1])>8||Math.abs(d[n+1]-d[n+2])>8)colored++;
      return{mode:c.colorModeIndex,key:S.configKey(c,"stereo-dna"),colored};
    });
  });
  assert.deepEqual(dna.map(x=>x.mode),[0,1,2,3,4,5,6,7,8]);
  assert.equal(dna[0].colored,0);
  assert.ok(dna.slice(1).every(x=>x.colored>30),"DNA's color modes vanished: "+JSON.stringify(dna));
  assert.equal(new Set(dna.map(x=>x.key)).size,9,"DNA palette choices must remain saved");
  await page.locator("#libraryButton").click();
  await page.locator("#libraryScreen.active").waitFor();
  const tile=page.locator('.base-tile[data-pattern-id="breathing-grid"] canvas.thumb-canvas');
  const first=await tile.evaluate(c=>c.toDataURL());
  await page.waitForFunction(before=>document.querySelector('.base-tile[data-pattern-id="breathing-grid"] canvas.thumb-canvas')?.toDataURL()!==before,first,{timeout:5500});

  // New plugin registration is the ONLY required feature-specific step.
  const next=await page.evaluate(()=>{
    const S=window.SetkaApp,R=window.SetkaPatternRegistryV1;
    S.registerPattern({id:"fixture-grid-test",title:"Test plugin",version:1,colorModes:3,
      defaults:{size:12,tempo:.3,colorModeIndex:0},
      controls:[["Размер","size",3,40,1,"Слева ↑↓",1],["Темп","tempo",.05,2,.05,"Снизу ←→",1]],
      render(ctx,w,h,c,frame){ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);ctx.fillStyle=c.colorModeIndex?"cyan":"white";ctx.fillRect(w/2-c.size/2,h/2-c.size/2+Math.sin(frame*c.tempo)*4,c.size,c.size)}
    });
    const cfg=S.cloneConfig({patternId:"fixture-grid-test",size:27,tempo:.8,colorModeIndex:2},"fixture-grid-test");
    return{number:S.getPatterns().length,registered:R.has("fixture-grid-test"),controls:R.controls("fixture-grid-test").length,cfg};
  });
  assert.equal(next.number,9);
  assert.equal(next.registered,true);
  assert.equal(next.controls,2);
  assert.equal(next.cfg.size,27);
  assert.equal(next.cfg.colorModeIndex,2);
  await page.locator('.base-tile[data-pattern-id="fixture-grid-test"]').waitFor();
  await page.evaluate(()=>{
    const S=window.SetkaApp;
    S.openConfig(S.getPatternDefaults("fixture-grid-test"),
      {type:"base",id:"fixture-grid-test",patternId:"fixture-grid-test"});
  });
  await page.locator("#gameScreen.active").waitFor();
  await page.locator("#instructionsButton").click();
  assert.equal(await page.locator("#st34KeySheet.open .sk-setting").count(),2);
  console.log("BREATHING GRID / 8 B&W PREVIEWS / INVISIBLE DOTS / LINKED KEY / NOTES PASS",result.images);
  assert.deepEqual(errors,[]);
}finally{await browser?.close();server.kill("SIGTERM")}
