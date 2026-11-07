import {createOrbitWavStream} from "./standalone-music-wav-stream-v1.mjs";

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
const ORBIT_TRACKING=.008;
const clampOrbit=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const smoothOrbit=(a,b,x)=>{
 const u=clampOrbit((x-a)/(b-a),0,1);
 return u*u*(3-2*u);
};
export function orbitDepthProfile(radius){
 const r=Number.isFinite(Number(radius))?Number(radius):.62;
 const depth=smoothOrbit(.14,.94,r);
 const nearCenter=smoothOrbit(0,.16,r);
 const distance=(ORBIT_REF_DISTANCE+7.25*Math.pow(depth,1.15))*nearCenter;
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
 const unit=orbitUnit(angle),profile=orbitDepthProfile(radius);
 return wallImages(unit.x*profile.distance,unit.z*profile.distance,profile.distance,profile.depth);
}
function wallImages(x,z,distance,depth){
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
   gain.gain.value=0;
   // Both ears use one delay value per render quantum, as does native HRTF
   // positioning. This also avoids separate stereo a-rate delay kernels.
   delay.delayTime.value=.035;
   if("automationRate" in delay.delayTime)delay.delayTime.automationRate="k-rate";
   panner.panningModel=model;panner.distanceModel="linear";
   panner.refDistance=1;panner.maxDistance=50;panner.rolloffFactor=0;
   input.connect(filter);filter.connect(gain);gain.connect(panner);
   // Delay the already spatialized reflection. Direction and level describe
   // the same emission before its excess wall-path travel time.
   panner.connect(delay);delay.connect(master);
  }
  return reflections;
 }catch(_){
  for(const r of reflections){
   try{input.disconnect(r.filter)}catch(_){}
   for(const n of [r.delay,r.filter,r.gain,r.panner])try{n.disconnect()}catch(_){}
  }
  return [];
 }
}
function orbitParam(param,value,time,snap){
 if(snap)param.value=value;
 else param.setTargetAtTime(value,time,ORBIT_TRACKING);
}
function setOrbitPosition(node,x,z,time,snap){
 if(node.positionX?.setTargetAtTime){
  orbitParam(node.positionX,x,time,snap);
  orbitParam(node.positionY,0,time,snap);
  orbitParam(node.positionZ,z,time,snap);
 }else node.setPosition(x,0,z);
}
export function createOrbitVoice(ctx,master,room,reflectionModel){
 const gain=ctx.createGain(),mid=ctx.createGain(),sideMix=ctx.createGain(),focus=ctx.createGain();
 const panner=ctx.createPanner();
 gain.gain.value=0;
 // WebKit and Chromium's stereo HRTF feed each ear from its matching
 // channel. Keep a focused common signal and half the original stereo
 // difference. Speakers mixing leaves true mono and dual mono unchanged.
 mid.channelCount=1;mid.channelCountMode="explicit";mid.gain.value=.5;
 sideMix.gain.value=.5;
 gain.connect(mid);gain.connect(sideMix);mid.connect(focus);sideMix.connect(focus);
 panner.panningModel="HRTF";panner.distanceModel="inverse";
 panner.refDistance=ORBIT_REF_DISTANCE;panner.maxDistance=ORBIT_MAX_DISTANCE;panner.rolloffFactor=ORBIT_ROLLOFF;
 focus.connect(panner);panner.connect(master);
 const roomSend=room?ctx.createGain():null;
 if(roomSend){roomSend.gain.value=0;gain.connect(roomSend);roomSend.connect(room)}
 const reflections=createOrbitEarlyReflections(ctx,focus,master,reflectionModel);
 return {gain,mid,sideMix,focus,panner,roomSend,reflections};
}
function disconnectOrbitVoice(voice){
 for(const node of [voice.gain,voice.mid,voice.sideMix,voice.focus,voice.panner,voice.roomSend])node?.disconnect();
 for(const r of voice.reflections)for(const node of [r.delay,r.filter,r.gain,r.panner])node.disconnect();
}
export class SetkaMusicMixer {
 constructor() {
  this.ctx=null; this.master=null; this.room=null; this.roomOutput=null; this.items=new Map();
  this.mode="static"; this.speed=40; this.started=performance.now()/1000;
  this.changed=()=>{}; this.moved=()=>{}; this.onTrackEvent=()=>{}; this.clock=null;
  this.frame=null; this.motionSpeedAt=this.started; this.phaseOffset=0;this.nextMotionIndex=0;
  this.nativeFallbacks=new Set();
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
   this.room=this.makeRoom(this.master);
  }
  this.ctx.resume().catch(()=>{});
 }
 makeRoom(destination){
  try{
   const room=this.ctx.createConvolver(),output=this.ctx.createGain();
   room.normalize=false;
   room.buffer=setkaRoomImpulse(this.ctx);
   output.gain.value=.86;
   room.connect(output);output.connect(destination);
   this.roomOutput=output;
   return room;
  }catch(_){this.roomOutput=null;return null}
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
   // Keep the large-file WebKit path bounded, without routing the whole
   // WAV through MediaElementSource. Unsupported/range-failed files can still
   // play natively on the next tap, explicitly outside the spatial graph.
   const singleDeck=!!track.external_source_path&&/\.wav$/i.test(track.external_source_path)&&
     Number(track.external_source_bytes)>=24*1024*1024;
   const webkit=/AppleWebKit/i.test(navigator.userAgent)&&!/Chrom(?:e|ium)\//i.test(navigator.userAgent);
   const streamWav=singleDeck&&webkit&&typeof AbortSignal.any==="function"&&
    typeof AbortSignal.timeout==="function"&&!this.nativeFallbacks.has(id);
   const nativeOnly=singleDeck&&webkit&&!streamWav;
   const hrtfRooms=[...this.items.values()].filter(s=>s.reflections?.[0]?.panner.panningModel==="HRTF").length;
   const reflectionModel=hrtfRooms<MAX_EARLY_HRTF_SOURCES?"HRTF":"equalpower";
   const voice=nativeOnly?null:createOrbitVoice(this.ctx,this.master,this.room,reflectionModel);
   if(voice&&this.roomOutput)this.roomOutput.gain.setTargetAtTime(.86,this.ctx.currentTime,.04);
   const makeDeck=(volume)=>{
    const el=new Audio();
    el.loop=singleDeck&&track.loop!==false;
    el.crossOrigin="anonymous";el.preload=nativeOnly?"metadata":"auto";el.src=track.audio_url;
    if(nativeOnly)return {el,src:null,fade:null};
    const src=this.ctx.createMediaElementSource(el);
    const fade=this.ctx.createGain();fade.gain.value=volume;
    src.connect(fade);fade.connect(voice.gain);
    return {el,src,fade};
   };
   const decks=streamWav?[]:[makeDeck(1)];
   if(track.loop!==false&&!singleDeck)decks.push(makeDeck(0));
   state={...voice,id,track,level:0,playTracked:false,completed:false,angle,radius:.62+(index%3)*.08,
    anchorAngle:angle,anchorRadius:.62+(index%3)*.08,manual:false,motionIndex:this.nextMotionIndex++,
    el:decks[0]?.el,src:decks[0]?.src,decks,singleDeck,nativeOnly,activeDeck:0,transition:null,pendingLoop:false};
   this.items.set(id,state);this.position(state,angle,state.radius,true);
   if(streamWav)state.stream=createOrbitWavStream(this.ctx,state.gain,track,()=>{
    if(this.items.get(id)!==state)return;
    this.nativeFallbacks.add(id);this.remove(id);
    this.changed("Пространственное воспроизведение недоступно. Повторный тап включит исходный звук.");
   });
   for(let deckIndex=0;deckIndex<decks.length;deckIndex++){
    const {el}=decks[deckIndex];
    el.addEventListener("playing",()=>{
     this.trackPlayback(state,"play");
    });
    el.addEventListener("timeupdate",()=>{
     if(this.items.get(id)!==state)return;
     const d=Number(el.duration)||Number(state.track.duration_seconds)||0;
     if(d>0&&el.currentTime>=d*.95)this.trackPlayback(state,"complete");
     if(state.activeDeck===deckIndex)this.advanceLoop(state);
    });
    el.addEventListener("ended",()=>{
     if(this.items.get(id)!==state||state.transition||state.pendingLoop||state.activeDeck!==deckIndex)return;
     // Late/unknown-duration fallback: never leave a looping track silent.
     if(state.track.loop!==false)this.advanceLoop(state,true);
    });
   }
   decks[0]?.el.play().catch(()=>{
    if(this.items.get(id)!==state)return;
    this.remove(id);this.changed("Не удалось воспроизвести аудиофайл");
   });
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
  if(!this.clock)this.clock=setInterval(()=>this.service(),40);
  this.service();
  this.changed();
 }
 trackPlayback(state,event){
  if(this.items.get(state.id)!==state)return;
  if(event==="play"){
   if(state.playTracked)return;
   state.playTracked=true;
  }else{
   if(!state.playTracked||state.completed)return;
   state.completed=true;
  }
  try{this.onTrackEvent({track_id:state.id,event_type:event,event_id:crypto.randomUUID()})}catch(_){}
 }
 service(){
  for(const state of this.items.values()){
   this.advanceLoop(state);
   if(!state.stream)continue;
   state.stream.pump();
   const now=this.ctx.currentTime;
   if(now>=state.stream.startedAt)this.trackPlayback(state,"play");
   if(now>=state.stream.completedAt)this.trackPlayback(state,"complete");
  }
  // requestAnimationFrame stops in background tabs. Keep the graph current
  // when the browser still allows audio and timers to run there.
  if(document.hidden)this.tick();
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
  const now=this.ctx.currentTime;
  if(s.nativeOnly){for(const deck of s.decks)deck.el.pause()}
  else s.gain.gain.setTargetAtTime(0,now,.025);
  setTimeout(()=>{
   s.stream?.stop();
   for(const d of s.decks){
    d.el.pause();d.el.removeAttribute("src");d.el.load();
    d.src?.disconnect();d.fade?.disconnect();
   }
   if(!s.nativeOnly)disconnectOrbitVoice(s);
  },220);
  if(!this.items.size){
   if(this.roomOutput)this.roomOutput.gain.setTargetAtTime(0,now,.035);
   clearInterval(this.clock);this.clock=null;this.mode="static";this.nextMotionIndex=0;
   if(this.frame!==null){cancelAnimationFrame(this.frame);this.frame=null}
  }
  this.changed();
 }
 stopAll(){for(const id of [...this.items.keys()])this.remove(id);this.mode="static";this.changed()}
 position(s,a,r,snap=false,t=this.ctx.currentTime){
  if(!snap&&s.angle===a&&s.radius===r)return;
  s.angle=a;s.radius=r;
  if(s.nativeOnly)return;
  const {distance,depth,roomSend}=orbitDepthProfile(r),unit=orbitUnit(a);
  const x=unit.x*distance,z=unit.z*distance;
  // One spatial sample, audio timestamp and response for all paths.
  setOrbitPosition(s.panner,x,z,t,snap);
  if(s.roomSend)orbitParam(s.roomSend.gain,roomSend,t,snap);
  if(!s.reflections?.length)return;
  const acoustic=wallImages(x,z,distance,depth);
  for(let i=0;i<s.reflections.length;i++){
   const reflection=s.reflections[i],q=acoustic[i];
   setOrbitPosition(reflection.panner,q.x,q.z,t,snap);
   orbitParam(reflection.gain.gain,q.gain,t,snap);
   orbitParam(reflection.filter.frequency,q.cutoff,t,snap);
   orbitParam(reflection.delay.delayTime,q.delay,t,snap);
  }
 }
 drag(id,a,r){
  const s=this.items.get(id);if(!s)return;
  s.manual=true;s.anchorAngle=a;s.anchorRadius=r;s.pendingPose={angle:a,radius:r};
  this.scheduleFrame();
 }
 scheduleFrame(){
  if(this.frame!==null||!this.items.size)return;
  this.frame=requestAnimationFrame(()=>{
   this.frame=null;this.tick();
   if(this.mode!=="static")this.scheduleFrame();
  });
 }
 omega(){return 2*Math.PI/(1200*Math.pow(1/40,this.speed/100))}
 motion(mode){
  const now=performance.now()/1000;
  this.tick(now);this.mode=mode;this.started=now;
  this.motionSpeedAt=now;this.phaseOffset=0;
  for(const s of this.items.values()){s.anchorAngle=s.angle;s.anchorRadius=s.radius;s.manual=false}
  if(mode!=="static")this.scheduleFrame();
  this.changed();
 }
 setSpeed(speed){
  const now=performance.now()/1000;
  this.tick(now);
  this.phaseOffset+=(now-this.motionSpeedAt)*this.omega();this.motionSpeedAt=now;
  this.speed=Math.max(0,Math.min(100,Number(speed)||0));
 }
 tick(now=performance.now()/1000){
  if(!this.items.size)return;
  let moved=false;
  const t=Math.max(0,now-this.started),phaseTime=this.phaseOffset+(now-this.motionSpeedAt)*this.omega();
  const blend=Math.min(1,t/.8),audioTime=this.ctx.currentTime;
  for(const s of this.items.values()){
   const j=s.motionIndex,base=s.anchorAngle,rad=s.anchorRadius,phase=j*1.71;
   if(s.pendingPose){
    const {angle,radius}=s.pendingPose;s.pendingPose=null;
    this.position(s,angle,radius,false,audioTime);moved=true;
   }
   if(s.manual||this.mode==="static")continue;
   let a=base,r=rad,x=0,y=0;
   if(this.mode==="cw")a+=phaseTime;
   else if(this.mode==="ccw")a-=phaseTime;
   else if(this.mode==="counter")a+=(j%2?-1:1)*phaseTime;
   else if(this.mode==="breath")r=Math.max(.22,Math.min(.94,rad+.20*(Math.sin(phaseTime+phase)-Math.sin(phase))));
   else if(this.mode==="spiral"){a+=phaseTime;r=rad*(1-blend)+(.22+.70*(.5-.5*Math.cos(.6*phaseTime+phase)))*blend}
   else {
    const q=phaseTime+phase;
    if(this.mode==="eight"){x=.77*Math.sin(q);y=-.60*Math.sin(2*q)-.20*Math.cos(q)}
    else if(this.mode==="chaos"){
     x=.43*Math.sin(q*.81)+.26*Math.sin(q*1.37+phase);
     y=.46*Math.cos(q*.59)+.23*Math.cos(q*1.67+phase*2);
    }
    x=Math.sin(base)*rad*(1-blend)+x*blend;
    y=-Math.cos(base)*rad*(1-blend)+y*blend;
    a=Math.atan2(x,-y);r=Math.min(.94,Math.hypot(x,y));
   }
   if(s.angle!==a||s.radius!==r){this.position(s,a,r,false,audioTime);moved=true}
  }
  if(moved)this.moved();
 }
}
export const MOTION=["static","cw","ccw","counter","eight","chaos","spiral","breath"];
export const MOTION_LABELS={static:"Статично",cw:"По часовой",ccw:"Против часовой",
counter:"Встречное вращение",eight:"Восьмёрка",chaos:"Плавный хаос",spiral:"Спираль",breath:"Дыхание"};
