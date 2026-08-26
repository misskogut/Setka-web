# SETKA Version Handoff Template

Use this template for every substantial new Diamond / architecture version.

The goal is to let a future Work review reconstruct why the version exists without reading the conversation that produced it.

---

## Version identity

- Version / checkpoint:
- Parent checkpoint:
- Date:
- Git commit SHA:
- Front/build artifact:
- API / Edge Function version:
- Schema version:
- Migration refs:
- Environment / channel:

## Human intent

### Why this version exists

One short paragraph.

### User-facing goal

What becomes easier/safer/clearer for the President, operator, partner or public user?

## What changed

### Added

- 

### Changed

- 

### Removed / deprecated

- 

### Deliberately untouched

- 

## Architecture impact

### Nodes added/changed

- 

### Wires added/changed/disconnected

For each important wire:

- from → to
- binding: DESIGN / GUARDRAIL / RUNTIME
- break policy
- why it exists

### Dependency direction

State whether any inner layer now depends on an outer layer. If yes, justify or fix.

## Identity / access impact

### New capabilities

- 

### Capability changes

- 

### New roles / role-template changes

- 

### Floor/cabinet changes

- 

### Issuance changes

- 

## Data impact

### New canonical entity/fact/relation

- 

### Existing canonical source reused

- 

### Derived/cache changes

- 

### Historical migration/backfill

- 

### Provenance implications

- 

## API / contract impact

- New endpoints/actions:
- Changed fields/semantics:
- Backward compatibility:
- Client adapters required:

## Security impact

- Authentication changes:
- Authorization changes:
- RLS/grants changes:
- SECURITY DEFINER changes:
- Secret handling changes:
- New exposed surface:
- Known security debt left in place:

## Localization impact

- EN master strings added/changed:
- RU localization status:
- Missing translations:

## Human Interface Architecture

- Cognitive load improvement:
- Navigation/context improvement:
- Dangerous-action safeguards:
- Reversibility shown to user:
- New “Explain this”/context aids if any:

## Verification performed

Only list things actually executed.

- Migration checks:
- API smoke checks:
- Negative authorization checks:
- E2E checks:
- CI/deploy:
- Security advisor review:
- Visual/manual checks:

## Known unknowns / debt

- 

## Compatibility

- Compatible with parent: YES / PARTIAL / NO
- Old front can read new data: YES / PARTIAL / NO
- New front can read historical data: YES / PARTIAL / NO
- Public product changed: YES / NO

## Rollback / recovery

- Is pointer-only rollback sufficient?
- Are there schema/data migrations that remain after UI rollback?
- How to restore prior behavior?
- Any irreversible operation?

## Work-review flags

What should the next deeper Work pass inspect specifically?

- 

## EN change manifest

### Added

- 

### Changed

- 

### Unchanged

- 

### Compatibility

- 

### Rollback

- 

## RU change manifest

### Добавлено

- 

### Изменено

- 

### Не затронуто

- 

### Совместимость

- 

### Откат

- 

---

Completion rule: a substantial version is not fully documented until this handoff information is represented either in the checkpoint manifest/database metadata, canonical docs, or both.
