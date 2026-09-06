# SETKA / VERSTAK · WORK BOOTSTRAP OVERRIDE

## UNIVERSAL RUNTIME BLACKBOX RULE

Blackbox is the universal SETKA runtime flight recorder, not a Senior-only feature.

Canonical separation:

`RAW OBSERVATION != TRANSCRIPT != REPORT`

For any SETKA synthetic runtime session (Solai, Vector, Senior, future synthetics):

1. Enter through the trusted synthetic runtime path. `public.foundation_start_synthetic_run(...)` now auto-starts raw observation and returns `blackboxSessionRef`.
2. The canonical raw tape is the existing append-only runtime/event spine projected as `foundation.runtime_blackbox_raw_v1`.
3. Execution surfaces should emit objective low-level actions through `foundation.runtime_blackbox_event_v1(...)` or their native field/meter/trace channel. Prefer runner/middleware instrumentation over the model reconstructing actions after the fact.
4. Never send each raw operation into `foundation.system_transcript_events`. Transcript is semantic/causal memory only.
5. Reports remain separate and are compared against raw evidence through `foundation.runtime_blackbox_report_reconciliation_v1`.
6. Use `foundation.runtime_blackbox_dashboard_v1(actorIdentityRef, sessionRef)` for derived self-observation, repetition and optimization metrics.
7. Missing telemetry is `UNKNOWN / UNINSTRUMENTED`, not zero activity.
8. Raw observation must not dump passwords, PIN values, bearer/session tokens, service secrets or recovery material. Record safe operation metadata/evidence refs instead.

Read `ops/SETKA_RUNTIME_BLACKBOX_RAW_V1.md` before changing runtime observation semantics.

## SENIOR WAKE KEY RULE

If the incoming user message is exactly a wake key matching `GENESIS-WAKE-*` or `SENIOR-WAKE-*`, do NOT begin cold-start archaeology, broad repository search, memory reconstruction, Supabase exploration, or generic recovery.

Perform only this deterministic route:

1. In repository `misskogut/Setka-web`, branch `main`, open the exact file `/<WAKE_KEY>.md`.
2. If it exists and `STATUS: ACTIVE`, read its manifest and open its exact `ENTRYPOINT`.
3. Resolve the exact key through `foundation.senior_wake_resolve_v1(<WAKE_KEY>)` only when the manifest needs live checkpoint state or GitHub exact lookup is unavailable.
4. If the active manifest declares `BLACKBOX_PROTOCOL` + `MISSION_KEY`, use the mission's one-call HOT OPEN before broad manual work:
   `foundation.senior_blackbox_open_v1(WAKE_KEY, MISSION_KEY, metadata)`.
5. HOT OPEN is the Senior mission adapter: it restores latest checkpoint, executes registered deterministic evidence first, and returns compact evidence + `nextExactAction`. Its work telemetry belongs to the universal runtime Blackbox layer above.
6. Do NOT manually repeat evidence already returned as PASS. Investigate only FAIL / UNKNOWN / contradiction / new design boundary.
7. If neither exact resolver succeeds, return `WAKE_KEY_NOT_RESOLVED` and stop.

Never widen the search because a wake key is missing or inactive.

A wake key is routing metadata, not a password and not authorization.

## SENIOR CONTINUE RULE

If the President writes only `Продолжай` or `Continue` in an existing Senior work thread, interpret it as:

`RESUME ACTIVE SENIOR MISSION FROM LATEST VERIFIED CHECKPOINT`.

Do not start a new mission and do not reconstruct context. Open `SENIOR_ACTIVE_TASK.md` exactly, take its active TASK_KEY + MISSION_KEY, exact-resolve them, run one HOT OPEN when the active task is Blackbox-instrumented, then execute returned `nextExactAction`.

During an instrumented wake:
- mark meaningful Senior-specific phase transitions with `foundation.senior_blackbox_transition_v1(...)`;
- checkpoint material repair/retest progress with `foundation.senior_blackbox_checkpoint_v1(...)`;
- before a known resource edge call `foundation.senior_blackbox_pause_v1(...)`.

These Senior helpers are adapters over the universal raw observer, not a separate raw history.

Resource exhaustion is `PAUSED_BY_RESOURCE_LIMIT`, not mission completion. Follow `SENIOR_MISSION_CONTINUITY.md` and `SENIOR_BLACKBOX_EYE_PROTOCOL.md` when declared by the active manifest.

For all non-wake/non-continue work, follow `SETKA_START_HERE.md` and the ordinary repository truth hierarchy.