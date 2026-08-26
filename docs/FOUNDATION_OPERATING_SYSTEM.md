# SETKA Foundation — Operating System

Status: mandatory working law for the Foundation 0.1.x line.

## Core metaphor

Foundation is one piece of wood being carved over time. A child version does not start from a new piece of wood.

`child = accepted parent + additive delta`

A developer may change layout or visual design, but may not silently remove an existing entity, capability, report, action, relationship or stored fact.

## Root order

The current conceptual roots are recorded in `foundation-constants-v018.js` and surfaced in the President `Константы` tab.

Seed/root order:

1. President — root decision authority.
2. President Cabinet — root administrative surface.
3. SETKA ID — persistent identity constant.
4. Surface permissions — Front and Back/Admin are independent layers on an ID.
5. Version — immutable lineage node.
6. Pin — addressed task/proposal attached to version/surface/place.
7. Synthetic — SETKA ID with synthetic nature and delegated permissions.
8. Pattern — persistent product/content entity.
9. Session/TRACE — persistent evidence of an ID path and actions.

The registry may grow. Existing constants are not recreated under new names when a new relation can use the existing constant.

## Version law

Before coding version N+1:

1. Read the contract of N.
2. Load the actual deployed N.
3. Collect unresolved President pins from earlier versions.
4. Collect approved synthetic pins.
5. Define only the delta.
6. Preserve every parent capability and constant unless the President explicitly orders removal.
7. Run the lineage guard before moving WORKING.

A broken WORKING child is not a valid base. Repair it from the last intact parent plus all accepted deltas; do not stack another child on top of an unknown regression.

## Regression contracts

Machine-readable contracts:

- `foundation-contract-v016.json`
- `foundation-contract-v017.json`
- `foundation-contract-v018.json`

Guard:

- `foundation-lineage-check.mjs`

The guard requires the child to be a superset of parent capabilities and constants. Future explicit removals require a separately recorded President-approved removal mechanism; silent deletion is invalid.

## 0.1.8 layer model

The repaired 0.1.8 President surface is intentionally layered:

`0.1.6 BASE → 0.1.7 IDENTITY → 0.1.8 DELTA`

BASE preserves user/pattern/synthetic analytics, synthetic run history, opening a synthetic as a user, protocol and traces.

IDENTITY adds neutral SETKA ID, human/synthetic nature, independent Front/Back permissions, origin, roles/tasks and synthetic-admin permissions.

DELTA adds pin workflow/list/review, constants registry, restored carry-forward visibility and lineage regression guard.

Do not replace BASE or IDENTITY render semantics with a narrower new card.

## Pin workflow

President pin:

- red = new / untouched;
- yellow = accepted into work;
- green = implemented and linked to implementation version.

Synthetic pin:

- proposal only until President decision;
- approve → becomes normal President-approved work item;
- reject → removed from the working proposal list;
- synthetic proposals never silently become product changes.

Pins from version N are the default task source for N+1, while unresolved older pins remain debt until explicitly resolved.

## Release gate

A Foundation child may become WORKING only when all are true:

1. Parent contract is preserved.
2. Front shell opens and identifies the child pair.
3. President shell opens and the inner President page is not blank/frozen.
4. Required root tabs/entities exist.
5. Pin controls load.
6. Backend reports the same pair version.
7. GitHub Pages deploy succeeds.
8. `foundation-lineage-check.mjs` passes.
9. The live smoke passes.

If any gate fails, the child is not considered a trustworthy working base.

## Optimization rule

Prefer extending an existing entity and relation over creating a new entity. Prefer explicit, versioned layers over global monkey-patches. Avoid observers or loops that mutate the same DOM they watch. Avoid hidden compatibility rewrites where a clean versioned adapter can be created; compatibility bridges must be temporary and documented.
