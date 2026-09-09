import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const SUPA='https://gfchgaphzhxufwdhrcis.supabase.co';
const KEY='sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv';
const packetRef=new URLSearchParams(location.search).get('packet');
const $=id=>document.getElementById(id);
const app=$('app'),status=$('status'),loader=$('loader'),sub=$('sub');
const hudTitle=$('hudTitle'),hudBody=$('hudBody'),pulseChart=$('pulseChart'),timeline=$('timeline');
const sysClock=$('sysClock'),execClock=$('execClock'),viewClock=$('viewClock');
const durationSelect=$('durationSelect'),scrub=$('scrub'),frameLabel=$('frameLabel'),playPause=$('playPause');
const drawer=$('drawer'),title=$('title'),body=$('body');

const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));
renderer.setSize(innerWidth,innerHeight);
renderer.setClearColor(0x030814,1);
app.appendChild(renderer.domElement);

const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x030814,.014);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.03,400);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.autoRotate=true;controls.autoRotateSpeed=.22;controls.minDistance=.5;controls.maxDistance=220;
scene.add(new THREE.AmbientLight(0xffffff,1));

let PACK,SNAP,points,growthEdges,graphEdges,pathLine,pulseMesh;
let pointsMode=false,lastHair=true,lastGraph=false,lastLocal=true,lastArtifacts=true;
let pulseMode=false,playing=false,playToken=0,currentFrame=0;
const nodeMap=new Map(),indexToNode=[],stageVisual=[];
const hubs=new THREE.Group(),artifactGroup=new THREE.Group(),artifactLines=new THREE.Group();
const localFrameGroup=new THREE.Group(),localPointGroup=new THREE.Group(),localShellGroup=new THREE.Group();
const pulseGroup=new THREE.Group(),pulseCurrentGroup=new THREE.Group();
scene.add(hubs,artifactGroup,artifactLines,localFrameGroup,pulseGroup,pulseCurrentGroup);
localFrameGroup.add(localShellGroup,localPointGroup);
pulseGroup.visible=false;pulseCurrentGroup.visible=false;

const raycaster=new THREE.Raycaster();raycaster.params.Points.threshold=.16;
const pointer=new THREE.Vector2();

