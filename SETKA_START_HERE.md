# SETKA — START HERE

Status: canonical onboarding entrypoint for future architecture / Work reviews.

Purpose: let a fresh ChatGPT Work run reconstruct SETKA quickly, verify the current reality, understand why the architecture exists, and create the next version without rediscovering the project from conversation history.

> This document is a map, not the database. Never trust documentation over current code, migrations, live schema, active checkpoints, or deployed services.

## 1. Truth hierarchy

When sources disagree, use this order:

1. **Current live reality** — deployed code, active database schema/data contracts, active Edge Functions, current checkpoint/release pointers.
2. **Versioned migrations and immutable commits/checkpoints** — what was intentionally installed.
3. **Canonical architecture documents** — this file, `docs/DIAMOND_ARCHITECTURE.md`, `SETKA_DATA_MODEL_V1.md`, version-line docs and ADR/decision log.
4. **Conversation/history** — useful for intent, never sufficient proof of current implementation.

A Work review MUST resolve mismatches instead of silently choosing one source.

## 2. Read order for a fresh Work run

Read these before changing anything:

1. `SETKA_START_HERE.md`
2. `docs/DIAMOND_ARCHITECTURE.md`
3. `SETKA_DATA_MODEL_V1.md`
4. `ADMIN_VERSIONS.md`
5. `NEW_CHAT_ADMIN_VERSIONS.md`
6. `docs/DECISIONS_LOG.md`
7. `docs/WORK_REVIEW_PROTOCOL.md`
8. Latest Diamond President front file and its parent version.
9. Relevant migrations / Edge Functions for the layer being changed.

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

Before writing, produce a short current-state statement:

`verified reality → open risks → intended next version → what will remain untouched`

## 4. Current architecture snapshot

As of Diamond v0.6, the intended working architecture is:

`SETKA ID → Credentials → Capabilities → Scope → Floor → Cabinet → Role/Perspective → Audit`

President headquarters is organized as:

`PRESIDENT ROOT → WORKSHOP → OPERATIONS → EXTERNAL BUSINESS → PUBLIC / USER VIEW`

The architecture machine models the system as canonical **blocks + wires**. A wire is not merely a visual line.

Binding semantics:

- `DESIGN` — architectural relationship / intended connection.
- `GUARDRAIL` — enforced architectural law or protected relationship.
- `RUNTIME` — only when working code actually consumes the connection state. Never label a relation runtime merely because it is drawn.

Connected wires may glow in the President UI; disconnected allowed wires remain visible. `never-break` relationships cannot be casually disconnected from the control plane.

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
- “View version” must not mutate the active pointer.
- “Make working” changes only the working pointer unless an explicitly reviewed migration is required.
- Rollback should preserve later versions for comparison.

### Data

- A real entity exists once; dashboards/analytics do not create duplicate realities.
- PatternExposure is the canonical source for real pattern/config gameplay time in the current research model.
- Favorites are the canonical current saved relation.
- RAW Replay is reconstruction/UX evidence, not canonical product-time truth.
- Save facts, formulas and meaning; derived opinions should be recalculable.

### Localization

- English is the canonical/master semantic source.
- Russian is the primary President display/localization.
- New strings use stable semantic i18n keys.
- Missing RU in the President cabinet is a localization defect, not a reason to expose raw technical English as the default UX.

### Human interface

- Internal complexity must not become cognitive burden.
- President can see everything but must not be forced to see everything at once.
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
- rollback/checkpoint information.

### Work mode

Purpose: slower architecture-quality pass.

Work should:

1. cold-start from this package;
2. verify actual implementation;
3. compare intent vs code vs data model;
4. identify architectural debt and accidental complexity;
5. improve reliability, security, clarity, testability and human ergonomics;
6. create a **new immutable version**, not rewrite history;
7. update this documentation package after the review.

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
- documentation updates.

## 9. Work review gate

Before a Work run promotes its result as the next stable checkpoint, it must review the rubric in `docs/WORK_REVIEW_PROTOCOL.md`.

The goal is not maximum cleverness. The goal is a system that becomes **more correct, more recoverable, more understandable and more valuable as an asset with every version**.
