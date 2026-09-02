# SETKA Emergency Transcript Backfill — 2026-09-02

Status: **PERSISTED_IN_GITHUB_ONLY / NOT_YET_IN_SUPABASE**

Purpose: preserve the post-incident architectural and implementation session while PostgreSQL is unavailable, then append it to the canonical SETKA mother transcript after recovery **without rewriting or inserting into past event numbering**.

## 1. Incident boundary

This session occurs immediately after the PostgreSQL disk-full / recovery-loop incident affecting `setka-web-research` (`gfchgaphzhxufwdhrcis`). The database is not considered writable/healthy until real SQL access is restored and verified.

Known incident evidence used by the recovery plan includes the PostgreSQL error:

`could not extend file "base/5/62753": No space left on device`

No transcript/PIN/report created in chat or GitHub during this outage is to be represented as already persisted in canonical SETKA PostgreSQL.

## 2. Backfill rule

When PostgreSQL is recovered:

1. perform preservation/backup checks first;
2. do not rewrite the historical transcript;
3. append one canonical **EMERGENCY_ARCHITECTURE_SESSION** event (or a compact ordered event group if schema requires it) at the then-current transcript tail;
4. store the original session date/time/provenance inside the appended event payload;
5. link the GitHub commits/files below as immutable provenance;
6. mark the event as `temporal_backfill = true`, with reason `postgresql_unavailable_during_source_session`;
7. read back the inserted canonical event id/event_no before calling the backfill complete.

The backfill must preserve chronological truth: the source discussion and GitHub implementation happened during the outage, while the canonical database write happens later after recovery.

## 3. Architectural content to backfill

The emergency session established the **Procedural Storage / Causal Replay** architecture:

- preserve causality, not every reproducible intermediate coordinate;
- dense coordinate tables are temporary materializations, not permanent memory by default;
- exact replay contract includes identity, lineage, equation family/version/hash, Genesis, all equation variables, seed/root seed, numerical semantics, behavior/personality/control variables (including curiosity), irreversible inputs, branch-changing decisions, checkpoints and proof hashes;
- mother transcript records meaningful causal changes, not every deterministic tick or every passing second;
- causal inactivity/autopilot time is represented by interval boundaries and duration, not `NO_ACTIVITY` rows per second;
- preserve both elapsed time and mathematical distance between meaningful events;
- preserve/derive `generated_steps` / `generated_points` between event boundaries;
- parameter mutations are canonical causal patches anchored to exact logical tick/coordinate boundary and wall/simulated time;
- during replay, the engine applies each historical parameter patch at the exact original boundary rather than guessing it again;
- on-demand materialization reconstructs dense trajectories for visualization, scientific inspection, forensic proof or export;
- destructive compaction is prohibited until replay is proven and checkpoint/root hashes match;
- all future canonical fleet/synthetic writers must pass through semantic write admission plus event/byte budgets;
- shared external-runtime safety gating must fail closed while emergency cryosleep is ON.

Canonical conceptual replay:

`STATE(t) = GENESIS + LAW + VARIABLES + CAUSAL_PATCHES<=t + IRREVERSIBLE_INPUTS<=t + REPLAY_CONTRACT`

Canonical event interval model:

`CAUSAL_EVENT -> {elapsed_time, generated_steps/points} -> CAUSAL_EVENT`

## 4. GitHub provenance created during the outage

Primary architecture file:

`docs/SETKA_PROCEDURAL_STORAGE_V1.md`

Architecture commit chain:

- `3178eb92afd7bb8e1c362e7fe2de842ae661e979` — initial procedural-storage / causal-replay architecture;
- `1ca2faec36fc512c3c1b2ecc937485397f5d346b` — causal inactivity/autopilot intervals and time semantics;
- `0690b25f01ce92858f4fe16389878eb063a6615e` — dual time/step coordinate metrics;
- `48ff02c6d4d76cd792712d58ad7278ce4aa850a2` — parameter mutation schedule / causal patches.

Machine/executable kernel created during the same outage:

