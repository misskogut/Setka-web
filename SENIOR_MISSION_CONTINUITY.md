# SENIOR MISSION CONTINUITY · CANONICAL PROTOCOL

STATUS: ACTIVE
OWNER: PRESIDENT_SETKA
SENIOR_IDENTITY: SETKA-S-0003-0001

## CORE LAW
A Senior mission is larger than one model/session limit window.

`MISSION ≠ MODEL WINDOW`

Resource exhaustion means:
`PAUSED_BY_RESOURCE_LIMIT`
not
`MISSION FINISHED`.

A mission ends only when:
- its acceptance criteria are met;
- President explicitly stops it;
- an external hard blocker makes further authorized progress impossible and this is recorded.

## REQUIRED CHECKPOINT
After every material repair/retest and before likely resource exhaustion, append a machine-readable checkpoint through `foundation.senior_mission_checkpoint_record_v1(...)`.

Checkpoint must preserve at minimum:
- mission key / wake key / wake ordinal;
- current USER identity and ship;
- episode / front step;
- last verified PASS;
- current failure;
- repair reference if any;
- retest state;
- NEXT EXACT ACTION;
- evidence refs.

Never rely on model memory alone.

## RESUME
On a valid wake key, `foundation.senior_wake_resolve_v1(key)` returns the active manifest plus `latestCheckpoint`.

Resume order:
1. exact wake resolve;
2. read exact entrypoint;
3. read latest checkpoint;
4. execute `nextExactAction`;
5. do not reconstruct already proven history.

If the President writes only `Продолжай` / `Continue` in an existing Senior work thread, treat it as:
`RESUME ACTIVE SENIOR MISSION FROM LATEST VERIFIED CHECKPOINT`.
Open `SENIOR_ACTIVE_TASK.md` exactly, resolve its TASK_KEY exactly, and continue from `latestCheckpoint`. No broad search.

## REPAIR LOOP
`USER FRONT STEP → FAIL → SENIOR ENGINEER → GENERAL REPAIR → INTERNAL REGRESSION → SAME USER + SAME FRONT STEP → RETEST → CONTINUE`.

Ordinary VERSTAK defects are not mission-ending blockers.

## RESOURCE EDGE
When remaining model capacity becomes low:
- do not start a large non-atomic refactor;
- finish or safely stop the current atomic change;
- write a checkpoint immediately;
- mark `PAUSED_BY_RESOURCE_LIMIT` if the model is about to stop;
- do not spend the remaining window manufacturing a final report for an unfinished mission.

Final report is only for actual mission completion or explicit President stop.
