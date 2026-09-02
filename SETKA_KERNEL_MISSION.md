# SETKA — Kernel Mission

Status: CANONICAL DIRECTION / IMPLEMENTATION MUST REMAIN EVIDENCE-DRIVEN.

Purpose: define what the SETKA kernel should continuously optimize toward, independent of any single vendor, cloud, model, database, device, or product interface.

## Mission

> **Make a human- or entity-owned world as small, reproducible, portable, sovereign, connectable and provable as possible.**

SETKA should evolve toward a state where the owner can carry the canonical causal essence of their world, reconstruct it on compatible compute, operate safely offline where possible, and connect stronger external systems as replaceable organs without surrendering identity, causal history, branch lineage, validation boundaries or kernel self-history.

Working name for this destination:

**Sovereign Portable World.**

This mission complements the existing **Provable Causal World Runtime** strategy:

`causal sufficiency -> exact replay -> small portable capsule -> local sovereignty -> replaceable compute -> external systems as connectors -> verified sync -> append-only history`

## Kernel optimization directions

The kernel should prefer changes that measurably improve one or more of these dimensions without degrading causal completeness or safety:

1. **Causal compression** — reduce canonical bytes/writes by storing sufficient causes, irreversible inputs, exact boundaries and sparse checkpoints instead of reproducible noise.
2. **Replay exactness** — reconstruct approved deterministic state with verifiable hashes and explicit numerical/runtime semantics.
3. **Portability** — keep the canonical world independent of one CPU, phone, cloud, database or AI provider.
4. **Local-first survival** — preserve useful operation and causal recording when the network/cloud is unavailable, then reconcile safely when connectivity returns.
5. **User/entity sovereignty** — the owner can possess the canonical encrypted capsule and is not dependent on a vendor account being alive in order for the world to exist.
6. **Connector neutrality** — specialist systems (AI models, Temporal-like durability, Palantir-like enterprise twins, databases, sensors, GPUs, future services) are replaceable organs, not the source of SETKA identity or history.
7. **Selective disclosure** — a connector receives only the minimum data/capabilities required for its operation; it does not automatically receive the whole world.
8. **Cryptographic provenance** — identity, capsule integrity, important events and kernel state can be independently verified.
9. **Resource physics** — storage, writes, CPU/GPU time, energy, latency and AI calls are first-class costs the kernel measures and minimizes per verified outcome.
10. **Recoverability** — loss of a phone, cloud outage or connector failure must not imply loss of the world; recovery must be possible from protected independent material without making one physical token the sole copy.

## Portable-world target architecture

The long-term shape is:

`SETKA CAPSULE = identity + Genesis + laws + variables + irreversible inputs + causal patches + time/step boundaries + sparse checkpoints + hashes + permissions + recovery metadata`

The capsule should be able to bind temporarily to available compute:

`capsule -> phone / laptop / local node / server / GPU / future compute`

and to external organs:

`SETKA -> connector -> specialist system -> bounded result -> provenance capture -> causal decision`

The external organ may be vastly stronger than SETKA at its specialty. SETKA remains responsible for the causal role of that organ inside the world.

## Capability assimilation law

SETKA should treat an external system as a capability source, not as a permanent architectural dependency.

Preferred progression:

`DISCOVER -> CONNECT -> OBSERVE -> BENCHMARK -> ABSTRACT CAPABILITY -> DECIDE: KEEP CONNECTOR / HYBRIDIZE / IMPLEMENT NATIVE EQUIVALENT`

The objective is not to copy a vendor or reproduce proprietary internals. The objective is to understand the **general capability contract** well enough that SETKA can choose the cheapest, safest and most sovereign execution path for that capability.

Three valid outcomes exist:

1. **Keep connector** — the external system remains clearly superior or cheaper at its specialty.
2. **Hybridize** — SETKA keeps identity/history/provenance locally while delegating only the expensive specialist operation.
3. **Native equivalent** — when a capability can be reproduced from SETKA's own causal model substantially more simply, cheaply or portably, implement only the minimum equivalent capability inside SETKA.

