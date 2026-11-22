import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('standalone-v34-cycle-logo3d.html','utf8');
const rotor=fs.readFileSync('experiments/standalone-cycle-dock-rotation-v1.js','utf8');
const css=fs.readFileSync('experiments/standalone-cycle-dock-rotation-v1.css','utf8');
const marker='<script>\n(function(){\n  "use strict";\n  // The native SETKA remains';
const from=html.indexOf(marker);
assert.ok(from>0,'horizontal-cycle script must be present');
const horizontal=html.slice(from+8,html.indexOf('</script>',from));

class Element{
  constructor(tag='div',id=''){
    this.tagName=tag;this.id=id;this.children=[];this.parentNode=null;
    this.attrs={};this.events={};this.classes=new Set();
    this.className='';
    this.style={setProperty(k,v){this[k]=v},removeProperty(k){delete this[k]}};
    this.hidden=false;this.inert=false;this.clientWidth=0;this.clientHeight=0;
    this.classList={
      add:(...names)=>names.forEach(n=>this.classes.add(n)),
      remove:(...names)=>names.forEach(n=>this.classes.delete(n)),
      contains:name=>this.classes.has(name),
      toggle:(name,on)=>{const v=on===undefined?!this.classes.has(name):!!on;v?this.classes.add(name):this.classes.delete(name);return v}
    };
  }
  appendChild(child){
    if(child.parentNode)child.parentNode.removeChild(child);
    child.parentNode=this;this.children.push(child);return child;
  }
  removeChild(child){const i=this.children.indexOf(child);assert.notEqual(i,-1);this.children.splice(i,1);child.parentNode=null}
  setAttribute(k,v){this.attrs[k]=String(v)}
  addEventListener(k,cb){(this.events[k]||=[]).push(cb)}
  setPointerCapture(){}
  querySelector(sel){
    if(sel==='iframe')return null;
    if(sel.startsWith('.'))return this.descendants().find(e=>e.className.split(' ').includes(sel.slice(1)))||null;
    return this.descendants().find(e=>e.tagName===sel)||null;
  }
  querySelectorAll(sel){
    if(sel==='.st-dock-icon')return this.descendants().filter(e=>e.className.split(' ').includes('st-dock-icon'));
    return [];
  }
  descendants(){return this.children.flatMap(e=>[e,...e.descendants()])}
  cloneNode(){const n=new Element(this.tagName);n.className=this.className;return n}
}
function fixture(initial='#setka'){
  const ids=new Map, mk=(id,tag='div')=>{const e=new Element(tag,id);ids.set(id,e);return e};
  const body=mk('body'),app=mk('app'),back=mk('setkaCycleBack');
  const lib=mk('libraryScreen'),game=mk('gameScreen'),nav=mk('st34Nav');
  const left=mk('setkaCycleReturn'),right=mk('setkaCycleOpen');
  lib.classList.add('active');
  body.appendChild(app);app.appendChild(lib);app.appendChild(game);
  body.appendChild(nav);body.appendChild(back);body.appendChild(left);body.appendChild(right);
  const icons=[],labels=[];
  for(let i=0;i<5;i++){
    const button=new Element('button');nav.appendChild(button);
    const icon=new Element('span');icon.className='st-dock-icon';
    const svg=new Element('svg');icon.appendChild(svg);
    const label=new Element('span');label.className='st-dock-label';
    button.appendChild(icon);button.appendChild(label);
    icons.push(icon);labels.push(label);
  }
  let tickId=0;const tasks=new Map;
  const raf=fn=>{tasks.set(++tickId,fn);return tickId};
  const context={
    document:{body,getElementById:id=>ids.get(id)||null,createElement:tag=>new Element(tag)},
    window:{addEventListener(){}},location:{pathname:'/Setka-web/standalone-v34-cycle-logo3d.html',search:'',hash:initial},
    history:{replaceState(){}},requestAnimationFrame:raf,cancelAnimationFrame:id=>tasks.delete(id),
    ResizeObserver:class{observe(){}},MutationObserver:class{observe(){}},innerWidth:390,console
  };
  vm.runInNewContext(rotor,context,{filename:'standalone-cycle-dock-rotation-v1.js'});
  vm.runInNewContext(horizontal,context,{filename:'standalone-v34-cycle-logo3d.horizontal.js'});
  const step=t=>{const e=tasks.entries().next().value;if(!e)throw Error('no scheduled frame');tasks.delete(e[0]);e[1](t)};
  step(0); // the horizontal module's initial outline-render RAF
  const angle=()=>Number.parseFloat(nav.style['--setka-cycle-dock-angle']);
  const faceOf=icon=>icon.children.filter(x=>x.className.includes('setka-cycle-icon-face'));
  return {body,app,back,nav,lib,game,left,right,icons,labels,window:context.window,step,angle,faceOf};
}

