import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {webcrypto} from "node:crypto";

const source=fs.readFileSync("standalone-guest-telemetry-v2.js","utf8");
const server=fs.readFileSync("supabase/functions/setka-guest-events-v2/index.ts","utf8");

function harness(){
 const current=new Map([["setka-standalone:v34-yulia-device","device-guest-v2"]]);
 const store={getItem:k=>current.get(k)??null,setItem:(k,v)=>current.set(k,String(v))};
 const scheduled=[],listeners=new Map(),requests=[],events=[];
 const startedAt=new Date(Date.now()-120000).toISOString(),endedAt=new Date(Date.now()-100000).toISOString();
 const exposures=[{exposureId:"free-exposure-001",sessionId:null,patternId:"dandelion",durationMs:20000,startedAt,endedAt}];
 let fail=true,hasAccount=false;
 const window={
  SetkaStandaloneV34:{getData:()=>({patternExposures:exposures})},
  addEventListener:(type,listener)=>listeners.set(type,listener),
  dispatchEvent:e=>events.push(e)
 };
 const ctx={window,localStorage:store,
  sessionStorage:{getItem:()=>hasAccount?'{"token":"account-test"}':null},
  crypto:webcrypto,TextEncoder,AbortController,Date,
  CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}},
  document:{hidden:false,addEventListener:()=>{}},
  setTimeout:(fn)=>{scheduled.push(fn);return scheduled.length},
  clearTimeout:()=>{},setInterval:()=>{},
  fetch:async(_url,opts)=>{
   const b=JSON.parse(opts.body);requests.push(b);
   if(fail)throw Error("offline");
   return {ok:true,json:async()=>({ok:true,accepted:b.events.length})};
  }
 };
 vm.runInNewContext(source,ctx);
 const flush=async()=>{
  const before=events.length;
  listeners.get("online")();
  scheduled.pop()();
  // The real WebCrypto SHA-256 call resolves asynchronously. Await the
  // collector's completion event, not a fixed count of event-loop ticks.
  for(let i=0;i<120&&events.length===before;i++)
   await new Promise(resolve=>setTimeout(resolve,10));
  await new Promise(resolve=>setImmediate(resolve));
 };
 return {flush,requests,events,current,exposures,account:()=>{hasAccount=true},online:()=>{fail=false}};
}

test("guest free browsing has nullable session and retries without dropping history",async()=>{
 const h=harness();
 await h.flush();
 assert.equal(h.requests.length,1);
 assert.equal(h.requests[0].events.length,1);
 assert.equal(h.requests[0].events[0].sessionId,null);
 assert.equal(h.current.has("setka:v2-guest-sent"),false,"failed request is not acknowledged");
 h.online();
 await h.flush();
 assert.equal(h.requests.length,2);
 assert.deepEqual(JSON.parse(h.current.get("setka:v2-guest-sent")),["free-exposure-001"]);
 await h.flush();
 assert.equal(h.requests.length,2,"acknowledged exposure must not resend");
 h.account();h.exposures.push({...h.exposures[0],exposureId:"account-free-exposure"});
 await h.flush();
 assert.equal(h.requests.length,2,"guest transport never sends account history");
});

test("server preserves the nullable free-session fact and existing rate limit",()=>{
 assert.match(server,/session_id:e\.sessionId\?\?null/);
 assert.match(server,/e\.sessionId==null\|\|validId\(e\.sessionId,180\)/);
 assert.match(server,/hourCount\|\|0/);
 assert.match(server,/ignoreDuplicates:true/);
});
