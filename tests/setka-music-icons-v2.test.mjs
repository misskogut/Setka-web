import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {UI_ICON_SLOTS,UI_ICON_IDS,uiIconHTML,assetIconMask,defaultIconSVG} from "../standalone-music-ui-icons-v2.mjs";
import {ICON_NAMES,iconSvg} from "../standalone-music-icons-v1.mjs";
import {LEGACY_MUSIC_ICON_NAMES,legacyMusicSVG} from "../standalone-music-legacy-icons-v1.mjs";
import {VINTAGE_SOUND_ICON_KEYS,vintageSoundSVG} from "../standalone-music-vintage-icons-v2.mjs";
import {selectedMusicCategorySVG} from "../standalone-music-approved-icons-v1.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("all SETKA music system controls have a consistent white-line vector default",()=>{
 assert.equal(UI_ICON_IDS.length,14);
 assert.equal(new Set(UI_ICON_IDS).size,UI_ICON_IDS.length);
 for(const {id} of UI_ICON_SLOTS){
  assert.match(defaultIconSVG(id),/viewBox="(?:0 0 24 24|25 46 212 116|9 22 222 153)"/,"approved speed glyphs retain their own optical viewBox");
  assert.match(uiIconHTML(id),/(?:stroke|fill)="currentColor"/);
 }
 for(const id of ["hand","eye","sleep","8d"]){
  assert.match(iconSvg(id),/viewBox="0 0 128 128"/);
 }
});
test("custom art is sanitized to a fixed same-origin storage path and alpha mask",()=>{
 const path="icons/00000000-0000-4000-8000-000000000999.png";
 assert.match(assetIconMask(path),/sm-asset-icon/);
 assert.match(uiIconHTML("motion-cw",{"motion-cw":path}),/setka-music\/icons/);
 assert.ok(!assetIconMask('icons/00000000-0000-4000-8000-000000000999.svg<script>'));
 assert.ok(!assetIconMask('https://evil.example/icon.png'));
 assert.ok(!uiIconHTML("nav-note",{"nav-note":"icons/00000000-0000-4000-8000-000000000999.svg"}).includes("sm-asset-icon"),"UI override rejects SVG, uses safe stock glyph");
});
test("site masks user art instead of baking-in glow or a background",()=>{
 const css=read("standalone-music-v1.css");
 assert.match(css,/\.sm-asset-icon\{/);
 assert.match(css,/mask-image:var\(--sm-icon-image\)/);
 assert.match(css,/background-color:currentColor/);
 assert.match(css,/#libraryScreen\.setka-music-open #libraryTitle\{visibility:hidden/);
 const front=read("standalone-music-v1.mjs");
 assert.match(front,/assetIconMask\(track\.icon_path\)/);
 assert.match(front,/assetIconMask\(c\.icon_path\)/);
 assert.match(front,/uiIconHTML\("orbit-tab",uiIcons\)/);
 assert.match(front,/uiIconHTML\("power",uiIcons\)/);
 const orbit=read("standalone-music-orbits-reference-20261106.mjs");
 assert.match(orbit,/sm-lotus-portrait/,"approved central listener portrait is retained");
 assert.match(orbit,/uiIconHTML\("motion-"\+mode,uiIcons\)/);
});
test("admin provides explicit uploading/reset, server protects fixed slots",()=>{
 const admin=read("research-v1/music-admin.mjs"),api=read("supabase/functions/setka-music-v1/index.ts");
 assert.match(admin,/validateInterfaceImage/);
 assert.match(admin,/save-ui-icon/);
 assert.match(admin,/reset-ui-icon/);
 assert.match(api,/UI_SLOTS/);
 assert.match(api,/ui_icons:/);
 assert.match(api,/if\(!await authorized\(b\?\.adminKey\)\)/);
 assert.match(api,/iconFile\(path\)/);
 const sql=read("supabase/migrations/20261105191507_setka_music_ui_icons_v2_20261105.sql");
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all/);
});

test("closed-eye endpoints align vertically with open-eye corners (without moving the button)",()=>{
 const view=id=>selectedMusicCategorySVG(id).match(/viewBox="([^"]+)"/)[1].split(" ").map(Number);
 const eye=view("eye"),sleep=view("sleep");
 // First-row eye: corner at y=69. Closed eye: left/right tips at y=32.
 const openY=(69-eye[1])/eye[3];
 const closedY=(32-sleep[1])/sleep[3];
 assert.ok(Math.abs(openY-closedY)<.02,
   "closed-eye tip must sit on same row as eye corner; open="+openY+" closed="+closedY);
 const front=read("standalone-music-v1.mjs");
 assert.match(front,/assetIconMask\(c\.icon_path\)\|\|selectedMusicCategorySVG\(c\.id\)/);
});

