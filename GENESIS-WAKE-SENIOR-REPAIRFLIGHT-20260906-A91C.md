# GENESIS-WAKE-SENIOR-REPAIRFLIGHT-20260906-A91C

WAKE_KEY: GENESIS-WAKE-SENIOR-REPAIRFLIGHT-20260906-A91C
STATUS: ACTIVE
SENIOR_IDENTITY: SETKA-S-0003-0001
AUTHORITY: PRESIDENT_SETKA
REPOSITORY: misskogut/Setka-web
BRANCH: main
ENTRYPOINT: SENIOR_ASTRA_GENESIS_REPAIR_UNTIL_FLIGHT.md
BLACKBOX_PROTOCOL: SENIOR_BLACKBOX_EYE_PROTOCOL.md
MISSION_KEY: MISSION-GENESIS-7F31-REPAIR-FLIGHT
ORDER: EXACT_RESOLVE → BLACKBOX_WAKE_BEGIN → SYSTEM_EVIDENCE_PACKET → RESUME_CHECKPOINT → LOGIN_GATE → FRONT_REPAIR_RETRY_LOOP → REGRESSION_AUTOMATION → CONTINUE_UNTIL_ACCEPTANCE
SCOPE: existing GENESIS-7F31 synthetic fleet only, plus general runtime components required to make those scenarios pass
STOP_RULE: mission persists across model-limit windows; resource exhaustion means PAUSED_BY_RESOURCE_LIMIT, not mission completion; checkpoint after each material repair/retest and before exhaustion
FALLBACK: exact `foundation.senior_wake_resolve_v1(WAKE_KEY)` only
CONTINUITY: SENIOR_MISSION_CONTINUITY.md

RULE: NO SEARCH. NO CONTEXT RECONSTRUCTION. DO NOT RECREATE THE TEST FLEET.

FIRST ACTIONS AFTER EXACT ROUTE:
1. call `foundation.senior_blackbox_wake_begin_v1(WAKE_KEY, MISSION_KEY, metadata)`;
2. keep returned Blackbox `sessionRef`;
3. call `foundation.senior_exec_genesis_7f31_health_v1()` before manual database traversal;
4. read latest checkpoint and execute `nextExactAction`;
5. use `foundation.senior_blackbox_transition_v1(...)` at meaningful phase boundaries;
6. investigate manually only FAIL / UNKNOWN / contradiction / new design boundary.

The previous one-session flight/gap review is complete and must not be rerun. This mission continues until its acceptance criteria are met or President explicitly stops it.

If the model/resource window ends, persist an interrupt-safe checkpoint via the Blackbox protocol and stop naturally. On the next `Продолжай` or same wake key, resume the exact unfinished step.

This wake key is routing metadata, not a database password and not a test-user credential.