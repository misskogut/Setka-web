(() => {
  "use strict";
  // SETKA Audio Reaction v1. A microphone envelope modulates the shared
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
  button.title="Реакция на музыку";
  button.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M12.5 22V8l12-3v14"/><ellipse cx="9" cy="23" rx="4" ry="2.8" transform="rotate(-16 9 23)"/><ellipse cx="21" cy="20" rx="4" ry="2.8" transform="rotate(-16 21 20)"/></svg>';
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
    #gameScreen #st34AudioButton[aria-pressed="true"] {opacity:1;border-color:rgba(255,255,255,.75);background:rgba(0,0,0,.42)}
    #gameScreen #st34AudioButton[data-pending="true"] {opacity:.60}
    #gameScreen.st34-hidden-ui #st34AudioButton {opacity:0!important;pointer-events:none!important}
    #st34AudioButton:focus-visible {outline:2px solid white;outline-offset:3px}
    #st34AudioFeedback {position:absolute;z-index:140;top:calc(var(--safe-top) + 94px);left:16px;max-width:min(260px,calc(100vw - 36px));pointer-events:none;
      font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;font-size:11px;line-height:1.35;
      text-align:left;color:rgba(255,255,255,.92);background:rgba(0,0,0,.86);
      border:1px solid rgba(255,255,255,.25);border-radius:13px;padding:9px 12px;
      opacity:0;transition:opacity .15s ease}
    #st34AudioFeedback.show {opacity:1}
    #gameScreen.st34-hidden-ui #st34AudioFeedback {opacity:0!important}
    @media (prefers-reduced-motion:reduce){#st34AudioButton,#st34AudioFeedback{transition:none}}
  `;
  document.head.appendChild(style);

  const feedback=document.createElement("div");
  feedback.id="st34AudioFeedback";
  feedback.setAttribute("role","status");
  feedback.setAttribute("aria-live","polite");
  ui.appendChild(feedback);

  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  let stream=null,context=null,source=null,analyser=null,silentOutput=null,frequencies=null,waveform=null;
  let active=false,pending=false,seq=0,smoothed=0,lastFrameTime=0,feedbackTimer=0;
  let lastHeardAt=0,lastSilentHintAt=0,wasAudible=false;
  // Independent, smoothed channels for real visual modulation. These are
  // transient live measurements, not persisted to user configurations.
  let bands={low:0,mid:0,high:0,beat:0},bassReference=0;
  let releaseBands={low:0,mid:0,high:0,beat:0},releaseAt=0;

  function announce(message){
    feedback.textContent=message;
    feedback.classList.add("show");
    clearTimeout(feedbackTimer);
    feedbackTimer=setTimeout(()=>feedback.classList.remove("show"),3000);
  }
  function renderButton(){
    button.setAttribute("aria-pressed",String(active));
    button.setAttribute("aria-label",active?"Выключить реакцию паттерна на музыку":"Включить реакцию паттерна на музыку через микрофон");
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
      releaseAt=performance.now();
    }
    const old={mic:stream,ac:context,node:source,sink:silentOutput,fft:analyser};
    stream=null;context=null;source=null;analyser=null;silentOutput=null;frequencies=null;waveform=null;
    active=false;pending=false;smoothed=0;lastFrameTime=0;wasAudible=false;
    lastHeardAt=0;lastSilentHintAt=0;
    bands={low:0,mid:0,high:0,beat:0};bassReference=0;
    releaseResources(old);
    renderButton();
    if(!silent)announce("Реакция на музыку выключена");
  }
  async function start(){
    if(active||pending||!game.classList.contains("active"))return;
    if(!navigator.mediaDevices?.getUserMedia){
      announce("В этом браузере недоступен микрофон");
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
      bands={low:0,mid:0,high:0,beat:0};bassReference=0;releaseAt=0;active=true;
      acquired.getAudioTracks().forEach(track=>track.addEventListener("ended",()=>{if(stream===acquired)stop(false)},{once:true}));
      announce("Микрофон включён · включи музыку рядом");
    }catch(err){
      releaseResources({mic:acquired,ac,node,sink,fft});
      if(ticket===seq){
        const denied=err?.name==="NotAllowedError"||err?.name==="PermissionDeniedError";
        const suspended=err?.message==="audio-suspended";
        announce(denied?"Разреши микрофон в настройках браузера":suspended?"Коснись нотки ещё раз: Safari приостановил звук":"Не удалось включить микрофон");
      }
    }finally{
      if(ticket===seq){pending=false;renderButton()}
    }
  }
  function nextFrame(baseFrame,now){
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
    const targetLow=clamp(Math.max(low*.76,energy*.38));
    const targets={low:targetLow,mid:clamp(Math.max(mid,energy*.24)),high:clamp(Math.max(high,energy*.16))};
    for(const key of ["low","mid","high"]){
      const goal=targets[key];
      bands[key]+=((goal>bands[key])?.19:.09)*(goal-bands[key]);
    }
    bassReference+=.045*(targetLow-bassReference);
    const transient=clamp((targetLow-bassReference-.09)*2.1);
    bands.beat=Math.max(bands.beat*.87,transient);
    const deltaMs=lastFrameTime?clamp(now-lastFrameTime,0,48):0;
    lastFrameTime=now;
    if(energy>.085){
      lastHeardAt=now;
      if(!wasAudible){
        wasAudible=true;
        announce("Музыку слышно · паттерн реагирует");
      }
    }else if(wasAudible&&now-lastHeardAt>1800){
      wasAudible=false;
    }
    if(now-lastHeardAt>4500&&now-lastSilentHintAt>14000){
      lastSilentHintAt=now;
      announce("Микрофон не слышит музыку · включи звук рядом");
    }
    // One shared animation clock drives existing AND future renderers. A
    // bounded 1x..7x speed with attack/release is perceivable but continuous.
    // Runtime configuration, color, stored frames and favorites stay intact.
    return baseFrame+(deltaMs/16.6667)*smoothed*6;
  }
  // Small, safe mappings to actual parameters of the seven existing
  // renderers.  Do not touch discrete topology counts, colour modes, stereo
  // angle or user-chosen values: render overrides exist for ONE frame only.
  const mappings={
    "tentacle-orbit":{baseRadius:["low",.40,0,120],circleSize:["high",.50,.1,10],lineWeight:["mid",.35,.1,8]},
    "dandelion":{zoom:["low",.16,.2,5],pointSize:["high",.40,.3,16],lineWeight:["mid",.32,.1,6]},
    "fish-wave":{waveAmplitude:["low",.85,0,120],ringSpacing:["mid",.09,1,30],strokeW:["high",.42,.2,7]},
    "breathing-fractal":{pulseAmp:["low",.75,0,2],baseLen:["mid",.18,10,150],strokeW:["high",.35,.2,7]},
    "breathing-fractal-growth":{zoom:["low",.13,.2,5],baseLen:["mid",.20,10,150],strokeW:["high",.38,.2,7]},
    "rgb-glitch-rings":{waveAmplitude:["low",.90,0,130],glitchOffset:["high",.85,0,12],strokeW:["mid",.36,.2,7]},
    "stereo-dna":{amplitude:["low",.38,5,150],spacing:["mid",.11,3,40],pointSize:["high",.45,.5,9]}
  };
  function visualBands(){
    if(active)return bands;
    const k=clamp(1-(performance.now()-releaseAt)/380);
    if(!releaseAt||k<=0)return null;
    return Object.fromEntries(Object.entries(releaseBands).map(([name,v])=>[name,v*k]));
  }
  function renderConfig(original,patternId){
    const live=visualBands();
    if(!live||!original||typeof original!=="object")return original;
    const recipe=mappings[patternId];
    if(!recipe)return original; // Future renderers still get shared zoom/clock
    const out={...original};
    for(const [key,[bandName,strength,lo,hi]] of Object.entries(recipe)){
      if(!Number.isFinite(original[key]))continue;
      const level=clamp(live[bandName]+live.beat*(bandName==="low"?.20:.06));
      out[key]=clamp(original[key]*(1+strength*level),lo,hi);
    }
    return out;
  }
  // All pattern renderers, including ones added later, respond subtly to the
  // overall musical envelope through their shared viewport. Always >1 scale:
  // black background stays fully covered and there are no edge artefacts.
  function viewportScale(){
    const live=visualBands();
    return live?1+clamp(live.low*.030+live.beat*.012,0,.05):1;
  }
  button.addEventListener("click",()=>{if(active||pending)stop(false);else start()});
  window.addEventListener("setka:view",e=>{if(e.detail?.view!=="game"&&(active||pending))stop()});
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&(active||pending))stop()});
  window.addEventListener("pagehide",()=>{if(active||pending)stop()});
  window.SetkaAudioReactiveV1={
    isActive:()=>active, nextFrame, renderConfig, viewportScale, stop,
    status:()=>({active,pending,source:active?"microphone":"none",level:active?smoothed:0,heard:active&&wasAudible,
      bands:active?{...bands}:{low:0,mid:0,high:0,beat:0}})
  };
  renderButton();
})();