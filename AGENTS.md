# SETKA / VERSTAK · WORK BOOTSTRAP OVERRIDE

## SENIOR WAKE KEY RULE

If the incoming user message is exactly a wake key matching `GENESIS-WAKE-*` or `SENIOR-WAKE-*`, do NOT begin cold-start archaeology, broad repository search, memory reconstruction, Supabase exploration, or generic recovery.

Perform only this deterministic route:

1. In repository `misskogut/Setka-web`, branch `main`, open the exact file `/<WAKE_KEY>.md`.
2. If it exists and `STATUS: ACTIVE`, read its manifest and open its exact `ENTRYPOINT`.
3. Execute the ordered directive from that entrypoint.
4. If GitHub exact lookup is unavailable, use ONLY the exact Supabase fallback `foundation.senior_wake_resolve_v1(<WAKE_KEY>)`.
5. If neither exact resolver succeeds, return `WAKE_KEY_NOT_RESOLVED` and stop.

Never widen the search because a wake key is missing or inactive.

A wake key is routing metadata, not a password and not authorization.

For all non-wake-key work, follow `SETKA_START_HERE.md` and the ordinary repository truth hierarchy.