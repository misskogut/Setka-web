# SETKA Supabase Kernel Sync — execution order

Status: `PREPARED_IN_GITHUB / DO_NOT_EXECUTE UNTIL POSTGRESQL IS SQL-READY`.

Purpose: finish the GitHub ↔ PostgreSQL kernel handshake after recovery without repeating AI archaeology, and make every real kernel-caused state change traceable in the canonical SETKA transcript.

This file is an execution order, not proof that any PostgreSQL object below already exists. Live schema must be inspected first. Reuse existing canonical objects/functions when they already provide the required semantics; do not create duplicates merely to match names in this document.

## 0. Hard recovery gates

Do not perform any kernel-sync write until all are true:

1. real `SELECT 1` succeeds;
2. cryosleep remains ON;
3. full PostgreSQL emergency backup is complete and independently stored;
4. schema-only dump + migration history are preserved;
5. read-only storage audit is captured;
6. `base/5/62753` is mapped to its PostgreSQL relation;
7. no destructive cleanup has occurred before backup/audit.

Control-plane green is not enough.

## 1. Verify the canonical transcript path first

Inspect the live canonical transcript implementation before adding anything. The expected canonical history is the existing append-only SETKA transcript (historically `foundation.system_transcript_events`); verify the actual table/function/schema and its writer contract live.

Requirements:

- append-only history;
- source/provenance fields retained;
- no rewrite of old event numbers;
- event append can be read back by stable id/event_no;
- reuse existing `CAUSAL_EVENT` if supported rather than inventing a parallel event family.

If the live transcript path differs, adapt the implementation to the verified canonical path and record that mapping as evidence.

## 2. Activity identity

Use one causal activity family for kernel-driven system changes:

- `activity_code = KERNEL_RECONCILIATION`
- human label: `Автообновление системы по ядру`
- system actor: `SYSTEM_KERNEL_SYNC`
- canonical event family: existing `CAUSAL_EVENT` payload, unless live schema proves another canonical path is required.

Semantic subtypes:

- `KERNEL_RECONCILIATION_STARTED`
- `KERNEL_RECONCILIATION_COMPLETED`
- `KERNEL_RECONCILIATION_FAILED`
- `KERNEL_RECONCILIATION_REVIEW_REQUIRED`
- `KERNEL_RECONCILIATION_REVERTED`
- `KERNEL_RECONCILIATION_REAPPLIED`

`SYNCED_NOOP` is causal silence: keep it as technical/read-only evidence only; do not add a canonical transcript row just to say nothing changed.

## 3. Minimal DB-facing state snapshot

Implement one read-only adapter/function that produces `SETKA_DB_KERNEL_STATE_V1` for `ops/setka-kernel-handshake.mjs`.

The snapshot must contain only what the handshake needs:

- recovery gate booleans;
- current DB-relevant component fingerprints or the deterministic inputs needed to derive them;
- current DB schema/version marker if one already exists;
- applied migration ids + exact content hashes;
- last verified kernel reconciliation release/operation if available.

Do not copy full tables or transcript payloads into this snapshot.

## 4. Reuse or create the smallest release ledger

First look for an existing canonical state/metadata mechanism that can store the last applied kernel release and migration hashes. Reuse it if semantically correct.

Only if no suitable object exists, add the smallest possible ledger containing at least:

- release_id;
- db_relevant_source_baseline_commit;
- operation_id;
- applied migration id/content hash;
- before_state_hash;
- after_state_hash;
- transcript completion event id/event_no;
- verification state/time.

This ledger is current operational state, not a second transcript. Full causal history remains in the canonical transcript.

## 5. First recovery handshake is read-only

Run in this order:

1. generate the verified live DB state snapshot;
2. read `ops/SETKA_KERNEL_RELEASE_MANIFEST.json`;
3. run deterministic handshake;
4. preserve the result as recovery evidence;
5. do not execute SQL from the result during first recovery.

Interpretation:

- `SYNCED_NOOP` → nothing to write;
- `BLOCKED_BY_RECOVERY_GATES` → stop;
- `MANUAL_REVIEW_REQUIRED` → stop and inspect only the reported delta;
- `KNOWN_DELTA_READY` → eligibility plan only, not execution authority.

## 6. Rules for any later automatic migration

Automatic execution may be enabled only after the first read-only recovery proof and only for migrations that are all of:

- explicitly present in the release manifest;
- exact content SHA-256 matches;
- idempotent;
- explicitly `autoApplyAllowed`;
- non-destructive;
- all recovery/safety gates pass;
- rollback class is safe under the rules below.

Unknown SQL, unknown migration id/hash, schema mismatch, destructive operation, or unknown component drift → fail closed to manual review.

GitHub never receives arbitrary SQL authority.

## 7. Transaction/provenance sequence for a real state change

