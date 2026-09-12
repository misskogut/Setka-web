// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const H = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function J(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: H }); }
function N(v, fallback = 0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function C(v, min, max) { return Math.min(max, Math.max(min, v)); }
function T(v, max = 120) { return String(v ?? "").trim().slice(0, max); }

async function sha(v) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function requireSession(id, token) {
  if (!id || !token) return null;
  const h = await sha(token);
  const { data } = await db.from("sessions")
    .select("id,participant_id,request_key,pre_state,research_started")
    .eq("id", id).eq("session_token_hash", h).maybeSingle();
  return data || null;
}

async function requireAdmin(key) {
  if (!key) return false;
  const h = await sha(key.trim());
  const { data } = await db.from("admin_keys").select("id")
    .eq("key_hash", h).eq("active", true).maybeSingle();
  return Boolean(data);
}

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = n => {
    const a = new Uint8Array(n); crypto.getRandomValues(a);
    return Array.from(a, b => alphabet[b % alphabet.length]).join("");
  };
  return `STK-${part(4)}-${part(4)}`;
}

async function createInvite(invitedBy) {
  for (let i = 0; i < 10; i++) {
    const accessCode = randomCode();
    const { data, error } = await db.from("participants")
      .insert({ access_code: accessCode, invited_by: invitedBy })
      .select("id,access_code,created_at,invited_by").maybeSingle();
    if (!error && data) return data;
    if (error?.code !== "23505") throw error;
  }
  throw new Error("code_generation_failed");
}

async function getSymptoms(participantId) {
  const { data: list, error } = await db.from("participant_symptoms")
    .select("id,symptom_key,name,name_norm,active,created_at,updated_at")
    .eq("participant_id", participantId).order("created_at");
  if (error) throw error;
  const ids = (list || []).map(x => x.id);
  let rows = [];
  if (ids.length) {
    const q = await db.from("symptom_checkins")
      .select("id,symptom_id,session_id,phase,intensity,observed_at,local_offset_minutes")
      .eq("participant_id", participantId).in("symptom_id", ids)
      .order("observed_at", { ascending: false }).limit(2000);
    if (q.error) throw q.error;
    rows = q.data || [];
  }
  const last = new Map();
  const counts = new Map();
  for (const r of rows) {
    counts.set(r.symptom_id, (counts.get(r.symptom_id) || 0) + 1);
    if (!last.has(r.symptom_id)) last.set(r.symptom_id, r);
  }
  return (list || []).map(x => ({
    ...x,
    lastCheckin: last.get(x.id) || null,
    checkinCount: counts.get(x.id) || 0,
  }));
}

function summarize(rows = []) {
  const avg = rows.length ? rows.reduce((a, x) => a + N(x.intensity), 0) / rows.length : 0;
  const peak = rows.length ? Math.max(...rows.map(x => N(x.intensity))) : 0;
  const pairs = new Map();
  for (const x of rows) {
    if (!x.session_id || !["pre", "post"].includes(x.phase)) continue;
    const p = pairs.get(x.session_id) || {};
    p[x.phase] = N(x.intensity);
    pairs.set(x.session_id, p);
  }
  const deltas = [...pairs.values()]
    .filter(p => p.pre != null && p.post != null)
    .map(p => p.pre - p.post);
  return {
    count: rows.length,
    avgIntensity: avg,
    peak,
    sessionPairs: deltas.length,
    avgSessionDrop: deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0,
    improvedSessions: deltas.filter(x => x > 0).length,
    worsenedSessions: deltas.filter(x => x < 0).length,
    unchangedSessions: deltas.filter(x => x === 0).length,
  };
}