- `ff6e91be82d46ada9d3e854afde539b91921c19d` — machine replay-contract JSON Schema;
- `ed422c2157ef8ee91a8cc70cb0b104470730473e` — machine causal-event JSON Schema;
- `2bd0b10e45f7d3a1db456f34ac5efd2dfb047ed0` — canonical stable hashing utility;
- `402bc892b11caa836e62278bc55a7501f33e07b5` — deterministic replay engine for initial logistic/Mandelbrot laws;
- `d34a1d8cf0b9ab6c7182e84c615f4ca67174d0f5` — bounded on-demand trajectory materializer;
- `1247a427c498c465817477702dec71de842d15e7` — causal capsule builder with time/step intervals;
- `98a1f1217db75972949dbde24ea009b43dda2212` — semantic write admission + per-run event/byte budgets;
- `c994326b382ee2f06761fed92761f3bd1e7b31bb` — offline deterministic replay test suite;
- `676d742d929113fbd4d41eb33122c5c1af71a39d` — offline GitHub Actions self-test, no Supabase access; first run completed successfully;
- `95115ea68357ca43e431cef54be4255e9473c3fe` — centralized fail-closed cryosleep composite action;
- `d01a3788adde5b10b9fb475dca8b5cbbb20f2935` — guarded canonical-event writer adapter;
- `e76018e003ec4d4bae1910459b7dea2a4f1a615f` — executable replay-core operating documentation;
- `2dfc7c4eaa2e5a4bcae4308c1b9a1d23ef615c69` — causal replay wired into `SETKA_START_HERE.md` cold-start law;
- `dccf24e6eedadd3cf46676096fcef5a4455b1aaf` — causal replay semantics wired into `SETKA_DATA_MODEL_V1.md`;
- `de83c386dc97f7c5a276579c121e252b7b840405` — ADR-024 added to canonical decision log.

Workflow consolidation/safety updates:

- `a40443e3d2fa35e2a4f730f43a468303c72ba3a9` — Foundation 0.1.2 synthetic workflow moved to shared cryosleep gate;
- `79b68b0bff08ff9f2119c34c56089e86643bca48` — Foundation 0.2.0 synthetic workflow moved to shared cryosleep gate;
- `5616a696acb5178b33fbe007a18381b0ecb2144b` — Synthetic User Lab moved to shared cryosleep gate;
- `ecbfabc2ec4d94d59126142c00b83b32c7d669f3` — archived Foundation 0.1 synthetic workflow guarded by shared cryosleep gate.

This file is the outage-side manifest that tells recovery tooling what still needs to be appended to canonical SETKA once PostgreSQL is writable.

## 5. Required canonical backfill payload

At minimum the future canonical event should contain:

- event type: `EMERGENCY_ARCHITECTURE_SESSION`;
- source date: `2026-09-02`;
- source mode: `postgresql_outage / github_provenance`;
- `temporal_backfill = true`;
- incident reference: disk-full recovery loop / relation file `base/5/62753`;
- architecture document path and commit provenance;
- machine contract/core paths and commit provenance;
- summary of the causal-replay rules above;
- implementation state: `GITHUB_OFFLINE_CORE_IMPLEMENTED / SUPABASE_INTEGRATION_NOT_YET_APPLIED`;
- offline CI evidence for deterministic replay core;
- explicit statement that no old transcript rows are rewritten;
- read-back verification fields after insertion.

## 6. Implementation sequencing after recovery

This backfill does **not** authorize immediate cleanup. Correct order remains:

`SQL RECOVERY -> FULL BACKUP -> READ-ONLY SIZE/RELATION AUDIT -> CANONICAL BACKFILL -> REPLAY INTEGRATION/TEST -> HASH VERIFICATION -> COMPACTION`

Before any writer migration, compare the current PostgreSQL schema/functions/Edge Functions against the GitHub contracts. Do not assume that the offline kernel is already connected to production merely because its tests pass.

The architecture session and its GitHub provenance must survive even if the database cannot yet accept the canonical write.
