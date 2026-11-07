import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SetkaMusicMixer,MOTION,orbitDepthProfile,orbitEarlyReflectionProfile,createOrbitEarlyReflections,ORBIT_RADIUS_MIN,ORBIT_RADIUS_MAX,clampOrbitRadius} from "../standalone-music-audio-v1.mjs";
import {ICONS,iconSvg} from "../standalone-music-icons-v1.mjs";
const root=new URL("../",import.meta.url);
const file=name=>readFileSync(new URL(name,root),"utf8");
test("music is mounted additively, without replacing pattern renderer or bottom nav",()=>{
 const html=file("standalone-v34.html");
 assert.match(html,/standalone-music-v1\.mjs/);
 assert.doesNotMatch(file("standalone-music-v1.mjs"),/get\("music"\)!=="1"/,"music must no longer be gated behind URL query params");
 assert.match(html,/id="setkaMusicPagerButton"/,"music note must exist in static HTML before JS loads");
 assert.match(html,/standalone-music-v1\.css/);
 assert.match(html,/id="allPatternsPanel"/);
 assert.match(html,/id="librarySwipeArea"/);
 assert.match(html,/id="gameScreen"/);
 assert.match(html,/id="favoritesPagerButton"/);
 assert.match(html,/standalone-pattern-registry-v1\.js/);
});
test("current research admin includes music route, not a separate unauthenticated admin",()=>{
 const html=file("standalone-research-admin-v1.html"),js=file("research-v1/app.mjs");
 assert.match(html,/data-page="music"/);
 assert.match(js,/mountMusicAdmin\(\$\('content'\),\(\)=>adminKey\)/);
 assert.match(js,/await api\('check'\)/);
});
test("shared vector icons are SVG and never executable user content",()=>{
 for(const id of ["hand","eye","sleep","8d","orbits","cat","bird","wind","rain","chime","lotus"]){
  assert.ok(ICONS[id],id);
  assert.match(iconSvg(id),/viewBox="0 0 128 128"/);
 }
 assert.equal(iconSvg('onload="alert(1)').includes("onload"),false);
});
test("orbit presets are eight explicit, independent trajectories",()=>{
 assert.deepEqual(MOTION,["static","cw","ccw","counter","eight","chaos","spiral","breath"]);
 const mixer=new SetkaMusicMixer();
 assert.equal(mixer.omega()>0,true);
 mixer.speed=0;const slow=mixer.omega();mixer.speed=100;assert.ok(mixer.omega()>slow*30);
 const pos=[];
 mixer.ctx={currentTime:0};mixer.scheduleFrame=()=>{};
 mixer.items.set("test",{id:"test",track:{loop:false},decks:[],angle:0,radius:.6,anchorAngle:0,anchorRadius:.6,manual:false,motionIndex:0,
  panner:{setPosition(x,y,z){pos.push([x,y,z])}}});
 mixer.motion("cw");mixer.tick(mixer.started+3);
 assert.ok(mixer.items.get("test").angle>0,"clockwise advances from its existing anchor");
 mixer.motion("ccw");mixer.tick(mixer.started+3);
 assert.ok(pos.length>0,"spatial panner updated");
 mixer.drag("test",Math.PI/2,.35);mixer.tick();
 assert.equal(mixer.items.get("test").manual,true);
 assert.equal(mixer.items.get("test").radius,ORBIT_RADIUS_MIN);
 mixer.motion("breath");assert.equal(mixer.items.get("test").manual,false);
 mixer.tick(mixer.started+3);
 assert.ok(mixer.items.get("test").radius>=.33);
});
test("source centers, manual positions and automatic motion share ring boundaries",()=>{
 const css=file("standalone-music-v1.css");
 assert.ok(css.includes(".sm-ring-inner{width:38%;height:38%}"));
 assert.ok(css.includes(".sm-ring-outer{width:96%;height:96%}"));
 assert.equal(ORBIT_RADIUS_MIN,.38);
 assert.equal(ORBIT_RADIUS_MAX,.96);
 for(const r of [-100,0,.22,.37,.38,.68,.96,1,100,NaN]){
  const value=clampOrbitRadius(r);
  assert.ok(value>=ORBIT_RADIUS_MIN&&value<=ORBIT_RADIUS_MAX);
 }
 const positions=[],mixer=new SetkaMusicMixer();mixer.ctx={currentTime:0};mixer.scheduleFrame=()=>{};
 const s={id:"annulus",angle:0,radius:.62,anchorAngle:0,anchorRadius:.62,
  manual:false,motionIndex:0,track:{loop:false},decks:[],panner:{setPosition(x,y,z){positions.push([x,y,z])}}};
 mixer.items.set(s.id,s);
 mixer.drag(s.id,Math.PI/2,0);mixer.tick();
 assert.equal(s.radius,ORBIT_RADIUS_MIN,"finger on listener cannot move icon center inside inner circle");
 assert.equal(s.anchorRadius,ORBIT_RADIUS_MIN);
 assert.ok(Math.abs(positions.at(-1)[0]-orbitDepthProfile(ORBIT_RADIUS_MIN).distance)<1e-8);
 mixer.drag(s.id,-Math.PI/2,20);mixer.tick();
 assert.equal(s.radius,ORBIT_RADIUS_MAX,"finger outside the stage cannot move icon center beyond outer circle");
 assert.equal(s.anchorRadius,ORBIT_RADIUS_MAX);
 assert.ok(Math.abs(positions.at(-1)[0]+orbitDepthProfile(ORBIT_RADIUS_MAX).distance)<1e-8);
 assert.ok(Math.abs(orbitDepthProfile(ORBIT_RADIUS_MIN).distance-2.05)<1e-8);
 assert.ok(Math.abs(orbitDepthProfile(ORBIT_RADIUS_MAX).distance-9.30)<1e-8);
 for(const mode of ["cw","ccw","counter","breath","spiral","eight","chaos"]){
  s.angle=0;s.radius=.62;s.anchorAngle=0;s.anchorRadius=.62;s.manual=false;
  mixer.mode=mode;mixer.started=performance.now()/1000-12.4;mixer.tick();
  assert.ok(s.radius>=ORBIT_RADIUS_MIN&&s.radius<=ORBIT_RADIUS_MAX,mode+" exceeds visual rings");
  assert.ok(Number.isFinite(s.angle));
 }
});