test('all five icons have real front/reverse glyphs, labels and stationary dock remain intact',()=>{
  const x=fixture('');
  assert.equal(x.nav.parentNode,x.body);
  for(let i=0;i<5;i++){
    assert.equal(x.icons[i].children.length,2);
    const faces=x.faceOf(x.icons[i]);assert.equal(faces.length,2);
    assert.equal(faces[0].children[0].tagName,'svg');
    assert.equal(faces[1].children[0].tagName,'svg');
    assert.equal(faces[1].children[0].attrs['aria-hidden'],'true');
    assert.equal(x.labels[i].parentNode,x.icons[i].parentNode);
  }
  x.window.SETKA_CYCLE_DOCK_ROTATION.render(57.25);
  assert.equal(x.angle(),57.25);
  x.window.SETKA_CYCLE_DOCK_ROTATION.render(-57.25);
  assert.equal(x.angle(),-57.25);
  for(const icon of x.icons)assert.equal(x.faceOf(icon).length,2,'no duplicate faces');
});

test('horizontal SETKA to cycle uses EXACT same live Y angle for every glyph',()=>{
  const x=fixture('');
  x.window.SETKA_CYCLE_LAB.flip(true);
  assert.equal(x.nav.parentNode,x.body,'dock shell must not rotate');
  x.step(0);x.step(160);
  const a=x.angle();
  assert.ok(Math.abs(a)>5 && Math.abs(a)<180,'rotation needs a true intermediate angle');
  const faceAngle=Number(x.app.style.transform.match(/rotateY\(([-\d.]+)deg\)/)?.[1]);
  assert.ok(Math.abs(faceAngle-a)<.001,'icons must share exact card Y angle');
  assert.equal(x.nav.style.transform,undefined,'dock shell must have no transform');
  x.step(900);
  assert.equal(x.angle(),180,'icons rest normally oriented on reverse face');
  assert.equal(x.window.SETKA_CYCLE_LAB.getSide(),'cycle');
  assert.equal(x.nav.parentNode,x.body);
  x.window.SETKA_CYCLE_LAB.flip(false);
  x.step(1100);x.step(1260);
  const b=x.angle();
  assert.ok(Math.abs(b)>5 && Math.abs(b)<180);
  const returnAngle=Number(x.app.style.transform.match(/rotateY\(([-\d.]+)deg\)/)?.[1]);
  assert.ok(Math.abs(returnAngle-b)<.001,'return swipe matches card');
  x.step(2000);
  assert.equal(x.angle(),0);
  assert.equal(x.window.SETKA_CYCLE_LAB.getSide(),'setka');
  assert.equal(x.nav.parentNode,x.body);
});

test('an edge drag controls icon and card signs together without intercepting nav',()=>{
  const x=fixture('');
  const down={pointerId:1,pointerType:'touch',clientX:375,clientY:310,button:0};
  x.right.events.pointerdown[0](down);
  x.right.events.pointermove[0]({...down,clientX:275,preventDefault(){}});
  const ang=x.angle();
  assert.ok(ang<0&&ang>-180);
  const swipeAngle=Number(x.app.style.transform.match(/rotateY\(([-\d.]+)deg\)/)?.[1]);
  assert.ok(Math.abs(swipeAngle-ang)<.001);
  assert.equal(x.nav.parentNode,x.body);
  x.right.events.pointerup[0]({...down,clientX:275});
});

test('reloading directly into #cycle starts the icon faces at 180 degrees',()=>{
  const x=fixture('#cycle');
  assert.equal(x.angle(),180);
  assert.equal(x.window.SETKA_CYCLE_LAB.getSide(),'cycle');
  assert.equal(x.nav.parentNode,x.body);
});

test('experiment only: fixed dock shell, readable reverse, and original vertical flip preserved',()=>{
  assert.match(html,/standalone-cycle-dock-rotation-v1\.js\?v=/);
  assert.match(html,/standalone-cycle-dock-rotation-v1\.css\?v=/);
  assert.match(html,/SETKA_CYCLE_DOCK_ROTATION\?\.render\(angle\)/);
  assert.match(html,/SETKA_CYCLE_DOCK_ROTATION\?\.rest\(inCycle\)/);
  assert.match(css,/#st34Nav \.setka-cycle-icon-rear/);
  assert.match(css,/-webkit-backface-visibility:hidden/);
  assert.doesNotMatch(css,/#st34Nav\s*\{[^}]*transform/);
  assert.match(html,/standalone-vertical-logo-v1\.js\?v=/);
});
