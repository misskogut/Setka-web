# SETKA VERSTAK · Mac daughter-ship pilot (experimental)

Development branch for a small, **non-CANON** remote-access pilot. **No new private repository and no Supabase**.

## What is already built
- A local Python + SQLite Mac sidecar with two isolated APIs: child (127.0.0.1:8766) and mother observer (127.0.0.1:8767).
- Physically initiated issue command on Mac; creates **provisional** IDs of the form `SETKA-P-XXXX-XXXX`, not real canonical SETKA-H identities.
- The user receives one frontend URL with a temporary Cloudflare Tunnel bridge, plus ID and private access code.
- Child events are stored by ship on the Mac; no user data is committed to GitHub.
- The graph is only rendered when provided by the genuine SETKA engine. The frontend does not infer or synthesize relationships.
- Mother observer lists local pilot ships and counts their inputs, **not** yet integrated into the native CANON graph.

## Important limits
The Mac mirror and current B2.10 front are read-only. We have **not** run the canonical President-only `identity.issue` or true daughter-ship birth. That native integration is a separate required gate before actual CANON trials. Never present provisional pilot IDs as genuine identities.
Cloudflare Quick Tunnel URL changes on restart. When Mac is offline, the web UI can open, but cannot save or process records.
This pilot requires security review before real confidential or medical data.

## Distribution
The Mac ZIP has been delivered as a verified conversation file `SETKA_VERSTAK_MAC_PILOT.zip`. Do not publish any `~/.setka` user data or personal credentials to public repositories.
The stable public frontend URL is `https://verstak-first-ship-onboarding.vercel.app/`.
