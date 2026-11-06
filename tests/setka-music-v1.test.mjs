import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SetkaMusicMixer,MOTION} from "../standalone-music-audio-v1.mjs";
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
 mixer.items.set("test",{id:"test",angle:0,radius:.6,anchorAngle:0,anchorRadius:.6,manual:false,
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
 assert.match(css,/\.sm-source\{[^}]*border:0;border-radius:0;background:transparent;[^}]*box-shadow:none\}/s);
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

test("volume dots are anchored below icons in the catalog and orbits",()=>{
 const ui=file("standalone-music-v1.mjs"),css=file("standalone-music-v1.css");
 assert.match(ui,/trackHTML\(track\)\+dots\(level\)\+'<\/span>'/);
 assert.match(css,/\.sm-track-icon\{position:relative;/);
 assert.match(css,/\.sm-track \.sm-dots\{top:calc\(100% \+ 6px\);bottom:auto\}/);
 assert.match(css,/\.sm-source \.sm-dots\{top:auto;bottom:-10px\}/);
});
