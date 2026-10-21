(()=>{
"use strict";
// SETKA Runtime Performance Governor v1. One policy for ALL current and future
// registered renderers. It never mutates pattern configs, records or frame data.
// Runtime-only telemetry; no user/session information is sent anywhere.
if(window.SetkaAutoOptimizerV1)return;
const profiles=new Map(),canvases=new WeakMap(),groups=new Map();
const MIN_QUALITY=.7,WORK_BUDGET=15,MIN_INTERVAL=30,MAX_AGE=180;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const time=()=>performance.now();
let globalFrame=NaN,globalSpent=0,frameIntervals=16.67,lastFrame=0;
const groupName=id=>typeof id==="string"&&id.length<70?id:"unknown";
function profile(group,id){
  const key=groupName(group)+":"+groupName(id);
  if(!profiles.has(key))profiles.set(key,{group,id,mean:0,samples:0,quality:1,
    skipped:0,paints:0,pressure:0,healthy:0,attempt:null,noBenefit:false});
  return profiles.get(key);
}
function canvasState(canvas){
  let s=canvases.get(canvas);
  if(!s){
    s={width:Math.max(1,canvas.width|0),height:Math.max(1,canvas.height|0),last:0};
    canvases.set(canvas,s);
  }
  return s;
}
function groupState(name){
  if(!groups.has(name))groups.set(name,{name,painted:0,skipped:0,lastCost:0,visible:0,
    interval:33.333});
  return groups.get(name);
}
function startFrame(now){
  if(globalFrame===now)return;
  if(lastFrame&&now-lastFrame>0&&now-lastFrame<200)
    frameIntervals=frameIntervals*.88+(now-lastFrame)*.12;
  lastFrame=now;globalFrame=now;globalSpent=0;
}
// Choose by age, not registration order; never skip a newly registered
// pattern merely because the count grew from 8 to 9 (or 9 to 90).
function choose(name,items,now,options={}){
  const g=groupState(name);
  startFrame(now);
  g.visible=items.length;
  if(!items.length)return [];
  const eligible=items.map(item=>{
    const canvas=item[0],id=item[1]?.patternId||"unknown",p=profile(name,id),s=canvasState(canvas);
    return{item,p,s,age:s.last?Math.max(0,now-s.last):MAX_AGE+1};
  }).filter(x=>x.age>=Math.max(MIN_INTERVAL,Number(options.interval)||0));
  eligible.sort((a,b)=>b.age-a.age);
  let allowance=Math.max(3,WORK_BUDGET-globalSpent);
  let planned=0;
  const selected=[];
  for(const x of eligible){
    const estimate=x.p.samples?clamp(x.p.mean,.12,20):1;
    const overdue=x.age>=MAX_AGE;
    if(selected.length&&planned+estimate>allowance&&!overdue){x.p.skipped++;g.skipped++;continue;}
    selected.push(x.item);planned+=estimate;
    // Prevent an unbounded parade of unknown renderers on first registration.
    if(selected.length>=Math.max(1,Math.min(items.length,24)))break;
  }
  if(!selected.length&&eligible.length)selected.push(eligible[0].item);
  return selected;
}
function applyResolution(canvas,quality){
  if(!canvas||!Number.isFinite(canvas.width)||!Number.isFinite(canvas.height))return;
  const s=canvasState(canvas);
  const q=clamp(quality,MIN_QUALITY,1);
  // Preserve aspect ratio, CSS dimensions, geometric recipe and shared renderer.
  const width=Math.max(1,Math.round(s.width*q));
  const height=Math.max(1,Math.round(s.height*q));
  if(canvas.width!==width)canvas.width=width;
  if(canvas.height!==height)canvas.height=height;
}
function tune(p,goal){
  if(p.samples<12||p.samples%12!==0)return;
  if(p.attempt){
    // If fewer raster pixels did NOT reduce render time, revert and stop
    // applying an ineffective visual-quality trade-off to this renderer.
    if(p.mean>=p.attempt.baseline*.96){
      p.quality=1;p.noBenefit=true;p.attempt=null;p.pressure=0;
      return;
    }
    p.attempt=null;
  }
  if(p.mean>goal*1.5){p.pressure++;p.healthy=0;}
  else{p.healthy++;p.pressure=Math.max(0,p.pressure-1);}
  if(p.pressure>=2&&!p.noBenefit&&p.quality>MIN_QUALITY){
    const previous=p.mean;
    p.quality=clamp(Math.round((p.quality-.1)*100)/100,MIN_QUALITY,1);
    p.attempt={baseline:previous};
    p.pressure=0;
  }else if(p.healthy>=5&&p.quality<1){
    p.quality=clamp(Math.round((p.quality+.1)*100)/100,MIN_QUALITY,1);
    p.healthy=0;
  }
}
function paint(name,canvas,id,now,render,options={}){
  const p=profile(name,id),g=groupState(name);
  const s=canvas?canvasState(canvas):null;
  if(canvas&&options.adaptiveResolution!==false)applyResolution(canvas,p.quality);
  const before=time();
  try{
    const result=render();
    const spent=Math.max(.01,time()-before);
    p.mean=p.samples?(.82*p.mean+.18*spent):spent;
    p.samples++;p.paints++;g.painted++;g.lastCost=spent;
    if(s)s.last=now;
    globalSpent+=spent;
    const goal=Math.max(2,WORK_BUDGET/Math.max(1,g.visible));
    if(options.adaptiveResolution!==false)tune(p,goal);
    return result;
  }catch(e){
    p.skipped++;g.skipped++;throw e;
  }
}
function reset(){
  profiles.clear();groups.clear();globalFrame=NaN;globalSpent=0;
}
function status(){
  return{
    budgetMs:WORK_BUDGET,frameIntervalMs:Math.round(frameIntervals*100)/100,
    groups:[...groups.values()].map(g=>({...g})),
    patterns:[...profiles.values()].map(p=>({
      group:p.group,id:p.id,avgRenderMs:Math.round(p.mean*100)/100,
      samples:p.samples,painted:p.paints,skipped:p.skipped,
      resolutionScale:p.quality,limitation:p.noBenefit?"renderer-bound":null
    }))
  };
}
window.SetkaAutoOptimizerV1=Object.freeze({choose,paint,status,reset});
})();
