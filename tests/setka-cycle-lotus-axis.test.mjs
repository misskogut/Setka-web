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
  classList:{_set:new Set(),add(name){this._set.add(name)},remove(name){this._set.delete(name)},contains(name){return this._set.has(name)}},
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
  contentDocument:{
   querySelector:selector=>selector===".cycle-lotus-button"?button:null,
   documentElement:element("html"),
   head:element("head"),
   createElement:()=>element(),
   getElementById(id){return this.head.children.find(x=>x.id===id)||null}
  },
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

test("lotus always faces the viewer: local yaw exactly cancels card turn at EVERY angle",()=>{
 const {api}=harness();
 for(const direction of [-1,1]){
  for(const p of [0,.1,.25,.33,.49,.5,.51,.66,.75,.9,1]){
   const g=api.geometry(p,direction);
   assert.equal(g.yaw,0,"world orientation is face-on even between endpoints");
   assert.ok(Math.abs(g.cardYaw+g.counterYaw)<1e-8,
    "lotus counter-rotates exactly opposite its card at progress "+p);
   assert.equal(g.visibleFraction,p,"physical card exposes an increasing fraction");
   assert.equal(g.opacity,1,"no artificial fade or sudden disappearance");
  }
  const cycle=api.geometry(1,direction);
  assert.equal(cycle.cardYaw,0,"lotus starts coplanar with the cycle card");
  assert.equal(cycle.visibleFraction,1);
  assert.equal(cycle.enabled,true);
  const edge=api.geometry(.5,direction);
  assert.equal(Math.abs(edge.counterYaw),90);
  assert.equal(edge.visibleFraction,.5);
  const setka=api.geometry(0,direction);
  assert.equal(setka.visibleFraction,0,"behind SETKA");
  assert.equal(setka.enabled,false);
 }
});

test("original ALMA SVG is cloned only for turning, never moved or modified",()=>{
 const {api,body,svg,iframe}=harness();
 api.start();
 assert.equal(body.children.length,1);
 const overlay=body.children[0];
 assert.equal(overlay.id,"setkaCycleLotusTurn");
 assert.equal(overlay.attributes.get("aria-hidden"),"true");
 const mask=overlay.children[0];
 const pivot=mask.children[0];
 assert.equal(mask.className,"setka-cycle-lotus-turn-mask");
 assert.notEqual(pivot.children[0],svg,"mirror must be a clone");
 api.render(.5,-1);
 assert.equal(mask.style.width,"50.000%","real overflow viewport cuts the visual in half");
 assert.equal(mask.style.left,"0.00px");
 assert.equal(pivot.style.left,"0.00px");
 assert.equal(pivot.style.transform,"perspective(1450px) rotateY(0.000deg)");
 assert.equal(overlay.dataset.cardEdge,"true");
 assert.equal(overlay.dataset.worldYaw,"0.000");
 assert.equal(overlay.dataset.cardYaw,"90.000");
 assert.equal(overlay.dataset.counterYaw,"-90.000");
 assert.equal(iframe.contentDocument.documentElement.classList.contains("setka-cycle-hides-original-lotus"),true,
  "only the projection is visible during rotation, never two flowers");
 assert.equal(iframe.contentDocument.head.children.length,1,"original is hidden with one iframe-local style");
 api.render(.5,1);
 assert.equal(mask.style.width,"50.000%");
 assert.equal(mask.style.left,"195.00px");
 assert.equal(pivot.style.left,"-195.00px","keep original SVG center despite mask crop");
 api.render(.97,1);
 assert.equal(iframe.contentDocument.documentElement.classList.contains("setka-cycle-hides-original-lotus"),true,
  "native flower cannot return until card stops rotating");
 assert.equal(mask.style.width,"97.000%","fully front-facing lotus grows behind physical card");
 api.render(1,1);
 assert.equal(mask.style.width,"100.000%","lotus becomes fully visible when coplanar with card");
 assert.equal(pivot.style.transform,"perspective(1450px) rotateY(0.000deg)");
 api.render(0,1);
 assert.equal(overlay.style.display,"none","no flower through SETKA face");
 assert.equal(iframe.contentDocument.documentElement.classList.contains("setka-cycle-hides-original-lotus"),true,
  "the original is still hidden until the card is reset");
 api.rest();
 assert.equal(overlay.removed,true);
 assert.equal(api.getInfo().turning,false);
 assert.equal(iframe.contentDocument.documentElement.classList.contains("setka-cycle-hides-original-lotus"),false,
  "no hidden original remains after a cancelled or completed turn");
 assert.equal(svg.removed,undefined,"do not detach original ALMA lotus");
});

test("only experimental SETKA page gets the Y-axis lotus animation, not the canonical front",()=>{
 assert.match(host,/standalone-cycle-lotus-axis-v1\.js\?v=20261123-counterrotating-face-on-360/);
 assert.match(host,/standalone-cycle-lotus-axis-v1\.css\?v=20261123-counterrotating-face-on-360/);
 assert.match(host,/SETKA_CYCLE_LOTUS_AXIS\?\.start\(\)/);
 assert.match(host,/SETKA_CYCLE_LOTUS_AXIS\?\.render\(progress,direction\)/);
 assert.match(host,/SETKA_CYCLE_LOTUS_AXIS\?\.rest\(\)/);
 assert.ok(host.indexOf("standalone-cycle-lotus-axis-v1.js")<host.indexOf("function setAtRest(cycle)"));
 assert.doesNotMatch(canonical,/standalone-cycle-lotus-axis-v1/);
 assert.match(css,/pointer-events:none!important/);
 assert.ok(css.includes("body:not(.cycle-flip-active)"),"overlay never paints at rest");
 assert.ok(css.includes(".setka-cycle-lotus-turn-mask{"),"physical overflow clipping layer exists");
 assert.match(css,/overflow:hidden/);
 assert.doesNotMatch(css,/will-change:opacity,clip-path/);
});
