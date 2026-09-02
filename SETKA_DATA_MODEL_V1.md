# SETKA Data Model v1

Status: canonical architecture for Evolution v35.2+

## Core rule

A real thing exists once. The same entity can participate in many metric slices, but a second copy of the entity must not be created just because another dashboard, recommendation or analytic calculation needs it.

`Metric = Entity × Scope × Context × Period × MetricDefinition`

Examples: the same `Pattern:dandelion` can have global usage, one participant's usage, usage for a request, usage in measured sessions, or usage for the last 30 days. These are metric states of one Pattern, not new Patterns.

## Canonical entities

### Participant
Human research participant. In the current sandbox one browser/device is still provisionally treated as one participant until explicit participant identity/binding is introduced.

### Device
Browser/install/device that produces telemetry. It is not conceptually the same thing as a human Participant.

### App Visit
One continuous app visit. New v35.2 traffic receives a stable `visitId` for the browser-tab/session lifecycle. A visit can contain free browsing, zero or more sessions, and multiple pattern exposures.

### Session
One intentional research interaction. `sessionType` is a state of Session (`outcome` or `exploration`), not a different entity type.

Outcome sessions may contain contexts `measured` and `after_feedback`. Exploration contains `exploration` context and must not be interpreted as pre/post outcome evidence.

### Pattern
Mother/base visual pattern, e.g. `dandelion` or `tentacle-orbit`.

### PatternConfig
One exact canonical parameter combination belonging to one Pattern. One canonical `configKey` means one PatternConfig globally, regardless of how many participants discover or save it.

Canonical keys are prefixed by pattern ID, e.g. `tentacle-orbit|...` or `dandelion|...`.

### PatternExposure
Central behavioral fact: one uninterrupted period in which one exact PatternConfig is actually visible in gameplay.

Fields include participant/device, visit, optional session, session type, context, request, pattern, canonical config, start/end/duration and source.

`PatternExposure` is the only source of product pattern/config time.

A retained app state containing `patternId/configKey` while the user is in Library/Today/etc. is not an exposure.

### State / StateObservation
State is the tracked concept (e.g. internal tension). A StateObservation is one timestamped intensity value. `pre`, `post` and `standalone` are phases of the observation, not separate state entities.

### SessionAssessment
A timestamped/scoped session rating such as pre/post wellbeing. Delta is derived; it is not a separate stored entity.

### Favorite relation
Permanent Participant ↔ PatternConfig relation. Current favorite state comes from the permanent relation, never by replaying old `favorite_save/remove` telemetry.

### Note
Permanent human-authored text. It may reference Visit, Session, PatternExposure, PatternConfig and/or State context; absent relations stay null rather than creating duplicate notes.

### Physiology
Timestamped physiological observations may be retained separately. Product analytics should use explicit summaries/associations and must keep real vs simulated sources separate.

## Transport / reconstruction data

### RAW Event
Pointer movement, scroll, taps, screen transitions and similar telemetry. RAW events exist to reconstruct UX/Replay and to help derive facts. They are not product entities and are not a source of pattern usage time.

### Replay Digest
Permanent compressed UX memory after RAW retention expires. It may retain paths, taps, gestures and friction indicators. It must not become an alternative source of PatternExposure time.

### Snapshot
Compact client-state/archive transport and backward-compatibility layer. It is not a global analytics database. Current state/note/physiology modules may still be projected from snapshots until their own normalized semantic storage is introduced.

## Derived semantic facts

`prototype_v35_participant_facts`, `prototype_v35_pattern_facts`, and `prototype_v35_config_facts` are derived caches, not independent realities. They are rebuilt from canonical sources using the same database function.

Participant facts summarize participant activity.

Pattern facts summarize one Participant × Pattern relation.

Config facts summarize one Participant × PatternConfig relation.

They may hold multiple metric states of the same entity, including:
- total gameplay time
- free gameplay time
- measured time
- after-feedback time
- exploration time
- exposure count
- continuous max duration
- session count
- current favorite state/count
- note count
- outcome co-occurrence counts
- exposure-weighted outcome association

## Outcome methodology

A session result must not be credited equally to every pattern/config merely because it appeared once.

For measured outcome analysis, use each Pattern/PatternConfig's share of measured PatternExposure time inside the session as participation weight.

