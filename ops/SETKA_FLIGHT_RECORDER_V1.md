# SETKA · БОРТОВОЙ САМОПИСЕЦ / FLIGHT RECORDER V1

STATUS: ACTIVE CANON + IMPLEMENTED SLICE
DATE: 2026-09-06
OWNER: PRESIDENT_SETKA
PARENT: `ops/SETKA_SELF_DIAGNOSTIC_ROADMAP.md`, `docs/SETKA_PROCEDURAL_STORAGE_V1.md`

## 0. Naming boundary

**BLACK BOX** = the protected SETKA / VERSTAK intellectual system itself.

**БОРТОВОЙ САМОПИСЕЦ / FLIGHT RECORDER** = the internal temporary operational observer of runtime sessions.

Legacy SQL names containing `runtime_blackbox_*` remain compatibility aliases only. New canonical names use `flight_recorder_*`.

## 1. Three different truths

`RAW OBSERVATION != TRANSCRIPT != REPORT`

- **RAW OBSERVATION** — objective operational evidence: session lifecycle, action/phase boundaries, tool/SQL/IO/system operations, field/meter/front events, timing and measurable resource counters.
- **TRANSCRIPT** — minimal semantic/causal history worth permanent system memory.
- **REPORT** — the actor's structured account of what it believes it did, decided, changed and left pending.

The Flight Recorder is not the Transcript and does not dump every operation into the Transcript.

## 2. Session lifecycle law

A model window/session is temporary working material:

`SESSION START`
`-> FLIGHT RECORDER ON`
`-> RAW ACTION TAPE`
`-> SESSION CLOSE`
`-> COMPILE THIS SESSION IMMEDIATELY`
`-> classify every observed work path`
`-> transfer deterministic work to SETKA where safe`
`-> preserve true AI boundary where uncertainty remains`
`-> regression/proof`
`-> SEAL`
`-> compact capsule`
`-> PURGE recorder-owned RAW`
`-> retain only the small optimization/proof residue + meaningful Transcript fact`

A second matching session is **not required** to raise an automation candidate. The first observed session is enough to ask:

> Why did AI perform this operation? Can SETKA perform it itself next time?

Repetition only increases confidence/priority; it is not the discovery gate.

## 3. Single-session classification

Canonical derived view:

`foundation.flight_recorder_action_analysis_v1`

Disposition:

- `ALREADY_SYSTEM` — deterministic work is already executed by SETKA;
- `AUTOMATION_CANDIDATE` — mechanical / executable / tool / SQL / IO / regression work that may move into an executor, guard, harness, resolver or rule;
- `AI_BOUNDARY` — novel reasoning, diagnosis, decision or teaching that should remain AI-assisted until a formal rule exists;
- `NO_AUTOMATION / OBSERVE` — no justified transfer decision from current evidence.

Important safety law:

`FIRST SESSION -> CANDIDATE`

not

`FIRST SESSION -> UNREVIEWED NEW SYSTEM LAW`.

Automatic transfer is allowed only when semantics are bounded, deterministic, security-safe, recoverable and regression-verifiable.

## 4. Existing organs reused

The recorder composes existing SETKA organs instead of copying all raw history into another permanent database:

- `foundation.synthetic_runs`
- `foundation.events`
- `foundation.session_runtime_phase_events`
- `foundation.session_runtime_phase_spans_v1`
- `foundation.synthetic_mission_meter_events`
- `foundation.synthetic_field_events`
- `diamond.interaction_traces`
- `diamond.interaction_trace_chunks`
- `foundation.synthetic_session_resource_metrics`
- `foundation.synthetic_attention_metrics`
- `foundation.automation_gap_signals`
- `foundation.synthetic_session_reports`
- `foundation.system_transcript_events`

Canonical projection:

`foundation.flight_recorder_raw_v1`

Legacy alias:

`foundation.runtime_blackbox_raw_v1`

## 5. Always-on synthetic lifecycle

`public.foundation_start_synthetic_run(...)` automatically opens the recorder and returns:

- `runId`
- `sessionRef`
- `flightRecorderSessionRef`
- `flightRecorder: AUTO`

Before a new session starts, SETKA also attempts housekeeping of previously resolved recorder capsules.

`public.foundation_finish_synthetic_run(...)`:

1. closes open recorder phase spans;
2. writes runtime logout;
3. automatically calls `foundation.flight_recorder_compile_session_v1(...)`;
4. raises automation candidates immediately from this one session;
5. if no unresolved automation exists, seals and purges recorder-owned RAW automatically.

## 6. Canonical recorder functions

Low-level operational writer:

`foundation.flight_recorder_event_v1(...)`

Session compiler:

`foundation.flight_recorder_compile_session_v1(actorIdentityRef, sessionRef, routeCandidates)`

Seal gate:

`foundation.flight_recorder_seal_session_v1(actorIdentityRef, sessionRef, proof)`

Safe recorder-RAW purge:

`foundation.flight_recorder_purge_session_v1(actorIdentityRef, sessionRef)`

