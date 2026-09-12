/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.4";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

const text = (value: unknown, max = 300) =>
  String(value ?? "").trim().slice(0, max);

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function isAdmin(adminKey: string) {
  if (!adminKey) return false;

  const { data, error } = await db
    .from("admin_keys")
    .select("id")
    .eq("key_hash", await sha256(adminKey))
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function catalog() {
  const { data, error } = await db.rpc("setka_v34_entity_catalog");
  if (error) throw error;
  return data ?? { patterns: [], communityConfigs: [] };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await request.json();
    const adminKey = text(body.adminKey);

    if (!(await isAdmin(adminKey))) {
      return json({ error: "invalid_admin_key" }, 403);
    }

    if (text(body.action, 80) !== "catalog") {
      return json({ error: "unknown_action" }, 400);
    }

    return json({ ok: true, ...(await catalog()) });
  } catch (error) {
    console.error(error);
    return json(
      { error: "server_error", detail: String(error?.message ?? error) },
      500,
    );
  }
});
