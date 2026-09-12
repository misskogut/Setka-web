import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const INTENTS: Record<string,string> = {
  sleep: "Уснуть",
  relax: "Расслабиться",
  tension: "Снизить напряжение",
  focus: "Сконцентрироваться",
  energy: "Взбодриться",
  switch: "Переключиться",
  explore: "Просто исследую",
};

function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: cors }); }
function n(v: unknown) { const x = Number(v); return Number.isFinite(x) ? x : 0; }
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function optionalParticipant(sessionId: string, token: string) {
  if (!sessionId || !token) return null;
  const tokenHash = await sha256(token);
  const { data } = await db.from("sessions").select("participant_id").eq("id", sessionId).eq("session_token_hash", tokenHash).maybeSingle();
  return data?.participant_id || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const patternId = String(body?.patternId || "tentacle-orbit").slice(0, 100);
    const communityConfigId = String(body?.communityConfigId || "").trim() || null;
    const participantId = await optionalParticipant(String(body?.sessionId || ""), String(body?.sessionToken || ""));

    let uq = db.from("session_pattern_usage").select("session_id,participant_id,duration_ms,saved,community_config_id,pattern_id").eq("pattern_id", patternId).limit(5000);
    if (communityConfigId) uq = uq.eq("community_config_id", communityConfigId);
    const { data: usage, error: uErr } = await uq;
    if (uErr) throw uErr;

    const usageRows = usage || [];
    const perSession = new Map<string, { participantId:string, durationMs:number, saved:boolean }>();
    for (const r of usageRows as any[]) {
      const cur = perSession.get(r.session_id) || { participantId: r.participant_id, durationMs: 0, saved: false };
      cur.durationMs += Math.max(0, n(r.duration_ms));
      cur.saved = cur.saved || Boolean(r.saved);
      perSession.set(r.session_id, cur);
    }

    const sessionIds = [...perSession.keys()];
    let sessions:any[] = [];
    for (let i = 0; i < sessionIds.length; i += 500) {
      const batch = sessionIds.slice(i, i + 500);
      if (!batch.length) continue;
      const { data, error } = await db.from("sessions").select("id,participant_id,request_key,pre_state,post_state,helped,completed").in("id", batch);
      if (error) throw error;
      sessions.push(...(data || []));
    }

    const intentCounts = new Map<string,number>();
    let completed = 0, deltaSum = 0, improved = 0, helpedYes = 0;
    const people = new Set<string>();
    let totalUsageMs = 0;
    let ownSessions = 0, ownUsageMs = 0;
    for (const s of sessions) {
      const u = perSession.get(s.id);
      if (!u) continue;
      people.add(s.participant_id);
      totalUsageMs += u.durationMs;
      if (participantId && s.participant_id === participantId) { ownSessions++; ownUsageMs += u.durationMs; }
      const key = String(s.request_key || "explore");
      intentCounts.set(key, (intentCounts.get(key) || 0) + 1);
      if (s.completed && s.pre_state != null && s.post_state != null) {
        completed++;
        const d = n(s.post_state) - n(s.pre_state);
        deltaSum += d;
        if (d > 0 || n(s.helped) >= 2) improved++;
        if (n(s.helped) >= 2) helpedYes++;
      }
    }

    const intentTotal = [...intentCounts.values()].reduce((a,b)=>a+b,0);
    const topIntents = [...intentCounts.entries()].map(([key,count]) => ({
      key,
      label: INTENTS[key] || key,
      count,
      share: intentTotal ? count / intentTotal : 0,
    })).sort((a,b)=>b.count-a.count).slice(0,4);

    let saveCount = 0;
    if (communityConfigId) {
      const { count } = await db.from("community_saves").select("config_id", { count: "exact", head: true }).eq("config_id", communityConfigId);
      saveCount = count || 0;
    } else {
      const { data: configs } = await db.from("community_configs").select("id").eq("pattern_id", patternId).limit(500);
      const ids = (configs || []).map((x:any)=>x.id);
      if (ids.length) {
        const { data: saves } = await db.from("community_saves").select("participant_id,config_id").in("config_id", ids).limit(10000);
        saveCount = new Set((saves || []).map((x:any)=>x.participant_id)).size;
      }
    }

    return json({
      ok: true,
      scope: communityConfigId ? "configuration" : "pattern",
      patternId,
      communityConfigId,
      stats: {
        sessions: perSession.size,
        participants: people.size,
        completed,
        totalUsageMs,
        saveCount,
        avgDelta: completed ? deltaSum / completed : null,
        improvedRate: completed ? improved / completed : null,
        helpedYesRate: completed ? helpedYes / completed : null,
        ownSessions: participantId ? ownSessions : null,
        ownUsageMs: participantId ? ownUsageMs : null,
        topIntents,
      }
    });
  } catch (e) {
    console.error(e);
    return json({ error: "server_error", detail: String((e as any)?.message || e) }, 500);
  }
});