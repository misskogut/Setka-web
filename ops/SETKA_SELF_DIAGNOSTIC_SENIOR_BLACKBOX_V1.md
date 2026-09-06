# SETKA SELF-DIAGNOSTIC · SENIOR BLACKBOX EYE V1

STATUS: IMPLEMENTED_SLICE
DATE: 2026-09-06
PARENT_ROADMAP: `ops/SETKA_SELF_DIAGNOSTIC_ROADMAP.md`
OWNER: PRESIDENT_SETKA
SUBJECT: `SETKA-S-0003-0001` Work Senior
INITIAL_MISSION: `MISSION-GENESIS-7F31-REPAIR-FLIGHT`

## Why this exists

This is an implemented slice of the existing SETKA Self-Diagnostic Roadmap, not a parallel monitoring architecture.

Parent law preserved:

> If a decision can be obtained from current system state plus a formal rule, do not call AI. Give AI only the residue of uncertainty.

Applied to Senior work:

`TASK → SETKA ATTEMPTS FIRST → EVIDENCE PACKET → SENIOR AT FAIL/UNKNOWN/DESIGN BOUNDARY → REPAIR/TEACH → REUSABLE CAPABILITY → NEXT WAKE SETKA DOES MORE ITSELF`.

## Objective observation boundary

Blackbox Eye observes objective external work evidence only:
- wake/session start and finish;
- phase boundaries;
- deterministic system execution;
- manual/mechanical traversal;
- diagnostic work;
- repair;
- regression;
- front retest;
- checkpoint/pause;
- durable evidence refs.

It does NOT attempt to inspect hidden chain-of-thought.

## Live components

### Wake/session observer
- `foundation.senior_blackbox_wake_sessions`
- `foundation.senior_blackbox_wake_begin_v1(...)`
- `foundation.senior_blackbox_open_v1(...)` — preferred one-call HOT OPEN

HOT OPEN restores continuity and runs registered deterministic evidence before Senior manually traverses the system.

### Phase telemetry
Reuses existing runtime spine:
- `foundation.session_runtime_phase_events`
- `foundation.session_runtime_phase_spans_v1`
- `foundation.session_runtime_phase_mark_v1(...)`

Senior wrapper:
- `foundation.senior_blackbox_transition_v1(...)`

Activity classes:
`WAKE | SYSTEM_EXECUTION | MECHANICAL | EXECUTABLE | DIAGNOSTIC | NOVEL_REASONING | DECISION | TEACHING | REPAIR | REGRESSION | FRONT_RETEST | CHECKPOINT | WAIT`

### Continuity
- `foundation.senior_blackbox_checkpoint_v1(...)`
- `foundation.senior_blackbox_pause_v1(...)`
- existing `foundation.senior_mission_checkpoints`

Resource limit remains a pause, not mission completion.

### Evidence executors
Registry:
- `foundation.senior_executor_registry`

Current executor:
- `GENESIS_7F31_HEALTH_GATE`
- implementation `foundation.senior_exec_genesis_7f31_health_v1()`

It replaces repeated manual collection of:
- test credential/session health;
- own/sibling/mother scope checks;
- ZERO affordances;
- latest checkpoint;
- active automation-debt candidates.

HOT OPEN stores full evidence internally in:
- `foundation.senior_blackbox_evidence_packets`
- latest projection `foundation.senior_blackbox_latest_evidence_v1`

Senior receives compact status + evidenceRef + NEXT EXACT ACTION.

### Automation debt
- `foundation.senior_blackbox_activity_spans_v1`
- `foundation.senior_automation_debt_v1`
- `foundation.senior_route_automation_debt_v1(...)`
- `foundation.senior_automation_board_v1`

When a deterministic/manual phase repeats across wakes and reaches `AUTOMATE_NOW`, it is automatically routed into the existing:
- `foundation.automation_gap_signals`

Signal kind:
- `SENIOR_AUTOMATION_CANDIDATE`

This means repeated Senior mechanics become a system optimization task automatically rather than relying on President/Senior memory.

### Self-optimization metrics
- `foundation.senior_self_optimization_wake_v1`
- `foundation.senior_self_optimization_delta_v1`

Initial metrics:
- `Mechanical Work %`
- `System Execution %`
- `Senior Reasoning %`
- `Time to First Useful Action`
- phase durations for repair/regression/front retest

