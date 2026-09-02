# SETKA Diamond — Decision Log

Purpose: preserve the reasons behind important architecture choices so future reviews do not accidentally “simplify away” intentional constraints.

This is not a substitute for current code/schema verification.

## ADR-001 — SETKA ID is identity, not authority

Decision: every actor is represented by a SETKA ID; the ID string is immutable and nonsemantic. Roles, capabilities, credentials and relationships are separate.

Reason: identity must survive business/org changes without forcing identifier migration.

Consequence: never encode President, age, partner tier, source, role or business meaning into the ID string.

## ADR-002 — Exactly one President Root

Decision: one active SETKA identity holds the exclusive President Root authority.

Reason: avoid competing roots, covert bypasses and ambiguous ownership of system authority.

Consequence: recovery must restore authority without permanently creating a second root.

## ADR-003 — Capabilities are primary; roles are bundles

Decision: authorization is capability-based. Roles are named templates/UI profiles over capabilities and scopes.

Reason: future organizational roles are unpredictable and may require individual exceptions.

Consequence: do not build core authorization around fixed job titles.

## ADR-004 — Floors and cabinets are access zones

Decision: headquarters is modeled as Floor → Cabinet → Role → ID.

Reason: a serious organization needs the ability to isolate whole zones, not only individual users.

Consequence: a closed floor overrides lower open cabinets. President retains audited inspection access.

## ADR-005 — President can VIEW AS lower roles

Decision: President keeps real Root identity while inspecting the UI/access perspective of a lower role.

Reason: President must be able to design and validate future role-specific admin configurations before assigning them to other people.

Consequence: `VIEW AS` is not `ACT AS`; future impersonated mutation would require a separate high-risk mechanism.

## ADR-006 — President controls identity issuance by default

Decision: `identity.issue` starts President-only.

Reason: no actor should appear with authority that President did not explicitly authorize personally or through a predesigned scenario.

Consequence: scalable self-registration/delegated issuance must use narrow issuance scenarios and cannot grant broad issue/role-management power.

## ADR-007 — Public is not the default destination

Decision: new functionality starts inside protected/private development flow.

Preferred path:

`Black Box → Preview → Approved → Production → Public`

Reason: prevent experiments, AI outputs and unfinished capabilities from silently becoming user-facing behavior.

## ADR-008 — Immutable checkpoints and pointer rollback

Decision: meaningful versions remain preserved; rollback changes an active pointer rather than deleting later versions.

Reason: the user may review versions asynchronously and needs safe comparison/return.

Consequence: “View version” must remain non-mutating; “Make working” is explicit.

## ADR-009 — English semantic master, Russian President display

Decision: EN is the canonical semantic source; RU is the primary President localization/display.

Reason: stable internal semantics plus comfortable everyday operation for the President.

Consequence: missing RU is a localization defect. Stable semantic i18n keys are required.

## ADR-010 — Human Interface Architecture is a core requirement

Decision: the President cabinet is a product, not a developer admin panel.

Reason: system complexity will grow beyond what a human can hold in working memory.

Consequence: progressive disclosure, stable navigation, consequences/undo visibility, visual maps and cognitive load reduction are architecture requirements, not polish.

## ADR-011 — Headquarters model

Decision: current conceptual floors are:

`PRESIDENT ROOT → WORKSHOP → OPERATIONS → EXTERNAL BUSINESS → PUBLIC`

Reason: this structure captures durable authority zones without binding the spine to temporary job titles.

Consequence: investor/researcher/partner/operator/etc. remain configurable roles rather than core floors unless future evidence requires a structural change.

## ADR-012 — Workshop is the creative production floor

Decision: the former generic Lab concept is human-facing as Workshop / Мастерская.

Core cabinets:

- Architecture Workbench;
- Product Workshop;
- Pattern Forge;
- AI Nursery;
- Preview Bay.

Reason: this floor exists to build new SETKA, not to represent a generic technical department.

Consequence: Workshop may create/test candidates but cannot self-promote them to Public.

## ADR-013 — SETKA Flow is organizational nervous system

Decision: internal communication is modeled as messages, requests, approvals, cases and decisions addressed to identities/roles/queues/system.

Reason: communication should carry authenticated organizational context and support routing/escalation.

Consequence: President sees required decisions and system health, not every operational message by default.

## ADR-014 — Architecture Machine is a real control-plane graph

Decision: architecture blocks and wires are canonical objects, not a static illustration.

Reason: the President needs a visual associative map that also acts as a construction/coordination tool.

Consequence: nodes/edges have state, type, criticality, policy and metadata.

## ADR-015 — DESIGN / GUARDRAIL / RUNTIME must be truthful

Decision: architecture wires distinguish conceptual, enforced and runtime-consumed connections.

Reason: a diagram must never create false confidence that switching a line changed production code.

Consequence: `RUNTIME` requires actual implementation and verification. `GUARDRAIL` requires underlying enforcement. `DESIGN` may represent intended architecture only.

## ADR-016 — Never-break relationships cannot be casually cut

Decision: structural relationships can have `break_policy = never`.

Reason: some system relationships are load-bearing and must not be disconnected by an ordinary UI click, even by President.

Consequence: structural redesign requires a separate reviewed migration/recovery plan.

## ADR-017 — One real entity exists once

Decision: analytics and dashboards may create metric slices, not duplicate entities.

