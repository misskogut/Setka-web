import { chromium } from 'playwright-core';
const BASE='https://misskogut.github.io/Setka-web';
const USER=`${BASE}/foundation-user-v013.html`;
const ADMIN=`${BASE}/foundation-admin-v013.html`;
const API='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-v013';
const DIAMOND='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-diamond-president-v3';
const chrome=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
const version=await page.evaluate(async api=>{const r=await fetch(api,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'version'})});return await r.json()},API);
if(version.pairVersion!=='0.1.3')throw new Error('backend_version '+JSON.stringify(version));
await page.goto(`${USER}?synthetic=mira_explorer&smoke=${Date.now()}`,{waitUntil:'networkidle',timeout:45000});
await page.waitForFunction(()=>window.FoundationUser?.version==='0.1.3'&&window.FoundationUser?.state()?.patterns?.length===2,{timeout:30000});
const state=await page.evaluate(()=>window.FoundationUser.state());
if(state.patterns.length!==2)throw new Error('pattern_count');
const id=state.patterns[0].patternId,initial=!!state.patterns[0].favorite;
await page.click(`[data-pattern-id="${id}"]`);await page.waitForSelector('#viewer:not(.hidden)');
await page.click('#heartButton');await page.waitForFunction(({id,initial})=>!!window.FoundationUser.state().patterns.find(x=>x.patternId===id).favorite!==initial,{id,initial},{timeout:10000});
await page.click('#heartButton');await page.waitForFunction(({id,initial})=>!!window.FoundationUser.state().patterns.find(x=>x.patternId===id).favorite===initial,{id,initial},{timeout:10000});
await page.goto(`${ADMIN}?shell=${Date.now()}`,{waitUntil:'networkidle',timeout:45000});
if(!(await page.locator('#loginButton').isVisible()))throw new Error('admin_shell_missing');
const av=await page.evaluate(()=>window.FoundationAdmin?.version);if(av!=='0.1.3')throw new Error('admin_version '+av);
const traceTransport=await page.evaluate(async endpoint=>{
  try{
    const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json','x-setka-session':'invalid-smoke-session'},body:JSON.stringify({action:'trace_start',checkpoint:'foundation-v0.1.3',frontVersion:'foundation-admin-v0.1.3',viewport:{width:390,height:844,dpr:1}})});
    const d=await r.json().catch(()=>({}));
    return {network:true,status:r.status,error:d.error||null};
  }catch(e){return {network:false,message:String(e?.message||e)}}
},DIAMOND);
if(!traceTransport.network)throw new Error('trace_transport_network_failure '+JSON.stringify(traceTransport));
if(traceTransport.status!==401||traceTransport.error!=='invalid_session')throw new Error('trace_transport_unexpected '+JSON.stringify(traceTransport));
if(errors.length)throw new Error('page_errors '+errors.join(' | '));
console.log(JSON.stringify({ok:true,pairVersion:'0.1.3',patterns:state.patterns.map(x=>x.patternId),favoriteRoundTrip:true,traceTransport:'cors-ok-server-401',adminShell:true}));
await browser.close();