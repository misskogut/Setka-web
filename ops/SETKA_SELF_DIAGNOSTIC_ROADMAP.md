# SETKA — Self-Diagnostic Roadmap

Status: PRESERVED DESIGN BACKLOG / NOT YET IMPLEMENTED AS A COMPLETE RUNTIME ORGAN.

Purpose: preserve the self-diagnostic ideas that should reduce repeated human/AI re-analysis while avoiding a forest of separate monitors. This file is a roadmap, not proof that the capabilities below already exist.

## Core law

> **If a decision can be obtained from current system state plus a formal rule, do not call AI. Give AI only the residue of uncertainty.**

The target architecture is one shared self-diagnostic contract rather than many unrelated guards.

## SETKA Self-Diagnostic Contract — target primitive

Every significant organ should be able to expose a compact diagnostic state with fields equivalent to:

- `HEALTH`
- `MISSION_ALIGNMENT`
- `RESOURCE_COST`
- `AI_NECESSITY`
- `DEPENDENCIES`
- `CAUSAL_STORAGE`
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

## Preferred implementation order

Do not implement all of the above as separate services.

Preferred progression:

`Mission Gate -> shared Self-Diagnostic Contract -> deterministic organ adapters -> attention aggregation -> only then optional UI/live-system integration`

Use existing `SETKA_KERNEL_MISSION_POLICY_V1`, `setka-mission-gate.mjs`, Kernel Pulse, replay/write-admission/resource contracts as the starting substrate rather than duplicating them.

## AI escalation rule

The target pipeline is:

`system state -> deterministic checks -> replay/hash/budget/policy/dependency analysis -> optimization hints -> unresolved ambiguity only -> AI/human review`

AI should be used for semantic ambiguity, novel capability abstraction, trade-off synthesis and genuinely new architecture—not for rediscovering known state that the machine can measure directly.

## Relationship to current system state

Already implemented before this roadmap:

- machine-readable mission policy;
- deterministic Mission Gate;
- ALIGNED / OPTIMIZE / REVIEW_REQUIRED / BLOCK decision states;
- proposal preflight;
- Git diff diagnosis through Kernel Pulse;
- deterministic-first AI policy for known checks.

Not yet implemented as a complete organ:

- the shared Self-Diagnostic Contract;
- AI Necessity Ratio runtime accounting;
- repeated-reasoning-to-rule compiler;
- semantic redundancy scanner;
- sovereignty survivability scoring;
- human-attention aggregation;
- recursive diagnostic-cost accounting;
- full-system causal-write justification;
- live President-panel self-diagnostic UI.

## Recovery boundary

This roadmap is GitHub/offline design preservation only. It does not authorize PostgreSQL/Supabase writes, does not relax cryosleep, and does not bypass the existing post-recovery backup/audit/handshake gates.
