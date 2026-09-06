# SETKA / VERSTAK · WORK BOOTSTRAP OVERRIDE

## SENIOR WAKE KEY RULE

If the incoming user message is exactly a wake key matching `GENESIS-WAKE-*` or `SENIOR-WAKE-*`, do NOT begin cold-start archaeology, broad repository search, memory reconstruction, Supabase exploration, or generic recovery.

Perform only this deterministic route:

1. In repository `misskogut/Setka-web`, branch `main`, open the exact file `/<WAKE_KEY>.md`.
2. If it exists and `STATUS: ACTIVE`, read its manifest and open its exact `ENTRYPOINT`.
3. Resolve the exact key through `foundation.senior_wake_resolve_v1(<WAKE_KEY>)` only when the manifest needs live checkpoint state or GitHub exact lookup is unavailable.
4. Read `latestCheckpoint` when present and execute its `nextExactAction` before any broader inspection.
5. If neither exact resolver succeeds, return `WAKE_KEY_NOT_RESOLVED` and stop.

Never widen the search because a wake key is missing or inactive.

A wake key is routing metadata, not a password and not authorization.

## SENIOR CONTINUE RULE

If the President writes only `Продолжай` or `Continue` in an existing Senior work thread, interpret it as:

`RESUME ACTIVE SENIOR MISSION FROM LATEST VERIFIED CHECKPOINT`.

Do not start a new mission and do not reconstruct context. Open `SENIOR_ACTIVE_TASK.md` exactly, take its active TASK_KEY, exact-resolve it, read `latestCheckpoint`, then execute `nextExactAction`.

Resource exhaustion is `PAUSED_BY_RESOURCE_LIMIT`, not mission completion. Follow `SENIOR_MISSION_CONTINUITY.md`.

For all non-wake/non-continue work, follow `SETKA_START_HERE.md` and the ordinary repository truth hierarchy.