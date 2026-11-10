import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sync=fs.readFileSync('standalone-sync-v34.js','utf8');
const corpus=fs.readFileSync('standalone-private-corpus-v40.js','utf8');
test('anonymous installation heartbeat is separate from authenticated personal archive',()=>{
 const guest=sync.match(/if\(!account\?\.token\)\{([\s\S]*?)\n    \}\n    \/\/ Wait for private corpus/);
 assert.ok(guest,'guest presence branch not found');
 assert.match(guest[1],/post\(API,\{action:"sync",channel:CHANNEL,deviceId,firstSeenAt:firstSeen/);
 assert.doesNotMatch(guest[1],/syncSemantic|syncAccount|archive\(|notes:|favorites:|events:/);
 assert.match(sync,/if\(!window\.__SETKA_PRIVATE_CORPUS_V40__\?\.authoritative\?\.\(\)\)/);
});
test('private account archive preserves unpublished notes without publication filtering',()=>{
 assert.match(corpus,/notes:Array\.isArray\(d\.notes\)\?d\.notes:\[\]/);
 assert.match(corpus,/d\.notes=mergeRecords\(d\.notes,payload\.notes,"notes",10000\)/);
 assert.match(corpus,/notesDigest=digest\(n\.map\(v=>\[v\.id,v\.text/);
});
