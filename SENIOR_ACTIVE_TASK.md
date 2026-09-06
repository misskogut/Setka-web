# SENIOR ACTIVE TASK

STATUS: ACTIVE
SENIOR_IDENTITY: SETKA-S-0003-0001
TASK_KEY: GENESIS-WAKE-SENIOR-REPAIRFLIGHT-20260906-A91C
TASK_FILE: SENIOR_ASTRA_GENESIS_REPAIR_UNTIL_FLIGHT.md
MISSION_KEY: MISSION-GENESIS-7F31-REPAIR-FLIGHT
CONTINUITY_PROTOCOL: SENIOR_MISSION_CONTINUITY.md
ISSUED_BY: PRESIDENT_SETKA
ISSUED_AT: 2026-09-06
PREVIOUS_RUN: GENESIS-7F31-RUN01
PREVIOUS_CHECKPOINT_EVENTS: 6143, 6144

The previous one-session flight/gap-review chain is completed and must not be restarted.

On wake:
1. resolve this TASK_KEY exactly through the Wake Gateway;
2. read `latestCheckpoint` returned by the resolver;
3. open `SENIOR_ASTRA_GENESIS_REPAIR_UNTIL_FLIGHT.md` directly;
4. reuse the existing ZERO / MASHA / LERA / NIKITA identities and ships;
5. execute the checkpoint's `nextExactAction` before broader inspection;
6. use the loop `FRONT FAILURE → GENERAL REPAIR → SAME-STEP FRONT RETEST → CONTINUE`;
7. do not abandon a scenario for an ordinary VERSTAK defect;
8. after every material repair/retest and before resource exhaustion append a continuity checkpoint.

MISSION COMPLETION LAW:
- model/session limit ending = `PAUSED_BY_RESOURCE_LIMIT`, not completion;
- `Продолжай` resumes this same mission from the latest verified checkpoint;
- do not manufacture a final report merely because the current model window is ending;
- final report is required only when acceptance criteria are actually reached or President explicitly stops the mission.

Wake key routes work only; it is not authorization or a user credential.