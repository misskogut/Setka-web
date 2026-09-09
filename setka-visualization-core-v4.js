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
let pulseMode=false,traceMode=false,playing=false,playToken=0,currentFrame=0,currentTraceFrame=0;
const nodeMap=new Map(),indexToNode=[],stageVisual=[];
const hubs=new THREE.Group(),artifactGroup=new THREE.Group(),artifactLines=new THREE.Group();
const localFrameGroup=new THREE.Group(),localPointGroup=new THREE.Group(),localShellGroup=new THREE.Group();
const pulseGroup=new THREE.Group(),pulseCurrentGroup=new THREE.Group();
const traceGroup=new THREE.Group(),traceVisitedGroup=new THREE.Group(),motorwayGroup=new THREE.Group();
let traceRunner=null,traceBaseLine=null;
scene.add(hubs,artifactGroup,artifactLines,localFrameGroup,pulseGroup,pulseCurrentGroup,traceGroup,traceVisitedGroup,motorwayGroup);
localFrameGroup.add(localShellGroup,localPointGroup);
pulseGroup.visible=false;pulseCurrentGroup.visible=false;traceGroup.visible=false;traceVisitedGroup.visible=false;motorwayGroup.visible=false;

const raycaster=new THREE.Raycaster();raycaster.params.Points.threshold=.16;
const pointer=new THREE.Vector2();

