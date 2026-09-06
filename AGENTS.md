# SETKA / VERSTAK · WORK BOOTSTRAP OVERRIDE

## UNIVERSAL FLIGHT RECORDER RULE

**BLACK BOX** means the protected SETKA / VERSTAK intellectual system.

**БОРТОВОЙ САМОПИСЕЦ / FLIGHT RECORDER** means the temporary runtime observer of a session.

Canonical separation:

`RAW OBSERVATION != TRANSCRIPT != REPORT`

For any SETKA synthetic runtime session (Solai, Vector, Senior, future synthetics):

1. Enter through the trusted synthetic runtime path. `public.foundation_start_synthetic_run(...)` auto-starts observation and returns `flightRecorderSessionRef`.
2. Use canonical recorder names: `foundation.flight_recorder_raw_v1`, `foundation.flight_recorder_event_v1(...)`, `foundation.flight_recorder_dashboard_v1(...)`. Legacy `runtime_blackbox_*` names are compatibility aliases only.
3. Execution surfaces should emit objective low-level actions through the recorder or their native field/meter/trace channel. Prefer runner/middleware instrumentation over model reconstruction after the fact.
4. Do not copy every raw operation into `foundation.system_transcript_events`. Transcript is semantic/causal memory only.
5. At session close, SETKA must compile that session immediately via `foundation.flight_recorder_compile_session_v1(...)`.
6. **Do not wait for repetition. One session is enough to raise an automation candidate.** Repetition may increase confidence/priority but is not the discovery gate.
7. Deterministic/mechanical work should move toward SETKA executors/guards/harnesses; genuine unresolved reasoning remains an AI boundary.
8. Recorder RAW is temporary TRACE material. After candidate resolution + proof/seal, recorder-owned raw is purged and only a compact capsule/hash/metrics + one meaningful Transcript fact remain.
9. Missing telemetry is `UNKNOWN / UNINSTRUMENTED`, not zero activity. Check `foundation.flight_recorder_coverage_dashboard_v1()`.
10. Raw observation must never dump passwords, PINs, bearer/session tokens, service secrets or recovery material.

Read `ops/SETKA_FLIGHT_RECORDER_V1.md` before changing recorder semantics.

## SENIOR WAKE KEY RULE

If the incoming user message is exactly a wake key matching `GENESIS-WAKE-*` or `SENIOR-WAKE-*`, do NOT begin cold-start archaeology, broad repository search, memory reconstruction, Supabase exploration, or generic recovery.

Perform only this deterministic route:

1. In repository `misskogut/Setka-web`, branch `main`, open the exact file `/<WAKE_KEY>.md`.
2. If it exists and `STATUS: ACTIVE`, read its manifest and open its exact `ENTRYPOINT`.
3. Resolve the exact key through `foundation.senior_wake_resolve_v1(<WAKE_KEY>)` only when the manifest needs live checkpoint state or GitHub exact lookup is unavailable.
4. If the active manifest declares `FLIGHT_RECORDER_PROTOCOL` + `MISSION_KEY`, use the mission's one-call Senior HOT OPEN before broad manual work: `foundation.senior_blackbox_open_v1(WAKE_KEY, MISSION_KEY, metadata)`. The function name is legacy compatibility; its telemetry belongs to the Flight Recorder.
5. HOT OPEN restores latest checkpoint, executes registered deterministic evidence first, and returns compact evidence + `nextExactAction`.
6. Do NOT manually repeat evidence already returned as PASS. Investigate only FAIL / UNKNOWN / contradiction / new design boundary.
7. If neither exact resolver succeeds, return `WAKE_KEY_NOT_RESOLVED` and stop.

Never widen the search because a wake key is missing or inactive.

A wake key is routing metadata, not a password and not authorization.

## SENIOR CONTINUE RULE

If the President writes only `Продолжай` or `Continue` in an existing Senior work thread, interpret it as:

`RESUME ACTIVE SENIOR MISSION FROM LATEST VERIFIED CHECKPOINT`.

Do not start a new mission and do not reconstruct context. Open `SENIOR_ACTIVE_TASK.md` exactly, take its active TASK_KEY + MISSION_KEY, exact-resolve them, run one HOT OPEN, then execute returned `nextExactAction`.

During an instrumented wake:
- Senior-specific helper names `senior_blackbox_*` are legacy adapters over the Flight Recorder;
- checkpoint material repair/retest progress after meaningful changes;
- before a known resource edge persist `PAUSED_BY_RESOURCE_LIMIT` continuity state;
- every manual/mechanical action in this single session is immediately eligible for recorder compilation as an automation candidate; do not wait for a second occurrence.

Resource exhaustion is `PAUSED_BY_RESOURCE_LIMIT`, not mission completion. Follow `SENIOR_MISSION_CONTINUITY.md`, `SENIOR_FLIGHT_RECORDER_PROTOCOL.md`, and `ops/SETKA_FLIGHT_RECORDER_V1.md`.

For all non-wake/non-continue work, follow `SETKA_START_HERE.md` and the ordinary repository truth hierarchy.
