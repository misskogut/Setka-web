# SETKA · MAC MIRROR TRUTH CONTRACT v2

## Purpose

GitHub + Supabase are the development/source environment. The Mac is a verified local mirror target. A development change is **not** considered transferred to Mac merely because code was pushed, a transfer package exists, or the front can reach Supabase.

## Truth states

- `REMOTE_ONLY` — change/data exists in GitHub/Supabase but no verified Mac mirror receipt covers it.
- `MAC_MIRROR_VERIFIED_BUT_REMOTE_ADVANCED` — a complete verified Mac mirror exists, but the remote system has newer transcript events.
- `MAC_MIRROR_VERIFIED_AT_CURRENT_TIP` — the latest full Mac mirror receipt covers the current remote transcript tip at verification time.
- `MAC_MIRROR_FAILED` — the last full mirror attempt failed; the previous verified local mirror must remain intact.

The authoritative server view is `foundation.mac_mirror_current_v2`.

## One-button rule

`UPDATE_SETKA.command` must not declare completion until the selected FULL or DELTA mirror stage returns PASS and writes both:

1. local receipt: `~/.setka/mirror/current/receipt.json` + `~/.setka/mirror/LATEST.json`;
2. server receipt: `foundation.mac_full_mirror_sync_receipts_v1`.

The first launch of the refreshed front launcher also bootstraps a full mirror when no verified full mirror exists, so migration from older updater versions does not silently skip the mirror stage.

## What the full mirror copies

### GitHub

A dedicated bare mirror at `~/.setka/mirror/code/Setka-web.git` copies Git history and refs and is checked with `git fsck`.

### Supabase/Postgres row state

Every operational/live base-table row manifested by the scoped mirror contract is copied from:

- `foundation`
- `diamond`
- `public`
- `setka_private`
- `experiment_market_001`
- `experiment_trading_001`
- `experiment_weather_001`
- `supabase_migrations`
- `cron`
- `net`

Rows are stored losslessly at JSON value level in a local compressed SQLite mirror. Tables with primary keys use keyset pagination. Tables without primary keys use a CTID cursor for the duration of the transfer.

### PostgreSQL definitions

The mirror also stores definitions/inventory for views, functions, indexes, constraints, triggers, sequences and policies.

## Promotion rule

A new local mirror is built in staging. `current` is replaced only after every manifested table and schema-object stage passes. The previous verified mirror is retained as `previous` until successful atomic promotion.

## Security/provider boundary

At contract creation time, `auth.users`, `storage.objects`, and `storage.buckets` were empty. Provider-managed secret values are not written into the plain SQLite mirror. Secrets must stay in provider secret storage or macOS Keychain and be rebound explicitly; omission of plaintext secrets must never be described as missing application history.

## No-silent-gap rule

Any component not reconstructible from the Git mirror or the mirrored Supabase state must be listed as an explicit coverage gap before the Mac state can be called independently restorable. Current deployed Edge Function source coverage is tracked separately; new/changed Edge Function source should be committed to GitHub before deployment.

## Front rule

The front is a projection layer. Its layout, labels, hidden elements, and local UI state do not redefine backend truth. A visible system object must resolve to real mirrored/backend evidence; a UI-only control must be explicitly classified as UI-only.


## Cold experiment exclusion

Large raw/derived experiment materializations may be retained remotely instead of duplicated into the operational Mac mirror. The authoritative exclusion policy is `foundation.mac_mirror_exclusion_policy_v1`.

Current excluded COLD family:
- `foundation.experimental_system_bifurcation_unfold_edges_v1`
- `foundation.experimental_system_bifurcation_unfold_nodes_v1`
- `foundation.endogenous_control_law_nodes_v1`
- `foundation.body_as_grown_nodes_v1`
- `foundation.body_as_grown_frozen_scene_snapshots_v1`

Their experiment capsules, reports, provenance, hashes, transcript evidence and live/operational state remain mirrored. Raw COLD payloads remain in Supabase until the representative fold → rehydrate → compare proof is completed.

## Baseline + delta rule

A successful FULL mirror captures both the transcript tip and the current `mac_mirror_delta_events_v1` high-water mark. That high-water is written into the local receipt as `deltaToEventId` and into the server receipt details.

Future updates begin DELTA strictly after that high-water. A legacy FULL receipt with no delta high-water is not replayed through the old tracker bootstrap; the updater performs one clean FULL REBASE from current truth and then returns to normal DELTA operation.

Resumable FULL staging is valid only when both the source transcript tip and manifest SHA match and SQLite `PRAGMA quick_check` passes.

## One-click self-update

The updater hashes the currently running script before self-refresh. If GitHub provides a newer updater, it re-execs the new version immediately in the same click instead of requiring a second manual launch.
