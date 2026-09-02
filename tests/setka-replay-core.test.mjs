import test from 'node:test';
import assert from 'node:assert/strict';

import { replayToTick, createCheckpointRecord } from '../core/replay/replay-engine.mjs';
import { materializeRange } from '../core/replay/materializer.mjs';
import { buildCausalCapsule } from '../core/replay/capsule-builder.mjs';
import { classifyWrite, createWriteBudget, admitCanonicalWrite } from '../core/storage/write-admission.mjs';
import { createCanonicalEventWriter } from '../core/storage/canonical-event-writer.mjs';

function contract() {
  return {
    schemaVersion: 'SETKA_REPLAY_CONTRACT_V1',
    entity: { id: 'SHIP-TEST-0001', lineage: ['FLEET-TEST'], kind: 'ship' },
    law: {
      family: 'LOGISTIC_MAP',
      version: 'LOGISTIC_MAP_JS_V1',
      contentHash: 'test-law-hash-0001',
      parameters: { r: 3.7 },
      behaviorAdapterVersion: null
    },
    genesis: { tick: 0, wallTime: '2026-09-02T12:00:00.000Z', state: { x: 0.2 }, seed: null, rootSeed: null },
    variables: { curiosity: 0.42 },
    numerics: { mode: 'FLOAT64_JS_V1', runtimeContract: 'node20-v8-js-number', rounding: 'IEEE754_NEAREST_TIES_EVEN', operationOrderVersion: 'LOGISTIC_JS_V1' },
    clock: { contractVersion: 'CLOCK_V1', tickSemantics: 'one logistic iteration', nominalTickMs: 1000, pointsPerTick: 1 },
    checkpoints: []
  };
}

function event({ sequence, tick, eventType, payload, wallTime, fleetId = 'FLEET-TEST' }) {
  return {
    schemaVersion: 'SETKA_CAUSAL_EVENT_V1',
    eventType,
    entityId: 'SHIP-TEST-0001',
    sequence,
    tick,
    wallTime: wallTime ?? null,
    payload: payload ?? {},
    provenance: { source: 'offline-test', determinism: 'DETERMINISTIC', fleetId },
    evidenceHash: null
  };
}

test('same contract + causal events reproduces fixed state and trajectory hashes', () => {
  const events = [event({ sequence: 1, tick: 0, eventType: 'GENESIS' })];
  const a = replayToTick(contract(), events, 100);
  const b = replayToTick(contract(), events, 100);
  assert.equal(a.stateHash, b.stateHash);
  assert.equal(a.trajectoryRootHash, b.trajectoryRootHash);
  assert.deepEqual(a.runtime.state, b.runtime.state);
  assert.equal(a.stateHash, 'ec3cf10a694803cf31e615cb12684bcff8295fea6d3c4158168c84979e41e00d');
  assert.equal(a.trajectoryRootHash, 'bfb5f47cb59ba1909ce78ffb7ca453a983bca8f28a0920226c81535678a7f4d4');
  assert.equal(a.rootScope, 'FULL_FROM_GENESIS');
});

test('parameter patch at an exact tick changes only the replay branch after that boundary', () => {
  const baseEvents = [event({ sequence: 1, tick: 0, eventType: 'GENESIS' })];
  const mutatedEvents = [
    ...baseEvents,
    event({ sequence: 2, tick: 5, eventType: 'PARAM_CHANGE', payload: { path: 'law.parameters.r', from: 3.7, to: 3.9, effectiveBoundary: 'AT_TICK' } }),
    event({ sequence: 3, tick: 5, eventType: 'PARAM_CHANGE', payload: { path: 'variables.curiosity', from: 0.42, to: 0.61, effectiveBoundary: 'AT_TICK' } })
  ];
  const beforeA = replayToTick(contract(), baseEvents, 4);
  const beforeB = replayToTick(contract(), mutatedEvents, 4);
  assert.equal(beforeA.stateHash, beforeB.stateHash);
  const afterA = replayToTick(contract(), baseEvents, 20);
  const afterB = replayToTick(contract(), mutatedEvents, 20);
  assert.notEqual(afterA.stateHash, afterB.stateHash);
  assert.equal(afterB.runtime.law.parameters.r, 3.9);
  assert.equal(afterB.runtime.variables.curiosity, 0.61);
});

test('sparse checkpoint snapshot restores the same future state without replaying from Genesis', () => {
  const events = [
    event({ sequence: 1, tick: 0, eventType: 'GENESIS' }),
    event({ sequence: 2, tick: 5, eventType: 'PARAM_CHANGE', payload: { path: 'law.parameters.r', to: 3.9 } }),
    event({ sequence: 3, tick: 12, eventType: 'PARAM_CHANGE', payload: { path: 'variables.curiosity', to: 0.77 } })
  ];
  const base = contract();
  const at20 = replayToTick(base, events, 20);
  const checkpoint = createCheckpointRecord(at20, 3);
  const acceleratedContract = contract();
  acceleratedContract.checkpoints = [checkpoint];

  const full = replayToTick(base, events, 80);
  const accelerated = replayToTick(acceleratedContract, events, 80, { useCheckpoints: true });
  assert.equal(accelerated.stateHash, full.stateHash);
  assert.deepEqual(accelerated.runtime.state, full.runtime.state);
  assert.equal(accelerated.checkpointTick, 20);
  assert.equal(accelerated.rootScope, 'SEGMENT_FROM_CHECKPOINT');
});

