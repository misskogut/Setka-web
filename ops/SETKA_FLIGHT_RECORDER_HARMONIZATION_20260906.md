# SETKA · БОРТОВОЙ САМОПИСЕЦ · STRUCTURAL HARMONIZATION 2026-09-06

STATUS: IMPLEMENTED + VERIFIED
OWNER: PRESIDENT_SETKA
CANONICAL_PROTOCOL: `ops/SETKA_FLIGHT_RECORDER_V1.md`

## Purpose

This is an implementation record, not a new runtime organ.

The goal of this pass was to make the Flight Recorder participate in existing SETKA contours instead of creating parallel registries, lifecycles, capability stores, or front-trace databases.

Canonical law:

`OBSERVE THROUGH EXISTING EXECUTION CONTOURS -> COMPILE ONE SESSION -> ROUTE AUTOMATION INTO EXISTING AUTOMATION/CAPABILITY CONTOURS -> PROVE -> PURGE RECORDER-OWNED RAW`

## 1. Canonical contour map

### Runtime lifecycle

Canonical execution lifecycle:

`foundation.synthetic_runs`

Senior wake is no longer a parallel runtime lifecycle. The Senior wake adapter now opens a normal trusted synthetic run and uses that run UUID as the same `sessionRef` for:

- Senior mission/wake adapter state;
- Flight Recorder raw phases;
- resource accounting;
- session compiler/seal/purge.

Senior-specific entities remain only where their semantics are genuinely mission-specific:

- wake routing;
- mission checkpoint continuity;
- Genesis evidence executor;
- repair/retest workflow.

They are adapters over the canonical runtime, not another runtime.

Resource-window pause is represented as:

- mission/checkpoint state: `PAUSED_BY_RESOURCE_LIMIT`;
- the concrete transport/model-window `synthetic_run`: closed incomplete with `status=failed` and explicit `completionKind=RESOURCE_PAUSE`, `missionContinues=true`.

This preserves the existing executive completion contract: `passed` remains reserved for a genuinely completed executive run with its required report/heart evidence.

### Raw observation

Canonical recorder projection:

`foundation.flight_recorder_raw_v1`

It reuses existing channels rather than copying them to a second permanent raw database:

- `foundation.events` / `foundation.synthetic_runs` — lifecycle;
- `foundation.session_runtime_phase_events` — instrumented runtime phases/actions;
- `foundation.synthetic_mission_meter_events` — mission activity;
- `foundation.synthetic_field_events` — field/tool activity;
- `diamond.interaction_trace_chunks` — front interaction/request traces.

Recorder-owned phase/action rows are temporary TRACE and explicitly marked `FLIGHT_RECORDER_RAW`.

### Automation queue

Canonical unresolved-work queue:

`foundation.automation_gap_signals`

A first observed manual/mechanical/executable path may raise a candidate immediately. Repetition is not required for discovery.

### Automation/capability registry

Canonical automation registry:

`foundation.automation_assets`

Canonical contour binding:

`foundation.automation_contour_bindings`

Canonical capability projection:

`foundation.system_capability_library_v1`

The temporary duplicate `foundation.flight_recorder_automation_registry` was removed.

`foundation.flight_recorder_register_automation_v1(...)` now writes verified transfers into `automation_assets` and binds them to the existing SETKA automation contour.

`foundation.flight_recorder_apply_registered_automations_v1(...)` resolves candidates through `automation_assets`.

### Flight Recorder capabilities in the system contour

The existing functions are registered as ordinary system automation assets and bound `SYSTEM / SETKA / SUPPORTS`:

- `foundation.flight_recorder_event_v1`
- `foundation.flight_recorder_compile_session_v1`
- `foundation.flight_recorder_finalize_ready_sessions_v1`

They therefore appear in the normal `system_capability_library_v1`; no separate Flight Recorder capability catalog exists.

### Session efficiency/resource accounting

Use existing:

`foundation.synthetic_session_resource_metrics`
`foundation.synthetic_session_efficiency_v1`

The Flight Recorder dashboard consumes those metrics rather than creating a second resource-accounting organ.

### Semantic session-path mining

`foundation.synthetic_session_path_snapshots` and its repeat-subpath miner are NOT duplicates of Flight Recorder automation analysis.

They operate on semantic Transcript paths across completed project-chat sessions.

Flight Recorder automation analysis operates on raw operational evidence within one observed runtime session.

