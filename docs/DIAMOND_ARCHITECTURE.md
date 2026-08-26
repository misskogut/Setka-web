# SETKA Diamond Architecture

Status: canonical architecture map for the Diamond / President line.

This document explains intent and invariants. Current implementation must still be verified against the active checkpoint, migrations and deployed services before changes.

## 1. Core shape

SETKA Diamond separates identity from authority and product from control.

Core authorization chain:

`Identity → Credentials → Capabilities → Scope → Environment → Object → Allow/Deny → Audit`

Human organizational projection:

`Floor → Cabinet → Role Template → Assigned SETKA IDs`

Roles do not replace capabilities. A role is a named, reviewable bundle / UI profile.

## 2. Headquarters floors

The President cabinet is modeled as a headquarters rather than a flat admin menu.

### P0 — PRESIDENT ROOT

Purpose: ownership, final authority and system-control plane.

Typical responsibilities:

- identity issuance authority;
- capability/role architecture;
- floor/cabinet control;
- production release;
- rollback and restore;
- recovery/Vault control;
- full audit;
- Black Box authority;
- rules governing AI access to real data;
- canonical schema/language authority.

President is the only permanent root. Root is not a job title encoded in the SETKA ID.

### P1 — WORKSHOP / МАСТЕРСКАЯ

Purpose: create and test new SETKA before it descends into operational/product/public layers.

Recommended cabinets:

- **Architecture Workbench / Архитектурный стол** — system blocks, contracts and architecture graph.
- **Product Workshop / Продуктовая мастерская** — product mechanics and interfaces.
- **Pattern Forge / Цех паттернов** — Mother Patterns, geometry and deterministic runtime behavior.
- **AI Nursery / AI-питомник** — controlled generative exploration / candidate production.
- **Preview Bay / Испытательный стенд** — Preview, Shadow, validation and pre-release inspection.

Workshop may manufacture candidates but cannot silently publish them to Production/Public.

### P2 — OPERATIONS

Purpose: daily operating layer.

Future roles may include support, moderators, commercial operations, content operations, partner operations, finance operations, etc. These are secondary configuration details and must not become the primary system spine.

### P3 — EXTERNAL BUSINESS

Purpose: scoped access for external relationships: partners, investors, researchers, consultants, business clients, stores and other organizations.

External access must be explicit and scoped. External roles must not discover or inherit President-only surfaces merely because they share data relations with internal systems.

### P4 — PUBLIC / USER VIEW

Purpose: the actual product surface available to end users.

This is the lowest perspective in the headquarters map: what the user sees, not what exists internally.

## 3. Perspective model

President may switch perspective without changing true authority.

Conceptually:

- `real_identity = President SETKA ID`
- `real_authority = PRESIDENT_ROOT`
- `viewing_as = selected role/perspective`

`VIEW AS` is an inspection tool.

Future `ACT AS` would be a separate, much more sensitive capability and must not be conflated with visual inspection.

UI should always expose a stable anchor:

`YOU ARE: PRESIDENT ROOT`

and, when applicable:

`VIEWING AS: <role>`

## 4. Doors and isolation

Access zones have explicit states, for example:

- `OPEN`
- `GUARDED / RESTRICTED`
- `PRESIDENT_ONLY`
- `FROZEN`

Hierarchy rule:

`floor state > cabinet state > role/capability grant`

If a floor is closed to lower roles, an open cabinet inside it does not bypass the floor.

President may inspect lower closed zones through Root bypass, but all such access remains authenticated and auditable.

The President floor itself is permanently President-only.

## 5. Capability architecture

Capabilities are explicit units of authority.

Examples already represented in the Diamond model include concepts such as:

- `identity.issue`
- `role.manage`
- `capability.manage`
- `floor.control`
- `perspective.view`
- `production_release`
- `release.approve`
- `version_rollback`
- `data.raw.export`
- `vault.restore`
- `ai_lab_admin`
- `pattern.candidate.create`
- `flow.use`
- `flow.assign`

Governing law:

> A new capability starts at President-only authority and moves downward only through explicit, reviewable policy.

No implicit upward inheritance.

## 6. Identity issuance

Identity issuance is separate from privilege assignment.

Default law:

`Create SETKA ID` is President authority.

An issued ID receives identity, not automatic power.

If scale later requires self-registration or delegated issuance, it must be represented as an explicit issuance scenario with:

- allowed context;
- allowed identity class/relation;
- allowed initial capabilities/role template;
- policy version;
- audit trail;
- expiry/revocation if appropriate;
- no right to create new issuance scenarios;
- no right to expand privileges beyond the scenario policy.

