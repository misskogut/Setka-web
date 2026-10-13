// Read-only renderer extracted from app-v7-multipattern.js. No app writes, telemetry or storage.
// Source SHA-256: 7ea52f68f032a1aa9e559b82d8328561cb1b1513719ad42dfcdfcd8bc95c0fb2
  const TENTACLE_ID="tentacle-orbit";
  const DANDELION_ID="dandelion";
  const FISH_ID="fish-wave";
  const BREATH_ID="breathing-fractal";
  const GROWTH_ID="breathing-fractal-growth";
  const RGB_ID="rgb-glitch-rings";
  const DNA_ID="stereo-dna";

  const BASE_PREVIEW_FRAME=44, EDGE=.20, TH=15, FIRST_LEVEL_FACTOR=2.0;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const mod=(n,m)=>((n%m)+m)%m;
  const rad=d=>d*Math.PI/180;
  const round5=n=>Math.round(Number(n)*100000)/100000;

  const TENTACLE_DEFAULT=Object.freeze({patternId:TENTACLE_ID,numTentacles:24,tentacleLength:100,baseRadius:10,movementSpeed:1,colorSpeed:1,circleSize:1,lineWeight:1,segmentStep:2,colorModeIndex:0});
  const DANDELION_DEFAULT=Object.freeze({patternId:DANDELION_ID,v1:.473,numShapes:380,angleSpeed:.01,tSpeed:.005,backgroundAlpha:255,lineWeight:1.2,pointSize:4,zoom:1,colorModeIndex:0,v1History:[]});
  const FISH_DEFAULT=Object.freeze({patternId:FISH_ID,numLayers:40,baseRadius:10,ringSpacing:9,waveSpeed:.08,waveAmplitude:5,glitchEnabled:true,glitchOffset:.5,ringAlpha:180,strokeW:1,colorModeIndex:0});
  const BREATH_DEFAULT=Object.freeze({patternId:BREATH_ID,baseLen:70,pulseSpd:.02,pulseAmp:.3,strokeW:1.5,branches:8,layers:4,colorModeIndex:0,hueRate:.004});
  const GROWTH_DEFAULT=Object.freeze({patternId:GROWTH_ID,baseLen:70,pulseSpeed:.02,strokeW:1.5,branches:8,maxDepth:4,colorModeIndex:0,hueRate:.004,zoom:1,levelSpeedRatio:1,firstLevelFactor:FIRST_LEVEL_FACTOR});
  const RGB_DEFAULT=Object.freeze({patternId:RGB_ID,numRings:20,baseSpacing:20,waveSpeed:.03,waveAmplitude:38,glitchEnabled:true,glitchOffset:1,ringAlpha:180,invertDirection:true,strokeW:1,colorModeIndex:0});
  const DNA_DEFAULT=Object.freeze({patternId:DNA_ID,angleStep:.25,spacing:10,numPoints:300,amplitude:55,eyeSeparation:150,stereoAngle:.42,zoom:1,glowStrength:150,timeSpeed:.02,pointSize:3,colorModeIndex:0});

  const PATTERNS=[
    {id:TENTACLE_ID,title:"Tentacle Orbit",defaults:TENTACLE_DEFAULT,version:1},
    {id:DANDELION_ID,title:"Одуванчик",defaults:DANDELION_DEFAULT,version:1},
    {id:FISH_ID,title:"Носовая волна",defaults:FISH_DEFAULT,version:35},
    {id:BREATH_ID,title:"Breathing Fractal",defaults:BREATH_DEFAULT,version:1},
    {id:GROWTH_ID,title:"Breathing Fractal · Growth",defaults:GROWTH_DEFAULT,version:1},
    {id:RGB_ID,title:"RGB Glitch Rings",defaults:RGB_DEFAULT,version:36},
    {id:DNA_ID,title:"Stereo DNA",defaults:DNA_DEFAULT,version:1}
  ];
  const IDS=new Set(PATTERNS.map(p=>p.id));
  function patternById(id){return PATTERNS.find(p=>p.id===id)||PATTERNS[0]}
  function looksLegacyFish(c){return !!c&&(c.numLayers!=null||c.ringSpacing!=null)&&c.numRings==null&&c.baseSpacing==null}
  function looksRgb(c){return !!c&&(c.numRings!=null||c.baseSpacing!=null||c.invertDirection!=null)}
  function looksDna(c){return !!c&&(c.eyeSeparation!=null||c.stereoAngle!=null||c.angleStep!=null)&&c.numPoints!=null}
  function inferPatternId(c,hint=null){
    const candidate=hint||c?.patternId||c?.baseId;
    if(candidate===RGB_ID&&looksLegacyFish(c))return FISH_ID;
    if(candidate&&IDS.has(candidate))return candidate;
    if(looksDna(c))return DNA_ID;
    if(looksLegacyFish(c))return FISH_ID;
    if(looksRgb(c))return RGB_ID;
    return TENTACLE_ID;
  }
  function cloneConfig(c={},hint=null){
    const id=inferPatternId(c,hint);
    if(id===DANDELION_ID){const d=DANDELION_DEFAULT,h=Array.isArray(c.v1History)?c.v1History:[];return{patternId:id,v1:clamp(Number(c.v1)||d.v1,.02,2),numShapes:clamp(Math.round(Number(c.numShapes??c.NUM_SHAPES)||d.numShapes),50,1000),angleSpeed:clamp(Number(c.angleSpeed)||d.angleSpeed,.001,.05),tSpeed:clamp(Number(c.tSpeed)||d.tSpeed,.001,.02),backgroundAlpha:clamp(Math.round(Number(c.backgroundAlpha??d.backgroundAlpha)),0,255),lineWeight:clamp(Number(c.lineWeight)||d.lineWeight,.1,10),pointSize:clamp(Number(c.pointSize)||d.pointSize,.2,20),zoom:clamp(Number(c.zoom)||d.zoom,.2,5),colorModeIndex:clamp(Math.round(Number(c.colorModeIndex)||0),0,8),v1History:h.map(Number).filter(Number.isFinite).slice(-64)}}
    if(id===FISH_ID){const d=FISH_DEFAULT;return{patternId:id,numLayers:clamp(Number(c.numLayers??d.numLayers),5,100),baseRadius:clamp(Number(c.baseRadius??d.baseRadius),1,100),ringSpacing:clamp(Number(c.ringSpacing??d.ringSpacing),1,80),waveSpeed:clamp(Number(c.waveSpeed??d.waveSpeed),.001,.2),waveAmplitude:clamp(Number(c.waveAmplitude??d.waveAmplitude),0,200),glitchEnabled:c.glitchEnabled!==false,glitchOffset:clamp(Number(c.glitchOffset??d.glitchOffset),0,20),ringAlpha:clamp(Number(c.ringAlpha??d.ringAlpha),0,255),strokeW:clamp(Number(c.strokeW??d.strokeW),.3,8),colorModeIndex:clamp(Math.round(Number(c.colorModeIndex??d.colorModeIndex)),0,2)}}
    if(id===BREATH_ID){const d=BREATH_DEFAULT;return{patternId:id,baseLen:clamp(Number(c.baseLen??d.baseLen),10,180),pulseSpd:clamp(Number(c.pulseSpd??d.pulseSpd),.001,.3),pulseAmp:clamp(Number(c.pulseAmp??d.pulseAmp),.05,2),strokeW:clamp(Number(c.strokeW??d.strokeW),.1,8),branches:clamp(Math.round(Number(c.branches??d.branches)),2,60),layers:clamp(Math.round(Number(c.layers??d.layers)),1,10),colorModeIndex:clamp(Math.round(Number(c.colorModeIndex??c.clrMode??d.colorModeIndex)),0,2),hueRate:clamp(Number(c.hueRate??d.hueRate),.0001,.05)}}
    if(id===GROWTH_ID){const d=GROWTH_DEFAULT;return{patternId:id,baseLen:clamp(Number(c.baseLen??d.baseLen),10,180),pulseSpeed:clamp(Number(c.pulseSpeed??c.pulseSpd??d.pulseSpeed),.001,.1),strokeW:clamp(Number(c.strokeW??d.strokeW),.1,8),branches:clamp(Math.round(Number(c.branches??d.branches)),2,60),maxDepth:clamp(Math.round(Number(c.maxDepth??c.layers??d.maxDepth)),1,10),colorModeIndex:clamp(Math.round(Number(c.colorModeIndex??c.clrMode??d.colorModeIndex)),0,2),hueRate:clamp(Number(c.hueRate??d.hueRate),.0001,.05),zoom:clamp(Number(c.zoom??d.zoom),.3,3),levelSpeedRatio:clamp(Number(c.levelSpeedRatio??d.levelSpeedRatio),.2,3),firstLevelFactor:FIRST_LEVEL_FACTOR}}
    if(id===RGB_ID){const d=RGB_DEFAULT;return{patternId:id,numRings:clamp(Number(c.numRings??d.numRings),5,100),baseSpacing:clamp(Number(c.baseSpacing??d.baseSpacing),1,80),waveSpeed:clamp(Number(c.waveSpeed??d.waveSpeed),.001,.2),waveAmplitude:clamp(Number(c.waveAmplitude??d.waveAmplitude),0,200),glitchEnabled:c.glitchEnabled!==false,glitchOffset:clamp(Number(c.glitchOffset??d.glitchOffset),0,20),ringAlpha:clamp(Number(c.ringAlpha??d.ringAlpha),0,255),invertDirection:c.invertDirection!==false,strokeW:clamp(Number(c.strokeW??d.strokeW),.3,8),colorModeIndex:clamp(Math.round(Number(c.colorModeIndex??d.colorModeIndex)),0,2)}}
    if(id===DNA_ID){const d=DNA_DEFAULT;return{patternId:id,angleStep:clamp(Number(c.angleStep??d.angleStep),.02,1.2),spacing:clamp(Number(c.spacing??d.spacing),4,30),numPoints:clamp(Math.round(Number(c.numPoints??d.numPoints)),40,600),amplitude:clamp(Number(c.amplitude??d.amplitude),10,100),eyeSeparation:clamp(Number(c.eyeSeparation??d.eyeSeparation),20,320),stereoAngle:clamp(Number(c.stereoAngle??d.stereoAngle),.01,.6),zoom:clamp(Number(c.zoom??d.zoom),.3,5),glowStrength:clamp(Number(c.glowStrength??d.glowStrength),20,255),timeSpeed:clamp(Number(c.timeSpeed??d.timeSpeed),.001,.1),pointSize:clamp(Number(c.pointSize??d.pointSize),1,8),colorModeIndex:0}}
    const d=TENTACLE_DEFAULT;return{patternId:TENTACLE_ID,numTentacles:clamp(Math.round(Number(c.numTentacles)||d.numTentacles),3,72),tentacleLength:clamp(Number(c.tentacleLength)||d.tentacleLength,10,800),baseRadius:clamp(Number(c.baseRadius??d.baseRadius),0,100),movementSpeed:clamp(Number(c.movementSpeed)||d.movementSpeed,.05,10),colorSpeed:clamp(Number(c.colorSpeed)||d.colorSpeed,.05,10),circleSize:clamp(Number(c.circleSize)||d.circleSize,.2,20),lineWeight:clamp(Number(c.lineWeight)||d.lineWeight,.1,10),segmentStep:clamp(Math.round(Number(c.segmentStep)||d.segmentStep),1,20),colorModeIndex:clamp(Math.round(Number(c.colorModeIndex)||0),0,8)};
  }

  function configKey(c,hint=null){const x=cloneConfig(c,hint),id=x.patternId;if(id===DANDELION_ID)return[id,round5(x.v1),x.numShapes,round5(x.angleSpeed),round5(x.tSpeed),x.backgroundAlpha,round5(x.lineWeight),round5(x.pointSize),round5(x.zoom),x.colorModeIndex].join("|");if(id===FISH_ID)return[id,round5(x.numLayers),round5(x.baseRadius),round5(x.ringSpacing),round5(x.waveSpeed),round5(x.waveAmplitude),x.glitchEnabled?1:0,round5(x.glitchOffset),round5(x.ringAlpha),round5(x.strokeW),x.colorModeIndex].join("|");if(id===BREATH_ID)return[id,round5(x.baseLen),round5(x.pulseSpd),round5(x.pulseAmp),round5(x.strokeW),x.branches,x.layers,x.colorModeIndex,round5(x.hueRate)].join("|");if(id===GROWTH_ID)return[id,round5(x.baseLen),round5(x.pulseSpeed),round5(x.strokeW),x.branches,x.maxDepth,x.colorModeIndex,round5(x.hueRate),round5(x.zoom),round5(x.levelSpeedRatio)].join("|");if(id===RGB_ID)return[id,round5(x.numRings),round5(x.baseSpacing),round5(x.waveSpeed),round5(x.waveAmplitude),x.glitchEnabled?1:0,round5(x.glitchOffset),round5(x.ringAlpha),x.invertDirection?1:0,round5(x.strokeW),x.colorModeIndex].join("|");if(id===DNA_ID)return[id,round5(x.angleStep),round5(x.spacing),x.numPoints,round5(x.amplitude),round5(x.eyeSeparation),round5(x.stereoAngle),round5(x.zoom),round5(x.glowStrength),round5(x.timeSpeed),round5(x.pointSize)].join("|");return[TENTACLE_ID,x.numTentacles,round5(x.tentacleLength),round5(x.baseRadius),round5(x.movementSpeed),round5(x.colorSpeed),round5(x.circleSize),round5(x.lineWeight),x.segmentStep,x.colorModeIndex].join("|")}

  function renderPattern(t,w,h,c,f,thumb,id=null){const pid=inferPatternId(c,id);if(pid===DANDELION_ID)return renderDandelion(t,w,h,cloneConfig(c,pid),f,thumb);if(pid===FISH_ID)return renderFish(t,w,h,cloneConfig(c,pid),f,thumb);if(pid===BREATH_ID)return renderBreath(t,w,h,cloneConfig(c,pid),f,thumb);if(pid===GROWTH_ID)return renderGrowth(t,w,h,cloneConfig(c,pid),f,thumb);if(pid===RGB_ID)return renderRgb(t,w,h,cloneConfig(c,pid),f,thumb);if(pid===DNA_ID)return renderDna(t,w,h,cloneConfig(c,pid),f,thumb);return renderTentacle(t,w,h,cloneConfig(c,pid),f,thumb)}
  function circle(t,x,d){if(!(d>0))return;t.beginPath();t.arc(x,0,d/2,0,Math.PI*2);t.stroke()}
  function renderTentacle(t,w,h,c,f,thumb){t.save();t.fillStyle="#000";t.fillRect(0,0,w,h);t.translate(w/2,h/2);if(thumb){const ext=Math.max(40,c.tentacleLength*3+c.baseRadius+c.tentacleLength*c.circleSize/20),s=Math.min(.95,(Math.min(w,h)/2-5)/ext);t.scale(s,s)}const shift=f*c.colorSpeed*.5;for(let i=0;i<360;i+=360/c.numTentacles){const x0=Math.sin(rad(i))*c.baseRadius,y0=Math.cos(rad(i))*c.baseRadius;for(let q=0;q<c.tentacleLength;q+=c.segmentStep){const a=Math.cos(rad(c.tentacleLength-q+f*c.movementSpeed))*q,x=Math.sin(rad(i-a))*(q*3),y=Math.cos(rad(i-a))*(q*3),d=(c.tentacleLength-q)*c.circleSize/10;t.strokeStyle=tentacleColor(c.colorModeIndex,i,q,x,y,shift,f);t.lineWidth=c.lineWeight;t.beginPath();t.arc(x0+x,y0+y,Math.max(.075,d/2),0,Math.PI*2);t.stroke()}}t.restore()}
  function tentacleColor(m,i,q,x,y,s,f){switch(m){case 0:return"#fff";case 1:return`hsl(${mod(i+q*2+s,360)} 100% 50%)`;case 2:return`hsl(${mod(f+q*2,360)} 100% 50%)`;case 3:return"hsl(200 100% 50%)";case 4:return"hsl(330 100% 50%)";case 5:return`hsl(${mod(Math.atan2(y,x)*180/Math.PI+180+s,360)} 100% 50%)`;case 6:return`hsl(${mod(i+s,360)} 100% 50%)`;case 7:return`hsl(${mod(q*5+s,360)} 100% 50%)`;case 8:return`hsl(${mod(x+y+s,360)} 100% 50%)`;default:return"#fff"}}
  const dx1=(z,v)=>Math.sin(z/10)*100+Math.cos(z/v)*100,dy1=(z,v)=>Math.cos(z/10)*100+Math.sin(z/v)*100,dx2=(z,v)=>Math.sin(z/10)*10+Math.cos(z/v)*100,dy2=(z,v)=>Math.cos(z/10)*10+Math.sin(z/v)*100;
  function renderDandelion(t,w,h,c,f,thumb){t.save();t.fillStyle=thumb||c.backgroundAlpha>=254?"#000":`rgba(0,0,0,${clamp(c.backgroundAlpha/255,0,1)})`;t.fillRect(0,0,w,h);t.translate(w/2,h/2);if(thumb){const ext=Math.max(220,220*c.zoom),s=Math.min(.95,(Math.min(w,h)/2-6)/ext);t.scale(s,s)}t.scale(c.zoom,c.zoom);t.rotate(Math.sin(f*c.angleSpeed));const tv=f*c.tSpeed,shift=f*.5;for(let i=1;i<c.numShapes;i++){const z=tv+i,x1=dx1(z,c.v1),y1=dy1(z,c.v1),x2=dx2(z,c.v1),y2=dy2(z,c.v1),coord=mod(((Math.atan2(y1,x1)+Math.PI)*180/Math.PI)*2+shift,360),idx=mod(i*.8+shift,360);t.strokeStyle=[1,3,4].includes(c.colorModeIndex)?`hsl(${coord} 100% 50%)`:[5,6,8].includes(c.colorModeIndex)?`hsl(${idx} 100% 50%)`:"#fff";t.lineWidth=c.lineWeight;t.beginPath();t.moveTo(x1,y1);t.lineTo(x2,y2);t.stroke();t.fillStyle=[1,2].includes(c.colorModeIndex)?`hsl(${coord} 100% 50%)`:[5,7].includes(c.colorModeIndex)?`hsl(${idx} 100% 50%)`:[4,8].includes(c.colorModeIndex)?"#000":"#fff";const r=Math.max(.25,c.pointSize/2);t.beginPath();t.arc(x1,y1,r,0,Math.PI*2);t.fill();t.beginPath();t.arc(x2,y2,r,0,Math.PI*2);t.fill()}t.restore()}
  function renderFish(t,w,h,c,f,thumb){t.save();t.fillStyle="#000";t.fillRect(0,0,w,h);t.translate(w/2,h/2);if(thumb){const md=c.baseRadius+Math.max(0,c.numLayers-1)*c.ringSpacing,ext=md/2+c.waveAmplitude+c.glitchOffset*2+4,s=Math.min(1,(Math.min(w,h)/2-5)/Math.max(1,ext));t.scale(s,s)}const tt=f*c.waveSpeed,a=c.ringAlpha/255;t.lineWidth=c.strokeW;for(let i=0;i<c.numLayers;i++){const side=Math.sin(tt-i*.2)*c.waveAmplitude,d=c.baseRadius+i*c.ringSpacing;if(c.glitchEnabled){t.strokeStyle=`rgba(255,0,0,${a})`;circle(t,side,d);t.strokeStyle=`rgba(0,255,0,${a})`;circle(t,c.glitchOffset+side,d);t.strokeStyle=`rgba(0,100,255,${a})`;circle(t,c.glitchOffset*2+side,d)}t.strokeStyle=c.colorModeIndex===1?`rgba(255,255,255,${a})`:c.colorModeIndex===2?`hsla(${mod(tt*100+i*5,360)},100%,50%,${a})`:`rgba(90,200,255,${a})`;circle(t,side,d)}t.restore()}
  function branchBreath(t,len,d,c,f){if(!d)return;t.strokeStyle=c.colorModeIndex===1?"rgb(170,190,255)":c.colorModeIndex===2?`hsl(${mod(f*c.hueRate*100+len*.4,360)} 80% 55%)`:"#fff";t.lineWidth=c.strokeW;t.beginPath();t.moveTo(0,0);t.lineTo(len,0);t.stroke();t.save();t.translate(len,0);t.save();t.rotate(Math.PI/6);branchBreath(t,len*.6,d-1,c,f);t.restore();t.save();t.rotate(-Math.PI/6);branchBreath(t,len*.6,d-1,c,f);t.restore();t.restore()}
  function renderBreath(t,w,h,c,f,thumb){t.save();t.fillStyle="#000";t.fillRect(0,0,w,h);t.translate(w/2,h/2);const sm=1+Math.sin(f*c.pulseSpd)*c.pulseAmp;if(thumb){const ext=Math.max(50,c.baseLen*(1+Math.abs(c.pulseAmp))*2.5),s=Math.min(.96,(Math.min(w,h)/2-5)/ext);t.scale(s,s)}for(let i=0;i<c.branches;i++){t.save();t.rotate(Math.PI*2/c.branches*i);branchBreath(t,c.baseLen*sm,c.layers,c,f);t.restore()}t.restore()}
  const growthAt=(f,s)=>{const p=mod(f*s,2);return p<=1?p:2-p},levelWeight=(d,c)=>d===1?c.firstLevelFactor:Math.pow(c.levelSpeedRatio,d-1);
  function totalWeight(c){let s=c.firstLevelFactor;for(let i=2;i<=c.maxDepth;i++)s+=Math.pow(c.levelSpeedRatio,i-1);return Math.max(.00001,s)}
  function levelStart(d,c){if(d===1)return 0;let s=c.firstLevelFactor;for(let i=2;i<d;i++)s+=Math.pow(c.levelSpeedRatio,i-1);return s}
  function branchGrowth(t,len,d,g,c,f,sum){if(d>c.maxDepth)return;const w=levelWeight(d,c),from=levelStart(d,c)/sum,to=(levelStart(d,c)+w)/sum;if(g<from)return;const p=clamp((g-from)/Math.max(.00001,to-from),0,1),x2=len*p;t.strokeStyle=c.colorModeIndex===1?"rgb(170,190,255)":c.colorModeIndex===2?`hsl(${mod(f*c.hueRate*100+x2*.4,360)} 80% 55%)`:"#fff";t.lineWidth=c.strokeW;t.beginPath();t.moveTo(0,0);t.lineTo(x2,0);t.stroke();if(p>=1&&d<c.maxDepth){t.save();t.translate(len,0);t.save();t.rotate(Math.PI/6);branchGrowth(t,len*.6,d+1,g,c,f,sum);t.restore();t.save();t.rotate(-Math.PI/6);branchGrowth(t,len*.6,d+1,g,c,f,sum);t.restore();t.restore()}}
  function renderGrowth(t,w,h,c,f,thumb){t.save();t.fillStyle="#000";t.fillRect(0,0,w,h);t.translate(w/2,h/2);const g=growthAt(f,c.pulseSpeed);if(thumb){const ext=Math.max(60,c.baseLen*2.6),s=Math.min(.95,(Math.min(w,h)/2-5)/ext);t.scale(s*c.zoom,s*c.zoom)}else t.scale(c.zoom,c.zoom);const sum=totalWeight(c);for(let i=0;i<c.branches;i++){t.save();t.rotate(Math.PI*2/c.branches*i);branchGrowth(t,c.baseLen,1,g,c,f,sum);t.restore()}t.restore()}
  function renderRgb(t,w,h,c,f,thumb){t.save();t.fillStyle="#000";t.fillRect(0,0,w,h);t.translate(w/2,h/2);const tt=f*c.waveSpeed;if(thumb){const maxD=c.numRings*c.baseSpacing+Math.abs(c.waveAmplitude),ext=maxD/2+c.glitchOffset+4,s=Math.min(1,(Math.min(w,h)/2-5)/Math.max(1,ext));t.scale(s,s)}const a=c.ringAlpha/255;for(let i=1;i<=c.numRings;i++){const phase=c.invertDirection?-i:i,off=Math.sin(tt+phase*.3)*c.waveAmplitude,d=i*c.baseSpacing+off;if(c.glitchEnabled){t.lineWidth=c.strokeW;t.strokeStyle=`rgba(255,0,0,${a})`;circle(t,-c.glitchOffset,d);t.strokeStyle=`rgba(0,255,0,${a})`;circle(t,0,d);t.strokeStyle=`rgba(0,100,255,${a})`;circle(t,c.glitchOffset,d)}if(c.colorModeIndex===1){t.lineWidth=.6;t.strokeStyle=`rgba(255,100,180,${a})`;circle(t,0,d)}else if(c.colorModeIndex===2){t.lineWidth=.6;t.strokeStyle=`hsla(${mod(tt*100+i*5,360)},100%,50%,${a})`;circle(t,0,d)}}t.restore()}

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
      dnaPoint(t,x1,y,c.pointSize,`rgba(${r1},200,255,${alpha})`);
      dnaPoint(t,x2,y,c.pointSize,`rgba(255,${g2},255,${alpha})`);
    }
    t.restore();
  }
  function renderDna(t,w,h,c,f,thumb){
    t.save();
    if(thumb||f<2){t.fillStyle="#000";t.fillRect(0,0,w,h)}else{t.fillStyle="rgba(0,0,0,0.1176470588)";t.fillRect(0,0,w,h)}
    t.translate(w/2,h/2);
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


export const rendererVersion="setka-v7-9a1530f";
export const patterns=PATTERNS.map(p=>({...p}));
export function exactPattern(id){return PATTERNS.find(p=>p.id===id)||null;}
export function draw(canvas,config,frame,id,preview=false){
 if(!exactPattern(id)||!config||typeof config!=="object"||!Number.isFinite(Number(frame)))return false;
 const ctx=canvas.getContext("2d");if(!ctx)return false;
 ctx.setTransform(1,0,0,1,0,0);
 renderPattern(ctx,canvas.width,canvas.height,{...config,patternId:id},Number(frame),preview,id);
 return true;
}
export {cloneConfig,configKey};
