# SETKA RUNTIME BLACKBOX · UNIVERSAL RAW OBSERVER V1

STATUS: IMPLEMENTED_SLICE
DATE: 2026-09-06
OWNER: PRESIDENT_SETKA
PARENT: `ops/SETKA_SELF_DIAGNOSTIC_ROADMAP.md`

## Core distinction

The Blackbox is the system's internal flight recorder / eye. It is not a Senior-specific feature and it is not the Transcript.

Canonical separation:

`RAW OBSERVATION != TRANSCRIPT != REPORT`

- **RAW OBSERVATION** — objective low-level evidence that something happened in a runtime/session: lifecycle, phase boundaries, tool/SQL/IO/system actions, field/meter actions, timings and resource observations.
- **TRANSCRIPT** — semantic/causal history worth preserving as system meaning. It must not receive one row merely because a tool call or deterministic step happened.
- **REPORT** — the actor's own structured account of what it did, decided, changed and left pending.

The system compares these layers; it does not collapse them into one store.

## Existing organs reused

No second raw-history table was introduced. The observer composes existing SETKA organs:

- `foundation.synthetic_runs` — universal synthetic runtime envelope / run lifecycle;
- `foundation.events` — login/logout runtime lifecycle facts;
- `foundation.session_runtime_phase_events` — append-only raw phase/action tape;
- `foundation.session_runtime_phase_spans_v1` — derived durations from phase START/END markers;
- `foundation.synthetic_mission_meter_events` — raw mission activity meter;
- `foundation.synthetic_field_events` — raw field/tool activity evidence;
- `diamond.interaction_traces` + `diamond.interaction_trace_chunks` — front interaction trace chunks;
- `foundation.synthetic_session_resource_metrics` — tokens/cost/bytes/duration when actually measurable;
- `foundation.synthetic_attention_metrics` — derived attention metrics;
- `foundation.synthetic_runtime_optimization_signals` and `foundation.automation_gap_signals` — derived optimization/automation signals;
- `foundation.synthetic_session_reports` — report layer;
- `foundation.system_transcript_events` — semantic/causal transcript layer.

`session_runtime_phase_events` has an immutable UPDATE/DELETE guard and no trigger that copies its raw rows into the Transcript.

## Universal raw projection

Canonical raw projection:

`foundation.runtime_blackbox_raw_v1`

It unifies the existing raw channels while preserving `source_kind` and original `source_ref` so channel duplication is visible rather than silently erased.

Current sources:

- `RUN_LIFECYCLE`
- `RUNTIME_PHASE`
- `MISSION_METER`
- `FIELD_EVENT`
- `INTERACTION_TRACE_CHUNK`

This projection is internal. `anon` and ordinary `authenticated` roles have no access.

## Always-on synthetic lifecycle

`public.foundation_start_synthetic_run(...)` now automatically starts the raw observer and returns:

- `runId`
- `sessionRef`
- `blackboxSessionRef`
- `rawObserver: AUTO`

The canonical blackbox session reference for a synthetic run is the run UUID as text.

`public.foundation_finish_synthetic_run(...)` automatically closes any open raw phase spans for that run and returns the same blackbox session reference.

Therefore every synthetic that enters through the trusted runtime path — Solai, Vector, Senior and future synthetics — receives at least exact lifecycle observation without a role-specific Blackbox implementation.

## Low-level action ingress

Generic internal writer:

`foundation.runtime_blackbox_event_v1(sessionRef, actorIdentityRef, eventCode, phaseClass, marker, label, evidence)`

Supported markers:

- `START`
- `END`
- `MARK`

Supported raw classes reuse the existing runtime taxonomy:

- `NEURAL`
- `ALGORITHM`
- `SQL`
- `TOOL`
- `IO`
- `ORCHESTRATION`
- `WAIT`
- `UNKNOWN`

The preferred architecture is **execution-layer instrumentation**, not the model narrating its own actions after the fact. A tool/browser/SQL runner that can see an operation should emit the raw event directly. Manual model-side marking is only a temporary fallback where the execution surface has no hook.

### Hard truth boundary

PostgreSQL cannot observe an external AI/browser/tool action that never reaches an instrumented SETKA execution surface. Full tool-level coverage therefore requires each execution adapter/middleware to emit Blackbox events. Missing telemetry is `UNKNOWN / UNINSTRUMENTED`, never proof that no work occurred.

