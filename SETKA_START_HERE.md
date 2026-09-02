# SETKA — START HERE

Status: canonical onboarding entrypoint for future architecture / Work reviews.

Purpose: let a fresh ChatGPT Work run reconstruct SETKA quickly, verify the current reality, understand why the architecture exists, and create the next version without rediscovering the project from conversation history.

> This document is a map, not the database. Never trust documentation over current code, migrations, live schema, active checkpoints, or deployed services.

## 0. If PostgreSQL/Supabase has just become SQL-ready after the 2026-09-02 incident

Do **not** reconstruct the recovery plan from chat history.

Read these two files first, in this order:

1. `ops/SETKA_POST_RECOVERY_BOOTSTRAP_V1.md` — preservation-first recovery gates and phased bootstrap.
2. `ops/SETKA_SUPABASE_KERNEL_SYNC_TODO.md` — exact GitHub ↔ PostgreSQL handshake, transcript integration, revert/reapply rules, information law and BEFORE/AFTER measurement plan.

Then verify live reality before any write:

`SELECT 1 -> cryosleep ON -> full backup -> schema/migration preservation -> read-only storage audit -> relation base/5/62753 mapping -> outage backfill -> transcript writer/read-back verification -> DB state adapter -> READ-ONLY kernel handshake`.

Do not enable automatic migration, compaction, dense-writer changes or resume fleet/synthetic activity merely because the control plane says `ACTIVE_HEALTHY`.

The post-incident architecture rule to preserve is:

`GitHub = reproducible law / PostgreSQL = living state + irreversible history / Transcript = proof / deterministic consequences = derive or materialize on demand`.

The recovered pre-incident database is evidence to measure and classify, not an architecture to preserve blindly. Capture real BEFORE metrics before any approved compaction so the final storage/write/compute improvement can be measured rather than guessed.

## 1. Truth hierarchy

When sources disagree, use this order:

1. **Current live reality** — deployed code, active database schema/data contracts, active Edge Functions, current checkpoint/release pointers.
2. **Versioned migrations and immutable commits/checkpoints** — what was intentionally installed.
3. **Canonical architecture documents** — this file, `docs/DIAMOND_ARCHITECTURE.md`, `docs/VERSION_INHERITANCE_LAW.md`, `docs/FOUNDATION_OPERATING_SYSTEM.md`, `docs/SETKA_PROCEDURAL_STORAGE_V1.md`, `SETKA_DATA_MODEL_V1.md`, version-line docs and ADR/decision log.
4. **Conversation/history** — useful for intent, never sufficient proof of current implementation.

A Work review MUST resolve mismatches instead of silently choosing one source.

## 2. Read order for a fresh Work run

Read these before changing anything:

1. `SETKA_START_HERE.md`
2. `docs/FOUNDATION_OPERATING_SYSTEM.md` when touching Foundation 0.1.x.
3. `docs/DIAMOND_ARCHITECTURE.md`
4. `docs/VERSION_INHERITANCE_LAW.md`
5. `SETKA_DATA_MODEL_V1.md`
6. `docs/SETKA_PROCEDURAL_STORAGE_V1.md` when touching synthetics, fleets, iterative mathematics, transcript/event storage, replay, archival or compaction.
7. `ADMIN_VERSIONS.md`
8. `NEW_CHAT_ADMIN_VERSIONS.md`
9. `docs/DECISIONS_LOG.md`
10. `docs/WORK_REVIEW_PROTOCOL.md`
11. Latest `docs/VERSION_HANDOFF_DIAMOND_*.md` handoff.
12. Latest Diamond President front file and its parent version.
13. Relevant migrations / Edge Functions for the layer being changed.

## 3. Mandatory cold-start verification

Do **not** begin implementation immediately. First reconstruct reality.

Verify at minimum:

- GitHub default branch and latest relevant commits.
- Current Diamond working checkpoint and its parent.
- Registered front versions and active release pointers.
- Current Supabase migrations affecting Diamond / v35 / v36.
- Current Diamond tables: identities, capabilities, floors, cabinets, role templates, architecture nodes/edges, Flow, checkpoints.
- Active President gateway / Edge Function versions.
- Security advisor results, especially RLS and SECURITY DEFINER exposure.
- Current public product version and whether the requested change is Black Box, Preview, Approved, or Public.
- CI / deploy state for the version being reviewed.
- Latest version-lineage smoke result and any baseline-degraded or failed checkpoints.
- Latest President `TRACE-...` research evidence when the user references one.

For Foundation 0.1.x also verify:

- current `foundation-contract-v*.json` lineage;
- current constants registry;
- unresolved President pins and approved synthetic pins;
- parent capability parity before accepting a child as WORKING.

For fleet/synthetic/iterative storage also verify:

- current replay-contract and causal-event schema versions;
- numerical/runtime contract used for exact replay;
- write-admission budgets and storage-fuse state;
- which data are CANONICAL_CAUSE / IRREVERSIBLE_INPUT / TIME_INTERVAL / STEP_INTERVAL / CHECKPOINT versus DERIVED / CACHE / ARCHIVE_CANDIDATE;
- that dense deterministic coordinates are not being persisted merely because a law advanced one tick;
- that parameter changes are anchored to exact logical/time boundaries;
- that materialized trajectories are bounded and disposable;
- that checkpoint/root hashes can verify replay before any compaction.