## 7. SETKA Flow

SETKA Flow is the internal organizational nervous system, not merely email.

Core message classes:

- Message
- Request
- Approval
- Case
- Decision
- System Notice

A sender is identified by real SETKA ID and the role/perspective from which the message was sent.

Possible destinations:

- identity;
- role;
- queue;
- system;
- organization/scope in future.

Flow should allow work to be routed to lower operators without forcing President to process every message.

President cockpit should prioritize:

- decisions requiring President;
- escalations;
- urgent system notices;
- aggregate queue health.

## 8. Architecture Machine / Control Plane

The President architecture machine is a live graph of blocks and connections.

### Nodes

A node represents a meaningful architectural block, service, control plane, memory component, runtime or recovery component.

### Edges / wires

An edge represents an architectural relationship.

Important edge fields include:

- from node;
- to node;
- edge type;
- criticality;
- break policy;
- binding mode;
- active state;
- rationale/metadata.

### Binding modes

`DESIGN`
: The diagram expresses an intended / conceptual architectural relationship. Switching it does not pretend to alter unrelated runtime code.

`GUARDRAIL`
: The relation corresponds to an enforced invariant or protected system relationship. A UI line is only a representation; the real guardrail must exist in code/database/authorization.

`RUNTIME`
: The active state is actually consumed by working runtime code. This label requires implementation proof and tests; it must never be assigned cosmetically.

### Break policies

Examples:

- `free` — may be changed through normal President control.
- `review` — requires review/confirmation.
- `president_only` — Root operation.
- `never` — cannot be casually disconnected from this control plane.

Never-break is not decorative. If a relation is truly structural, the underlying implementation must protect it.

## 9. Time Machine

Diamond versions are immutable checkpoints.

The Time Machine distinguishes:

- **View version** — open/inspect an older front/build without mutating the working checkpoint.
- **Make working** — change the active Diamond working pointer after confirmation.

A later checkpoint remains preserved even if an earlier checkpoint becomes working again.

Every version should carry a change manifest in EN master + RU localization.

## 10. Release architecture

Preferred chain:

`Black Box → Preview → Approved → Production → Public`

Rules:

- new work does not default to Public;
- release requires explicit authority;
- release should declare front/backend/schema/algorithm/permission/data changes;
- release should declare what remains President-only;
- rollback/recovery path must be known before promotion.

## 11. Canonical data spine

Research/product facts follow `SETKA_DATA_MODEL_V1.md`.

Critical current rules include:

- PatternExposure is canonical pattern/config gameplay time.
- Favorites are canonical current saved relations.
- RAW Replay is temporary UX/reconstruction evidence.
- derived fact tables are rebuildable projections, not alternate realities.

Long-term Diamond identity spine should bind legacy v34/v35/v36 history to universal SETKA IDs without rewriting historical facts.

## 12. MEMORY / Resurrection architecture

Long-term recovery model:

`KEY + DNA + MEMORY + MANIFEST → deterministic reconstruction`

- **DNA** — schemas, algorithms, Mother Pattern rules, canonical language, migrations, build rules.
- **MEMORY** — append-only historical facts and relationships.
- **KEY** — cryptographic/recovery material, stored separately.
- **MANIFEST** — deterministic instructions, versions, checksums, dependencies and expected restore result.

Frontend is a lens, not the primary truth.

## 13. Security posture to verify on every Work review

Known design requirements:

- President/Black Box frontend ultimately belongs in a truly private environment.
- Public repository hosting is not acceptable for final Root UI even when secrets are absent.
- Diamond RPCs should not be directly callable by anon/authenticated roles; server gateway is the intended path.
- Legacy v34/v35 security debt must be audited carefully before changing RLS because compatibility is important.
- SECURITY DEFINER functions exposed to public roles require explicit review.
- Social v36 custom identity must eventually converge with universal SETKA ID without breaking current clients.

Never assume these are already fully solved. Verify current advisors and grants.

## 14. Human Interface Architecture

President is a product user too.

Design principles:

- complexity inside, calm outside;
- progressive disclosure;
- stable navigation positions;
- one screen = one cognitive task where possible;
- dangerous actions separated from normal operations;
- consequences and reversibility visible before action;
- Russian primary display with EN canonical semantics available for verification;
- global search / command layer as system scale grows;
- system map should make dependency relationships understandable without reading source code.

Core rule:

> President sees everything, but is never forced to see everything at once.
