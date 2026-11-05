import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {UI_ICON_SLOTS,UI_ICON_IDS,uiIconHTML,assetIconMask,defaultIconSVG} from "../standalone-music-ui-icons-v2.mjs";
import {iconSvg} from "../standalone-music-icons-v1.mjs";
import {selectedMusicCategorySVG} from "../standalone-music-approved-icons-v1.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("all SETKA music system controls have a consistent white-line vector default",()=>{
 assert.equal(UI_ICON_IDS.length,14);
 assert.equal(new Set(UI_ICON_IDS).size,UI_ICON_IDS.length);
 for(const {id} of UI_ICON_SLOTS){
  assert.match(defaultIconSVG(id),/viewBox="0 0 24 24"/);
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
 const orbit=read("standalone-music-orbits-v1.mjs");
 assert.match(orbit,/uiIconHTML\("listener",uiIcons\)/);
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
