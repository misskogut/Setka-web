import { replayRange } from './replay-engine.mjs';

export function materializeRange(contract, events, options = {}) {
  const startTick = options.startTick ?? contract.genesis.tick;
  const endTick = options.endTick;
  const stride = options.stride ?? 1;
  const maxPoints = options.maxPoints ?? 100000;

  if (!Number.isInteger(startTick) || !Number.isInteger(endTick) || startTick < contract.genesis.tick || endTick < startTick) {
    throw new Error('Invalid materialization range');
  }
  if (!Number.isInteger(stride) || stride < 1) throw new Error('stride must be a positive integer');

  const estimated = Math.floor((endTick - startTick) / stride) + 1;
  if (estimated > maxPoints) {
    throw new Error(`Materialization would create ${estimated} points; maxPoints=${maxPoints}`);
  }

  const rows = [];
  let rootScope = null;
  let checkpointTick = null;
  for (const replay of replayRange(contract, events, {
    startTick,
    endTick,
    stride,
    useCheckpoints: options.useCheckpoints ?? true,
    verifyCheckpoints: options.verifyCheckpoints ?? false
  })) {
    rootScope = replay.rootScope;
    checkpointTick = replay.checkpointTick;
    rows.push({
      entityId: contract.entity.id,
      tick: replay.runtime.tick,
      state: replay.runtime.state,
      lawParameters: replay.runtime.law.parameters,
      variables: replay.runtime.variables,
      mode: replay.runtime.mode,
      stateHash: replay.stateHash
    });
  }

  return {
    schemaVersion: 'SETKA_MATERIALIZED_TRAJECTORY_V1',
    entityId: contract.entity.id,
    startTick,
    endTick,
    stride,
    pointCount: rows.length,
    disposable: true,
    replayRootScope: rootScope,
    restoredFromCheckpointTick: checkpointTick,
    rows
  };
}
