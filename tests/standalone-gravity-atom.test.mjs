import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("gravity atom accepts normal slider patches without breaking finger gravity",()=>{
 const source=fs.readFileSync("standalone-pattern-gravity-atom.js","utf8");
 let handler=null,renderer=null;
 const registry={
  has:id=>id==="gravity-atom",
  bindRenderer:(_id,fn)=>{renderer=fn},
  bindInteraction:(_id,fn)=>{handler=fn}
 };
 const context={
  window:{SetkaPatternRegistryV1:registry},
  document:{currentScript:{dataset:{patternId:"gravity-atom"}}}
 };
 vm.runInNewContext(source,context);
 assert.equal(typeof handler,"function");
 assert.equal(typeof renderer,"function");
 const original={patternId:"gravity-atom",shape:1,gravity:55,atomForce:48,fingerActive:0,fingerX:0,fingerY:0};
 const patched=handler(original,{type:"patch",patch:{shape:0,gravity:72}});
 assert.equal(patched.shape,0);
 assert.equal(patched.gravity,72);
 assert.equal(patched.atomForce,48);
 assert.equal(original.shape,1,"canonical source is not mutated");
 const touched=handler(patched,{type:"gesture",phase:"start",fingers:1,x:173,y:204});
 assert.equal(touched.fingerActive,1);
 assert.equal(touched.fingerX,173);
 assert.equal(touched.fingerY,204);
 assert.equal(touched.gravity,72,"finger movement must not reset sliders");
 const ended=handler(touched,{type:"gesture",phase:"end",fingers:1});
 assert.equal(ended.fingerActive,0);
 assert.equal(ended.shape,0,"finger release must preserve slider changes");
});
