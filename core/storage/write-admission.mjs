const ALWAYS_PERSIST = new Set([
  'GENESIS',
  'PARAM_CHANGE',
  'EXTERNAL_INPUT',
  'HUMAN_INPUT',
  'LLM_OUTPUT',
  'MESSAGE',
  'MODE_CHANGE',
  'CAUSAL_EVENT',
  'CHECKPOINT',
  'CAPSULE',
  'SEAL',
  'RUN_END'
]);

const NEVER_PERSIST_AS_CANON = new Set([
  'DETERMINISTIC_STEP',
  'AUTOPILOT_COORDINATE',
  'NO_ACTIVITY',
  'DERIVED_METRIC',
  'MATERIALIZED_POINT',
  'DENSE_SNAPSHOT',
  'CACHE_ROW'
]);

function counter() {
  return { events: 0, bytes: 0 };
}

function addTo(map, key, bytes) {
  if (!key) return;
  const value = map.get(key) ?? counter();
  value.events += 1;
  value.bytes += bytes;
  map.set(key, value);
}

export function classifyWrite(candidate) {
  const type = candidate?.eventType ?? candidate?.kind;
  if (ALWAYS_PERSIST.has(type)) return { decision: 'PERSIST', reason: 'canonical causal information' };
  if (NEVER_PERSIST_AS_CANON.has(type)) return { decision: 'DERIVE_OR_CACHE', reason: 'reproducible or non-causal materialization' };
  return { decision: 'REVIEW', reason: 'unknown semantic class; fail closed' };
}

export function createWriteBudget(options = {}) {
  return {
    maxCanonicalEventsPerRun: options.maxCanonicalEventsPerRun ?? 10000,
    maxCanonicalBytesPerRun: options.maxCanonicalBytesPerRun ?? 10 * 1024 * 1024,
    maxSingleEventBytes: options.maxSingleEventBytes ?? 256 * 1024,
    maxCanonicalEventsPerEntity: options.maxCanonicalEventsPerEntity ?? 2000,
    maxCanonicalBytesPerEntity: options.maxCanonicalBytesPerEntity ?? 2 * 1024 * 1024,
    maxCanonicalEventsPerFleet: options.maxCanonicalEventsPerFleet ?? 10000,
    maxCanonicalBytesPerFleet: options.maxCanonicalBytesPerFleet ?? 10 * 1024 * 1024,
    maxCanonicalEventsPerHour: options.maxCanonicalEventsPerHour ?? 50000,
    maxCanonicalBytesPerHour: options.maxCanonicalBytesPerHour ?? 50 * 1024 * 1024,
    usedEvents: 0,
    usedBytes: 0,
    byEntity: new Map(),
    byFleet: new Map(),
    byHour: new Map()
  };
}

export function admitCanonicalWrite(candidate, budget, options = {}) {
  const classification = classifyWrite(candidate);
  if (classification.decision !== 'PERSIST') {
    return { allowed: false, ...classification };
  }

  const bytes = Buffer.byteLength(JSON.stringify(candidate), 'utf8');
  if (bytes > budget.maxSingleEventBytes) {
    return { allowed: false, decision: 'BRAKE', reason: `single event ${bytes}B exceeds ${budget.maxSingleEventBytes}B` };
  }
  if (budget.usedEvents + 1 > budget.maxCanonicalEventsPerRun) {
    return { allowed: false, decision: 'BRAKE', reason: 'run canonical event budget exhausted' };
  }
  if (budget.usedBytes + bytes > budget.maxCanonicalBytesPerRun) {
    return { allowed: false, decision: 'BRAKE', reason: 'run canonical byte budget exhausted' };
  }

  const entityId = candidate?.entityId ?? candidate?.entity_id ?? null;
  const fleetId = candidate?.fleetId ?? candidate?.fleet_id ?? candidate?.provenance?.fleetId ?? null;
  const hourKey = new Date(options.nowMs ?? Date.now()).toISOString().slice(0, 13);
  const entityCounter = entityId ? (budget.byEntity.get(entityId) ?? counter()) : null;
  const fleetCounter = fleetId ? (budget.byFleet.get(fleetId) ?? counter()) : null;
  const hourCounter = budget.byHour.get(hourKey) ?? counter();

  if (entityCounter && (entityCounter.events + 1 > budget.maxCanonicalEventsPerEntity || entityCounter.bytes + bytes > budget.maxCanonicalBytesPerEntity)) {
    return { allowed: false, decision: 'BRAKE', reason: `entity write budget exhausted for ${entityId}` };
  }
  if (fleetCounter && (fleetCounter.events + 1 > budget.maxCanonicalEventsPerFleet || fleetCounter.bytes + bytes > budget.maxCanonicalBytesPerFleet)) {
    return { allowed: false, decision: 'BRAKE', reason: `fleet write budget exhausted for ${fleetId}` };
  }
  if (hourCounter.events + 1 > budget.maxCanonicalEventsPerHour || hourCounter.bytes + bytes > budget.maxCanonicalBytesPerHour) {
    return { allowed: false, decision: 'BRAKE', reason: `hourly write budget exhausted for ${hourKey}` };
  }

  budget.usedEvents += 1;
  budget.usedBytes += bytes;
  addTo(budget.byEntity, entityId, bytes);
  addTo(budget.byFleet, fleetId, bytes);
  addTo(budget.byHour, hourKey, bytes);
  return { allowed: true, decision: 'PERSIST', reason: classification.reason, bytes, entityId, fleetId, hourKey };
}
