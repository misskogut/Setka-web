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
- human input, LLM output, external input and entity messages are explicit irreversible/non-reproducible causal classes;
- on-demand materialization reconstructs dense trajectories for visualization, scientific inspection, forensic proof or export;
- destructive compaction is prohibited until replay is proven and checkpoint/root hashes match;
- all future canonical fleet/synthetic writers must pass through semantic write admission plus event/byte budgets;
- write budgets are scoped to run, entity, fleet and hour, not only one process invocation;
- a write receipt and a verified read-back are separate facts (`persisted != verified`);
- shared external-runtime safety gating must fail closed while emergency cryosleep is ON;
- synthetic workflows are manual-only during the recovery era and active browser runners share one reusable guarded workflow.

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
- `676d742d929113fbd4d41eb33122c5c1af71a39d` — offline GitHub Actions self-test, no Supabase access;
- `95115ea68357ca43e431cef54be4255e9473c3fe` — centralized fail-closed cryosleep composite action;
- `d01a3788adde5b10b9fb475dca8b5cbbb20f2935` — guarded canonical-event writer adapter;
- `e76018e003ec4d4bae1910459b7dea2a4f1a615f` — executable replay-core operating documentation;
- `2dfc7c4eaa2e5a4bcae4308c1b9a1d23ef615c69` — causal replay wired into `SETKA_START_HERE.md` cold-start law;
- `dccf24e6eedadd3cf46676096fcef5a4455b1aaf` — causal replay semantics wired into `SETKA_DATA_MODEL_V1.md`;
- `de83c386dc97f7c5a276579c121e252b7b840405` — ADR-024 added to canonical decision log;
- `fd6ebb2b65d7e507801f4b6146a27350d400a07b` — sparse checkpoints made restorable with hash-verified snapshots;
- `7f0a006256e51b4093a22ed4cec341da35849bde` — checkpoint restore + single-pass replay ranges;
- `f02a7197c444bc0c799cac241c944d95d4f0bee9` — one-pass materialized ranges;
- `8f70d350fb4b02e1c82e788facd3a74f16debdcf` — checkpoint/writer tests;
- `82f2b055af2a770adc430e64e74b9420bf640edc` — fail-closed event ordering, exact numeric semantics enforcement path and finite Mandelbrot escape sealing;
- `017d999d7af5ece44f219c315e12b73c4ca90c3c` — checkpoint-aware materialization bounded by point count and replay-step budget;
- `9d879484dd834243892dd9072a0b29513de532d8` — per-run/per-entity/per-fleet/per-hour causal write budgets;
- `092921d5bc3fa685028bab861e5b74dd6435d134` — persistence/read-back proof separated as `persisted` and `verified`;
- `df4016a210180254e4327c8a83ef06c2b3615bfa` — causal-event contract expanded for HUMAN_INPUT / LLM_OUTPUT / MESSAGE / SEAL;
- `fc674a85b92f783a80b4d1f8f22c59eb1cc42d84` — replay contract requires explicit runtime/rounding/operation-order semantics;
- `f0ce14e3ca4435eb82ab84d4d9c33a79dba1c761` — hardened deterministic golden-hash, checkpoint, escape, budget and read-back tests;
- `6d699313efa7d3a15b10d0cd55e9f742da245aaa` — offline CI includes canonical writer syntax/readiness;
- `e1b4a5216570fe66ffb6999dd5f8e5f93133761c` — hardened replay-core operating rules.

Workflow consolidation/safety updates:

- `a40443e3d2fa35e2a4f730f43a468303c72ba3a9` — Foundation 0.1.2 synthetic workflow moved to shared cryosleep gate;
- `79b68b0bff08ff9f2119c34c56089e86643bca48` — Foundation 0.2.0 synthetic workflow moved to shared cryosleep gate;
- `5616a696acb5178b33fbe007a18381b0ecb2144b` — Synthetic User Lab moved to shared cryosleep gate;
- `ecbfabc2ec4d94d59126142c00b83b32c7d669f3` — archived Foundation 0.1 synthetic workflow guarded by shared cryosleep gate;
- `a7869ba187ebf0cc5d02434f1e972ae38533e672` / `487760d9ff588a7549676535b04f991d3a8a9ae3` — offline workflow safety audit created and hardened to reject automatic synthetic/simulation triggers or unguarded runtime paths;
- `8d2a104ae6f86327f09b7c834ca13af628caeee7` — synthetic workflows enforced against central cryosleep gate;
- `7b7745a25b9acf7a064a70bda4292c898ca9a886` — Foundation 0.1.2 synthetic workflow made manual-only;
- `cb2632e35bd169f47d1c87b25e3b5a5d62ae815d` — Foundation 0.2.0 synthetic workflow made manual-only;
- `2a8666701796f7fd9687361e64815c867bc6db6d` — Synthetic User Lab made manual-only;
- `6ec1f66c7bb35bf18fb05eedc8cb6d372f4c6d46` — reusable guarded synthetic browser runner created;
- `bdd021629f2e5404838fabfe277d01cd34938fb7` — Foundation 0.1.2 wrapper routed through reusable runner;
- `2f21d8a58bd2d7081fcd3ec8b622edbf02e50c06` — Foundation 0.2.0 wrapper routed through reusable runner;
- `06a23fd56fdde56e23e6834df6136b627016b5f4` — Synthetic User Lab wrapper routed through reusable runner;
- `dd10c9b40f21f1dbb8387a0c3eb90d36e46bb4cf` — Pages deploy skips kernel/docs/ops-only changes so emergency maintenance does not cause unnecessary front deployments.

Recovery sequencing artifact:

- `fd19d08e1e1d5d1577911025629bb13819458d8e` — `ops/SETKA_POST_RECOVERY_BOOTSTRAP_V1.md`, explicit gates from SQL recovery through backup/audit/shadow replay/write admission/compaction/canary resume.

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
- offline CI and workflow-safety evidence;
- explicit statement that no old transcript rows are rewritten;
- read-back verification fields after insertion.

## 6. Implementation sequencing after recovery

This backfill does **not** authorize immediate cleanup. Correct order remains:

`SQL RECOVERY -> FULL BACKUP -> READ-ONLY SIZE/RELATION AUDIT -> CANONICAL BACKFILL -> REPLAY INTEGRATION/TEST -> HASH VERIFICATION -> COMPACTION`

Before any writer migration, compare the current PostgreSQL schema/functions/Edge Functions against the GitHub contracts. Do not assume that the offline kernel is already connected to production merely because its tests pass.

Follow `ops/SETKA_POST_RECOVERY_BOOTSTRAP_V1.md` and keep external cryosleep ON until the explicit resume gate is satisfied.

The architecture session and its GitHub provenance must survive even if the database cannot yet accept the canonical write.
