# SETKA Diamond v0.8 — Version Handoff

## Version identity

- Version / checkpoint: `diamond-v0.8`
- Parent checkpoint: `diamond-v0.7.3`
- Date: 2026-08-26
- Registered source commit SHA: `d1c334d15663578780dac5416771897ccff7a935`
- Front/build artifact: `diamond-president-v08.html`
- Front version: `diamond-president-v0.8`
- API / Edge Function: `setka-diamond-president-v3@5`, API semantic version 9
- Schema version: 9
- Migration refs: `diamond_v08_cross_version_research_traces`, `diamond_v08_register_cross_version_research_console`
- Environment / channel: Black Box
- Public Production: unchanged (`public-new-chat-v1.1`)

## Human intent

### Why this version exists

The President needs to investigate SETKA across its own version history without repeatedly opening unrelated pages, losing context, or explaining defects from screenshots. v0.8 turns version history into an observable research surface: historical cabinets can be switched in one tap while a single President research trace continues across versions.

### User-facing goal

The President can compare versions rapidly, record exactly what was touched/observed, annotate the investigation in plain language, and later reference the same evidence by a short `TRACE-...` identifier during architecture work.

## What changed

### Added

- Persistent top Version Research bar.
- One-tap previous / next version navigation plus version selector.
- Separation of VIEWING version from WORKING checkpoint.
- Historical Diamond front loaded inside one persistent research console.
- Cross-version research traces.
- Incremental chunked trace persistence.
- Final trace title/comment dialog.
- Trace drawer showing title, comment, visited versions and Trace ID.
- Historical page/runtime errors can be captured as research events.
- Cross-version lineage smoke workflow.
- Canonical `docs/VERSION_INHERITANCE_LAW.md`.

### Changed

- Pencil recording is now a research session rather than a single-page recording.
- Trace storage can span multiple version segments and browser tabs.
- Version comparison is observational; it does not change the Diamond working pointer.

### Removed / deprecated

- Nothing removed from historical immutable versions.
- v0.7.3 one-page trace RPCs remain for backward compatibility.

### Deliberately untouched

- Public user product.
- Production release pointer.
- v35 canonical product analytics.
- Synthetic User Lab isolation.
- Historical front files.
- Existing identity/capability/root model.
- Runtime architecture wires.

## Architecture impact

### Nodes added/changed

No canonical architecture graph node was added in this version. v0.8 is an instrumentation/control-plane layer around registered historical fronts.

### Conceptual connections added

- Version registry → Research Console → historical front view.
- President interaction → protected research trace → Trace ID → later architecture review.
- Historical page error → research evidence.

These are not falsely labeled RUNTIME architecture edges in the canonical graph. The actual implementation is front + President gateway + protected trace RPCs/tables.

### Dependency direction

Historical fronts do not depend on the v0.8 console. The console depends on the version registry and historical immutable front URLs. Removing the console must not invalidate a historical front artifact.

## Identity / access impact

### New capabilities

None.

### Capability changes

None. Research traces use existing authenticated President authority.

### Roles / floors / cabinets / issuance

No changes.

## Data impact

### New internal entities

- Extended `diamond.interaction_traces` as the research-session header.
- New `diamond.interaction_trace_chunks` for incremental segments.

These are internal President research evidence, not public product facts.

### Stored research meaning

A trace can store:

- visited checkpoint/front versions;
- pointer/touch positions and timing;
- semantic targets such as tab/floor/cabinet/block/button identifiers;
- scroll/navigation events;
- version switches;
- observed page/runtime errors;
- President-authored title/comment.

### Explicitly not stored

- President Key / credentials;
- field/input values;
- secret material;
- product analytics simply because the admin UI was being investigated.

### Canonical source impact

No change to canonical product data sources. Research traces remain separate Diamond internal evidence.

## API / contract impact

New President gateway actions:

- `trace_start`
- `trace_append`
- `trace_finalize`
- `trace_list_v2`
- `trace_get_v2`

Backward-compatible old actions remain:

- `trace_save`
- `trace_list`
- `trace_get`

Trace chunks are idempotent by `(trace_id, segment_key, chunk_seq)`.

## Security impact

- New trace RPCs are `SECURITY DEFINER`, but `EXECUTE` was revoked from `public`, `anon`, and `authenticated`.
- Verified new trace RPCs are executable by `service_role` only.
- Trace tables have RLS enabled and no public policies; direct public/anon/auth access is revoked.
- President gateway remains custom session authenticated.
- No President credentials were added to source, CI or documentation.
- Supabase advisor shows `RLS enabled no policy` INFO for Diamond trace tables; this is expected for the service-only access model.
- Pre-existing legacy security debt remains outside this version, including legacy exposed/RLS issues and `diamond_simulation_tick` execution warnings.

## Human Interface Architecture

- Tablet-landscape remains the primary President format.
- Version selection is permanently visible at the top.
- `VIEWING` and `WORKING` are shown as separate concepts.
- Known failed versions remain visible rather than silently removed.
- Pencil stays outside historical iframe so one research session survives version switches.
- Finalization asks for human meaning only after the path has already been incrementally preserved.