test('events before genesis and duplicate sequences fail closed', () => {
  const c = contract();
  c.genesis.tick = 10;
  assert.throws(() => replayToTick(c, [event({ sequence: 1, tick: 9, eventType: 'CAUSAL_EVENT' })], 20), /precedes genesis/);
  assert.throws(() => replayToTick(contract(), [event({ sequence: 1, tick: 1, eventType: 'CAUSAL_EVENT' }), event({ sequence: 1, tick: 2, eventType: 'CAUSAL_EVENT' })], 3), /Duplicate causal event sequence/);
});

test('dense coordinates materialize in one bounded checkpoint-aware replay pass', () => {
  const materialized = materializeRange(contract(), [], { startTick: 10, endTick: 20, stride: 2, maxPoints: 10 });
  assert.equal(materialized.disposable, true);
  assert.equal(materialized.pointCount, 6);
  assert.deepEqual(materialized.rows.map((row) => row.tick), [10, 12, 14, 16, 18, 20]);
  assert.throws(() => materializeRange(contract(), [], { startTick: 0, endTick: 1000, stride: 1, maxPoints: 10 }), /maxPoints/);
  assert.throws(() => materializeRange(contract(), [], { startTick: 0, endTick: 100, maxReplaySteps: 50, maxPoints: 1000 }), /exceeds maxReplaySteps/);
});

test('capsule stores time and mathematical distance between causal events', () => {
  const events = [
    event({ sequence: 1, tick: 100, eventType: 'CAUSAL_EVENT', wallTime: '2026-09-02T12:00:00.000Z' }),
    event({ sequence: 2, tick: 160, eventType: 'PARAM_CHANGE', wallTime: '2026-09-02T12:01:30.000Z', payload: { path: 'variables.curiosity', to: 0.5 } })
  ];
  const capsule = buildCausalCapsule({ entityId: 'SHIP-TEST-0001', events, pointsPerTick: 1 });
  assert.equal(capsule.intervals[0].generatedSteps, 60);
  assert.equal(capsule.intervals[0].generatedPoints, 60);
  assert.equal(capsule.intervals[0].elapsedMs, 90000);
  assert.equal(typeof capsule.capsuleHash, 'string');
});

test('Mandelbrot orbit seals escape instead of overflowing into non-canonical Infinity', () => {
  const c = contract();
  c.entity.id = 'SHIP-MANDEL-TEST';
  c.law = { family: 'MANDELBROT_ORBIT', version: 'MANDELBROT_JS_V1', contentHash: 'test-mandel-hash-0001', parameters: { cRe: 1, cIm: 1, escapeRadius: 2 }, behaviorAdapterVersion: null };
  c.genesis.state = { zRe: 0, zIm: 0 };
  const result = replayToTick(c, [], 100);
  assert.equal(result.runtime.state.escaped, true);
  assert.equal(Number.isFinite(result.runtime.state.zRe), true);
  assert.equal(Number.isFinite(result.runtime.state.zIm), true);
});

test('write admission rejects dense traces and enforces entity/fleet/hour budgets', () => {
  assert.equal(classifyWrite({ kind: 'AUTOPILOT_COORDINATE' }).decision, 'DERIVE_OR_CACHE');
  assert.equal(classifyWrite({ kind: 'NO_ACTIVITY' }).decision, 'DERIVE_OR_CACHE');
  const budget = createWriteBudget({
    maxCanonicalEventsPerRun: 10,
    maxCanonicalBytesPerRun: 100000,
    maxSingleEventBytes: 100000,
    maxCanonicalEventsPerEntity: 1,
    maxCanonicalBytesPerEntity: 100000,
    maxCanonicalEventsPerFleet: 10,
    maxCanonicalBytesPerFleet: 100000,
    maxCanonicalEventsPerHour: 10,
    maxCanonicalBytesPerHour: 100000
  });
  const causal = event({ sequence: 1, tick: 10, eventType: 'CAUSAL_EVENT', payload: { action: 'observe' } });
  assert.equal(admitCanonicalWrite(causal, budget, { nowMs: Date.parse('2026-09-02T14:00:00Z') }).allowed, true);
  const second = event({ sequence: 2, tick: 20, eventType: 'CAUSAL_EVENT', payload: { action: 'observe-again' } });
  const denied = admitCanonicalWrite(second, budget, { nowMs: Date.parse('2026-09-02T14:10:00Z') });
  assert.equal(denied.allowed, false);
  assert.match(denied.reason, /entity write budget exhausted/);
});

test('canonical writer distinguishes persisted from verified read-back', async () => {
  const receipts = [];
  const writer = createCanonicalEventWriter({
    persist: async (candidate) => {
      receipts.push(candidate);
      return { id: `stored-${candidate.sequence}` };
    },
    readBack: async ({ candidate, receipt }) => ({ verified: receipt.id === `stored-${candidate.sequence}`, id: receipt.id }),
    budget: createWriteBudget({ maxCanonicalEventsPerEntity: 10 })
  });
  const dense = await writer.write({ kind: 'AUTOPILOT_COORDINATE', tick: 1, x: 0.123 });
  assert.equal(dense.persisted, false);
  assert.equal(receipts.length, 0);

  const result = await writer.write(event({ sequence: 1, tick: 1, eventType: 'CAUSAL_EVENT' }), { nowMs: 0 });
  assert.equal(result.persisted, true);
  assert.equal(result.verified, true);
  assert.equal(receipts.length, 1);
});
