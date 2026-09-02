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
- causal inactivity/autopilot intervals and the clock/tick mapping needed to measure them;
- logical step / generated-coordinate counts between causal events, or enough boundaries to derive those counts exactly;
- every parameter mutation with its exact causal boundary;
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

The mother transcript is an append-only **minimal sufficient causal history**, not a dump of every mathematical step or every second of elapsed time.

A transcript event is required when something information-bearing occurs, for example:

- creation / Genesis;
- equation or parameter change;
- curiosity or other ship-setting change;
- external signal / market snapshot / human instruction / LLM output;
- message received from another entity;
- newly observed non-reproducible environmental fact;
- branch/choice that changes future evolution and is not derivable from deterministic replay;
- role/task/state transition with semantic meaning;
- start/end of sleep, pause, cryosleep or another time-mode change;
- checkpoint / seal / root-hash commitment;
- experiment completion / capsule creation.

A transcript event is **not** required merely because the deterministic equation advanced from tick `n` to `n+1` with no causal change.

## 5. Causal inactivity and autopilot time

Elapsed time with no semantic activity is still analytically valuable, but it must be stored as an **interval**, not as one row per second/tick.

The system must be able to answer questions such as:

- how long a ship remained on pure autopilot before the next endogenous activity;
- latency between two meaningful actions;
- distribution of active vs inactive time;
- whether activity frequency changes with ship variables such as curiosity;
- whether sleep/wake or environmental changes alter the timing of activity.

Canonical representation should use interval boundaries and mode, for example:

`AUTOPILOT_INTERVAL { ship_id, start_tick, end_tick, start_time, end_time, elapsed_ms, generated_steps, generated_points, mode, clock_contract_version }`

or derive the interval and counts from two adjacent causal events when the clock/step mapping is unambiguous.

Do **not** emit one `NO_ACTIVITY` event per second or per deterministic tick.

Important distinction:

- `CAUSAL_IDLE` = no new semantic action while deterministic autopilot continues;
- `SLEEP` = active WILL/exploration disabled under an explicit sleep regime;
- `PAUSED/CRYOSLEEP` = progression may be externally stopped or governed by a different clock contract;
- `COMPUTE_ONLY` = calculations continue but no information-bearing event is emitted.

For exact replay, preserve the mapping between wall-clock time and logical ticks whenever it is not fixed by the law itself. If tick cadence changes, pauses occur, or batches are executed faster/slower than simulated time, the timing rule/version and interval boundaries become part of the replay contract.

The transcript therefore preserves **when meaningful change happened and how much causal silence separated changes**, without storing the passage of time second by second.

## 6. Dual step-time coordinate metrics

SETKA must preserve two independent axes between meaningful events:

1. **wall/simulated time** — how much time elapsed;
2. **logical mathematical distance** — how many equation steps / coordinates were generated during that interval.

Example:

`EVENT A @ tick 12,000 / 17:00:00`

`AUTOPILOT: 18m 12s / 43,680 logistic steps`

`EVENT B @ tick 55,680 / 17:18:12`

This allows the same history to be viewed both temporally and step-wise without storing all 43,680 coordinates.

Useful derived metrics include:

- `steps_between_events`;
- `points_between_events`;
- `elapsed_ms_between_events`;
- `steps_per_second` or simulated-coordinate velocity;
- activity density per 1,000 / 10,000 mathematical steps;
- activity rate per minute/hour of wall or simulated time;
- time-to-event and steps-to-event;
- changes in activity density as curiosity or other ship variables change.

Storage rule: if one deterministic tick always produces exactly one coordinate, `generated_points = end_tick - start_tick` should normally be **derived**, not redundantly stored. If the mapping is variable (batching, adaptive stepping, skipped ticks, multi-point generation, changed integrator, different clock contract), preserve the exact count or the generation rule/version that makes the count recoverable.

For fast analytics, a capsule or interval index may cache the derived counts even though the dense coordinate values themselves remain unmaterialized.

This creates a compact two-dimensional chronology:

`causal event -> {elapsed time, generated mathematical distance} -> causal event`

Thus SETKA can answer not only **"how long until the ship acted?"** but also **"how far through its mathematical trajectory did it travel before acting?"**

## 7. Parameter mutation schedule / causal patches

A parameter change is itself a canonical causal event and must be anchored to the exact replay boundary where it becomes effective.

For every mutation preserve at least:

- `ship_id` / entity id;
- parameter name or parameter-set id;
- previous value when needed for audit;
- new value;
- effective logical tick / coordinate boundary;
- effective wall/simulated time when relevant;
- source/reason of the change;
- whether the change was external, endogenous-deterministic, or endogenous-nonreproducible;
- rule/version used to apply the change;
- evidence/hash as required.

Canonical example:

`PARAM_CHANGE { ship_id: 437, tick: 55_680, time: 17:18:12, parameter: curiosity, from: 0.42, to: 0.61, source: experiment_control }`

Replay must **not guess or infer** historical parameter changes. The replay engine re-runs the original law and applies the exact recorded parameter patch at the exact recorded boundary.

Conceptually:

