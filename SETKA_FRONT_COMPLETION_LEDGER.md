# SETKA FRONT · COMPLETION LEDGER

Anchor: `SETKA-SYS-20260910-B1`
Primary development view: `INTEGRATION`
CANON: read-only; promotion requires President approval.

## Language contract

Default presentation language: **human Russian**.
A visible `РУС / SYS` switch must always allow the President to reveal raw system terminology.
Human mode may translate labels, statuses and controls, but must never alter refs, hashes, event numbers, graph facts or runtime behavior.
System mode exposes raw branch/runtime/event identifiers.

## Current functional controls

### Top bar
- `РУС / SYS` — presentation-language switch.
- `Бортовой` — onboard computer.
- `Стенограмма` — event transcript.
- Realtime connection state.
- Current observation branch / graph snapshot state.

### Branch view
- CANON
- LINEAR
- SELF-ORGANIZED
- MOTORWAY-LAB
- INTEGRATION

These remain **observation branch views** until an authoritative runtime activation contract exists.

### Graph
- rotation on/off
- real graph edges on/off
- reset view + clear spotlight
- focus root
- presentation color mode cycle: `GENERATION / TYPE / FAMILY`
- semantic spotlight from free text
- B2.4 recorded-event trace replay on the real frozen graph when explicit trace data exists

Color modes are deterministic presentation only. They do not create ontology or change graph facts.
Spotlight colors: direct match = green; related real nodes = cyan; real incident edges = amber.
Trace colors: recorded/ingress = cyan; route = violet; execution/materialization = amber; success = green; failure = red.
Temporal trace connectors show recorded order only and are **not graph edges**.

### Onboard computer
- STATUS
- SNAPSHOT
- GRAPH
- EVENTS
- REPORT
- protected local command input
- free-text fallback to real-graph spotlight

### Transcript
- LIVE / B1
- full SYSTEM transcript by cursor
- selected BRANCH transcript by cursor
- client-side search over loaded records
- click SYSTEM/BRANCH record to open B2.4 event inspector
- full recorded `details` view
- clickable recorded refs and related-event navigation
- `ТРАССЫ / TRACES` index for events already present in explicit replay/causal-trace tables
- TRACE controls: play / pause / previous / next / seek / clear

## B2.4 truth boundary

**EVENT INSPECTOR = IMPLEMENTED for SYSTEM and BRANCH transcript records.**
The inspector exposes the recorded event fields, details, refs and same-entity/source navigation.

**CAUSAL TRACE PLAYER = IMPLEMENTED only where SETKA already has an explicit recorded trace/replay.**
Current evidence sources include:
- `foundation.full_body_causal_update_replays_v1`
- `foundation.self_extension_integration_replays_v1`
- `foundation.body_update_assimilation_replays_v1`
- recorded command lifecycle when a request ref is explicitly available

If an event exists but no causal execution trace was recorded, the front must state that clearly and must not infer a path.
An unmapped recorded step stays unplaced on the graph.
Therefore **per-event trace coverage is still incomplete** even though the player itself now exists.

## Open gaps — must not be represented as DONE

1. **TRACE COVERAGE / PROVENANCE COMPLETENESS**
   - Not every historical event has a causal trace.
   - New important runtime tasks should persist trace stages and entity mappings as part of normal execution so the front can replay them later.
   - FRONT_COMMAND records without a mapped system/branch event need a first-class inspector binding.

2. **BRANCH RUNTIME ACTIVATION**
   - VIEW != ACTIVATE.
   - Need protected activation contract for LINEAR / SELF-ORGANIZED / MOTORWAY-LAB / INTEGRATION.
   - CANON activation/promotion remains President-gated.

3. **BRANCH-SPECIFIC BODY SNAPSHOTS**
   - Activated branches must be able to produce their own state/digest/body snapshots.
   - Front must bind each mode to the latest real snapshot for that branch.

4. **SYSTEM MEMORY FALLBACK FOR SPOTLIGHT**
   - If a term exists in recorded system history but not in the current frozen graph, show `FOUND IN SYSTEM · NOT PRESENT IN CURRENT GRAPH SNAPSHOT`.
   - Never invent a node.

5. **NATURAL-LANGUAGE INTENT ROUTER**
   - Human request -> bounded intent -> authorized capability -> execution/result.
   - No AI-inferred execution without an explicit bound capability.

6. **EVENT / SNAPSHOT DIFF AND TIMELINE**
   - BEFORE / AFTER for structural changes.
   - Navigate historical frozen snapshots without confusing them with branch execution.

7. **CLOUD MIRROR AUTHORIZATION**
   - Static mirror currently must not become the privileged President control surface until identity/session authorization is bound.

8. **MOBILE UX / PERFORMANCE PASS**
   - Maintain useful controls on iPhone without obscuring the graph.
   - No dead buttons; no controls that claim unavailable capability.

## Completion rule

A control is shown only when it has a real behavior or an explicit observational meaning.
`AVAILABLE != RUNNING != DONE != PROVEN`.
No renderer behavior may be presented as a graph/runtime mutation.
