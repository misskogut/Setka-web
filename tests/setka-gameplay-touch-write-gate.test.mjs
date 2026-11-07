import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("heavy pattern settings are saved once for a burst, but never lost on pagehide",()=>{
 const source=fs.readFileSync("app-v7-multipattern.js","utf8");
 const from=source.indexOf('  const LAST_KEY="setka-patterns:last-config:v1"');
 const to=source.indexOf("  function restorePersonalConfigs(",from);
 assert.ok(from>=0&&to>from,"canonical pattern memory writer is present");
 const callbacks=new Map(),timeouts=new Map(),writing=[];
 let next=0,archiveSaves=0;
 const data={settings:{}};
 const sandbox={
  registry:{get:()=>({version:1}),persistentConfig:c=>({...c})},
  runtimePatternId:"fixture-gesture",runtimeConfig:{patternId:"fixture-gesture",radius:1},
  configKey:c=>JSON.stringify(c),
  readJSON:()=>({}),
  writeJSON:(key,payload)=>writing.push([key,JSON.parse(JSON.stringify(payload))]),
  window:{
   __SETKA_RENDER_ONLY__:false,
   SetkaStandaloneV34:{getData:()=>data,save:()=>{archiveSaves++;return true}},
   addEventListener:(name,fn)=>callbacks.set(name,fn)
  },
  document:{hidden:false,addEventListener:(name,fn)=>callbacks.set("document:"+name,fn)},
  setTimeout:(fn,ms)=>{const id=++next;timeouts.set(id,{fn,ms});return id},
  clearTimeout:id=>timeouts.delete(id),
  Date
 };
 vm.runInNewContext(source.slice(from,to)+"\nglobalThis.writer={remember,flushRemember,lastConfigs};",sandbox);
 assert.ok(callbacks.has("setka:gesture-move")&&callbacks.has("pagehide"));
 for(let i=0;i<80;i++){
  sandbox.runtimeConfig={patternId:"fixture-gesture",radius:1+i/100};
  callbacks.get("setka:gesture-move")({type:"setka:gesture-move"});
 }
 assert.equal(writing.length,0,"no localStorage serialization for every drag segment");
 assert.equal(archiveSaves,0,"no full user archive writes in the touchmove loop");
 assert.equal(timeouts.size,1,"only one bounded flush timer for an uninterrupted drag");
 const timer=[...timeouts.values()][0];assert.equal(timer.ms,420);
 timer.fn();
 assert.equal(archiveSaves,1);
 assert.equal(writing.length,1);
 assert.equal(writing[0][1]["fixture-gesture"].config.radius,1.79,
  "coalescing must not lose the last gesture position");
 callbacks.get("setka:gesture-end")({type:"setka:gesture-end"});
 assert.equal(archiveSaves,1,"unchanged finger lift is not another archive rewrite");
 sandbox.runtimeConfig={patternId:"fixture-gesture",radius:3};
 callbacks.get("setka:gesture-move")({type:"setka:gesture-move"});
 callbacks.get("pagehide")();
 assert.equal(archiveSaves,2,"pagehide flushes last unsaved gesture synchronously");
 assert.equal(writing.at(-1)[1]["fixture-gesture"].config.radius,3);
 assert.equal(timeouts.size,0,"pagehide cancels the redundant timer");
});

test("rapid gameplay event storage is batched and full scene DOM is not measured on every pointer",()=>{
 const core=fs.readFileSync("standalone-core-v34.js","utf8");
 const runtime=fs.readFileSync("standalone-runtime-v34.js","utf8");
 const replay=fs.readFileSync("standalone-replay-capture-v1.js","utf8");
 const app=fs.readFileSync("app-v7-multipattern.js","utf8");
 const navigation=fs.readFileSync("standalone-navigation-v34.js","utf8");
 assert.match(core,/function recordEvent\(type,payload=\{\},sessionScoped=true,batched=false\)/);
 assert.match(core,/if\(batched\)scheduleGestureSave\(\);else save\(\)/);
 assert.match(core,/setTimeout\(\(\)=>\{gestureSaveTimer=0;save\(\)\},420\)/);
 assert.match(runtime,/return originalRecord\(type,payload,sessionScoped,batched\)/);
 assert.match(replay,/if\(!enabled\(\)\|\|restricted\(\)\|\|e.target.closest/);
 assert.doesNotMatch(replay,/if\(!enabled\(\)\|\|screen\(\)\?\.kind/);
 assert.match(app,/if\(e.type==="touchend"&&touch.tapEligible/);
 assert.doesNotMatch(app,/e.touches.length===1&&!registry.hasInteraction\?\.\(runtimePatternId\)\)patternTap\(/);
 assert.match(navigation,/backIntent\?\.ended&&!backIntent.moved/);
});