Housekeeping:

`foundation.flight_recorder_finalize_ready_sessions_v1(actorIdentityRef, limit, purge)`

Dashboard:

`foundation.flight_recorder_dashboard_v1(actorIdentityRef, sessionRef)`

Coverage dashboard:

`foundation.flight_recorder_coverage_dashboard_v1()`

## 7. Storage economy / deletion law

Recorder RAW is **TRACE temperature**, not permanent canonical memory by default.

However purge is fail-closed.

Recorder-owned phase rows are deletable only when:

- a session capsule exists;
- raw root hash is sealed;
- all automation candidates are resolved or explicitly dismissed/classified;
- required AI-boundary classification is preserved;
- required causal/irreversible evidence is retained elsewhere;
- purge targets only rows explicitly marked `FLIGHT_RECORDER_RAW`.

The generic append-only protection of other runtime phase history is not removed.

Independent sources such as lifecycle events, FIELD/METER evidence or front traces remain governed by their own retention/replay contracts. Flight Recorder GC does not delete them merely because the universal projection can see them.

## 8. Compact durable residue

Per session compact state:

`foundation.flight_recorder_session_capsules`

Before purge the capsule can temporarily hold session action analysis.

After successful purge it is compacted:

- detailed action list removed;
- automation-plan rows removed;
- AI-boundary detail removed;
- small session metrics retained;
- candidate/AI-boundary counts retained;
- raw root hash retained;
- proof/seal metadata retained;
- optimization delta retained in compact form.

A single semantic Transcript fact is appended:

`flight_recorder_session_optimized`

Meaning: this session's recorder trace was compiled, optimization/classification was sealed, compact proof remains, recorder-owned raw trace was discarded.

The Transcript does **not** receive every raw operation.

## 9. Self-optimization metrics

Durable compact history:

`foundation.flight_recorder_optimization_history_v1`

Useful measures include:

- wall observed time;
- Time to First Activity / Useful Action where instrumented;
- Mechanical Work %;
- System Execution %;
- Reasoning/Diagnostic %;
- automation candidates raised from the session;
- AI-boundary count;
- deltas against prior comparable sessions.

Interpretation remains causal-safe: lower cost in a later session is an optimization signal, not proof that only the recorder change caused it unless task complexity is comparable.

## 10. Coverage truth

Registry:

`foundation.flight_recorder_surface_registry`

Dashboard:

`foundation.flight_recorder_coverage_dashboard_v1()`

Current native/partial channels include synthetic lifecycle, SETKA runtime phase events, mission meter, field activity and instrumented front traces.

Important current gap:

PostgreSQL cannot observe an external ChatGPT Work / GitHub / browser / filesystem / connector action that never crosses an instrumented SETKA execution adapter.

Those surfaces are therefore explicitly `NOT_CONNECTED / NONE`, not silently treated as zero activity.

Target:

`external execution surface -> adapter/middleware -> FLIGHT_RECORDER_RAW`

The executor should emit the operation automatically. Model-side self-reporting is only a temporary fallback and must not be confused with independent raw observation.

## 11. Security boundary

"Raw" does not mean secret dumping.

Never persist plaintext:

- passwords;
- PINs;
- bearer/session tokens;
- service-role secrets;
- recovery keys;
- unrelated private user content when an operation ref/hash/status is sufficient.

Prefer operation class, safe target ref, time, duration, count/size, result status, error class and cryptographic evidence hash.

## 12. Senior relationship

Senior is only one observed actor.

Senior wake/continuity helpers may keep legacy internal function names such as `senior_blackbox_*` for compatibility, but conceptually they are **Senior adapters over the Flight Recorder**.

Senior law:

`SETKA ATTEMPTS FIRST -> evidence packet -> Senior only at FAIL / UNKNOWN / DESIGN BOUNDARY -> repair/teach -> capability -> next session SETKA does more itself`.

The first session is already enough to raise automation debt. Do not require repeated manual work before asking whether it belongs in SETKA.

## 13. Verified rollback tests

2026-09-06 rollback tests proved:

1. session with no automation candidate:
   - compiled automatically;
   - capsule sealed;
   - recorder raw rows purged;
   - compact capsule retained;

2. session with one single `TOOL/EXECUTABLE` action:
   - first occurrence raised one automation candidate;
   - capsule entered `WAITING_AUTOMATION`;
   - recorder raw remained;

3. after the candidate was marked resolved:
   - housekeeping sealed the session;
   - recorder raw was purged;
   - compact capsule remained;

4. after purge:
   - detailed action arrays were removed from capsule;
   - compact metrics remained;
   - exactly one `flight_recorder_session_optimized` Transcript fact was generated.

All smoke data were rolled back; no fake test session remains.

## Final law

> **Бортовой самописец не должен становиться новой вечной памятью. Он наблюдает одну сессию, помогает SETKA превратить работу ИИ в собственную способность, доказывает результат и освобождает место. Следующая сессия должна начинаться с более самостоятельной системы, чем предыдущая.**
