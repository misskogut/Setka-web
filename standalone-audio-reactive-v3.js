(() => {
  "use strict";
  // SETKA Audio Reaction v3. Pattern-native sound choreography, no generic pulse modulate
  // animation clock. Canonical pattern geometry/configuration is untouched.
  // There is no recording, upload, audio output, or access to other apps.
  if (window.SetkaAudioReactiveV1) return;
  const game=document.getElementById("gameScreen");
  const ui=game?.querySelector(".game-ui");
  if(!game||!ui)return;

  const button=document.createElement("button");
  button.id="st34AudioButton";
  button.className="game-button";
  button.type="button";
  button.setAttribute("aria-pressed","false");
  button.setAttribute("aria-label","Включить реакцию паттерна на музыку через микрофон");
  button.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M12.5 22V8l12-3v14"/><ellipse cx="9" cy="23" rx="4" ry="2.8" transform="rotate(-16 9 23)"/><ellipse cx="21" cy="20" rx="4" ry="2.8" transform="rotate(-16 21 20)"/></svg>';
  // Match the colour selector: dots orbit the button, never form a row below it.
  // The colour button is 62px wide with a 42px ring; this 54px button
  // uses a 38px ring to preserve the same 11px gap outside its border.
  const dots=document.createElement("span");
  dots.id="st34AudioModeDots";
  dots.setAttribute("aria-hidden","true");
  const dotCount=5,ringRadius=38;
  for(let i=0;i<dotCount;i++){
    const dot=document.createElement("i");
    dot.className="st34-audio-dot";
    const angle=(-90+i*360/dotCount)*Math.PI/180;
    dot.style.transform=`translate(${Math.cos(angle)*ringRadius}px,${Math.sin(angle)*ringRadius}px)`;
    dots.appendChild(dot);
  }
  button.appendChild(dots);
  ui.appendChild(button);

  const style=document.createElement("style");
  style.textContent=`
    #gameScreen #st34AudioButton {
      left: 24px; top: calc(var(--safe-top) + 30px);
      width: 54px; height: 54px; z-index: 141;
      color: #fff; background: rgba(0,0,0,.30); opacity: .30;
      border-color: rgba(255,255,255,.46);
      transition: opacity .2s ease, border-color .2s ease;
    }
    /* Keep the original in-pattern note composer below the new music icon. */
    #gameScreen #st34Note.show {top:calc(var(--safe-top) + 101px)}
    #st34AudioButton svg {width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round}
    #st34AudioButton svg ellipse {fill:currentColor;stroke:none}
    #st34AudioModeDots {position:absolute;inset:-12px;pointer-events:none}
    #st34AudioModeDots .st34-audio-dot {display:block;position:absolute;left:50%;top:50%;
      width:5px;height:5px;margin:-2.5px;background:#fff;border-radius:50%;
      opacity:0;transition:opacity .18s ease;box-shadow:0 0 4px rgba(255,255,255,.5)}
    #st34AudioModeDots .st34-audio-dot.lit {opacity:.95}
    #gameScreen #st34AudioButton[aria-pressed="true"] {opacity:1;border-color:rgba(255,255,255,.75);background:rgba(0,0,0,.42)}
    #gameScreen #st34AudioButton[data-pending="true"] {opacity:.60}
    #gameScreen.st34-hidden-ui #st34AudioButton {opacity:0!important;pointer-events:none!important}
    #st34AudioButton:focus-visible {outline:2px solid white;outline-offset:3px}
    /* Silent gameplay: dots and button state only, no activation banners/toasts. */
    #gameScreen .toast {display:none!important}
    @media (prefers-reduced-motion:reduce){#st34AudioButton{transition:none}}
  `;
  document.head.appendChild(style);

  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  let stream=null,context=null,source=null,analyser=null,silentOutput=null,frequencies=null,waveform=null;
  let active=false,pending=false,seq=0,smoothed=0,lastFrameTime=0;
  let lastHeardAt=0,lastSilentHintAt=0,wasAudible=false;
  // Independent, smoothed channels for real visual modulation. These are
  // transient live measurements, not persisted to user configurations.
  let bands={low:0,mid:0,high:0,beat:0},bassReference=0;
  let releaseBands={low:0,mid:0,high:0,beat:0},releaseAt=0;
  // A smooth musical phase drives movement; amplitude still comes from actual mic bands.
  // It is transient runtime state, never written into a saved pattern configuration.
  let musicPhase=0,onsetMean=0,lastOnsetAt=0;
  const profiles=[
    {name:"Баланс",mix:{low:1,mid:1,high:1},beat:.15,space:1,rate:.99},
    {name:"Ритм",mix:{low:1.25,mid:.75,high:.55},beat:.85,space:.25,rate:.94},
    {name:"Волна",mix:{low:.18,mid:1.65,high:0},beat:.10,space:.45,rate:.91},
    {name:"Пространство",mix:{low:1.05,mid:1.05,high:0},beat:.25,space:2.0,rate:.94},
    {name:"Детали",mix:{low:0,mid:.14,high:1.7},beat:.12,space:0,rate:.95}
  ];
  let mode=0,previousMode=0,modeChangedAt=0,releaseMode=0;
  const profile=n=>profiles[n-1]||null;
  const blend=()=>modeChangedAt?clamp((performance.now()-modeChangedAt)/380):1;
  const lerp=(a,b,k)=>a+(b-a)*k;

  // Silent by design. State and errors remain readable to assistive tech
  // through the button's aria-label / data attributes, never a popup.
  function announce(){}
  function renderButton(){
    button.setAttribute("aria-pressed",String(active));
    const current=profile(mode);
    button.setAttribute("aria-label",active?
      "Музыка: "+current.name+", режим "+mode+" из "+profiles.length+". Нажать для следующего режима"+(mode===profiles.length?" — выключить":""):
      "Включить музыкальный эквалайзер через микрофон");
    button.removeAttribute("title");
    button.dataset.mode=String(mode);
    [...dots.children].forEach((dot,i)=>dot.classList.toggle("lit",active&&i<mode));
    button.dataset.pending=String(pending);
    // Do not disable this control: a second tap must be able to cancel
    // a pending microphone permission request on iPhone.
  }
  function releaseResources(resources){
    const {mic,ac,node,sink,fft}=resources||{};
    try{node?.disconnect()}catch(_){}
    try{fft?.disconnect()}catch(_){}
    try{sink?.disconnect()}catch(_){}
    try{mic?.getTracks()?.forEach(track=>track.stop())}catch(_){}
    try{ac?.close?.()?.catch?.(()=>{})}catch(_){}
  }
  function stop(silent=true){
    seq++; // Cancel any pending microphone permission before it resolves.
    if(active){
      releaseBands={...bands};
      releaseMode=mode;
      releaseAt=performance.now();
    }
    mode=0;previousMode=0;modeChangedAt=0;
    const old={mic:stream,ac:context,node:source,sink:silentOutput,fft:analyser};
    stream=null;context=null;source=null;analyser=null;silentOutput=null;frequencies=null;waveform=null;
    active=false;pending=false;smoothed=0;lastFrameTime=0;wasAudible=false;
    lastHeardAt=0;lastSilentHintAt=0;
    bands={low:0,mid:0,high:0,beat:0};bassReference=0;
    releaseResources(old);
    renderButton();
    // No overlay or toast on OFF.
  }
  async function start(){
    if(active||pending||!game.classList.contains("active"))return;
    if(!navigator.mediaDevices?.getUserMedia){
      button.dataset.error="unsupported";
      button.setAttribute("aria-label","Микрофон недоступен в этом браузере");
      return;
    }
    pending=true;const ticket=++seq;renderButton();
    let acquired=null,ac=null,node=null,sink=null,fft=null;
    try{
      // AudioContext is created directly from a button gesture for iOS Safari.
      const AudioCtor=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtor)throw new Error("audio-unsupported");
      ac=new AudioCtor();
      // iOS Safari may lose its user-gesture permission after awaiting the
      // microphone prompt. Unlock the audio graph IMMEDIATELY on this tap.
      const initialResume=ac.resume();
      initialResume?.catch?.(()=>{});
      acquired=await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},
        video:false
      });
      if(ticket!==seq||!game.classList.contains("active")||document.hidden){
        releaseResources({mic:acquired,ac});return;
      }
      node=ac.createMediaStreamSource(acquired);
      fft=ac.createAnalyser();
      fft.fftSize=1024;
      fft.smoothingTimeConstant=.72;
      node.connect(fft);
      // Safari may not pull microphone samples from an unconnected analyzer.
      // Route it through a ZERO-gain sink so the graph runs, without ever
      // sending microphone audio to the speakers (no echo or recording).
      sink=ac.createGain();
      sink.gain.value=0;
      fft.connect(sink);
      sink.connect(ac.destination);
      // Safari may suspend audio while the system permission sheet is shown.
      // Give it a bounded second resume attempt; never leave the button
      // indefinitely pending if the browser requires another user gesture.
      if(ac.state!=="running"){
        await Promise.race([ac.resume().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,1200))]);
      }
      if(ticket!==seq||!game.classList.contains("active")||document.hidden){
        releaseResources({mic:acquired,ac,node,sink,fft});return;
      }
      if(ac.state!=="running")throw new Error("audio-suspended");
      stream=acquired;context=ac;source=node;analyser=fft;silentOutput=sink;
      frequencies=new Uint8Array(fft.frequencyBinCount);
      waveform=new Uint8Array(fft.fftSize);
      smoothed=0;lastFrameTime=0;lastHeardAt=performance.now();lastSilentHintAt=0;wasAudible=false;
      bands={low:0,mid:0,high:0,beat:0};bassReference=0;releaseAt=0;
      musicPhase=0;onsetMean=0;lastOnsetAt=0;
      mode=1;previousMode=1;modeChangedAt=0;active=true;
      acquired.getAudioTracks().forEach(track=>track.addEventListener("ended",()=>{if(stream===acquired)stop(false)},{once:true}));
      button.dataset.error="";
    }catch(err){
      releaseResources({mic:acquired,ac,node,sink,fft});
      if(ticket===seq){
        const denied=err?.name==="NotAllowedError"||err?.name==="PermissionDeniedError";
        const suspended=err?.message==="audio-suspended";
        button.dataset.error=denied?"permission":suspended?"suspended":"unknown";
        button.setAttribute("aria-label",denied?"Разреши доступ к микрофону в браузере":suspended?"Коснись нотки повторно для запуска микрофона":"Микрофон недоступен");
      }
    }finally{
      if(ticket===seq){pending=false;renderButton()}
    }
  }
  function nextFrame(baseFrame,now,patternId=null){
    if(!active||!analyser||context?.state!=="running"||!frequencies||!waveform)return baseFrame;
    analyser.getByteFrequencyData(frequencies);
    analyser.getByteTimeDomainData(waveform);
    // Browser microphones have very different bass responses. The waveform
    // (RMS) works for phone speakers, voice and music without needing 60 Hz
    // bass; the spectrum adds a modest weight for rhythmic transients.
    let sumSquares=0;
    for(let i=0;i<waveform.length;i++){
      const x=(waveform[i]-128)/128;
      sumSquares+=x*x;
    }
    const rms=Math.sqrt(sumSquares/waveform.length);
    const hz=context.sampleRate/analyser.fftSize;
    const band=(lo,hi)=>{
      const a=Math.max(1,Math.floor(lo/hz));
      const b=Math.min(frequencies.length,Math.max(a+1,Math.ceil(hi/hz)));
      let total=0;
      for(let i=a;i<b;i++)total+=frequencies[i];
      return total/Math.max(1,b-a)/255;
    };
    const low=clamp((band(70,320)-.035)*2.1);
    const mid=clamp((band(320,1900)-.035)*2.1);
    const high=clamp((band(1900,6800)-.035)*2.3);
    const spectral=band(90,700)*.40+band(700,2800)*.60;
    // Significant mic audio should be noticeable even on slow fractals.
    // Natural silence stays at 0; do not invent a beat when no sound exists.
    const raw=clamp(Math.max(rms*5.0,spectral*1.1));
    const energy=clamp((raw-.085)*2.15);
    smoothed+=((energy>smoothed)?.24:.11)*(energy-smoothed);
    // Attack/release on each band keeps geometry continuous and prevents
    // rapid frequency noise from turning into violent pattern jumps.
    // Waveform RMS supplements low frequencies on bass-poor phone mics.
    // Keep musical bands distinct. Previous shared energy leakage made bass,
    // vocals and treble move nearly everything together.
    const targetLow=clamp(Math.max(low*.94,energy*.08));
    const targets={
      low:targetLow,
      mid:clamp(Math.max(mid*.96,energy*.045)),
      high:clamp(Math.max(high*.96,energy*.035))
    };
    for(const key of ["low","mid","high"]){
      const goal=targets[key];
      bands[key]+=((goal>bands[key])?.19:.09)*(goal-bands[key]);
    }
    bassReference+=.045*(targetLow-bassReference);
    // Rising spectral energy provides an onset even on bass-poor phone mics.
    // Refractory window prevents a single sustained chord from being treated as many beats.
    const onsetEnergy=targetLow*.58+targets.mid*.32+targets.high*.10;
    onsetMean+=(onsetEnergy-onsetMean)*.052;
    const onsetRise=Math.max(0,onsetEnergy-onsetMean);
    const transient=clamp(Math.max((targetLow-bassReference-.09)*2.1,(onsetRise-.12)*2.7));
    const onset=transient>.29&&(now-lastOnsetAt)>230;
    if(onset)lastOnsetAt=now;
    bands.beat=Math.max(bands.beat*.83,onset?transient:0);
    const deltaMs=lastFrameTime?clamp(now-lastFrameTime,0,48):0;
    lastFrameTime=now;
    // No autonomous animation at silence: all visible offsets are multiplied
    // by a real low/mid/high microphone envelope below.
    musicPhase+=(deltaMs/1000)*Math.PI*2*(.55+smoothed*.55+bands.beat*.32);
    if(energy>.085){
      lastHeardAt=now;
      if(!wasAudible){
        wasAudible=true;
        // No message: the geometry itself indicates sound input.
      }
    }else if(wasAudible&&now-lastHeardAt>1800){
      wasAudible=false;
    }
    if(now-lastHeardAt>4500&&now-lastSilentHintAt>14000){
      lastSilentHintAt=now;
      // No disruptive text while watching the pattern.
    }
    // Old 1x..7x speed obscured every geometric response, especially
    // Dandelion's native 0.01 rad/frame rotation. In music mode the geometry
    // performs; animation advances CALMLY. This is phase-continuous on toggle.
    const p=profile(mode);
    const old=profile(previousMode)||p;
    const rateModifier=lerp(old?.rate||1,p?.rate||1,blend());
    const audioRate=(patternId==="dandelion"?.19+smoothed*.16:.60+smoothed*.25)*rateModifier;
    return baseFrame+(deltaMs/16.6667)*(audioRate-1);
  }
  // v2 / FIVE CHOREOGRAPHIES. Each pattern gets FIVE genuinely different
  // render-time recipes; these are not the saved or touch-controlled settings.
  // Spec: [sound band, strength, response, min, max].
  // relative: swing/grow/shrink/pulse; absolute: add/wag/push;
  // steps: bounded, gently smoothed structural detail (not every raw FFT bin).
  const choreography={
    1:{
      "tentacle-orbit":{baseRadius:["low",.24,"swing",0,100],tentacleLength:["mid",.18,"swing",10,800],movementSpeed:["mid",.22,"grow",.05,10],lineWeight:["mid",.35,"grow",.1,10],circleSize:["high",.65,"grow",.2,20],colorSpeed:["high",.16,"grow",.05,10]},
      "dandelion":{v1:["low",.16,"swing",.02,2],tSpeed:["mid",.24,"swing",.001,.02],angleSpeed:["mid",.31,"swing",.001,.05],lineWeight:["high",.42,"grow",.1,10],pointSize:["high",.48,"grow",.2,20]},
      "fish-wave":{waveAmplitude:["low",22,"push",0,200],waveSpeed:["mid",.24,"grow",.001,.2],ringSpacing:["mid",.11,"swing",1,80],strokeW:["high",.45,"grow",.3,8],glitchOffset:["high",1.4,"add",0,20],ringAlpha:["high",.15,"grow",0,255]},
      "breathing-fractal":{pulseAmp:["low",.68,"grow",.05,2],baseLen:["mid",.28,"swing",10,180],pulseSpd:["mid",.30,"grow",.001,.3],strokeW:["high",.55,"grow",.1,8]},
      "breathing-fractal-growth":{levelSpeedRatio:["low",.26,"swing",.2,3],baseLen:["mid",.26,"swing",10,180],pulseSpeed:["mid",.29,"grow",.001,.1],levelSpeedRatio:["high",.20,"grow",.2,3],strokeW:["high",.46,"grow",.1,8]},
      "rgb-glitch-rings":{waveAmplitude:["low",.43,"grow",0,200],waveSpeed:["mid",.27,"grow",.001,.2],baseSpacing:["mid",.18,"swing",1,80],glitchOffset:["high",2.3,"add",0,20],strokeW:["high",.52,"grow",.3,8]},
      "stereo-dna":{amplitude:["low",.40,"swing",10,100],eyeSeparation:["low",.39,"swing",20,320],timeSpeed:["low",.18,"grow",.001,.1],spacing:["mid",.29,"swing",4,30],stereoAngle:["mid",.31,"swing",.01,.6],pointSize:["high",.66,"grow",1,8],glowStrength:["high",.36,"grow",20,255]}
    },
    2:{
      // Rhythm is *not* whole-shape zoom or uniform pulsing: each organism
      // plays its own native motor response to the beat and spectral accents.
      "tentacle-orbit":{movementSpeed:["low",.95,"grow",.05,10],baseRadius:["mid",8,"wag",0,100],tentacleLength:["low",.23,"swing",10,800],circleSize:["high",.40,"grow",.2,20]},
      "dandelion":{tSpeed:["low",.72,"grow",.001,.02],angleSpeed:["mid",.65,"swing",.001,.05],v1:["mid",.12,"swing",.02,2],lineWeight:["high",.37,"grow",.1,10]},
      "fish-wave":{waveSpeed:["low",.74,"grow",.001,.2],waveAmplitude:["mid",20,"add",0,200],glitchOffset:["high",7,"wag",0,20],baseRadius:["low",7,"add",1,100]},
      "breathing-fractal":{pulseSpd:["low",1.1,"grow",.001,.3],pulseAmp:["mid",.36,"swing",.05,2],strokeW:["high",.48,"grow",.1,8]},
      "breathing-fractal-growth":{pulseSpeed:["low",.94,"grow",.001,.1],levelSpeedRatio:["mid",.44,"swing",.2,3],strokeW:["high",.44,"grow",.1,8]},
      "rgb-glitch-rings":{waveSpeed:["low",.82,"grow",.001,.2],glitchOffset:["mid",8,"add",0,20],baseSpacing:["mid",3,"wag",1,80],waveAmplitude:["high",.28,"swing",0,200]},
      "stereo-dna":{eyeSeparation:["low",.36,"swing",20,320],stereoAngle:["mid",.52,"swing",.01,.6],timeSpeed:["low",.87,"grow",.001,.1],pointSize:["high",.25,"grow",1,8]}
    },
    3:{
      "tentacle-orbit":{movementSpeed:["mid",.53,"grow",.05,10],tentacleLength:["mid",.25,"swing",10,800],baseRadius:["mid",.42,"swing",0,100],circleSize:["mid",.28,"swing",.2,20]},
      "dandelion":{tSpeed:["mid",.43,"grow",.001,.02],v1:["mid",.29,"swing",.02,2],angleSpeed:["mid",.50,"swing",.001,.05],lineWeight:["mid",.29,"grow",.1,10]},
      "fish-wave":{waveAmplitude:["mid",62,"push",0,200],waveSpeed:["mid",.75,"grow",.001,.2],ringSpacing:["mid",.24,"swing",1,80],numLayers:["mid",5,"steps",5,100],strokeW:["mid",.32,"grow",.3,8]},
      "breathing-fractal":{pulseSpd:["mid",.72,"grow",.001,.3],pulseAmp:["mid",.53,"grow",.05,2],baseLen:["mid",.44,"swing",10,180]},
      "breathing-fractal-growth":{pulseSpeed:["mid",.58,"grow",.001,.1],levelSpeedRatio:["mid",.54,"swing",.2,3],baseLen:["mid",.32,"swing",10,180]},
      "rgb-glitch-rings":{waveSpeed:["mid",.64,"grow",.001,.2],waveAmplitude:["mid",.69,"swing",0,200],baseSpacing:["mid",.40,"swing",1,80],glitchOffset:["mid",.50,"swing",0,20]},
      "stereo-dna":{spacing:["mid",.41,"swing",4,30],stereoAngle:["mid",.50,"swing",.01,.6],timeSpeed:["mid",.63,"grow",.001,.1],amplitude:["mid",.31,"swing",10,100]}
    },
    4:{
      "tentacle-orbit":{tentacleLength:["low",.24,"swing",10,800],baseRadius:["low",.37,"grow",0,100],circleSize:["mid",.36,"grow",.2,20]},
      "dandelion":{tSpeed:["low",.29,"grow",.001,.02],angleSpeed:["mid",.54,"swing",.001,.05],lineWeight:["mid",.33,"grow",.1,10]},
      "fish-wave":{waveAmplitude:["low",33,"push",0,200],ringSpacing:["mid",.31,"swing",1,80],glitchOffset:["mid",8,"add",0,20],waveSpeed:["mid",.36,"grow",.001,.2]},
      "breathing-fractal":{baseLen:["mid",.36,"swing",10,180],pulseAmp:["low",.46,"swing",.05,2],pulseSpd:["mid",.36,"grow",.001,.3]},
      "breathing-fractal-growth":{levelSpeedRatio:["low",.34,"swing",.2,3],baseLen:["mid",.37,"grow",10,180],levelSpeedRatio:["mid",.39,"swing",.2,3]},
      "rgb-glitch-rings":{glitchOffset:["mid",9,"add",0,20],waveAmplitude:["low",.38,"grow",0,200],baseSpacing:["mid",.33,"swing",1,80]},
      "stereo-dna":{eyeSeparation:["low",.63,"swing",20,320],stereoAngle:["mid",.71,"swing",.01,.6],timeSpeed:["low",.30,"grow",.001,.1],spacing:["mid",.23,"swing",4,30]}
    },
    5:{
      "tentacle-orbit":{circleSize:["high",.98,"grow",.2,20],lineWeight:["high",.88,"grow",.1,10],segmentStep:["high",-1,"steps",1,20],colorSpeed:["high",.30,"grow",.05,10]},
      "dandelion":{numShapes:["high",90,"steps",50,1000],pointSize:["high",.85,"grow",.2,20],lineWeight:["high",.44,"grow",.1,10]},
      "fish-wave":{numLayers:["high",12,"steps",5,100],strokeW:["high",.80,"grow",.3,8],glitchOffset:["high",9,"add",0,20],ringAlpha:["high",42,"add",0,255],waveAmplitude:["high",16,"add",0,200]},
      "breathing-fractal":{branches:["high",3,"steps",2,60],layers:["high",1,"steps",1,6],strokeW:["high",.80,"grow",.1,8]},
      "breathing-fractal-growth":{maxDepth:["high",1,"steps",1,6],levelSpeedRatio:["high",.36,"grow",.2,3],strokeW:["high",.83,"grow",.1,8]},
      "rgb-glitch-rings":{numRings:["high",9,"steps",5,100],glitchOffset:["high",9,"add",0,20],strokeW:["high",.79,"grow",.3,8],ringAlpha:["high",38,"add",0,255]},
      "stereo-dna":{pointSize:["high",.89,"grow",1,8],glowStrength:["high",.58,"grow",20,255],numPoints:["high",70,"steps",40,600],spacing:["high",.19,"shrink",4,30]}
    }
  };
  function visualBands(){
    if(active)return bands;
    const k=clamp(1-(performance.now()-releaseAt)/500);
    if(!releaseAt||k<=0)return null;
    return Object.fromEntries(Object.entries(releaseBands).map(([name,v])=>[name,v*k]));
  }
  // Every response is attached to a native renderer parameter.
  // There is no shared zoom pulse. Beat hits modulate real sound envelopes;
  // unrelated oscillations never occur while the microphone is silent.
  function configForMode(original,patternId,live,n,time){
    const p=profile(n),recipe=choreography[n]?.[patternId];
    if(!p||!recipe)return original;
    const out={...original};
    let index=0;
    for(const [key,[channel,strength,response,min,max]] of Object.entries(recipe)){
      if(!Number.isFinite(original[key])){index++;continue}
      const level=clamp(live[channel]*(p.mix[channel]||0)+
        live.beat*p.beat*(channel==="low"?.33:channel==="mid"?.16:.10));
      const phase=musicPhase*(channel==="high"?1.72:channel==="mid"?1.25:.91)+index*.81+.20;
      const oscillation=Math.sin(phase);
      let value=original[key];
      if(response==="swing")value*=1+strength*level*oscillation;
      else if(response==="grow")value*=1+strength*level;
      else if(response==="shrink")value*=1-strength*level;
      else if(response==="add")value+=strength*level;
      else if(response==="wag")value+=strength*level*oscillation;
      else if(response==="push")value+=strength*level*(.65+.35*oscillation);
      else if(response==="steps")value+=Math.round(strength*clamp((level-.15)*1.25));
      out[key]=response==="steps"?Math.round(clamp(value,min,max)):clamp(value,min,max);
      index++;
    }
    return out;
  }
  function renderConfig(original,patternId){
    const live=visualBands();
    if(!live||!original||typeof original!=="object")return original;
    const next=active?mode:releaseMode,old=active?previousMode:releaseMode;
    const now=performance.now()/1000;
    const dest=configForMode(original,patternId,live,next,now);
    if(!active||old===next)return dest;
    const k=blend();
    if(k>=1)return dest;
    const src=configForMode(original,patternId,live,old,now);
    const result={...original};
    for(const key of Object.keys(original)){
      result[key]=Number.isFinite(src[key])&&Number.isFinite(dest[key])?
        lerp(src[key],dest[key],k):original[key];
    }
    return result;
  }
  function modeOffsets(n,patternId,w,h,live,time){
    const p=profile(n);
    if(!p)return{x:0,y:0};
    const low=clamp(live.low+live.beat*.30),mid=clamp(live.mid+live.low*.16);
    const xlimit=Math.min(66,w*.17),ylimit=Math.min(44,h*.055);
    // These are distinct choreographies, not five strengths of one sway.
    // WAVE: the fish's WHOLE CENTRE dances left/right; its rings also
    // breathe and change their actual native waveAmplitude/waveSpeed.
    if(n===3&&patternId==="fish-wave"){
      return{x:Math.sin(musicPhase*1.13)*mid*xlimit,
             y:Math.sin(musicPhase*2.26+.4)*mid*Math.min(10,h*.013)};
    }
    // RHYTHM: lateral snare/kick movement of fish's centre, no zoom-pulse.
    if(n===2&&patternId==="fish-wave"){
      return{x:Math.sin(musicPhase*1.62+.45)*low*Math.min(39,w*.105),y:0};
    }
    // DANDELION: tiny orbital drift, while strands evolve by tSpeed and v1.
    if(n===2&&patternId==="dandelion"){
      return{x:Math.sin(musicPhase*.70)*mid*Math.min(14,w*.042),
             y:Math.cos(musicPhase*.93)*low*Math.min(12,h*.025)};
    }
    // SPACE: two independent, sound-gated axes across ALL seven patterns.
    if(n===4){
      return{x:Math.sin(musicPhase*.87+.45)*low*Math.min(44,w*.11),
             y:Math.sin(musicPhase*1.26+1.10)*mid*ylimit};
    }
    // BALANCE: keep a restrained legacy sway in DNA and Dandelion only.
    if(n===1&&(patternId==="stereo-dna"||patternId==="dandelion")){
      return{x:Math.sin(musicPhase*.78+.35)*low*Math.min(20,w*.06),
             y:Math.sin(musicPhase*1.02+.85)*mid*Math.min(16,h*.025)};
    }
    // WAVE adds gentle sideways drift to the non-fish linear patterns.
    if(n===3&&(patternId==="stereo-dna"||patternId==="dandelion")){
      return{x:Math.sin(musicPhase*1.14+.50)*mid*Math.min(26,w*.075),y:0};
    }
    return{x:0,y:0};
  }
  function offsets(patternId,w,h){
    const live=visualBands();
    if(!live)return{x:0,y:0};
    const next=active?mode:releaseMode,old=active?previousMode:releaseMode;
    const time=performance.now()/1000;
    const dest=modeOffsets(next,patternId,w,h,live,time);
    if(!active||old===next)return dest;
    const src=modeOffsets(old,patternId,w,h,live,time),k=blend();
    return{x:lerp(src.x,dest.x,k),y:lerp(src.y,dest.y,k)};
  }
  function viewportScale(){return 1}
  function advanceMode(){
    if(mode>=profiles.length){stop(false);return}
    previousMode=mode;
    mode+=1;
    modeChangedAt=performance.now();
    renderButton();
    // The glowing orbit dots are the mode indicator.
  }
  button.addEventListener("click",()=>{if(pending)stop(false);else if(active)advanceMode();else start()});
  window.addEventListener("setka:view",e=>{if(e.detail?.view!=="game"&&(active||pending))stop()});
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&(active||pending))stop()});
  window.addEventListener("pagehide",()=>{if(active||pending)stop()});
  window.SetkaAudioReactiveV1={
    isActive:()=>active, nextFrame, renderConfig, offsets, viewportScale, stop,
    status:()=>({active,pending,mode,modeName:profile(mode)?.name||"Выключен",modes:profiles.map(p=>p.name),
      source:active?"microphone":"none",level:active?smoothed:0,heard:active&&wasAudible,
      bands:active?{...bands}:{low:0,mid:0,high:0,beat:0},motionVersion:3})
  };
  renderButton();
})();