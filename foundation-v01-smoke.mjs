import { chromium } from 'playwright-core';
const URL=process.env.URL||'https://misskogut.github.io/Setka-web/foundation-user-v01.html';
const chrome=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
async function boot(persona){const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));await page.goto(`${URL}?synthetic=${encodeURIComponent(persona)}&smoke=${Date.now()}`,{waitUntil:'networkidle',timeout:45000});await page.waitForFunction(()=>window.__SETKA_FOUNDATION_USER_V01__==='loaded'&&window.FoundationV01?.state()?.patterns?.length===2,{timeout:30000});if(errors.length)throw new Error('page_errors '+errors.join(' | '));return page}
const p1=await boot('mira_explorer');
let s=await p1.evaluate(()=>window.FoundationV01.state());
if(s.patterns.length!==2)throw new Error('pattern_count '+JSON.stringify(s));
const id=s.patterns[0].patternId,initial=!!s.patterns[0].favorite;
await p1.click(`[data-pattern-id="${id}"]`);await p1.waitForSelector('#viewer:not(.hidden)');await p1.click('#heartButton');
await p1.waitForFunction(({id,initial})=>!!window.FoundationV01.state().patterns.find(x=>x.patternId===id)?.favorite!==initial,{id,initial},{timeout:10000});
s=await p1.evaluate(()=>window.FoundationV01.state());if(!!s.patterns.find(x=>x.patternId===id).favorite===initial)throw new Error('favorite_did_not_toggle');
await p1.evaluate(()=>window.FoundationV01.finishSynthetic('passed',{smoke:'phase1',patch:'0.1.1'}));await p1.close();
const p2=await boot('mira_explorer');s=await p2.evaluate(()=>window.FoundationV01.state());const persisted=!!s.patterns.find(x=>x.patternId===id).favorite;if(persisted!==!initial)throw new Error('favorite_not_persisted '+JSON.stringify({initial,persisted}));
await p2.click(`[data-pattern-id="${id}"]`);await p2.waitForSelector('#viewer:not(.hidden)');await p2.click('#heartButton');
await p2.waitForFunction(({id,initial})=>!!window.FoundationV01.state().patterns.find(x=>x.patternId===id)?.favorite===initial,{id,initial},{timeout:10000});
s=await p2.evaluate(()=>window.FoundationV01.state());if(!!s.patterns.find(x=>x.patternId===id).favorite!==initial)throw new Error('favorite_restore_failed');await p2.evaluate(()=>window.FoundationV01.finishSynthetic('passed',{smoke:'phase2',restored:true,patch:'0.1.1'}));
console.log(JSON.stringify({ok:true,version:'0.1.1',patterns:s.patterns.map(x=>x.patternId),favoritePersisted:true,restored:true}));await p2.close();await browser.close();