Existing resource accounting remains authoritative for token/cost data when actual counters are available. Missing token/cost values are UNKNOWN, never zero.

### Self-diagnostic board and automatic wake summary

Compact board:
- `foundation.senior_blackbox_dashboard_v1(missionKey)`

It returns:
- latest continuity checkpoint;
- latest machine-measured wake profile;
- recent wake history;
- active deterministic executors;
- latest evidence packet;
- `AUTOMATE_NOW` debt;
- rule-based `optimizationHints`.

Current hint rules include:
- no instrumented wake yet;
- wake overhead / Time-to-First-Useful-Action too high;
- Mechanical Work % too high;
- System Execution % too low relative to remaining mechanics;
- automation-debt candidates ready.

When a Blackbox wake changes from `RUNNING` to pause/completed state, the observer automatically:
1. routes repeated automation debt;
2. builds the diagnostic dashboard;
3. appends a `senior_blackbox_wake_observed` summary to `foundation.system_transcript_events`.

This means President/SETKA can inspect wake efficiency from the Transcript without manually reconstructing raw phase rows.

## Pre-instrumentation baseline

System Transcript event `6149` records a user-visible pre-Blackbox wake baseline:
- UI-reported duration: 202 seconds / 3m22s;
- exact wake routing worked;
- checkpoint `ZERO-T0 / LOGIN_GATE` was restored;
- no new repair/commit/checkpoint/user login occurred before the Work limit stopped the model;
- measurement is explicitly `external_ui_observation_not_runtime_exact`.

Future Blackbox wakes should be compared against this baseline cautiously, preferring machine-recorded phase telemetry.

## Verified smoke tests

All mutation tests were executed inside SQL transactions and rolled back.

Verified:
1. HOT OPEN resolves active wake and latest checkpoint.
2. HOT OPEN executes `GENESIS_7F31_HEALTH_GATE` before manual traversal.
3. Evidence summary currently reports:
   - 4 test users;
   - own scope failures = 0;
   - sibling/mother leaks = 0;
   - ZERO visible organs = 0;
   - ZERO quick actions = 3;
   - real login/session use still not user-proven.
4. Blackbox pause produces `PAUSED_BY_RESOURCE_LIMIT` checkpoint correctly.
5. Two repeated `MECHANICAL` `MANUAL_SCOPE_CHECK` phases across two simulated wakes produce:
   - recommendation `AUTOMATE_NOW`;
   - `automateAs = SHIP SCOPE ISOLATION GATE`;
   - `SENIOR_AUTOMATION_CANDIDATE` routed to `automation_gap_signals`.
6. Rollback left no fake wake, checkpoint, or automation signal in live state.
7. `senior_blackbox_dashboard_v1` currently returns `NO_INSTRUMENTED_WAKE_YET`, which is correct before the next real Senior wake.

## Applied Supabase migrations

- `senior_blackbox_eye_v1`
- `senior_wake_blackbox_system_first_v1`
- `senior_blackbox_hot_open_v1`
- `senior_genesis_evidence_debt_filter_v1`
- `senior_automation_debt_router_v1`
- `senior_blackbox_dashboard_and_auto_summary_v1`

These are recorded in `supabase_migrations.schema_migrations` in the live project.

## Runtime protocol

See:
- `SENIOR_BLACKBOX_EYE_PROTOCOL.md`
- `SENIOR_WAKE_PROTOCOL.md`
- `SENIOR_ACTIVE_TASK.md`
- active wake manifest `GENESIS-WAKE-SENIOR-REPAIRFLIGHT-20260906-A91C.md`

## Next proof

The next real Senior wake should:
1. exact-route normally;
2. call one HOT OPEN;
3. receive system evidence without manual scope/ZERO traversal;
4. mark phase transitions while working on the actual `LOGIN_GATE`;
5. pause/checkpoint if resource-limited;
6. produce the first machine-measured wake profile and automatic Transcript summary.

The first optimization target is to reduce Time-to-First-Useful-Action and Mechanical Work % versus the pre-instrumentation wake while increasing System Execution %.

## Recursive cost guard

Blackbox Eye must justify its own cost. If phase marking or evidence collection becomes more expensive than the manual work it removes, merge/simplify the observer. The diagnostic system is subject to the same optimization law it enforces.
