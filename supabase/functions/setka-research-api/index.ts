import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: corsHeaders }); }
function num(v: unknown, fallback = 0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)); }
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}
function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes); crypto.getRandomValues(arr); let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = (n: number) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, b => alphabet[b % alphabet.length]).join(""); };
  return `STK-${part(4)}-${part(4)}`;
}
function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  if (typeof value === "number") return Math.round(value * 100000) / 100000;
  return value;
}
async function configHash(patternId: string, version: number, config: any) {
  return await sha256(`${patternId}|${version}|${JSON.stringify(canonical(config || {}))}`);
}
async function requireAdmin(adminKey: string) {
  if (!adminKey) return false;
  const hash = await sha256(adminKey.trim());
  const { data } = await db.from("admin_keys").select("id").eq("key_hash", hash).eq("active", true).maybeSingle();
  return Boolean(data);
}
async function requireSession(sessionId: string, token: string) {
  if (!sessionId || !token) return null;
  const tokenHash = await sha256(token);
  const { data } = await db.from("sessions").select("id,participant_id,ended_at,request_key,pre_state,post_state").eq("id", sessionId).eq("session_token_hash", tokenHash).maybeSingle();
  return data || null;
}
async function fetchAllEvents(sessionId: string) {
  const rows: any[] = []; const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db.from("session_events").select("id,t_ms,event_type,payload,created_at").eq("session_id", sessionId).order("t_ms").order("id").range(from, from + pageSize - 1);
    if (error) throw error; rows.push(...(data || [])); if (!data || data.length < pageSize) break;
  }
  return rows;
}
async function communityRows(participantId?: string) {
  const { data: configs, error } = await db.from("community_configs").select("id,pattern_id,pattern_version,config_hash,config,preview_frame,created_by,parent_config_id,created_at").order("created_at", { ascending: false }).limit(300);
  if (error) throw error;
  const ids = (configs || []).map((c:any) => c.id);
  if (!ids.length) return [];
  const { data: saves } = await db.from("community_saves").select("config_id,participant_id,created_at").in("config_id", ids);
  const count = new Map<string,number>(); const mine = new Set<string>();
  for (const s of saves || []) { count.set(s.config_id, (count.get(s.config_id) || 0) + 1); if (participantId && s.participant_id === participantId) mine.add(s.config_id); }
  return (configs || []).map((c:any) => ({ ...c, saveCount: count.get(c.id) || 0, savedByMe: mine.has(c.id) })).sort((a:any,b:any) => b.saveCount - a.saveCount || Date.parse(b.created_at) - Date.parse(a.created_at));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const body = await req.json(); const action = String(body?.action || "");

    if (action === "claim") {
      const code = String(body?.code || "").trim().toUpperCase(); const deviceId = String(body?.deviceId || "").trim();
      if (!code || !deviceId) return json({ error: "missing_code_or_device" }, 400);
      const { data: participant, error: pError } = await db.from("participants").select("id,access_code,label,active,device_hash,bound_at").eq("access_code", code).maybeSingle();
      if (pError) throw pError; if (!participant || !participant.active) return json({ error: "invalid_code" }, 403);
      const deviceHash = await sha256(deviceId); let boundHash = participant.device_hash as string | null;
      if (!boundHash) {
        const { data: claimed, error } = await db.from("participants").update({ device_hash: deviceHash, bound_at: new Date().toISOString(), last_seen_at: new Date().toISOString() }).eq("id", participant.id).is("device_hash", null).select("device_hash").maybeSingle();
        if (error) throw error; boundHash = claimed?.device_hash || null;
        if (!boundHash) { const { data: fresh } = await db.from("participants").select("device_hash").eq("id", participant.id).single(); boundHash = fresh?.device_hash || null; }
      }
      if (boundHash !== deviceHash) return json({ error: "device_mismatch" }, 409);
      const sessionToken = randomToken(); const tokenHash = await sha256(sessionToken);
      const { data: session, error: sError } = await db.from("sessions").insert({ participant_id: participant.id, device_hash: deviceHash, session_token_hash: tokenHash, app_version: String(body?.appVersion || "web"), user_agent: String(body?.userAgent || "").slice(0,1000), viewport: body?.viewport || {}, meta: body?.meta || {} }).select("id,started_at").single();
      if (sError) throw sError;
      const { data: profile } = await db.from("participant_profiles").select("age_band,practice_experience,visual_sensitivity,created_at,updated_at").eq("participant_id", participant.id).maybeSingle();
      await db.from("participants").update({ last_seen_at: new Date().toISOString() }).eq("id", participant.id);
      return json({ ok:true, participant:{id:participant.id,code:participant.access_code,label:participant.label}, profile: profile || null, sessionId:session.id, sessionToken, startedAt:session.started_at });
    }

    if (action === "session-context") {
      const session = await requireSession(String(body?.sessionId||""), String(body?.sessionToken||"")); if (!session) return json({error:"invalid_session"},403);
      const profile = body?.profile && typeof body.profile === "object" ? body.profile : null;
      if (profile) {
        const row = { participant_id: session.participant_id, age_band: String(profile.ageBand||"").slice(0,40)||null, practice_experience: String(profile.practiceExperience||"").slice(0,40)||null, visual_sensitivity: String(profile.visualSensitivity||"").slice(0,40)||null, updated_at:new Date().toISOString() };
        const { error } = await db.from("participant_profiles").upsert(row, { onConflict:"participant_id" }); if (error) throw error;
      }
      const requestKey = String(body?.requestKey||"").slice(0,60) || null; const preState = body?.preState == null ? null : clamp(Math.round(num(body.preState)),1,5);
      const { error } = await db.from("sessions").update({ request_key:requestKey, pre_state:preState, last_seen_at:new Date().toISOString() }).eq("id",session.id); if (error) throw error;
      return json({ok:true});
    }

    if (action === "batch") {
      const session = await requireSession(String(body?.sessionId||""), String(body?.sessionToken||"")); if (!session) return json({error:"invalid_session"},403);
      const events = Array.isArray(body?.events) ? body.events.slice(0,500) : []; const snapshots = Array.isArray(body?.snapshots) ? body.snapshots.slice(0,100) : [];
      if (events.length) { const rows = events.map((e:any)=>({session_id:session.id,participant_id:session.participant_id,t_ms:Math.max(0,Math.round(num(e?.tMs))),event_type:String(e?.type||"state").slice(0,80),payload:e?.payload&&typeof e.payload==="object"?e.payload:{}})); const {error}=await db.from("session_events").insert(rows); if(error) throw error; }
      if (snapshots.length) { const rows=snapshots.map((s:any)=>({session_id:session.id,participant_id:session.participant_id,t_ms:Math.max(0,Math.round(num(s?.tMs))),app_state:s?.state&&typeof s.state==="object"?s.state:{}})); const {error}=await db.from("session_snapshots").insert(rows); if(error) throw error; }
      const now=new Date().toISOString(); await db.from("sessions").update({last_seen_at:now}).eq("id",session.id); await db.from("participants").update({last_seen_at:now}).eq("id",session.participant_id); return json({ok:true});
    }

    if (action === "usage") {
      const session=await requireSession(String(body?.sessionId||""),String(body?.sessionToken||"")); if(!session)return json({error:"invalid_session"},403);
      const list=Array.isArray(body?.items)?body.items.slice(0,100):[]; if(list.length){const rows=list.map((u:any)=>({session_id:session.id,participant_id:session.participant_id,pattern_id:String(u?.patternId||"tentacle-orbit").slice(0,100),community_config_id:u?.communityConfigId||null,config_hash:String(u?.configHash||"").slice(0,128)||null,started_ms:Math.max(0,Math.round(num(u?.startedMs))),ended_ms:Math.max(0,Math.round(num(u?.endedMs))),duration_ms:Math.max(0,Math.round(num(u?.durationMs))),saved:Boolean(u?.saved)}));const{error}=await db.from("session_pattern_usage").insert(rows);if(error)throw error;} return json({ok:true});
    }

    if (action === "finish-session" || action === "end") {
      const session=await requireSession(String(body?.sessionId||""),String(body?.sessionToken||"")); if(!session)return json({error:"invalid_session"},403);
      const now=new Date().toISOString(); const patch:any={ended_at:now,last_seen_at:now};
      if(action==="finish-session"){patch.post_state=clamp(Math.round(num(body?.postState,3)),1,5);patch.helped=clamp(Math.round(num(body?.helped,1)),0,2);patch.feedback_at=now;patch.completed=true;patch.active_ms=Math.max(0,Math.round(num(body?.activeMs)));}
      const{error}=await db.from("sessions").update(patch).eq("id",session.id);if(error)throw error;return json({ok:true});
    }

    if (action === "community-list") {
      const session=await requireSession(String(body?.sessionId||""),String(body?.sessionToken||"")); if(!session)return json({error:"invalid_session"},403);
      return json({ok:true,items:await communityRows(session.participant_id)});
    }

    if (action === "community-save") {
      const session=await requireSession(String(body?.sessionId||""),String(body?.sessionToken||"")); if(!session)return json({error:"invalid_session"},403);
      const patternId=String(body?.patternId||"tentacle-orbit").slice(0,100); const version=clamp(Math.round(num(body?.patternVersion,1)),1,9999); const config=canonical(body?.config||{}); const hash=await configHash(patternId,version,config);
      let {data:cfg,error}=await db.from("community_configs").select("id,config_hash").eq("config_hash",hash).maybeSingle(); if(error)throw error;
      if(!cfg){const ins=await db.from("community_configs").insert({pattern_id:patternId,pattern_version:version,config_hash:hash,config,preview_frame:num(body?.previewFrame,44),created_by:session.participant_id,parent_config_id:body?.parentConfigId||null}).select("id,config_hash").maybeSingle(); if(ins.error&&ins.error.code!=="23505")throw ins.error; cfg=ins.data; if(!cfg){const q=await db.from("community_configs").select("id,config_hash").eq("config_hash",hash).single();if(q.error)throw q.error;cfg=q.data;}}
      const {error:sError}=await db.from("community_saves").upsert({config_id:cfg.id,participant_id:session.participant_id},{onConflict:"config_id,participant_id",ignoreDuplicates:true});if(sError)throw sError;
      const{count}=await db.from("community_saves").select("config_id",{count:"exact",head:true}).eq("config_id",cfg.id);return json({ok:true,communityId:cfg.id,configHash:hash,saveCount:count||0});
    }

    if (action === "community-unsave") {
      const session=await requireSession(String(body?.sessionId||""),String(body?.sessionToken||""));if(!session)return json({error:"invalid_session"},403);
      let id=String(body?.communityId||""); if(!id&&body?.config){const h=await configHash(String(body?.patternId||"tentacle-orbit"),Math.round(num(body?.patternVersion,1)),canonical(body.config));const{data}=await db.from("community_configs").select("id").eq("config_hash",h).maybeSingle();id=data?.id||"";}
      if(id){const{error}=await db.from("community_saves").delete().eq("config_id",id).eq("participant_id",session.participant_id);if(error)throw error;} return json({ok:true});
    }

    if (action === "recommendations") {
      const session=await requireSession(String(body?.sessionId||""),String(body?.sessionToken||""));if(!session)return json({error:"invalid_session"},403);
      const requestKey=String(body?.requestKey||session.request_key||""); const community=await communityRows(session.participant_id);
      const {data: goodSessions}=await db.from("sessions").select("id,participant_id,pre_state,post_state,helped").eq("request_key",requestKey).eq("completed",true).limit(1000);
      const ids=(goodSessions||[]).map((s:any)=>s.id); let usages:any[]=[]; if(ids.length){const q=await db.from("session_pattern_usage").select("session_id,participant_id,pattern_id,community_config_id,duration_ms,saved").in("session_id",ids);usages=q.data||[];}
      const bySession=new Map<string,any>(); for(const s of goodSessions||[])bySession.set(s.id,s); const totals=new Map<string,number>(); for(const u of usages)totals.set(u.session_id,(totals.get(u.session_id)||0)+Math.max(1,u.duration_ms||0));
      const scores=new Map<string,{score:number,evidence:number}>(); const patternScores=new Map<string,{score:number,evidence:number}>();
      for(const u of usages){const s=bySession.get(u.session_id);if(!s)continue;const delta=num(s.post_state)-num(s.pre_state);const outcome=delta*0.8+(num(s.helped)-1)*0.65;const share=Math.max(.08,Math.min(1,(u.duration_ms||0)/(totals.get(u.session_id)||1)));const personal=s.participant_id===session.participant_id?1.8:1;const saveBonus=u.saved?.25:0;const contribution=(outcome+saveBonus)*share*personal;const p=patternScores.get(u.pattern_id)||{score:0,evidence:0};p.score+=contribution;p.evidence+=share*personal;patternScores.set(u.pattern_id,p);if(u.community_config_id){const c=scores.get(u.community_config_id)||{score:0,evidence:0};c.score+=contribution;c.evidence+=share*personal;scores.set(u.community_config_id,c);}}
      const ranked=community.map((c:any)=>{const s=scores.get(c.id)||{score:0,evidence:0};const popularity=Math.log2(1+c.saveCount)*.15;const value=s.evidence?s.score/s.evidence:0;return{id:c.id,score:value+popularity,saveCount:c.saveCount,evidence:s.evidence};}).sort((a:any,b:any)=>b.score-a.score);
      const recommendedCommunity=ranked.slice(0,3).map((x:any)=>x.id); if(ranked.length>4){const exploratory=ranked.slice(3);const pick=exploratory[Math.floor(Math.random()*exploratory.length)];if(pick&&!recommendedCommunity.includes(pick.id))recommendedCommunity.push(pick.id);}
      const recommendedPatterns=[...patternScores.entries()].map(([id,s])=>({id,score:s.evidence?s.score/s.evidence:0,evidence:s.evidence})).sort((a,b)=>b.score-a.score).slice(0,3).map(x=>x.id);
      return json({ok:true,requestKey,recommendedCommunity,recommendedPatterns,ranked:ranked.slice(0,20)});
    }

    if (action.startsWith("admin-")) {
      if(!(await requireAdmin(String(body?.adminKey||""))))return json({error:"invalid_admin_key"},403);
      if(action==="admin-check")return json({ok:true});
      if(action==="admin-create-code"){for(let attempt=0;attempt<8;attempt++){const accessCode=randomCode();const{data,error}=await db.from("participants").insert({access_code:accessCode,label:String(body?.label||"").trim()||null}).select("id,access_code,label,created_at").maybeSingle();if(!error&&data)return json({ok:true,participant:data});if(error?.code!=="23505")throw error;}return json({error:"code_generation_failed"},500);}
      if(action==="admin-list-participants"){
        const{data:participants,error:pError}=await db.from("participants").select("id,access_code,label,active,device_hash,bound_at,created_at,last_seen_at").order("created_at",{ascending:false});if(pError)throw pError;
        const{data:sessions,error:sError}=await db.from("sessions").select("id,participant_id,started_at,ended_at,last_seen_at,active_ms,completed,request_key,pre_state,post_state,helped").order("started_at",{ascending:false});if(sError)throw sError;
        const{data:profiles}=await db.from("participant_profiles").select("participant_id,age_band,practice_experience,visual_sensitivity");const pm=new Map((profiles||[]).map((p:any)=>[p.participant_id,p]));
        const mapped=(participants||[]).map((p:any)=>{const own=(sessions||[]).filter((s:any)=>s.participant_id===p.id);const totalMs=own.reduce((sum:number,s:any)=>sum+Math.max(0,Date.parse(s.ended_at||s.last_seen_at||s.started_at)-Date.parse(s.started_at)),0);const days=new Set(own.map((s:any)=>String(s.started_at).slice(0,10))).size;return{...p,bound:Boolean(p.device_hash),device_hash:undefined,sessionCount:own.length,totalMs,activeMs:own.reduce((a:number,s:any)=>a+num(s.active_ms),0),activeDays:days,completedCount:own.filter((s:any)=>s.completed).length,profile:pm.get(p.id)||null};});return json({ok:true,participants:mapped});
      }
      if(action==="admin-list-sessions"){
        const participantId=String(body?.participantId||"");let q=db.from("sessions").select("id,participant_id,started_at,ended_at,last_seen_at,app_version,user_agent,viewport,meta,request_key,pre_state,post_state,helped,feedback_at,active_ms,completed,local_started_at").order("started_at",{ascending:false}).limit(500);if(participantId)q=q.eq("participant_id",participantId);const{data,error}=await q;if(error)throw error;return json({ok:true,sessions:data||[]});
      }
      if(action==="admin-session"){
        const sessionId=String(body?.sessionId||"");const{data:session,error}=await db.from("sessions").select("id,participant_id,started_at,ended_at,last_seen_at,app_version,user_agent,viewport,meta,request_key,pre_state,post_state,helped,feedback_at,active_ms,completed").eq("id",sessionId).single();if(error)throw error;const{data:participant}=await db.from("participants").select("id,access_code,label").eq("id",session.participant_id).single();const{data:profile}=await db.from("participant_profiles").select("age_band,practice_experience,visual_sensitivity").eq("participant_id",session.participant_id).maybeSingle();const events=await fetchAllEvents(sessionId);const{data:snapshots}=await db.from("session_snapshots").select("id,t_ms,app_state,created_at").eq("session_id",sessionId).order("t_ms").limit(2000);const{data:usage}=await db.from("session_pattern_usage").select("*").eq("session_id",sessionId).order("started_ms");return json({ok:true,participant,profile:profile||null,session,events,snapshots:snapshots||[],usage:usage||[]});
      }
      if(action==="admin-overview"){
        const{data:participants}=await db.from("participants").select("id,device_hash,created_at,last_seen_at");const{data:sessions}=await db.from("sessions").select("id,participant_id,started_at,ended_at,last_seen_at,request_key,pre_state,post_state,helped,active_ms,completed");const ps=participants||[],ss=sessions||[];const returners=new Set<string>();const grouped=new Map<string,number>();for(const s of ss)grouped.set(s.participant_id,(grouped.get(s.participant_id)||0)+1);for(const[k,v]of grouped)if(v>1)returners.add(k);const completed=ss.filter((s:any)=>s.completed);const intent:any={};for(const s of ss){const k=s.request_key||"none";if(!intent[k])intent[k]={sessions:0,completed:0,improved:0,deltaSum:0};intent[k].sessions++;if(s.completed){intent[k].completed++;const d=num(s.post_state)-num(s.pre_state);intent[k].deltaSum+=d;if(d>0||num(s.helped)>=2)intent[k].improved++;}}
        const duration=ss.reduce((a:number,s:any)=>a+Math.max(0,Date.parse(s.ended_at||s.last_seen_at||s.started_at)-Date.parse(s.started_at)),0);return json({ok:true,overview:{participants:ps.length,bound:ps.filter((p:any)=>p.device_hash).length,sessions:ss.length,returners:returners.size,completed:completed.length,totalMs:duration,activeMs:ss.reduce((a:number,s:any)=>a+num(s.active_ms),0),avgDelta:completed.length?completed.reduce((a:number,s:any)=>a+num(s.post_state)-num(s.pre_state),0)/completed.length:0,intents:intent}});
      }
      if(action==="admin-insights"){
        const community=await communityRows();const{data:sessions}=await db.from("sessions").select("id,participant_id,request_key,pre_state,post_state,helped,completed").eq("completed",true).limit(2000);const ids=(sessions||[]).map((s:any)=>s.id);let usage:any[]=[];if(ids.length){const q=await db.from("session_pattern_usage").select("session_id,pattern_id,community_config_id,duration_ms,saved").in("session_id",ids);usage=q.data||[];}const sm=new Map((sessions||[]).map((s:any)=>[s.id,s]));const rows:any={};for(const u of usage){const s:any=sm.get(u.session_id);if(!s)continue;const key=s.request_key||"none";const pid=u.community_config_id||u.pattern_id;const k=`${key}|${pid}`;if(!rows[k])rows[k]={requestKey:key,itemId:pid,patternId:u.pattern_id,communityConfigId:u.community_config_id||null,sessions:new Set(),durationMs:0,weightedDelta:0,weight:0,saves:0};const r=rows[k];r.sessions.add(u.session_id);const w=Math.max(1,u.duration_ms);r.durationMs+=w;r.weightedDelta+=(num(s.post_state)-num(s.pre_state))*w;r.weight+=w;if(u.saved)r.saves++;}const insights=Object.values(rows).map((r:any)=>({...r,sessions:r.sessions.size,avgDelta:r.weight?r.weightedDelta/r.weight:0,weightedDelta:undefined,weight:undefined})).sort((a:any,b:any)=>b.avgDelta-a.avgDelta||b.sessions-a.sessions);return json({ok:true,insights,community});
      }
      if(action==="admin-community")return json({ok:true,items:await communityRows()});
      if(action==="admin-reset-device"){const{error}=await db.from("participants").update({device_hash:null,bound_at:null}).eq("id",String(body?.participantId||""));if(error)throw error;return json({ok:true});}
      if(action==="admin-toggle-active"){const{error}=await db.from("participants").update({active:Boolean(body?.active)}).eq("id",String(body?.participantId||""));if(error)throw error;return json({ok:true});}
    }
    return json({error:"unknown_action"},400);
  } catch (error) { console.error(error); return json({error:"server_error",detail:String((error as any)?.message||error)},500); }
});