# SENIOR · FLIGHT RECORDER / SYSTEM-FIRST EXECUTION PROTOCOL

STATUS: ACTIVE_SPECIALIZATION
OWNER: PRESIDENT_SETKA
SENIOR_IDENTITY: SETKA-S-0003-0001
UNIVERSAL_PARENT: `ops/SETKA_FLIGHT_RECORDER_V1.md`

## Naming

The protected SETKA/VERSTAK system may be referred to as the **Black Box**.

The runtime observer is **Бортовой самописец / Flight Recorder**.

Legacy helper function names `senior_blackbox_*` remain callable for compatibility only; conceptually they are Senior adapters over the Flight Recorder.

## Senior law

`TASK -> SETKA ATTEMPTS FIRST -> EVIDENCE PACKET -> SENIOR ONLY AT FAIL / UNKNOWN / DESIGN BOUNDARY -> REPAIR / TEACH -> CAPABILITY -> NEXT SESSION SETKA DOES MORE ITSELF`

Senior is not the permanent executor of deterministic work.

## HOT OPEN

At every Senior model window, after exact wake routing and before broad inspection:

`foundation.senior_blackbox_open_v1(WAKE_KEY, MISSION_KEY, metadata)`

This legacy-named Senior adapter:
- restores latest mission checkpoint;
- runs registered deterministic evidence first;
- returns compact PASS/FAIL/UNKNOWN + `nextExactAction`;
- binds the wake to observable runtime work.

Do not manually repeat PASS evidence.

## One-session automation law

Do **not** wait for a manual action to recur in another wake.

The current session alone is enough to ask:

`Why did Senior/AI perform this? Could SETKA do it next time?`

Disposition:
- `SYSTEM_EXECUTION` -> already transferred;
- `MECHANICAL / EXECUTABLE / SQL / TOOL / IO / REGRESSION` -> automation candidate immediately;
- `NOVEL_REASONING / DIAGNOSTIC / DECISION / TEACHING` -> AI boundary unless a formal deterministic rule is proven.

The recorder/session compiler routes candidates through `foundation.automation_gap_signals` after the session closes.

A candidate is not automatically a safe new law. Transfer requires bounded semantics, security, recoverability and regression proof.

### Teach SETKA after one solved path

When Senior has implemented a **general deterministic replacement** for an observed manual operation and has a passing regression/proof reference, register the proven transfer with:

`foundation.flight_recorder_register_automation_v1(operationKind, activityClass, executorRef, regressionRef, createdByRef, scopeIdentityRef, proof, true)`

The first SQL parameter retains the historical internal name `p_activity_kind` for ABI compatibility, but its canonical semantic meaning is `operationKind` (for example `CHECK_SCOPE`), while `activityClass` describes the work class (for example `EXECUTABLE`).

Never register an automation merely because a trace exists. Registration requires:
- a real executor/guard/harness/resolver already implemented;
- a regression/proof reference;
- deterministic/bounded semantics;
- no privilege expansion or person-specific shortcut.

After registration, later matching candidates are handled by:

`foundation.flight_recorder_apply_registered_automations_v1(actorIdentityRef, sessionRef)`

and can become `SYSTEM_EXECUTION_AVAILABLE` / resolved without asking Senior to rediscover the same path.

## Continuity

Mission != model window.

Resource exhaustion = `PAUSED_BY_RESOURCE_LIMIT`.

After material repair/retest preserve:
- current user/ship/front step;
- last verified PASS;
- current failure;
- repair ref;
- retest state;
- exact next action;
- evidence refs.

On `Продолжай`, resume that exact point.

## Front repair loop

`USER FRONT STEP -> FAIL -> GENERAL REPAIR -> INTERNAL REGRESSION -> SAME USER + SAME STEP FRONT RETEST -> CONTINUE`

Do not accept backend-only fixes as user-proven.

## Recorder lifecycle

For an instrumented synthetic runtime:
- session start -> Flight Recorder AUTO;
- work -> recorder/native raw channels;
- session finish -> compile this one session;
- automation candidates raised immediately;
- verified registered replacements are applied automatically;
- once candidates are resolved/classified and sealed -> recorder-owned RAW purged;
- compact metrics/hash/proof + semantic optimization fact remain.

Senior should therefore expect later wakes to have less mechanical work than earlier wakes.

## Current coverage boundary

`foundation.flight_recorder_coverage_dashboard_v1()` is authoritative for what the recorder can actually see.

External ChatGPT Work/GitHub/browser/filesystem operations that never cross a SETKA execution adapter remain `UNINSTRUMENTED`, not zero. Do not invent missing raw history.

## Final principle

Senior's value is not the number of tool calls.

Senior's value is how quickly the system takes over work that no longer needs Senior intelligence, leaving Senior at the genuine unknown boundary.
