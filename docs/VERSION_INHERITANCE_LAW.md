# SETKA Diamond — Version Inheritance Law

Status: canonical architecture law for Diamond version growth and President research.

## 1. Core law

A new Diamond version is not a replacement universe. It is a new layer on the same architectural lineage.

`parent checkpoint → inherited architecture/data laws → explicit delta → new checkpoint`

A later version may experiment aggressively, but it must never silently destroy the canonical architecture, identity spine, data meaning, recovery history, or immutable evidence inherited from its parent.

## 2. Every version belongs to the system

Each checkpoint must have:

- a parent checkpoint (except the root of the line);
- a registered front/build or an explicit statement that no separate visual shell exists;
- a status: stable / working / superseded / failed;
- a human-readable change manifest;
- an explicit statement of what remains untouched;
- compatibility and rollback semantics;
- source references for code/migrations/API;
- test evidence appropriate to the change.

A failed version remains historical evidence. Do not rewrite or pretend it was stable.

## 3. Inheritance rule

A child version must preserve parent invariants unless the change manifest explicitly introduces a reviewed architecture migration.

At minimum, inheritance review asks:

1. Did identity/auth/capability semantics remain valid?
2. Did canonical data meanings remain valid?
3. Did existing floors/cabinets/blocks/wires remain addressable or receive an explicit migration?
4. Did the public production pointer remain unchanged unless release was explicitly approved?
5. Can the parent version still be viewed as historical evidence?
6. Can a failed experimental block be removed without erasing the rest of the child history?
7. Is rollback a pointer/history operation rather than deletion of newer versions?

## 4. Failed parts vs failed versions

When a new block does not work, choose deliberately:

- **Block inactive / disconnected** — keep the version but mark the experimental block inactive when the inherited system remains sound.
- **Version failed** — mark the checkpoint failed when the version itself cannot be trusted as a working integrated system.
- **New corrective child** — create a new checkpoint when the problem can be corrected without rewriting the failed historical artifact.

Never overwrite a failed checkpoint to make history look cleaner.

## 5. Viewing is not activation

The President interface must distinguish:

- **VIEWING VERSION** — observational navigation only. It may load any registered historical cabinet for comparison.
- **WORKING CHECKPOINT** — the system pointer used by current Diamond work.
- **PRODUCTION** — the explicitly released public product.

Changing VIEWING VERSION must never change WORKING or PRODUCTION.

## 6. Cross-version President research

President research traces are first-class internal evidence.

A single research trace may cross multiple historical versions. It records:

- visited checkpoints/front versions;
- pointer/touch trajectories and semantic UI targets;
- order and timing;
- scrolling/navigation;
- version switches;
- page/runtime errors observed during the research session;
- a President-authored title and comment at finalization.

It must NOT record:

- President Key or credentials;
- field/input values;
- secret material;
- canonical user/product events merely because the President is researching the admin UI.

Research traces live in the protected Diamond internal layer and do not enter public product analytics.

## 7. Research session continuity

A long trace is stored incrementally as small chunks. Therefore:

- changing versions does not erase the session;
- a historical page crash does not erase previously uploaded evidence;
- another research tab may join the same active trace;
- finalization adds human meaning without changing the recorded technical path.

A Trace ID can be used in later architecture discussion to refer to the exact President investigation instead of reconstructing intent from screenshots.

## 8. Automated checks

Automation should progressively verify stable versions across the lineage.

Initial minimum:

- historical shell can load;
- registered stable versions remain reachable;
- failed checkpoints are visibly marked failed;
- current research shell itself loads without parent-page JS errors.

Future credentialed checks should add real President-path/API compatibility without storing root credentials in source control.

## 9. Work review rule

A Work pass must treat version history as evidence, not clutter.

When reviewing the next version, Work should compare:

`parent intent + parent runtime + child delta + regression evidence + President traces`

The goal is not to preserve every experimental feature forever. The goal is to preserve the architectural lineage and canonical truth while allowing failed experiments to be clearly isolated, disabled, or superseded.