function esc(s){return String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}
function row(k,v){return `<div class="row"><span class="k">${esc(k)}:</span> ${esc(typeof v==='object'?JSON.stringify(v):v)}</div>`}
function col(g){const c=new THREE.Color();c.setHSL((.58+g*.11)%1,.72,.58);return c}
function roleColor(r){return r==='CENTRAL_OBJECT'?0xffe083:r==='DISTURBANCE'?0xff9854:r==='STRUCTURE_ELEMENT'||r==='STRUCTURE_METRIC'?0xc894ff:r==='STATE_METRIC'?0x6ee7ff:0xffffff}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function rpc(name,args){const r=await fetch(`${SUPA}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify(args)});if(!r.ok)throw Error(`${name} ${r.status}`);return r.json()}
function v3(p){return new THREE.Vector3(+p.x,+p.y,+p.z)}

function control(id,key){const c=PACK.controls?.[key];if(c&&$(id))$(id).disabled=!c.enabled}
function applyControls(){control('pulse','PULSE');control('trace','TRACE');control('motorways','MOTORWAYS');control('pointsOnly','POINTS');control('hair','HAIR');control('graph','GRAPH');control('local','LOCAL');control('artifacts','ART');control('auto','AUTO');control('reset','RESET')}

async function load(){
  if(!packetRef)throw Error('packet parameter required');
  const t0=performance.now();
  PACK=await rpc('setka_visualization_packet_v1',{p_packet_ref:packetRef});
  if(!PACK?.ok)throw Error(PACK?.state||'packet failed');
  SNAP=await rpc('setka_body_as_grown_frozen_snapshot_v1',{p_snapshot_ref:PACK.snapshotRef});
  if(!SNAP?.ok)throw Error(SNAP?.state||'snapshot failed');
  buildBody();buildArtifacts();buildStages();buildLocalFrames();buildActivityTransport();applyControls();setupTimeline();
  if(!PACK.controls)$('pulse').disabled=!(PACK.pulse?.available||stageVisual.length);
  const lf=(PACK.localFrames||[]).length,tr=(PACK.trace?.path||[]).length,mc=PACK.motorways?.candidateCount||0;
  sub.textContent=`${PACK.source.kind} · ${SNAP.grownNodes.toLocaleString()} body nodes · ${SNAP.internalEdges.toLocaleString()} edges · ${lf} local · ${tr} trace · ${mc} motorway candidate`;
  status.textContent=`ready · ${Math.round(performance.now()-t0)} ms · ${PACK.packetRef}`;
  hudTitle.textContent='VISUALIZATION READY';
  hudBody.textContent=`PULSE = рост тела · TRACE = записанная последовательность активности · MOTOR = повторяющиеся маршруты-кандидаты. Полный frozen body остаётся читаемым.`;
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
function buildArtifacts(){for(const a of PACK.artifacts||[]){const m=new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),new THREE.MeshBasicMaterial({color:0xff72db,transparent:true,opacity:.94,depthWrite:false}));m.position.set(0,0,0);m.userData.artifact=a;artifactGroup.add(m)}}
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
function compactPath(path){const out=[];for(const p of path||[]){if(!Number.isFinite(+p.x)||!Number.isFinite(+p.y)||!Number.isFinite(+p.z))continue;const q=v3(p),last=out[out.length-1];if(!last||last.distanceToSquared(q)>1e-8)out.push(q)}return out}
function buildActivityTransport(){
  const tp=PACK.trace?.path||[];
  if(tp.length>1){
    const pts=tp.map(v3),geo=new THREE.BufferGeometry().setFromPoints(pts);
    traceBaseLine=new THREE.Line(geo,new THREE.LineDashedMaterial({color:0x61e8ff,dashSize:.12,gapSize:.08,transparent:true,opacity:.45,depthWrite:false}));traceBaseLine.computeLineDistances();traceGroup.add(traceBaseLine);
    traceRunner=new THREE.Mesh(new THREE.SphereGeometry(.15,16,10),new THREE.MeshBasicMaterial({color:0xffef9a,transparent:true,opacity:1,depthWrite:false}));traceRunner.position.copy(pts[0]);traceRunner.userData.tracePoint=tp[0];traceGroup.add(traceRunner);
  }
  for(const c of PACK.motorways?.candidates||[]){
    const pts=compactPath(c.representativePath);if(pts.length<2)continue;
    const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');
    const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(24,pts.length*8),.055+Math.min(.055,(+c.repeatCount||1)*.012),7,false),new THREE.MeshBasicMaterial({color:0xffbd63,transparent:true,opacity:.34,depthWrite:false}));
    tube.userData.motorway=c;motorwayGroup.add(tube);
  }
}

function fit(){if(!points)return;const box=new THREE.Box3().setFromObject(points),s=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3()),d=Math.max(s.x,s.y,s.z)*1.08;controls.target.copy(c);camera.position.set(c.x+d*.56,c.y+d*.28,c.z+d);controls.update()}
function showNode(o){title.textContent=o.name;body.innerHTML=row('тип',o.type)+row('семейство',o.family||'—')+row('поколение',o.generation)+row('degree',o.degree)+row('masked id',o.id);drawer.classList.add('open')}
function showLocal(p){title.textContent=p.label||p.ref||'LOCAL';body.innerHTML=row('ship',p.shipCode)+row('ref',p.ref||'—')+row('role',p.semanticRole||'SHELL')+row('geometry',p.geometryKind||'—')+row('basis',p.spatialPresentation?.basis||p.basis||'—')+row('generation',p.generation??'—')+row('scaleBasis',p.scaleBasis||'—');drawer.classList.add('open')}
function showMotorway(c){title.textContent=c.candidateRef||'MOTORWAY CANDIDATE';body.innerHTML=row('status',c.status)+row('kind',c.candidateKind)+row('repeatCount',c.repeatCount)+row('signature',c.signature)+row('mean run ms',c.meanRecordedRunDurationMs)+row('geometry',c.geometryMeaning)+row('boundary',c.evidenceBoundary);drawer.classList.add('open')}
function pick(x,y){const r=renderer.domElement.getBoundingClientRect();pointer.x=((x-r.left)/r.width)*2-1;pointer.y=-((y-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);let h=raycaster.intersectObjects(motorwayGroup.children,false);if(h.length){showMotorway(h[0].object.userData.motorway);return}h=raycaster.intersectObjects(localPointGroup.children,false);if(h.length){showLocal(h[0].object.userData.localPoint);return}h=raycaster.intersectObjects(localShellGroup.children,false);if(h.length){showLocal(h[0].object.userData.localShell);return}h=raycaster.intersectObjects(hubs.children,false);if(h.length){showNode(nodeMap.get(h[0].object.userData.nodeId));return}h=raycaster.intersectObject(points,false);if(h.length)showNode(indexToNode[h[0].index])}
let down=null;renderer.domElement.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY,t:performance.now()});renderer.domElement.addEventListener('pointerup',e=>{if(!down)return;const m=Math.hypot(e.clientX-down.x,e.clientY-down.y);if(m<8&&performance.now()-down.t<500)pick(e.clientX,e.clientY);down=null});

function setupTimeline(){
  const hasPulse=!!PACK.pulse?.available,hasTrace=(PACK.trace?.path||[]).length>1;
  if(!hasPulse&&!hasTrace){timeline.classList.remove('available');return}
  timeline.classList.add('available');
  const modes=PACK.temporalModel?.playbackTime?.modes||[{code:'15S',label:'15 sec',durationSeconds:15},{code:'30S',label:'30 sec',durationSeconds:30},{code:'60S',label:'1 min',durationSeconds:60}];
  durationSelect.innerHTML='';for(const m of modes){const o=document.createElement('option');o.value=m.code;o.textContent=m.durationSeconds?`${m.label} · ${Number(m.durationSeconds).toFixed(m.code==='ORIGINAL'?3:0)}s`:m.label;o.dataset.seconds=m.durationSeconds??'';if(m.available===false||m.durationSeconds==null)o.disabled=true;durationSelect.appendChild(o)}
  const first=[...durationSelect.options].find(o=>!o.disabled);if(first)durationSelect.value=first.value;
  scrub.oninput=()=>{pausePlayback();if(traceMode)seekTraceFrame(+scrub.value);else{enterPulseMode();seekPulseFrame(+scrub.value)}};
  $('prevFrame').onclick=()=>{pausePlayback();if(traceMode)seekTraceFrame(Math.max(0,currentTraceFrame-1));else{enterPulseMode();seekPulseFrame(Math.max(0,currentFrame-1))}};
  $('nextFrame').onclick=()=>{pausePlayback();if(traceMode)seekTraceFrame(Math.min((PACK.trace?.path?.length||1)-1,currentTraceFrame+1));else{enterPulseMode();seekPulseFrame(Math.min((PACK.pulse?.frames?.length||1)-1,currentFrame+1))}};
  playPause.onclick=()=>playing?pausePlayback():(traceMode?startTracePlayback():startPulsePlayback());
  durationSelect.onchange=()=>{pausePlayback();traceMode?updateTraceClocks(currentTraceFrame):updatePulseClocks(currentFrame)};
  configureTimelineForPulse();
}
function selectedDuration(){const o=durationSelect.selectedOptions[0],n=Number(o?.dataset.seconds);return Number.isFinite(n)&&n>0?n:15}
function configureTimelineForPulse(){const n=PACK.pulse?.frames?.length||0;scrub.min=0;scrub.max=Math.max(0,n-1);scrub.step=1;scrub.value=currentFrame;frameLabel.textContent=n?`frame ${currentFrame+1}/${n}`:'frame —'}
function configureTimelineForTrace(){const n=PACK.trace?.path?.length||0;scrub.min=0;scrub.max=Math.max(0,n-1);scrub.step=1;scrub.value=currentTraceFrame;frameLabel.textContent=n?`trace ${currentTraceFrame+1}/${n}`:'trace —'}
function chart(frames,current){const mx=Math.max(1,...frames.map(f=>+f.bornNodes||0));pulseChart.innerHTML=frames.map((f,i)=>`<button class="pbar ${i===current?'now':''}" data-i="${i}" style="height:${Math.max(4,46*(+f.bornNodes||0)/mx)}px" title="gen ${f.generation}: +${f.bornNodes}"><i>${f.generation}</i></button>`).join('');pulseChart.classList.add('on');for(const b of pulseChart.querySelectorAll('.pbar'))b.onclick=()=>{pausePlayback();enterPulseMode();seekPulseFrame(+b.dataset.i)}}
function pulseGeometry(g){pulseGroup.clear();pulseCurrentGroup.clear();const cum=[],born=[];for(const o of nodeMap.values()){if(o.generation<=g)cum.push(o.pos.x,o.pos.y,o.pos.z);if(o.generation===g)born.push(o.pos.x,o.pos.y,o.pos.z)}const mk=(arr,size,opacity)=>new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(arr,3)),new THREE.PointsMaterial({size,transparent:true,opacity,depthWrite:false}));pulseGroup.add(mk(cum,.052,.52));pulseCurrentGroup.add(mk(born,.105,.98));pulseGroup.visible=true;pulseCurrentGroup.visible=true;for(const m of localPointGroup.children)m.visible=(m.userData.localPoint?.generation??99)<=g;for(const m of localShellGroup.children)m.visible=localFrameGroup.visible&&!pointsMode&&(m.userData.localShell?.generation??99)<=g}
function enterPulseMode(){if(traceMode)exitTraceMode();if(pulseMode)return;pulseMode=true;$('pulse').classList.add('active');timeline.classList.add('on');configureTimelineForPulse();points.material.opacity=.08;growthEdges.material.opacity=.035;hubs.visible=false;seekPulseFrame(currentFrame)}
function exitPulseMode(){pausePlayback();pulseMode=false;$('pulse').classList.remove('active');pulseChart.classList.remove('on');pulseGroup.clear();pulseCurrentGroup.clear();pulseGroup.visible=false;pulseCurrentGroup.visible=false;points.material.opacity=.88;growthEdges.material.opacity=.18;hubs.visible=true;for(const m of localPointGroup.children)m.visible=true;for(const m of localShellGroup.children)m.visible=localFrameGroup.visible&&!pointsMode;if(!traceMode)timeline.classList.remove('on')}
function updatePulseClocks(i){const P=PACK.pulse,F=P?.frames?.[i];if(!F)return;const E=PACK.temporalModel?.executionTime||{},dur=selectedDuration(),frac=P.frames.length<=1?1:i/(P.frames.length-1),viewElapsed=dur*frac;sysClock.textContent=`SYS · gen ${F.generation}/${P.frames.length-1} · x=${Number(F.x).toFixed(6)}`;execClock.textContent=E.available?`EXEC · ${Number(E.durationSeconds).toFixed(3)}s real total · frame↔wall: n/a`:'EXEC · time not recorded';viewClock.textContent=`VIEW · ${viewElapsed.toFixed(2)}/${dur.toFixed(2)}s · ${durationSelect.value}`;frameLabel.textContent=`frame ${i+1}/${P.frames.length}`}
function seekPulseFrame(i){const P=PACK.pulse;if(!P?.available)return;currentFrame=Math.max(0,Math.min(P.frames.length-1,i));scrub.value=currentFrame;const f=P.frames[currentFrame],ff=(P.focusFrames||[]).find(x=>+x.generation===+f.generation);pulseGeometry(+f.generation);chart(P.frames,currentFrame);updatePulseClocks(currentFrame);hudTitle.textContent=`PULSE · поколение ${f.generation}`;hudBody.textContent=`рост +${Number(f.bornNodes).toLocaleString()} узлов · всего ${Number(f.cumulativeNodes).toLocaleString()} · активность ${f.bornSharePct}% · x=${Number(f.x).toFixed(6)}${ff?` · дочка +${ff.bornNodes}, всего ${ff.cumulativeNodes}`:''}`}
function pausePlayback(){playing=false;playToken++;playPause.textContent='▶';playPause.classList.remove('active')}
async function startPulsePlayback(){const P=PACK.pulse;if(!P?.available||playing)return;enterPulseMode();if(currentFrame>=P.frames.length-1)currentFrame=0;playing=true;const token=++playToken;playPause.textContent='Ⅱ';playPause.classList.add('active');const delay=Math.max(70,selectedDuration()*1000/Math.max(1,P.frames.length));for(let i=currentFrame;i<P.frames.length;i++){if(!playing||token!==playToken)return;seekPulseFrame(i);await sleep(delay)}if(token===playToken){playing=false;playPause.textContent='▶';playPause.classList.remove('active');hudTitle.textContent='PULSE COMPLETE';hudBody.textContent=`${P.metrics.growthGenerations} поколений · ${Number(P.metrics.finalGrownNodes).toLocaleString()} выросших узлов · пик: поколение ${P.metrics.peakGeneration}, +${Number(P.metrics.peakBornNodes).toLocaleString()} узлов.`}}

function enterTraceMode(){if(pulseMode)exitPulseMode();if(traceMode)return;traceMode=true;$('trace').classList.add('active');traceGroup.visible=true;traceVisitedGroup.visible=true;timeline.classList.add('on');pulseChart.classList.remove('on');configureTimelineForTrace();seekTraceFrame(currentTraceFrame)}
function exitTraceMode(){pausePlayback();traceMode=false;$('trace').classList.remove('active');traceGroup.visible=false;traceVisitedGroup.visible=false;traceVisitedGroup.clear();if(!pulseMode)timeline.classList.remove('on');hudTitle.textContent='BODY VIEW';hudBody.textContent='TRACE остановлен. Временная линия скрыта; frozen body не изменён.'}
function traceTiming(i){const path=PACK.trace?.path||[],first=path[0],last=path[path.length-1],p=path[i];if(!first||!last||!p)return{frac:0,elapsed:0,total:0};const a=Date.parse(first.recordedAt),b=Date.parse(last.recordedAt),t=Date.parse(p.recordedAt),total=Math.max(0,b-a),elapsed=Math.max(0,t-a),frac=total>0?elapsed/total:(path.length<=1?1:i/(path.length-1));return{frac,elapsed,total}}
function updateTraceClocks(i){const path=PACK.trace?.path||[],p=path[i];if(!p)return;const T=traceTiming(i),dur=selectedDuration(),viewElapsed=dur*T.frac,prec=p.withinStepOrderRecorded===false?'step-level':'recorded';sysClock.textContent=`SYS · trace ${i+1}/${path.length} · body gen ${p.generation??'—'}`;execClock.textContent=`EXEC · +${(T.elapsed/1000).toFixed(3)}s / ${(T.total/1000).toFixed(3)}s · ${prec}`;viewClock.textContent=`VIEW · ${viewElapsed.toFixed(2)}/${dur.toFixed(2)}s · ${durationSelect.value}`;frameLabel.textContent=`trace ${i+1}/${path.length}`}
function updateVisitedTrace(i){traceVisitedGroup.clear();const path=PACK.trace?.path||[];if(i<1)return;const pts=path.slice(0,i+1).map(v3),l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xffef9a,transparent:true,opacity:.9,depthWrite:false}));traceVisitedGroup.add(l)}
function seekTraceFrame(i){const path=PACK.trace?.path||[];if(!path.length||!traceRunner)return;currentTraceFrame=Math.max(0,Math.min(path.length-1,i));scrub.value=currentTraceFrame;const p=path[currentTraceFrame];traceRunner.position.copy(v3(p));traceRunner.userData.tracePoint=p;updateVisitedTrace(currentTraceFrame);updateTraceClocks(currentTraceFrame);hudTitle.textContent=`TRACE · ${currentTraceFrame+1}/${path.length} · ${p.stageKind}`;hudBody.textContent=`${p.entityRef} · ${p.withinStepOrderRecorded===false?'внутри шага порядок не записан; движение только для просмотра':'порядок подтверждён записью'} · временная линия ≠ graph edge.`}
async function animateTraceSegment(a,b,duration,token){if(!traceRunner)return;const from=v3(a),to=v3(b),steps=Math.max(4,Math.min(90,Math.round(duration/28)));for(let k=1;k<=steps;k++){if(!playing||token!==playToken)return false;traceRunner.position.lerpVectors(from,to,k/steps);await sleep(Math.max(8,duration/steps))}return true}
async function startTracePlayback(){const path=PACK.trace?.path||[];if(path.length<2||playing)return;enterTraceMode();if(currentTraceFrame>=path.length-1)currentTraceFrame=0;seekTraceFrame(currentTraceFrame);playing=true;const token=++playToken;playPause.textContent='Ⅱ';playPause.classList.add('active');const totalRecorded=Math.max(1,Date.parse(path[path.length-1].recordedAt)-Date.parse(path[0].recordedAt)),viewMs=selectedDuration()*1000;for(let i=currentTraceFrame+1;i<path.length;i++){if(!playing||token!==playToken)return;const raw=Math.max(0,Date.parse(path[i].recordedAt)-Date.parse(path[i-1].recordedAt)),segmentMs=raw>0?Math.max(70,viewMs*raw/totalRecorded):90;const ok=await animateTraceSegment(path[i-1],path[i],segmentMs,token);if(!ok)return;seekTraceFrame(i)}if(token===playToken){playing=false;playPause.textContent='▶';playPause.classList.remove('active');hudTitle.textContent='TRACE COMPLETE';hudBody.textContent=`Пройдено ${path.length} отображаемых точек записанной активности. Внутришаговый порядок для одновременно раскрытых данных остаётся presentation-only.`}}
function traceButton(){if(!(PACK.trace?.path||[]).length)return;if(traceMode)exitTraceMode();else{currentTraceFrame=0;enterTraceMode();startTracePlayback()}}
function motorwayButton(e){motorwayGroup.visible=!motorwayGroup.visible;e.currentTarget.classList.toggle('active',motorwayGroup.visible);const c=PACK.motorways?.candidates?.[0];hudTitle.textContent=motorwayGroup.visible?'MOTORWAY CANDIDATES':'MOTORWAYS HIDDEN';hudBody.textContent=motorwayGroup.visible&&c?`${c.candidateRef} · повторов ${c.repeatCount} · ${c.status}. Это транспортный кандидат по повторяемому TRACE, не graph-edge и не кристаллизованная магистраль.`:'Кандидаты магистралей скрыты.'}

async function playStagePulse(){if(playing||!stageVisual.length)return;playing=true;pulseMesh.visible=true;for(let i=0;i<stageVisual.length;i++){const q=stageVisual[i],prev=i?stageVisual[i-1].p:q.p;for(let f=0;f<=20;f++){pulseMesh.position.lerpVectors(prev,q.p,f/20);await sleep(14)}hudTitle.textContent=`#${q.s.ord||i+1} · ${q.s.stageCode||q.s.kind||'STAGE'}`;hudBody.textContent=q.s.label||''}pulseMesh.visible=false;playing=false}
function pulseButton(){if(PACK.pulse?.available){if(pulseMode)exitPulseMode();else{currentFrame=0;enterPulseMode();startPulsePlayback()}}else playStagePulse()}
function setPointsMode(on){pointsMode=on;$('pointsOnly').classList.toggle('active',on);if(on){lastHair=growthEdges.visible;lastGraph=graphEdges.visible;growthEdges.visible=false;graphEdges.visible=false;pathLine.visible=false;localShellGroup.visible=false;$('hair').classList.remove('active');$('graph').classList.remove('active')}else{growthEdges.visible=lastHair;graphEdges.visible=lastGraph;pathLine.visible=stageVisual.length>1;localShellGroup.visible=localFrameGroup.visible;$('hair').classList.toggle('active',growthEdges.visible);$('graph').classList.toggle('active',graphEdges.visible)}}

$('pulse').onclick=pulseButton;
$('trace').onclick=traceButton;
$('motorways').onclick=motorwayButton;
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