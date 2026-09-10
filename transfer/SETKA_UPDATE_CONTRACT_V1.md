# SETKA UPDATE CONTRACT V1

Status: STABLE UPDATE TRANSPORT CONTRACT
Baseline: SETKA-SYS-20260910-B1
Mac credential scope: READ_ACTIVE_MAC_TRANSFER
Canon mutation: FORBIDDEN BY UPDATE PATH

## Purpose

Turn repeated manual Mac transfer work into a stable, reusable SETKA update routine.
Future B2/B3/... releases must reuse this transport instead of asking the operator to repeat service-role, manual manifest, certificate, branch or transcript checks.

## One-click flow

`UPDATE_SETKA.command` performs only the following bounded operations:

1. call the installed `setka update` scoped updater;
2. verify the active portable-core package, hashes, state/digest refs and dynamic continuation anchor;
3. atomically refresh the local runtime receipt/current version;
4. refresh the cached Minimal Front source when network access is available;
5. fetch Git development refs for visibility only;
6. emit status and a durable local log.

## Hard safety boundaries

- macOS root/sudo is not required.
- Supabase service_role is not required on Mac.
- Only the scoped device credential `READ_ACTIVE_MAC_TRANSFER` may be used.
- The updater MUST NOT promote or mutate CANON.
- The updater MUST NOT merge Git branches automatically.
- Dirty developer work MUST be preserved.
- Failure of optional front refresh or Git ref fetch MUST NOT falsify the verified core-update result.
- Package/hash/continuation verification failure MUST stop the core update.
- Experimental branch output remains experimental until an explicit President-approved CANON promotion occurs.

## Truth boundary

A successful update proves portable-core + bounded checkpoint continuation for the published release package. It does not, by itself, prove that the complete historical transcript, full database, body payload or all branch runtime state were restored unless a later versioned contract explicitly adds and verifies those materials.

## Development rule

New features may change frequently; the delivery mechanism should not. Any future release that requires a new payload type must extend this contract versionedly and preserve backward-safe verification rather than returning to a manual operator ritual.

## Operator UX

Normal update action after one-time installation: double-click `UPDATE_SETKA.command` on the Mac desktop.

Equivalent terminal action remains: `setka update`.
