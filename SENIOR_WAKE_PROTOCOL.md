# SENIOR WAKE GATEWAY · CANONICAL PROTOCOL

STATUS: ACTIVE
OWNER: PRESIDENT_SETKA
SENIOR_IDENTITY: SETKA-S-0003-0001

## PURPOSE
A wake key is an address. It must route deterministically to the active Senior mandate without broad recovery search.

## PRIMARY ROUTE
`WAKE_KEY` → exact GitHub file `/<WAKE_KEY>.md` in `misskogut/Setka-web@main` → exact `ENTRYPOINT` → execute.

## LIVE RESUME STATE
For an active mission, exact resolver `foundation.senior_wake_resolve_v1('<WAKE_KEY>')` returns the manifest plus `latestCheckpoint`.

When `latestCheckpoint` exists, resume from its `nextExactAction` before any broader inspection.

Mission continuity is governed by `SENIOR_MISSION_CONTINUITY.md`.

## FALLBACK ROUTE
Only if the exact GitHub file cannot be opened:
`select foundation.senior_wake_resolve_v1('<WAKE_KEY>');`

The fallback is exact-key only. It must never trigger fuzzy search or archaeology.

## CONTINUE SHORTCUT
In an existing Senior work thread, President message `Продолжай` / `Continue` means: open `SENIOR_ACTIVE_TASK.md` exactly → resolve the active TASK_KEY exactly → read `latestCheckpoint` → execute `nextExactAction`.

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
2. Active key can return the latest mission checkpoint.
3. Invalid key stops exactly.
4. Completed/superseded key cannot relaunch old work.
5. No broad search is performed on normal wake.
6. `Продолжай` resumes the active mission rather than creating a new one.
7. Wake key alone grants no privileged access.