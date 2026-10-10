# SETKA v34 · Unified Front / Admin · Release report (2026-10-10)

## Released
- Main GitHub Pages: `/standalone-v34.html` and `/standalone-admin-v34.html`.
- Main commit: `272ebd05be36b8b73420d687579edaf544da7b82` (first application + admin promotion `9e3f0621bb7d1101dd26c38fc207f08104994ad2`).
- Rollback: `backup/v34-main-before-unification-20261010` at `3d2abe173d405cc8beac526872a3a0ab45545f6c`; no localStorage migration/destruction.
- Supabase function `setka-pattern-knowledge-v40` deployed version 7. Previous version source is at `backups/20261010/setka-pattern-knowledge-v40-before-unified.ts`.

## Verified
- Front 7/7 mother pattern IDs, drawn thumbnails and information preview pixel content, exact mock per-pattern cloud value mapping.
- Notes: two equal-text notes linked to separate Dandelion/Stereo-DNA identities and immutable replay config.
- Personal scenario distribution counts unique sessions, not gesture/exposure count; passive visible viewing time and null outcome handling regression checks.
- Admin 7/7 catalog always visible, including patterns with no current data.
- Admin view aggregates observed config keys independent of favorites/research contributions; it never sends individual tester/device IDs, notes, states or private recipes.
- Admin note renderer reads explicit replayPatternId / config / frame first.
- Legacy admin device-reset and toggle operations return HTTP 409 instead of fake success. User-facing actions report an error.
- Production frontend uses normal existing localStorage, not QA-namespaced isolated storage.
- GitHub Actions `Check SETKA Standalone v34`: Chromium + WebKit and admin browser smoke, syntax checks, Deno TypeScript esbuild syntax checks. Run `38050892855` SUCCESS.
- GitHub Pages publish run `38050892860` SUCCESS.
- Independent read-only SQL reconciliation: 37 account exposure rows, 10 distinct viewed configuration keys, all 10 not saved, 127913ms aggregate duration at verification. All matched the current private archive's exposure IDs for that tester.

## Data-source boundaries: NOT FULLY RESOLVED
- Current service aggregates: connected Tester ID cohort only. Personal scenario goals are **not in v41 public usage metrics**; personal scenario figures derive from local private sessions only. No unsupported cross-user percentage claims.
- Historic device/snapshot/replay cohorts and the new Tester ID private archive remain distinct datasets. The legacy admin `Путь`, `Таймер`, `Запросы / эффект` are still historical; this release does not migrate them or relabel them as current.
- No live published public note or completed consent-gated research contribution was available, so real authorization/moderation full-path tests are **NOT PROVEN**.
- No real admin secret, personal account credentials, real Bluetooth/physiology device or on-device iPhone Safari was used in CI. WebKit automation is not equivalent to physical iPhone acceptance.
- Historic notes without an immutable creation-time replay snapshot cannot always be recreated exactly; fallback preview is a reconstruction and must not be described as exact proof.
- No Flutter native client or Django production administration code was modified.

## Operational next QA
1. Open production web front on the original iPhone browser with existing data. Inspect all 7 info dialogs; verify personalized notes and local states survived update.
2. Log in as a legitimate tester. Save two notes under two distinct patterns, reload, and verify private archive restores the exact linked recipe and frame; no publish action.
3. Log in to the real admin panel under authorized admin key, open 7 pattern cards, inspect observed variants and private notes; do not execute irreversible administration or publication during smoke.
4. For cross-user scenarios, first define privacy-safe opt-in aggregated metric and minimum sample size; do not derive from a single personal archive.
