# Diamond v0.6.1 — Flow contract hotfix

Status: stable checkpoint
Parent: `diamond-v0.6`

## Why this version exists

President Cabinet v0.6 authenticated correctly but failed during post-login rendering on iPhone with:

`undefined is not an object (evaluating 'f.counts.open')`

The failure was not caused by President credentials or the client device. The frontend expected the newer SETKA Flow snapshot contract while `public.diamond_flow_snapshot(text)` still returned the older shape.

## Root cause

Frontend expected:
- `flow.counts.open`
- `flow.counts.decisions`
- `flow.counts.urgent`
- `flow.queues[]`
- thread summary fields including `senderSetkaId` and `lastMessage`

Server returned only:
- `openCount`
- `threads[]`

This was a backend/frontend contract drift.

## Repair

Migration: `diamond_v061_flow_snapshot_contract_fix`

`diamond_flow_snapshot` now returns:
- stable `counts` object;
- active Flow queues with per-queue open counts;
- enriched thread summaries;
- legacy `openCount` for backward compatibility.

Diamond RPC execution remains revoked for `public`, `anon`, and `authenticated`; execution is granted only to `service_role`.

## Verification

Verified against an active President session at the database layer:
- `counts` present;
- `queues` present;
- `threads` present;
- 4 active queues returned;
- current open / urgent / decision counts all resolve safely to zero.

## What did not change

- President credentials;
- SETKA ID architecture;
- canonical historical data;
- architecture-machine wires;
- Public SETKA;
- authorization hierarchy.

## Architectural lesson

A valid login is not enough for a President Cabinet release. Every dashboard contract must have a post-auth render smoke test with empty-state data as well as populated data.

Add to Work review:
1. validate every API response shape consumed by the current President frontend;
2. test empty arrays / zero counts / optional nested objects;
3. prevent one optional module from crashing the entire cabinet;
4. progressively pin frontend checkpoints to versioned backend contracts so historical checkpoints are truly reproducible, not only visually immutable.

## Known follow-up

v0.6.1 repairs the server contract used by the existing v0.6 frontend. A later hardening version should add frontend-side schema guards and version-pinned President API endpoints so an old frontend cannot be changed indirectly by a newer shared backend dependency.
