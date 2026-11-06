// SETKA Music: one persistent WebAudio mixer shared by the catalog and orbit editor.
export class SetkaMusicMixer {
 constructor() {
  this.ctx=null; this.master=null; this.items=new Map();
  this.mode="static"; this.speed=40; this.started=performance.now()/1000;
  this.changed=()=>{}; this.moved=()=>{}; this.onTrackEvent=()=>{}; this.clock=null;
 }
 init() {
  if (!this.ctx) {
   const A=window.AudioContext||window.webkitAudioContext;
   if(!A)throw Error("audio_unsupported");
   this.ctx=new A();
   this.master=this.ctx.createDynamicsCompressor();
   this.master.threshold.value=-10;
   this.master.knee.value=3;this.master.ratio.value=12;
   this.master.attack.value=.003;this.master.release.value=.25;
   this.master.connect(this.ctx.destination);
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
   // HRTF needs a directional/mono input; explicit one-channel input avoids
   // stereo beds masking the front/back positional cues.
   panner.panningModel="HRTF";panner.distanceModel="inverse";
   try{panner.channelCount=1;panner.channelCountMode="explicit"}catch(_){}
   // A wider near/far acoustic range than the previous 1+7*r / .42 rolloff.
   panner.refDistance=2.05;panner.maxDistance=19;panner.rolloffFactor=.9;
   rearFilter.type="lowpass";rearFilter.frequency.value=17000;rearFilter.Q.value=.65;
   gain.connect(rearFilter);rearFilter.connect(panner);panner.connect(this.master);gain.gain.value=0;
   const makeDeck=(volume)=>{
    const el=new Audio();
    el.loop=false;el.crossOrigin="anonymous";el.preload="auto";el.src=track.audio_url;
    const src=this.ctx.createMediaElementSource(el);
    const fade=this.ctx.createGain();fade.gain.value=volume;
    src.connect(fade);fade.connect(gain);
    return {el,src,fade};
   };
   const decks=[makeDeck(1)];
   if(track.loop!==false)decks.push(makeDeck(0));
   state={id,track,level:0,playTracked:false,completed:false,angle,radius:.62+(index%3)*.08,
    anchorAngle:angle,anchorRadius:.62+(index%3)*.08,manual:false,
    el:decks[0].el,src:decks[0].src,gain,rearFilter,panner,decks,activeDeck:0,transition:null,pendingLoop:false};
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
  const now=this.ctx.currentTime;state.gain.gain.cancelScheduledValues(now);
  state.gain.gain.setTargetAtTime([0,.20,.45,.75][state.level],now,.045);
  if(!this.clock)this.clock=setInterval(()=>this.tick(),75);
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
    d.src.disconnect();d.fade.disconnect();
   }
   s.gain.disconnect();s.rearFilter.disconnect();s.panner.disconnect();
  },220);
  if(!this.items.size){clearInterval(this.clock);this.clock=null;this.mode="static"}
  this.changed();
 }
 stopAll(){for(const id of [...this.items.keys()])this.remove(id);this.mode="static";this.changed()}
 position(s,a,r){
  s.angle=a;s.radius=r;
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const smooth=(a,b,x)=>{const u=clamp((x-a)/(b-a),0,1);return u*u*(3-2*u)};
  // The inner ring is genuinely close; the outer ring is distinctly distant.
  // Keep the physical target continuous through 8D crossings at the listener:
  // the old fixed minimum radius caused an audible 180-degree teleport.
  const depth=smooth(.14,.94,r);
  const nearCenter=smooth(0,.16,r);
  const distance=(2.05+7.25*Math.pow(depth,1.15))*nearCenter;
  const x=Math.sin(a)*distance,z=-Math.cos(a)*distance;
  // A muffled, slightly elevated rear image supplies a perceptual cue that
  // generic browser HRTFs alone often fail to distinguish from straight ahead.
  const behind=smooth(-.28,.82,-Math.cos(a))*smooth(.06,.32,r);
  const cutoff=clamp(17000-12400*behind-3800*depth,2600,17000);
  const t=this.ctx.currentTime;
  if(s.rearFilter?.frequency?.setTargetAtTime){
   s.rearFilter.frequency.setTargetAtTime(cutoff,t,.16);
  }else if(s.rearFilter?.frequency){s.rearFilter.frequency.value=cutoff}
  if(s.panner.positionX?.setTargetAtTime){
   s.panner.positionX.setTargetAtTime(x,t,.15);
   s.panner.positionY?.setTargetAtTime(.48*behind*nearCenter,t,.15);
   s.panner.positionZ.setTargetAtTime(z,t,.15);
  }else{s.panner.setPosition(x,.48*behind*nearCenter,z)}
 }
 drag(id,a,r){
  const s=this.items.get(id);if(!s)return;
  s.manual=true;s.anchorAngle=a;s.anchorRadius=r;
  this.position(s,a,r);this.moved();
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
   else if(this.mode==="breath")r=Math.max(.22,Math.min(.94,rad+.20*(Math.sin(w*t+phase)-Math.sin(phase))));
   else if(this.mode==="spiral"){a+=w*t;r=rad*(1-blend)+(.22+.70*(.5-.5*Math.cos(.6*w*t+phase)))*blend}
   else {
    const q=w*t+phase;
    if(this.mode==="eight"){x=.77*Math.sin(q);y=-.60*Math.sin(2*q)-.20*Math.cos(q)}
    else if(this.mode==="chaos"){
     x=.43*Math.sin(q*.81)+.26*Math.sin(q*1.37+phase);
     y=.46*Math.cos(q*.59)+.23*Math.cos(q*1.67+phase*2);
    }
    x=Math.sin(base)*rad*(1-blend)+x*blend;
    y=-Math.cos(base)*rad*(1-blend)+y*blend;
    a=Math.atan2(x,-y);r=Math.min(.94,Math.hypot(x,y));
   }
   this.position(s,a,r);
  }
  this.moved();
 }
}
export const MOTION=["static","cw","ccw","counter","eight","chaos","spiral","breath"];
export const MOTION_LABELS={static:"Статично",cw:"По часовой",ccw:"Против часовой",
counter:"Встречное вращение",eight:"Восьмёрка",chaos:"Плавный хаос",spiral:"Спираль",breath:"Дыхание"};
