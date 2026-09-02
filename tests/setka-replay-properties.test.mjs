import test from 'node:test';
import assert from 'node:assert/strict';

import { replayToTick, createCheckpointRecord } from '../core/replay/replay-engine.mjs';
import { materializeRange } from '../core/replay/materializer.mjs';

function prng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function contract(id, x0, r) {
  return {
    schemaVersion: 'SETKA_REPLAY_CONTRACT_V1',
    entity: { id, lineage: ['FLEET-PROPERTY'], kind: 'ship' },
    law: {
      family: 'LOGISTIC_MAP',
      version: 'LOGISTIC_MAP_JS_V1',
      contentHash: 'property-law-v1',
      parameters: { r },
      behaviorAdapterVersion: null
    },
    genesis: { tick: 0, wallTime: null, state: { x: x0 }, seed: null, rootSeed: null },
    variables: { curiosity: 0.5 },
    numerics: {
      mode: 'FLOAT64_JS_V1',
      runtimeContract: 'SETKA_JS_FLOAT64_COMPAT_V1',
      rounding: 'IEEE754_NEAREST_TIES_EVEN',
      operationOrderVersion: 'LOGISTIC_JS_V1'
    },
    clock: { contractVersion: 'CLOCK_V1', tickSemantics: 'one logistic iteration', nominalTickMs: 1000, pointsPerTick: 1 },
    checkpoints: []
  };
}

function event(entityId, sequence, tick, eventType, payload = {}) {
  return {
    schemaVersion: 'SETKA_CAUSAL_EVENT_V1',
    eventType,
    entityId,
    sequence,
    tick,
    wallTime: null,
    payload,
    provenance: { source: 'property-test', determinism: 'DETERMINISTIC', fleetId: 'FLEET-PROPERTY' },
    evidenceHash: null
  };
}

const CASES = 1024;

test(`deterministic property suite holds across ${CASES} generated replay worlds`, () => {
  const random = prng(0x5e7ca123);

  for (let i = 0; i < CASES; i += 1) {
    const id = `SHIP-PROP-${String(i).padStart(4, '0')}`;
    const x0 = 0.05 + random() * 0.9;
    const r = 3.45 + random() * 0.5;
    const patchTick = 2 + Math.floor(random() * 12);
    const targetTick = patchTick + 8 + Math.floor(random() * 20);
    const patchedR = 3.45 + random() * 0.5;
    const curiosity = random();
    const base = contract(id, x0, r);
    const baseEvents = [event(id, 1, 0, 'GENESIS')];
    const patchedEvents = [
      ...baseEvents,
      event(id, 2, patchTick, 'PARAM_CHANGE', { path: 'law.parameters.r', to: patchedR, effectiveBoundary: 'AT_TICK' }),
      event(id, 3, patchTick, 'PARAM_CHANGE', { path: 'variables.curiosity', to: curiosity, effectiveBoundary: 'AT_TICK' })
    ];

    const a = replayToTick(base, patchedEvents, targetTick);
    const b = replayToTick(base, patchedEvents, targetTick);
    assert.equal(a.stateHash, b.stateHash, `determinism failed case ${i}`);
    assert.equal(a.trajectoryRootHash, b.trajectoryRootHash, `root determinism failed case ${i}`);

    const beforeBase = replayToTick(base, baseEvents, patchTick - 1);
    const beforePatched = replayToTick(base, patchedEvents, patchTick - 1);
    assert.equal(beforeBase.stateHash, beforePatched.stateHash, `patch changed the past case ${i}`);

    const checkpointTick = patchTick + 2;
    const atCheckpoint = replayToTick(base, patchedEvents, checkpointTick);
    const checkpoint = createCheckpointRecord(atCheckpoint, 3);
    const accelerated = structuredClone(base);
    accelerated.checkpoints = [checkpoint];
    const restored = replayToTick(accelerated, patchedEvents, targetTick, { useCheckpoints: true });
    assert.equal(restored.stateHash, a.stateHash, `checkpoint divergence case ${i}`);

    if (i < 128) {
      const materialized = materializeRange(base, patchedEvents, {
        startTick: targetTick - 3,
        endTick: targetTick,
        stride: 1,
        maxPoints: 8,
        maxReplaySteps: targetTick + 2
      });
      assert.equal(materialized.rows.at(-1).stateHash, a.stateHash, `materialization divergence case ${i}`);
    }
  }
});

test('unsafe patch paths and duplicate causal sequences always fail closed', () => {
  const id = 'SHIP-PROP-FAILCLOSED';
  const c = contract(id, 0.2, 3.7);
  assert.throws(() => replayToTick(c, [
    event(id, 1, 0, 'GENESIS'),
    event(id, 2, 1, 'PARAM_CHANGE', { path: '__proto__.polluted', to: true })
  ], 2), /Unsafe replay patch path/);

  assert.throws(() => replayToTick(c, [
    event(id, 1, 0, 'GENESIS'),
    event(id, 1, 1, 'CAUSAL_EVENT')
  ], 2), /Duplicate causal event sequence/);
});
