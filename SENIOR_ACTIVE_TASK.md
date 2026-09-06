# SENIOR ACTIVE TASK

STATUS: ACTIVE
SENIOR_IDENTITY: SETKA-S-0003-0001
TASK_KEY: GENESIS-WAKE-SENIOR-REPAIRFLIGHT-20260906-A91C
TASK_FILE: SENIOR_ASTRA_GENESIS_REPAIR_UNTIL_FLIGHT.md
MISSION_KEY: MISSION-GENESIS-7F31-REPAIR-FLIGHT
CONTINUITY_PROTOCOL: SENIOR_MISSION_CONTINUITY.md
FLIGHT_RECORDER_PROTOCOL: SENIOR_FLIGHT_RECORDER_PROTOCOL.md
UNIVERSAL_RECORDER: ops/SETKA_FLIGHT_RECORDER_V1.md
ISSUED_BY: PRESIDENT_SETKA
ISSUED_AT: 2026-09-06
PREVIOUS_RUN: GENESIS-7F31-RUN01
PREVIOUS_CHECKPOINT_EVENTS: 6143, 6144

The previous one-session flight/gap-review chain is completed and must not be restarted.

On wake:
1. resolve this TASK_KEY exactly through the Wake Gateway;
2. call ONE system-first HOT OPEN: `foundation.senior_blackbox_open_v1(TASK_KEY, MISSION_KEY, metadata)`;
3. treat `senior_blackbox_*` only as legacy function names; canonical observer name is Flight Recorder / Бортовой самописец;
4. keep returned `sessionRef` for this model window;
5. use returned compact evidence + latest checkpoint + `nextExactAction`;
6. open `SENIOR_ASTRA_GENESIS_REPAIR_UNTIL_FLIGHT.md` and `SENIOR_FLIGHT_RECORDER_PROTOCOL.md` directly only as needed;
7. do NOT manually repeat evidence already returned as PASS;
8. investigate only FAIL / UNKNOWN / contradiction / new design boundary;
9. reuse the existing ZERO / MASHA / LERA / NIKITA identities and ships;
10. use `FRONT FAILURE → GENERAL REPAIR → SAME-STEP FRONT RETEST → CONTINUE`;
11. checkpoint every material repair/retest;
12. before a known resource edge persist a `PAUSED_BY_RESOURCE_LIMIT` checkpoint.

SYSTEM-FIRST LAW:
- Senior is not the default executor of deterministic work;
- SETKA should compute/check/compare first and return an evidence packet;
- Senior works primarily at genuinely new diagnostic, reasoning and design boundaries;
- **one observed session is enough to raise an automation candidate**; do not wait for repetition;
- session-close Flight Recorder compilation should transfer safe deterministic work into tests / guards / executors / harnesses before later wakes where possible;
- repeated observation is evidence-strengthening only, not the discovery threshold.

MISSION COMPLETION LAW:
- model/session limit ending = `PAUSED_BY_RESOURCE_LIMIT`, not completion;
- `Продолжай` resumes this same mission from the latest verified checkpoint;
- do not manufacture a final report merely because the current model window is ending;
- final report is required only when acceptance criteria are actually reached or President explicitly stops the mission.

STORAGE LAW:
- Flight Recorder RAW is temporary TRACE material;
- RAW ≠ Transcript ≠ Report;
- after session compilation + automation/classification + seal/proof, recorder-owned RAW is purged and only compact optimization/proof residue remains.

Wake key routes work only; it is not authorization or a user credential.
