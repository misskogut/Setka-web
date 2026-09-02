# SETKA — World Landscape / Prior-Art Snapshot — 2026-09-02

Status: RESEARCH SNAPSHOT / NOT A LEGAL FREEDOM-TO-OPERATE OPINION.

Purpose: place current SETKA/VERSTAK architecture against the 2026 world frontier so a future run can answer: what already exists, where SETKA is convergent with the market, where it may be differentiated, and where SETKA is still behind mature systems.

## Executive conclusion

SETKA is **not unique because it uses Mandelbrot, bifurcation/logistic dynamics, golden ratio, pi, event logs, digital twins, agents or counterfactuals individually**. Every one of those ingredients has prior art.

The potentially differentiated area is the **composition**:

`identity + append-only causal history + deterministic/procedural replay + explicit irreversible inputs + dual wall/simulation/logical time + mathematical step distance + cheap branching/counterfactual worlds + multi-entity/fleet experiments + self-versioned kernel reconciliation + transcript-proven system evolution`.

The closest public 2026 systems each cover important subsets, but this scan did not find one public system that clearly combines all of the above as one general substrate.

Do not market this as “nothing like it exists in the world” until a deeper patent + literature review is complete. The defensible claim today is: **SETKA sits at an unusual intersection of several fast-converging research/product frontiers and has a distinctive architecture-level synthesis.**

## Closest world neighbors

### 1. ActiveGraph / “The Log is the Agent” (2026)

Closest conceptual neighbor on event-sourced agents.

Public paper: https://arxiv.org/abs/2605.21997

Overlap:
- append-only event log as source of truth;
- deterministic projection from history;
- replay;
- cheap fork from any event without recomputing shared prefix;
- end-to-end lineage;
- suitability for self-improving agents.

Where ActiveGraph is currently ahead:
- public formal paper;
- explicit agent-runtime framing;
- cleaner external articulation of log-as-agent semantics.

Where SETKA may be differentiated:
- procedural storage law that separates canonical causes from reproducible mathematical consequences;
- explicit mathematical step/coordinate distance in addition to ordinary event time;
- deterministic chaotic/math world laws as first-class runtime elements;
- fleet/population experiments rather than only agent workflow history;
- GitHub kernel ↔ live database reconciliation recorded as causal system evolution.

### 2. LangGraph

Docs: https://docs.langchain.com/oss/python/langgraph/use-time-travel

Overlap:
- durable checkpoints;
- replay;
- time travel;
- fork from a historical checkpoint;
- alternative trajectories;
- human-in-the-loop and failure recovery.

Where LangGraph is ahead:
- mature developer ecosystem and APIs;
- production adoption;
- polished checkpoint/fork tooling;
- agent-native observability ecosystem.

Where SETKA differs:
- LangGraph stores checkpoints/state transitions for workflow execution; SETKA aims to make **causal sufficiency** the storage law and derive deterministic consequences rather than checkpoint every meaningful execution step;
- SETKA treats world law, irreversible inputs, mathematical distance and kernel evolution as first-class provenance.

### 3. Temporal

Docs / product: https://docs.temporal.io/ and https://temporal.io/

Overlap:
- deterministic/replay-oriented execution;
- durable state;
- retries and recovery;
- long-running autonomous processes;
- compensation/rollback patterns;
- agent/fleet orchestration is already appearing in production.

Temporal is far ahead in:
- distributed-systems reliability;
- production scale;
- failure semantics;
- versioning/deployment maturity;
- ecosystem and operational proof.

SETKA should not try to out-Temporal Temporal. The useful lesson is to reuse the same discipline: deterministic core, isolated nondeterministic activities, idempotence, durable boundaries, explicit compensation.

SETKA's different research claim is about **what information is canonical and how a world/entity can be reconstructed and branched**, not merely how a workflow survives failure.

### 4. Palantir Ontology + Vertex Scenarios

Docs: https://www.palantir.com/docs/foundry/ontology/models and https://www.palantir.com/docs/foundry/vertex/scenarios-overview

Overlap:
- ontology as a digital twin of an organization;
- models attached to real-world entities;
- what-if scenarios;
- chained models;
- cause/effect exploration across systems;
- simulation of proposed interventions.

Palantir is far ahead in:
- enterprise integration;
- data connectors/governance;
- deployed decision workflows;
- ontology tooling and business adoption.

Possible SETKA differentiation:
- append-only causal reconstruction of the system itself;
- deterministic replay contract down to numerical semantics;
- explicit distinction between canonical causes and derived consequences;
- versioned kernel self-reconciliation and transcript-readback proof.