`GENESIS + LAW(P0)`
`-> replay to tick A`
`-> APPLY PATCH P1`
`-> replay to tick B`
`-> APPLY PATCH P2`
`-> ...`

This means a ship can reconstruct its own dense historical trajectory from a compact causal program: equation + initial variables + ordered parameter/event schedule + timing/step boundaries + replay contract.

The stored mutation schedule is therefore analogous to a patch stream over the equation. It allows the ship to restore the historical configuration of the mathematical system at every meaningful point without keeping the full coordinate database permanently materialized.

If a parameter change is itself deterministically derivable from an earlier canonical rule, it may be regenerated, but its boundary and proof must still be recoverable. For forensic and scientific use, important experiment-control changes should normally be persisted explicitly.

## 8. Sparse checkpoints

Store sparse checkpoints to reduce replay cost.

Example:

`GENESIS -> checkpoint 10k -> checkpoint 20k -> checkpoint 30k ...`

To inspect tick 27,431, restore checkpoint 20,000 and replay only the remaining 7,431 steps.

Checkpoint frequency must be selected from a storage-vs-replay-cost budget, not fixed blindly.

## 9. Exact replay requirement for chaotic systems

Chaotic systems are sensitive to tiny numerical differences. Therefore `equation + r + x0` alone is not sufficient for forensic-grade reproduction.

The replay contract must also fix the numerical semantics needed for exact reproduction, such as:

- Float64 vs decimal/fixed precision;
- rounding rules;
- operation ordering where relevant;
- algorithm implementation version;
- deterministic random generator and seed;
- execution/runtime version where it can affect results.

After replay, verify the regenerated segment against stored checkpoint/root hashes.

## 10. Data temperature model

### LIVE
Current state required for normal operation.

### TRACE
Recent detailed causal events and temporary working trace.

### CAPSULE
Compressed summaries, checkpoints, hashes, timing intervals, step/point counts, parameter mutation schedule and indexes.

### ARCHIVE
Immutable cold raw evidence outside the primary PostgreSQL database when raw history must be retained.

Cold archive should be compressed and hash-verified. PostgreSQL retains an archive pointer, event/tick range, manifest and cryptographic root.

## 11. Materialize on demand

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

## 12. Ship memory model

Each ship needs only a small persistent operational brain:

`IDENTITY + GENESIS + LAW + CURRENT_STATE + VARIABLES + PARAMETER_PATCHES + IRREVERSIBLE_EVENTS + TIME_INTERVALS + STEP_BOUNDARIES + CHECKPOINT_CURSOR + HASHES`

The complete dense historical trajectory is not the ship's permanent brain. It is a reproducible view of that brain through time.

## 13. Recursive knowledge capsules / hierarchy of memory

A large SETKA installation must not scale by copying every descendant transcript into one parent database.

Canonical hierarchy:

`ship life -> ship capsule -> fleet capsule -> company capsule -> domain capsule -> mother knowledge`

Each level applies the same information rule:

> **Preserve what is new and irreducible at this level; derive, aggregate or reference what is already represented below.**

A child is authoritative for its detailed local causal history. A parent normally receives a compact **knowledge delta**, not the child's life.

A future hierarchical capsule should be able to carry fields equivalent to:

`KNOWLEDGE_CAPSULE { scope, interval, law_version, novelty_type, semantic_result, conditions, effect_metrics, confidence_or_uncertainty, source_count, independent_source_count, child_evidence_roots, provenance_root, disclosure_class, parent_knowledge_relation }`

Useful `novelty_type` values may include:

- `DISCOVERY`;
- `HYPOTHESIS_SUPPORT`;
- `HYPOTHESIS_REFUTATION`;
- `HYPOTHESIS_REFINEMENT`;
- `ANOMALY`;
- `CAPABILITY_DELTA`;
- `RISK`;
- `OUTCOME`.

Useful parent relations may include:

- `NOVEL`;
- `CONFIRMS`;
- `REFUTES`;
- `REFINES`;
- `DUPLICATE`.

If many children report semantically equivalent evidence, the parent should consolidate rather than duplicate:

`N child observations of pattern X -> one parent knowledge object {support_count, independent_sources, effect_distribution, conditions, provenance_roots}`

The parent's canonical memory should therefore grow primarily with **new knowledge**, not with raw child count or raw event count.

Target metric:

`VERIFIED_KNOWLEDGE_GAIN_PER_CANONICAL_BYTE`

A parent may request/materialize deeper detail only when necessary and permitted. Within one owner domain, provenance may permit drill-down to local evidence. Across company/owner boundaries, privacy policy may intentionally expose only a proof/aggregate root and forbid access to underlying private source rows.

Kernel/law changes distributed from a mother/parent are not retroactive rewrites. They must use versioned handshake and append-only lineage:

`child LAW vN -> approved/compatible handshake -> child LAW vN+1`

## 14. Minimum sufficient disclosure / cross-owner privacy

The storage boundary and the disclosure boundary are different.

Storage asks:

> **What must survive because it cannot be reconstructed?**

Disclosure asks:

