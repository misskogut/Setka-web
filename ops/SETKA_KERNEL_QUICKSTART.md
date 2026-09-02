# SETKA Kernel Quickstart

Purpose: let a future Solai/Work run enter the protected kernel in seconds instead of re-auditing the repository from scratch.

## Fast path

1. Read `ops/SETKA_KERNEL_STATUS.json`.
2. Read `ops/SETKA_KERNEL_MAP.json` only if the task touches protected kernel components or the pulse reports drift.
3. Run `node ops/setka-kernel-pulse.mjs` from a full repository checkout.
4. If state is `GREEN_BASELINE_MATCH`, reuse the recorded verification evidence and inspect only the files relevant to the requested change.
5. If state is `MANUAL_REVIEW_REQUIRED`, inspect exactly `driftedComponents`, `changedFiles`, and `manualReviewTargets`; do not restart a whole-repository audit unless the impact map itself is suspect.
6. Automated tests may prove implementation properties, but they do not advance the verification baseline. Baseline advancement is a separate reviewed action.

## What the pulse computes

For each protected component, the pulse builds a deterministic SHA-256 fingerprint over the sorted set:

`repository_path : git_blob_sha`

It computes that fingerprint at the reviewed baseline commit and at current `HEAD`. Any mismatch is drift. The result reports exact added/modified/deleted monitored files, affected components, required automatic checks and manual semantic review targets.

This makes unchanged evidence reusable: if a component fingerprint is identical to the reviewed baseline, there is no reason to rediscover its implementation merely because unrelated repository files changed.

## Protected components

- `replay_math` — deterministic replay, equations, causal contracts and proof tests.
- `storage_write` — canonical-vs-derived write admission, budgets and read-back semantics.
- `runtime_safety` — cryosleep, synthetic/simulation workflow safety and automatic-trigger guards.
- `kernel_governance` — the pulse algorithm, protected component map and its CI gate.

Exact path patterns and review targets are machine-owned in `ops/SETKA_KERNEL_MAP.json`.

## Trust boundary

`GREEN_BASELINE_MATCH` means the protected **GitHub/offline kernel** matches its reviewed baseline and its CI checks can be rerun quickly. It does **not** mean PostgreSQL integration, historical G1/G2 replay equivalence, live writer migration or dense-data compaction has been proven.

Until post-recovery proof says otherwise:

- PostgreSQL integration = `NOT_YET_VERIFIED`;
- dense compaction = forbidden;
- emergency cryosleep/resume policy remains authoritative.

## Baseline acceptance

When drift is intentional:

1. let Kernel Pulse identify the affected files/components;
2. run/inspect its automatic checks;
3. manually review only the reported semantic targets;
4. record the reviewed commit and CI evidence in `ops/SETKA_KERNEL_STATUS.json`;
5. rerun Kernel Pulse;
6. accept only when the new run returns `GREEN_BASELINE_MATCH`.

Do not weaken `SETKA_KERNEL_MAP.json` merely to make a red pulse green. Changes to the map itself are protected `kernel_governance` drift and require review.
