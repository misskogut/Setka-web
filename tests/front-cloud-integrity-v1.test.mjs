import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {savePendingNote} from '../supabase/functions/setka-public-notes-v37/note-write.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));

function isolatedDatabase(rows=[],beforeWrite=()=>{}) {
  const records=clone(rows),calls=[];
  class Query {
    constructor(){this.filters=[];this.mode='read'}
    insert(row){this.mode='insert';this.row=clone(row);return this}
    update(row){this.mode='update';this.row=clone(row);return this}
    eq(key,value){this.filters.push([key,value]);return this}
    is(key,value){return this.eq(key,value)}
    select(){return this}
    async maybeSingle(){
      calls.push(this.mode);beforeWrite(this.mode,records);
      if(this.mode==='insert') {
        if(records.some(x=>(x.author_tester_id===this.row.author_tester_id||x.author_device_id===this.row.author_device_id)&&x.source_note_key===this.row.source_note_key))return{error:{code:'23505'},data:null};
        const value={id:'isolated-'+records.length,...this.row};records.push(value);return{data:clone(value),error:null};
      }
      const current=records.find(row=>this.filters.every(([key,value])=>row[key]===value));
      if(current&&this.mode==='update')Object.assign(current,this.row);
      return{data:current?clone(current):null,error:null};
    }
  }
  const db={from:()=>new Query()};
  const readExisting=(testerId,source)=>db.from('prototype_v36_public_notes').select().eq('author_tester_id',testerId).eq('source_note_key',source).maybeSingle().then(x=>x.data);
  const submit=async(testerId='isolated-A',deviceId='device-A')=>{
    const source='note-A',row={author_tester_id:testerId,author_device_id:deviceId,source_note_key:source,moderation_status:'pending',is_public:false,submitted_at:'2026-10-14T01:00:00Z',pattern_id:'dandelion',config:{v1:.47},preview_frame:114.71};
    return savePendingNote(db,{testerId,source,row,readExisting,initial:await readExisting(testerId,source)});
  };
  return{records,calls,submit};
}
test('submission inserts against the existing partial uniqueness constraint without ON CONFLICT',async()=>{
  const d=isolatedDatabase(),out=await d.submit();assert.equal(out.already,false);assert.equal(d.records.length,1);assert.equal(out.record.is_public,false);assert.equal(out.record.preview_frame,114.71);
});
test('repeated submission from another device preserves the account note and moderation status',async()=>{
  const d=isolatedDatabase();const first=await d.submit(),second=await d.submit('isolated-A','device-B');assert.equal(second.already,true);assert.equal(second.record.id,first.record.id);assert.equal(d.records.length,1);assert.equal(d.calls.filter(x=>x==='insert').length,1);
});
test('a rejected note resubmits under the same immutable ID',async()=>{
  const d=isolatedDatabase([{id:'original',author_tester_id:'isolated-A',author_device_id:'device-A',source_note_key:'note-A',moderation_status:'rejected',is_public:false}]);const out=await d.submit();assert.equal(out.record.id,'original');assert.equal(out.record.moderation_status,'pending');assert.equal(out.record.is_public,false);assert.equal(d.records.length,1);
});
test('moderation that wins a concurrent resubmission is not reset',async()=>{
  const d=isolatedDatabase([{id:'approved',author_tester_id:'isolated-A',author_device_id:'device-A',source_note_key:'note-A',moderation_status:'rejected',is_public:false}],(mode,rows)=>{if(mode==='update'){rows[0].moderation_status='published';rows[0].is_public=true}});const out=await d.submit();assert.equal(out.already,true);assert.equal(out.record.moderation_status,'published');assert.equal(d.records[0].is_public,true);
});
test('a concurrent insert is read by account instead of creating a duplicate',async()=>{
  const d=isolatedDatabase([], (mode,rows)=>{if(mode==='insert'&&!rows.length)rows.push({id:'concurrent',author_tester_id:'isolated-A',author_device_id:'device-A',source_note_key:'note-A',moderation_status:'pending',is_public:false})});const out=await d.submit();assert.equal(out.already,true);assert.equal(out.record.id,'concurrent');assert.equal(d.records.length,1);
});
test('a legacy device conflict cannot reassign another account private note',async()=>{
  const d=isolatedDatabase();await d.submit();await assert.rejects(d.submit('isolated-B','device-A'),e=>e.code==='23505');assert.equal(d.records.length,1);assert.equal(d.records[0].author_tester_id,'isolated-A');
});