Store/compute both ordinary co-occurrence metrics and exposure-weighted association when useful, but label them as associations, not causal effects.

After-feedback and exploration exposures never enter the primary pre→post outcome association.

## Sources of truth

| Meaning | Canonical source | Not a source |
| --- | --- | --- |
| Real pattern/config time | `prototype_v35_pattern_exposures` | Replay, state snapshot, pointer events |
| Current saved ♥ | `prototype_v35_favorites` | historical favorite tap events |
| Participant default number | `prototype_v35_participant_ordinals` | current list position |
| Outcome vs exploration | explicit `session_type` / canonical Session state | UI tab, inferred dashboard branch |
| UX movement/path | RAW Replay while retained, then Replay Digest | PatternExposure |
| Pattern/config aggregate | v35 fact tables derived from canonical sources | separate client calculations |

## Backward compatibility

`session.usage` remains for existing participant history/session UI. From v35.2 forward it is a compatibility projection generated from PatternExposure. It must not independently measure pattern time.

Historical formal `session.usage` was safe enough to backfill into PatternExposure because it was already recorded only during gameplay. Historical free-Replay config durations were deliberately not backfilled because retained app state could make Library/Today time look like pattern viewing.

## Procedural storage / causal replay data

The same source-of-truth law now applies to deterministic mathematical and synthetic histories: a reproducible intermediate state is not automatically a new canonical fact.

### Replay Contract

A compact machine passport describing everything required to reproduce a deterministic/seed-reproducible entity trajectory. It includes identity/lineage, law family/version/hash, Genesis state, equation variables, seed/root seed, numerical/runtime semantics, behavior/control variables, clock semantics and checkpoint evidence.

Machine schema: `contracts/setka-replay-contract-v1.schema.json`.

### Causal Event

A canonical event exists when new information changes or proves the historical world: Genesis, parameter mutation, external/non-reproducible input, mode change, meaningful endogenous action, checkpoint, capsule or run end.

Machine schema: `contracts/setka-causal-event-v1.schema.json`.

A deterministic equation advancing from tick `n` to `n+1` with no causal change is **not** by itself a canonical event.

### Parameter mutation / causal patch

A parameter change is stored once at the exact logical tick/coordinate and wall/simulated time boundary where it becomes effective. Replay applies that historical patch at the recorded boundary; it never guesses the old decision again.

Behavior/personality/control settings such as curiosity are variables and belong to the replay contract/history whenever they can affect choices or dynamics.

### Time Interval / Step Interval

Between adjacent causal events, the system preserves or can derive:

- elapsed wall/simulated time;
- start/end logical ticks;
- generated mathematical steps;
- generated coordinate count when not trivially derivable;
- time-mode/clock-contract changes.

Do not store one `NO_ACTIVITY` row per second or one coordinate row per deterministic tick. Causal silence is represented by interval boundaries.

### Materialized Trajectory

A bounded, disposable reconstruction of dense coordinates created on demand for visualization, scientific analysis, forensic proof, comparison or export.

A materialized trajectory is a view/cache, not canonical memory. It may be discarded only when its causal inputs and required proof/archive evidence are preserved.

### Causal Capsule

A compact digest of ordered causal events plus time/step intervals and cryptographic hashes. Capsules are WARM memory/indexes; they do not replace non-reproducible raw evidence that must be archived.

### Write Admission

Before any future fleet/synthetic writer persists a candidate, it must classify the candidate semantically. Canonical causal information may persist within explicit event/byte budgets; deterministic coordinates, no-activity rows, materialized points and rebuildable caches are derived/cache classes by default. Unknown classes fail closed to review.

The initial offline implementation lives under `core/replay/` and `core/storage/`; it has no PostgreSQL dependency.

## Adding a new analytic

Before adding storage, ask:
1. Which existing canonical entities participate?
2. Is the requested value a new entity, an observation/relation, or only a metric slice?
3. Can the metric be derived from existing semantic facts?
4. Is a new raw event genuinely required, or can an existing event/entity support it?
5. If the source is deterministic/seed-reproducible, is this value a new cause or merely a rematerializable consequence?

Create a new entity only when a new real-world concept exists. Otherwise add a metric state or relation to the existing model.
