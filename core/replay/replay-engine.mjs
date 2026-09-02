import { sha256Object } from './stable-json.mjs';

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

function clone(value) {
  return structuredClone(value);
}

function assertReplayContract(contract) {
  if (!contract || contract.schemaVersion !== 'SETKA_REPLAY_CONTRACT_V1') {
    throw new Error('Unsupported replay contract');
  }
  if (!contract.entity?.id) throw new Error('Replay contract requires entity.id');
  if (!contract.law?.family || !contract.law?.version || !contract.law?.contentHash) {
    throw new Error('Replay contract requires a versioned, hashed law');
  }
  if (!Number.isInteger(contract.genesis?.tick) || contract.genesis.tick < 0) {
    throw new Error('Replay contract requires a non-negative genesis tick');
  }
  if (contract.numerics?.mode !== 'FLOAT64_JS_V1') {
    throw new Error(`Unsupported numeric mode: ${contract.numerics?.mode}`);
  }
}

function assertEvent(event, entityId) {
  if (event.schemaVersion !== 'SETKA_CAUSAL_EVENT_V1') throw new Error('Unsupported causal event');
  if (event.entityId !== entityId) throw new Error(`Event entity mismatch: ${event.entityId}`);
  if (!Number.isInteger(event.tick) || event.tick < 0) throw new Error('Event tick must be a non-negative integer');
  if (!Number.isInteger(event.sequence) || event.sequence < 0) throw new Error('Event sequence must be a non-negative integer');
}

function sortedEvents(events, entityId) {
  return [...events]
    .filter((event) => event.entityId === entityId)
    .map((event) => {
      assertEvent(event, entityId);
      return event;
    })
    .sort((a, b) => a.tick - b.tick || a.sequence - b.sequence);
}

function setPath(root, path, value) {
  const segments = String(path).split('.');
  if (!segments.length || segments.some((segment) => !SAFE_SEGMENT.test(segment) || ['__proto__', 'prototype', 'constructor'].includes(segment))) {
    throw new Error(`Unsafe replay patch path: ${path}`);
  }
  let cursor = root;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i];
    if (cursor[key] === undefined) cursor[key] = {};
    if (cursor[key] === null || typeof cursor[key] !== 'object' || Array.isArray(cursor[key])) {
      throw new Error(`Replay patch path is not an object at ${segments.slice(0, i + 1).join('.')}`);
    }
    cursor = cursor[key];
  }
  cursor[segments.at(-1)] = clone(value);
}

function applyPatches(runtime, patches = []) {
  for (const patch of patches) {
    if (!patch?.path || !Object.hasOwn(patch, 'to')) throw new Error('Replay patch requires path and to');
    setPath(runtime, patch.path, patch.to);
  }
}

function applyEvent(runtime, event) {
  switch (event.eventType) {
    case 'GENESIS':
      return;
    case 'PARAM_CHANGE':
      setPath(runtime, event.payload.path, event.payload.to);
      return;
    case 'MODE_CHANGE':
      runtime.mode = event.payload.mode;
      return;
    case 'EXTERNAL_INPUT':
    case 'CAUSAL_EVENT':
      applyPatches(runtime, event.payload?.patches ?? []);
      runtime.lastInput = clone(event.payload ?? {});
      return;
    case 'CHECKPOINT':
    case 'CAPSULE':
    case 'RUN_END':
      return;
    default:
      throw new Error(`Unknown causal event type: ${event.eventType}`);
  }
}

function logisticStep(runtime) {
  const x = Number(runtime.state.x);
  const r = Number(runtime.law.parameters.r);
  if (!Number.isFinite(x) || !Number.isFinite(r)) throw new Error('LOGISTIC_MAP requires finite state.x and law.parameters.r');
  runtime.state.x = r * x * (1 - x);
}

function mandelbrotStep(runtime) {
  const zRe = Number(runtime.state.zRe ?? 0);
  const zIm = Number(runtime.state.zIm ?? 0);
  const cRe = Number(runtime.law.parameters.cRe);
  const cIm = Number(runtime.law.parameters.cIm);
  if (![zRe, zIm, cRe, cIm].every(Number.isFinite)) {
    throw new Error('MANDELBROT_ORBIT requires finite zRe/zIm and cRe/cIm');
  }
  runtime.state.zRe = zRe * zRe - zIm * zIm + cRe;
  runtime.state.zIm = 2 * zRe * zIm + cIm;
}

function advanceLaw(runtime) {
  switch (runtime.law.family) {
    case 'LOGISTIC_MAP':
      logisticStep(runtime);
      return;
    case 'MANDELBROT_ORBIT':
      mandelbrotStep(runtime);
      return;
    default:
      throw new Error(`Unsupported law family: ${runtime.law.family}`);
  }
}

function publicRuntime(runtime) {
  return {
    entityId: runtime.entityId,
    tick: runtime.tick,
    mode: runtime.mode,
    state: runtime.state,
    law: runtime.law,
    variables: runtime.variables,
    numerics: runtime.numerics,
    clock: runtime.clock
  };
}

export function createRuntime(contract) {
  assertReplayContract(contract);
  return {
    entityId: contract.entity.id,
    tick: contract.genesis.tick,
    mode: 'AUTOPILOT',
    state: clone(contract.genesis.state),
    law: clone(contract.law),
    variables: clone(contract.variables ?? {}),
    numerics: clone(contract.numerics),
    clock: clone(contract.clock),
    lastInput: null
  };
}

export function hashRuntime(runtime) {
  return sha256Object(publicRuntime(runtime));
}

export function replayToTick(contract, events = [], targetTick, options = {}) {
  assertReplayContract(contract);
  if (!Number.isInteger(targetTick) || targetTick < contract.genesis.tick) {
    throw new Error('targetTick must be an integer at or after genesis');
  }

  const runtime = createRuntime(contract);
  const timeline = sortedEvents(events, contract.entity.id);
  let eventCursor = 0;
  let appliedEventCount = 0;
  let trajectoryRootHash = sha256Object({ kind: 'SETKA_TRAJECTORY_ROOT_V1', entityId: runtime.entityId });

  while (runtime.tick <= targetTick) {
    while (eventCursor < timeline.length && timeline[eventCursor].tick === runtime.tick) {
      const event = timeline[eventCursor];
      applyEvent(runtime, event);
      appliedEventCount += 1;
      eventCursor += 1;
    }

    if (options.verifyCheckpoints) {
      for (const event of timeline) {
        if (event.tick !== runtime.tick || event.eventType !== 'CHECKPOINT') continue;
        const actual = hashRuntime(runtime);
        if (event.payload?.stateHash && event.payload.stateHash !== actual) {
          throw new Error(`Checkpoint mismatch at tick ${runtime.tick}`);
        }
      }
    }

    const stateHash = hashRuntime(runtime);
    trajectoryRootHash = sha256Object({ previous: trajectoryRootHash, tick: runtime.tick, stateHash });

    if (runtime.tick === targetTick) {
      return {
        runtime: clone(publicRuntime(runtime)),
        stateHash,
        trajectoryRootHash,
        appliedEventCount
      };
    }

    advanceLaw(runtime);
    runtime.tick += 1;
  }

  throw new Error('Replay terminated unexpectedly');
}

export function replayStateHash(contract, events, targetTick) {
  return replayToTick(contract, events, targetTick).stateHash;
}
