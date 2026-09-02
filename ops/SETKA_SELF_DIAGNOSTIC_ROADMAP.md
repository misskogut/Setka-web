# SETKA — Self-Diagnostic Roadmap

Status: PRESERVED DESIGN BACKLOG / NOT YET IMPLEMENTED AS A COMPLETE RUNTIME ORGAN.

Purpose: preserve the self-diagnostic ideas that should reduce repeated human/AI re-analysis while avoiding a forest of separate monitors. This file is a roadmap, not proof that the capabilities below already exist.

## Core law

> **If a decision can be obtained from current system state plus a formal rule, do not call AI. Give AI only the residue of uncertainty.**

The target architecture is one shared self-diagnostic contract rather than many unrelated guards.

SETKA now treats optimization through four related boundaries:

`MEMORY -> what cannot be reconstructed?`

`STRUCTURE -> what cannot be generated from a smaller exact law plus residual?`

`COMPUTE -> what genuinely must be recomputed?`

`DISCLOSURE -> what genuinely must be revealed to the recipient?`

Operational formulation:

> **Do not store what can be reconstructed; do not enumerate what can be generated; do not recompute what can be derived from a verified delta/shared result; do not disclose what the recipient does not need.**

## SETKA Self-Diagnostic Contract — target primitive

Every significant organ should be able to expose a compact diagnostic state with fields equivalent to:

- `HEALTH`
- `MISSION_ALIGNMENT`
- `RESOURCE_COST`
- `AI_NECESSITY`
- `DEPENDENCIES`
- `CAUSAL_STORAGE`
- `STRUCTURAL_STORAGE`
- `COMPUTE_REUSE`
- `REPLAY_STATUS`
- `RECOVERABILITY`
- `SOVEREIGNTY`
- `ANOMALIES`
- `OPTIMIZATION_HINTS`

A single diagnostic/compiler layer should aggregate these states and decide whether to stay silent, suggest optimization, request review, or block a known prohibited transition.

## Diagnostic capabilities to add later

### 1. AI necessity / AI compiler

Track why every AI call exists. Repeated structurally equivalent reasoning should become a candidate for compilation:

`repeated AI reasoning -> detected stable pattern -> deterministic tests -> rule/primitive -> AI removed from that path`

Measure at least:

- AI calls per verified outcome;
- deterministic/cache/replay/rule resolutions versus AI resolutions;
- `AI Necessity Ratio`;
- avoidable AI-call rate;
- repeated reasoning eliminated;
- tokens/cost/latency avoided where measurable.

The objective is not AI = 0. The objective is **AI only where uncertainty genuinely remains**.

### 2. Capability-to-mass / architectural entropy monitor

Detect when permanent architecture grows faster than verified capability.

Candidate signals:

- protected executable/file growth;
- new entities/tables/contracts/dependencies;
- new mandatory vendors;
- new canonical storage surfaces;
- new background processes;
- capability gained per unit of permanent mass.

When capability/mass deteriorates, suggest merge, delete, derive, connector, hybridization, smaller primitive, or benchmark clarification rather than automatically rejecting the idea.

### 3. Semantic redundancy scanner

Look for duplicated meaning across schemas, JSON payloads, state stores, reports, contexts, snapshots and entities.

Target pattern:

`many copies of the same fact/context -> one canonical source + derived views/materializations`

The scanner must distinguish structural similarity from proof of semantic duplication; uncertain cases go to review.

### 4. Human-attention boundary

Do not report everything merely because it was measured.

Target attention states:

`GREEN -> silence`

`YELLOW -> accumulate / observe`

`ORANGE -> surface optimization hint`

`RED -> block or escalate`

The purpose is to reduce cognitive load and avoid spending AI/human attention on healthy deterministic state.

### 5. Universal causal-write question

Before permanent persistence, every writer should be able to answer:

> **Why must this value survive as canonical information?**

Examples of valid irreducible reasons may include external input, human decision, law/parameter change, nondeterministic model output, sensor observation, branch-changing event, checkpoint/seal, or other proven irreversible fact.

If replay can prove exact regeneration, prefer derived/materialized storage. If classification is uncertain, fail closed to review. Extend this principle beyond the current write-admission layer only after replay and recovery evidence is sufficient.

### 6. Sovereignty monitor

Continuously estimate whether the world survives loss of each external organ/vendor/device.

Questions should include:

- What remains if OpenAI is unavailable?
- What remains if Supabase/PostgreSQL is unavailable?
- What remains if GitHub is unavailable?
- What remains if the current phone/device is lost?
- What remains if a connector disappears or becomes economically unusable?

Candidate output:

`world survivability without dependency X = measurable recovery/operation score`

The goal is that specialist capability may disappear temporarily without destroying identity, canonical causal history or the ability to reconstruct the world.

### 7. Recovery self-test

Regularly prove—not assume—that an approved capsule/checkpoint/backup plus kernel law can reconstruct the intended state. Track missing material, stale recovery metadata, broken lineage and vendor-dependent recovery paths.

### 8. Diagnostic self-cost / recursive guard

The diagnostic system must diagnose itself.