function esc(s){return String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}
function row(k,v){return `<div class="row"><span class="k">${esc(k)}:</span> ${esc(typeof v==='object'?JSON.stringify(v):v)}</div>`}
function col(g){const c=new THREE.Color();c.setHSL((.58+g*.11)%1,.72,.58);return c}
function roleColor(r){return r==='CENTRAL_OBJECT'?0xffe083:r==='DISTURBANCE'?0xff9854:r==='STRUCTURE_ELEMENT'||r==='STRUCTURE_METRIC'?0xc894ff:r==='STATE_METRIC'?0x6ee7ff:0xffffff}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function rpc(name,args){const r=await fetch(`${SUPA}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify(args)});if(!r.ok)throw Error(`${name} ${r.status}`);return r.json()}

function control(id,key){const c=PACK.controls?.[key];if(c)$(id).disabled=!c.enabled}
function applyControls(){control('pulse','PULSE');control('pointsOnly','POINTS');control('hair','HAIR');control('graph','GRAPH');control('local','LOCAL');control('artifacts','ART');control('auto','AUTO');control('reset','RESET')}

async function load(){
  if(!packetRef)throw Error('packet parameter required');
  const t0=performance.now();
  PACK=await rpc('setka_visualization_packet_v1',{p_packet_ref:packetRef});
  if(!PACK?.ok)throw Error(PACK?.state||'packet failed');
  SNAP=await rpc('setka_body_as_grown_frozen_snapshot_v1',{p_snapshot_ref:PACK.snapshotRef});
  if(!SNAP?.ok)throw Error(SNAP?.state||'snapshot failed');
  buildBody();buildArtifacts();buildStages();buildLocalFrames();applyControls();setupTimeline();
  if(!PACK.controls)$('pulse').disabled=!(PACK.pulse?.available||stageVisual.length);
  const lf=(PACK.localFrames||[]).length;
  sub.textContent=`${PACK.source.kind} · ${SNAP.grownNodes.toLocaleString()} body nodes · ${SNAP.internalEdges.toLocaleString()} edges · ${lf} local frame`;
  status.textContent=`ready · ${Math.round(performance.now()-t0)} ms · ${PACK.packetRef}`;
  hudTitle.textContent='VISUALIZATION READY';
  hudBody.textContent=PACK.pulse?.available?`PULSE: ${PACK.pulse.frames.length} записанных growth-frame. SYS, EXEC и VIEW хранятся раздельно.`:'Полный frozen body. Записанных growth frames для PULSE нет.';
  loader.style.display='none';
}

function buildBody(){
  const pos=new Float32Array(SNAP.nodes.length*3),cols=new Float32Array(SNAP.nodes.length*3);let maxD=1;
  for(const v of SNAP.nodes)maxD=Math.max(maxD,+v[5]||0);
  for(let i=0;i<SNAP.nodes.length;i++){
    const v=SNAP.nodes[i],o={id:v[0],parent:v[1],type:v[2],generation:+v[3],x:+v[4],degree:+v[5],name:v[6],family:v[7],canonical:!!v[8],pos:new THREE.Vector3(+v[9],+v[10],+v[11])};
    nodeMap.set(o.id,o);indexToNode[i]=o;
    const c=col(o.generation),boost=.62+.38*Math.min(1,Math.log1p(o.degree)/Math.log1p(maxD));
    pos[i*3]=o.pos.x;pos[i*3+1]=o.pos.y;pos[i*3+2]=o.pos.z;cols[i*3]=c.r*boost;cols[i*3+1]=c.g*boost;cols[i*3+2]=c.b*boost;
  }
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));pg.setAttribute('color',new THREE.BufferAttribute(cols,3));
  points=new THREE.Points(pg,new THREE.PointsMaterial({size:.047,vertexColors:true,transparent:true,opacity:.88,sizeAttenuation:true,depthWrite:false}));scene.add(points);
  const grow=[],full=[];
  for(const o of nodeMap.values()){if(!o.parent)continue;const p=nodeMap.get(o.parent);if(p)grow.push(p.pos.x,p.pos.y,p.pos.z,o.pos.x,o.pos.y,o.pos.z)}
  for(const e of SNAP.edges){const a=nodeMap.get(e[0]),b=nodeMap.get(e[1]);if(a&&b)full.push(a.pos.x,a.pos.y,a.pos.z,b.pos.x,b.pos.y,b.pos.z)}
  growthEdges=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(grow,3)),new THREE.LineBasicMaterial({color:0xb77bd0,transparent:true,opacity:.18,depthWrite:false}));
  graphEdges=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(full,3)),new THREE.LineBasicMaterial({color:0x9b73ba,transparent:true,opacity:.055,depthWrite:false}));graphEdges.visible=false;scene.add(growthEdges,graphEdges);
  const geo=new THREE.SphereGeometry(.078,8,6);
  for(const o of [...nodeMap.values()].sort((a,b)=>b.degree-a.degree).slice(0,90)){const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col(o.generation),transparent:true,opacity:.92,depthWrite:false}));m.position.copy(o.pos);m.userData.nodeId=o.id;hubs.add(m)}
  fit();
}

function buildArtifacts(){
  for(const a of PACK.artifacts||[]){const m=new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),new THREE.MeshBasicMaterial({color:0xff72db,transparent:true,opacity:.94,depthWrite:false}));m.position.set(0,0,0);m.userData.artifact=a;artifactGroup.add(m)}
}
function buildStages(){
  for(const s of PACK.stages||[]){if(s.mappedToFrozenBody&&Number.isFinite(+s.x))stageVisual.push({s,p:new THREE.Vector3(+s.x,+s.y,+s.z)})}
  const pp=[];for(const q of stageVisual)pp.push(q.p.x,q.p.y,q.p.z);
  pathLine=new THREE.Line(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(pp,3)),new THREE.LineDashedMaterial({color:0xfff0ff,dashSize:.18,gapSize:.12,transparent:true,opacity:.58,depthWrite:false}));pathLine.computeLineDistances();pathLine.visible=stageVisual.length>1;scene.add(pathLine);
  pulseMesh=new THREE.Mesh(new THREE.SphereGeometry(.14,16,10),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:1,depthWrite:false}));pulseMesh.visible=false;scene.add(pulseMesh);
}
function buildLocalFrames(){
  for(const f of PACK.localFrames||[]){
    const a=new THREE.Vector3(+f.anchor.x,+f.anchor.y,+f.anchor.z),scale=+f.scale||1,geom=f.spatialModel?.geometryKind||'ABSTRACT_GRAPH',genByRef=new Map((f.points||[]).map(p=>[p.ref,nodeMap.get(p.nodeId)?.generation??99]));
    for(const sh of f.spatialModel?.shells||[]){const r=Math.max(.02,scale*(+sh.rNorm||0));const m=new THREE.Mesh(new THREE.SphereGeometry(r,22,14),new THREE.MeshBasicMaterial({color:0xc894ff,wireframe:true,transparent:true,opacity:sh.basis?.includes('FACT')?.32:.18,depthWrite:false}));m.position.copy(a);m.userData.localShell={...sh,shipCode:f.shipCode,geometryKind:geom,scaleBasis:f.scaleBasis,generation:genByRef.get(sh.ref)??99};localShellGroup.add(m)}
    for(const p of f.points||[]){const role=p.semanticRole||'LOCAL_OBJECT',sp=p.spatialPresentation||{},w=p.world||{};let size=role==='CENTRAL_OBJECT'?.16:role==='DISTURBANCE'?.11:.085;if(role==='DISTURBANCE'&&Number.isFinite(+sp.area))size=Math.min(.22,.08+Math.sqrt(Math.max(0,+sp.area))/90);const m=new THREE.Mesh(new THREE.SphereGeometry(size,12,8),new THREE.MeshBasicMaterial({color:roleColor(role),transparent:true,opacity:.97,depthWrite:false}));m.position.set(+w.x,+w.y,+w.z);m.userData.localPoint={...p,shipCode:f.shipCode,geometryKind:geom,scaleBasis:f.scaleBasis,generation:nodeMap.get(p.nodeId)?.generation??99};localPointGroup.add(m)}
  }
}

function fit(){if(!points)return;const box=new THREE.Box3().setFromObject(points),s=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3()),d=Math.max(s.x,s.y,s.z)*1.08;controls.target.copy(c);camera.position.set(c.x+d*.56,c.y+d*.28,c.z+d);controls.update()}
function showNode(o){title.textContent=o.name;body.innerHTML=row('тип',o.type)+row('семейство',o.family||'—')+row('поколение',o.generation)+row('degree',o.degree)+row('masked id',o.id);drawer.classList.add('open')}
function showLocal(p){title.textContent=p.label||p.ref||'LOCAL';body.innerHTML=row('ship',p.shipCode)+row('ref',p.ref||'—')+row('role',p.semanticRole||'SHELL')+row('geometry',p.geometryKind||'—')+row('basis',p.spatialPresentation?.basis||p.basis||'—')+row('generation',p.generation??'—')+row('scaleBasis',p.scaleBasis||'—');drawer.classList.add('open')}
function pick(x,y){const r=renderer.domElement.getBoundingClientRect();pointer.x=((x-r.left)/r.width)*2-1;pointer.y=-((y-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);let h=raycaster.intersectObjects(localPointGroup.children,false);if(h.length){showLocal(h[0].object.userData.localPoint);return}h=raycaster.intersectObjects(localShellGroup.children,false);if(h.length){showLocal(h[0].object.userData.localShell);return}h=raycaster.intersectObjects(hubs.children,false);if(h.length){showNode(nodeMap.get(h[0].object.userData.nodeId));return}h=raycaster.intersectObject(points,false);if(h.length)showNode(indexToNode[h[0].index])}
let down=null;renderer.domElement.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY,t:performance.now()});renderer.domElement.addEventListener('pointerup',e=>{if(!down)return;const m=Math.hypot(e.clientX-down.x,e.clientY-down.y);if(m<8&&performance.now()-down.t<500)pick(e.clientX,e.clientY);down=null});

function setupTimeline(){
  const P=PACK.pulse,TM=PACK.temporalModel;
  if(!P?.available){timeline.classList.remove('available');return}
  timeline.classList.add('available');
  const modes=TM?.playbackTime?.modes||[{code:'15S',label:'15 sec',durationSeconds:15},{code:'30S',label:'30 sec',durationSeconds:30},{code:'60S',label:'1 min',durationSeconds:60}];
  durationSelect.innerHTML='';
  for(const m of modes){const o=document.createElement('option');o.value=m.code;o.textContent=m.durationSeconds?`${m.label} · ${Number(m.durationSeconds).toFixed(m.code==='ORIGINAL'?3:0)}s`:m.label;o.dataset.seconds=m.durationSeconds??'';if(m.available===false||m.durationSeconds==null)o.disabled=true;durationSelect.appendChild(o)}
  const first=[...durationSelect.options].find(o=>!o.disabled);if(first)durationSelect.value=first.value;
  scrub.min=0;scrub.max=Math.max(0,P.frames.length-1);scrub.step=1;scrub.value=0;
  scrub.oninput=()=>{pausePlayback();enterPulseMode();seekFrame(+scrub.value)};
  $('prevFrame').onclick=()=>{pausePlayback();enterPulseMode();seekFrame(Math.max(0,currentFrame-1))};
  $('nextFrame').onclick=()=>{pausePlayback();enterPulseMode();seekFrame(Math.min(P.frames.length-1,currentFrame+1))};
  playPause.onclick=()=>playing?pausePlayback():startPlayback();
  durationSelect.onchange=()=>{pausePlayback();updateClocks(currentFrame)};
  updateClocks(0);
}
function selectedDuration(){const o=durationSelect.selectedOptions[0];const n=Number(o?.dataset.seconds);return Number.isFinite(n)&&n>0?n:15}
function chart(frames,current){const mx=Math.max(1,...frames.map(f=>+f.bornNodes||0));pulseChart.innerHTML=frames.map((f,i)=>`<button class="pbar ${i===current?'now':''}" data-i="${i}" style="height:${Math.max(4,46*(+f.bornNodes||0)/mx)}px" title="gen ${f.generation}: +${f.bornNodes}"><i>${f.generation}</i></button>`).join('');pulseChart.classList.add('on');for(const b of pulseChart.querySelectorAll('.pbar'))b.onclick=()=>{pausePlayback();enterPulseMode();seekFrame(+b.dataset.i)}}
function pulseGeometry(g){pulseGroup.clear();pulseCurrentGroup.clear();const cum=[],born=[];for(const o of nodeMap.values()){if(o.generation<=g)cum.push(o.pos.x,o.pos.y,o.pos.z);if(o.generation===g)born.push(o.pos.x,o.pos.y,o.pos.z)}const mk=(arr,size,opacity)=>new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(arr,3)),new THREE.PointsMaterial({size,transparent:true,opacity,depthWrite:false}));pulseGroup.add(mk(cum,.052,.52));pulseCurrentGroup.add(mk(born,.105,.98));pulseGroup.visible=true;pulseCurrentGroup.visible=true;for(const m of localPointGroup.children)m.visible=(m.userData.localPoint?.generation??99)<=g;for(const m of localShellGroup.children)m.visible=localFrameGroup.visible&&!pointsMode&&(m.userData.localShell?.generation??99)<=g}
function enterPulseMode(){if(pulseMode)return;pulseMode=true;$('pulse').classList.add('active');timeline.classList.add('on');points.material.opacity=.08;growthEdges.material.opacity=.035;hubs.visible=false;seekFrame(currentFrame)}
function exitPulseMode(){pausePlayback();pulseMode=false;$('pulse').classList.remove('active');timeline.classList.remove('on');pulseChart.classList.remove('on');pulseGroup.clear();pulseCurrentGroup.clear();pulseGroup.visible=false;pulseCurrentGroup.visible=false;points.material.opacity=.88;growthEdges.material.opacity=.18;hubs.visible=true;for(const m of localPointGroup.children)m.visible=true;for(const m of localShellGroup.children)m.visible=localFrameGroup.visible&&!pointsMode;hudTitle.textContent='BODY VIEW';hudBody.textContent='PULSE остановлен. Frozen body восстановлен без изменения данных.'}
function updateClocks(i){const P=PACK.pulse,F=P?.frames?.[i];if(!F)return;const TM=PACK.temporalModel||{},E=TM.executionTime||{},dur=selectedDuration(),frac=P.frames.length<=1?1:i/(P.frames.length-1),viewElapsed=dur*frac;sysClock.textContent=`SYS · gen ${F.generation}/${P.frames.length-1} · x=${Number(F.x).toFixed(6)}`;execClock.textContent=E.available?`EXEC · ${Number(E.durationSeconds).toFixed(3)}s real total · frame↔wall: n/a`:'EXEC · time not recorded';viewClock.textContent=`VIEW · ${viewElapsed.toFixed(2)}/${dur.toFixed(2)}s · ${durationSelect.value}`;frameLabel.textContent=`frame ${i+1}/${P.frames.length}`}
function seekFrame(i){const P=PACK.pulse;if(!P?.available)return;currentFrame=Math.max(0,Math.min(P.frames.length-1,i));scrub.value=currentFrame;const f=P.frames[currentFrame],ff=(P.focusFrames||[]).find(x=>+x.generation===+f.generation);pulseGeometry(+f.generation);chart(P.frames,currentFrame);updateClocks(currentFrame);hudTitle.textContent=`PULSE · поколение ${f.generation}`;hudBody.textContent=`рост +${Number(f.bornNodes).toLocaleString()} узлов · всего ${Number(f.cumulativeNodes).toLocaleString()} · активность ${f.bornSharePct}% · x=${Number(f.x).toFixed(6)}${ff?` · дочка +${ff.bornNodes}, всего ${ff.cumulativeNodes}`:''}`}
function pausePlayback(){playing=false;playToken++;playPause.textContent='▶';playPause.classList.remove('active')}
async function startPlayback(){const P=PACK.pulse;if(!P?.available||playing)return;enterPulseMode();if(currentFrame>=P.frames.length-1)currentFrame=0;playing=true;const token=++playToken;playPause.textContent='Ⅱ';playPause.classList.add('active');const delay=Math.max(70,selectedDuration()*1000/Math.max(1,P.frames.length));for(let i=currentFrame;i<P.frames.length;i++){if(!playing||token!==playToken)return;seekFrame(i);currentFrame=i;await sleep(delay)}if(token===playToken){playing=false;playPause.textContent='▶';playPause.classList.remove('active');hudTitle.textContent='PULSE COMPLETE';hudBody.textContent=`${P.metrics.growthGenerations} поколений · ${Number(P.metrics.finalGrownNodes).toLocaleString()} выросших узлов · пик: поколение ${P.metrics.peakGeneration}, +${Number(P.metrics.peakBornNodes).toLocaleString()} узлов.`}}
async function playStagePulse(){if(playing||!stageVisual.length)return;playing=true;pulseMesh.visible=true;for(let i=0;i<stageVisual.length;i++){const q=stageVisual[i],prev=i?stageVisual[i-1].p:q.p;for(let f=0;f<=20;f++){pulseMesh.position.lerpVectors(prev,q.p,f/20);await sleep(14)}hudTitle.textContent=`#${q.s.ord||i+1} · ${q.s.stageCode||q.s.kind||'STAGE'}`;hudBody.textContent=q.s.label||''}pulseMesh.visible=false;playing=false}
function pulseButton(){if(PACK.pulse?.available){if(pulseMode)exitPulseMode();else{currentFrame=0;enterPulseMode();startPlayback()}}else playStagePulse()}

function setPointsMode(on){pointsMode=on;$('pointsOnly').classList.toggle('active',on);if(on){lastHair=growthEdges.visible;lastGraph=graphEdges.visible;growthEdges.visible=false;graphEdges.visible=false;pathLine.visible=false;localShellGroup.visible=false;$('hair').classList.remove('active');$('graph').classList.remove('active')}else{growthEdges.visible=lastHair;graphEdges.visible=lastGraph;pathLine.visible=stageVisual.length>1;localShellGroup.visible=localFrameGroup.visible;$('hair').classList.toggle('active',growthEdges.visible);$('graph').classList.toggle('active',graphEdges.visible)}}

$('pulse').onclick=pulseButton;
$('pointsOnly').onclick=()=>setPointsMode(!pointsMode);
$('hair').onclick=e=>{if(pointsMode)setPointsMode(false);growthEdges.visible=!growthEdges.visible;e.currentTarget.classList.toggle('active',growthEdges.visible)};
$('graph').onclick=e=>{if(pointsMode)setPointsMode(false);graphEdges.visible=!graphEdges.visible;e.currentTarget.classList.toggle('active',graphEdges.visible)};
$('local').onclick=e=>{localFrameGroup.visible=!localFrameGroup.visible;lastLocal=localFrameGroup.visible;e.currentTarget.classList.toggle('active',lastLocal);if(pointsMode)localShellGroup.visible=false};
$('artifacts').onclick=e=>{artifactGroup.visible=!artifactGroup.visible;artifactLines.visible=artifactGroup.visible&&!pointsMode;lastArtifacts=artifactGroup.visible;e.currentTarget.classList.toggle('active',lastArtifacts)};
$('auto').onclick=e=>{controls.autoRotate=!controls.autoRotate;e.currentTarget.classList.toggle('active',controls.autoRotate)};
$('reset').onclick=fit;

function anim(){requestAnimationFrame(anim);controls.update();renderer.render(scene,camera)}anim();
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
load().catch(err=>{console.error(err);status.textContent='load failed · '+err.message;loader.querySelector('div:last-child').textContent='Ошибка: '+err.message});