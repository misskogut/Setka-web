# SENIOR ACTIVE TASK

STATUS: ACTIVE
SENIOR_IDENTITY: SETKA-S-0003-0001
TASK_KEY: GENESIS-WAKE-SENIOR-REPAIRFLIGHT-20260906-A91C
TASK_FILE: SENIOR_ASTRA_GENESIS_REPAIR_UNTIL_FLIGHT.md
MISSION_KEY: MISSION-GENESIS-7F31-REPAIR-FLIGHT
CONTINUITY_PROTOCOL: SENIOR_MISSION_CONTINUITY.md
BLACKBOX_PROTOCOL: SENIOR_BLACKBOX_EYE_PROTOCOL.md
ISSUED_BY: PRESIDENT_SETKA
ISSUED_AT: 2026-09-06
PREVIOUS_RUN: GENESIS-7F31-RUN01
PREVIOUS_CHECKPOINT_EVENTS: 6143, 6144

The previous one-session flight/gap-review chain is completed and must not be restarted.

On wake:
1. resolve this TASK_KEY exactly through the Wake Gateway;
2. start the objective work observer with `foundation.senior_blackbox_wake_begin_v1(TASK_KEY, MISSION_KEY, metadata)` and keep returned `sessionRef`;
3. read the latest checkpoint / `nextExactAction` returned by the wake path;
4. open `SENIOR_ASTRA_GENESIS_REPAIR_UNTIL_FLIGHT.md` and `SENIOR_BLACKBOX_EYE_PROTOCOL.md` directly;
5. before manual traversal, let SETKA attempt deterministic evidence collection with `foundation.senior_exec_genesis_7f31_health_v1()`;
6. investigate only FAIL / UNKNOWN / contradiction / design-boundary evidence that the system cannot resolve itself;
7. reuse the existing ZERO / MASHA / LERA / NIKITA identities and ships;
8. execute the checkpoint's `nextExactAction` before broader inspection;
9. use `FRONT FAILURE → GENERAL REPAIR → SAME-STEP FRONT RETEST → CONTINUE`;
10. mark meaningful work-phase transitions through `foundation.senior_blackbox_transition_v1(...)`;
11. after every material repair/retest append `foundation.senior_blackbox_checkpoint_v1(...)`;
12. before a known resource edge use `foundation.senior_blackbox_pause_v1(...)`.

SYSTEM-FIRST LAW:
- Senior is not the default executor of deterministic work.
- SETKA should compute/check/compare first and return an evidence packet.
- Senior works primarily at genuinely new diagnostic, reasoning and design boundaries.
- repeated manual paths must become candidates for test / guard / executor / harness automation.

MISSION COMPLETION LAW:
- model/session limit ending = `PAUSED_BY_RESOURCE_LIMIT`, not completion;
- `Продолжай` resumes this same mission from the latest verified checkpoint;
- do not manufacture a final report merely because the current model window is ending;
- final report is required only when acceptance criteria are actually reached or President explicitly stops the mission.

Wake key routes work only; it is not authorization or a user credential.