Every new guard/monitor should justify its own permanent cost:

- how much repeated human/AI work it removes;
- how many meaningful defects/risks it catches;
- how much latency/compute/storage it adds;
- whether the same protection can be merged into an existing contract;
- whether the monitor becomes more expensive than the problem it solves.

Canonical recursive rule:

> **SETKA optimizes itself, including the cost of optimization itself.**

### 9. Computational Irreducibility Boundary / compute planner

Working question:

> **What part of this result actually has to be computed again?**

The target is not to avoid necessary computation. It is to distinguish genuinely new computation from work already implied by a small causal delta, immutable shared prefix, deterministic prior result, proof, sparse candidate set or cheaper equivalent execution path.

Canonical decision shape:

`FULL INPUT + FULL RECOMPUTE`

should become, where mechanically proven:

`PREVIOUS VERIFIED RESULT + CAUSAL DELTA -> INCREMENTAL RESULT`

or

`CONTENT HASH -> VERIFIED REUSABLE RESULT`

or

`SHARED PREFIX + BRANCH DELTA -> COUNTERFACTUAL RESULT`

or

`CHEAP HIGH-RECALL PREFILTER -> SMALL CANDIDATE SET -> EXACT VERIFICATION`.

Approximation is never silently promoted to canonical truth. Exactness requirements, false-negative tolerance, privacy, provenance and replay constraints are evaluated before resource cost.

### 10. Incremental computation / dependency propagation

When a bounded causal change affects only part of the world, propagate only that change through a proven dependency graph.

Target:

`OLD RESULT + VERIFIED DELTA -> NEW RESULT`

Candidate metrics:

- fraction of world recomputed per causal change;
- CPU avoided versus full recompute;
- affected-node precision/recall;
- invalidation correctness;
- latency to stable result.

Unknown dependency/invalidation semantics must fail closed to review.

### 11. Content-addressed DAG / structural sharing

Branches, snapshots and worlds with identical immutable prefixes or substructures should reference one content-addressed object instead of storing duplicate copies.

Target:

`COMMON PREFIX -> branch A delta / branch B delta / ...`

Useful for counterfactual worlds, replay checkpoints, repeated knowledge structures and immutable artifacts. A shared node is reused only when its semantic identity includes all required content/version/runtime meaning, not merely because bytes look similar.

### 12. Probabilistic sketches as sensors, not truth

Candidate tools include Bloom/Cuckoo filters, HyperLogLog, Count-Min Sketch and quantile sketches.

Useful questions:

- probably seen before?
- approximate unique count?
- heavy hitters?
- approximate distribution?

These can compress enormous streams into tiny working summaries, but lossy sketches are not canonical evidence where exactness is required. Their role is prefiltering, monitoring, prioritization or explicitly approximate product outputs.

### 13. Merkle trees / Merkle DAG / compact integrity proofs

Use cryptographic commitment structures where a compact root plus proof can establish membership/integrity without transferring the whole dataset.

Potential uses:

- capsule integrity;
- archive manifests;
- fleet/company evidence roots;
- shared knowledge provenance;
- checkpoint/state commitments.

Important boundary:

`Merkle proof = integrity/membership under declared hash contract`

not

`Merkle proof = semantic truth of the fact`.

### 14. Delta / dictionary / grammar compression

Beyond mathematical generator laws, repeated substructures may be represented as:

`BASE + DELTAS`

or

`REUSABLE STRUCTURAL GRAMMAR + REFERENCES`.

This is a candidate for repeated entity schemas, graphs, reports, configuration trees and branch state. It must be benchmarked against mature conventional compression and must preserve exact reconstruction where canonical replacement is proposed.

### 15. Space-filling curves / multidimensional locality

Hilbert and Morton/Z-order mappings can convert multidimensional coordinates into sortable one-dimensional keys while preserving useful locality for some workloads.

Candidate SETKA use:

`time × state × activity × curiosity × branch × other dimensions -> locality key`

Possible benefits include clustering nearby multidimensional states, reducing index range cost and improving storage locality. No curve is privileged: adoption requires a workload benchmark against mature database/spatial/vector indexes.

### 16. LSH / MinHash / ANN candidate generation

For large-scale similarity/dedup searches, avoid all-to-all exact comparison when a safe high-recall candidate generator can reduce the search space.

Target:

`large corpus -> signature/index -> candidate set -> exact semantic/causal verification`.

Candidates include MinHash/LSH and mature ANN/vector indexes such as HNSW-class approaches where appropriate. Approximate candidate generation requires an explicit recall/false-negative contract.

### 17. Consistent / rendezvous hashing

Use deterministic placement functions where a fleet/entity set must be mapped to nodes/shards with limited remapping during topology changes.

This may remove giant placement tables and reduce coordination/rebalance cost. Placement is not identity: canonical entity identity/history remains independent of whichever node currently hosts it.

### 18. Sparse representations / compressed bitmaps

When most possible relations are absent, avoid storing dense false/empty state.

Candidate tools:

- sparse matrices;
- Roaring-style compressed bitmaps;
- succinct exact sets/adjacency representations.

