import test from "node:test";
import assert from "node:assert/strict";
import {ICON_NAMES,iconSvg} from "../standalone-music-icons-v1.mjs";
import {smoothTracedIcon} from "../standalone-music-trace-smoothing-v1.mjs";
import {LEGACY_MUSIC_ICON_NAMES,legacyMusicSVG} from "../standalone-music-legacy-icons-v1.mjs";
import {VINTAGE_SOUND_ICON_KEYS,vintageSoundSVG} from "../standalone-music-vintage-icons-v2.mjs";

const ALPHABET="!#$%&()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{}~";
const encode=pts=>pts.map(([x,y])=>ALPHABET[x]+ALPHABET[y]).join("");
const path=svg=>svg.match(/<path d="([^"]+)"/)?.[1]||"";

test("all screenshot-traced glyphs use smooth vector curves, not 90-pixel staircase outlines",()=>{
 const keys=[...LEGACY_MUSIC_ICON_NAMES,...VINTAGE_SOUND_ICON_KEYS];
 assert.equal(keys.length,46,"20 original plus 26 unique screenshots");
 assert.equal(new Set(keys).size,keys.length);
 assert.equal(ICON_NAMES.length,76,"same 30 original icons plus 46 historical silhouettes");
 for(const key of keys){
  const svg=iconSvg(key),d=path(svg);
  assert.ok(d.includes("C"),key+" needs genuine smooth cubic vector curves");
  assert.match(svg,/shape-rendering="geometricPrecision"/,key);
  assert.match(svg,/fill-rule="evenodd"/,"the original interior holes must remain intact");
  assert.match(d,/^M\d/,"vector must start on the canvas");
  assert.doesNotMatch(d,/(?:NaN|Infinity|undefined|<script)/);
  assert.ok((d.match(/Z/g)||[]).length>=1,"every original contour remains closed");
  assert.ok((d.match(/C/g)||[]).length>=5,"not just a single decorative curve");
  assert.equal(svg,key.startsWith("old-")?legacyMusicSVG(key):vintageSoundSVG(key));
 }
});

test("smoothing removes pixel stepping while preserving intentional sharp corners and holes",()=>{
 const square=encode([[10,10],[40,10],[40,40],[10,40]]);
 const shape=smoothTracedIcon(square,ALPHABET);
 assert.doesNotMatch(shape,/C/,"actual 90-degree corners must not become blobs");
 assert.equal((shape.match(/L/g)||[]).length,4);
 const stairs=encode([[10,10],[11,10],[12,11],[13,11],[14,12],[15,12],[16,13],[17,13],[18,14],[19,14],[20,15],[20,20],[10,20]]);
 const out=smoothTracedIcon(stairs,ALPHABET);
 assert.ok(out.length>0);
 assert.ok((out.match(/[LC]/g)||[]).length<13,"long pixel staircase is simplified");
 assert.match(out,/L19 14/,"raster stair steps become a clean single diagonal edge");
 const hole=smoothTracedIcon(square+"|"+encode([[17,17],[25,17],[25,25],[17,25]]),ALPHABET);
 assert.equal((hole.match(/Z/g)||[]).length,2,"separate outer and inner boundaries");
});

test("smoother rejects non-vector input and keeps original system/categorical icons untouched",()=>{
 assert.throws(()=>smoothTracedIcon("test",ALPHABET),/invalid_icon_contour|invalid_icon_coordinate/);
 assert.throws(()=>smoothTracedIcon(encode([[1,1],[2,2],[3,3]])+"X",ALPHABET),/invalid_icon_contour/);
 for(const key of ["hand","eye","sleep","8d","orbits","music"]){
  const svg=iconSvg(key);
  assert.match(svg,/viewBox="0 0 128 128"/);
  assert.doesNotMatch(svg,/shape-rendering="geometricPrecision"/);
 }
});
