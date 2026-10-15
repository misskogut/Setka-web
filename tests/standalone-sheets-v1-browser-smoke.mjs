import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const port=49317,base=`http://127.0.0.1:${port}`;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  for(let i=0;i<30;i++){try{if((await fetch(base+'/standalone-v34.html')).ok)break}catch{}await sleep(100)}
  browser=await (process.env.SETKA_BROWSER==='webkit'?webkit:chromium).launch({headless:true,args:process.env.SETKA_BROWSER==='webkit'?[]:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[],api=[];page.on('pageerror',e=>errors.push(e.message));
  // All APIs are intercepted. Synthetic local actions never reach Supabase.
  await page.route('**/functions/v1/**',async route=>{
    api.push(route.request().url());
    await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true,items:[],metrics:{},notes:[],sessions:[],profile:{}})});
  });
  await page.goto(base+'/standalone-v34.html',{waitUntil:'domcontentloaded'});
  await page.locator('body.setka-sheet-layout').waitFor();
  const dock=page.locator('#st34Nav'),card=page.locator('#st34Layer');
  const tab=key=>dock.locator(`[data-p="${key}"]`);
  assert.deepEqual(await dock.locator('.st-dock-label').allTextContents(),['Сегодня','Заметки','Пульс','Состояния','Я']);
  assert.equal(await dock.locator('[data-p="patterns"]').count(),0);
  assert.equal(await page.locator('#st34SensorQuick').isVisible(),false);
  assert.equal(await page.locator('#allPatternsPanel .pattern-tile').count(),7);
  await tab('today').click();
  await page.waitForFunction(()=>document.querySelector('#st34Layer').getBoundingClientRect().bottom<=document.querySelector('#st34Nav').getBoundingClientRect().top);
  const cardRect=await card.boundingBox(),dockRect=await dock.boundingBox();
  assert.ok(cardRect.y<=20&&cardRect.height>844*.85,'card must rise to the top of the available screen');
  assert.ok(cardRect.y+cardRect.height<=dockRect.y,'card overlaps the dock');
  assert.equal(await page.locator('#libraryScreen.active').count(),1);
  assert.equal(await tab('today').getAttribute('aria-expanded'),'true');
  await tab('today').click();await card.waitFor({state:'hidden'});
  assert.equal(await tab('today').getAttribute('aria-expanded'),'false');
  await tab('today').click();await card.waitFor({state:'visible'});
  await tab('notes').click();assert.match(await card.innerText(),/Заметки/);
  await tab('pulse').click();assert.match(await card.innerText(),/Пульс/);
  const bluetooth=await page.evaluate(()=>!!navigator.bluetooth);
  assert.equal(await page.getByRole('button',{name:/Подключить пульсометр/}).count(),bluetooth?1:0);
  if(!bluetooth)assert.match(await card.innerText(),/Этот браузер не поддерживает/);
  await tab('symptoms').click();
  await card.locator('.st34-add-state').click();await page.getByRole('button',{name:'Усталость',exact:true}).click();
  await card.locator('.st34-mark-btn').first().click();
  await card.locator('.st34-mark-editor.open input[type=range]').fill('6');
  await card.locator('.st34-mark-save').first().click();
  assert.ok((await page.evaluate(()=>window.SetkaStandaloneV34.getData().checkins.length))>0);
  await tab('me').click();await page.getByRole('button',{name:/Аккаунт SETKA/}).waitFor();assert.equal(await page.locator('#st40DataSettingsButton').count(),0);
  assert.equal(await card.locator('#stReplaySettings').count(),0);
  mkdirSync('tests/visual-smoke',{recursive:true});
  await page.screenshot({path:'tests/visual-smoke/bottom-card-me.png'});
  await page.getByRole('button',{name:'Свернуть карточку',exact:true}).click();await card.waitFor({state:'hidden'});
  console.log('FIVE WORKING DOCK SECTIONS AND COLLAPSIBLE CARD PASS');

  // Real UI start, pattern, draft note, final feedback. Every record stays local.
  await tab('today').click();
  await page.getByRole('button',{name:/^Начать сессию/}).click();
  await page.getByRole('button',{name:'Расслабиться',exact:true}).click();
  await card.locator('.st-face').nth(2).click();
  await page.getByRole('button',{name:'5 мин',exact:true}).click();
  await page.getByRole('button',{name:'Начать',exact:true}).click();await card.waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Открыть паттерн RGB Glitch Rings. Удерживай, чтобы сохранить',exact:true}).click();
  await page.locator('#gameScreen.active').waitFor();
  assert.equal(await dock.isVisible(),false,'immersive pattern viewing must hide the bottom navigation');
  const controls=await page.locator('#gameScreen .bottom-controls').boundingBox();
  assert.ok(controls.y+controls.height<844,'game controls must fit at the bottom of the screen');
  // Saving a favorite must remain functional but be SILENT in immersive mode.
  // No text toast or bordered tooltip may interrupt the live geometry.
  const savedBefore=(await page.evaluate(()=>window.SetkaApp.getFavorites().length));
  await page.locator('#favoriteButton').click();
  assert.equal(await page.evaluate(()=>window.SetkaApp.getFavorites().length),savedBefore+1,
    'favorite button must still persist the selected pattern');
  const toastDisplay=await page.locator('#gameScreen #toast').evaluate(el=>getComputedStyle(el).display);
  assert.equal(toastDisplay,'none','no gameplay toast/announcement over the pattern');
  await page.getByRole('button',{name:'Добавить заметку',exact:true}).click();
  await card.waitFor({state:'visible'});
  assert.equal(await dock.isVisible(),true,'dock should return when an actual notes sheet is open');
  const draft='Изолированная проверка карточки';await card.locator('textarea').fill(draft);
  await tab('today').click();await tab('notes').click();
  assert.equal(await card.locator('textarea').inputValue(),draft,'tab switch discarded the note draft');
  await tab('notes').click();await card.waitFor({state:'hidden'});
  assert.equal(await dock.isVisible(),false,'closing the note card restores immersive gameplay');
  await page.getByRole('button',{name:'Добавить заметку',exact:true}).click();
  await card.waitFor({state:'visible'});
  assert.equal(await card.locator('textarea').inputValue(),draft,'collapse discarded the note draft');
  // While the sheet is open, measured viewing time must stay paused.
  const before=await page.evaluate(()=>window.SetkaStandaloneV34.getActiveSession().measuredActiveMs);
  await sleep(650);
  const after=await page.evaluate(()=>window.SetkaStandaloneV34.getActiveSession().measuredActiveMs);
  assert.equal(after,before);
  await page.getByRole('button',{name:'Сохранить',exact:true}).click();await card.waitFor({state:'hidden'});
  assert.equal(await dock.isVisible(),false,'saved note must return to unobstructed gameplay');
  const note=await page.evaluate(()=>{
    const n=window.SetkaStandaloneV34.getData().notes.at(-1);
    return{patternId:n.patternId,snapshotPattern:n.replaySnapshot?.patternId,frame:n.replaySnapshot?.frame,sessionId:n.sessionId};
  });
  assert.equal(note.patternId,'rgb-glitch-rings');assert.equal(note.snapshotPattern,'rgb-glitch-rings');assert.ok(Number.isFinite(note.frame));assert.ok(note.sessionId);
  // With the gameplay dock hidden, open the existing Notes list via the
  // real section renderer (as if entered from the dock in the library).
  await page.evaluate(()=>window.SetkaStandaloneV34.showNotes());
  await card.waitFor({state:'visible'});
  assert.equal(await dock.isVisible(),true);
  assert.equal(await card.locator('textarea').count(),0,'saved draft reopened as a new note');
  assert.match(await card.innerText(),new RegExp(draft));
  await tab('notes').click();await card.waitFor({state:'hidden'});
  assert.equal(await dock.isVisible(),false);
  await page.getByRole('button',{name:'Завершить сессию',exact:true}).click();
  await card.locator('.st-faces').waitFor();await card.locator('.st-face').nth(3).click();
  await page.getByRole('button',{name:'Немного',exact:true}).click();
  await page.getByRole('button',{name:'Сохранить оценку',exact:true}).click();
  await page.getByRole('button',{name:'Закончить',exact:true}).click();
  const ended=await page.evaluate(()=>window.SetkaStandaloneV34.getData().sessions.at(-1));
  assert.equal(ended.completed,true);assert.equal(ended.preState,3);assert.equal(ended.postState,4);
  assert.equal(await dock.isVisible(),true);
  await page.setViewportSize({width:1280,height:900});
  await page.waitForFunction(()=>document.querySelector('#st34Layer').getBoundingClientRect().width<600);
  await page.screenshot({path:'tests/visual-smoke/bottom-card-desktop.png'});
  assert.deepEqual(errors,[]);
  console.log('REAL UI SESSION, FROZEN NOTE, DRAFT RESTORE AND PAUSED WATCH TIME PASS',JSON.stringify({pattern:note.patternId,completed:ended.completed,apiCallsIntercepted:api.length}));
}finally{await browser?.close();server.kill('SIGTERM')}
