import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const origin='https://misskogut.github.io';
const id='11111111-2222-4333-8444-555555555555';
const bytes=new Uint8Array(1024).map((_,i)=>i%251);
function app(sequence){
 let handler,requests=0;
 const track={id,published:true,external_source_path:'/звуки природы/реальный.wav',
  external_source_hash:'a'.repeat(64),external_source_bytes:bytes.length};
 const fetch=async(url,opts={})=>{
  const uri=String(url);
  if(uri.includes('/rest/v1/setka_music_tracks_v1'))return new Response(JSON.stringify([track]),{status:200,headers:{'content-type':'application/json'}});
  if(uri.includes('/releases/download/setka-original-music-20261107/')){
   const item=sequence[Math.min(requests++,sequence.length-1)];
   if(item==='500')return new Response('temporary upstream problem',{status:500});
   if(item==='bad-range')return new Response(bytes,{status:206,headers:{'content-range':'bytes 1-1024/1024'}});
   return new Response(bytes,{status:206,headers:{'content-range':'bytes 0-1023/1024','content-type':'audio/wav'}});
  }
  throw Error('unexpected network request: '+uri);
 };
 const Deno={env:{get:name=>name==='SUPABASE_URL'?'https://setka.test':'test-secret'},serve:fn=>{handler=fn}};
 const code=readFileSync('supabase/functions/setka-music-v1/index.ts','utf8');
 vm.runInNewContext(code,{Deno,fetch,Response,Request,Headers,ReadableStream,AbortSignal,
  URL,URLSearchParams,TextEncoder,crypto:webcrypto,setTimeout,console},{filename:'setka-music-v1/index.ts'});
 const request=new Request('https://setka.test/functions/v1/setka-music-v1?stream='+id,{
  method:'GET',headers:{origin,range:'bytes=0-1023'}});
 return {respond:()=>handler(request),calls:()=>requests};
}
test('original audio retries one transient CDN 500 and returns actual exact PCM bytes',async()=>{
 const fixture=app(['500','206']);
 const response=await fixture.respond();
 assert.equal(response.status,206);
 assert.equal(response.headers.get('content-range'),'bytes 0-1023/1024');
 assert.equal(fixture.calls(),2);
 assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);
});
test('persistent 5xx never generates a fake 206 or empty playable file',async()=>{
 const fixture=app(['500']);
 const response=await fixture.respond();
 assert.equal(response.status,502);
 assert.equal(fixture.calls(),3);
 const body=await response.json();
 assert.equal(body.error,'audio_origin_unavailable');
});
test('mismatched Content-Range is rejected, never mixed with original audio',async()=>{
 const fixture=app(['bad-range']);
 const response=await fixture.respond();
 assert.equal(response.status,502);
 assert.equal(fixture.calls(),1);
});
