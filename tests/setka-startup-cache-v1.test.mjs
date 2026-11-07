import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";

test("SETKA startup caches unchanged frontend assets across unrelated GitHub deployments",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"setka-cache-gate-"));
 const html='<meta name="setka-release-build" content="development" />\\n'+
  '<script src="app.js?v=old"></script>\\n'+
  '<script type="module" src="scene.mjs?v=old"></script>\\n'+
  '<link href="look.css?v=old" rel="stylesheet">\\n';
 try{
  fs.mkdirSync(path.join(dir,"scripts"));
  fs.copyFileSync("scripts/build-standalone-release.mjs",path.join(dir,"scripts/build-standalone-release.mjs"));
  fs.writeFileSync(path.join(dir,"app.js"),'window.app="unchanged";');
  fs.writeFileSync(path.join(dir,"look.css"),'body{background:#000}');
  fs.writeFileSync(path.join(dir,"scene.mjs"),'import "./engine.mjs?v=static"; export const scene=1;');
  fs.writeFileSync(path.join(dir,"engine.mjs"),'export const engine=1;');
  const run=sha=>{
   fs.writeFileSync(path.join(dir,"standalone-v34.html"),html);
   execFileSync(process.execPath,["scripts/build-standalone-release.mjs"],{
    cwd:dir,env:{...process.env,GITHUB_SHA:sha},stdio:"pipe"
   });
   const deployed=fs.readFileSync(path.join(dir,"standalone-v34.html"),"utf8");
   const links=Object.fromEntries([...deployed.matchAll(/(?:src|href)="([^"?]+)\\?content=([a-f0-9]{20})"/g)]
    .map(([,name,version])=>[name,version]));
   assert.equal(Object.keys(links).length,3,"all three frontend assets have source digests");
   assert.equal(JSON.parse(fs.readFileSync(path.join(dir,"standalone-release.json"),"utf8")).build,sha);
   return {deployed,links};
  };
  const a=run("a".repeat(40)),b=run("b".repeat(40));
  assert.notEqual(a.deployed,b.deployed,"build identity still updates the canonical release document");
  assert.deepEqual(a.links,b.links,"unrelated commit must not evict any unchanged browser asset");
  fs.writeFileSync(path.join(dir,"engine.mjs"),"export const engine=2;");
  const c=run("c".repeat(40));
  assert.notEqual(b.links["scene.mjs"],c.links["scene.mjs"],"module imports participate in the effective entrypoint cache fingerprint");
  assert.equal(b.links["app.js"],c.links["app.js"],"unrelated scripts stay cached after an audio/module edit");
  assert.equal(b.links["look.css"],c.links["look.css"],"unchanged CSS stays cached");
  fs.writeFileSync(path.join(dir,"app.js"),'window.app="changed";');
  const d=run("d".repeat(40));
  assert.notEqual(c.links["app.js"],d.links["app.js"],"a changed frontend script invalidates automatically");
  assert.equal(c.links["scene.mjs"],d.links["scene.mjs"],"unrelated module retains its cache");
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

test("incremental renderer hydration preserves previously drawn pattern canvases",()=>{
 const app=fs.readFileSync("app-v7-multipattern.js","utf8");
 assert.match(app,/const pending=allPatternsPanel.querySelectorAll/);
 assert.match(app,/placeholder.replaceWith\\(baseTile\\(p\\)\\)/);
 assert.doesNotMatch(app,/available.map\\(p=>\\[p.id,p.version,registry.defaults\\(p.id\\),registry.ready\\(p.id\\)\\]\\)/);
 const loader=fs.readFileSync("standalone-pattern-plugins-v1.js","utf8");
 assert.match(loader,/SetkaPatternModuleHashesV1/);
 assert.match(loader,/address.searchParams.set\\("content",hash\\)/);
 assert.match(loader,/address.searchParams.set\\("build",build\\)/,
  "a stale registry or local shell must still load renderers safely");
});
