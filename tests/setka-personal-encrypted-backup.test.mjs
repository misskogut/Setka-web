import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {webcrypto} from "node:crypto";
import {TextDecoder,TextEncoder} from "node:util";

const source=readFileSync(new URL("../standalone-personal-backup-v1.js",import.meta.url),"utf8");
function setup(scope="tester:account-1"){
 const state={version:40,notes:[{id:"note-1",text:"SECRET_PERSONAL_NOTE",updatedAt:"2026-11-16T00:00:00Z"}],
 sessions:[{id:"s1",updatedAt:"2026-11-16T00:00:00Z"}],symptoms:[],checkins:[],
 events:[],patternExposures:[],activityIntervals:[],openedPatterns:[],invites:[],
 physio:{samples:[],sources:[]},settings:{patternConfigs:{}}};
 const favorite={id:"f1",config:{patternId:"rain",seed:1}};
 const received=[];
 const w={
   dispatchEvent:()=>true,
   SetkaDataScopeV1:{id:scope},
   SetkaStandaloneV34:{getData:()=>state,ready:Promise.resolve(),whenSaved:async()=>true},
   SetkaApp:{getFavorites:()=>[favorite]},
   __SETKA_PRIVATE_CORPUS_V40__:{mergeGuest:async(p,f)=>{received.push({p,f});return {notes:p.notes.length,sessions:p.sessions.length,events:p.events.length}}}
 };
 vm.runInNewContext(source,{window:w,crypto:webcrypto,TextEncoder,TextDecoder,
   btoa:x=>Buffer.from(x,"binary").toString("base64"),
   atob:x=>Buffer.from(x,"base64").toString("binary"),
   Uint8Array,Blob,CustomEvent:class{constructor(t){this.type=t}},
   setTimeout:()=>0,console},{timeout:1200});
 return {api:w.__SETKA_OFFLINE_BACKUP_V1__,received,w};
}
test("backup uses PBKDF2 and AES-GCM, never includes plaintext, tokens or server calls",async()=>{
 const {api}=setup();
 const packet=await api.exportArchive("long passphrase not shared");
 assert.equal(packet.format,"setka-personal-encrypted-backup-v1");
 assert.equal(packet.kdf,"PBKDF2-SHA256");
 assert.equal(packet.iterations,250000);
 assert.equal(packet.algorithm,"AES-256-GCM");
 assert.ok(!JSON.stringify(packet).includes("SECRET_PERSONAL_NOTE"));
 assert.ok(!JSON.stringify(packet).includes("account-1"));
 assert.ok(!source.includes("fetch("));
 assert.ok(!source.includes("supabase.co"));
 assert.ok(!source.includes("github.com"));
});
test("encrypted private notes can be restored only with the correct passphrase",async()=>{
 const {api,received}=setup();
 const encrypted=await api.exportArchive("long passphrase not shared");
 await assert.rejects(api.restoreArchive(JSON.stringify(encrypted),"wrong long password"));
 assert.equal(received.length,0);
 const result=await api.restoreArchive(JSON.stringify(encrypted),"long passphrase not shared");
 assert.equal(result.notes,1);
 assert.equal(received.length,1);
 assert.equal(received[0].p.notes[0].text,"SECRET_PERSONAL_NOTE");
 assert.equal(received[0].f.length,1);
});
test("private account archive never merges into a different user or a guest",async()=>{
 const owner=setup("tester:account-1");
 const encrypted=await owner.api.exportArchive("long passphrase not shared");
 const other=setup("tester:account-2");
 await assert.rejects(other.api.restoreArchive(encrypted,"long passphrase not shared"),/different_account/);
 assert.equal(other.received.length,0);
 const guest=setup("guest");
 await assert.rejects(guest.api.restoreArchive(encrypted,"long passphrase not shared"),/different_account/);
 assert.equal(guest.received.length,0);
});
test("malformed archive and wrong format are rejected before modifying the device",async()=>{
 const {api,received}=setup();
 await assert.rejects(api.restoreArchive('{"format":"random"}',"long passphrase not shared"),/invalid_encrypted_backup/);
 assert.equal(received.length,0);
});
