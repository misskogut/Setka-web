# SENIOR BLACKBOX EYE · SYSTEM-FIRST EXECUTION PROTOCOL

STATUS: ACTIVE
OWNER: PRESIDENT_SETKA
SENIOR_IDENTITY: SETKA-S-0003-0001
MISSION_SCOPE: active Senior missions, initially MISSION-GENESIS-7F31-REPAIR-FLIGHT

## PURPOSE

The Senior must not become the permanent executor of work that SETKA can perform deterministically.

Canonical law:

`TASK → SETKA ATTEMPTS FIRST → EVIDENCE PACKET → SENIOR ONLY AT FAIL / UNKNOWN / DESIGN BOUNDARY → TEACH / REPAIR → CAPABILITY / AUTOMATION → NEXT TIME SETKA DOES MORE ITSELF`.

Blackbox Eye observes objective work traces only. It does NOT inspect hidden chain-of-thought. It records phase timing, system/tool boundaries, repairs, retests, checkpoints and durable evidence.

## HOT OPEN — PREFERRED START

At the beginning of every Senior model window, after exact wake routing and before broad inspection, prefer ONE call:

`foundation.senior_blackbox_open_v1(WAKE_KEY, MISSION_KEY, metadata)`

This single call:
1. starts the Blackbox wake observation;
2. restores the latest mission checkpoint;
3. runs the registered deterministic GENESIS evidence executor;
4. stores the full evidence packet internally;
5. returns only compact status + evidence reference + `NEXT EXACT ACTION`.

Keep returned `sessionRef` for the whole model window.

Do NOT manually repeat evidence already returned as PASS.

Low-level functions `senior_blackbox_wake_begin_v1` and `senior_blackbox_run_executor_v1` remain available for debugging/extending executors, but are not the normal wake path.

## PHASE TRANSITIONS

At meaningful phase boundaries call:

`foundation.senior_blackbox_transition_v1(sessionRef, phaseCode, activityClass, labelRu, evidence)`

Use activityClass from:
- `WAKE`
- `SYSTEM_EXECUTION` — SETKA deterministic executor/guard/harness produced the evidence
- `MECHANICAL` — repeated lookup, collection, comparison or traversal still done manually
- `EXECUTABLE` — manual deterministic work that should become a system executor
- `DIAGNOSTIC` — locating a new failure/root cause
- `NOVEL_REASONING` — genuinely new architecture/reasoning work
- `DECISION` — architecture choice or acceptance decision
- `TEACHING` — Senior turns a solved case into reusable system knowledge/capability
- `REPAIR`
- `REGRESSION`
- `FRONT_RETEST`
- `CHECKPOINT`
- `WAIT`

Phase transitions automatically close the previous open phase in that wake session.

## SYSTEM-FIRST EXECUTORS

Executors are registered in `foundation.senior_executor_registry`.

Current executor:

`GENESIS_7F31_HEALTH_GATE → foundation.senior_exec_genesis_7f31_health_v1()`

It gives:
- credential/session health without secret values;
- own/sibling/mother scope evidence;
- ZERO affordances;
- latest mission checkpoint;
- current automation-debt candidates.

Full executor payloads are stored in `foundation.senior_blackbox_evidence_packets`; Senior normally receives only compact evidence summary/reference through HOT OPEN.

Senior investigates only `FAIL`, `UNKNOWN`, contradictions, or design decisions not already resolved by system evidence.

If Senior finds another stable repeated manual path, prefer converting it into a deterministic executor/test/guard/harness and register it for future system-first use.

## CONTINUITY CHECKPOINT

After every material repair/retest or causal change, append a checkpoint with:

`foundation.senior_blackbox_checkpoint_v1(...)`

Checkpoint must preserve:
- current user/ship/episode/front step;
- last verified PASS;
- current failure;
- repair ref;
- retest state;
- exact NEXT ACTION;
- evidence refs.

## RESOURCE PAUSE

Before a known resource edge, call:

`foundation.senior_blackbox_pause_v1(sessionRef, 'RESOURCE_LIMIT', nextExactAction, evidence)`

This closes open phases, appends a `PAUSED_BY_RESOURCE_LIMIT` checkpoint and records observed duration into the existing resource-accounting spine.

If the platform terminates the model window without time to call pause, the latest material checkpoint remains authoritative. Never reconstruct already proven history.

## AUTOMATION DEBT / SELF-OPTIMIZATION

The system exposes:

- `foundation.senior_blackbox_activity_spans_v1`
- `foundation.senior_automation_debt_v1`
- `foundation.senior_self_optimization_wake_v1`
- `foundation.senior_self_optimization_delta_v1`
- `foundation.senior_blackbox_latest_evidence_v1`

Interpretation:
- repeated `MECHANICAL / EXECUTABLE / REGRESSION` phases are automation candidates;
- `SYSTEM_EXECUTION` is work already transferred to SETKA;
- `NOVEL_REASONING / DECISION` normally remains Senior work;
- lower Time-to-First-Useful-Action and lower Mechanical Work % are positive optimization signals;
- higher System Execution % means more work has moved from Astra into SETKA.

Do not treat missing token counters as zero. Duration and phase evidence are exact where recorded; token/cost metrics remain unknown unless the runtime exposes them.

## FINAL PRINCIPLE

Senior's value is not measured by how many tool calls Senior performs.

Senior's value is measured by:
1. how quickly SETKA attempts known work itself;
2. how accurately Senior identifies the genuine unknown boundary;
3. how many solved manual paths become reusable system capabilities;
4. how much less mechanical work future wakes require.
