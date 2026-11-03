/* SETKA_PATTERN_DESCRIPTOR
{
  "id": "stereo-dna-trails",
  "title": "Stereo DNA · Живые шлейфы",
  "version": 1,
  "introducedAt": "2026-11-04T00:00:00.000Z",
  "schemaVersion": 1,
  "module": "standalone-pattern-stereo-dna-trails.js",
  "colorModes": 9,
  "palettes": [
    [255,255,255], [120,200,255], [110,220,255],
    [165,115,255], [255,105,180], [80,225,180],
    [255,175,80], [255,125,220], [145,205,255]
  ],
  "defaults": {
    "patternId": "stereo-dna-trails",
    "angleStep": 0.25,
    "spacing": 10,
    "numPoints": 150,
    "amplitude": 55,
    "eyeSeparation": 150,
    "stereoAngle": 0.22,
    "zoom": 1,
    "glowStrength": 150,
    "timeSpeed": 0.02,
    "trailLength": 50,
    "lineWeight": 2,
    "colorModeIndex": 0
  },
  "controls": [
    ["Расстояние между витками", "spacing", 4, 30, 0.1, "↑↓", 1],
    ["Амплитуда движения", "amplitude", 10, 100, 0.5, "←→", 1],
    ["Масштаб", "zoom", 0.3, 5, 0.01, "Пинч", 2],
    ["Стереоугол", "stereoAngle", 0.01, 0.3, 0.001, "Вместе ←→", 2],
    ["Длина шлейфа", "trailLength", 2, 120, 1, "Ползунок", 0],
    ["Скорость", "timeSpeed", 0.001, 0.1, 0.001, "Ползунок", 0],
    ["Толщина линии", "lineWeight", 0.5, 5, 0.1, "Ползунок", 0],
    ["Яркость", "glowStrength", 20, 255, 1, "Ползунок", 0],
    ["Число точек", "numPoints", 40, 300, 1, "Ползунок", 0],
    ["Разведение глаз", "eyeSeparation", 40, 260, 1, "Ползунок", 0],
    ["Шаг угла", "angleStep", 0.05, 0.8, 0.01, "Ползунок", 0]
  ],
  "keyFields": [
    "angleStep", "spacing", "numPoints", "amplitude", "eyeSeparation",
    "stereoAngle", "zoom", "glowStrength", "timeSpeed", "trailLength",
    "lineWeight", "colorModeIndex"
  ]
}
END_SETKA_PATTERN_DESCRIPTOR */
(()=>{
  'use strict';
  if(typeof window!=='object'||typeof document!=='object') return;
  const registry=window.SetkaPatternRegistryV1;
  const id=document.currentScript?.dataset.patternId;
  if(!id||!registry?.has(id)) return;
  const states=new WeakMap();
  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,Number.isFinite(Number(v))?Number(v):a));
  const rgb=(r,g,b)=>`rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  function colors(mode,i,phase){
    // Mode 1 reproduces the p5 source's TWO separate oscillating strand colors.
    if(mode===0)return ['#fff','#fff'];
    if(mode===1)return [rgb(100+80*Math.sin(i*.1+phase),200,255),rgb(255,100+100*Math.sin(i*.15+phase),255)];
    if(mode===2)return ['#77d5ff','#d0f8ff'];
    if(mode===3)return ['#9f91ff','#fa9cff'];
    if(mode===4)return ['#ff6db1','#ffcba1'];
    if(mode===5)return ['#50e1b4','#8bbfff'];
    if(mode===6)return ['#ffc266','#ff846f'];
    if(mode===7)return [`hsl(${(318+i*1.3+phase*18)%360} 96% 70%)`,`hsl(${(185+i*1.3+phase*18)%360} 94% 72%)`];
    return [`hsl(${(i*3+phase*38)%360} 100% 70%)`,`hsl(${(i*3+phase*38+180)%360} 100% 70%)`];
  }
  function snapshot(c,phase){
    return {phase,
      spacing:clamp(c.spacing,4,30),
      amplitude:clamp(c.amplitude,10,100),
      angleStep:clamp(c.angleStep,.05,.8),
      eyeSeparation:clamp(c.eyeSeparation,40,260),
      stereoAngle:clamp(c.stereoAngle,.01,.6)};
  }
  function render(ctx,w,h,c,frame,thumbnail=false){
    const n=Math.round(clamp(c.numPoints,40,300));
    const length=Math.round(clamp(c.trailLength,2,120));
    const speed=clamp(c.timeSpeed,.001,.1);
    const frameId=Math.max(0,Math.floor(Number.isFinite(frame)?frame:0));
    let s=states.get(ctx);
    const previewKey=thumbnail?JSON.stringify([c.angleStep,c.spacing,c.numPoints,c.amplitude,c.eyeSeparation,c.stereoAngle,c.zoom,c.glowStrength,c.timeSpeed,c.trailLength,c.lineWeight,c.colorModeIndex]):null;
    const fresh=!s||s.n!==n||s.width!==w||s.height!==h||frameId<s.frame||frameId-s.frame>Math.max(length*2,200)||(thumbnail&&s.previewKey!==previewKey);
    if(fresh){
      s={n,width:w,height:h,frame:frameId,phase:frameId*speed,snaps:[],needsClear:true,previewKey};
      // No hidden synthetic user gesture. Static preview/replay is analytically
      // warmed up; the real gameplay starts empty, just like setup() in p5.
      if(thumbnail||frameId>length*2){
        for(let k=length-1;k>=0;k--)s.snaps.push(snapshot(c,(frameId-k)*speed));
      }else{s.snaps.push(snapshot(c,s.phase));}
      states.set(ctx,s);
    }else if(frameId>s.frame){
      const advance=frameId-s.frame;
      for(let k=1;k<=advance;k++){
        s.phase+=speed;
        // Snapshot the actual *past* coordinates before the next gesture.
        // THIS is what creates the diagonal/snaking displacement on vertical drag.
        s.snaps.push(snapshot(c,s.phase));
        if(s.snaps.length>length)s.snaps.shift();
      }
      s.frame=frameId;
    }else{
      // Allow redraw on a slider change without erasing earlier Y positions.
      s.snaps[s.snaps.length-1]=snapshot(c,s.phase);
    }
    while(s.snaps.length>length)s.snaps.shift();
    ctx.save();
    ctx.globalAlpha=1;
    if(s.needsClear){ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);s.needsClear=false;}
    // The original uses background(0,20), NOT an opaque black fill each frame.
    ctx.globalAlpha=20/255;ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;
    ctx.translate(w/2,h/2);
    let scale=clamp(c.zoom,.3,5);
    if(thumbnail){
      const lim=Math.max(n*clamp(c.spacing,4,30)/2,clamp(c.eyeSeparation,40,260)/2+clamp(c.amplitude,10,100));
      scale*=Math.min(1,(Math.min(w,h)/2-6)/Math.max(1,lim));
    }
    ctx.scale(scale,scale);
    ctx.lineWidth=clamp(c.lineWeight,.5,5);
    ctx.lineCap='round';
    const phase=s.phase;
    const L=s.snaps.length;
    const alphaFactor=clamp(c.glowStrength,20,255)/255;
    const mode=Math.round(clamp(c.colorModeIndex,0,8));
    const history=s.snaps;
    // Compute visible rows from historical Y as well as current Y;
    // do not crop a trail merely because its current row moved offscreen.
    const maxY=h/(2*scale)+4;
    let minSpacing=30;for(const snap of history)minSpacing=Math.min(minSpacing,snap.spacing);
    const from=Math.max(0,Math.floor(n/2-maxY/minSpacing)-2);
    const to=Math.min(n,Math.ceil(n/2+maxY/minSpacing)+2);
    for(let eye=0;eye<2;eye++){
      const sign=eye===0?-1:1;
      for(let i=from;i<to;i++){
        const [c1,c2]=colors(mode,i,phase);
        const yFactor=i-n/2;
        for(let strand=0;strand<2;strand++){
          ctx.strokeStyle=strand===0?c1:c2;
          const strandPhase=strand*Math.PI;
          // Identical to trail.push({x,y}) followed by line(trail[j],trail[j+1]):
          // each historical point uses its OWN spacing, amplitude and stereo angle.
          for(let j=0;j<L-1;j++){
            const a=history[j],b=history[j+1];
            const x1=sign*a.eyeSeparation/2+Math.cos(i*a.angleStep+a.phase+sign*a.stereoAngle+strandPhase)*a.amplitude;
            const x2=sign*b.eyeSeparation/2+Math.cos(i*b.angleStep+b.phase+sign*b.stereoAngle+strandPhase)*b.amplitude;
            const y1=yFactor*a.spacing, y2=yFactor*b.spacing;
            ctx.globalAlpha=alphaFactor*j/(L-1);
            ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
          }
        }
      }
    }
    ctx.globalAlpha=1;ctx.restore();
  }
  // Original p5 gestures handled by the module, not by a hardcoded host ID.
  registry.bindInteraction(id,(config,event)=>{
    if(event?.type!=='gesture')return config;
    const dx=Number.isFinite(event.dx)?event.dx:0;
    const dy=Number.isFinite(event.dy)?event.dy:0;
    if(event.fingers===1){
      config.spacing=clamp(config.spacing+dy*.1,4,30);
      config.amplitude=clamp(config.amplitude+dx*.2,10,100);
    }else if(event.fingers===2){
      // Original pinch: zoom += (distance-lastDistance)*.005.
      if(Number.isFinite(event.pinchDistance)&&Number.isFinite(event.previousPinchDistance))
        config.zoom=clamp(config.zoom+(event.pinchDistance-event.previousPinchDistance)*.005,.3,5);
      // Shared host reports movement of both fingers' midpoint.
      config.stereoAngle=clamp(config.stereoAngle+dx*.0005,.01,.3);
    }
    return config;
  });
  registry.bindRenderer(id,render);
})();