A native equivalent is accepted only when benchmarked against the external capability on the relevant contract. Measure at least correctness/utility, latency, storage, compute, energy, monetary cost, portability, privacy exposure and provenance completeness.

The strategic asymmetry is:

> **External systems can increase SETKA's capability immediately through connectors, while repeated use can reveal which parts are commodity and which can later collapse into a lighter native SETKA primitive.**

This allows SETKA to gain capability faster than it grows in architectural weight.

Do not confuse this with universal replacement. Some external systems may remain permanently better organs. SETKA wins only if the world remains sovereign and the capability remains replaceable.

## Hardware path — optional, not required for the mission

Do not make custom hardware a prerequisite.

- **Capsule v0:** encrypted software capsule on a phone/computer with verified replay.
- **Key v1:** optional USB-C/NFC secure token carrying identity/recovery authority and/or encrypted capsule material while the phone supplies screen and compute.
- **Node v2:** optional small local compute node for replay, guards, cryptography and lightweight local models.

A physical key must never be the only copy of the world.

## What the kernel must NOT optimize toward

- maximum feature count;
- reproducing every specialist platform internally;
- dependence on a single AI/model/cloud/database vendor;
- storing every deterministic state, coordinate, tick or snapshot;
- treating generated scenarios as causal truth without validation;
- making the user upload the whole world merely to access one connector;
- custom hardware before the software capsule/replay contract is proven;
- symbolic use of Mandelbrot, phi, pi or other mathematics without a measurable role.

## Mission metrics

This mission becomes real only through measurable progress. Track at least:

- canonical bytes per exactly reproducible history/step budget;
- exact replay verification coverage;
- branch creation cost from a shared prefix;
- capsule size for a fixed verified world;
- reconstruction time and compute on a reference phone/laptop;
- useful offline operating duration and offline event fidelity;
- number of mandatory vendor dependencies required to reconstruct the world;
- connector replacement success without loss of canonical identity/history;
- percentage of connector calls using minimum scoped disclosure;
- recovery success after simulated phone/cloud/connector loss;
- storage/energy/AI-call cost per verified outcome;
- number of external capabilities available through connectors versus mandatory dependencies;
- capability-assimilation ratio: capabilities gained without equivalent growth in canonical kernel complexity;
- native-equivalent efficiency when a connector capability is replaced or hybridized: cost/latency/storage/privacy/provenance before vs after.

The strategic goal is not to claim universal superiority. It is to make SETKA increasingly difficult to obsolete because stronger future systems can be connected rather than requiring the SETKA world to migrate into them.

## Relationship to current recovery work

The 2026-09-02 Supabase incident is a direct lesson for this mission: the living database may fail, while the reproducible law and compact causal world must remain recoverable outside that failure domain.

The existing PostgreSQL recovery gates, backup/audit plan and GitHub->database handshake remain authoritative. This mission does **not** relax cryosleep or authorize any live Supabase write.

## Decision rule for future kernel changes

For any substantial kernel proposal, ask:

> **Does this make the world more causally complete, reproducible, portable, sovereign, connector-neutral, safe or resource-efficient — and can we measure the improvement?**

For any proposed external capability, also ask:

> **Should SETKA connect it, hybridize it, or collapse it into a lighter native primitive — and what benchmark proves the choice?**

If the answer cannot be measured, it is not automatically a kernel priority.

Related strategy/evidence:
- `docs/SETKA_WORLD_LANDSCAPE_2026-09-02.md`
- `docs/SETKA_LEAPFROG_STRATEGY_2026-09-02.md`
- `docs/SETKA_PROCEDURAL_STORAGE_V1.md`
- `ops/SETKA_POST_RECOVERY_BOOTSTRAP_V1.md`
- `ops/SETKA_SUPABASE_KERNEL_SYNC_TODO.md`
