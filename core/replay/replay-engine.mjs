import { sha256Object } from './stable-json.mjs';

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;
const PATCH_EVENT_TYPES = new Set(['EXTERNAL_INPUT', 'HUMAN_INPUT', 'LLM_OUTPUT', 'MESSAGE', 'CAUSAL_EVENT']);
const PASSIVE_EVENT_TYPES = new Set(['GENESIS', 'CHECKPOINT', 'CAPSULE', 'SEAL', 'RUN_END']);

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
  if (!contract.numerics?.runtimeContract || !contract.numerics?.rounding || !contract.numerics?.operationOrderVersion) {
    throw new Error('Replay contract requires explicit runtime, rounding and operation-order semantics');
  }
}

function assertEvent(event, entityId, genesisTick) {
  if (event.schemaVersion !== 'SETKA_CAUSAL_EVENT_V1') throw new Error('Unsupported causal event');
  if (event.entityId !== entityId) throw new Error(`Event entity mismatch: ${event.entityId}`);
  if (!Number.isInteger(event.tick) || event.tick < 0) throw new Error('Event tick must be a non-negative integer');
  if (event.tick < genesisTick) throw new Error(`Event tick ${event.tick} precedes genesis tick ${genesisTick}`);
  if (!Number.isInteger(event.sequence) || event.sequence < 0) throw new Error('Event sequence must be a non-negative integer');
}

function sortedEvents(events, entityId, genesisTick) {
  const ordered = [...events]
    .filter((event) => event.entityId === entityId)
    .map((event) => {
      assertEvent(event, entityId, genesisTick);
      return event;
    })
    .sort((a, b) => a.tick - b.tick || a.sequence - b.sequence);

  const seenSequences = new Set();
  for (const event of ordered) {
    if (seenSequences.has(event.sequence)) throw new Error(`Duplicate causal event sequence ${event.sequence}`);
    seenSequences.add(event.sequence);
  }
  return ordered;
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
  if (event.eventType === 'PARAM_CHANGE') {
    const boundary = event.payload?.effectiveBoundary ?? 'AT_TICK';
    if (!['AT_TICK', 'BEFORE_STEP'].includes(boundary)) throw new Error(`Unsupported parameter boundary: ${boundary}`);
    setPath(runtime, event.payload.path, event.payload.to);
    return;
  }
  if (event.eventType === 'MODE_CHANGE') {
    runtime.mode = event.payload.mode;
    return;
  }
  if (PATCH_EVENT_TYPES.has(event.eventType)) {
    applyPatches(runtime, event.payload?.patches ?? []);
    runtime.lastInput = clone({
      eventType: event.eventType,
      sequence: event.sequence,
      tick: event.tick,
      payload: event.payload ?? {},
      provenance: event.provenance ?? {}
    });
    return;
  }
  if (PASSIVE_EVENT_TYPES.has(event.eventType)) return;
  throw new Error(`Unknown causal event type: ${event.eventType}`);
}

function logisticStep(runtime) {
  const x = Number(runtime.state.x);
  const r = Number(runtime.law.parameters.r);
  if (!Number.isFinite(x) || !Number.isFinite(r)) throw new Error('LOGISTIC_MAP requires finite state.x and law.parameters.r');
  runtime.state.x = r * x * (1 - x);
}

