# SETKA Work Review Protocol

Purpose: define how a deeper Work-mode pass reviews an existing SETKA version before producing the next one.

Work is not a license for broad refactoring. It is a stricter quality gate over an already versioned system.

## 1. Entry condition

A Work run begins by reading `SETKA_START_HERE.md` and reconstructing current reality.

No write should happen until the run has verified:

- active checkpoint;
- parent checkpoint;
- relevant front/backend/API versions;
- migrations;
- current architecture graph;
- security posture;
- current public/preview/black-box boundaries;
- CI/deploy status.

## 2. Required first output

Before implementation, produce a concise audit preamble:

- **Current verified version**
- **Parent / rollback point**
- **What is healthy**
- **What is uncertain or debt**
- **What the next version will improve**
- **What will explicitly remain untouched**

If the current state cannot be verified, stop and resolve that before refactoring.

## 3. Review rubric

Score each area as:

- `0 = unknown / not verified`
- `1 = fragile / material risk`
- `2 = acceptable with debt`
- `3 = strong / verified`

### A. Architecture integrity

Check:

- one canonical reality per entity;
- dependencies point in the intended direction;
- outer layers do not become required by inner layers;
- role/UI concepts do not leak into identity core;
- temporary compatibility code is labeled as such;
- architecture graph matches actual runtime closely enough to be useful;
- DESIGN/GUARDRAIL/RUNTIME labels are truthful.

### B. Data correctness

Check:

- canonical source-of-truth tables are respected;
- derived caches are rebuildable;
- no duplicate metrics masquerade as new entities;
- timestamps/context/session type are preserved;
- historical facts are not rewritten for convenience;
- migrations preserve provenance;
- observational analytics are not presented as causal findings.

### C. Identity / authorization

Check:

- identity, credentials, roles and capabilities remain separate;
- deny-by-default behavior;
- scopes are explicit;
- floor/cabinet doors are server-enforced where claimed;
- President-only invariants cannot be bypassed by lower roles;
- issuance scenarios cannot escalate authority;
- `VIEW AS` does not mutate true identity/authority.

### D. Security

Check:

- public DB grants / RLS;
- SECURITY DEFINER exposure;
- Edge Function authentication;
- session handling and expiry;
- CORS / CSP where relevant;
- no secrets in frontends or repository docs;
- private/admin surfaces are actually private where claimed;
- audit events exist for sensitive mutations;
- known legacy debt is documented if not fixed.

### E. Recovery / reversibility

Check:

- parent checkpoint exists;
- rollback semantics are truthful;
- destructive migrations have explicit recovery path;
- backups/recovery assumptions are tested where possible;
- new schema can be reconstructed from migration chain;
- docs identify any irreversible step.

### F. Version discipline

Check:

- latest version does not overwrite previous stable artifact;
- commit/checkpoint/front/API/migration identifiers are recorded;
- change manifest is complete;
- compatibility is stated;
- “view” and “activate” actions remain separate;
- production/public pointers are not changed accidentally.

### G. API / contract quality

Check:

- endpoints have clear responsibilities;
- old clients are not broken silently;
- field semantics are stable or versioned;
- error behavior is understandable;
- server-side enforcement does not rely on UI hiding;
- direct DB access is minimized for sensitive domains.

### H. Tests / verification

Check appropriate levels:

- migration verification;
- authorization negative tests;
- API smoke tests;
- two-device / multi-session E2E where social identity is involved;
- rollback/checkpoint tests;
- runtime behavior tests for architecture wires labeled RUNTIME;
- CI/deploy success.

Do not claim “tested” when only code was inspected.

### I. Human Interface Architecture

Evaluate the President cabinet as a real product:

- location/context is always clear;
- primary action is obvious;
- dangerous vs safe actions are visually/conceptually separated;
- consequences are explained before mutation;
- reversibility is visible;
- information density stays within human cognitive limits;
- navigation scales without requiring memory of technical table names;
- architecture can be understood visually and semantically;
- lower-role perspective inspection is easy.

### J. Localization

Check:

- EN semantic master exists;
- RU primary President display is complete;
- stable i18n keys;
- technical fallback does not silently replace important RU text;
- data-driven architecture labels resolve consistently.

### K. Observability / auditability

Check:

- who did what and when can be reconstructed;
- system status is visible without opening infrastructure dashboards;
- failures are distinguishable from empty states;
- Flow, access, release and architecture mutations are auditable;
- important state changes can be correlated with version/checkpoint.

### L. Asset hardening

Check whether the version improves or weakens:

- ownership/provenance clarity;
- portability/transferability;
- recoverability;
- documentation quality;
- data lineage;
- security posture;
- dependency lock-in;
- key-person risk.

A feature should not increase product value by decreasing asset protectability without explicit President approval.

## 4. Change classification

Before implementation classify the proposed next version:

- `PATCH` — correctness/UX/security improvement without new system concept.
- `FEATURE` — new capability or product/control feature using current spine.
- `ARCHITECTURE` — changes system relationships/contracts.
- `MIGRATION` — changes canonical storage or identity/data lineage.
- `RECOVERY` — changes restore/key/backup mechanics.

Architecture/Migration/Recovery changes require stronger rollback and compatibility notes.

## 5. Refactoring rules

Work may simplify implementation but must preserve intentional behavior.

Before deleting/replacing anything, answer:

1. What real concept does this code/table/API represent?
2. Is it canonical, compatibility, derived cache, transport, or UI-only?
3. Who currently reads/writes it?
4. What historical versions depend on it?
5. What migration/adapter replaces it?
6. How is rollback performed?

Never “clean up” unknown dependencies by assumption.

## 6. Next-version construction

A Work-created next version should:

- start from verified current checkpoint;
- change the smallest coherent set of layers;
- preserve previous artifact;
- add migrations via versioned migration mechanism;
- use separate API version when contract risk justifies it;
- verify CI/deploy;
- register new checkpoint/front version;
- update documentation.

## 7. Required Work completion report

Every Work architecture pass ends with:

### Verified baseline

Current version/checkpoint/commit/API/schema.

### Findings

Prioritized by severity:

- critical;
- high;
- medium;
- low;
- future opportunity.

### Changes made

Exact files/migrations/functions/contracts.

### Verification

What was actually executed/tested.

### Remaining debt

Known unresolved risks.

### New version

Checkpoint + parent + access/release state + rollback statement.

### Documentation

Which canonical docs were updated.

## 8. The quality goal

The Work pass should make the system easier for a future intelligent reviewer to understand than it was before.

A successful version is not merely one that runs. It should reduce uncertainty.