> **What is the minimum information another scope must receive to perform an allowed function or understand an allowed result?**

Canonical law:

**Minimum sufficient memory + minimum sufficient disclosure.**

Disclosure classes:

### PRIVATE_RAW
Raw/source data stays inside the owner's local/company contour by default. It is not copied upward merely because a mother/fleet/global model exists.

### LOCAL_CAUSAL
The local causal representation may still contain confidential or indirectly identifying context. Common SETKA semantics do not make it automatically safe to share.

### SHAREABLE_DERIVED
A bounded causal/statistical result compiled locally for an allowed upstream recipient. It should not require raw source rows or direct identifiers.

### GLOBAL_KNOWLEDGE
A parent/mother knowledge object aggregated across permitted worlds, with allowed provenance and no direct identifiers.

A shared SETKA schema/law/version lets a mother interpret a child's result without reading the child's raw database. This interoperability is valuable, but **semantic normalization is not anonymity**. Exact timestamps, rare combinations, excessive precision, tiny samples, unique trajectories and unusual events can permit re-identification.

Target local boundary:

`PRIVATE_RAW / LOCAL_CAUSAL`
`-> purpose + disclosure classification`
`-> retain only required causal result`
`-> remove direct identifiers`
`-> bound unnecessary precision/timing/rarity exposure`
`-> assess re-identification risk`
`-> attach permitted aggregate evidence/provenance`
`-> SHAREABLE_DERIVED / GLOBAL_KNOWLEDGE`

Working name for this target layer: **Privacy Compiler**.

The full Privacy Compiler is not yet implemented by this document. Until a real runtime contract and tests exist, unknown disclosure/re-identification semantics must fail closed to review.

Future implementations may optionally use secure aggregation or zero-knowledge proofs when they materially reduce disclosure while preserving useful verification. These mechanisms are tools, not automatic requirements.

Hard architectural rule:

> **A child should be able to tell the mother what it learned without being required to send the mother its private life.**

## 15. Safety rule for deletion / compaction

No raw or dense history may be deleted merely because it appears reproducible.

Before disposal, prove all of the following:

1. replay contract is complete;
2. the relevant range can be regenerated;
3. regenerated checkpoint/root hash matches the committed evidence;
4. all non-reproducible inputs are preserved;
5. all timing-mode changes and required inactivity interval boundaries are preserved;
6. mathematical step/coordinate distance between causal events can be reconstructed exactly;
7. every parameter mutation can be restored at the exact historical boundary where it became effective;
8. any required scientific/legal/raw archive has been copied and independently hash-verified;
9. deletion target is derived/materialized data, not canonical causal evidence;
10. any upstream knowledge capsule that depends on the data retains sufficient permitted provenance/evidence roots after compaction;
11. privacy/disclosure requirements do not require retaining or centralizing data that the owner intended to remain local.

## 16. Implementation objective after recovery

After PostgreSQL becomes available:

1. perform full backup before cleanup;
2. identify largest relations and relation `base/5/62753`;
3. classify data as CANONICAL_CAUSE / IRREVERSIBLE_INPUT / PARAMETER_PATCH / TIME_INTERVAL / STEP_INTERVAL / CHECKPOINT / DERIVED / CACHE / ARCHIVE_CANDIDATE / TECH_GARBAGE;
4. redesign fleet/G2 writers so autopilot does not append every coordinate;
5. persist causal events + parameter patches + time/step interval boundaries + sparse checkpoints only;
6. introduce on-demand trajectory materialization;
7. introduce cold immutable archive for raw scientific evidence;
8. add storage watchdog and write-budget guards;
9. test exact replay on known G1/G2 segments before any destructive compaction;
10. verify that both activity timing statistics and mathematical-distance statistics can be reconstructed without per-second/per-tick raw rows;
11. verify that a replay can re-apply every historical parameter change at the exact original tick/time boundary;
12. only after the core replay/storage path is proven, define a reviewed hierarchical knowledge-capsule runtime contract instead of bulk-copying child transcripts upward;
13. only after privacy semantics are explicit, define a reviewed local disclosure/Privacy Compiler path for cross-owner/company knowledge sharing;
14. benchmark mother-memory growth against child count and verified knowledge gain rather than assuming hierarchical compression works.

## 17. Canonical formulation

**The transcript stores the minimum complete set of causes needed to reproduce the world. Reproducible consequences are computed on demand.**

**Time is recorded at meaningful boundaries: the system stores the duration of causal silence, not a row for every silent second.**

**Mathematical distance is recorded at the same boundaries: the system preserves how many equation steps/coordinates occurred between events without storing every coordinate.**

**Parameter history is stored as an ordered causal patch stream: replay applies the same changes at the same historical boundaries.**

**Children store life; fleets and organizations capsule experience; parents store novel knowledge with permitted provenance.**

**The system discloses the minimum sufficient result, not the maximum available private context.**

Or, operationally:

**Do not store the universe when the universe can be unfolded from its law, variables, parameter patches, irreversible events, timing/step intervals and proof hashes. Do not centralize a child's private universe when the parent only needs the child's verified discovery.**