test("off has no dots: dots render only with active > 0 level",()=>{
 const ui=file("standalone-music-v1.mjs");
 assert.match(ui,/return level\?'<span class="sm-dots"/);
 assert.match(ui,/old===3\?0:old\+1/);
 assert.match(ui,/power\.onclick/);
});
test("orbit source has no disc and stage expands without flattening rings",()=>{
 const css=file("standalone-music-v1.css");
 assert.match(css,/\.sm-source\{[^}]*border:0;border-radius:0;background:transparent;[^}]*box-shadow:none;/s);
 assert.match(css,/\.sm-ring-outer\{width:96%;height:96%\}/);
 assert.match(css,/width:min\(93vw,43svh,375px,calc\(100svh - var\(--safe-top\) - var\(--safe-bottom\) - 441px\)\)/);
 assert.match(css,/width:min\(83vw,36svh,315px,calc\(100svh - var\(--safe-top\) - var\(--safe-bottom\) - 408px\)\)/);
});
test("server uses checked admin key and does not expose service role to public clients",()=>{
 const edge=file("supabase/functions/setka-music-v1/index.ts");
 assert.match(edge,/if\(!await authorized\(b\?\.adminKey\)\)/);
 assert.match(edge,/get\("SUPABASE_SERVICE_ROLE_KEY"\)/);
 assert.doesNotMatch(file("research-v1/music-admin.mjs"),/SUPABASE_SERVICE_ROLE_KEY|service_role/);
 assert.match(edge,/action==="upload-intent"/);
 assert.match(edge,/action==="save-track"/);
});

