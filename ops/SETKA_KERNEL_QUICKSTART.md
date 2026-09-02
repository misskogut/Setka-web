# SETKA Kernel Quickstart

Purpose: enter the protected GitHub/offline kernel in seconds without re-auditing unchanged territory.

## One entrypoint

Run:

`node ops/setka-kernel-pulse.mjs --verify`

That command is the default route. It reads the accepted baseline from `ops/SETKA_KERNEL_BASELINE_ACCEPTANCE.json`, reads the component/check registry from `ops/SETKA_KERNEL_MAP.json`, verifies baseline-transition evidence, computes exact component fingerprints, checks executable coverage and decides what work is actually necessary.

## Fast path

If protected fingerprints match the accepted baseline, the result is:

`GREEN_BASELINE_MATCH / FAST PATH`

No replay/property/resource/safety deep suites are rerun. Unchanged proof is reused.

If protected drift exists, the pulse runs only the check groups attached to the changed component(s), syntax-checks changed executable files and reports the exact manual semantic review targets. Automatic tests never self-accept drift.

Examples:

- documentation-only change outside protected paths -> no kernel run;
- `replay_math` drift -> replay core + property invariants + resource physics; Node runtime differential remains a separate cross-runtime CI proof;
- `storage_write` drift -> replay/storage core + resource physics;
- `runtime_safety` drift -> workflow safety audit;
- `kernel_governance` drift -> baseline/coverage/pulse self-behavior plus manual governance review;
- unknown executable under `core/` -> `UNCLASSIFIED_KERNEL_SURFACE` and manual review.

## Single registry

`ops/SETKA_KERNEL_MAP.json` is the machine-owned registry for:

- protected components and path membership;
- executable coverage;
- routed local check groups;
- external proof requirements;
- manual review targets;
- complexity policy.

Do not create a second registry for the same facts.

## Baseline

`ops/SETKA_KERNEL_BASELINE_ACCEPTANCE.json` is the sole authority for the accepted baseline. A baseline transition must name the previous baseline, the reviewed target commit, reviewer, reviewed components/files/semantics and CI evidence.

Green pulse outputs are derived evidence and belong in CI artifacts/logs. They are not committed back into the repository merely to say that nothing changed. This prevents the loop `verification -> status commit -> verification`.

## Complexity rule

Before adding a new protected file, component or control mechanism, prefer in this order:

1. delete something obsolete;
2. merge with an existing organ;
3. compute/derive the information on demand;
4. create new persistent structure only when the first three cannot represent the required independent information.

Any newly added protected file is routed to `COMPLEXITY_BUDGET` manual review. A new executable inside `core/` that is not classified is fail-closed.

## Trust boundary

A green GitHub/offline kernel still does **not** prove live PostgreSQL integration or historical G1/G2 equivalence.

Until post-recovery proof says otherwise:

- PostgreSQL integration = `NOT_YET_VERIFIED`;
- historical replay equivalence = `NOT_YET_PROVEN`;
- dense compaction = forbidden;
- emergency cryosleep/resume policy remains authoritative.
