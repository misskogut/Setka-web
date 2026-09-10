import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const SUPA='https://gfchgaphzhxufwdhrcis.supabase.co';
const KEY='sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv';
const qs=new URLSearchParams(location.search);
const packetRef=qs.get('packet');
const $=id=>document.getElementById(id);
const status=$('status'),loader=$('loader'),hud=$('hud'),phaseEl=$('phase'),genEl=$('generation'),bornEl=$('born'),daughterEl=$('daughter'),frameEl=$('frame'),scrub=$('scrub'),play=$('play'),speed=$('speed');

const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));
renderer.setSize(innerWidth,innerHeight);
renderer.setClearColor(0x030814,1);
$('app').appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x030814,.014);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.03,420);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.autoRotate=true;controls.autoRotateSpeed=.18;controls.minDistance=.45;controls.maxDistance=220;
scene.add(new THREE.AmbientLight(0xffffff,1));

let PACK,SNAP,IMPULSE=null,mode='BIRTH',playing=false,token=0,current=0,lastGate=-1,visibleNodes=[];
const nodeMap=new Map(),daughterIds=new Set();
const motherGroup=new THREE.Group(),daughterGroup=new THREE.Group(),currentGroup=new THREE.Group(),growthGroup=new THREE.Group(),localGroup=new THREE.Group(),activityGroup=new THREE.Group(),impulseGroup=new THREE.Group();
scene.add(motherGroup,daughterGroup,currentGroup,growthGroup,localGroup,activityGroup,impulseGroup);
let impulseVisited=null,impulseRunner=null,impulseCurrent=null,activityRunner=null;

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function rpc(name,args){
  const r=await fetch(`${SUPA}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify(args)});
  if(!r.ok)throw Error(`${name} ${r.status}`);
  return r.json();
}
function col(g){const c=new THREE.Color();c.setHSL((.58+g*.11)%1,.72,.58);return c}
function makePoints(arr,size,color,opacity=.8){
  const geo=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(arr,3));
  return new THREE.Points(geo,new THREE.PointsMaterial({size,color,transparent:true,opacity,depthWrite:false,sizeAttenuation:true}));
}
function clearGroup(g){while(g.children.length){const o=g.children.pop();o.geometry?.dispose?.();o.material?.dispose?.()}}
function vec(o){return new THREE.Vector3(+o.x,+o.y,+o.z)}

function setupNodes(){
  for(const v of SNAP.nodes){
    const o={id:v[0],parent:v[1],type:v[2],generation:+v[3],degree:+v[5],name:v[6],family:v[7],canonical:!!v[8],pos:new THREE.Vector3(+v[9],+v[10],+v[11])};
    nodeMap.set(o.id,o);
  }
  for(const id of PACK.birthGate?.daughterNodeIds||PACK.hostBirthTrace?.daughterNodeIds||[])daughterIds.add(id);
}

function gateInfo(g){
  const H=PACK.hostBirthTrace||{}, S=H.structuralFrames||[];
  const f=S.find(x=>+x.generation===g)||{};
  return {phase:f.phase||'STRUCTURAL_GROWTH',born:+f.bornNodes||0,cumulative:+f.cumulativeNodes||0,daughter:+f.daughterBornNodes||0,mother:+f.motherBornNodes||0};
}

function rebuildGate(g,{showCurrent=true,includeGrowth=true}={}){
  if(g===lastGate && motherGroup.children.length)return;
  lastGate=g; visibleNodes=[];
  clearGroup(motherGroup);clearGroup(daughterGroup);clearGroup(currentGroup);clearGroup(growthGroup);
  const ma=[],da=[],ca=[],edges=[];
  for(const o of nodeMap.values()){
    if(o.generation<=g){
      visibleNodes.push(o);
      const a=daughterIds.has(o.id)?da:ma;a.push(o.pos.x,o.pos.y,o.pos.z);
      if(showCurrent&&o.generation===g)ca.push(o.pos.x,o.pos.y,o.pos.z);
      if(includeGrowth&&o.parent){const p=nodeMap.get(o.parent);if(p&&p.generation<=g)edges.push(p.pos.x,p.pos.y,p.pos.z,o.pos.x,o.pos.y,o.pos.z)}
    }
  }
  if(ma.length)motherGroup.add(makePoints(ma,.052,0xb77bd0,.48));
  if(da.length)daughterGroup.add(makePoints(da,.10,0xffd36f,.98));
  if(ca.length)currentGroup.add(makePoints(ca,.115,0xffffff,.92));
  if(edges.length){const geo=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(edges,3));growthGroup.add(new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0x986cb8,transparent:true,opacity:.12,depthWrite:false})))}
  rebuildLocal(g);
}

function rebuildLocal(g){
  clearGroup(localGroup);
  for(const f of PACK.localFrames||[]){
    const a=vec(f.anchor),scale=+f.scale||1;
    const genByRef=new Map((f.points||[]).map(p=>[p.ref,nodeMap.get(p.nodeId)?.generation??999]));
    for(const sh of f.spatialModel?.shells||[]){
      const sg=genByRef.get(sh.ref)??999;if(sg>g)continue;
      const r=Math.max(.02,scale*(+sh.rNorm||0));
      const m=new THREE.Mesh(new THREE.SphereGeometry(r,22,14),new THREE.MeshBasicMaterial({color:0xc894ff,wireframe:true,transparent:true,opacity:sh.basis?.includes('FACT')?.34:.18,depthWrite:false}));
      m.position.copy(a);localGroup.add(m);
    }
    for(const p of f.points||[]){
      const pg=nodeMap.get(p.nodeId)?.generation??999;if(pg>g)continue;
      const role=p.semanticRole||'LOCAL_OBJECT',sp=p.spatialPresentation||{};
      const color=role==='CENTRAL_OBJECT'?0xffe083:role==='DISTURBANCE'?0xff9854:role==='STRUCTURE_ELEMENT'||role==='STRUCTURE_METRIC'?0xc894ff:0x6ee7ff;
      let size=role==='CENTRAL_OBJECT'?.18:role==='DISTURBANCE'?.12:.09;
      if(role==='DISTURBANCE'&&Number.isFinite(+sp.area))size=Math.min(.22,.08+Math.sqrt(Math.max(0,+sp.area))/90);
      const m=new THREE.Mesh(new THREE.SphereGeometry(size,12,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.98,depthWrite:false}));
      m.position.set(+p.world.x,+p.world.y,+p.world.z);localGroup.add(m);
    }
  }
}

function fitAll(){
  const pts=[...nodeMap.values()].map(o=>o.pos);if(!pts.length)return;
  const box=new THREE.Box3().setFromPoints(pts),s=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3()),d=Math.max(s.x,s.y,s.z)*1.08;
  controls.target.copy(c);camera.position.set(c.x+d*.56,c.y+d*.28,c.z+d);controls.update();
}
function focusDaughter(){
  const a=PACK.localFrames?.[0]?.anchor;if(!a)return;
  const p=vec(a),scale=+PACK.localFrames?.[0]?.scale||1;
  controls.target.copy(p);camera.position.set(p.x+scale*2.2,p.y+scale*.9,p.z+scale*2.6);controls.update();
}

function setHud(title,text){hud.querySelector('b').textContent=title;hud.querySelector('div').textContent=text}
function updateGateHud(g){
  const q=gateInfo(g);phaseEl.textContent=q.phase;genEl.textContent=`GEN ${g}`;bornEl.textContent=`born ${q.cumulative.toLocaleString()}`;daughterEl.textContent=`daughter +${q.daughter}`;
  setHud(`BIRTH · ${q.phase}`,`Mother +${q.mother.toLocaleString()} · Daughter +${q.daughter.toLocaleString()} · born now ${q.born.toLocaleString()}. Будущие узлы и локальная геометрия скрыты до собственного generation gate.`);
}

function enterBirth(){stop();mode='BIRTH';current=0;lastGate=-1;setActive('birth');activityGroup.visible=false;impulseGroup.visible=false;motherGroup.visible=daughterGroup.visible=currentGroup.visible=growthGroup.visible=localGroup.visible=true;configureTimeline();seekBirth(0)}
function birthFrames(){return PACK.hostBirthTrace?.structuralFrames||[]}
function seekBirth(i){const S=birthFrames();if(!S.length)return;current=Math.max(0,Math.min(S.length-1,i));const f=S[current];rebuildGate(+f.generation);updateGateHud(+f.generation);scrub.value=current;frameEl.textContent=`${current+1}/${S.length}`}
async function playBirth(){const S=birthFrames();if(!S.length)return;if(current>=S.length-1)current=0;playing=true;token++;const t=token;play.textContent='Ⅱ';const delay=Math.max(120,playSeconds()*1000/S.length);for(let i=current;i<S.length;i++){if(!playing||t!==token)return;seekBirth(i);await sleep(delay)}stop();setHud('BIRTH COMPLETE','Дочерний корабль и его локальная форма показаны только после их фактических generation gates. Финальный frozen body не менялся.')}

async function ensureImpulse(){
  if(IMPULSE)return IMPULSE;
  status.textContent='SETKA готовит birth-gated IMPULSE…';
  IMPULSE=await rpc('setka_visualization_impulse_v1',{p_packet_ref:packetRef});if(!IMPULSE?.ok)throw Error(IMPULSE?.state||'IMPULSE_FAILED');
  const verts=new Float32Array(IMPULSE.edges.length*6);
  for(let i=0;i<IMPULSE.edges.length;i++){const e=IMPULSE.edges[i],o=i*6;for(let k=0;k<6;k++)verts[o+k]=+e[k+4]}
  const geo=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(verts,3));geo.setDrawRange(0,0);
  impulseVisited=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xffd46f,transparent:true,opacity:.56,depthWrite:false}));impulseGroup.add(impulseVisited);
  impulseRunner=new THREE.Mesh(new THREE.SphereGeometry(.17,16,10),new THREE.MeshBasicMaterial({color:0xffffbf,transparent:true,opacity:1,depthWrite:false}));impulseGroup.add(impulseRunner);
  impulseCurrent=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.96,depthWrite:false}));impulseGroup.add(impulseCurrent);
  return IMPULSE;
}
function edgeAt(i){const e=IMPULSE?.edges?.[i];return e?{generation:+e[1],p:new THREE.Vector3(+e[4],+e[5],+e[6]),c:new THREE.Vector3(+e[7],+e[8],+e[9]),parent:e[10],child:e[11]}:null}
async function enterImpulse(){stop();mode='IMPULSE';setActive('impulse');activityGroup.visible=false;motherGroup.visible=daughterGroup.visible=currentGroup.visible=growthGroup.visible=localGroup.visible=true;impulseGroup.visible=true;await ensureImpulse();current=0;lastGate=-1;configureTimeline();seekImpulse(0)}
function seekImpulse(i){if(!IMPULSE?.edges?.length)return;current=Math.max(0,Math.min(IMPULSE.edges.length-1,i));const e=edgeAt(current);rebuildGate(e.generation,{showCurrent:false,includeGrowth:false});impulseVisited.geometry.setDrawRange(0,(current+1)*2);impulseRunner.position.copy(e.c);impulseCurrent.geometry.setFromPoints([e.p,e.c]);scrub.value=current;frameEl.textContent=`${current+1}/${IMPULSE.edges.length}`;phaseEl.textContent=`IMPULSE · GEN ${e.generation}`;genEl.textContent=`GEN ${e.generation}`;bornEl.textContent=`edge ${current+1}`;daughterEl.textContent=e.generation<(PACK.birthGate?.shipGeneration??999)?'daughter hidden':'daughter gate open';setHud(`IMPULSE · generation ${e.generation}`,`${e.parent} → ${e.child}. Сегмент — настоящий parent-growth edge. Будущие поколения, включая дочь, скрыты.`)}
async function playImpulse(){if(!IMPULSE)await ensureImpulse();const n=IMPULSE.edges.length;if(!n)return;if(current>=n-1)current=0;playing=true;token++;const t=token;play.textContent='Ⅱ';const dur=Math.max(1000,playSeconds()*1000),start=current,t0=performance.now();return new Promise(resolve=>{function step(now){if(!playing||t!==token){resolve();return}const q=Math.min(1,(now-t0)/dur),idx=Math.min(n-1,Math.floor(start+(n-1-start)*q));if(idx!==current)seekImpulse(idx);if(q>=1){stop();setHud('IMPULSE COMPLETE',`Пройдено ${n.toLocaleString()} реальных parent-growth edges. Исторический микропорядок внутри поколения не заявляется.`);resolve();return}requestAnimationFrame(step)}requestAnimationFrame(step)})}

function activityFrames(){return PACK.hostBirthTrace?.activityFrames||[]}
function enterActivity(){stop();mode='ACTIVITY';setActive('activity');impulseGroup.visible=false;motherGroup.visible=daughterGroup.visible=currentGroup.visible=growthGroup.visible=localGroup.visible=true;const max=Math.max(...[...nodeMap.values()].map(o=>o.generation));rebuildGate(max);buildActivity();current=0;configureTimeline();seekActivity(0)}
function buildActivity(){clearGroup(activityGroup);const A=activityFrames(),pts=A.filter(p=>Number.isFinite(+p.x)).map(vec);if(pts.length>1)activityGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x61e8ff,transparent:true,opacity:.58,depthWrite:false})));activityRunner=new THREE.Mesh(new THREE.SphereGeometry(.18,16,10),new THREE.MeshBasicMaterial({color:0xffef9a,transparent:true,opacity:1,depthWrite:false}));activityGroup.add(activityRunner);activityGroup.visible=true}
function seekActivity(i){const A=activityFrames();if(!A.length)return;current=Math.max(0,Math.min(A.length-1,i));const p=A[current];activityRunner.position.copy(vec(p));scrub.value=current;frameEl.textContent=`${current+1}/${A.length}`;phaseEl.textContent=`ACTIVITY · ${p.hostScope||'—'}`;genEl.textContent=`GEN ${p.generation??'—'}`;bornEl.textContent=`+${(Number(p.elapsedMs||0)/1000).toFixed(3)}s`;daughterEl.textContent=p.stageKind||'—';const silent=(PACK.hostBirthTrace?.silentIntervals||[]).find(s=>+s.toTraceOrd===+p.ord);setHud(`ACTIVITY · ${p.stageKind||'—'}`,`${p.label||p.entityRef||'—'}${silent?` · перед этим ${(+silent.durationMs/1000).toFixed(3)}s без записанной промежуточной spatial activity`:''}. Это записанная activity, не structural replay.`)}
async function playActivity(){const A=activityFrames();if(!A.length)return;if(current>=A.length-1)current=0;playing=true;token++;const t=token;play.textContent='Ⅱ';const delay=Math.max(140,playSeconds()*1000/A.length);for(let i=current;i<A.length;i++){if(!playing||t!==token)return;seekActivity(i);await sleep(delay)}stop()}

function enterFinal(){stop();mode='FINAL';setActive('final');impulseGroup.visible=false;activityGroup.visible=false;motherGroup.visible=daughterGroup.visible=currentGroup.visible=growthGroup.visible=localGroup.visible=true;const max=Math.max(...[...nodeMap.values()].map(o=>o.generation));lastGate=-1;rebuildGate(max,{showCurrent:false,includeGrowth:true});configureTimeline();phaseEl.textContent='FINAL FROZEN BODY';genEl.textContent=`GEN 0–${max}`;bornEl.textContent=`${SNAP.grownNodes.toLocaleString()} nodes`;daughterEl.textContent=`daughter ${daughterIds.size}`;setHud('FINAL FROZEN BODY','Полный нативный слепок после завершения рождения. Это тот же frozen body; causal режимы выше лишь скрывают будущее до его gate.')}

function configureTimeline(){let n=mode==='BIRTH'?birthFrames().length:mode==='IMPULSE'?(IMPULSE?.edges?.length||PACK.impulse?.edgeCount||0):mode==='ACTIVITY'?activityFrames().length:1;scrub.min=0;scrub.max=Math.max(0,n-1);scrub.step=1;scrub.value=Math.min(current,Math.max(0,n-1));frameEl.textContent=n?`${Math.min(current+1,n)}/${n}`:'—'}
function setActive(id){for(const x of['birth','impulse','activity','final'])$(x).classList.toggle('active',x===id)}
function playSeconds(){const n=Number(speed.value);return Number.isFinite(n)&&n>0?n:15}
function stop(){playing=false;token++;play.textContent='▶'}
async function togglePlay(){if(playing){stop();return}if(mode==='BIRTH')await playBirth();else if(mode==='IMPULSE')await playImpulse();else if(mode==='ACTIVITY')await playActivity()}

$('birth').onclick=enterBirth;
$('impulse').onclick=async()=>{try{await enterImpulse()}catch(e){status.textContent='IMPULSE failed · '+e.message}};
$('activity').onclick=enterActivity;
$('final').onclick=enterFinal;
$('focus').onclick=focusDaughter;
$('fit').onclick=fitAll;
$('auto').onclick=e=>{controls.autoRotate=!controls.autoRotate;e.currentTarget.classList.toggle('active',controls.autoRotate)};
play.onclick=togglePlay;
$('prev').onclick=()=>{stop();if(mode==='BIRTH')seekBirth(current-1);else if(mode==='IMPULSE')seekImpulse(current-1);else if(mode==='ACTIVITY')seekActivity(current-1)};
$('next').onclick=()=>{stop();if(mode==='BIRTH')seekBirth(current+1);else if(mode==='IMPULSE')seekImpulse(current+1);else if(mode==='ACTIVITY')seekActivity(current+1)};
scrub.oninput=()=>{stop();if(mode==='BIRTH')seekBirth(+scrub.value);else if(mode==='IMPULSE')seekImpulse(+scrub.value);else if(mode==='ACTIVITY')seekActivity(+scrub.value)};

async function load(){
  if(!packetRef)throw Error('packet parameter required');
  const t0=performance.now();
  PACK=await rpc('setka_visualization_packet_v1',{p_packet_ref:packetRef});if(!PACK?.ok)throw Error(PACK?.state||'PACKET_FAILED');
  SNAP=await rpc('setka_body_as_grown_frozen_snapshot_v1',{p_snapshot_ref:PACK.snapshotRef});if(!SNAP?.ok)throw Error(SNAP?.state||'SNAPSHOT_FAILED');
  setupNodes();fitAll();
  const gate=PACK.birthGate||{};
  status.textContent=`ready · ${Math.round(performance.now()-t0)} ms · ${PACK.packetRef}`;
  $('truth').textContent=gate.available?`${gate.protocol} · ${gate.impulseProtocol} · ship gate GEN ${gate.shipGeneration} · local center gate GEN ${gate.localCenterGeneration}`:'birth gate unavailable';
  loader.style.display='none';
  enterBirth();setTimeout(playBirth,180);
}

function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)}animate();
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
load().catch(e=>{console.error(e);status.textContent='load failed · '+e.message;loader.querySelector('span').textContent='Ошибка: '+e.message});
