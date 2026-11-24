import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const js=fs.readFileSync("experiments/standalone-cycle-lotus-direct-v1.js","utf8");
const css=fs.readFileSync("experiments/standalone-cycle-lotus-direct-v1.css","utf8");
const host=fs.readFileSync("standalone-v34-cycle-logo3d.html","utf8");
const canonical=fs.readFileSync("standalone-v34.html","utf8");
function fake(){
 function node(tag){
  const children=[];const attrs={};
  const el={tagName:tag,children,parentNode:null,isConnected:true,dataset:{},
   style:{setProperty(k,v){this[k]=v},removeProperty(k){delete this[k]}},
   setAttribute(k,v){attrs[k]=v},
   getBoundingClientRect(){return{left:0,top:0,width:390,height:680}},
   appendChild(n){if(n.parentNode){const i=n.parentNode.children.indexOf(n);if(i>=0)n.parentNode.children.splice(i,1)}children.push(n);n.parentNode=this;return n},
   querySelector(q){if(q==="svg.cycle-lotus")return children.find(x=>x.tagName==="svg")||null;return null},
   closest(q){return q===".cycle-lotus-button"&&this.parentNode===button?button:null}
  };return el;
 }
 const svg=node("svg"),button=node("button"),hero=node("div"),back=node("aside"),iframe=node("iframe"),card=node("div"),volume=node("div");
 svg.querySelectorAll=()=>[node("path"),node("path"),node("path")];
 button.appendChild(svg);
 iframe.contentDocument={querySelector(q){return q===".cycle-lotus-button"?button:q===".cycle-hero"?hero:null}};
 iframe.contentWindow={getComputedStyle(){return{getPropertyValue(){return "#a45dec"}}}};
 iframe.addEventListener=()=>{};
 back.querySelector=q=>q==="iframe"?iframe:null;
 const document={getElementById(id){return{idBack:back,setkaCycleBack:back,setkaCycle3DCard:card,setkaCycleCardVolume:volume}[id]||null},createElement:node};
 const window={addEventListener(){}};
 vm.runInNewContext(js,{document,window,console,Math,Number},{filename:"native-alma-3d.js"});
 return{api:window.SETKA_CYCLE_LOTUS_AXIS,svg,button,card,volume,back};
}
test("original SVG adopts same card-local perspective space, no duplication",()=>{
 const {api,svg,button,card}=fake();
 assert.equal(api.start(),true);
 assert.equal(button.querySelector("svg.cycle-lotus"),null);
 for(const d of [-1,1])for(const p of [.5,.6,.75,.9,1]){
  api.render(p,d);
  const i=api.getInfo();
  assert.equal(i.common3DScene,true);
  assert.equal(i.originalIn3D,true);
  assert.equal(i.cardYaw+i.counterYaw,0);
  assert.equal(i.volumeVisible,true);
  assert.equal(i.originalPetalCount,3);
  assert.equal(i.real3D,true);
 }
 api.rest();
 assert.equal(button.querySelector("svg.cycle-lotus"),svg);
 assert.equal(api.getInfo().originalRestored,true);
});
test("physical card and lotus intersect, rather than mimicking depth with path stretching",()=>{
 const {api}=fake();
 assert.equal(api.geometry(.5,-1).submergedSide,"left");
 assert.equal(api.geometry(.5,1).submergedSide,"right");
 assert.equal(api.geometry(.75,-1).cardYaw,45);
 assert.equal(api.geometry(.75,-1).counterYaw,-45);
 assert.match(js,/holder\.style\.transform="rotateY\("/);
 assert.match(js,/card\.appendChild\(portal\)/);
 assert.match(js,/volume\.style\.setProperty\("--cycle-inner-opacity"/);
 assert.doesNotMatch(js,/scaleX\(|petal\.path\.style\.transform|cloneNode|createElement\("svg"\)/);
 assert.match(css,/#setkaCycleCardVolume/);
 assert.match(css,/translateZ\(calc\(-1 \* var\(--cycle-depth\)\)\)/);
 assert.match(css,/#setkaCycle3DWorld\{[\s\S]*perspective:1450px/);
 assert.match(host,/<div id="setkaCycle3DWorld"/);
 assert.match(host,/card3D\.style\.transform="rotateY\("/);
 assert.doesNotMatch(host,/back\.style\.transform="perspective\(1450px\)/);
 assert.match(host,/standalone-cycle-lotus-direct-v1.js\?v=20261124-alma-common-3d-volume-v17/);
 assert.doesNotMatch(canonical,/setkaCycle3DCard/);
});
