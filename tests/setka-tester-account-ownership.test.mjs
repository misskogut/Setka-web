import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../supabase/functions/setka-tester-account-v40/index.ts",import.meta.url),"utf8");
const start=source.indexOf("async function ensureDevice("),end=source.indexOf("async function rate(",start);
assert.ok(start>=0&&end>start);
const functionCode=source.slice(start,end).replace("deviceId:string,tid:string,userAgent:any=null,viewport:any=null","deviceId,tid,userAgent=null,viewport=null");
function setup(initial={}){
 const state={
  devices:new Map(Object.entries(initial.devices||{}).map(([id,owner])=>[id,{device_id:id,subject_key:owner}])),
  archives:new Map(Object.entries(initial.archives||{}).map(([id,owner])=>[id,{tester_id:owner}])),
  claims:new Map(Object.entries(initial.claims||{}).map(([id,owner])=>[id,[{tester_id:owner,active:true}]]))
 };
 class Query{
  constructor(table){this.table=table;this.kind="select";this.where=[];this.limitCount=Infinity}
  select(){return this}
  eq(k,v){this.where.push([k,v]);return this}
  is(k,v){this.where.push([k,v]);return this}
  limit(n){this.limitCount=n;return this}
  update(row){this.kind="update";this.row=row;return this}
  insert(row){this.kind="insert";this.row=row;return this}
  current(){
   const values=this.table==="prototype_v34_devices"?[...state.devices.values()]:
      this.table==="prototype_v37_tester_private_archives"?[...state.archives].map(([device_id,obj])=>({device_id,...obj})):
      [...state.claims].flatMap(([claimed_device_id,a])=>a.map(x=>({...x,claimed_device_id})));
   return values.filter(x=>this.where.every(([k,v])=>(x[k]??null)===v)).slice(0,this.limitCount);
  }
  async execute(){
   if(this.kind==="update"){
    const values=this.current();
    for(const x of values){state.devices.set(x.device_id,{...x,...this.row})}
    return {data:values[0]||null,error:null};
   }
   if(this.kind==="insert"){
    if(state.devices.has(this.row.device_id))return {data:null,error:{code:"23505"}};
    state.devices.set(this.row.device_id,{...this.row});return {data:this.row,error:null};
   }
   return {data:this.current(),error:null};
  }
  async maybeSingle(){const x=await this.execute();return {...x,data:Array.isArray(x.data)?x.data[0]||null:x.data}}
  then(resolve,reject){this.execute().then(resolve,reject)}
 }
 const db={from:table=>new Query(table)};
 const ensure=vm.runInNewContext(functionCode+"\nensureDevice",{db,Date,Promise,Error,T:(x,n)=>String(x??"").slice(0,n)});
 return {ensure,state};
}
test("new device can attach to A, and another fresh device can also attach to A",async()=>{
 const {ensure,state}=setup();
 await ensure("device-1","TESTER-A");
 await ensure("device-2","TESTER-A");
 assert.equal(state.devices.get("device-1").subject_key,"TESTER-A");
 assert.equal(state.devices.get("device-2").subject_key,"TESTER-A");
 await ensure("device-1","TESTER-A");
});
test("same device cannot silently switch A to B",async()=>{
 const {ensure,state}=setup({devices:{"device-1":"TESTER-A"}});
 await assert.rejects(ensure("device-1","TESTER-B"),/device_already_has_tester_id/);
 assert.equal(state.devices.get("device-1").subject_key,"TESTER-A");
});
test("an existing private archive prevents reassignment even when legacy device owner missing",async()=>{
 const {ensure,state}=setup({devices:{"device-1":null},archives:{"device-1":"TESTER-A"}});
 await assert.rejects(ensure("device-1","TESTER-B"),/device_already_has_tester_id/);
 assert.equal(state.devices.get("device-1").subject_key,null);
});
test("claim belonging to A prevents B attaching the same browser",async()=>{
 const {ensure,state}=setup({claims:{"device-1":"TESTER-A"}});
 await assert.rejects(ensure("device-1","TESTER-B"),/device_already_has_tester_id/);
 assert.equal(state.devices.has("device-1"),false);
});
test("concurrent account reassignment cannot defeat conditional update",async()=>{
 const {ensure,state}=setup({devices:{"device-1":null}});
 const result=await Promise.allSettled([ensure("device-1","TESTER-A"),ensure("device-1","TESTER-B")]);
 assert.equal(result.filter(x=>x.status==="fulfilled").length,1);
 assert.equal(result.filter(x=>x.status==="rejected").length,1);
 assert.ok(["TESTER-A","TESTER-B"].includes(state.devices.get("device-1").subject_key));
});
test("invalid switch is rejected before token issue, login persistence or password recovery mutation",()=>{
 const login=source.slice(source.indexOf('if(action==="login")'),source.indexOf('if(action==="accept-consent")'));
 const recover=source.slice(source.indexOf('if(action==="recover-password")'),source.indexOf('if(action==="admin-list")'));
 assert.ok(login.indexOf('await ensureDevice(deviceId,tid')<login.indexOf('await issue(tid,'));
 assert.ok(recover.indexOf('await ensureDevice(deviceId,tid')<recover.indexOf('prototype_v40_tester_accounts").update('));
 assert.match(source,/device_already_has_tester_id"\},409/);
 assert.match(source,/if\(!deviceId\)return J\(\{error:"device_id_required"\},400\)/);
});
