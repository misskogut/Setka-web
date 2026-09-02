# SETKA Causal Replay Core

Status: post-incident offline kernel, independent of PostgreSQL.

This directory implements the first executable slice of `docs/SETKA_PROCEDURAL_STORAGE_V1.md`.

## Core law

Permanent memory stores causes. Reproducible consequences are materialized only when needed.

`STATE(t) = GENESIS + LAW + VARIABLES + CAUSAL_PATCHES<=t + IRREVERSIBLE_INPUTS<=t + REPLAY_CONTRACT`

## Components

- `stable-json.mjs` — canonical object hashing for replay evidence.
- `replay-engine.mjs` — deterministic replay for supported mathematical laws, sparse checkpoint restore and bounded replay spans.
- `materializer.mjs` — single-pass, checkpoint-aware, bounded temporary expansion of dense coordinate ranges.
- `capsule-builder.mjs` — compact event/time/step intervals and hashes.
- `../storage/write-admission.mjs` — causal write classifier and per-event/per-run/per-entity/per-fleet/per-hour budgets.
- `../storage/canonical-event-writer.mjs` — guarded persistence adapter that distinguishes `persisted` from independently `verified` read-back.
- `../../contracts/setka-replay-contract-v1.schema.json` — machine replay passport.
- `../../contracts/setka-causal-event-v1.schema.json` — machine causal event contract.
- `../../tests/setka-replay-core.test.mjs` — offline deterministic self-test with fixed golden hashes.

## Initial supported laws

- `LOGISTIC_MAP`: `x[n+1] = r * x[n] * (1 - x[n])`
- `MANDELBROT_ORBIT`: `z[n+1] = z[n]^2 + c`

The initial numerical mode is deliberately narrow: `FLOAT64_JS_V1`. A replay contract must state runtime, rounding and operation-order semantics. A future implementation may add fixed/decimal precision, but exact replay must never silently change numerical semantics.

For Mandelbrot orbits, escape is sealed once the configured escape radius is crossed. The finite escape state is retained and later ticks stop advancing that orbit, preventing overflow into non-canonical `Infinity` values.

## Event boundary rule

A `PARAM_CHANGE` at tick `N` becomes effective at the replay boundary for tick `N` before the next mathematical transition. Parameter mutation history is replayed; it is never re-inferred.

Irreversible/non-reproducible causal classes include external input, human input, LLM output and entity-to-entity messages. These are facts of history and must be preserved rather than regenerated.

Events before Genesis and duplicate event sequences fail closed. Unknown event classes fail closed.

Wall time and logical tick are separate axes. Pauses/sleep/cryosleep may consume wall time without creating mathematical coordinates. Dense `NO_ACTIVITY` or `AUTOPILOT_COORDINATE` rows are not canonical history.

## Storage rule

Canonical persistence candidates:

`GENESIS / PARAM_CHANGE / EXTERNAL_INPUT / HUMAN_INPUT / LLM_OUTPUT / MESSAGE / MODE_CHANGE / CAUSAL_EVENT / CHECKPOINT / CAPSULE / SEAL / RUN_END`

Normally derived or disposable:

`DETERMINISTIC_STEP / AUTOPILOT_COORDINATE / NO_ACTIVITY / MATERIALIZED_POINT / DENSE_SNAPSHOT / DERIVED_METRIC / CACHE_ROW`

Unknown semantic classes fail closed to `REVIEW`.

## Sparse checkpoints and materialization

Sparse checkpoints are optional restore accelerators. A checkpoint snapshot is hash-verified before use. Replay restored from a checkpoint is explicitly marked as a segment root rather than being misrepresented as a full Genesis trajectory root.

The materializer uses one replay stream for the requested range rather than replaying Genesis independently for every point. It has both `maxPoints` and `maxReplaySteps` guards. Dense output is marked `disposable: true` by design.

## Write admission and proof

Canonical writes are gated before persistence. Budgets exist at multiple scopes so one ship, one fleet, one run or one hour cannot silently explode storage even if the mathematical loop is healthy.

A successful persistence call is not proof that canonical memory is safe. `canonical-event-writer.mjs` therefore reports two separate facts:

- `persisted` — the storage adapter accepted the write;
- `verified` — an independent read-back confirmed the expected stored object.

This preserves the SETKA rule: **written is not the same as remembered/proven**.

## Safety

These application guards are not a replacement for PostgreSQL/storage quotas, external disk monitoring or the emergency cryosleep gate.

No PostgreSQL/Supabase dependency is allowed in this core. The offline CI workflow must remain runnable during a total database outage.
