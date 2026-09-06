# SENIOR WAKE GATEWAY · CANONICAL PROTOCOL

STATUS: ACTIVE
OWNER: PRESIDENT_SETKA
SENIOR_IDENTITY: SETKA-S-0003-0001

## PURPOSE
A wake key is an address. It must route deterministically to the active Senior mandate without broad recovery search.

## PRIMARY ROUTE
`WAKE_KEY` → exact GitHub file `/<WAKE_KEY>.md` in `misskogut/Setka-web@main` → exact `ENTRYPOINT` → execute.

## FALLBACK ROUTE
Only if the exact GitHub file cannot be opened:
`select foundation.senior_wake_resolve_v1('<WAKE_KEY>');`

The fallback is exact-key only. It must never trigger fuzzy search or archaeology.

## FAILURE
If the key is missing, inactive, completed, superseded or revoked, return the resolver status and stop. If unknown, return `WAKE_KEY_NOT_RESOLVED`.

## SECURITY
Wake routing and authorization are separate. A wake key does not grant database access, user access or elevated authority.

## MANIFEST CONTRACT
Every active wake file must contain:
- WAKE_KEY
- STATUS
- SENIOR_IDENTITY
- AUTHORITY
- ENTRYPOINT
- ORDER / phases
- SCOPE
- STOP_RULE
- FALLBACK
- explicit `NO SEARCH / NO CONTEXT RECONSTRUCTION`

## ACCEPTANCE
1. Active key resolves to the correct Senior and entrypoint.
2. Invalid key stops exactly.
3. Completed/superseded key cannot relaunch old work.
4. No broad search is performed on normal wake.
5. Wake key alone grants no privileged access.