function storageContext(file,{throwOnStorage=false}={}){
  const requests=[],events=[],token='isolated-session-only',data={sessions:[],notes:[],events:[],patternExposures:[],symptoms:[],checkins:[],settings:{}};
  const context={JSON,Date,Number,Error,CustomEvent:class{constructor(type,value){this.type=type;this.detail=value?.detail}},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,navigator:{onLine:true},document:{addEventListener(){}},addEventListener(){},dispatchEvent:e=>events.push(e),SetkaStandaloneV34:{sandbox:{deviceId:'isolated-device'},getData:()=>data,save(){}},SetkaApp:{getFavorites:()=>[]},sessionStorage:{getItem:()=>JSON.stringify({token}),setItem(){}}};
  if(throwOnStorage)Object.defineProperty(context,'localStorage',{get(){throw new Error('Storage unavailable')}});
  else context.localStorage={getItem:()=>null,setItem(){}};
  context.window=context;
  context.fetch=async(url,init)=>{
    const body=JSON.parse(init.body);requests.push({url,body});
    const response=body.action==='status'?{consented:true,consentAt:'2026-10-01T00:00:00Z'}:body.action==='pull'?{archive:null}:{ok:true,updatedAt:'2026-10-14T01:00:00Z',counts:{sessions:0}};
    return{ok:true,json:async()=>response};
  };
  vm.runInNewContext(read(file),context);return{context,requests,events,token};
}
for(const throwOnStorage of [false,true])test('private archive uses the existing temporary session when persistent storage '+(throwOnStorage?'throws':'is empty'),async()=>{
  const {context,requests,token}=storageContext('standalone-private-corpus-v40.js',{throwOnStorage});assert.equal(await context.__SETKA_PRIVATE_CORPUS_V40__.sync(),true);assert.deepEqual(requests.map(x=>x.body.action),['pull','sync']);assert.ok(requests.every(x=>x.body.sessionToken===token));assert.equal(context.__SETKA_PRIVATE_CORPUS_V40__.authoritative(),true);assert.equal(context.__SETKA_PRIVATE_CORPUS_V40__.status().ok,true);
});
test('research contribution bridge uses the same temporary session',async()=>{
  const {context,requests,token}=storageContext('standalone-research-bridge-v40.js',{throwOnStorage:true});assert.equal(await context.__SETKA_RESEARCH_BRIDGE_V40__.sync(),true);assert.deepEqual(requests.map(x=>x.body.action),['status','my-status']);assert.ok(requests.every(x=>x.body.sessionToken===token));
});
test('account screen distinguishes an old restored archive, failed upload and pending upload',()=>{
  const src=read('standalone-tester-cabinet-v40.js'),a=src.indexOf('  function syncMessage('),b=src.indexOf('  async function showCabinet(){',a),message=vm.runInNewContext(src.slice(a,b)+'\nsyncMessage;');assert.match(message({ok:true,restored:true,updatedAt:'2026-08-31T10:00:00Z'}),/Облачный архив получен.*Последнее обновление/);assert.match(message({enabled:true,ok:false}),/Не удалось синхронизировать/);assert.match(message({}),/ожидается/);assert.match(message({ok:true,updatedAt:'2026-10-14T01:00:00Z'}),/Последняя передача истории/);
});