### 5. Celonis Context Model / Process Digital Twins

Public pages: https://www.celonis.com/platform/context-model and https://www.celonis.com/insights/topics/what-is-digital-twin

Overlap:
- dynamic operational twin;
- complete backstory of events/interactions/decisions;
- process intelligence;
- root-cause analysis;
- what-if simulation;
- AI acting over operational context.

Celonis is far ahead in:
- process mining;
- enterprise-scale ingestion;
- commercial maturity;
- operational analytics and business KPIs.

SETKA may be differentiated by being a more general causal/replay substrate rather than primarily a process-intelligence product, and by procedural memory / mathematical-world reconstruction.

### 6. Causal digital-twin / decision-intelligence companies

Examples:
- RootCause.ai — https://rootcause.ai/
- Quantellia World Modeler — https://quantellia.com/worldmodeler/
- Causiq — https://causiq.org/

Overlap:
- causal graphs;
- interventions;
- counterfactuals;
- forecasts and optimization;
- live digital twin of an organization/business.

These systems are ahead of SETKA today in:
- formal causal-inference positioning;
- business-facing causal simulation;
- domain-specific validation and product packaging.

SETKA's possible edge is orthogonal: a replayable, append-only, multi-entity world substrate where causality is also tied to exact provenance, deterministic laws, branch history and system-version history.

Important lesson: SETKA must eventually add **statistical causal validation**, not assume that a simulated branch is a true counterfactual merely because the simulator can generate it.

### 7. Digital Twin Counterfactual Framework (DTCF, 2026)

Paper: https://arxiv.org/abs/2604.01325

This is especially important for SETKA science.

The paper's key warning: a digital twin does not magically solve the fundamental counterfactual problem. Simulated counterfactuals require tiered validation against observable reality, and some individual-level causal claims remain assumption-dependent.

SETKA should borrow this mindset for Bitcoin/fleet experiments:
- separate replay fidelity from predictive validity;
- define observable validation levels;
- quantify uncertainty;
- distinguish association, intervention and true counterfactual claims.

### 8. Siemens + NVIDIA Omniverse / NVIDIA Cosmos / AWS TwinMaker

Sources:
- Siemens Digital Twin Composer: https://www.siemens.com/en-us/company/digital-transformation/industrial-metaverse/introducing-digital-twin-composer/
- NVIDIA Cosmos: https://www.nvidia.com/en-us/ai/cosmos/
- AWS IoT TwinMaker: https://aws.amazon.com/iot-twinmaker/

Overlap:
- digital worlds;
- simulation before real-world action;
- live state integration;
- synthetic worlds;
- autonomous-agent training;
- multiple possible futures.

They are far ahead in:
- high-fidelity physical simulation;
- 3D/physics rendering;
- robotics/industrial integration;
- hardware and compute scale;
- production deployments.

SETKA is not currently a competitor on physical fidelity. Its potential novelty is the causal/time/replay substrate underneath worlds, not photorealism.

### 9. World models: DeepMind Genie 3 / World Labs Atlas

Sources:
- https://deepmind.google/models/genie/
- https://www.worldlabs.ai/blog/atlas

They are ahead in learned generative world simulation and spatial intelligence.

SETKA is a different species: explicit laws + provenance + replay + auditability rather than learned latent visual-world generation.

Potential future convergence is interesting: a learned world model could become a nondeterministic/irreversible input or bounded simulator inside SETKA, while SETKA supplies provenance, branching and causal history around it.

## Mathematical ingredients: what is and is not novel

### Bifurcation / logistic dynamics

Not novel by itself. In 2026 even digital-twin research explicitly uses sequential bifurcation for faster prescriptive simulation:
https://www.sciencedirect.com/science/article/pii/S0925527326000034

SETKA novelty can only come from the role the bifurcation law plays inside the architecture and whether that role produces measurable value.

### Mandelbrot / fractal structure

Fractal geometry and Mandelbrot dynamics are long-established. A patent or scientific claim cannot rest on merely using a Mandelbrot set.

Potential SETKA research questions:
- does fractal addressing improve stable branch identity/topology?
- does it compress or organize large branch spaces better than ordinary graph identifiers?
- does it expose measurable invariants/patterns across entity histories?

If not, it should remain visualization/research rather than core law.

### Golden ratio φ

Not novel. Multi-agent network research has even reported golden-ratio conditions at stability boundaries:
https://www.nature.com/articles/s41598-023-46071-6

