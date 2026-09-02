# SETKA Causal Replay Core

Status: post-incident offline kernel, independent of PostgreSQL.

This directory implements the first executable slice of `docs/SETKA_PROCEDURAL_STORAGE_V1.md`.

## Core law

Permanent memory stores causes. Reproducible consequences are materialized only when needed.

`STATE(t) = GENESIS + LAW + VARIABLES + CAUSAL_PATCHES<=t + IRREVERSIBLE_INPUTS<=t + REPLAY_CONTRACT`

## Components

- `stable-json.mjs` — canonical object hashing for replay evidence.
- `replay-engine.mjs` — deterministic replay for supported mathematical laws.
- `materializer.mjs` — bounded temporary expansion of dense coordinate ranges.
- `capsule-builder.mjs` — compact event/time/step intervals and hashes.
- `../storage/write-admission.mjs` — canonical write classifier and per-run byte/event budgets.
- `../../contracts/setka-replay-contract-v1.schema.json` — machine replay passport.
- `../../contracts/setka-causal-event-v1.schema.json` — machine causal event contract.
- `../../tests/setka-replay-core.test.mjs` — offline deterministic self-test.

## Initial supported laws

- `LOGISTIC_MAP`: `x[n+1] = r * x[n] * (1 - x[n])`
- `MANDELBROT_ORBIT`: `z[n+1] = z[n]^2 + c`

The initial numerical mode is deliberately narrow: `FLOAT64_JS_V1`. A future implementation may add fixed/decimal precision, but exact replay must never silently change numerical semantics.

## Event boundary rule

A `PARAM_CHANGE` at tick `N` becomes effective at the replay boundary for tick `N` before the next mathematical transition. Parameter mutation history is replayed; it is never re-inferred.

Wall time and logical tick are separate axes. Pauses/sleep/cryosleep may consume wall time without creating mathematical coordinates. Dense `NO_ACTIVITY` or `AUTOPILOT_COORDINATE` rows are not canonical history.

## Storage rule

Canonical persistence candidates:

`GENESIS / PARAM_CHANGE / EXTERNAL_INPUT / MODE_CHANGE / CAUSAL_EVENT / CHECKPOINT / CAPSULE / RUN_END`

Normally derived or disposable:

`DETERMINISTIC_STEP / AUTOPILOT_COORDINATE / NO_ACTIVITY / MATERIALIZED_POINT / DERIVED_METRIC / CACHE_ROW`

Unknown semantic classes fail closed to `REVIEW`.

## Safety

The materializer has a hard `maxPoints` bound. The write-admission layer has per-event, per-run event-count and per-run byte budgets. These are application guards, not a replacement for PostgreSQL/storage quotas.

No PostgreSQL/Supabase dependency is allowed in this core. The offline CI workflow must remain runnable during a total database outage.
