# SETKA · FRONT B2.10 · TEMPORAL-CAUSAL WORKBENCH CONTRACT

## Core principle

SETKA is one connected temporal system.

The Front must never present backend tables, transcript rows, entities, experiments, runs, ships, versions or visualizations as unrelated lists. Every visible object is an addressable projection of the same connected system and must preserve origin, relations, time, lineage and evidence.

The interaction model is:

`object / event → universal card → provenance + relations + lineage + history + evidence + recorded visualizations → graph / replay → another addressable object / event`

## Universal card

Every addressable thing uses one card contract. This includes at minimum:

- event;
- entity;
- ship;
- experiment;
- run;
- snapshot;
- visualization;
- branch;
- version;
- metric where indexed.

A card must expose, when the backend has the data:

- what it is;
- current / recorded state;
- where it came from;
- parent / scope / lineage;
- incoming and outgoing relations;
- related transcript events;
- actor / initiator / executor provenance for events;
- evidence source;
- recorded visualizations;
- recorded replay;
- navigation to related cards.

The Front must not invent missing provenance, missing relations or missing replay.

## Transcript

The transcript is the temporal index of system life, not a plain text log.

Every transcript event is clickable.

Clicking an event opens its universal EVENT card with:

- event number and time;
- human-readable summary;
- source / surface;
- version and branch where known;
- initiator / executor / generated-from provenance where known;
- related indexed objects;
- events immediately before / after;
- recorded visualizations;
- recorded replay ranges.

If a recorded visualization/replay exists, the card exposes a Play action.

If no replay was recorded, the card stays fully inspectable but explicitly says that no exact process visualization exists. No synthetic historical animation is fabricated.

## Graph

The graph is a spatial projection of the same system.

It may show several truthful projection classes:

### BODY
Exact frozen body snapshot of the selected version/branch.

### RECORDED FORM
A recorded morphology / local-world / focus packet created by SETKA from data. If the packet contains recorded morphology coordinates, those exact coordinates are used.

### OBJECT CONTEXT
A bounded graph of real indexed relations around one selected object. It is navigation context, not morphology.

### PROCESS / REPLAY
A step-by-step playback of recorded process stages over the exact frozen body when an exact source snapshot is available.

Temporal steps are never silently converted into graph edges.

The old whole-backend dump is not a normal user view.

## Recorded visual morphology

`foundation.system_visualization_packets_v1` is the primary catalog of recorded visual projections.

B2.10 understands at least:

- BODY_3D
- BODY_PROCESS_3D
- BODY_3D_SOLAR_FOCUS
- SHIP_LOCAL_WORLD_INTERACTIVE
- SHIP_LOCAL_WORLD_3D_INTERACTIVE
- SHIP_LOCAL_OBJECT_MORPHOLOGY_INTERACTIVE
- SHIP_LOCAL_FACT_CONSTRAINED_3D
- BODY_3D_HOST_DAUGHTER_BIRTH_TRACE
- BODY_3D_WITH_MOTHER_DAUGHTER_SPATIAL_FIELD
- HOST_BODY_WITH_LOCAL_SHIP_MORPHOLOGY

When an object has recorded visual morphology, selecting it may open that morphology as the preferred visual projection instead of a generic relation layout.

## Replay

Recorded process playback can use:

- packet `stages`;
- `foundation.body_update_assimilation_replays_v1`;
- exact cached body snapshots referenced by recorded visualization/replay evidence.

Playback controls:
- previous step;
- play / pause;
- next step;
- scrubber;
- current step label.

## Selective Mac evidence cache

The full experimental RAW family remains excluded from Mac.

For autonomous visual replay, B2.10 mirrors only exact frozen body snapshots referenced by recorded visualization/replay evidence into:

`foundation.front_visualization_snapshot_cache_v1`

Current cache: 22 snapshots, about 140.5 MB uncompressed source payload.

This is a selective evidence cache, not a return of the full experimental RAW family.

## Branch / version / time

Cards and projections are branch-, version- and time-aware.

Historical state is rendered through the current UI without rewriting historical provenance.

Five primary B1 branches may legitimately share the same B1 body snapshot; their histories and branch states remain different.

## Safety

- CANON mutation: false
- runtime mutation: false
- historical provenance rewrite: false
- fake relation generation: false
- fake replay generation: false
- full experimental RAW restored to Mac: false
