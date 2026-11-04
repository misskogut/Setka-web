import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const file="standalone-pattern-key-v1.js",code=fs.readFileSync(file,"utf8");
test("settings avoid redundant slider words and visible numeric labels",()=>{
 assert.doesNotMatch(code,/ТОЛЬКО БЕГУНКОМ|Тап по паттерну|можно менять бегунком/);
 assert.doesNotMatch(code,/className="sk-value"|document\.createElement\("output"\)/);
 assert.match(code,/head\.textContent=kind==="slider"\?"НАСТРОЙКИ"/);
 assert.match(code,/if\(kind!=="slider"\)/);
 assert.match(code,/line\.append\(title\);box\.append\(line,input\)/);
 assert.match(code,/aria-valuetext/);
 assert.match(code,/Math\.round\(100\*/);
 assert.match(code,/setConfigPatch\(\{\[k\]:Number\(input\.value\)\}\)/);
 assert.doesNotThrow(()=>new vm.Script(code), "settings module must remain parseable");
});
test("every registered pattern inherits clean settings from the shared renderer",()=>{
 const context={window:{dispatchEvent(){}},CustomEvent:class {}};
 vm.runInNewContext(fs.readFileSync("standalone-pattern-registry-v1.js","utf8"),context);
 const reg=context.window.SetkaPatternRegistryV1;
 const packageFiles=fs.readdirSync(".").filter(f=>/^standalone-pattern-[a-z0-9-]+\.js$/.test(f));
 let count=0;
 for(const file of packageFiles){
  const s=fs.readFileSync(file,"utf8");
  const match=s.match(/^\/\* SETKA_PATTERN_DESCRIPTOR\n([\s\S]*?)\nEND_SETKA_PATTERN_DESCRIPTOR/);
  if(!match)continue;
  const d=JSON.parse(match[1]);if(!reg.has(d.id))reg.register(d);
  count++;
 }
 assert.ok(count>=8,"discover all standalone packages");
 for(const p of reg.list()){
  const labels=new Set();
  for(const [label,key,min,max,step,gesture,fingers] of p.controls){
   assert.equal(typeof label,"string",p.id);
   assert.doesNotMatch(label,/\b(бегунок|ползунок)\b/i,p.id+" uses a redundant visible title");
   assert.ok(!labels.has(key),p.id+" has duplicate slider key "+key);labels.add(key);
   assert.ok(Number.isFinite(min)&&Number.isFinite(max)&&step>0);
   assert.ok(fingers===0||fingers===1||fingers===2);
  }
 }
});
