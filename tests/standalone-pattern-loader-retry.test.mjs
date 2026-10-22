import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('a failed renderer download retries and becomes available without erasing saved data',()=>{
 const scripts=[],timeouts=[],listeners=new Map();
 let ready=false;
 const pattern={id:'rain',version:1,module:'standalone-pattern-rain.js'};
 const registry={list:()=>[pattern],ready:()=>ready};
 const document={
  currentScript:{src:'https://example.test/standalone-pattern-plugins-v1.js'},
  querySelector:()=>({content:'0123456789abcdef0123456789abcdef01234567'}),
  createElement:()=>({
   dataset:{},listeners:{},addEventListener(name,fn){this.listeners[name]=fn}
  }),
  head:{appendChild(script){scripts.push(script)}}
 };
 const window={
  SetkaPatternRegistryV1:registry,dispatchEvent(){},
  addEventListener(name,fn){listeners.set(name,fn)}
 };
 const context={window,document,location:{href:'https://example.test/app.html'},
  CustomEvent:class{},URL,setTimeout:fn=>{timeouts.push(fn);return timeouts.length},console};
 vm.runInNewContext(fs.readFileSync('standalone-pattern-plugins-v1.js','utf8'),context);
 assert.equal(scripts.length,1);
 assert.match(scripts[0].src,/build=0123456789abcdef/);
 scripts[0].listeners.error();
 assert.equal(window.SetkaPatternPluginsV1.status().failed.includes('standalone-pattern-rain.js'),true);
 assert.equal(timeouts.length,1,'recoverable request schedules a bounded retry');
 timeouts.shift()();
 assert.equal(scripts.length,2,'retry requested without page reload');
 assert.match(scripts[1].src,/retry=1/);
 ready=true;
 scripts[1].listeners.load();
 assert.deepEqual(Array.from(window.SetkaPatternPluginsV1.status().ready),['rain']);
 window.SetkaPatternPluginsV1.loadModules();
 assert.equal(scripts.length,2,'ready renderer must not be downloaded again');
});
