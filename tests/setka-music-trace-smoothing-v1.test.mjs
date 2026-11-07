// Historical test path retained to keep existing release gates. The implementation
// is now 46 hand-authored master SVGs, not smoothing of decoded bitmap contours.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ICON_NAMES,iconSvg} from "../standalone-music-icons-v1.mjs";
import {OLD_MASTER} from "../standalone-music-master-old-v1.mjs";
import {VINTAGE_MASTER} from "../standalone-music-master-vintage-v1.mjs";
import {MASTER_DRAWINGS,MASTER_ICON_KEYS,masterMusicSVG} from "../standalone-music-master-icons-v1.mjs";
import {LEGACY_MUSIC_ICON_NAMES,legacyMusicSVG} from "../standalone-music-legacy-icons-v1.mjs";
import {VINTAGE_SOUND_ICON_KEYS,vintageSoundSVG} from "../standalone-music-vintage-icons-v2.mjs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("all 46 screenshot glyphs are individually authored master paths, not decoded screenshot polygons",()=>{
 assert.equal(LEGACY_MUSIC_ICON_NAMES.length,20);
 assert.equal(VINTAGE_SOUND_ICON_KEYS.length,26);
 assert.equal(MASTER_ICON_KEYS.length,46);
 assert.equal(ICON_NAMES.length,76,"all 30 stock glyphs plus 46 masters preserved");
 assert.equal(new Set(ICON_NAMES).size,76);
 assert.deepEqual(MASTER_ICON_KEYS,[...LEGACY_MUSIC_ICON_NAMES,...VINTAGE_SOUND_ICON_KEYS]);
 assert.deepEqual(Object.keys(OLD_MASTER),LEGACY_MUSIC_ICON_NAMES);
 assert.deepEqual(Object.keys(VINTAGE_MASTER),VINTAGE_SOUND_ICON_KEYS);
 const variants=new Set();
 for(const key of MASTER_ICON_KEYS){
  const svg=iconSvg(key);
  assert.equal(svg,masterMusicSVG(key),"main frontend and admin must use the same master SVG");
  assert.equal(svg,key.startsWith("old-")?legacyMusicSVG(key):vintageSoundSVG(key));
  assert.match(svg,/viewBox="0 0 100 100"/);
  assert.match(svg,/shape-rendering="geometricPrecision"/);
  assert.match(svg,/stroke-linecap="round" stroke-linejoin="round"/);
  assert.match(svg,/fill-rule="evenodd"/);
  assert.match(svg,/<(?:path|circle|ellipse|g)\b/,"actual SVG geometry required");
  assert.doesNotMatch(svg,/(?:NaN|undefined|Infinity|data:image|<image|<script|javascript:|MZ)/);
  assert.ok(MASTER_DRAWINGS[key].length>25,"hand authored source for "+key);
  variants.add(MASTER_DRAWINGS[key]);
 }
 assert.equal(variants.size,46,"not a repeat of generic symbol across IDs");
 for(const src of ["standalone-music-legacy-icons-v1.mjs","standalone-music-vintage-icons-v2.mjs"]){
  const body=read(src);
  assert.doesNotMatch(body,/smoothTracedIcon|RASTER_TRACES|DRAWINGS=|encoded\.split|pointSegmentDistance/,"no runtime traced coordinates");
 }
});

test("intentional fine icon geometry and negative space remain vector-clean",()=>{
 const organic=["old-cat","old-hamsa","old-bonfire","old-singing-bowl","old-seascape","old-forest",
  "old-storm","old-heart","old-candle","old-lotus","vintage-crescent","vintage-prayer-hands",
  "vintage-conch","vintage-sea-wave","vintage-moon-stars","vintage-whale","vintage-tree-droplet",
  "vintage-yin-waves","vintage-infinity","vintage-stingray"];
 for(const id of organic){
  assert.match(MASTER_DRAWINGS[id],/[CQ]/,"organic artwork needs intentionally authored curved paths: "+id);
 }
 for(const id of ["old-mandala","old-wheel-flowers","old-dharma-wheel","vintage-rolling-wheel",
  "vintage-sun-rays","vintage-four-petals"]){
  assert.match(MASTER_DRAWINGS[id],/transform="rotate|<circle/,"rotational ornament must be geometrically precise: "+id);
 }
 assert.match(MASTER_DRAWINGS["vintage-solid-circle"],/<circle[^>]+fill="currentColor"/);
 assert.match(MASTER_DRAWINGS["old-hamsa"],/M30 62C/,"hand center remains an almond eye");
 assert.match(MASTER_DRAWINGS["vintage-whale"],/M20 62C/,"whale keeps its distinct organic profile");
 assert.match(MASTER_DRAWINGS["old-cat"],/M26 78C/,"cat silhouette remains a sitting animal");
 assert.equal(masterMusicSVG("old-cat","music-icon active").includes('class="music-icon active"'),true);
 assert.equal(masterMusicSVG("missing"),null);
});

test("master artwork preserves existing track keys, admin deletion and no-asset migration",()=>{
 const common=read("standalone-music-icons-v1.mjs");
 const admin=read("research-v1/music-admin.mjs");
 const order=read("research-v1/music-order.mjs");
 const front=read("standalone-music-v1.mjs");
 assert.match(common,/LEGACY_MUSIC_ICON_NAMES/);
 assert.match(common,/VINTAGE_SOUND_ICON_KEYS/);
 assert.match(admin,/icon_key:selectedIconKey/);
 assert.match(admin,/iconSvg\(selectedIconKey\)/);
 assert.match(admin,/req\(hide\?"hide-icon":"restore-icon"/);
 assert.match(order,/iconSvg\(/);
 assert.match(front,/iconSvg\(/);
 assert.equal(iconSvg("music").includes('viewBox="0 0 128 128"'),true,"stock icon unchanged");
});
