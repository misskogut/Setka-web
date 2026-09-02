import { replayToTick } from './replay-engine.mjs';

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
  for (let tick = startTick; tick <= endTick; tick += stride) {
    const replay = replayToTick(contract, events, tick);
    rows.push({
      entityId: contract.entity.id,
      tick,
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
    rows
  };
}