## Verification performed

### Database / permissions

- Migration `diamond_v08_cross_version_research_traces`: success.
- Migration `diamond_v08_register_cross_version_research_console`: success.
- Verified new trace RPC permissions: anon=false, authenticated=false, service_role=true.
- Verified working checkpoint after registration: `diamond-v0.8`.
- Verified Black Box front pointer: `diamond-president-v0.8`.
- Verified Production remains `public-new-chat-v1.1`.
- Security advisor reviewed after migration.

### API

- Edge Function `setka-diamond-president-v3` deployed as version 5 / API v9.

### Browser / lineage

Cross-version Chromium smoke run: `32924845753` — success.

Observed baseline:

- PASS: v0.3
- PASS: v0.4
- BASELINE DEGRADED: v0.5 — pre-existing parser error `Unexpected token ','`
- PASS: v0.6
- PASS: v0.6.1
- PASS: v0.7
- PASS: v0.7.1
- KNOWN FAILED: v0.7.2 — reproduces historical parser error `Unexpected token 'class'`
- PASS: v0.7.3
- PASS: v0.8

This test intentionally distinguishes historical checkpoint status from current observable compatibility health.

### Credentialed E2E

Not performed for v0.8 during this implementation pass. The first real President research recording should be treated as the credentialed functional validation of start → cross-version append → comment → finalize → list/read.

## Known unknowns / debt

- v0.5 is historically marked stable but currently has a reproducible parser error. Do not mutate v0.5; decide later whether to create a corrective historical-compatible child/reference artifact.
- v0.7.2 remains a legitimate failed historical checkpoint.
- Multi-tab research shares active Trace identity through localStorage, but President auth remains sessionStorage-scoped per browser tab; a newly opened research tab may require login. This is intentionally safer than persisting a root session token in shared storage.
- Pause/finalization synchronization across multiple simultaneously active research tabs can be hardened further.
- v0.8 uses the v0.7.3 cabinet as its functional inner base and adds the persistent research frame around it. Future Work should decide whether this composition should become a reusable shell contract rather than a special-case iframe composition.
- `requestStop`/final flush error handling should be hardened so a failed final chunk upload cannot be visually mistaken for a clean pause.
- Historical version shell smoke is currently unauthenticated. A future private CI mechanism can add credentialed compatibility checks without storing President root material in source control.

## Compatibility

- Compatible with parent v0.7.3: YES for the President functional base; v0.8 wraps it with research instrumentation.
- Old front can read new trace data: NO NEED; old v0.7.3 trace API remains backward compatible.
- New front can read historical trace/version data: YES through v2 trace API and registered historical fronts.
- Public product changed: NO.

## Rollback / recovery

- UI working rollback is pointer-based: return `diamond_working` and Black Box front pointer to v0.7.3.
- v0.8 schema additions remain after a UI pointer rollback; they are additive and do not alter canonical product data.
- New research history should not be deleted during rollback.
- No public Production rollback is required because Production did not move.

## Work-review flags

A deeper Work pass should specifically inspect:

- whether Version Research Console should become a first-class reusable shell contract;
- v0.5 baseline degradation and whether it indicates artifact drift or an original build defect;
- credentialed historical API compatibility strategy;
- multi-tab trace coordination;
- final-chunk durability/error UX;
- long-session retention/compaction policy for trace chunks;
- automatic comparison/diff generation from multiple traces and lineage smoke results;
- linkage between President traces and future architecture issues/decisions without turning raw traces into canonical truth.

## EN change manifest

### Added

- Persistent cross-version browsing.
- Cross-version President research traces with comments.
- Incremental protected trace chunks.
- Version-lineage browser smoke testing.

### Changed

- Pencil is now a research-session instrument.
- Version browsing is explicitly observational.

### Unchanged

- Public Production, canonical product analytics, root authority model, historical artifacts.

### Compatibility

- Current stable lineage passes except the explicitly baselined v0.5 compatibility debt; v0.7.2 remains FAILED.

### Rollback

- Switch working/Black Box pointers back; preserve v0.8 and research history.

## RU change manifest

### Добавлено

- Постоянное переключение между версиями.
- Кросс-версионные исследования Президента с комментариями.
- Пошаговое защищённое хранение Trace.
- Браузерная проверка наследования версий.

### Изменено

- Карандаш стал инструментом полноценной исследовательской сессии.
- Просмотр версий отделён от переключения рабочего checkpoint.

### Не затронуто

- Публичный Production, каноническая продуктовая аналитика, root-полномочия и исторические артефакты.

### Совместимость

- Текущая стабильная линия проходит проверку, кроме отдельно зафиксированного долга v0.5; v0.7.2 остаётся FAILED.

### Откат

- Вернуть рабочий/Black Box pointer на v0.7.3, не удаляя v0.8 и историю исследований.
