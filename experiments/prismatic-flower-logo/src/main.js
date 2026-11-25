import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {makeSoftBody} from './soft-body.js';
import {balloonGlyph,vectorGlyph,placeText} from './type.js';

const $=id=>document.getElementById(id),stage=$('stage'),canvas=$('scene');
const params=new URLSearchParams(location.search),capture=params.has('capture');
const mobile=matchMedia('(max-width: 650px)').matches;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let paused=capture||reduce,clockTime=0,angle=Number(params.get('angle')||0),targetAngle=angle,axis=params.get('axis')==='y'?'y':'x';
let quality='auto',elasticity=65,excitation=0,lost=false,disposed=false,frameCount=0;
let renderer,composer,bloom,scene,camera,card,body,shell,inner,letterMaterial,environment;
const state={ready:false,version:'prismatic-flower-1',angle,axis,frames:0,meanFrameMs:null,pressed:false,energy:0,vertices:0,triangles:0,deviceTest:'browser-only'};

function envMap(){
 const w=768,h=384,data=new Float32Array(w*h*4);
 const boxes=[
  [-1.0,.65,.25,.65,[3.9,5.0,6.9]],
  [1.05,.6,.19,.9,[5.3,2.2,6.0]],
  [-.35,-.5,.38,.32,[7.8,3.2,.55]],
  [2.6,-.25,.26,.9,[4.2,1.0,6.7]],
  [-2.1,.25,.38,.65,[.5,2.0,4.0]],
  [.1,1.22,.75,.13,[5.3,5.6,6.3]],
  [.2,-1.22,.8,.14,[6.0,3.3,.8]]
 ];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const az=(x/w-.5)*Math.PI*2,el=(y/h-.5)*Math.PI;const c=[.009,.003,.022];
  for(const [bx,by,bw,bh,color] of boxes){let dx=Math.atan2(Math.sin(az-bx),Math.cos(az-bx));const dy=el-by;const glow=Math.exp(-((dx/bw)**4)-((dy/bh)**4));for(let k=0;k<3;k++)c[k]+=color[k]*glow}
  const i=(x+y*w)*4;data[i]=c[0];data[i+1]=c[1];data[i+2]=c[2];data[i+3]=1;
 }
 const tex=new T.DataTexture(data,w,h,T.RGBAFormat,T.FloatType);tex.mapping=T.EquirectangularReflectionMapping;tex.needsUpdate=true;
 const pmrem=new T.PMREMGenerator(renderer);const result=pmrem.fromEquirectangular(tex);tex.dispose();pmrem.dispose();return result;
}
function physical(options={}){
 return new T.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:.09,ior:1.47,transmission:.96,thickness:1.1,attenuationColor:new T.Color('#ffe2a8'),attenuationDistance:3.4,dispersion:.72,iridescence:.48,iridescenceIOR:1.32,iridescenceThicknessRange:[210,520],clearcoat:1,clearcoatRoughness:.065,envMapIntensity:1.38,...options});
}
function init(){
 renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setClearColor(0x08050e);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 renderer.transmissionResolutionScale=mobile?.65:.85;
 scene=new T.Scene();scene.background=new T.Color(0x08050e);
 camera=new T.PerspectiveCamera(34,1,.05,60);camera.position.set(0,0,13.4);camera.lookAt(0,0,0);
 environment=envMap();scene.environment=environment.texture;
 scene.add(new T.AmbientLight(0x9786c5,.34));
 const key=new T.DirectionalLight(0xfff5de,3.0);key.position.set(-3,5,5);scene.add(key);
 const fill=new T.DirectionalLight(0x9dbbff,2);fill.position.set(3,2,4);scene.add(fill);
 const rim=new T.DirectionalLight(0xffad50,2.1);rim.position.set(-2,-3,2);scene.add(rim);
 card=new T.Group();scene.add(card);
 const plate=new T.Mesh(new RoundedBoxGeometry(6.25,7.0,.07,4,.17),new T.MeshStandardMaterial({color:0x08050e,metalness:.15,roughness:.6}));plate.name='opaque-card';card.add(plate);
 const bgmat=new T.ShaderMaterial({depthWrite:true,vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;
  void main(){vec2 p=(vUv-.5)*vec2(6.2,7.);float a=exp(-dot(p*vec2(.7,.65),p*vec2(.7,.65)));float b=exp(-dot((p-vec2(0.,-2.9))*vec2(1.5,8.),(p-vec2(0.,-2.9))*vec2(1.5,8.)));gl_FragColor=vec4(vec3(.006,.0015,.012)+a*vec3(.022,.003,.032)+b*vec3(.15,.032,.065),1.);}`});
 const panel=new T.Mesh(new T.PlaneGeometry(6.19,6.92),bgmat);panel.position.z=.036;card.add(panel);
 const outline=new T.EdgesGeometry(plate.geometry,28);const outlineMesh=new T.LineSegments(outline,new T.LineBasicMaterial({color:0x6a5078,transparent:true,opacity:.11}));card.add(outlineMesh);
 body=makeSoftBody();shell=new T.Mesh(body.geometry,physical());shell.name='sculpted-soft-glass';shell.position.set(0,-.02,1.03);card.add(shell);
 state.vertices=body.vertexCount;
 addInterior();addTypography();addOrbit();addWave();addBack();
 const rt=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:mobile?2:4});
 composer=new EffectComposer(renderer,rt);composer.addPass(new RenderPass(scene,camera));
 bloom=new UnrealBloomPass(new T.Vector2(1,1),.4,.6,.9);composer.addPass(bloom);composer.addPass(new OutputPass());
 resize();new ResizeObserver(resize).observe(stage);
 bindInteractions();
 $('pause').setAttribute('aria-pressed',String(paused));$('pause').textContent=paused?'Продолжить':'Пауза';
 if(params.has('clean')||capture)setClean(true);
 window.addEventListener('pagehide',()=>{disposed=true;renderer.dispose();composer.dispose();environment.dispose()},{once:true});
 window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;showError(new Error('Графический контекст прерван. Перезагрузите страницу, чтобы продолжить.'))});
 canvas.addEventListener('webglcontextrestored',()=>location.reload());
 document.addEventListener('visibilitychange',()=>{lastTime=performance.now()});
 state.ready=true;state.renderer=renderer.getContext().getParameter(renderer.getContext().RENDERER);$('loading').hidden=true;
 canvas.dataset.ready='true';state.material={transmission:shell.material.transmission,ior:shell.material.ior,dispersion:shell.material.dispersion,screenSpaceRefraction:true,pathTracing:false};
 window.SETKA_FLOWER_DIAGNOSTICS=state;
 requestAnimationFrame(frame);
}

function leafGeometry(length,width,bend=.1){
 const vertices=[],indices=[],nx=38,ny=20;
 for(let side=0;side<2;side++)for(let i=0;i<=nx;i++)for(let j=0;j<=ny;j++){
  const u=i/nx,v=j/ny*2-1,w=width*Math.pow(Math.sin(Math.PI*u),.83);
  vertices.push(v*w,length*u,.09*Math.sin(Math.PI*u)*(1-v*v)+bend*u*u+(side?-.008:.008)*Math.sin(Math.PI*u));
 }
 const offset=(nx+1)*(ny+1);
 for(let s=0;s<2;s++)for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
  const a=s*offset+i*(ny+1)+j,b=a+ny+1;if(s)indices.push(a,b+1,b,a,a+1,b+1);else indices.push(a,b,b+1,a,b+1,a+1);
 }
 for(let i=0;i<nx;i++)for(const j of [0,ny]){const a=i*(ny+1)+j,b=(i+1)*(ny+1)+j;indices.push(a,a+offset,b,b,a+offset,b+offset)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
const flowObjects=[];
function addInterior(){
 inner=new T.Group();inner.position.copy(shell.position);card.add(inner);
 const amber=new T.MeshPhysicalMaterial({color:0xffb624,metalness:.25,roughness:.18,clearcoat:1,iridescence:.3,emissive:0xff5c00,emissiveIntensity:.18,envMapIntensity:1.5,side:T.DoubleSide});
 const lilac=amber.clone();lilac.color.set('#bca0ff');lilac.emissive.set('#5026a7');lilac.emissiveIntensity=.15;lilac.metalness=.45;
 const flower=new T.Group();flower.position.z=.48;inner.add(flower);flower.name='volumetric-flower-core';
 for(let i=0;i<5;i++){
  const leaf=new T.Mesh(leafGeometry(i===0?.78:.91,.22,i%2?.05:-.12),i===3?lilac:amber);
  leaf.rotation.z=i*Math.PI*2/5+.02;leaf.rotation.y=(i%2?1:-1)*.1;flower.add(leaf);
  // Thin real luminous vein, embedded in each petal.
  const vein=[];for(let j=0;j<=32;j++){const u=j/32;vein.push(new T.Vector3(0,u*.79,.015+.10*Math.sin(Math.PI*u)))}
  const m=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(vein),32,.006,5,false),new T.MeshBasicMaterial({color:new T.Color(3.4,1.4,.45)}));m.rotation.copy(leaf.rotation);flower.add(m);
 }
 const seed=new T.Mesh(new T.IcosahedronGeometry(.075,3),new T.MeshBasicMaterial({color:new T.Color(5,3.7,4.6)}));seed.position.z=.05;flower.add(seed);
 // Folded, three-dimensional laminae inside the glass, not a surface color ramp.
 for(let i=0;i<4;i++){
  const theta=i*Math.PI/2+.65;const g=leafGeometry(1.42,.32,.15);
  const m=new T.Mesh(g,i%2?lilac:amber);m.rotation.z=theta;m.rotation.y=.52*Math.sin(theta);m.position.set(.10*Math.cos(theta),.10*Math.sin(theta),-.15);inner.add(m);flowObjects.push(m);
 }
 for(let i=0;i<7;i++){
  const points=[];for(let j=0;j<=90;j++){
   const u=j/90,a=i*Math.PI*2/7+.6*u,r=.24+u*1.15;points.push(new T.Vector3(r*Math.cos(a),r*Math.sin(a),-.15+.32*Math.sin(u*5+i)*Math.sin(Math.PI*u)));
  }
  const m=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),90,.006+(i%3)*.002,5,false),new T.MeshBasicMaterial({color:new T.Color(i%2?2:1.7,i%2?.5:1.0,i%2?2.3:.18)}));inner.add(m);
 }
 let seedNum=8123;const random=()=>{seedNum=(1664525*seedNum+1013904223)>>>0;return seedNum/4294967296};
 const bubbles=new T.InstancedMesh(new T.SphereGeometry(1,18,12),physical({transmission:.48,ior:1.08,thickness:.05,roughness:.045,envMapIntensity:1.8,attenuationColor:new T.Color('white'),dispersion:.35}),27);
 const matrix=new T.Matrix4();const bubbleInfo=[];
 for(let i=0;i<27;i++){const a=random()*Math.PI*2,r=.42+random()*.85,s=.012+random()**2*.048;const pos=new T.Vector3(Math.cos(a)*r,Math.sin(a)*r,.05+random()*.38);matrix.compose(pos,new T.Quaternion(),new T.Vector3(s,s,s));bubbles.setMatrixAt(i,matrix);bubbleInfo.push({pos:pos.toArray(),r:s})}
 inner.add(bubbles);state.bubbles=27;state.interiorGeometry=true;
}

function addTypography(){
 letterMaterial=physical({transmission:.67,roughness:.14,thickness:.35,attenuationColor:new T.Color('#e9acff'),attenuationDistance:1.25,iridescence:.66,envMapIntensity:1.6,dispersion:.6});
 const title=new T.Group();title.name='solid-inflated-title';card.add(title);
 const xs=[-1.83,-1.01,-.12,.88,1.91],ys=[1.89,2.31,2.48,2.29,1.94],rot=[-.48,-.22,.06,.25,.47];
 [...'СКВИШ'].forEach((ch,i)=>{const m=balloonGlyph(ch,letterMaterial);m.position.set(xs[i],ys[i],.40);m.rotation.z=rot[i];m.scale.setScalar(1.06);m.name='balloon-'+ch;title.add(m)});
 const typeMat=new T.MeshStandardMaterial({color:0xffecd9,emissive:0xe9b5c4,emissiveIntensity:.38,metalness:.4,roughness:.27});
 const subtitle=new T.Group();subtitle.name='solid-curved-subtitle';card.add(subtitle);
 const text='ДЛЯМОЗГА',positions=[-1.65,-1.18,-.72,-.18,.34,.84,1.31,1.77];
 [...text].forEach((ch,i)=>{const x=positions[i],m=vectorGlyph(ch,.30,.033,typeMat);m.position.set(x,-2.01+.12*x*x,.105);m.rotation.z=x*.15;subtitle.add(m)});
 const caption=placeText('АНТИСТРЕСС ТРЕКЕР',{height:.105,spacing:.063,depth:.016,material:typeMat});caption.position.set(0,-2.70,.09);caption.name='solid-tracker-caption';card.add(caption);
 for(const sign of [-1,1]){const bar=new T.Mesh(new T.CylinderGeometry(.002,.002,.62,8),typeMat);bar.rotation.z=Math.PI/2;bar.position.set(sign*2.05,-2.70,.10);card.add(bar)}
 state.typography={title:'closed-isosurfaces',subtitle:'beveled-font-outlines',caption:'beveled-font-outlines',cssTextShadows:false};
}
function addOrbit(){
 const orbit=new T.Group();orbit.position.set(0,-.04,1.02);orbit.rotation.z=.36;card.add(orbit);orbit.name='spatial-light-orbit';
 for(let k=0;k<3;k++){
  const pts=[];for(let i=0;i<=256;i++){const a=i/256*Math.PI*2;pts.push(new T.Vector3(2.53*Math.cos(a),.45*Math.sin(a)+(k-1)*.018,.67*Math.sin(a)))}
  const mat=new T.MeshBasicMaterial({color:new T.Color(k===1?3.4:2.4,k===1?1.65:.65,k===1?.9:2.2)});
  orbit.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),256,k===1?.012:.0045,6,true),mat));
 }
}
let waveGeom=null,waveBase=null;
function addWave(){
 const pos=[],colors=[];const c=new T.Color();
 for(let i=0;i<212;i++)for(let j=0;j<32;j++){
  const x=-3.08+i/211*6.16,v=j/31*2-1;pos.push(x,.16+Math.sin(x*3.0)*.17+v*.20,.12);
  c.setRGB(.35+.28*Math.sin(x*1.1)**2,.11+.17*Math.cos(x)**2,.65);colors.push(c.r,c.g,c.b);
 }
 waveGeom=new T.BufferGeometry();waveGeom.setAttribute('position',new T.Float32BufferAttribute(pos,3));waveGeom.setAttribute('color',new T.Float32BufferAttribute(colors,3));waveBase=new Float32Array(pos);
 const mat=new T.PointsMaterial({size:.009,vertexColors:true,transparent:true,opacity:.72,sizeAttenuation:true,depthWrite:false});
 const points=new T.Points(waveGeom,mat);points.name='spatial-particle-wave';card.add(points);
}
function addBack(){
 const group=new T.Group();group.rotation.y=Math.PI;group.position.z=-.043;card.add(group);
 const mat=new T.MeshStandardMaterial({color:0xbaa4d2,metalness:.3,roughness:.45});
 const label=placeText('SETKA',{height:.35,spacing:.12,depth:.02,material:mat});group.add(label);
 const torus=new T.Mesh(new T.TorusGeometry(.65,.007,6,100),mat);torus.position.y=1;group.add(torus);
}

const ray=new T.Raycaster(),ndc=new T.Vector2();let gesture=null;
function hitAt(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);return ray.intersectObject(shell,false)[0]}
function localAt(e){hitAt(e);const plane=new T.Plane(new T.Vector3(0,0,1).applyQuaternion(card.quaternion),0);plane.setFromNormalAndCoplanarPoint(plane.normal,shell.getWorldPosition(new T.Vector3()));const p=new T.Vector3();return ray.ray.intersectPlane(plane,p)?card.worldToLocal(p):null}
function endGesture(){if(!gesture)return;body.release();state.pressed=false;
 if(gesture.kind==='flip'){const direction=Math.sign(gesture.velocity||angle-gesture.startAngle);targetAngle=Math.abs(gesture.velocity)>.45?Math.round((angle+direction*60)/180)*180:Math.round(angle/180)*180}
 gesture=null;
}
function bindInteractions(){
 canvas.addEventListener('pointerdown',e=>{
  if(gesture||e.button>0)return;
  const hit=hitAt(e);const r=canvas.getBoundingClientRect();const onObject=hit&&Math.cos(T.MathUtils.degToRad(angle))>-.05;
  gesture={id:e.pointerId,kind:onObject?'squish':'flip',x:e.clientX,y:e.clientY,last:performance.now(),lastPos:axis==='x'?e.clientY:e.clientX,velocity:0,startAngle:angle,height:r.height,width:r.width};
  if(onObject){const p=shell.worldToLocal(hit.point.clone());gesture.point=p.clone();gesture.start=localAt(e);const dir=ray.ray.direction.clone().transformDirection(new T.Matrix4().copy(card.matrixWorld).invert());body.press(p.toArray(),dir.toArray());excitation=Math.min(1.6,excitation+.38);state.pressed=true;state.taps=(state.taps||0)+1}
  canvas.setPointerCapture(e.pointerId);e.preventDefault();
 });
 canvas.addEventListener('pointermove',e=>{
  if(!gesture||e.pointerId!==gesture.id)return;const g=gesture,now=performance.now();
  if(g.kind==='squish'){const p=localAt(e);if(p&&g.start)body.drag(p.sub(g.start).toArray())}
  else{const coord=axis==='x'?e.clientY:e.clientX;g.velocity=(coord-g.lastPos)/Math.max(1,now-g.last);g.lastPos=coord;g.last=now;angle=targetAngle=g.startAngle+(axis==='x'?(e.clientY-g.y)/g.height:-(e.clientX-g.x)/g.width)*240;syncAngle()}
  e.preventDefault();
 });
 canvas.addEventListener('pointerup',endGesture);canvas.addEventListener('pointercancel',endGesture);canvas.addEventListener('lostpointercapture',endGesture);
 $('flip').onclick=()=>{body.release();gesture=null;targetAngle=Math.round(targetAngle/180)*180+180};
 $('reset').onclick=()=>{endGesture();targetAngle=0};
 $('pause').onclick=()=>{paused=!paused;$('pause').setAttribute('aria-pressed',String(paused));$('pause').textContent=paused?'Продолжить':'Пауза'};
 $('settings').onclick=()=>{const open=$('panel').hidden;$('panel').hidden=!open;$('settings').setAttribute('aria-expanded',String(open));document.body.classList.toggle('panel-open',open)};
 $('angle').oninput=e=>{angle=targetAngle=Number(e.target.value);syncAngle()};
 for(const b of document.querySelectorAll('[data-angle]'))b.onclick=()=>{angle=targetAngle=Number(b.dataset.angle);syncAngle()};
 $('axis').onclick=()=>{axis=axis==='x'?'y':'x';$('axis').textContent=axis==='x'?'Ось: вертикальный оборот':'Ось: горизонтальный оборот';state.axis=axis};
 $('elasticity').oninput=e=>elasticity=Number(e.target.value);
 $('optics').oninput=e=>{shell.material.ior=Number(e.target.value)/100};
 $('light').oninput=e=>renderer.toneMappingExposure=Number(e.target.value)/100;
 $('quality').onclick=()=>{quality=quality==='auto'?'high':quality==='high'?'eco':'auto';$('quality').textContent='Качество: '+({auto:'авто',high:'высокое',eco:'экономное'}[quality]);resize()};
 $('clean').onclick=()=>setClean(true);$('restore').onclick=()=>setClean(false);
 window.addEventListener('keydown',e=>{if(e.key==='Escape')setClean(false);if(e.target.tagName==='INPUT')return;if(e.key==='ArrowUp')targetAngle-=30;if(e.key==='ArrowDown')targetAngle+=30;if(e.key==='Home')targetAngle=0});
}
function setClean(on){document.body.classList.toggle('clean',on);$('restore').hidden=!on||capture;if(renderer)resize()}
let pixelRatio=1,lastTime=performance.now(),frameSum=0,measurementFrames=0;
function resize(){
 if(!composer)return;const w=stage.clientWidth,h=stage.clientHeight;
 pixelRatio=quality==='eco'?1:quality==='high'?Math.min(devicePixelRatio,2):Math.min(devicePixelRatio,mobile?1.55:1.75);
 renderer.setPixelRatio(pixelRatio);renderer.setSize(w,h,false);composer.setPixelRatio(pixelRatio);composer.setSize(w,h);
 camera.aspect=w/h;const targetH=7.9,targetW=6.75;const fov=T.MathUtils.degToRad(camera.fov);camera.position.z=Math.max(targetH/2/Math.tan(fov/2),targetW/2/Math.tan(fov/2)/camera.aspect);camera.updateProjectionMatrix();
 state.resolution=[Math.round(w*pixelRatio),Math.round(h*pixelRatio)];state.pixelRatio=pixelRatio;
}
function syncAngle(){state.angle=angle;$('angle').value=String(((angle+180)%360+360)%360-180);$('angleValue').value=Math.round(angle)+'°'}
function frame(now){
 if(disposed)return;requestAnimationFrame(frame);if(lost||document.hidden){lastTime=now;return}
 const rawDt=(now-lastTime)/1000,dt=Math.min(rawDt,.035);lastTime=now;
 if(!paused||gesture?.kind==='squish'||body.energy>.00001){if(!paused)clockTime+=dt;body.update(Math.min(dt,1/60),clockTime,elasticity)}
 if(!gesture&&Math.abs(targetAngle-angle)>.001){angle+=(targetAngle-angle)*(1-Math.exp(-dt*8));if(Math.abs(targetAngle-angle)<.025)angle=targetAngle;syncAngle()}
 card.rotation.set(axis==='x'?-T.MathUtils.degToRad(angle):0,axis==='y'?T.MathUtils.degToRad(angle):0,0);
 excitation*=Math.exp(-dt*1.8);inner.rotation.z=.012*Math.sin(clockTime*.4);inner.scale.setScalar(1+.006*Math.sin(clockTime*1.1));
 if(waveGeom&&!paused){const p=waveGeom.attributes.position.array;for(let i=0;i<p.length;i+=3){const x=waveBase[i],v=((i/3)%32)/31*2-1;p[i+1]=.16+Math.sin(x*3-clockTime*.55)*(.19+v*.14)+v*.24;p[i+2]=.15+Math.cos(x*2.3+clockTime*.35)*.05*(1-v*v)}waveGeom.attributes.position.needsUpdate=true}
 composer.render();state.frames=++frameCount;state.angle=angle;state.energy=body.energy;state.triangles=renderer.info.render.triangles;state.drawCalls=renderer.info.render.calls;
 if(frameCount%15===0)canvas.dataset.diagnostics=JSON.stringify(state);
 if(frameCount>15){frameSum+=rawDt*1000;measurementFrames++;if(measurementFrames===90){state.meanFrameMs=Math.round(frameSum/measurementFrames*10)/10;if(quality==='auto'&&state.meanFrameMs>29&&pixelRatio>1.1){renderer.setPixelRatio(1.1);composer.setPixelRatio(1.1);state.pixelRatio=1.1}frameSum=0;measurementFrames=0}}
}
function showError(e){console.error(e);$('loading').hidden=true;$('error').hidden=false;$('error').textContent='Не удалось запустить 3D-сцену: '+e.message}
try{init()}catch(e){showError(e)}
