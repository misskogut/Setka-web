import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const collectors=[
 'standalone-guest-journey-v3.js',
 'standalone-guest-telemetry-v2.js',
 'standalone-account-journey-v1.js',
 'standalone-account-exposure-v2.js'
];
const hosts=['misskogut.github.io','setka-app.com','www.setka-app.com'];
function execute(file,hostname,webdriver){
 const source=readFileSync(file,'utf8');
 const context={navigator:{webdriver},location:{hostname},
  window:new Proxy({},{get:()=>{throw Error('collector_initialized')}})};
 return ()=>vm.runInNewContext(source,context,{filename:file});
}
test('automated browser on every production SETKA host never starts a research collector',()=>{
 for(const file of collectors)for(const host of hosts)
  assert.doesNotThrow(execute(file,host,true),file+' should skip automation on '+host);
});
test('local CI fixtures and ordinary visitors are not blocked',()=>{
 for(const file of collectors){
  assert.throws(execute(file,'127.0.0.1',true),/collector_initialized/,file+' fixture path');
  assert.throws(execute(file,'misskogut.github.io',false),/collector_initialized/,file+' real human path');
 }
});
test('music plays normally in CI but automated published-page listens are not counted',()=>{
 const src=readFileSync('standalone-music-v1.mjs','utf8');
 assert.match(src,/mixer\.onTrackEvent=event=>\{\s*if\(typeof navigator!==/);
 assert.match(src,/navigator\.webdriver===true/);
 assert.match(src,/\.test\(location\.hostname\)\)return;/);
 const html=readFileSync('standalone-v34.html','utf8');
 for(const file of [...collectors,'standalone-music-v1.mjs'])
  assert.ok(html.includes(file+'?v='),'versioned, cache-busted production entry for '+file);
});
