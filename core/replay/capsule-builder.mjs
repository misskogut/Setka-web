import { sha256Object } from './stable-json.mjs';

function timeMs(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildCausalCapsule({ entityId, events, pointsPerTick = 1, capsuleId = null }) {
  const timeline = [...events]
    .filter((event) => event.entityId === entityId)
    .sort((a, b) => a.tick - b.tick || a.sequence - b.sequence);

  const intervals = [];
  for (let i = 0; i < timeline.length - 1; i += 1) {
    const from = timeline[i];
    const to = timeline[i + 1];
    const steps = to.tick - from.tick;
    const fromMs = timeMs(from.wallTime);
    const toMs = timeMs(to.wallTime);
    intervals.push({
      fromSequence: from.sequence,
      toSequence: to.sequence,
      fromTick: from.tick,
      toTick: to.tick,
      generatedSteps: steps,
      generatedPoints: Number.isInteger(pointsPerTick) && pointsPerTick > 0 ? steps * pointsPerTick : null,
      elapsedMs: fromMs !== null && toMs !== null ? toMs - fromMs : null,
      fromEventType: from.eventType,
      toEventType: to.eventType
    });
  }

  const eventDigest = timeline.map((event) => ({
    sequence: event.sequence,
    tick: event.tick,
    wallTime: event.wallTime ?? null,
    eventType: event.eventType,
    evidenceHash: event.evidenceHash ?? null,
    payloadHash: sha256Object(event.payload ?? {})
  }));

  const capsule = {
    schemaVersion: 'SETKA_CAUSAL_CAPSULE_V1',
    capsuleId,
    entityId,
    eventCount: timeline.length,
    startTick: timeline[0]?.tick ?? null,
    endTick: timeline.at(-1)?.tick ?? null,
    eventDigest,
    intervals
  };

  return {
    ...capsule,
    capsuleHash: sha256Object(capsule)
  };
}
