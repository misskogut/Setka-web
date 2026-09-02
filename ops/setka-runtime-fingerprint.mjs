import { writeFileSync } from 'node:fs';
import { replayToTick } from '../core/replay/replay-engine.mjs';
import { sha256Object } from '../core/replay/stable-json.mjs';

const outIndex = process.argv.indexOf('--out');
const outPath = outIndex >= 0 ? process.argv[outIndex + 1] : null;

function contract() {
  return {
    schemaVersion: 'SETKA_REPLAY_CONTRACT_V1',
    entity: { id: 'SHIP-RUNTIME-DIFF', lineage: ['FLEET-RUNTIME-DIFF'], kind: 'ship' },
    law: {
      family: 'LOGISTIC_MAP',
      version: 'LOGISTIC_MAP_JS_V1',
      contentHash: 'runtime-diff-law-v1',
      parameters: { r: 3.91 },
      behaviorAdapterVersion: null
    },
    genesis: { tick: 0, wallTime: null, state: { x: 0.213456789 }, seed: null, rootSeed: null },
    variables: { curiosity: 0.37 },
    numerics: {
      mode: 'FLOAT64_JS_V1',
      runtimeContract: 'SETKA_JS_FLOAT64_COMPAT_V1',
      rounding: 'IEEE754_NEAREST_TIES_EVEN',
      operationOrderVersion: 'LOGISTIC_JS_V1'
    },
    clock: { contractVersion: 'CLOCK_V1', tickSemantics: 'one logistic iteration', nominalTickMs: 250, pointsPerTick: 1 },
    checkpoints: []
  };
}

function event(sequence, tick, eventType, payload = {}) {
  return {
    schemaVersion: 'SETKA_CAUSAL_EVENT_V1',
    eventType,
    entityId: 'SHIP-RUNTIME-DIFF',
    sequence,
    tick,
    wallTime: null,
    payload,
    provenance: { source: 'runtime-differential', determinism: 'DETERMINISTIC', fleetId: 'FLEET-RUNTIME-DIFF' },
    evidenceHash: null
  };
}

const events = [
  event(1, 0, 'GENESIS'),
  event(2, 37, 'PARAM_CHANGE', { path: 'law.parameters.r', to: 3.73, effectiveBoundary: 'AT_TICK' }),
  event(3, 91, 'PARAM_CHANGE', { path: 'variables.curiosity', to: 0.83, effectiveBoundary: 'AT_TICK' })
];

const at128 = replayToTick(contract(), events, 128);
const at1024 = replayToTick(contract(), events, 1024);
const semanticPayload = {
  state128: at128.runtime.state,
  stateHash128: at128.stateHash,
  rootHash128: at128.trajectoryRootHash,
  state1024: at1024.runtime.state,
  stateHash1024: at1024.stateHash,
  rootHash1024: at1024.trajectoryRootHash
};

const result = {
  schemaVersion: 'SETKA_RUNTIME_FINGERPRINT_V1',
  semanticFingerprint: sha256Object(semanticPayload),
  semanticPayload,
  observedRuntime: process.version,
  observedV8: process.versions.v8
};

const json = `${JSON.stringify(result, null, 2)}\n`;
if (outPath) writeFileSync(outPath, json);
console.log(json.trim());