Useful for fast exact set operations such as membership, intersection, union and difference across large fleets or graphs. Benchmark against PostgreSQL/native indexes and graph-specific stores before custom adoption.

### 19. Streaming change-point detection

A high-frequency signal may be monitored continuously while only meaningful regime boundaries are promoted for deeper analysis.

Target:

`stable... stable... stable... -> CHANGE CANDIDATE`.

Candidate methods include CUSUM and Bayesian/online change-point families. These algorithms are **sensors**, not automatic causal truth. Until missed-change behavior is bounded for the information class, they cannot justify deletion of required raw/irreversible evidence.

### 20. Adaptive checkpointing

Checkpoint intervals should be selected from observed trade-offs rather than a blind constant.

Possible inputs:

- replay cost;
- request frequency;
- branch frequency;
- volatility/change density;
- recovery requirements;
- storage cost;
- latency budget.

A frequently inspected/expensive region may justify denser checkpoints; cheap stable regions may justify sparse checkpoints. Canonical causes remain authoritative regardless of checkpoint density.

### 21. Memoization / content-addressed result reuse

A deterministic computation may be reused only when the cache key captures every semantically relevant dependency, for example:

`law hash + state hash + input hashes + runtime/numeric contract + algorithm version -> result hash`.

If any required identity changes, the old result is not silently reused.

Target metrics:

- verified cache-hit rate;
- CPU/AI calls avoided;
- invalidation failures (target zero for exact paths);
- cache bytes versus saved compute.

### 22. Approximate first, exact last

For expensive large searches, use cheap bounded layers only to reduce candidates:

`cheap membership/filter -> sketch/signature -> locality/ANN candidate set -> exact causal/domain verification -> proof`.

Approximation is acceptable only where its error contract is explicit. Where missing a candidate is unsafe, the prefilter must demonstrate the required recall or an alternate complete path must exist.

### 23. Cost-based execution / query planner

SETKA should eventually choose among multiple valid ways to obtain a result:

- replay from checkpoint;
- incremental delta propagation;
- verified cache/result reuse;
- temporary materialization;
- sparse/index query;
- local computation;
- external connector.

Decision order:

`correctness/exactness -> causal/replay constraints -> privacy/disclosure -> provenance -> recoverability -> measured resource cost`.

Only after the hard semantic constraints pass should the planner minimize:

`CPU + GPU + storage IO + network + latency + energy + money + AI calls + privacy exposure`.

This is the target computational metabolism of SETKA: not merely being able to compute a result, but choosing the cheapest verified path to it.

## Preferred implementation order

Do not implement all of the above as separate services.

Preferred progression:

`Mission Gate -> shared Self-Diagnostic Contract -> deterministic organ adapters -> compute/reuse cost contract -> attention aggregation -> only then optional UI/live-system integration`.

For computational optimization specifically:

`instrument current costs -> prove dependency/hash/replay semantics -> benchmark mature baselines -> introduce one optimization primitive at a time -> verify exactness/resource delta -> keep only winners`.

Use existing `SETKA_KERNEL_MISSION_POLICY_V1`, `setka-mission-gate.mjs`, Kernel Pulse, replay/write-admission/resource contracts as the starting substrate rather than duplicating them.

## AI escalation rule

The target pipeline is:

`system state -> deterministic checks -> replay/hash/budget/policy/dependency/cache analysis -> optimization hints -> unresolved ambiguity only -> AI/human review`.

AI should be used for semantic ambiguity, novel capability abstraction, trade-off synthesis and genuinely new architecture—not for rediscovering known state that the machine can measure directly.

## Relationship to current system state

Already implemented before/through this roadmap:

- machine-readable mission policy;
- deterministic Mission Gate;
- ALIGNED / OPTIMIZE / REVIEW_REQUIRED / BLOCK decision states;
- proposal preflight;
- Git diff diagnosis through Kernel Pulse;
- deterministic-first AI policy for known checks;
- machine-readable Structural Irreducibility / procedural generator policy;
- machine-readable Computational Irreducibility / computation-reuse policy and Mission Gate signals.

Not yet implemented as complete live runtime organs:

- the shared Self-Diagnostic Contract;
- AI Necessity Ratio runtime accounting;
- repeated-reasoning-to-rule compiler;
- semantic redundancy scanner;
- sovereignty survivability scoring;
- human-attention aggregation;
- recursive diagnostic-cost accounting;
- full-system causal-write justification;
- live dependency/incremental computation graph;
- content-addressed world DAG;
- production sketches/change-point detectors;
- adaptive checkpoint controller;
- production content-addressed compute cache;
- SETKA-specific locality/similarity index;
- cost-based execution planner;
- live President-panel self-diagnostic UI.

The listed algorithms are **candidate organs and comparison baselines**, not claims that SETKA already implements or outperforms mature databases, caches, indexes, compression libraries or distributed systems.

## Recovery boundary

This roadmap is GitHub/offline design preservation only. It does not authorize PostgreSQL/Supabase writes, does not relax cryosleep, and does not bypass the existing post-recovery backup/audit/handshake gates.
