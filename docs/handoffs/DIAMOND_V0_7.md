# Diamond v0.7 — Blueprint Digital Twin + Synthetic User Lab

Status: stable Black Box checkpoint
Parent: `diamond-v0.6.1`
President front: `diamond-president-v07.html`
Public Production: unchanged (`public-new-chat-v1.1`)

## User intent

Make SETKA Headquarters visually operable as a building: floors, cabinets, roles, blocks and wires should be understandable spatially, safely extensible, and testable before real architectural changes are applied.

Add synthetic humans that can behave differently like real users/employees, receive real SETKA IDs and scoped roles, and be used to test frontend, backend, access boundaries, floors, cabinets, blocks and connections without contaminating real user data.

## What v0.7 adds

### Blueprint / Digital Twin

- Separate President tab `Blueprint / Чертёж`.
- Visual hierarchy: headquarters → floor → cabinet → role/address.
- Every visible cabinet has its canonical admin address.
- Any floor/cabinet can be sent directly into Simulation Lab.
- System blocks and canonical architecture edges remain visible through Architecture Machine.
- Checkpoint selector provides version context for a simulation.
- Historical President UI shells are opened separately through Time Machine.

Important limitation: the structural building drawing currently renders the **current canonical architecture graph**. Selecting an old checkpoint does not yet reconstruct an exact historical graph snapshot. It sets test/version context and links to the old UI shell. Future hardening should persist architecture graph snapshots/diffs per checkpoint.

### Safe DRAFT construction

`diamond.blueprint_draft_items` stores proposed floors, cabinets and blocks.

DRAFT items:
- are noncanonical;
- do not change access doors, capabilities or runtime;
- can be visually placed under a real or draft parent;
- can be removed safely;
- require a future explicit application/change-control path before becoming real architecture.

Law: drawing a building change must never pretend the runtime changed.

### Synthetic User Lab

Simulation environment is explicit in `diamond.environments`:

`simulation`: canonical_metrics=false, public_visible=false.

Simulation tables:
- `diamond.simulation_personas`
- `diamond.simulation_runs`
- `diamond.simulation_actions`
- `diamond.simulation_exposures`
- `diamond.simulation_requests`

Synthetic actors receive actual rows in `diamond.identities` and scoped `diamond.identity_roles`, so identity/role/access mechanics can be tested realistically. Their behavioral telemetry never enters canonical v35 product tables.

Initial Public actors:
- Mira / `mira_explorer` — deep explorer
- Max / `max_sprinter` — impatient sprinter
- Lena / `lena_collector` — high-save collector
- Ilya / `ilya_skeptic` — skeptical verifier/backtracker
- Sonya / `sonya_regular` — habitual returning user

Each actor has probabilistic behavioral policy rather than a fixed macro.

### Actor factory

President can create a synthetic actor for any active `releasable` non-root role. The actor receives:
- random nonsemantic SETKA ID;
- selected role;
- floor/cabinet address derived from the role;
- `synthetic=true` and `environment=simulation` scope;
- character traits and behavior policy.

`PRESIDENT_ROOT` is intentionally impossible to create through the factory. There must remain exactly one real root identity. Root testing uses perspective/simulation, not another privileged identity.

### Architecture simulation

President can run selected actors against:
- whole headquarters;
- a floor;
- a cabinet;
- a block;
- an edge.

Modes:
- integrated
- isolated
- failure

Scenarios currently exposed:
- behavioral
- access boundary
- failure probe
- dependency probe

For protected floors/cabinets, a successful low-role test may mean **DENY works correctly**, not that the actor entered the target.

### Regular activity

Two different loops exist and must not be confused:

1. Server contract simulation
   - pg_cron job `diamond-simulation-hourly`
   - runs at minute 17 every hour
   - creates isolated synthetic runs/actions without a browser
   - useful for persistence, scheduling and behavior-policy continuity

2. Real browser E2E
   - GitHub Actions workflow `SETKA Synthetic User Lab`
   - scheduled at minute 37 every hour
   - uses Playwright/Chrome
   - opens the actual current public front `standalone-new-chat-v1.html`
   - physically clicks/taps the same DOM/canvas controls as a user
   - intercepts only outbound production sync requests
   - redirects those request bodies into `setka-simulation-v1`
   - production sync endpoints never receive synthetic packets

Thus the actual HTML, interaction code, PatternExposure generation and sync request shape are exercised while storage remains isolated.

Scheduled browser runner currently selects only actors with `public_preview`, because it drives the public user front. Synthetic actors for Operations/External/Workshop roles are already usable in architecture/access simulation. Add role-specific browser runners only when corresponding role surfaces are stable/runnable.

## Security model

New capability: `simulation.manage`.
- risk: root
- root_only: true
- delegable: false

President gateway uses custom authenticated President sessions.
Diamond simulation/blueprint RPCs are revoked from public/anon/authenticated and executable by service_role only.

The simulation Edge Function is a noncanonical transport gateway. It must call protected DB operations through service-only SECURITY DEFINER RPCs; the `diamond` schema must remain unexposed through PostgREST.

## Integration bugs found by synthetic browser build

### 1. Protected schema lookup

First browser run attempted ordinary Supabase table access and failed because the simulation tables live in `diamond`, not `public`.

This validated that isolation was real rather than cosmetic.

### 2. `diamond` must not be exposed through PostgREST

Changing the Edge client to `.schema('diamond')` is not the correct fix because protected Diamond storage is intentionally unexposed.

Correct architecture:

browser runner → simulation Edge API → service-role-only RPC gateway → `diamond.simulation_*`

Migration `diamond_v073_simulation_browser_gateway_rpcs` creates the browser gateway RPCs.

## Canonical/noncanonical boundary

Synthetic activity must NEVER write to:
- `prototype_v35_pattern_exposures`
- `prototype_v35_favorites`
- production visits/facts
- public community analytics

Browser traffic interception must be maintained whenever the production front changes sync endpoints.

## Version / rollback

Checkpoint `diamond-v0.7` is additive. Returning the working pointer to v0.6.1 does not delete:
- v0.7 code;
- DRAFT items;
- simulation personas/runs;
- simulation migrations.

Production release is still unchanged.

## Known follow-ups for Work Review

1. True private President frontend remains priority; GitHub Pages shell is still public source even though mutations are server-authorized.
2. Store exact architecture graph snapshots/diffs per checkpoint for true historical Blueprint reconstruction.
3. Add stronger runner authentication/rate-limiting to the isolated simulation Edge endpoint after E2E is stable.
4. Add browser runners for role-specific Operations / External Business / Workshop surfaces when those surfaces exist as stable runnable fronts.
5. Improve simulation from current boundary/contract probes into deterministic dependency propagation using node/edge contracts.
6. Add visual signal animation on Blueprint during replay: input → block → edge → output → storage/deny.
7. Add self-test suites per cabinet/floor and saved scenario presets.
8. Keep synthetic actors explicitly visible as synthetic everywhere in President UI; never merge them into real participant counts.

## Core law

Synthetic testing should be realistic enough to break SETKA, but isolated enough that breaking a test can never become a real user event or a new root of authority.
