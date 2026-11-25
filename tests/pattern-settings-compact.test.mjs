import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const file="standalone-pattern-key-v1.js",code=fs.readFileSync(file,"utf8");
test("settings avoid redundant slider words and visible numeric labels",()=>{
 assert.doesNotMatch(code,/ТОЛЬКО БЕГУНКОМ|Тап по паттерну|можно менять бегунком/);
 assert.doesNotMatch(code,/className="sk-value"|document\.createElement\("output"\)/);
 assert.doesNotMatch(code,/head\.textContent=kind===/);
 assert.match(code,/line\.append\(input,gestureButton\);box\.append\(title,line\)/);
 assert.match(code,/head\.textContent="Назначить жест"/);
 assert.match(code,/info\.onclick=\(\)=>showGestureHelp\(popup,showMenu\)/);
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


test("gesture bindings preserve factory behavior, resolve conflicts, route moves, and reset",()=>{
 const rows=[["A","a",0,100,1,"Слева ↑↓",1],["B","b",0,100,1,"Справа ↑↓",1],["C","c",0,100,1,"Ползунок",0],["Zoom","zoom",.2,5,.01,"Пинч",2]];
 const memory={},storage={getItem:k=>memory[k]||null,setItem:(k,v)=>{memory[k]=v}};
 const window={SetkaPatternRegistryV1:{controls:()=>rows},SetkaDataScopeV1:{storage},addEventListener(){}};
 const marker='\n(()=>{\n"use strict";\nconst App=';
 assert.ok(code.includes(marker));
 vm.runInNewContext(code.slice(0,code.indexOf(marker)),{window,localStorage:storage});
 const b=window.SetkaGestureBindingsV1,c={a:50,b:50,c:50,zoom:1,physics:2};
 assert.equal(b.snapshot("x",c),null);
 b.assign("x","b","1:left:v");
 assert.equal(b.plan("x").mapping.a,"none");
 assert.equal(b.plan("y").mapping.a,"1:left:v");
 const input={x:10,y:50,sx:10,sy:40,dx:0,dy:-20,width:100,height:200,fingers:1,pinch:null};
 const next=b.apply("x",{...c,a:60,physics:5},b.snapshot("x",c),input);
 assert.equal(next.a,50);assert.equal(next.b,60);assert.equal(next.physics,5);
 b.clearMotion();b.assign("x","c","2:bottom:h");
 assert.equal(b.apply("x",c,b.snapshot("x",c),{...input,sx:50,sy:185,dx:20,dy:0,fingers:2,pinch:1}).c,70);
 b.reset("x");assert.equal(b.snapshot("x",c),null);
});
