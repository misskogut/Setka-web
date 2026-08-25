# SETKA Research Admin version lines

## Standard

- Name: **SETKA Admin Standard v34.10**
- Status: frozen reference implementation
- Baseline commit: `c3a6271d706e285bb3b68bb4212949ba1cc1647a`
- Archive branch: `archive/admin-standard-v34.10`
- Public frozen page: `standalone-admin-standard-v34.10.html`
- Rule: never modify the Standard page or its pinned dependencies. It exists for regression comparison and partial restoration into Evolution.

## Evolution

- Name: **SETKA Admin Evolution v35.2**
- Status: active redesign line
- Baseline: Standard v34.10
- Public latest page: `standalone-admin-evolution-v35.html`
- Version sequence: `v35.0`, `v35.1`, `v35.2`, ...
- v35.1: first human-analytics architecture. Navigation: Overview → Participants → Patterns → Sessions → States → UX / Replay → Notes → Physiology → Funnel → Data/System. Added initial participant/pattern/config semantic facts, canonical config normalization, strict outcome/exploration separation in Evolution analytics, permanent favorite semantic storage, digest fallback after RAW Replay expiry, Dandelion/Tentacle previews and an Evolution RAW Replay player.
- v35.2: canonical data-model cleanup. Added `Pattern Exposure` as the only source of product pattern/config time, canonical app-visit IDs for new traffic, stable participant ordinals, normalized legacy config keys, permanent favorites as the only source of current ♥ state, automatic semantic fact refresh during participant sync, exposure-weighted outcome association, unique global exact-config counting, and a single Evolution analytics API. RAW Replay is UX/reconstruction data only and no longer feeds product pattern-time metrics. Old trustworthy formal `session.usage` rows were backfilled to exposures; old free-Replay config durations were deliberately not promoted because they could include time outside gameplay.
- Rule: every meaningful Evolution change gets a versioned commit. If a behavior or presentation regresses, compare against Standard v34.10 and restore only the useful behavior without overwriting unrelated Evolution work.

## Data rule

Standard and Evolution are two views over the same SETKA research data. Do not fork participant data just to compare interfaces. Data/schema changes must preserve backward-readable semantic facts whenever possible. Evolution may add new server-side aggregates, but existing participant/session/state/note/replay relationships must not be discarded.

A single canonical entity may have many metric slices (global / participant / request / state / period / session context), but must not be recreated as a second entity solely for another analytic calculation.

## Canonical semantic layer

- `prototype_v35_pattern_exposures`: uninterrupted real gameplay exposure to one exact configuration. Canonical source for pattern/config duration and exposure counts.
- `prototype_v35_participant_facts`: participant-level derived metric cache.
- `prototype_v35_pattern_facts`: per-participant, per-pattern derived metric cache.
- `prototype_v35_config_facts`: per-participant exact-config derived metric cache.
- `prototype_v35_favorites`: permanent current Participant ↔ PatternConfig saved relation; independent of RAW Replay TTL.
- `prototype_v35_visits`: canonical app visits for new v35.2 traffic.
- `prototype_v35_participant_ordinals`: stable default participant numbering.
- RAW Replay remains temporary and is used only for UX/reconstruction. Replay digest remains permanent UX memory.
- `session.usage` remains a backward-compatible projection for existing participant/session screens; new runtime rows are generated from `Pattern Exposure` rather than independently measured.

See `SETKA_DATA_MODEL_V1.md` for source-of-truth rules.

## Naming in conversation

Use explicit names when reporting work:

- `SETKA Admin Standard v34.10`
- `SETKA Admin Evolution v35.x`

Do not call query-string cache busters separate versions.
