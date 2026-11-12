import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {webcrypto} from "node:crypto";

const script=fs.readFileSync("standalone-guest-journey-v3.js","utf8");
const server=fs.readFileSync("supabase/functions/setka-guest-events-v2/index.ts","utf8");
const music=fs.readFileSync("standalone-music-v1.mjs","utf8");
const frontend=fs.readFileSync("standalone-v34.html","utf8");
function harness(){
 const values=new Map([["setka-standalone:v34-yulia-device","guest-device-test"]]);
 const listeners=new Map(),dlisteners=new Map(),scheduled=[],requests=[];
 let isAccount=false,offline=true;
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};
 const on=(map,key,callback)=>map.set(key,[...(map.get(key)||[]),callback]);
 const dispatch=(map,key,detail)=>{for(const cb of map.get(key)||[])cb({type:key,detail})};
 const document={hidden:false,readyState:"complete",addEventListener:(k,cb)=>on(dlisteners,k,cb)};
 const window={SetkaApp:{getState:()=>({patternId:"gravity-atom"})},addEventListener:(k,cb)=>on(listeners,k,cb),dispatchEvent:e=>dispatch(listeners,e.type,e.detail)};
 const context={window,document,localStorage:storage,
  sessionStorage:{getItem:()=>isAccount?'{"token":"existing-account-token"}':null},
  Date,crypto:webcrypto,Uint8Array,AbortController,CustomEvent:class{constructor(type,args){this.type=type;this.detail=args?.detail}},
  setTimeout:(fn,delay)=>{scheduled.push({fn,delay});return scheduled.length},
  clearTimeout:()=>{},setInterval:()=>{},
  fetch:async(_url,options)=>{const b=JSON.parse(options.body);requests.push(b);if(offline)throw Error("network_down");return{ok:true,json:async()=>({ok:true,accepted:b.events.length})};}
 };
 vm.runInNewContext(script,context);
 const send=async()=>{const a=[...scheduled].reverse().find(x=>[1400,2500,300,250,200,1200,1000,1500,3000,6000,12000].includes(x.delay));assert.ok(a);await a.fn();for(let i=0;i<8;i++)await Promise.resolve()};
 return {values,requests,document,dispatch:(k,detail)=>dispatch(listeners,k,detail),documentEvent:k=>dispatch(dlisteners,k),send,online:()=>{offline=false},account:()=>{isAccount=true},pending:()=>JSON.parse(values.get("setka:v3-guest-journey-pending")||"[]")};
}
test("guest visit and high-level actions queue offline then acknowledge once",async()=>{
 const h=harness();
 assert.equal(h.pending().length,1);
 assert.equal(h.pending()[0].eventType,"visit_start");
 h.dispatch("setka:pattern-open",{state:{patternId:"gravity-atom"}});
 h.dispatch("setka:favorite-saved",{favorite:{id:"private-fav-id",config:{patternId:"medusa"}}});
 h.dispatch("setka:favorite-removed",{favorite:{id:"private-fav-id"}});
 h.dispatch("setka:music-play",{trackId:"real-audio-track"});
 assert.deepEqual(h.pending().map(x=>x.eventType),["visit_start","pattern_open","favorite_save","favorite_remove","music_play"]);
 assert.equal(JSON.stringify(h.pending()).includes("private-fav-id"),false,"private favorite ID never transmitted");
 assert.equal(JSON.stringify(h.pending()).includes("gesture"),false);
 assert.equal(JSON.stringify(h.pending()).includes("config"),false);
 await h.send();assert.equal(h.pending().length,5,"failed network remains retryable");
 h.online();h.dispatch("online");await h.send();
 assert.equal(h.pending().length,0);
 assert.equal(h.requests.at(-1).events.length,5);
 const ids=new Set(h.requests.at(-1).events.map(x=>x.eventId));assert.equal(ids.size,5);
 h.dispatch("online");await h.send();assert.equal(h.requests.length,2,"acked events not sent twice");
});
test("foreground session ends on visibilitychange and does not upload account behavior",async()=>{
 const h=harness();
 h.document.hidden=true;h.documentEvent("visibilitychange");
 assert.equal(h.pending().filter(x=>x.eventType==="visit_end").length,1);
 const visitEnd=h.pending().find(x=>x.eventType==="visit_end");
 assert.equal(visitEnd.sessionId,h.pending()[0].sessionId);
 assert.ok(visitEnd.durationMs>=0);
 h.account();
 h.dispatch("setka:music-play",{trackId:"account-track"});
 h.dispatch("setka:pattern-open",{patternId:"account-pattern"});
 assert.equal(h.pending().length,2);
 h.online();h.dispatch("online");await h.send();
 assert.equal(h.requests.length,1,"only queued pre-login guest events can be delivered after sign-in");
 assert.deepEqual(h.requests[0].events.map(e=>e.eventType),["visit_start","visit_end"]);
 assert.equal(h.pending().length,0);
});
test("sign-in closes only the already-open guest visit and replays no account actions as guest",async()=>{
 const h=harness();
 h.account();
 h.dispatch("setka:v40-account",{authenticated:true});
 assert.deepEqual(h.pending().map(e=>e.eventType),["visit_start","visit_end"]);
 h.dispatch("setka:music-play",{trackId:"account-only-track"});
 assert.equal(h.pending().length,2);
 h.online();h.dispatch("online");await h.send();
 assert.equal(h.requests.at(-1).events.length,2);
 assert.equal(h.requests.at(-1).events.some(e=>e.trackId==="account-only-track"),false);
});
test("server whitelist only accepts bounded metadata; existing exposure and rate contracts stay intact",()=>{
 assert.match(server,/const JOURNEY_EVENTS=new Set/);
 for(const type of ["visit_start","visit_end","app_return","pattern_open","favorite_save","favorite_remove","music_play"])assert.ok(server.includes('"'+type+'"'));
 assert.match(server,/session_id:e\.sessionId\?\?null/);
 assert.match(server,/ignoreDuplicates:true/);
 assert.match(server,/hourCount\|\|0/);
 assert.match(server,/e\.eventType==="pattern_open"&&!validId/);
 assert.match(server,/e\.eventType==="music_play"&&!validId/);
 assert.match(server,/e\.eventType==="visit_end"/);
 assert.match(server,/properties:\{source:"standalone-v34",schema:exposure\?2:3/);
 assert.match(music,/event\?\.event_type==="play"/);
 assert.match(music,/setka:music-play/);
 assert.match(frontend,/standalone-guest-journey-v3\.js/);
});
