import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const load=(p)=>JSON.parse(readFileSync(new URL("../"+p,import.meta.url),"utf8"));
const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const base="https://github.com/misskogut/Setka-web/releases/download/setka-original-music-20261107/";

test("music failover contains only immutable, published, verified public assets",()=>{
 const snap=load("standalone-music-public-snapshot-v1.json");
 assert.equal(snap.format,"setka-public-music-static-fallback-v1");
 assert.ok(snap.tracks.length>0&&snap.tracks.length<=100);
 const ids=new Set();
 for(const t of snap.tracks){
  assert.match(t.id,/^[0-9a-f-]{36}$/);
  assert.ok(!ids.has(t.id));ids.add(t.id);
  assert.match(t.external_source_hash,/^[0-9a-f]{64}$/);
  assert.ok(Number.isSafeInteger(t.external_source_bytes)&&t.external_source_bytes>0);
  const ext=t.external_source_path.toLowerCase().endsWith(".mp3")?".mp3":".wav";
  assert.equal(t.audio_url,base+"setka-original-"+t.external_source_hash.slice(0,24)+ext);
  assert.equal(t.source,"github-release-verified");
  assert.ok(!Object.hasOwn(t,"external_audio_url"));
 }
 assert.ok(snap.global_order.track_ids.every(id=>ids.has(id)));
 assert.equal(snap.ui_icons.length,0); // no Supabase-only icon URLs in offline snapshot
});

test("community failover excludes personal data and unapproved content",()=>{
 const snap=load("standalone-community-public-snapshot-v1.json");
 const pub=load("standalone-catalog-public-snapshot-v1.json");
 const allowed=new Set(pub.items.map(p=>p.pattern_id));
 assert.equal(snap.format,"setka-public-community-static-fallback-v1");
 assert.equal(snap.feedScope,"registered_account_favorites_v41");
 assert.equal(snap.readOnly,true);
 assert.ok(snap.items.length>0&&snap.items.length<=300);
 const safeKeys=new Set(["id","pattern_id","patternId","config_key","config","preview_frame","saveCount","savesTotal","uniqueParticipants","useAccounts","useCount","sessionCount","totalDurationMs","created_at","updated_at","localOnly"]);
 for(const item of snap.items){
  assert.ok(allowed.has(item.patternId));
  assert.equal(item.pattern_id,item.patternId);
  assert.equal(item.config?.patternId,item.patternId);
  assert.ok(Number.isInteger(item.saveCount)&&item.saveCount>0);
  assert.equal(item.localOnly,false);
  assert.match(item.id,/^community-[0-9a-f]{24}$/);
  assert.ok(Object.keys(item).every(key=>safeKeys.has(key)));
 }
 assert.equal(snap.patternScenarios.length,0);
 assert.equal(snap.historicalPatterns.length,0);
});

test("public note snapshot contains only explicitly published, anonymous reader fields",()=>{
 const snap=load("standalone-community-public-notes-snapshot-v1.json");
 const pub=load("standalone-catalog-public-snapshot-v1.json");
 const allowed=new Set(pub.items.map(p=>p.pattern_id));
 assert.equal(snap.format,"setka-public-notes-static-fallback-v1");
 assert.equal(snap.readOnly,true);
 assert.ok(snap.items.length<=100);
 const safeKeys=new Set(["id","patternId","text","config","frame","createdAt","readOnly"]);
 for(const note of snap.items){
  assert.ok(allowed.has(note.patternId));
  assert.equal(note.config?.patternId,note.patternId);
  assert.equal(note.readOnly,true);
  assert.ok(Object.keys(note).every(key=>safeKeys.has(key)));
  assert.equal(typeof note.text,"string");
 }
});

test("live server remains primary and failover is read only and versioned",()=>{
 const com=read("standalone-community-cloud-v38.js");
 const music=read("standalone-music-v1.mjs");
 const mixer=read("standalone-music-audio-v1.mjs");
 const html=read("standalone-v34.html");
 assert.match(com,/if\(!items\.length\)await restorePublishedFeed\(\)/);
 assert.match(com,/snapshotActive=false;lastError=null/);
 assert.match(com,/restorePublishedNotes/);
 assert.match(com,/notesSnapshotActive/);
 assert.match(music,/if\(!d\)\{/);
 assert.match(music,/readPublishedMusicSnapshot\(\)/);
 assert.match(music,/if\(musicSnapshotActive\)return/);
 assert.match(mixer,/releaseDirect/);
 // The per-track source flag must be in function scope, including volume updates.
 assert.ok(mixer.indexOf("const releaseDirect=track.source") < mixer.indexOf("if(!state){"));
 assert.match(mixer,/__setkaNative/);
 assert.match(html,/standalone-music-v1\.mjs\?v=47-public-snapshot-20261115/);
 assert.match(html,/standalone-community-cloud-v38\.js\?v=1\.4\.14-public-snapshot-20261115/);
});
