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

Color modes are deterministic presentation only. They do not create ontology or change graph facts.
Spotlight colors: direct match = green; related real nodes = cyan; real incident edges = amber.

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
- click loaded record to open event summary card

## Open gaps — must not be represented as DONE

1. **EVENT INSPECTOR FULL + CAUSAL TRACE REPLAY**
   - President must be able to click any transcript event and see all authorized recorded fields and provenance.
   - TRACE must replay only recorded activity/mappings.
   - Unmapped trace steps must say `TRACE STEP RECORDED · GRAPH ENTITY NOT MAPPED`.
   - Real topology changes must be distinguishable from activity pulses.

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
