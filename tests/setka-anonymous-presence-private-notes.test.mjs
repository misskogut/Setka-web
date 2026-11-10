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

test('guest backup restores before writing and uses a separate browser secret',()=>{
 const guest=fs.readFileSync('standalone-guest-archive-v1.js','utf8');
 const html=fs.readFileSync('standalone-v34.html','utf8');
 assert.match(guest,/setka-guest:v1-secret/);
 assert.match(guest,/action:"pull"/);
 assert.match(guest,/if\(!await restore\(\)\|\|loggedIn\(\)\)return false/);
 assert.match(guest,/revision_conflict/);
 assert.match(guest,/attachGuestToAccount/);
 assert.match(html,/standalone-guest-archive-v1\.js/);
 const admin=fs.readFileSync('research-v1/app.mjs','utf8');
 assert.match(admin,/guestBackup/);
});

test('guest archive uses exact device identity of heartbeat and includes full progress',()=>{
 const guest=fs.readFileSync('standalone-guest-archive-v1.js','utf8');
 assert.match(guest,/setka-standalone:v34-yulia-device/);
 assert.doesNotMatch(guest,/C\.sandbox\?\.deviceId/);
 assert.match(guest,/JSON\.stringify\(\[data,favorites\]\)/);
 assert.match(guest,/schedule\(150\)/);
 assert.match(guest,/stripHeavy\(corpus\.guestArchive\(\)\)/);
});

test('admin guest backup displays receipt only and never embeds archive text',()=>{
 const admin=fs.readFileSync('research-v1/app.mjs','utf8');
 assert.match(admin,/guestBackup\.updatedAt/);
 assert.match(admin,/личное содержимое скрыто/);
 const guest=fs.readFileSync('standalone-guest-archive-v1.js','utf8');
 assert.match(guest,/account-metrics-committed/);
 assert.match(guest,/attachPromise/);
});
