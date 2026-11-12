// Actual Chromium/WebKit acceptance for automation exclusion on the real
// production hostname. Browser network is fully intercepted: no test visits
// or account data can reach SETKA production from this test.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';

const name=process.env.SETKA_BROWSER==='webkit'?'webkit':'chromium';
const browser=await (name==='webkit'?webkit:chromium).launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 let backendRequests=0,resourceMisses=0;
 await context.route('https://gfchgaphzhxufwdhrcis.supabase.co/**',route=>{
  backendRequests++;
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,accepted:1})});
 });
 await context.route('https://misskogut.github.io/Setka-web/**',route=>{
  const url=new URL(route.request().url());
  const base=url.pathname.split('/').pop();
  if(base==='__setka_automation_gate.html'){
   return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:`<!doctype html><html><head><meta charset="utf-8"></head><body>
    <script>
    window.SetkaStandaloneV34={
      getData:()=>({patternExposures:[{
       exposureId:'ci-post-login-exposure',patternId:'hexwave',durationMs:3000,
       startedAt:new Date(Date.now()+1000).toISOString(),
       endedAt:new Date(Date.now()+4000).toISOString()
      }],sessions:[]}),
      sandbox:{deviceId:'ci-browser-fixture'}
    };
    window.SetkaDataScopeV1={id:'tester:T-CI'};
    window.__SETKA_PRIVATE_CORPUS_V40__={authoritative:()=>true};
    localStorage.setItem('setka-standalone:v34-yulia-device','ci-browser-fixture');
    localStorage.setItem('setka-v40:cabinet-session',JSON.stringify({testerId:'T-CI',token:'ci-only-token'}));
    </script>
    <script src="standalone-guest-telemetry-v2.js"></script>
    <script src="standalone-guest-journey-v3.js"></script>
    <script src="standalone-account-journey-v1.js"></script>
    <script src="standalone-account-exposure-v2.js"></script>
    <script src="standalone-sync-v34.js"></script>
    </body></html>`});
  }
  const allowed=new Set(['standalone-guest-telemetry-v2.js','standalone-guest-journey-v3.js',
   'standalone-account-journey-v1.js','standalone-account-exposure-v2.js','standalone-sync-v34.js']);
  if(allowed.has(base)){
   return route.fulfill({status:200,contentType:'application/javascript',body:readFileSync(base,'utf8')});
  }
  resourceMisses++;
  return route.fulfill({status:404,body:'not found'});
 });
 const page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('https://misskogut.github.io/Setka-web/__setka_automation_gate.html',{waitUntil:'load'});
 const webDriver=await page.evaluate(()=>navigator.webdriver);
 assert.equal(webDriver,true, name+' should self-identify as an automated production-page browser');
 // Force the same normal events and foreground/background transitions used in
 // SETKA's collectors. None can count a CI participant.
 await page.evaluate(()=>{
  window.dispatchEvent(new CustomEvent('setka:standalone-event',{detail:{type:'pattern_open'}}));
  window.dispatchEvent(new Event('online'));
  window.dispatchEvent(new Event('pageshow'));
  window.dispatchEvent(new CustomEvent('setka:v40-account',{detail:{authenticated:true}}));
 });
 await page.waitForTimeout(2400);
 assert.equal(backendRequests,0,'automated published-page browser must never reach real telemetry APIs');
 assert.deepEqual(errors,[],'no script errors while skipping automated telemetry');
 assert.equal(resourceMisses,0,'test fixture served all requested local resources');
 console.log(name+' production webdriver analytics isolation PASS');
 await context.close();
}finally{await browser.close()}
