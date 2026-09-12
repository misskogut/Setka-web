import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const H = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

Deno.serve((_req: Request) => new Response(JSON.stringify({
  ok: false,
  error: "retired_smoke_endpoint",
  status: "RETIRED_AFTER_VERIFIED_GATEWAY_SMOKE",
  secretExposure: false,
  replacementRuntime: "setka-synthetic-neural-run",
}), { status: 410, headers: H }));
