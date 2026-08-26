# SETKA Foundation — release state

This file is a human-readable release checkpoint for cold-start project recovery.

## Current intended state

- WORKING candidate: `0.1.6`
- CANON: `0.1.2`
- STABLE: `0.1.2`
- Permanent user door: `foundation.html`
- Permanent President door: `foundation-president.html`

## Foundation 0.1.6

Scope: control-layer reliability only; no new product block.

Changes:
- annotation pins are visible only at their exact version/surface/page address;
- pins can target the global Foundation control header, not only the embedded app;
- VIEWING / WORKING / CANON / STABLE / PAUSED have distinct visual semantics;
- a top `↻` control reloads the version manifest and follows the current WORKING version without clearing the version-independent session;
- a new functional line must be rebased on the current CANON of the previous line before its architecture can be treated as confirmed.

## Release rule

A version is not STABLE or CANON merely because it is deployed. `0.1.6` remains a candidate until manual President/user verification. Historical versioned artifacts are immutable.

## CI note

The earlier 0.1.6 browser smoke passed before the final refresh-control delta. A later GitHub-hosted run returned an infrastructure `startup_failure` before the job started. The release remains candidate and must not be promoted to STABLE/CANON on that basis. The workflow is retained for retry.
