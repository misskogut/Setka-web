// Isolated copy V6 lab browser test: no production writes or admin credentials.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const script=readFileSync('research-v1/copy-analytics-v6.mjs','utf8');
const fixture=[
'<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>[hidden]{display:none!important}body{font:14px system-ui;margin:0;padding:16px}.nav{padding:10px}.main{padding:16px}</style></head><body>',
'<div class="workspace"><nav><button class="nav selected" data-page="research">Исследования</button><button class="nav" data-page="patterns">Паттерны</button><button class="nav" data-page="home">Главная</button></nav>',
'<main class="main"><h1>Копия админки V6</h1><section id="content"></section></main></div>',
'<script type="module" src="/research-v1/copy-analytics-v6.mjs"></script>',
'<script>document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>{document.querySelector(".nav.selected")?.classList.remove("selected");b.classList.add("selected")}))</script>',
'</body></html>'
].join('');
const server=createServer((req,res)=>{
 if(req.url?.includes('copy-analytics-v6.mjs')){res.writeHead(200,{'Content-Type':'text/javascript'}).end(script);return}
 res.writeHead(200,{'Content-Type':'text/html'}).end(fixture);
});
let browser;
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base='http://127.0.0.1:'+server.address().port;
 browser=await (process.env.SETKA_BROWSER==='webkit'?webkit:chromium).launch({headless:true,args:process.env.SETKA_BROWSER==='webkit'?[]:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>localStorage.setItem('setka-research:admin-key:v1','fake-admin-fixture-only'));
 await page.route('https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-admin-v6-metrics',async r=>{
  const body=r.request().postDataJSON();requests.push(body);
  const source=body.source;
  const data=body.action==='lab-summary'?{
   ok:true,source,periodDays:body.days,timeZone:'UTC+04:00',exposures:source==='account_v41'?4:7,
   distinctIdentities:source==='account_v41'?1:2,recordedMs:source==='account_v41'?40000:90000,patternCount:1,
   rowsConsidered:source==='account_v41'?4:8,excludedRows:0,duplicateRows:1,lastIngestAt:'2026-11-11T23:00:00Z',truncated:false,
   timeline:[{date:'2026-11-12',exposures:source==='account_v41'?4:7,recorded_ms:90000,distinct_identities:2}],
   patterns:[{pattern_id:'gravity-atom',exposures:source==='account_v41'?4:7,recorded_ms:90000,distinct_identities:2}]
  }:body.action==='quality'?{ok:true,sources:[]}:{
   ok:true,source,items:[{pattern_id:'gravity-atom',exposures:7,active_ms:90000,unique_participants:2}]};
  await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto(base+'/standalone-research-admin-copy-v6.html');
 await page.locator('#setka-copy-more-toggle').click();
 await page.locator('[data-v6-view="lab"]').click();
 await page.getByText('Динамика просмотров по дням').waitFor();
 assert.equal(await page.locator('#setka-v6-lab-tools').isVisible(),true);
 assert.match(await page.locator('#setka-copy-more-results').innerText(),/gravity-atom/);
 assert.equal(requests.at(-1).action,'lab-summary');
 assert.equal(requests.at(-1).days,30);
 assert.equal(requests.at(-1).source,'unified_v2');
 await page.locator('#setka-v6-lab-days').selectOption('7');
 await page.waitForFunction(()=>document.querySelector('#setka-copy-more-results')?.textContent?.includes('7 дней'));
 assert.equal(requests.at(-1).days,7);
 await page.locator('#setka-v6-lab-source').selectOption('account_v41');
 await page.waitForFunction(()=>document.querySelector('#setka-copy-more-results')?.textContent?.includes('Аккаунты V41'));
 assert.equal(requests.at(-1).source,'account_v41');
 assert.match(await page.locator('#setka-copy-more-results').innerText(),/Аккаунты внутри V41/);
 const overlay=await page.locator('#setka-copy-more').evaluate(e=>getComputedStyle(e).position);
 assert.notEqual(overlay,'fixed','lab must participate in mobile page flow');
 await page.locator('.nav[data-page="patterns"]').click();
 await page.locator('#setka-copy-toggle').click();
 await page.locator('#setka-copy-output').getByText(/gravity-atom/).waitFor();
 await page.locator('.nav[data-page="home"]').click();
 assert.equal(await page.locator('#setka-copy-more').isVisible(),true);
 assert.deepEqual(errors,[]);
 console.log('V6 COPY LAB DATA/UI, SOURCE SWITCH, PERIOD, NO OVERLAY PASSED',process.env.SETKA_BROWSER||'chromium');
}finally{await browser?.close();await new Promise(ok=>server.close(ok))}
