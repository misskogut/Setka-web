import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store"},
});

async function sha256Hex(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map((b)=>b.toString(16).padStart(2,"0")).join("");
}

async function rpc(name: string, payload: Record<string, unknown>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method:"POST",
    headers:{"apikey":SERVICE_ROLE,"authorization":`Bearer ${SERVICE_ROLE}`,"content-type":"application/json"},
    body:JSON.stringify(payload),
  });
  const text = await r.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = {ok:false,state:"INTERNAL_RPC_NON_JSON"}; }
  if (!r.ok) return {ok:false,state:"INTERNAL_RPC_HTTP_ERROR",httpStatus:r.status,detail:data};
  return data;
}

function bearer(req: Request, body: Record<string, unknown>): string {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return String(body.token ?? "");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405,{ok:false,state:"METHOD_NOT_ALLOWED"});
  if (!SUPABASE_URL || !SERVICE_ROLE) return json(500,{ok:false,state:"SERVER_CONFIGURATION_MISSING"});
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400,{ok:false,state:"INVALID_JSON"}); }
  const action = String(body.action ?? "read_active");
  const deviceRef = String(body.deviceRef ?? "").trim();
  if (!/^MAC-[A-Z0-9][A-Z0-9._-]{6,127}$/.test(deviceRef)) return json(400,{ok:false,state:"INVALID_DEVICE_REF"});

  if (action === "pair") {
    const token = String(body.token ?? "");
    const pairingCode = String(body.pairingCode ?? "").trim();
    if (token.length < 32 || pairingCode.length < 8) return json(400,{ok:false,state:"INVALID_PAIRING_INPUT"});
    const result = await rpc("setka_mac_pair_device_internal_v1", {
      p_device_ref:deviceRef,
      p_token_hash:await sha256Hex(token),
      p_code_hash:await sha256Hex(pairingCode),
    });
    return json(result.ok===true?200:403,result);
  }

  const token = bearer(req, body);
  if (token.length < 32) return json(401,{ok:false,state:"DEVICE_TOKEN_MISSING"});
  const tokenHash = await sha256Hex(token);

  if (action === "read_active") {
    const result = await rpc("setka_mac_device_transfer_read_internal_v2", {
      p_device_ref:deviceRef,
      p_token_hash:tokenHash,
    });
    return json(result.ok===true?200:403,result);
  }

  if (action === "mirror_manifest") {
    const result = await rpc("setka_mac_full_mirror_manifest_internal_v1", {
      p_device_ref:deviceRef,
      p_token_hash:tokenHash,
    });
    return json(result.ok===true?200:403,result);
  }

  if (action === "mirror_chunk") {
    const schemaName = String(body.schemaName ?? "");
    const tableName = String(body.tableName ?? "");
    const cursor = (body.cursor && typeof body.cursor === "object") ? body.cursor : null;
    const offset = Number(body.offset ?? 0);
    const limit = Number(body.limit ?? 200);
    const includeCount = body.includeCount === true;
    const result = await rpc("setka_mac_full_mirror_chunk_internal_v1", {
      p_device_ref:deviceRef,
      p_token_hash:tokenHash,
      p_schema_name:schemaName,
      p_table_name:tableName,
      p_cursor:cursor,
      p_offset:Number.isFinite(offset)?Math.max(0,Math.trunc(offset)):0,
      p_limit:Number.isFinite(limit)?Math.max(1,Math.min(500,Math.trunc(limit))):200,
      p_include_count:includeCount,
    });
    return json(result.ok===true?200:403,result);
  }

  if (action === "mirror_schema") {
    const kind = String(body.kind ?? "");
    const offset = Number(body.offset ?? 0);
    const limit = Number(body.limit ?? 50);
    const result = await rpc("setka_mac_full_mirror_schema_page_internal_v1", {
      p_device_ref:deviceRef,
      p_token_hash:tokenHash,
      p_kind:kind,
      p_offset:Number.isFinite(offset)?Math.max(0,Math.trunc(offset)):0,
      p_limit:Number.isFinite(limit)?Math.max(1,Math.min(100,Math.trunc(limit))):50,
    });
    return json(result.ok===true?200:403,result);
  }

  if (action === "mirror_receipt") {
    const result = await rpc("setka_mac_full_mirror_receipt_internal_v1", {
      p_device_ref:deviceRef,
      p_token_hash:tokenHash,
      p_code_commit:body.codeCommit ? String(body.codeCommit) : null,
      p_source_transcript_tip:body.sourceTranscriptTip == null ? null : Number(body.sourceTranscriptTip),
      p_source_generated_at:body.sourceGeneratedAt ? String(body.sourceGeneratedAt) : null,
      p_table_count:Number(body.tableCount ?? 0),
      p_row_count:Number(body.rowCount ?? 0),
      p_local_bytes:Number(body.localBytes ?? 0),
      p_manifest_sha256:body.manifestSha256 ? String(body.manifestSha256) : null,
      p_local_db_sha256:body.localDbSha256 ? String(body.localDbSha256) : null,
      p_state:String(body.state ?? "FAIL_FULL_SETKA_MIRROR"),
      p_details:(body.details && typeof body.details === "object") ? body.details : {},
    });
    return json(result.ok===true?200:403,result);
  }

  return json(400,{ok:false,state:"UNKNOWN_ACTION"});
});
