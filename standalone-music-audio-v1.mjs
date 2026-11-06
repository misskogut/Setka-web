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
 async change(track,level) {
  level=Number(level)||0;
  const id=String(track.id),old=this.items.get(id);
  if(level<1){this.remove(id);return}
  try{this.init()}catch(e){this.changed(e.message);return}
  let state=old;
  if(!state) {
   const index=this.items.size,angle=index*2.399963229728653;
   const el=new Audio();el.loop=track.loop!==false;el.crossOrigin="anonymous";
   el.preload="auto";el.src=track.audio_url;
   const src=this.ctx.createMediaElementSource(el),gain=this.ctx.createGain(),panner=this.ctx.createPanner();
   panner.panningModel="HRTF";panner.distanceModel="inverse";
   panner.refDistance=1;panner.maxDistance=35;panner.rolloffFactor=.42;
   src.connect(gain);gain.connect(panner);panner.connect(this.master);gain.gain.value=0;
   state={id,track,level:0,playTracked:false,completed:false,angle,radius:.62+(index%3)*.08,
    anchorAngle:angle,anchorRadius:.62+(index%3)*.08,manual:false,el,src,gain,panner};
   this.items.set(id,state);this.position(state,angle,state.radius);
   el.addEventListener("playing",()=>{
    if(state.playTracked||!this.items.has(id))return;
    state.playTracked=true;
    try{this.onTrackEvent({track_id:id,event_type:"play",event_id:crypto.randomUUID()})}catch(_){}
   });
   el.addEventListener("timeupdate",()=>{
    if(!state.playTracked||state.completed||!this.items.has(id))return;
    const d=Number(el.duration)||Number(state.track.duration_seconds)||0;
    if(d>0&&el.currentTime>=d*.95){
     state.completed=true;
     try{this.onTrackEvent({track_id:id,event_type:"complete",event_id:crypto.randomUUID()})}catch(_){}
    }
   });
   el.play().catch(()=>{this.remove(id);this.changed("Не удалось воспроизвести аудиофайл")});
  }
  state.level=Math.max(1,Math.min(3,level));state.track=track;
  const now=this.ctx.currentTime;state.gain.gain.cancelScheduledValues(now);
  state.gain.gain.setTargetAtTime([0,.20,.45,.75][state.level],now,.045);
  if(!this.clock)this.clock=setInterval(()=>this.tick(),75);
  this.changed();
 }
 remove(id){
  const s=this.items.get(id);if(!s)return;
  this.items.delete(id);
  s.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.025);
  setTimeout(()=>{s.el.pause();s.el.removeAttribute("src");s.el.load();
   s.src.disconnect();s.gain.disconnect();s.panner.disconnect()},220);
  if(!this.items.size){clearInterval(this.clock);this.clock=null;this.mode="static"}
  this.changed();
 }
 stopAll(){for(const id of [...this.items.keys()])this.remove(id);this.mode="static";this.changed()}
 position(s,a,r){
  s.angle=a;s.radius=r;
  const distance=1+7*r,x=Math.sin(a)*distance,z=-Math.cos(a)*distance,t=this.ctx.currentTime;
  if(s.panner.positionX?.setTargetAtTime){
   s.panner.positionX.setTargetAtTime(x,t,.07);
   s.panner.positionZ.setTargetAtTime(z,t,.07);
  }else{s.panner.setPosition(x,0,z)}
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
  if(this.mode==="static"||!this.items.size)return;
  const t=Math.max(0,performance.now()/1000-this.started),w=this.omega(),blend=Math.min(1,t/.8);
  let i=0;
  for(const s of this.items.values()){
   const j=i++,base=s.anchorAngle,rad=s.anchorRadius,phase=j*1.71;
   if(s.manual)continue;
   let a=base,r=rad,x=0,y=0;
   if(this.mode==="cw")a+=w*t;
   else if(this.mode==="ccw")a-=w*t;
   else if(this.mode==="counter")a+=(j%2?-1:1)*w*t;
   else if(this.mode==="breath")r=Math.max(.33,Math.min(.87,rad+.15*(Math.sin(w*t+phase)-Math.sin(phase))));
   else if(this.mode==="spiral"){a+=w*t;r=rad*(1-blend)+(.34+.48*(.5-.5*Math.cos(.6*w*t+phase)))*blend}
   else {
    const q=w*t+phase;
    if(this.mode==="eight"){x=.77*Math.sin(q);y=-.60*Math.sin(2*q)}
    else if(this.mode==="chaos"){
     x=.43*Math.sin(q*.81)+.26*Math.sin(q*1.37+phase);
     y=.46*Math.cos(q*.59)+.23*Math.cos(q*1.67+phase*2);
    }
    x=Math.sin(base)*rad*(1-blend)+x*blend;
    y=-Math.cos(base)*rad*(1-blend)+y*blend;
    a=Math.atan2(x,-y);r=Math.max(.33,Math.min(.86,Math.hypot(x,y)));
   }
   this.position(s,a,r);
  }
  this.moved();
 }
}
export const MOTION=["static","cw","ccw","counter","eight","chaos","spiral","breath"];
export const MOTION_LABELS={static:"Статично",cw:"По часовой",ccw:"Против часовой",
counter:"Встречное вращение",eight:"Восьмёрка",chaos:"Плавный хаос",spiral:"Спираль",breath:"Дыхание"};
