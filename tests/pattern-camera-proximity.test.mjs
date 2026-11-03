import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import {execFileSync} from "node:child_process";

// Generic future-pattern contract: any module exposing an observer proximity
// parameter must visibly change the actual rendered camera projection and
// preserve that change in immutable snapshots / deterministic replay.
test("every packaged camera-proximity slider changes the roadway projection and survives replay",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"setka-proximity-"));
 try{
  fs.mkdirSync(path.join(dir,"scripts"));
  for(const name of ["standalone-pattern-registry-v1.js","scripts/build-pattern-manifest.mjs"])
   fs.copyFileSync(name,path.join(dir,name));
  for(const name of fs.readdirSync(".").filter(x=>/^standalone-pattern-[a-z0-9-]+\.js$/.test(x)))
   if(fs.readFileSync(name,"utf8").startsWith("/* SETKA_PATTERN_DESCRIPTOR"))
    fs.copyFileSync(name,path.join(dir,name));
  execFileSync(process.execPath,["scripts/build-pattern-manifest.mjs"],{cwd:dir,stdio:"pipe"});
  const context={window:{dispatchEvent(){}},CustomEvent:class{}};
  vm.runInNewContext(fs.readFileSync(path.join(dir,"standalone-pattern-registry-v1.js"),"utf8"),context);
  const R=context.window.SetkaPatternRegistryV1;
  const candidates=R.list().filter(p=>p.module&&p.controls.some(row=>row[1]==="proximity"));
  assert.ok(candidates.length>=1,"the approved observer camera module must be packaged");
  for(const p of candidates){
   assert.ok(fs.existsSync(path.join(dir,p.module)));
   const moduleSource=fs.readFileSync(path.join(dir,p.module),"utf8");
   const scope={window:{SetkaPatternRegistryV1:R},document:{currentScript:{dataset:{patternId:p.id}}},Math};
   const instrumented=p.id==="neurobridge"
    ?moduleSource.replace("registry.bindRenderer(id,render);",
      "window.__neurobridgeTest={cameraPose,road,projectSegment,railExtent};registry.bindRenderer(id,render);")
    :moduleSource;
   vm.runInNewContext(instrumented,scope);
   assert.ok(R.ready(p.id),"registered, reusable gameplay and preview renderer");
   assert.ok(R.hasInteraction(p.id),"gesture reducer is available");
   const base=R.defaults(p.id),control=p.controls.find(row=>row[1]==="proximity");
   assert.equal(control[6],0,"proximity is a real slider, not a disguised swipe");
   const render=config=>{
    const lines=[],rects=[];
    const ctx={save(){},restore(){},beginPath(){},moveTo(x,y){this.last=[x,y]},lineTo(x,y){this.end=[x,y]},
      stroke(){if(lines.length<80)lines.push({a:this.last,b:this.end,color:this.strokeStyle})},
      fillRect(x,y,w,h){if(rects.length<30)rects.push({x,y,w,h,color:this.fillStyle})},
      arc(){},fill(){}};
    R.render(ctx,320,320,config,73,false,p.id);
    return {lines,rects};
   };
   const close={...base,proximity:control[3]},far={...base,proximity:control[2]};
   const a=render(close),b=render(far);
   assert.ok(a.lines.length>0&&b.lines.length>0,"both distances render the road");
   assert.notDeepEqual(a.lines,b.lines,"observer distance must change actual geometry");
   assert.deepEqual(render(close),a,"proximity must be deterministic at fixed frame");
   // Independent observer position: height, lateral lane, and proximity to
   // the GROWTH FRONT are not one disguised zoom parameter.
   if(Object.hasOwn(base,"growthPosition")){
    const atBirth=render({...base,growthPosition:1});
    const behindBirth=render({...base,growthPosition:0});
    assert.notDeepEqual(atBirth.lines,behindBirth.lines,"observer's longitudinal position changes the emerging road");
    assert.ok(atBirth.lines.length>0&&behindBirth.lines.length>0);
   }
   if(Object.hasOwn(base,"lanePosition")){
    assert.notDeepEqual(render({...base,lanePosition:-.95}).lines,
      render({...base,lanePosition:.95}).lines,"left and right road position must differ");
   }
   if(Object.hasOwn(base,"hillSharpness")){
    const steep=render({...base,climbs:4.8,dropDepth:4.5,hillSharpness:3.2});
    const gentle=render({...base,climbs:.3,dropDepth:.3,hillSharpness:.5});
    assert.notDeepEqual(steep.lines,gentle.lines,"higher hills, deeper drops and sharper slopes change geometry");
    assert.notDeepEqual(render({...base,climbs:4.8}),render({...base,dropDepth:4.8}),
      "height and depth are independently configurable");
   }
   if(Object.hasOwn(base,"turnSharpness"))
    assert.notDeepEqual(render({...base,turnSharpness:.5,turns:2.5}).lines,
      render({...base,turnSharpness:3.4,turns:2.5}).lines,"turn radius/abruptness is independently adjustable");
   if(Object.hasOwn(base,"routeSeed")){
    assert.notDeepEqual(render({...base,randomness:1.2,routeSeed:2}).lines,
      render({...base,randomness:1.2,routeSeed:8}).lines,"different procedural route seeds vary the track");
    assert.deepEqual(render({...base,randomness:1.2,routeSeed:2}),
      render({...base,randomness:1.2,routeSeed:2}),"procedural randomness remains replay-deterministic");
    assert.equal(R.restore(R.snapshot({patternId:p.id,config:{...base,randomness:1.2,routeSeed:2,climbs:4,dropDepth:4,turnSharpness:2,growthPosition:.9,lanePosition:-.7},frame:73})).ok,true);
   }
   if(p.id==="neurobridge"){
    // Track-follow is a CAR constrained to the actual surface at the current
    // traveled arc parameter, not a floating camera following a distant gaze.
    const {cameraPose,road,projectSegment,railExtent}=scope.window.__neurobridgeTest||{};
    assert.equal(typeof cameraPose,"function","the real renderer must implement a track-locked carriage");
    assert.equal(typeof projectSegment,"function","geometry must clip across near plane, not drop crossbars");
    assert.equal(typeof railExtent,"function","the rail must extend past the rider");
    const nearZero=(a,b,eps=1e-6)=>Math.abs(a-b)<eps;
    const dot3=(a,b)=>a.reduce((acc,v,i)=>acc+v*b[i],0);
    const subtract=(a,b)=>a.map((v,i)=>v-b[i]);
    const plus=(a,b)=>a.map((v,i)=>v+b[i]);
    const scale=(a,k)=>a.map(v=>v*k);
    const extreme={...base,climbs:5,dropDepth:5,hillSharpness:3.5,
     turns:3,turnSharpness:3,randomness:1.4,proximity:1,
     lookYaw:0,lookPitch:0,lanePosition:0};
    const inclines=[];
    const descents=[];
    for(let f=0;f<=1120;f+=35){
     const pose=cameraPose(extreme,f),center=road(extreme,pose.here,pose.here);
     const displacement=subtract(pose.eye,center);
     assert.ok(nearZero(dot3(displacement,pose.carriageUp),pose.heightAboveRail),
      "eye must remain exactly above the local track surface, even on steep grades");
     assert.ok(nearZero(dot3(displacement,pose.tangent),0),
      "no sideways/uphill drift, tunneling or backwards pull at any grade");
     assert.ok(dot3(pose.forward,pose.tangent)>.996,
      "without gestures, gaze must follow the actual track pitch and yaw");
     (pose.basePitch>=0?inclines:descents).push(pose.basePitch);
     const {first,last,frontier}=railExtent(extreme,pose.here,1.32);
     assert.ok(first<pose.here-20,"the 3D road must continue behind the carriage");
     assert.ok(last>pose.here+9,"the 3D road must continue forward beyond the carriage");
     assert.ok(frontier>pose.here+10,"emerging road remains ahead, not across the camera");
    }
    assert.ok(inclines.length>0&&descents.length>0,
     "track-follow test exercised both steep climbs and steep descents");
    const pose=cameraPose(extreme,315),b=plus(pose.eye,scale(pose.forward,-1.5)),
     a=plus(pose.eye,scale(pose.forward,3));
    const crossing=projectSegment(b,a,pose,190,320,320);
    assert.ok(crossing&&crossing.length===2,"line straddling the camera near-plane must be clipped and drawn");
    assert.ok(nearZero(crossing[0].z,.24),"clipping preserves exactly the near-plane intersection");
    assert.ok(crossing.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),
     "near-plane clipping cannot create invalid screen coordinates");
    const behind=plus(pose.eye,scale(pose.forward,-3));
    assert.equal(projectSegment(b,behind,pose,190,320,320),null,
     "segments only disappear after BOTH endpoints really pass behind the viewer");
    // Height adjustment changes the camera's local normal offset, NOT the
    // longitudinal track coordinate, so whole ribs cannot disappear in front.
    for(const proximity of [0,.02,.3,.72,.98,1]){
     for(const growthPosition of [0,.5,1]){
      const config={...extreme,proximity,growthPosition,starCount:0,pulse:0};
      const p0=cameraPose(config,280);
      assert.ok(nearZero(p0.here,cameraPose({...config,proximity:1},280).here),
       "changing camera height never teleports the rider along the rail");
      const ext=railExtent(config,p0.here,1.32);
      assert.ok(ext.first<p0.here-20&&ext.last>p0.here+9,
       "road never gets clipped away by height or growth slider");
      let strokes=0;
      const ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},
       stroke(){strokes++},fillRect(){},arc(){},fill(){}};
      R.render(ctx,320,320,config,280,false,p.id);
      assert.ok(strokes>5,
       "road must remain visible for every camera-height and emergence setting");
     }
    }
   }
   if(p.id==="neurobridge"){
    // Stars are a genuine camera-relative projection of a persistent 3D sky,
    // not an incidental screen-space particle animation. Existing road
    // regression checks above continue to cover all roadway controls.
    const names=["starCount","starBrightness","starSize","starTwinkle","starBokeh"];
    for(const key of names){
     const field=p.controls.find(row=>row[1]===key);
     assert.ok(field,key+" must be an actual user-visible slider");
     assert.equal(field[6],0,key+" must not masquerade as an interactive mode");
     assert.ok(Number.isFinite(base[key]),key+" must be stored in config");
    }
    const stars=(settings={},atFrame=73)=>{
     const spots=[];
     const ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(){},
      arc(x,y,r){this.circle=[x,y,r]},
      fill(){if(this.circle){spots.push({coords:this.circle,style:this.fillStyle});this.circle=null}}};
     R.render(ctx,320,320,{...base,pulse:0,glow:0,starBokeh:0,...settings},atFrame,false,p.id);
     return spots;
    };
    assert.equal(stars({starCount:0}).length,0,"zero stars actually clears the sky");
    assert.ok(stars({starCount:1}).length>15,"full density creates visible stars");
    assert.equal(stars({starBrightness:0}).length,0,"zero brightness clears the stars");
    assert.notDeepEqual(stars({starCount:1,lookYaw:0}),stars({starCount:1,lookYaw:.7}),
     "turning the observer reveals a different region of 3D star space");
    assert.notDeepEqual(stars({starSize:.4}),stars({starSize:2.8}),
     "size slider changes actual projected radii");
    assert.ok(stars({starBokeh:1}).length>stars({starBokeh:0}).length,
     "bokeh adds luminous halos beyond the star centers");
    assert.notDeepEqual(stars({starTwinkle:1},73),stars({starTwinkle:1},116),
     "twinkling changes actual star light over time");
    assert.deepEqual(stars({starTwinkle:1},116),stars({starTwinkle:1},116),
     "sky appearance is frame+config deterministic for Replay");
    const snap=R.snapshot({patternId:p.id,config:{...base,starCount:.9,starBrightness:.6,starSize:2.4,starTwinkle:.8,starBokeh:.6},frame:73});
    const restored=R.restore(snap);
    assert.equal(restored.ok,true,"new star settings survive an immutable snapshot");
   }
   assert.equal(R.restore(R.snapshot({patternId:p.id,config:close,frame:73})).ok,true);
   const look=R.interact(p.id,base,{type:"gesture",frame:73,fingers:2,zone:"center",dx:40,dy:-30,width:320,height:320});
   assert.notDeepEqual(render(look),render(base),"head movement changes what observer sees");
   if(Object.hasOwn(base,"mode")){
    const alternate=R.interact(p.id,{...base,mode:1},{type:"gesture",frame:73,fingers:1,zone:"center",dx:40,dy:-30,width:320,height:320});
    assert.ok(alternate.lookYaw!==base.lookYaw||alternate.lookPitch!==base.lookPitch,"single finger can look around");
    const shared={...base,mode:2};
    const gesture={type:"gesture",frame:73,fingers:1,zone:"center",dx:36,dy:-20,width:320,height:320};
    const left=R.interact(p.id,shared,{...gesture,startX:110,startY:160});
    const right=R.interact(p.id,shared,{...gesture,startX:210,startY:160});
    assert.notEqual(left.steerX,shared.steerX,"left half controls road steering");
    assert.equal(left.lookYaw,shared.lookYaw,"left steering does not rotate head");
    assert.notEqual(right.lookYaw,shared.lookYaw,"right half rotates observer head");
    assert.equal(right.steerX,shared.steerX,"right look does not steer road");
   }
   assert.deepEqual(JSON.parse(JSON.stringify(p.palettes[base.colorModeIndex])),[255,255,255],"white-on-black start");
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});