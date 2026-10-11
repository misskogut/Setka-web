# SETKA · FRONT B2.8 · BACKEND TRUTH CONTRACT

## Purpose

B2.8 makes the Mac front a projection of the verified local SETKA backend mirror instead of a decorative or partial B1 snapshot viewer.

The primary read boundary is:

`~/.setka/mirror/current/setka-full-mirror.sqlite3`

The local bridge reads only relations that were copied into the verified Mac mirror. Front layout state never defines backend truth.

## Sources

B2.8 reads these mirrored backend registries/indexes:

- `foundation.setka_system_object_index_v1`
- `foundation.setka_system_relation_index_v1`
- `foundation.setka_branches_v1`
- `foundation.setka_branch_baselines_v1`
- `foundation.setka_branch_events_v1`
- `foundation.setka_version_nodes_v1`
- `foundation.setka_version_lineage_registry`
- `foundation.setka_system_index_state_v1`
- `foundation.front_backend_catalog_v1`
- `foundation.edge_function_deployment_inventory_v1`
- `foundation.edge_function_git_source_receipts_v1`
- `foundation.mac_mirror_exclusion_policy_v1`

All of the above are catalogued as PRESIDENT_READ in the backend exposure catalog.

## Central graph

The central B2.8 graph is reconstructed from the mirrored system object/relation indexes plus explicit VERSION / BRANCH / MODE registry nodes.

Backend truth:
- node identity;
- node kind/state/source;
- relation endpoints and relation kind/state;
- branch/version/mode bindings.

Presentation only:
- x/y/z coordinates;
- cluster radius;
- visual color;
- camera position.

No missing relation endpoint is invented as an entity. Relations whose other endpoint is not indexed remain visible as explicit external refs in the inspector.

EVENT nodes are excluded from the default structural graph for readability but remain searchable and available through the event transcript. They can be explicitly enabled in the graph.

## Modes and parallel branches

The five buttons remain observation lenses:

- CANON
- LINEAR
- SELF-ORGANIZED
- MOTORWAY-LAB
- INTEGRATION

Each resolves to its real `setka_branch_baselines_v1` record, branch, version, state snapshot and digest. Switching a mode does not claim runtime activation.

All additional parallel/experimental branches remain separately visible in the structure panel and global search, including the Solar experiment family.

## Search and inspection

Search runs against the full local system index plus branch and system-version registries.

Selecting a result exposes:
- exact backend record;
- incoming/outgoing relations;
- source relation;
- metrics where indexed;
- provenance/evidence;
- related indexed context;
- unresolved external refs without fabrication.

The legacy vault/grower endpoint is also upgraded to surface full system-index objects before the older shallow entity/capability candidates.

## Layout

B2.7.4 remains the only layout writer. B2.8 does not introduce another position writer, MutationObserver layout engine or polling layout loop.

Moving, hiding or renaming a front projection changes local presentation only. It never changes the system binding.

## Mac launcher

A verified mirror is valid when `LATEST.json.state` is either:

- `PASS_FULL_SETKA_MIRROR`
- `PASS_DELTA_SETKA_MIRROR`

Launching `SETKA_FRONT.command` must not start a new full 663-relation mirror merely because the latest receipt is DELTA.

## Safety / mutation boundary

B2.8 is read/inspect only for backend structure.

- CANON mutation: false
- runtime mutation: false
- command token exposed to browser: false
- local Mac device token stays in Keychain


## Graph semantics correction

B2.8 has two explicit central-graph views and must never conflate them:

### BODY
Default view. Shows the exact cached body snapshot of the selected system version / mode baseline.

Current verified version bodies cached on Mac:
- SETKA-SYS-20260908-B0 → BODY-GROWN-SNAPSHOT-2009DD509A0C4DC1
- SETKA-SYS-20260910-B1 → BODY-GROWN-SNAPSHOT-767E5532A5F04217

The five B1 mode baselines currently point to the same B1 body snapshot. Therefore CANON / LINEAR / SELF-ORGANIZED / MOTORWAY-LAB / INTEGRATION are not allowed to fabricate different body topology when the backend says the snapshot is shared.

### BACKEND STRUCTURE
Optional global index view. Shows non-event objects from the whole system index, plus explicit VERSION / BRANCH / MODE nodes and resolved indexed relations.

This graph is an inventory/semantic topology of the backend. It is not the anatomical BODY and must be labelled as such.

## Local body cache

`foundation.front_body_snapshot_cache_v1` contains only body snapshots referenced by `foundation.setka_version_nodes_v1`. It is intentionally small and front-required. It does not re-introduce the full COLD experimental body-snapshot family into the Mac mirror.

## Layout persistence

B2.7.4 remains the sole position writer. User positions are persisted on drag end, DONE, pagehide, beforeunload and hidden-tab transition. B2.8 late-created controls request restoration from that same writer after registration; B2.8 does not maintain its own coordinate store.
