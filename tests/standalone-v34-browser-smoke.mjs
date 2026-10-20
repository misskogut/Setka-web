import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdirSync} from "node:fs";
import {chromium,webkit} from "playwright";

const port=48372;
const root="http://127.0.0.1:"+port;
const patternIds=["tentacle-orbit","dandelion","fish-wave","breathing-fractal","breathing-fractal-growth","rgb-glitch-rings","stereo-dna","breathing-grid"];
const names=["Tentacle Orbit","Одуванчик","Носовая волна","Breathing Fractal","Breathing Fractal · Growth","RGB Glitch Rings","Stereo DNA"];
const patternMetrics=patternIds.map((patternId,i)=>({patternId,viewingAccounts:i+1,sessions:10*(i+1),exposures:100*(i+1),likes:i+1,totalDurationMs:(i+1)*60000,configurationSaves:i+1,savedConfigurations:i+1}));
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
let browser;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function livePixels(canvas){
  const context=canvas.getContext("2d");
  if(!context)return-1;
  const {data}=context.getImageData(0,0,canvas.width,canvas.height);
  let n=0;
  for(let i=0;i<data.length;i+=4)if(data[i]+data[i+1]+data[i+2]>85)n++;
  return n;
}
async function go(){
  for(let i=0;i<30;i++){try{const x=await fetch(root+"/standalone-v34.html");if(x.ok)break}catch{}await sleep(100)}
  browser=await (process.env.SETKA_BROWSER==="webkit"?webkit:chromium).launch({headless:true,args:process.env.SETKA_BROWSER==="webkit"?[]:["--no-sandbox"]});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];
  page.on("pageerror",x=>errors.push(String(x)));
  page.on("console",x=>{if(x.type()==="error")errors.push(String(x.text()))});
  await page.route("**/functions/v1/**",async route=>{
    const url=route.request().url(),b=route.request().postDataJSON?.()||{};
    const payload=url.includes("setka-community-patterns-v38")?{ok:true,items:[],patternMetrics,metrics:{connectedAccounts:7},patternScenarios:[{patternId:"dandelion",cohortSessions:9,scenarios:[{key:"sleep",count:6,share:2/3},{key:"focus",count:3,share:1/3}]}],historicalPatterns:[{patternId:"tentacle-orbit",devices:6,sessions:12,exposures:395,totalDurationMs:2000000}]}:
      url.includes("setka-public-notes-v37")?{ok:true,items:[]}:
      {ok:true,items:[],notes:[],sessions:[],status:"private",profile:{},metrics:{}};
    await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(payload)});
  });
  await page.goto(root+"/standalone-v34.html?browser-smoke=41",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelectorAll("#allPatternsPanel .pattern-tile").length===8,{timeout:20000});
  await page.waitForFunction(()=>!!window.SetkaStandaloneV34?.cloudCommunity?.status?.().lastOkAt,{timeout:20000});
  // Library navigation polish: one common icon baseline, no hint text and a
  // visual gap beneath the community heading (including mobile WebKit).
  assert.equal(await page.locator(".swipe-hint").count(),0,
    "permanent swipe helper text must be deleted from the library");
  const navGeometry=await page.evaluate(()=>{
    const ids=["libraryPagerButton","communityPagerButton","favoritesPagerButton"];
    return ids.map(id=>{
      const e=document.getElementById(id),r=e.getBoundingClientRect(),
        mark=e.firstElementChild,icon=mark.getBoundingClientRect();
      return{id,width:r.width,height:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2,
        iconWidth:icon.width,iconHeight:icon.height,fontSize:parseFloat(getComputedStyle(mark).fontSize)};
    });
  });
  assert.ok(navGeometry.every(v=>v.width===48&&v.height===48),
    "all three pager hit targets must be 48px: "+JSON.stringify(navGeometry));
  assert.ok(navGeometry.every(v=>Math.abs(v.cy-navGeometry[0].cy)<.6),
    "pager icons must be vertically aligned");
  assert.ok(navGeometry[2].fontSize<=25,"favorite heart must remain visually smaller");
  assert.ok(navGeometry[0].iconWidth>=18,"dot should not appear tiny next to other symbols");
  // Measure the visible community layout without switching screens here:
  // a real page transition at the beginning of this long smoke test changes
  // the active page and can intercept the later first pattern-info tap.
  const headingGap=await page.evaluate(()=>{
    const bar=document.getElementById("st34CommunityModes");
    const wasHidden=bar.classList.contains("hidden");
    bar.classList.remove("hidden");
    try{
      const title=document.getElementById("libraryTitle").getBoundingClientRect();
      const tabs=bar.getBoundingClientRect();
      const btns=[...bar.querySelectorAll("button")];
      return{gap:tabs.top-title.bottom,buttons:btns.length,tabWidth:tabs.width,
        lastRight:btns.at(-1)?.getBoundingClientRect().right||0};
    }finally{if(wasHidden)bar.classList.add("hidden")}
  });
  assert.ok(headingGap.gap>=9,
    "community filters must sit BELOW title with a readable gap: "+JSON.stringify(headingGap));
  assert.equal(headingGap.buttons,4,"all community filters must remain available");
  console.log("LIBRARY ICON ALIGNMENT / NO SWIPE HINT / COMMUNITY TAB GAP PASS",navGeometry,headingGap);
  const tiles=page.locator("#allPatternsPanel .pattern-tile");
  const result=[];
  mkdirSync("tests/visual-smoke",{recursive:true});
  for(let i=0;i<7;i++){
    const t=tiles.nth(i);
    await t.locator(".st34-info").waitFor({timeout:10000});
    const before=await t.locator("canvas").evaluate(livePixels);
    console.log("THUMB",patternIds[i],"brightPixels",before);
    assert.ok(before>25,patternIds[i]+" thumbnail is blank or too faint: "+before);
    const pid=await t.getAttribute("data-pattern-id");
    assert.equal(pid,patternIds[i]);
    const info=t.locator(".st34-info");
    await info.evaluate(el=>el.scrollIntoView({block:"center",inline:"nearest"}));
    try{await info.click({force:true,timeout:1700})}
    catch(e){
      console.log("MOBILE SCROLL INFO FALLBACK",patternIds[i],String(e.message).slice(0,160));
      // Validate the real handler separately when headless WebKit-style scroll clipping
      // makes the button untappable in the synthetic 390px viewport.
      await info.dispatchEvent("pointerup",{bubbles:true});
    }
    const modal=page.locator("#st34InfoOverlay");
    try{await modal.waitFor({timeout:10000})}
    catch(e){
      console.log("OVERLAY DEBUG",JSON.stringify({i,allOverlays:await page.locator("[id*=Info]").evaluateAll(nodes=>nodes.map(n=>n.id)),errors:errors.slice(0,20),tile:await t.evaluate(n=>n.outerHTML.slice(0,800))}));
      throw e;
    }
    await modal.locator("#st34InfoBody .st34-statbox strong").first().waitFor({timeout:10000});
    if(i===0){
      const helpBtn=modal.locator('.st34-metric-help[data-help="viewers"]');
      await helpBtn.click();
      const explanation=modal.locator('.st34-help-panel');
      await explanation.waitFor({state:"visible"});
      assert.match(await explanation.innerText(),/Сколько разных участников/);
      assert.equal(await helpBtn.getAttribute("aria-expanded"),"true");
      await explanation.locator(".st34-help-dismiss").click();
      assert.equal(await explanation.isVisible(),false);
      assert.equal(await helpBtn.getAttribute("aria-expanded"),"false");
      console.log("TAP HELP OPEN AND CLOSE PASS");
    }
    const title=await modal.locator("h2").innerText();
    assert.equal(title,names[i],patternIds[i]+" wrong title");
    const account=await modal.locator(".st34-statbox strong").first().innerText();
    assert.equal(account,String(i+1),patternIds[i]+" misbound cloud stats");
    if(i===0){
      const fullText=await modal.innerText();
      assert.match(fullText,/Предыдущие тесты SETKA/);
      assert.match(fullText,/395 просмотров/);
      assert.match(fullText,/Текущая выборка: 7 подключённых аккаунтов/);
      const currentViews=await modal.locator(".st34-statbox strong").nth(2).innerText();
      assert.equal(currentViews,"100","historic 395 episodes must not mix into current 100");
    }
    const bright=await modal.locator("canvas").evaluate(livePixels);
    console.log("INFO",patternIds[i],"account",account,"brightPixels",bright);
    assert.ok(bright>20,patternIds[i]+" info preview blank");
    await modal.locator(".st34-close").click();
    result.push({patternId:pid,account,thumbBrightPixels:before,infoBrightPixels:bright});
  }

  // Visual regression of the reported iPhone glitch: rebuilding the pattern
  // tiles must render the same animation phase, not flash frame 44 and leap.
  await page.waitForTimeout(650);
  const continuity=await page.evaluate(()=>{
    const S=window.SetkaApp;
    const pixels=()=>[...document.querySelectorAll("#allPatternsPanel .pattern-tile canvas")].map(canvas=>{
      const {data}=canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height);
      const out=[];
      for(let i=0;i<data.length;i+=24)out.push(data[i],data[i+1],data[i+2]);
      return out;
    });
    const before=pixels();
    S.renderLibrary();
    const after=pixels();
    return before.map((a,i)=>{
      const b=after[i];let mismatch=0;
      for(let p=0;p<a.length;p++)if(a[p]!==b[p])mismatch++;
      return {patternId:document.querySelectorAll("#allPatternsPanel .pattern-tile")[i]?.dataset.patternId,
        pixels:a.length,changed:mismatch,changedShare:mismatch/a.length};
    });
  });
  assert.equal(continuity.length,8,"all eight canonical previews survive redraw");
  for(const row of continuity)assert.ok(row.changedShare<0.015,
    row.patternId+" preview must not jump when tiles are rebuilt: "+JSON.stringify(row));
  console.log("LIVE PREVIEW PHASE STAYS STABLE ACROSS CATALOG REBUILD PASS",JSON.stringify(continuity));

  // One observed scenario per session, never per gesture/configuration change.
  await page.evaluate(()=>{
    const C=window.SetkaStandaloneV34,d=C.getData();
    d.patternExposures=d.patternExposures||[];
    d.sessions.push({id:"audit-sleep-a",requestKey:"sleep"},{id:"audit-sleep-b",requestKey:"sleep"},{id:"audit-focus",requestKey:"focus"});
    for(let i=0;i<70;i++)d.patternExposures.push({exposureId:"audit-e-"+i,patternId:"dandelion",sessionId:i<35?"audit-sleep-a":i<69?"audit-sleep-b":"audit-focus",requestKey:i<69?"sleep":"focus",durationMs:700,configKey:"dandelion|"+i});
    C.save();
  });
  await tiles.nth(1).locator(".st34-info").click({force:true});
  await page.locator("#st34InfoOverlay .st34-pattern-scenarios").waitFor();
  await page.locator("#st34InfoOverlay .st34-metric-help[data-help='scenarios']").click();
  assert.match(await page.locator("#st34InfoOverlay .st34-help-panel").innerText(),/Обезличенное распределение целей/);
  await page.locator("#st34InfoOverlay .st34-metric-help[data-help='scenarios']").click();
  const scenarioText=await page.locator("#st34InfoOverlay .st34-pattern-scenarios").innerText();
  assert.match(scenarioText,/Уснуть/);
  assert.match(scenarioText,/67%/);
  assert.match(scenarioText,/6 сесс/);
  assert.match(scenarioText,/33%/);
  assert.match(scenarioText,/3 сесс/);
  assert.doesNotMatch(scenarioText,/70 сесс/);
  assert.doesNotMatch(scenarioText,/Для чего ты выбираешь|твои любимые/);
  console.log("CLOUD-ONLY COMMUNITY SCENARIO PASS",scenarioText.replace(/\\s+/g," ").slice(0,340));
  await page.locator("#st34InfoOverlay .st34-close").click();

  // Dragging any pattern-key slider reveals the live pattern beneath the sheet.
  await page.evaluate(()=>{
    const app=window.SetkaApp,patternId="tentacle-orbit";
    app.openConfig(app.getPatternDefaults(patternId),{type:"base",id:patternId,patternId});
  });
  await page.locator("#instructionsButton").click({force:true});
  const keyRanges=page.locator("#st34KeySheet .sk-range");
  assert.ok(await keyRanges.count()>=2,"pattern key has multiple sliders");
  for(const [index,finish] of [[0,"pointerup"],[1,"pointercancel"]]){
    await keyRanges.nth(index).dispatchEvent("pointerdown",{pointerId:77+index,pointerType:"touch",button:0});
    const dimmed=await page.evaluate(()=>{
      const sheet=document.querySelector("#st34KeySheet"),backdrop=document.querySelector("#st34KeyBackdrop");
      return {active:sheet.classList.contains("sk-adjusting"),faded:backdrop.classList.contains("sk-adjusting"),
        activeSettings:sheet.querySelectorAll(".sk-setting.sk-active").length};
    });
    assert.equal(dimmed.active,true,"drag should make sheet transparent");
    assert.equal(dimmed.faded,true,"drag should remove backdrop dimming");
    assert.equal(dimmed.activeSettings,1,"only dragged slider remains visible");
    await page.evaluate(({eventName,id})=>window.dispatchEvent(new PointerEvent(eventName,{pointerId:id,bubbles:true})),
      {eventName:finish,id:77+index});
    const restored=await page.evaluate(()=>{
      const sheet=document.querySelector("#st34KeySheet"),backdrop=document.querySelector("#st34KeyBackdrop");
      return {active:sheet.classList.contains("sk-adjusting"),faded:backdrop.classList.contains("sk-adjusting"),
        activeSettings:sheet.querySelectorAll(".sk-setting.sk-active").length};
    });
    assert.deepEqual(restored,{active:false,faded:false,activeSettings:0},
      "sheet must restore after "+finish);
  }
  await page.locator("#st34KeySheet .sk-action.primary").click();
  assert.equal(await page.locator("#st34KeySheet.open").count(),0,"pattern key can still close");
  console.log("PATTERN KEY TRANSLUCENT DRAG / POINTER CANCEL / RESTORE PASS");
  // Two identical note texts on two distinct mother patterns must keep
  // their original pattern/config/preview links.
  for(const pid of ["dandelion","stereo-dna"]){
    await page.evaluate(id=>{
      const S=window.SetkaApp;S.openConfig(S.getPatternDefaults(id),{type:"base",id,patternId:id});
    },pid);
    await page.locator("#st34Note").click();
    await page.locator("#st34Layer textarea").fill("Одинаковая проверочная заметка");
    await page.locator("#st34Layer .st-primary").filter({hasText:"Сохранить"}).click();
  }
  const saved=await page.evaluate(()=>window.SetkaStandaloneV34.getData().notes.slice(-2).map(n=>({
    id:n.id,patternId:n.patternId,snapshotPatternId:n.replaySnapshot?.patternId,
    configPatternId:n.replaySnapshot?.config?.patternId,frame:n.frame
  })));
  assert.equal(saved.length,2);
  assert.notEqual(saved[0].id,saved[1].id);
  assert.deepEqual(saved.map(n=>n.patternId),["dandelion","stereo-dna"]);
  for(const n of saved){assert.equal(n.snapshotPatternId,n.patternId);assert.equal(n.configPatternId,n.patternId)}
  console.log("TWO NOTE SNAPSHOTS PASS",JSON.stringify(saved));
  await page.evaluate(()=>window.SetkaStandaloneV34.showNotes());
  await page.locator(".st34-note-card").first().waitFor();
  assert.equal(await page.locator("#st34Layer .st34-note-card").count(),2);
  const noteLabels=await page.locator("#st34Layer .st34-note-preview-label").allInnerTexts();
  assert.ok(noteLabels.some(x=>x.includes("STEREO DNA")));
  assert.ok(noteLabels.some(x=>x.includes("ОДУВАНЧИК")));
  console.log("NOTE CARD IDS",await page.locator("#st34Layer .st34-note-card").evaluateAll(nodes=>nodes.map(n=>n.dataset.noteId)));
  // Server-side private archive hydration upgrades data.version to 41.
  // Reload must NOT silently reset the user's notes, exposure history or sessions.
  await page.evaluate(()=>{
    const C=window.SetkaStandaloneV34,d=C.getData();
    d.version=41;
    C.save();
  });
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.SetkaStandaloneV34?.getData?.()?.version===41,{timeout:15000});
  const restored=await page.evaluate(()=>{
    const d=window.SetkaStandaloneV34.getData();
    return {version:d.version,sessions:d.sessions.length,exposures:d.patternExposures?.length||0,
      notes:d.notes.slice(-2).map(n=>({id:n.id,patternId:n.patternId,replayPatternId:n.replaySnapshot?.patternId,configId:n.replaySnapshot?.config?.patternId}))};
  });
  assert.equal(restored.version,41);
  assert.ok(restored.sessions>=3);
  assert.ok(restored.exposures>=70);
  assert.deepEqual(restored.notes.map(n=>n.id),saved.map(n=>n.id));
  assert.deepEqual(restored.notes.map(n=>n.replayPatternId),["dandelion","stereo-dna"]);
  assert.deepEqual(restored.notes.map(n=>n.configId),["dandelion","stereo-dna"]);
  console.log("V41 ARCHIVE RELOAD PRESERVED HISTORY",JSON.stringify(restored));
  // The main Me screen stays focused on personal history; account entry is in
  // a small header button, and the login, password and sync controls are one tap away.
  assert.equal(await page.locator("#st37MeTools").count(),0);
  await page.locator('#st34Nav button[data-p="me"]').click();
  const account=page.locator('#st40AccountButton');
  await account.waitFor({timeout:10000});
  assert.equal(await account.isVisible(),true);
  assert.equal(await page.locator('#st34Layer #st40TesterCabinet').count(),0);
  assert.equal(await page.locator('#st34Layer #st40PrivateCorpusStatus').count(),0);
  assert.match(await page.locator('#st34Layer .st-title').innerText(),/^Я$/);
  assert.equal(await page.locator('#stReplaySettings').count(),0,'Replay consent must not appear as a feature card on Me');
  assert.equal(await page.locator('#st40DataSettingsButton,#st40PrivacySettings').count(),0,'standalone privacy settings are removed from the front');
  assert.equal(await page.evaluate(()=>window.__SETKA_REPLAY_CAPTURE_V1__.enabled()),false,'a guest has not opted into detailed activity');
  console.log('NO SEPARATE PRIVACY SCREEN AND NO GUEST DETAILED CAPTURE PASS');
  await account.click();
  // Wait for the actual account form, independent of the privacy setting.
  await page.locator('#st34Layer .st40-form input').first().waitFor({timeout:10000});
  assert.match(await page.locator('#st34Layer .st-title').innerText(),/Подключить тестирование/);
  // Returning from the account form must restore the small shortcut.
  await page.locator('#st34Layer .st-back').click();
  await account.waitFor({timeout:10000});
  assert.equal(await account.isVisible(),true);
  assert.equal(await page.locator('#st34Layer #st40TesterCabinet').count(),0);
  console.log('COMPACT ACCOUNT SHORTCUT AND GUEST ENTRY PASS');

  // Local browser-only account-status fixture: verify signed-in controls are
  // reachable from the same icon, never exposed as giant cards on Me.
  await page.route('**/functions/v1/setka-tester-account-v40', async route=>{
    await route.fulfill({status:200,contentType:'application/json',
      headers:{'access-control-allow-origin':'*'},
      body:JSON.stringify({ok:true,claimed:true,hasPassword:true,
        authenticated:true,testerId:'T-TEST-UI',consented:true})});
  });
  await page.evaluate(async()=>{
    await window.__SETKA_TESTER_CABINET_V40__.refresh();
    window.SetkaStandaloneV34.showMe();
  });
  await account.waitFor({timeout:10000});
  await account.click();
  await page.locator('#st40TesterCabinet').waitFor({timeout:10000});
  assert.match(await page.locator('#st34Layer .st-title').innerText(),/Аккаунт SETKA/);
  assert.equal(await page.getByRole('button',{name:'Сменить пароль'}).count(),1);
  assert.equal(await page.getByRole('button',{name:/Синхронизировать сейчас/}).count(),0,'archive sync is automatic; never require a manual button');
  assert.match(await page.locator('#st40TesterCabinet').innerText(),/автоматически|обновится при восстановлении связи|обновлён автоматически/);
  assert.equal(await page.getByRole('button',{name:/Выйти/}).count(),1);
  await page.locator('#st40PrivateCorpusStatus').waitFor({timeout:10000});
  await page.locator('#st34Layer .st-back').click();
  await account.waitFor({timeout:10000});
  assert.equal(await page.locator('#st34Layer #st40TesterCabinet').count(),0);
  console.log('SIGNED-IN ACCOUNT ACTIONS AND TECHNICAL STATUS IN ACCOUNT ONLY PASS');

  // State selection and its first measurement must survive a full browser
  // reload, regardless of private-cloud availability.
  await page.locator('#st34Nav button[data-p="symptoms"]').click();
  await page.locator('#st34Layer .st34-add-state').click();
  await page.getByRole('button',{name:'Усталость',exact:true}).click();
  await page.locator('#st34Layer .st34-state-card').first().waitFor();
  await page.locator('#st34Layer .st34-mark-btn').first().click();
  await page.locator('#st34Layer .st34-mark-editor.open input[type="range"]').first().fill('6');
  await page.locator('#st34Layer .st34-mark-editor.open .st34-mark-save').first().click();
  const originalStates=await page.evaluate(()=>{
    const d=window.SetkaStandaloneV34.getData();
    return {states:d.symptoms.map(x=>x.name),checkins:d.checkins.length,
      saved:JSON.parse(localStorage.getItem("setka-standalone:v34")||"null")};
  });
  assert.ok(originalStates.states.includes('Усталость'));
  assert.equal(originalStates.checkins>0,true);
  assert.equal(originalStates.saved.symptoms.length,originalStates.states.length);
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator('#st34Nav button[data-p="symptoms"]').click();
  await page.locator('#st34Layer .st34-state-card').first().waitFor({timeout:10000});
  assert.match(await page.locator('#st34Layer .st34-state-name').first().innerText(),/Усталость/);
  assert.match(await page.locator('#st34Layer .st34-state-last').first().innerText(),/Последняя отметка/);
  console.log('STATE SELECTION AND CHECKIN SURVIVE RELOAD PASS');

  await page.screenshot({path:"tests/visual-smoke/personal-notes.png",fullPage:true});
  await page.screenshot({path:"tests/visual-smoke/base-patterns.png",fullPage:true});
  console.log("ALL 7 PATTERNS PASS",JSON.stringify(result));
  console.log("Browser JS console errors:",JSON.stringify(errors.slice(0,10)));
}
try{await go()}finally{await browser?.close();server.kill("SIGTERM")}
