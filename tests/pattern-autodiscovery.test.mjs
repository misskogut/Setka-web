import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

function workspace(){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'setka-patterns-'));
 fs.mkdirSync(path.join(tmp,'scripts'));
 for(const file of ['standalone-pattern-registry-v1.js','scripts/build-pattern-manifest.mjs']){
  fs.copyFileSync(file,path.join(tmp,file));
 }
 // The test workspace, like the production build, discovers all new pattern
 // modules from files. Never manually append the next pattern to test setup.
 for(const file of fs.readdirSync('.').filter(name=>/^standalone-pattern-[a-z0-9-]+\.js$/.test(name))){
  if(fs.readFileSync(file,'utf8').startsWith('/* SETKA_PATTERN_DESCRIPTOR'))fs.copyFileSync(file,path.join(tmp,file));
 }
 return tmp;
}
function build(dir){
 execFileSync(process.execPath,['scripts/build-pattern-manifest.mjs'],{cwd:dir,stdio:'pipe'});
 return {
  source:fs.readFileSync(path.join(dir,'standalone-pattern-registry-v1.js'),'utf8'),
  manifest:JSON.parse(fs.readFileSync(path.join(dir,'setka-pattern-manifest-v1.json'),'utf8'))
 };
}
function loadRegistry(source){
 const context={window:{dispatchEvent(){}},CustomEvent:class{}};
 vm.runInNewContext(source,context,{timeout:1500});
 return context.window.SetkaPatternRegistryV1;
}
const mini=(id,extra={})=>({
 id,title:id,version:1,schemaVersion:1,introducedAt:'2026-10-22T00:00:00.000Z',module:'standalone-pattern-'+id+'.js',
 defaults:{speed:1,seed:123,colorModeIndex:0},
 controls:[['Скорость','speed',0.1,10,0.1,'←→',1]],
 colorModes:2,palettes:[[255,255,255],[0,200,255]],...extra
});
const packageContent=meta=>'/* SETKA_PATTERN_DESCRIPTOR\n'+JSON.stringify(meta,null,2)+'\nEND_SETKA_PATTERN_DESCRIPTOR */\n'+
 'window.SetkaPatternRegistryV1.bindRenderer(document.currentScript.dataset.patternId,()=>{});\n';