async function getInviteStats(participantId) {
  const { data: children, error } = await db.from("participants")
    .select("id,access_code,device_hash,created_at,last_seen_at")
    .eq("invited_by", participantId).order("created_at", { ascending: false });
  if (error) throw error;
  const ids = (children || []).map(x => x.id);
  let sessions = [];
  let grandchildren = [];
  if (ids.length) {
    sessions = (await db.from("sessions").select("participant_id,id")
      .in("participant_id", ids).eq("research_started", true)).data || [];
    grandchildren = (await db.from("participants").select("id,invited_by")
      .in("invited_by", ids)).data || [];
  }
  const sessionCounts = new Map();
  for (const s of sessions) sessionCounts.set(s.participant_id, (sessionCounts.get(s.participant_id) || 0) + 1);
  const branchParents = new Set(grandchildren.map(x => x.invited_by));
  return {
    created: (children || []).length,
    activated: (children || []).filter(x => x.device_hash).length,
    repeaters: (children || []).filter(x => (sessionCounts.get(x.id) || 0) >= 2).length,
    branches: branchParents.size,
    children: (children || []).map(x => ({
      id: x.id,
      code: x.access_code,
      activated: Boolean(x.device_hash),
      sessions: sessionCounts.get(x.id) || 0,
      hasInvited: branchParents.has(x.id),
      createdAt: x.created_at,
      lastSeenAt: x.last_seen_at,
    })),
  };
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: H });
  if (req.method !== "POST") return J({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json();
    const action = String(body?.action || "");

    if (action === "profile-save") {
      const s = await requireSession(T(body.sessionId), T(body.sessionToken));
      if (!s) return J({ error: "invalid_session" }, 403);
      const p = body.profile || {};
      const row = {
        participant_id: s.participant_id,
        age_band: T(p.ageBand ?? p.age_band, 40) || null,
        practice_experience: T(p.practiceExperience ?? p.practice_experience, 40) || null,
        visual_sensitivity: T(p.visualSensitivity ?? p.visual_sensitivity, 40) || null,
        updated_at: new Date().toISOString(),
      };
      const q = await db.from("participant_profiles").upsert(row, { onConflict: "participant_id" });
      if (q.error) throw q.error;
      return J({ ok: true });
    }

    if (action === "research-start") {
      const s = await requireSession(T(body.sessionId), T(body.sessionToken));
      if (!s) return J({ error: "invalid_session" }, 403);
      const local = body.localStartedAt ? new Date(body.localStartedAt) : new Date();
      const q = await db.from("sessions").update({
        research_started: true,
        local_started_at: Number.isNaN(local.getTime()) ? new Date().toISOString() : local.toISOString(),
      }).eq("id", s.id);
      if (q.error) throw q.error;
      return J({ ok: true });
    }

    if (action === "symptom-list") {
      const s = await requireSession(T(body.sessionId), T(body.sessionToken));
      if (!s) return J({ error: "invalid_session" }, 403);
      return J({ ok: true, items: await getSymptoms(s.participant_id) });
    }

    if (action === "symptom-add") {
      const s = await requireSession(T(body.sessionId), T(body.sessionToken));
      if (!s) return J({ error: "invalid_session" }, 403);
      const name = T(body.name, 80);
      if (!name) return J({ error: "missing_symptom_name" }, 400);
      const norm = name.toLowerCase();
      const existing = await db.from("participant_symptoms").select("id")
        .eq("participant_id", s.participant_id).eq("name_norm", norm).maybeSingle();
      let item;
      if (existing.data) {
        const q = await db.from("participant_symptoms")
          .update({ active: true, updated_at: new Date().toISOString() })
          .eq("id", existing.data.id)
          .select("id,symptom_key,name,name_norm,active,created_at,updated_at").single();
        if (q.error) throw q.error;
        item = q.data;
      } else {
        const q = await db.from("participant_symptoms").insert({
          participant_id: s.participant_id,
          symptom_key: T(body.symptomKey, 60) || null,
          name,
        }).select("id,symptom_key,name,name_norm,active,created_at,updated_at").single();
        if (q.error) throw q.error;
        item = q.data;
      }
      return J({ ok: true, item });
    }

    if (action === "symptom-toggle") {
      const s = await requireSession(T(body.sessionId), T(body.sessionToken));
      if (!s) return J({ error: "invalid_session" }, 403);
      const q = await db.from("participant_symptoms")
        .update({ active: Boolean(body.active), updated_at: new Date().toISOString() })
        .eq("id", T(body.symptomId, 80)).eq("participant_id", s.participant_id);
      if (q.error) throw q.error;
      return J({ ok: true });
    }

    if (action === "symptom-checkins") {
      const s = await requireSession(T(body.sessionId), T(body.sessionToken));
      if (!s) return J({ error: "invalid_session" }, 403);
      const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
      const ids = [...new Set(items.map(x => T(x.symptomId, 80)).filter(Boolean))];
      if (!ids.length) return J({ ok: true, count: 0 });
      const own = await db.from("participant_symptoms").select("id")
        .eq("participant_id", s.participant_id).in("id", ids);
      if (own.error) throw own.error;
      const allowed = new Set((own.data || []).map(x => x.id));
      const rows = items.filter(x => allowed.has(T(x.symptomId, 80))).map(x => {
        const phase = ["pre", "post", "standalone"].includes(String(x.phase)) ? String(x.phase) : "standalone";
        const standalone = phase === "standalone" || Boolean(x.standalone);
        const d = x.observedAt ? new Date(x.observedAt) : new Date();
        return {
          participant_id: s.participant_id,
          symptom_id: T(x.symptomId, 80),
          session_id: standalone ? null : s.id,
          phase,
          intensity: C(Math.round(N(x.intensity)), 0, 10),
          observed_at: Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(),
          local_offset_minutes: Number.isFinite(Number(x.localOffsetMinutes)) ? Math.round(Number(x.localOffsetMinutes)) : null,
          note: T(x.note, 300) || null,
        };
      });
      if (rows.length) {
        const q = await db.from("symptom_checkins").insert(rows);
        if (q.error) throw q.error;
      }
      return J({ ok: true, count: rows.length });
    }

    if (action === "symptom-history") {
      const s = await requireSession(T(body.sessionId), T(body.sessionToken));
      if (!s) return J({ error: "invalid_session" }, 403);
      const symptomId = T(body.symptomId, 80);
      const sym = await db.from("participant_symptoms")
        .select("id,name,symptom_key,active,created_at")
        .eq("id", symptomId).eq("participant_id", s.participant_id).maybeSingle();
      if (sym.error) throw sym.error;
      if (!sym.data) return J({ error: "symptom_not_found" }, 404);
      let q = db.from("symptom_checkins")
        .select("id,symptom_id,session_id,phase,intensity,observed_at,local_offset_minutes,note")
        .eq("participant_id", s.participant_id).eq("symptom_id", symptomId)
        .order("observed_at", { ascending: true }).limit(3000);
      const days = C(Math.round(N(body.days, 0)), 0, 3650);
      if (days > 0) q = q.gte("observed_at", new Date(Date.now() - days * 86400000).toISOString());
      const r = await q;
      if (r.error) throw r.error;
      return J({ ok: true, symptom: sym.data, items: r.data || [], summary: summarize(r.data || []) });
    }

    if (action === "invite-create") {
      const s = await requireSession(T(body.sessionId), T(body.sessionToken));
      if (!s) return J({ error: "invalid_session" }, 403);
      const stats = await getInviteStats(s.participant_id);
      if (stats.created >= 50) return J({ error: "invite_limit" }, 429);
      const invite = await createInvite(s.participant_id);
      return J({ ok: true, invite, stats: await getInviteStats(s.participant_id) });
    }

    if (action === "invite-stats") {
      const s = await requireSession(T(body.sessionId), T(body.sessionToken));
      if (!s) return J({ error: "invalid_session" }, 403);
      return J({ ok: true, stats: await getInviteStats(s.participant_id) });
    }

    if (action.startsWith("admin-")) {
      if (!(await requireAdmin(T(body.adminKey, 300)))) return J({ error: "invalid_admin_key" }, 403);

      if (action === "admin-overview-v4") {
        const participants = (await db.from("participants").select("id,device_hash,invited_by")).data || [];
        const sessions = (await db.from("sessions")
          .select("id,participant_id,started_at,ended_at,last_seen_at,request_key,pre_state,post_state,helped,active_ms,completed")
          .eq("research_started", true)).data || [];
        const symptomTrackers = (await db.from("participant_symptoms").select("id", { count: "exact", head: true }).eq("active", true)).count || 0;
        const symptomCheckins = (await db.from("symptom_checkins").select("id", { count: "exact", head: true })).count || 0;
        const grouped = new Map(); const returners = new Set();
        for (const s of sessions) grouped.set(s.participant_id, (grouped.get(s.participant_id) || 0) + 1);
        for (const [id, n] of grouped) if (n > 1) returners.add(id);
        const completed = sessions.filter(x => x.completed);
        const intents = {};
        for (const s of sessions) {
          const k = s.request_key || "none";
          if (!intents[k]) intents[k] = { sessions: 0, completed: 0, improved: 0, deltaSum: 0 };
          intents[k].sessions++;
          if (s.completed) {
            intents[k].completed++;
            const d = N(s.post_state) - N(s.pre_state);
            intents[k].deltaSum += d;
            if (d > 0 || N(s.helped) >= 2) intents[k].improved++;
          }
        }
        return J({ ok: true, overview: {
          participants: participants.length,
          bound: participants.filter(x => x.device_hash).length,
          sessions: sessions.length,
          returners: returners.size,
          completed: completed.length,
          activeMs: sessions.reduce((a, x) => a + N(x.active_ms), 0),
          avgDelta: completed.length ? completed.reduce((a, x) => a + N(x.post_state) - N(x.pre_state), 0) / completed.length : 0,
          intents,
          inviteTotal: participants.filter(x => x.invited_by).length,
          inviteActivated: participants.filter(x => x.invited_by && x.device_hash).length,
          symptomTrackers,
          symptomCheckins,
        }});
      }

      if (action === "admin-participants-v4") {
        const participants = (await db.from("participants")
          .select("id,access_code,label,active,device_hash,bound_at,created_at,last_seen_at,invited_by")
          .order("created_at", { ascending: false })).data || [];
        const sessions = (await db.from("sessions")
          .select("id,participant_id,started_at,active_ms,completed")
          .eq("research_started", true)).data || [];
        const profiles = (await db.from("participant_profiles")
          .select("participant_id,age_band,practice_experience,visual_sensitivity")).data || [];
        const symptomRows = (await db.from("participant_symptoms").select("participant_id,id,active")).data || [];
        const pm = new Map(profiles.map(x => [x.participant_id, x]));
        const inviteCounts = new Map();
        for (const p of participants) if (p.invited_by) inviteCounts.set(p.invited_by, (inviteCounts.get(p.invited_by) || 0) + 1);
        const symptomCounts = new Map();
        for (const s of symptomRows) if (s.active) symptomCounts.set(s.participant_id, (symptomCounts.get(s.participant_id) || 0) + 1);
        const mapped = participants.map(p => {
          const own = sessions.filter(x => x.participant_id === p.id);
          return {
            ...p,
            bound: Boolean(p.device_hash),
            device_hash: undefined,
            sessionCount: own.length,
            activeDays: new Set(own.map(x => String(x.started_at).slice(0, 10))).size,
            activeMs: own.reduce((a, x) => a + N(x.active_ms), 0),
            completedCount: own.filter(x => x.completed).length,
            profile: pm.get(p.id) || null,
            inviteCount: inviteCounts.get(p.id) || 0,
            symptomCount: symptomCounts.get(p.id) || 0,
          };
        });
        return J({ ok: true, participants: mapped });
      }

      if (action === "admin-sessions-v4") {
        const participantId = T(body.participantId, 80);
        let q = db.from("sessions")
          .select("id,participant_id,started_at,ended_at,last_seen_at,app_version,request_key,pre_state,post_state,helped,feedback_at,active_ms,completed,local_started_at")
          .eq("research_started", true).order("started_at", { ascending: false }).limit(1000);
        if (participantId) q = q.eq("participant_id", participantId);
        const r = await q;
        if (r.error) throw r.error;
        return J({ ok: true, sessions: r.data || [] });
      }

      if (action === "admin-invites") {
        const participants = (await db.from("participants")
          .select("id,access_code,label,invited_by,device_hash,created_at,last_seen_at").order("created_at")).data || [];
        const sessions = (await db.from("sessions").select("participant_id,id").eq("research_started", true)).data || [];
        const counts = new Map(); const kids = new Map();
        for (const s of sessions) counts.set(s.participant_id, (counts.get(s.participant_id) || 0) + 1);
        for (const p of participants) {
          if (!p.invited_by) continue;
          const a = kids.get(p.invited_by) || [];
          a.push(p.id); kids.set(p.invited_by, a);
        }
        return J({ ok: true, items: participants.map(p => ({
          id: p.id, code: p.access_code, label: p.label,
          invitedBy: p.invited_by || null,
          activated: Boolean(p.device_hash),
          sessions: counts.get(p.id) || 0,
          createdAt: p.created_at, lastSeenAt: p.last_seen_at,
          inviteCount: (kids.get(p.id) || []).length,
        })) });
      }

      if (action === "admin-symptoms") {
        const symptomRows = (await db.from("participant_symptoms")
          .select("id,participant_id,name,name_norm,active,created_at")).data || [];
        const ids = symptomRows.map(x => x.id);
        let checks = [];
        if (ids.length) checks = (await db.from("symptom_checkins")
          .select("id,symptom_id,participant_id,session_id,phase,intensity,observed_at")
          .in("symptom_id", ids).order("observed_at")).data || [];
        const byName = new Map(); const idToName = new Map();
        for (const s of symptomRows) {
          const k = s.name_norm || s.name.toLowerCase();
          const r = byName.get(k) || { name: s.name, trackers: new Set(), ids: [], rows: [] };
          r.trackers.add(s.participant_id); r.ids.push(s.id); byName.set(k, r); idToName.set(s.id, k);
        }
        for (const c of checks) { const k = idToName.get(c.symptom_id); if (k) byName.get(k).rows.push(c); }
        const items = [...byName.entries()].map(([key, r]) => ({
          key, name: r.name, trackers: r.trackers.size, ...summarize(r.rows),
        })).sort((a, b) => b.trackers - a.trackers || b.count - a.count);
        return J({ ok: true, items });
      }

      if (action === "admin-participant-symptoms") {
        const participantId = T(body.participantId, 80);
        const list = await getSymptoms(participantId);
        const out = [];
        for (const s of list) {
          const rows = (await db.from("symptom_checkins")
            .select("id,symptom_id,session_id,phase,intensity,observed_at,local_offset_minutes")
            .eq("participant_id", participantId).eq("symptom_id", s.id)
            .order("observed_at").limit(3000)).data || [];
          out.push({ ...s, history: rows, summary: summarize(rows) });
        }
        return J({ ok: true, items: out });
      }

      if (action === "admin-session-symptoms") {
        const rows = (await db.from("symptom_checkins")
          .select("id,symptom_id,phase,intensity,observed_at,participant_symptoms(name)")
          .eq("session_id", T(body.sessionId, 80)).order("observed_at")).data || [];
        return J({ ok: true, items: rows });
      }
    }

    return J({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error(e);
    return J({ error: "server_error", detail: String(e?.message || e) }, 500);
  }
});