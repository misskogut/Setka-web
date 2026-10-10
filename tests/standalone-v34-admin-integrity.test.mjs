import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=n=>readFileSync(new URL("../"+n,import.meta.url),"utf8");
test("all seven canonical base patterns always appear in admin catalog",()=>{
  const ui=read("standalone-admin-pattern-knowledge-v40.js");
  for(const id of ["tentacle-orbit","dandelion","fish-wave","breathing-fractal","breathing-fractal-growth","rgb-glitch-rings","stereo-dna"])assert.ok(ui.includes('"'+id+'"'));
  assert.match(ui,/\.\.\.CANONICAL_IDS/);
  assert.match(ui,/const viewed=\(Array\.isArray\(data\.observedConfigs\)/);
});
test("admin fail-closed for unimplemented mutations and unknown actions",()=>{
  const bridge=read("standalone-admin-bridge-v34b.js");
  assert.doesNotMatch(bridge,/action==="admin-reset-device"\|\|action==="admin-toggle-active"\) return response\(\{ok:true\}/);
  assert.match(bridge,/legacy_action_not_supported/);
  assert.match(bridge,/unknown_admin_action/);
  const ui=read("admin-v3.js");
  assert.match(ui,/Устройство не изменено:/);
  assert.match(ui,/Статус не изменён:/);
});
test("admin renders immutable note recipe instead of inferred configuration",()=>{
  const preview=read("standalone-admin-note-snapshot-fix-v34.js"),participant=read("standalone-admin-participants-v34.js");
  assert.match(preview,/item\?\.replaySnapshot\?\.patternId/);
  assert.match(preview,/config:replay\.config \|\| item\?\.config/);
  assert.match(preview,/frame:replay\.frame \?\?/);
  assert.match(participant,/config:x\.replaySnapshot\?\.config\|\|x\.config/);
  assert.match(participant,/replaySnapshot:x\.replaySnapshot\|\|null/);
});
test("privacy: backend transmits only aggregate stats, not user IDs or private recipes",()=>{
  const api=read("supabase/functions/setka-pattern-knowledge-v40/index.ts");
  assert.match(api,/if\(action==="admin-feed"\)/);
  assert.match(api,/adminAuth\(T\(b\.adminKey/);
  assert.match(api,/const observedConfigs=/);
  assert.match(api,/viewingAccounts:x\.viewers\.size/);
  assert.match(api,/saveAccounts/);
  assert.match(api,/observedTruncated/);
  assert.doesNotMatch(api,/observedConfigs\.map\([^\n]*testerId/);
});
test("production front does not mount isolated QA storage shim",()=>{
  const html=read("standalone-v34.html");
  assert.doesNotMatch(html,/setka-qa-v34-20261009:/);
  assert.doesNotMatch(html,/<script src="standalone-methodology-v34\.js/);
  assert.match(html,/standalone-advanced-v34\.js\?v=46-unified-front-admin-1/);
});

test("admin can retry after failed legacy network read, rather than keep rejected promise",()=>{
  const js=read("standalone-admin-bridge-v34b.js");
  const start=js.indexOf("  async function getAll(adminKey,force=false)");
  const end=js.indexOf("  function participant(d)",start);
  assert.ok(start>=0&&end>start);
  const body=js.slice(start,end);
  assert.match(body,/try\{return await loading\}finally\{loading=null\}/);
});
