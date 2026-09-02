import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { replayToTick } from '../core/replay/replay-engine.mjs';
import { materializeRange } from '../core/replay/materializer.mjs';

const budgets = JSON.parse(readFileSync(new URL('../ops/SETKA_KERNEL_RESOURCE_BUDGETS.json', import.meta.url), 'utf8'));

function contract() {
  return {
    schemaVersion: 'SETKA_REPLAY_CONTRACT_V1',
    entity: { id: 'SHIP-RESOURCE-0001', lineage: ['FLEET-RESOURCE'], kind: 'ship' },
    law: {
      family: 'LOGISTIC_MAP',
      version: 'LOGISTIC_MAP_JS_V1',
      contentHash: 'resource-law-v1',
      parameters: { r: 3.83 },
      behaviorAdapterVersion: null
    },
    genesis: { tick: 0, wallTime: null, state: { x: 0.201 }, seed: null, rootSeed: null },
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

function event(sequence, tick, eventType, payload = {}) {
  return {
    schemaVersion: 'SETKA_CAUSAL_EVENT_V1',
    eventType,
    entityId: 'SHIP-RESOURCE-0001',
    sequence,
    tick,
    wallTime: null,
    payload,
    provenance: { source: 'resource-test', determinism: 'DETERMINISTIC', fleetId: 'FLEET-RESOURCE' },
    evidenceHash: null
  };
}

test('representative replay remains inside gross CPU/heap regression envelope', () => {
  const c = contract();
  const events = [
    event(1, 0, 'GENESIS'),
    event(2, 1000, 'PARAM_CHANGE', { path: 'law.parameters.r', to: 3.71, effectiveBoundary: 'AT_TICK' }),
    event(3, 2500, 'PARAM_CHANGE', { path: 'variables.curiosity', to: 0.91, effectiveBoundary: 'AT_TICK' })
  ];

  const heapBefore = process.memoryUsage().heapUsed;
  const started = performance.now();
  const result = replayToTick(c, events, budgets.replay.benchmarkTargetTick, { maxReplaySteps: budgets.replay.benchmarkTargetTick + 1 });
  const elapsedMs = performance.now() - started;
  const heapAfter = process.memoryUsage().heapUsed;
  const heapDeltaBytes = Math.max(0, heapAfter - heapBefore);

  assert.equal(typeof result.stateHash, 'string');
  assert.ok(elapsedMs <= budgets.replay.maxWallMs, `replay wall time ${elapsedMs.toFixed(2)}ms exceeded ${budgets.replay.maxWallMs}ms`);
  assert.ok(heapDeltaBytes <= budgets.replay.maxHeapDeltaBytes, `heap delta ${heapDeltaBytes} exceeded ${budgets.replay.maxHeapDeltaBytes}`);
  console.log(JSON.stringify({ metric: 'SETKA_REPLAY_RESOURCE_SAMPLE', elapsedMs, heapDeltaBytes, targetTick: budgets.replay.benchmarkTargetTick }));
});

test('dense materialization stays bounded and remains demonstrably more expensive than causal input', () => {
  const c = contract();
  const events = [event(1, 0, 'GENESIS')];
  const points = budgets.materialization.points;
  const dense = materializeRange(c, events, {
    startTick: 0,
    endTick: points - 1,
    stride: 1,
    maxPoints: points,
    maxReplaySteps: points
  });
  const denseBytes = Buffer.byteLength(JSON.stringify(dense));
  const causalBytes = Buffer.byteLength(JSON.stringify({ contract: c, events }));
  const ratio = denseBytes / causalBytes;

  assert.equal(dense.pointCount, points);
  assert.ok(denseBytes <= budgets.materialization.maxSerializedBytes, `dense bytes ${denseBytes} exceeded ${budgets.materialization.maxSerializedBytes}`);
  assert.ok(ratio >= budgets.materialization.minDenseToCausalByteRatio, `dense/causal ratio ${ratio.toFixed(2)} below expected ${budgets.materialization.minDenseToCausalByteRatio}`);
  console.log(JSON.stringify({ metric: 'SETKA_STORAGE_EXPANSION_SAMPLE', denseBytes, causalBytes, denseToCausalRatio: ratio }));
});
