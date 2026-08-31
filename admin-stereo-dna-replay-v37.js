(() => {
  "use strict";

  const PATTERN_ID="stereo-dna";
  const priorFetch=window.fetch.bind(window);
  let latest=null,raf=0;

  const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

  function requestAction(args){try{const raw=(args[1]||{}).body;return typeof raw==="string"?JSON.parse(raw)?.action:null}catch(_){return null}}
  window.fetch=async function(...args){const action=requestAction(args),res=await priorFetch(...args);if(action==="admin-session")res.clone().json().then(data=>{latest=data;ensureLoop()}).catch(()=>{});return res};

  const style=document.createElement("style");
  style.textContent='.dna37-replay-canvas{position:absolute;inset:0;width:100%;height:100%;background:#000;display:none;pointer-events:none;z-index:2}';
  document.head.appendChild(style);

  function stateAt(data,ms){
    const events=(data?.events||[]).filter(e=>e.event_type==="app_state"&&e.payload?.config).sort((a,b)=>n(a.t_ms)-n(b.t_ms));
    const snapshots=(data?.snapshots||[]).slice().sort((a,b)=>n(a.t_ms)-n(b.t_ms));
    let best=null,bestT=-1;
    for(const e of events){const t=n(e.t_ms);if(t<=ms&&t>=bestT){best=e.payload;bestT=t}else if(t>ms)break}
    if(!best)for(const s of snapshots){const t=n(s.t_ms);if(t<=ms&&t>=bestT){best=s.app_state;bestT=t}else if(t>ms)break}
    return{state:best,tMs:Math.max(0,bestT)};
  }

  function configOf(raw){return{
    angleStep:clamp(n(raw?.angleStep,.25),.02,1.2),
    spacing:clamp(n(raw?.spacing,10),4,30),
    numPoints:clamp(Math.round(n(raw?.numPoints,300)),40,600),
    amplitude:clamp(n(raw?.amplitude,55),10,100),
    eyeSeparation:clamp(n(raw?.eyeSeparation,150),20,320),
    stereoAngle:clamp(n(raw?.stereoAngle,.42),.01,.6),
    zoom:clamp(n(raw?.zoom,1),.3,5),
    glowStrength:clamp(n(raw?.glowStrength,150),20,255),
    timeSpeed:clamp(n(raw?.timeSpeed,.02),.001,.1),
    pointSize:clamp(n(raw?.pointSize,3),1,8)
  }}

  function point(ctx,x,y,size,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,Math.max(.5,size/2),0,Math.PI*2);ctx.fill()}
  function spiral(ctx,xOffset,angleShift,c,phase,trailAlpha){
    ctx.save();ctx.translate(xOffset,0);
    const alpha=clamp(c.glowStrength/255*trailAlpha,0,1);
    for(let i=0;i<c.numPoints;i++){
      const angle=i*c.angleStep+phase;
      const y=(i-c.numPoints/2)*c.spacing;
      const x1=Math.cos(angle+angleShift)*c.amplitude;
      const x2=Math.cos(angle+Math.PI+angleShift)*c.amplitude;
      const r1=clamp(100+80*Math.sin(i*.1+phase),0,255);
      const g2=clamp(100+100*Math.sin(i*.15+phase),0,255);
      point(ctx,x1,y,c.pointSize,`rgba(${r1},200,255,${alpha})`);
      point(ctx,x2,y,c.pointSize,`rgba(255,${g2},255,${alpha})`);
    }
    ctx.restore();
  }

  function renderPattern(ctx,w,h,raw,frame){
    const c=configOf(raw);
    ctx.save();ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);ctx.translate(w/2,h/2);ctx.scale(c.zoom,c.zoom);
    // background(0,30) keeps ~88.2% of the previous frame. Reconstruct a deterministic finite trail.
    for(let k=14;k>=0;k--){
      const priorFrame=Math.max(0,frame-k);
      const trailAlpha=Math.pow(1-30/255,k);
      const phase=priorFrame*c.timeSpeed;
      spiral(ctx,-c.eyeSeparation/2,-c.stereoAngle,c,phase,trailAlpha);
      spiral(ctx,c.eyeSeparation/2,c.stereoAngle,c,phase,trailAlpha);
    }
    ctx.restore();
  }

  function ensureOverlay(phone){let canvas=phone.querySelector('.dna37-replay-canvas');if(!canvas){canvas=document.createElement('canvas');canvas.className='dna37-replay-canvas';const base=phone.querySelector('.f34-canvas');if(base)base.insertAdjacentElement('afterend',canvas);else phone.prepend(canvas)}return canvas}

  function tick(){
    raf=requestAnimationFrame(tick);
    if(!latest?.session)return;
    const root=document.querySelector(`.f34-replay[data-session-id="${CSS.escape(String(latest.session.id||""))}"]`);
    if(!root)return;
    const phone=root.querySelector('.f34-phone'),timeline=root.querySelector('.f34-timeline'),base=root.querySelector('.f34-canvas');
    if(!phone||!timeline||!base)return;
    const overlay=ensureOverlay(phone);
    if(overlay.width!==base.width||overlay.height!==base.height){overlay.width=base.width;overlay.height=base.height}
    const ms=n(timeline.value),{state,tMs}=stateAt(latest,ms),pid=state?.patternId||state?.config?.patternId;
    if(state?.view!=="game"||pid!==PATTERN_ID){overlay.style.display='none';return}
    overlay.style.display='block';
    const ctx=overlay.getContext('2d'),liveFrame=n(state.frame)+Math.max(0,ms-tMs)/16.6667;
    renderPattern(ctx,overlay.width,overlay.height,state.config||{},liveFrame);
  }

  function ensureLoop(){if(!raf)raf=requestAnimationFrame(tick)}
  new MutationObserver(ensureLoop).observe(document.documentElement,{childList:true,subtree:true});
  ensureLoop();
  window.__SETKA_ADMIN_STEREO_DNA_REPLAY_V37__=true;
})();