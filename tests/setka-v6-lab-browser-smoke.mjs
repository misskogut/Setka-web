// Isolated V6 native overview browser smoke: no production credentials or writes.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const moduleCode=readFileSync('research-v1/copy-analytics-v6.mjs','utf8');
const style=readFileSync('research-v1/copy-v6.css','utf8');
const html=[
'<!doctype html><html lang="ru"><head><meta charset="utf-8"><link rel="stylesheet" href="/research-v1/copy-v6.css"></head><body>',
'<nav><button data-page="home" class="nav selected">Главная</button><button data-page="patterns" class="nav">Паттерны</button></nav>',
'<div class="main"><div id="content"><div class="kpi-grid">Исходная админка</div></div></div>',
'<div id="detail-content"><div class="row">Название паттерна</div></div>',
'<script type="module">',
'import {createV6Analytics} from "/research-v1/copy-analytics-v6.mjs";',
'window.testV6=createV6Analytics({getAdminKey:()=>"isolated-test-only",getPatternName:id=>id==="gravity-atom"?"Атом гравитации":id,openPattern:id=>{window.pickedPattern=id;window.testV6.showPatternDetail(id,{period:window.period||"all",from:window.dateFrom||null,to:window.dateTo||null})}});',
'window.period="all";',
'window.renderV6=(page="home",period="all",from=null,to=null)=>{window.period=period;window.dateFrom=from;window.dateTo=to;document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("selected",n.dataset.page===page));',
'document.querySelector("#content").innerHTML=page==="home"?"<div class=kpi-grid>Исходная админка</div>":"<div class=pattern-grid>Карточки паттернов</div>";',
'window.testV6.render(page,{period,from,to})};',
'window.renderV6("home","all");',
'</script></body></html>'
].join('\n');
const server=createServer((req,res)=>{
 if(req.url?.includes('copy-analytics-v6.mjs')){res.writeHead(200,{'Content-Type':'text/javascript'}).end(moduleCode);return}
 if(req.url?.includes('copy-v6.css')){res.writeHead(200,{'Content-Type':'text/css'}).end(style);return}
 res.writeHead(200,{'Content-Type':'text/html'}).end(html);
});
let browser;
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base='http://127.0.0.1:'+server.address().port;
 browser=await (process.env.SETKA_BROWSER==='webkit'?webkit:chromium).launch({headless:true,args:process.env.SETKA_BROWSER==='webkit'?[]:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[],calls=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('https://gfchgaphzhxufwdhrcis.supabase.co/**',async route=>{
  const payload=route.request().postDataJSON();calls.push(payload);
  assert.equal(payload.action,'lab-summary');
  assert.equal(payload.adminKey,'isolated-test-only');
  const guest=payload.source==='unified_v2',account=payload.source==='account_v41';
  const result={ok:true,source:payload.source,periodDays:payload.days,
    exposures:guest?8:account?4:15,distinctIdentities:guest?2:account?1:3,
    guestDevices:guest?2:0,accountActors:0,recordedMs:guest?155000:250000,patternCount:1,
    timeline:[{date:'2026-11-12',exposures:8,recorded_ms:155000}],
    patterns:[{pattern_id:'gravity-atom',exposures:guest?8:account?4:15,recorded_ms:guest?155000:250000,
      ...(guest?{usage_mode:{duringSession:3,justWatch:5}}:account?{usage_mode:{duringSession:1,justWatch:3}}:{})}],
    ...(guest?{usageMode:{duringSession:3,justWatch:5}}:account?{usageMode:{duringSession:1,justWatch:3},
     accountInventory:{registeredAccounts:11,existingFavorites:17,recordedSessions:4,verifiedDeviceLinks:0}}:{}),
    rowsConsidered:8,duplicateRows:0,excludedRows:0,
    ...(guest?{journey:{visits:3,activeGuestDevices:2,firstSeenGuestDevices:1,returningGuestDevices:1,patternOpens:5,favoriteSaves:2,musicStarts:1,foregroundMs:90000,timeline:[{date:"2026-11-12",visits:3}],patternOpensById:[{pattern_id:"gravity-atom",opens:5}]},accountJourney:{visits:4,activeAccounts:2,firstSeenAccounts:1,returningAccounts:1,musicStarts:3,foregroundMs:40000,timeline:[{date:"2026-11-12",visits:4}]},
    outcomes:{trackedSessions:10,completedSessions:8,pairedSessions:7,overall:{meanPre:2,meanPost:3,meanChange:1},groups:[{requestKey:'sleep',pairedSessions:5,meanPre:2,meanPost:3}]}}:
    account?{transitions:{sessionsWithSequence:9,transitions:[{fromPattern:'gravity-atom',toPattern:'medusa',sessionCount:4}]}}:{})};
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'content-type'},body:JSON.stringify(result)});
 });
 await page.goto(base+'/standalone-research-admin-copy-v6.html');
 await page.getByText('Использование SETKA').waitFor();
 await page.waitForFunction(()=>document.querySelector('.v6-overview-body')?.textContent?.includes('Гостевые устройства'));
 const dashboard=await page.locator('#setka-v6-overview').innerText();
 assert.match(dashboard,/Просмотры/);
 assert.match(dashboard,/Гостевые устройства/);
 assert.match(dashboard,/Визиты/);
 assert.match(dashboard,/Вернувшиеся гости/);
 assert.match(dashboard,/Вернувшиеся аккаунты/);
 assert.match(dashboard,/Визиты аккаунтов/);
 assert.match(dashboard,/Аккаунты в приложении/);
 assert.match(dashboard,/Музыка · аккаунты/);
 assert.match(dashboard,/Музыка/);
 assert.match(dashboard,/Аккаунты с просмотрами/);
 assert.match(dashboard,/Зарегистрированы/);
 assert.match(dashboard,/во время сессий/);
 assert.match(dashboard,/просто посмотреть/);
 assert.match(dashboard,/сохранений в избранном сейчас/);
 assert.match(dashboard,/подтверждённых связей устройств/);
 assert.match(dashboard,/11/);
 assert.match(dashboard,/V40/);
 assert.match(dashboard,/V41/);
 assert.match(dashboard,/Изменение состояния/);
 assert.match(dashboard,/Завершённые исследовательские сессии/);
 assert.match(dashboard,/Субъективные оценки/);
 assert.match(dashboard,/Последовательности паттернов/);
 assert.match(dashboard,/медуза|medusa/i);
 assert.equal(await page.locator('select[id*="source"],select[id*="lab"]').count(),0);
 const bg=await page.locator('#setka-v6-overview').evaluate(el=>getComputedStyle(el).backgroundColor);
 assert.equal(bg,'rgb(255, 255, 255)');
 await page.locator('[data-v6-pattern="gravity-atom"]').click();
 assert.equal(await page.evaluate(()=>window.pickedPattern),'gravity-atom');
 await page.getByText('Использование паттерна · Атом гравитации').waitFor();
 assert.match(await page.locator('#setka-v6-pattern-detail').innerText(),/Исторические гости V40/);
 assert.match(await page.locator('#setka-v6-pattern-detail').innerText(),/Медианная длительность/);
 assert.match(await page.locator('#setka-v6-pattern-detail').innerText(),/Повторно просматривали/);
 assert.match(await page.locator('#setka-v6-pattern-detail').innerText(),/Сохранений в избранное/);
 const detail=await page.locator('#setka-v6-pattern-detail').innerText();
 assert.match(detail,/Просто посмотреть/);
 assert.match(detail,/Во время сессий/);
 await page.evaluate(()=>window.renderV6('home','7'));
 await page.waitForFunction(()=>document.querySelector('.v6-overview-body')?.textContent?.includes('Гостевые устройства'));
 assert.ok(calls.some(c=>c.days===7),'period flows to server without any source picker');
 await page.evaluate(()=>window.renderV6('home','custom','2026-11-11T20:00:00Z','2026-11-12T00:00:00Z'));
 await page.waitForFunction(()=>document.querySelector('.v6-overview-body')?.textContent?.includes('Гостевые устройства'));
 assert.ok(calls.some(c=>c.from==='2026-11-11T20:00:00Z'&&c.to==='2026-11-12T00:00:00Z'),'custom dates forwarded automatically');
 await page.evaluate(()=>window.renderV6('patterns','7'));
 await page.getByText('Активность паттернов').waitFor();
 await page.waitForFunction(()=>document.querySelector('.v6-pattern-inline')?.textContent?.includes('просмотров V2'));
 assert.deepEqual(errors,[]);
 console.log('V6 NATIVE WHITE OVERVIEW, AUTO SOURCE SUMMARY, PATTERN DRILL-DOWN PASS',process.env.SETKA_BROWSER||'chromium');
}finally{await browser?.close();await new Promise(ok=>server.close(ok))}
