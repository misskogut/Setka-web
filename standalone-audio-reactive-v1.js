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
  button.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M12.5 22V8l12-3v14"/><ellipse cx="9" cy="23" rx="4" ry="2.8" transform="rotate(-16 9 23)"/><ellipse cx="21" cy="20" rx="4" ry="2.8" transform="rotate(-16 21 20)"/></svg><span class="st34-audio-indicator" aria-hidden="true"></span>';
  ui.appendChild(button);

  const style=document.createElement("style");
  style.textContent=`
    #gameScreen #st34AudioButton {
      left: 24px; top: calc(var(--safe-top) + 30px);
      width: 54px; height: 54px; z-index: 141;
      color: #fff; background: rgba(0,0,0,.42);
      transition: border-color .2s, background .2s, opacity .2s;
    }
    /* Keep the original in-pattern note composer below the new music icon. */
    #gameScreen #st34Note.show {top:calc(var(--safe-top) + 101px)}
    #st34AudioButton svg {width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round}
    #st34AudioButton svg ellipse {fill:currentColor;stroke:none}
    #st34AudioButton .st34-audio-indicator {position:absolute;right:8px;top:8px;width:5px;height:5px;border-radius:50%;background:#fff;opacity:0}
    #st34AudioButton[aria-pressed="true"] {border-color:#fff;background:rgba(255,255,255,.13)}
    #st34AudioButton[aria-pressed="true"] .st34-audio-indicator {opacity:1}
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
  let stream=null,context=null,source=null,analyser=null,frequencies=null;
  let active=false,pending=false,seq=0,smoothed=0,lastFrameTime=0,feedbackTimer=0;

  function announce(message){
    feedback.textContent=message;
    feedback.classList.add("show");
    clearTimeout(feedbackTimer);
    feedbackTimer=setTimeout(()=>feedback.classList.remove("show"),3000);
  }
  function renderButton(){
    button.setAttribute("aria-pressed",String(active));
    button.setAttribute("aria-label",active?"Выключить реакцию паттерна на музыку":"Включить реакцию паттерна на музыку через микрофон");
    button.disabled=pending;
  }
  function releaseResources(resources){
    const {mic,ac,node}=resources||{};
    try{node?.disconnect()}catch(_){}
    try{mic?.getTracks()?.forEach(track=>track.stop())}catch(_){}
    try{ac?.close?.()?.catch?.(()=>{})}catch(_){}
  }
  function stop(silent=true){
    seq++; // Cancel any pending microphone permission before it resolves.
    const old={mic:stream,ac:context,node:source};
    stream=null;context=null;source=null;analyser=null;frequencies=null;
    active=false;pending=false;smoothed=0;lastFrameTime=0;
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
    let acquired=null,ac=null,node=null;
    try{
      // AudioContext is created directly from a button gesture for iOS Safari.
      const AudioCtor=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtor)throw new Error("audio-unsupported");
      ac=new AudioCtor();
      acquired=await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},
        video:false
      });
      if(ticket!==seq||!game.classList.contains("active")||document.hidden){
        releaseResources({mic:acquired,ac});return;
      }
      node=ac.createMediaStreamSource(acquired);
      const fft=ac.createAnalyser();
      fft.fftSize=1024;
      fft.smoothingTimeConstant=.72;
      node.connect(fft);
      await ac.resume();
      if(ticket!==seq||!game.classList.contains("active")||document.hidden){
        releaseResources({mic:acquired,ac,node});return;
      }
      if(ac.state!=="running")throw new Error("audio-suspended");
      stream=acquired;context=ac;source=node;analyser=fft;
      frequencies=new Uint8Array(fft.frequencyBinCount);
      smoothed=0;lastFrameTime=0;active=true;
      acquired.getAudioTracks().forEach(track=>track.addEventListener("ended",()=>{if(stream===acquired)stop(false)},{once:true}));
      announce("Реакция включена · звук через микрофон");
    }catch(err){
      releaseResources({mic:acquired,ac,node});
      if(ticket===seq){
        const denied=err?.name==="NotAllowedError"||err?.name==="PermissionDeniedError";
        announce(denied?"Разреши микрофон в настройках браузера":"Не удалось включить микрофон");
      }
    }finally{
      if(ticket===seq){pending=false;renderButton()}
    }
  }
  function nextFrame(baseFrame,now){
    if(!active||!analyser||context?.state!=="running"||!frequencies)return baseFrame;
    analyser.getByteFrequencyData(frequencies);
    const hz=context.sampleRate/analyser.fftSize;
    const band=(lo,hi)=>{
      const a=Math.max(1,Math.floor(lo/hz)),b=Math.min(frequencies.length,Math.max(a+1,Math.ceil(hi/hz)));
      let sum=0;for(let i=a;i<b;i++)sum+=frequencies[i];
      return sum/Math.max(1,b-a)/255;
    };
    // Both low and mid frequencies matter: phone microphones often suppress
    // deep bass. Attack/release smoothing prevents flash-like visual jumps.
    const energy=clamp((band(75,320)*.65+band(320,2400)*.35-.035)*3.5);
    smoothed+=((energy>smoothed)?.20:.065)*(energy-smoothed);
    const dt=lastFrameTime?clamp(now-lastFrameTime,0,48):0;
    lastFrameTime=now;
    // One universal time-domain modulation, applied to EVERY renderer.
    // No mutation of config, colour, favorites or note snapshots.
    return baseFrame+(dt/16.6667)*smoothed*.9;
  }
  button.addEventListener("click",()=>{if(active||pending)stop(false);else start()});
  window.addEventListener("setka:view",e=>{if(e.detail?.view!=="game"&&(active||pending))stop()});
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&(active||pending))stop()});
  window.addEventListener("pagehide",()=>{if(active||pending)stop()});
  window.SetkaAudioReactiveV1={
    isActive:()=>active, nextFrame, stop,
    status:()=>({active,pending,source:active?"microphone":"none",level:active?smoothed:0})
  };
  renderButton();
})();