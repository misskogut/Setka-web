# SETKA Procedural Storage / Causal Replay Architecture v1

Status: canonical design note for implementation after PostgreSQL recovery.
Origin: President + ✎ Solai working session, 2026-09-02.

## 1. Core principle

SETKA must preserve **causality**, not every reproducible intermediate coordinate.

A deterministic or seed-reproducible trajectory is treated as a temporary expansion of a compact causal record. Heavy coordinate tables are working material, not permanent memory.

Canonical idea:

`STATE(t) = GENESIS + LAW + VARIABLES + IRREVERSIBLE_EVENTS<=t + REPLAY_CONTRACT`

If a value can be reproduced exactly from these inputs, it does not need to remain permanently materialized in PostgreSQL.

## 2. What must be permanently preserved

For every ship / synthetic / experiment, preserve the complete replay contract:

- entity / ship identity and lineage;
- equation family and exact algorithm version;
- algorithm/content hash;
- Genesis state;
- all equation parameters;
- seed / root seed and deterministic derivation rules;
- numerical precision, rounding and runtime rules required for exact replay;
- all behavior/personality/control variables that can affect choices or dynamics, including curiosity and any future ship-specific settings;
- every external or otherwise non-reproducible input;
- every branch-changing endogenous decision if it is not fully derivable from the replay contract;
- timestamps / logical ticks at which causal changes occur;
- sparse checkpoints;
- checkpoint hashes and trajectory/root hashes;
- final summaries/capsules and evidence metadata.

## 3. What should NOT be permanently stored by default

Do not persist every autopilot coordinate merely because the mathematical kernel produced it.

Examples of normally disposable / rematerializable data:

- every `x_n` of the logistic map between causal events;
- every Mandelbrot/iterative intermediate state between causal events;
- repeated full JSON snapshots of unchanged ship metadata;
- duplicate reports that can be generated deterministically from canonical state;
- dense coordinate tables used only for analysis or visualization;
- caches and derived aggregates that can be regenerated cheaply.

These may exist temporarily while a computation, visualization, audit or experiment is running, then be discarded after required evidence has been sealed.

## 4. Transcript semantics

The mother transcript is an append-only **minimal sufficient causal history**, not a dump of every mathematical step.

A transcript event is required when something information-bearing occurs, for example:

- creation / Genesis;
- equation or parameter change;
- curiosity or other ship-setting change;
- external signal / market snapshot / human instruction / LLM output;
- message received from another entity;
- newly observed non-reproducible environmental fact;
- branch/choice that changes future evolution and is not derivable from deterministic replay;
- role/task/state transition with semantic meaning;
- checkpoint / seal / root-hash commitment;
- experiment completion / capsule creation.

A transcript event is **not** required merely because the deterministic equation advanced from tick `n` to `n+1` with no causal change.

## 5. Sparse checkpoints

Store sparse checkpoints to reduce replay cost.

Example:

`GENESIS -> checkpoint 10k -> checkpoint 20k -> checkpoint 30k ...`

To inspect tick 27,431, restore checkpoint 20,000 and replay only the remaining 7,431 steps.

Checkpoint frequency must be selected from a storage-vs-replay-cost budget, not fixed blindly.

## 6. Exact replay requirement for chaotic systems

Chaotic systems are sensitive to tiny numerical differences. Therefore `equation + r + x0` alone is not sufficient for forensic-grade reproduction.

The replay contract must also fix the numerical semantics needed for exact reproduction, such as:

- Float64 vs decimal/fixed precision;
- rounding rules;
- operation ordering where relevant;
- algorithm implementation version;
- deterministic random generator and seed;
- execution/runtime version where it can affect results.

After replay, verify the regenerated segment against stored checkpoint/root hashes.

## 7. Data temperature model

### LIVE
Current state required for normal operation.

### TRACE
Recent detailed causal events and temporary working trace.

### CAPSULE
Compressed summaries, checkpoints, hashes and indexes.

### ARCHIVE
Immutable cold raw evidence outside the primary PostgreSQL database when raw history must be retained.

Cold archive should be compressed and hash-verified. PostgreSQL retains an archive pointer, event/tick range, manifest and cryptographic root.

## 8. Materialize on demand

Dense databases/coordinate series should be generated only when required for:

- visual inspection;
- scientific analysis;
- forensic proof;
- manual validation;
- comparison of trajectories;
- export.

After use, the materialized table may be discarded if its causes, irreversible inputs, evidence hashes and required archive have been preserved.

Conceptually:

`compact causal record -> MATERIALIZE -> inspect/compute/prove -> SEAL -> DROP CACHE`

## 9. Ship memory model

Each ship needs only a small persistent operational brain:

`IDENTITY + GENESIS + LAW + CURRENT_STATE + VARIABLES + IRREVERSIBLE_EVENTS + CHECKPOINT_CURSOR + HASHES`

The complete dense historical trajectory is not the ship's permanent brain. It is a reproducible view of that brain through time.

## 10. Safety rule for deletion / compaction

No raw or dense history may be deleted merely because it appears reproducible.

Before disposal, prove all of the following:

1. replay contract is complete;
2. the relevant range can be regenerated;
3. regenerated checkpoint/root hash matches the committed evidence;
4. all non-reproducible inputs are preserved;
5. any required scientific/legal/raw archive has been copied and independently hash-verified;
6. deletion target is derived/materialized data, not canonical causal evidence.

## 11. Implementation objective after recovery

After PostgreSQL becomes available:

1. perform full backup before cleanup;
2. identify largest relations and relation `base/5/62753`;
3. classify data as CANONICAL_CAUSE / IRREVERSIBLE_INPUT / CHECKPOINT / DERIVED / CACHE / ARCHIVE_CANDIDATE / TECH_GARBAGE;
4. redesign fleet/G2 writers so autopilot does not append every coordinate;
5. persist causal events + sparse checkpoints only;
6. introduce on-demand trajectory materialization;
7. introduce cold immutable archive for raw scientific evidence;
8. add storage watchdog and write-budget guards;
9. test exact replay on known G1/G2 segments before any destructive compaction.

## 12. Canonical formulation

**The transcript stores the minimum complete set of causes needed to reproduce the world. Reproducible consequences are computed on demand.**

Or, operationally:

**Do not store the universe when the universe can be unfolded from its law, variables, irreversible events and proof hashes.**
