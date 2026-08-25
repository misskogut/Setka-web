# SETKA Research Admin version lines

## Standard

- Name: **SETKA Admin Standard v34.10**
- Status: frozen reference implementation
- Baseline commit: `c3a6271d706e285bb3b68bb4212949ba1cc1647a`
- Archive branch: `archive/admin-standard-v34.10`
- Public frozen page: `standalone-admin-standard-v34.10.html`
- Rule: never modify the Standard page or its pinned dependencies. It exists for regression comparison and partial restoration into Evolution.

## Evolution

- Name: **SETKA Admin Evolution v35.0**
- Status: active redesign line
- Baseline: Standard v34.10
- Public latest page: `standalone-admin-evolution-v35.html`
- Version sequence: `v35.0`, `v35.1`, `v35.2`, ...
- Rule: every meaningful Evolution change gets a versioned commit. If a behavior or presentation regresses, compare against Standard v34.10 and restore only the useful behavior without overwriting unrelated Evolution work.

## Data rule

Standard and Evolution are two views over the same SETKA research data. Do not fork participant data just to compare interfaces. Data/schema changes must preserve backward-readable semantic facts whenever possible. Evolution may add new server-side aggregates, but existing participant/session/state/note/replay relationships must not be discarded.

## Naming in conversation

Use explicit names when reporting work:

- `SETKA Admin Standard v34.10`
- `SETKA Admin Evolution v35.x`

Do not call query-string cache busters separate versions.
