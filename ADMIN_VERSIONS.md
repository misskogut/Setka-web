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

## Новый чат

- Name: **SETKA Admin Новый чат v1.0**
- Status: experimental third admin line
- Baseline: Evolution v35.2 checkpoint `7e71b6c33baaf6f0fb8bd69b8ef68fbd4007021b`
- Public admin page: `standalone-admin-new-chat-v1.html`
- Companion prototype page: `standalone-new-chat-v1.html`
- Purpose: isolate the Social / Cruise / behavioral semantic layer so Standard and Evolution remain directly comparable and untouched.
- UI rule: the page is a full Evolution v35.2 clone plus dedicated `Соцсеть`, `Cruise`, and `Сигналы` sections.
- Social rule: there is no separate cheap like. Public ♥ count is the count of unique saves. Notes and Cruise support comments; personal messages are deliberately excluded from v1.
- Identity rule: `device_id` remains internal. Community responses expose only a separate public UUID and mutable nickname.
- Cruise rule: store a semantic configuration timeline, not rendered video. Playback re-renders/interpolates pattern configurations as a visual clip and records watch depth/repeats.
- Analytics rule: saves, total time, average/median duration, repeats, unique users/viewers, save rate, and time-per-user remain separate signals; no single popularity score is required.
- Interpretation rule: public pattern/Cruise comments are deterministic percentile-based semantic signals, not free-form AI text.
- Data layer: v36 social tables (`prototype_v36_*`) are separated from the canonical v35 research facts. Pattern passports continue to read canonical v35 Pattern Exposure and Favorites.
- API layer: `setka-community-v36` for shared community state and `setka-public-pattern-stats-v36` for anonymous aggregate pattern passports.

## Data rule

Standard, Evolution and Новый чат read the same canonical SETKA research data where the entity already exists. Do not fork participant/pattern/session facts just to compare interfaces. New social entities may live in a new schema/versioned table family, but links to participant, pattern, config and session context must remain backward-readable.

A single canonical entity may have many metric slices (global / participant / request / state / period / session context), but must not be recreated as a second entity solely for another analytic calculation.

## Canonical semantic layer

- `prototype_v35_pattern_exposures`: uninterrupted real gameplay exposure to one exact configuration. Canonical source for pattern/config duration and exposure counts.
- `prototype_v35_participant_facts`: participant-level derived metric cache.
- `prototype_v35_pattern_facts`: per-participant, per-pattern derived metric cache.
- `prototype_v35_config_facts`: per-participant exact-config derived metric cache.
- `prototype_v35_favorites`: permanent current Participant ↔ PatternConfig saved relation; independent of RAW Replay TTL.
- `prototype_v35_visits`: canonical app visits for new v35.2 traffic.
- `prototype_v35_participant_ordinals`: stable default participant numbering.
- `prototype_v36_public_profiles`: private participant/device ↔ public alias bridge; internal identity is never returned to community clients.
- `prototype_v36_public_notes`, `prototype_v36_note_saves`: public note content and unique deep-save relations.
- `prototype_v36_cruises`, `prototype_v36_cruise_saves`, `prototype_v36_cruise_plays`: Cruise content, deep saves and watch-depth/repeat facts.
- `prototype_v36_comments`: comments for public notes and Cruise.
- RAW Replay remains temporary and is used only for UX/reconstruction. Replay digest remains permanent UX memory.
- `session.usage` remains a backward-compatible projection for existing participant/session screens; new runtime rows are generated from `Pattern Exposure` rather than independently measured.

See `SETKA_DATA_MODEL_V1.md` for canonical research source-of-truth rules and `NEW_CHAT_ADMIN_VERSIONS.md` for the experimental social line scope.

## Naming in conversation

Use explicit names when reporting work:

- `SETKA Admin Standard v34.10`
- `SETKA Admin Evolution v35.x`
- `SETKA Admin Новый чат v1.x`

Do not call query-string cache busters separate versions.