Every state-changing kernel operation gets one stable `operation_id`.

Before mutation:

1. acquire an appropriate reconciliation lock so the same release cannot race itself;
2. validate manifest/release/migration hashes and safety gates again;
3. capture `before_state_hash` and the minimum recovery checkpoint/evidence required for that operation;
4. append and commit `KERNEL_RECONCILIATION_STARTED` as a separate causal boundary;
5. read the STARTED event back and retain its canonical id/event_no.

Then perform the known migration/change in its own transaction.

After mutation:

1. capture `after_state_hash`;
2. verify expected schema/component/migration state;
3. append `KERNEL_RECONCILIATION_COMPLETED` with the same `operation_id`;
4. include release id, GitHub source baseline/commit, manifest identity/hash, migration ids+hashes, before/after hashes, timing, trigger and evidence hash;
5. read the COMPLETED event back;
6. only then mark the release ledger operation `VERIFIED`.

If the mutation fails after STARTED, append `KERNEL_RECONCILIATION_FAILED` when SQL is available. A STARTED event without COMPLETED/FAILED is itself a recoverable signal that the path was interrupted.

## 8. Revert and reapply are new history, never rewrites

Never delete or modify the original kernel update transcript event.

Represent rollback as a later causal event linked to the prior operation:

- `reverts_operation_id` for revert;
- `reapplies_operation_id` for reapply.

Rollback classes:

- `REVERSIBLE` — has a tested inverse operation and required recovery checkpoint; may become automatically eligible only after hash/inverse proof;
- `FORWARD_FIX_ONLY` — do not attempt physical rollback; apply a compensating forward change;
- `IRREVERSIBLE` — manual approval + backup/archive proof required; never auto-revert.

Do not restore an old whole-database snapshot merely to undo one kernel update if later independent canonical events/data would be lost. Revert the update effect, not history.

## 9. Minimum transcript payload

For a completed/reverted/reapplied state-changing operation preserve at least:

- activity_code/name;
- subtype;
- operation_id;
- actor = `SYSTEM_KERNEL_SYNC`;
- release_id;
- GitHub commit/source baseline;
- manifest identity/hash;
- migrations and exact content hashes;
- rollback class where relevant;
- before_state_hash;
- after_state_hash;
- started_at/completed_at/duration;
- trigger/source provenance;
- evidence_hash;
- links to reverted/reapplied operation when relevant.

Do not store dense derived data in the transcript.

## 10. Read-back is the completion boundary

A database change is not considered proven remembered merely because SQL returned success.

Required completion chain:

`DB change -> transcript append -> transcript read-back -> VERIFIED`

Persist the canonical transcript id/event_no in the release ledger/current-state record.

## 11. What can become automatic

After first recovery proof, the deterministic system may automatically:

- build the small DB-state snapshot;
- compare DB state to the GitHub manifest;
- return NOOP without transcript noise;
- identify exact known delta;
- apply an explicitly allowlisted, exact-hash, idempotent, non-destructive migration under all gates;
- write STARTED/COMPLETED or FAILED causal transcript events;
- read those events back;
- update the minimal current release ledger;
- refuse unknown work.

## 12. What always requires review/President policy

Stop for review on:

- unknown component drift;
- migration hash mismatch;
- unknown migration;
- destructive/irreversible data change;
- missing recovery checkpoint where one is required;
- schema ambiguity;
- transcript writer/read-back failure;
- attempt to rewrite prior history;
- whole-database rollback that could erase later independent data;
- any relaxation of cryosleep/recovery gates.

## 13. Acceptance tests after implementation

Before enabling automatic state-changing sync, prove in a disposable/shadow context:

1. `SYNCED_NOOP` produces zero canonical transcript rows;
2. STARTED survives a simulated failed mutation and exposes the interrupted operation;
3. successful migration produces exactly one STARTED + one COMPLETED linked by operation_id;
4. COMPLETED is not marked VERIFIED until read-back succeeds;
5. duplicate execution of the same idempotent release does not double-apply;
6. mismatched migration hash fails closed;
7. unknown drift fails closed;
8. reversible update can be reverted by a new event without rewriting history;
9. forward-fix-only and irreversible updates cannot auto-revert;
10. reapply creates a new causal event linked to the original operation;
11. later independent canonical data survives revert of a kernel update;
12. transcript queries can reconstruct which kernel release was active at a chosen historical moment.

## 14. Final recovery ordering

Use together with `ops/SETKA_POST_RECOVERY_BOOTSTRAP_V1.md`:

`SQL READY -> BACKUP -> STORAGE AUDIT -> relation 62753 mapping -> outage backfill -> verify transcript writer -> build DB state adapter -> READ-ONLY HANDSHAKE -> shadow proof -> only then consider automatic allowlisted sync`.

Cryosleep remains ON until the existing resume gates and explicit President decision are satisfied.