Reason: avoid conflicting truths and semantic drift.

Consequence: follow `SETKA_DATA_MODEL_V1.md`; derived fact tables remain rebuildable projections.

## ADR-018 — PatternExposure is canonical gameplay-time truth

Decision: real visible gameplay exposure is stored as PatternExposure and is the source for pattern/config time.

Reason: replay/state snapshots can include time outside actual gameplay and are unsafe as product-time truth.

Consequence: RAW Replay remains UX/reconstruction evidence.

## ADR-019 — Historical MEMORY is a crown-jewel asset

Decision: preserve append-only historical facts/provenance and bind legacy history to future universal SETKA IDs without rewriting facts.

Reason: geometry/configuration → interaction → repeated behavior → observed outcome history is difficult or impossible to recreate.

Consequence: migration should link, not rewrite; unresolved mappings are explicit.

## ADR-020 — Resurrection model

Decision: recovery architecture is conceptually:

`KEY + DNA + MEMORY + MANIFEST → deterministic reconstruction`

Reason: frontend/deployments are rebuildable; canonical facts, meaning, algorithms and reconstruction instructions are the durable asset.

Consequence: keys are separate, restores must eventually be tested, and documentation/build dependencies/checksums matter.

## ADR-021 — AI leaves deterministic critical loops when possible

Decision: AI investigates unknowns; repeatable critical operations should become deterministic rules/math/state machines once understood.

Reason: improve repeatability, auditability, cost and resilience.

Consequence: AI Pattern Nursery and research may generate candidates, but release and canonical-history mutation remain controlled.

## ADR-022 — Documentation is part of the architecture

Decision: every substantial version leaves a machine-readable/human-readable handoff trail and future Work reviews cold-start from canonical documentation then verify reality.

Reason: reduce key-person/context risk and allow a future smarter review mode to improve quality without rediscovering the project.

Consequence: docs must be updated with versions, but live code/schema remain higher truth than prose.

## ADR-023 — Build in an unnumbered working draft; number only the accepted result

Decision: a numbered version is an immutable/frozen result. New changes are developed in an exact working copy derived from the latest intact frozen parent. The next permanent version number is assigned only after the draft passes regression checks and the required President review.

Canonical cycle:

`N FROZEN → WORKING DRAFT FROM N → additive delta → tests/review → N+1 FROZEN`

Reason: assigning `N+1` before the work is stable turns a historical checkpoint into a mutable construction site, encourages accidental regressions, and makes it harder to know what a version actually means.

Consequence:

- never edit frozen N in place;
- never create permanent N+1 merely to start coding;
- pins on N feed the working draft derived from N;
- after promotion those pins may record `implemented in N+1`;
- the draft must preserve all parent constants/capabilities by default;
- only a stable/accepted draft becomes the next immutable numbered checkpoint;
- legacy control-plane fields named `WORKING` that still point to numbered versions are transitional implementation debt and must not override this semantic law.

## ADR-024 — Preserve causal information; rematerialize deterministic consequences

Decision: for deterministic or seed-reproducible SETKA systems, permanent storage preserves the minimum complete causal replay contract rather than every intermediate mathematical coordinate.

Canonical replay model:

`STATE(t) = GENESIS + LAW + VARIABLES + CAUSAL_PATCHES<=t + IRREVERSIBLE_INPUTS<=t + REPLAY_CONTRACT`

A canonical transcript event is required when new information appears or future evolution changes/proves: Genesis, parameter mutation, external/non-reproducible input, meaningful endogenous action, time-mode change, checkpoint/capsule or run completion. A deterministic equation advancing one tick with no causal change is not by itself a canonical event.

Reason: dense autopilot traces can expand a very small mathematical law into large PostgreSQL/WAL/index/JSON storage without adding equivalent information. SETKA already treats time causally in the mother transcript: it records meaningful changes and their timestamps rather than one event per silent second. The same law should govern mathematical trajectories.

Consequence:

- replay contracts must include exact law/version/hash, Genesis, variables, seeds, numerical/runtime semantics and clock semantics;
- behavior/control variables such as curiosity are replay variables whenever they can affect choices/dynamics;
- parameter mutations are append-only causal patches anchored to exact tick/time boundaries;
- elapsed causal silence and mathematical distance are represented by interval boundaries, not dense `NO_ACTIVITY`/coordinate rows;
- external or otherwise non-reproducible inputs are preserved and never guessed during replay;
- dense trajectory tables are bounded, disposable materializations for analysis/visualization/proof;
- checkpoint/root hashes prove regenerated history before any destructive compaction;
- future writers pass through semantic write admission and explicit byte/event budgets;
- unknown semantic write classes fail closed to review;
- PostgreSQL cleanup/compaction is never authorized solely by this ADR; backup, audit, exact replay proof and evidence/archive requirements apply first;
- machine contracts and the offline replay core remain versioned in GitHub and independent of database availability.

Primary design: `docs/SETKA_PROCEDURAL_STORAGE_V1.md`.

---

## Adding a decision

Add a new ADR when a choice changes one of these:

- canonical meaning;
- identity/authority model;
- data source of truth;
- release/recovery semantics;
- architectural dependency direction;
- privacy/security invariant;
- versioning behavior;
- human-interface law.

Small implementation choices belong in version manifests, not this log.
