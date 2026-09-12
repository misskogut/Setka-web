// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8"};
const J=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const N=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const med=xs=>{const a=xs.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return 0;const i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2};
const pct=(xs,v)=>{const a=xs.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return 0;return Math.round(a.filter(x=>x<=v).length/a.length*100)};
function comment(rows,r){
  const cols={saves:rows.map(x=>x.saves),totalMs:rows.map(x=>x.totalMs),averageSessionMs:rows.map(x=>x.averageSessionMs),medianSessionMs:rows.map(x=>x.medianSessionMs),repeatRate:rows.map(x=>x.repeatRate),saveRate:rows.map(x=>x.saveRate),timePerUserMs:rows.map(x=>x.timePerUserMs)};
  const p=Object.fromEntries(Object.entries(cols).map(([k,v])=>[k,pct(v,r[k])]));
  const signals=[];if(p.saves>=80)signals.push("HIGH_SAVE");if(p.saves<=25&&rows.length>=4)signals.push("LOW_SAVE");if(p.totalMs>=80)signals.push("HIGH_TOTAL_TIME");if(p.averageSessionMs>=80)signals.push("HIGH_DURATION");if(p.medianSessionMs>=80)signals.push("HIGH_MEDIAN_DURATION");if(p.repeatRate>=80)signals.push("HIGH_REPEAT");if(p.saveRate>=80)signals.push("HIGH_SAVE_RATE");if(p.timePerUserMs>=80)signals.push("HIGH_TIME_PER_USER");
  let primary="Пока недостаточно устойчивого сигнала, чтобы давать характеристику.";let secondary="";
  if(signals.includes("LOW_SAVE")&&signals.includes("HIGH_DURATION"))primary="Этот паттерн редко сохраняют сразу, но те, кто остаётся, проводят в нём долгое время.";
  else if(signals.includes("HIGH_SAVE_RATE")&&!signals.includes("HIGH_DURATION"))primary="Этот паттерн часто сохраняют уже после короткого знакомства.";
  else if(signals.includes("HIGH_REPEAT"))primary="К этому паттерну особенно часто возвращаются повторно.";
  else if(signals.includes("HIGH_TIME_PER_USER")&&r.uniqueUsers<Math.max(3,rows.reduce((a,x)=>a+x.uniqueUsers,0)/Math.max(1,rows.length)))primary="Аудитория пока небольшая, но использование очень глубокое.";
  else if(signals.includes("HIGH_DURATION"))primary="С этим паттерном пользователи обычно остаются заметно дольше, чем в среднем по библиотеке.";
  else if(signals.includes("HIGH_SAVE"))primary="Один из самых часто сохраняемых паттернов в библиотеке.";
  if(signals.includes("HIGH_REPEAT")&&!primary.includes("возвращ"))secondary="Пользователи также часто возвращаются к нему повторно.";
  return{signals,percentiles:p,primary,secondary};
}
async function run(){
  const [eQ,fQ]=await Promise.all([db.from("prototype_v35_pattern_exposures").select("pattern_id,device_id,duration_ms"),db.from("prototype_v35_favorites").select("pattern_id,device_id,config_key")]);if(eQ.error)throw eQ.error;if(fQ.error)throw fQ.error;
  const m=new Map();
  for(const e of eQ.data||[]){let x=m.get(e.pattern_id);if(!x){x={patternId:e.pattern_id,totalMs:0,exposures:0,durations:[],users:new Map(),saves:0,savers:new Set()};m.set(e.pattern_id,x)}x.totalMs+=N(e.duration_ms);x.exposures++;x.durations.push(N(e.duration_ms));x.users.set(e.device_id,(x.users.get(e.device_id)||0)+1)}
  for(const f of fQ.data||[]){let x=m.get(f.pattern_id);if(!x){x={patternId:f.pattern_id,totalMs:0,exposures:0,durations:[],users:new Map(),saves:0,savers:new Set()};m.set(f.pattern_id,x)}x.saves++;x.savers.add(f.device_id)}
  let rows=[...m.values()].map(x=>{const uniqueUsers=x.users.size,repeatUsers=[...x.users.values()].filter(n=>n>1).length;return{patternId:x.patternId,saves:x.saves,uniqueSavers:x.savers.size,totalMs:x.totalMs,exposures:x.exposures,uniqueUsers,averageSessionMs:x.exposures?x.totalMs/x.exposures:0,medianSessionMs:med(x.durations),repeatRate:uniqueUsers?repeatUsers/uniqueUsers:0,saveRate:uniqueUsers?x.savers.size/uniqueUsers:0,timePerUserMs:uniqueUsers?x.totalMs/uniqueUsers:0}});
  rows=rows.map(r=>({...r,interpretation:comment(rows,r)})).sort((a,b)=>b.totalMs-a.totalMs);return rows;
}
Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response("ok",{headers:H});try{return J({ok:true,items:await run()})}catch(e){console.error(e);return J({error:"server_error",detail:String(e?.message||e)},500)}});
