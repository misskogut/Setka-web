import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const manifest=JSON.parse(read("docs/SETKA_MUSIC_YANDEX_MANIFEST_20261107.json"));
test("SETKA Yandex import contains every unique original audio track in four requested types",()=>{
 assert.equal(manifest.source,"https://disk.yandex.ru/d/gmjwIQoHo6VxtQ");
 assert.equal(manifest.tracks.length,27,"27 new audio sources, existing Mur retained");
 assert.equal(new Set(manifest.tracks.map(t=>t.path)).size,27);
 const expected={"8d":7,"eye":5,"sleep":4,"hand":11},counts={};
 for(const t of manifest.tracks){
  assert.ok(/^\/(8D|актив|пассив|звуки природы)\/.+\.(wav|mp3)$/i.test(t.path),t.path);
  assert.ok(t.bytes>0&&Number.isSafeInteger(t.bytes),"retain exact original file byte count");
  assert.match(t.sha256,/^[a-f0-9]{64}$/i,"original Yandex SHA-256");
  assert.match(t.icon_key,/^[a-z0-9_-]+$/);
  counts[t.category]=(counts[t.category]||0)+1;
 }
 assert.deepEqual(counts,expected);
 assert.equal(manifest.tracks.filter(t=>t.path.endsWith(".mp3")).length,1);
 assert.equal(manifest.tracks.filter(t=>t.path.endsWith(".wav")).length,26);
 assert.equal(manifest.tracks.some(t=>/мурр\(уже есть\)/i.test(t.path)),false,"do not duplicate already uploaded Mur");
 assert.doesNotMatch(JSON.stringify(manifest),/downloader\.disk\.yandex\.ru|service_role|adminKey/,"do not commit ephemeral signed links or secrets");
});
test("music edge returns original range-capable CDN URLs with durable refresh and no transcoding",()=>{
 const edge=read("supabase/functions/setka-music-v1/index.ts");
 assert.match(edge,/const YANDEX_SOURCE="https:\/\/disk\.yandex\.ru\/d\/gmjwIQoHo6VxtQ"/);
 assert.match(edge,/const YANDEX_FOLDERS=\["8D","актив","пассив","звуки природы"\]/);
 assert.match(edge,/const refreshExternalAudio=async tracks=>/);
 assert.match(edge,/setka_music_external_refresh_v1/,"shared server-side refresh lease");
 assert.match(edge,/yandexURLExpiry\(file\.file\)/);
 assert.match(edge,/new Date\(t\.external_audio_url_expires\)/);
 assert.match(edge,/validYandexAudioURL\(t\.external_audio_url\)/);
 assert.match(edge,/audio_url:t\.external_source_path\?/);
 assert.match(edge,/setka-music-v1\?stream=/,"browser gets stable playable same-origin audio endpoint");
 assert.match(edge,/external_source_bytes/,"remote WAV sizes are returned to WebAudio mixer");
 assert.match(edge,/const segmentSize=2\*1024\*1024/,"upstream media streamed in bounded chunks");
 assert.match(edge,/"content-length":String\(end-start\+1\)/,"browser receives complete requested media range");
 assert.match(edge,/const keepRemote=!!previous\[0\]\?\.external_source_path/,"admin edits must keep original external audio source");
 assert.match(edge,/!keepRemote\)await ensureObject\(audio\)/,"normal file replacement still verifies Storage");
 assert.doesNotMatch(edge,/\bffmpeg\b|decodeAudioData|createBufferSource|new OfflineAudioContext/i,"no audio conversion in streaming service");
 const mixer=read("standalone-music-audio-v1.mjs");
 assert.match(mixer,/el\.crossOrigin="anonymous"/,"CORS required for WebAudio HRTF on external music files");
 assert.match(mixer,/el\.src=track\.audio_url/);
 assert.match(mixer,/const singleDeck=!!track\.external_source_path/);
 assert.match(mixer,/Number\(track\.external_source_bytes\)>=24\*1024\*1024/);
 assert.match(mixer,/el\.loop=singleDeck&&track\.loop!==false/);
 assert.match(mixer,/if\(track\.loop!==false&&!singleDeck\)decks\.push\(makeDeck\(0\)\)/,"avoid double 500 MB WAV decoding on iOS");
 assert.match(mixer,/const nativeOnly=singleDeck&&webkit/,"Safari large-WAV fallback uses native media");
 assert.match(mixer,/if\(nativeOnly\)return \{el,src:null,fade:null\}/,"WebKit never routes >24 MiB WAV via MediaElementSource");
 assert.match(mixer,/if\(state\.nativeOnly\)/,"native media volume follows the user-selected dots");
 assert.match(mixer,/d\.src\?\.disconnect\(\);d\.fade\?\.disconnect\(\)/,"native-only media cleans up safely");

});
