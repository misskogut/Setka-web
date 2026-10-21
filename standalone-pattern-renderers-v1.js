(() => {
"use strict";
const window=typeof globalThis.window==="object"?globalThis.window:globalThis;
const registry=window.SetkaPatternRegistryV1;
if(!registry)throw new Error("pattern_registry_required");
  const TENTACLE_ID="tentacle-orbit";
  const DANDELION_ID="dandelion";
  const FISH_ID="fish-wave";
  const BREATH_ID="breathing-fractal";
  const GROWTH_ID="breathing-fractal-growth";
  const RGB_ID="rgb-glitch-rings";
  const DNA_ID="stereo-dna";
  const GRID_ID="breathing-grid";

  const FIRST_LEVEL_FACTOR=2,clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),mod=(n,m)=>((n%m)+m)%m,rad=d=>d*Math.PI/180;
  function circle(t,x,d){if(!(d>0))return;t.beginPath();t.arc(x,0,d/2,0,Math.PI*2);t.stroke()}
  function renderTentacle(t,w,h,c,f,thumb){t.save();t.fillStyle="#000";t.fillRect(0,0,w,h);const audioOffset=!thumb?window.SetkaAudioReactiveV1?.offsets?.("tentacle-orbit",w,h):null;t.translate(w/2+(audioOffset?.x||0),h/2+(audioOffset?.y||0));if(thumb){const ext=Math.max(40,c.tentacleLength*3+c.baseRadius+c.tentacleLength*c.circleSize/20),s=Math.min(.95,(Math.min(w,h)/2-5)/ext);t.scale(s,s)}const shift=f*c.colorSpeed*.5;for(let i=0;i<360;i+=360/c.numTentacles){const x0=Math.sin(rad(i))*c.baseRadius,y0=Math.cos(rad(i))*c.baseRadius;for(let q=0;q<c.tentacleLength;q+=c.segmentStep){const a=Math.cos(rad(c.tentacleLength-q+f*c.movementSpeed))*q,x=Math.sin(rad(i-a))*(q*3),y=Math.cos(rad(i-a))*(q*3),d=(c.tentacleLength-q)*c.circleSize/10;t.strokeStyle=tentacleColor(c.colorModeIndex,i,q,x,y,shift,f);t.lineWidth=c.lineWeight;t.beginPath();t.arc(x0+x,y0+y,Math.max(.075,d/2),0,Math.PI*2);t.stroke()}}t.restore()}
  function tentacleColor(m,i,q,x,y,s,f){switch(m){case 0:return"#fff";case 1:return`hsl(${mod(i+q*2+s,360)} 100% 50%)`;case 2:return`hsl(${mod(f+q*2,360)} 100% 50%)`;case 3:return"hsl(200 100% 50%)";case 4:return"hsl(330 100% 50%)";case 5:return`hsl(${mod(Math.atan2(y,x)*180/Math.PI+180+s,360)} 100% 50%)`;case 6:return`hsl(${mod(i+s,360)} 100% 50%)`;case 7:return`hsl(${mod(q*5+s,360)} 100% 50%)`;case 8:return`hsl(${mod(x+y+s,360)} 100% 50%)`;default:return"#fff"}}
  const dx1=(z,v)=>Math.sin(z/10)*100+Math.cos(z/v)*100,dy1=(z,v)=>Math.cos(z/10)*100+Math.sin(z/v)*100,dx2=(z,v)=>Math.sin(z/10)*10+Math.cos(z/v)*100,dy2=(z,v)=>Math.cos(z/10)*10+Math.sin(z/v)*100;
  function renderDandelion(t,w,h,c,f,thumb){t.save();t.fillStyle=thumb||c.backgroundAlpha>=254?"#000":`rgba(0,0,0,${clamp(c.backgroundAlpha/255,0,1)})`; t.fillRect(0,0,w,h);const audioOffset=!thumb?window.SetkaAudioReactiveV1?.offsets?.("dandelion",w,h):null;t.translate(w/2+(audioOffset?.x||0),h/2+(audioOffset?.y||0));if(thumb){const ext=Math.max(220,220*c.zoom),s=Math.min(.95,(Math.min(w,h)/2-6)/ext);t.scale(s,s)}t.scale(c.zoom,c.zoom);t.rotate(Math.sin(f*c.angleSpeed));const tv=f*c.tSpeed,shift=f*.5;for(let i=1;i<c.numShapes;i++){const z=tv+i,x1=dx1(z,c.v1),y1=dy1(z,c.v1),x2=dx2(z,c.v1),y2=dy2(z,c.v1),coord=mod(((Math.atan2(y1,x1)+Math.PI)*180/Math.PI)*2+shift,360),idx=mod(i*.8+shift,360);t.strokeStyle=[1,3,4].includes(c.colorModeIndex)?`hsl(${coord} 100% 50%)`:[5,6,8].includes(c.colorModeIndex)?`hsl(${idx} 100% 50%)`:"#fff";t.lineWidth=c.lineWeight;t.beginPath();t.moveTo(x1,y1);t.lineTo(x2,y2);t.stroke();t.fillStyle=[1,2].includes(c.colorModeIndex)?`hsl(${coord} 100% 50%)`:[5,7].includes(c.colorModeIndex)?`hsl(${idx} 100% 50%)`:[4,8].includes(c.colorModeIndex)?"#000":"#fff";const r=Math.max(.25,c.pointSize/2);t.beginPath();t.arc(x1,y1,r,0,Math.PI*2);t.fill();t.beginPath();t.arc(x2,y2,r,0,Math.PI*2);t.fill()}t.restore()}
  function renderFish(t,w,h,c,f,thumb){t.save();t.fillStyle="#000";t.fillRect(0,0,w,h);const audioOffset=!thumb?window.SetkaAudioReactiveV1?.offsets?.("fish-wave",w,h):null;t.translate(w/2+(audioOffset?.x||0),h/2+(audioOffset?.y||0));if(thumb){const md=c.baseRadius+Math.max(0,c.numLayers-1)*c.ringSpacing,ext=md/2+c.waveAmplitude+c.glitchOffset*2+4,s=Math.min(1,(Math.min(w,h)/2-5)/Math.max(1,ext));t.scale(s,s)}const tt=f*c.waveSpeed,a=c.ringAlpha/255;t.lineWidth=c.strokeW;for(let i=0;i<c.numLayers;i++){const side=Math.sin(tt-i*.2)*c.waveAmplitude,d=c.baseRadius+i*c.ringSpacing;if(c.glitchEnabled&&c.colorModeIndex!==0){t.strokeStyle=`rgba(255,0,0,${a})`;circle(t,side,d);t.strokeStyle=`rgba(0,255,0,${a})`;circle(t,c.glitchOffset+side,d);t.strokeStyle=`rgba(0,100,255,${a})`;circle(t,c.glitchOffset*2+side,d)}t.strokeStyle=c.colorModeIndex===1?`rgba(255,255,255,${a})`:c.colorModeIndex===2?`hsla(${mod(tt*100+i*5,360)},100%,50%,${a})`:`rgba(255,255,255,${a})`;circle(t,side,d)}t.restore()}
  function branchBreath(t,len,d,c,f){if(!d)return;t.strokeStyle=c.colorModeIndex===1?"rgb(170,190,255)":c.colorModeIndex===2?`hsl(${mod(f*c.hueRate*100+len*.4,360)} 80% 55%)`:"#fff";t.lineWidth=c.strokeW;t.beginPath();t.moveTo(0,0);t.lineTo(len,0);t.stroke();t.save();t.translate(len,0);t.save();t.rotate(Math.PI/6);branchBreath(t,len*.6,d-1,c,f);t.restore();t.save();t.rotate(-Math.PI/6);branchBreath(t,len*.6,d-1,c,f);t.restore();t.restore()}
  function renderBreath(t,w,h,c,f,thumb){t.save();t.fillStyle="#000";t.fillRect(0,0,w,h);const audioOffset=!thumb?window.SetkaAudioReactiveV1?.offsets?.("breathing-fractal",w,h):null;t.translate(w/2+(audioOffset?.x||0),h/2+(audioOffset?.y||0));const sm=1+Math.sin(f*c.pulseSpd)*c.pulseAmp;if(thumb){const ext=Math.max(50,c.baseLen*(1+Math.abs(c.pulseAmp))*2.5),s=Math.min(.96,(Math.min(w,h)/2-5)/ext);t.scale(s,s)}for(let i=0;i<c.branches;i++){t.save();t.rotate(Math.PI*2/c.branches*i);branchBreath(t,c.baseLen*sm,c.layers,c,f);t.restore()}t.restore()}
  const growthAt=(f,s)=>{const p=mod(f*s,2);return p<=1?p:2-p},levelWeight=(d,c)=>d===1?c.firstLevelFactor:Math.pow(c.levelSpeedRatio,d-1);
  function totalWeight(c){let s=c.firstLevelFactor;for(let i=2;i<=c.maxDepth;i++)s+=Math.pow(c.levelSpeedRatio,i-1);return Math.max(.00001,s)}
  function levelStart(d,c){if(d===1)return 0;let s=c.firstLevelFactor;for(let i=2;i<d;i++)s+=Math.pow(c.levelSpeedRatio,i-1);return s}
  function branchGrowth(t,len,d,g,c,f,sum){if(d>c.maxDepth)return;const w=levelWeight(d,c),from=levelStart(d,c)/sum,to=(levelStart(d,c)+w)/sum;if(g<from)return;const p=clamp((g-from)/Math.max(.00001,to-from),0,1),x2=len*p;t.strokeStyle=c.colorModeIndex===1?"rgb(170,190,255)":c.colorModeIndex===2?`hsl(${mod(f*c.hueRate*100+x2*.4,360)} 80% 55%)`:"#fff";t.lineWidth=c.strokeW;t.beginPath();t.moveTo(0,0);t.lineTo(x2,0);t.stroke();if(p>=1&&d<c.maxDepth){t.save();t.translate(len,0);t.save();t.rotate(Math.PI/6);branchGrowth(t,len*.6,d+1,g,c,f,sum);t.restore();t.save();t.rotate(-Math.PI/6);branchGrowth(t,len*.6,d+1,g,c,f,sum);t.restore();t.restore()}}
  function renderGrowth(t,w,h,c,f,thumb){t.save();t.fillStyle="#000";t.fillRect(0,0,w,h);const audioOffset=!thumb?window.SetkaAudioReactiveV1?.offsets?.("breathing-fractal-growth",w,h):null;t.translate(w/2+(audioOffset?.x||0),h/2+(audioOffset?.y||0));const g=growthAt(f,c.pulseSpeed);if(thumb){const ext=Math.max(60,c.baseLen*2.6),s=Math.min(.95,(Math.min(w,h)/2-5)/ext);t.scale(s*c.zoom,s*c.zoom)}else t.scale(c.zoom,c.zoom);const sum=totalWeight(c);for(let i=0;i<c.branches;i++){t.save();t.rotate(Math.PI*2/c.branches*i);branchGrowth(t,c.baseLen,1,g,c,f,sum);t.restore()}t.restore()}
  function renderRgb(t,w,h,c,f,thumb){t.save();t.fillStyle="#000";t.fillRect(0,0,w,h);const audioOffset=!thumb?window.SetkaAudioReactiveV1?.offsets?.("rgb-glitch-rings",w,h):null;t.translate(w/2+(audioOffset?.x||0),h/2+(audioOffset?.y||0));const tt=f*c.waveSpeed;if(thumb){const maxD=c.numRings*c.baseSpacing+Math.abs(c.waveAmplitude),ext=maxD/2+c.glitchOffset+4,s=Math.min(1,(Math.min(w,h)/2-5)/Math.max(1,ext));t.scale(s,s)}const a=c.ringAlpha/255;for(let i=1;i<=c.numRings;i++){const phase=c.invertDirection?-i:i,off=Math.sin(tt+phase*.3)*c.waveAmplitude,d=i*c.baseSpacing+off;if(c.glitchEnabled&&c.colorModeIndex!==0){t.lineWidth=c.strokeW;t.strokeStyle=`rgba(255,0,0,${a})`;circle(t,-c.glitchOffset,d);t.strokeStyle=`rgba(0,255,0,${a})`;circle(t,0,d);t.strokeStyle=`rgba(0,100,255,${a})`;circle(t,c.glitchOffset,d)}if(c.colorModeIndex===0){t.lineWidth=c.strokeW;t.strokeStyle=`rgba(255,255,255,${a})`;circle(t,0,d)}else if(c.colorModeIndex===1){t.lineWidth=.6;t.strokeStyle=`rgba(255,100,180,${a})`;circle(t,0,d)}else if(c.colorModeIndex===2){t.lineWidth=.6;t.strokeStyle=`hsla(${mod(tt*100+i*5,360)},100%,50%,${a})`;circle(t,0,d)}}t.restore()}

  function dnaPoint(t,x,y,size,color){t.fillStyle=color;t.beginPath();t.arc(x,y,Math.max(.5,size/2),0,Math.PI*2);t.fill()}
  function drawDnaSpiral(t,xOffset,angleShift,c,phase,pointLimit=c.numPoints){
    t.save();t.translate(xOffset,0);
    const alpha=clamp(c.glowStrength/255,0,1);
    const start=Math.max(0,Math.floor((c.numPoints-pointLimit)/2));
    const end=Math.min(c.numPoints,start+pointLimit);
    for(let i=start;i<end;i++){
      const angle=i*c.angleStep+phase;
      const y=(i-c.numPoints/2)*c.spacing;
      const x1=Math.cos(angle+angleShift)*c.amplitude;
      const x2=Math.cos(angle+Math.PI+angleShift)*c.amplitude;
      const r1=clamp(100+80*Math.sin(i*.1+phase),0,255);
      const g2=clamp(100+100*Math.sin(i*.15+phase),0,255);
      // Zero = black/white, one = the ORIGINAL cyan/magenta pair. The
      // other seven modes are actual palettes, never forced back to zero.
      const mode=c.colorModeIndex;
      let left,right;
      if(mode===0){left=right=`rgba(255,255,255,${alpha})`;}
      else if(mode===1){left=`rgba(${r1},200,255,${alpha})`;right=`rgba(255,${g2},255,${alpha})`;}
      else{
        const hues=[0,0,176,277,322,124,225,38,mod(i*3+phase*48,360)];
        const h=hues[mode]??176,drift=mode===8?i*2.3+phase*65:Math.sin(i*.06+phase)*8;
        left=`hsla(${mod(h+drift,360)},86%,72%,${alpha})`;
        right=`hsla(${mod(h+55+drift,360)},85%,74%,${alpha})`;
      }
      dnaPoint(t,x1,y,c.pointSize,left);
      dnaPoint(t,x2,y,c.pointSize,right);
    }
    t.restore();
  }
  function renderDna(t,w,h,c,f,thumb){
    t.save();
    if(thumb||f<2){t.fillStyle="#000";t.fillRect(0,0,w,h)}else{t.fillStyle=window.SetkaAudioReactiveV1?.isActive?.()?"rgba(0,0,0,0.36)":"rgba(0,0,0,0.1176470588)";t.fillRect(0,0,w,h)}
    const audioOffset=!thumb?window.SetkaAudioReactiveV1?.offsets?.("stereo-dna",w,h):null;
    t.translate(w/2+(audioOffset?.x||0),h/2+(audioOffset?.y||0));
    const previewPoints=thumb?Math.min(72,c.numPoints):c.numPoints;
    let scale=c.zoom;
    if(thumb){const vertical=(previewPoints/2)*c.spacing,horizontal=c.eyeSeparation/2+c.amplitude+8,ext=Math.max(vertical,horizontal);scale=Math.min(.96,(Math.min(w,h)/2-5)/Math.max(1,ext))*c.zoom}
    t.scale(scale,scale);
    // A normal-size DNA dot becomes subpixel at 180px; never let thumbnails disappear.
    const previewConfig=thumb?{...c,pointSize:Math.max(c.pointSize,3.4/Math.max(.01,scale))}:c;
    const phase=f*c.timeSpeed;
    drawDnaSpiral(t,-c.eyeSeparation/2,-c.stereoAngle,previewConfig,phase,previewPoints);
    drawDnaSpiral(t,c.eyeSeparation/2,c.stereoAngle,previewConfig,phase,previewPoints);
    t.restore();
  }

  // 90° clockwise portrait adaptation of the original p5 sketch.
  // Both gameplay and mini previews use the same native Canvas2D algorithm.
  function gridRgba(h,s,v,a){
    const sector=mod(h,360)/60, chroma=v*s, x=chroma*(1-Math.abs(sector%2-1)),m=v-chroma;
    let r=0,g=0,b=0;
    if(sector<1){r=chroma;g=x}else if(sector<2){r=x;g=chroma}
    else if(sector<3){g=chroma;b=x}else if(sector<4){g=x;b=chroma}
    else if(sector<5){r=x;b=chroma}else{r=chroma;b=x}
    return "rgba("+Math.round((r+m)*255)+","+Math.round((g+m)*255)+","+Math.round((b+m)*255)+","+a+")";
  }
  const GRID_PALETTES=[
    [0,0,0],      // 0: canonical first mode is strictly white on black
    [178,.80,.1], // turquoise
    [275,.54,.12],
    [323,.64,.12],
    [125,.72,.11],
    [222,.80,.14],
    [35,.75,.1],
    [0,.40,1],    // original moving HSB gradient from the supplied sketch
    [70,.92,1.55]
  ];
  function renderGrid(t,w,h,c,f,thumb){
    t.save();t.fillStyle="#000";t.fillRect(0,0,w,h);
    // Orient ONLY the geometry. All UI, gesture zones and saved snapshots
    // remain portrait; this is exactly a clockwise phone rotation.
    t.translate(w,0);t.rotate(Math.PI/2);
    // The square mother thumbnail defines this pattern's original geometry:
    // after the clockwise rotation, cells are c.cols/c.rows times wider than tall.
    // Using h/c.cols on a portrait phone stretched the short preview rectangles
    // toward squares. Keep ONE uniform reference scale for both views and
    // extend the repeated grid offscreen to cover the taller/wider viewport.
    const vw=h,vh=w,reference=Math.min(vw,vh);
    const sx=reference/c.cols,sy=reference/c.rows;
    const visibleCols=Math.ceil(vw/sx),visibleRows=Math.ceil(vh/sy);
    const time=f*c.speed*2.25;
    const palette=GRID_PALETTES[c.colorModeIndex]||GRID_PALETTES[0];
    const white=c.colorModeIndex===0;
    const saturation=palette[1],hueBase=palette[0],spread=palette[2];
    const a=clamp(c.alpha*180/255,0,1);
    const offset=!thumb?window.SetkaAudioReactiveV1?.offsets?.(GRID_ID,w,h):null;
    if(offset)t.translate(offset.y,-offset.x);
    t.lineJoin="miter";t.lineWidth=c.lineWidth;
    if(white)t.strokeStyle="rgba(255,255,255,"+a+")";
    for(let i=0;i<visibleCols;i++){
      const cx=(i+.5)*sx;
      for(let j=0;j<visibleRows;j++){
        const cy=(j+.5)*sy;
        const breath=1+c.amp*Math.sin(time+i*c.phaseX+j*c.phaseY);
        const rw=sx*c.scale*breath,rh=sy*c.scale*breath;
        if(!white){
          const hue=(time*c.hueSpeed+i*8+j*4)*spread+hueBase;
          t.strokeStyle=gridRgba(hue,saturation,.90,a);
        }
        t.strokeRect(cx-rw/2,cy-rh/2,rw,rh);
      }
    }
    t.restore();
  }


for(const [id,render] of [[TENTACLE_ID,renderTentacle],[DANDELION_ID,renderDandelion],[FISH_ID,renderFish],[BREATH_ID,renderBreath],[GROWTH_ID,renderGrowth],[RGB_ID,renderRgb],[DNA_ID,renderDna],[GRID_ID,renderGrid]])registry.bindRenderer(id,render);
})();
