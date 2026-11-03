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
   vm.runInNewContext(fs.readFileSync(path.join(dir,p.module),"utf8"),
     {window:{SetkaPatternRegistryV1:R},document:{currentScript:{dataset:{patternId:p.id}}},Math});
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
   assert.equal(R.restore(R.snapshot({patternId:p.id,config:close,frame:73})).ok,true);
   const look=R.interact(p.id,base,{type:"gesture",frame:73,fingers:2,zone:"center",dx:40,dy:-30,width:320,height:320});
   assert.notDeepEqual(render(look),render(base),"head movement changes what observer sees");
   if(Object.hasOwn(base,"mode")){
    const alternate=R.interact(p.id,{...base,mode:1},{type:"gesture",frame:73,fingers:1,zone:"center",dx:40,dy:-30,width:320,height:320});
    assert.ok(alternate.lookYaw!==base.lookYaw||alternate.lookPitch!==base.lookPitch,"single finger can look around");
   }
   assert.deepEqual(JSON.parse(JSON.stringify(p.palettes[base.colorModeIndex])),[255,255,255],"white-on-black start");
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});