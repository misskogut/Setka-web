import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {readFileSync} from "node:fs";
import {encryptPersonalBackup,decryptPersonalBackup,checkBackupScope} from "../standalone-personal-offline-vault-v1.mjs";

const backup=(scope="tester:T-101")=>({
 format:"setka-personal-content-v1",scope,deviceId:"device-123",createdAt:"2026-11-16T00:00:00.000Z",
 payload:{
  version:41,createdAt:"2026-01-01T00:00:00.000Z",
  sessions:[{id:"s1",completed:true}],
  notes:[{id:"n1",text:"Личная конфиденциальная заметка",patternId:"medusa"}],
  symptoms:[{id:"st1",name:"усталость"}],
  checkins:[],events:[{id:"evt1",type:"pattern_open"}],
  patternExposures:[],activityIntervals:[],openedPatterns:[],invites:[],
  physio:{samples:[],sources:[]},settings:{communityMode:"for_me"}
 },
 favorites:[{id:"f1",patternId:"medusa",config:{patternId:"medusa"}}]
});
test("encrypts and decrypts local notes, sessions, events and favorites without exposing text or login credentials",async()=>{
 const source=backup(),pass="long-passphrase-demo-2026";
 const encrypted=await encryptPersonalBackup(source,pass,webcrypto);
 const raw=JSON.stringify(encrypted);
 assert.equal(encrypted.format,"setka-personal-encrypted-v1");
 assert.ok(!raw.includes("Личная конфиденциальная заметка"));
 assert.ok(!raw.includes("tester:T-101"));
 assert.ok(!raw.includes("password"));
 assert.equal(encrypted.rounds,240000);
 const clear=await decryptPersonalBackup(encrypted,pass,webcrypto);
 assert.deepEqual(clear,source);
});
test("rejects incorrect password, modified ciphertext and invalid envelope",async()=>{
 const encrypted=await encryptPersonalBackup(backup(),"another-passphrase-safe",webcrypto);
 await assert.rejects(decryptPersonalBackup(encrypted,"incorrect-long-password",webcrypto),/backup_password_or_file_invalid/);
 const modified={...encrypted,payload:"A"+encrypted.payload.slice(1)};
 await assert.rejects(decryptPersonalBackup(modified,"another-passphrase-safe",webcrypto),/backup_password_or_file_invalid/);
 await assert.rejects(decryptPersonalBackup({format:"unexpected"},"another-passphrase-safe",webcrypto),/invalid_backup_file/);
});
test("refuses local data restoration into another account or guest device",()=>{
 const source=backup();
 assert.equal(checkBackupScope(source,"tester:T-101","different-device"),true);
 assert.throws(()=>checkBackupScope(source,"tester:T-202","device-123"),/backup_other_account/);
 const guest=backup("guest");
 assert.equal(checkBackupScope(guest,"guest","device-123"),true);
 assert.throws(()=>checkBackupScope(guest,"guest","device-200"),/backup_other_device/);
});
test("rejects malformed personal payloads, tiny passwords and oversized records",async()=>{
 await assert.rejects(encryptPersonalBackup(backup(),"short",webcrypto),/passphrase_minimum_12/);
 const bad=backup();bad.payload.notes={text:"not an array"};
 await assert.rejects(encryptPersonalBackup(bad,"valid-super-long-pass",webcrypto),/invalid_personal_archive/);
});
test("offline backup is opt-in only and keeps cloud credentials out of snapshot",()=>{
 const source=readFileSync(new URL("../standalone-personal-offline-vault-v1.mjs",import.meta.url),"utf8");
 const html=readFileSync(new URL("../standalone-v34.html",import.meta.url),"utf8");
 const core=readFileSync(new URL("../standalone-core-v34.js",import.meta.url),"utf8");
 const account=readFileSync(new URL("../standalone-tester-cabinet-v40.js",import.meta.url),"utf8");
 assert.match(source,/__SETKA_PRIVATE_CORPUS_V40__\?\.guestArchive/);
 assert.match(source,/checkBackupScope\(contents/);
 assert.match(source,/__SETKA_PRIVATE_CORPUS_V40__\?\.mergeGuest/);
 assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|github\.com\/repos/);
 assert.match(html,/standalone-personal-offline-vault-v1\.mjs/);
 assert.match(core,/Зашифрованный резерв/);
 assert.match(account,/Зашифрованная копия моей истории/);
});
