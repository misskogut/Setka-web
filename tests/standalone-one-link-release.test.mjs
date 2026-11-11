import assert from "node:assert/strict";
import {test} from "node:test";
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {resolve,join,dirname,sep} from "node:path";
import {spawnSync} from "node:child_process";

test("one permanent public SETKA URL gets atomic HTML and manifest revisions",()=>{
  const temp=mkdtempSync(join(tmpdir(),"setka-release-"));
  try{
    const source=readFileSync("standalone-v34.html","utf8");
    assert.match(source,/<meta name="setka-release-build" content="development"\s*\/>/);
    assert.match(source,/__setka_refresh/,"a stale iPhone page should refresh itself");
    assert.match(source,/userInteracted/,"no refresh during interaction");
    assert.match(source,/getActiveSession/,"protect an active session");
    assert.match(source,/canonical\.searchParams\.delete\(revisionParam\)/,"restore the stable shareable URL");
    writeFileSync(join(temp,"standalone-v34.html"),source);
    // Exercise the real HTML in an isolated release fixture. All referenced
    // local assets must exist because the release builder now fingerprints
    // their content (rather than stamping only HTML). No full repo copy needed.
    for(const match of source.matchAll(/\\b(?:src|href)="((?!https?:|\\/\\/)[^"?]+\\.(?:js|mjs|css))(?:\\?[^"]*)?"/g)){
      const asset=resolve(temp,match[1]);
      assert.ok(asset.startsWith(temp+sep),"fixture asset stays inside test dir");
      mkdirSync(dirname(asset),{recursive:true});
      writeFileSync(asset,"// Isolated release test asset: "+match[1]+"\\n");
    }
    const sha="abcdef0123456789abcdef0123456789abcdef01";
    const result=spawnSync(process.execPath,[resolve("scripts/build-standalone-release.mjs")],{
      cwd:temp,env:{...process.env,GITHUB_SHA:sha},encoding:"utf8"
    });
    assert.equal(result.status,0,result.stderr||result.stdout);
    const built=readFileSync(join(temp,"standalone-v34.html"),"utf8");
    assert.match(built,new RegExp('<meta name="setka-release-build" content="'+sha+'"'));
    const release=JSON.parse(readFileSync(join(temp,"standalone-release.json"),"utf8"));
    assert.deepEqual(release,{build:sha,entry:"standalone-v34.html"});
    assert.match(built,/standalone-audio-reactive-v4\.js/,"keep latest softened five-mode equalizer");
    assert.doesNotMatch(built,/href="standalone-v34-eq-v[23]\.html"/,"no alternate public entrypoint");
  }finally{rmSync(temp,{recursive:true,force:true})}
});