function mandelbrotStep(runtime) {
  if (runtime.state.escaped === true) return;
  const zRe = Number(runtime.state.zRe ?? 0);
  const zIm = Number(runtime.state.zIm ?? 0);
  const cRe = Number(runtime.law.parameters.cRe);
  const cIm = Number(runtime.law.parameters.cIm);
  const escapeRadius = Number(runtime.law.parameters.escapeRadius ?? 2);
  if (![zRe, zIm, cRe, cIm, escapeRadius].every(Number.isFinite) || escapeRadius <= 0) {
    throw new Error('MANDELBROT_ORBIT requires finite zRe/zIm/cRe/cIm and positive escapeRadius');
  }
  const nextRe = zRe * zRe - zIm * zIm + cRe;
  const nextIm = 2 * zRe * zIm + cIm;
  const magnitudeSquared = nextRe * nextRe + nextIm * nextIm;
  runtime.state.zRe = nextRe;
  runtime.state.zIm = nextIm;
  runtime.state.escaped = magnitudeSquared > escapeRadius * escapeRadius;
  if (runtime.state.escaped) runtime.state.escapeMagnitudeSquared = magnitudeSquared;
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

function runtimeFromCheckpoint(contract, checkpoint) {
  const runtime = createRuntime(contract);
  runtime.tick = checkpoint.tick;
  runtime.state = clone(checkpoint.snapshot.state);
  runtime.law.parameters = clone(checkpoint.snapshot.lawParameters);
  runtime.variables = clone(checkpoint.snapshot.variables);
  runtime.mode = checkpoint.snapshot.mode;
  const actual = hashRuntime(runtime);
  if (actual !== checkpoint.stateHash) {
    throw new Error(`Stored checkpoint snapshot hash mismatch at tick ${checkpoint.tick}`);
  }
  return runtime;
}

function selectCheckpoint(contract, atOrBeforeTick) {
  return [...(contract.checkpoints ?? [])]
    .filter((checkpoint) => checkpoint?.snapshot && Number.isInteger(checkpoint.tick) && checkpoint.tick <= atOrBeforeTick)
    .sort((a, b) => b.tick - a.tick)[0] ?? null;
}

function cursorAfterCheckpoint(timeline, checkpoint) {
  if (!checkpoint) return 0;
  const throughSequence = checkpoint.throughSequence;
  const index = timeline.findIndex((event) => {
    if (event.tick > checkpoint.tick) return true;
    if (event.tick < checkpoint.tick) return false;
    if (throughSequence === null || throughSequence === undefined) return false;
    return event.sequence > throughSequence;
  });
  return index === -1 ? timeline.length : index;
}

function checkpointEventsByTick(timeline) {
  const map = new Map();
  for (const event of timeline) {
    if (event.eventType !== 'CHECKPOINT') continue;
    const list = map.get(event.tick) ?? [];
    list.push(event);
    map.set(event.tick, list);
  }
  return map;
}

export function hashRuntime(runtime) {
  return sha256Object(publicRuntime(runtime));
}

export function* replayRange(contract, events = [], options = {}) {
  assertReplayContract(contract);
  const startTick = options.startTick ?? contract.genesis.tick;
  const endTick = options.endTick;
  const stride = options.stride ?? 1;
  if (!Number.isInteger(startTick) || !Number.isInteger(endTick) || startTick < contract.genesis.tick || endTick < startTick) {
    throw new Error('Invalid replay range');
  }
  if (!Number.isInteger(stride) || stride < 1) throw new Error('stride must be a positive integer');

  const timeline = sortedEvents(events, contract.entity.id, contract.genesis.tick);
  const checkpoint = options.useCheckpoints ? selectCheckpoint(contract, startTick) : null;
  const runtime = checkpoint ? runtimeFromCheckpoint(contract, checkpoint) : createRuntime(contract);
  const maxReplaySteps = options.maxReplaySteps ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(maxReplaySteps) && maxReplaySteps !== Number.POSITIVE_INFINITY) throw new Error('maxReplaySteps must be finite or Infinity');
  const replaySpan = endTick - runtime.tick;
  if (replaySpan > maxReplaySteps) {
    throw new Error(`Replay span ${replaySpan} exceeds maxReplaySteps=${maxReplaySteps}`);
  }

  let eventCursor = cursorAfterCheckpoint(timeline, checkpoint);
  let appliedEventCount = 0;
  const checkpointEvents = options.verifyCheckpoints ? checkpointEventsByTick(timeline) : null;
  const rootScope = checkpoint ? 'SEGMENT_FROM_CHECKPOINT' : 'FULL_FROM_GENESIS';
  let trajectoryRootHash = sha256Object({
    kind: checkpoint ? 'SETKA_TRAJECTORY_SEGMENT_V1' : 'SETKA_TRAJECTORY_ROOT_V1',
    entityId: runtime.entityId,
    checkpointTick: checkpoint?.tick ?? null,
    checkpointStateHash: checkpoint?.stateHash ?? null
  });

  while (runtime.tick <= endTick) {
    while (eventCursor < timeline.length && timeline[eventCursor].tick === runtime.tick) {
      const event = timeline[eventCursor];
      applyEvent(runtime, event);
      appliedEventCount += 1;
      eventCursor += 1;
    }

    const stateHash = hashRuntime(runtime);
    if (options.verifyCheckpoints) {
      for (const event of checkpointEvents.get(runtime.tick) ?? []) {
        if (event.payload?.stateHash && event.payload.stateHash !== stateHash) {
          throw new Error(`Checkpoint mismatch at tick ${runtime.tick}`);
        }
      }
    }

    trajectoryRootHash = sha256Object({ previous: trajectoryRootHash, tick: runtime.tick, stateHash });

    if (runtime.tick >= startTick && (runtime.tick - startTick) % stride === 0) {
      yield {
        runtime: clone(publicRuntime(runtime)),
        stateHash,
        trajectoryRootHash,
        rootScope,
        checkpointTick: checkpoint?.tick ?? null,
        appliedEventCount
      };
    }

    if (runtime.tick === endTick) break;
    advanceLaw(runtime);
    runtime.tick += 1;
  }
}

export function replayToTick(contract, events = [], targetTick, options = {}) {
  if (!Number.isInteger(targetTick) || targetTick < contract.genesis.tick) {
    throw new Error('targetTick must be an integer at or after genesis');
  }
  const iterator = replayRange(contract, events, {
    startTick: targetTick,
    endTick: targetTick,
    stride: 1,
    useCheckpoints: options.useCheckpoints ?? false,
    verifyCheckpoints: options.verifyCheckpoints ?? false,
    maxReplaySteps: options.maxReplaySteps ?? Number.POSITIVE_INFINITY
  });
  const result = iterator.next();
  if (result.done || !result.value) throw new Error('Replay terminated unexpectedly');
  return result.value;
}

export function createCheckpointRecord(replayResult, throughSequence = null) {
  const runtime = replayResult.runtime;
  return {
    tick: runtime.tick,
    throughSequence,
    stateHash: replayResult.stateHash,
    trajectoryRootHash: replayResult.rootScope === 'FULL_FROM_GENESIS' ? replayResult.trajectoryRootHash : null,
    snapshot: {
      state: clone(runtime.state),
      lawParameters: clone(runtime.law.parameters),
      variables: clone(runtime.variables),
      mode: runtime.mode
    }
  };
}

export function replayStateHash(contract, events, targetTick, options = {}) {
  return replayToTick(contract, events, targetTick, options).stateHash;
}
