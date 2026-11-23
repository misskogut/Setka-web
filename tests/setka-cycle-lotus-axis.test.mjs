import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const js=fs.readFileSync("experiments/standalone-cycle-lotus-axis-v1.js","utf8");
const css=fs.readFileSync("experiments/standalone-cycle-lotus-axis-v1.css","utf8");
const host=fs.readFileSync("standalone-v34-cycle-logo3d.html","utf8");
const canonical=fs.readFileSync("standalone-v34.html","utf8");

function element(id=""){
 const children=[];
 const node={
  id,children,style:{
   setProperty(name,value){this[name]=value;}
  },
  classList:{add(){},remove(){}},
  dataset:{},
  attributes:new Map(),
  setAttribute(name,value){this.attributes.set(name,value);},
  getAttribute(name){return this.attributes.get(name)||null;},
  removeAttribute(name){this.attributes.delete(name);},
  querySelectorAll(){return []},
  appendChild(child){children.push(child);child.parentNode=this;return child;},
  remove(){this.removed=true},
  getBoundingClientRect(){return {left:0,top:174,width:390,height:278}}
 };
 return node;
}
function harness(){
 const svg=element("lotus");
 svg.cloneNode=()=>{
  const clone=element("original-lotus");
  clone.classList={add(c){clone.extraClass=c}};
  return clone;
 };
 const button=element("button");
 button.querySelector=selector=>selector==="svg.cycle-lotus"?svg:null;
 const iframe={
  clientWidth:390,
  contentDocument:{querySelector:selector=>selector===".cycle-lotus-button"?button:null},
  contentWindow:{getComputedStyle(){return {getPropertyValue(){return""}}}},
  getBoundingClientRect(){return {left:14,top:12,width:390,height:720}},
  handlers:{},
  addEventListener(name,handler){this.handlers[name]=handler}
 };
 const back={querySelector:x=>x==="iframe"?iframe:null};
 const body=element("body");
 const document={
  body,
  getElementById:id=>id==="setkaCycleBack"?back:null,
  createElement:()=>element()
 };
 const window={};
 vm.runInNewContext(js,{document,window,Math,Number,console},{filename:"standalone-cycle-lotus-axis-v1.js"});
 return {api:window.SETKA_CYCLE_LOTUS_AXIS,body,svg,iframe};
}

test("lotus looks at viewer when card is exactly edge-on, but half is occluded",()=>{
 const {api}=harness();
 for(const direction of [-1,1]){
  const mid=api.geometry(.5,direction);
  assert.equal(mid.yaw,0);
  assert.equal(mid.visibleFraction,.5);
  assert.equal(mid.hide,50);
  assert.equal(mid.opacity,1);
  assert.equal(mid.enabled,true);
  assert.equal(mid.clip,direction<0?"inset(0 50.000% 0 0)":"inset(0 0 0 50.000%)");
 }
});

test("lotus has its own synchronized Y rotation; card remains physically independent",()=>{
 const {api}=harness();
 const left=[0,.25,.5,.75,1].map(p=>api.geometry(p,-1).yaw);
 const right=[0,.25,.5,.75,1].map(p=>api.geometry(p,1).yaw);
 assert.deepEqual(left,[-90,-45,0,45,90]);
 assert.deepEqual(right,[90,45,0,-45,-90]);
 assert.equal(api.geometry(0,-1).enabled,false);
 assert.equal(api.geometry(1,-1).enabled,false);
 assert.ok(api.geometry(.8,-1).visibleFraction>.5);
});

test("original ALMA SVG is cloned only for turning, never moved or modified",()=>{
 const {api,body,svg}=harness();
 api.start();
 assert.equal(body.children.length,1);
 const overlay=body.children[0];
 assert.equal(overlay.id,"setkaCycleLotusTurn");
 assert.equal(overlay.attributes.get("aria-hidden"),"true");
 assert.notEqual(overlay.children[0].children[0],svg,"mirror must be a clone");
 api.render(.5,-1);
 assert.equal(overlay.style.clipPath,"inset(0 50.000% 0 0)");
 assert.equal(overlay.children[0].style.transform,"perspective(1450px) rotateY(0.000deg)");
 assert.equal(overlay.dataset.cardEdge,"true");
 api.render(.5,1);
 assert.equal(overlay.style.clipPath,"inset(0 0 0 50.000%)");
 api.rest();
 assert.equal(overlay.removed,true);
 assert.equal(api.getInfo().turning,false);
 assert.equal(svg.removed,undefined,"do not detach original ALMA lotus");
});

test("only experimental SETKA page gets the Y-axis lotus animation, not the canonical front",()=>{
 assert.match(host,/standalone-cycle-lotus-axis-v1\.js\?v=20261123-lotus-3d-half-edge/);
 assert.match(host,/standalone-cycle-lotus-axis-v1\.css\?v=20261123-lotus-3d-half-edge/);
 assert.match(host,/SETKA_CYCLE_LOTUS_AXIS\?\.start\(\)/);
 assert.match(host,/SETKA_CYCLE_LOTUS_AXIS\?\.render\(progress,direction\)/);
 assert.match(host,/SETKA_CYCLE_LOTUS_AXIS\?\.rest\(\)/);
 assert.ok(host.indexOf("standalone-cycle-lotus-axis-v1.js")<host.indexOf("function setAtRest(cycle)"));
 assert.doesNotMatch(canonical,/standalone-cycle-lotus-axis-v1/);
 assert.match(css,/pointer-events:none!important/);
 assert.match(css,/body:not\(\.cycle-flip-active\)/);
});
