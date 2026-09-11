// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,apikey,authorization","Access-Control-Allow-Methods":"POST,OPTIONS","X-Content-Type-Options":"nosniff"};
const J=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const T=(v:any,n=500)=>String(v??"").trim().slice(0,n);
async function sha(v:string){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function token(){const a=new Uint8Array(24);crypto.getRandomValues(a);return [...a].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function rpc(name:string,args:Record<string,unknown>={}){const q=await db.rpc(name,args);if(q.error)throw q.error;return q.data}
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response('ok',{headers:H});if(req.method!=='POST')return J({error:'method_not_allowed'},405);try{const b=await req.json().catch(()=>({})),action=T(b.action,40);
 if(action==='personas'){return J({ok:true,personas:await rpc('diamond_sim_browser_personas')})}
 if(action==='begin'){const raw=token(),hash=await sha(raw);const out=await rpc('diamond_sim_browser_begin',{p_persona_key:T(b.personaKey,120),p_front_version:T(b.frontVersion,120),p_seed:T(b.seed,120),p_token_hash:hash});return J({ok:true,runId:out.runId,runToken:raw})}
 const runId=T(b.runId,80),raw=T(b.runToken,200);if(!runId||!raw)return J({error:'invalid_run'},403);const hash=await sha(raw);
 if(action==='ui_action'){await rpc('diamond_sim_browser_action',{p_run_id:runId,p_token_hash:hash,p_seq:Number(b.seq)||0,p_action_type:T(b.actionType,80),p_target:T(b.target,180),p_payload:b.payload&&typeof b.payload==='object'?b.payload:{}});return J({ok:true})}
 if(action==='ingest'){return J(await rpc('diamond_sim_browser_ingest',{p_run_id:runId,p_token_hash:hash,p_kind:T(b.kind,30),p_body:b.requestBody&&typeof b.requestBody==='object'?b.requestBody:{}}))}
 if(action==='complete'){return J(await rpc('diamond_sim_browser_complete',{p_run_id:runId,p_token_hash:hash,p_ok:b.ok!==false,p_steps:Number(b.steps)||0,p_error:T(b.error,1000),p_note:T(b.note,500)}))}
 return J({error:'unknown_action'},400)}catch(e){console.error('setka-simulation-v1',e);const msg=String(e?.message||e);return J({error:msg.includes('invalid_run')?'invalid_run':'server_error',detail:msg},msg.includes('invalid_run')?403:500)}});