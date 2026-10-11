import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const tabs=["overview","pattern-knowledge","participants","moderation","community","journey","timing","symptoms","notes","invites","insights"];
test("the original main admin URL is again the complete research admin, not the 3-tab replacement",()=>{
 const html=read("standalone-admin-v34.html");
 for(const tab of tabs){
   assert.ok(html.includes('data-tab="'+tab+'"'),"missing complete admin tab "+tab);
   assert.ok(html.includes('id="tab-'+tab+'"'),"missing full admin content "+tab);
 }
 for(const asset of ["admin-v3.js","standalone-admin-bridge-v34b.js","standalone-admin-participants-v34.js","standalone-admin-pattern-knowledge-v40.js","standalone-admin-privacy-v40.js","standalone-admin-community-v38.js","standalone-admin-tester-ids-v37.js"]){
   assert.ok(html.includes('src="'+asset+'?'),"missing original admin module "+asset);
   assert.ok(existsSync(new URL("../"+asset,import.meta.url)),"missing admin file "+asset);
 }
 assert.doesNotMatch(html,/standalone-admin-public-v34\.js/);
 assert.match(html,/id="keyInput"/);
 assert.match(html,/id="loginBtn"/);
 assert.match(html,/id="dashboard"/);
});
test("separate public overview remains available without replacing original admin",()=>{
 const html=read("standalone-admin-public-v34.html");
 assert.match(html,/standalone-admin-public-v34\.js/);
 assert.doesNotMatch(html,/id="keyInput"/);
 assert.match(html,/standalone-admin-private-v34\.html/);
});
test("private corpus and research moderation are not exposed on password-free page",()=>{
 const html=read("standalone-admin-public-v34.html");
 assert.doesNotMatch(html,/standalone-admin-private-corpus-v40\.js|standalone-admin-participants-v34\.js|admin-v3\.js/);
});