Before writing, produce a short current-state statement:

`verified reality → open risks → intended next version → what will remain untouched`

## 4. Current architecture snapshot

The architecture line began with the following intended spine and must be reverified against the current checkpoint on every cold start:

`SETKA ID → Credentials → Capabilities → Scope → Floor → Cabinet → Role/Perspective → Audit`

President headquarters is organized as:

`PRESIDENT ROOT → WORKSHOP → OPERATIONS → EXTERNAL BUSINESS → PUBLIC / USER VIEW`

The architecture machine models the system as canonical **blocks + wires**. A wire is not merely a visual line.

Binding semantics:

- `DESIGN` — architectural relationship / intended connection.
- `GUARDRAIL` — enforced architectural law or protected relationship.
- `RUNTIME` — only when working code actually consumes the connection state. Never label a relation runtime merely because it is drawn.

Connected wires may glow in the President UI; disconnected allowed wires remain visible. `never-break` relationships cannot be casually disconnected from the control plane.

### Current version-research layer

Diamond now also has a President version-research layer. Its core law is:

`VIEWING VERSION ≠ WORKING CHECKPOINT ≠ PRODUCTION`

A new Diamond version is a child of the previous architecture lineage, not a replacement universe. Read `docs/VERSION_INHERITANCE_LAW.md` before changing version semantics.

President research `TRACE-...` records are protected internal evidence that can span several historical versions. They are useful for reconstructing what the President actually inspected, but they are not automatically canonical architecture truth; they must be interpreted against code, schema and checkpoint reality.

### Foundation additive line

Foundation 0.1.x follows an explicit carving law:

`child = accepted parent + additive delta`

Existing entities, analytics, reports, actions and relationships are protected parent capabilities. A child may move or redesign them, but may not silently remove or recreate them. The machine-readable guard is `foundation-lineage-check.mjs`; the human operating law is `docs/FOUNDATION_OPERATING_SYSTEM.md`.

### Procedural storage / causal replay line

For deterministic or seed-reproducible systems, permanent memory stores the minimum complete set of causes needed to reproduce the world. Dense mathematical trajectories are views/materializations, not canonical memory by default.

Canonical replay law:

`STATE(t) = GENESIS + LAW + VARIABLES + CAUSAL_PATCHES<=t + IRREVERSIBLE_INPUTS<=t + REPLAY_CONTRACT`

Time and mathematical distance are separate axes. The transcript records meaningful causal boundaries, elapsed causal silence and step/point distance between boundaries; it does not write one row merely because time passed or an equation advanced one deterministic tick.

Machine contracts live under `contracts/`; the offline replay implementation lives under `core/replay/` and must remain independent of PostgreSQL so reconstruction can be tested during a database outage.

Always verify this snapshot against the current checkpoint before relying on it.

## 5. Non-negotiable system laws

### Identity

- Every actor is a SETKA ID.
- SETKA ID is immutable and nonsemantic.
- Identity, credentials, role and capabilities are separate concepts.
- Authority is never encoded into the ID string.
- New identities receive no elevated authority merely by being created.

### President Root

- Exactly one active President Root authority.
- President is an ordinary SETKA identity with an exclusive capability bundle, not a separate hidden identity system.
- Root authority cannot be recreated indirectly through a lower role, recovery shortcut, role inheritance, or issuance scenario.
- President can inspect lower perspectives with `VIEW AS` without losing true Root identity.

### Access

- Deny by default.
- Roles are convenience bundles; capabilities are the actual authority units.
- Floors are architectural access zones, not job titles.
- Cabinets are sub-zones inside floors.
- A closed floor overrides open cabinets below it.
- President may inspect closed lower zones, but inspection remains authenticated/audited.
- New capabilities are born President-only and move downward only through explicit promotion/delegation rules.

### ID issuance

- `identity.issue` is President-only by default.
- Public or delegated issuance exists only through an explicit President-created issuance scenario with narrow scope, allowed initial rights, audit, revocation/expiry and no privilege expansion.

### Release

- Public is never the default destination of new work.
- Canonical promotion path:

`BLACK BOX → PREVIEW → APPROVED → PRODUCTION → PUBLIC`

- No silent President→Public jump.
- Release must show what changes, permissions/data effects and rollback path.

### Versioning

- Meaningful versions are immutable checkpoints.
- Never overwrite a useful historical checkpoint merely to make the latest version cleaner.
- Every child version inherits parent architecture/data laws unless an explicit reviewed migration says otherwise.
- A broken experimental block must be marked inactive/disconnected, the checkpoint marked failed, or a corrective child created. Never silently hide failure by rewriting history.
- “View version” must not mutate the active pointer.
- “Make working” changes only the working pointer unless an explicitly reviewed migration is required.
- Rollback should preserve later versions for comparison.
- Historical checkpoint status and current observable compatibility/health are separate facts.
- Foundation 0.1.x additionally enforces parent-capability and constant superset contracts before a child is trusted as WORKING.

