# SETKA v34 — Post-release front/back/admin integrity audit
Date: 2026-10-10. Scope: public GitHub Pages standalone-v34.html + standalone-admin-v34.html, connected Supabase project. No Flutter/Django assessment.
Status: fixes staged on branch `fix/v34-history-sync-audit-20261010`; release only after successful CI and comparison.

## Reproducible problems discovered in deployed source
1. **History-loss on reload (critical):** private restore `standalone-private-corpus-v40.js` upgrades local `data.version` to 41 and saves to `setka-standalone:v34`; `standalone-core-v34.js` only accepted version ===34 on next open, falling back to empty `blank()`. Fixed to accept v34+ valid session/note arrays. Added Playwright reload test in Chromium and WebKit after writing version 41 with two immutable note snapshots and 70 exposure rows.
2. **Unsafe sync after restoration failure (critical):** private archive `sync()` awaited `ensureHydrated()` but ignored false, and could upload partial local state to the account. Now aborts before writing when hydration failed; status surfaces explicit restoration error.
3. **Stale note edits not synced (high):** private corpus signature used only note count/latest ID rather than note content and replay recipes. Changes to `replaySnapshot`/frame/config could remain local. Now includes fingerprints of notes, session states, favorites and settings; listens to `setka:v34-sync-request`.
4. **Premature metrics upload (high):** account semantic sync could post usage before private account recovery finished. Now waits for private corpus authoritative restore.
5. **Free visual episodes missing from semantic sync (medium/high):** service usage reconstructed only `session.usage` and omitted free `patternExposures` with no session. Now sends canonical episodes first (including free) and only falls back to `session.usage` for older sessions with no canonical rows; no double counting.
6. **Admin refresh permanently fails after transient error (medium):** `getAll()` cached a rejected pending promise forever. Now always clears in-flight state in `finally`.

## Data reconciled read-only on 2026-10-10
- `prototype_v34_devices`: 98 device rows; 12 devices had a last-seen timestamp in past 7 days, not necessarily unique people.
- Private archive: 1 authenticated archive, containing 1 note and 37 pattern exposures.
- Account metrics table: 1 connected account, 3 session rows, 37 exposure rows, including 2 free exposures without session ID.
- Exposure totals match exactly between private archive and v41 account exposures by pattern: Dandelion 12 / 44,408 ms; Tentacle Orbit 25 / 83,505 ms.
- Private note has a pattern ID and config, but no frozen `replaySnapshot`; do **not** claim pixel-exact historical restoration.
- No public notes currently waiting for moderation; cannot confirm full real-world moderation action without a controlled authenticated trial.

## Data ownership boundaries
- Unauthenticated browser: local-only private notes, no assumption of cloud recovery.
- Authenticated Tester ID: private corpus (notes, states, symptoms, replay recipes); canonical service metrics in distinct v41 aggregates.
- Admin: separate legacy device-based sections, private tester corpus, pattern statistics, optional consent-based research, moderated/public community. Do NOT add device counts to connected account counts.
- Research scenarios/subjective changes must not be inferred from v41 pattern exposure events. No retroactive outcomes or forced public aggregation.

## Coverage
Existing CI checks 7 mother patterns, preview pixels and target IDs; contextual tooltip activation; unique session-based intent shares; two notes with same text and different pattern recipes; mixed-pattern session; all-seven admin catalog and viewed-but-unsaved config aggregates; fail-closed legacy admin controls.
New CI adds v41 reload persistence and canonical free exposure presence, archive restore safety, authoritativeness gating and failed admin refresh retry.

## Limitations, still NOT proven
- Physical iPhone WebKit and actual tester credentials, cross-device sync under real login, revocation and account switching, real admin authorization and moderation.
- Reconstructing historical note's exact visual *frame* when `replaySnapshot` was not recorded.
- Entire legacy device history visible in every modern admin card; these are intentionally separate cohorts.
- Hardware BLE measurements and production Flutter/Django runtime.
- Research/goal distribution across all participants without consent-granted data schema.
- Real time session timer under OS suspension/background and real-world edge cases not covered by browser smoke.

## Release & rollback
Previous main was preserved as `f2d19f6818c3f372ef95a793c8c432a83693f519`, and older backup branch `backup/main-before-v34-unified-20261010` exists. Deploy only source + tests + no database migration; rollback with selective revert if necessary.