test("volume dots are centered above their own sound icons and match their glow",()=>{
 const ui=file("standalone-music-v1.mjs"),orbit=file("standalone-music-orbits-reference-20261106.mjs"),css=file("standalone-music-v1.css");
 assert.match(ui,/trackHTML\(track\)\+dots\(level\)\+'<\/span>'/);
 assert.match(orbit,/trackHTML\(s\.track\)\+'<span class="sm-dots"/,"orbit dots share the source-icon anchor");
 assert.match(css,/\.sm-track-icon\{position:relative;/);
 assert.match(css,/\.sm-source-icon\{position:relative\}/);
 assert.match(css,/\.sm-dots\{position:absolute;top:auto;bottom:calc\(100% \+ 6px\);/);
 assert.match(css,/\.sm-dots i\{[^}]*background:currentColor;box-shadow:none\}/,"no extra glow only for the dots");
 assert.match(css,/#libraryScreen\.setka-music-open #setkaMusicPagerButton\{opacity:1!important;filter:none!important\}/);
 assert.match(css,/#libraryScreen #setkaMusicPagerButton\.active svg,[^{]*\{filter:none!important\}/,"note has no second glow");
});

test("near-to-far spatial reverb survives post-HRTF distance attenuation",()=>{
 const near=orbitDepthProfile(ORBIT_RADIUS_MIN),middle=orbitDepthProfile(.62),far=orbitDepthProfile(ORBIT_RADIUS_MAX);
 assert.ok(near.distance<middle.distance&&middle.distance<far.distance,"orbit radius increases real audio distance");
 assert.ok(near.directAttenuation>middle.directAttenuation&&middle.directAttenuation>far.directAttenuation,
  "dry sound still recedes naturally");
 for(const profile of [near,middle,far]){
  assert.ok(profile.roomSend<=1,"room send remains bounded and cannot overload on the outer ring");
  assert.ok(Math.abs(profile.roomSend-profile.originalRoomLevel)<1e-7,
   "diffuse room must be tapped before Panner attenuation without extra compensation");
 }
 assert.ok(far.originalRoomLevel>middle.originalRoomLevel&&middle.originalRoomLevel>near.originalRoomLevel,
  "ambient reflections grow with distance, not just dry volume falling");
 const brokenFarSend=.008+.105*Math.pow(far.depth,1.3);
 assert.ok(far.roomSend>brokenFarSend*far.directAttenuation*6,
  "far reflections are no longer doubly attenuated by the dry HRTF panner");
 assert.ok(Math.abs(far.originalRoomLevel-.202)<1e-6,"restores original far-room target without altering uploaded audio");
 // Test the actual mixer wiring with the same far profile (not just the helper).
 const send=[],pos=[],mixer=new SetkaMusicMixer();
 mixer.ctx={currentTime:3};
 const state={manual:true,panner:{setPosition(...xyz){pos.push(xyz)}},
  rearFilter:{gain:{value:0}},roomSend:{gain:{setTargetAtTime(v){send.push(v)}}}};
 mixer.position(state,Math.PI/3,ORBIT_RADIUS_MAX);
 assert.equal(send.length,1);
 assert.ok(Math.abs(send[0]-far.roomSend)<1e-7,"live diffuse room-send gain follows pre-HRTF target");
 assert.ok(Math.abs(Math.hypot(pos[0][0],pos[0][2])-far.distance)<1e-7,
  "HRTF distance matches the same visual radius");
});

test("true wall-image reflections arrive from different directions and change naturally with radius",()=>{
 const near=orbitEarlyReflectionProfile(Math.PI/3,.22);
 const far=orbitEarlyReflectionProfile(Math.PI/3,.88);
 assert.equal(near.length,2,"two controlled first-order reflection paths");
 assert.equal(far.length,2);
 for(const paths of [near,far]){
  assert.ok(paths[0].x<0&&paths[1].x>0,"left/right walls have different HRTF directions");
  assert.ok(paths.every(p=>p.delay>=.009&&p.delay<=.11),"acoustic delays are bounded");
  assert.ok(paths.every(p=>p.gain>0&&p.gain<=.16),"reflections cannot overpower dry audio");
  assert.ok(paths.every(p=>p.cutoff>=3900&&p.cutoff<=9000),"wall paths absorb highs without filtering the original dry sound");
  assert.ok(paths.every(p=>Number.isFinite(p.pathLength)),"no NaN at the listener");
 }
 assert.ok(far[0].gain>near[0].gain&&far[1].gain>near[1].gain,
  "distant sound has more reflected room energy");
 assert.notEqual(near[0].delay,near[1].delay,"asymmetric source gives physically different path delays");
 const front=orbitEarlyReflectionProfile(0,.62),rear=orbitEarlyReflectionProfile(Math.PI,.62);
 assert.ok(front[0].z<0&&rear[0].z>0,"front and rear reflections preserve head orientation");
 for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
  const reflect=orbitEarlyReflectionProfile(a,0);
  assert.ok(reflect.every(p=>Number.isFinite(p.gain)&&Number.isFinite(p.delay)),"central crossing remains finite");
 }
});
test("wall reflections use individual spatialized WebAudio paths; late room is separate",()=>{
 const nodes=[];
 function node(kind){
  const n={kind,connections:[],disconnects:0,
   connect(other){this.connections.push(other);return other},
   disconnect(){this.disconnects++},
   gain:{value:0},frequency:{value:0},Q:{value:0},delayTime:{value:0},
   panningModel:"",distanceModel:""};
  nodes.push(n);return n;
 }
 const input=node("dry-filter"),master=node("master");
 const ctx={createDelay:()=>node("delay"),createBiquadFilter:()=>node("filter"),
  createGain:()=>node("gain"),createPanner:()=>node("panner")};
 const reflections=createOrbitEarlyReflections(ctx,input,master);
 assert.equal(reflections.length,2);
 assert.equal(input.connections.length,2,"both walls branch before direct HRTF");
 for(const path of reflections){
  assert.equal(path.panner.panningModel,"HRTF");
  assert.equal(path.panner.distanceModel,"linear");
  assert.equal(path.panner.rolloffFactor,0,"reflection gain is controlled once");
  assert.ok(input.connections.includes(path.filter));
  assert.ok(path.filter.connections.includes(path.gain));
  assert.ok(path.gain.connections.includes(path.panner));
  assert.ok(path.panner.connections.includes(path.delay));
  assert.ok(path.delay.connections.includes(master));
 }
 const extra=createOrbitEarlyReflections(ctx,input,master,"equalpower");
 assert.ok(extra.every(p=>p.panner.panningModel==="equalpower"),"lower-cost overflow is supported on mobile");
 const failed=createOrbitEarlyReflections({createDelay(){throw Error("unsupported")}},input,master);
 assert.deepEqual(failed,[],"graceful fallback retains direct HRTF without effects");
});
