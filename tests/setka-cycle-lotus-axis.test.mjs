import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const js=fs.readFileSync("experiments/standalone-cycle-lotus-direct-v1.js","utf8");
const css=fs.readFileSync("experiments/standalone-cycle-lotus-direct-v1.css","utf8");
const host=fs.readFileSync("standalone-v34-cycle-logo3d.html","utf8");
const canonical=fs.readFileSync("standalone-v34.html","utf8");
function fake(){
 const nodes=new Map();
 function element(name){
  const e={nodeName:name,children:[],parentNode:null,style:{setProperty(k,v){this[k]=v}},
   dataset:{},isConnected:true,className:"",attrs:{},
   setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]},
   appendChild(n){if(n.parentNode)n.parentNode.children.splice(n.parentNode.children.indexOf(n),1);
    this.children.push(n);n.parentNode=this;return n},
   remove(){if(this.parentNode){this.parentNode.children.splice(this.parentNode.children.indexOf(this),1);this.parentNode=null}},
   querySelector(q){if(q==="svg.cycle-lotus")return this.children.find(c=>c.nodeName==="svg")||null;return null},
   closest(q){return q===".cycle-lotus-button"&&this.parentNode===button?button:null},
   attachShadow(){this.shadowRoot=element("shadow-root");return this.shadowRoot},
   getBoundingClientRect(){return {left:0,top:0,width:390,height:800}}
  };
  nodes.set(name+"-"+nodes.size,e);return e;
 }
 const svg=element("svg"),button=element("button"),hero=element("hero");
 button.appendChild(svg);
 const doc={querySelector(q){
  if(q===".cycle-lotus-button")return button;
  if(q===".cycle-hero")return hero;
  return null;
 }};
 const iframe=element("iframe");
 iframe.contentDocument=doc;
 iframe.contentWindow={getComputedStyle(){return {getPropertyValue(){return "#b985ef"}}}};
 iframe.addEventListener=()=>{};
 const back=element("aside");
 back.querySelector=q=>q==="iframe"?iframe:null;
 const body=element("body");
 const document={body,createElement:element,getElementById:id=>id==="setkaCycleBack"?back:null};
 const window={addEventListener(){}};
 vm.runInNewContext(js,{document,window,console,Math,Number},{filename:"standalone-cycle-lotus-direct-v1.js"});
 return{api:window.SETKA_CYCLE_LOTUS_AXIS,svg,button,back,body};
}
test("one original ALMA SVG is MOVED (not copied) and restored after both swipes",()=>{
 const{api,svg,button,back,body}=fake();
 assert.equal(button.querySelector("svg.cycle-lotus"),svg);
 assert.equal(api.start(),true);
 assert.equal(button.querySelector("svg.cycle-lotus"),null,"the source node is not duplicated");
 api.render(.75,-1);
 assert.equal(api.getInfo().originalIn3D,true);
 assert.equal(api.getInfo().portalVisible,"visible");
 assert.equal(api.getInfo().counterYaw,-45);
 api.rest();
 assert.equal(button.querySelector("svg.cycle-lotus"),svg);
 assert.equal(api.getInfo().originalRestored,true);
 api.start();api.render(.65,1);
 assert.equal(api.getInfo().originalIn3D,true);
 api.rest();
 assert.equal(button.querySelector("svg.cycle-lotus"),svg);
 assert.equal(body.children.filter(c=>c.id==="setkaCycleLotusDirectPortal").length,1);
});
test("counter-rotating original native SVG stays viewer-facing in BOTH directions",()=>{
 const{api}=fake();
 for(const d of [-1,1])for(const p of [0,.1,.25,.4,.49,.5,.6,.75,.9,1]){
  const state=api.geometry(p,d);
  assert.equal(state.cardYaw+state.counterYaw,0);
  assert.equal(state.yaw,0);
  assert.equal(state.opacity,1);
 }
 api.start();api.render(.49,-1);
 assert.equal(api.getInfo().portalVisible,"hidden","squishes are opaque");
 api.render(.5,-1);
 assert.equal(api.getInfo().portalVisible,"visible","ALMA owns the real 3D lotus");
 api.rest();
});
test("source uses original React SVG, never shader, clone, screen masks or material substitution",()=>{
 assert.match(js,/holder\.appendChild\(svg\)/);
 assert.match(js,/button\.appendChild\(svg\)/);
 assert.match(js,/portal\.appendChild\(holder\)/);
 assert.match(js,/document\.body\.appendChild\(portal\)/);
 assert.match(js,/worldYaw=g\.cardYaw\+g\.counterYaw/);
 assert.match(js,/\.cycle-lotus-button/);
 assert.doesNotMatch(js,/attachShadow|shadowRoot/,"iPhone WebKit must not flatten the 3D chain");
 assert.match(js,/rotateY\(/);
 assert.doesNotMatch(js,/cloneNode|getContext\(["']webgl|createTexture|texture2D|new Image\(|createElement\(["']svg/);
 assert.doesNotMatch(css,/clip-path|mask:|canvas|opacity:0/);
 assert.match(host,/standalone-cycle-lotus-direct-v1.js\?v=20261124-original-lotus-world-axis-v11/);
 assert.match(host,/standalone-cycle-lotus-direct-v1.css\?v=20261124-original-lotus-world-axis-v11/);
 assert.doesNotMatch(host,/standalone-cycle-lotus-axis-v1\./);
 assert.doesNotMatch(canonical,/standalone-cycle-lotus-direct-v1/);
});