test("nature category uses user's exact option 7: five bars and two leaves",()=>{
 const nature=selectedMusicCategorySVG("hand");
 assert.match(nature,/viewBox="54 14 232 232"/,"keep nature option 7 optically 18% smaller without changing artwork");
 const firstRowNeighbor=selectedMusicCategorySVG("eye");
 assert.match(firstRowNeighbor,/viewBox="-0.5 -20.5 176 176"/,"other category shapes remain unchanged");
 assert.match(nature,/M169,55 166,57/,"long central sound bar");
 assert.match(nature,/M86,113 84,122/,"left leaf");
 assert.match(nature,/M253,113 240,125/,"right leaf");
 assert.equal((nature.match(/Z/g)||[]).length,9,"five bars plus two leaf outlines with interiors");
 assert.match(nature,/fill="currentColor"/,"active and inactive states inherit white or gray");
 const fallback=read("standalone-music-v1.mjs");
 assert.match(fallback,/assetIconMask\(c\.icon_path\)\|\|selectedMusicCategorySVG\(c\.id\)/,
   "admin uploaded icon must remain higher priority than the built-in nature icon");
 const admin=read("research-v1/music-admin.mjs");
 assert.match(admin,/selectedMusicCategorySVG\(c\.id\|\|"hand"\)/,
   "the same option 7 is used in admin category previews");
});

test("all twenty old-app music symbols are clean authored vector masters, not replacements for tabs",()=>{
 const names=["old-cat","old-mandala","old-hamsa","old-wheel-flowers",
  "old-bonfire","old-singing-bowl","old-seascape","old-mala",
  "old-forest","old-triple-drop","old-planet-orbit","old-sound-bowl",
  "old-storm","old-spark","old-meditation-sun","old-dharma-wheel",
  "old-heart","old-endless-knot","old-candle","old-lotus"];
 assert.deepEqual(LEGACY_MUSIC_ICON_NAMES,names,"screenshot rows 2–6 are preserved in reading order");
 assert.equal(LEGACY_MUSIC_ICON_NAMES.length,20);
 assert.equal(new Set(ICON_NAMES).size,ICON_NAMES.length,"never duplicate existing icon keys");
 for(const id of names){
  assert.ok(ICON_NAMES.includes(id),"new screenshot icon must be selectable in track gallery: "+id);
  const svg=iconSvg(id);
  assert.match(svg,/viewBox="0 0 100 100"/);
  assert.match(svg,/fill-rule="evenodd"/,"contour holes must remain open");
  assert.match(svg,/stroke="currentColor"/);
  assert.match(svg,/<(?:path|circle|ellipse)\b/,"master consists of intentional vector geometry");
  assert.equal(svg,legacyMusicSVG(id));
 }
 assert.notEqual(iconSvg("old-cat"),iconSvg("cat"),"preserve existing icon while adding exact old glyph");
 for(const id of ["hand","eye","sleep","8d","orbits"]){
  assert.ok(!LEGACY_MUSIC_ICON_NAMES.includes(id),"old top tabs aren't re-added to track collection");
 }
 assert.match(iconSvg("onload='alert(1)"),/viewBox="0 0 128 128"/,"unknown key uses safe fallback");
});

test("26 unique sound glyphs from newer screenshots extend 20 old app glyphs without duplicates",()=>{
 assert.equal(VINTAGE_SOUND_ICON_KEYS.length,26);
 assert.equal(ICON_NAMES.length,76,"30 stock + 20 first screenshot + 26 uniquely new icons");
 assert.equal(new Set(ICON_NAMES).size,ICON_NAMES.length);
 const old=new Set(LEGACY_MUSIC_ICON_NAMES);
 for(const key of VINTAGE_SOUND_ICON_KEYS){
  assert.ok(!old.has(key),"legacy duplicate key was re-added: "+key);
  assert.match(iconSvg(key),/viewBox="0 0 100 100"/);
  assert.match(iconSvg(key),/fill-rule="evenodd"/);
  assert.equal(iconSvg(key),vintageSoundSVG(key));
 }
 for(const key of ["hand","eye","sleep","8d","orbits"]){
  assert.ok(!VINTAGE_SOUND_ICON_KEYS.includes(key),"category tab isn't duplicated");
 }
});
test("music admin supports persistent soft delete and restore without rewriting existing tracks",()=>{
 const editor=read("research-v1/music-admin.mjs");
 const edge=read("supabase/functions/setka-music-v1/index.ts");
 const sql=read("supabase/migrations/20261107002549_setka_music_hidden_icon_library_v1.sql");
 assert.match(editor,/req\(hide\?"hide-icon":"restore-icon"/);
 assert.match(editor,/const fresh=await req\("manage"\)/);
 assert.match(editor,/model\.hidden_icon_keys/);
 assert.match(editor,/if\(hiddenSet\.has\(name\)\)continue/);
 assert.match(editor,/Восстановить значок/);
 assert.match(edge,/hiddenIcons=manage\?await rowQuery/);
 assert.match(edge,/b\.action==="hide-icon"\|\|b\.action==="restore-icon"/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all.*anon, authenticated/);
 assert.doesNotMatch(edge,/setka_music_tracks_v1","DELETE".*hide-icon/s,"icon removal must never delete tracks");
});
