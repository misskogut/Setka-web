# SETKA Emergency Transcript Backfill — 2026-09-02

Status: **PERSISTED_IN_GITHUB_ONLY / NOT_YET_IN_SUPABASE**

Purpose: preserve the post-incident architectural session while PostgreSQL is unavailable, then append it to the canonical SETKA mother transcript after recovery **without rewriting or inserting into past event numbering**.

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

The backfill must preserve chronological truth: the source discussion happened during the outage, while the canonical database write happens later after recovery.

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
- destructive compaction is prohibited until replay is proven and checkpoint/root hashes match.

Canonical conceptual replay:

`STATE(t) = GENESIS + LAW + VARIABLES + CAUSAL_PATCHES<=t + IRREVERSIBLE_INPUTS<=t + REPLAY_CONTRACT`

Canonical event interval model:

`CAUSAL_EVENT -> {elapsed_time, generated_steps/points} -> CAUSAL_EVENT`

## 4. GitHub provenance created during the outage

Primary architecture file:

`docs/SETKA_PROCEDURAL_STORAGE_V1.md`

Relevant commit chain:

- `3178eb92afd7bb8e1c362e7fe2de842ae661e979` — initial procedural-storage / causal-replay architecture;
- `1ca2faec36fc512c3c1b2ecc937485397f5d346b` — causal inactivity/autopilot intervals and time semantics;
- `0690b25f01ce92858f4fe16389878eb063a6615e` — dual time/step coordinate metrics;
- `48ff02c6d4d76cd792712d58ad7278ce4aa850a2` — parameter mutation schedule / causal patches.

This file is the outage-side manifest that tells recovery tooling what still needs to be appended to canonical SETKA once PostgreSQL is writable.

## 5. Required canonical backfill payload

At minimum the future canonical event should contain:

- event type: `EMERGENCY_ARCHITECTURE_SESSION`;
- source date: `2026-09-02`;
- source mode: `postgresql_outage / github_provenance`;
- `temporal_backfill = true`;
- incident reference: disk-full recovery loop / relation file `base/5/62753`;
- architecture document path and commit provenance;
- summary of the causal-replay rules above;
- implementation state: `DESIGN_ONLY` until code/schema writers are actually migrated;
- explicit statement that no old transcript rows are rewritten;
- read-back verification fields after insertion.

## 6. Implementation sequencing after recovery

This backfill does **not** authorize immediate cleanup. Correct order remains:

`SQL RECOVERY -> FULL BACKUP -> READ-ONLY SIZE/RELATION AUDIT -> CANONICAL BACKFILL -> REPLAY IMPLEMENTATION/TEST -> HASH VERIFICATION -> COMPACTION`

The architecture session and its GitHub provenance must survive even if the database cannot yet accept the canonical write.
