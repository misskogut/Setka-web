import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup() {
  const host={dispatchEvent(){}};
  const env={window:host,CustomEvent:class{},Math};
  vm.runInNewContext(fs.readFileSync('standalone-pattern-registry-v1.js','utf8'),env,{timeout:2000});
  const registry=host.SetkaPatternRegistryV1;
  const d={currentScript:{dataset:{patternId:'medusa'}}};
  vm.runInNewContext(fs.readFileSync('standalone-pattern-medusa.js','utf8'),
    {window:host,document:d,Math,Float32Array,WeakMap},{timeout:2000});
  return registry;
}
function sample(R,config,frame) {
  const shapes=[],fills=[];
  const ctx={
    save(){},restore(){},translate(){},scale(){},beginPath(){},moveTo(){},
    fillRect(x,y,w,h){fills.push(this.fillStyle);},
    arc(x,y,r){if(shapes.length<2000)shapes.push([Math.round(x*1000),Math.round(y*1000),Math.round(r*1000),this.fillStyle]);},
    fill(){}
  };
  R.render(ctx,600,600,config,frame,false,'medusa');
  return {shapes,fills};
}
test('Medusa joins the generic registry, starts monochrome, retains all nine palettes and 30-body control',()=>{
  const R=setup(),d=R.get('medusa');
  assert.ok(R.ready('medusa'));
  assert.equal(d.colorModes,9);
  assert.equal(d.version,2);
  assert.equal(d.schemaVersion,2);
  assert.deepEqual(Array.from(d.legacyVersions),[1],'older Medusa captures are still readable');
  assert.equal(d.tapOverflow,undefined);
  assert.equal(d.tapButtonLabel,undefined,'no add button is declared');
  assert.equal(d.controls.find(c=>c[1]==='medusaCount')[5],'Ползунок','count changes only by slider');
  assert.equal(d.controls.find(c=>c[1]==='medusaCount')[6],0,'no tap action for adding');
  assert.equal(d.defaults.speed,0.35);
  assert.deepEqual(Array.from(d.controls.find(c=>c[1]==='speed').slice(2,5)),[0.05,2,0.05]);
  assert.equal(d.controls.find(c=>c[1]==='swayStrength')[0],'Колебание щупалец');
  assert.deepEqual(Array.from(d.palettes[0]),[255,255,255]);
  assert.equal(d.defaults.medusaCount,3);
  assert.equal(d.controls.find(c=>c[1]==='medusaCount')[3],30);
  assert.equal(R.validate({...d.defaults,speed:0.05},'medusa').ok,true);
  assert.equal(R.validate({...d.defaults,medusaCount:30},'medusa').ok,true);
  assert.ok(R.hasInteraction('medusa'),'direct one-finger creature dragging is registered');
  assert.equal(R.normalize({...d.defaults,medusaCount:900},'medusa').medusaCount,30);
  assert.equal(R.validate({...d.defaults,medusaCount:900},'medusa').ok,false);
  const image=sample(R,d.defaults,44);
  assert.ok(image.fills.includes('#000'),'black canvas');
  assert.ok(image.shapes.length>40,'segmented, moving tentacles visible');
  assert.ok(image.shapes.every(s=>/^rgba\(255,255,255,/.test(s[3])),'white drawing only');
});
test('Adding medusae preserves the preceding creatures at the same replay frame',()=>{
  const R=setup(),base=R.defaults('medusa'),small=sample(R,base,44);
  const lots=sample(R,{...base,medusaCount:30},44);
  assert.deepEqual(lots.shapes.slice(0,small.shapes.length),small.shapes,
    'first animals unaffected by count — no rebuild of seeded paths');
  assert.ok(lots.shapes.length>small.shapes.length);
});
test('Same Medusa snapshot always recreates the same drawing independent of canvas / replay path',()=>{
  const R=setup(),c={...R.defaults('medusa'),medusaCount:8,colorModeIndex:8};
  const snap=JSON.parse(JSON.stringify(R.snapshot({patternId:'medusa',config:c,frame:65})));
  assert.equal(R.restore(snap).ok,true);
  assert.equal(snap.config.medusaCount,8);
  const first=sample(R,c,65),second=sample(R,R.restore(snap).snapshot.config,65);
  assert.deepEqual(first,second);
  assert.notDeepEqual(first.shapes,sample(R,c,75).shapes,'animation advances');
  assert.ok(first.shapes.some(s=>String(s[3]).startsWith('hsla(')),'rainbow/neon mode');
});

test('Medusa gesture interaction selects a body, drags it and releases without mutating count',()=>{
  const R=setup(),c=R.defaults('medusa'),w=600,h=600;
  // Choose the default first creature's head by sampling its radial origin.
  const near={x:0,y:0};
  const stage=sample(R,c,0),pt=stage.shapes.find(x=>x[2]>=5000);
  assert.ok(pt,'there is a visible body on frame zero');
  near.x=pt[0]/1000;near.y=pt[1]/1000;
  const chosen=R.interact('medusa',c,{type:'gesture',phase:'start',fingers:1,x:near.x,y:near.y,width:w,height:h,frame:0});
  assert.notEqual(chosen.dragIndex,-1,'nearest animal selected');
  const moved=R.interact('medusa',chosen,{type:'gesture',phase:'move',fingers:1,x:300,y:220,width:w,height:h,frame:2});
  assert.equal(moved.dragActive,true);
  assert.equal(moved.medusaCount,3);
  const released=R.interact('medusa',moved,{type:'gesture',phase:'end',fingers:1,x:300,y:220,width:w,height:h,frame:3});
  assert.equal(released.dragActive,false);
  assert.equal(R.validate(released,'medusa').ok,true);
});

test('Any new Medusa slider patch survives generic interaction reducer',()=>{
 const R=setup(),c=R.defaults('medusa');
 for(const [field,value] of [['medusaCount',1],['tentacleCount',6],['tentacleLength',20],['speed',.6],['sizeFactor',.8],['swayStrength',.5]]){
  const out=R.interact('medusa',c,{type:'patch',frame:14,patch:{[field]:value}});
  assert.equal(out[field],value,'slider '+field);
  assert.equal(R.validate(out,'medusa').ok,true);
 }
});

function headCenter(R,c,frame){
  const shapes=sample(R,c,frame).shapes;
  const arms=c.tentacleCount,len=c.tentacleLength;
  // The real renderer skips subpixel outer segments. Locate the first
  // creature's last drawn ring, not the theoretical segment count.
  const renderedRings=Array.from({length:len},(_,j)=>j)
    .filter(j=>10*c.sizeFactor*(len-j)/len>=.42).length;
  const bodyArcs=renderedRings*arms;
  const inner=shapes.slice(bodyArcs-arms,bodyArcs);
  assert.equal(inner.length,arms,'sample includes a full innermost ring');
  return {x:inner.reduce((sum,p)=>sum+p[0],0)/(arms*1000),
          y:inner.reduce((sum,p)=>sum+p[1],0)/(arms*1000)};
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

test('Medusa v2 slows movement without freezing tentacle physics, and rests in one position',()=>{
  const R=setup(),base=R.defaults('medusa');
  const slow={...base,speed:0.05},normal={...base,speed:0.35};
  const origin=headCenter(R,slow,0);
  const slowShift=distance(headCenter(R,slow,110),origin);
  const normalShift=distance(headCenter(R,normal,110),origin);
  assert.ok(normalShift>slowShift*1.5,
    'slower swim must advance much less in the same real-frame interval');
  let foundRest=false;
  for(let t=180;t<=540;t+=30){
    const a=headCenter(R,normal,t),b=headCenter(R,normal,t+12);
    if(distance(a,b)>0.002)continue;
    const before=sample(R,normal,t),after=sample(R,normal,t+12);
    assert.notDeepEqual(before.shapes,after.shapes,
      'during a true positional rest, the inertial tentacles must still move');
    foundRest=true;
    break;
  }
  assert.equal(foundRest,true,'a stationary dwell follows each slow crossing');
  assert.ok(R.validate(slow,'medusa').ok);
});

test('Updated Medusa retains its historic ID and v1 captures without changing stored originals',()=>{
 const R=setup(),base=R.defaults('medusa');
 const previous={version:3,schemaVersion:2,configSchemaVersion:1,
   patternId:'medusa',patternVersion:1,frame:300,
   config:{...base,speed:1}};
 const copy=JSON.stringify(previous),old=R.restore(previous);
 assert.equal(old.ok,true,old.reason);
 assert.equal(old.snapshot.patternVersion,1);
 assert.equal(old.snapshot.config.speed,1);
 assert.equal(JSON.stringify(previous),copy,'do not rewrite original stored captures');
 const latest=R.snapshot({patternId:'medusa',config:base,frame:500});
 assert.equal(latest.patternVersion,2);
 assert.equal(R.restore(latest).ok,true);
 assert.equal(R.get('medusa').introducedAt,undefined,'publication timestamp remains the source descriptor, not a new package');
});
