(()=>{
"use strict";
// Spiral Snakes 3D: a stateless, deterministic adaptation of the original
// p5.js WEBGL sketch. The exact same renderer is used by mother thumbnails,
// fullscreen gameplay, saved configurations, note replay and Research Admin.
const registry=window.SetkaPatternRegistryV1;
const ID="spiral-snakes-3d";
if(!registry?.has(ID))return;
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const PHI_STEP_LIMIT=1200,POINT_BUDGET=24000,AGE_BANDS=12;
function color(mode,theta,phase){
  if(mode===0)return "#fff";                    // canonical monochrome
  if(mode===1)return "rgb(100,200,255)";        // original sketch
  if(mode===2)return "#96cfff";
  if(mode===3)return "#ac92ff";
  if(mode===4)return "#ff91ce";
  if(mode===5)return "#7af9e6";
  if(mode===6)return `hsl(${(theta*180/Math.PI*2+phase*12)%360} 92% 70%)`;
  if(mode===7)return theta%TAU<Math.PI?"#ff9fd4":"#86fff2";
  return "#ffd9a0";
}
function point(phi,theta,frequency){
  const r=80+20*Math.sin(frequency*phi+theta);
  const ring=150+r*Math.cos(phi);
  return [ring*Math.cos(theta),ring*Math.sin(theta),r*Math.sin(phi)];
}
function render(ctx,width,height,c,frame){
  const w=Math.max(1,width),h=Math.max(1,height),n=c.numSnakes|0;
  const history=clamp(Math.trunc(c.baseHistory*0.02/c.waveSpeed),100,PHI_STEP_LIMIT);
  // The p5 sketch accumulates a trail for history frames. Render that same
  // trajectory from its deterministic analytical history at any frame; a
  // thumbnail or replay can now jump directly to frame N without hidden state.
  const stride=Math.max(1,Math.ceil(n*history/POINT_BUDGET));
  const phase=frame*c.waveSpeed;
  const rx=phase*0.2,ry=phase*0.3;
  const cosX=Math.cos(rx),sinX=Math.sin(rx),cosY=Math.cos(ry),sinY=Math.sin(ry);
  const unit=Math.min(w,h)/540*c.zoom;
  const pointSize=c.pointSize||1.2;
  ctx.save();
  ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);
  for(let band=0;band<AGE_BANDS;band++){
    const first=Math.floor(band*history/AGE_BANDS);
    const end=Math.min(history,Math.ceil((band+1)*history/AGE_BANDS));
    ctx.globalAlpha=clamp(((band+0.5)/AGE_BANDS)*0.96,0,1);
    for(let i=0;i<n;i++){
      const theta=TAU*i/n;
      ctx.fillStyle=color(c.colorModeIndex,theta,phase);
      // Oldest historical samples first; the newest points reach full alpha.
      for(let j=first;j<end;j+=stride){
        const age=history-1-j;
        const phi=phase-age*c.waveSpeed;
        const [x,y,z]=point(phi,theta,c.waveFreq);
        // p5 rotateX(phase*0.2); rotateY(phase*0.3)
        const x1=x*cosY+z*sinY, z1=-x*sinY+z*cosY;
        const y2=y*cosX-z1*sinX, z2=y*sinX+z1*cosX;
        const perspective=900/(900-z2);
        const px=w/2+x1*unit*perspective;
        const py=h/2+y2*unit*perspective;
        if(px<-2||px>w+2||py<-2||py>h+2)continue;
        const size=clamp(pointSize*perspective*unit,0.55,2.5);
        ctx.fillRect(px-size/2,py-size/2,size,size);
      }
    }
  }
  ctx.globalAlpha=1;
  ctx.restore();
}
registry.bindRenderer(ID,render);
})();
