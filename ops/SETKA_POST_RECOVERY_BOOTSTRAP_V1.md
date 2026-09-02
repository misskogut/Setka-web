# SETKA Post-Recovery Bootstrap v1

Status: PREPARED_IN_GITHUB / DO_NOT_EXECUTE UNTIL POSTGRESQL IS SQL-READY.

Purpose: bring the new causal-replay/storage kernel into SETKA safely after the 2026-09-02 PostgreSQL disk-full incident.

Detailed Supabase execution order for kernel sync + transcript provenance:

`ops/SETKA_SUPABASE_KERNEL_SYNC_TODO.md`

## Hard gates

No integration/cleanup/resume may begin until all are true:

1. real `SELECT 1` succeeds;
2. external cryosleep remains `ON`;
3. full emergency PostgreSQL dump is completed and independently stored;
4. schema-only dump + migration history are preserved;
5. read-only relation-size audit is captured;
6. relation file `base/5/62753` is mapped to its PostgreSQL object;
7. no destructive action has occurred before backup/audit.

Control-plane `ACTIVE_HEALTHY` alone is not sufficient evidence of SQL health.

## Phase A — Preserve reality

- full `pg_dump` of current database as-is;
- schema-only dump;
- migration history;
- canonical Foundation/event/transcript history;
- scientific branches G1/Twin/Genesis/512/Senior/Vector/M2M/G2;
- cron/automation definitions;
- Edge Function manifest/sources and secret-name manifest (never secret values);
- hashes for all rescue artifacts.

## Phase B — Read-only storage audit

Measure:

- `pg_database_size`;
- largest relations by `pg_total_relation_size`;
- heap/index/TOAST split;
- relation `62753` identity;
- event/transcript/log/cron tables;
- G2/fleet dense coordinate tables;
- duplicate snapshots / large JSONB / repeated metadata;
- rebuildable materialized/cached objects;
- suspected quadratic context/state copying.

Classify each large object:

`CANONICAL_CAUSE / IRREVERSIBLE_INPUT / TIME_INTERVAL / STEP_INTERVAL / CHECKPOINT / DERIVED / CACHE / ARCHIVE_CANDIDATE / TECH_GARBAGE`.

## Phase B.5 — Optional read-only kernel preview

After hard gates are true, a small `SETKA_DB_KERNEL_STATE_V1` snapshot may be built from audited live facts and compared with:

`ops/SETKA_KERNEL_RELEASE_MANIFEST.json`

using:

`node ops/setka-kernel-handshake.mjs --db-state <snapshot.json>`

This preview is read-only. Expected outcomes:

- `SYNCED_NOOP` — no causal change, no canonical transcript row;
- `KNOWN_DELTA_READY` — exact known delta plan only;
- `MANUAL_REVIEW_REQUIRED` — stop and inspect reported delta;
- `BLOCKED_BY_RECOVERY_GATES` — remain read-only.

For first post-incident recovery, the manifest declares zero automatic migrations and `firstRecoveryMode = READ_ONLY_RECONCILIATION_ONLY`.

## Phase C — Canonical outage backfill

Append the GitHub outage session at the then-current mother-transcript tail using:

`ops/SETKA_EMERGENCY_TRANSCRIPT_BACKFILL_2026-09-02.md`

Rules:

- append-only;
- `temporal_backfill = true`;
- original source time/provenance preserved;
- no historical event numbers rewritten;
- read back canonical event id/event_no before marking complete.

## Phase C.5 — Verify transcript-bound kernel reconciliation

Before any future kernel-caused state-changing operation:

1. verify the live canonical transcript writer/read-back path;
2. implement or reuse the smallest DB-facing kernel release state/ledger;
3. implement the read-only `SETKA_DB_KERNEL_STATE_V1` adapter;
4. follow `ops/SETKA_SUPABASE_KERNEL_SYNC_TODO.md`;
5. prove transcript semantics in shadow/disposable mode.

Kernel activity identity:

- activity code: `KERNEL_RECONCILIATION`;
- label: `Автообновление системы по ядру`;
- actor: `SYSTEM_KERNEL_SYNC`.

A real state-changing operation must preserve a causal boundary:

`STARTED -> known change transaction -> COMPLETED/FAILED -> transcript read-back -> VERIFIED`.

`SYNCED_NOOP` remains causal silence and must not generate canonical transcript noise.

Revert/reapply never rewrites the earlier update. They are new append-only causal events linked to the original operation. Whole-database rollback is not an acceptable substitute for reverting one kernel change when later independent canonical data would be lost.

GitHub never receives arbitrary SQL authority.

## Phase D — Shadow replay integration

Do not replace existing writers immediately.

1. connect a read-only/shadow adapter to the machine contracts under `contracts/`;
2. reconstruct known G1/G2 segments with `core/replay/`;
3. compare reconstructed checkpoint/state hashes with preserved evidence;
4. validate parameter patches at exact tick/time boundaries;
5. validate time + generated-step/point interval reconstruction;
6. prove sparse checkpoint restore reproduces the same future state;
7. record discrepancies instead of deleting anything.

## Phase E — Shadow write admission

Place future fleet/synthetic candidate writes through `core/storage/write-admission.mjs` in observation mode first.

Measure:

- candidate writes classified `PERSIST`;
- candidate writes classified `DERIVE_OR_CACHE`;
- unknown `REVIEW` classes;
- event count and byte volume before/after admission;
- projected storage/WAL reduction.

No canonical write is silently discarded during this comparison phase.

## Phase F — Switch dense autopilot writers

Only after replay equivalence is proven:

- persist causal events, causal patches, non-reproducible inputs, interval boundaries and sparse checkpoints;
- stop permanent per-tick/per-coordinate autopilot persistence;
- materialize dense coordinates only on bounded demand;
- keep recent TRACE only if explicitly budgeted;
- archive raw scientific evidence externally where required.

## Phase G — Compaction

Compaction is last, never first.

Before deleting/truncating/dropping anything, prove:

- full backup exists;
- replay contract complete;
- regenerated range matches hashes;
- all external/non-reproducible inputs preserved;
- required cold archive copied and hash-verified;
- target is derived/cache/materialized/technical garbage, not canonical cause.

Avoid `VACUUM FULL` / broad REINDEX while storage headroom is constrained.

## Phase H — Storage guards and resume

Before President may turn cryosleep OFF:

- real SQL health verified;
- post-cleanup free-space headroom measured;
- `SETKA External Storage Fuse` validated against actual metrics;
- write budgets enabled for fleet/synthetic writers;
- shared cryosleep gate present on external synthetic/simulation workflows;
- offline replay CI green;
- full backup location/hashes recorded;
- explicit President resume decision recorded.

Then resume gradually: one small deterministic canary → verify storage delta → small fleet → verify → normal operation.

Never jump directly from recovery to full fleet/G2 load.
