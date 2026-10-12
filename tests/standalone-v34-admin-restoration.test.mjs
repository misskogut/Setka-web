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

test("a recovery link never calls the server before a real click", async()=>{
 const {runInNewContext}=await import("node:vm");
 const adminJs=read("admin-v3.js");
 const handlers=new Map(),elements=new Map(),calls=[],saved=new Map();
 function el(id){
   if(!elements.has(id))elements.set(id,{
     id,value:"",disabled:false,hidden:false,innerHTML:"",textContent:"",
     classList:{add(){},remove(){}},
     addEventListener(type,fn){handlers.set(id+":"+type,fn)},
     appendChild(){},insertAdjacentHTML(){},querySelectorAll(){return []}
   });
   return elements.get(id);
 }
 const storage={getItem(k){return saved.get(k)||null},setItem(k,v){saved.set(k,v)},removeItem(k){saved.delete(k)}};
 const document={getElementById:el,querySelectorAll(){return []},createElement:()=>el("created")};
 const window={__SETKA_OWNER_TICKET:"unit-test-placeholder"};
 const location={hash:"",pathname:"/standalone-admin-v34.html",search:"",reload(){}};
 const fetch=async(url,opts)=>{
   const body=JSON.parse(opts.body||"{}");calls.push({url,action:body.action});
   const data=body.action==="redeem"
     ?{ok:true,adminKey:"test-only-not-a-live-key"}
     :{ok:true,overview:{},participants:[],sessions:[],items:[],insights:[]};
   return{ok:true,status:200,json:async()=>data};
 };
 runInNewContext(adminJs,{window,document,location,history:{replaceState(){}},
   localStorage:storage,fetch,console,Date,Intl,Number,Math,JSON,Set,Map,Array,Promise,String});
 assert.equal(calls.length,0,"page load must not use/redeem the one-time link");
 assert.equal(el("keyInput").hidden,true);
 const onClick=handlers.get("loginBtn:click");
 assert.equal(typeof onClick,"function");
 await onClick();
 assert.equal(calls.filter(x=>x.action==="redeem").length,1);
 assert.equal(calls.filter(x=>x.action==="admin-check").length,1);
 assert.equal(saved.get("setka-research:admin-key:v1"),"test-only-not-a-live-key");
});