Both remain because they answer different questions:

- semantic path miner: `which meaningful system paths recur across sessions?`
- Flight Recorder: `what work did AI/system actually perform in this session, and what can SETKA take over next time?`

### Transcript / reports

`foundation.system_transcript_events` remains semantic/causal memory only.

`foundation.synthetic_session_reports` remains the actor report layer.

Recorder RAW is not copied wholesale into either.

## 2. VERSTAK front integration

No new public trace service was created.

The existing scoped gateway remains the public entry:

`public.api_verstak_action_session_v1(...)`
`public.api_verstak_front_state_session_v1(...)`
`public.api_verstak_period_report_session_v1(...)`

These gateways now emit safe server-side operational traces into the existing:

`diamond.interaction_traces`
`diamond.interaction_trace_chunks`

via the internal helper:

`foundation.verstak_record_session_action_v1(...)`

Captured server-side facts include operation class, duration, status, ship scope, and bounded safe metrics. User text, password/PIN, session token, bearer material and sensitive payload values are not recorded.

The action gateway also retains optional `trace_batch` for client-only UI events where a front chooses to provide them. It reuses the same trace store and scoped session gateway.

Thus:

`VERSTAK FRONT -> EXISTING SESSION GATEWAY -> EXISTING INTERACTION TRACE -> FLIGHT RECORDER RAW PROJECTION`

No second front telemetry database was introduced.

## 3. Legacy/dormant runtime surface

`foundation.synthetic_runtime_sessions` was inspected during harmonization:

- rows: 0;
- active function references: none;
- triggers: none;
- FK consumers: none;
- one compatibility-audit view still references it.

It is therefore marked LEGACY/DORMANT by database comment.

Canonical new execution must use `foundation.synthetic_runs`.

The empty legacy table was not dropped in this pass because doing so would unnecessarily rewrite/drop a broad compatibility-audit view. This is deliberate structural restraint, not endorsement of a second runtime.

## 4. External Work connector boundary

PostgreSQL cannot independently observe a ChatGPT Work/GitHub/Supabase/browser/filesystem call that never crosses an instrumented SETKA execution surface.

Those surfaces remain explicitly `NOT_CONNECTED / NONE` in `foundation.flight_recorder_surface_registry`.

This means `UNKNOWN / UNINSTRUMENTED`, never `zero activity`.

Do not add model-side self-report calls merely to simulate independent RAW evidence. Add telemetry only when a real execution adapter/middleware hook exists.

## 5. Verified acceptance checks

Rollback tests proved:

1. Senior HOT OPEN creates one canonical `synthetic_run` and uses the same UUID as Senior wake `sessionRef`.
2. Senior phase work writes to Flight Recorder under that same session.
3. Resource pause appends mission checkpoint, closes the transport run without declaring mission completion, invokes normal session compilation, and preserves mission continuation.
4. VERSTAK `FRONT_STATE` through a real scoped session automatically creates one interaction trace chunk with correct identity/ship scope and appears as `INTERACTION_TRACE_CHUNK` in the raw projection.
5. Test transactions were rolled back; no fake smoke sessions/traces remain.
6. `foundation.flight_recorder_automation_registry` is absent.
7. Recorder automation assets = 3 active; system contour bindings = 3; capability projection rows = 3.
8. Internal `flight_recorder_*` functions are not executable by `anon` or ordinary `authenticated`; `service_role` retains execution.
9. `diamond.interaction_traces` and `diamond.interaction_trace_chunks` are not directly readable/writable by `anon`/`authenticated`.
10. Public VERSTAK session gateways remain intentionally executable through opaque scoped session-token contracts.

## 6. Structural invariant

Before adding a new Flight Recorder-related table/function/registry, answer in this order:

1. Can this be a projection over an existing raw channel?
2. Can this use `automation_gap_signals`?
3. Can this be an `automation_asset` / existing capability?
4. Can this use the existing synthetic runtime lifecycle/resource accounting?
5. Can this use the existing interaction trace?
6. Is the remaining need genuinely irreducible?

Only create a new permanent organ when the answer to 1–5 is demonstrably no.

## Current next operational step

Do not start another architecture branch.

Resume the existing Senior Genesis repair mission from its latest verified checkpoint. The system should now do more of the known runtime/evidence work itself, while Senior continues at the first unresolved product boundary: `ZERO / LOGIN_GATE`.