SETKA must demonstrate a concrete functional role, e.g. a reproducible optimum, transition threshold, scaling rule or measurable invariant. “φ appears” is not an innovation claim.

### π

Universally established mathematical constant. Same rule: only a specific, non-obvious computational role could be differentiating.

## Patent / IP warning from the first scan

The broad territories are already crowded:
- append-only logs + replay;
- digital-twin simulation;
- counterfactual digital twins;
- multi-agent simulations;
- causal graphs and intervention modeling;
- workflow/time-travel systems.

Examples surfaced in this scan include digital-twin counterfactual and simulation patents/applications, including:
- US20240193327A1 — Digital twinning data simulator;
- US20230161934A1 — Data model based simulation utilizing digital twin replicas;
- US11619916B2 — Digital-twin-based simulation for governing IoT devices;
- CN121483041A — generative-AI network digital twin with parallel counterfactual simulation.

Therefore any future SETKA patent strategy should target the **specific architecture/mechanism**, not broad words like “digital twin”, “counterfactual”, “event sourcing” or “fractal”.

Candidate claim areas to investigate with patent counsel/prior-art search:
1. minimal sufficient causal-memory contract for deterministic/seed-reproducible entity worlds;
2. simultaneous wall/simulated/logical time + mathematical-step distance anchored to causal boundaries;
3. branchable world replay that preserves irreversible inputs and numerical-semantics proof while avoiding dense deterministic persistence;
4. kernel-to-live-state reconciliation whose own application/revert/reapply becomes append-only causal history with read-back completion proof;
5. multi-entity/fleet experimental runtime built over that same causal/procedural substrate.

These are hypotheses for IP review, not claims of patentability.

## Where SETKA is ahead conceptually

Subject to implementation proof, the strongest current differentiators are:

1. **Information physics / procedural memory** — causes are canonical; reproducible consequences are materialized on demand.
2. **Dual/multi-axis time** — wall time, simulated time, logical steps and generated-point distance can all remain reconstructable.
3. **World + history + law in one model** — not only an agent trace or only a digital twin.
4. **System self-history** — the kernel can change the live system and the change itself becomes causal transcript history.
5. **Reversible evolution without rewriting history** — revert/reapply are later causal operations.
6. **Fleet-as-experiment** — many worlds/entities can be branched and compared over the same causal substrate.

## Where SETKA is behind the frontier today

1. **Production reliability** — Temporal and industrial platforms are years ahead.
2. **Formal causal inference** — causal-digital-twin systems and academic causal frameworks are ahead.
3. **Validation science** — SETKA needs predefined falsification criteria, uncertainty, baselines and statistical significance.
4. **Scale proof** — thousands/millions of live entities are not yet demonstrated under the new storage law.
5. **Enterprise connectors/governance** — Palantir/Celonis/Siemens/AWS are far ahead.
6. **Physical/visual world fidelity** — NVIDIA/Siemens/DeepMind/World Labs are in another league.
7. **Published science / external review** — SETKA currently has internal architecture and experiments, not peer-reviewed evidence.
8. **IP certainty** — no professional claim-chart/FTO search has yet been done.

## Positioning in one sentence

The strongest defensible 2026 positioning is not “another digital twin” and not “a fractal AI”.

A better technical category is:

> **A causal, replayable world runtime for persistent entities: append-only history stores irreversible causes and exact evolution rules, deterministic consequences are regenerated on demand, histories can branch into counterfactual worlds, and the runtime records its own kernel evolution as provenance.**

## Recommended next research gates

1. When Supabase returns, prove live G1/G2 reconstruction and measure BEFORE/AFTER storage/write cost.
2. Define a formal SETKA counterfactual-validity ladder inspired by DTCF.
3. Run the Bitcoin blind experiment with preregistered metrics and negative controls; do not interpret visual resemblance as evidence.
4. Test whether Mandelbrot/φ/π provide measurable advantages versus simpler graph/random/linear baselines. Remove them from the core if they do not.
5. Produce a claim-by-claim patent prior-art map before public novelty claims.
6. Publish a minimal technical paper describing the procedural causal-memory contract and deterministic branch/replay results if experiments hold.

## Bottom line

SETKA appears **in the pulse of the 2026 frontier**, not outside it: the world is independently converging on event-sourced agents, durable execution, causal digital twins, counterfactual simulation and world models.

The interesting fact is that SETKA reached a related intersection independently and is combining these lines in a different way. That is promising, but the next phase must turn architectural originality into externally verifiable evidence.