### President research traces

- A research Trace ID may span several versions and browser tabs.
- Store technical path/evidence incrementally so a version crash does not erase prior evidence.
- Final human title/comment explains intent; it does not rewrite recorded technical evidence.
- Never record President credentials, secret values or ordinary input-field values.
- Research traces are Diamond internal evidence and must not contaminate public product analytics.

### Data

- A real entity exists once; dashboards/analytics do not create duplicate realities.
- PatternExposure is the canonical source for real pattern/config gameplay time in the current research model.
- Favorites are the canonical current saved relation.
- RAW Replay is reconstruction/UX evidence, not canonical product-time truth.
- Save facts, formulas and meaning; derived opinions should be recalculable.
- Preserve causality, not every reproducible intermediate coordinate.
- A deterministic tick with no causal change is not automatically a transcript event.
- Parameter/behavior changes that can alter future evolution are canonical causal patches and must be anchored to their exact replay boundary.
- External/non-reproducible inputs must be retained; replay must never guess them later.
- Elapsed inactive/autopilot time is stored as interval semantics, not one `NO_ACTIVITY` row per second.
- Mathematical step/point distance between meaningful events must be reconstructable without storing every point.
- Dense trajectories may be materialized for inspection/proof and discarded only after replay/hash evidence is sufficient.
- Unknown write semantics fail closed to review; writers must use event/byte budgets and storage guards.

### Localization

- English is the canonical/master semantic source.
- Russian is the primary President display/localization.
- New strings use stable semantic i18n keys.
- Missing RU in the President cabinet is a localization defect, not a reason to expose raw technical English as the default UX.

### Human interface

- Internal complexity must not become cognitive burden.
- President can see everything but must not be forced to see everything at once.
- President control surfaces are tablet-landscape-first unless a version explicitly documents another use case.
- Every important screen should answer: where am I, what am I seeing, what can I do, what will happen, can I undo it?

### Secrets

- Never put President keys, recovery material, service-role secrets or user-private exports in repository documentation.
- Documentation may reference secret classes and recovery procedures, never secret values.

## 6. Product/data lineage already present

Historical lines must remain distinguishable:

- Standard v34.10 — frozen regression reference.
- Evolution v35.x — canonical research redesign line.
- New Chat v1.x / v36 — social/Cruise experimental line.
- Diamond v0.x — President/root architecture, access, release, recovery and system-control line.
- Foundation 0.1.x — additive Front/President research pair with ID, synthetics, pins, traces and constants registry.
- Procedural Storage / Causal Replay v1 — post-incident deterministic reconstruction and storage-efficiency kernel.

Do not flatten these histories into one fake linear version number.

## 7. Ordinary mode vs Work mode

### Ordinary mode

Purpose: fast, careful iteration with the user.

After every meaningful version it should leave a handoff trail:

- what changed;
- why;
- source-of-truth impact;
- new capabilities/data/contracts;
- migrations/API/front version;
- what was deliberately not touched;
- known debt / questions for Work review;
- rollback/checkpoint information;
- regression/lineage test result where applicable;
- replay/storage impact where applicable;
- relevant President Trace IDs when the user explicitly created/referenced them.

### Work mode

Purpose: slower architecture-quality pass.

Work should:

1. cold-start from this package;
2. verify actual implementation;
3. compare intent vs code vs data model;
4. include version-lineage smoke/baseline health in the review;
5. inspect user-referenced President traces as evidence;
6. identify architectural debt and accidental complexity;
7. improve reliability, security, clarity, testability and human ergonomics;
8. for iterative/autonomous storage, verify causal replay, write admission, bounded materialization and deletion safety;
9. create a **new immutable version**, not rewrite history;
10. update this documentation package after the review.

Work is not allowed to “clean up” by deleting historical evidence or silently redefining canonical semantics.

## 8. Required completion record for every substantial version

Every substantial future Diamond version should leave:

- immutable front/build identifier;
- parent checkpoint;
- commit SHA;
- migrations;
- API/Edge Function version;
- human-readable EN/RU change manifest;
- compatibility statement;
- rollback statement;
- new/changed capabilities;
- new/changed architecture wires;
- security/data implications;
- tests performed / tests still missing;
- version-lineage health impact;
- replay/storage-contract impact where applicable;
- documentation updates.

Foundation versions additionally leave or update their machine-readable regression contract.

## 9. Work review gate

Before a Work run promotes its result as the next stable checkpoint, it must review the rubric in `docs/WORK_REVIEW_PROTOCOL.md` and the inheritance laws in `docs/VERSION_INHERITANCE_LAW.md`. Foundation 0.1.x work must also pass `docs/FOUNDATION_OPERATING_SYSTEM.md` and its lineage guard. Iterative/fleet/synthetic storage changes must also satisfy `docs/SETKA_PROCEDURAL_STORAGE_V1.md` and the machine replay/causal-event contracts.

The goal is not maximum cleverness. The goal is a system that becomes **more correct, more recoverable, more understandable and more valuable as an asset with every version**.
