import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const original=JSON.parse(read("docs/SETKA_MUSIC_YANDEX_MANIFEST_20261107.json"));
const release=JSON.parse(read("docs/SETKA_MUSIC_GITHUB_ASSETS_20261107.json"));

test("all 28 original WAV/MP3 files have immutable GitHub Release asset names and checksums",()=>{
 assert.equal(original.tracks.length,27,"27 imports plus the pre-existing Mur");
 assert.equal(release.files.length,28);
 assert.equal(new Set(release.files.map(t=>t.path)).size,28);
 assert.equal(new Set(release.files.map(t=>t.asset_name)).size,28);
 assert.equal(release.files.reduce((n,t)=>n+t.bytes,0),2687247923);
 assert.equal(release.release_tag,"setka-original-music-20261107");
 for(const t of release.files){
  assert.match(t.path,/^\/(?:8D|актив|пассив|звуки природы)\/.+\.(?:wav|mp3)$/i);
  assert.match(t.sha256,/^[a-f0-9]{64}$/);
  assert.equal(t.asset_name,"setka-original-"+t.sha256.slice(0,24)+"."+t.path.split(".").pop().toLowerCase());
  assert.ok(t.bytes>0&&t.bytes<2*1024*1024*1024);
 }
 assert.deepEqual(release.files.filter(t=>t.existing_local).map(t=>t.title),["Мур"]);
 assert.equal(release.files.filter(t=>t.path.endsWith(".mp3")).length,1);
});

test("SETKA streams unmodified original GitHub Release bytes, not Yandex CDN",()=>{
 const edge=read("supabase/functions/setka-music-v1/index.ts");
 assert.match(edge,/const GITHUB_AUDIO_RELEASE="https:\/\/github\.com\/misskogut\/Setka-web\/releases\/download\/setka-original-music-20261107\/"/);
 assert.match(edge,/const githubOriginalAsset=track=>/);
 assert.match(edge,/const musicReleaseAssets=async\(\)=>/);
 assert.match(edge,/const isOnGitHub=\(t,assets\)=>/);
 assert.match(edge,/if\(!manage&&availableAssets\)tracks=tracks\.filter/,"unavailable originals hidden from listener until uploaded");
 assert.match(edge,/external_source_hash/);
 assert.match(edge,/external_source_bytes/);
 assert.match(edge,/const segmentSize=2\*1024\*1024/);
 assert.match(edge,/audio_github_release_unavailable/);
 assert.match(edge,/"content-range":/);
 assert.match(edge,/"x-setka-audio-origin":"github-release"/);
 assert.doesNotMatch(edge,/cloud-api\.yandex|downloader\.disk\.yandex|YANDEX_SOURCE|refreshExternalAudio/,
   "no Yandex streaming in published backend");
 assert.doesNotMatch(edge,/\bffmpeg\b|decodeAudioData|createBufferSource|new OfflineAudioContext/i);
 const mixer=read("standalone-music-audio-v1.mjs");
 assert.match(mixer,/el\.crossOrigin="anonymous"/);
 assert.match(mixer,/el\.src=track\.audio_url/);
});