test('every automatically discovered pattern renders its real white-on-black start and deterministic snapshots',()=>{
 const dir=workspace();
 try{
  const {source,manifest}=build(dir),registry=loadRegistry(source);
  const packages=registry.list().filter(p=>p.module&&fs.existsSync(path.join(dir,p.module)));
  assert.ok(packages.length>=1,'the remaining Rain module is discovered without a fixed pattern count');
  assert.equal(packages.length,fs.readdirSync(dir).filter(n=>/^standalone-pattern-[a-z0-9-]+\.js$/.test(n)&&fs.readFileSync(path.join(dir,n),'utf8').startsWith('/* SETKA_PATTERN_DESCRIPTOR')).length);
  for(const pattern of packages){
   const descriptor=pattern;
   const document={currentScript:{dataset:{patternId:pattern.id}}};
   vm.runInNewContext(fs.readFileSync(path.join(dir,pattern.module),'utf8'),
      {window:{SetkaPatternRegistryV1:registry},document,Math},{timeout:1500});
   assert.equal(registry.ready(pattern.id),true,'runtime renderer '+pattern.id);
   const c=registry.defaults(pattern.id);
   assert.deepEqual(JSON.parse(JSON.stringify(descriptor.palettes[c.colorModeIndex])),[255,255,255],'white initial mode '+pattern.id);
   const snap=JSON.parse(JSON.stringify(registry.snapshot({patternId:pattern.id,config:c,frame:44})));
   assert.equal(registry.restore(snap).ok,true,'immutable snapshot '+pattern.id);
   assert.ok(manifest.patterns.some(p=>p.id===pattern.id),'same manifest '+pattern.id);
   function trace(config,frame){
     const strokes=[],fills=[],gradientStops=[],shapes=[];
     let start,end,totalStrokes=0,lastArc=null,rotation=0,totalArcs=0;
     const ctx={
       save(){},restore(){},translate(){},scale(){},rotate(a){rotation=a},beginPath(){},closePath(){},
       fillRect(x,y,w,h){fills.push(this.fillStyle);
         if(this.fillStyle!=='#000'&&shapes.length<24)shapes.push({kind:'rect',x,y,w,h,color:this.fillStyle})},
       arc(x,y,r){totalArcs++;lastArc={x,y,r}}, 
       fill(){if(lastArc&&shapes.length<24)shapes.push({kind:'circle',...lastArc,color:this.fillStyle});lastArc=null},
       createLinearGradient(){const stops=[];gradientStops.push(stops);return {__stops:stops,addColorStop(_,v){stops.push(v)}}},
       moveTo(x,y){start=[x,y]},
       lineTo(x,y){end=[x,y]},
       stroke(){totalStrokes++;if(strokes.length<20)strokes.push({start,end,rotation,color:typeof this.strokeStyle==='string'?this.strokeStyle:this.strokeStyle.__stops.slice()});}
     };
     registry.render(ctx,250,250,config,frame,true,pattern.id);
     return {strokes,fills,gradientStops,totalStrokes,totalArcs,shapes};
   }
   // A future unknown package declaring a trail control must show a visibly
   // different, deterministic exposure at a fixed replay frame. This is
   // enforced by feature contract, not by a hardcoded pattern ID.
   if(pattern.controls.some(row=>row[1]==='trail')){
     const clear=trace({...c,trail:0},220),trailed=trace({...c,trail:100},220);
     assert.ok(trailed.totalStrokes>clear.totalStrokes,
       'trail enables additional visible temporal samples: '+pattern.id);
     assert.notDeepEqual(trailed.strokes,clear.strokes,
       'trail visually changes the same replay frame: '+pattern.id);
     assert.deepEqual(trailed,trace({...c,trail:100},220),
       'trail remains deterministic on direct-open notes/research: '+pattern.id);
   }
   const a=trace(c,44),b=trace(c,44);
   assert.ok(a.fills.includes('#000'),'real black canvas '+pattern.id);
   assert.ok(a.strokes.length>4||a.shapes.length>4||a.totalArcs>4,'actual dynamic art including batched dot paths '+pattern.id);
   assert.deepEqual(a,b,'deterministic replay '+pattern.id);
   // Some approved interactive patterns intentionally begin paused. Their
   // animated contract is verified after advancing the signed rotation slider,
   // while the default must remain static, exactly as the preview showed.
   const rotation=pattern.controls.find(row=>row[1]==='omega');
   const paused=rotation&&Number(c.omega)===0;
   const motion=paused?{...c,omega:Math.max(rotation[4],Math.min(rotation[3],.018))}:c;
   if(paused)assert.deepEqual(trace(c,44),trace(c,65),'zero angular velocity stays still '+pattern.id);
   assert.notDeepEqual(
     {strokes:trace(motion,44).strokes,shapes:trace(motion,44).shapes},
     {strokes:trace(motion,65).strokes,shapes:trace(motion,65).shapes},
     'the animation moves at nonzero speed '+pattern.id);
   const paint=[...a.strokes.map(st=>st.color).filter(x=>typeof x==='string'),...a.gradientStops.flat(),...a.shapes.map(item=>item.color)];
   assert.ok(paint.length>0,'visible stroke colors '+pattern.id);
   const mono=color=>/rgba\(255,255,255,/.test(color)||color==='rgb(255,255,255)'||color==='#fff';
   // A declared RGB displacement halo is not a colored main pattern. Keep the
   // initial WHITE geometric dots and allow only the three RGB overlay channels.
   // This generic capability is available to future unknown pattern modules.
   if(pattern.capabilities?.rgbGlitchOverlay===true&&c.glitchAlpha>0){
     assert.ok(paint.some(mono),'initial primary dots remain white '+pattern.id);
     assert.ok(paint.every(color=>mono(color)||['#ff0000','#00ff00','#0000ff'].includes(color)),
       'only RGB displacement channels may accompany white dots '+pattern.id);
   }else assert.ok(paint.every(mono),'first frame monochrome '+pattern.id);
 }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('retired patterns leave front/research catalogs without deleting old participant references',()=>{
 const dir=workspace();
 try{
  const {source,manifest}=build(dir),R=loadRegistry(source);
  const retiredId='orbital-threads';
  assert.equal(fs.existsSync(path.join(dir,'standalone-pattern-'+retiredId+'.js')),false,
    'retired renderer is not an active auto-discovered module');
  assert.equal(R.has(retiredId),false,'retired algorithm absent from active platform registry');
  assert.equal(manifest.patterns.some(p=>p.id===retiredId),false,
    'retired algorithm absent from server and research catalog');
  // Historical favorite/note identity cannot silently become another pattern.
  const archived={patternId:retiredId,patternVersion:1,
    config:{patternId:retiredId,colorModeIndex:0,trail:75},frame:91};
  const original=JSON.parse(JSON.stringify(archived));
  const restored=R.restore(archived);
  assert.equal(restored.ok,false);
  assert.equal(restored.reason,'unknown_pattern');
  assert.deepEqual(JSON.parse(JSON.stringify(restored.snapshot)),original);
  assert.deepEqual(archived,original,'old account payload is never rewritten by catalog retirement');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('a single pattern file automatically becomes one shared catalog, repeatedly and deterministically',()=>{
 const dir=workspace();
 try{
  const first=build(dir),R=loadRegistry(first.source);
  assert.ok(R.has('rain'));
  assert.equal(first.manifest.registryRevision,R.revision());
  assert.equal(first.manifest.patterns.length,R.list().length);
  assert.deepEqual(first.manifest.patterns.map(p=>p.id),JSON.parse(JSON.stringify(R.list())).map(p=>p.id));
  assert.deepEqual(R.defaults('rain').patternId,'rain');
  assert.ok(R.controls('rain').length>=4);
  assert.equal(R.validate(R.defaults('rain'),'rain').ok,true);
  const rain=R.get('rain');
  assert.equal(rain.defaults.colorModeIndex,3,'Rain must open in its original black-and-white palette');
  assert.deepEqual(JSON.parse(JSON.stringify(rain.palettes[rain.defaults.colorModeIndex])),[255,255,255]);
  assert.deepEqual(JSON.parse(JSON.stringify(rain.palettes[0])),[0,200,255],'saved blue mode stays blue');
  const second=build(dir);
  assert.equal(second.source,first.source,'same inputs may never create registry drift');
  assert.deepEqual(second.manifest,first.manifest,'same inputs must produce the same manifest');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('release chronology, not alphabetical filenames, drives front and research catalog order',()=>{
 const dir=workspace();
 try{
  const {source,manifest}=build(dir),R=loadRegistry(source);
  const ids=R.list().map(p=>p.id);
  const descriptors=fs.readdirSync(dir).filter(name=>/^standalone-pattern-[a-z0-9-]+\.js$/.test(name))
    .map(name=>fs.readFileSync(path.join(dir,name),'utf8').match(/^\/\* SETKA_PATTERN_DESCRIPTOR\n([\s\S]*?)\nEND_SETKA_PATTERN_DESCRIPTOR/))
    .filter(Boolean).map(match=>JSON.parse(match[1]));
  const expected=descriptors.sort((a,b)=>Date.parse(a.introducedAt)-Date.parse(b.introducedAt)).at(-1).id;
  assert.equal(ids.at(-1),expected,'newest descriptor is last by release time');
  assert.equal(manifest.patterns.at(-1).id,expected,
   'front/research manifest agrees on newest active pattern');
  // A future ID sorts by introducedAt even when its filename comes first.
  fs.writeFileSync(path.join(dir,'standalone-pattern-aaa-future.js'),
    packageContent(mini('aaa-future',{introducedAt:'2026-11-05T12:00:00.000Z'})));
  const next=build(dir),after=loadRegistry(next.source).list().map(p=>p.id);
  assert.equal(after.at(-1),'aaa-future','newly released algorithm follows Rain by date');
  assert.equal(next.manifest.patterns.at(-1).id,'aaa-future');
  // Back-dated modules retain their real date order, not tap/filename order.
  fs.writeFileSync(path.join(dir,'standalone-pattern-zzz-past.js'),
    packageContent(mini('zzz-past',{introducedAt:'2026-10-21T17:45:00.000Z'})));
  const sorted=build(dir),order=loadRegistry(sorted.source).list().map(p=>p.id);
  assert.ok(order.indexOf('rain')<order.indexOf('zzz-past')&&
    order.indexOf('zzz-past')<order.indexOf('aaa-future'));
  assert.deepEqual(sorted.manifest.patterns.map(p=>p.id),Array.from(order));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('missing or invalid introduction date is rejected without corrupting catalog',()=>{
 const dir=workspace();
 try{
  const valid=build(dir),filename=path.join(dir,'standalone-pattern-no-release-date.js');
  for(const introducedAt of [undefined,'2026-10-21','2026-10-21T28:00:00.000Z']){
   fs.writeFileSync(filename,packageContent(mini('no-release-date',{introducedAt})));
   assert.throws(()=>build(dir),/Invalid\/duplicate pattern package/);
   assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'setka-pattern-manifest-v1.json'),'utf8')),valid.manifest);
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('later added modules are automatically discovered without editing registry, front, research or SQL',()=>{
 const dir=workspace();
 try{
  const initial=build(dir);
  for(const id of ['fixture-next','fixture-after']){
   fs.writeFileSync(path.join(dir,'standalone-pattern-'+id+'.js'),packageContent(mini(id)));
  }
  const next=build(dir),R=loadRegistry(next.source);
  for(const id of ['rain','fixture-next','fixture-after']){
   assert.ok(R.has(id));assert.ok(next.manifest.patterns.some(p=>p.id===id));
   assert.equal(R.restore(R.snapshot({patternId:id,config:R.defaults(id),frame:44})).ok,true);
  }
  assert.equal(next.manifest.patterns.length,initial.manifest.patterns.length+2);
  fs.rmSync(path.join(dir,'standalone-pattern-fixture-after.js'));
  const removed=build(dir);
  assert.equal(removed.manifest.patterns.length,next.manifest.patterns.length-1);
  assert.equal(loadRegistry(removed.source).has('fixture-after'),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('invalid package blocks the build before changing generated outputs',()=>{
 const dir=workspace();
 try{
  const valid=build(dir);
  const filename=path.join(dir,'standalone-pattern-invalid-auto.js');
  fs.writeFileSync(filename,packageContent(mini('invalid-auto',{controls:[['Broken','speed',9,1,1,'←→',1]]})));
  assert.throws(()=>build(dir));
  assert.equal(fs.readFileSync(path.join(dir,'standalone-pattern-registry-v1.js'),'utf8'),valid.source);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'setka-pattern-manifest-v1.json'),'utf8')),valid.manifest);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('automated discovery refuses undefined or fractional gesture finger counts',()=>{
 const dir=workspace();
 try{
  const before=build(dir);
  const filename=path.join(dir,'standalone-pattern-invalid-gesture.js');
  for(const count of [0.025,0.01,undefined,3]){
   const descriptor=mini('invalid-gesture',{
    controls:[['Speed','speed',0.1,10,0.1,'Снизу ←→',count]]
   });
   fs.writeFileSync(filename,packageContent(descriptor));
   assert.throws(()=>build(dir),/invalid_gesture_contract/);
   assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'setka-pattern-manifest-v1.json'),'utf8')),before.manifest);
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('no new standalone package may launch in color, even with valid controls',()=>{
 const dir=workspace();
 try{
  const valid=build(dir);
  const filename=path.join(dir,'standalone-pattern-invalid-color.js');
  fs.writeFileSync(filename,packageContent(mini('invalid-color',{
   defaults:{speed:1,seed:123,colorModeIndex:1}
  })));
  assert.throws(()=>build(dir),/black-white initial palette required|initial_palette_must_be_monochrome/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'setka-pattern-manifest-v1.json'),'utf8')),valid.manifest);
  fs.writeFileSync(filename,packageContent(mini('invalid-color',{palettes:undefined})));
  assert.throws(()=>build(dir),/black-white initial palette required/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('Rain draws actual white gradients on black in default mode and preserves blue when selected',()=>{
 const dir=workspace();
 try{
  const {source}=build(dir),R=loadRegistry(source),d={currentScript:{dataset:{patternId:'rain'}}};
  vm.runInNewContext(fs.readFileSync(path.join(dir,'standalone-pattern-rain.js'),'utf8'),
   {window:{SetkaPatternRegistryV1:R},document:d,Math},{timeout:1500});
  function capture(config){
   const gradients=[],fills=[];
   const ctx={
    save(){},restore(){},translate(){},scale(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},
    fillRect(){fills.push(this.fillStyle)},
    createLinearGradient(){const stops=[];gradients.push(stops);return {addColorStop(_position,color){stops.push(color)}}}
   };
   R.render(ctx,180,280,config,32,true,'rain');
   return {fills,gradients};
  }
  const initial=capture(R.defaults('rain'));
  assert.equal(initial.fills[0],'#000');
  assert.ok(initial.gradients.length>0);
  assert.ok(initial.gradients.every(stops=>stops.every(color=>/^rgba\(255,255,255,/.test(color))));
  const blue=capture({...R.defaults('rain'),colorModeIndex:0});
  assert.ok(blue.gradients.some(stops=>stops.some(color=>color.includes('rgba(0,200,255,'))));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('Rain registers a real deterministic renderer and changes visibly with frame/mode',()=>{
 const dir=workspace();
 try{
  const {source}=build(dir),R=loadRegistry(source);
  const document={currentScript:{dataset:{patternId:'rain'}}};
  vm.runInNewContext(fs.readFileSync(path.join(dir,'standalone-pattern-rain.js'),'utf8'),
    {window:{SetkaPatternRegistryV1:R},document,Math},{timeout:1500});
  assert.equal(R.ready('rain'),true);
  function trace(config,frame){
   const strokes=[];
   let from=null,to=null;
   const ctx={
    save(){},restore(){},fillRect(){},translate(){},scale(){},beginPath(){},
    createLinearGradient(){return {addColorStop(){}}},
    moveTo(x,y){from=[x,y]},lineTo(x,y){to=[x,y]},stroke(){if(strokes.length<12)strokes.push([from,to]);}
   };
   R.render(ctx,220,330,config,frame,true,'rain');
   return strokes;
  }
  const defaults=R.defaults('rain');
  const a=trace(defaults,8),b=trace(defaults,8);
  assert.deepEqual(a,b,'same config + frame should replay exactly');
  assert.notDeepEqual(a,trace(defaults,88),'different frame should move');
  assert.notDeepEqual(a,trace({...defaults,motionMode:2},8),'mode changes the geometry');
  assert.equal(R.restore(R.snapshot({patternId:'rain',config:defaults,frame:8})).ok,true);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});


test('approved Hex Wheel Buddha renders pointy-top XY hexagons and isolated one-finger gestures',()=>{
 const dir=workspace();
 try{
  const {source,manifest}=build(dir),R=loadRegistry(source),id='hex-wheel-buddha';
  assert.ok(R.has(id),'automatically packaged Buddha Wheel is in public and research registry');
  assert.ok(manifest.patterns.some(p=>p.id===id),'research catalog carries the same dynamic module');
  const p=R.get(id),d=R.defaults(id),window={SetkaPatternRegistryV1:R},
    document={currentScript:{dataset:{patternId:id}}};
  vm.runInNewContext(fs.readFileSync(path.join(dir,p.module),'utf8'),{window,document,Math});
  assert.ok(R.ready(id)&&R.hasInteraction(id),'standalone module registers both gameplay and swipe reducer');
  assert.deepEqual(JSON.parse(JSON.stringify(d)),{
   patternId:id,omega:0,hexSize:44,strokeW:1.6,angleOffset:0,anchorFrame:0,colorModeIndex:0
  },'approved initial wheel is white, stationary, 44px, 1.6px');
  assert.equal(p.controls.length,3,'speed, line thickness and hex size are the only sliders');
  for(const [key,zone] of [['omega','Снизу'],['strokeW','Сверху'],['hexSize','Слева']]){
   const row=p.controls.find(x=>x[1]===key);
   assert.equal(row[6],1,'swipe must be shown as one-finger input on the settings sheet');
   assert.ok(row[5].startsWith(zone),'swipe zone matches preview');
  }
  assert.equal(p.colorModes,9);
  assert.equal(p.tapColorCycle,true,'triple-tap color cycle remains on native host');
  assert.deepEqual(JSON.parse(JSON.stringify(p.palettes[0])),[255,255,255]);
  function trace(config,frame=0,width=320,height=480){
   const segments=[],fills=[],turns=[],colors=[],translates=[];
   let begin=null,part=null;
   const ctx={save(){},restore(){},beginPath(){},closePath(){},
    fillRect(){fills.push(this.fillStyle)},translate(x,y){translates.push([x,y])},rotate(a){turns.push(a)},
    scale(){},moveTo(x,y){begin=[x,y]},lineTo(x,y){part=[x,y]},
    stroke(){segments.push({begin,part,weight:this.lineWidth,color:this.strokeStyle});colors.push(this.strokeStyle)}};
   R.render(ctx,width,height,config,frame,false,id);
   return {segments,fills,turns,colors,translates};
  }
  const start=trace(d);
  assert.ok(start.segments.length>4,'real hex grid uses multiple row batches');
  assert.equal(start.fills[0],'#000');
  assert.ok(start.colors.every(x=>x==='rgb(255,255,255)'));
  assert.deepEqual(start.translates[0],[160,240],'central hex anchored at screen center');
  assert.deepEqual(trace(d,0),trace(d,220),'stationary start matches approved preview');
  assert.notDeepEqual(trace({...d,omega:.018},0),trace({...d,omega:.018},90),
   'nonzero speed rotates without becoming screen-space displacement');
  assert.deepEqual(trace({...d,omega:.018},90),trace({...d,omega:.018},90),
   'random access immutable note/research Replay is deterministic');
  assert.notDeepEqual(trace({...d,hexSize:5}),trace({...d,hexSize:120}),
   'expanded 5–120 size slider changes real geometry');
  assert.notDeepEqual(trace({...d,strokeW:.5}),trace({...d,strokeW:6}),
   'stroke slider changes actual line width');
  assert.ok(trace({...d,colorModeIndex:1}).colors.includes('rgb(201,153,45)'),'original gold palette');
  assert.ok(trace({...d,colorModeIndex:8},120).colors.some(x=>x.startsWith('rgb(')&&x!=='rgb(255,255,255)'),
   'mode 9 is continuously shifting unified rainbow');
  function swipe(c,startX,startY,dx,dy,extra={}){
   return R.interact(id,c,{type:'gesture',phase:'move',fingers:1,
    startX,startY,dx,dy,width:390,height:800,frame:100,...extra});
  }
  const left=swipe(d,30,740,0,-100);
  assert.equal(left.hexSize,34,'left-edge swipe up decreases cells even at bottom-left');
  assert.equal(left.omega,0,'left swipe never changes speed');
  const down=swipe(d,30,80,0,100);
  assert.equal(down.hexSize,54,'left-edge swipe down increases cells even at top-left');
  const bottom=swipe(d,195,740,40,0);
  assert.ok(Math.abs(bottom.omega-.1)<1e-8,'bottom right swipe accelerates');
  assert.equal(bottom.strokeW,d.strokeW);
  const reverse=swipe(bottom,195,740,-80,0);
  assert.ok(reverse.omega<0,'bottom left swipe reverses rotation');
  const top=swipe(d,195,70,80,0);
  assert.equal(top.strokeW,2.4,'top swipe changes stroke thickness');
  assert.equal(top.omega,0);
  assert.deepEqual(JSON.parse(JSON.stringify(swipe(d,195,390,100,100))),JSON.parse(JSON.stringify(d)),
   'center swipe must not trigger a stray zone');
  assert.deepEqual(JSON.parse(JSON.stringify(R.interact(id,d,{type:'gesture',phase:'move',fingers:2,dx:300,dy:300,width:390,height:800}))),
   JSON.parse(JSON.stringify(d)),'two-finger swipes do not mix with one-finger actions');
  const moving={...d,omega:.037,anchorFrame:0,angleOffset:.2};
  const before=trace(moving,200).turns[0];
  const patched=R.interact(id,moving,{type:'patch',frame:200,patch:{omega:-.045}});
  assert.ok(Math.abs(trace(patched,200).turns[0]-before)<1e-8,
   'changing speed keeps the exact current angle; no snapping');
  assert.notEqual(trace(patched,220).turns[0],before,'reverse motion works after switching speed');
  const snap=R.snapshot({patternId:id,config:{...patched,colorModeIndex:8,hexSize:5,strokeW:4},frame:220});
  assert.ok(R.restore(snap).ok,'all wheel controls replay from saved favorites/notes');
  assert.equal(R.validate(R.defaults(id),id).ok,true);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