Do not reconstruct missing old raw telemetry and label it raw.

## Derived views — no duplicate raw storage

### Normalized action tape

`foundation.runtime_blackbox_action_tape_v1`

This is derived only. It preserves the raw tape untouched and marks obvious dual-channel meter/field pairs so action counting does not blindly double-count instrumentation echoes.

### Session metrics

`foundation.runtime_blackbox_session_metrics_v1`

Computes where evidence exists:

- wall observed time;
- raw row/event count;
- activity event count;
- TOOL/SQL/IO rows;
- time to first observed activity;
- phase-observed seconds;
- mechanical seconds;
- system-execution seconds;
- reasoning/diagnostic seconds;
- Mechanical Work %;
- System Execution %;
- Reasoning Work %.

### RAW ↔ report ↔ Transcript reconciliation

`foundation.runtime_blackbox_report_reconciliation_v1`

States include:

- `REPORT_WITHOUT_RAW_OBSERVATION`
- `RAW_OBSERVED_REPORT_ABSENT`
- `RAW_AND_REPORT_PRESENT_UNLINKED`
- `RAW_AND_REPORT_PRESENT`

One report action is not assumed to equal one raw operation. Exact semantic reconciliation requires evidence/provenance links.

### Coverage

`foundation.runtime_blackbox_actor_coverage_v1`

Measures, by actor:

- total runs;
- detailed observed runs;
- report-linked runs;
- resource-measured runs;
- coverage percentages.

Historical runs before this observer remain explicitly `UNINSTRUMENTED`.

### Repeat candidates

`foundation.runtime_blackbox_repeat_activity_v1`

Repeated activity is only a candidate signal. It is not proof of waste. Stable repetition can be reviewed for transfer to an executor/guard/harness.

### Self-optimization delta

`foundation.runtime_blackbox_optimization_delta_v1`

Compares consecutive observed sessions for the same actor and exposes deltas such as:

- raw/activity count;
- Mechanical Work %;
- System Execution %;
- Reasoning Work %;
- time to first activity.

Complexity of the underlying task must be considered before claiming causal improvement.

### Generic dashboard

`foundation.runtime_blackbox_dashboard_v1(actorIdentityRef, sessionRef)`

Returns current raw metrics, historical deltas, report reconciliation, repeat candidates, coverage and available resource measurements.

## Security / privacy boundary

"Raw" means un-interpreted operational evidence, not unrestricted secret dumping.

Never store in Blackbox payloads:

- passwords/PIN values;
- session/bearer tokens;
- service-role secrets;
- recovery material;
- unrelated private user content when operation metadata is sufficient.

Record operation type, target class/reference, timing, status, sizes/counts and safe evidence hashes/refs where possible.

## Senior relationship

`SENIOR_BLACKBOX_EYE_PROTOCOL.md` is now a **specialized adapter** on top of this universal observer.

Senior-only entities remain useful for:

- wake-key routing;
- Genesis mission checkpoints;
- system-first evidence executors;
- Senior-specific repair/retest continuity.

They are not the canonical raw telemetry store.

## Verified reality at implementation time

Historical evidence already present before this universal projection:

- Solai had synthetic run lifecycle records, but no detailed phase instrumentation tied to those run IDs;
- Vector already had `FIELD_EVENT` + `MISSION_METER` raw activity channels;
- Senior already had `FIELD_EVENT` + `MISSION_METER` raw activity channels from an earlier field mission;
- those historical field meters were not linked to `synthetic_runs.run_id`, proving that the missing piece was session-level convergence, not absence of observation organs.

A rollback smoke test opened a normal Solai trusted runtime, received an automatic `blackboxSessionRef`, wrote generic SQL/TOOL raw events and closed the run. The test was rolled back; no fake raw rows remain.

## Final law

`SESSION START -> RAW EYE ON -> EXECUTION SURFACES EMIT FACTS -> RAW TAPE -> DERIVED METRICS / RECONCILIATION / OPTIMIZATION -> ONLY SEMANTICALLY SIGNIFICANT CONSEQUENCES MAY ENTER TRANSCRIPT`

The Blackbox watches the system live. The Transcript remembers what the system decided was meaningful. The Report says what the actor believes it did. SETKA can compare all three.