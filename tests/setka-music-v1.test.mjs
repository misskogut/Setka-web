import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SetkaMusicMixer,MOTION,orbitDepthProfile} from "../standalone-music-audio-v1.mjs";
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
 mixer.ctx={currentTime:0};
 mixer.items.set("test",{id:"test",track:{loop:false},decks:[],angle:0,radius:.6,anchorAngle:0,anchorRadius:.6,manual:false,
  panner:{setPosition(x,y,z){pos.push([x,y,z])}}});
 mixer.motion("cw");mixer.started-=3;mixer.tick();
 assert.ok(mixer.items.get("test").angle>0,"clockwise advances from its existing anchor");
 mixer.motion("ccw");mixer.started-=3;mixer.tick();
 assert.ok(pos.length>0,"spatial panner updated");
 mixer.drag("test",Math.PI/2,.35);
 assert.equal(mixer.items.get("test").manual,true);
 assert.equal(mixer.items.get("test").radius,.35);
 mixer.motion("breath");assert.equal(mixer.items.get("test").manual,false);
 mixer.started-=3;mixer.tick();
 assert.ok(mixer.items.get("test").radius>=.33);
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
 const near=orbitDepthProfile(.22),middle=orbitDepthProfile(.62),far=orbitDepthProfile(.94);
 assert.ok(near.distance<middle.distance&&middle.distance<far.distance,"orbit radius increases real audio distance");
 assert.ok(near.directAttenuation>middle.directAttenuation&&middle.directAttenuation>far.directAttenuation,
  "dry sound still recedes naturally");
 for(const profile of [near,middle,far]){
  assert.ok(profile.roomSend<=1,"room send remains bounded and cannot overload on the outer ring");
  assert.ok(Math.abs(profile.roomSend*profile.directAttenuation-profile.originalRoomLevel)<1e-7,
   "post-HRTF reflections must recover their intended distance response");
 }
 assert.ok(far.originalRoomLevel>middle.originalRoomLevel&&middle.originalRoomLevel>near.originalRoomLevel,
  "ambient reflections grow with distance, not just dry volume falling");
 const brokenFarSend=.008+.105*Math.pow(far.depth,1.3);
 assert.ok(far.roomSend*far.directAttenuation>brokenFarSend*far.directAttenuation*6,
  "far reflections no longer suffer their former ~7x regression");
 assert.ok(Math.abs(far.originalRoomLevel-.202)<1e-6,"restores original far-room target without altering uploaded audio");
 // Test the actual mixer wiring with the same far profile (not just the helper).
 const send=[],pos=[],mixer=new SetkaMusicMixer();
 mixer.ctx={currentTime:3};
 const state={manual:true,panner:{setPosition(...xyz){pos.push(xyz)}},
  rearFilter:{gain:{value:0}},roomSend:{gain:{setTargetAtTime(v){send.push(v)}}}};
 mixer.position(state,Math.PI/3,.94);
 assert.equal(send.length,1);
 assert.ok(Math.abs(send[0]-far.roomSend)<1e-7,"live room-send gain follows compensated DSP profile");
 assert.ok(Math.abs(Math.hypot(pos[0][0],pos[0][2])-far.distance)<1e-7,
  "HRTF distance matches the same visual radius");
});
