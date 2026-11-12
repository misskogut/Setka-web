// SETKA Music: one persistent WebAudio mixer shared by the catalog and orbit editor.
// Diffuse stereo late-room tail. Directional first reflections are separate
// HRTF wall images (below) and must not also appear in this impulse.
// Generated once in memory; uploaded audio is never changed or transcoded.
function setkaRoomImpulse(ctx){
 const rate=ctx.sampleRate,seconds=1.28;
 const buffer=ctx.createBuffer(2,Math.ceil(rate*seconds),rate);
 let seed=0x5345544b;
 const rand=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296*2-1;};
 for(let channel=0;channel<2;channel++){
  const data=buffer.getChannelData(channel);
  for(let i=Math.round(rate*.075);i<data.length;i++){
   const t=i/rate,entrance=Math.min(1,(t-.075)/.08);
   data[i]+=rand()*.007*entrance*Math.exp(-5.2*(t-.075));
  }
 }
 return buffer;
}
// Same unit vector drives the screen and the acoustic source:
// top/front = -Z, right = +X, bottom/rear = +Z, left = -X.
export function orbitUnit(angle){
 return {x:Math.sin(angle),z:-Math.cos(angle)};
}
// Single acoustic geometry shared by sound placement and room rendering.
// Existing near/far distances and azimuths are unchanged.
const ORBIT_REF_DISTANCE=2.05,ORBIT_ROLLOFF=.9,ORBIT_MAX_DISTANCE=19;
const ROOM_HALF_WIDTH=12,SPEED_OF_SOUND=343,MAX_EARLY_HRTF_SOURCES=6;
const clampOrbit=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
// Source-center radii match the visible ring diameters: inner 38%, outer 96%.
export const ORBIT_RADIUS_MIN=.38,ORBIT_RADIUS_MAX=.96;
export function clampOrbitRadius(radius){
 const r=Number(radius);
 return clampOrbit(Number.isFinite(r)?r:.62,ORBIT_RADIUS_MIN,ORBIT_RADIUS_MAX);
}
const smoothOrbit=(a,b,x)=>{
 const u=clampOrbit((x-a)/(b-a),0,1);
 return u*u*(3-2*u);
};
export function orbitDepthProfile(radius){
 const r=clampOrbitRadius(radius);
 // Visible near/far ring centerlines are also the physical audio endpoints.
 const depth=smoothOrbit(ORBIT_RADIUS_MIN,ORBIT_RADIUS_MAX,r);
 const distance=ORBIT_REF_DISTANCE+7.25*Math.pow(depth,1.15);
 const actual=Math.max(ORBIT_REF_DISTANCE,Math.min(ORBIT_MAX_DISTANCE,distance));
 const directAttenuation=ORBIT_REF_DISTANCE/
  (ORBIT_REF_DISTANCE+ORBIT_ROLLOFF*(actual-ORBIT_REF_DISTANCE));
 // Late diffuse room branches before the distance-attenuating dry Panner.
 // The level reaches the shared convolver without a second attenuation.
 const originalRoomLevel=.012+.19*Math.pow(depth,1.4);
 const roomSend=originalRoomLevel;
 return {distance,depth,directAttenuation,roomSend,originalRoomLevel};
}
// First-order image-source model: side walls mirror the real sound around
// the listener. Delay, high-frequency absorption and reflected arrival
// direction all respond to the actual sound's radius and azimuth.
export function orbitEarlyReflectionProfile(angle,radius){
 const {distance,depth}=orbitDepthProfile(radius),unit=orbitUnit(angle);
 const x=unit.x*distance,z=unit.z*distance;
 return [-1,1].map((side,index)=>{
  const imageX=2*side*ROOM_HALF_WIDTH-x,imageZ=z;
  const pathLength=Math.hypot(imageX,imageZ);
  const delay=clampOrbit((pathLength-distance)/SPEED_OF_SOUND,.009,.11);
  const gain=Math.min(.16,(.075+.105*depth)*(distance+3)/(pathLength+3)*1.3);
  const cutoff=clampOrbit(9100-180*(pathLength-10)-400*depth,3900,9000);
  return {side,index,delay,gain,cutoff,
   x:imageX/pathLength*ORBIT_REF_DISTANCE,
   z:imageZ/pathLength*ORBIT_REF_DISTANCE,pathLength};
 });
}
// Two independent wall images, HRTF on up to six simultaneous sources.
// Equal-power reflected panners keep the app responsive for extra tracks.
// The dry source always remains HRTF regardless of source count.
export function createOrbitEarlyReflections(ctx,input,master,model="HRTF"){
 const reflections=[];
 try{
  for(let i=0;i<2;i++){
   const delay=ctx.createDelay(.2),filter=ctx.createBiquadFilter();
   const gain=ctx.createGain(),panner=ctx.createPanner();
   const path={delay,filter,gain,panner};
   reflections.push(path);
   filter.type="lowpass";filter.frequency.value=7500;filter.Q.value=.65;
   gain.gain.value=0;delay.delayTime.value=.035;
   panner.panningModel=model;panner.distanceModel="linear";
   panner.refDistance=1;panner.maxDistance=50;panner.rolloffFactor=0;
   input.connect(delay);delay.connect(filter);filter.connect(gain);
   gain.connect(panner);panner.connect(master);
  }
  return reflections;
 }catch(_){
  for(const r of reflections)for(const n of [r.delay,r.filter,r.gain,r.panner])
   try{n.disconnect()}catch(_){}
  return [];
 }
}
// Repeated finger drags and the 40ms motion tick must replace prior
// automation, not accumulate stale targets in the AudioParam timeline.
export function scheduleOrbitParam(param,value,time,tracking){
 if(!param?.setTargetAtTime||!Number.isFinite(value))return false;
 const when=Math.max(0,Number(time)||0),smooth=Math.max(.006,Math.min(.18,Number(tracking)||.018));
 try{
  if(typeof param.cancelAndHoldAtTime==="function")param.cancelAndHoldAtTime(when);
  else param.cancelScheduledValues?.(when);
 }catch(_){try{param.cancelScheduledValues?.(when)}catch(_){}}
 param.setTargetAtTime(value,when,smooth);
 return true;
}
function setOrbitPosition(node,x,z,time,tracking){
 if(node.positionX?.setTargetAtTime){
  scheduleOrbitParam(node.positionX,x,time,tracking);
  scheduleOrbitParam(node.positionY,0,time,tracking);
  scheduleOrbitParam(node.positionZ,z,time,tracking);
 }else node.setPosition(x,0,z);
}
export class SetkaMusicMixer {
 constructor() {
  this.ctx=null; this.master=null; this.room=null; this.roomOutput=null; this.items=new Map();
  this.mode="static"; this.speed=40; this.started=performance.now()/1000;
  this.changed=()=>{}; this.moved=()=>{}; this.onTrackEvent=()=>{}; this.clock=null;
 }
 init() {
  if (!this.ctx) {
   const A=window.AudioContext||window.webkitAudioContext;
   if(!A)throw Error("audio_unsupported");
   this.ctx=new A();
   this.master=this.ctx.createDynamicsCompressor();
   // Transparent peak safety only; do not crush the music's dynamics.
   this.master.threshold.value=-2;
   this.master.knee.value=0;this.master.ratio.value=3;
   this.master.attack.value=.003;this.master.release.value=.16;
   this.master.connect(this.ctx.destination);
   // Explicitly align the acoustic listener with the central person shown in
   // the orbit UI: facing screen-up/front (-Z), +X to the right.
   const listener=this.ctx.listener,time=this.ctx.currentTime;
   if(listener?.forwardZ?.setValueAtTime){
    listener.positionX?.setValueAtTime(0,time);
    listener.positionY?.setValueAtTime(0,time);
    listener.positionZ?.setValueAtTime(0,time);
    listener.forwardX?.setValueAtTime(0,time);
    listener.forwardY?.setValueAtTime(0,time);
    listener.forwardZ.setValueAtTime(-1,time);
    listener.upX?.setValueAtTime(0,time);
    listener.upY?.setValueAtTime(1,time);
    listener.upZ?.setValueAtTime(0,time);
   }
   try{
    const room=this.ctx.createConvolver(),output=this.ctx.createGain();
    room.normalize=false;
    room.buffer=setkaRoomImpulse(this.ctx);
    output.gain.value=.86;
    room.connect(output);output.connect(this.master);
    this.room=room;this.roomOutput=output;
   }catch(_){this.room=null;this.roomOutput=null}
  }
  this.ctx.resume().catch(()=>{});
 }
 // Every looping track uses two independently buffered players.
 // Equal-power crossfade starts before the end, so the next loop overlaps the tail.
 async change(track,level) {
  level=Number(level)||0;
  const id=String(track.id),old=this.items.get(id);
  if(level<1){this.remove(id);return}
  try{this.init()}catch(e){this.changed(e.message);return}
  let state=old;
  if(!state){
   const index=this.items.size,angle=index*2.399963229728653;
   const gain=this.ctx.createGain(),rearFilter=this.ctx.createBiquadFilter(),panner=this.ctx.createPanner();
   // Let the browser retain the original decoded source channel configuration.
   // Never force an additional explicit mono downmix before HRTF processing.
   panner.panningModel="HRTF";panner.distanceModel="inverse";
   // A wider near/far acoustic range than the previous 1+7*r / .42 rolloff.
   panner.refDistance=ORBIT_REF_DISTANCE;panner.maxDistance=ORBIT_MAX_DISTANCE;panner.rolloffFactor=ORBIT_ROLLOFF;
   // Very gentle rear head-shadow: only a 1.5 dB high-shelf difference,
   // not the former aggressive low-pass that made music dull from behind.
   rearFilter.type="highshelf";rearFilter.frequency.value=7500;rearFilter.gain.value=0;
   gain.connect(rearFilter);rearFilter.connect(panner);panner.connect(this.master);gain.gain.value=0;
   // Direct HRTF retains its original unchanged signal and position.
   // Diffuse late reflections branch BEFORE HRTF; early wall images have
   // their own HRTF position, timing and path-dependent absorption.
   const roomSend=this.room?this.ctx.createGain():null;
   if(roomSend){roomSend.gain.value=0;rearFilter.connect(roomSend);roomSend.connect(this.room)}
   const reflections=createOrbitEarlyReflections(this.ctx,rearFilter,this.master,
    this.items.size<MAX_EARLY_HRTF_SOURCES?"HRTF":"equalpower");
   if(this.roomOutput)this.roomOutput.gain.setTargetAtTime(.86,this.ctx.currentTime,.04);
   // Never allocate two decoders for the original 25–500 MB WAV recordings.
   // Safari/WebKit additionally crashes when a huge WAV enters its WebAudio
   // MediaElementSource; its native HTMLAudioElement plays the SAME lossless bytes
   // reliably. Use native output only for this large-file WebKit safety fallback.
   // Small sources and Chromium retain the full HRTF/reflective audio graph.
   const singleDeck=!!track.external_source_path&&/\.wav$/i.test(track.external_source_path)&&
     Number(track.external_source_bytes)>=24*1024*1024;
   const webkit=/AppleWebKit/i.test(navigator.userAgent)&&!/Chrom(?:e|ium)\//i.test(navigator.userAgent);
   const nativeOnly=singleDeck&&webkit;
   const makeDeck=(volume)=>{
    const el=new Audio();
    el.loop=singleDeck&&track.loop!==false;
    el.crossOrigin="anonymous";el.preload=nativeOnly?"metadata":"auto";el.src=track.audio_url;
    if(nativeOnly)return {el,src:null,fade:null};
    const src=this.ctx.createMediaElementSource(el);
    const fade=this.ctx.createGain();fade.gain.value=volume;
    src.connect(fade);fade.connect(gain);
    return {el,src,fade};
   };
   const decks=[makeDeck(1)];
   if(track.loop!==false&&!singleDeck)decks.push(makeDeck(0));
   state={id,track,level:0,playTracked:false,completed:false,angle,radius:.62+(index%3)*.08,
    anchorAngle:angle,anchorRadius:.62+(index%3)*.08,manual:false,
    el:decks[0].el,src:decks[0].src,gain,rearFilter,panner,roomSend,reflections,decks,singleDeck,nativeOnly,activeDeck:0,transition:null,pendingLoop:false};
   this.items.set(id,state);this.position(state,angle,state.radius);
   for(let deckIndex=0;deckIndex<decks.length;deckIndex++){
    const {el}=decks[deckIndex];
    el.addEventListener("playing",()=>{
     if(state.playTracked||this.items.get(id)!==state)return;
     state.playTracked=true;
     try{this.onTrackEvent({track_id:id,event_type:"play",event_id:crypto.randomUUID()})}catch(_){}
    });
    el.addEventListener("timeupdate",()=>{
     if(this.items.get(id)!==state)return;
     const d=Number(el.duration)||Number(state.track.duration_seconds)||0;
     if(state.playTracked&&!state.completed&&d>0&&el.currentTime>=d*.95){
      state.completed=true;
      try{this.onTrackEvent({track_id:id,event_type:"complete",event_id:crypto.randomUUID()})}catch(_){}
     }
     if(state.activeDeck===deckIndex)this.advanceLoop(state);
    });
    el.addEventListener("ended",()=>{
     if(this.items.get(id)!==state||state.transition||state.pendingLoop||state.activeDeck!==deckIndex)return;
     // Late/unknown-duration fallback: never leave a looping track silent.
     if(state.track.loop!==false)this.advanceLoop(state,true);
    });
   }
   decks[0].el.play().catch(()=>{this.remove(id);this.changed("Не удалось воспроизвести аудиофайл")});
   // Prime the silent second deck during the same user interaction for iOS Safari.
   // It remains inaudible (fade=0), then waits at the beginning until overlap.
   if(decks.length>1){
    const standby=decks[1].el;
    standby.play().then(()=>{
     if(this.items.get(id)!==state||state.activeDeck!==0||state.pendingLoop)return;
     standby.pause();
     try{standby.currentTime=0}catch(_){}
    }).catch(()=>{});
   }
  }
  state.level=Math.max(1,Math.min(3,level));state.track=track;
  const outputLevel=[0,.20,.45,.75][state.level];
  if(state.nativeOnly){
   // HTMLAudioElement volume is the fallback's actual audible gain.
   for(const deck of state.decks)deck.el.volume=outputLevel;
  }else{
   const now=this.ctx.currentTime;state.gain.gain.cancelScheduledValues(now);
   state.gain.gain.setTargetAtTime(outputLevel,now,.045);
  }
  if(!this.clock)this.clock=setInterval(()=>this.tick(),40);
  this.changed();
 }
 // Advance a deck independently of orbital motion: even a static sound loops.
 advanceLoop(state,force=false){
  if(this.items.get(state.id)!==state||state.track.loop===false||state.decks.length<2)return;
  const now=this.ctx.currentTime;
  if(state.transition){
   if(now<state.transition.endAt)return;
   const old=state.decks[state.transition.from];
   old.el.pause();
   try{old.el.currentTime=0}catch(_){}
   old.fade.gain.cancelScheduledValues(now);
   old.fade.gain.setValueAtTime(0,now);
   state.activeDeck=state.transition.to;
   state.el=state.decks[state.activeDeck].el;
   state.src=state.decks[state.activeDeck].src;
   state.transition=null;state.pendingLoop=false;
   return;
  }
  if(state.pendingLoop)return;
  const from=state.activeDeck,to=1-from;
  const outgoing=state.decks[from],incoming=state.decks[to];
  const duration=Number(outgoing.el.duration)||Number(state.track.duration_seconds)||0;
  if(!Number.isFinite(duration)||duration<=0)return;
  const overlap=Math.min(2.4,duration*.22);
  const remaining=duration-outgoing.el.currentTime;
  if(!force&&(outgoing.el.paused||remaining>overlap))return;
  state.pendingLoop=true;
  try{incoming.el.currentTime=0}catch(_){}
  const initialAt=this.ctx.currentTime;
  incoming.fade.gain.cancelScheduledValues(initialAt);
  incoming.fade.gain.setValueAtTime(0,initialAt);
  const startFade=()=>{
   if(this.items.get(state.id)!==state||!state.pendingLoop)return;
   const time=this.ctx.currentTime;
   const left=Math.max(.12,duration-outgoing.el.currentTime);
   const fadeTime=Math.max(.12,Math.min(overlap,left));
   const steps=32,up=new Float32Array(steps),down=new Float32Array(steps);
   for(let i=0;i<steps;i++){
    const phase=(i/(steps-1))*Math.PI/2;
    up[i]=Math.sin(phase);down[i]=Math.cos(phase);
   }
   outgoing.fade.gain.cancelScheduledValues(time);
   outgoing.fade.gain.setValueAtTime(1,time);
   incoming.fade.gain.cancelScheduledValues(time);
   incoming.fade.gain.setValueAtTime(0,time);
   outgoing.fade.gain.setValueCurveAtTime(down,time,fadeTime);
   incoming.fade.gain.setValueCurveAtTime(up,time,fadeTime);
   state.transition={from,to,endAt:time+fadeTime};
  };
  incoming.el.play().then(startFade).catch(()=>{
   state.pendingLoop=false;
   // If the standby player cannot start, use a short faded replay rather than silence.
   if(this.items.get(state.id)!==state)return;
   const time=this.ctx.currentTime;
   outgoing.fade.gain.cancelScheduledValues(time);
   outgoing.fade.gain.setTargetAtTime(0,time,.07);
   outgoing.el.pause();
   try{outgoing.el.currentTime=0}catch(_){}
   outgoing.el.play().then(()=>{
    const t=this.ctx.currentTime;
    outgoing.fade.gain.setTargetAtTime(1,t,.16);
   }).catch(()=>this.remove(state.id));
  });
 }
 remove(id){
  const s=this.items.get(id);if(!s)return;
  this.items.delete(id);
  s.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.025);
  setTimeout(()=>{
   for(const d of s.decks){
    d.el.pause();d.el.removeAttribute("src");d.el.load();
    d.src?.disconnect();d.fade?.disconnect();
   }
   s.gain.disconnect();s.rearFilter.disconnect();s.panner.disconnect();
   s.roomSend?.disconnect();
   for(const r of s.reflections||[])for(const n of [r.delay,r.filter,r.gain,r.panner])n.disconnect();
  },220);
  if(!this.items.size){
   if(this.roomOutput)this.roomOutput.gain.setTargetAtTime(0,this.ctx.currentTime,.035);
   clearInterval(this.clock);this.clock=null;this.mode="static"
  }
  this.changed();
 }
 stopAll(){for(const id of [...this.items.keys()])this.remove(id);this.mode="static";this.changed()}
 position(s,a,r){
  // The same bound is applied to manual and all automated source paths.
  r=clampOrbitRadius(r);
  s.angle=a;s.radius=r;
  // One radius now drives original dry HRTF distance, diffuse room and
  // geometrically correct early wall reflections, without screen drift.
  const {distance,roomSend}=orbitDepthProfile(r);
  const unit=orbitUnit(a);
  const x=unit.x*distance,z=unit.z*distance;
  // HRTF supplies the spatial front/back cue. Keep source timbre intact:
  // attenuate only the extreme highs by <=1.5 dB at the rear.
  const behind=smoothOrbit(-.28,.82,-Math.cos(a))*smoothOrbit(.06,.32,r);
  const gentleRearDb=-1.5*behind;
  const t=this.ctx.currentTime;
  // Diffuse late field and physically directed early reflections are
  // independent paths. Smooth changes to prevent clicks on finger drags.
  if(s.roomSend)scheduleOrbitParam(s.roomSend.gain,roomSend,t,s.manual?.055:.095);
  const acoustic=orbitEarlyReflectionProfile(a,r);
  for(let i=0;i<(s.reflections?.length||0);i++){
   const reflection=s.reflections[i],q=acoustic[i];
   const response=s.manual?.05:.10;
   scheduleOrbitParam(reflection.gain.gain,q.gain,t,response);
   scheduleOrbitParam(reflection.filter.frequency,q.cutoff,t,.12);
   scheduleOrbitParam(reflection.delay.delayTime,q.delay,t,.12);
   setOrbitPosition(reflection.panner,q.x,q.z,t,response);
  }
  if(s.rearFilter?.gain?.setTargetAtTime){
   scheduleOrbitParam(s.rearFilter.gain,gentleRearDb,t,s.manual?.028:.055);
  }else if(s.rearFilter?.gain){s.rearFilter.gain.value=gentleRearDb}
  // Dry HRTF follows the icon without inheriting the long room tail.
  setOrbitPosition(s.panner,x,z,t,s.manual?.012:.036);
 }
 diagnostics(){
  const ctx=this.ctx;
  const sources=[...this.items.values()].map(s=>{
   const unit=orbitUnit(s.angle),profile=orbitDepthProfile(s.radius);
   return {trackId:s.id,angle:s.angle,radius:s.radius,
    x:unit.x*profile.distance,z:unit.z*profile.distance,
    hrtfSpatialized:!s.nativeOnly&&s.panner?.panningModel==="HRTF",
    nativeStereoFallback:!!s.nativeOnly,earlyReflectionCount:s.nativeOnly?0:s.reflections?.length||0};
  });
  const base=Number(ctx?.baseLatency),output=Number(ctx?.outputLatency);
  return {audioContextActive:!!ctx,audioContextState:ctx?.state||"uninitialized",
   baseLatencyMs:Number.isFinite(base)?Math.round(base*1000):null,
   outputLatencyMs:Number.isFinite(output)?Math.round(output*1000):null,
   supportsHrtf:!!ctx?.createPanner,sources,
   warning:sources.some(s=>s.nativeStereoFallback)?"Large WAV on Safari is native stereo; icon movement is not HRTF spatialized.":null};
 }
 drag(id,a,r){
  const s=this.items.get(id);if(!s)return;
  const radius=clampOrbitRadius(r);
  s.manual=true;s.anchorAngle=a;s.anchorRadius=radius;
  this.position(s,a,radius);this.moved();
 }
 omega(){return 2*Math.PI/(1200*Math.pow(1/40,this.speed/100))}
 motion(mode){
  this.tick();this.mode=mode;this.started=performance.now()/1000;
  for(const s of this.items.values()){s.anchorAngle=s.angle;s.anchorRadius=s.radius;s.manual=false}
  this.changed();
 }
 setSpeed(speed){
  this.tick();this.speed=Math.max(0,Math.min(100,Number(speed)||0));
  if(this.mode!=="static"){this.started=performance.now()/1000;
   for(const s of this.items.values()){s.anchorAngle=s.angle;s.anchorRadius=s.radius}}
 }
 tick(){
  if(!this.items.size)return;
  for(const s of this.items.values())this.advanceLoop(s);
  if(this.mode==="static")return;
  const t=Math.max(0,performance.now()/1000-this.started),w=this.omega(),blend=Math.min(1,t/.8);
  let i=0;
  for(const s of this.items.values()){
   const j=i++,base=s.anchorAngle,rad=s.anchorRadius,phase=j*1.71;
   if(s.manual)continue;
   let a=base,r=rad,x=0,y=0;
   if(this.mode==="cw")a+=w*t;
   else if(this.mode==="ccw")a-=w*t;
   else if(this.mode==="counter")a+=(j%2?-1:1)*w*t;
   else if(this.mode==="breath")r=clampOrbitRadius(rad+.20*(Math.sin(w*t+phase)-Math.sin(phase)));
   else if(this.mode==="spiral"){a+=w*t;r=rad*(1-blend)+(ORBIT_RADIUS_MIN+(ORBIT_RADIUS_MAX-ORBIT_RADIUS_MIN)*(.5-.5*Math.cos(.6*w*t+phase)))*blend}
   else {
    const q=w*t+phase;
    if(this.mode==="eight"){x=.77*Math.sin(q);y=-.60*Math.sin(2*q)-.20*Math.cos(q)}
    else if(this.mode==="chaos"){
     x=.43*Math.sin(q*.81)+.26*Math.sin(q*1.37+phase);
     y=.46*Math.cos(q*.59)+.23*Math.cos(q*1.67+phase*2);
    }
    x=Math.sin(base)*rad*(1-blend)+x*blend;
    y=-Math.cos(base)*rad*(1-blend)+y*blend;
    a=Math.atan2(x,-y);r=clampOrbitRadius(Math.hypot(x,y));
   }
   this.position(s,a,r);
  }
  this.moved();
 }
}
export const MOTION=["static","cw","ccw","counter","eight","chaos","spiral","breath"];
export const MOTION_LABELS={static:"Статично",cw:"По часовой",ccw:"Против часовой",
counter:"Встречное вращение",eight:"Восьмёрка",chaos:"Плавный хаос",spiral:"Спираль",breath:"Дыхание"};
